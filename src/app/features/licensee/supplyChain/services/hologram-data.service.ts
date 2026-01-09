import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface HologramIssuedEntry {
  id: string;
  fromSerial: string;
  toSerial: string;
  quantity: number;
}

export interface HologramWastageEntry {
  id: string;
  fromSerial: string;
  toSerial: string;
  quantity: number;
  damageReason: string;
}

export interface HologramProcurement {
  id?: number;
  refNo?: string;
  licensee?: number;
  licenseeName?: string;
  manufacturingUnit?: string;
  date?: string;
  localQty: number;
  exportQty: number;
  defenceQty: number;
  paymentStatus?: string;
  paymentDetails?: any;
  remarks?: string;
  status?: string;
  stageId?: number;
  workflow?: number;
  currentStage?: number;
  carton_details?: any[];
}

export interface HologramRequest {
  id?: number;
  refNo?: string;
  licensee?: number;
  licenseeName?: string;
  submissionDate?: string;
  usageDate: string;
  quantity: number;
  hologramType?: 'LOCAL' | 'EXPORT' | 'DEFENCE'; // Added to support type
  remarks?: string;
  status?: string;
  stageId?: number;
  workflow?: number;
  currentStage?: number;
}

// Keep legacy interfaces for compatibility if needed, but we are moving to API
export interface HologramDailyEntry {
  id: string;
  date: string;
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  issuedEntries: HologramIssuedEntry[];
  wastageEntries: HologramWastageEntry[];
  utilizedQuantity: number;
  leftOverQuantity: number;
  isFixed: boolean;

  // Legacy fields for backward compatibility
  issuedFromSerial?: string;
  issuedToSerial?: string;
  issuedQuantity?: number;
  wastageFromSerial?: string;
  wastageToSerial?: string;
  wastageQuantity?: number;
  damageReason?: string;
  // ... other legacy fields
}

export interface MonthlyTotals {
  totalIssued: number;
  totalUtilized: number;
  totalWastage: number;
  totalLeftOver: number;
  utilizationFromSerial: string;
  utilizationToSerial: string;
  wastageFromSerial: string;
  wastageToSerial: string;
}

export interface MonthlyStatementSummary {
  monthKey: string;
  month: string;
  year: string;
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  openingStock: number;
  freshArrival: number;
  totals: MonthlyTotals;
  closingBalance: number;
  entries: HologramDailyEntry[];
  arrivals: HologramArrivalRecord[];
}

export interface HologramArrivalRecord {
  id: number | string;
  type: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  totalCount: number;
  receivedDate: string;
  cartoonNumber?: string;
  fromSerial?: string;
  toSerial?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HologramDataService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/transactional/supply_chain/hologram`;

  // Legacy subjects (keep if necessary for other components, but ideally should be replaced)
  private dailyEntriesSubject = new BehaviorSubject<any[]>([]);
  public dailyEntries$ = this.dailyEntriesSubject.asObservable();

  private readonly APPROVED_ENTRIES_KEY = 'approvedHologramEntries';
  private readonly INITIAL_OPENING_KEY = 'hologramInitialOpeningStock';

  private readonly monthNumberMap: { [key: string]: string } = {
    jan: '01', feb: '02', mar: '03', apr: '04',
    may: '05', jun: '06', jul: '07', aug: '08',
    sep: '09', oct: '10', nov: '11', dec: '12'
  };

  private readonly monthCodeMap: { [key: string]: string } = {
    '01': 'jan', '02': 'feb', '03': 'mar', '04': 'apr',
    '05': 'may', '06': 'jun', '07': 'jul', '08': 'aug',
    '09': 'sep', '10': 'oct', '11': 'nov', '12': 'dec'
  };

  private readonly defaultInitialOpening: Record<'LOCAL' | 'EXPORT' | 'DEFENCE', number> = {
    LOCAL: 0,
    EXPORT: 0,
    DEFENCE: 0
  };

  private get procurementApiUrl() { return `${this.apiUrl}/procurement`; }
  private get requestApiUrl() { return `${this.apiUrl}/request`; }

  constructor() { }

  // --- Procurement APIs ---

  getProcurements(): Observable<HologramProcurement[]> {
    const t = new Date().getTime();
    return this.http.get<HologramProcurement[]>(`${this.apiUrl}/procurement/?_t=${t}`);
  }

  createProcurement(data: HologramProcurement): Observable<HologramProcurement> {
    return this.http.post<HologramProcurement>(`${this.apiUrl}/procurement/`, data);
  }

  getProcurement(id: number): Observable<HologramProcurement> {
    return this.http.get<HologramProcurement>(`${this.apiUrl}/procurement/${id}/`);
  }

  forwardProcurement(id: number, targetStage: string, remarks: string = ''): Observable<any> {
    return this.http.post(`${this.apiUrl}/procurement/${id}/forward_request/`, {
      target_stage: targetStage,
      remarks: remarks
    });
  }

  // --- Request APIs ---

  getRequests(): Observable<HologramRequest[]> {
    const t = new Date().getTime();
    return this.http.get<HologramRequest[]>(`${this.apiUrl}/request/?_t=${t}`);
  }

  createRequest(data: HologramRequest): Observable<HologramRequest> {
    return this.http.post<HologramRequest>(`${this.requestApiUrl}/`, data);
  }

  getRequest(id: number): Observable<HologramRequest> {
    const t = new Date().getTime();
    return this.http.get<HologramRequest>(`${this.requestApiUrl}/${id}/?_t=${t}`);
  }

  updateRequestStatus(id: number, targetStage: string, remarks: string = ''): Observable<any> {
    return this.http.post(`${this.requestApiUrl}/${id}/update_status/`, {
      target_stage: targetStage,
      remarks: remarks
    });
  }

  // Generic Workflow Action
  performAction(endpoint: 'procurement' | 'request', id: number, action: string, remarks: string = '', data: any = {}): Observable<any> {
    const url = endpoint === 'procurement' ? this.procurementApiUrl : this.requestApiUrl;
    return this.http.post<any>(`${url}/${id}/perform_action/`, { action, remarks, ...data });
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('hologramDailyEntries');
    if (stored) {
      try {
        const entries = JSON.parse(stored);
        this.dailyEntriesSubject.next(entries);
      } catch (error) {
        console.error('Error loading hologram daily entries from storage:', error);
      }
    }
  }

  private saveToStorage(entries: HologramDailyEntry[]): void {
    try {
      localStorage.setItem('hologramDailyEntries', JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving hologram daily entries to storage:', error);
    }
  }

  getDailyEntries(): HologramDailyEntry[] {
    return this.dailyEntriesSubject.value;
  }

  updateDailyEntries(entries: HologramDailyEntry[]): void {
    this.dailyEntriesSubject.next(entries);
    this.saveToStorage(entries);
  }

  addDailyEntry(entry: HologramDailyEntry): void {
    const currentEntries = this.getDailyEntries();
    const updatedEntries = [...currentEntries, entry];
    this.updateDailyEntries(updatedEntries);
  }

  updateDailyEntry(updatedEntry: HologramDailyEntry): void {
    const currentEntries = this.getDailyEntries();
    const index = currentEntries.findIndex(entry => entry.id === updatedEntry.id);
    if (index !== -1) {
      currentEntries[index] = updatedEntry;
      this.updateDailyEntries(currentEntries);
    }
  }

  deleteDailyEntry(entryId: string): void {
    const currentEntries = this.getDailyEntries();
    const filteredEntries = currentEntries.filter(entry => entry.id !== entryId);
    this.updateDailyEntries(filteredEntries);
  }

  getMonthlyTotals(
    month: string,
    year: string,
    hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE'
  ): MonthlyTotals {
    const monthNumber = this.getMonthNumber(month);
    const monthKey = `${year}-${monthNumber}`;
    const entries = this.getApprovedEntriesForType(hologramType).filter(
      entry => this.getMonthKeyFromDate(entry.date) === monthKey
    );
    return this.aggregateMonthlyTotals(entries);
  }

  getMonthlyStatement(
    month: string,
    year: string,
    hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE'
  ): MonthlyStatementSummary {
    const monthNumber = this.getMonthNumber(month);
    const monthKey = `${year}-${monthNumber}`;
    const { summaries, sortedKeys, initialOpening } = this.buildMonthlyStatementCache(hologramType);

    if (summaries.has(monthKey)) {
      const summary = summaries.get(monthKey)!;
      return {
        monthKey,
        month: this.getMonthCodeFromNumber(monthNumber),
        year,
        hologramType,
        openingStock: summary.openingStock,
        freshArrival: summary.freshArrival,
        totals: summary.totals,
        closingBalance: summary.closingBalance,
        entries: summary.entries,
        arrivals: summary.arrivals
      };
    }

    const previousKey = this.findPreviousKey(sortedKeys, monthKey);
    const openingStock = previousKey
      ? summaries.get(previousKey)!.closingBalance
      : initialOpening;

    const totals = this.createEmptyMonthlyTotals();
    const freshArrival = 0;

    return {
      monthKey,
      month: this.getMonthCodeFromNumber(monthNumber),
      year,
      hologramType,
      openingStock,
      freshArrival,
      totals,
      closingBalance: openingStock,
      entries: [],
      arrivals: []
    };
  }

  private getMonthNumber(month: string): string {
    if (!month) {
      return '01';
    }
    const lower = month.toLowerCase();
    if (this.monthNumberMap[lower]) {
      return this.monthNumberMap[lower];
    }
    const numeric = parseInt(month, 10);
    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
      return numeric.toString().padStart(2, '0');
    }
    return '01';
  }

  private getMonthCodeFromNumber(monthNumber: string): string {
    const normalized = monthNumber?.padStart(2, '0');
    return this.monthCodeMap[normalized] || 'jan';
  }

  /**
   * Migrates legacy single entry data to new multiple entries structure
   */
  migrateLegacyEntry(entry: HologramDailyEntry): HologramDailyEntry {
    const migratedEntry = { ...entry };

    // Migrate issued entries
    if (!migratedEntry.issuedEntries || migratedEntry.issuedEntries.length === 0) {
      migratedEntry.issuedEntries = [];
      if (entry.issuedFromSerial && entry.issuedToSerial && entry.issuedQuantity) {
        migratedEntry.issuedEntries.push({
          id: this.generateId(),
          fromSerial: entry.issuedFromSerial,
          toSerial: entry.issuedToSerial,
          quantity: entry.issuedQuantity
        });
      }
    }

    // Migrate wastage entries
    if (!migratedEntry.wastageEntries || migratedEntry.wastageEntries.length === 0) {
      migratedEntry.wastageEntries = [];
      if (entry.wastageFromSerial && entry.wastageToSerial && entry.wastageQuantity) {
        migratedEntry.wastageEntries.push({
          id: this.generateId(),
          fromSerial: entry.wastageFromSerial,
          toSerial: entry.wastageToSerial,
          quantity: entry.wastageQuantity,
          damageReason: entry.damageReason || ''
        });
      }
    }

    return migratedEntry;
  }

  /**
   * Calculates total issued quantity from multiple entries
   */
  getTotalIssuedQuantity(entry: HologramDailyEntry): number {
    if (entry.issuedEntries && entry.issuedEntries.length > 0) {
      return entry.issuedEntries.reduce((sum, issuedEntry) => sum + issuedEntry.quantity, 0);
    }
    return entry.issuedQuantity || 0;
  }

  /**
   * Calculates total wastage quantity from multiple entries
   */
  getTotalWastageQuantity(entry: HologramDailyEntry): number {
    if (entry.wastageEntries && entry.wastageEntries.length > 0) {
      return entry.wastageEntries.reduce((sum, wastageEntry) => sum + wastageEntry.quantity, 0);
    }
    return entry.wastageQuantity || 0;
  }

  /**
   * Generates a unique ID for new entries
   */
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Validates serial range and calculates quantity
   * Inclusive calculation: from 1 to 1 = 1 hologram, from 1 to 10 = 10 holograms
   */
  calculateQuantityFromSerials(fromSerial: string, toSerial: string): number {
    if (!fromSerial || !toSerial) return 0;

    // Extract numeric parts from serials (assuming format like HG001001, EX002001, etc.)
    const fromMatch = fromSerial.match(/(\d+)$/);
    const toMatch = toSerial.match(/(\d+)$/);

    if (fromMatch && toMatch) {
      const fromNum = parseInt(fromMatch[1], 10);
      const toNum = parseInt(toMatch[1], 10);

      if (toNum >= fromNum) {
        // Inclusive range calculation: from 1 to 1 = 1, from 1 to 10 = 10
        return toNum - fromNum + 1;
      }
    }

    return 0;
  }

  /**
   * Validates that serial ranges don't overlap
   */
  validateSerialRanges(entries: (HologramIssuedEntry | HologramWastageEntry)[]): boolean {
    const ranges: Array<{ from: number, to: number }> = [];

    for (const entry of entries) {
      const fromMatch = entry.fromSerial.match(/(\d+)$/);
      const toMatch = entry.toSerial.match(/(\d+)$/);

      if (fromMatch && toMatch) {
        const fromNum = parseInt(fromMatch[1], 10);
        const toNum = parseInt(toMatch[1], 10);

        // Check for overlaps with existing ranges
        for (const range of ranges) {
          if ((fromNum >= range.from && fromNum <= range.to) ||
            (toNum >= range.from && toNum <= range.to) ||
            (fromNum <= range.from && toNum >= range.to)) {
            return false; // Overlap detected
          }
        }

        ranges.push({ from: fromNum, to: toNum });
      }
    }

    return true;
  }

  private getApprovedEntriesFromStorage(): HologramDailyEntry[] {
    const stored = localStorage.getItem(this.APPROVED_ENTRIES_KEY);
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const uniqueEntries = new Map<string, HologramDailyEntry>();

      parsed.forEach((entry: any) => {
        if (!entry?.id) {
          return;
        }

        const migrated = this.migrateLegacyEntry(entry);
        const toNumber = (value: any): number => {
          const numeric = Number(value);
          return Number.isFinite(numeric) ? numeric : 0;
        };
        const normalized: HologramDailyEntry = {
          ...migrated,
          issuedEntries: (migrated.issuedEntries || []).map(issued => ({ ...issued })),
          wastageEntries: (migrated.wastageEntries || []).map(waste => ({ ...waste })),
          issuedQuantity: toNumber(
            migrated.issuedQuantity ?? entry.issuedQuantity ?? this.getTotalIssuedQuantity(migrated)
          ),
          wastageQuantity: toNumber(
            migrated.wastageQuantity ?? entry.wastageQuantity ?? this.getTotalWastageQuantity(migrated)
          ),
          utilizedQuantity: toNumber(migrated.utilizedQuantity ?? entry.utilizedQuantity ?? 0),
          leftOverQuantity: toNumber(migrated.leftOverQuantity ?? entry.leftOverQuantity ?? 0),
          isFixed: true
        };

        const status = (entry as any).approvalStatus;
        if (status && status !== 'APPROVED') {
          return;
        }

        // CRITICAL FIX: Skip entries that are pending usage (not yet filled by user)
        // These are entries created by officer approval but not yet used
        if ((entry as any).isPendingUsage === true) {
          console.log('⏭️ Data Service: Skipping pending usage entry:', entry.id);
          return;
        }

        uniqueEntries.set(normalized.id, normalized);
      });

      const result = Array.from(uniqueEntries.values());
      result.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      return result;
    } catch (error) {
      console.error('Error parsing approved hologram entries:', error);
      return [];
    }
  }

  private getApprovedEntriesForType(
    hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE'
  ): HologramDailyEntry[] {
    return this.getApprovedEntriesFromStorage().filter(
      entry => entry.hologramType === hologramType
    );
  }

  private groupEntriesByMonth(entries: HologramDailyEntry[]): Map<string, HologramDailyEntry[]> {
    const grouped = new Map<string, HologramDailyEntry[]>();

    entries.forEach(entry => {
      const monthKey = this.getMonthKeyFromDate(entry.date);
      if (!monthKey) {
        return;
      }

      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(entry);
    });

    grouped.forEach(list => list.sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    return grouped;
  }

  private getMonthKeyFromDate(date: string | undefined): string | null {
    if (!date) {
      return null;
    }
    const match = date.match(/^(\d{4})-(\d{2})/);
    if (!match) {
      return null;
    }
    return `${match[1]}-${match[2]}`;
  }

  private aggregateMonthlyTotals(entries: HologramDailyEntry[]): MonthlyTotals {
    if (!entries || entries.length === 0) {
      return this.createEmptyMonthlyTotals();
    }

    const allIssuedEntries: HologramIssuedEntry[] = [];
    const allWastageEntries: HologramWastageEntry[] = [];

    let totalUtilized = 0;
    let totalLeftOver = 0;

    entries.forEach(entry => {
      totalUtilized += entry.utilizedQuantity || 0;
      totalLeftOver += entry.leftOverQuantity || 0;

      if (entry.issuedEntries && entry.issuedEntries.length > 0) {
        entry.issuedEntries.forEach(issued => {
          allIssuedEntries.push({ ...issued });
        });
      } else if (entry.issuedFromSerial && entry.issuedToSerial && entry.issuedQuantity) {
        allIssuedEntries.push({
          id: `${entry.id}-legacy-issued`,
          fromSerial: entry.issuedFromSerial,
          toSerial: entry.issuedToSerial,
          quantity: entry.issuedQuantity
        });
      }

      if (entry.wastageEntries && entry.wastageEntries.length > 0) {
        entry.wastageEntries.forEach(waste => {
          allWastageEntries.push({ ...waste });
        });
      } else if (entry.wastageFromSerial && entry.wastageToSerial && entry.wastageQuantity) {
        allWastageEntries.push({
          id: `${entry.id}-legacy-wastage`,
          fromSerial: entry.wastageFromSerial,
          toSerial: entry.wastageToSerial,
          quantity: entry.wastageQuantity,
          damageReason: entry.damageReason || ''
        });
      }
    });

    const totalIssued = allIssuedEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);
    const totalWastage = allWastageEntries.reduce((sum, entry) => sum + (entry.quantity || 0), 0);

    const utilizationFromSerial = allIssuedEntries.length > 0 ? allIssuedEntries[0].fromSerial : '';
    const utilizationToSerial = allIssuedEntries.length > 0
      ? allIssuedEntries[allIssuedEntries.length - 1].toSerial
      : '';
    const wastageFromSerial = allWastageEntries.length > 0 ? allWastageEntries[0].fromSerial : '';
    const wastageToSerial = allWastageEntries.length > 0
      ? allWastageEntries[allWastageEntries.length - 1].toSerial
      : '';

    return {
      totalIssued,
      totalUtilized,
      totalWastage,
      totalLeftOver,
      utilizationFromSerial,
      utilizationToSerial,
      wastageFromSerial,
      wastageToSerial
    };
  }

  private createEmptyMonthlyTotals(): MonthlyTotals {
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

  private findPreviousKey(sortedKeys: string[], targetKey: string): string | null {
    let previous: string | null = null;
    for (const key of sortedKeys) {
      if (key >= targetKey) {
        break;
      }
      previous = key;
    }
    return previous;
  }

  private getInitialOpeningStock(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): number {
    const stored = localStorage.getItem(this.INITIAL_OPENING_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const value = parsed?.[type];
        if (typeof value === 'number' && !Number.isNaN(value)) {
          return value;
        }
        if (typeof value === 'string') {
          const numeric = Number(value);
          if (!Number.isNaN(numeric)) {
            return numeric;
          }
        }
      } catch (error) {
        console.error('Error parsing initial opening stock:', error);
      }
    }
    return this.defaultInitialOpening[type];
  }

  private getArrivalRecordsFromStorage(): HologramArrivalRecord[] {
    const stored = localStorage.getItem('hologramOverviewRolls');
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item: any) => {
          const type = (item?.type || 'LOCAL').toString().toUpperCase();
          const normalizedType = ['LOCAL', 'EXPORT', 'DEFENCE'].includes(type) ? type as 'LOCAL' | 'EXPORT' | 'DEFENCE' : 'LOCAL';
          const totalCount = Number(item?.totalCount ?? item?.availableCount ?? 0);
          const receivedDate = item?.receivedDate || item?.arrivedDate || item?.date;

          if (!receivedDate || !Number.isFinite(totalCount) || totalCount <= 0) {
            return null;
          }

          return {
            id: item?.id ?? this.generateId(),
            type: normalizedType,
            totalCount,
            receivedDate,
            cartoonNumber: item?.cartoonNumber || item?.rollNumber || '',
            fromSerial: item?.fromSerial || item?.availableRange?.split('-')?.[0]?.trim() || '',
            toSerial: item?.toSerial || item?.availableRange?.split('-')?.[1]?.trim() || ''
          } as HologramArrivalRecord;
        })
        .filter((record: HologramArrivalRecord | null): record is HologramArrivalRecord => record !== null);
    } catch (error) {
      console.error('Error parsing hologramOverviewRolls:', error);
      return [];
    }
  }

  private getArrivalRecordsForType(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): HologramArrivalRecord[] {
    return this.getArrivalRecordsFromStorage().filter(record => record.type === type);
  }

  private groupArrivalsByMonth(
    arrivals: HologramArrivalRecord[]
  ): Map<string, number> {
    const grouped = new Map<string, number>();

    arrivals.forEach(record => {
      const monthKey = this.getMonthKeyFromDate(record.receivedDate);
      if (!monthKey) {
        return;
      }

      const current = grouped.get(monthKey) ?? 0;
      grouped.set(monthKey, current + record.totalCount);
    });

    return grouped;
  }

  private buildMonthlyStatementCache(
    hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE'
  ): {
    summaries: Map<string, {
      openingStock: number;
      freshArrival: number;
      totals: MonthlyTotals;
      closingBalance: number;
      entries: HologramDailyEntry[];
      arrivals: HologramArrivalRecord[];
    }>;
    sortedKeys: string[];
    initialOpening: number;
  } {
    const entries = this.getApprovedEntriesForType(hologramType);
    const grouped = this.groupEntriesByMonth(entries);
    const arrivals = this.getArrivalRecordsForType(hologramType);
    const arrivalMap = this.groupArrivalsByMonth(arrivals);
    const initialOpening = this.getInitialOpeningStock(hologramType);

    const allKeysSet = new Set<string>([...grouped.keys(), ...arrivalMap.keys()]);
    const sortedKeys = Array.from(allKeysSet).sort();

    const summaries = new Map<string, {
      openingStock: number;
      freshArrival: number;
      totals: MonthlyTotals;
      closingBalance: number;
      entries: HologramDailyEntry[];
      arrivals: HologramArrivalRecord[];
    }>();

    let runningClosing = initialOpening;

    sortedKeys.forEach(key => {
      const monthEntries = grouped.get(key) || [];
      const totals = this.aggregateMonthlyTotals(monthEntries);
      const freshArrival = arrivalMap.get(key) ?? 0;
      const monthArrivals = arrivals.filter(record => this.getMonthKeyFromDate(record.receivedDate) === key);
      const openingStock = runningClosing;
      const closingBalance = openingStock + freshArrival - totals.totalIssued - totals.totalWastage;

      summaries.set(key, {
        openingStock,
        freshArrival,
        totals,
        closingBalance,
        entries: monthEntries,
        arrivals: monthArrivals
      });

      runningClosing = closingBalance;
    });

    return {
      summaries,
      sortedKeys,
      initialOpening
    };
  }
  // --- Daily Register Integration ---

  /**
   * Save Daily Register Entry to Backend
   */
  saveDailyRegisterEntry(entryData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/daily-register/`, entryData);
  }

  /**
   * Fetch Daily Register Entries from Backend
   */
  getDailyRegisterEntries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/daily-register/`);
  }

  getRollsDetails(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/rolls-details/`);
  }
}