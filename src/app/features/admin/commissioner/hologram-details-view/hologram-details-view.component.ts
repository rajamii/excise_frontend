import { Component, EventEmitter, Input, Output, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommissionerTableData } from '../commissioner-dashboard/commissioner-dashboard.component';
import { HologramDataService } from '../../../licensee/supplyChain/services/hologram-data.service';

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

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private hologramService: HologramDataService
  ) {
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

  canEditQuantities(): boolean {
    return this.application?.canEditQuantity === true;
  }

  canApproveApplication(): boolean {
    const actions = Array.isArray(this.application?.allowedActions)
      ? this.application.allowedActions
      : [];

    return actions.some((action) => String(action || '').toUpperCase() === 'APPROVE');
  }

  // Enable edit mode for quantities
  enableQuantityEdit(): void {
    if (!this.application || !this.canEditQuantities()) return;
    
    this.isEditingQuantity = true;
    
    // Store original values
    this.originalLocalQty = this.application.localQtyLakh || 0;
    this.originalExportQty = this.application.exportQtyLakh || 0;
    this.originalDefenceQty = this.application.defenceQtyLakh || 0;
    
    // Set editable values (convert to Lakhs)
    this.editedLocalQty = this.originalLocalQty / 100000;
    this.editedExportQty = this.originalExportQty / 100000;
    this.editedDefenceQty = this.originalDefenceQty / 100000;
  }
  
  // Cancel edit mode
  cancelQuantityEdit(): void {
    this.isEditingQuantity = false;
  }
  
  // Save updated quantities
  saveQuantityEdit(): void {
    if (!this.application) return;
    
    const applicationId = this.application.id;
    if (!applicationId) {
      alert('Error: Application ID not found. Cannot update quantities.');
      return;
    }

    // Convert edited Lakhs values back to absolute pieces for comparison and API payload
    const newLocalQty = this.editedLocalQty * 100000;
    const newExportQty = this.editedExportQty * 100000;
    const newDefenceQty = this.editedDefenceQty * 100000;
    
    // Check if any quantity changed
    const hasChanges = 
      newLocalQty !== this.originalLocalQty ||
      newExportQty !== this.originalExportQty ||
      newDefenceQty !== this.originalDefenceQty;
    
    if (!hasChanges) {
      alert('No changes detected.');
      this.isEditingQuantity = false;
      return;
    }
    
    // Validate quantities (must be non-negative)
    if (this.editedLocalQty < 0 || this.editedExportQty < 0 || this.editedDefenceQty < 0) {
      alert('Quantities cannot be negative.');
      return;
    }

    // Enforce entry in lakhs (block absolute numbers like 100000)
    if (this.editedLocalQty >= 1000 || this.editedExportQty >= 1000 || this.editedDefenceQty >= 1000) {
      alert('Error: Please enter quantities in Lakhs only (e.g. 2 instead of 200,000).');
      return;
    }
    
    // Call backend API to update quantities with absolute pieces
    this.hologramService.updateProcurementQuantities(
      Number(applicationId),
      newLocalQty,
      newExportQty,
      newDefenceQty
    ).subscribe({
      next: (response) => {
        console.log('Quantities updated successfully:', response);
        
        // Update current modal data with response
        if (this.application) {
          this.application.localQtyLakh = newLocalQty;
          this.application.exportQtyLakh = newExportQty;
          this.application.defenceQtyLakh = newDefenceQty;
          this.application.totalQtyLakh = newLocalQty + newExportQty + newDefenceQty;
          
          // Update payment amount
          const newPaymentAmount = response.new_payment_amount || (this.application.totalQtyLakh * 0.15);
          this.application.amount = newPaymentAmount.toFixed(2);
        }
        
        // Exit edit mode
        this.isEditingQuantity = false;
        
        // Notify parent to reload data
        this.dataUpdated.emit();
        
        alert(`Quantities updated successfully!\n\nOriginal Total: ${response.original_quantities.total}\nNew Total: ${response.updated_quantities.total}\nNew Payment Amount: ₹${response.new_payment_amount.toFixed(2)}\n\nThe changes are now reflected in the supply chain user's dashboard.`);
      },
      error: (error) => {
        console.error('Error updating quantities:', error);
        alert('Failed to update quantities: ' + (error.error?.error || error.message || 'Unknown error'));
        // Revert to original Lakhs values
        this.editedLocalQty = this.originalLocalQty / 100000;
        this.editedExportQty = this.originalExportQty / 100000;
        this.editedDefenceQty = this.originalDefenceQty / 100000;
      }
    });
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
