import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LicenseApplicationService } from '../../../../core/services/license-application.service';

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
  private hasSyncedStatus = false;
  statusKind: 'success' | 'failed' | 'pending' | 'processing' = 'processing';
  headerTitle = 'Processing Payment...';
  statusLabel = 'Processing';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private licenseAppService: LicenseApplicationService
  ) {
    this.route.queryParamMap.subscribe((params) => {
      let savedAppId = '';
      let savedSbmId = '';
      try {
        savedAppId = sessionStorage.getItem('new_license_submitted_application_id') || sessionStorage.getItem('new_license_draft_application_id') || '';
        savedSbmId = sessionStorage.getItem('new_license_sbm_application_id') || '';
      } catch {
        // no-op
      }

      const appId = String(
        params.get('applicationId') ||
        params.get('application_id') ||
        params.get('payerId') ||
        params.get('payer_id') ||
        savedAppId ||
        ''
      ).trim();

      const txnId = String(
        params.get('transactionId') ||
        params.get('transaction_id') ||
        params.get('utr') ||
        params.get('txn_id') ||
        params.get('orderid') ||
        ''
      ).trim();

      const rawAmount = params.get('amount');
      const parsedAmount = rawAmount !== null && rawAmount !== undefined && rawAmount !== '' ? Number(rawAmount) : 500;
      const finalAmount = Number.isNaN(parsedAmount) || parsedAmount <= 0 ? 500 : parsedAmount;

      const hoaVal = String(params.get('hoa') || params.get('head_of_account') || '0039-00-800-45-02').trim();
      const statusVal = String(params.get('status') || params.get('payment_status') || 'success').trim();
      const reasonVal = String(params.get('reason') || params.get('error_desc') || params.get('error') || params.get('message') || '').trim();
      const createdVal = String(params.get('createdAt') || params.get('created_at') || params.get('date') || params.get('txnDate') || '').trim();

      const autoSub = String(params.get('autoSubmitted') || params.get('auto_submitted') || (statusVal === 'success' || statusVal === 'S' ? '1' : '0')).trim();
      const autoSubErr = String(params.get('autoSubmitError') || params.get('auto_submit_error') || '').trim();
      const sbmSub = String(params.get('sbmSubmitted') || params.get('sbm_submitted') || '0').trim();
      const sbmAppId = String(params.get('sbmApplicationId') || params.get('sbm_application_id') || savedSbmId || '').trim();
      const sbmSubErr = String(params.get('sbmSubmitError') || params.get('sbm_submit_error') || '').trim();

      this.vm = {
        applicationId: appId,
        transactionId: txnId,
        amount: finalAmount,
        hoa: hoaVal,
        status: statusVal,
        reason: reasonVal,
        createdAt: createdVal || new Date().toISOString(),
        autoSubmitted: autoSub,
        autoSubmitError: autoSubErr,
        sbmSubmitted: sbmSub,
        sbmApplicationId: sbmAppId,
        sbmSubmitError: sbmSubErr
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

    if (this.vm.applicationId && !this.hasSyncedStatus && this.licenseAppService) {
      this.hasSyncedStatus = true;
      this.licenseAppService.checkNewLicensePaymentStatus(this.vm.applicationId).subscribe({
        next: (res) => console.log('Receipt: verified payment status and advanced stage:', res),
        error: (err) => console.warn('Receipt: payment status sync check error:', err)
      });
    }
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

        // Also bubble up Salesman/Barman linkage info for the submitted view.
        const sbmId = String(this.vm.sbmApplicationId || '').trim();
        if (sbmId) sessionStorage.setItem('new_license_sbm_application_id', sbmId);
        sessionStorage.setItem(
          'new_license_sbm_submitted',
          String(this.vm.sbmSubmitted || '0').trim() === '1' ? '1' : '0'
        );
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

