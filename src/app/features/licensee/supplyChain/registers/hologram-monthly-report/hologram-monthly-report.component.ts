import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  HologramArrivalRecord,
  HologramDataService,
  MonthlyStatementSummary,
  MonthlyTotals
} from '../../../supplyChain/services/hologram-data.service';

type MonthlyReportRowType = 'SUMMARY' | 'ARRIVAL' | 'UTILIZATION' | 'WASTAGE';

interface MonthlyReportRow {
  rowType: MonthlyReportRowType;
  label: string;
  date?: string;
  openingStock?: number | null;
  freshArrival?: number | null;
  total?: number | null;
  utilizationFrom?: string;
  utilizationTo?: string;
  utilizationQty?: number | null;
  wastageFrom?: string;
  wastageTo?: string;
  wastageQty?: number | null;
  closingBalance?: number | null;
  meta?: {
    cartoonNumber?: string;
    referenceNo?: string;
    damageReason?: string;
    notes?: string;
  };
}

interface StatementEvent {
  rowType: 'ARRIVAL' | 'UTILIZATION' | 'WASTAGE';
  date: string;
  timestamp: number;
  quantity: number;
  fromSerial?: string;
  toSerial?: string;
  cartoonNumber?: string;
  referenceNo?: string;
  damageReason?: string;
}

interface MonthlyOverviewSummary {
  openingStock: number;
  totalArrivals: number;
  totalUtilized: number;
  totalWastage: number;
  closingBalance: number;
  arrivalCount: number;
  utilizationCount: number;
  wastageCount: number;
}

@Component({
  selector: 'app-hologram-monthly-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram-monthly-report.component.html',
  styleUrls: ['./hologram-monthly-report.component.scss']
})
export class HologramMonthlyReportComponent implements OnInit, OnDestroy {
  selectedMonth = 'jul';
  selectedYear = '2025';
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';

  monthlyStatement: MonthlyStatementSummary | null = null;
  monthlyTotals: MonthlyTotals = this.createEmptyTotals();
  approvedEntriesCount = 0;
  isLoading = true;
  statementRows: MonthlyReportRow[] = [];
  overviewSummary: MonthlyOverviewSummary | null = null;

  private storageListener = (event: StorageEvent) => {
    if (!event.key) {
      return;
    }
    if (event.key === 'approvedHologramEntries' || event.key === 'hologramInitialOpeningStock' || event.key === 'hologramOverviewRolls') {
      this.refreshMonthlyData();
    }
  };

  constructor(
    private router: Router, 
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    public hologramDataService: HologramDataService
  ) {}

  ngOnInit(): void {
    this.initializeFiltersToCurrentMonth();

    this.route.queryParams.subscribe(params => {
      if (params['month']) this.selectedMonth = params['month'];
      if (params['year']) this.selectedYear = params['year'];
      if (params['type']) this.selectedHologramType = params['type'];
      this.refreshMonthlyData();
    });

    window.addEventListener('storage', this.storageListener);
    this.refreshMonthlyData();
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.storageListener);
  }

  onMonthYearChange(): void {
    this.refreshMonthlyData();
  }

  onHologramTypeChange(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): void {
    this.selectedHologramType = type;
    this.refreshMonthlyData();
  }

  autoCalculateFromDaily(): void {
    this.refreshMonthlyData();
    const totals = this.monthlyTotals;
    const freshArrival = this.getFreshArrival();
    const message = [
      'Monthly totals refreshed!',
      '',
      `Total Fresh Arrival: ${freshArrival}`,
      `Total Issued (Utilized): ${totals.totalIssued}`,
      `Total Wastage: ${totals.totalWastage}`
    ].join('\n');
    alert(message);
  }

  goToDailyRegister(): void {
    this.router.navigate(['/dev-hologram-daily-register']);
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  getMonthlyTotalsFromDailyRegister(): MonthlyTotals {
    return this.monthlyTotals;
  }

  getPreviousMonthClosingBalance(): number {
    return this.monthlyStatement?.openingStock ?? 0;
  }

  getMonthlyClosingBalance(): number {
    return this.monthlyStatement?.closingBalance ?? 0;
  }

  getFreshArrival(): number {
    return this.monthlyStatement?.freshArrival ?? 0;
  }

  getSelectedMonthYear(): string {
    const monthNames: { [key: string]: string } = {
      jan: 'January', feb: 'February', mar: 'March', apr: 'April',
      may: 'May', jun: 'June', jul: 'July', aug: 'August',
      sep: 'September', oct: 'October', nov: 'November', dec: 'December'
    };
    return `${monthNames[this.selectedMonth]} ${this.selectedYear}`;
  }

  getCurrentHologramTypeDisplay(): string {
    return `${this.getSelectedMonthYear()} - ${this.selectedHologramType}`;
  }

  getPreviousMonthDisplay(): string {
    const { prevMonth, prevYear } = this.getPreviousMonthYear();
    const monthNames: { [key: string]: string } = {
      jan: 'January', feb: 'February', mar: 'March', apr: 'April',
      may: 'May', jun: 'June', jul: 'July', aug: 'August',
      sep: 'September', oct: 'October', nov: 'November', dec: 'December'
    };
    return `${monthNames[prevMonth]} ${prevYear}`;
  }

  private refreshMonthlyData(): void {
    this.isLoading = true;
    const statement = this.hologramDataService.getMonthlyStatement(
      this.selectedMonth,
      this.selectedYear,
      this.selectedHologramType
    );

    this.monthlyStatement = statement;
    this.monthlyTotals = statement?.totals ?? this.createEmptyTotals();
    this.approvedEntriesCount = statement?.entries?.length ?? 0;
    this.buildStatementRows();
    this.buildOverviewSummary();
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private getPreviousMonthYear(): { prevMonth: string; prevYear: string } {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const currentMonthIndex = months.indexOf(this.selectedMonth);

    if (currentMonthIndex <= 0) {
      return {
        prevMonth: 'dec',
        prevYear: (parseInt(this.selectedYear, 10) - 1).toString()
      };
    }

    return {
      prevMonth: months[currentMonthIndex - 1],
      prevYear: this.selectedYear
    };
  }

  private createEmptyTotals(): MonthlyTotals {
    return {
      totalIssued: 0,
      totalUtilized: 0,
      totalWastage: 0,
      totalLeftOver: 0,
      utilizationFromSerial: '',
      utilizationToSerial: '',
      wastageFromSerial: '',
      wastageToSerial: ''
    };
  }

  private buildOverviewSummary(): void {
    if (!this.monthlyStatement) {
      this.overviewSummary = null;
      return;
    }

    const opening = this.monthlyStatement.openingStock ?? 0;
    const closing = this.monthlyStatement.closingBalance ?? 0;

    const totalArrivals = this.getFreshArrival();
    const totalUtilized = this.monthlyTotals.totalIssued;
    const totalWastage = this.monthlyTotals.totalWastage;

    const arrivalCount = (this.monthlyStatement.arrivals || []).length;
    const utilizationCount = (this.monthlyStatement.entries || []).reduce((count, entry) => {
      const issuedEntries = entry.issuedEntries && entry.issuedEntries.length > 0
        ? entry.issuedEntries
        : (entry.issuedFromSerial && entry.issuedToSerial && entry.issuedQuantity
          ? [{ quantity: entry.issuedQuantity }]
          : []);
      return count + issuedEntries.filter(issued => (issued.quantity || 0) > 0).length;
    }, 0);
    const wastageCount = (this.monthlyStatement.entries || []).reduce((count, entry) => {
      const wastageEntries = entry.wastageEntries && entry.wastageEntries.length > 0
        ? entry.wastageEntries
        : (entry.wastageFromSerial && entry.wastageToSerial && entry.wastageQuantity
          ? [{ quantity: entry.wastageQuantity }]
          : []);
      return count + wastageEntries.filter(waste => (waste.quantity || 0) > 0).length;
    }, 0);

    this.overviewSummary = {
      openingStock: opening,
      totalArrivals,
      totalUtilized,
      totalWastage,
      closingBalance: closing,
      arrivalCount,
      utilizationCount,
      wastageCount
    };
  }

  get hasDetailRows(): boolean {
    return this.statementRows.some(row => row.rowType !== 'SUMMARY');
  }

  getRowClass(row: MonthlyReportRow): string {
    switch (row.rowType) {
      case 'SUMMARY':
        return 'table-light';
      case 'ARRIVAL':
        return 'table-warning';
      case 'UTILIZATION':
        return 'table-info';
      case 'WASTAGE':
        return 'table-danger';
      default:
        return '';
    }
  }

  private buildStatementRows(): void {
    const rows: MonthlyReportRow[] = [];

    if (!this.monthlyStatement) {
      this.statementRows = rows;
      return;
    }

    const opening = this.monthlyStatement.openingStock ?? 0;
    const freshArrival = this.getFreshArrival();
    const totals = this.monthlyTotals;
    const closing = this.getMonthlyClosingBalance();

    rows.push({
      rowType: 'SUMMARY',
      label: this.getCurrentHologramTypeDisplay(),
      openingStock: opening,
      freshArrival,
      total: opening + freshArrival,
      utilizationFrom: totals.utilizationFromSerial || '',
      utilizationTo: totals.utilizationToSerial || '',
      utilizationQty: totals.totalIssued,
      wastageFrom: totals.wastageFromSerial || '',
      wastageTo: totals.wastageToSerial || '',
      wastageQty: totals.totalWastage,
      closingBalance: closing
    });

    let runningBalance = opening;
    const events = this.buildStatementEvents();

    events.forEach(event => {
      if (event.rowType === 'ARRIVAL') {
        runningBalance += event.quantity;
        rows.push({
          rowType: 'ARRIVAL',
          label: `Arrival - ${this.formatDate(event.date)}`,
          date: event.date,
          freshArrival: event.quantity,
          closingBalance: runningBalance,
          meta: {
            cartoonNumber: event.cartoonNumber,
            notes: this.buildArrivalNote(event)
          }
        });
      } else if (event.rowType === 'UTILIZATION') {
        runningBalance -= event.quantity;
        rows.push({
          rowType: 'UTILIZATION',
          label: `Utilization - ${this.formatDate(event.date)}`,
          date: event.date,
          utilizationFrom: event.fromSerial,
          utilizationTo: event.toSerial,
          utilizationQty: event.quantity,
          closingBalance: runningBalance,
          meta: {
            referenceNo: event.referenceNo
          }
        });
      } else if (event.rowType === 'WASTAGE') {
        runningBalance -= event.quantity;
        const utilizationRow = this.findMatchingUtilizationRow(rows, event.referenceNo);
        if (utilizationRow) {
          utilizationRow.wastageFrom = event.fromSerial;
          utilizationRow.wastageTo = event.toSerial;
          utilizationRow.wastageQty = event.quantity;
          utilizationRow.closingBalance = runningBalance;
          utilizationRow.meta = {
            ...utilizationRow.meta,
            damageReason: event.damageReason || utilizationRow.meta?.damageReason
          };
        } else {
          rows.push({
            rowType: 'WASTAGE',
            label: `Wastage - ${this.formatDate(event.date)}`,
            date: event.date,
            wastageFrom: event.fromSerial,
            wastageTo: event.toSerial,
            wastageQty: event.quantity,
            closingBalance: runningBalance,
            meta: {
              referenceNo: event.referenceNo,
              damageReason: event.damageReason
            }
          });
        }
      }
    });

    this.statementRows = rows;
  }

  private buildStatementEvents(): StatementEvent[] {
    if (!this.monthlyStatement) {
      return [];
    }

    const priority: Record<StatementEvent['rowType'], number> = {
      ARRIVAL: 0,
      UTILIZATION: 1,
      WASTAGE: 2
    };

    const events: StatementEvent[] = [];

    const arrivals = this.monthlyStatement.arrivals || [];
    arrivals.forEach((arrival: HologramArrivalRecord) => {
      if (!arrival.receivedDate || !arrival.totalCount) {
        return;
      }
      events.push({
        rowType: 'ARRIVAL',
        date: arrival.receivedDate,
        timestamp: this.getTimestamp(arrival.receivedDate),
        quantity: arrival.totalCount,
        fromSerial: arrival.fromSerial || '',
        toSerial: arrival.toSerial || '',
        cartoonNumber: arrival.cartoonNumber || ''
      });
    });

    const entries = this.monthlyStatement.entries || [];
    entries.forEach(entry => {
      const entryDate = entry.date || (entry as any).entryDate || '';
      const timestamp = this.getTimestamp(entryDate);
      const referenceNo = (entry as any).referenceNo || (entry as any).ourRefNo || entry.id;

      if (entry.issuedEntries && entry.issuedEntries.length > 0) {
        entry.issuedEntries.forEach(issued => {
          if (!issued.quantity || issued.quantity <= 0) {
            return;
          }
          events.push({
            rowType: 'UTILIZATION',
            date: entryDate,
            timestamp,
            quantity: issued.quantity,
            fromSerial: issued.fromSerial,
            toSerial: issued.toSerial,
            referenceNo
          });
        });
      } else if (entry.issuedFromSerial && entry.issuedToSerial && entry.issuedQuantity) {
        events.push({
          rowType: 'UTILIZATION',
          date: entryDate,
          timestamp,
          quantity: entry.issuedQuantity,
          fromSerial: entry.issuedFromSerial,
          toSerial: entry.issuedToSerial,
          referenceNo
        });
      }

      if (entry.wastageEntries && entry.wastageEntries.length > 0) {
        entry.wastageEntries.forEach(waste => {
          if (!waste.quantity || waste.quantity <= 0) {
            return;
          }
          events.push({
            rowType: 'WASTAGE',
            date: entryDate,
            timestamp,
            quantity: waste.quantity,
            fromSerial: waste.fromSerial,
            toSerial: waste.toSerial,
            referenceNo,
            damageReason: waste.damageReason
          });
        });
      } else if (entry.wastageFromSerial && entry.wastageToSerial && entry.wastageQuantity) {
        events.push({
          rowType: 'WASTAGE',
          date: entryDate,
          timestamp,
          quantity: entry.wastageQuantity,
          fromSerial: entry.wastageFromSerial,
          toSerial: entry.wastageToSerial,
          referenceNo,
          damageReason: (entry as any).damageReason
        });
      }
    });

    events.sort((a, b) => {
      if (a.timestamp === b.timestamp) {
        return priority[a.rowType] - priority[b.rowType];
      }
      return a.timestamp - b.timestamp;
    });

    return events;
  }

  private getTimestamp(date: string): number {
    const parsed = Date.parse(date);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private formatDate(date: string): string {
    if (!date) {
      return 'N/A';
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private buildArrivalNote(event: StatementEvent): string | undefined {
    if (!event.fromSerial && !event.toSerial) {
      return undefined;
    }
    if (event.fromSerial && event.toSerial) {
      return `Serial Range: ${event.fromSerial} - ${event.toSerial}`;
    }
    if (event.fromSerial) {
      return `From Serial: ${event.fromSerial}`;
    }
    if (event.toSerial) {
      return `To Serial: ${event.toSerial}`;
    }
    return undefined;
  }

  private findMatchingUtilizationRow(rows: MonthlyReportRow[], referenceNo?: string): MonthlyReportRow | undefined {
    if (!referenceNo) {
      return undefined;
    }
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (row.rowType === 'UTILIZATION' && row.meta?.referenceNo === referenceNo) {
        return row;
      }
    }
    return undefined;
  }

  private initializeFiltersToCurrentMonth(): void {
    const now = new Date();
    const monthIndex = now.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    const year = now.getFullYear().toString();

    this.selectedMonth = monthIndex;
    this.selectedYear = year;
  }
}