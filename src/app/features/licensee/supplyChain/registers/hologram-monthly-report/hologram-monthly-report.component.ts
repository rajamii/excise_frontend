import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';

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
  // Month/Year selection
  selectedMonth: string = 'jan';
  selectedYear: string = '2026';
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';

  // Data
  overviewSummary: OverviewSummary | null = null;
  statementRows: StatementRow[] = [];
  approvedEntriesCount: number = 0;
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private hologramService: HologramDataService
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

    // Load data
    this.loadMonthlyReport();
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
      this.hologramService.getDailyRegisterEntries().toPromise(),
      this.hologramService.getRollsDetails().toPromise()
    ]).then(([dailyEntries, rollsDetails]: [any, any]) => {
      // Handle pagination for rolls
      const rollsArray = Array.isArray(rollsDetails) ? rollsDetails : (rollsDetails?.results || []);
      
      console.log('✅ Data fetched:', { 
        dailyEntriesCount: dailyEntries?.length || 0,
        rollsDetailsCount: rollsArray?.length || 0,
        monthKey: monthKey
      });
      
      console.log('Sample daily entry:', dailyEntries?.[0]);
      console.log('Sample roll:', rollsArray?.[0]);
      
      // Filter daily entries by month, year, and type
      const filteredEntries = (dailyEntries || []).filter((entry: any) => {
        const entryDate = entry.usage_date || entry.usageDate || '';
        const entryMonthKey = entryDate ? entryDate.substring(0, 7) : '';
        const entryType = (entry.hologram_type || entry.hologramType || 'LOCAL').toString().toUpperCase();
        const approvalStatus = entry.approval_status || entry.approvalStatus || '';
        
        console.log('🔍 Checking entry:', {
          id: entry.id,
          date: entryDate,
          monthKey: entryMonthKey,
          type: entryType,
          approvalStatus: approvalStatus,
          matchesMonth: entryMonthKey === monthKey,
          matchesType: entryType === this.selectedHologramType,
          matchesApproval: approvalStatus === 'APPROVED' || approvalStatus === 'PENDING'
        });
        
        const matches = entryMonthKey === monthKey && 
               entryType === this.selectedHologramType &&
               (approvalStatus === 'APPROVED' || approvalStatus === 'PENDING');
        
        if (matches) {
          console.log('✅ Matched entry:', entry);
        }
        
        return matches;
      });
      
      console.log(`📊 Filtered ${filteredEntries.length} entries for ${monthKey} ${this.selectedHologramType}`);
      
      // Filter arrivals by month, year, and type
      const arrivals = rollsArray.filter((roll: any) => {
        const receivedDate = roll.received_date || roll.receivedDate || '';
        const rollMonthKey = receivedDate.substring(0, 7);
        const rollType = (roll.type || 'LOCAL').toString().toUpperCase();
        
        const matches = rollMonthKey === monthKey && rollType === this.selectedHologramType;
        
        if (matches) {
          console.log('✅ Matched arrival:', roll);
        }
        
        return matches;
      });
      
      console.log(`📦 Filtered ${arrivals.length} arrivals for ${monthKey} ${this.selectedHologramType}`);
      
      // Calculate totals from daily entries
      const totalUtilized = filteredEntries.reduce((sum: number, e: any) => 
        sum + (e.issued_qty || e.issuedQty || 0), 0);
      const totalWastage = filteredEntries.reduce((sum: number, e: any) => 
        sum + (e.wastage_qty || e.wastageQty || 0), 0);
      const freshArrival = arrivals.reduce((sum: number, a: any) => 
        sum + (a.total_count || a.totalCount || 0), 0);
      
      // ALSO get utilization from roll usage history (this is the approved data)
      let totalUtilizedFromRolls = 0;
      let totalWastageFromRolls = 0;
      
      arrivals.forEach((roll: any) => {
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
      
      // Set overview summary
      this.overviewSummary = {
        openingStock: 0, // TODO: Calculate from previous months
        totalArrivals: freshArrival,
        arrivalCount: arrivals.length,
        totalUtilized: finalUtilized,
        utilizationCount: filteredEntries.filter((e: any) => (e.issued_qty || e.issuedQty || 0) > 0).length,
        totalWastage: finalWastage,
        wastageCount: filteredEntries.filter((e: any) => (e.wastage_qty || e.wastageQty || 0) > 0).length,
        closingBalance: freshArrival - finalUtilized - finalWastage
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
      
      arrivals.forEach((arrival: any) => {
        const refNo = arrival.procurement_ref || arrival.procurementRef || arrival.ref_no || arrival.refNo || 'UNKNOWN';
        
        if (!arrivalsByRef.has(refNo)) {
          arrivalsByRef.set(refNo, []);
        }
        arrivalsByRef.get(refNo)!.push(arrival);
      });
      
      console.log(`📦 Grouped ${arrivals.length} arrivals into ${arrivalsByRef.size} procurement groups`);
      
      // Add grouped arrivals with their precise timestamps
      arrivalsByRef.forEach((rollsGroup, refNo) => {
        // Use the first roll's received date as the group timestamp
        const firstRoll = rollsGroup[0];
        const receivedDate = firstRoll.received_date || firstRoll.receivedDate || '';
        const preciseTime = new Date(receivedDate).getTime();
        
        // Calculate total for this procurement
        const totalAmount = rollsGroup.reduce((sum, roll) => sum + (roll.total_count || roll.totalCount || 0), 0);
        
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
            allRolls: rollsGroup
          }
        });
      });
      
      // Group utilization entries by reference number to show all in single row
      const utilizationsByRef = new Map<string, any[]>();
      
      filteredEntries.forEach((entry: any) => {
        const refNo = entry.reference_no || entry.referenceNo || 'UNKNOWN';
        
        if (!utilizationsByRef.has(refNo)) {
          utilizationsByRef.set(refNo, []);
        }
        utilizationsByRef.get(refNo)!.push(entry);
      });
      
      console.log(`📋 Grouped ${filteredEntries.length} utilizations into ${utilizationsByRef.size} reference groups`);
      
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
      let runningBalance = 0;
      
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
          
          // Get all rolls from this grouped arrival
          const allRolls = arrival.allRolls || [arrival];
          
          allRolls.forEach((roll: any) => {
            // Check for carton_details in the roll data
            const cartonDetails = roll.carton_details || roll.cartonDetails || roll.cartoons || roll.cartoon_details || [];
            
            if (Array.isArray(cartonDetails) && cartonDetails.length > 0) {
              cartonDetails.forEach((carton: any) => {
                cartonRanges.push({
                  cartoonNumber: carton.cartoonNumber || carton.cartoon_number || carton.carton_number || 'Unknown',
                  fromSerial: carton.fromSerial || carton.from_serial || '',
                  toSerial: carton.toSerial || carton.to_serial || '',
                  quantity: carton.quantity || carton.totalCount || 0
                });
              });
            } else {
              // Fallback: If no carton_details, use the roll itself as a carton
              const singleCarton = roll.carton_number || roll.cartonNumber || roll.cartoon_number;
              if (singleCarton) {
                cartonRanges.push({
                  cartoonNumber: singleCarton,
                  fromSerial: roll.from_serial || roll.fromSerial || '',
                  toSerial: roll.to_serial || roll.toSerial || '',
                  quantity: roll.total_count || roll.totalCount || 0
                });
              }
            }
          });
          
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
          
          // Build utilization details grouped by roll and brand
          const utilizationDetails: Array<{
            rollName: string;
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
            brandName: string;
            bottleSize: string;
            ranges: Array<{
              from: string;
              to: string;
              qty: number;
            }>;
          }> = [];
          
          // Process each entry to extract roll and brand details
          allEntries.forEach((e: any) => {
            const rollName = e.cartoon_number || e.cartoonNumber || e.roll_range || e.rollRange || 'Unknown';
            const brandName = e.brand_details || e.brandDetails || '-';
            const bottleSize = e.bottle_size || e.bottleSize || '-';
            
            // Handle issued ranges
            const issuedRanges = e.issued_ranges || e.issuedRanges || [];
            if (Array.isArray(issuedRanges) && issuedRanges.length > 0) {
              issuedRanges.forEach((range: any) => {
                utilizationDetails.push({
                  rollName: rollName,
                  brandName: brandName,
                  bottleSize: bottleSize,
                  ranges: [{
                    from: range.fromSerial || range.from_serial || '',
                    to: range.toSerial || range.to_serial || '',
                    qty: range.quantity || 0
                  }]
                });
              });
            } else if ((e.issued_from || e.issuedFrom) && (e.issued_to || e.issuedTo)) {
              // Fallback to single range
              utilizationDetails.push({
                rollName: rollName,
                brandName: brandName,
                bottleSize: bottleSize,
                ranges: [{
                  from: e.issued_from || e.issuedFrom || '',
                  to: e.issued_to || e.issuedTo || '',
                  qty: e.issued_qty || e.issuedQty || 0
                }]
              });
            }
            
            // Handle wastage ranges
            const wastageRanges = e.wastage_ranges || e.wastageRanges || [];
            if (Array.isArray(wastageRanges) && wastageRanges.length > 0) {
              wastageRanges.forEach((range: any) => {
                wastageDetails.push({
                  rollName: rollName,
                  brandName: brandName,
                  bottleSize: bottleSize,
                  ranges: [{
                    from: range.fromSerial || range.from_serial || '',
                    to: range.toSerial || range.to_serial || '',
                    qty: range.quantity || 0
                  }]
                });
              });
            } else if ((e.wastage_from || e.wastageFrom) && (e.wastage_to || e.wastageTo)) {
              // Fallback to single range
              wastageDetails.push({
                rollName: rollName,
                brandName: brandName,
                bottleSize: bottleSize,
                ranges: [{
                  from: e.wastage_from || e.wastageFrom || '',
                  to: e.wastage_to || e.wastageTo || '',
                  qty: e.wastage_qty || e.wastageQty || 0
                }]
              });
            }
          });
          
          console.log(`✅ Built ${utilizationDetails.length} utilization details:`, utilizationDetails);
          console.log(`✅ Built ${wastageDetails.length} wastage details:`, wastageDetails);
          
          const refNo = entry.ref_no || entry.refNo || 'N/A';
          const firstEntry = allEntries[0];
          
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
              cartoonNumber: firstEntry.cartoon_number || firstEntry.cartoonNumber,
              serialRange: (firstEntry.issued_from || firstEntry.issuedFrom) && (firstEntry.issued_to || firstEntry.issuedTo)
                ? `${firstEntry.issued_from || firstEntry.issuedFrom}-${firstEntry.issued_to || firstEntry.issuedTo}`
                : undefined,
              isNotInUse: isNotInUse,
              entryCount: allEntries.length,
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
      if (filteredEntries.length === 0) {
        // Collect all usage history items with timestamps
        const usageHistoryItems: TransactionItem[] = [];
        
        arrivals.forEach((roll: any) => {
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
      
      this.approvedEntriesCount = filteredEntries.length;
      
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

  /**
   * Navigate to daily register
   */
  goToDailyRegister(): void {
    this.router.navigate(['/dev-hologram-daily-register']);
  }

  /**
   * Navigate to monthly report (for distilleries/breweries)
   */
  goToMonthlyReport(): void {
    this.router.navigate(['/dev-monthly-report']);
  }

  /**
   * Go back
   */
  goBack(): void {
    window.history.back();
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

  /**
   * Get unique rolls count from utilization or wastage details
   */
  getUniqueRollsCount(details: Array<{ rollName: string; brandName: string; bottleSize: string; ranges: any[] }> | undefined): number {
    if (!details || !Array.isArray(details)) {
      return 0;
    }
    const uniqueRolls = new Set<string>();
    details.forEach(detail => {
      uniqueRolls.add(detail.rollName);
    });
    return uniqueRolls.size;
  }

  /**
   * Get total wastage quantity for a brand (sum of all ranges)
   */
  getTotalWastageForBrand(detail: { rollName: string; brandName: string; bottleSize: string; ranges: Array<{ from: string; to: string; qty: number }> }): number {
    return detail.ranges.reduce((sum, range) => sum + (range.qty || 0), 0);
  }
}
