import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommissionerTableData } from '../commissioner-dashboard/commissioner-dashboard.component';

@Component({
  selector: 'app-payment-slips-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-slips-view.component.html',
  styleUrls: ['./payment-slips-view.component.scss']
})
export class PaymentSlipsViewComponent {
  @Input() isVisible = false;
  @Input() application: CommissionerTableData | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() approve = new EventEmitter<CommissionerTableData>();
  @Output() reject = new EventEmitter<CommissionerTableData>();

  onClose() {
    this.close.emit();
  }

  onApprove() {
    if (this.application) {
      this.approve.emit(this.application);
    }
  }

  onReject() {
    if (this.application) {
      this.reject.emit(this.application);
    }
  }

  // Helper methods moved from dashboard
  getSlipDetailsForType(application: CommissionerTableData, type: string): any {
    return application.slipDetails?.[type] || null;
  }

  hasSlipForType(application: CommissionerTableData, type: string): boolean {
    return application.uploadedTypes?.includes(type) || false;
  }

  getFormattedFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'Local':
        return 'bg-success';
      case 'Export':
        return 'bg-dark';
      case 'Defence':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary';
    }
  }

  downloadSlip(application: CommissionerTableData, type: string): void {
    const slipDetails = this.getSlipDetailsForType(application, type);
    if (slipDetails) {
      alert(`Download functionality for: ${slipDetails.fileName}\n\nIn production, this would download the actual file from the server.`);
    }
  }

  viewSlipInNewWindow(application: CommissionerTableData, type: string): void {
    const slipDetails = this.getSlipDetailsForType(application, type);
    if (slipDetails) {
      alert(`View functionality for: ${slipDetails.fileName}\n\nIn production, this would open the file in a new window.`);
    }
  }
}