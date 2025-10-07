import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type MonthValue = '' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

interface LocalSaleRecord {
  date: string; // ISO yyyy-MM-dd
  invoiceNo: string;
  exciseTPNo: string;
  vendorName: string;
  dansbergBlue: number;
  hit: number;
  dansbergStrong: number;
  premium650ml: number;
  premium330ml: number;
  totalAmount: number;
  remarks: string;
}

@Component({
  selector: 'app-local-sales-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './local-sales-register.component.html',
  styleUrls: ['./local-sales-register.component.scss']
})
export class LocalSalesRegisterComponent {
  // Filters
  selectedMonth: MonthValue = '';
  selectedYear: string = new Date().getFullYear().toString();

  // Pagination
  pageSizeOptions: number[] = [10, 25, 50];
  pageSize = 10;
  currentPage = 1;

  // Data (sample/mock for UI only)
  records: LocalSaleRecord[] = [
    {
      date: '2025-10-01',
      invoiceNo: 'INV-001',
      exciseTPNo: 'TP-1001',
      vendorName: 'ABC Distributors',
      dansbergBlue: 10,
      hit: 5,
      dansbergStrong: 8,
      premium650ml: 12,
      premium330ml: 20,
      totalAmount: 250000,
      remarks: 'Delivered'
    },
    {
      date: '2025-10-05',
      invoiceNo: 'INV-002',
      exciseTPNo: 'TP-1002',
      vendorName: 'XYZ Traders',
      dansbergBlue: 6,
      hit: 3,
      dansbergStrong: 4,
      premium650ml: 5,
      premium330ml: 9,
      totalAmount: 120000,
      remarks: 'Paid'
    }
  ];

  get filtered(): LocalSaleRecord[] {
    const m = this.selectedMonth;
    const y = this.selectedYear;
    return this.records.filter(r => {
      const [year, month] = r.date.split('-');
      const monthOk = m === '' ? true : month === m.padStart(2, '0');
      const yearOk = y ? year === y : true;
      return monthOk && yearOk;
    });
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  getPaged(): LocalSaleRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(Math.max(1, page), this.totalPages);
  }

  changePageSize(size: number): void {
    this.pageSize = Number(size);
    this.currentPage = 1;
  }

  getShowingEnd(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.filtered.length ? this.filtered.length : end;
  }

  // Helpers
  getTotalCases(row: LocalSaleRecord): number {
    return (
      (row.dansbergBlue || 0) +
      (row.hit || 0) +
      (row.dansbergStrong || 0) +
      (row.premium650ml || 0) +
      (row.premium330ml || 0)
    );
  }

  getPrintMonthLabel(): string {
    if (!this.selectedMonth) return 'All';
    return this.getMonthName(this.selectedMonth) + ' ' + this.selectedYear;
    
  }

  getMonthName(m: MonthValue): string {
    const idx = Number(m);
    return [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ][idx] || 'All';
  }
}
