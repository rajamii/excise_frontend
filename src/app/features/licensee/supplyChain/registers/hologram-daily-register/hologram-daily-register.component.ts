import { Component, ChangeDetectorRef } from '@angular/core';
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
export class HologramDailyRegisterComponent {
  Math = Math;
  selectedMonth = 'jul';
  selectedYear = '2025';
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';

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
    // Load data from service or initialize with sample data
    this.dailyEntries = this.hologramDataService.getDailyEntries();
    
    if (this.dailyEntries.length === 0) {
      // Initialize with sample data if no data exists
      this.initializeSampleData();
    }
    
    // Calculate quantities for existing entries
    this.dailyEntries.forEach(entry => {
      entry.issuedQuantity = this.calculateQuantityFromSerials(entry.issuedFromSerial, entry.issuedToSerial);
      entry.wastageQuantity = this.calculateQuantityFromSerials(entry.wastageFromSerial, entry.wastageToSerial);
      entry.leftOverQuantity = entry.issuedQuantity - entry.utilizedQuantity - entry.wastageQuantity;
    });
    
    this.loadFilteredData();
  }

  loadFilteredData(): void {
    this.filteredEntries = this.dailyEntries.filter(entry => 
      entry.hologramType === this.selectedHologramType &&
      entry.date.startsWith(`${this.selectedYear}-${this.getMonthNumber(this.selectedMonth)}`)
    );
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
    const newId = Date.now().toString(); // Use timestamp for unique ID
    const currentDate = new Date().toISOString().split('T')[0];
    
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
    
    // Add to the main array
    this.dailyEntries.push(newEntry);
    
    // Refresh filtered data to show the new entry
    this.loadFilteredData();
    
    // Update service (but don't save to localStorage until user saves)
    // We'll save when user clicks the save button
    
    console.log('New editable entry added:', newEntry);
  }

  onEntryDataChange(entry: HologramDailyEntry): void {
    entry.issuedQuantity = this.calculateQuantityFromSerials(entry.issuedFromSerial, entry.issuedToSerial);
    entry.wastageQuantity = this.calculateQuantityFromSerials(entry.wastageFromSerial, entry.wastageToSerial);
    entry.leftOverQuantity = entry.issuedQuantity - entry.utilizedQuantity - entry.wastageQuantity;
    
    // Update the service with the changed data
    if (!entry.isFixed) {
      this.hologramDataService.updateDailyEntry(entry);
    }
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
      alert('Please enter a date');
      return;
    }
    
    // Calculate final quantities
    this.onEntryDataChange(entry);
    
    // Mark as fixed (saved)
    entry.isFixed = true;
    
    // Update the service with all entries
    this.hologramDataService.updateDailyEntries(this.dailyEntries);
    
    // Refresh the display
    this.loadFilteredData();
    
    alert('Entry saved successfully!');
  }

  deleteEntry(entry: HologramDailyEntry): void {
    if (entry.isFixed) {
      alert('Cannot delete saved entries');
      return;
    }
    if (confirm('Are you sure you want to delete this entry?')) {
      this.dailyEntries = this.dailyEntries.filter(e => e.id !== entry.id);
      this.hologramDataService.updateDailyEntries(this.dailyEntries);
      this.loadFilteredData();
    }
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
      // Find first and last utilization serials
      const utilizationEntries = monthEntries.filter(e => e.utilizedQuantity > 0);
      if (utilizationEntries.length > 0) {
        utilizationFromSerial = utilizationEntries[0].issuedFromSerial;
        utilizationToSerial = utilizationEntries[utilizationEntries.length - 1].issuedToSerial;
      }

      // Find first and last wastage serials
      const wastageEntries = monthEntries.filter(e => e.wastageQuantity > 0);
      if (wastageEntries.length > 0) {
        wastageFromSerial = wastageEntries[0].wastageFromSerial;
        wastageToSerial = wastageEntries[wastageEntries.length - 1].wastageToSerial;
      }

      // Calculate totals
      totalIssued = monthEntries.reduce((sum, entry) => sum + entry.issuedQuantity, 0);
      totalUtilized = monthEntries.reduce((sum, entry) => sum + entry.utilizedQuantity, 0);
      totalWastage = monthEntries.reduce((sum, entry) => sum + entry.wastageQuantity, 0);
      totalLeftOver = monthEntries.reduce((sum, entry) => sum + entry.leftOverQuantity, 0);
    }

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