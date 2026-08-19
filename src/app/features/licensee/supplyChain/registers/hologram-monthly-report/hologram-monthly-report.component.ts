import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HologramDataService } from '../../services/hologram-data.service';
import { SupplyChainProfileService } from '../../../../../core/services/supply-chain-profile.service';
import { environment } from '../../../../../../environments/environment';

interface StatementRow {
  rowType: 'ARRIVAL' | 'UTILIZATION' | 'SUMMARY';
  label: string;
  brandDetails?: string;
  bottleSize?: string;
  utilizationFrom?: string;
  utilizationTo?: string;
  utilizationQty?: number;
  wastageFrom?: string;
  wastageTo?: string;
  wastageQty?: number;
  leftOver?: number;
  freshArrival?: number;
  closingBalance?: number | null;
  utilizationDetails?: Array<{
    rollName: string;
    rollAssignmentKey?: string; // NEW: Unique key for this roll assignment
    rollAssignmentIndex?: number; // NEW: Index for color coding
    brandNumber?: number; // NEW: Brand number within roll assignment (1, 2, 3...)
    brandName: string;
    bottleSize: string;
    ranges: Array<{
      from: string;
      to: string;
      qty: number;
    }>;
  }>;
  wastageDetails?: Array<{
    rollName: string;
    rollAssignmentKey?: string; // NEW: Unique key for this roll assignment
    rollAssignmentIndex?: number; // NEW: Index for color coding
    brandNumber?: number; // NEW: Brand number within roll assignment (1, 2, 3...)
    brandName: string;
    bottleSize: string;
    ranges: Array<{
      from: string;
      to: string;
      qty: number;
    }>;
  }>;
  meta?: {
    referenceNo?: string;
    transactionDateTime?: string;
    cartoonNumber?: string;
    serialRange?: string;
    notes?: string;
    cartonRanges?: Array<{
      cartoonNumber: string;
      fromSerial: string;
      toSerial: string;
      quantity: number;
    }>;
    isLastInGroup?: boolean;
    openingBalanceForGroup?: number;
    freshArrivalForGroup?: number;
    totalUtilizedForGroup?: number;
    totalWastageForGroup?: number;
    closingBalanceForGroup?: number;
    isNotInUse?: boolean;
    entryCount?: number;
    assignedRollRanges?: Array<{
      rollName: string;
      range: string;
      rollAssignmentIndex: number;
    }>;
  };
}

interface OverviewSummary {
  openingStock: number;
  totalArrivals: number;
  arrivalCount: number;
  totalUtilized: number;
  utilizationCount: number;
  totalWastage: number;
  wastageCount: number;
  closingBalance: number;
}

@Component({
  selector: 'app-hologram-monthly-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram-monthly-report.component.html',
  styleUrl: './hologram-monthly-report.component.scss'
})
export class HologramMonthlyReportComponent implements OnInit {
  private readonly licenseApiBase = `${environment.apiBaseUrl}/masters/license`;
  private readonly authUsersApiBase = `${environment.apiBaseUrl}/auth/users`;
  private readonly hologramApiBase = `${environment.apiBaseUrl}/transactional/supply_chain/hologram`;

  // Month/Year selection
  selectedMonth: string = 'jan';
  selectedYear: string = '2026';
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';
  selectedManufacturingUnit: string = '';
  commissionerMode = false;
  manufacturingUnits: string[] = [];
  private licenseeIdByNormalizedName = new Map<string, string>();

  // Date filter for table rows
  dateFilter: string = '';

  // Data
  overviewSummary: OverviewSummary | null = null;
  statementRows: StatementRow[] = [];
  approvedEntriesCount: number = 0;
  isLoading: boolean = false;
  establishmentLine: string = '';
  private createdDistilleryBreweryNames: string[] = [];
  private oicMappedEstablishmentNames: string[] = [];
  private hologramRequestLicenseeNames: string[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private hologramService: HologramDataService,
    private supplyChainProfileService: SupplyChainProfileService
  ) {}

  ngOnInit(): void {
    // Set current month and year
    const now = new Date();
    this.selectedMonth = this.getMonthCode(now.getMonth() + 1);
    this.selectedYear = now.getFullYear().toString();

    console.log('🚀 Component initialized:', {
      month: this.selectedMonth,
      year: this.selectedYear,
      type: this.selectedHologramType
    });

    const referrer = (this.route.snapshot.queryParamMap.get('referrer') || '').toLowerCase();
    this.commissionerMode =
      referrer === 'commissioner' ||
      this.router.url.includes('monthlyhologramstatement-oic') ||
      this.router.url.includes('section=commissioner-monthly-view-details');

    if (this.commissionerMode) {
      this.establishmentLine = 'All mapped Distillery/Brewery units';
      this.loadDropdownSources();
    } else {
      this.loadProfileHeaderLine();
    }

    // Load data
    this.loadMonthlyReport();
  }

  private loadProfileHeaderLine(): void {
    this.supplyChainProfileService.getProfile().subscribe({
      next: (response) => {
        const profile = response?.data;
        const unitName = (profile?.manufacturingUnitName || '').trim();
        const address = (profile?.address || '').trim();
        this.establishmentLine = [unitName, address].filter(Boolean).join(' | ');
      },
      error: () => {
        this.establishmentLine = '';
      }
    });
  }

  /**
   * Load monthly report from backend API
   */
  loadMonthlyReport(): void {
    this.isLoading = true;
    
    console.log('🔄 Loading monthly report:', {
      month: this.selectedMonth,
      year: this.selectedYear,
      type: this.selectedHologramType
    });

    // Direct API call to fetch daily register and rolls data
    const monthNumber = this.getMonthNumber(this.selectedMonth);
    const monthKey = `${this.selectedYear}-${monthNumber.toString().padStart(2, '0')}`;
    
    // Fetch both daily register and rolls details
    Promise.all([
      this.hologramService.getDailyRegisterEntries().toPromise().catch(() => []),
      this.hologramService.getRollsDetails().toPromise().catch(() => []),
      this.http.get<any>(`${this.hologramApiBase}/procurement/?page_size=2000`).toPromise().catch(() => []),
      this.commissionerMode
        ? this.http
            .get<any>(`${this.hologramApiBase}/commissioner-dashboard/daily_register_overview/`)
            .toPromise()
            .catch(() => null)
        : Promise.resolve(null)
    ]).then(async ([dailyEntries, rollsDetails, procurementPayload, commissionerOverview]: [any, any, any, any]) => {
      let dailyRows = this.extractRows(dailyEntries);
      const rollsArray = this.extractRows(rollsDetails);
      const procurementRows = this.extractRows(procurementPayload);
      const commissionerOverviewEntries = Array.isArray(commissionerOverview?.entries) ? commissionerOverview.entries : [];
      const cartonDetailsByReference = this.buildCartonDetailsByReference(commissionerOverviewEntries);

      if (this.commissionerMode && dailyRows.length === 0) {
        const commissionerRows = this.mapCommissionerOverviewEntriesToMonthlyRows(
          commissionerOverviewEntries
        );
        if (commissionerRows.length > 0) {
          dailyRows = commissionerRows;
        }
      }

      this.updateManufacturingUnitsFromData(dailyRows || [], rollsArray || []);
      
      console.log('✅ Data fetched:', { 
        dailyEntriesCount: dailyRows?.length || 0,
        rollsDetailsCount: rollsArray?.length || 0,
        monthKey: monthKey
      });
      
      console.log('Sample daily entry:', dailyRows?.[0]);
      console.log('Sample roll:', rollsArray?.[0]);
      
      // Filter daily entries by month, year, and type
      const filteredEntries = (dailyRows || []).filter((entry: any) => {
        const entryDate = entry.usage_date || entry.usageDate || '';
        const entryMonthKey = this.getMonthKeyFromAnyDate(entryDate);
        const entryType = (entry.hologram_type || entry.hologramType || 'LOCAL').toString().toUpperCase();
        const approvalStatus = entry.approval_status || entry.approvalStatus || '';
        const matchesUnit = this.matchesSelectedManufacturingUnit(entry);
        const matchesApproval = this.matchesApprovalStatus(approvalStatus);
        
        console.log('🔍 Checking entry:', {
          id: entry.id,
          date: entryDate,
          monthKey: entryMonthKey,
          type: entryType,
          approvalStatus: approvalStatus,
          matchesMonth: entryMonthKey === monthKey,
          matchesType: entryType === this.selectedHologramType,
          matchesApproval: matchesApproval,
          matchesUnit: matchesUnit
        });
        
        const matches = entryMonthKey === monthKey && 
               entryType === this.selectedHologramType &&
               matchesApproval &&
               matchesUnit;
        
        if (matches) {
          console.log('✅ Matched entry:', entry);
        }
        
        return matches;
      });

      let effectiveEntries = filteredEntries;
      
      console.log(`📊 Filtered ${filteredEntries.length} entries for ${monthKey} ${this.selectedHologramType}`);

      const selectedUnitRefs = new Set<string>(
        filteredEntries
          .map((entry: any) => this.extractReferenceNo(entry))
          .filter((value: string) => !!value)
      );
      const selectedUnitRefsNormalized = new Set<string>(
        Array.from(selectedUnitRefs).map((value) => this.normalizeReferenceNo(value))
      );
      
      // Filter arrivals by month, year, and type
      const arrivals = rollsArray.filter((roll: any) => {
        const receivedDate = roll.received_date || roll.receivedDate || '';
        const rollMonthKey = this.getMonthKeyFromAnyDate(receivedDate);
        const rollType = (roll.type || 'LOCAL').toString().toUpperCase();
        const matchesUnit = this.matchesSelectedManufacturingUnit(roll);
        const rollRef = this.extractReferenceNo(roll);
        // IMPORTANT: when a commissioner unit is selected, do not treat empty selected refs as a match.
        // Otherwise, all arrivals bypass the unit filter and appear for every unit.
        const matchesSelectedRefs = selectedUnitRefs.size > 0 && selectedUnitRefs.has(rollRef);
        const matchesUnitOrRef =
          this.commissionerMode && this.selectedManufacturingUnit
            ? (matchesUnit || matchesSelectedRefs)
            : matchesUnit;
        
        const matches =
          rollMonthKey === monthKey &&
          rollType === this.selectedHologramType &&
          matchesUnitOrRef;
        
        if (matches) {
          console.log('✅ Matched arrival:', roll);
        }
        
        return matches;
      });

      let effectiveArrivals = arrivals;

      if (this.commissionerMode && effectiveArrivals.length === 0) {
        const overviewArrivals = this.buildArrivalsFromCommissionerOverview(
          commissionerOverviewEntries,
          monthKey,
          selectedUnitRefsNormalized
        );
        if (overviewArrivals.length > 0) {
          effectiveArrivals = overviewArrivals;
        }
      }

      if (this.commissionerMode && effectiveArrivals.length === 0) {
        const procurementArrivals = this.buildArrivalsFromProcurements(
          procurementRows || [],
          monthKey,
          cartonDetailsByReference,
          selectedUnitRefsNormalized
        );
        if (procurementArrivals.length > 0) {
          effectiveArrivals = procurementArrivals;
        }
      }

      // Do not fallback to unfiltered data when a commissioner unit is selected.
      // Monthly details must strictly follow the selected Distillery/Brewery dropdown.
      
      console.log(`📦 Filtered ${effectiveArrivals.length} arrivals for ${monthKey} ${this.selectedHologramType}`);
      
      // Calculate totals from daily entries
      const totalUtilized = effectiveEntries.reduce((sum: number, e: any) => 
        sum + (e.issued_qty || e.issuedQty || 0), 0);
      const totalWastage = effectiveEntries.reduce((sum: number, e: any) => 
        sum + (e.wastage_qty || e.wastageQty || 0), 0);
      // IMPORTANT:
      // "Fresh Arrival" must always be calculated from the originally received serial ranges,
      // not from a mutable roll.total_count that changes after utilization/damage.
      const arrivalsByRefForTotals = new Map<string, any[]>();
      effectiveArrivals.forEach((arrival: any) => {
        const refNo = arrival.procurement_ref || arrival.procurementRef || arrival.ref_no || arrival.refNo || 'UNKNOWN';
        if (!arrivalsByRefForTotals.has(refNo)) {
          arrivalsByRefForTotals.set(refNo, []);
        }
        arrivalsByRefForTotals.get(refNo)!.push(arrival);
      });
      const freshArrival = Array.from(arrivalsByRefForTotals.values()).reduce((sum, group) => {
        const aggregated = this.aggregateArrivalGroup(group);
        return sum + aggregated.total;
      }, 0);
      
      // ALSO get utilization from roll usage history (this is the approved data)
      let totalUtilizedFromRolls = 0;
      let totalWastageFromRolls = 0;
      
      effectiveArrivals.forEach((roll: any) => {
        if (roll.usageHistory && roll.usageHistory.length > 0) {
          roll.usageHistory.forEach((history: any) => {
            if (history.type === 'ISSUED') {
              totalUtilizedFromRolls += history.issuedQuantity || history.quantity || 0;
            } else if (history.type === 'WASTAGE' || history.type === 'DAMAGED') {
              totalWastageFromRolls += history.wastageQuantity || history.quantity || 0;
            }
          });
        }
      });
      
      console.log('📊 Totals:', {
        fromDailyRegister: { utilized: totalUtilized, wastage: totalWastage },
        fromRollHistory: { utilized: totalUtilizedFromRolls, wastage: totalWastageFromRolls }
      });
      
      // Use roll history if daily register has no approved entries
      const finalUtilized = totalUtilized > 0 ? totalUtilized : totalUtilizedFromRolls;
      const finalWastage = totalWastage > 0 ? totalWastage : totalWastageFromRolls;

      // For commissioner mode, fetch the previous month's closing balance from the backend
      // generate_report endpoint, which correctly aggregates all historical rolls and usage
      // across all licensees. Client-side computation is unreliable here because getRollsDetails()
      // is scoped to the logged-in user and returns no data for the commissioner.
      const getPrevMonthOpeningStock = async (): Promise<number> => {
        if (!this.commissionerMode) {
          return this.computeOpeningStockForMonth(
            monthKey,
            dailyRows || [],
            rollsArray || [],
            procurementRows || [],
            commissionerOverviewEntries || []
          );
        }

        // Compute previous month/year
        const monthNum = parseInt(monthKey.split('-')[1], 10);
        const yearNum = parseInt(monthKey.split('-')[0], 10);
        const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
        const prevYearNum = monthNum === 1 ? yearNum - 1 : yearNum;
        const prevMonthCode = this.getMonthCode(prevMonthNum);

        // Build query params
        const params: Record<string, string> = {
          month: prevMonthCode,
          year: prevYearNum.toString(),
          hologram_type: this.selectedHologramType,
        };
        if (this.selectedManufacturingUnit) {
          // Resolve licensee_id for commissioner-mode so opening stock equals last month's closing balance
          // for the selected manufacturing unit.
          const licId = this.resolveSelectedLicenseeId(dailyRows || [], rollsArray || [], procurementRows || [], commissionerOverviewEntries || []);
          if (licId) {
            params['licensee_id'] = String(licId);
          }
        }

        const queryString = Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');

        // Prefer client-side computation for commissioner opening stock to guarantee consistency
        // with this UI's rules (arrival derived from serial ranges, deductions from approved usage).
        // Backend generate_report has been observed to return incorrect closing balance in some cases.
        return this.computeOpeningStockForMonth(
          monthKey,
          dailyRows || [],
          rollsArray || [],
          procurementRows || [],
          commissionerOverviewEntries || []
        );
      };

      const openingStock = await getPrevMonthOpeningStock();
      
      // Set overview summary
      this.overviewSummary = {
        openingStock: openingStock,
        totalArrivals: freshArrival,
        arrivalCount: arrivalsByRefForTotals.size,
        totalUtilized: finalUtilized,
        utilizationCount: effectiveEntries.filter((e: any) => (e.issued_qty || e.issuedQty || 0) > 0).length,
        totalWastage: finalWastage,
        wastageCount: effectiveEntries.filter((e: any) => (e.wastage_qty || e.wastageQty || 0) > 0).length,
        closingBalance: openingStock + freshArrival - finalUtilized - finalWastage
      };
      
      // Build statement rows - CHRONOLOGICAL ORDER
      // Combine arrivals and utilizations into a single list, then sort by precise timestamp
      this.statementRows = [];
      
      // Create combined list of all transactions with precise timestamps
      interface TransactionItem {
        type: 'ARRIVAL' | 'UTILIZATION';
        id: number;
        timestamp: Date;
        preciseTimestamp: number; // Unix timestamp in milliseconds for precise sorting
        data: any;
      }
      
      const allTransactions: TransactionItem[] = [];
      
      // Group arrivals by procurement reference to show all rolls in single row
      const arrivalsByRef = new Map<string, any[]>();
      
      effectiveArrivals.forEach((arrival: any) => {
        const refNo = arrival.procurement_ref || arrival.procurementRef || arrival.ref_no || arrival.refNo || 'UNKNOWN';
        
        if (!arrivalsByRef.has(refNo)) {
          arrivalsByRef.set(refNo, []);
        }
        arrivalsByRef.get(refNo)!.push(arrival);
      });
      
      console.log(`📦 Grouped ${effectiveArrivals.length} arrivals into ${arrivalsByRef.size} procurement groups`);
      
      // Add grouped arrivals with their precise timestamps
      arrivalsByRef.forEach((rollsGroup, refNo) => {
        // Use the first roll's received date as the group timestamp
        const firstRoll = rollsGroup[0];
        const receivedDate = firstRoll.received_date || firstRoll.receivedDate || '';
        const preciseTime = new Date(receivedDate).getTime();
        
        // Calculate total for this procurement from serial ranges (not mutable roll.total_count)
        const aggregated = this.aggregateArrivalGroup(rollsGroup);
        const totalAmount = aggregated.total;
        
        console.log(`📦 Procurement ${refNo}: ${rollsGroup.length} rolls, total=${totalAmount}, date=${receivedDate}`);
        
        // Create single transaction with all rolls grouped
        allTransactions.push({
          type: 'ARRIVAL',
          id: firstRoll.id || 0,
          timestamp: new Date(receivedDate),
          preciseTimestamp: preciseTime,
          data: {
            ...firstRoll,
            total_count: totalAmount,
            totalCount: totalAmount,
            ref_no: refNo,
            refNo: refNo,
            // Store all rolls for carton ranges display
            allRolls: rollsGroup,
            // Store normalized carton ranges to ensure stable qty display
            cartonRangesNormalized: aggregated.ranges
          }
        });
      });
      
      // Group utilization entries by reference number to show all in single row
      const utilizationsByRef = new Map<string, any[]>();
      
      effectiveEntries.forEach((entry: any) => {
        const refNo = entry.reference_no || entry.referenceNo || 'UNKNOWN';
        
        if (!utilizationsByRef.has(refNo)) {
          utilizationsByRef.set(refNo, []);
        }
        utilizationsByRef.get(refNo)!.push(entry);
      });
      
      console.log(`📋 Grouped ${effectiveEntries.length} utilizations into ${utilizationsByRef.size} reference groups`);
      
      // Debug: Log each group
      utilizationsByRef.forEach((entriesGroup, refNo) => {
        console.log(`📋 Reference ${refNo}: ${entriesGroup.length} entries`, entriesGroup.map((e: any) => ({
          id: e.id,
          brand: e.brand_details || e.brandDetails,
          bottle: e.bottle_size || e.bottleSize,
          from: e.issued_from || e.issuedFrom,
          to: e.issued_to || e.issuedTo,
          qty: e.issued_qty || e.issuedQty
        })));
      });
      
      // Add grouped utilizations with their precise timestamps
      utilizationsByRef.forEach((entriesGroup, refNo) => {
        // Use the first entry's timestamp as the group timestamp
        const firstEntry = entriesGroup[0];
        
        // Try to get the most precise timestamp available
        const createdAt = firstEntry.created_at || firstEntry.createdAt || '';
        const approvedAt = firstEntry.approved_at || firstEntry.approvedAt || '';
        const submissionDate = firstEntry.submission_date || firstEntry.submissionDate || '';
        const usageDate = firstEntry.usage_date || firstEntry.usageDate || '';
        
        const dateToUse = createdAt || approvedAt || submissionDate || usageDate;
        const preciseTime = new Date(dateToUse).getTime();
        
        // Calculate totals for this reference
        const totalUtilized = entriesGroup.reduce((sum, e) => sum + (e.issued_qty || e.issuedQty || 0), 0);
        const totalWastage = entriesGroup.reduce((sum, e) => sum + (e.wastage_qty || e.wastageQty || 0), 0);
        
        console.log(`📋 Reference ${refNo}: ${entriesGroup.length} entries, utilized=${totalUtilized}, wastage=${totalWastage}`);
        
        // Create single transaction with all entries grouped
        allTransactions.push({
          type: 'UTILIZATION',
          id: firstEntry.id || 0,
          timestamp: new Date(usageDate),
          preciseTimestamp: preciseTime,
          data: {
            ...firstEntry,
            ref_no: refNo,
            refNo: refNo,
            totalUtilized: totalUtilized,
            totalWastage: totalWastage,
            // Store all entries for detailed display
            allEntries: entriesGroup
          }
        });
      });
      
      // Sort by precise timestamp (milliseconds)
      // This ensures transactions appear in the exact order they were created
      allTransactions.sort((a, b) => {
        // Primary sort: by precise timestamp
        if (a.preciseTimestamp !== b.preciseTimestamp) {
          return a.preciseTimestamp - b.preciseTimestamp;
        }
        
        // Secondary sort: by ID within same timestamp (unlikely but handles edge cases)
        return a.id - b.id;
      });
      
      console.log('📊 Sorted transactions (chronological):', allTransactions.map(t => ({
        type: t.type,
        id: t.id,
        preciseTimestamp: t.preciseTimestamp,
        date: t.timestamp.toISOString()
      })));
      
      // Track running balance for calculations
      let runningBalance = openingStock;
      
      // Process sorted transactions
      allTransactions.forEach((transaction) => {
        if (transaction.type === 'ARRIVAL') {
          const arrival = transaction.data;
          const arrivalAmount = arrival.total_count || arrival.totalCount;
          runningBalance += arrivalAmount;
          
          // Extract carton ranges from ALL rolls in this procurement
          const cartonRanges: Array<{
            cartoonNumber: string;
            fromSerial: string;
            toSerial: string;
            quantity: number;
          }> = [];
          
          const normalizedRanges = Array.isArray(arrival.cartonRangesNormalized) ? arrival.cartonRangesNormalized : null;
          if (normalizedRanges && normalizedRanges.length > 0) {
            normalizedRanges.forEach((r: any) => {
              cartonRanges.push({
                cartoonNumber: String(r.cartoonNumber || r.rollNumber || r.cartonNumber || '').trim(),
                fromSerial: String(r.fromSerial || '').trim(),
                toSerial: String(r.toSerial || '').trim(),
                quantity: Number(r.quantity || 0)
              });
            });
          } else {
            // Backward-compatible fallback: derive ranges from the rolls themselves
            const allRolls = arrival.allRolls || [arrival];
            const aggregatedFallback = this.aggregateArrivalGroup(allRolls);
            aggregatedFallback.ranges.forEach((r) => cartonRanges.push(r));
          }
          
          // Sort carton ranges by fromSerial number to maintain entry order (a, b, c)
          cartonRanges.sort((a, b) => {
            // Extract numeric part from serial numbers
            const aNum = parseInt(a.fromSerial.replace(/\D/g, '')) || 0;
            const bNum = parseInt(b.fromSerial.replace(/\D/g, '')) || 0;
            return aNum - bNum;
          });
          
          const refNo = arrival.ref_no || arrival.refNo || 'N/A';
          
          this.statementRows.push({
            rowType: 'ARRIVAL',
            label: `Arrival - ${transaction.timestamp.toLocaleDateString()}`,
            freshArrival: arrivalAmount,
            closingBalance: runningBalance,
            meta: {
              referenceNo: refNo,
              transactionDateTime: transaction.timestamp.toISOString(),
              cartonRanges: cartonRanges,
              notes: `Received ${arrivalAmount} holograms in ${cartonRanges.length} roll(s)`,
              isLastInGroup: true,
              openingBalanceForGroup: runningBalance - arrivalAmount,
              freshArrivalForGroup: arrivalAmount,
              closingBalanceForGroup: runningBalance
            }
          });
        } else {
          // UTILIZATION
          const entry = transaction.data;
          const utilized = entry.totalUtilized || entry.issued_qty || entry.issuedQty || 0;
          const wastage = entry.totalWastage || entry.wastage_qty || entry.wastageQty || 0;
          runningBalance = runningBalance - utilized - wastage;
          
          // Get all entries from this grouped utilization
          const allEntries = entry.allEntries || [entry];
          
          console.log(`🔍 Processing utilization group with ${allEntries.length} entries:`, allEntries.map((e: any) => ({
            id: e.id,
            brand: e.brand_details || e.brandDetails,
            bottle: e.bottle_size || e.bottleSize,
            roll: e.cartoon_number || e.cartoonNumber
          })));
          
          // Check if this is a "Not In Use" entry (all entries have 0 utilization and wastage)
          const isNotInUse = allEntries.every((e: any) => 
            (e.issued_qty || e.issuedQty || 0) === 0 && 
            (e.wastage_qty || e.wastageQty || 0) === 0
          );
          
          // Build utilization details grouped by roll assignment (not just roll name)
          const utilizationDetails: Array<{
            rollName: string;
            rollAssignmentKey?: string; // NEW: Unique key for this roll assignment
            rollAssignmentIndex?: number; // NEW: Index for color coding
            brandNumber?: number; // NEW: Brand number within this roll assignment (1, 2, 3...)
            brandName: string;
            bottleSize: string;
            ranges: Array<{
              from: string;
              to: string;
              qty: number;
            }>;
          }> = [];
          
          const wastageDetails: Array<{
            rollName: string;
            rollAssignmentKey?: string; // NEW: Unique key for this roll assignment
            rollAssignmentIndex?: number; // NEW: Index for color coding
            brandNumber?: number; // NEW: Brand number within this roll assignment (1, 2, 3...)
            brandName: string;
            bottleSize: string;
            ranges: Array<{
              from: string;
              to: string;
              qty: number;
            }>;
          }> = [];
          
          // Create a mapping of unique roll assignments to indices for color coding
          // Each unique roll assignment (roll + range) gets a unique index
          const rollAssignmentMap = new Map<string, number>();
          let nextAssignmentIndex = 0;
          
          // Also track brands per roll assignment for numbering (Brand 1, Brand 2, etc.)
          const brandsPerAssignment = new Map<string, Map<string, number>>();
          
          const getAssignmentInfo = (rollLabelRaw: any, fromRaw: any, toRaw: any, brandName: string, entry?: any) => {
            let rollLabel = String(rollLabelRaw || 'Unknown').trim() || 'Unknown';
            let from = String(fromRaw || '').trim() || '-';
            let to = String(toRaw || '').trim() || '-';

            // If used/damaged range is empty, align color key with actual assigned roll range for this entry.
            if ((from === '-' && to === '-') && entry) {
              const assignedRolls = this.getAssignedRollsForEntry(entry);
              if (assignedRolls.length > 0) {
                const requestedIndex = Number(entry?.brand_index ?? entry?.brandIndex ?? 0);
                const selectedAssigned =
                  Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < assignedRolls.length
                    ? assignedRolls[requestedIndex]
                    : assignedRolls[0];
                if (selectedAssigned) {
                  rollLabel = String(selectedAssigned.rollLabel || rollLabel).trim() || rollLabel;
                  from = String(selectedAssigned.fromSerial || '').trim() || from;
                  to = String(selectedAssigned.toSerial || '').trim() || to;
                }
              }
            }

            // OIC: keep same roll in one box even if multiple partial ranges are used.
            // Commissioner: keep roll+range key to preserve per-assignment color mapping.
            const assignmentKey = this.commissionerMode ? `${rollLabel}|${from}-${to}` : rollLabel;

            if (!rollAssignmentMap.has(assignmentKey)) {
              rollAssignmentMap.set(assignmentKey, nextAssignmentIndex++);
              brandsPerAssignment.set(assignmentKey, new Map<string, number>());
            }

            const brandsMap = brandsPerAssignment.get(assignmentKey)!;
            if (!brandsMap.has(brandName)) {
              brandsMap.set(brandName, brandsMap.size + 1);
            }

            return {
              rollName: rollLabel,
              assignmentKey,
              assignmentIndex: rollAssignmentMap.get(assignmentKey) ?? 0,
              brandNumber: brandsMap.get(brandName) ?? 1
            };
          };
          
          // Process each entry to extract roll and brand details
          allEntries.forEach((e: any) => {
            const rollName = this.resolveEntryRollName(e);
            const brandName = e.brand_details || e.brandDetails || '-';
            const bottleSize = e.bottle_size || e.bottleSize || '-';
            
            let hasUtilizationDetail = false;
            
            // Handle issued ranges
            const issuedRanges = this.normalizeRangeArray(e.issued_ranges ?? e.issuedRanges);
            if (Array.isArray(issuedRanges) && issuedRanges.length > 0) {
              issuedRanges.forEach((range: any) => {
                const parsedRanges = this.extractAllSerialBounds(range);
                const safeRanges = parsedRanges.length > 0 ? parsedRanges : [{ from: '', to: '' }];
                safeRanges.forEach((parsed) => {
                  const fromSerial = parsed.from;
                  const toSerial = parsed.to;
                  let issuedQty = Number(range.quantity ?? range.qty ?? range.count ?? 0);
                  if (!issuedQty && fromSerial && toSerial) {
                    const fromNo = Number(fromSerial);
                    const toNo = Number(toSerial);
                    if (Number.isFinite(fromNo) && Number.isFinite(toNo) && toNo >= fromNo) {
                      issuedQty = (toNo - fromNo) + 1;
                    }
                  }
                  
                  const resolved = getAssignmentInfo(rollName, fromSerial, toSerial, brandName, e);
                  const resolvedBounds = this.getRangeBoundsFromAssignmentKey(resolved.assignmentKey);
                  const displayFrom = String(fromSerial || '').trim() || resolvedBounds.from;
                  const displayTo = String(toSerial || '').trim() || resolvedBounds.to;
                  utilizationDetails.push({
                    rollName: resolved.rollName,
                    rollAssignmentKey: resolved.assignmentKey,
                    rollAssignmentIndex: resolved.assignmentIndex,
                    brandNumber: resolved.brandNumber,
                    brandName: brandName,
                    bottleSize: bottleSize,
                    ranges: [{
                      from: displayFrom,
                      to: displayTo,
                      qty: issuedQty
                    }]
                  });
                  hasUtilizationDetail = true;
                });
              });
            } else if ((e.issued_from || e.issuedFrom) && (e.issued_to || e.issuedTo)) {
              // Fallback to single range
              const fromSerial = e.issued_from || e.issuedFrom || '';
              const toSerial = e.issued_to || e.issuedTo || '';
              const resolved = getAssignmentInfo(rollName, fromSerial, toSerial, brandName, e);
              
              utilizationDetails.push({
                rollName: resolved.rollName,
                rollAssignmentKey: resolved.assignmentKey,
                rollAssignmentIndex: resolved.assignmentIndex,
                brandNumber: resolved.brandNumber,
                brandName: brandName,
                bottleSize: bottleSize,
                ranges: [{
                  from: fromSerial,
                  to: toSerial,
                  qty: e.issued_qty || e.issuedQty || 0
                }]
              });
              hasUtilizationDetail = true;
            } else {
              const fallbackRanges = this.getFallbackIssuedRangesFromEntry(e);
              if (fallbackRanges.length > 0) {
                fallbackRanges.forEach((range: any) => {
                  const fromSerial = range.fromSerial || '';
                  const toSerial = range.toSerial || '';
                  const resolved = getAssignmentInfo(range.rollLabel || rollName, fromSerial, toSerial, brandName, e);
                  utilizationDetails.push({
                    rollName: resolved.rollName,
                    rollAssignmentKey: resolved.assignmentKey,
                    rollAssignmentIndex: resolved.assignmentIndex,
                    brandNumber: resolved.brandNumber,
                    brandName: brandName,
                    bottleSize: bottleSize,
                    ranges: [{
                      from: fromSerial,
                      to: toSerial,
                      qty: Number(range.quantity || 0)
                    }]
                  });
                  hasUtilizationDetail = true;
                });
              }
            }

            // Guarantee one utilization detail per entry so multi-brand rows don't collapse
            // when backend doesn't send issued ranges for "Not Used" brands.
            if (!hasUtilizationDetail) {
              const parsedEntryRange = this.extractSerialBounds(e);
              const from = parsedEntryRange.from || '-';
              const to = parsedEntryRange.to || '-';
              const qty = Number(e.issued_qty || e.issuedQty || 0);
              const resolved = getAssignmentInfo(rollName, from, to, brandName, e);

              utilizationDetails.push({
                rollName: resolved.rollName,
                rollAssignmentKey: resolved.assignmentKey,
                rollAssignmentIndex: resolved.assignmentIndex,
                brandNumber: resolved.brandNumber,
                brandName: brandName,
                bottleSize: bottleSize,
                ranges: [{
                  from,
                  to,
                  qty
                }]
              });
            }
            
            // Handle wastage ranges
            const wastageRanges = this.normalizeRangeArray(e.wastage_ranges ?? e.wastageRanges);
            if (Array.isArray(wastageRanges) && wastageRanges.length > 0) {
              wastageRanges.forEach((range: any) => {
                const parsedRanges = this.extractAllSerialBounds(range);
                const safeRanges = parsedRanges.length > 0 ? parsedRanges : [{ from: '', to: '' }];
                safeRanges.forEach((parsed) => {
                  const fromSerial = parsed.from;
                  const toSerial = parsed.to;
                  let wastageQty = Number(range.quantity ?? range.qty ?? range.count ?? 0);
                  if (!wastageQty && fromSerial && toSerial) {
                    const fromNo = Number(fromSerial);
                    const toNo = Number(toSerial);
                    if (Number.isFinite(fromNo) && Number.isFinite(toNo) && toNo >= fromNo) {
                      wastageQty = (toNo - fromNo) + 1;
                    }
                  }
                  
                  const resolved = getAssignmentInfo(rollName, fromSerial, toSerial, brandName, e);
                  const resolvedBounds = this.getRangeBoundsFromAssignmentKey(resolved.assignmentKey);
                  const displayFrom = String(fromSerial || '').trim() || resolvedBounds.from;
                  const displayTo = String(toSerial || '').trim() || resolvedBounds.to;
                  wastageDetails.push({
                    rollName: resolved.rollName,
                    rollAssignmentKey: resolved.assignmentKey,
                    rollAssignmentIndex: resolved.assignmentIndex,
                    brandNumber: resolved.brandNumber,
                    brandName: brandName,
                    bottleSize: bottleSize,
                    ranges: [{
                      from: displayFrom,
                      to: displayTo,
                      qty: wastageQty
                    }]
                  });
                });
              });
            } else if ((e.wastage_from || e.wastageFrom) && (e.wastage_to || e.wastageTo)) {
              // Fallback to single range
              const fromSerial = e.wastage_from || e.wastageFrom || '';
              const toSerial = e.wastage_to || e.wastageTo || '';
              const resolved = getAssignmentInfo(rollName, fromSerial, toSerial, brandName, e);
              
              wastageDetails.push({
                rollName: resolved.rollName,
                rollAssignmentKey: resolved.assignmentKey,
                rollAssignmentIndex: resolved.assignmentIndex,
                brandNumber: resolved.brandNumber,
                brandName: brandName,
                bottleSize: bottleSize,
                ranges: [{
                  from: fromSerial,
                  to: toSerial,
                  qty: e.wastage_qty || e.wastageQty || 0
                }]
              });
            }
          });
          
          console.log(`✅ Built ${utilizationDetails.length} utilization details:`, utilizationDetails);
          console.log(`✅ Built ${wastageDetails.length} wastage details:`, wastageDetails);
          
          const refNo = entry.ref_no || entry.refNo || 'N/A';
          const firstEntry = allEntries[0];
          const assignedRollRanges = this.buildAssignedRollRangesFromEntries(allEntries);
          
          this.statementRows.push({
            rowType: 'UTILIZATION',
            label: isNotInUse 
              ? `Not In Use - ${transaction.timestamp.toLocaleDateString()}`
              : `Utilization - ${transaction.timestamp.toLocaleDateString()}`,
            brandDetails: firstEntry.brand_details || firstEntry.brandDetails || '-',
            bottleSize: firstEntry.bottle_size || firstEntry.bottleSize || '-',
            utilizationFrom: firstEntry.issued_from || firstEntry.issuedFrom || '-',
            utilizationTo: firstEntry.issued_to || firstEntry.issuedTo || '-',
            utilizationQty: utilized,
            wastageFrom: firstEntry.wastage_from || firstEntry.wastageFrom || '-',
            wastageTo: firstEntry.wastage_to || firstEntry.wastageTo || '-',
            wastageQty: wastage,
            leftOver: 0,
            closingBalance: runningBalance,
            utilizationDetails: utilizationDetails.length > 0 ? utilizationDetails : undefined,
            wastageDetails: wastageDetails.length > 0 ? wastageDetails : undefined,
            meta: {
              referenceNo: refNo,
              transactionDateTime: transaction.timestamp.toISOString(),
              cartoonNumber: firstEntry.cartoon_number || firstEntry.cartoonNumber,
              serialRange: (firstEntry.issued_from || firstEntry.issuedFrom) && (firstEntry.issued_to || firstEntry.issuedTo)
                ? `${firstEntry.issued_from || firstEntry.issuedFrom}-${firstEntry.issued_to || firstEntry.issuedTo}`
                : undefined,
              isNotInUse: isNotInUse,
              entryCount: allEntries.length,
              assignedRollRanges: assignedRollRanges,
              isLastInGroup: true,
              openingBalanceForGroup: runningBalance + utilized + wastage,
              totalUtilizedForGroup: utilized,
              totalWastageForGroup: wastage,
              closingBalanceForGroup: runningBalance
            }
          });
        }
      });
      
      // If no approved daily entries, create rows from roll usage history
      if (effectiveEntries.length === 0) {
        // Collect all usage history items with timestamps
        const usageHistoryItems: TransactionItem[] = [];
        
        effectiveArrivals.forEach((roll: any) => {
          if (roll.usageHistory && roll.usageHistory.length > 0) {
            // Group usage history by reference number and date to combine ISSUED and WASTAGE
            const groupedHistory = new Map<string, any>();
            
            roll.usageHistory.forEach((history: any) => {
              if (history.type === 'ISSUED' || history.type === 'WASTAGE') {
                const key = `${history.referenceNo || ''}_${history.date || history.approvedAt}`;
                
                if (!groupedHistory.has(key)) {
                  groupedHistory.set(key, {
                    referenceNo: history.referenceNo,
                    date: history.date || history.approvedAt,
                    createdAt: history.created_at || history.createdAt || history.date || history.approvedAt,
                    brandDetails: history.brandDetails || history.brandName || '-',
                    bottleSize: history.bottleSize || '-',
                    utilizationFrom: '',
                    utilizationTo: '',
                    utilizationQty: 0,
                    wastageFrom: '',
                    wastageTo: '',
                    wastageQty: 0,
                    cartoonNumber: roll.cartonNumber
                  });
                }
                
                const group = groupedHistory.get(key);
                
                if (history.type === 'ISSUED') {
                  group.utilizationFrom = history.issuedFromSerial || history.fromSerial || '-';
                  group.utilizationTo = history.issuedToSerial || history.toSerial || '-';
                  group.utilizationQty = history.issuedQuantity || history.quantity || 0;
                } else if (history.type === 'WASTAGE') {
                  group.wastageFrom = history.wastageFromSerial || history.fromSerial || '-';
                  group.wastageTo = history.wastageToSerial || history.toSerial || '-';
                  group.wastageQty = history.wastageQuantity || history.quantity || 0;
                }
              }
            });
            
            // Add grouped items to the list
            groupedHistory.forEach((group, index) => {
              const groupDate = new Date(group.date);
              usageHistoryItems.push({
                type: 'UTILIZATION',
                id: group.id || index,
                timestamp: groupDate,
                preciseTimestamp: groupDate.getTime(),
                data: group
              });
            });
          }
        });
        
        // Sort usage history items by precise timestamp
        usageHistoryItems.sort((a, b) => {
          // First compare by precise timestamp
          if (a.preciseTimestamp !== b.preciseTimestamp) {
            return a.preciseTimestamp - b.preciseTimestamp;
          }
          
          // Fallback to ID
          return a.id - b.id;
        });
        
        // Process sorted usage history items
        usageHistoryItems.forEach((item) => {
          const group = item.data;
          const totalDeduction = group.utilizationQty + group.wastageQty;
          runningBalance = runningBalance - totalDeduction;
          
          // Calculate the full serial range (from first serial to last serial)
          let fullSerialRange = undefined;
          if (group.utilizationFrom && group.wastageFrom) {
            // Both utilization and wastage exist - find the min and max
            const allSerials = [
              group.utilizationFrom, 
              group.utilizationTo, 
              group.wastageFrom, 
              group.wastageTo
            ].filter((s: string) => s && s !== '-');
            
            if (allSerials.length > 0) {
              // Sort to find min and max
              const sortedSerials = allSerials.sort((a: string, b: string) => {
                const numA = parseInt(a.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.replace(/\D/g, '')) || 0;
                return numA - numB;
              });
              fullSerialRange = `${sortedSerials[0]}-${sortedSerials[sortedSerials.length - 1]}`;
            }
          } else if (group.utilizationFrom && group.utilizationTo) {
            // Only utilization
            fullSerialRange = `${group.utilizationFrom}-${group.utilizationTo}`;
          } else if (group.wastageFrom && group.wastageTo) {
            // Only wastage
            fullSerialRange = `${group.wastageFrom}-${group.wastageTo}`;
          }
          
          this.statementRows.push({
            rowType: 'UTILIZATION',
            label: `Utilization - ${item.timestamp.toLocaleDateString()}`,
            brandDetails: group.brandDetails,
            bottleSize: group.bottleSize,
            utilizationFrom: group.utilizationFrom || '-',
            utilizationTo: group.utilizationTo || '-',
            utilizationQty: group.utilizationQty,
            wastageFrom: group.wastageFrom || '-',
            wastageTo: group.wastageTo || '-',
            wastageQty: group.wastageQty,
            leftOver: 0,
            closingBalance: runningBalance,
            meta: {
              referenceNo: group.referenceNo,
              cartoonNumber: group.cartoonNumber,
              serialRange: fullSerialRange,
              isLastInGroup: true,
              openingBalanceForGroup: runningBalance + totalDeduction,
              totalUtilizedForGroup: group.utilizationQty,
              totalWastageForGroup: group.wastageQty,
              closingBalanceForGroup: runningBalance
            }
          });
        });
      }
      
      this.approvedEntriesCount = effectiveEntries.length;
      
      console.log('📊 Data processed:', {
        overviewSummary: this.overviewSummary,
        rowsCount: this.statementRows.length,
        approvedCount: this.approvedEntriesCount
      });
      
      this.isLoading = false;
    }).catch((error: any) => {
      console.error('❌ Error loading monthly report:', error);
      this.isLoading = false;
      
      // Initialize with empty data
      this.overviewSummary = {
        openingStock: 0,
        totalArrivals: 0,
        arrivalCount: 0,
        totalUtilized: 0,
        utilizationCount: 0,
        totalWastage: 0,
        wastageCount: 0,
        closingBalance: 0
      };
      this.statementRows = [];
    });
  }

  /**
   * Handle month/year change
   */
  onMonthYearChange(): void {
    this.dateFilter = '';
    this.loadMonthlyReport();
  }

  onManufacturingUnitChange(): void {
    this.loadMonthlyReport();
  }

  /**
   * Handle hologram type change
   */
  onHologramTypeChange(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): void {
    this.selectedHologramType = type;
    this.loadMonthlyReport();
  }

  /**
   * Get month code from month number
   */
  getMonthCode(monthNum: number): string {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return months[monthNum - 1] || 'jan';
  }

  /**
   * Get current hologram type display
   */
  getCurrentHologramTypeDisplay(): string {
    const monthNames: { [key: string]: string } = {
      'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
      'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
      'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
    };
    
    const monthName = monthNames[this.selectedMonth] || 'January';
    return `${monthName} ${this.selectedYear} - ${this.selectedHologramType}`;
  }

  /**
   * Get previous month display
   */
  getPreviousMonthDisplay(): string {
    const monthNum = this.getMonthNumber(this.selectedMonth);
    const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? parseInt(this.selectedYear) - 1 : parseInt(this.selectedYear);
    
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${monthNames[prevMonthNum]} ${prevYear}`;
  }

  /**
   * Get previous month closing balance
   */
  getPreviousMonthClosingBalance(): number {
    return this.overviewSummary?.openingStock || 0;
  }

  /**
   * Get month number from code
   */
  getMonthNumber(monthCode: string): number {
    const months: { [key: string]: number } = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };
    return months[monthCode] || 1;
  }

  /**
   * Get fresh arrival total
   */
  getFreshArrival(): number {
    return this.overviewSummary?.totalArrivals || 0;
  }

  /**
   * Get monthly totals from daily register
   */
  getMonthlyTotalsFromDailyRegister(): { totalIssued: number; totalWastage: number } {
    return {
      totalIssued: this.overviewSummary?.totalUtilized || 0,
      totalWastage: this.overviewSummary?.totalWastage || 0
    };
  }

  /**
   * Check if there are detail rows
   */
  get hasDetailRows(): boolean {
    return this.statementRows.some(row => row.rowType !== 'SUMMARY');
  }

  get filteredStatementRows(): StatementRow[] {
    if (!this.dateFilter) return this.statementRows;
    return this.statementRows.filter(row => {
      if (row.rowType === 'SUMMARY') return true;
      const dt = row.meta?.transactionDateTime || row.label || '';
      if (!dt) return false;
      const parsed = new Date(dt);
      if (Number.isNaN(parsed.getTime())) {
        // Try parsing from label like "Arrival - 5/2/2026"
        const match = dt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (!match) return false;
        const rowIso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        return rowIso === this.dateFilter;
      }
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}` === this.dateFilter;
    });
  }

  /**
   * Get row class for styling
   */
  getRowClass(row: StatementRow): string {
    if (row.rowType === 'ARRIVAL') {
      return 'arrival-row';
    } else if (row.rowType === 'UTILIZATION') {
      return 'utilization-row';
    }
    return '';
  }

  /**
   * Auto-calculate from daily register (refresh)
   */
  autoCalculateFromDaily(): void {
    this.loadMonthlyReport();
  }

  exportMonthlyReportCsv(): void {
    if (!this.overviewSummary) {
      return;
    }

    const monthNumber = this.getMonthNumber(this.selectedMonth);
    const monthKey = `${this.selectedYear}-${String(monthNumber).padStart(2, '0')}`;
    const unit = this.commissionerMode ? (this.selectedManufacturingUnit || 'ALL_UNITS') : 'OIC';
    const safeUnit = unit.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'UNIT';
    const filename = `monthly_hologram_${monthKey}_${this.selectedHologramType}_${safeUnit}.csv`;

    const toCsvCell = (value: any): string => {
      const text = String(value ?? '');
      const escaped = text.replace(/\"/g, '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    };

    const formatDate = (iso: any): string => {
      const dt = iso ? new Date(iso) : null;
      if (!dt || Number.isNaN(dt.getTime())) {
        return '';
      }
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const lines: string[] = [];
    lines.push(['Month', this.selectedMonth, 'Year', this.selectedYear, 'Type', this.selectedHologramType, 'Unit', unit].map(toCsvCell).join(','));
    lines.push(['Opening Stock', this.overviewSummary.openingStock, 'Fresh Arrival', this.overviewSummary.totalArrivals, 'Total Utilized', this.overviewSummary.totalUtilized, 'Total Wastage', this.overviewSummary.totalWastage, 'Closing Balance', this.overviewSummary.closingBalance].map(toCsvCell).join(','));
    lines.push('');

    // One transaction per row (arrival/utilization) to keep the report easy to read/print.
    const header = [
      'Txn Type',
      'Date',
      'Reference No',
      'Arrival Rolls',
      'Arrival Qty',
      'Utilized Brands',
      'Utilized Qty',
      'Damaged Brands',
      'Damaged Qty',
      'Opening Balance',
      'Closing Balance'
    ];
    lines.push(header.map(toCsvCell).join(','));

    const rows = (this.filteredStatementRows || []).filter((r) => r.rowType !== 'SUMMARY');
    const joinUnique = (items: string[]): string => Array.from(new Set(items.map((v) => (v || '').trim()).filter(Boolean))).join(' | ');

    for (const row of rows) {
      const refNo = row.meta?.referenceNo || '';
      const date = formatDate(row.meta?.transactionDateTime);
      const opening = row.meta?.openingBalanceForGroup ?? '';
      const closing = row.meta?.closingBalanceForGroup ?? row.closingBalance ?? '';

      if (row.rowType === 'ARRIVAL') {
        const ranges = Array.isArray(row.meta?.cartonRanges) ? row.meta?.cartonRanges : [];
        const rollSummary = ranges.length > 0
          ? joinUnique(ranges.map((r: any) => `${String(r?.cartoonNumber || '').trim()} ${String(r?.fromSerial || '').trim()}-${String(r?.toSerial || '').trim()}`.trim()))
          : (row.meta?.cartoonNumber || '');
        lines.push([
          'ARRIVAL',
          date,
          refNo,
          rollSummary,
          Number(row.freshArrival || 0),
          '',
          '',
          '',
          '',
          opening,
          closing
        ].map(toCsvCell).join(','));
        continue;
      }

      if (row.rowType === 'UTILIZATION') {
        const utilizationDetails = Array.isArray(row.utilizationDetails) ? row.utilizationDetails : [];
        const wastageDetails = Array.isArray(row.wastageDetails) ? row.wastageDetails : [];

        const utilizedQty = Number(row.utilizationQty || 0);
        const damagedQty = Number(row.wastageQty || 0);
        const utilizedBrands = utilizationDetails.length > 0
          ? joinUnique(utilizationDetails.map((d: any) => `${d?.brandName || ''} ${d?.bottleSize || ''}`.trim()))
          : String(row.brandDetails || '').trim();
        const damagedBrands = wastageDetails.length > 0
          ? joinUnique(wastageDetails.map((d: any) => `${d?.brandName || ''} ${d?.bottleSize || ''}`.trim()))
          : String(row.brandDetails || '').trim();

        lines.push([
          'UTILIZATION',
          date,
          refNo,
          '',
          '',
          utilizedBrands,
          utilizedQty || '',
          damagedBrands,
          damagedQty || '',
          opening,
          closing
        ].map(toCsvCell).join(','));
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Get unique brands from utilization details
   */
  getUniqueBrands(details: Array<{ rollName: string; brandName: string; bottleSize: string; ranges: any[] }>): Array<{ brandName: string }> {
    const uniqueBrands = new Map<string, { brandName: string }>();
    details.forEach(detail => {
      if (!uniqueBrands.has(detail.brandName)) {
        uniqueBrands.set(detail.brandName, { brandName: detail.brandName });
      }
    });
    return Array.from(uniqueBrands.values());
  }

  /**
   * Get unique bottle sizes from utilization details
   */
  getUniqueBottleSizes(details: Array<{ rollName: string; brandName: string; bottleSize: string; ranges: any[] }>): Array<{ bottleSize: string }> {
    const uniqueSizes = new Map<string, { bottleSize: string }>();
    details.forEach(detail => {
      if (!uniqueSizes.has(detail.bottleSize)) {
        uniqueSizes.set(detail.bottleSize, { bottleSize: detail.bottleSize });
      }
    });
    return Array.from(uniqueSizes.values());
  }

  /**
   * Get total quantity for a brand (sum of all ranges)
   */
  getTotalQtyForBrand(detail: { rollName: string; brandName: string; bottleSize: string; ranges: Array<{ from: string; to: string; qty: number }> }): number {
    return detail.ranges.reduce((sum, range) => sum + (range.qty || 0), 0);
  }

  /**
   * Get roll range from roll name (extracts the range part like "1 - 100" from "a1(a) - 1 - 100_BRAND_3")
   */
  getRollRange(rollName: string): string {
    // Try to extract range from roll name format: "a1(a) - 1 - 100_BRAND_3"
    const match = rollName.match(/(\d+)\s*-\s*(\d+)/);
    if (match) {
      return `${match[1]} → ${match[2]}`;
    }
    return 'N/A';
  }

  /**
   * Get roll display name (extracts the roll identifier like "a1(a)" from "a1(a) - 1 - 100_BRAND_3")
   */
  getRollDisplayName(rollName: string): string {
    // Extract the roll identifier before the first dash and range
    const parts = rollName.split(' - ');
    if (parts.length > 0) {
      return parts[0].trim();
    }
    return rollName;
  }

  /**
   * Get roll border color based on roll index
   */
  getRollBorderColor(rollIndex: number): string {
    const colors = [
      '#007bff', // Blue
      '#28a745', // Green  
      '#dc3545', // Red
      '#ffc107', // Yellow
      '#6f42c1', // Purple
      '#fd7e14', // Orange
      '#20c997', // Teal
      '#e83e8c', // Pink
      '#6c757d', // Gray
      '#17a2b8'  // Cyan
    ];
    return colors[rollIndex % colors.length];
  }

  /**
   * Get roll background color based on roll index (light version)
   */
  getRollBackgroundColor(rollIndex: number): string {
    const lightColors = [
      '#e3f2fd', // Light Blue
      '#e8f5e8', // Light Green
      '#ffeaea', // Light Red
      '#fff8e1', // Light Yellow
      '#f3e5f5', // Light Purple
      '#fff3e0', // Light Orange
      '#e0f7fa', // Light Teal
      '#fce4ec', // Light Pink
      '#f8f9fa', // Light Gray
      '#e0f2f1'  // Light Cyan
    ];
    return lightColors[rollIndex % lightColors.length];
  }

  private getRangeBoundsFromAssignmentKey(assignmentKey: string): { from: string; to: string } {
    const text = String(assignmentKey || '').trim();
    if (!text) {
      return { from: '-', to: '-' };
    }
    const pipeIndex = text.indexOf('|');
    const rangePart = pipeIndex >= 0 ? text.slice(pipeIndex + 1) : '';
    const dashIndex = rangePart.indexOf('-');
    if (dashIndex < 0) {
      return { from: '-', to: '-' };
    }
    const from = String(rangePart.slice(0, dashIndex) || '').trim() || '-';
    const to = String(rangePart.slice(dashIndex + 1) || '').trim() || '-';
    return { from, to };
  }

  /**
   * Get unique rolls count from utilization or wastage details
   * Only count rolls that actually have quantity > 0
   */
  getUniqueRollsCount(details: Array<{ rollName: string; brandName: string; bottleSize: string; ranges: any[] }> | undefined): number {
    if (!details || !Array.isArray(details)) {
      return 0;
    }
    const uniqueRolls = new Set<string>();
    details.forEach(detail => {
      // Only count rolls that have actual quantity > 0
      const totalQty = detail.ranges.reduce((sum, range) => sum + (range.qty || 0), 0);
      if (totalQty > 0) {
        // Use rollAssignmentKey if available to ensure we count unique roll assignments, not just roll names
        const rollKey = (detail as any).rollAssignmentKey || detail.rollName;
        uniqueRolls.add(rollKey);
      }
    });
    return uniqueRolls.size;
  }

  /**
   * Get total wastage quantity for a brand (sum of all ranges)
   */
  getTotalWastageForBrand(detail: { rollName: string; brandName: string; bottleSize: string; ranges: Array<{ from: string; to: string; qty: number }> }): number {
    return detail.ranges.reduce((sum, range) => sum + (range.qty || 0), 0);
  }

  /**
   * Get assigned rolls ranges for display in the label column
   * This shows the original assigned ranges for each roll assignment (not just unique rolls)
   * Only show ONE entry per unique roll assignment, not per brand
   */
  getAssignedRollsRanges(row: StatementRow): Array<{ rollName: string; range: string; rollAssignmentIndex: number }> {
    if (row.meta?.assignedRollRanges && row.meta.assignedRollRanges.length > 0) {
      return row.meta.assignedRollRanges;
    }

    const rollsRanges: Array<{ rollName: string; range: string; rollAssignmentIndex: number }> = [];
    
    if (row.utilizationDetails && row.utilizationDetails.length > 0) {
      // Create a set to track unique roll assignments (not just roll names)
      // Use rollAssignmentKey to ensure we only show each assignment once
      const processedAssignments = new Set<string>();
      
      row.utilizationDetails.forEach(detail => {
        const rollName = this.getRollDisplayName(detail.rollName);
        const assignmentKey = detail.rollAssignmentKey || detail.rollName;
        const assignmentIndex = detail.rollAssignmentIndex ?? 0;
        
        // Only process each roll assignment once (not per brand)
        if (!processedAssignments.has(assignmentKey)) {
          processedAssignments.add(assignmentKey);
          
          // Try to extract the original range from the roll name
          // Roll name format might be like "a1(a) - 1 - 100_BRAND_3"
          const rangeMatch = detail.rollName.match(/(\d+)\s*-\s*(\d+)/);
          
          if (rangeMatch) {
            rollsRanges.push({
              rollName: rollName,
              range: `${rangeMatch[1]}-${rangeMatch[2]}`,
              rollAssignmentIndex: assignmentIndex
            });
          } else {
            // Fallback: use the ranges from detail.ranges
            if (detail.ranges && detail.ranges.length > 0) {
              const allFromNumbers = detail.ranges.map(r => {
                const num = parseInt(r.from.toString().replace(/\D/g, ''));
                return isNaN(num) ? 0 : num;
              });
              const allToNumbers = detail.ranges.map(r => {
                const num = parseInt(r.to.toString().replace(/\D/g, ''));
                return isNaN(num) ? 0 : num;
              });
              
              if (allFromNumbers.length > 0 && allToNumbers.length > 0) {
                const minFrom = Math.min(...allFromNumbers);
                const maxTo = Math.max(...allToNumbers);
                
                if (minFrom > 0 && maxTo > 0) {
                  rollsRanges.push({
                    rollName: rollName,
                    range: `${minFrom}-${maxTo}`,
                    rollAssignmentIndex: assignmentIndex
                  });
                }
              }
            }
          }
        }
      });
    }
    
    return rollsRanges;
  }

  private buildAssignedRollRangesFromEntries(entries: any[]): Array<{ rollName: string; range: string; rollAssignmentIndex: number }> {
    const results: Array<{ rollName: string; range: string; rollAssignmentIndex: number }> = [];
    const seen = new Set<string>();
    const assignmentIndexByKey = new Map<string, number>();
    let nextIndex = 0;

    for (const entry of entries || []) {
      const assignedRolls = this.getAssignedRollsForEntry(entry);
      if (assignedRolls.length > 0) {
        for (const assigned of assignedRolls) {
          const range = `${assigned.fromSerial || '-'}-${assigned.toSerial || '-'}`;
          const rollLabel = String(assigned.rollLabel || 'Unknown').trim() || 'Unknown';
          const rawAssignmentKey = this.commissionerMode ? `${rollLabel}|${range}` : rollLabel;
          const rollName = this.getRollDisplayName(rollLabel);
          if (!assignmentIndexByKey.has(rawAssignmentKey)) {
            assignmentIndexByKey.set(rawAssignmentKey, nextIndex++);
          }
          const assignmentIndex = assignmentIndexByKey.get(rawAssignmentKey) ?? 0;
          const key = rawAssignmentKey;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          results.push({ rollName, range, rollAssignmentIndex: assignmentIndex });
        }
        continue;
      }

      const rawAssignmentKey = String(this.resolveEntryRollName(entry) || 'Unknown').trim() || 'Unknown';
      const rollName = this.getRollDisplayName(rawAssignmentKey);
      if (!assignmentIndexByKey.has(rawAssignmentKey)) {
        assignmentIndexByKey.set(rawAssignmentKey, nextIndex++);
      }
      const assignmentIndex = assignmentIndexByKey.get(rawAssignmentKey) ?? 0;

      const entryBounds = this.extractAllSerialBounds(entry);
      let bounds = entryBounds;

      if (bounds.length === 0) {
        const fallbackRanges = this.getFallbackIssuedRangesFromEntry(entry);
        if (fallbackRanges.length > 0) {
          for (const fallback of fallbackRanges) {
            const range = `${String(fallback.fromSerial || '').trim() || '-'}-${String(fallback.toSerial || '').trim() || '-'}`;
            const fallbackRollLabel = String(fallback.rollLabel || rawAssignmentKey || 'Unknown').trim() || 'Unknown';
            const fallbackAssignmentKey = this.commissionerMode ? `${fallbackRollLabel}|${range}` : fallbackRollLabel;
            const fallbackRollName = this.getRollDisplayName(fallbackRollLabel);
            if (!assignmentIndexByKey.has(fallbackAssignmentKey)) {
              assignmentIndexByKey.set(fallbackAssignmentKey, nextIndex++);
            }
            const fallbackAssignmentIndex = assignmentIndexByKey.get(fallbackAssignmentKey) ?? 0;
            const key = fallbackAssignmentKey;
            if (seen.has(key)) {
              continue;
            }
            seen.add(key);
            results.push({
              rollName: fallbackRollName,
              range,
              rollAssignmentIndex: fallbackAssignmentIndex
            });
          }
          continue;
        }
      }

      if (bounds.length === 0) {
        continue;
      }

      for (const b of bounds) {
        const range = `${b.from || '-'}-${b.to || '-'}`;
        const assignmentKey = this.commissionerMode ? `${rawAssignmentKey}|${range}` : rawAssignmentKey;
        if (!assignmentIndexByKey.has(assignmentKey)) {
          assignmentIndexByKey.set(assignmentKey, nextIndex++);
        }
        const assignmentIndex = assignmentIndexByKey.get(assignmentKey) ?? 0;
        const key = `${assignmentKey}|${range}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        results.push({ rollName, range, rollAssignmentIndex: assignmentIndex });
      }
    }

    return results;
  }

  /**
   * Group brands by roll assignment (not just roll name)
   * This ensures each roll assignment shows separately with its own color
   */
  getBrandsByRoll(utilizationDetails: Array<{
    rollName: string;
    rollAssignmentKey?: string;
    rollAssignmentIndex?: number;
    brandNumber?: number;
    brandName: string;
    bottleSize: string;
    ranges: Array<{ from: string; to: string; qty: number }>;
  }>): Array<{
    rollName: string;
    rollAssignmentKey: string;
    rollAssignmentIndex: number;
    brandCount: number; // NEW: Total number of brands in this roll assignment
    totalQty: number; // NEW: Total quantity for this roll assignment
    brands: Array<{
      brandNumber?: number; // NEW: Brand number within this roll assignment
      brandName: string;
      bottleSize: string;
      totalQty: number;
      allRanges: Array<{ from: string; to: string; qty: number }>; // NEW: All ranges for this brand
    }>;
  }> {
    // Group by roll assignment key (roll + range), not just roll name
    const rollsMap = new Map<string, {
      rollName: string;
      rollAssignmentIndex: number;
      brands: Map<string, {
        brandNumber?: number;
        brandName: string;
        bottleSize: string;
        allRanges: Array<{ from: string; to: string; qty: number }>;
      }>;
    }>();
    const assignmentIndexByGroupKey = new Map<string, number>();
    let nextGroupIndex = 0;
    
    utilizationDetails.forEach(detail => {
      const firstRange = Array.isArray(detail.ranges) && detail.ranges.length > 0
        ? detail.ranges[0]
        : null;
      const rangeKey = `${String(firstRange?.from ?? '').trim() || '-'}-${String(firstRange?.to ?? '').trim() || '-'}`;
      const explicitKey = String(detail.rollAssignmentKey || '').trim();
      const groupKey = this.commissionerMode
        ? (explicitKey.includes('|') ? explicitKey : `${detail.rollName}|${rangeKey}`)
        : (explicitKey || detail.rollName);
      const rollDisplayName = this.getRollDisplayName(detail.rollName);
      
      if (!rollsMap.has(groupKey)) {
        if (!assignmentIndexByGroupKey.has(groupKey)) {
          assignmentIndexByGroupKey.set(groupKey, nextGroupIndex++);
        }
        rollsMap.set(groupKey, {
          rollName: rollDisplayName,
          rollAssignmentIndex: assignmentIndexByGroupKey.get(groupKey) ?? 0,
          brands: new Map()
        });
      }
      
      const rollData = rollsMap.get(groupKey)!;
      
      // Group by brand name within this roll assignment
      if (!rollData.brands.has(detail.brandName)) {
        rollData.brands.set(detail.brandName, {
          brandNumber: detail.brandNumber,
          brandName: detail.brandName,
          bottleSize: detail.bottleSize,
          allRanges: []
        });
      }
      
      // Add all ranges from this detail to the brand's allRanges
      const brandData = rollData.brands.get(detail.brandName)!;
      const normalizedRanges = (Array.isArray(detail.ranges) ? detail.ranges : []).map((range) => ({
        from: String(range?.from ?? '').trim() || '-',
        to: String(range?.to ?? '').trim() || '-',
        qty: Number(range?.qty || 0)
      }));
      brandData.allRanges.push(...normalizedRanges);
    });
    
    // Convert map to array with roll assignment info and brand count
    return Array.from(rollsMap.entries()).map(([key, value]) => {
      const brandsArray = Array.from(value.brands.values()).map(brand => ({
        brandNumber: brand.brandNumber,
        brandName: brand.brandName,
        bottleSize: brand.bottleSize,
        totalQty: brand.allRanges.reduce((sum, range) => sum + (range.qty || 0), 0),
        allRanges: brand.allRanges
      }));
      
      return {
        rollName: value.rollName,
        rollAssignmentKey: key,
        rollAssignmentIndex: value.rollAssignmentIndex,
        brandCount: brandsArray.length,
        totalQty: brandsArray.reduce((sum, brand) => sum + brand.totalQty, 0),
        brands: brandsArray
      };
    });
  }

  /**
   * Get details for a specific brand within a roll assignment
   * This is used to get all range details for a specific brand in the consolidated display
   */
  getDetailsForBrand(
    details: Array<{
      rollName: string;
      rollAssignmentKey?: string;
      rollAssignmentIndex?: number;
      brandNumber?: number;
      brandName: string;
      bottleSize: string;
      ranges: Array<{ from: string; to: string; qty: number }>;
    }> | undefined,
    rollAssignmentKey: string,
    brandName: string
  ): Array<{
    rollName: string;
    rollAssignmentKey?: string;
    rollAssignmentIndex?: number;
    brandNumber?: number;
    brandName: string;
    bottleSize: string;
    ranges: Array<{ from: string; to: string; qty: number }>;
  }> {
    if (!details || !Array.isArray(details)) {
      return [];
    }

    return details.filter(detail => {
      const detailAssignmentKey = detail.rollAssignmentKey || detail.rollName;
      return detailAssignmentKey === rollAssignmentKey && detail.brandName === brandName;
    });
  }

  /**
   * Check if all brands in a roll group have zero wastage/utilization
   */
  hasNoWastageInRollGroup(brands: Array<{ brandName: string; bottleSize: string; totalQty: number; allRanges: any[] }>): boolean {
    return brands.every(brand => brand.totalQty === 0);
  }

  private loadDropdownSources(): void {
    this.loadOicMappedEstablishments();
    this.loadCreatedDistilleryBreweryNames();
    this.loadHologramRequestLicensees();
  }

  private loadCreatedDistilleryBreweryNames(): void {
    this.http.get<any>(`${this.licenseApiBase}/list/?page_size=2000`).subscribe({
      next: (payload) => {
        const rows = this.extractRows(payload);
        const result = new Set<string>();
        for (const row of rows) {
          if (!this.isDistilleryOrBrewery(row)) {
            continue;
          }
          const name = this.extractLicenseeName(row);
          if (name) {
            result.add(name);
            const normalized = this.normalizeManufacturingUnitName(name);
            const licId = String(row?.licensee_id ?? row?.licenseeId ?? '').trim();
            if (normalized && licId) {
              this.licenseeIdByNormalizedName.set(normalized, licId);
            }
          }
        }
        this.createdDistilleryBreweryNames = Array.from(result).sort((a, b) => a.localeCompare(b));
        this.updateManufacturingUnits();
      },
      error: () => {
        this.createdDistilleryBreweryNames = [];
        this.updateManufacturingUnits();
      }
    });
  }

  private loadOicMappedEstablishments(): void {
    this.http.get<any>(`${this.authUsersApiBase}/oic/officers/?page_size=2000`).subscribe({
      next: (payload) => {
        const rows = this.extractRows(payload);
        const names = new Set<string>();
        for (const row of rows) {
          const name = String(row?.establishment_name || row?.establishmentName || '').trim();
          if (name) {
            names.add(name);
          }
        }
        this.oicMappedEstablishmentNames = Array.from(names).sort((a, b) => a.localeCompare(b));
        this.updateManufacturingUnits();
      },
      error: () => {
        this.oicMappedEstablishmentNames = [];
        this.updateManufacturingUnits();
      }
    });
  }

  private loadHologramRequestLicensees(): void {
    this.http.get<any>(`${this.hologramApiBase}/request/?page_size=2000`).subscribe({
      next: (payload) => {
        const rows = this.extractRows(payload);
        const names = new Set<string>();
        for (const row of rows) {
          const name = this.extractManufacturingUnitName(row);
          if (name) {
            names.add(name);
          }
        }

        this.hologramRequestLicenseeNames = Array.from(names).sort((a, b) => a.localeCompare(b));
        this.updateManufacturingUnits();
      },
      error: () => {
        this.hologramRequestLicenseeNames = [];
        this.updateManufacturingUnits();
      }
    });
  }

  private extractRows(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const candidates = [
      payload.results,
      payload.data,
      payload.items,
      payload.rows,
      payload.entries,
      payload.approved,
      payload.officers,
      payload.establishments
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private updateManufacturingUnitsFromData(dailyEntries: any[], rollsDetails: any[]): void {
    if (!this.commissionerMode) {
      return;
    }

    const names = new Set<string>();
    for (const entry of dailyEntries || []) {
      const name = this.extractManufacturingUnitName(entry);
      if (name) {
        names.add(name);
      }
      const normalized = this.normalizeManufacturingUnitName(name);
      const licId = this.extractLicenseeId(entry);
      if (normalized && licId) {
        this.licenseeIdByNormalizedName.set(normalized, licId);
      }
    }

    for (const roll of rollsDetails || []) {
      const name = this.extractManufacturingUnitName(roll);
      if (name) {
        names.add(name);
      }
      const normalized = this.normalizeManufacturingUnitName(name);
      const licId = this.extractLicenseeId(roll);
      if (normalized && licId) {
        this.licenseeIdByNormalizedName.set(normalized, licId);
      }
    }

    const merged = new Set<string>([
      ...this.createdDistilleryBreweryNames,
      ...this.oicMappedEstablishmentNames,
      ...this.hologramRequestLicenseeNames,
      ...Array.from(names)
    ]);

    this.manufacturingUnits = Array.from(merged).sort((a, b) => a.localeCompare(b));
    if (!this.selectedManufacturingUnit && this.manufacturingUnits.length > 0) {
      this.selectedManufacturingUnit = this.manufacturingUnits[0];
    } else if (this.selectedManufacturingUnit && !this.manufacturingUnits.includes(this.selectedManufacturingUnit)) {
      this.selectedManufacturingUnit = this.manufacturingUnits[0] || '';
    }
  }

  private updateManufacturingUnits(): void {
    if (!this.commissionerMode) {
      return;
    }

    const merged = new Set<string>([
      ...this.createdDistilleryBreweryNames,
      ...this.oicMappedEstablishmentNames,
      ...this.hologramRequestLicenseeNames,
      ...this.manufacturingUnits
    ]);

    this.manufacturingUnits = Array.from(merged).sort((a, b) => a.localeCompare(b));
    if (!this.selectedManufacturingUnit && this.manufacturingUnits.length > 0) {
      this.selectedManufacturingUnit = this.manufacturingUnits[0];
    } else if (this.selectedManufacturingUnit && !this.manufacturingUnits.includes(this.selectedManufacturingUnit)) {
      this.selectedManufacturingUnit = this.manufacturingUnits[0] || '';
    }
  }

  private matchesSelectedManufacturingUnit(entity: any): boolean {
    if (!this.commissionerMode || !this.selectedManufacturingUnit) {
      return true;
    }

    const selected = this.normalizeManufacturingUnitName(this.selectedManufacturingUnit);
    const current = this.normalizeManufacturingUnitName(this.extractManufacturingUnitName(entity));

    if (!selected) {
      return true;
    }
    if (!current) {
      // Some backend rows (daily/roll) may not include manufacturing unit fields.
      // Do not hide such rows in commissioner monthly view.
      return true;
    }

    // Handle variants like "Sikkim Distillery Ltd | Unit A" vs "Sikkim Distillery Ltd"
    return current === selected || current.startsWith(selected) || selected.startsWith(current);
  }

  private extractManufacturingUnitName(row: any): string {
    return String(
      row?.distilleryName ||
      row?.distillery_name ||
      row?.licenseeName ||
      row?.licensee_name ||
      row?.manufacturingUnit ||
      row?.manufacturing_unit ||
      row?.manufacturing_unit_name ||
      row?.manufacturingUnitName ||
      row?.establishment_name ||
      row?.establishmentName ||
      ''
    ).trim();
  }

  private extractLicenseeId(row: any): string {
    // NOTE: Do not fall back to `row.id` here. Many endpoints use `id` for the record id
    // (daily register row, roll row, license master row) which is NOT the licensee id expected
    // by commissioner monthly-report endpoints.
    const raw = row?.licensee_id ?? row?.licenseeId ?? row?.licensee ?? row?.license_id ?? row?.licenseId ?? '';
    const id = String(raw ?? '').trim();
    return id && id !== '0' ? id : '';
  }

  private resolveSelectedLicenseeId(
    dailyRows: any[],
    rollsArray: any[],
    procurementRows: any[],
    commissionerOverviewEntries: any[]
  ): string {
    if (!this.selectedManufacturingUnit) {
      return '';
    }

    const selected = this.normalizeManufacturingUnitName(this.selectedManufacturingUnit);
    if (!selected) {
      return '';
    }

    const fromMap = this.licenseeIdByNormalizedName.get(selected);
    if (fromMap) {
      return fromMap;
    }

    const candidates = [
      ...(dailyRows || []),
      ...(rollsArray || []),
      ...(procurementRows || []),
      ...(commissionerOverviewEntries || [])
    ];

    for (const row of candidates) {
      const name = this.normalizeManufacturingUnitName(this.extractManufacturingUnitName(row));
      if (!name) {
        continue;
      }
      if (name === selected || name.startsWith(selected) || selected.startsWith(name)) {
        const licId = this.extractLicenseeId(row);
        if (licId) {
          this.licenseeIdByNormalizedName.set(selected, licId);
          return licId;
        }
      }
    }

    return '';
  }

  private normalizeManufacturingUnitName(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/\s*\|\s*.*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractReferenceNo(row: any): string {
    return String(
      row?.reference_no ||
      row?.referenceNo ||
      row?.procurement_ref ||
      row?.procurementRef ||
      row?.ref_no ||
      row?.refNo ||
      ''
    ).trim();
  }

  private normalizeReferenceNo(value: string): string {
    return String(value || '').replace(/\s+/g, '').trim().toLowerCase();
  }

  private mapCommissionerOverviewEntriesToMonthlyRows(entries: any[]): any[] {
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries.flatMap((entry: any) => {
      const brands = Array.isArray(entry?.brandsEntered) ? entry.brandsEntered : [];
      const base = {
        id: entry?.id,
        usage_date: entry?.usageDate || entry?.submissionDate || '',
        usageDate: entry?.usageDate || entry?.submissionDate || '',
        hologram_type: entry?.hologramType || 'LOCAL',
        hologramType: entry?.hologramType || 'LOCAL',
        approval_status: entry?.status || '',
        approvalStatus: entry?.status || '',
        reference_no: entry?.referenceNo || '',
        referenceNo: entry?.referenceNo || '',
        distilleryName: entry?.distilleryName || '',
        distillery_name: entry?.distilleryName || '',
        created_at: entry?.submissionDate || entry?.usageDate || '',
        createdAt: entry?.submissionDate || entry?.usageDate || '',
        brandsEntered: brands
      };

      // Commissioner monthly view should only show data after OIC has actually saved/entered daily register rows.
      // "Under Process / Assigned" requests without any brand rows must not appear.
      if (brands.length === 0) {
        return [];
      }

      return brands.map((brand: any, index: number) => {
        const issuedRanges = this.getBrandRanges(brand);
        const wastageRangesRaw = this.getBrandWastageRanges(brand);

        const issuedQtyFromRanges = issuedRanges.reduce((sum, r) => sum + Number(r?.quantity || 0), 0);
        const brandIssuedQty = Number(brand?.issuedQty ?? brand?.quantity ?? issuedQtyFromRanges ?? 0);
        const wastageQtyFromRanges = wastageRangesRaw.reduce((sum, r) => sum + Number(r?.quantity || 0), 0);
        let brandWastageQty = Number(brand?.wastageQty ?? 0);
        if (!brandWastageQty && wastageQtyFromRanges) {
          brandWastageQty = wastageQtyFromRanges;
        }
        const firstSerialRange = this.extractFirstSerialRange([brand]);

        const effectiveIssuedRanges =
          issuedRanges.length > 0
            ? issuedRanges
            : ((firstSerialRange.from || firstSerialRange.to)
                ? [{
                    fromSerial: firstSerialRange.from || '',
                    toSerial: firstSerialRange.to || '',
                    quantity: brandIssuedQty > 0 ? brandIssuedQty : 0
                  }]
                : (brandIssuedQty > 0 ? [{ fromSerial: '-', toSerial: '-', quantity: brandIssuedQty }] : []));

        const effectiveWastageRanges =
          wastageRangesRaw.length > 0
            ? wastageRangesRaw
            : (brandWastageQty > 0 ? [{ fromSerial: '-', toSerial: '-', quantity: brandWastageQty }] : []);

        const firstIssued = effectiveIssuedRanges[0] || { fromSerial: '', toSerial: '' };
        const assignedRollsRaw = [
          ...this.normalizeRangeArray(brand?.rollsAssigned),
          ...this.normalizeRangeArray(brand?.rolls_assigned),
          ...this.normalizeRangeArray(brand?.rollAssignments),
          ...this.normalizeRangeArray(brand?.assignedRolls)
        ];
        const assignedRolls =
          assignedRollsRaw.length > 0
            ? assignedRollsRaw
            : this.buildCommissionerAssignedRollsFromBrand(brand, effectiveIssuedRanges, brandIssuedQty);
        const firstRoll = assignedRolls.length > 0 ? assignedRolls[0] : null;
        const rollRangeText = String(brand?.rollRange || brand?.roll_range || '').trim();
        const normalizedBrandName = String(
          brand?.brandCode ||
          brand?.brand ||
          brand?.brandName ||
          brand?.brand_name ||
          ''
        ).trim();
        const normalizedBottleSize = String(
          brand?.bottleSize ||
          brand?.bottle_size ||
          brand?.size ||
          brand?.bottle ||
          ''
        ).trim();

        return {
          ...base,
          id: `${entry?.id || 'e'}-${index + 1}`,
          brand_index: index,
          brandIndex: index,
          issued_qty: brandIssuedQty,
          issuedQty: brandIssuedQty,
          wastage_qty: brandWastageQty,
          wastageQty: brandWastageQty,
          issued_from: firstIssued.fromSerial || '',
          issuedFrom: firstIssued.fromSerial || '',
          issued_to: firstIssued.toSerial || '',
          issuedTo: firstIssued.toSerial || '',
          wastage_from: (effectiveWastageRanges[0]?.fromSerial || ''),
          wastageFrom: (effectiveWastageRanges[0]?.fromSerial || ''),
          wastage_to: (effectiveWastageRanges[0]?.toSerial || ''),
          wastageTo: (effectiveWastageRanges[0]?.toSerial || ''),
          issued_ranges: effectiveIssuedRanges,
          issuedRanges: effectiveIssuedRanges,
          wastage_ranges: effectiveWastageRanges,
          wastageRanges: effectiveWastageRanges,
          brand_details: normalizedBrandName,
          brandDetails: normalizedBrandName,
          bottle_size: normalizedBottleSize,
          bottleSize: normalizedBottleSize,
          rolls_assigned: assignedRolls,
          rollsAssigned: assignedRolls,
          roll_range: rollRangeText,
          rollRange: rollRangeText,
          cartoon_number: firstRoll?.cartoonNumber || firstRoll?.cartoon_number || firstRoll?.rollNumber || firstRoll?.roll_number || '',
          cartoonNumber: firstRoll?.cartoonNumber || firstRoll?.cartoon_number || firstRoll?.rollNumber || firstRoll?.roll_number || ''
        };
      });
    });
  }

  private buildCommissionerAssignedRollsFromBrand(
    brand: any,
    effectiveIssuedRanges: Array<{ fromSerial: string; toSerial: string; quantity: number }>,
    fallbackQty: number
  ): any[] {
    const rollRangeText = String(brand?.rollRange || brand?.roll_range || '').trim();
    const parsedBounds = this.extractAllSerialBounds({ rollRange: rollRangeText, roll_range: rollRangeText });
    const rollLabelFromText = this.extractRollLabelFromText(rollRangeText);
    const fallbackLabel = String(
      brand?.rollNumber ||
      brand?.roll_number ||
      brand?.cartoonNumber ||
      brand?.cartoon_number ||
      ''
    ).trim();
    const rollLabel = rollLabelFromText || fallbackLabel || 'Unknown';

    if (parsedBounds.length > 0) {
      return parsedBounds.map((bound) => {
        const fromSerial = String(bound?.from || '').trim();
        const toSerial = String(bound?.to || '').trim();
        let quantity = Number(fallbackQty || 0);
        if (!quantity && fromSerial && toSerial) {
          const fromNo = Number(fromSerial);
          const toNo = Number(toSerial);
          if (Number.isFinite(fromNo) && Number.isFinite(toNo) && toNo >= fromNo) {
            quantity = (toNo - fromNo) + 1;
          }
        }
        return {
          rollNumber: rollLabel,
          cartoonNumber: rollLabel,
          fromSerial,
          toSerial,
          quantity
        };
      });
    }

    if (effectiveIssuedRanges.length > 0) {
      return effectiveIssuedRanges.map((range) => ({
        rollNumber: rollLabel,
        cartoonNumber: rollLabel,
        fromSerial: String(range?.fromSerial || '').trim(),
        toSerial: String(range?.toSerial || '').trim(),
        quantity: Number(range?.quantity || 0)
      }));
    }

    if (rollLabel !== 'Unknown') {
      return [{
        rollNumber: rollLabel,
        cartoonNumber: rollLabel,
        fromSerial: '',
        toSerial: '',
        quantity: Number(fallbackQty || 0)
      }];
    }

    return [];
  }

  private extractRollLabelFromText(text: string): string {
    const raw = String(text || '').trim();
    if (!raw) {
      return '';
    }

    const match = raw.match(/^(.+?)\s*(?:-|–|—|->|→|to)\s*\d+\s*(?:-|–|—|->|→|to)\s*\d+/i);
    if (!match) {
      return '';
    }

    return String(match[1] || '').replace(/[-:]+$/, '').trim();
  }

  private extractFirstSerialRange(brands: any[]): { from: string; to: string } {
    for (const brand of brands || []) {
      const rangeBuckets: any[][] = [
        this.normalizeRangeArray(brand?.issuedRanges),
        this.normalizeRangeArray(brand?.issued_ranges),
        this.normalizeRangeArray(brand?.serialRanges),
        this.normalizeRangeArray(brand?.rollsAssigned),
        this.normalizeRangeArray(brand?.rolls_assigned),
        this.normalizeRangeArray(brand?.rollAssignments),
        this.normalizeRangeArray(brand?.assignedRolls)
      ];

      for (const bucket of rangeBuckets) {
        for (const item of bucket) {
          const parsed = this.extractSerialBounds(item);
          if (parsed.from || parsed.to) {
            return parsed;
          }
        }
      }

      const direct = this.extractSerialBounds(brand);
      if (direct.from || direct.to) {
        return direct;
      }
    }

    return { from: '', to: '' };
  }

  private resolveEntryRollName(entry: any): string {
    const direct = String(
      entry?.cartoon_number ||
      entry?.cartoonNumber ||
      entry?.roll_range ||
      entry?.rollRange ||
      ''
    ).trim();
    if (direct) {
      return direct;
    }

    const assignedRoll = this.getAssignedRollsForEntry(entry)[0];
    if (assignedRoll?.rollLabel) {
      return String(assignedRoll.rollLabel).trim();
    }

    const fallbackRanges = this.getFallbackIssuedRangesFromEntry(entry);
    const firstLabel = String(fallbackRanges?.[0]?.rollLabel || '').trim();
    return firstLabel || 'Unknown';
  }

  private getAssignedRollsForEntry(entry: any): Array<{
    rollLabel: string;
    fromSerial: string;
    toSerial: string;
    quantity: number;
  }> {
    const extractFromItems = (items: any[]): Array<{
      rollLabel: string;
      fromSerial: string;
      toSerial: string;
      quantity: number;
    }> => {
      const rows: Array<{ rollLabel: string; fromSerial: string; toSerial: string; quantity: number }> = [];
      for (const item of items || []) {
        const rollLabel = String(
          item?.rollNumber ||
          item?.roll_number ||
          item?.cartoonNumber ||
          item?.cartoon_number ||
          item?.carton_number ||
          item?.rollName ||
          item?.roll_name ||
          ''
        ).trim();

        const parsedBounds = this.extractAllSerialBounds(item);
        const safeBounds = parsedBounds.length > 0 ? parsedBounds : [{ from: '', to: '' }];
        for (const parsed of safeBounds) {
          const fromSerial = String(parsed?.from || '').trim();
          const toSerial = String(parsed?.to || '').trim();
          let quantity = Number(item?.quantity ?? item?.qty ?? item?.count ?? item?.totalCount ?? item?.total_count ?? 0);
          if (!quantity && fromSerial && toSerial) {
            const fromNo = Number(fromSerial);
            const toNo = Number(toSerial);
            if (Number.isFinite(fromNo) && Number.isFinite(toNo) && toNo >= fromNo) {
              quantity = (toNo - fromNo) + 1;
            }
          }
          if (rollLabel || fromSerial || toSerial || quantity > 0) {
            rows.push({ rollLabel, fromSerial, toSerial, quantity });
          }
        }
      }
      return rows;
    };

    const directRolls = [
      ...this.normalizeRangeArray(entry?.rollsAssigned),
      ...this.normalizeRangeArray(entry?.rolls_assigned),
      ...this.normalizeRangeArray(entry?.rollsUsed),
      ...this.normalizeRangeArray(entry?.rolls_used),
      ...this.normalizeRangeArray(entry?.rollAssignments),
      ...this.normalizeRangeArray(entry?.assignedRolls)
    ];

    let resolvedRolls = extractFromItems(directRolls);

    if (resolvedRolls.length === 0) {
      const brands = this.normalizeRangeArray(entry?.brandsEntered);
      const requestedIndex = Number(entry?.brand_index ?? entry?.brandIndex ?? -1);
      const brandName = String(entry?.brand_details || entry?.brandDetails || '').trim().toLowerCase();
      const indexedBrand = Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < brands.length
        ? brands[requestedIndex]
        : null;
      const matchedBrand = indexedBrand || brands.find((b: any) => {
        const name = String(b?.brandCode || b?.brand || b?.brandName || b?.brand_name || '').trim().toLowerCase();
        return !!name && (!!brandName ? name === brandName : true);
      });
      const brandRolls = matchedBrand
        ? [
            ...this.normalizeRangeArray(matchedBrand?.rollsAssigned),
            ...this.normalizeRangeArray(matchedBrand?.rolls_assigned),
            ...this.normalizeRangeArray(matchedBrand?.rollAssignments),
            ...this.normalizeRangeArray(matchedBrand?.assignedRolls)
          ]
        : [];
      resolvedRolls = extractFromItems(brandRolls);
    }

    const dedup = new Map<string, { rollLabel: string; fromSerial: string; toSerial: string; quantity: number }>();
    resolvedRolls.forEach((r) => {
      const key = `${r.rollLabel}|${r.fromSerial}|${r.toSerial}|${r.quantity}`;
      if (!dedup.has(key)) {
        dedup.set(key, r);
      }
    });

    return Array.from(dedup.values());
  }

  private getFallbackIssuedRangesFromEntry(entry: any): Array<{
    fromSerial: string;
    toSerial: string;
    quantity: number;
    rollLabel?: string;
  }> {
    const brandName = String(entry?.brand_details || entry?.brandDetails || '').trim().toLowerCase();
    const brands = this.normalizeRangeArray(entry?.brandsEntered);
    if (brands.length === 0) {
      return [];
    }

    const requestedIndex = Number(entry?.brand_index ?? entry?.brandIndex ?? -1);
    const indexedBrand = Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < brands.length
      ? brands[requestedIndex]
      : null;

    const matchedBrand = indexedBrand || brands.find((b: any) => {
      const name = String(b?.brandCode || b?.brand || b?.brandName || b?.brand_name || '').trim().toLowerCase();
      return !!name && (!!brandName ? name === brandName : true);
    }) || brands[0];

    const assignedRolls = this.getAssignedRollsForEntry(entry);
    const ranges = this.getBrandRanges(matchedBrand);
    if (ranges.length > 0) {
      if (assignedRolls.length > 0) {
        return ranges.map((r) => {
          const matched = assignedRolls.find((roll) =>
            (!roll.fromSerial || roll.fromSerial === r.fromSerial) &&
            (!roll.toSerial || roll.toSerial === r.toSerial)
          ) || assignedRolls[0];
          return { ...r, rollLabel: matched?.rollLabel || '' };
        });
      }

      const firstRoll = this.normalizeRangeArray(matchedBrand?.rollsAssigned)[0] || this.normalizeRangeArray(matchedBrand?.rolls_assigned)[0];
      const rollLabel = String(firstRoll?.rollNumber || firstRoll?.roll_number || firstRoll?.cartoonNumber || firstRoll?.cartoon_number || '').trim();
      return ranges.map((r) => ({ ...r, rollLabel }));
    }

    const first = this.extractFirstSerialRange([matchedBrand]);
    if (first.from || first.to) {
      const qty = Number(entry?.issued_qty || entry?.issuedQty || 0);
      const rollLabel = String(assignedRolls[0]?.rollLabel || '').trim();
      return [{
        fromSerial: first.from || '',
        toSerial: first.to || '',
        quantity: qty > 0 ? qty : 0,
        rollLabel
      }];
    }

    if (assignedRolls.length > 0) {
      return assignedRolls.map((roll) => ({
        fromSerial: roll.fromSerial || '',
        toSerial: roll.toSerial || '',
        quantity: Number(roll.quantity || 0),
        rollLabel: roll.rollLabel || ''
      }));
    }

    return [];
  }

  private normalizeRangeArray(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) {
        return [];
      }
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private getBrandRanges(brand: any): Array<{ fromSerial: string; toSerial: string; quantity: number }> {
    const ranges: Array<{ fromSerial: string; toSerial: string; quantity: number }> = [];

    const normalizeRangeQuantity = (fromSerial: string, toSerial: string, rawQty: any): number => {
      let quantity = Number(rawQty ?? 0);
      if (!quantity && fromSerial && toSerial) {
        const fromNo = Number(fromSerial);
        const toNo = Number(toSerial);
        if (Number.isFinite(fromNo) && Number.isFinite(toNo) && toNo >= fromNo) {
          quantity = (toNo - fromNo) + 1;
        }
      }
      return quantity;
    };

    // Commissioner overview commonly provides issuedRanges / issued_ranges.
    const issuedRanges = this.normalizeRangeArray(
      Array.isArray(brand?.issuedRanges) || typeof brand?.issuedRanges === 'string'
        ? brand?.issuedRanges
        : brand?.issued_ranges
    );
    for (const item of issuedRanges) {
      const parsedRanges = this.extractAllSerialBounds(item);
      const safeRanges = parsedRanges.length > 0 ? parsedRanges : [{ from: '', to: '' }];
      for (const parsed of safeRanges) {
        const fromSerial = parsed.from;
        const toSerial = parsed.to;
        const quantity = normalizeRangeQuantity(fromSerial, toSerial, item?.count ?? item?.quantity ?? item?.qty);
        if (fromSerial || toSerial || quantity > 0) {
          ranges.push({ fromSerial, toSerial, quantity });
        }
      }
    }

    const serialRanges = this.normalizeRangeArray(
      Array.isArray(brand?.serialRanges) || typeof brand?.serialRanges === 'string'
        ? brand?.serialRanges
        : brand?.serial_ranges
    );
    for (const item of serialRanges) {
      const type = String(item?.type || '').trim().toUpperCase();
      // Commissioner overview mixes ISSUED and WASTAGE in a single serialRanges array.
      // By default, treat this helper as "issued ranges" and skip explicit WASTAGE items.
      if (type === 'WASTAGE') {
        continue;
      }
      const parsedRanges = this.extractAllSerialBounds(item);
      const safeRanges = parsedRanges.length > 0 ? parsedRanges : [{ from: '', to: '' }];
      for (const parsed of safeRanges) {
        const fromSerial = parsed.from;
        const toSerial = parsed.to;
        const quantity = normalizeRangeQuantity(fromSerial, toSerial, item?.count ?? item?.quantity ?? item?.qty);
        if (fromSerial || toSerial || quantity > 0) {
          ranges.push({ fromSerial, toSerial, quantity });
        }
      }
    }

    if (ranges.length === 0) {
      const rollsAssigned = [
        ...this.normalizeRangeArray(brand?.rollsAssigned),
        ...this.normalizeRangeArray(brand?.rolls_assigned),
        ...this.normalizeRangeArray(brand?.rollAssignments),
        ...this.normalizeRangeArray(brand?.assignedRolls)
      ];
      for (const item of rollsAssigned) {
        const parsedRanges = this.extractAllSerialBounds(item);
        const safeRanges = parsedRanges.length > 0 ? parsedRanges : [{ from: '', to: '' }];
        for (const parsed of safeRanges) {
          const fromSerial = parsed.from;
          const toSerial = parsed.to;
          const quantity = normalizeRangeQuantity(fromSerial, toSerial, item?.quantity ?? item?.qty ?? item?.total_count ?? item?.totalCount);
          if (fromSerial || toSerial || quantity > 0) {
            ranges.push({ fromSerial, toSerial, quantity });
          }
        }
      }
    }

    if (ranges.length === 0) {
      const parsedFromBrand = this.extractAllSerialBounds(brand);
      for (const parsed of parsedFromBrand) {
        const fromSerial = String(parsed?.from || '').trim();
        const toSerial = String(parsed?.to || '').trim();
        const quantity = normalizeRangeQuantity(fromSerial, toSerial, brand?.issuedQty ?? brand?.quantity ?? 0);
        if (fromSerial || toSerial || quantity > 0) {
          ranges.push({ fromSerial, toSerial, quantity });
        }
      }
    }

    if (ranges.length === 0) {
      const fromSerial = String(brand?.issuedFrom || brand?.issued_from || brand?.from || '').trim();
      const toSerial = String(brand?.issuedTo || brand?.issued_to || brand?.to || '').trim();
      const quantity = normalizeRangeQuantity(fromSerial, toSerial, brand?.issuedQty ?? brand?.quantity ?? 0);
      if (fromSerial || toSerial || quantity > 0) {
        ranges.push({ fromSerial, toSerial, quantity });
      }
    }

    const dedup = new Map<string, { fromSerial: string; toSerial: string; quantity: number }>();
    ranges.forEach((r) => {
      const key = `${r.fromSerial}|${r.toSerial}|${r.quantity}`;
      if (!dedup.has(key)) {
        dedup.set(key, r);
      }
    });

    return Array.from(dedup.values());
  }
  private extractSerialBounds(item: any): { from: string; to: string } {
    const all = this.extractAllSerialBounds(item);
    if (all.length > 0) {
      return all[0];
    }
    return { from: '', to: '' };
  }

  private extractAllSerialBounds(item: any): Array<{ from: string; to: string }> {
    const directFrom = String(
      item?.fromSerial ??
      item?.from_serial ??
      item?.fromSerialNo ??
      item?.from_serial_no ??
      item?.issuedFrom ??
      item?.issued_from ??
      item?.serialFrom ??
      item?.serial_from ??
      item?.fromNo ??
      item?.from_no ??
      item?.startSerial ??
      item?.start_serial ??
      item?.from ??
      ''
    ).trim();
    const directTo = String(
      item?.toSerial ??
      item?.to_serial ??
      item?.toSerialNo ??
      item?.to_serial_no ??
      item?.issuedTo ??
      item?.issued_to ??
      item?.serialTo ??
      item?.serial_to ??
      item?.toNo ??
      item?.to_no ??
      item?.endSerial ??
      item?.end_serial ??
      item?.to ??
      ''
    ).trim();

    if (directFrom || directTo) {
      return [{ from: directFrom, to: directTo }];
    }

    const rangeText = String(
      item?.roll_range ??
      item?.rollRange ??
      item?.range ??
      item?.serialRange ??
      item?.serial_range ??
      item?.issuedRange ??
      item?.issued_range ??
      ''
    ).trim();

    const results: Array<{ from: string; to: string }> = [];
    if (rangeText) {
      const regex = /(\d+)\s*(?:-|–|—|->|→|to)\s*(\d+)/gi;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(rangeText)) !== null) {
        results.push({ from: match[1], to: match[2] });
      }
      if (results.length === 0 && /^\d+$/.test(rangeText)) {
        results.push({ from: rangeText, to: rangeText });
      }
    }

    return results;
  }
  private getBrandWastageRanges(brand: any): Array<{ fromSerial: string; toSerial: string; quantity: number }> {
    const ranges: Array<{ fromSerial: string; toSerial: string; quantity: number }> = [];

    const normalizeRangeQuantity = (fromSerial: string, toSerial: string, rawQty: any): number => {
      let quantity = Number(rawQty ?? 0);
      if (!quantity && fromSerial && toSerial) {
        const fromNo = Number(fromSerial);
        const toNo = Number(toSerial);
        if (Number.isFinite(fromNo) && Number.isFinite(toNo) && toNo >= fromNo) {
          quantity = (toNo - fromNo) + 1;
        }
      }
      return quantity;
    };

    const wastageRanges = this.normalizeRangeArray(
      Array.isArray(brand?.wastageRanges) || typeof brand?.wastageRanges === 'string'
        ? brand?.wastageRanges
        : (
          brand?.wastage_ranges ??
          brand?.damageRanges ??
          brand?.damage_ranges ??
          brand?.damagedRanges ??
          brand?.damaged_ranges
        )
    );

    for (const item of wastageRanges) {
      const parsedRanges = this.extractAllSerialBounds(item);
      const safeRanges = parsedRanges.length > 0 ? parsedRanges : [{ from: '', to: '' }];
      for (const parsed of safeRanges) {
        const fromSerial = String(parsed?.from || '').trim();
        const toSerial = String(parsed?.to || '').trim();
        const quantity = normalizeRangeQuantity(fromSerial, toSerial, item?.count ?? item?.quantity ?? item?.qty);
        if (fromSerial || toSerial || quantity > 0) {
          ranges.push({ fromSerial, toSerial, quantity });
        }
      }
    }

    // Commissioner dashboard overview provides serialRanges with {type:'WASTAGE'} entries.
    const serialRanges = this.normalizeRangeArray(
      Array.isArray(brand?.serialRanges) || typeof brand?.serialRanges === 'string'
        ? brand?.serialRanges
        : brand?.serial_ranges
    );
    for (const item of serialRanges) {
      const type = String(item?.type || '').trim().toUpperCase();
      if (type !== 'WASTAGE') {
        continue;
      }
      const parsedRanges = this.extractAllSerialBounds(item);
      const safeRanges = parsedRanges.length > 0 ? parsedRanges : [{ from: '', to: '' }];
      for (const parsed of safeRanges) {
        const fromSerial = String(parsed?.from || '').trim();
        const toSerial = String(parsed?.to || '').trim();
        const quantity = normalizeRangeQuantity(fromSerial, toSerial, item?.count ?? item?.quantity ?? item?.qty);
        if (fromSerial || toSerial || quantity > 0) {
          ranges.push({ fromSerial, toSerial, quantity });
        }
      }
    }

    const dedup = new Map<string, { fromSerial: string; toSerial: string; quantity: number }>();
    ranges.forEach((r) => {
      const key = `${r.fromSerial}|${r.toSerial}|${r.quantity}`;
      if (!dedup.has(key)) {
        dedup.set(key, r);
      }
    });

    return Array.from(dedup.values());
  }

  private matchesApprovalStatus(rawStatus: string): boolean {
    const status = String(rawStatus || '').trim().toUpperCase();
    if (!status) {
      return true;
    }
    return ['APPROVED', 'PENDING', 'COMPLETED', 'UNDER_PROCESS', 'APPLIED', 'SAVED'].includes(status);
  }

  private getMonthKeyFromAnyDate(value: any): string {
    const text = String(value || '').trim();
    if (!text) {
      return '';
    }

    if (/^\d{4}-\d{2}/.test(text)) {
      return text.substring(0, 7);
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }

    const ddmmyyyy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      const month = ddmmyyyy[2].padStart(2, '0');
      return `${ddmmyyyy[3]}-${month}`;
    }

    return '';
  }

  private computeOpeningStockForMonth(
    monthKey: string,
    dailyRows: any[],
    rollsRows: any[],
    procurementRows: any[],
    commissionerOverviewEntries: any[] = []
  ): number {
    const arrivalByMonth = new Map<string, number>();
    const arrivalsByMonthAndRef = new Map<string, Map<string, any[]>>();
    const refsWithRolls = new Set<string>();

    const addArrivalItem = (mk: string, ref: string, item: any) => {
      if (!mk || !ref) return;
      if (!arrivalsByMonthAndRef.has(mk)) {
        arrivalsByMonthAndRef.set(mk, new Map<string, any[]>());
      }
      const byRef = arrivalsByMonthAndRef.get(mk)!;
      if (!byRef.has(ref)) {
        byRef.set(ref, []);
      }
      byRef.get(ref)!.push(item);
    };

    for (const roll of rollsRows || []) {
      const receivedDate = roll.received_date || roll.receivedDate || '';
      const rollMonthKey = this.getMonthKeyFromAnyDate(receivedDate);
      const rollType = (roll.type || 'LOCAL').toString().toUpperCase();
      if (!rollMonthKey || rollMonthKey >= monthKey) {
        continue;
      }
      if (rollType !== this.selectedHologramType) {
        continue;
      }
      if (!this.matchesSelectedManufacturingUnit(roll)) {
        continue;
      }
      const rawRef = this.extractReferenceNo(roll);
      const ref = this.normalizeReferenceNo(rawRef || `ROLL-${roll?.id || ''}`);
      if (rawRef) {
        refsWithRolls.add(this.normalizeReferenceNo(rawRef));
      }
      addArrivalItem(rollMonthKey, ref, roll);
    }

    for (const procurement of procurementRows || []) {
      const procurementDate =
        procurement?.date ||
        procurement?.created_at ||
        procurement?.createdAt ||
        procurement?.submission_date ||
        procurement?.submissionDate ||
        '';
      const procurementMonthKey = this.getMonthKeyFromAnyDate(procurementDate);
      if (!procurementMonthKey || procurementMonthKey >= monthKey) {
        continue;
      }
      if (!this.matchesSelectedManufacturingUnit(procurement)) {
        continue;
      }
      const rawRef = this.extractReferenceNo(procurement);
      const ref = this.normalizeReferenceNo(rawRef || `PROC-${procurement?.id || ''}`);

      // If rolls already exist for this procurement reference, skip the procurement fallback to prevent double-counting!
      if (rawRef && refsWithRolls.has(this.normalizeReferenceNo(rawRef))) {
        continue;
      }
      const byRefForMonth = arrivalsByMonthAndRef.get(procurementMonthKey);
      if (byRefForMonth && byRefForMonth.has(ref)) {
        continue;
      }

      // Only use procurement fallback if it has actual arrived carton details
      const cartonDetails = this.normalizeCartonDetails(procurement);
      if (!cartonDetails || cartonDetails.length === 0) {
        continue;
      }

      const qty = this.getProcurementQtyForSelectedType(procurement);
      if (qty <= 0) {
        continue;
      }
      // Procurement fallback: keep it as an "arrival item" so totals derive from serial ranges
      // when carton details are available (or from qty otherwise).
      addArrivalItem(procurementMonthKey, ref, {
        ...procurement,
        procurement_ref: rawRef,
        total_count: qty,
        totalCount: qty,
        carton_details: cartonDetails
      });
    }

    // Finalize monthly arrivals from original serial ranges (stable even after usage/damage)
    for (const [mk, byRef] of arrivalsByMonthAndRef.entries()) {
      const monthTotal = Array.from(byRef.values()).reduce(
        (sum, items) => sum + this.aggregateArrivalGroup(items).total,
        0
      );
      arrivalByMonth.set(mk, monthTotal);
    }

    // Commissioner fallback: when rolls/procurement data is unavailable for prior months,
    // derive the opening stock by computing a running balance from the earliest known month
    // using the daily rows (which already contain correct issued_qty / wastage_qty).
    // NOTE: Do NOT use overviewEntry.quantity as arrivals — that field is the requested
    // allocation quantity, not the received stock, and would produce incorrect opening balances.
    if (false) {
      // Collect all prior daily rows sorted by month
      const priorRowsAll = (dailyRows || []).filter((entry: any) => {
        const entryDate = entry.usage_date || entry.usageDate || '';
        const entryMonthKey = this.getMonthKeyFromAnyDate(entryDate);
        const entryType = (entry.hologram_type || entry.hologramType || 'LOCAL').toString().toUpperCase();
        const approvalStatus = entry.approval_status || entry.approvalStatus || '';
        return (
          !!entryMonthKey &&
          entryMonthKey < monthKey &&
          entryType === this.selectedHologramType &&
          this.matchesApprovalStatus(approvalStatus) &&
          this.matchesSelectedManufacturingUnit(entry)
        );
      });

      // Group by month and compute a running closing balance across all prior months.
      // Opening of the first known month is 0 (no earlier data available).
      const monthsWithData = Array.from(
        new Set(priorRowsAll.map((e: any) => {
          const d = e.usage_date || e.usageDate || '';
          return this.getMonthKeyFromAnyDate(d);
        }))
      ).sort();

      let runningBalance = 0;
      for (const mk of monthsWithData) {
        const monthRows = priorRowsAll.filter((e: any) => {
          const d = e.usage_date || e.usageDate || '';
          return this.getMonthKeyFromAnyDate(d) === mk;
        });
        // For commissioner mode, arrivals for each prior month come from the request quantity
        // on the overview entries (one arrival per approved request in that month).
        const monthArrivals = (commissionerOverviewEntries || []).reduce((sum: number, oe: any) => {
          const oeMonthKey = this.getMonthKeyFromAnyDate(oe?.usageDate || oe?.submissionDate || '');
          const oeType = String(oe?.hologramType || 'LOCAL').toUpperCase();
          if (oeMonthKey !== mk || oeType !== this.selectedHologramType) return sum;
          if (!this.matchesSelectedManufacturingUnit(oe)) return sum;
          return sum + Number(oe?.quantity || 0);
        }, 0);

        const monthUtilized = monthRows.reduce(
          (sum: number, e: any) => sum + Number(e.issued_qty || e.issuedQty || 0), 0
        );
        const monthWastage = monthRows.reduce(
          (sum: number, e: any) => sum + Number(e.wastage_qty || e.wastageQty || 0), 0
        );
        runningBalance = runningBalance + monthArrivals - monthUtilized - monthWastage;
        if (runningBalance < 0) runningBalance = 0;
      }

      return runningBalance;
    }

    const priorArrivals = Array.from(arrivalByMonth.values()).reduce((sum, qty) => sum + qty, 0);

    const priorDaily = (dailyRows || []).filter((entry: any) => {
      const entryDate = entry.usage_date || entry.usageDate || '';
      const entryMonthKey = this.getMonthKeyFromAnyDate(entryDate);
      const entryType = (entry.hologram_type || entry.hologramType || 'LOCAL').toString().toUpperCase();
      const approvalStatus = entry.approval_status || entry.approvalStatus || '';
      return (
        !!entryMonthKey &&
        entryMonthKey < monthKey &&
        entryType === this.selectedHologramType &&
        this.matchesApprovalStatus(approvalStatus) &&
        this.matchesSelectedManufacturingUnit(entry)
      );
    });

    const priorUtilized = priorDaily.reduce(
      (sum: number, entry: any) => sum + Number(entry.issued_qty || entry.issuedQty || 0),
      0
    );
    const priorWastage = priorDaily.reduce(
      (sum: number, entry: any) => sum + Number(entry.wastage_qty || entry.wastageQty || 0),
      0
    );

    const computed = priorArrivals - priorUtilized - priorWastage;
    return Number.isFinite(computed) ? Math.max(0, computed) : 0;
  }

  private buildArrivalsFromProcurements(
    procurementRows: any[],
    monthKey: string,
    cartonDetailsByReference: Record<string, any[]>,
    selectedRefs?: Set<string>
  ): any[] {
    const arrivals: any[] = [];

    for (const procurement of procurementRows || []) {
      const procurementDate =
        procurement?.date ||
        procurement?.created_at ||
        procurement?.createdAt ||
        procurement?.submission_date ||
        procurement?.submissionDate ||
        '';
      const procurementMonthKey = this.getMonthKeyFromAnyDate(procurementDate);
      if (procurementMonthKey !== monthKey) {
        continue;
      }
      const ref = this.extractReferenceNo(procurement) || `PROC-${procurement?.id || arrivals.length + 1}`;
      const normalizedRef = this.normalizeReferenceNo(ref);
      const matchesNormalizedRef = !!selectedRefs && selectedRefs.size > 0 && selectedRefs.has(normalizedRef);

      if (!this.matchesSelectedManufacturingUnit(procurement) && !matchesNormalizedRef) {
        continue;
      }

      const qty = this.getProcurementQtyForSelectedType(procurement);
      if (qty <= 0) {
        continue;
      }

      const cartonDetailsFromProcurement = this.normalizeCartonDetails(procurement);
      const cartonDetailsFromOverviewRaw = Array.isArray(cartonDetailsByReference?.[normalizedRef]) ? cartonDetailsByReference[normalizedRef] : [];
      const cartonDetailsFromOverview = this.normalizeCartonDetails(cartonDetailsFromOverviewRaw);
      const effectiveCartonDetails =
        cartonDetailsFromProcurement.length > 0
          ? cartonDetailsFromProcurement
          : (cartonDetailsFromOverview.length > 0
              ? cartonDetailsFromOverview
              : [{
                  rollNumber: '',
                  cartoonNumber: '',
                  fromSerial: '-',
                  toSerial: '-',
                  quantity: qty
                }]);

      arrivals.push({
        id: procurement?.id || arrivals.length + 1,
        type: this.selectedHologramType,
        total_count: qty,
        totalCount: qty,
        received_date: procurementDate,
        receivedDate: procurementDate,
        procurement_ref: ref,
        procurementRef: ref,
        ref_no: ref,
        refNo: ref,
        carton_details: effectiveCartonDetails
      });
    }

    return arrivals;
  }

  private normalizeCartonDetails(source: any): Array<{
    rollNumber: string;
    cartoonNumber: string;
    fromSerial: string;
    toSerial: string;
    quantity: number;
  }> {
    let rows: any[] = [];

    if (Array.isArray(source)) {
      rows = source;
    } else if (source && typeof source === 'object') {
      const nested =
        source?.carton_details ||
        source?.cartonDetails ||
        source?.cartoon_details ||
        source?.cartoonDetails ||
        source?.cartoons ||
        source?.rollsAssigned ||
        source?.rolls_assigned ||
        source?.rolls ||
        [];

      if (Array.isArray(nested) && nested.length > 0) {
        rows = nested;
      } else {
        const hasDirectFields =
          !!(source?.fromSerial || source?.from_serial || source?.toSerial || source?.to_serial) ||
          !!(source?.rollNumber || source?.roll_number || source?.cartoonNumber || source?.cartoon_number || source?.carton_number);
        if (hasDirectFields) {
          rows = [source];
        }
      }
    }

    const mapped = rows.map((item: any) => {
      const fromSerial = String(item?.fromSerial || item?.from_serial || item?.from || '').trim();
      const toSerial = String(item?.toSerial || item?.to_serial || item?.to || '').trim();
      let quantity = Number(item?.quantity || item?.qty || item?.totalCount || item?.total_count || 0);
      if (!quantity && fromSerial && toSerial) {
        const fromNo = Number(fromSerial);
        const toNo = Number(toSerial);
        if (Number.isFinite(fromNo) && Number.isFinite(toNo) && toNo >= fromNo) {
          quantity = (toNo - fromNo) + 1;
        }
      }
      const label = this.resolveArrivalRollLabel(item);

      return {
        rollNumber: label,
        cartoonNumber: label,
        fromSerial,
        toSerial,
        quantity
      };
    }).filter((item: any) =>
      !!item.cartoonNumber || !!item.fromSerial || !!item.toSerial || Number(item.quantity || 0) > 0
    );

    const dedup = new Map<string, any>();
    mapped.forEach((item: any) => {
      const key = `${item.cartoonNumber}|${item.fromSerial}|${item.toSerial}|${item.quantity}`;
      if (!dedup.has(key)) {
        dedup.set(key, item);
      }
    });

    return Array.from(dedup.values());
  }

  private buildArrivalsFromCommissionerOverview(entries: any[], monthKey: string, selectedRefs?: Set<string>): any[] {
    const grouped = new Map<string, any[]>();

    for (const entry of entries || []) {
      const entryMonthKey = this.getMonthKeyFromAnyDate(entry?.usageDate || entry?.submissionDate || '');
      const entryType = String(entry?.hologramType || '').toUpperCase();
      if (entryMonthKey !== monthKey || entryType !== this.selectedHologramType) {
        continue;
      }

      const ref = this.extractReferenceNo(entry);
      if (!ref) {
        continue;
      }
      const key = this.normalizeReferenceNo(ref);
      const matchesSelectedRef = !!selectedRefs && selectedRefs.size > 0 && selectedRefs.has(key);
      if (!this.matchesSelectedManufacturingUnit(entry) && !matchesSelectedRef) {
        continue;
      }
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(entry);
    }

    const arrivals: any[] = [];
    grouped.forEach((entriesForRef, key) => {
      const first = entriesForRef[0];
      const ref = this.extractReferenceNo(first) || key;
      const date = first?.usageDate || first?.submissionDate || '';

      const rollMap = new Map<string, any>();
      for (const row of entriesForRef) {
        const brands = Array.isArray(row?.brandsEntered) ? row.brandsEntered : [];
        for (const brand of brands) {
          const rollsAssigned = Array.isArray(brand?.rollsAssigned) ? brand.rollsAssigned : [];
          for (const roll of rollsAssigned) {
            const rollLabel = String(
              roll?.rollNumber ||
              roll?.roll_number ||
              roll?.cartoonNumber ||
              roll?.cartoon_number ||
              roll?.carton_number ||
              ''
            ).trim();
            const fromSerial = String(roll?.fromSerial || roll?.from_serial || roll?.from || '').trim();
            const toSerial = String(roll?.toSerial || roll?.to_serial || roll?.to || '').trim();
            const qty = Number(roll?.quantity || roll?.qty || roll?.totalCount || roll?.total_count || 0);
            const mapKey = `${rollLabel}|${fromSerial}|${toSerial}`;
            if (!rollMap.has(mapKey)) {
              rollMap.set(mapKey, {
                cartoonNumber: rollLabel || 'Roll',
                fromSerial,
                toSerial,
                quantity: qty
              });
            }
          }
        }
      }

      const cartonDetails = Array.from(rollMap.values());
      if (cartonDetails.length === 0) {
        return;
      }

      const total = cartonDetails.reduce((sum, c) => sum + Number(c?.quantity || 0), 0);
      arrivals.push({
        id: ref,
        type: this.selectedHologramType,
        total_count: total,
        totalCount: total,
        received_date: date,
        receivedDate: date,
        procurement_ref: ref,
        procurementRef: ref,
        ref_no: ref,
        refNo: ref,
        carton_details: cartonDetails
      });
    });

    return arrivals;
  }

  private getProcurementQtyForSelectedType(procurement: any): number {
    switch (this.selectedHologramType) {
      case 'LOCAL':
        return Number(procurement?.localQty ?? procurement?.local_qty ?? 0);
      case 'EXPORT':
        return Number(procurement?.exportQty ?? procurement?.export_qty ?? 0);
      case 'DEFENCE':
        return Number(procurement?.defenceQty ?? procurement?.defence_qty ?? 0);
      default:
        return 0;
    }
  }

  private buildCartonDetailsByReference(entries: any[]): Record<string, any[]> {
    const byRef: Record<string, any[]> = {};
    for (const entry of entries || []) {
      const ref = this.extractReferenceNo(entry);
      if (!ref) {
        continue;
      }
      const normalizedRef = this.normalizeReferenceNo(ref);

      const brands = Array.isArray(entry?.brandsEntered) ? entry.brandsEntered : [];
      const cartons: any[] = byRef[normalizedRef] || [];

      for (const brand of brands) {
        const rollsAssigned = Array.isArray(brand?.rollsAssigned) ? brand.rollsAssigned : [];
        for (const roll of rollsAssigned) {
          const rollLabel = String(
            roll?.rollNumber ||
            roll?.roll_number ||
            roll?.cartoonNumber ||
            roll?.cartoon_number ||
            roll?.carton_number ||
            ''
          ).trim();
          const carton = {
            rollNumber: rollLabel,
            cartoonNumber: rollLabel,
            fromSerial: String(roll?.fromSerial || roll?.from_serial || roll?.from || ''),
            toSerial: String(roll?.toSerial || roll?.to_serial || roll?.to || ''),
            quantity: Number(roll?.quantity || roll?.qty || roll?.totalCount || roll?.total_count || 0)
          };
          if (carton.cartoonNumber || carton.fromSerial || carton.toSerial || carton.quantity > 0) {
            cartons.push(carton);
          }
        }
      }

      // Deduplicate carton entries
      const dedup = new Map<string, any>();
      cartons.forEach((c: any) => {
        const key = `${c.cartoonNumber}|${c.fromSerial}|${c.toSerial}|${c.quantity}`;
        if (!dedup.has(key)) {
          dedup.set(key, c);
        }
      });

      byRef[normalizedRef] = Array.from(dedup.values());
    }

    return byRef;
  }

  private resolveArrivalRollLabel(item: any): string {
    const rollLabel = String(
      item?.rollNumber ||
      item?.roll_number ||
      item?.roll ||
      item?.rollName ||
      item?.roll_name ||
      item?.cartoonNumber ||
      item?.cartoon_number ||
      ''
    ).trim();
    if (rollLabel) {
      return rollLabel;
    }

    const cartonFallback = String(item?.carton_number || item?.cartonNumber || '').trim();
    return cartonFallback || 'Roll';
  }

  private isDistilleryOrBrewery(row: any): boolean {
    const subCategoryId = Number(
      row?.license_sub_category_id ??
      row?.licenseSubCategoryId ??
      row?.license_sub_category?.id ??
      row?.licenseSubCategory?.id ??
      0
    );
    if (subCategoryId === 1 || subCategoryId === 2) {
      return true;
    }

    const subCategoryName = String(
      row?.license_sub_category_name ??
      row?.licenseSubCategoryName ??
      row?.license_sub_category?.description ??
      row?.licenseSubCategory?.description ??
      row?.license_sub_category ??
      row?.licenseSubCategory ??
      ''
    ).toLowerCase();

    const categoryTokens = [
      subCategoryName,
      String(row?.license_category_name ?? row?.licenseCategoryName ?? row?.license_category ?? row?.licenseCategory ?? '').toLowerCase(),
      String(row?.license_type_name ?? row?.licenseTypeName ?? row?.license_type ?? row?.licenseType ?? '').toLowerCase(),
      String(row?.category ?? '').toLowerCase(),
      String(row?.sub_category ?? row?.subCategory ?? '').toLowerCase()
    ].join(' ');

    return categoryTokens.includes('brew') || categoryTokens.includes('distill');
  }

  private normalizeArrivalQuantity(fromSerial: string, toSerial: string, rawQty: any): number {
    let quantity = Number(rawQty ?? 0);
    if (!quantity && fromSerial && toSerial) {
      const fromNo = Number(String(fromSerial).replace(/\D/g, ''));
      const toNo = Number(String(toSerial).replace(/\D/g, ''));
      if (Number.isFinite(fromNo) && Number.isFinite(toNo) && toNo >= fromNo) {
        quantity = (toNo - fromNo) + 1;
      }
    }
    return Number.isFinite(quantity) ? quantity : 0;
  }

  private extractArrivalCartonRanges(source: any): Array<{
    cartoonNumber: string;
    fromSerial: string;
    toSerial: string;
    quantity: number;
  }> {
    const ranges: Array<{ cartoonNumber: string; fromSerial: string; toSerial: string; quantity: number }> = [];
    if (!source || typeof source !== 'object') {
      return ranges;
    }

    const cartonDetails =
      source?.carton_details ||
      source?.cartonDetails ||
      source?.cartoons ||
      source?.cartoon_details ||
      [];

    if (Array.isArray(cartonDetails) && cartonDetails.length > 0) {
      cartonDetails.forEach((carton: any) => {
        const fromSerial = String(carton?.fromSerial || carton?.from_serial || carton?.from || '').trim();
        const toSerial = String(carton?.toSerial || carton?.to_serial || carton?.to || '').trim();
        const rawQty = carton?.quantity ?? carton?.qty ?? carton?.totalCount ?? carton?.total_count ?? 0;
        const quantity = this.normalizeArrivalQuantity(fromSerial, toSerial, rawQty);
        const cartoonNumber = this.resolveArrivalRollLabel(carton);
        if (cartoonNumber || fromSerial || toSerial || quantity > 0) {
          ranges.push({ cartoonNumber, fromSerial, toSerial, quantity });
        }
      });
      return ranges;
    }

    const cartoonNumber = this.resolveArrivalRollLabel({
      rollNumber: source?.rollNumber || source?.roll_number,
      cartoonNumber: source?.cartoonNumber || source?.cartoon_number,
      carton_number: source?.carton_number || source?.cartonNumber
    });
    const fromSerial = String(source?.from_serial || source?.fromSerial || source?.from || '').trim();
    const toSerial = String(source?.to_serial || source?.toSerial || source?.to || '').trim();
    const rawQty = source?.quantity ?? source?.qty ?? source?.total_count ?? source?.totalCount ?? 0;
    const quantity = this.normalizeArrivalQuantity(fromSerial, toSerial, rawQty);
    if ((cartoonNumber || fromSerial || toSerial) && quantity > 0) {
      ranges.push({ cartoonNumber, fromSerial, toSerial, quantity });
    }

    return ranges;
  }

  private aggregateArrivalGroup(rolls: any[]): {
    ranges: Array<{ cartoonNumber: string; fromSerial: string; toSerial: string; quantity: number }>;
    total: number;
  } {
    const dedup = new Map<string, { cartoonNumber: string; fromSerial: string; toSerial: string; quantity: number }>();

    (rolls || []).forEach((roll) => {
      this.extractArrivalCartonRanges(roll).forEach((r) => {
        const key = `${r.cartoonNumber}|${r.fromSerial}|${r.toSerial}`;
        if (!dedup.has(key)) {
          dedup.set(key, r);
          return;
        }
        const existing = dedup.get(key)!;
        if (!existing.quantity && r.quantity) {
          dedup.set(key, r);
        }
      });
    });

    const ranges = Array.from(dedup.values());
    const total = ranges.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    return { ranges, total: Number.isFinite(total) ? total : 0 };
  }

  private extractLicenseeName(row: any): string {
    return String(
      row?.manufacturing_unit_name ??
      row?.manufacturingUnitName ??
      row?.establishment_name ??
      row?.establishmentName ??
      row?.licensee_name ??
      row?.licenseeName ??
      ''
    ).trim();
  }
}

