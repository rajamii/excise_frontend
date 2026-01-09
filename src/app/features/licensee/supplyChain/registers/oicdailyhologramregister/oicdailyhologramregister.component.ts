import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';
import { forkJoin } from 'rxjs';


interface RollRange {
  fromSerial: string;
  toSerial: string;
  quantity: number;
  isValid?: boolean;
  errorMessage?: string;
}

interface LeftoverUsageHistory {
  brandDetails: string;
  bottleSize: string;
  originalRange: string;
  usedRange: string;
  usedQty: number;
  damagedRange?: string;
  damagedQty?: number;
  remainingRange?: string;
  remainingQty?: number;
  timestamp: string;
}

interface RollInput {
  cartoonNumber: string;
  rangeId?: string;
  displayName?: string;
  rangeIndex?: number;
  availableCount: number;
  serialRange: string;
  fromSerial: string;
  toSerial: string;
  issuedRanges: RollRange[];
  wastageRanges: RollRange[];
  issuedQty: number;
  wastageQty: number;
  leftOver: number;
  damageReason: string;
  brandDetails: string | { brandName: string; [key: string]: any };
  bottleSize: string;
  isLeftoverReuse?: boolean;
  leftoverUsageHistory?: LeftoverUsageHistory[];
  parentRollId?: string;
}

interface RegisterEntry {
  id: string;
  requestId?: number; // Optional link to original request
  referenceNo: string;
  rollRange: string;
  dates: {
    submission: string;
    usage: string;
  };
  brandDetails: string | { brandName: string; [key: string]: any };
  bottleSize: string;
  rollsAssigned: string[];
  hologramQty: number;
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  issuedFrom: string;
  issuedTo: string;
  issuedQty: number;
  wastageFrom: string;
  wastageTo: string;
  wastageQty: number;
  leftOver: number;
  total: number;
  damageReason: string;
  isFixed: boolean;
  currentRollSelection?: {
    selectedRoll: string;
    rollInput: RollInput;
    isLocked: boolean;
  };
  lockedRolls?: RollInput[];
  cartoonNumber?: string;
  utilizedQuantity?: number;
  originalHologramQty?: number;
  allocatedRanges?: Array<{
    cartoonNumber: string;
    fromSerial: string;
    toSerial: string;
    quantity: number;
    procurementRef?: string;
  }>;
  status?: string;
}

@Component({
  selector: 'app-oicdailyhologramregister',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oicdailyhologramregister.component.html',
  styleUrl: './oicdailyhologramregister.component.scss'
})
export class OicdailyhologramregisterComponent implements OnInit {
  Math = Math;
  selectedMonth = 'nov';
  selectedYear = '2025';
  selectedDate = new Date().toISOString().split('T')[0];
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';
  
  entries: RegisterEntry[] = [];
  filteredEntries: RegisterEntry[] = [];
  
  pageSize = 10;
  currentPage = 1;
  
  // For rolls view section above table
  selectedEntryForRollsView: RegisterEntry | null = null;
  
  // For usage details modal
  selectedEntryForDetails: RegisterEntry | null = null;
  selectedRollTabIndex: number = 0;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private hologramService: HologramDataService
  ) {}

  ngOnInit(): void {
    // Determine if we have API access (mock check)
    this.loadApprovedEntries();
    
    // CRITICAL FIX: Recalculate Available Hologram Data from Rolls data
    // This fixes any existing data that was calculated with the old (wrong) logic

    
    // Listen for storage changes to auto-refresh

  }

  /**
   * Recalculate Available Hologram Data from Rolls data
   * This ensures consistency between Rolls tab and Available Hologram Data tab
   * Fixes any data that was calculated with old (incorrect) logic
   */


  // Cache for procurements to use in dropdowns
  private procurementCache: any[] = [];

  loadApprovedEntries(): void {
    // Load from Backend API - Fetch all hologram_request entries AND procurements
    // Requests have basic info, Procurements have the source of truth for Carton Ranges
    

    
    // Fetch both Requests and Procurements
    forkJoin({
        requests: this.hologramService.getRequests(),
        procurements: this.hologramService.getProcurements()
    }).subscribe({
      next: ({ requests, procurements }) => {
        console.log('✅ Loaded data from API (Raw):', { 
            requestsType: typeof requests,
            procurementsType: typeof procurements,
            procurementsIsArray: Array.isArray(procurements)
        });
        
        // Handle pagination (if response has 'results' property)
        let rawProcurements: any[] = [];
        if (Array.isArray(procurements)) {
            rawProcurements = procurements;
        } else if ((procurements as any).results && Array.isArray((procurements as any).results)) {
            console.log('⚠️ Detected paginated response for procurements');
            rawProcurements = (procurements as any).results;
        } else {
             console.log('⚠️ Unknown procurement response format, defaulting to empty array', procurements);
             rawProcurements = [];
        }

        // Save procurements to cache for dropdown fallback
        this.procurementCache = rawProcurements;
        
        console.log('✅ Procurement Cache Size:', this.procurementCache.length);

        // 1. Build Procurement Map: CartonNumber -> CartonDetail (with ranges)
        const procurementMap = new Map<string, any>();
        
        rawProcurements.forEach((p: any) => {
            // Check all possible keys for carton details
            const details = p.carton_details || p.cartonDetails || p.cartoons || p.cartoon_details || [];
            if (Array.isArray(details)) {
                details.forEach((c: any) => {
                    // Normalize keys if needed
                    const cNo = c.cartoonNumber || c.cartoon_number || c.carton_number || '';
                    if (cNo) {
                        procurementMap.set(cNo, {
                            ...c,
                            // Ensure we have from/to serials
                            fromSerial: c.fromSerial || c.from_serial || '',
                            toSerial: c.toSerial || c.to_serial || ''
                        });
                    }
                });
            }
        });

        console.log('✅ Built Procurement Map with', procurementMap.size, 'cartons');
        
        // 2. Map Requests to RegisterEntry, enriching with Procurement Map data
        // CRITICAL FIX: Only show requests that have been ALLOCATED (IN_USE, APPROVED, COMPLETED)
        // This prevents "Submitted" requests from appearing before allocation
        const allocatedRequests = requests.filter((req: any) => {
            const s = (req.status || '').toUpperCase();
            // We include APPROVED for legacy compatibility, but new flow uses IN_USE
            return ['IN_USE', 'APPROVED', 'COMPLETED'].includes(s);
        });

        const apiEntries = allocatedRequests.map((req: any) => {
          // Map available_cartons from procurement to allocatedRanges format
          // PRIMARY: Use map enrichment for accurate ranges if available
          let allocatedRanges = (req.available_cartons || []).map((carton: any) => {
             const cNo = carton.cartoonNumber || carton.cartoon_number || '';
             const procDetail = procurementMap.get(cNo);
             
             return {
                cartoonNumber: cNo,
                fromSerial: carton.fromSerial || carton.from_serial || (procDetail ? procDetail.fromSerial : ''),
                toSerial: carton.toSerial || carton.to_serial || (procDetail ? procDetail.toSerial : ''),
                quantity: carton.quantity || carton.totalCount || 0,
                procurementRef: carton.procurement_ref || ''
             };
          });

          // PREDICTIVE FIX: If allocatedRanges is empty, try to match Procurement by Reference Number
          if (!allocatedRanges || allocatedRanges.length === 0) {
              const reqRef = req.ref_no || req.refNo || req.referenceNo;
              if (reqRef) {
                  const matchingProc = rawProcurements.find(p => {
                      const pRef = p.ref_no || p.refNo || p.referenceNo;
                      return pRef === reqRef;
                  });
                  
                  if (matchingProc) {
                      console.log(`✅ Found matching procurement for ${reqRef} via Reference No match`);
                      const details = matchingProc.carton_details || matchingProc.cartonDetails || matchingProc.cartoons || matchingProc.cartoon_details || [];
                      
                      if (Array.isArray(details) && details.length > 0) {
                          allocatedRanges = details.map((c: any) => ({
                              cartoonNumber: c.cartoonNumber || c.cartoon_number || c.carton_number || '',
                              fromSerial: c.fromSerial || c.from_serial || '',
                              toSerial: c.toSerial || c.to_serial || '',
                              quantity: c.quantity || c.totalCount || 0,
                              procurementRef: ''
                          }));
                          console.log(`📦 Populated allocatedRanges from matching procurement: ${allocatedRanges.length} items`);
                      }
                  }
              }
          }

          // Also check issued_assets for already assigned cartons
          const issuedAssets = (req.issued_assets || []).map((asset: any) => ({
            cartoonNumber: asset.cartoonNumber || asset.cartoon_number || '',
            fromSerial: asset.fromSerial || asset.from_serial || '',
            toSerial: asset.toSerial || asset.to_serial || '',
            quantity: asset.quantity || 0
          }));

          return {
            id: req.id,
            requestId: req.id, // CRITICAL: Populate requestId for backend linking
            // Robust mapping for Reference Number: try all common variations
            referenceNo: req.ref_no || req.refNo || req.reference_no || req.referenceNo || `REQ-${req.id}` || 'N/A',
            rollRange: allocatedRanges.map((r: any) => r.cartoonNumber).join(', '),
            dates: {
              submission: req.submission_date || new Date().toISOString().split('T')[0],
              usage: req.usage_date || req.submission_date || new Date().toISOString().split('T')[0]
            },
            brandDetails: req.brand_id || 'N/A',
            bottleSize: req.bottle_size || '750ml',
            hologramQty: req.quantity || 0,
            hologramType: 'LOCAL', // Default, can be determined by procurement type
            isFixed: false, // Will be determined by available quantity
            allocatedRanges: allocatedRanges,
            issuedAssets: issuedAssets,
            total: 0,
            damageReason: '',
            cartoonNumber: allocatedRanges.map((r: any) => r.cartoonNumber).join(', '),
            utilizedQuantity: 0,
            originalHologramQty: req.quantity || 0,
            status: req.status || ''
          };
        });

        console.log('✅ Mapped API entries:', apiEntries.length);

        // Merge with saved entries, avoiding duplicates
        // Use only API entries
        const allEntries = apiEntries;
        console.log('✅ Total entries after merge:', allEntries.length);
        
        this.entries = allEntries.map((entry: any) => ({
          id: entry.id,
          referenceNo: entry.referenceNo || 'N/A',
          rollRange: entry.rollRange || '',
          dates: entry.dates || { submission: null, usage: null },
          brandDetails: entry.brandDetails || 'N/A',
          bottleSize: entry.bottleSize || '750ml',
          rollsAssigned: entry.rollsAssigned || [],
          hologramQty: entry.hologramQty || entry.utilizedQuantity || 0,
          hologramType: (entry.hologramType || 'LOCAL').toUpperCase(),
          issuedFrom: entry.issuedFrom || '',
          issuedTo: entry.issuedTo || '',
          issuedQty: entry.issuedQty || 0,
          wastageFrom: entry.wastageFrom || '',
          wastageTo: entry.wastageTo || '',
          wastageQty: entry.wastageQty || 0,
          leftOver: entry.leftOver || 0,
          total: entry.total || 0,
          damageReason: entry.damageReason || '',
          isFixed: entry.isFixed || false,
          cartoonNumber: entry.cartoonNumber || '',
          utilizedQuantity: entry.utilizedQuantity || 0,
          originalHologramQty: entry.originalHologramQty || entry.hologramQty || 0,
          currentRollSelection: entry.currentRollSelection,
          lockedRolls: entry.lockedRolls || [],
          allocatedRanges: entry.allocatedRanges || []
        }));
        
        console.log('✅ Final entries:', this.entries.length);
        
        // Refresh filtering
        this.loadFilteredData();
        this.cdr.detectChanges();
      },
      error: (err) => {
         console.error('❌ Error fetching requests/procurements:', err);
         // Fallback to local storage only
         this.loadApprovedEntriesLegacy();
      }
    });
  }

  // Legacy load method for fallback
  loadApprovedEntriesLegacy(): void {
    const approvedEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
    const savedEntries = JSON.parse(localStorage.getItem('oicDailyRegisterEntries') || '[]');
    
    // (Existing logic copied for fallback)
    const savedReferenceNos = new Set<string>();
    savedEntries.forEach((entry: any) => {
      if (entry.referenceNo) savedReferenceNos.add(entry.referenceNo);
    });

    const filteredApprovedEntries = approvedEntries.filter((entry: any) => {
      return !(entry.referenceNo && savedReferenceNos.has(entry.referenceNo));
    });

    const allEntries = [...savedEntries, ...filteredApprovedEntries];
    
    this.entries = allEntries.map((entry: any) => ({
          id: entry.id,
          referenceNo: entry.referenceNo || 'N/A',
          rollRange: entry.rollRange || '',
          dates: {
            submission: entry.submissionDate || entry.dates?.submission || entry.date,
            usage: entry.dates?.usage || entry.date || new Date().toISOString().split('T')[0]
          },
          brandDetails: entry.brandDetails?.brandName || entry.brandDetails || 'N/A',
          bottleSize: entry.bottleSize || '750ml',
          rollsAssigned: entry.rollsAssigned || [],
          hologramQty: entry.hologramQty || entry.utilizedQuantity || 0,
          hologramType: (entry.hologramType || 'LOCAL').toUpperCase(),
          issuedFrom: entry.issuedFromSerial || entry.issuedFrom || '',
          issuedTo: entry.issuedToSerial || entry.issuedTo || '',
          issuedQty: entry.issuedQty || entry.issuedQuantity || 0,
          wastageFrom: entry.wastageFromSerial || entry.wastageFrom || '',
          wastageTo: entry.wastageToSerial || entry.wastageTo || '',
          wastageQty: entry.wastageQty || entry.wastageQuantity || 0,
          leftOver: entry.leftOver || entry.leftOverQuantity || 0,
          total: entry.total || entry.utilizedQuantity || entry.hologramQty || 0,
          damageReason: entry.damageReason || '',
          isFixed: entry.isFixed || false,
          cartoonNumber: entry.cartoonNumber,
          utilizedQuantity: entry.utilizedQuantity || entry.hologramQty || 0,
          originalHologramQty: entry.originalHologramQty || entry.utilizedQuantity || entry.hologramQty || 0,
          currentRollSelection: entry.currentRollSelection,
          lockedRolls: entry.lockedRolls || []
    }));
    this.loadFilteredData();
    this.cdr.detectChanges();
  }

  loadFilteredData(): void {
    const monthNumber = this.getMonthNumber(this.selectedMonth);
    const datePrefix = `${this.selectedYear}-${monthNumber}`;
    
    console.log(`🔍 Filtering Data: Month=${this.selectedMonth} (${monthNumber}), Year=${this.selectedYear}, Type=${this.selectedHologramType}`);

    this.filteredEntries = this.entries.filter(entry => {
      // Ensure dates exists
      const usageDate = entry.dates?.usage;
      const submissionDate = entry.dates?.submission;
      
      // CRITICAL: Filter by hologram type (LOCAL, EXPORT, DEFENCE)
      const typeMatch = entry.hologramType === this.selectedHologramType;
      
      if (!typeMatch) return false;

      // Filter by date
      let dateMatch = false;

      if (!entry.isFixed) {
          // PENDING ENTRIES LOGIC:
          // ALWAYS SHOW pending entries for the selected type, regardless of date filter.
          // This ensures the Officer never misses a task (Action Queue behavior).
          dateMatch = true;
          
          // Debugging Pending Entries
          // console.log(`  Keeping Pending Entry: ${entry.referenceNo} (Always Visible)`);
      } else {
          // FIXED (Saved) ENTRIES LOGIC:
          // Strict matching on usage date
          if (!usageDate) {
              dateMatch = false;
          } else if (this.selectedDate) {
              dateMatch = usageDate === this.selectedDate;
          } else {
              dateMatch = usageDate.startsWith(datePrefix);
          }
      }
      
      return dateMatch;
    });
    
    // CRITICAL: Sort entries so new entries (not fixed) appear at the top
    // This ensures pending entries are always visible first
    this.filteredEntries.sort((a, b) => {
      // First, sort by isFixed status (false/pending first, true/saved last)
      if (a.isFixed !== b.isFixed) {
        return a.isFixed ? 1 : -1; // Not fixed (false) comes first
      }
      
      // If both have same fixed status, sort by date (newest first)
      const dateA = new Date(a.dates.usage || '1970-01-01').getTime();
      const dateB = new Date(b.dates.usage || '1970-01-01').getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    
    console.log(`✅ Filtered entries for ${this.selectedHologramType}: ${this.filteredEntries.length} (from ${this.entries.length} total)`);
  }

  getMonthNumber(month: string): string {
    const months: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    return months[month] || '01';
  }

  onMonthYearChange(): void {
    this.loadFilteredData();
    this.currentPage = 1;
  }

  onDateFilterChange(): void {
    this.loadFilteredData();
    this.currentPage = 1;
  }

  onHologramTypeChange(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): void {
    this.selectedHologramType = type;
    this.loadFilteredData();
    this.currentPage = 1;
  }

  clearAllFilters(): void {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.selectedMonth = new Date().toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    this.selectedYear = new Date().getFullYear().toString();
    this.loadFilteredData();
    this.currentPage = 1;
  }

  hasActiveFilters(): boolean {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    const currentYear = new Date().getFullYear().toString();
    return this.selectedDate !== today || this.selectedMonth !== currentMonth || this.selectedYear !== currentYear;
  }

  /**
   * View rolls for a specific entry
   */
  viewRollsForEntry(entry: RegisterEntry): void {
    console.log('📦 Viewing rolls for entry:', entry);
    console.log('📦 Locked rolls:', this.getLockedRollsForEntry(entry));
    console.log('📦 Current selected roll:', this.getCurrentSelectedRoll(entry));
    console.log('📦 Available rolls:', this.getAvailableRollsForEntry(entry));
    
    this.selectedEntryForRollsView = entry;
    this.cdr.detectChanges();
    
    // Scroll to the rolls section
    setTimeout(() => {
      const rollsSection = document.querySelector('.rolls-assigned-section');
      if (rollsSection) {
        rollsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
  
  /**
   * Update rolls view when roll selection changes
   */
  updateRollsView(entry: RegisterEntry): void {
    if (this.selectedEntryForRollsView?.id === entry.id) {
      this.selectedEntryForRollsView = entry;
      this.cdr.detectChanges();
    }
  }

  /**
   * Clear the rolls view
   */
  clearRollsView(): void {
    this.selectedEntryForRollsView = null;
  }

  /**
   * Clear the current roll selection (used when canceling leftover range usage)
   */
  clearCurrentRollSelection(entry: RegisterEntry): void {
    entry.currentRollSelection = undefined;
    this.cdr.detectChanges();
  }

  calculateQuantityFromSerials(fromSerial: string, toSerial: string): number {
    if (!fromSerial || !toSerial) return 0;
    const from = parseInt(fromSerial.replace(/\D/g, ''), 10);
    const to = parseInt(toSerial.replace(/\D/g, ''), 10);
    return to - from + 1;
  }

  onSerialChange(entry: RegisterEntry): void {
    entry.issuedQty = this.calculateQuantityFromSerials(entry.issuedFrom, entry.issuedTo);
    entry.wastageQty = this.calculateQuantityFromSerials(entry.wastageFrom, entry.wastageTo);
    entry.leftOver = entry.hologramQty - (entry.issuedQty + entry.wastageQty);
    entry.total = entry.issuedQty + entry.wastageQty + entry.leftOver;
    this.cdr.detectChanges();
  }



  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  getPagedEntries(): RegisterEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEntries.slice(start, start + this.pageSize);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredEntries.length / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getPendingEntriesCount(): number {
    return this.filteredEntries.filter(e => !e.isFixed).length;
  }

  getTotalIssuedQty(): number {
    return this.filteredEntries.reduce((sum, e) => sum + e.issuedQty, 0);
  }

  getTotalWastageQty(): number {
    return this.filteredEntries.reduce((sum, e) => sum + e.wastageQty, 0);
  }

  // Roll selection methods
  // CRITICAL: Create SEPARATE dropdown entries for each allocated range
  // Example: If roll "test1" has 2 ranges, create:
  //   - "test1 - Range 1 (1-30): 30 units"
  //   - "test1 - Range 2 (010001-010003): 3 units"
  getAvailableRollsForEntry(entry: RegisterEntry): any[] {
    console.log('🎯 Getting available rolls for entry:', entry.id);
    
    const availableRolls: any[] = [];
    
    // PRIORITY 1: Try to get from hologram allocation data (source of truth)
    const allocationData = this.getHologramAllocationForEntry(entry);
    
    // Track added cartons to avoid duplicates from pool
    const addedCartons = new Set<string>();

    if (allocationData && allocationData.allocatedCartoons && allocationData.allocatedCartoons.length > 0) {
      console.log('✅ Using allocation data for roll names:', allocationData.allocatedCartoons);
      
      // CRITICAL FIX: Create SEPARATE dropdown entries for each range
      // Instead of grouping multiple ranges into one roll, each range gets its own entry
      const rangeCountPerRoll = new Map<string, number>(); // Track how many ranges each roll has
      
      allocationData.allocatedCartoons.forEach((cartoon: any) => {
        const cartoonNumber = cartoon.cartoonNumber;
        const quantity = cartoon.quantity || 0;
        const fromSerial = cartoon.fromSerial || '';
        const toSerial = cartoon.toSerial || '';
        const serialRange = cartoon.serialRange || `${fromSerial} - ${toSerial}`;
        
        // Increment range count for this roll
        const currentRangeCount = rangeCountPerRoll.get(cartoonNumber) || 0;
        rangeCountPerRoll.set(cartoonNumber, currentRangeCount + 1);
        const rangeIndex = currentRangeCount + 1;
        
        // Create a unique identifier for this specific range
        const rangeId = `${cartoonNumber}_RANGE_${rangeIndex}`;
        
        // Check if this roll has leftover ranges from locked rolls
        const lockedRolls = this.getLockedRollsForEntry(entry);
        const lockedRoll = lockedRolls.find((lr: RollInput) => 
          (lr.cartoonNumber === cartoonNumber || lr.rangeId === rangeId) && lr.leftOver > 0
        );
        
        let leftoverInfo = '';
        if (lockedRoll) {
          const leftoverRanges = this.getLeftoverRanges(entry, lockedRoll);
          if (leftoverRanges && leftoverRanges.length > 0) {
            const totalLeftover = leftoverRanges.reduce((sum, r) => sum + r.quantity, 0);
            const rangesStr = leftoverRanges.map(r => `${r.fromSerial}-${r.toSerial}`).join(', ');
            leftoverInfo = ` [Leftover: ${totalLeftover} units (${rangesStr})]`;
          }
        }
        
        // Create separate entry for this range
        availableRolls.push({
          cartoonNumber: cartoonNumber, // Original cartoon number (for grouping if needed)
          rangeId: rangeId, // Unique ID for this specific range
          rangeIndex: rangeIndex, // Which range number (1, 2, 3, etc.)
          displayName: `${cartoonNumber} - ${serialRange}${leftoverInfo}`, // Show range in dropdown with leftover info
          allocatedQuantity: quantity,
          availableCount: quantity,
          serialRange: serialRange,
          fromSerial: fromSerial,
          toSerial: toSerial,
          isSingleRange: true, // Mark as single range entry
          originalCartoonNumber: cartoonNumber, // Store original cartoon number for reference
          leftoverInfo: leftoverInfo // Store leftover info for display
        });

        addedCartons.add(cartoonNumber);
      });
      
      console.log('✅ Separate range entries (each range is independent):', availableRolls);
      console.log('📊 Ranges per roll:', Array.from(rangeCountPerRoll.entries()));
    }
    
    // PRIORITY 2: APPEND "Stock Pool" from Procurement Cache
    // This allows selecting ANY available roll from inventory if not strictly allocated (or if user needs to override)
    if (this.procurementCache && this.procurementCache.length > 0) {
        console.log(`🏊 Accessing Stock Pool (Cache: ${this.procurementCache.length}) for Type: ${entry.hologramType}`);
        
        this.procurementCache.forEach(proc => {
             // 1. Check Matching Type
             let pType = (proc.type || '').toUpperCase();
             if (!pType) {
                 // Infer type if missing
                 if (proc.localQty > 0 || proc.local_qty > 0) pType = 'LOCAL';
                 else if (proc.exportQty > 0 || proc.export_qty > 0) pType = 'EXPORT';
                 else if (proc.defenceQty > 0 || proc.defence_qty > 0) pType = 'DEFENCE';
                 else pType = 'LOCAL'; 
             }
             
             if (pType !== entry.hologramType) return;


             // 2. Extract Cartons
             const cartons = proc.carton_details || proc.cartonDetails || proc.cartoons || proc.cartoon_details || [];
             
             cartons.forEach((c: any) => {
                 const cNo = c.cartoonNumber || c.cartoon_number || c.carton_number;
                 
                 // 3. Skip if already added via strict allocation
                 if (addedCartons.has(cNo)) return;
                 
                 // 4. Add to availableRolls
                 let qty = c.quantity || c.totalCount || 0;
                 const fromSerial = c.fromSerial || c.from_serial || '';
                 const toSerial = c.toSerial || c.to_serial || '';
                 const serialRange = c.serialRange || (fromSerial && toSerial ? `${fromSerial} - ${toSerial}` : 'N/A');

                 if (!qty && fromSerial && toSerial) {
                     // Recalculate quantity if missing
                      const start = parseInt(fromSerial, 10);
                      const end = parseInt(toSerial, 10);
                      if (!isNaN(start) && !isNaN(end)) qty = end - start + 1;
                 }

                 if (cNo && qty > 0) {
                     availableRolls.push({
                         cartoonNumber: cNo,
                         rangeId: cNo, // Use carton number as ID for full rolls
                         rangeIndex: 1,
                         displayName: `${cNo} - ${serialRange} (${qty} units)`, // Format for pool items
                         allocatedQuantity: qty,
                         availableCount: qty,
                         serialRange: serialRange,
                         fromSerial: fromSerial,
                         toSerial: toSerial,
                         isSingleRange: true,
                         originalCartoonNumber: cNo,
                         leftoverInfo: ''
                     });
                     addedCartons.add(cNo); // Prevent duplicates from other procurements
                 }
             });
        });
        console.log(`✅ Final available rolls count (Allocated + Pool): ${availableRolls.length}`);
    } else {
        // Fallback to localStorage ONLY if cache is empty (legacy support)
        const allOverviewRolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
        const fallbackRolls = allOverviewRolls.filter((r: any) => r.type === entry.hologramType && r.availableCount > 0 && !addedCartons.has(r.cartoonNumber));
        
        if (fallbackRolls.length > 0) {
             console.log(`⚠️ Using localStorage fallback, found ${fallbackRolls.length} rolls`);
             availableRolls.push(...fallbackRolls.map((r: any) => ({
                cartoonNumber: r.cartoonNumber,
                rangeId: r.cartoonNumber,
                displayName: `${r.cartoonNumber} - ${r.serialRange || r.fromSerial + '-' + r.toSerial} (${r.availableCount} units)`,
                availableCount: r.availableCount,
                serialRange: r.serialRange || `${r.fromSerial} - ${r.toSerial}`,
                fromSerial: r.fromSerial,
                toSerial: r.toSerial,
             })));
        }
    }
    
    // NOTE: We no longer add leftover ranges as separate dropdown entries
    // Leftover ranges are only shown in the Usage section with "Use" buttons
    // The dropdown only shows originally assigned rolls with leftover info appended
    
    return availableRolls;
  }

  selectRollForEntry(entry: RegisterEntry, cartoonNumberOrRangeId: string): void {
    if (!cartoonNumberOrRangeId) return;

    // Find the roll details (could be a rangeId like "test1_RANGE_1" or just cartoon number)
    const roll = this.getAvailableRollsForEntry(entry).find(r => 
      r.rangeId === cartoonNumberOrRangeId || r.cartoonNumber === cartoonNumberOrRangeId
    );
    if (!roll) return;

    // Check if this specific range is already locked
    const lockedRolls = this.getLockedRollsForEntry(entry);
    const rangeIdToCheck = roll.rangeId || roll.cartoonNumber;
    const lockedRoll = lockedRolls.find((lr: any) => (lr.rangeId || lr.cartoonNumber) === rangeIdToCheck);
    
    if (lockedRoll) {
      // Instead of showing alert, display the locked roll in read-only mode
      console.log('📌 Viewing locked roll in read-only mode:', lockedRoll);
      console.log('📝 Usage history:', lockedRoll.leftoverUsageHistory);
      
      // CRITICAL FIX: Create a COPY of the locked roll to avoid modifying the original
      // This ensures each entry shows only its own usage without affecting other entries
      const rollCopy = { ...lockedRoll };
      
      // CRITICAL FIX: Recalculate leftOver from actual leftover ranges
      // This ensures the displayed leftOver matches the sum of available ranges
      const leftoverRanges = this.getLeftoverRanges(entry, rollCopy);
      const calculatedLeftOver = leftoverRanges.reduce((sum, r) => sum + r.quantity, 0);
      
      console.log('🔄 Recalculating leftOver for locked roll:');
      console.log('  - Old leftOver:', rollCopy.leftOver);
      console.log('  - Calculated from ranges:', calculatedLeftOver);
      console.log('  - Leftover ranges:', leftoverRanges);
      
      // Update the copy's leftOver to match the calculated value
      rollCopy.leftOver = calculatedLeftOver;
      
      // CRITICAL FIX: Recalculate issuedQty and wastageQty to include leftover reuses
      // The original issuedQty/wastageQty only includes the first lock, not subsequent leftover uses
      let totalIssuedQty = 0;
      let totalWastageQty = 0;
      
      // Add original issued and wastage quantities
      if (rollCopy.issuedRanges && Array.isArray(rollCopy.issuedRanges)) {
        totalIssuedQty += rollCopy.issuedRanges.reduce((sum: number, range: any) => sum + (range.quantity || 0), 0);
      }
      
      if (rollCopy.wastageRanges && Array.isArray(rollCopy.wastageRanges)) {
        totalWastageQty += rollCopy.wastageRanges.reduce((sum: number, range: any) => sum + (range.quantity || 0), 0);
      }
      
      // Add quantities from leftover usage history
      if (rollCopy.leftoverUsageHistory && rollCopy.leftoverUsageHistory.length > 0) {
        rollCopy.leftoverUsageHistory.forEach((history: LeftoverUsageHistory) => {
          totalIssuedQty += history.usedQty || 0;
          totalWastageQty += history.damagedQty || 0;
        });
      }
      
      console.log('🔄 Recalculating usage quantities for locked roll:');
      console.log('  - Old issuedQty:', rollCopy.issuedQty);
      console.log('  - New issuedQty (including leftover reuses):', totalIssuedQty);
      console.log('  - Old wastageQty:', rollCopy.wastageQty);
      console.log('  - New wastageQty (including leftover reuses):', totalWastageQty);
      
      // Update the copy's quantities (NOT the original locked roll)
      rollCopy.issuedQty = totalIssuedQty;
      rollCopy.wastageQty = totalWastageQty;
      
      // CRITICAL: Use the COPY so we don't modify the original locked roll
      // This ensures each entry shows only its own usage
      entry.currentRollSelection = {
        selectedRoll: rangeIdToCheck,
        rollInput: rollCopy, // Use the copy with recalculated values
        isLocked: true // Mark as locked (read-only)
      };
      
      this.cdr.detectChanges();
      return;
    }

    // Store the rangeId (or cartoonNumber if no rangeId) as the selectedRoll
    const selectedRollId = roll.rangeId || roll.cartoonNumber;
    
    entry.currentRollSelection = {
      selectedRoll: selectedRollId, // Use rangeId for specific range tracking
      rollInput: {
        cartoonNumber: roll.originalCartoonNumber || roll.cartoonNumber, // Store original cartoon number
        rangeId: roll.rangeId, // Store range ID for tracking
        displayName: roll.displayName || roll.cartoonNumber, // Store display name for UI
        rangeIndex: roll.rangeIndex, // Store which range this is (1, 2, 3, etc.)
        availableCount: roll.availableCount,
        serialRange: roll.serialRange,
        fromSerial: roll.fromSerial, // Store the specific range's from serial
        toSerial: roll.toSerial, // Store the specific range's to serial
        issuedRanges: [{ fromSerial: '', toSerial: '', quantity: 0 }],
        wastageRanges: [{ fromSerial: '', toSerial: '', quantity: 0 }],
        issuedQty: 0,
        wastageQty: 0,
        leftOver: roll.availableCount,
        damageReason: '',
        brandDetails: '',
        bottleSize: ''
      },
      isLocked: false
    };

    this.cdr.detectChanges();
    
    console.log(`🎯 Selected range ${roll.displayName} (${selectedRollId}), serial range: ${roll.serialRange}`);
  }



  /**
   * Validate if a serial range is within ANY of the allocated ranges for a roll
   * CRITICAL FIX: Ensures the ENTIRE range (from-to) is within a SINGLE allocated range
   * This prevents users from entering ranges that span across multiple non-contiguous slots
   */
  validateSerialRangeInAllocatedRanges(
    fromSerial: string,
    toSerial: string,
    allocatedRanges: Array<{ fromSerial: string; toSerial: string }>
  ): { isValid: boolean; errorMessage: string } {
    if (!fromSerial || !toSerial) {
      return { isValid: true, errorMessage: '' }; // Empty is valid (not required yet)
    }

    if (!allocatedRanges || allocatedRanges.length === 0) {
      return { isValid: false, errorMessage: 'Allocated ranges not found for this roll' };
    }

    // Extract numeric parts
    const extractNumber = (s: string): number => {
      const match = s.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const fromNum = extractNumber(fromSerial);
    const toNum = extractNumber(toSerial);

    // Check if range is valid (from <= to)
    if (fromNum > toNum) {
      return { isValid: false, errorMessage: 'From serial must be less than or equal to To serial' };
    }

    // CRITICAL FIX: Check if the ENTIRE range (both from AND to) is within a SINGLE allocated range
    // This prevents spanning across multiple non-contiguous ranges
    for (const allocatedRange of allocatedRanges) {
      const allocatedFromNum = extractNumber(allocatedRange.fromSerial);
      const allocatedToNum = extractNumber(allocatedRange.toSerial);

      // Both fromNum AND toNum must be within the SAME allocated range
      if (fromNum >= allocatedFromNum && toNum <= allocatedToNum) {
        return { isValid: true, errorMessage: '' };
      }
    }

    // Range is not within any single allocated range
    const rangesStr = allocatedRanges.map(r => `${r.fromSerial}-${r.toSerial}`).join(', ');
    return {
      isValid: false,
      errorMessage: `Serial range must be entirely within ONE of the allocated ranges: ${rangesStr}` 
    };
  }

  /**
   * Check if two serial ranges overlap
   */
  private checkRangeOverlap(
    range1From: string,
    range1To: string,
    range2From: string,
    range2To: string
  ): boolean {
    if (!range1From || !range1To || !range2From || !range2To) {
      return false; // Empty ranges don't overlap
    }

    const extractNumber = (s: string): number => {
      const match = s.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const r1From = extractNumber(range1From);
    const r1To = extractNumber(range1To);
    const r2From = extractNumber(range2From);
    const r2To = extractNumber(range2To);

    // Check if ranges overlap: range1 overlaps range2 if:
    // - range1 starts within range2, OR
    // - range1 ends within range2, OR
    // - range1 completely contains range2
    return (
      (r1From >= r2From && r1From <= r2To) || // range1 starts within range2
      (r1To >= r2From && r1To <= r2To) ||     // range1 ends within range2
      (r1From <= r2From && r1To >= r2To)      // range1 contains range2
    );
  }

  /**
   * Validate that ranges within the same category don't overlap
   */
  private validateNoOverlapWithinCategory(ranges: RollRange[]): { isValid: boolean; overlappingRanges: string[] } {
    const overlappingRanges: string[] = [];

    for (let i = 0; i < ranges.length; i++) {
      const range1 = ranges[i];
      if (!range1.fromSerial || !range1.toSerial) continue;

      for (let j = i + 1; j < ranges.length; j++) {
        const range2 = ranges[j];
        if (!range2.fromSerial || !range2.toSerial) continue;

        if (this.checkRangeOverlap(
          range1.fromSerial,
          range1.toSerial,
          range2.fromSerial,
          range2.toSerial
        )) {
          overlappingRanges.push(
            `Range ${i + 1} (${range1.fromSerial}-${range1.toSerial}) overlaps with Range ${j + 1} (${range2.fromSerial}-${range2.toSerial})`
          );
        }
      }
    }

    return {
      isValid: overlappingRanges.length === 0,
      overlappingRanges
    };
  }

  /**
   * Validate that issued and wastage ranges don't overlap
   */
  private validateNoOverlapBetweenIssuedAndWastage(
    issuedRanges: RollRange[],
    wastageRanges: RollRange[]
  ): { isValid: boolean; overlappingRanges: string[] } {
    const overlappingRanges: string[] = [];

    // Check each issued range against all wastage ranges
    for (let i = 0; i < issuedRanges.length; i++) {
      const issued = issuedRanges[i];
      if (!issued.fromSerial || !issued.toSerial) continue;

      for (let j = 0; j < wastageRanges.length; j++) {
        const wastage = wastageRanges[j];
        if (!wastage.fromSerial || !wastage.toSerial) continue;

        if (this.checkRangeOverlap(
          issued.fromSerial,
          issued.toSerial,
          wastage.fromSerial,
          wastage.toSerial
        )) {
          overlappingRanges.push(
            `Issued (${issued.fromSerial}-${issued.toSerial}) overlaps with Wastage (${wastage.fromSerial}-${wastage.toSerial})`
          );
        }
      }
    }

    return {
      isValid: overlappingRanges.length === 0,
      overlappingRanges
    };
  }

  /**
   * Get all used ranges from locked rolls (for cross-roll validation)
   * CRITICAL FIX: Only get ranges from OTHER rolls, not the current roll being edited
   * Each roll should only validate against its own allocated ranges, not other rolls' ranges
   */
  private getAllUsedRangesFromLockedRolls(entry: RegisterEntry, currentRollCartoonNumber?: string): Array<{ fromSerial: string; toSerial: string; rollName: string; type: 'issued' | 'wastage' }> {
    const lockedRolls = this.getLockedRollsForEntry(entry);
    const usedRanges: Array<{ fromSerial: string; toSerial: string; rollName: string; type: 'issued' | 'wastage' }> = [];

    lockedRolls.forEach((roll) => {
      // CRITICAL FIX: Skip the current roll being edited
      // Each roll has its own allocated ranges and should not interfere with other rolls
      if (currentRollCartoonNumber && roll.cartoonNumber === currentRollCartoonNumber) {
        console.log(`⏭️ Skipping current roll ${currentRollCartoonNumber} from cross-roll validation`);
        return; // Skip this roll
      }
      
      // Collect issued ranges from locked roll
      if (roll.issuedRanges && Array.isArray(roll.issuedRanges)) {
        roll.issuedRanges.forEach((range: any) => {
          if (range.fromSerial && range.toSerial) {
            usedRanges.push({
              fromSerial: range.fromSerial,
              toSerial: range.toSerial,
              rollName: roll.displayName || roll.cartoonNumber,
              type: 'issued'
            });
          }
        });
      }

      // Collect wastage ranges from locked roll
      if (roll.wastageRanges && Array.isArray(roll.wastageRanges)) {
        roll.wastageRanges.forEach((range: any) => {
          if (range.fromSerial && range.toSerial) {
            usedRanges.push({
              fromSerial: range.fromSerial,
              toSerial: range.toSerial,
              rollName: roll.displayName || roll.cartoonNumber,
              type: 'wastage'
            });
          }
        });
      }
    });

    return usedRanges;
  }

  /**
   * Validate that current roll ranges don't overlap with locked rolls
   */
  private validateNoOverlapWithLockedRolls(
    currentRanges: RollRange[],
    lockedRanges: Array<{ fromSerial: string; toSerial: string; rollName: string; type: 'issued' | 'wastage' }>
  ): { isValid: boolean; conflicts: Array<{ currentRange: RollRange; lockedRange: any }> } {
    const conflicts: Array<{ currentRange: RollRange; lockedRange: any }> = [];

    currentRanges.forEach((currentRange) => {
      if (!currentRange.fromSerial || !currentRange.toSerial) return;

      lockedRanges.forEach((lockedRange) => {
        if (this.checkRangeOverlap(
          currentRange.fromSerial,
          currentRange.toSerial,
          lockedRange.fromSerial,
          lockedRange.toSerial
        )) {
          conflicts.push({
            currentRange,
            lockedRange
          });
        }
      });
    });

    return {
      isValid: conflicts.length === 0,
      conflicts
    };
  }

  onRollInputChange(entry: RegisterEntry): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) return;

    const cartoonNumber = rollInput.cartoonNumber;
    
    // CRITICAL FIX: If a specific range was selected (rangeId exists), validate against ONLY that range
    // Otherwise, validate against all ranges for backward compatibility
    let allocatedRanges: Array<{ fromSerial: string; toSerial: string }>;
    
    if (rollInput.fromSerial && rollInput.toSerial) {
      // Use the SPECIFIC range that was selected (stored in rollInput)
      allocatedRanges = [{
        fromSerial: rollInput.fromSerial,
        toSerial: rollInput.toSerial
      }];
      console.log(`🎯 Validating against SELECTED range only: ${rollInput.fromSerial}-${rollInput.toSerial}`);
    } else {
      // Fallback: get all ranges for this roll (for backward compatibility)
      allocatedRanges = this.getAllocatedRangesForRoll(entry, cartoonNumber).map(r => ({
        fromSerial: r.fromSerial,
        toSerial: r.toSerial
      }));
      console.log(`⚠️ Validating against ALL ranges for ${cartoonNumber}:`, allocatedRanges);
    }

    // Validate and calculate issued ranges
    rollInput.issuedQty = rollInput.issuedRanges.reduce((sum, range) => {
      range.quantity = this.calculateQuantityFromSerials(range.fromSerial, range.toSerial);
      
      // Validate range against the allocated range(s)
      if (allocatedRanges.length > 0) {
        const validation = this.validateSerialRangeInAllocatedRanges(
          range.fromSerial,
          range.toSerial,
          allocatedRanges
        );
        range.isValid = validation.isValid;
        range.errorMessage = validation.errorMessage;
      } else {
        range.isValid = true; // No allocated ranges found, skip validation
        range.errorMessage = '';
      }
      
      return sum + range.quantity;
    }, 0);

    // Validate and calculate wastage ranges
    rollInput.wastageQty = rollInput.wastageRanges.reduce((sum, range) => {
      range.quantity = this.calculateQuantityFromSerials(range.fromSerial, range.toSerial);
      
      // Validate range against the allocated range(s)
      if (allocatedRanges.length > 0) {
        const validation = this.validateSerialRangeInAllocatedRanges(
          range.fromSerial,
          range.toSerial,
          allocatedRanges
        );
        range.isValid = validation.isValid;
        range.errorMessage = validation.errorMessage;
      } else {
        range.isValid = true; // No allocated ranges found, skip validation
        range.errorMessage = '';
      }
      
      return sum + range.quantity;
    }, 0);

    // NEW: Validate that issued ranges don't overlap with each other (within current roll)
    const issuedOverlapCheck = this.validateNoOverlapWithinCategory(rollInput.issuedRanges);
    if (!issuedOverlapCheck.isValid) {
      // Mark all issued ranges as invalid if there's overlap
      rollInput.issuedRanges.forEach((range, index) => {
        if (range.fromSerial && range.toSerial) {
          range.isValid = false;
          range.errorMessage = `Issued ranges overlap within this roll: ${issuedOverlapCheck.overlappingRanges[0]}`;
        }
      });
    }

    // NEW: Validate that wastage ranges don't overlap with each other (within current roll)
    const wastageOverlapCheck = this.validateNoOverlapWithinCategory(rollInput.wastageRanges);
    if (!wastageOverlapCheck.isValid) {
      // Mark all wastage ranges as invalid if there's overlap
      rollInput.wastageRanges.forEach((range, index) => {
        if (range.fromSerial && range.toSerial) {
          range.isValid = false;
          range.errorMessage = `Wastage ranges overlap within this roll: ${wastageOverlapCheck.overlappingRanges[0]}`;
        }
      });
    }

    // NEW: Validate that issued and wastage ranges don't overlap (within current roll)
    const crossOverlapCheck = this.validateNoOverlapBetweenIssuedAndWastage(
      rollInput.issuedRanges,
      rollInput.wastageRanges
    );
    
    if (!crossOverlapCheck.isValid) {
      // Mark overlapping ranges as invalid
      rollInput.issuedRanges.forEach((issued) => {
        if (!issued.fromSerial || !issued.toSerial) return;
        
        rollInput.wastageRanges.forEach((wastage) => {
          if (!wastage.fromSerial || !wastage.toSerial) return;
          
          if (this.checkRangeOverlap(
            issued.fromSerial,
            issued.toSerial,
            wastage.fromSerial,
            wastage.toSerial
          )) {
            issued.isValid = false;
            issued.errorMessage = `Overlaps with wastage range (${wastage.fromSerial}-${wastage.toSerial}) in this roll`;
            wastage.isValid = false;
            wastage.errorMessage = `Overlaps with issued range (${issued.fromSerial}-${issued.toSerial}) in this roll`;
          }
        });
      });
    }

    // CRITICAL FIX: REMOVED CROSS-ROLL VALIDATION
    // Each roll has its own independent allocated ranges
    // Ranges from "test1" should NOT affect ranges from "test2" or any other roll
    // Only validate within the current roll's own allocated ranges (already done above)
    // 
    // Example:
    // - Roll "test1" has ranges: 000001-100000
    // - Roll "test2" has ranges: 000001-050000
    // - These are INDEPENDENT and should NOT validate against each other
    // - Each roll only validates against its OWN allocated ranges
    console.log(`✅ Skipping cross-roll validation - each roll is independent with its own allocated ranges`);

    // CRITICAL FIX: Calculate leftOver correctly
    // For leftover reuse ranges, availableCount represents the leftover quantity being reused
    // For original ranges, availableCount represents the full allocated quantity
    // The formula should always be: leftOver = availableCount - (issuedQty + wastageQty)
    rollInput.leftOver = rollInput.availableCount - (rollInput.issuedQty + rollInput.wastageQty);
    
    // Ensure leftOver is never negative
    if (rollInput.leftOver < 0) {
      rollInput.leftOver = 0;
    }

    // Recalculate entry totals from all rolls (locked + current)
    this.recalculateEntryFromLockedRolls(entry);
    this.cdr.detectChanges();
  }

  addIssuedRange(entry: RegisterEntry): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) return;
    
    rollInput.issuedRanges.push({ fromSerial: '', toSerial: '', quantity: 0 });
    this.cdr.detectChanges();
  }

  removeIssuedRange(entry: RegisterEntry, index: number): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput || rollInput.issuedRanges.length <= 1) return;
    
    rollInput.issuedRanges.splice(index, 1);
    this.onRollInputChange(entry);
  }

  addWastageRange(entry: RegisterEntry): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) return;
    
    rollInput.wastageRanges.push({ fromSerial: '', toSerial: '', quantity: 0 });
    this.cdr.detectChanges();
  }

  removeWastageRange(entry: RegisterEntry, index: number): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput || rollInput.wastageRanges.length <= 1) return;
    
    rollInput.wastageRanges.splice(index, 1);
    this.onRollInputChange(entry);
  }

  canLockRoll(entry: RegisterEntry): boolean {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) return false;

    // CRITICAL: If the roll is already locked (read-only mode), cannot lock again
    if (this.isCurrentRollLocked(entry)) {
      return false;
    }

    // Check if brand details and bottle size are filled
    if (!rollInput.brandDetails || rollInput.brandDetails.trim() === '') return false;
    if (!rollInput.bottleSize || rollInput.bottleSize.trim() === '') return false;

    // CRITICAL: Check if ANY data is entered (issued OR wastage)
    // It's valid to have ONLY wastage (no issued) or ONLY issued (no wastage)
    let hasValidIssuedRange = false;
    let hasValidWastageRange = false;

    // Check ISSUED ranges: Both FROM and TO must be filled for any range that has started
    if (rollInput.issuedRanges && rollInput.issuedRanges.length > 0) {
      // Check if any issued range has only one field filled (incomplete)
      const hasIncompleteIssuedRange = rollInput.issuedRanges.some((range) => {
        const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
        const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
        // If either FROM or TO is filled, both must be filled
        return (hasFrom && !hasTo) || (!hasFrom && hasTo);
      });
      
      if (hasIncompleteIssuedRange) return false;

      // Check if there's at least one complete issued range with valid serials
      hasValidIssuedRange = rollInput.issuedRanges.some((range) => {
        const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
        const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
        return hasFrom && hasTo && range.quantity > 0;
      });

      // If there are issued ranges, check if all complete ones are valid (within allocated range)
      if (hasValidIssuedRange) {
        const allIssuedRangesValid = rollInput.issuedRanges.every((range) => {
          const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
          const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
          // If range is incomplete (empty), skip validation
          if (!hasFrom && !hasTo) return true;
          // If range is complete, check if it's valid
          return range.isValid !== false;
        });
        
        if (!allIssuedRangesValid) return false;
      }
    }

    // Check WASTAGE ranges: Both FROM and TO must be filled for any range that has started
    if (rollInput.wastageRanges && rollInput.wastageRanges.length > 0) {
      // Check if any wastage range has only one field filled (incomplete)
      const hasIncompleteWastageRange = rollInput.wastageRanges.some((range) => {
        const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
        const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
        // If either FROM or TO is filled, both must be filled
        return (hasFrom && !hasTo) || (!hasFrom && hasTo);
      });
      
      if (hasIncompleteWastageRange) return false;

      // Check if there's at least one complete wastage range with valid serials
      hasValidWastageRange = rollInput.wastageRanges.some((range) => {
        const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
        const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
        return hasFrom && hasTo && range.quantity > 0;
      });

      // If there are wastage ranges, check if all complete ones are valid (within allocated range)
      if (hasValidWastageRange) {
        const allWastageRangesValid = rollInput.wastageRanges.every((range) => {
          const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
          const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
          // If range is incomplete (empty), skip validation
          if (!hasFrom && !hasTo) return true;
          // If range is complete, check if it's valid
          return range.isValid !== false;
        });
        
        if (!allWastageRangesValid) return false;
      }
    }

    // CRITICAL FIX: Must have at least ONE valid range (either issued OR wastage)
    // This allows locking with ONLY wastage (no issued) or ONLY issued (no wastage)
    if (!hasValidIssuedRange && !hasValidWastageRange) {
      return false;
    }

    // Left over must not be negative
    if (rollInput.leftOver < 0) return false;

    return true;
  }

  lockRollForEntry(entry: RegisterEntry): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) {
      alert('Please select a roll first.');
      return;
    }

    // CRITICAL: Prevent locking if this is a read-only (already locked) roll
    if (this.isCurrentRollLocked(entry)) {
      alert('This roll is already locked and cannot be locked again.\n\nYou are viewing it in read-only mode.');
      return;
    }

    // CRITICAL: Check if this roll is already in the locked rolls list
    const lockedRolls = entry.lockedRolls || [];
    const rangeIdToCheck = rollInput.rangeId || rollInput.cartoonNumber;
    const alreadyLocked = lockedRolls.some((lr: any) => (lr.rangeId || lr.cartoonNumber) === rangeIdToCheck);
    
    if (alreadyLocked) {
      alert('This roll has already been locked.\n\nPlease select a different roll.');
      return;
    }

    // Check if this is a leftover reuse - if so, record usage history in parent roll
    const isLeftoverReuse = rollInput.rangeId?.includes('_LEFTOVER_');
    if (isLeftoverReuse && rollInput.parentRollId) {
      this.recordLeftoverUsageHistory(entry, rollInput);
    }

    if (!this.canLockRoll(entry)) {
      // Check for validation errors
      const invalidIssuedRanges = rollInput.issuedRanges?.filter((r) => r.isValid === false && r.errorMessage);
      const invalidWastageRanges = rollInput.wastageRanges?.filter((r) => r.isValid === false && r.errorMessage);
      
      // Check for incomplete ranges
      const incompleteIssuedRanges = rollInput.issuedRanges?.filter((r) => {
        const hasFrom = !!r.fromSerial && r.fromSerial.trim() !== '';
        const hasTo = !!r.toSerial && r.toSerial.trim() !== '';
        return (hasFrom && !hasTo) || (!hasFrom && hasTo);
      });
      
      const incompleteWastageRanges = rollInput.wastageRanges?.filter((r) => {
        const hasFrom = !!r.fromSerial && r.fromSerial.trim() !== '';
        const hasTo = !!r.toSerial && r.toSerial.trim() !== '';
        return (hasFrom && !hasTo) || (!hasFrom && hasTo);
      });
      
      let errorMessage = 'Cannot lock roll. Please fix the following errors:\n\n';
      
      // Check for brand details and bottle size
      if (!rollInput.brandDetails || rollInput.brandDetails.trim() === '') {
        errorMessage += 'Brand Details - Required:\n';
        errorMessage += 'Please enter brand details for this roll.\n\n';
      }
      
      if (!rollInput.bottleSize || rollInput.bottleSize.trim() === '') {
        errorMessage += 'Bottle Size - Required:\n';
        errorMessage += 'Please enter bottle size for this roll (e.g., 750ml).\n\n';
      }
      
      if (incompleteIssuedRanges && incompleteIssuedRanges.length > 0) {
        errorMessage += 'Issued Ranges - Incomplete:\n';
        errorMessage += 'Both "ISSUED FROM" and "ISSUED TO" must be filled for each range.\n';
        errorMessage += 'Please complete all started ranges or remove them.\n\n';
      }
      
      if (incompleteWastageRanges && incompleteWastageRanges.length > 0) {
        errorMessage += 'Wastage Ranges - Incomplete:\n';
        errorMessage += 'Both "WASTAGE FROM" and "WASTAGE TO" must be filled for each range.\n';
        errorMessage += 'Please complete all started ranges or remove them.\n\n';
      }
      
      if (invalidIssuedRanges && invalidIssuedRanges.length > 0) {
        errorMessage += 'Issued Ranges - Validation Errors:\n';
        invalidIssuedRanges.forEach((r, i) => {
          errorMessage += `${i + 1}. ${r.errorMessage}\n`;
        });
        errorMessage += '\n';
      }
      
      if (invalidWastageRanges && invalidWastageRanges.length > 0) {
        errorMessage += 'Wastage Ranges - Validation Errors:\n';
        invalidWastageRanges.forEach((r, i) => {
          errorMessage += `${i + 1}. ${r.errorMessage}\n`;
        });
        errorMessage += '\n';
      }
      
      if (rollInput.leftOver < 0) {
        errorMessage += `Left Over is negative: ${rollInput.leftOver}. Please adjust quantities.\n`;
      }
      
      // Check if at least one range (issued OR wastage) is filled
      const hasValidIssuedRange = rollInput.issuedRanges?.some((r) => {
        const hasFrom = !!r.fromSerial && r.fromSerial.trim() !== '';
        const hasTo = !!r.toSerial && r.toSerial.trim() !== '';
        return hasFrom && hasTo && r.quantity > 0;
      });
      
      const hasValidWastageRange = rollInput.wastageRanges?.some((r) => {
        const hasFrom = !!r.fromSerial && r.fromSerial.trim() !== '';
        const hasTo = !!r.toSerial && r.toSerial.trim() !== '';
        return hasFrom && hasTo && r.quantity > 0;
      });
      
      if (!hasValidIssuedRange && !hasValidWastageRange) {
        errorMessage += 'Please enter at least one complete range:\n';
        errorMessage += '- Either ISSUED (FROM and TO), OR\n';
        errorMessage += '- WASTAGE (FROM and TO), OR\n';
        errorMessage += '- Both ISSUED and WASTAGE\n';
      }
      
      alert(errorMessage);
      return;
    }

    if (!entry.lockedRolls) {
      entry.lockedRolls = [];
    }

    // Store the roll input with all its data
    entry.lockedRolls.push({ ...rollInput });
    
    // Clear current selection to allow selecting next roll
    entry.currentRollSelection = undefined;

    // Recalculate totals from all locked rolls
    this.recalculateEntryFromLockedRolls(entry);
    
    // Update the rolls view if this entry is currently being viewed
    this.updateRollsView(entry);
    
    // Force change detection to update the UI (including usage box)
    this.cdr.detectChanges();

    console.log('✅ Roll locked successfully:', {
      cartoonNumber: rollInput.cartoonNumber,
      issuedQty: rollInput.issuedQty,
      wastageQty: rollInput.wastageQty,
      leftOver: rollInput.leftOver,
      totalLockedRolls: entry.lockedRolls.length
    });

    alert(`Roll ${rollInput.displayName || rollInput.cartoonNumber} locked successfully!\n\nUsage: ${rollInput.issuedQty}\nDamaged: ${rollInput.wastageQty}\nLeftover: ${rollInput.leftOver}`);
  }

  unlockRollForEntry(entry: RegisterEntry, cartoonNumber: string): void {
    const lockedRolls = entry.lockedRolls || [];
    const index = lockedRolls.findIndex(r => r.cartoonNumber === cartoonNumber);

    if (index !== -1) {
      lockedRolls.splice(index, 1);
      this.recalculateEntryFromLockedRolls(entry);
      this.cdr.detectChanges();
    }
  }

  recalculateEntryFromLockedRolls(entry: RegisterEntry): void {
    const lockedRolls = entry.lockedRolls || [];

    let totalIssued = 0;
    let totalWastage = 0;
    let totalLeftOver = 0;
    let totalAllocated = 0;

    lockedRolls.forEach(roll => {
      totalIssued += roll.issuedQty || 0;
      totalWastage += roll.wastageQty || 0;
      totalLeftOver += roll.leftOver || 0;
      
      // CRITICAL FIX: Only add availableCount to totalAllocated if this is NOT a leftover reuse
      // Leftover reuses are already counted in their parent roll's allocation
      if (!roll.isLeftoverReuse) {
        totalAllocated += roll.availableCount || 0;
      }
    });

    // Also add current roll's allocated quantity if it exists
    const currentRoll = this.getCurrentRollInput(entry);
    if (currentRoll) {
      totalIssued += currentRoll.issuedQty || 0;
      totalWastage += currentRoll.wastageQty || 0;
      totalLeftOver += currentRoll.leftOver || 0;
      
      // CRITICAL FIX: Only add availableCount if this is NOT a leftover reuse
      if (!currentRoll.isLeftoverReuse) {
        totalAllocated += currentRoll.availableCount || 0;
      }
    }

    entry.issuedQty = totalIssued;
    entry.wastageQty = totalWastage;
    entry.leftOver = totalLeftOver;
    // CRITICAL FIX: hologramQty should be the TOTAL ALLOCATED quantity from ORIGINAL rolls only
    // Leftover reuses are NOT counted here because they're already part of the original allocation
    entry.hologramQty = totalAllocated;
    entry.total = totalIssued + totalWastage + totalLeftOver;
  }

  /**
   * Calculate total (Issued + Wastage + Left Over) for validation
   */
  getTotalCalculation(entry: RegisterEntry): number {
    return (entry.issuedQty || 0) + (entry.wastageQty || 0) + (entry.leftOver || 0);
  }

  // Check if all ranges are locked and entry can be saved
  canSaveEntry(entry: RegisterEntry): boolean {
    if (entry.isFixed) return false; // Already saved
    
    // Must have at least one locked roll
    const lockedRolls = entry.lockedRolls || [];
    if (lockedRolls.length === 0) return false;
    
    // CRITICAL FIX: Cannot have an ACTIVE (unlocked) current roll selection
    // If the current roll selection is locked (read-only mode), it's OK to save
    // This allows saving when user is just viewing a locked roll without editing
    if (entry.currentRollSelection && !entry.currentRollSelection.isLocked) {
      return false; // There's an active roll being edited, can't save yet
    }
    
    // Check if all allocated ranges are locked
    const allocationData = this.getHologramAllocationForEntry(entry);
    if (allocationData && allocationData.allocatedCartoons) {
      const totalAllocatedRanges = allocationData.allocatedCartoons.length;
      
      // CRITICAL FIX: Count only NON-leftover-reuse locked rolls
      // Leftover reuses don't count toward the total allocated ranges
      const nonLeftoverLockedRolls = lockedRolls.filter((roll: RollInput) => !roll.isLeftoverReuse);
      const lockedRangesCount = nonLeftoverLockedRolls.length;
      
      // All ranges must be locked
      if (lockedRangesCount < totalAllocatedRanges) {
        return false;
      }
    }
    
    // Validate quantities
    if (entry.leftOver < 0) return false;
    
    return true;
  }

  // Save the entry
  saveEntry(entry: RegisterEntry): void {
    if (!this.canSaveEntry(entry)) {
      return;
    }

    const lockedRolls = entry.lockedRolls || [];
    if (lockedRolls.length === 0) return;

    // Create payloads for each locked roll (creating separate DB entries per roll)
    const payloads = lockedRolls.map((roll: any) => {
      // Safely extract brand name
      let brandName = '';
      const rollBrand = roll.brandDetails;
      const entryBrand = entry.brandDetails;
      
      if (rollBrand && typeof rollBrand === 'object') {
        brandName = rollBrand.brandName || '';
      } else if (rollBrand) {
        brandName = String(rollBrand);
      } else if (entryBrand && typeof entryBrand === 'object') {
        brandName = entryBrand.brandName || '';
      } else if (entryBrand) {
        brandName = String(entryBrand);
      }

      return {
        reference_no: entry.referenceNo || 'N/A',
        hologram_request: entry.requestId || null, // Link to original request
        roll_range: roll.displayName || roll.cartoonNumber,
        submission_date: entry.dates.submission || new Date().toISOString().split('T')[0],
        usage_date: entry.dates.usage || new Date().toISOString().split('T')[0],
        
        brand_details: brandName,
        bottle_size: roll.bottleSize || entry.bottleSize || '',
        
        hologram_qty: roll.availableCount || 0, // Total allocated for this roll
        
        issued_from: roll.issuedRanges?.[0]?.fromSerial || '',
        issued_to: roll.issuedRanges?.[roll.issuedRanges.length - 1]?.toSerial || '',
        issued_qty: roll.issuedQty || 0,
        issued_ranges: roll.issuedRanges || [],
        
        wastage_from: roll.wastageRanges?.[0]?.fromSerial || '',
        wastage_to: roll.wastageRanges?.[roll.wastageRanges.length - 1]?.toSerial || '',
        wastage_qty: roll.wastageQty || 0,
        wastage_ranges: roll.wastageRanges || [],
        
        damage_reason: roll.damageReason || '',
        is_fixed: true
      };
    });

    console.log('🚀 Saving to backend:', payloads);

    // Save all rolls concurrently
    // We use forkJoin if we decide to save multiple, but here we iterate or promise.all
    // Since we need to update UI after ALL are done, let's use a counter or forkJoin
    
    // Using forkJoin to save all rolls
    const saveObservables = payloads.map((payload: any) => 
      this.hologramService.saveDailyRegisterEntry(payload)
    );

    // Import forkJoin at top if not present, but for now we can assume it might be available or use subscribe loop
    // Better to use forkJoin. I will use a simple loop for now if imports are tricky, but wait... 
    // I restored forkJoin earlier! So I can use it.
    
    // NOTE: accessing forkJoin from rxjs
    // If imports are messy, I will use a simple Promise.all behavior via subscribe
    
    let completed = 0;
    const total = payloads.length;
    let errors = 0;

    payloads.forEach((payload: any) => {
      this.hologramService.saveDailyRegisterEntry(payload).subscribe({
        next: (res) => {
          console.log('✅ Saved roll:', res);
          completed++;
          this.checkSaveCompletion(entry, completed, total, errors);
        },
        error: (err) => {
          console.error('❌ Error saving roll:', err);
          errors++;
          this.checkSaveCompletion(entry, completed, total, errors);
        }
      });
    });
  }

  private checkSaveCompletion(entry: RegisterEntry, completed: number, total: number, errors: number): void {
    if (completed + errors === total) {
      if (errors === 0) {
        // All successful
        entry.isFixed = true;
        entry.rollsAssigned = (entry.lockedRolls || []).map((r: any) => r.cartoonNumber);
        
        // Update local stats for immediate display
        // Update local stats for immediate display
        this.cdr.detectChanges();
        alert('✅ All entries saved to database successfully!');
      } else {
        alert(`⚠️ Completed with ${errors} errors. Please check console.`);
      }
    }
  }

  // Legacy method removed or commented out to ensure no local storage usage for saving
  // private saveEntryToLocalStorage(entry: RegisterEntry) { ... }
  // private saveToMonthlyStatement(entry: RegisterEntry) { ... }


  /**
   * Update entry quantities based on locked rolls and current input
   */  updateEntryQuantitiesFromAllRolls(entry: RegisterEntry): void {
    if (entry.isFixed) return;

    const lockedRolls = entry.lockedRolls || [];
    const currentRoll = this.getCurrentRollInput(entry);

    let totalIssued = lockedRolls.reduce((sum, roll) => sum + (roll.issuedQty || 0), 0);
    let totalWastage = lockedRolls.reduce((sum, roll) => sum + (roll.wastageQty || 0), 0);
    let totalLeftOver = lockedRolls.reduce((sum, roll) => sum + (roll.leftOver || 0), 0);

    if (currentRoll) {
      totalIssued += currentRoll.issuedQty || 0;
      totalWastage += currentRoll.wastageQty || 0;
      totalLeftOver += currentRoll.leftOver || 0;
    }

    entry.issuedQty = totalIssued;
    entry.wastageQty = totalWastage;
    entry.leftOver = totalLeftOver;
    entry.total = totalIssued + totalWastage + totalLeftOver;
  }

  getRollColor(indexOrCartoonNumber: number | string): string {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'];
    
    if (typeof indexOrCartoonNumber === 'string') {
      // Get consistent color index for cartoon number
      return colors[this.getRollColorIndex(indexOrCartoonNumber) % colors.length];
    }
    
    return colors[indexOrCartoonNumber % colors.length];
  }

  getRollBackgroundColor(indexOrCartoonNumber: number | string): string {
    const bgColors = ['#e7f3ff', '#e7f5e7', '#fff8e1', '#ffe7e7', '#e0f7fa', '#f3e5f5', '#fff3e0', '#e0f2f1'];
    
    if (typeof indexOrCartoonNumber === 'string') {
      // Get consistent color index for cartoon number
      return bgColors[this.getRollColorIndex(indexOrCartoonNumber) % bgColors.length];
    }
    
    return bgColors[indexOrCartoonNumber % bgColors.length];
  }

  // Map to store consistent color indices for cartoon numbers
  private rollColorMap: Map<string, number> = new Map();
  private nextColorIndex = 0;

  /**
   * Get consistent color index for a cartoon number
   */
  getRollColorIndex(cartoonNumber: string): number {
    if (!this.rollColorMap.has(cartoonNumber)) {
      this.rollColorMap.set(cartoonNumber, this.nextColorIndex);
      this.nextColorIndex++;
    }
    return this.rollColorMap.get(cartoonNumber)!;
  }

  /**
   * Get current roll index for color coding
   */
  getCurrentRollIndex(entry: RegisterEntry): number {
    const currentRoll = this.getCurrentSelectedRoll(entry);
    if (!currentRoll) return 0;
    
    // Extract cartoon number from rangeId if needed
    const cartoonNumber = currentRoll.includes('_RANGE_') 
      ? currentRoll.split('_RANGE_')[0] 
      : currentRoll;
    
    return this.getRollColorIndex(cartoonNumber);
  }

  /**
   * Check if the current roll is locked (read-only mode)
   */
  isCurrentRollLocked(entry: RegisterEntry): boolean {
    return entry.currentRollSelection?.isLocked || false;
  }

  /**
   * Calculate ALL leftover ranges for the current roll
   * This shows what serial numbers are left after usage and damage
   * Returns an array of ranges to handle gaps
   * CRITICAL: Also considers usage history from leftover reuses
   */
  getLeftoverRanges(entry: RegisterEntry, rollInput: RollInput): Array<{ fromSerial: string; toSerial: string; quantity: number }> {
    if (!rollInput || rollInput.leftOver <= 0) {
      return [];
    }

    try {
      // Get the allocated range for this roll
      const allocatedFromSerial = rollInput.fromSerial;
      const allocatedToSerial = rollInput.toSerial;

      if (!allocatedFromSerial || !allocatedToSerial) {
        console.warn('No allocated range found for roll');
        return [];
      }

      // Extract prefix and numeric parts
      const fromMatch = allocatedFromSerial.match(/^([A-Z]*)(\d+)$/);
      const toMatch = allocatedToSerial.match(/^([A-Z]*)(\d+)$/);

      if (!fromMatch || !toMatch) {
        console.warn('Invalid serial format');
        return [];
      }

      const prefix = fromMatch[1];
      const allocatedFrom = parseInt(fromMatch[2], 10);
      const allocatedTo = parseInt(toMatch[2], 10);

      // Create a Set of all used serial numbers
      const usedSerials = new Set<number>();

      // Add issued serials to used set (from current roll)
      if (rollInput.issuedRanges && Array.isArray(rollInput.issuedRanges)) {
        rollInput.issuedRanges.forEach((range: RollRange) => {
          if (range.fromSerial && range.toSerial) {
            const fromMatch = range.fromSerial.match(/^([A-Z]*)(\d+)$/);
            const toMatch = range.toSerial.match(/^([A-Z]*)(\d+)$/);
            if (fromMatch && toMatch) {
              const from = parseInt(fromMatch[2], 10);
              const to = parseInt(toMatch[2], 10);
              for (let i = from; i <= to; i++) {
                usedSerials.add(i);
              }
            }
          }
        });
      }

      // Add wastage serials to used set (from current roll)
      if (rollInput.wastageRanges && Array.isArray(rollInput.wastageRanges)) {
        rollInput.wastageRanges.forEach((range: RollRange) => {
          if (range.fromSerial && range.toSerial) {
            const fromMatch = range.fromSerial.match(/^([A-Z]*)(\d+)$/);
            const toMatch = range.toSerial.match(/^([A-Z]*)(\d+)$/);
            if (fromMatch && toMatch) {
              const from = parseInt(fromMatch[2], 10);
              const to = parseInt(toMatch[2], 10);
              for (let i = from; i <= to; i++) {
                usedSerials.add(i);
              }
            }
          }
        });
      }

      // CRITICAL: Also add serials used in leftover reuses (from usage history)
      if (rollInput.leftoverUsageHistory && rollInput.leftoverUsageHistory.length > 0) {
        console.log('📝 Processing leftover usage history to exclude used serials');
        
        rollInput.leftoverUsageHistory.forEach((history: LeftoverUsageHistory) => {
          // Add used serials from history
          if (history.usedRange) {
            const rangeMatch = history.usedRange.match(/^([A-Z]*)(\d+)\s*-\s*([A-Z]*)(\d+)$/);
            if (rangeMatch) {
              const from = parseInt(rangeMatch[2], 10);
              const to = parseInt(rangeMatch[4], 10);
              for (let i = from; i <= to; i++) {
                usedSerials.add(i);
              }
              console.log(`  ✓ Excluded used range: ${history.usedRange}`);
            }
          }
          
          // Add damaged serials from history
          if (history.damagedRange) {
            const rangeMatch = history.damagedRange.match(/^([A-Z]*)(\d+)\s*-\s*([A-Z]*)(\d+)$/);
            if (rangeMatch) {
              const from = parseInt(rangeMatch[2], 10);
              const to = parseInt(rangeMatch[4], 10);
              for (let i = from; i <= to; i++) {
                usedSerials.add(i);
              }
              console.log(`  ✓ Excluded damaged range: ${history.damagedRange}`);
            }
          }
        });
      }

      // Find all leftover ranges (gaps and final range)
      const leftoverRanges: Array<{ fromSerial: string; toSerial: string; quantity: number }> = [];
      let rangeStart: number | null = null;

      for (let i = allocatedFrom; i <= allocatedTo; i++) {
        if (!usedSerials.has(i)) {
          // This serial is available (leftover)
          if (rangeStart === null) {
            rangeStart = i; // Start a new range
          }
        } else {
          // This serial is used
          if (rangeStart !== null) {
            // End the current range
            const fromSerial = `${prefix}${String(rangeStart).padStart(fromMatch[2].length, '0')}`;
            const toSerial = `${prefix}${String(i - 1).padStart(toMatch[2].length, '0')}`;
            const quantity = (i - 1) - rangeStart + 1;
            leftoverRanges.push({ fromSerial, toSerial, quantity });
            rangeStart = null;
          }
        }
      }

      // Handle the final range if it extends to the end
      if (rangeStart !== null) {
        const fromSerial = `${prefix}${String(rangeStart).padStart(fromMatch[2].length, '0')}`;
        const toSerial = `${prefix}${String(allocatedTo).padStart(toMatch[2].length, '0')}`;
        const quantity = allocatedTo - rangeStart + 1;
        leftoverRanges.push({ fromSerial, toSerial, quantity });
      }

      console.log('✅ Calculated leftover ranges (after excluding usage history):', leftoverRanges);
      return leftoverRanges;
    } catch (error) {
      console.error('Error calculating leftover ranges:', error);
      return [];
    }
  }

  /**
   * Use a leftover range for a new brand
   * This creates a new roll entry with the leftover range as the allocated range
   * The leftover range is NOT added to the dropdown - it's only shown in the Usage section
   */
  useLeftoverRange(entry: RegisterEntry, currentRollInput: RollInput, leftoverRange: { fromSerial: string; toSerial: string; quantity: number }): void {
    console.log('🔄 Using leftover range:', leftoverRange);
    
    // CRITICAL: Check if this range has already been used
    // This can happen if the user clicks "Use" on a range that's already in progress
    const lockedRolls = entry.lockedRolls || [];
    const rangeAlreadyUsed = lockedRolls.some((lr: RollInput) => {
      // Check if this is a leftover reuse of the same parent roll
      if (lr.parentRollId === (currentRollInput.rangeId || currentRollInput.cartoonNumber)) {
        // Check if the range overlaps
        return lr.fromSerial === leftoverRange.fromSerial && lr.toSerial === leftoverRange.toSerial;
      }
      return false;
    });
    
    if (rangeAlreadyUsed) {
      alert('This leftover range has already been used.\n\nPlease select a different range or refresh the page to see updated available ranges.');
      return;
    }
    
    // Check if there's a current roll that needs to be locked first
    if (entry.currentRollSelection && !this.isCurrentRollLocked(entry)) {
      // Check if the current roll can be locked
      if (!this.canLockRoll(entry)) {
        alert('Please complete the current roll entry before using leftover ranges.\n\nMake sure:\n- Brand details and bottle size are filled\n- At least one range (issued or wastage) is entered\n- All ranges are valid');
        return;
      }
      
      // Lock the current roll
      this.lockRollForEntry(entry);
    }
    
    // Generate a unique range ID for this leftover range
    // Use the original cartoon number + a unique suffix
    const originalCartoonNumber = currentRollInput.cartoonNumber;
    
    // Count how many times this cartoon number has been used (including the original)
    const usageCount = lockedRolls.filter(r => r.cartoonNumber.startsWith(originalCartoonNumber)).length + 1;
    const newRangeId = `${originalCartoonNumber}_LEFTOVER_${usageCount}`;
    const displayName = `${originalCartoonNumber} - Leftover ${usageCount} (${leftoverRange.fromSerial}-${leftoverRange.toSerial})`;
    
    console.log('📦 Creating new roll entry for leftover range:', {
      rangeId: newRangeId,
      displayName: displayName,
      range: leftoverRange
    });
    
    // Create a new roll input for this leftover range
    const newRollInput: RollInput = {
      cartoonNumber: originalCartoonNumber,
      rangeId: newRangeId,
      displayName: displayName,
      rangeIndex: usageCount,
      availableCount: leftoverRange.quantity,
      serialRange: `${leftoverRange.fromSerial} - ${leftoverRange.toSerial}`,
      fromSerial: leftoverRange.fromSerial,
      toSerial: leftoverRange.toSerial,
      issuedRanges: [{ fromSerial: '', toSerial: '', quantity: 0 }],
      wastageRanges: [{ fromSerial: '', toSerial: '', quantity: 0 }],
      issuedQty: 0,
      wastageQty: 0,
      leftOver: leftoverRange.quantity,
      damageReason: '',
      brandDetails: '', // User will enter new brand details
      bottleSize: '', // User will enter new bottle size
      isLeftoverReuse: true, // Mark as leftover reuse
      parentRollId: currentRollInput.rangeId || currentRollInput.cartoonNumber // Store parent roll ID for history tracking
    };
    
    // Set this as the current roll selection
    // Note: The dropdown will still show the original roll, but the Usage section will show this leftover range
    entry.currentRollSelection = {
      selectedRoll: newRangeId,
      rollInput: newRollInput,
      isLocked: false
    };
    
    // Update the rolls view
    this.updateRollsView(entry);
    this.cdr.detectChanges();
    
    // Scroll to the top to show the new roll input
    setTimeout(() => {
      const rollSelectionPanel = document.querySelector('.roll-selection-panel');
      if (rollSelectionPanel) {
        rollSelectionPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    
    alert(`✅ Leftover range ready for use!\n\nRange: ${leftoverRange.fromSerial} - ${leftoverRange.toSerial}\nQuantity: ${leftoverRange.quantity} units\n\nPlease enter:\n- Brand details\n- Bottle size\n- Usage and/or wastage details\n\nThen lock this entry to continue.`);
  }

  /**
   * Check if a roll has leftover usage history
   */
  hasLeftoverUsageHistory(rollInput: RollInput): boolean {
    return !!(rollInput.leftoverUsageHistory && rollInput.leftoverUsageHistory.length > 0);
  }

  /**
   * Get leftover usage history for a roll
   */
  getLeftoverUsageHistory(rollInput: RollInput): LeftoverUsageHistory[] {
    return rollInput.leftoverUsageHistory || [];
  }

  /**
   * Record leftover usage history when a leftover range is locked
   * This updates the parent roll's usage history to show what was used from the leftover
   */
  recordLeftoverUsageHistory(entry: RegisterEntry, leftoverRollInput: RollInput): void {
    console.log('📝 Recording leftover usage history for:', leftoverRollInput.rangeId);
    
    // Find the parent roll in locked rolls
    const lockedRolls = entry.lockedRolls || [];
    const parentRollId = leftoverRollInput.parentRollId;
    const parentRoll = lockedRolls.find((lr: RollInput) => 
      (lr.rangeId || lr.cartoonNumber) === parentRollId
    );
    
    if (!parentRoll) {
      console.warn('⚠️ Parent roll not found:', parentRollId);
      return;
    }
    
    // Calculate what was used from the leftover range
    const originalRange = leftoverRollInput.serialRange;
    
    // Get used range (issued)
    let usedRange = '';
    let usedQty = 0;
    if (leftoverRollInput.issuedRanges && leftoverRollInput.issuedRanges.length > 0) {
      const firstIssued = leftoverRollInput.issuedRanges[0];
      const lastIssued = leftoverRollInput.issuedRanges[leftoverRollInput.issuedRanges.length - 1];
      if (firstIssued.fromSerial && lastIssued.toSerial) {
        usedRange = `${firstIssued.fromSerial} - ${lastIssued.toSerial}`;
        usedQty = leftoverRollInput.issuedQty;
      }
    }
    
    // Get damaged range (wastage)
    let damagedRange = '';
    let damagedQty = 0;
    if (leftoverRollInput.wastageRanges && leftoverRollInput.wastageRanges.length > 0) {
      const firstWastage = leftoverRollInput.wastageRanges[0];
      const lastWastage = leftoverRollInput.wastageRanges[leftoverRollInput.wastageRanges.length - 1];
      if (firstWastage.fromSerial && lastWastage.toSerial) {
        damagedRange = `${firstWastage.fromSerial} - ${lastWastage.toSerial}`;
        damagedQty = leftoverRollInput.wastageQty;
      }
    }
    
    // Calculate remaining range
    let remainingRange = '';
    let remainingQty = leftoverRollInput.leftOver;
    if (remainingQty > 0) {
      const leftoverRanges = this.getLeftoverRanges(entry, leftoverRollInput);
      if (leftoverRanges && leftoverRanges.length > 0) {
        const rangesStr = leftoverRanges.map(r => `${r.fromSerial}-${r.toSerial}`).join(', ');
        remainingRange = rangesStr;
      }
    }
    
    // Create usage history entry
    const brandNameStr = typeof leftoverRollInput.brandDetails === 'string' 
      ? leftoverRollInput.brandDetails 
      : (leftoverRollInput.brandDetails?.brandName || 'Unknown Brand');

    const usageHistory: LeftoverUsageHistory = {
      brandDetails: brandNameStr,
      bottleSize: leftoverRollInput.bottleSize,
      originalRange: originalRange,
      usedRange: usedRange,
      usedQty: usedQty,
      damagedRange: damagedRange || undefined,
      damagedQty: damagedQty || undefined,
      remainingRange: remainingRange || undefined,
      remainingQty: remainingQty || undefined,
      timestamp: new Date().toISOString()
    };
    
    // Add to parent roll's usage history
    if (!parentRoll.leftoverUsageHistory) {
      parentRoll.leftoverUsageHistory = [];
    }
    parentRoll.leftoverUsageHistory.push(usageHistory);
    
    console.log('✅ Leftover usage history recorded:', usageHistory);
  }

  /**
   * Check if entry has locked rolls
   */
  hasLockedRolls(entry: RegisterEntry): boolean {
    return (entry.lockedRolls && entry.lockedRolls.length > 0) || false;
  }

  /**
   * Get subtotal for a group of entries
   */
  getGroupSubtotal(entries: any[]): number {
    return entries.reduce((sum, e) => sum + (e.quantity || 0), 0);
  }

  /**
   * Group issued entries by roll for display
   */
  groupIssuedEntriesByRoll(entry: RegisterEntry): Array<{ rollIndex: number; rollName: string; entries: any[] }> {
    const groups: Array<{ rollIndex: number; rollName: string; entries: any[] }> = [];
    const lockedRolls = this.getLockedRollsForEntry(entry);
    
    lockedRolls.forEach((roll: any) => {
      const rollIndex = this.getRollColorIndex(roll.cartoonNumber);
      const entries = (roll.issuedRanges || []).map((range: any) => ({
        fromSerial: range.fromSerial,
        toSerial: range.toSerial,
        quantity: range.quantity
      }));
      
      if (entries.length > 0) {
        groups.push({
          rollIndex,
          rollName: roll.displayName || roll.cartoonNumber,
          entries
        });
      }
    });
    
    return groups;
  }

  /**
   * Group wastage entries by roll for display
   */
  groupWastageEntriesByRoll(entry: RegisterEntry): Array<{ rollIndex: number; rollName: string; entries: any[] }> {
    const groups: Array<{ rollIndex: number; rollName: string; entries: any[] }> = [];
    const lockedRolls = this.getLockedRollsForEntry(entry);
    
    lockedRolls.forEach((roll: any) => {
      const rollIndex = this.getRollColorIndex(roll.cartoonNumber);
      const entries = (roll.wastageRanges || []).map((range: any) => ({
        fromSerial: range.fromSerial,
        toSerial: range.toSerial,
        quantity: range.quantity
      }));
      
      if (entries.length > 0) {
        groups.push({
          rollIndex,
          rollName: roll.displayName || roll.cartoonNumber,
          entries
        });
      }
    });
    
    return groups;
  }





  /**
   * Get currently selected roll
   */
  getCurrentSelectedRoll(entry: RegisterEntry): string | null {
     return entry.currentRollSelection?.selectedRoll || null;
  }

  /**
   * Get current roll input data
   */
  getCurrentRollInput(entry: RegisterEntry): RollInput | null {
     return entry.currentRollSelection?.rollInput || null;
  }
  


  /**
   * Get locked rolls for an entry
   */
  getLockedRollsForEntry(entry: RegisterEntry): any[] {
    return entry.lockedRolls || [];
  }

  // Get allocated ranges for a specific roll from entry's allocation data
  // IMPORTANT: This should return ONLY the specific range that was selected, not all ranges for the roll
  getAllocatedRangesForRoll(entry: RegisterEntry, cartoonNumberOrRangeId: string): Array<{ fromSerial: string; toSerial: string; quantity: number }> {
    console.log('🔍 Getting allocated ranges for:', cartoonNumberOrRangeId);
    
    // Check if this is a rangeId (e.g., "test1_RANGE_1") - if so, return ONLY that specific range
    if (cartoonNumberOrRangeId.includes('_RANGE_')) {
      console.log('📌 This is a specific range selection, returning only that range');
      
      // Get the current roll input which has the specific range data
      const rollInput = this.getCurrentRollInput(entry);
      if (rollInput && rollInput.rangeId === cartoonNumberOrRangeId) {
        // CRITICAL FIX: Check multiple sources for the allocated range
        // 1. Try fromSerial/toSerial first
        if (rollInput.fromSerial && rollInput.toSerial) {
          return [{
            fromSerial: rollInput.fromSerial,
            toSerial: rollInput.toSerial,
            quantity: rollInput.availableCount
          }];
        }
        
        // 2. Try parsing serialRange
        if (rollInput.serialRange) {
          const parts = rollInput.serialRange.split('-').map((s: string) => s.trim());
          if (parts.length === 2) {
            return [{
              fromSerial: parts[0],
              toSerial: parts[1],
              quantity: rollInput.availableCount
            }];
          }
        }
      }
      
      // If not in current roll input, check locked rolls
      const lockedRolls = this.getLockedRollsForEntry(entry);
      const lockedRoll = lockedRolls.find((r: any) => r.rangeId === cartoonNumberOrRangeId);
      if (lockedRoll) {
        // Check multiple sources
        if (lockedRoll.fromSerial && lockedRoll.toSerial) {
          return [{
            fromSerial: lockedRoll.fromSerial,
            toSerial: lockedRoll.toSerial,
            quantity: lockedRoll.availableCount
          }];
        }
        
        if (lockedRoll.serialRange) {
          const parts = lockedRoll.serialRange.split('-').map((s: string) => s.trim());
          if (parts.length === 2) {
            return [{
              fromSerial: parts[0],
              toSerial: parts[1],
              quantity: lockedRoll.availableCount
            }];
          }
        }
      }
    }
    
    // CRITICAL FIX: Also check current roll input even if it doesn't have _RANGE_ in the ID
    const rollInput = this.getCurrentRollInput(entry);
    if (rollInput && (rollInput.cartoonNumber === cartoonNumberOrRangeId || rollInput.rangeId === cartoonNumberOrRangeId)) {
      console.log('📦 Found current roll input:', rollInput);
      
      // Try fromSerial/toSerial
      if (rollInput.fromSerial && rollInput.toSerial) {
        console.log('✅ Using fromSerial/toSerial from rollInput');
        return [{
          fromSerial: rollInput.fromSerial,
          toSerial: rollInput.toSerial,
          quantity: rollInput.availableCount
        }];
      }
      
      // Try serialRange
      if (rollInput.serialRange) {
        console.log('✅ Parsing serialRange from rollInput:', rollInput.serialRange);
        const parts = rollInput.serialRange.split('-').map((s: string) => s.trim());
        if (parts.length === 2) {
          return [{
            fromSerial: parts[0],
            toSerial: parts[1],
            quantity: rollInput.availableCount
          }];
        }
      }
    }
    
    // For backward compatibility: if no rangeId, try to get from allocation data
    // But this should ideally not be used anymore since we want specific range selection
    const allocationData = this.getHologramAllocationForEntry(entry);
    
    if (allocationData && allocationData.allocatedCartoons && allocationData.allocatedCartoons.length > 0) {
      console.log('✅ Found allocation data:', allocationData);
      
      // Filter cartoons that match the cartoon number
      const matchingCartoons = allocationData.allocatedCartoons.filter((cartoon: any) => {
        return cartoon.cartoonNumber === cartoonNumberOrRangeId;
      });
      
      console.log('📦 Matching cartoons:', matchingCartoons);
      
      // Convert to range format
      const ranges = matchingCartoons.map((cartoon: any) => ({
        fromSerial: cartoon.fromSerial || '',
        toSerial: cartoon.toSerial || '',
        quantity: cartoon.quantity || 0
      }));
      
      console.log('✅ Allocated ranges:', ranges);
      return ranges;
    }
    
    // PRIORITY 2: Check if entry has allocatedRanges stored directly
    const allocatedRanges = (entry as any).allocatedRanges || [];
    
    if (allocatedRanges.length > 0) {
      console.log('📋 Using stored allocatedRanges:', allocatedRanges);
      
      // Filter ranges for this specific cartoon number
      const rollRanges = allocatedRanges.filter((range: any) => 
        range.cartoonNumber === cartoonNumberOrRangeId
      );
      
      return rollRanges.map((range: any) => ({
        fromSerial: range.fromSerial,
        toSerial: range.toSerial,
        quantity: range.quantity
      }));
    }
    
    console.log('⚠️ No allocated ranges found');
    return [];
  }

  // Get hologram allocation data for an entry
  getHologramAllocationForEntry(entry: RegisterEntry): any {
    try {
      const referenceNo = entry.referenceNo;
      
      console.log('🔍 Looking for allocation data for reference:', referenceNo);
      
      if (!referenceNo) {
        console.warn('⚠️ No reference number found in entry');
        return null;
      }
      
      // Try multiple localStorage keys where allocation data might be stored
      const possibleKeys = [
        'hologramAllocations',
        'hologramRequests', 
        'hologramApplications',
        'approvedHologramEntries'
      ];

      // PRORITY 1: Check entries own allocatedRanges (from Backend API)
      if (entry.allocatedRanges && entry.allocatedRanges.length > 0) {
        console.log('✅ Found direct allocatedRanges in entry:', entry.allocatedRanges);
        return {
          referenceNo: referenceNo,
          totalAllocated: entry.allocatedRanges.reduce((sum, r) => sum + r.quantity, 0),
          allocatedCartoons: entry.allocatedRanges.map(r => ({
             cartoonNumber: r.cartoonNumber,
             quantity: r.quantity,
             fromSerial: r.fromSerial,
             toSerial: r.toSerial,
             serialRange: `${r.fromSerial} - ${r.toSerial}`
          }))
        };
      }
      
      for (const key of possibleKeys) {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        console.log(`📦 Checking ${key}:`, data.length, 'items');
        
        // Find matching allocations
        const matchingAllocations = data.filter((a: any) => 
          a.referenceNo === referenceNo || 
          a.ourRefNo === referenceNo || 
          a.id === referenceNo || 
          a.refNumber === referenceNo
        );
        
        if (matchingAllocations.length > 0) {
          console.log('✅ Found allocations in', key, ':', matchingAllocations);
          
          // Check if the request has an 'allocations' array directly (from Officer approval)
          const requestWithAllocations = matchingAllocations.find((a: any) => 
            a.allocations && Array.isArray(a.allocations) && a.allocations.length > 0
          );
          
          if (requestWithAllocations) {
            console.log('✅ Found request with allocations array:', requestWithAllocations.allocations);
            const cartoons = requestWithAllocations.allocations.map((a: any) => ({
              cartoonNumber: a.cartoonNumber || '',
              quantity: a.quantity || 0,
              fromSerial: a.fromSerial || '',
              toSerial: a.toSerial || '',
              serialRange: `${a.fromSerial} - ${a.toSerial}`,
              remainingInCartoon: a.remainingInCartoon || 0
            }));
            
            const totalQty = cartoons.reduce((sum: number, c: any) => sum + c.quantity, 0);
            
            return {
              referenceNo: referenceNo,
              totalAllocated: totalQty,
              allocatedCartoons: cartoons
            };
          }
          
          // Otherwise, normalize the allocation data
          const allocation = matchingAllocations[0];
          let allocatedCartoons = allocation.allocatedCartoons || allocation.cartoons || allocation.cartoonsUsed || [];
          
          if (Array.isArray(allocatedCartoons) && allocatedCartoons.length > 0) {
            allocatedCartoons = allocatedCartoons.map((c: any) => {
              let fromSerial = c.fromSerial || c.serialFrom || '';
              let toSerial = c.toSerial || c.serialTo || '';
              
              // If serialRange exists but fromSerial/toSerial don't, try to parse it
              if ((!fromSerial || !toSerial) && c.serialRange) {
                const rangeMatch = c.serialRange.match(/(\d+)\s*-\s*(\d+)/);
                if (rangeMatch) {
                  fromSerial = rangeMatch[1].padStart(6, '0');
                  toSerial = rangeMatch[2].padStart(6, '0');
                }
              }
              
              return {
                ...c,
                cartoonNumber: c.cartoonNumber || c.number || c.id || '',
                quantity: c.quantity || c.allocatedQuantity || 0,
                fromSerial: fromSerial,
                toSerial: toSerial,
                serialRange: c.serialRange || `${fromSerial} - ${toSerial}`
              };
            });
          }
          
          return {
            referenceNo: referenceNo,
            totalAllocated: allocation.totalAllocated || allocation.requestedQuantity || 0,
            allocatedCartoons: allocatedCartoons
          };
        }
      }
      
      console.warn('❌ No allocation found for:', referenceNo);
      return null;
    } catch (error) {
      console.error('Error loading hologram allocation:', error);
      return null;
    }
  }

  // Get the serial range string for a roll
  getSerialRangeForRoll(entry: RegisterEntry, cartoonNumber: string): string {
    const ranges = this.getAllocatedRangesForRoll(entry, cartoonNumber);
    if (ranges.length === 0) return '-';
    
    // If multiple ranges, show first one with indicator
    if (ranges.length > 1) {
      return `${ranges[0].fromSerial} - ${ranges[0].toSerial} (+${ranges.length - 1} more)`;
    }
    
    return `${ranges[0].fromSerial} - ${ranges[0].toSerial}`;
  }



  /**
   * View usage details for a saved entry
   */
  viewEntryDetails(entry: RegisterEntry): void {
    console.log('📋 Viewing details for entry:', entry);
    this.selectedEntryForDetails = entry;
    this.selectedRollTabIndex = 0; // Reset to first tab
    this.cdr.detectChanges();
  }

  /**
   * Close the usage details modal
   */
  closeDetailsModal(): void {
    this.selectedEntryForDetails = null;
    this.selectedRollTabIndex = 0;
    this.cdr.detectChanges();
  }

  /**
   * Select a roll tab in the details modal
   */
  selectRollTab(index: number): void {
    this.selectedRollTabIndex = index;
    this.cdr.detectChanges();
  }
}
