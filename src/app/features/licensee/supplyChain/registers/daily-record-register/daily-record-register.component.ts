import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DailyRecord {
  sNo: number;
  issueDate: Date;
  brNo: string;
  depositDate: Date;
  depositAmount: number;
  utilisedAmount: number;
  cBalance: number;
  tpNo: string;
 
}

@Component({
  selector: 'app-daily-record-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './daily-record-register.component.html',
  styleUrl: './daily-record-register.component.scss'
})
export class DailyRecordRegisterComponent implements OnInit {
  selectedMonth = '';
  selectedYear = '2025';
  obrAmount = 0;
  obrMonth = '';

  allRecords: DailyRecord[] = [
    { sNo: 1, issueDate: new Date('2025-01-15'), brNo: 'BR001/2025', depositDate: new Date('2025-01-16'), depositAmount: 50000, utilisedAmount: 25000, cBalance: 25000, tpNo: 'TP001/2025'},
    { sNo: 2, issueDate: new Date('2025-01-20'), brNo: 'BR002/2025', depositDate: new Date('2025-01-21'), depositAmount: 30000, utilisedAmount: 15000, cBalance: 15000, tpNo: 'TP002/2025' },
    { sNo: 3, issueDate: new Date('2025-01-25'), brNo: 'BR003/2025', depositDate: new Date('2025-01-26'), depositAmount: 40000, utilisedAmount: 20000, cBalance: 20000, tpNo: 'TP003/2025' },
    { sNo: 4, issueDate: new Date('2025-02-01'), brNo: 'BR004/2025', depositDate: new Date('2025-02-02'), depositAmount: 35000, utilisedAmount: 17500, cBalance: 17500, tpNo: 'TP004/2025'},
    { sNo: 5, issueDate: new Date('2025-02-10'), brNo: 'BR005/2025', depositDate: new Date('2025-02-11'), depositAmount: 45000, utilisedAmount: 22500, cBalance: 22500, tpNo: 'TP005/2025' }
  ];

  ngOnInit(): void {
    this.calculateOBRAmount();
  }

  onFilterChange(): void {
    this.calculateOBRAmount();
  }

  onSearch(): void {}

  onClear(): void {
    this.selectedMonth = '';
    this.selectedYear = '2025';
    this.calculateOBRAmount();
  }

  getFilteredData(): DailyRecord[] {
    let filtered = [...this.allRecords];
    if (this.selectedMonth) {
      filtered = filtered.filter(r => (r.issueDate.getMonth() + 1) === parseInt(this.selectedMonth));
    }
    if (this.selectedYear) {
      filtered = filtered.filter(r => r.issueDate.getFullYear() === parseInt(this.selectedYear));
    }
    return filtered;
  }

  getTotalDeposits(): number {
    return this.getFilteredData().reduce((s, r) => s + r.depositAmount, 0);
  }

  getTotalUtilized(): number {
    return this.getFilteredData().reduce((s, r) => s + r.utilisedAmount, 0);
  }

  getClosingBalance(): number {
    return this.obrAmount + this.getTotalDeposits() - this.getTotalUtilized();
  }

  calculateOBRAmount(): void {
    const currentMonth = this.selectedMonth ? parseInt(this.selectedMonth) : (new Date().getMonth() + 1);
    const currentYear = parseInt(this.selectedYear);
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) { prevMonth = 12; prevYear = currentYear - 1; }

    const prevMonthRecords = this.allRecords.filter(r => (r.issueDate.getMonth() + 1) === prevMonth && r.issueDate.getFullYear() === prevYear);
    this.obrAmount = prevMonthRecords.reduce((s, r) => s + r.cBalance, 0);
    this.obrMonth = this.getMonthName(prevMonth);
  }

  getOBRMonthName(): string { return this.obrMonth; }

  getCurrentMonthName(): string {
    return this.selectedMonth ? this.getMonthName(parseInt(this.selectedMonth)) : 'All Months';
  }

  getMonthName(m: number): string {
    const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return names[m - 1];
  }
}




