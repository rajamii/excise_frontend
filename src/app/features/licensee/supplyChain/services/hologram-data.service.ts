import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface HologramDailyEntry {
  id: string;
  date: string;
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  issuedFromSerial: string;
  issuedToSerial: string;
  issuedQuantity: number;
  utilizedQuantity: number;
  wastageFromSerial: string;
  wastageToSerial: string;
  wastageQuantity: number;
  leftOverQuantity: number;
  damageReason: string;
  isFixed: boolean;
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

@Injectable({
  providedIn: 'root'
})
export class HologramDataService {
  private dailyEntriesSubject = new BehaviorSubject<HologramDailyEntry[]>([]);
  public dailyEntries$ = this.dailyEntriesSubject.asObservable();

  constructor() {
    // Load initial data from localStorage if available
    this.loadFromStorage();
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
    const entries = this.getDailyEntries();
    const monthNumber = this.getMonthNumber(month);

    const filteredEntries = entries.filter(entry =>
      entry.hologramType === hologramType &&
      entry.date.startsWith(`${year}-${monthNumber}`) &&
      entry.isFixed // Only include saved entries
    );

    let totalIssued = 0;
    let totalUtilized = 0;
    let totalWastage = 0;
    let totalLeftOver = 0;

    let utilizationFromSerial = '';
    let utilizationToSerial = '';
    let wastageFromSerial = '';
    let wastageToSerial = '';

    if (filteredEntries.length > 0) {
      // Find first and last utilization serials
      const utilizationEntries = filteredEntries.filter(e => e.utilizedQuantity > 0);
      if (utilizationEntries.length > 0) {
        utilizationFromSerial = utilizationEntries[0].issuedFromSerial;
        utilizationToSerial = utilizationEntries[utilizationEntries.length - 1].issuedToSerial;
      }

      // Find first and last wastage serials
      const wastageEntries = filteredEntries.filter(e => e.wastageQuantity > 0);
      if (wastageEntries.length > 0) {
        wastageFromSerial = wastageEntries[0].wastageFromSerial;
        wastageToSerial = wastageEntries[wastageEntries.length - 1].wastageToSerial;
      }

      // Calculate totals
      totalIssued = filteredEntries.reduce((sum, entry) => sum + entry.issuedQuantity, 0);
      totalUtilized = filteredEntries.reduce((sum, entry) => sum + entry.utilizedQuantity, 0);
      totalWastage = filteredEntries.reduce((sum, entry) => sum + entry.wastageQuantity, 0);
      totalLeftOver = filteredEntries.reduce((sum, entry) => sum + entry.leftOverQuantity, 0);
    }

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

  private getMonthNumber(month: string): string {
    const months: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    return months[month] || '01';
  }
}