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
      
      // NOW UPDATE ROLL DATA - Only after Officer approval
      this.updateRollDataAfterApproval(savedEntries[entryIndex]);
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
    
    alert('✅ Entry approved successfully! Roll data has been updated in Hologram Overview.');
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
      
      // 1. Update Rolls Tab Data
      this.updateRollsData(entry, cartoonNumber);
      
      // 2. Update Available Hologram Data Tab
      this.updateAvailableHologramData(entry, cartoonNumber);
      
      // 3. Update Serial Numbers Data Tab
      this.updateSerialNumbersData(entry, cartoonNumber);
      
      // 4. Update Issued Hologram Tab
      this.updateIssuedHologramData(entry, cartoonNumber);
      
      // 5. Update Issued History Tab
      this.updateIssuedHistoryData(entry, cartoonNumber);
      
      console.log('Roll data updated successfully after approval');
      
    } catch (error) {
      console.error('Error updating roll data after approval:', error);
    }
  }

  /**
   * Update Rolls Tab Data
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
      
      // Update counts
      roll.usedCount = (roll.usedCount || 0) + (entry.issuedQuantity || 0);
      roll.damagedCount = (roll.damagedCount || 0) + (entry.wastageQuantity || 0);
      
      const totalUsed = (entry.issuedQuantity || 0) + (entry.wastageQuantity || 0);
      roll.availableCount = Math.max(0, (roll.availableCount || 0) - totalUsed);
      
      // Update status
      if (roll.availableCount === 0) {
        roll.status = 'COMPLETED';
      } else {
        roll.status = 'AVAILABLE';
      }
      
      rollsData[rollIndex] = roll;
      localStorage.setItem('hologramOverviewRolls', JSON.stringify(rollsData));
      
      console.log('Rolls data updated:', roll);
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
        
        const totalUsed = (entry.issuedQuantity || 0) + (entry.wastageQuantity || 0);
        available.availableCount = Math.max(0, (available.availableCount || 0) - totalUsed);
        
        const totalCount = available.availableCount + (available.usedCount || 0) + (available.damagedCount || 0);
        available.percentage = totalCount > 0 ? Math.round((available.availableCount / totalCount) * 100) : 0;
        
        if (available.availableCount === 0) {
          available.status = 'COMPLETED';
        } else {
          available.status = 'AVAILABLE';
        }
        
        availableData[availableIndex] = available;
        localStorage.setItem('hologramOverviewAvailable', JSON.stringify(availableData));
        
        console.log('Available hologram data updated:', available);
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
        
        const totalUsed = (entry.issuedQuantity || 0) + (entry.wastageQuantity || 0);
        serialRoll.availableCount = Math.max(0, (serialRoll.availableCount || 0) - totalUsed);
        
        if (serialRoll.availableCount === 0) {
          serialRoll.status = 'COMPLETED';
        } else {
          serialRoll.status = 'AVAILABLE';
        }
        
        serialData[serialIndex] = serialRoll;
        localStorage.setItem('hologramOverviewSerialData', JSON.stringify(serialData));
        
        console.log('Serial numbers data updated:', serialRoll);
      }
    } catch (error) {
      console.error('Error updating serial numbers data:', error);
    }
  }

  /**
   * Update Issued Hologram Tab
   */
  private updateIssuedHologramData(entry: any, cartoonNumber: string): void {
    try {
      const issuedData = JSON.parse(localStorage.getItem('hologramOverviewIssued') || '[]');
      
      // Create new issued entry
      const newIssuedEntry = {
        id: Date.now(),
        cartoonNumber: cartoonNumber,
        type: entry.hologramType,
        referenceNo: entry.referenceNo || 'N/A',
        brandName: entry.brandDetails?.brandName || 'N/A',
        issuedFromSerial: entry.issuedFromSerial || '',
        issuedToSerial: entry.issuedToSerial || '',
        issuedQuantity: entry.issuedQuantity || 0,
        issuedDate: entry.date,
        approvedBy: 'Officer In Charge',
        approvedAt: new Date().toISOString()
      };
      
      issuedData.push(newIssuedEntry);
      localStorage.setItem('hologramOverviewIssued', JSON.stringify(issuedData));
      
      console.log('Issued hologram data updated:', newIssuedEntry);
    } catch (error) {
      console.error('Error updating issued hologram data:', error);
    }
  }

  /**
   * Update Issued History Tab
   */
  private updateIssuedHistoryData(entry: any, cartoonNumber: string): void {
    try {
      const historyData = JSON.parse(localStorage.getItem('hologramOverviewHistory') || '[]');
      
      // Create history entry for issued holograms
      if (entry.issuedQuantity > 0) {
        const issuedHistoryEntry = {
          id: Date.now(),
          cartoonNumber: cartoonNumber,
          type: entry.hologramType,
          action: 'ISSUED',
          referenceNo: entry.referenceNo || 'N/A',
          brandName: entry.brandDetails?.brandName || 'N/A',
          fromSerial: entry.issuedFromSerial || '',
          toSerial: entry.issuedToSerial || '',
          quantity: entry.issuedQuantity || 0,
          date: entry.date,
          approvedBy: 'Officer In Charge',
          approvedAt: new Date().toISOString(),
          remarks: 'Approved by Officer In Charge'
        };
        
        historyData.push(issuedHistoryEntry);
      }
      
      // Create history entry for wastage
      if (entry.wastageQuantity > 0) {
        const wastageHistoryEntry = {
          id: Date.now() + 1,
          cartoonNumber: cartoonNumber,
          type: entry.hologramType,
          action: 'WASTAGE',
          referenceNo: entry.referenceNo || 'N/A',
          brandName: entry.brandDetails?.brandName || 'N/A',
          fromSerial: entry.wastageFromSerial || '',
          toSerial: entry.wastageToSerial || '',
          quantity: entry.wastageQuantity || 0,
          date: entry.date,
          approvedBy: 'Officer In Charge',
          approvedAt: new Date().toISOString(),
          remarks: entry.damageReason || 'Wastage recorded'
        };
        
        historyData.push(wastageHistoryEntry);
      }
      
      localStorage.setItem('hologramOverviewHistory', JSON.stringify(historyData));
      
      console.log('Issued history data updated');
    } catch (error) {
      console.error('Error updating issued history data:', error);
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
