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
  getAvailableRollsForEntry(entry: RegisterEntry): any[] {
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

  selectRollForEntry(entry: RegisterEntry, cartoonNumber: string): void {
    if (!cartoonNumber) return;

    const roll = this.getAvailableRollsForEntry(entry).find(r => r.cartoonNumber === cartoonNumber);
    if (!roll) return;

    const lockedRolls = this.getLockedRollsForEntry(entry);
    if (lockedRolls.some((lr: any) => lr.cartoonNumber === cartoonNumber)) {
      alert('This roll is already locked.');
      return;
    }

    entry.currentRollSelection = {
      selectedRoll: cartoonNumber,
      rollInput: {
        cartoonNumber: roll.cartoonNumber,
        displayName: roll.displayName,
        availableCount: roll.availableCount,
        serialRange: roll.serialRange,
        fromSerial: roll.fromSerial,
        toSerial: roll.toSerial,
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
}
