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

interface RollDisplayRange {
  from: string;
  to: string;
  qty: number;
  reason?: string;
}

interface RollDisplayDetail {
  rollName: string;
  ranges: RollDisplayRange[];
}

interface MonthlyReportRow {
  rowType: MonthlyReportRowType;
  label: string;
  date?: string;
  openingStock?: number | null;
  freshArrival?: number | null;
  total?: number | null;
  leftOver?: number | null;
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
    serialRange?: string;
  };
  utilizationDetails?: RollDisplayDetail[];
  wastageDetails?: RollDisplayDetail[];
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
  rollDetails?: RollDetail[];
  totalWastage?: number;
}

interface RollRangeDetail {
  fromSerial?: string;
  toSerial?: string;
  quantity?: number;
  damageReason?: string;
}

interface RollDetail {
  rollName: string;
  utilizationRanges: RollRangeDetail[];
  wastageRanges: RollRangeDetail[];
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
      leftOver: opening + freshArrival - totals.totalIssued - totals.totalWastage,
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
        runningBalance -= event.totalWastage || 0;
        
        // Get leftover from the entry
        const entry = (event as any).entry;
        const totalLeftOver = this.calculateLeftOverForDisplay(entry);
        
        // Create separate rows for each roll/range
        const rollDetails = event.rollDetails;
        if (rollDetails && rollDetails.length > 0) {
          // Filter out invalid roll details (those with no utilization or wastage, or invalid serial ranges)
          const validRollDetails = rollDetails.filter((rollDetail: any) => {
            const hasUtilization = rollDetail.utilizationRanges && rollDetail.utilizationRanges.length > 0 && 
                                   rollDetail.utilizationRanges.some((r: any) => r.quantity > 0);
            const hasWastage = rollDetail.wastageRanges && rollDetail.wastageRanges.length > 0 && 
                              rollDetail.wastageRanges.some((r: any) => r.quantity > 0);
            
            // Also check if the serial range is valid (fromSerial should be less than toSerial)
            const serialRange = this.extractSerialRangeFromSingleRoll(rollDetail);
            const hasValidRange = serialRange && !serialRange.includes('undefined') && !serialRange.includes('NaN');
            
            return (hasUtilization || hasWastage) && hasValidRange;
          });
          
          validRollDetails.forEach((rollDetail: any, index: number) => {
            const rollName = rollDetail.rollName;
            
            // Calculate quantities for this specific roll/range
            const rollUtilizationQty = this.sumRanges(rollDetail.utilizationRanges);
            const rollWastageQty = this.sumRanges(rollDetail.wastageRanges);
            
            // Get the serial range for this roll (from allocated range, not issued/wastage)
            const serialRange = this.extractSerialRangeFromSingleRoll(rollDetail);
            
            // Calculate leftover for THIS specific range
            // Leftover = Allocated - (Issued + Wastage)
            const allocatedQty = (rollDetail as any).availableCount || (rollDetail as any).allocatedQuantity || 0;
            const rollLeftOver = allocatedQty - (rollUtilizationQty + rollWastageQty);
            
            // Get damage reason for this specific range
            const damageReason = (rollDetail as any).damageReason || '';
            
            // Only show label on first row, leave blank for subsequent rows
            const label = (index === 0) ? `Utilization - ${this.formatDate(event.date)}` : '';
            
            rows.push({
              rowType: 'UTILIZATION',
              label: label,
              date: event.date,
              utilizationQty: rollUtilizationQty,
              wastageQty: rollWastageQty,
              closingBalance: (index === validRollDetails.length - 1) ? runningBalance : null,
              leftOver: rollLeftOver,  // Show leftover for each range
              utilizationDetails: this.mapRollDisplayDetails([rollDetail], 'utilization'),
              wastageDetails: this.mapRollDisplayDetails([rollDetail], 'wastage'),
              meta: {
                referenceNo: event.referenceNo,
                cartoonNumber: rollName,
                serialRange: serialRange,
                damageReason: damageReason  // Add damage reason to meta
              }
            });
          });
        } else {
          // Fallback: single row if no roll details
          const utilizationDetails = this.mapRollDisplayDetails(rollDetails, 'utilization');
          const wastageDetails = this.mapRollDisplayDetails(rollDetails, 'wastage');
          
          rows.push({
            rowType: 'UTILIZATION',
            label: `Utilization - ${this.formatDate(event.date)}`,
            date: event.date,
            utilizationQty: event.quantity,
            wastageQty: event.totalWastage || 0,
            closingBalance: runningBalance,
            leftOver: totalLeftOver,
            utilizationDetails,
            wastageDetails,
            meta: {
              referenceNo: event.referenceNo
            }
          });
        }
      }
    });

    this.statementRows = rows;
  }

  private calculateLeftOverForDisplay(entry: any): number {
    // Get leftover directly from the entry
    if (entry && typeof entry.leftOverQuantity === 'number') {
      return entry.leftOverQuantity;
    }
    
    // Fallback: calculate from entry data
    if (entry) {
      const utilizedQty = entry.utilizedQuantity || entry.issuedQuantity || 0;
      const issuedQty = entry.issuedQuantity || 0;
      const wastageQty = entry.wastageQuantity || 0;
      return utilizedQty - issuedQty - wastageQty;
    }
    
    return 0;
  }

  private buildStatementEvents(): StatementEvent[] {
    if (!this.monthlyStatement) {
      return [];
    }

    const events: StatementEvent[] = [];
    const utilizationEventMap = new Map<string, StatementEvent>();

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
      const rollDetails = this.buildRollDetails(entry);
      const totalUtilized = rollDetails.reduce((sum, detail) => sum + this.sumRanges(detail.utilizationRanges), 0);
      const totalWastage = rollDetails.reduce((sum, detail) => sum + this.sumRanges(detail.wastageRanges), 0);

      if (totalUtilized > 0 || totalWastage > 0) {
        this.addOrUpdateUtilizationEvent(
          events,
          utilizationEventMap,
          referenceNo,
          entryDate,
          timestamp,
          totalUtilized,
          totalWastage,
          rollDetails,
          entry  // Pass the entry for leftover calculation
        );
      }
    });

    events.sort((a, b) => a.timestamp - b.timestamp);

    return events;
  }

  private addOrUpdateUtilizationEvent(
    events: StatementEvent[],
    eventMap: Map<string, StatementEvent>,
    referenceNo: string,
    entryDate: string,
    timestamp: number,
    totalUtilized: number,
    totalWastage: number,
    rollDetails: RollDetail[],
    entry?: any  // Add entry parameter
  ): void {
    const key = referenceNo || `ref-${timestamp}`;
    const existing = eventMap.get(key);

    if (existing) {
      existing.quantity += totalUtilized;
      existing.totalWastage = (existing.totalWastage || 0) + totalWastage;
      existing.rollDetails = [...(existing.rollDetails || []), ...rollDetails];
      if (timestamp > existing.timestamp) {
        existing.timestamp = timestamp;
        existing.date = entryDate;
      }
      // Update entry if provided
      if (entry) {
        (existing as any).entry = entry;
      }
    } else {
      const newEvent: StatementEvent = {
        rowType: 'UTILIZATION',
        date: entryDate,
        timestamp,
        quantity: totalUtilized,
        totalWastage,
        referenceNo,
        rollDetails
      };
      // Store entry for leftover calculation
      if (entry) {
        (newEvent as any).entry = entry;
      }
      eventMap.set(key, newEvent);
      events.push(newEvent);
    }
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

  private buildRollDetails(entry: any): RollDetail[] {
    const details: RollDetail[] = [];
    const lockedRolls = entry.lockedRolls || [];

    if (lockedRolls.length > 0) {
      lockedRolls.forEach((roll: any) => {
        const rollName = roll.cartoonNumber || entry.cartoonNumber || entry.referenceNo || entry.ourRefNo || entry.id || 'Roll';
        const rollDetail: any = {
          rollName,
          utilizationRanges: (roll.issuedRanges || []).map((range: any) => ({
            fromSerial: range.fromSerial || '',
            toSerial: range.toSerial || '',
            quantity: range.quantity || range.qty || 0
          })),
          wastageRanges: (roll.wastageRanges || []).map((range: any) => ({
            fromSerial: range.fromSerial || '',
            toSerial: range.toSerial || '',
            quantity: range.quantity || range.qty || 0,
            damageReason: range.damageReason || roll.damageReason || entry.damageReason
          }))
        };
        
        // IMPORTANT: Preserve the allocated range info from the locked roll
        if (roll.serialRange) {
          rollDetail.serialRange = roll.serialRange;
        }
        if (roll.fromSerial) {
          rollDetail.fromSerial = roll.fromSerial;
        }
        if (roll.toSerial) {
          rollDetail.toSerial = roll.toSerial;
        }
        
        // Preserve allocated quantity and damage reason for leftover calculation
        if (roll.availableCount !== undefined) {
          rollDetail.availableCount = roll.availableCount;
        }
        if (roll.allocatedQuantity !== undefined) {
          rollDetail.allocatedQuantity = roll.allocatedQuantity;
        }
        if (roll.damageReason) {
          rollDetail.damageReason = roll.damageReason;
        }
        
        details.push(rollDetail);
      });
    }

    if (details.length === 0) {
      const rollName = entry.cartoonNumber || entry.referenceNo || entry.ourRefNo || entry.id || 'Roll';
      const issuedEntries = entry.issuedEntries && entry.issuedEntries.length > 0
        ? entry.issuedEntries
        : (entry.issuedFromSerial && entry.issuedToSerial
          ? [{
              fromSerial: entry.issuedFromSerial,
              toSerial: entry.issuedToSerial,
              quantity: entry.issuedQuantity || entry.utilizedQuantity || 0
            }]
          : []);
      const wastageEntries = entry.wastageEntries && entry.wastageEntries.length > 0
        ? entry.wastageEntries
        : (entry.wastageFromSerial && entry.wastageToSerial
          ? [{
              fromSerial: entry.wastageFromSerial,
              toSerial: entry.wastageToSerial,
              quantity: entry.wastageQuantity || 0,
              damageReason: entry.damageReason
            }]
          : []);

      details.push({
        rollName,
        utilizationRanges: issuedEntries.map((range: any) => ({
          fromSerial: range.fromSerial || '',
          toSerial: range.toSerial || '',
          quantity: range.quantity || 0
        })),
        wastageRanges: wastageEntries.map((range: any) => ({
          fromSerial: range.fromSerial || '',
          toSerial: range.toSerial || '',
          quantity: range.quantity || 0,
          damageReason: range.damageReason || entry.damageReason
        }))
      });
    }

    return details;
  }

  private sumRanges(ranges: RollRangeDetail[]): number {
    return ranges.reduce((sum, range) => sum + (range.quantity || 0), 0);
  }

  private mapRollDisplayDetails(details: RollDetail[] | undefined, type: 'utilization' | 'wastage'): RollDisplayDetail[] {
    if (!details) {
      return [];
    }

    return details
      .map(detail => {
        const rangesSource = type === 'utilization' ? detail.utilizationRanges : detail.wastageRanges;
        const ranges = rangesSource
          .filter(range =>
            (range.fromSerial && range.fromSerial.trim().length > 0) ||
            (range.toSerial && range.toSerial.trim().length > 0) ||
            (range.quantity || 0) > 0)
          .map(range => ({
            from: range.fromSerial || '-',
            to: range.toSerial || '-',
            qty: range.quantity || 0,
            reason: range.damageReason
          }));

        return {
          rollName: detail.rollName,
          ranges
        };
      })
      .filter(detail => detail.ranges.length > 0);
  }

  private initializeFiltersToCurrentMonth(): void {
    const now = new Date();
    const monthIndex = now.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    const year = now.getFullYear().toString();

    this.selectedMonth = monthIndex;
    this.selectedYear = year;
  }

  /**
   * Extract serial range from roll details (allocated range, not issued/wastage ranges)
   */
  private extractSerialRangeFromRollDetails(rollDetails: RollDetail[] | undefined): string | undefined {
    if (!rollDetails || rollDetails.length === 0) {
      return undefined;
    }

    // Get the first roll's utilization ranges to determine the allocated range
    const firstRoll = rollDetails[0];
    return this.extractSerialRangeFromSingleRoll(firstRoll);
  }

  /**
   * Extract serial range from a single roll detail
   * IMPORTANT: This should return the ALLOCATED range, not the used range
   */
  private extractSerialRangeFromSingleRoll(rollDetail: any): string | undefined {
    // PRIORITY 1: Use the stored serialRange from the locked roll (this is the allocated range)
    if ((rollDetail as any).serialRange) {
      return (rollDetail as any).serialRange;
    }

    // PRIORITY 2: Use fromSerial and toSerial from the locked roll (allocated range)
    if ((rollDetail as any).fromSerial && (rollDetail as any).toSerial) {
      return `${(rollDetail as any).fromSerial} - ${(rollDetail as any).toSerial}`;
    }

    // FALLBACK: Calculate from utilization/wastage ranges (not ideal, but better than nothing)
    const allRanges = [...(rollDetail.utilizationRanges || []), ...(rollDetail.wastageRanges || [])];
    
    if (allRanges.length === 0) {
      return undefined;
    }

    // Find the min and max serials across all ranges
    const serials = allRanges
      .filter(r => r.fromSerial && r.toSerial)
      .flatMap(r => [r.fromSerial!, r.toSerial!]);
    
    if (serials.length === 0) {
      return undefined;
    }

    // Extract numeric parts and find min/max
    const extractNumber = (s: string): number => {
      const match = s.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const numbers = serials.map(extractNumber);
    const minNum = Math.min(...numbers);
    const maxNum = Math.max(...numbers);

    // Format back to serial format (preserve prefix if any)
    const prefix = serials[0].replace(/\d+$/, '');
    const fromSerial = prefix + String(minNum).padStart(6, '0');
    const toSerial = prefix + String(maxNum).padStart(6, '0');

    return `${fromSerial} - ${toSerial}`;
  }
}