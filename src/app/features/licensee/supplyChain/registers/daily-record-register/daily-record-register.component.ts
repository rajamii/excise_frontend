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
  isWalletDeposit?: boolean; // Track if this is a wallet deposit vs register entry
  walletBalance?: number; // Running wallet balance
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
  walletDeposits: number = 0; // Total wallet deposits
  walletBalance: number = 0; // Current wallet balance
  expandedRow: number | null = null; // Track which row dropdown is open

  allRecords: DailyRecord[] = [
    { sNo: 1, issueDate: new Date('2025-01-15'), brNo: 'BR001/2025', depositDate: new Date('2025-01-16'), depositAmount: 50000, utilisedAmount: 25000, cBalance: 25000, tpNo: 'TP001/2025', isWalletDeposit: false, walletBalance: 0},
    { sNo: 2, issueDate: new Date('2025-01-20'), brNo: 'BR002/2025', depositDate: new Date('2025-01-21'), depositAmount: 30000, utilisedAmount: 15000, cBalance: 15000, tpNo: 'TP002/2025', isWalletDeposit: false, walletBalance: 0 },
    { sNo: 3, issueDate: new Date('2025-01-25'), brNo: 'BR003/2025', depositDate: new Date('2025-01-26'), depositAmount: 40000, utilisedAmount: 20000, cBalance: 20000, tpNo: 'TP003/2025', isWalletDeposit: false, walletBalance: 0 },
    { sNo: 4, issueDate: new Date('2025-02-01'), brNo: 'BR004/2025', depositDate: new Date('2025-02-02'), depositAmount: 35000, utilisedAmount: 17500, cBalance: 17500, tpNo: 'TP004/2025', isWalletDeposit: false, walletBalance: 0},
    { sNo: 5, issueDate: new Date('2025-02-10'), brNo: 'BR005/2025', depositDate: new Date('2025-02-11'), depositAmount: 45000, utilisedAmount: 22500, cBalance: 22500, tpNo: 'TP005/2025', isWalletDeposit: false, walletBalance: 0 },
    // Wallet deposit entries
    { sNo: 6, issueDate: new Date('2025-01-18'), brNo: 'WALLET-001', depositDate: new Date('2025-01-18'), depositAmount: 100000, utilisedAmount: 0, cBalance: 100000, tpNo: 'WALLET-DEP', isWalletDeposit: true, walletBalance: 100000},
    { sNo: 7, issueDate: new Date('2025-01-22'), brNo: 'WALLET-002', depositDate: new Date('2025-01-22'), depositAmount: 75000, utilisedAmount: 0, cBalance: 175000, tpNo: 'WALLET-DEP', isWalletDeposit: true, walletBalance: 175000},
    { sNo: 8, issueDate: new Date('2025-02-05'), brNo: 'WALLET-003', depositDate: new Date('2025-02-05'), depositAmount: 50000, utilisedAmount: 0, cBalance: 225000, tpNo: 'WALLET-DEP', isWalletDeposit: true, walletBalance: 225000}
  ];

  ngOnInit(): void {
    this.calculateOBRAmount();
    this.calculateWalletBalance();
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
    return this.obrAmount + this.getTotalDeposits() + this.walletBalance - this.getTotalUtilized();
  }

  calculateWalletBalance(): void {
    const walletEntries = this.allRecords.filter(r => r.isWalletDeposit);
    this.walletDeposits = walletEntries.reduce((sum, r) => sum + r.depositAmount, 0);
    this.walletBalance = walletEntries.length > 0 ? walletEntries[walletEntries.length - 1].walletBalance || 0 : 0;
  }

  getWalletDeposits(): number {
    return this.getFilteredData().filter(r => r.isWalletDeposit).reduce((sum, r) => sum + r.depositAmount, 0);
  }

  getRegisterDeposits(): number {
    return this.getFilteredData().filter(r => !r.isWalletDeposit).reduce((sum, r) => sum + r.depositAmount, 0);
  }

  getWalletUtilized(): number {
    return this.getFilteredData().filter(r => r.isWalletDeposit).reduce((sum, r) => sum + r.utilisedAmount, 0);
  }

  getRegisterUtilized(): number {
    return this.getFilteredData().filter(r => !r.isWalletDeposit).reduce((sum, r) => sum + r.utilisedAmount, 0);
  }

  toggleDropdown(sNo: number): void {
    this.expandedRow = this.expandedRow === sNo ? null : sNo;
  }

  getPreviousWalletBalance(record: DailyRecord): number {
    const walletRecords = this.allRecords.filter(r => r.isWalletDeposit).sort((a, b) => a.sNo - b.sNo);
    const currentIndex = walletRecords.findIndex(r => r.sNo === record.sNo);
    if (currentIndex <= 0) return 0;
    return walletRecords[currentIndex - 1].walletBalance || 0;
  }

  getNewAmountAdded(record: DailyRecord): number {
    return record.depositAmount;
  }

  getTotalAfterDeposit(record: DailyRecord): number {
    return record.walletBalance || 0;
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

  // Print helpers
  printRegister(): void {
    const printContents = document.getElementById('dailyRecordPrintSection')?.innerHTML || '';
    const originalContents = document.body.innerHTML;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');

    document.body.innerHTML = `<!doctype html><html><head>${styles}<style>@media print { .no-print { display: none !important; } .print-header { display: block !important; } #dailyRecordPrintSection { padding: 0 8mm; } } @media screen { .print-header { display: none; } }</style></head><body>${printContents}</body></html>`;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  }

  getPrintMonthLabel(): string {
    if (!this.selectedMonth) {
      return `${this.getCurrentMonthName()} ${this.selectedYear}`;
    }
    const monthName = this.getMonthName(parseInt(this.selectedMonth));
    return `${monthName} ${this.selectedYear}`;
  }
}




