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
    autoSubmitError: ''
  };

  statusKind: 'success' | 'failed' = 'success';
  headerTitle = 'Application Fee Payment Successful';
  statusLabel = 'Payment Successful';

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
        autoSubmitError: String(params.get('autoSubmitError') || '').trim()
      };
      this.refreshDerived();
    });
    this.refreshDerived();
  }

  private normalizeStatus(value: string): 'success' | 'failed' {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'f' || raw === 'failed' || raw.includes('fail') || raw.includes('error')) return 'failed';
    return 'success';
  }

  private refreshDerived(): void {
    this.statusKind = this.normalizeStatus(this.vm.status);

    this.headerTitle =
      this.statusKind === 'failed' ? 'Application Fee Payment Failed' : 'Application Fee Payment Successful';

    if (this.statusKind === 'failed') this.statusLabel = 'Failed';
    else this.statusLabel = 'Payment Successful';
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

  printSlip(): void {
    window.print();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'new-license',
        source: 'application-fee-receipt',
        applicationId: this.vm.applicationId || undefined
      }
    });
  }
}

