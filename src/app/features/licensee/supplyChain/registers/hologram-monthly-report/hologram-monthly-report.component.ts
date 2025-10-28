import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HologramDataService } from '../../../supplyChain/services/hologram-data.service';

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
  month: string; // e.g., 'jul'
  year: string; // e.g., '2025'
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE'; // Type of hologram
  entryDate: string; // Date when this entry was made (ISO format)
  openingStock: number;
  freshArrival: number;
  total: number;
  utilizations: HologramUtilization[];
  wastages: HologramWastage[];
  totalUtilized: number;
  totalWastage: number;
  closingBalance: number;
  isFixed: boolean;
  isFirstRowOfMonth: boolean; // Indicates if this is the first row of the month
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
export class HologramMonthlyReportComponent implements OnInit {
  Math = Math;
  selectedMonth = 'jul'; // Default to July
  selectedYear = '2025'; // Default to 2025
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL'; // Default to LOCAL

  // Sample data organized by month, year, and hologram type
  reportRows: HologramReportRow[] = [
    // June 2025 data (previous month) - for carry forward logic
    {
      id: '0',
      month: 'jun',
      year: '2025',
      hologramType: 'LOCAL',
      entryDate: '2025-06-30',
      openingStock: 100000,
      freshArrival: 200000,
      total: 300000,
      utilizations: [
        { fromSerialNo: '200000', toSerialNo: '250000', quantity: 0 }
      ],
      wastages: [
        { fromSerialNo: '250001', toSerialNo: '250100', quantity: 0 }
      ],
      totalUtilized: 50001,
      totalWastage: 100,
      closingBalance: 249899, // This will be July's opening stock
      isFixed: true,
      isFirstRowOfMonth: true,
      production: {
        sikkim650ml: 0,
        wb: 0,
        total: 0
      }
    },
    // LOCAL data for July 2025
    {
      id: '1',
      month: 'jul',
      year: '2025',
      hologramType: 'LOCAL',
      entryDate: '2025-07-01',
      openingStock: 249899, // Carried from June closing balance
      freshArrival: 2300000,
      total: 2549899,
      utilizations: [
        { fromSerialNo: '275346495', toSerialNo: '275520000', quantity: 0 },
        { fromSerialNo: '275520001', toSerialNo: '275600000', quantity: 0 }
      ],
      wastages: [
        { fromSerialNo: '275455115', toSerialNo: '275459428', quantity: 0 }
      ],
      totalUtilized: 253506,
      totalWastage: 4314,
      closingBalance: 2292079,
      isFixed: true,
      isFirstRowOfMonth: true, // First row of July
      production: {
        sikkim650ml: 175263,
        wb: 1750,
        total: 177013
      }
    },
    {
      id: '2',
      month: 'jul',
      year: '2025',
      hologramType: 'LOCAL',
      entryDate: '2025-07-15',
      openingStock: 1000,
      freshArrival: 5000,
      total: 6000,
      utilizations: [
        { fromSerialNo: '1000', toSerialNo: '1010', quantity: 0 }
      ],
      wastages: [
        { fromSerialNo: '2000', toSerialNo: '2005', quantity: 0 }
      ],
      totalUtilized: 0,
      totalWastage: 0,
      closingBalance: 0,
      isFixed: false,
      isFirstRowOfMonth: false,
      production: {
        sikkim650ml: 0,
        wb: 0,
        total: 0
      }
    },
    // EXPORT data for July 2025
    {
      id: '3',
      month: 'jul',
      year: '2025',
      hologramType: 'EXPORT',
      entryDate: '2025-07-01',
      openingStock: 50000,
      freshArrival: 100000,
      total: 150000,
      utilizations: [
        { fromSerialNo: 'EX1000', toSerialNo: 'EX1500', quantity: 0 }
      ],
      wastages: [],
      totalUtilized: 0,
      totalWastage: 0,
      closingBalance: 0,
      isFixed: false,
      isFirstRowOfMonth: true, // First row of July EXPORT
      production: {
        sikkim650ml: 0,
        wb: 0,
        total: 0
      }
    },
    // DEFENCE data for July 2025
    {
      id: '4',
      month: 'jul',
      year: '2025',
      hologramType: 'DEFENCE',
      entryDate: '2025-07-01',
      openingStock: 25000,
      freshArrival: 75000,
      total: 100000,
      utilizations: [
        { fromSerialNo: 'DEF500', toSerialNo: 'DEF600', quantity: 0 }
      ],
      wastages: [],
      totalUtilized: 0,
      totalWastage: 0,
      closingBalance: 0,
      isFixed: false,
      isFirstRowOfMonth: true, // First row of July DEFENCE
      production: {
        sikkim650ml: 0,
        wb: 0,
        total: 0
      }
    },
    // August 2025 LOCAL data - to demonstrate carry forward
    {
      id: '5',
      month: 'aug',
      year: '2025',
      hologramType: 'LOCAL',
      entryDate: '2025-08-01',
      openingStock: 2292079, // This should be calculated from July's closing balance
      freshArrival: 1000000,
      total: 3292079,
      utilizations: [],
      wastages: [],
      totalUtilized: 0,
      totalWastage: 0,
      closingBalance: 3292079,
      isFixed: false,
      isFirstRowOfMonth: true, // First row of August LOCAL
      production: {
        sikkim650ml: 0,
        wb: 0,
        total: 0
      }
    }
  ];

  filteredRows: HologramReportRow[] = [];

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private hologramDataService: HologramDataService
  ) {}

  ngOnInit(): void {
    // Check for query parameters
    this.route.queryParams.subscribe(params => {
      if (params['month']) this.selectedMonth = params['month'];
      if (params['year']) this.selectedYear = params['year'];
      if (params['type']) this.selectedHologramType = params['type'];
    });

    // Load data for the selected month/year
    this.loadMonthlyData();
    
    // Auto-calculate from daily register on initialization
    this.calculateFromDailyRegister();
  }

  // Monthly data management
  loadMonthlyData(): void {
    // Filter data for the selected month, year, and hologram type
    this.filteredRows = this.reportRows.filter(row => 
      row.month === this.selectedMonth && 
      row.year === this.selectedYear &&
      row.hologramType === this.selectedHologramType
    );
    
    // If no data exists for this month/year/type, create the first row with previous month's closing balance
    if (this.filteredRows.length === 0) {
      this.addNewRow();
    } else {
      // Ensure the first row has the correct opening stock from previous month
      this.updateFirstRowOpeningStock();
    }
  }

  // Get previous month's closing balance for carry forward
  getPreviousMonthClosingBalance(): number {
    const { prevMonth, prevYear } = this.getPreviousMonthYear();
    
    // Find the last row of the previous month for the same hologram type
    const prevMonthRows = this.reportRows.filter(row => 
      row.month === prevMonth && 
      row.year === prevYear &&
      row.hologramType === this.selectedHologramType
    );
    
    if (prevMonthRows.length === 0) {
      return 0; // No previous month data, start with 0
    }
    
    // Return the sum of all closing balances from previous month (total closing balance)
    return prevMonthRows.reduce((total, row) => total + row.closingBalance, 0);
  }

  // Auto-calculate monthly totals from daily register data
  private calculateFromDailyRegister(): void {
    // This method would integrate with the daily register component
    // For now, we'll simulate the auto-calculation logic
    const monthlyTotals = this.getMonthlyTotalsFromDailyRegister();
    
    if (monthlyTotals && this.filteredRows.length > 0) {
      // Update the first row with calculated values from daily register
      const firstRow = this.filteredRows[0];
      if (firstRow && !firstRow.isFixed) {
        // Auto-populate utilization data
        if (monthlyTotals.utilizationFromSerial && monthlyTotals.utilizationToSerial) {
          firstRow.utilizations = [{
            fromSerialNo: monthlyTotals.utilizationFromSerial,
            toSerialNo: monthlyTotals.utilizationToSerial,
            quantity: monthlyTotals.totalUtilized
          }];
        }
        
        // Auto-populate wastage data
        if (monthlyTotals.wastageFromSerial && monthlyTotals.wastageToSerial) {
          firstRow.wastages = [{
            fromSerialNo: monthlyTotals.wastageFromSerial,
            toSerialNo: monthlyTotals.wastageToSerial,
            quantity: monthlyTotals.totalWastage
          }];
        }
        
        // Recalculate row totals
        this.onRowDataChange(firstRow);
      }
    }
  }

  // Get monthly totals from daily register
  getMonthlyTotalsFromDailyRegister(): any {
    return this.hologramDataService.getMonthlyTotals(
      this.selectedMonth,
      this.selectedYear,
      this.selectedHologramType
    );
  }

  // Get previous month and year
  getPreviousMonthYear(): { prevMonth: string, prevYear: string } {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const currentMonthIndex = months.indexOf(this.selectedMonth);
    
    if (currentMonthIndex === 0) {
      // January -> December of previous year
      return {
        prevMonth: 'dec',
        prevYear: (parseInt(this.selectedYear) - 1).toString()
      };
    } else {
      // Previous month of same year
      return {
        prevMonth: months[currentMonthIndex - 1],
        prevYear: this.selectedYear
      };
    }
  }

  // Update the first row's opening stock with previous month's closing balance
  updateFirstRowOpeningStock(): void {
    if (this.filteredRows.length > 0) {
      const firstRow = this.filteredRows.find(row => row.isFirstRowOfMonth);
      if (firstRow) {
        const prevClosingBalance = this.getPreviousMonthClosingBalance();
        firstRow.openingStock = prevClosingBalance;
        this.onRowDataChange(firstRow);
      }
    }
  }

  onMonthYearChange(): void {
    this.loadMonthlyData();
    this.currentPage = 1; // Reset pagination
  }

  // Public method to trigger auto-calculation
  autoCalculateFromDaily(): void {
    this.calculateFromDailyRegister();
    alert('Monthly totals have been refreshed from daily register data!');
  }

  // Navigate to daily register
  goToDailyRegister(): void {
    this.router.navigate(['/dev-hologram-daily-register']);
  }

  // Get monthly closing balance
  getMonthlyClosingBalance(): number {
    const openingStock = this.getPreviousMonthClosingBalance();
    const monthlyTotals = this.getMonthlyTotalsFromDailyRegister();
    const total = openingStock + monthlyTotals.totalIssued;
    return total - monthlyTotals.totalUtilized - monthlyTotals.totalWastage;
  }

  onHologramTypeChange(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): void {
    this.selectedHologramType = type;
    this.loadMonthlyData();
    this.currentPage = 1; // Reset pagination
  }

  getSelectedMonthYear(): string {
    const monthNames: { [key: string]: string } = {
      'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
      'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
      'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
    };
    return `${monthNames[this.selectedMonth]} ${this.selectedYear}`;
  }

  getCurrentHologramTypeDisplay(): string {
    return `${this.getSelectedMonthYear()} - ${this.selectedHologramType}`;
  }

  getPreviousMonthDisplay(): string {
    const { prevMonth, prevYear } = this.getPreviousMonthYear();
    const monthNames: { [key: string]: string } = {
      'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
      'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
      'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
    };
    return `${monthNames[prevMonth]} ${prevYear}`;
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  // Data entry methods
  addNewRow(): void {
    const newId = (this.reportRows.length + 1).toString();
    
    // Check if this will be the first row for this month/year/type
    const existingRows = this.reportRows.filter(row => 
      row.month === this.selectedMonth && 
      row.year === this.selectedYear &&
      row.hologramType === this.selectedHologramType
    );
    
    const isFirstRow = existingRows.length === 0;
    const openingStock = isFirstRow ? this.getPreviousMonthClosingBalance() : 0;
    
    const newRow: HologramReportRow = {
      id: newId,
      month: this.selectedMonth,
      year: this.selectedYear,
      hologramType: this.selectedHologramType,
      entryDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
      openingStock: openingStock,
      freshArrival: 0,
      total: openingStock,
      utilizations: [],
      wastages: [],
      totalUtilized: 0,
      totalWastage: 0,
      closingBalance: openingStock,
      isFixed: false,
      isFirstRowOfMonth: isFirstRow,
      production: { sikkim650ml: 0, wb: 0, total: 0 }
    };
    
    this.reportRows.push(newRow);
    this.loadMonthlyData();
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
      const oldQuantity = util.quantity;
      util.quantity = this.calculateQuantityFromSerials(util.fromSerialNo, util.toSerialNo);

      this.onRowDataChange(row);
      this.cdr.detectChanges(); // Force change detection
    }
  }

  onWastageSerialChange(row: HologramReportRow, index: number): void {
    if (row.wastages && row.wastages[index]) {
      const waste = row.wastages[index];
      const oldQuantity = waste.quantity;
      waste.quantity = this.calculateQuantityFromSerials(waste.fromSerialNo, waste.toSerialNo);

      this.onRowDataChange(row);
      this.cdr.detectChanges(); // Force change detection
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
    
    // Log successful calculations for debugging
    if (quantity > 0) {
      console.log(`Calculated: ${fromSerial} to ${toSerial} = ${quantity}`);
    }
    
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
    // Final calculation before saving
    this.onRowDataChange(row);
    row.isFixed = true;
    this.loadMonthlyData();
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
      this.loadMonthlyData();
    }
  }

  getStatusClass(isFixed: boolean): string {
    return isFixed ? 'badge bg-success' : 'badge bg-warning';
  }

  // Check if opening stock should be read-only (first row of month)
  isOpeningStockReadonly(row: HologramReportRow): boolean {
    return row.isFirstRowOfMonth || row.isFixed;
  }

  // Get tooltip text for opening stock field
  getOpeningStockTooltip(row: HologramReportRow): string {
    if (row.isFirstRowOfMonth) {
      const { prevMonth, prevYear } = this.getPreviousMonthYear();
      const monthNames: { [key: string]: string } = {
        'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
        'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
        'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
      };
      return `Carried forward from ${monthNames[prevMonth]} ${prevYear} closing balance`;
    }
    return '';
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

  // Test method to verify calculation
  testCalculation(): void {
    console.log('=== Testing Calculations ===');
    
    // Test simple numbers
    const test1 = this.calculateQuantityFromSerials('1000', '1010');
    console.log('Test 1 (1000 to 1010):', test1, 'Expected: 11');
    
    // Test with serial numbers
    const test2 = this.calculateQuantityFromSerials('275346495', '275346500');
    console.log('Test 2 (275346495 to 275346500):', test2, 'Expected: 6');
    
    // Test with prefix
    const test3 = this.calculateQuantityFromSerials('ABC123', 'ABC133');
    console.log('Test 3 (ABC123 to ABC133):', test3, 'Expected: 11');
    
    // Test empty values
    const test4 = this.calculateQuantityFromSerials('', '1000');
    console.log('Test 4 (empty to 1000):', test4, 'Expected: 0');
    
    console.log('=== End Tests ===');
  }

}