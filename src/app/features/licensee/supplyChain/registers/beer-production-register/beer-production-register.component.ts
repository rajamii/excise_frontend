import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface BeerProductionRecord {
  date: string;
  openingBalance: number;
  production: number;
  totalPart1: number;
  issue: number;
  warehouseLoss: number;
  totalPart2: number;
  closingBalance: number;
  locked: boolean; // when true, row is read-only
  sundayClosed: boolean; // when true, no entries allowed
}

@Component({
  selector: 'app-beer-production-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './beer-production-register.component.html',
  styleUrls: ['./beer-production-register.component.scss']
})
export class BeerProductionRegisterComponent implements OnInit {
  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();
  selectedMonth: number = this.currentMonth;
  selectedYear: number = this.currentYear;
  
  records: BeerProductionRecord[] = [];
  newRecord: BeerProductionRecord = {
    date: '',
    openingBalance: 0,
    production: 0,
    totalPart1: 0,
    issue: 0,
    warehouseLoss: 0,
    totalPart2: 0,
    closingBalance: 0,
    locked: false,
    sundayClosed: false
  };

  months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  years = [2024, 2025, 2026, 2027];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadRecords();
    this.generateDaysForMonth();
  }

  loadRecords(): void {
    const key = `beer-production-${this.selectedYear}-${this.selectedMonth}`;
    const saved = localStorage.getItem(key);
    this.records = saved ? JSON.parse(saved) : [];
  }

  saveRecords(): void {
    const key = `beer-production-${this.selectedYear}-${this.selectedMonth}`;
    localStorage.setItem(key, JSON.stringify(this.records));
  }

  generateDaysForMonth(): void {
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    const existingDates = this.records.map(r => r.date);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.selectedYear}-${this.selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      if (!existingDates.includes(dateStr)) {
        const openingBalance = this.getOpeningBalanceForDate(dateStr);
        const dateObj = new Date(dateStr);
        const isSunday = dateObj.getDay() === 0; // 0 = Sunday
        this.records.push({
          date: dateStr,
          openingBalance: openingBalance,
          production: 0,
          totalPart1: openingBalance,
          issue: 0,
          warehouseLoss: 0,
          totalPart2: 0,
          closingBalance: openingBalance,
          locked: isSunday, // Sundays are read-only
          sundayClosed: isSunday
        });
      }
    }
    
    this.records.sort((a, b) => a.date.localeCompare(b.date));
    this.saveRecords();
  }

  getOpeningBalanceForDate(dateStr: string): number {
    const currentDate = new Date(dateStr);
    const currentDay = currentDate.getDate();
    
    if (currentDay === 1) {
      // First day of month - get closing balance from last month
      return this.getLastMonthClosingBalance();
    } else {
      // Get closing balance from previous day
      const previousDate = new Date(currentDate);
      previousDate.setDate(currentDay - 1);
      const prevDateStr = previousDate.toISOString().split('T')[0];
      const prevRecord = this.records.find(r => r.date === prevDateStr);
      return prevRecord ? prevRecord.closingBalance : 0;
    }
  }

  getLastMonthClosingBalance(): number {
    const lastMonth = this.selectedMonth === 1 ? 12 : this.selectedMonth - 1;
    const lastYear = this.selectedMonth === 1 ? this.selectedYear - 1 : this.selectedYear;
    const key = `beer-production-${lastYear}-${lastMonth}`;
    const lastMonthData = localStorage.getItem(key);
    
    if (lastMonthData) {
      const records = JSON.parse(lastMonthData);
      if (records.length > 0) {
        // Get the last day's closing balance
        const lastRecord = records[records.length - 1];
        return lastRecord.closingBalance;
      }
    }
    return 0;
  }

  onMonthYearChange(): void {
    this.loadRecords();
    this.generateDaysForMonth();
  }

  calculateTotals(record: BeerProductionRecord): void {
    if (record.sundayClosed) {
      // No edits on Sundays; ensure totals reflect no movement
      record.production = 0;
      record.issue = 0;
      record.warehouseLoss = 0;
      record.totalPart1 = record.openingBalance;
      record.totalPart2 = 0;
      record.closingBalance = record.openingBalance;
      this.saveRecords();
      this.updateSubsequentDays(record);
      return;
    }
    // Total Part 1 = Opening Balance + Production
    record.totalPart1 = record.openingBalance + record.production;
    
    // Total Part 2 = Issue + Warehouse Loss
    record.totalPart2 = record.issue + record.warehouseLoss;
    
    // Closing Balance = Total Part 1 - Total Part 2
    record.closingBalance = record.totalPart1 - record.totalPart2;
    
    this.saveRecords();
    this.updateSubsequentDays(record);
  }

  updateSubsequentDays(updatedRecord: BeerProductionRecord): void {
    const updatedIndex = this.records.findIndex(r => r.date === updatedRecord.date);
    
    for (let i = updatedIndex + 1; i < this.records.length; i++) {
      const currentRecord = this.records[i];
      const previousRecord = this.records[i - 1];
      
      currentRecord.openingBalance = previousRecord.closingBalance;
      if (currentRecord.sundayClosed) {
        currentRecord.production = 0;
        currentRecord.issue = 0;
        currentRecord.warehouseLoss = 0;
        currentRecord.totalPart1 = currentRecord.openingBalance;
        currentRecord.totalPart2 = 0;
        currentRecord.closingBalance = currentRecord.openingBalance;
      } else {
        currentRecord.totalPart1 = currentRecord.openingBalance + currentRecord.production;
        currentRecord.totalPart2 = currentRecord.issue + currentRecord.warehouseLoss;
        currentRecord.closingBalance = currentRecord.totalPart1 - currentRecord.totalPart2;
      }
    }
    
    this.saveRecords();
  }

  addNewRecord(): void {
    if (this.newRecord.date) {
      const openingBalance = this.getOpeningBalanceForDate(this.newRecord.date);
      this.newRecord.openingBalance = openingBalance;
      this.calculateTotals(this.newRecord);
      
      this.records.push({ ...this.newRecord });
      this.records.sort((a, b) => a.date.localeCompare(b.date));
      
      this.newRecord = {
        date: '',
        openingBalance: 0,
        production: 0,
        totalPart1: 0,
        issue: 0,
        warehouseLoss: 0,
        totalPart2: 0,
        closingBalance: 0,
        locked: false,
        sundayClosed: false
      };
      
      this.saveRecords();
    }
  }

  isFirstDay(record: BeerProductionRecord): boolean {
    const d = new Date(record.date);
    return d.getDate() === 1;
  }

  makeAsRead(record: BeerProductionRecord): void {
    record.locked = true;
    this.saveRecords();
  }

  deleteRecord(index: number): void {
    this.records.splice(index, 1);
    this.saveRecords();
    this.updateSubsequentDays(this.records[index - 1] || this.records[0]);
  }

  navigateBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  exportToExcel(): void {
    // TODO: Implement Excel export functionality
    console.log('Export to Excel functionality to be implemented');
  }

  printRegister(): void {
    window.print();
  }

  // Total calculation methods for footer
  getTotalOpeningBalance(): number {
    return this.records.reduce((sum, record) => sum + record.openingBalance, 0);
  }

  getTotalProduction(): number {
    return this.records.reduce((sum, record) => sum + record.production, 0);
  }

  getTotalPart1(): number {
    return this.records.reduce((sum, record) => sum + record.totalPart1, 0);
  }

  getTotalIssue(): number {
    return this.records.reduce((sum, record) => sum + record.issue, 0);
  }

  getTotalWarehouseLoss(): number {
    return this.records.reduce((sum, record) => sum + record.warehouseLoss, 0);
  }

  getTotalPart2(): number {
    return this.records.reduce((sum, record) => sum + record.totalPart2, 0);
  }

  getFinalClosingBalance(): number {
    if (this.records.length > 0) {
      return this.records[this.records.length - 1].closingBalance;
    }
    return 0;
  }

  // Summary helpers
  getRolloverFromLastMonth(): number {
    return this.getLastMonthClosingBalance();
  }

  getMonthNetUtilized(): number {
    // Issue + Warehouse Loss totals
    return this.getTotalPart2();
  }
}
