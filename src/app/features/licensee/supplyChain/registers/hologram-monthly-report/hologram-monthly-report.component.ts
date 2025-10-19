import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  // Sample data with some pre-filled and some empty rows for the month
  reportRows: HologramReportRow[] = [
    {
      id: '1',
      date: 'Jul-25',
      openingStock: 173506,
      freshArrival: 2300000,
      total: 2473506,
      utilizations: [
        { fromSerialNo: '275346495', toSerialNo: '275520000', quantity: 0 },
        { fromSerialNo: '275520001', toSerialNo: '275600000', quantity: 0 }
      ],
      wastages: [
        { fromSerialNo: '275455115', toSerialNo: '275459428', quantity: 0 }
      ],
      totalUtilized: 253506,
      totalWastage: 4314,
      closingBalance: 2215686,
      isFixed: true,
      production: {
        sikkim650ml: 175263,
        wb: 1750,
        total: 177013
      }
    },
    {
      id: '2',
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
      production: {
        sikkim650ml: 0,
        wb: 0,
        total: 0
      }
    }
  ];

  filteredRows: HologramReportRow[] = [];

  constructor(private router: Router) {
    // Recalculate quantities for existing data
    this.reportRows.forEach(row => {
      row.utilizations.forEach(util => {
        util.quantity = this.calculateQuantityFromSerials(util.fromSerialNo, util.toSerialNo);
      });
      row.wastages.forEach(waste => {
        waste.quantity = this.calculateQuantityFromSerials(waste.fromSerialNo, waste.toSerialNo);
      });
      this.onRowDataChange(row);
    });
    
    this.filteredRows = [...this.reportRows];
    
    // Test the calculation with sample data
    this.testCalculation();
  }

  private testCalculation(): void {
    // Test cases
    const test1 = this.calculateQuantityFromSerials('275346495', '275520000');
    const test2 = this.calculateQuantityFromSerials('1000', '1010');
    const test3 = this.calculateQuantityFromSerials('ABC123', 'ABC133');
    
    console.log('Test calculations:', {
      'From 275346495 to 275520000': test1, // Should be 173506
      'From 1000 to 1010': test2, // Should be 11
      'From ABC123 to ABC133': test3 // Should be 11
    });
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
    const newId = (this.reportRows.length + 1).toString();
    const newRow: HologramReportRow = {
      id: newId,
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
    
    this.reportRows.push(newRow);
    this.onSearch();
  }

  onRowDataChange(row: HologramReportRow): void {
    // Calculate totals whenever data changes
    row.total = (row.openingStock || 0) + (row.freshArrival || 0);
    row.totalUtilized = (row.utilizations || []).reduce((sum, util) => sum + (util.quantity || 0), 0);
    row.totalWastage = (row.wastages || []).reduce((sum, waste) => sum + (waste.quantity || 0), 0);
    row.closingBalance = row.total - (row.totalUtilized + row.totalWastage);
    if (row.production) {
      row.production.total = (row.production.sikkim650ml || 0) + (row.production.wb || 0);
    }
  }

  onUtilizationSerialChange(row: HologramReportRow, index: number): void {
    if (row.utilizations && row.utilizations[index]) {
      const util = row.utilizations[index];
      util.quantity = this.calculateQuantityFromSerials(util.fromSerialNo, util.toSerialNo);
      this.onRowDataChange(row);
    }
  }

  onWastageSerialChange(row: HologramReportRow, index: number): void {
    if (row.wastages && row.wastages[index]) {
      const waste = row.wastages[index];
      waste.quantity = this.calculateQuantityFromSerials(waste.fromSerialNo, waste.toSerialNo);
      this.onRowDataChange(row);
    }
  }

  private calculateQuantityFromSerials(fromSerial: string, toSerial: string): number {
    if (!fromSerial || !toSerial) {
      return 0;
    }

    // Trim whitespace
    fromSerial = fromSerial.trim();
    toSerial = toSerial.trim();

    // Extract numeric parts from serial numbers
    const fromNum = this.extractNumericPart(fromSerial);
    const toNum = this.extractNumericPart(toSerial);

    if (fromNum === null || toNum === null || toNum < fromNum) {
      return 0;
    }

    // Calculate quantity as (To - From) + 1
    const quantity = (toNum - fromNum) + 1;
    return quantity;
  }

  private extractNumericPart(serial: string): number | null {
    if (!serial) return null;
    
    // Try to extract the numeric part - handle different formats
    // First try: pure numeric string
    if (/^\d+$/.test(serial)) {
      return parseInt(serial, 10);
    }
    
    // Second try: extract trailing numbers (most common format)
    const trailingNumbers = serial.match(/\d+$/);
    if (trailingNumbers) {
      return parseInt(trailingNumbers[0], 10);
    }
    
    // Third try: extract all numbers and take the largest sequence
    const allNumbers = serial.match(/\d+/g);
    if (allNumbers && allNumbers.length > 0) {
      // Take the longest numeric sequence
      const longestNum = allNumbers.reduce((a, b) => a.length > b.length ? a : b);
      return parseInt(longestNum, 10);
    }
    
    return null;
  }

  saveRow(row: HologramReportRow): void {
    if (!row.date) {
      alert('Please enter a date');
      return;
    }
    
    // Final calculation before saving
    this.onRowDataChange(row);
    row.isFixed = true;
    this.onSearch();
  }

  addUtilizationToRow(row: HologramReportRow): void {
    if (!row.utilizations) {
      row.utilizations = [];
    }
    row.utilizations.push({ fromSerialNo: '', toSerialNo: '', quantity: 0 });
    // No need to call onRowDataChange here as quantity will be 0 until serial numbers are entered
  }

  removeUtilizationFromRow(row: HologramReportRow, index: number): void {
    if (row.utilizations) {
      row.utilizations.splice(index, 1);
      this.onRowDataChange(row);
    }
  }

  addWastageToRow(row: HologramReportRow): void {
    if (!row.wastages) {
      row.wastages = [];
    }
    row.wastages.push({ fromSerialNo: '', toSerialNo: '', quantity: 0 });
    // No need to call onRowDataChange here as quantity will be 0 until serial numbers are entered
  }

  removeWastageFromRow(row: HologramReportRow, index: number): void {
    if (row.wastages) {
      row.wastages.splice(index, 1);
      this.onRowDataChange(row);
    }
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


}