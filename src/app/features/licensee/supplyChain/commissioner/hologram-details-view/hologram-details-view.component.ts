import { Component, EventEmitter, Input, Output, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommissionerTableData } from '../commissioner-dashboard/commissioner-dashboard.component';

@Component({
  selector: 'app-hologram-details-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram-details-view.component.html',
  styleUrls: ['./hologram-details-view.component.scss']
})
export class HologramDetailsViewComponent {
  @Input() isVisible = false;
  @Input() application: CommissionerTableData | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() approve = new EventEmitter<CommissionerTableData>();
  @Output() dataUpdated = new EventEmitter<void>();

  // Edit mode for hologram quantities
  isEditingQuantity = false;
  editedLocalQty: number = 0;
  editedExportQty: number = 0;
  editedDefenceQty: number = 0;
  originalLocalQty: number = 0;
  originalExportQty: number = 0;
  originalDefenceQty: number = 0;

  private isBrowser = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  onClose() {
    this.close.emit();
    this.isEditingQuantity = false;
  }

  onApprove() {
    if (this.application) {
      this.approve.emit(this.application);
    }
  }

  // Enable edit mode for quantities
  enableQuantityEdit(): void {
    if (!this.application) return;
    
    this.isEditingQuantity = true;
    
    // Store original values
    this.originalLocalQty = this.application.localQtyLakh || 0;
    this.originalExportQty = this.application.exportQtyLakh || 0;
    this.originalDefenceQty = this.application.defenceQtyLakh || 0;
    
    // Set editable values
    this.editedLocalQty = this.originalLocalQty;
    this.editedExportQty = this.originalExportQty;
    this.editedDefenceQty = this.originalDefenceQty;
  }
  
  // Cancel edit mode
  cancelQuantityEdit(): void {
    this.isEditingQuantity = false;
  }
  
  // Save updated quantities
  saveQuantityEdit(): void {
    if (!this.application || !this.isBrowser) return;
    
    const refNo = this.application.referenceNo;
    
    // Check if any quantity changed
    const hasChanges = 
      this.editedLocalQty !== this.originalLocalQty ||
      this.editedExportQty !== this.originalExportQty ||
      this.editedDefenceQty !== this.originalDefenceQty;
    
    if (!hasChanges) {
      alert('No changes detected.');
      this.isEditingQuantity = false;
      return;
    }
    
    // Prepare edit history
    const editHistory = {
      editedBy: 'Commissioner',
      editedDate: new Date().toISOString().split('T')[0],
      originalQuantities: {
        local: this.originalLocalQty,
        export: this.originalExportQty,
        defence: this.originalDefenceQty,
        total: this.originalLocalQty + this.originalExportQty + this.originalDefenceQty
      },
      updatedQuantities: {
        local: this.editedLocalQty,
        export: this.editedExportQty,
        defence: this.editedDefenceQty,
        total: this.editedLocalQty + this.editedExportQty + this.editedDefenceQty
      }
    };
    
    // Update hologramRequests - DON'T update quantities yet, only store pending changes
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const reqIndex = hologramRequests.findIndex((req: any) => req.refNo === refNo);
    if (reqIndex !== -1) {
      // Store pending quantities (will be applied on approval)
      hologramRequests[reqIndex].pendingQuantities = {
        local: this.editedLocalQty,
        export: this.editedExportQty,
        defence: this.editedDefenceQty
      };
      // Store edit history but don't show it yet (will be shown after approval)
      hologramRequests[reqIndex].pendingEditHistory = editHistory;
      hologramRequests[reqIndex].hasUnapprovedEdit = true;
      localStorage.setItem('hologramRequests', JSON.stringify(hologramRequests));
    }
    
    // Update hologramApplications (used by supply chain dashboard) - DON'T update quantities yet
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    applications.forEach((app: any) => {
      if (app.refNo === refNo) {
        // Store pending quantities (will be applied on approval)
        app.pendingQuantities = {
          local: this.editedLocalQty,
          export: this.editedExportQty,
          defence: this.editedDefenceQty
        };
        // Store edit history but don't show it yet (will be shown after approval)
        app.pendingEditHistory = editHistory;
        app.hasUnapprovedEdit = true;
      }
    });
    localStorage.setItem('hologramApplications', JSON.stringify(applications));
    
    // Update current modal data (only for Commissioner to see)
    this.application.localQtyLakh = this.editedLocalQty;
    this.application.exportQtyLakh = this.editedExportQty;
    this.application.defenceQtyLakh = this.editedDefenceQty;
    this.application.totalQtyLakh = this.editedLocalQty + this.editedExportQty + this.editedDefenceQty;
    
    // Exit edit mode
    this.isEditingQuantity = false;
    
    // Notify parent to reload data
    this.dataUpdated.emit();
    
    alert('Quantities updated successfully! The changes are now reflected in the supply chain view.');
  }

  // Payment calculation methods for hologram details
  getTotalHolograms(hologram: any): number {
    // Returns total pieces (data is already in pieces, not Lakh)
    return (hologram?.localQtyLakh || 0) + (hologram?.exportQtyLakh || 0) + (hologram?.defenceQtyLakh || 0);
  }

  calculateWalletPayment(hologram: any): number {
    // Wallet payment: ₹0.15 per hologram piece (only payment required)
    // Data is already in pieces, no conversion needed
    const totalPieces = this.getTotalHolograms(hologram);
    return totalPieces * 0.15;
  }
}
