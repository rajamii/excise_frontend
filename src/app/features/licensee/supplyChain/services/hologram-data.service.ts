import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
      // Collect all issued entries from all daily entries
      const allIssuedEntries: HologramIssuedEntry[] = [];
      const allWastageEntries: HologramWastageEntry[] = [];

      filteredEntries.forEach(entry => {
        // Handle new multiple entries structure
        if (entry.issuedEntries && entry.issuedEntries.length > 0) {
          allIssuedEntries.push(...entry.issuedEntries);
        } else if (entry.issuedFromSerial && entry.issuedToSerial && entry.issuedQuantity) {
          // Handle legacy single entry
          allIssuedEntries.push({
            id: `${entry.id}-legacy-issued`,
            fromSerial: entry.issuedFromSerial,
            toSerial: entry.issuedToSerial,
            quantity: entry.issuedQuantity
          });
        }

        if (entry.wastageEntries && entry.wastageEntries.length > 0) {
          allWastageEntries.push(...entry.wastageEntries);
        } else if (entry.wastageFromSerial && entry.wastageToSerial && entry.wastageQuantity) {
          // Handle legacy single entry
          allWastageEntries.push({
            id: `${entry.id}-legacy-wastage`,
            fromSerial: entry.wastageFromSerial,
            toSerial: entry.wastageToSerial,
            quantity: entry.wastageQuantity,
            damageReason: entry.damageReason || ''
          });
        }
      });

      // Find first and last utilization serials
      if (allIssuedEntries.length > 0) {
        utilizationFromSerial = allIssuedEntries[0].fromSerial;
        utilizationToSerial = allIssuedEntries[allIssuedEntries.length - 1].toSerial;
      }

      // Find first and last wastage serials
      if (allWastageEntries.length > 0) {
        wastageFromSerial = allWastageEntries[0].fromSerial;
        wastageToSerial = allWastageEntries[allWastageEntries.length - 1].toSerial;
      }

      // Calculate totals
      totalIssued = allIssuedEntries.reduce((sum, entry) => sum + entry.quantity, 0);
      totalUtilized = filteredEntries.reduce((sum, entry) => sum + entry.utilizedQuantity, 0);
      totalWastage = allWastageEntries.reduce((sum, entry) => sum + entry.quantity, 0);
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
    const ranges: Array<{from: number, to: number}> = [];
    
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
}