import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
    this.loadSampleData();
    this.loadFilteredData();
  }

  loadSampleData(): void {
    this.entries = [
      {
        id: '1',
        referenceNo: 'HRQ/2025/001',
        rollRange: 'CTN001 - 275346495-275520000',
        dates: {
          submission: '2025-11-20',
          usage: '2025-11-21'
        },
        brandDetails: 'Sikkim Supreme Whisky',
        bottleSize: '750ml',
        rollsAssigned: ['CTN001', 'CTN002'],
        hologramQty: 173506,
        issuedFrom: '275346495',
        issuedTo: '275520000',
        issuedQty: 173506,
        wastageFrom: '275455115',
        wastageTo: '275459428',
        wastageQty: 4314,
        leftOver: 0,
        total: 177820,
        damageReason: 'Machine malfunction',
        isFixed: true
      },
      {
        id: '2',
        referenceNo: 'HRQ/2025/002',
        rollRange: 'CTN003 - 275520001-275520500',
        dates: {
          submission: '2025-11-21',
          usage: '2025-11-22'
        },
        brandDetails: 'Himalayan Gold Rum',
        bottleSize: '750ml',
        rollsAssigned: ['CTN003'],
        hologramQty: 500,
        issuedFrom: '',
        issuedTo: '',
        issuedQty: 0,
        wastageFrom: '',
        wastageTo: '',
        wastageQty: 0,
        leftOver: 500,
        total: 500,
        damageReason: '',
        isFixed: false
      }
    ];
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
}
