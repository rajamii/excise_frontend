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

  saveEntry(entry: RegisterEntry): void {
    if (!entry.issuedFrom || !entry.issuedTo) {
      alert('Please enter Issued From and Issued To serials');
      return;
    }
    entry.isFixed = true;
    alert('Entry saved successfully!');
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



  onRollInputChange(entry: RegisterEntry): void {
    const rollInput = this.getCurrentRollInput(entry);
    if (!rollInput) return;

    rollInput.issuedQty = rollInput.issuedRanges.reduce((sum, range) => {
      range.quantity = this.calculateQuantityFromSerials(range.fromSerial, range.toSerial);
      return sum + range.quantity;
    }, 0);

    rollInput.wastageQty = rollInput.wastageRanges.reduce((sum, range) => {
      range.quantity = this.calculateQuantityFromSerials(range.fromSerial, range.toSerial);
      return sum + range.quantity;
    }, 0);

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

    const hasValidIssuedRange = rollInput.issuedRanges.some(r => 
      r.fromSerial && r.toSerial && r.quantity > 0
    );
    
    if (!hasValidIssuedRange) return false;
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
      alert('Cannot lock roll. Please ensure at least one issued range is complete and left over is not negative.');
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

  getRollColor(index: number): string {
    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'];
    return colors[index % colors.length];
  }

  getRollBackgroundColor(index: number): string {
    const bgColors = ['#e7f3ff', '#e7f5e7', '#fff8e1', '#ffe7e7', '#e0f7fa', '#f3e5f5', '#fff3e0', '#e0f2f1'];
    return bgColors[index % bgColors.length];
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
