import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
}

@Component({
  selector: 'app-hologram-manufacturing-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram-manufacturing-register.component.html',
  styleUrl: './hologram-manufacturing-register.component.scss'
})
export class HologramManufacturingRegisterComponent implements OnInit {
  pendingEntries: PendingEntry[] = [];
  filteredEntries: PendingEntry[] = [];
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';
  selectedMonth = 'nov';
  selectedYear = '2025';
  selectedDate = new Date().toISOString().split('T')[0];
  
  // Pagination
  pageSize = 10;
  currentPage = 1;
  
  // Entry to approve/reject
  entryToProcess: PendingEntry | null = null;
  rejectionReason = '';

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
    
    // Filter only entries that are marked as fixed (saved) but not yet approved
    this.pendingEntries = savedEntries
      .filter((entry: any) => entry.isFixed && (!entry.approvalStatus || entry.approvalStatus === 'PENDING'))
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
        status: entry.approvalStatus || 'PENDING'
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
      
      return typeMatch && dateMatch;
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
      
      // Add to approved entries for daily register
      const approvedEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
      approvedEntries.push(savedEntries[entryIndex]);
      localStorage.setItem('approvedHologramEntries', JSON.stringify(approvedEntries));
      
      // AUTOMATIC WORKFLOW: Update roll data and move issued holograms to history
      this.updateRollDataAfterApproval(savedEntries[entryIndex]);
      
      // AUTOMATIC WORKFLOW: Move issued hologram to history
      this.moveIssuedHologramToHistory(savedEntries[entryIndex]);
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
    this.entryToProcess = null;
    
    alert('✅ Entry approved successfully! Roll status automatically updated to AVAILABLE/COMPLETED and issued holograms moved to history.');
  }

  /**
   * Update roll data in hologram overview after Officer approval
   * Updates Rolls, Available Hologram Data, Serial Numbers Data, Issued Hologram, and Issued History
   */
  private updateRollDataAfterApproval(entry: any): void {
    try {
      const cartoonNumber = entry.cartoonNumber;
      
      if (!cartoonNumber) {
        console.warn('No cartoon number found in entry, skipping roll data update');
        return;
      }
      
      console.log('Updating roll data after approval for:', cartoonNumber);
      
      // 1. Update Rolls Tab Data (with usage history)
      this.updateRollsData(entry, cartoonNumber);
      
      // 2. Update Available Hologram Data Tab
      this.updateAvailableHologramData(entry, cartoonNumber);
      
      // 3. Update Serial Numbers Data Tab (with usage history)
      this.updateSerialNumbersData(entry, cartoonNumber);
      
      // NOTE: Issued Hologram and History updates are handled by moveIssuedHologramToHistory()
      // which is called separately in confirmApproval()
      
      console.log('Roll data updated successfully after approval');
      
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
      // Now we need to ADD BACK the leftover quantity since it wasn't actually used
      const leftoverQuantity = entry.leftOverQuantity || 0;
      
      // Update counts
      // Subtract what was actually used (issued + wastage)
      // Add back what was returned (leftover)
      roll.usedCount = (roll.usedCount || 0) + (entry.issuedQuantity || 0);
      roll.damagedCount = (roll.damagedCount || 0) + (entry.wastageQuantity || 0);
      
      // Add back leftover to available (it was subtracted during allocation but not used)
      roll.availableCount = (roll.availableCount || 0) + leftoverQuantity;
      
      console.log(`After update:`, {
        available: roll.availableCount,
        used: roll.usedCount,
        damaged: roll.damagedCount,
        note: `Added back leftover ${leftoverQuantity} to available`
      });
      
      // Update status based on available count
      if (roll.availableCount === 0) {
        roll.status = 'COMPLETED'; // All holograms used up
      } else {
        roll.status = 'AVAILABLE'; // Still has holograms available for use
      }
      
      // Add usage history entry with request reference number
      if (!roll.usageHistory) {
        roll.usageHistory = [];
      }
      
      roll.usageHistory.push({
        date: entry.date,
        referenceNo: entry.referenceNo || 'N/A',
        brandName: entry.brandDetails?.brandName || 'N/A',
        issuedFromSerial: entry.issuedFromSerial || '',
        issuedToSerial: entry.issuedToSerial || '',
        issuedQuantity: entry.issuedQuantity || 0,
        wastageFromSerial: entry.wastageFromSerial || '',
        wastageToSerial: entry.wastageToSerial || '',
        wastageQuantity: entry.wastageQuantity || 0,
        leftOverQuantity: entry.leftOverQuantity || 0,
        approvedBy: 'Officer In Charge',
        approvedAt: new Date().toISOString()
      });
      
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
  private updateSerialNumbersData(entry: any, cartoonNumber: string): void {
    try {
      const serialData = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');
      
      const serialIndex = serialData.findIndex((roll: any) => 
        roll.rollNumber === cartoonNumber && 
        roll.hologramType === entry.hologramType
      );
      
      if (serialIndex !== -1) {
        const serialRoll = serialData[serialIndex];
        
        serialRoll.usedCount = (serialRoll.usedCount || 0) + (entry.issuedQuantity || 0);
        serialRoll.damagedCount = (serialRoll.damagedCount || 0) + (entry.wastageQuantity || 0);
        
        // Add back leftover to available (it was subtracted during allocation but not used)
        const leftoverQuantity = entry.leftOverQuantity || 0;
        serialRoll.availableCount = (serialRoll.availableCount || 0) + leftoverQuantity;
        
        // Update status based on available count
        if (serialRoll.availableCount === 0) {
          serialRoll.status = 'COMPLETED'; // All holograms used up
        } else {
          serialRoll.status = 'AVAILABLE'; // Still has holograms available for use
        }
        
        // Add usage history entry with request reference number
        if (!serialRoll.usageHistory) {
          serialRoll.usageHistory = [];
        }
        
        serialRoll.usageHistory.push({
          date: entry.date,
          referenceNo: entry.referenceNo || 'N/A',
          brandName: entry.brandDetails?.brandName || 'N/A',
          issuedFromSerial: entry.issuedFromSerial || '',
          issuedToSerial: entry.issuedToSerial || '',
          issuedQuantity: entry.issuedQuantity || 0,
          wastageFromSerial: entry.wastageFromSerial || '',
          wastageToSerial: entry.wastageToSerial || '',
          wastageQuantity: entry.wastageQuantity || 0,
          leftOverQuantity: entry.leftOverQuantity || 0,
          approvedBy: 'Officer In Charge',
          approvedAt: new Date().toISOString()
        });
        
        serialData[serialIndex] = serialRoll;
        localStorage.setItem('hologramOverviewSerialData', JSON.stringify(serialData));
        
        console.log('Serial numbers data updated - added back leftover:', leftoverQuantity);
      }
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
   */
  private moveIssuedHologramToHistory(entry: any): void {
    try {
      console.log('=== MOVING ISSUED HOLOGRAM TO HISTORY ===');
      
      const cartoonNumber = entry.cartoonNumber;
      const referenceNo = entry.referenceNo;
      
      if (!cartoonNumber || !referenceNo) {
        console.warn('Missing cartoon number or reference number, skipping move to history');
        return;
      }
      
      // Load issued holograms
      const issuedData = JSON.parse(localStorage.getItem('hologramOverviewIssued') || '[]');
      
      // Find the issued hologram entry that matches this approval
      const issuedIndex = issuedData.findIndex((issued: any) => 
        issued.cartoonNumber === cartoonNumber && 
        issued.requestReference === referenceNo &&
        issued.status === 'IN_PROGRESS'
      );
      
      if (issuedIndex !== -1) {
        const issuedEntry = issuedData[issuedIndex];
        
        console.log('Found issued hologram to move:', issuedEntry);
        
        // Update status to COMPLETED
        issuedEntry.status = 'COMPLETED';
        issuedEntry.completionDate = new Date().toISOString().split('T')[0];
        issuedEntry.completedBy = 'Officer In Charge';
        issuedEntry.completedAt = new Date().toISOString();
        
        // Remove from issued holograms (move to history)
        issuedData.splice(issuedIndex, 1);
        localStorage.setItem('hologramOverviewIssued', JSON.stringify(issuedData));
        
        // Add to issued history
        const historyData = JSON.parse(localStorage.getItem('hologramOverviewHistory') || '[]');
        historyData.push({
          ...issuedEntry,
          id: Date.now(),
          issueDate: issuedEntry.issueDate || issuedEntry.issuedDate,
          officer: issuedEntry.officer,
          requestReference: issuedEntry.requestReference
        });
        localStorage.setItem('hologramOverviewHistory', JSON.stringify(historyData));
        
        console.log('Successfully moved issued hologram to history');
      } else {
        console.warn('No matching issued hologram found to move to history');
      }
      
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

  // Refresh entries
  refreshEntries(): void {
    this.loadPendingEntries();
    this.loadFilteredData();
    this.cdr.detectChanges();
    alert(`Entries refreshed! Found ${this.filteredEntries.length} pending entries.`);
  }

  // Navigate back
  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  // Get counts
  getPendingCount(): number {
    return this.pendingEntries.filter(e => e.status === 'PENDING').length;
  }

  getApprovedCount(): number {
    return this.pendingEntries.filter(e => e.status === 'APPROVED').length;
  }

  getRejectedCount(): number {
    return this.pendingEntries.filter(e => e.status === 'REJECTED').length;
  }
}
