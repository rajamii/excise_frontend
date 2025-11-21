import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MonthlyhologramstatementOICComponent } from '../monthlyhologramstatement-oic/monthlyhologramstatement-oic.component';

interface RollBreakdown {
  rollName: string;
  allocatedQty: number;
  allocatedRanges: Array<{ fromSerial: string; toSerial: string }>; // All allocated ranges for this roll
  issuedQty: number;
  issuedRanges: any[];
  wastageQty: number;
  wastageRanges: any[];
  leftOver: number;
  totalUsed: number;
  damageReason?: string; // Per-roll damage reason
}

interface PendingEntry {
  id: string;
  date: string;
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  referenceNo: string;
  brandDetails: {
    brandName: string;
    alcoholPercent: string;
    sizeMl: number;
    liquorType: string;
  };
  bottleSize: string;
  hologramQty: number;
  issuedFromSerial: string;
  issuedToSerial: string;
  issuedQuantity: number;
  wastageFromSerial: string;
  wastageToSerial: string;
  wastageQuantity: number;
  leftOverQuantity: number;
  damageReason: string;
  submittedBy: string;
  submittedAt: string;
  cartoonNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  lockedRolls: any[];
  issuedEntries: any[];
  wastageEntries: any[];
}

@Component({
  selector: 'app-hologram-manufacturing-register',
  standalone: true,
  imports: [CommonModule, FormsModule, MonthlyhologramstatementOICComponent],
  templateUrl: './hologram-manufacturing-register.component.html',
  styleUrl: './hologram-manufacturing-register.component.scss'
})
export class HologramManufacturingRegisterComponent implements OnInit {
  private rollColorMap: Map<string, number> = new Map();
  private nextColorIndex = 0;

  activeTab: 'verification' | 'monthly-statement' = 'verification';
  pendingEntries: PendingEntry[] = [];
  filteredEntries: PendingEntry[] = [];
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';
  selectedMonth = 'nov';
  selectedYear = '2025';
  selectedDate = new Date().toISOString().split('T')[0];
  selectedStatus: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING'; // Add status filter
  
  // Pagination
  pageSize = 10;
  currentPage = 1;
  
  // Entry to approve/reject
  entryToProcess: PendingEntry | null = null;
  rejectionReason = '';
  
  // Entry for roll details modal
  entryForRollDetails: PendingEntry | null = null;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    const now = new Date();
    this.selectedDate = now.toISOString().split('T')[0];
    this.selectedMonth = now.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    this.selectedYear = now.getFullYear().toString();
  }

  ngOnInit(): void {
    this.loadPendingEntries();
    this.loadFilteredData();
    
    // Auto-refresh every 30 seconds to check for new entries
    setInterval(() => {
      this.loadPendingEntries();
      this.loadFilteredData();
    }, 30000);
  }

  loadPendingEntries(): void {
    // Load entries from localStorage that were saved by supply chain users
    const savedEntries = JSON.parse(localStorage.getItem('dailyRegisterEntries') || '[]');
    
    // Load ALL entries (PENDING, APPROVED, REJECTED) so officer can see history
    // Filter only entries that are marked as fixed (saved)
    this.pendingEntries = savedEntries
      .filter((entry: any) => entry.isFixed)
      .map((entry: any) => ({
        id: entry.id,
        date: entry.date,
        hologramType: entry.hologramType,
        referenceNo: entry.referenceNo || 'Manual Entry',
        brandDetails: entry.brandDetails || { brandName: 'N/A', alcoholPercent: 'N/A', sizeMl: 0, liquorType: 'N/A' },
        bottleSize: entry.bottleSize || 'N/A',
        hologramQty: entry.utilizedQuantity || 0,
        issuedFromSerial: entry.issuedFromSerial || '',
        issuedToSerial: entry.issuedToSerial || '',
        issuedQuantity: entry.issuedQuantity || 0,
        wastageFromSerial: entry.wastageFromSerial || '',
        wastageToSerial: entry.wastageToSerial || '',
        wastageQuantity: entry.wastageQuantity || 0,
        leftOverQuantity: entry.leftOverQuantity || 0,
        damageReason: entry.damageReason || '',
        submittedBy: entry.savedBy || 'Supply Chain User',
        submittedAt: entry.savedAt || new Date().toISOString(),
        cartoonNumber: entry.cartoonNumber || 'N/A',
        status: entry.approvalStatus || 'PENDING',
        // IMPORTANT: Include locked rolls data for detailed breakdown
        // Ensure lockedRolls preserve all properties including damageReason
        lockedRolls: (entry.lockedRolls || []).map((roll: any) => ({
          ...roll,
          damageReason: roll.damageReason || entry.damageReason || '' // Preserve per-roll damage reason with fallback
        })),
        issuedEntries: entry.issuedEntries || [],
        wastageEntries: entry.wastageEntries || []
      }));
    
    console.log('Loaded pending entries:', this.pendingEntries.length);
  }

  loadFilteredData(): void {
    const monthNumber = this.getMonthNumber(this.selectedMonth);
    const datePrefix = `${this.selectedYear}-${monthNumber}`;
    
    this.filteredEntries = this.pendingEntries.filter(entry => {
      const typeMatch = entry.hologramType === this.selectedHologramType;
      
      let dateMatch = false;
      if (this.selectedDate) {
        dateMatch = entry.date === this.selectedDate;
      } else {
        dateMatch = entry.date.startsWith(datePrefix);
      }
      
      // Add status filter
      const statusMatch = this.selectedStatus === 'ALL' || entry.status === this.selectedStatus;
      
      return typeMatch && dateMatch && statusMatch;
    });
    
    console.log('Filtered entries:', this.filteredEntries.length);
  }

  getMonthNumber(month: string): string {
    const months: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    return months[month] || '01';
  }

  onMonthYearChange(): void {
    this.loadFilteredData();
    this.currentPage = 1;
  }

  onDateFilterChange(): void {
    this.loadFilteredData();
    this.currentPage = 1;
  }

  onHologramTypeChange(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): void {
    this.selectedHologramType = type;
    this.loadFilteredData();
    this.currentPage = 1;
  }

  onStatusChange(status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'): void {
    this.selectedStatus = status;
    this.loadFilteredData();
    this.currentPage = 1;
  }

  hasActiveFilters(): boolean {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    const currentYear = new Date().getFullYear().toString();
    
    return this.selectedDate !== today || 
           this.selectedMonth !== currentMonth || 
           this.selectedYear !== currentYear;
  }

  clearAllFilters(): void {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.selectedMonth = new Date().toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    this.selectedYear = new Date().getFullYear().toString();
    
    this.loadFilteredData();
    this.currentPage = 1;
  }

  getCurrentHologramTypeDisplay(): string {
    const monthNames: { [key: string]: string } = {
      'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
      'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
      'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
    };
    return `${monthNames[this.selectedMonth]} ${this.selectedYear} - ${this.selectedHologramType}`;
  }

  // Pagination
  getTotalPages(): number {
    return Math.ceil(this.filteredEntries.length / this.pageSize);
  }

  getPagedEntries(): PendingEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEntries.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
    }
  }

  // Approve entry
  openApprovalModal(entry: PendingEntry): void {
    this.entryToProcess = entry;
    const modalElement = document.getElementById('approvalModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  confirmApproval(): void {
    if (!this.entryToProcess) return;
    
    const entry = this.entryToProcess;
    
    // Update the entry status in localStorage
    const savedEntries = JSON.parse(localStorage.getItem('dailyRegisterEntries') || '[]');
    const entryIndex = savedEntries.findIndex((e: any) => e.id === entry.id);
    
    if (entryIndex !== -1) {
      savedEntries[entryIndex].approvalStatus = 'APPROVED';
      savedEntries[entryIndex].approvedBy = 'Officer In Charge';
      savedEntries[entryIndex].approvedAt = new Date().toISOString();
      
      localStorage.setItem('dailyRegisterEntries', JSON.stringify(savedEntries));
      
      // UPDATE the existing entry in approvedHologramEntries with lockedRolls data
      // This ensures the Monthly Statement shows the correct serial ranges
      // DO NOT create a new entry - just update the existing one
      const approvedEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
      const approvedIndex = approvedEntries.findIndex((e: any) => 
        e.referenceNo === savedEntries[entryIndex].referenceNo && 
        e.date === savedEntries[entryIndex].date
      );
      
      if (approvedIndex !== -1) {
        // UPDATE existing entry with lockedRolls data (preserves serial ranges)
        console.log('✅ Updating existing approved entry with lockedRolls data:', savedEntries[entryIndex].referenceNo);
        approvedEntries[approvedIndex] = {
          ...approvedEntries[approvedIndex],
          ...savedEntries[entryIndex],
          // Ensure lockedRolls data is preserved
          lockedRolls: savedEntries[entryIndex].lockedRolls || approvedEntries[approvedIndex].lockedRolls || [],
          // Mark that utilization has been approved
          utilizationApproved: true
        };
        localStorage.setItem('approvedHologramEntries', JSON.stringify(approvedEntries));
        console.log('✅ Serial ranges preserved in approved entry');
      } else {
        console.log('⚠️ No existing approved entry found to update');
      }
      
      // AUTOMATIC WORKFLOW: Update roll data and move issued holograms to history
      this.updateRollDataAfterApproval(savedEntries[entryIndex]);
      
      // AUTOMATIC WORKFLOW: Move issued hologram to history
      this.moveIssuedHologramToHistory(savedEntries[entryIndex]);
      
      // SAVE COMPLETION DATA FOR DAILY HOLOGRAM RECORD REGISTER
      this.saveCompletionToManufacturingRegister(savedEntries[entryIndex]);
    }
    
    // Close modal
    const modalElement = document.getElementById('approvalModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    }
    
    // Refresh data
    this.loadPendingEntries();
    this.loadFilteredData();
    
    // Get roll count for success message
    const lockedRolls = savedEntries[entryIndex].lockedRolls || [];
    const rollCount = lockedRolls.length || (savedEntries[entryIndex].cartoonNumber ? 1 : 0);
    const rollText = rollCount === 1 ? 'roll' : 'rolls';
    
    this.entryToProcess = null;
    
    alert(`✅ Entry approved successfully! ${rollCount} ${rollText} automatically updated. Roll status set to AVAILABLE/COMPLETED and issued holograms moved to history.`);
  }

  /**
   * Update roll data in hologram overview after Officer approval
   * Updates Rolls, Available Hologram Data, Serial Numbers Data, Issued Hologram, and Issued History
   * HANDLES MULTIPLE ROLLS: Processes each locked roll separately
   */
  private updateRollDataAfterApproval(entry: any): void {
    try {
      const lockedRolls = entry.lockedRolls || [];
      
      // If no locked rolls, fallback to single cartoon number (backward compatibility)
      if (lockedRolls.length === 0) {
        const cartoonNumber = entry.cartoonNumber;
        if (!cartoonNumber) {
          console.warn('No cartoon number or locked rolls found in entry, skipping roll data update');
          return;
        }
        
        console.log('Updating single roll data after approval for:', cartoonNumber);
        this.updateRollsData(entry, cartoonNumber);
        this.updateAvailableHologramData(entry, cartoonNumber);
        this.updateSerialNumbersData(entry, cartoonNumber);
        return;
      }
      
      console.log(`Updating roll data after approval for ${lockedRolls.length} roll(s):`, 
        lockedRolls.map((r: any) => r.cartoonNumber));
      
      // Process each locked roll separately
      lockedRolls.forEach((lockedRoll: any) => {
        const cartoonNumber = lockedRoll.cartoonNumber;
        if (!cartoonNumber) {
          console.warn('Skipping roll without cartoon number:', lockedRoll);
          return;
        }
        
        console.log(`Processing roll ${cartoonNumber}...`);
        
        // Create a roll-specific entry object with this roll's data
        const rollEntry = {
          ...entry,
          cartoonNumber: cartoonNumber,
          issuedQuantity: lockedRoll.issuedQty || 0,
          wastageQuantity: lockedRoll.wastageQty || 0,
          leftOverQuantity: lockedRoll.leftOver || 0,
          issuedFromSerial: lockedRoll.issuedRanges?.[0]?.fromSerial || '',
          issuedToSerial: lockedRoll.issuedRanges?.[lockedRoll.issuedRanges.length - 1]?.toSerial || '',
          wastageFromSerial: lockedRoll.wastageRanges?.[0]?.fromSerial || '',
          wastageToSerial: lockedRoll.wastageRanges?.[lockedRoll.wastageRanges.length - 1]?.toSerial || '',
          issuedEntries: lockedRoll.issuedRanges?.map((r: any) => ({
            fromSerial: r.fromSerial,
            toSerial: r.toSerial,
            quantity: r.quantity || 0
          })) || [],
          wastageEntries: lockedRoll.wastageRanges?.map((r: any) => ({
            fromSerial: r.fromSerial,
            toSerial: r.toSerial,
            quantity: r.quantity || 0,
            damageReason: lockedRoll.damageReason || r.damageReason || ''
          })) || [],
          damageReason: lockedRoll.damageReason || '' // Per-roll damage reason
        };
        
        // Update all tabs for this specific roll
        this.updateRollsData(rollEntry, cartoonNumber);
        this.updateAvailableHologramData(rollEntry, cartoonNumber);
        this.updateSerialNumbersData(rollEntry, cartoonNumber);
      });
      
      console.log('All roll data updated successfully after approval');
      
    } catch (error) {
      console.error('Error updating roll data after approval:', error);
    }
  }

  /**
   * Update Rolls Tab Data
   * Logic: Only subtract (issued + wastage) from available
   * Leftover quantity automatically remains in available stock
   */
  private updateRollsData(entry: any, cartoonNumber: string): void {
    try {
      const rollsData = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
      
      const rollIndex = rollsData.findIndex((roll: any) => 
        roll.cartoonNumber === cartoonNumber && 
        roll.type === entry.hologramType
      );
      
      if (rollIndex === -1) {
        console.warn(`Roll not found for cartoon number: ${cartoonNumber}`);
        return;
      }
      
      const roll = rollsData[rollIndex];
      
      console.log(`Updating roll ${cartoonNumber}:`, {
        before: {
          available: roll.availableCount,
          used: roll.usedCount,
          damaged: roll.damagedCount
        },
        changes: {
          issued: entry.issuedQuantity || 0,
          wastage: entry.wastageQuantity || 0,
          leftover: entry.leftOverQuantity || 0
        }
      });
      
      // IMPORTANT: When officer allocated, the entire amount was subtracted from available
      // Now we need to update counts based on what was actually used
      const leftoverQuantity = entry.leftOverQuantity || 0;
      
      // Calculate total issued and wastage quantities from arrays if available, otherwise use single values
      const totalIssuedQty = entry.issuedEntries && entry.issuedEntries.length > 0
        ? entry.issuedEntries.reduce((sum: number, e: any) => sum + (e.quantity || 0), 0)
        : (entry.issuedQuantity || 0);
      
      const totalWastageQty = entry.wastageEntries && entry.wastageEntries.length > 0
        ? entry.wastageEntries.reduce((sum: number, e: any) => sum + (e.quantity || 0), 0)
        : (entry.wastageQuantity || 0);
      
      // Update counts - increment used and damaged
      roll.usedCount = (roll.usedCount || 0) + totalIssuedQty;
      roll.damagedCount = (roll.damagedCount || 0) + totalWastageQty;
      
      // Recalculate availableCount from total to ensure accuracy (same formula as Serial Numbers Data)
      // This ensures consistency between Rolls tab and Serial Numbers Data tab
      const totalCount = roll.totalCount || 0;
      const totalUsed = (roll.usedCount || 0) + (roll.damagedCount || 0);
      roll.availableCount = Math.max(0, totalCount - totalUsed);
      
      console.log(`After update:`, {
        totalCount: totalCount,
        used: roll.usedCount,
        damaged: roll.damagedCount,
        available: roll.availableCount,
        addedIssued: totalIssuedQty,
        addedWastage: totalWastageQty,
        calculated: `totalCount (${totalCount}) - usedCount (${roll.usedCount}) - damagedCount (${roll.damagedCount}) = ${roll.availableCount}`
      });
      
      // Update status based on available count
      if (roll.availableCount === 0) {
        roll.status = 'COMPLETED'; // All holograms used up
      } else {
        roll.status = 'AVAILABLE'; // Still has holograms available for use
      }
      
      // Add usage history entry with request reference number
      // Handle multiple issued/wastage ranges from locked rolls
      if (!roll.usageHistory) {
        roll.usageHistory = [];
      }
      
      // Add all issued ranges to history
      const issuedEntries = entry.issuedEntries || [];
      if (issuedEntries.length > 0) {
        issuedEntries.forEach((issuedEntry: any) => {
          roll.usageHistory.push({
            date: entry.date,
            referenceNo: entry.referenceNo || 'N/A',
            brandName: entry.brandDetails?.brandName || 'N/A',
            type: 'ISSUED',
            issuedFromSerial: issuedEntry.fromSerial || '',
            issuedToSerial: issuedEntry.toSerial || '',
            issuedQuantity: issuedEntry.quantity || 0,
            approvedBy: 'Officer In Charge',
            approvedAt: new Date().toISOString()
          });
        });
      } else {
        // Fallback to single range if no issuedEntries
        roll.usageHistory.push({
          date: entry.date,
          referenceNo: entry.referenceNo || 'N/A',
          brandName: entry.brandDetails?.brandName || 'N/A',
          type: 'ISSUED',
          issuedFromSerial: entry.issuedFromSerial || '',
          issuedToSerial: entry.issuedToSerial || '',
          issuedQuantity: entry.issuedQuantity || 0,
          approvedBy: 'Officer In Charge',
          approvedAt: new Date().toISOString()
        });
      }
      
      // Add all wastage ranges to history
      const wastageEntries = entry.wastageEntries || [];
      if (wastageEntries.length > 0) {
        wastageEntries.forEach((wastageEntry: any) => {
          roll.usageHistory.push({
            date: entry.date,
            referenceNo: entry.referenceNo || 'N/A',
            brandName: entry.brandDetails?.brandName || 'N/A',
            type: 'WASTAGE',
            wastageFromSerial: wastageEntry.fromSerial || '',
            wastageToSerial: wastageEntry.toSerial || '',
            wastageQuantity: wastageEntry.quantity || 0,
            damageReason: wastageEntry.damageReason || entry.damageReason || '',
            approvedBy: 'Officer In Charge',
            approvedAt: new Date().toISOString()
          });
        });
      } else if (entry.wastageQuantity > 0) {
        // Fallback to single range if no wastageEntries but wastage exists
        roll.usageHistory.push({
          date: entry.date,
          referenceNo: entry.referenceNo || 'N/A',
          brandName: entry.brandDetails?.brandName || 'N/A',
          type: 'WASTAGE',
          wastageFromSerial: entry.wastageFromSerial || '',
          wastageToSerial: entry.wastageToSerial || '',
          wastageQuantity: entry.wastageQuantity || 0,
          damageReason: entry.damageReason || '',
          approvedBy: 'Officer In Charge',
          approvedAt: new Date().toISOString()
        });
      }
      
      rollsData[rollIndex] = roll;
      localStorage.setItem('hologramOverviewRolls', JSON.stringify(rollsData));
      
      console.log('Rolls data updated successfully with usage history');
    } catch (error) {
      console.error('Error updating rolls data:', error);
    }
  }

  /**
   * Update Available Hologram Data Tab
   */
  private updateAvailableHologramData(entry: any, cartoonNumber: string): void {
    try {
      const availableData = JSON.parse(localStorage.getItem('hologramOverviewAvailable') || '[]');
      
      const availableIndex = availableData.findIndex((item: any) => 
        item.cartoonNumber === cartoonNumber && 
        item.type === entry.hologramType
      );
      
      if (availableIndex !== -1) {
        const available = availableData[availableIndex];
        
        // Add back leftover to available (it was subtracted during allocation but not used)
        const leftoverQuantity = entry.leftOverQuantity || 0;
        available.availableCount = (available.availableCount || 0) + leftoverQuantity;
        
        // Get the original total count from the rolls data to calculate percentage correctly
        const rollsData = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
        const correspondingRoll = rollsData.find((roll: any) => 
          roll.cartoonNumber === cartoonNumber && 
          roll.type === entry.hologramType
        );
        
        // Calculate percentage based on original total count from roll
        if (correspondingRoll && correspondingRoll.totalCount > 0) {
          available.percentage = Math.round((available.availableCount / correspondingRoll.totalCount) * 100);
        } else {
          // Fallback: if no roll found, percentage is 100% if we have any available, 0% otherwise
          available.percentage = available.availableCount > 0 ? 100 : 0;
        }
        
        // Update status based on available count
        if (available.availableCount === 0) {
          available.status = 'COMPLETED'; // All holograms used up
        } else {
          available.status = 'AVAILABLE'; // Still has holograms available for use
        }
        
        availableData[availableIndex] = available;
        localStorage.setItem('hologramOverviewAvailable', JSON.stringify(availableData));
        
        console.log('Available hologram data updated - added back leftover:', leftoverQuantity, 'percentage:', available.percentage);
      }
    } catch (error) {
      console.error('Error updating available hologram data:', error);
    }
  }

  /**
   * Update Serial Numbers Data Tab
   */
  /**
   * Helper function to find which cartoon number a serial number belongs to
   */
  private findCartoonNumberForSerial(serialNumber: string, hologramType: string, serialData: any[]): string | null {
    if (!serialNumber) return null;
    
    // Extract numeric part from serial number
    const serialMatch = serialNumber.match(/(\d+)$/);
    if (!serialMatch) return null;
    
    const serialNum = parseInt(serialMatch[1], 10);
    
    // Find the cartoon number that contains this serial number
    for (const roll of serialData) {
      if (roll.hologramType !== hologramType) continue;
      
      // Extract numeric parts from roll's serial range
      const fromMatch = roll.fromSerial?.match(/(\d+)$/);
      const toMatch = roll.toSerial?.match(/(\d+)$/);
      
      if (fromMatch && toMatch) {
        const fromNum = parseInt(fromMatch[1], 10);
        const toNum = parseInt(toMatch[1], 10);
        
        // Check if serial number falls within this roll's range
        if (serialNum >= fromNum && serialNum <= toNum) {
          return roll.rollNumber;
        }
      }
    }
    
    return null;
  }

  /**
   * Helper function to store a serial range in the correct cartoon number
   */
  private storeSerialRangeInCorrectCartoon(
    serialData: any[],
    range: { fromSerial: string; toSerial: string; quantity: number },
    entry: any,
    type: 'ISSUED' | 'WASTAGE'
  ): void {
    // Find which cartoon number the fromSerial belongs to
    const cartoonNumber = this.findCartoonNumberForSerial(range.fromSerial, entry.hologramType, serialData);
    
    if (!cartoonNumber) {
      console.warn(`Could not find cartoon number for serial range: ${range.fromSerial} - ${range.toSerial}`);
      return;
    }
    
    // Find the serial roll for this cartoon number
    const serialIndex = serialData.findIndex((roll: any) => 
      roll.rollNumber === cartoonNumber && 
      roll.hologramType === entry.hologramType
    );
    
    if (serialIndex === -1) {
      console.warn(`Serial roll not found for cartoon number: ${cartoonNumber}`);
      return;
    }
    
    const serialRoll = serialData[serialIndex];
    
    // Initialize usage history if needed
    if (!serialRoll.usageHistory) {
      serialRoll.usageHistory = [];
    }
    
    // Store the range in the correct cartoon number's history
    if (type === 'ISSUED') {
      serialRoll.usageHistory.push({
        date: entry.date,
        referenceNo: entry.referenceNo || 'N/A',
        brandName: entry.brandDetails?.brandName || 'N/A',
        type: 'ISSUED',
        issuedFromSerial: range.fromSerial || '',
        issuedToSerial: range.toSerial || '',
        issuedQuantity: range.quantity || 0,
        approvedBy: 'Officer In Charge',
        approvedAt: new Date().toISOString(),
        cartoonNumber: cartoonNumber
      });
      
      // Update counts for this cartoon number
      serialRoll.usedCount = (serialRoll.usedCount || 0) + (range.quantity || 0);
    } else {
      serialRoll.usageHistory.push({
        date: entry.date,
        referenceNo: entry.referenceNo || 'N/A',
        brandName: entry.brandDetails?.brandName || 'N/A',
        type: 'WASTAGE',
        wastageFromSerial: range.fromSerial || '',
        wastageToSerial: range.toSerial || '',
        wastageQuantity: range.quantity || 0,
        approvedBy: 'Officer In Charge',
        approvedAt: new Date().toISOString(),
        cartoonNumber: cartoonNumber
      });
      
      // Update counts for this cartoon number
      serialRoll.damagedCount = (serialRoll.damagedCount || 0) + (range.quantity || 0);
    }
    
    // Update available count
    const totalUsed = (serialRoll.usedCount || 0) + (serialRoll.damagedCount || 0);
    const totalCount = serialRoll.totalCount || 0;
    serialRoll.availableCount = Math.max(0, totalCount - totalUsed);
    
    // Update status
    if (serialRoll.availableCount === 0) {
      serialRoll.status = 'COMPLETED';
    } else {
      serialRoll.status = 'AVAILABLE';
    }
    
    serialData[serialIndex] = serialRoll;
  }

  private updateSerialNumbersData(entry: any, cartoonNumber: string): void {
    try {
      const serialData = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');
      
      // Find the serial roll for this specific cartoon number
      const serialIndex = serialData.findIndex((roll: any) => 
        roll.rollNumber === cartoonNumber && 
        roll.hologramType === entry.hologramType
      );
      
      if (serialIndex === -1) {
        console.warn(`Serial roll not found for cartoon number: ${cartoonNumber}, type: ${entry.hologramType}`);
        return;
      }
      
      const serialRoll = serialData[serialIndex];
      
      // Initialize usage history if needed
      if (!serialRoll.usageHistory) {
        serialRoll.usageHistory = [];
      }
      
      console.log(`Updating serial numbers data for cartoon ${cartoonNumber}:`, {
        issuedEntries: entry.issuedEntries?.length || 0,
        wastageEntries: entry.wastageEntries?.length || 0
      });
      
      // Process issued ranges - store directly in this cartoon number's usage history
      const issuedEntries = entry.issuedEntries || [];
      if (issuedEntries.length > 0) {
        issuedEntries.forEach((issuedEntry: any) => {
          if (issuedEntry.fromSerial && issuedEntry.toSerial && issuedEntry.quantity > 0) {
            serialRoll.usageHistory.push({
              date: entry.date,
              referenceNo: entry.referenceNo || 'N/A',
              brandName: entry.brandDetails?.brandName || 'N/A',
              type: 'ISSUED',
              issuedFromSerial: issuedEntry.fromSerial,
              issuedToSerial: issuedEntry.toSerial,
              issuedQuantity: issuedEntry.quantity || 0,
              approvedBy: 'Officer In Charge',
              approvedAt: new Date().toISOString(),
              cartoonNumber: cartoonNumber // Store the correct cartoon number
            });
            
            // Update counts for this cartoon number
            serialRoll.usedCount = (serialRoll.usedCount || 0) + (issuedEntry.quantity || 0);
            
            console.log(`Added ISSUED range to ${cartoonNumber}:`, issuedEntry.fromSerial, '-', issuedEntry.toSerial, 'qty:', issuedEntry.quantity);
          }
        });
      } else if (entry.issuedQuantity > 0 && entry.issuedFromSerial && entry.issuedToSerial) {
        // Fallback to single range if no issuedEntries
        serialRoll.usageHistory.push({
          date: entry.date,
          referenceNo: entry.referenceNo || 'N/A',
          brandName: entry.brandDetails?.brandName || 'N/A',
          type: 'ISSUED',
          issuedFromSerial: entry.issuedFromSerial,
          issuedToSerial: entry.issuedToSerial,
          issuedQuantity: entry.issuedQuantity || 0,
          approvedBy: 'Officer In Charge',
          approvedAt: new Date().toISOString(),
          cartoonNumber: cartoonNumber // Store the correct cartoon number
        });
        
        serialRoll.usedCount = (serialRoll.usedCount || 0) + (entry.issuedQuantity || 0);
        console.log(`Added single ISSUED range to ${cartoonNumber}:`, entry.issuedFromSerial, '-', entry.issuedToSerial);
      }
      
      // Process wastage ranges - store directly in this cartoon number's usage history
      const wastageEntries = entry.wastageEntries || [];
      if (wastageEntries.length > 0) {
        wastageEntries.forEach((wastageEntry: any) => {
          if (wastageEntry.fromSerial && wastageEntry.toSerial && wastageEntry.quantity > 0) {
            serialRoll.usageHistory.push({
              date: entry.date,
              referenceNo: entry.referenceNo || 'N/A',
              brandName: entry.brandDetails?.brandName || 'N/A',
              type: 'WASTAGE',
              wastageFromSerial: wastageEntry.fromSerial,
              wastageToSerial: wastageEntry.toSerial,
              wastageQuantity: wastageEntry.quantity || 0,
              damageReason: wastageEntry.damageReason || entry.damageReason || '',
              approvedBy: 'Officer In Charge',
              approvedAt: new Date().toISOString(),
              cartoonNumber: cartoonNumber // Store the correct cartoon number
            });
            
            // Update counts for this cartoon number
            serialRoll.damagedCount = (serialRoll.damagedCount || 0) + (wastageEntry.quantity || 0);
            
            console.log(`Added WASTAGE range to ${cartoonNumber}:`, wastageEntry.fromSerial, '-', wastageEntry.toSerial, 'qty:', wastageEntry.quantity, 'damage:', wastageEntry.damageReason);
          }
        });
      } else if (entry.wastageQuantity > 0 && entry.wastageFromSerial && entry.wastageToSerial) {
        // Fallback to single range if no wastageEntries but wastage exists
        serialRoll.usageHistory.push({
          date: entry.date,
          referenceNo: entry.referenceNo || 'N/A',
          brandName: entry.brandDetails?.brandName || 'N/A',
          type: 'WASTAGE',
          wastageFromSerial: entry.wastageFromSerial,
          wastageToSerial: entry.wastageToSerial,
          wastageQuantity: entry.wastageQuantity || 0,
          damageReason: entry.damageReason || '',
          approvedBy: 'Officer In Charge',
          approvedAt: new Date().toISOString(),
          cartoonNumber: cartoonNumber // Store the correct cartoon number
        });
        
        serialRoll.damagedCount = (serialRoll.damagedCount || 0) + (entry.wastageQuantity || 0);
        console.log(`Added single WASTAGE range to ${cartoonNumber}:`, entry.wastageFromSerial, '-', entry.wastageToSerial, 'damage:', entry.damageReason);
      }
      
      // Update available count and status
      const totalUsed = (serialRoll.usedCount || 0) + (serialRoll.damagedCount || 0);
      const totalCount = serialRoll.totalCount || 0;
      const leftoverQuantity = entry.leftOverQuantity || 0;
      serialRoll.availableCount = Math.max(0, totalCount - totalUsed + leftoverQuantity);
      
      if (serialRoll.availableCount === 0) {
        serialRoll.status = 'COMPLETED';
      } else {
        serialRoll.status = 'AVAILABLE';
      }
      
      serialData[serialIndex] = serialRoll;
      
      // Save all changes
      localStorage.setItem('hologramOverviewSerialData', JSON.stringify(serialData));
      
      console.log(`Serial numbers data updated for cartoon ${cartoonNumber}:`, {
        usedCount: serialRoll.usedCount,
        damagedCount: serialRoll.damagedCount,
        availableCount: serialRoll.availableCount,
        usageHistoryCount: serialRoll.usageHistory.length
      });
    } catch (error) {
      console.error('Error updating serial numbers data:', error);
    }
  }

  /**
   * Update Issued Hologram Tab
   * NOTE: This method is NO LONGER NEEDED because moveIssuedHologramToHistory() handles everything
   * Keeping it for backward compatibility but it does nothing
   */
  private updateIssuedHologramData(entry: any, cartoonNumber: string): void {
    // This method is intentionally empty
    // The issued hologram entry already exists (created during officer approval)
    // It will be moved to history by moveIssuedHologramToHistory()
    console.log('updateIssuedHologramData: Skipped - entry will be moved to history by moveIssuedHologramToHistory()');
  }

  /**
   * Update Issued History Tab
   * NOTE: This method is NO LONGER NEEDED because moveIssuedHologramToHistory() handles everything
   * Keeping it for backward compatibility but it does nothing
   */
  private updateIssuedHistoryData(entry: any, cartoonNumber: string): void {
    // This method is intentionally empty
    // The history entry will be created by moveIssuedHologramToHistory()
    // which moves the issued hologram entry to history with COMPLETED status
    console.log('updateIssuedHistoryData: Skipped - history will be created by moveIssuedHologramToHistory()');
  }

  /**
   * AUTOMATIC WORKFLOW: Move issued hologram from "Issued Hologram" tab to "Issued History" tab
   * This happens automatically when officer approves the daily register entry
   * HANDLES MULTIPLE ROLLS: Processes each roll separately
   */
  private moveIssuedHologramToHistory(entry: any): void {
    try {
      console.log('=== MOVING ISSUED HOLOGRAM TO HISTORY ===');
      
      const referenceNo = entry.referenceNo;
      if (!referenceNo) {
        console.warn('Missing reference number, skipping move to history');
        return;
      }
      
      const lockedRolls = entry.lockedRolls || [];
      const cartoonNumbers = lockedRolls.length > 0 
        ? lockedRolls.map((r: any) => r.cartoonNumber)
        : (entry.cartoonNumber ? [entry.cartoonNumber] : []);
      
      if (cartoonNumbers.length === 0) {
        console.warn('No cartoon numbers found, skipping move to history');
        return;
      }
      
      console.log(`Moving issued holograms to history for ${cartoonNumbers.length} roll(s):`, cartoonNumbers);
      
      // Load issued holograms
      const issuedData = JSON.parse(localStorage.getItem('hologramOverviewIssued') || '[]');
      const historyData = JSON.parse(localStorage.getItem('hologramOverviewHistory') || '[]');
      
      let movedCount = 0;
      
      // Process each roll separately
      cartoonNumbers.forEach((cartoonNumber: string) => {
        if (!cartoonNumber) return;
        
        // Find the issued hologram entry that matches this approval and roll
        const issuedIndex = issuedData.findIndex((issued: any) => 
          issued.cartoonNumber === cartoonNumber && 
          issued.requestReference === referenceNo &&
          issued.status === 'IN_PROGRESS'
        );
        
        if (issuedIndex !== -1) {
          const issuedEntry = issuedData[issuedIndex];
          
          console.log(`Found issued hologram for roll ${cartoonNumber} to move:`, issuedEntry);
          
          // Update status to COMPLETED
          issuedEntry.status = 'COMPLETED';
          issuedEntry.completionDate = new Date().toISOString().split('T')[0];
          issuedEntry.completedBy = 'Officer In Charge';
          issuedEntry.completedAt = new Date().toISOString();
          
          // Remove from issued holograms (move to history)
          issuedData.splice(issuedIndex, 1);
          
          // Add to issued history
          historyData.push({
            ...issuedEntry,
            id: Date.now() + movedCount, // Ensure unique IDs
            issueDate: issuedEntry.issueDate || issuedEntry.issuedDate,
            officer: issuedEntry.officer,
            requestReference: issuedEntry.requestReference
          });
          
          movedCount++;
          console.log(`Successfully moved issued hologram for roll ${cartoonNumber} to history`);
        } else {
          console.warn(`No matching issued hologram found for roll ${cartoonNumber} and reference ${referenceNo}`);
        }
      });
      
      // Save updated data
      localStorage.setItem('hologramOverviewIssued', JSON.stringify(issuedData));
      localStorage.setItem('hologramOverviewHistory', JSON.stringify(historyData));
      
      console.log(`Successfully moved ${movedCount} issued hologram(s) to history`);
      console.log('=== END MOVING ISSUED HOLOGRAM TO HISTORY ===');
    } catch (error) {
      console.error('Error moving issued hologram to history:', error);
    }
  }

  // Reject entry
  openRejectionModal(entry: PendingEntry): void {
    this.entryToProcess = entry;
    this.rejectionReason = '';
    const modalElement = document.getElementById('rejectionModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  confirmRejection(): void {
    if (!this.entryToProcess || !this.rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    // Update the entry status in localStorage
    const savedEntries = JSON.parse(localStorage.getItem('dailyRegisterEntries') || '[]');
    const entryIndex = savedEntries.findIndex((e: any) => e.id === this.entryToProcess!.id);
    
    if (entryIndex !== -1) {
      savedEntries[entryIndex].approvalStatus = 'REJECTED';
      savedEntries[entryIndex].rejectedBy = 'Officer In Charge';
      savedEntries[entryIndex].rejectedAt = new Date().toISOString();
      savedEntries[entryIndex].rejectionReason = this.rejectionReason;
      
      localStorage.setItem('dailyRegisterEntries', JSON.stringify(savedEntries));
    }
    
    // Close modal
    const modalElement = document.getElementById('rejectionModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    }
    
    // Refresh data
    this.loadPendingEntries();
    this.loadFilteredData();
    this.entryToProcess = null;
    this.rejectionReason = '';
    
    alert('❌ Entry rejected successfully!');
  }

  // Calculate total
  getTotalCalculation(entry: PendingEntry): number {
    return entry.issuedQuantity + entry.wastageQuantity + entry.leftOverQuantity;
  }

  // Check if calculation matches
  isCalculationMatching(entry: PendingEntry): boolean {
    return this.getTotalCalculation(entry) === entry.hologramQty;
  }



  // Navigate to Monthly Hologram Statement in new tab
  goToMonthlyStatement(): void {
    window.open('/dev/monthlyhologramstatement-oic', '_blank');
  }

  // Set active tab
  setActiveTab(tab: 'verification' | 'monthly-statement'): void {
    this.activeTab = tab;
  }

  // Get counts
  getPendingCount(): number {
    return this.pendingEntries.filter(e => e.status === 'PENDING').length;
  }

  getApprovedCount(): number {
    return this.pendingEntries.filter(e => e.status === 'APPROVED').length;
  }

  // Get assigned rolls for an entry
  getAssignedRolls(entry: any): string[] {
    const lockedRolls = entry.lockedRolls || [];
    return lockedRolls.map((roll: any) => roll.cartoonNumber);
  }

  /**
   * Get allocated ranges for a specific roll from allocation data
   */
  getAllocatedRangesForRoll(entry: PendingEntry, cartoonNumber: string): Array<{ fromSerial: string; toSerial: string }> {
    const allocationData = this.getHologramAllocationForEntry(entry);
    
    if (allocationData && allocationData.allocatedCartoons) {
      // Find ALL cartoons matching this roll (a roll can have multiple allocations/ranges)
      const matchingCartoons = allocationData.allocatedCartoons.filter((c: any) => c.cartoonNumber === cartoonNumber);
      
      const ranges: Array<{ fromSerial: string; toSerial: string }> = [];
      
      for (const cartoon of matchingCartoons) {
        if (cartoon.fromSerial && cartoon.toSerial) {
          ranges.push({
            fromSerial: cartoon.fromSerial,
            toSerial: cartoon.toSerial
          });
        }
      }
      
      return ranges;
    }
    
    return [];
  }

  /**
   * Get hologram allocation data for an entry
   */
  private getHologramAllocationForEntry(entry: PendingEntry): any {
    try {
      const referenceNo = entry.referenceNo;
      
      if (!referenceNo) {
        return null;
      }
      
      // Try multiple localStorage keys where allocation data might be stored
      const possibleKeys = [
        'hologramAllocations',
        'hologramRequests', 
        'hologramApplications',
        'approvedHologramEntries'
      ];
      
      for (const key of possibleKeys) {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Find matching allocations
        const matchingAllocations = data.filter((a: any) => 
          a.referenceNo === referenceNo || 
          a.ourRefNo === referenceNo ||
          a.id === referenceNo ||
          a.refNumber === referenceNo
        );
        
        if (matchingAllocations.length > 0) {
          const requestWithAllocations = matchingAllocations.find((a: any) => 
            a.allocations && Array.isArray(a.allocations) && a.allocations.length > 0
          );
          
          if (requestWithAllocations) {
            const cartoons = requestWithAllocations.allocations.map((a: any) => ({
              cartoonNumber: a.cartoonNumber || '',
              quantity: a.quantity || 0,
              fromSerial: a.fromSerial || '',
              toSerial: a.toSerial || '',
              serialRange: `${a.fromSerial} - ${a.toSerial}`,
              remainingInCartoon: a.remainingInCartoon || 0
            }));
            
            const totalQty = cartoons.reduce((sum: number, c: any) => sum + c.quantity, 0);
            
            return {
              referenceNo: referenceNo,
              totalAllocated: totalQty,
              allocatedCartoons: cartoons
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting allocation data:', error);
      return null;
    }
  }

  // Get roll-wise breakdown for an entry
  getRollBreakdown(entry: PendingEntry): RollBreakdown[] {
    const lockedRolls = entry.lockedRolls || [];
    console.log('🔍 getRollBreakdown - Entry lockedRolls:', lockedRolls);
    return lockedRolls.map((roll: any) => {
      const issuedRanges = roll.issuedRanges || [];
      const wastageRanges = roll.wastageRanges || [];

      const issuedQty = roll.issuedQty ?? issuedRanges.reduce((sum: number, range: any) => sum + (range.quantity || 0), 0);
      const wastageQty = roll.wastageQty ?? wastageRanges.reduce((sum: number, range: any) => sum + (range.quantity || 0), 0);

      const allocatedQty = roll.availableCount ?? roll.allocatedQuantity ?? roll.totalAllocated ?? (issuedQty + wastageQty + (roll.leftOver ?? 0));
      const leftOver = roll.leftOver ?? (allocatedQty - (issuedQty + wastageQty));
      const totalUsed = issuedQty + wastageQty;

      // Get damage reason from roll, with fallback to entry-level damage reason
      const damageReason = roll.damageReason || entry.damageReason || '';
      console.log(`🔍 Roll ${roll.cartoonNumber} - damageReason from roll:`, roll.damageReason, 'from entry:', entry.damageReason, 'final:', damageReason);

      // Get allocated ranges for this roll
      const allocatedRanges = this.getAllocatedRangesForRoll(entry, roll.cartoonNumber);

      return {
        rollName: roll.cartoonNumber,
        allocatedQty,
        allocatedRanges,
        issuedRanges,
        issuedQty,
        wastageRanges,
        wastageQty,
        leftOver: leftOver < 0 ? 0 : leftOver,
        totalUsed,
        damageReason: damageReason // Per-roll damage reason with fallback
      };
    });
  }

  getRejectedCount(): number {
    return this.pendingEntries.filter(e => e.status === 'REJECTED').length;
  }

  private getRollColorIndex(cartoonNumber: string): number {
    if (!this.rollColorMap.has(cartoonNumber)) {
      this.rollColorMap.set(cartoonNumber, this.nextColorIndex);
      this.nextColorIndex++;
    }
    return this.rollColorMap.get(cartoonNumber)!;
  }

  getRollColor(cartoonNumber: string): string {
    const colors = [
      '#007bff',
      '#28a745',
      '#ffc107',
      '#dc3545',
      '#17a2b8',
      '#6f42c1',
      '#fd7e14',
      '#20c997',
      '#e83e8c',
      '#6c757d'
    ];

    const index = this.getRollColorIndex(cartoonNumber);
    return colors[index % colors.length];
  }

  getRollBackgroundColor(cartoonNumber: string): string {
    const bgColors = [
      '#e7f3ff',
      '#e7f5e7',
      '#fff8e1',
      '#ffe7e7',
      '#e0f7fa',
      '#f3e5f5',
      '#fff3e0',
      '#e0f2f1',
      '#fce4ec',
      '#f8f9fa'
    ];

    const index = this.getRollColorIndex(cartoonNumber);
    return bgColors[index % bgColors.length];
  }

  // Open roll details modal
  openRollDetailsModal(entry: PendingEntry): void {
    this.entryForRollDetails = entry;
    const modalElement = document.getElementById('rollDetailsModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Close roll details modal
  closeRollDetailsModal(): void {
    this.entryForRollDetails = null;
    const modalElement = document.getElementById('rollDetailsModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  /**
   * Save completion data to manufacturing register for Daily Hologram Record Register
   * This allows the Commissioner Dashboard to track when manufacturing is completed
   */
  private saveCompletionToManufacturingRegister(entry: any): void {
    try {
      console.log('💾 Saving completion data to manufacturing register for:', entry.referenceNo);
      
      // Load existing manufacturing register
      const manufacturingRegister = JSON.parse(localStorage.getItem('hologramManufacturingRegister') || '[]');
      
      // Create completion record
      const completionRecord = {
        referenceNo: entry.referenceNo,
        status: 'COMPLETED',
        completionDate: new Date().toISOString(),
        completionTime: new Date().toTimeString().split(' ')[0],
        approvedBy: 'Officer In Charge',
        approvedAt: new Date().toISOString(),
        hologramQty: entry.hologramQty || entry.issuedQuantity,
        hologramType: entry.hologramType,
        brandDetails: entry.brandDetails,
        cartoonNumber: entry.cartoonNumber,
        lockedRolls: entry.lockedRolls
      };
      
      // Check if entry already exists
      const existingIndex = manufacturingRegister.findIndex((r: any) => r.referenceNo === entry.referenceNo);
      
      if (existingIndex !== -1) {
        // Update existing entry
        manufacturingRegister[existingIndex] = {
          ...manufacturingRegister[existingIndex],
          ...completionRecord
        };
        console.log('✅ Updated existing completion record');
      } else {
        // Add new entry
        manufacturingRegister.push(completionRecord);
        console.log('✅ Added new completion record');
      }
      
      // Save back to localStorage
      localStorage.setItem('hologramManufacturingRegister', JSON.stringify(manufacturingRegister));
      
      console.log('✅ Completion data saved successfully for Daily Hologram Record Register');
      
      // Trigger storage event for Daily Register to pick up
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'hologramManufacturingRegister',
        newValue: JSON.stringify(manufacturingRegister),
        url: window.location.href
      }));
      
    } catch (error) {
      console.error('❌ Error saving completion data:', error);
    }
  }
}
