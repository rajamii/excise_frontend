import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

type ReceiptVm = {
  applicationId: string;
  transactionId: string;
  amount: number;
  hoa: string;
  status: string;
  reason: string;
  createdAt: string;
  autoSubmitted: string;
  autoSubmitError: string;
  sbmSubmitted: string;
  sbmApplicationId: string;
  sbmSubmitError: string;
};

@Component({
  selector: 'app-application-fee-receipt',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './application-fee-receipt.component.html',
  styleUrls: ['./application-fee-receipt.component.scss']
})
export class ApplicationFeeReceiptComponent {
  vm: ReceiptVm = {
    applicationId: '',
    transactionId: '',
    amount: 0,
    hoa: '',
    status: 'success',
    reason: '',
    createdAt: '',
    autoSubmitted: '0',
    autoSubmitError: '',
    sbmSubmitted: '0',
    sbmApplicationId: '',
    sbmSubmitError: ''
  };

  private initialized = false;
  statusKind: 'success' | 'failed' | 'pending' | 'processing' = 'processing';
  headerTitle = 'Processing Payment...';
  statusLabel = 'Processing';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParamMap.subscribe((params) => {
      this.vm = {
        applicationId: String(params.get('applicationId') || params.get('payerId') || '').trim(),
        transactionId: String(params.get('transactionId') || '').trim(),
        amount: Number(params.get('amount') || 0),
        hoa: String(params.get('hoa') || '').trim(),
        status: String(params.get('status') || 'success').trim(),
        reason: String(params.get('reason') || '').trim(),
        createdAt: String(params.get('createdAt') || '').trim(),
        autoSubmitted: String(params.get('autoSubmitted') || '0').trim(),
        autoSubmitError: String(params.get('autoSubmitError') || '').trim(),
        sbmSubmitted: String(params.get('sbmSubmitted') || '0').trim(),
        sbmApplicationId: String(params.get('sbmApplicationId') || '').trim(),
        sbmSubmitError: String(params.get('sbmSubmitError') || '').trim()
      };
      this.initialized = true;
      this.refreshDerived();
    });
    this.refreshDerived();
  }

  private normalizeStatus(value: string): 'success' | 'failed' | 'pending' {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'f' || raw === 'failed' || raw.includes('fail') || raw.includes('error')) return 'failed';
    if (raw === 'p' || raw === 'pending' || raw.includes('pending') || raw.includes('process')) return 'pending';
    return 'success';
  }

  private refreshDerived(): void {
    if (!this.initialized) {
      this.statusKind = 'processing';
      this.headerTitle = 'Processing Payment...';
      this.statusLabel = 'Processing';
      return;
    }

    this.statusKind = this.normalizeStatus(this.vm.status);

    if (this.statusKind === 'failed') {
      this.headerTitle = 'Application Fee Payment Failed';
      this.statusLabel = 'Failed';
      return;
    }

    if (this.statusKind === 'pending') {
      this.headerTitle = 'Application Fee Payment Pending';
      this.statusLabel = 'Pending';
      return;
    }

    this.headerTitle = 'Application Fee Payment Successful';
    this.statusLabel = 'Payment Successful';
  }

  get formattedAmount(): string {
    const value = Number(this.vm.amount || 0);
    return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get createdAtLabel(): string {
    if (!this.vm.createdAt) return '-';
    const parsed = new Date(this.vm.createdAt);
    if (Number.isNaN(parsed.getTime())) return String(this.vm.createdAt);
    return parsed.toLocaleString('en-IN');
  }

  get autoSubmittedLabel(): string {
    return String(this.vm.autoSubmitted || '').trim() === '1' ? 'Yes' : 'No';
  }

  get sbmSubmittedLabel(): string {
    return String(this.vm.sbmSubmitted || '').trim() === '1' ? 'Yes' : 'No';
  }

  printSlip(): void {
    window.print();
  }

  goToDashboard(): void {
    if (this.statusKind === 'processing') return;

    const autoSubmitted = String(this.vm.autoSubmitted || '').trim() === '1';

    // Show "Application Submitted" in the stepper ONLY when BillDesk reports success
    // AND the backend auto-submitted the draft (autoSubmitted=1).
    if (this.statusKind === 'success' && autoSubmitted) {
      try {
        const id = String(this.vm.applicationId || '').trim();
        if (id) sessionStorage.setItem('new_license_submitted_application_id', id);
      } catch {
        // no-op
      }
    }

    // UX: if payment failed/pending, return to New License Management (not the apply stepper).
    const section = this.statusKind === 'success' && autoSubmitted ? 'new-license-apply' : 'new-license';
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section,
        source: 'application-fee-receipt',
        applicationId: this.vm.applicationId || undefined
      }
    });
  }
}

