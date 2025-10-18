import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface HologramUtilization {
  fromSerialNo: string;
  toSerialNo: string;
  quantity: number;
}

interface HologramWastage {
  fromSerialNo: string;
  toSerialNo: string;
  quantity: number;
}

interface HologramMonthlyReport {
  id: string;
  date: string;
  openingStock: number;
  freshArrival: number;
  total: number;
  utilizations: HologramUtilization[];
  wastages: HologramWastage[];
  totalUtilized: number;
  totalWastage: number;
  closingBalance: number;
  isFixed: boolean;
  production: {
    sikkim650ml: number;
    wb: number;
    total: number;
  };
}

interface HologramReportRow {
  id: string;
  date: string;
  openingStock: number;
  freshArrival: number;
  total: number;
  utilizations: HologramUtilization[];
  wastages: HologramWastage[];
  totalUtilized: number;
  totalWastage: number;
  closingBalance: number;
  isFixed: boolean;
  production: {
    sikkim650ml: number;
    wb: number;
    total: number;
  };
}

interface HologramReportRowPartial {
  id?: string;
  date: string;
  openingStock: number;
  freshArrival: number;
  total: number;
  utilizations: HologramUtilization[];
  wastages: HologramWastage[];
  totalUtilized: number;
  totalWastage: number;
  closingBalance: number;
  isFixed: boolean;
  production: {
    sikkim650ml: number;
    wb: number;
    total: number;
  };
}

@Component({
  selector: 'app-hologram-monthly-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram-monthly-report.component.html',
  styleUrls: ['./hologram-monthly-report.component.scss']
})
export class HologramMonthlyReportComponent {
  Math = Math;
  selectedMonth = '';
  selectedYear = '';
  selectedDate = '';
  sidebarHidden = true;
  private isBrowser = false;
  showAddRowForm = false;
  editingRow: HologramReportRow | null = null;

  // Sample data matching the image format
  reportRows: HologramReportRow[] = [
    {
      id: '1',
      date: 'Jul-25',
      openingStock: 173506,
      freshArrival: 2300000,
      total: 2473506,
      utilizations: [
        { fromSerialNo: '275346495', toSerialNo: '275520000', quantity: 173506 },
        { fromSerialNo: '275520001', toSerialNo: '275600000', quantity: 80000 },
        { fromSerialNo: '275600001', toSerialNo: '275700000', quantity: 100000 }
      ],
      wastages: [
        { fromSerialNo: '275455115', toSerialNo: '275459428', quantity: 4314 },
        { fromSerialNo: '275459429', toSerialNo: '275465000', quantity: 5571 }
      ],
      totalUtilized: 2140191,
      totalWastage: 37035,
      closingBalance: 296280,
      isFixed: true,
      production: {
        sikkim650ml: 175263,
        wb: 1750,
        total: 177013
      }
    }
  ];

  filteredRows: HologramReportRow[] = [];
  newRow: HologramReportRowPartial = {
    date: '',
    openingStock: 0,
    freshArrival: 0,
    total: 0,
    utilizations: [],
    wastages: [],
    totalUtilized: 0,
    totalWastage: 0,
    closingBalance: 0,
    isFixed: false,
    production: { sikkim650ml: 0, wb: 0, total: 0 }
  };

  constructor(private router: Router, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.filteredRows = [...this.reportRows];
  }

  // Filter methods
  onSearch(): void {
    this.filteredRows = this.reportRows.filter(row => {
      const dateMatch = !this.selectedDate || row.date.toLowerCase().includes(this.selectedDate.toLowerCase());
      const monthMatch = !this.selectedMonth || row.date.toLowerCase().includes(this.selectedMonth.toLowerCase());
      const yearMatch = !this.selectedYear || row.date.includes(this.selectedYear);
      
      return dateMatch && monthMatch && yearMatch;
    });
  }

  onClear(): void {
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedDate = '';
    this.filteredRows = [...this.reportRows];
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  // Data entry methods
  addNewRow(): void {
    this.showAddRowForm = true;
    this.editingRow = null;
    this.newRow = {
      date: '',
      openingStock: 0,
      freshArrival: 0,
      total: 0,
      utilizations: [],
      wastages: [],
      totalUtilized: 0,
      totalWastage: 0,
      closingBalance: 0,
      isFixed: false,
      production: { sikkim650ml: 0, wb: 0, total: 0 }
    };
  }

  editRow(row: HologramReportRow): void {
    if (row.isFixed) return; // Cannot edit fixed rows
    this.editingRow = { ...row } as HologramReportRow;
    this.showAddRowForm = true;
  }

  saveRow(): void {
    if (!this.editingRow && !this.newRow.date) {
      alert('Please enter a date');
      return;
    }

    const rowData = this.editingRow || this.newRow;
    
    // Calculate totals
    rowData.total = (rowData.openingStock || 0) + (rowData.freshArrival || 0);
    rowData.totalUtilized = (rowData.utilizations || []).reduce((sum, util) => sum + util.quantity, 0);
    rowData.totalWastage = (rowData.wastages || []).reduce((sum, waste) => sum + waste.quantity, 0);
    rowData.closingBalance = rowData.total - (rowData.totalUtilized + rowData.totalWastage);
    if (rowData.production) {
      rowData.production.total = (rowData.production.sikkim650ml || 0) + (rowData.production.wb || 0);
    }

    if (this.editingRow) {
      // Update existing row
      const index = this.reportRows.findIndex(r => r.id === this.editingRow!.id);
      if (index !== -1) {
        this.reportRows[index] = { ...this.editingRow, isFixed: true };
      }
    } else {
      // Add new row
      const newId = (this.reportRows.length + 1).toString();
      this.reportRows.push({
        id: newId,
        ...rowData,
        isFixed: true
      } as HologramReportRow);
    }

    this.cancelEdit();
    this.onSearch();
  }

  cancelEdit(): void {
    this.showAddRowForm = false;
    this.editingRow = null;
    this.newRow = {
      date: '',
      openingStock: 0,
      freshArrival: 0,
      total: 0,
      utilizations: [],
      wastages: [],
      totalUtilized: 0,
      totalWastage: 0,
      closingBalance: 0,
      isFixed: false,
      production: { sikkim650ml: 0, wb: 0, total: 0 }
    };
  }

  addUtilization(): void {
    if (!this.editingRow && !this.newRow.utilizations) {
      this.newRow.utilizations = [];
    }
    const utilizations = this.editingRow?.utilizations || this.newRow.utilizations || [];
    utilizations.push({ fromSerialNo: '', toSerialNo: '', quantity: 0 });
  }

  removeUtilization(index: number): void {
    const utilizations = this.editingRow?.utilizations || this.newRow.utilizations || [];
    utilizations.splice(index, 1);
  }

  addWastage(): void {
    if (!this.editingRow && !this.newRow.wastages) {
      this.newRow.wastages = [];
    }
    const wastages = this.editingRow?.wastages || this.newRow.wastages || [];
    wastages.push({ fromSerialNo: '', toSerialNo: '', quantity: 0 });
  }

  removeWastage(index: number): void {
    const wastages = this.editingRow?.wastages || this.newRow.wastages || [];
    wastages.splice(index, 1);
  }

  deleteRow(row: HologramReportRow): void {
    if (row.isFixed) {
      alert('Cannot delete fixed rows');
      return;
    }
    if (confirm('Are you sure you want to delete this row?')) {
      this.reportRows = this.reportRows.filter(r => r.id !== row.id);
      this.onSearch();
    }
  }

  getStatusClass(isFixed: boolean): string {
    return isFixed ? 'badge bg-success' : 'badge bg-warning';
  }

  toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden;
  }

  // Calculation helpers
  calculateGrandTotals(): { totalOpening: number, totalFreshArrival: number, totalTotal: number, totalUtilized: number, totalWastage: number, totalClosing: number } {
    return this.filteredRows.reduce((totals, row) => {
      totals.totalOpening += row.openingStock;
      totals.totalFreshArrival += row.freshArrival;
      totals.totalTotal += row.total;
      totals.totalUtilized += row.totalUtilized;
      totals.totalWastage += row.totalWastage;
      totals.totalClosing += row.closingBalance;
      return totals;
    }, { totalOpening: 0, totalFreshArrival: 0, totalTotal: 0, totalUtilized: 0, totalWastage: 0, totalClosing: 0 });
  }

  calculateProductionTotals(): { totalSikkim: number, totalWB: number, grandTotal: number } {
    return this.filteredRows.reduce((totals, row) => {
      totals.totalSikkim += row.production.sikkim650ml;
      totals.totalWB += row.production.wb;
      totals.grandTotal += row.production.total;
      return totals;
    }, { totalSikkim: 0, totalWB: 0, grandTotal: 0 });
  }

  // Pagination
  pageSize = 10;
  currentPage = 1;

  getTotalPages(): number {
    return Math.ceil(this.filteredRows.length / this.pageSize);
  }

  getPagedRows(): HologramReportRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
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

  // Getter methods for safe two-way binding
  get currentRow() {
    return this.editingRow || this.newRow;
  }

  get currentRowDate() {
    return this.currentRow?.date || '';
  }

  set currentRowDate(value: string) {
    if (this.currentRow) {
      this.currentRow.date = value;
    }
  }

  get currentRowOpeningStock() {
    return this.currentRow?.openingStock || 0;
  }

  set currentRowOpeningStock(value: number) {
    if (this.currentRow) {
      this.currentRow.openingStock = value;
      this.saveRow();
    }
  }

  get currentRowFreshArrival() {
    return this.currentRow?.freshArrival || 0;
  }

  set currentRowFreshArrival(value: number) {
    if (this.currentRow) {
      this.currentRow.freshArrival = value;
      this.saveRow();
    }
  }

  get currentRowProductionSikkim() {
    return this.currentRow?.production?.sikkim650ml || 0;
  }

  set currentRowProductionSikkim(value: number) {
    if (this.currentRow?.production) {
      this.currentRow.production.sikkim650ml = value;
      this.saveRow();
    }
  }

  get currentRowProductionWB() {
    return this.currentRow?.production?.wb || 0;
  }

  set currentRowProductionWB(value: number) {
    if (this.currentRow?.production) {
      this.currentRow.production.wb = value;
      this.saveRow();
    }
  }
}