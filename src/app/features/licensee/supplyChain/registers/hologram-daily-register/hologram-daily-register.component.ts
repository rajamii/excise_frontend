import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HologramDataService, HologramDailyEntry } from '../../../supplyChain/services/hologram-data.service';



@Component({
  selector: 'app-hologram-daily-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram-daily-register.component.html',
  styleUrls: ['./hologram-daily-register.component.scss']
})
export class HologramDailyRegisterComponent implements OnInit {
  Math = Math;
  selectedMonth = 'jul';
  selectedYear = '2025';
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';

  // Helper method to get count of editable entries
  getEditableEntriesCount(): number {
    return this.filteredEntries.filter(e => !e.isFixed).length;
  }

  // Sample daily entries
  dailyEntries: HologramDailyEntry[] = [
    {
      id: '1',
      date: '2025-07-01',
      hologramType: 'LOCAL',
      issuedFromSerial: '275346495',
      issuedToSerial: '275520000',
      issuedQuantity: 0,
      utilizedQuantity: 173506,
      wastageFromSerial: '275455115',
      wastageToSerial: '275459428',
      wastageQuantity: 0,
      leftOverQuantity: 0,
      damageReason: 'Machine malfunction during printing',
      isFixed: true
    },
    {
      id: '2',
      date: '2025-07-02',
      hologramType: 'LOCAL',
      issuedFromSerial: '275520001',
      issuedToSerial: '275600000',
      issuedQuantity: 0,
      utilizedQuantity: 80000,
      wastageFromSerial: '',
      wastageToSerial: '',
      wastageQuantity: 0,
      leftOverQuantity: 0,
      damageReason: '',
      isFixed: false
    }
  ];

  filteredEntries: HologramDailyEntry[] = [];
  previousMonthBalance = 249899;

  // Pagination
  pageSize = 10;
  currentPage = 1;

  constructor(
    private router: Router, 
    private cdr: ChangeDetectorRef,
    private hologramDataService: HologramDataService
  ) {
    console.log('HologramDailyRegisterComponent constructor called');
    
    // Load existing data from service first
    const existingEntries = this.hologramDataService.getDailyEntries();
    
    if (existingEntries.length > 0) {
      // Use existing service data
      this.dailyEntries = existingEntries;
      console.log('Loaded existing entries from service:', this.dailyEntries.length);
    } else {
      // Initialize service with sample data if no data exists
      console.log('No existing data, initializing with sample data');
      this.initializeSampleData();
      this.hologramDataService.updateDailyEntries(this.dailyEntries);
    }
    
    // Calculate quantities for existing entries
    this.dailyEntries.forEach(entry => {
      entry.issuedQuantity = this.calculateQuantityFromSerials(entry.issuedFromSerial, entry.issuedToSerial);
      entry.wastageQuantity = this.calculateQuantityFromSerials(entry.wastageFromSerial, entry.wastageToSerial);
      entry.leftOverQuantity = entry.issuedQuantity - entry.utilizedQuantity - entry.wastageQuantity;
    });
    
    this.loadFilteredData();
    
    console.log('Constructor completed. Daily entries:', this.dailyEntries.length);
    console.log('Filtered entries:', this.filteredEntries.length);
  }

  ngOnInit(): void {
    // Ensure data is properly loaded and service is updated
    this.hologramDataService.updateDailyEntries(this.dailyEntries);
    console.log('ngOnInit: Service updated with current entries');
  }

  loadFilteredData(): void {
    const monthNumber = this.getMonthNumber(this.selectedMonth);
    const datePrefix = `${this.selectedYear}-${monthNumber}`;
    
    console.log('Filtering data with:', {
      selectedType: this.selectedHologramType,
      datePrefix: datePrefix,
      totalEntries: this.dailyEntries.length
    });
    
    this.filteredEntries = this.dailyEntries.filter(entry => {
      const typeMatch = entry.hologramType === this.selectedHologramType;
      const dateMatch = entry.date.startsWith(datePrefix);
      
      console.log(`Entry ${entry.id}: type=${entry.hologramType} (${typeMatch}), date=${entry.date} (${dateMatch}), isFixed=${entry.isFixed}`);
      
      return typeMatch && dateMatch;
    });
    
    console.log('Filtered result:', this.filteredEntries.length, 'entries');
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

  onHologramTypeChange(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): void {
    this.selectedHologramType = type;
    this.loadFilteredData();
    this.currentPage = 1;
  }

  getCurrentHologramTypeDisplay(): string {
    const monthNames: { [key: string]: string } = {
      'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
      'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
      'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
    };
    return `${monthNames[this.selectedMonth]} ${this.selectedYear} - ${this.selectedHologramType}`;
  }

  private initializeSampleData(): void {
    this.dailyEntries = [
      {
        id: '1',
        date: '2025-07-01',
        hologramType: 'LOCAL',
        issuedFromSerial: '275346495',
        issuedToSerial: '275520000',
        issuedQuantity: 0,
        utilizedQuantity: 173506,
        wastageFromSerial: '275455115',
        wastageToSerial: '275459428',
        wastageQuantity: 0,
        leftOverQuantity: 0,
        damageReason: 'Machine malfunction during printing',
        isFixed: true
      },
      {
        id: '2',
        date: '2025-07-02',
        hologramType: 'LOCAL',
        issuedFromSerial: '275520001',
        issuedToSerial: '275600000',
        issuedQuantity: 0,
        utilizedQuantity: 80000,
        wastageFromSerial: '',
        wastageToSerial: '',
        wastageQuantity: 0,
        leftOverQuantity: 0,
        damageReason: '',
        isFixed: false
      }
    ];
    this.hologramDataService.updateDailyEntries(this.dailyEntries);
  }

  addNewEntry(): void {
    console.log('=== ADD NEW ENTRY DEBUG ===');
    console.log('Before adding:');
    console.log('- Total entries:', this.dailyEntries.length);
    console.log('- Filtered entries:', this.filteredEntries.length);
    console.log('- Selected type:', this.selectedHologramType);
    console.log('- Selected month/year:', this.selectedMonth, this.selectedYear);
    
    const newId = Date.now().toString(); // Use timestamp for unique ID
    
    // Create date that matches the current selected month/year
    const monthNumber = this.getMonthNumber(this.selectedMonth);
    const currentDate = `${this.selectedYear}-${monthNumber}-01`; // Use first day of selected month
    
    const newEntry: HologramDailyEntry = {
      id: newId,
      date: currentDate,
      hologramType: this.selectedHologramType,
      issuedFromSerial: '',
      issuedToSerial: '',
      issuedQuantity: 0,
      utilizedQuantity: 0,
      wastageFromSerial: '',
      wastageToSerial: '',
      wastageQuantity: 0,
      leftOverQuantity: 0,
      damageReason: '',
      isFixed: false // This makes the row editable
    };
    
    console.log('New entry created:', newEntry);
    
    // Add to the main array
    this.dailyEntries.push(newEntry);
    
    // Update the service immediately
    this.hologramDataService.updateDailyEntries(this.dailyEntries);
    
    console.log('After adding to dailyEntries:');
    console.log('- Total entries:', this.dailyEntries.length);
    console.log('- Last entry:', this.dailyEntries[this.dailyEntries.length - 1]);
    
    // Refresh filtered data to show the new entry
    this.loadFilteredData();
    
    console.log('After filtering:');
    console.log('- Filtered entries:', this.filteredEntries.length);
    console.log('- Editable entries:', this.getEditableEntriesCount());
    
    // Force change detection to update the view and summary
    this.cdr.detectChanges();
    
    console.log('=== END DEBUG ===');
  }

  onEntryDataChange(entry: HologramDailyEntry): void {
    entry.issuedQuantity = this.calculateQuantityFromSerials(entry.issuedFromSerial, entry.issuedToSerial);
    entry.wastageQuantity = this.calculateQuantityFromSerials(entry.wastageFromSerial, entry.wastageToSerial);
    entry.leftOverQuantity = entry.issuedQuantity - entry.utilizedQuantity - entry.wastageQuantity;
    
    // Update the service with the changed data immediately
    this.hologramDataService.updateDailyEntry(entry);
    console.log('Daily register updated entry in service:', entry.id, entry);
    
    // Force change detection to update summary
    this.cdr.detectChanges();
  }

  onSerialChange(entry: HologramDailyEntry): void {
    this.onEntryDataChange(entry);
    this.cdr.detectChanges();
  }

  private calculateQuantityFromSerials(fromSerial: string, toSerial: string): number {
    if (!fromSerial || !toSerial) {
      return 0;
    }

    fromSerial = fromSerial.trim();
    toSerial = toSerial.trim();

    const fromNum = this.extractNumericPart(fromSerial);
    const toNum = this.extractNumericPart(toSerial);

    if (fromNum === null || toNum === null || toNum < fromNum) {
      return 0;
    }

    return (toNum - fromNum) + 1;
  }

  private extractNumericPart(serial: string): number | null {
    if (!serial) return null;
    
    if (/^\d+$/.test(serial)) {
      return parseInt(serial, 10);
    }
    
    const trailingNumbers = serial.match(/\d+$/);
    if (trailingNumbers) {
      return parseInt(trailingNumbers[0], 10);
    }
    
    const allNumbers = serial.match(/\d+/g);
    if (allNumbers && allNumbers.length > 0) {
      const longestNum = allNumbers.reduce((a, b) => a.length > b.length ? a : b);
      return parseInt(longestNum, 10);
    }
    
    return null;
  }

  saveEntry(entry: HologramDailyEntry): void {
    // Validate required fields
    if (!entry.date) {
      alert('Please enter a date before saving');
      return;
    }
    
    if (!entry.issuedFromSerial || !entry.issuedToSerial) {
      alert('Please enter both From Serial and To Serial numbers');
      return;
    }
    
    if (entry.utilizedQuantity <= 0) {
      alert('Please enter a valid utilized quantity');
      return;
    }
    
    // Calculate final quantities
    this.onEntryDataChange(entry);
    
    // Mark as fixed (saved)
    entry.isFixed = true;
    
    // Update the service with all entries
    this.hologramDataService.updateDailyEntries(this.dailyEntries);
    console.log('Daily register updated all entries in service:', this.dailyEntries.length, 'entries');
    
    // Refresh the display and summary
    this.loadFilteredData();
    
    // Force change detection to update summary
    this.cdr.detectChanges();
    
    // Show success message
    alert('Entry saved successfully! Monthly statement will be automatically updated.');
    
    console.log('Entry saved successfully:', entry);
  }

  deleteEntry(entry: HologramDailyEntry): void {
    if (entry.isFixed) {
      alert('Cannot delete saved entries');
      return;
    }
    
    // For unsaved entries, just remove without confirmation
    this.dailyEntries = this.dailyEntries.filter(e => e.id !== entry.id);
    this.loadFilteredData();
    this.cdr.detectChanges();
    
    console.log('Unsaved entry cancelled/deleted');
  }

  openMonthlyStatement(): void {
    // Navigate to monthly report with current filters
    this.router.navigate(['/dev-hologram-monthly-report'], {
      queryParams: {
        month: this.selectedMonth,
        year: this.selectedYear,
        type: this.selectedHologramType
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  // Calculate totals for monthly register auto-calculation
  calculateMonthlyTotals(): {
    totalIssued: number;
    totalUtilized: number;
    totalWastage: number;
    totalLeftOver: number;
    utilizationFromSerial: string;
    utilizationToSerial: string;
    wastageFromSerial: string;
    wastageToSerial: string;
  } {
    // Always recalculate from current filtered entries
    const monthEntries = this.filteredEntries.filter(entry => entry.isFixed);
    
    let totalIssued = 0;
    let totalUtilized = 0;
    let totalWastage = 0;
    let totalLeftOver = 0;
    
    let utilizationFromSerial = '';
    let utilizationToSerial = '';
    let wastageFromSerial = '';
    let wastageToSerial = '';

    if (monthEntries.length > 0) {
      // Sort entries by date to get correct first and last serials
      const sortedEntries = monthEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Find first and last utilization serials
      const utilizationEntries = sortedEntries.filter(e => e.utilizedQuantity > 0 && e.issuedFromSerial && e.issuedToSerial);
      if (utilizationEntries.length > 0) {
        utilizationFromSerial = utilizationEntries[0].issuedFromSerial;
        utilizationToSerial = utilizationEntries[utilizationEntries.length - 1].issuedToSerial;
      }

      // Find first and last wastage serials
      const wastageEntries = sortedEntries.filter(e => e.wastageQuantity > 0 && e.wastageFromSerial && e.wastageToSerial);
      if (wastageEntries.length > 0) {
        wastageFromSerial = wastageEntries[0].wastageFromSerial;
        wastageToSerial = wastageEntries[wastageEntries.length - 1].wastageToSerial;
      }

      // Calculate totals
      totalIssued = sortedEntries.reduce((sum, entry) => sum + entry.issuedQuantity, 0);
      totalUtilized = sortedEntries.reduce((sum, entry) => sum + entry.utilizedQuantity, 0);
      totalWastage = sortedEntries.reduce((sum, entry) => sum + entry.wastageQuantity, 0);
      totalLeftOver = sortedEntries.reduce((sum, entry) => sum + entry.leftOverQuantity, 0);
    }

    // Update the service with latest totals
    this.hologramDataService.updateDailyEntries(this.dailyEntries);

    return {
      totalIssued,
      totalUtilized,
      totalWastage,
      totalLeftOver,
      utilizationFromSerial,
      utilizationToSerial,
      wastageFromSerial,
      wastageToSerial
    };
  }

  // Force refresh summary
  refreshSummary(): void {
    this.loadFilteredData();
    this.cdr.detectChanges();
  }

  // Get current timestamp for display
  getCurrentTimestamp(): string {
    return new Date().toLocaleString();
  }

  // Check if there are any fixed entries for live data indicator
  hasFixedEntries(): boolean {
    return this.filteredEntries.filter(e => e.isFixed).length > 0;
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.ceil(this.filteredEntries.length / this.pageSize);
  }

  getPagedEntries(): HologramDailyEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEntries.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
    }
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }
}