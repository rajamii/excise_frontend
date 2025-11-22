import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface RollRange {
  fromSerial: string;
  toSerial: string;
  quantity: number;
  isValid?: boolean;
  errorMessage?: string;
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
}

interface RegisterEntry {
  id: string;
  referenceNo: string;
  rollRange: string;
  dates: {
    submission: string;
    usage: string;
  };
  brandDetails: string;
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

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadApprovedEntries();
    this.loadFilteredData();
    
    // Listen for storage changes to auto-refresh
    window.addEventListener('storage', (e) => {
      if (e.key === 'approvedHologramEntries') {
        console.log('✅ New approved entries detected, refreshing...');
        this.loadApprovedEntries();
        this.loadFilteredData();
        this.cdr.detectChanges();
      }
    });
  }

  loadApprovedEntries(): void {
    // Load entries from localStorage (saved by OIC after approval)
    // IMPORTANT: Load from 'approvedHologramEntries' which is where OIC saves approved requests
    const savedEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
    console.log('Loading entries from approvedHologramEntries:', savedEntries.length);
    
    this.entries = savedEntries.map((entry: any) => ({
      id: entry.id,
      referenceNo: entry.referenceNo || 'N/A',
      rollRange: entry.rollRange || '',
      dates: {
        submission: entry.submissionDate || entry.date,
        usage: entry.date
      },
      brandDetails: entry.brandDetails?.brandName || 'N/A',
      bottleSize: entry.bottleSize || '750ml',
      rollsAssigned: entry.rollsAssigned || [],
      hologramQty: entry.utilizedQuantity || entry.hologramQty || 0,
      hologramType: entry.hologramType || 'LOCAL',
      issuedFrom: entry.issuedFromSerial || '',
      issuedTo: entry.issuedToSerial || '',
      issuedQty: entry.issuedQuantity || 0,
      wastageFrom: entry.wastageFromSerial || '',
      wastageTo: entry.wastageToSerial || '',
      wastageQty: entry.wastageQuantity || 0,
      leftOver: entry.leftOverQuantity || entry.hologramQty || 0,
      total: entry.utilizedQuantity || entry.hologramQty || 0,
      damageReason: entry.damageReason || '',
      isFixed: entry.isFixed || false,
      cartoonNumber: entry.cartoonNumber,
      utilizedQuantity: entry.utilizedQuantity || entry.hologramQty || 0,
      originalHologramQty: entry.utilizedQuantity || entry.hologramQty || 0,
      currentRollSelection: entry.currentRollSelection,
      lockedRolls: entry.lockedRolls || []
    }));
  }

  loadFilteredData(): void {
    const monthNumber = this.getMonthNumber(this.selectedMonth);
    const datePrefix = `${this.selectedYear}-${monthNumber}`;
    
    this.filteredEntries = this.entries.filter(entry => {
      const dateMatch = this.selectedDate 
        ? entry.dates.usage === this.selectedDate
        : entry.dates.usage.startsWith(datePrefix);
      return dateMatch;
    });
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
    
    // PRIORITY 1: Try to get from hologram allocation data (source of truth)
    const allocationData = this.getHologramAllocationForEntry(entry);
    
    if (allocationData && allocationData.allocatedCartoons && allocationData.allocatedCartoons.length > 0) {
      console.log('✅ Using allocation data for roll names:', allocationData.allocatedCartoons);
      
      // CRITICAL FIX: Create SEPARATE dropdown entries for each range
      // Instead of grouping multiple ranges into one roll, each range gets its own entry
      const separateRangeEntries: any[] = [];
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
        
        // Create separate entry for this range
        separateRangeEntries.push({
          cartoonNumber: cartoonNumber, // Original cartoon number (for grouping if needed)
          rangeId: rangeId, // Unique ID for this specific range
          rangeIndex: rangeIndex, // Which range number (1, 2, 3, etc.)
          displayName: `${cartoonNumber} - ${serialRange}`, // Show range in dropdown
          allocatedQuantity: quantity,
          availableCount: quantity,
          serialRange: serialRange,
          fromSerial: fromSerial,
          toSerial: toSerial,
          isSingleRange: true, // Mark as single range entry
          originalCartoonNumber: cartoonNumber // Store original cartoon number for reference
        });
      });
      
      console.log('✅ Separate range entries (each range is independent):', separateRangeEntries);
      console.log('📊 Ranges per roll:', Array.from(rangeCountPerRoll.entries()));
      return separateRangeEntries;
    }
    
    // Fallback: Load from hologramOverviewRolls
    console.log('⚠️ No allocation data found, using fallback logic');
    const allOverviewRolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
    const hologramType = entry.hologramType;
    
    const availableRolls = allOverviewRolls.filter((r: any) => {
      return r.type === hologramType && r.availableCount > 0;
    });
    
    return availableRolls.map((r: any) => ({
      cartoonNumber: r.cartoonNumber,
      allocatedQuantity: r.availableCount,
      availableCount: r.availableCount,
      serialRange: r.serialRange || `${r.fromSerial} - ${r.toSerial}`,
      fromSerial: r.fromSerial,
      toSerial: r.toSerial,
      displayName: r.cartoonNumber
    }));
  }

  getCurrentSelectedRoll(entry: RegisterEntry): string | null {
    return entry.currentRollSelection?.selectedRoll || null;
  }

  getCurrentRollInput(entry: RegisterEntry): RollInput | null {
    return entry.currentRollSelection?.rollInput || null;
  }

  getLockedRollsForEntry(entry: RegisterEntry): RollInput[] {
    return entry.lockedRolls || [];
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
    if (lockedRolls.some((lr: any) => (lr.rangeId || lr.cartoonNumber) === rangeIdToCheck)) {
      alert('This range is already locked.');
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
        damageReason: ''
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
   */
  private getAllUsedRangesFromLockedRolls(entry: RegisterEntry): Array<{ fromSerial: string; toSerial: string; rollName: string; type: 'issued' | 'wastage' }> {
    const lockedRolls = this.getLockedRollsForEntry(entry);
    const usedRanges: Array<{ fromSerial: string; toSerial: string; rollName: string; type: 'issued' | 'wastage' }> = [];

    lockedRolls.forEach((roll) => {
      // Collect issued ranges from locked roll
      if (roll.issuedRanges && Array.isArray(roll.issuedRanges)) {
        roll.issuedRanges.forEach((range) => {
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
        roll.wastageRanges.forEach((range) => {
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

    // NEW: CROSS-ROLL VALIDATION - Check against locked rolls
    const lockedRanges = this.getAllUsedRangesFromLockedRolls(entry);
    
    if (lockedRanges.length > 0) {
      // Validate issued ranges against locked rolls
      const issuedCrossRollCheck = this.validateNoOverlapWithLockedRolls(
        rollInput.issuedRanges,
        lockedRanges
      );
      
      if (!issuedCrossRollCheck.isValid) {
        issuedCrossRollCheck.conflicts.forEach(conflict => {
          conflict.currentRange.isValid = false;
          conflict.currentRange.errorMessage = 
            `Range (${conflict.currentRange.fromSerial}-${conflict.currentRange.toSerial}) overlaps with ` +
            `${conflict.lockedRange.type} range (${conflict.lockedRange.fromSerial}-${conflict.lockedRange.toSerial}) ` +
            `from locked roll "${conflict.lockedRange.rollName}"`;
        });
      }

      // Validate wastage ranges against locked rolls
      const wastageCrossRollCheck = this.validateNoOverlapWithLockedRolls(
        rollInput.wastageRanges,
        lockedRanges
      );
      
      if (!wastageCrossRollCheck.isValid) {
        wastageCrossRollCheck.conflicts.forEach(conflict => {
          conflict.currentRange.isValid = false;
          conflict.currentRange.errorMessage = 
            `Range (${conflict.currentRange.fromSerial}-${conflict.currentRange.toSerial}) overlaps with ` +
            `${conflict.lockedRange.type} range (${conflict.lockedRange.fromSerial}-${conflict.lockedRange.toSerial}) ` +
            `from locked roll "${conflict.lockedRange.rollName}"`;
        });
      }
    }

    rollInput.leftOver = rollInput.availableCount - (rollInput.issuedQty + rollInput.wastageQty);

    this.updateEntryQuantitiesFromAllRolls(entry);
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

      // Must have at least one complete issued range with valid serials
      const hasValidIssuedRange = rollInput.issuedRanges.some((range) => {
        const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
        const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
        return hasFrom && hasTo && range.quantity > 0;
      });
      
      if (!hasValidIssuedRange) return false;

      // Check if all complete issued ranges are valid (within allocated range)
      const allIssuedRangesValid = rollInput.issuedRanges.every((range) => {
        const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
        const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
        // If range is incomplete, skip validation (already checked above)
        if (!hasFrom || !hasTo) return true;
        // If range is complete, check if it's valid
        return range.isValid !== false;
      });
      
      if (!allIssuedRangesValid) return false;
    } else {
      // No issued ranges at all
      return false;
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

      // Check if all complete wastage ranges are valid (within allocated range)
      const allWastageRangesValid = rollInput.wastageRanges.every((range) => {
        const hasFrom = !!range.fromSerial && range.fromSerial.trim() !== '';
        const hasTo = !!range.toSerial && range.toSerial.trim() !== '';
        // If range is incomplete, skip validation (already checked above)
        if (!hasFrom || !hasTo) return true;
        // If range is complete, check if it's valid
        return range.isValid !== false;
      });
      
      if (!allWastageRangesValid) return false;
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
      
      if (!rollInput.issuedRanges || !rollInput.issuedRanges.some((r) => {
        const hasFrom = !!r.fromSerial && r.fromSerial.trim() !== '';
        const hasTo = !!r.toSerial && r.toSerial.trim() !== '';
        return hasFrom && hasTo && r.quantity > 0;
      })) {
        errorMessage += 'Please enter at least one complete issued range (both FROM and TO).\n';
      }
      
      alert(errorMessage);
      return;
    }

    if (!entry.lockedRolls) {
      entry.lockedRolls = [];
    }

    entry.lockedRolls.push({ ...rollInput });
    entry.currentRollSelection = undefined;

    this.recalculateEntryFromLockedRolls(entry);
    this.cdr.detectChanges();

    alert(`Roll ${rollInput.cartoonNumber} locked successfully!`);
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
    let totalAvailable = 0;

    lockedRolls.forEach(roll => {
      totalIssued += roll.issuedQty || 0;
      totalWastage += roll.wastageQty || 0;
      totalLeftOver += roll.leftOver || 0;
      totalAvailable += roll.availableCount || 0;
    });

    entry.issuedQty = totalIssued;
    entry.wastageQty = totalWastage;
    entry.leftOver = totalLeftOver;
    entry.hologramQty = totalAvailable;
    entry.total = totalIssued + totalWastage + totalLeftOver;
  }

  // Check if all ranges are locked and entry can be saved
  canSaveEntry(entry: RegisterEntry): boolean {
    if (entry.isFixed) return false; // Already saved
    
    // Must have at least one locked roll
    const lockedRolls = entry.lockedRolls || [];
    if (lockedRolls.length === 0) return false;
    
    // Cannot have a current roll selection (all must be locked)
    if (entry.currentRollSelection) return false;
    
    // Check if all allocated ranges are locked
    const allocationData = this.getHologramAllocationForEntry(entry);
    if (allocationData && allocationData.allocatedCartoons) {
      const totalAllocatedRanges = allocationData.allocatedCartoons.length;
      const lockedRangesCount = lockedRolls.length;
      
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
    // Button is already disabled if canSaveEntry returns false
    // No need for alert - just return silently
    if (!this.canSaveEntry(entry)) {
      return;
    }

    // Mark as fixed (saved)
    entry.isFixed = true;
    
    // Update rollsAssigned array for display
    const lockedRolls = entry.lockedRolls || [];
    entry.rollsAssigned = lockedRolls.map(r => r.cartoonNumber);
    
    // Save to localStorage
    this.saveEntryToLocalStorage(entry);
    
    // Refresh display
    this.cdr.detectChanges();
    
    // Simple success message
    alert('✅ Entry saved successfully!');
  }

  // Save entry to localStorage
  private saveEntryToLocalStorage(entry: RegisterEntry): void {
    try {
      const savedEntries = JSON.parse(localStorage.getItem('oicDailyRegisterEntries') || '[]');
      
      // Check if entry already exists
      const existingIndex = savedEntries.findIndex((e: any) => e.id === entry.id);
      
      if (existingIndex !== -1) {
        savedEntries[existingIndex] = entry;
      } else {
        savedEntries.push(entry);
      }
      
      localStorage.setItem('oicDailyRegisterEntries', JSON.stringify(savedEntries));
      console.log('Entry saved to localStorage:', entry.id);
    } catch (error) {
      console.error('Error saving entry to localStorage:', error);
    }
  }

  updateEntryQuantitiesFromAllRolls(entry: RegisterEntry): void {
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
    
    lockedRolls.forEach((roll) => {
      const rollIndex = this.getRollColorIndex(roll.cartoonNumber);
      const entries = (roll.issuedRanges || []).map(range => ({
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
    
    lockedRolls.forEach((roll) => {
      const rollIndex = this.getRollColorIndex(roll.cartoonNumber);
      const entries = (roll.wastageRanges || []).map(range => ({
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

  // Calculate total: Issued + Wastage + Left Over
  getTotalCalculation(entry: RegisterEntry): number {
    return (entry.issuedQty || 0) + (entry.wastageQty || 0) + (entry.leftOver || 0);
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
        // Return ONLY the specific range that was selected
        return [{
          fromSerial: rollInput.fromSerial,
          toSerial: rollInput.toSerial,
          quantity: rollInput.availableCount
        }];
      }
      
      // If not in current roll input, check locked rolls
      const lockedRolls = this.getLockedRollsForEntry(entry);
      const lockedRoll = lockedRolls.find((r: any) => r.rangeId === cartoonNumberOrRangeId);
      if (lockedRoll) {
        return [{
          fromSerial: lockedRoll.fromSerial,
          toSerial: lockedRoll.toSerial,
          quantity: lockedRoll.availableCount
        }];
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

  // Test methods
  createTestApproval(): void {
    const testEntry = {
      id: `TEST_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      hologramType: this.selectedHologramType,
      
      // Store test allocations
      issuedEntries: [],
      wastageEntries: [],
      
      // Total quantities
      issuedQuantity: 0,
      utilizedQuantity: 500, // Test with 500 holograms
      wastageQuantity: 0,
      leftOverQuantity: 500,
      damageReason: '',
      isFixed: false,
      
      // Metadata
      referenceNo: `TEST/HRQ/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`,
      brandDetails: {
        brandName: 'Test Brand Whisky',
        alcoholPercent: '42.8%',
        sizeMl: 750,
        liquorType: 'Whisky'
      },
      bottleSize: '750ml',
      submissionDate: new Date().toISOString().split('T')[0],
      usageDate: new Date().toISOString().split('T')[0],
      approvalDate: new Date().toISOString().split('T')[0],
      officerName: 'Test Officer',
      autoGenerated: true,
      
      // Store allocated ranges for reference
      allocatedRanges: [
        {
          cartoonNumber: 'TEST_CTN001',
          fromSerial: 'HG001001',
          toSerial: 'HG001500',
          quantity: 500
        }
      ]
    };

    // Save to localStorage
    const existingEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
    existingEntries.push(testEntry);
    localStorage.setItem('approvedHologramEntries', JSON.stringify(existingEntries));

    console.log('Created test approval entry:', testEntry);
    
    // Reload entries
    this.loadApprovedEntries();
    this.loadFilteredData();
    this.cdr.detectChanges();

    alert(`✅ Test approval created successfully!\n\nReference: ${testEntry.referenceNo}\nType: ${testEntry.hologramType}\nQuantity: ${testEntry.utilizedQuantity}\n\nThe entry is now available in the Daily Register Entries.`);
  }

  clearTestData(): void {
    const confirmMessage = 
      `⚠️ WARNING: Clear All Test Data ⚠️\n\n` +
      `This will permanently delete:\n` +
      `• All approved hologram entries\n` +
      `• All daily register entries\n` +
      `• All test data\n\n` +
      `Current Data:\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• Total Entries: ${this.entries.length}\n` +
      `• Filtered Entries: ${this.filteredEntries.length}\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Are you sure you want to clear all test data?`;
    
    const confirmed = confirm(confirmMessage);
    
    if (!confirmed) {
      console.log('Clear test data cancelled');
      return;
    }
    
    // Double confirmation for safety
    const doubleConfirm = confirm(
      `⚠️ FINAL CONFIRMATION ⚠️\n\n` +
      `This is your last chance to cancel.\n\n` +
      `Click OK to permanently delete all test data.\n` +
      `Click Cancel to keep your data.`
    );
    
    if (!doubleConfirm) {
      console.log('Clear test data cancelled on second confirmation');
      return;
    }
    
    try {
      // Clear localStorage
      localStorage.removeItem('approvedHologramEntries');
      localStorage.removeItem('dailyRegisterEntries');
      
      // Clear component data
      this.entries = [];
      this.filteredEntries = [];
      
      // Refresh display
      this.loadFilteredData();
      this.cdr.detectChanges();
      
      console.log('All test data cleared successfully');
      
      alert(
        `✅ Test Data Cleared Successfully!\n\n` +
        `All test data has been permanently deleted:\n` +
        `• Approved hologram entries: Cleared\n` +
        `• Daily register entries: Cleared\n` +
        `• LocalStorage: Cleared\n\n` +
        `The system is now reset to a clean state.`
      );
    } catch (error) {
      console.error('Error clearing test data:', error);
      alert(
        `❌ Error Clearing Test Data\n\n` +
        `An error occurred while clearing test data.\n` +
        `Please check the console for details.`
      );
    }
  }
}
