import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

export type PaymentSuccessViewModel = {
  // Common & Wallet fields
  transactionId: string;
  walletTransactionId: string;
  walletType: string;
  hoa: string;
  amount: number;
  status: string;
  createdAt: string;

  // New License Application fields
  paymentType: string;
  moduleCode: string;
  applicationId: string;
  modeOfOperation: string;
  sbmApplicationId: string;
  sbmRole: string;
  sbmSubmitted: boolean;
  establishmentName: string;
  applicantName: string;
  licenseCategory: string;
};

@Component({
  selector: 'app-wallet-recharge-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wallet-recharge-success.component.html',
  styleUrls: ['./wallet-recharge-success.component.scss']
})
export class WalletRechargeSuccessComponent {
  vm: PaymentSuccessViewModel = {
    transactionId: '',
    walletTransactionId: '',
    walletType: '',
    hoa: '',
    amount: 0,
    status: 'success',
    createdAt: '',
    paymentType: '',
    moduleCode: '',
    applicationId: '',
    modeOfOperation: '',
    sbmApplicationId: '',
    sbmRole: '',
    sbmSubmitted: false,
    establishmentName: '',
    applicantName: '',
    licenseCategory: ''
  };

  statusKind: 'success' | 'failed' = 'success';
  headerTitle = 'Payment Successful';
  headerSubtitle = '';
  statusLabel = 'Payment Successful';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParamMap.subscribe((params) => {
      const pType = String(params.get('paymentType') || params.get('payment_type') || '').trim();
      const mCode = String(
        params.get('moduleCode') ||
        params.get('module_code') ||
        params.get('paymentModuleCode') ||
        params.get('payment_module_code') ||
        ''
      ).trim();
      const appId = String(params.get('applicationId') || params.get('application_id') || '').trim();
      const sbmId = String(params.get('sbmApplicationId') || params.get('sbm_application_id') || '').trim();
      const sbmSub = params.get('sbmSubmitted') === '1' || params.get('sbm_submitted') === '1' || params.get('sbmSubmitted') === 'true' || params.get('sbm_submitted') === 'true';

      const rawAmount = params.get('amount') || (pType.includes('new_license') || mCode === '001' || appId ? '500' : '0');

      this.vm = {
        transactionId: String(params.get('transactionId') || params.get('transaction_id') || '').trim(),
        walletTransactionId: String(params.get('walletTransactionId') || params.get('wallet_transaction_id') || '').trim(),
        walletType: String(params.get('walletType') || params.get('wallet_type') || '').trim(),
        hoa: String(params.get('hoa') || params.get('head_of_account') || '').trim(),
        amount: Number(rawAmount) || 0,
        status: String(params.get('status') || params.get('payment_status') || 'success').trim(),
        createdAt: String(params.get('createdAt') || params.get('created_at') || params.get('date') || params.get('txnDate') || '').trim(),
        paymentType: pType,
        moduleCode: mCode,
        applicationId: appId,
        modeOfOperation: String(params.get('modeOfOperation') || params.get('mode_of_operation') || '').trim(),
        sbmApplicationId: sbmId,
        sbmRole: String(params.get('sbmRole') || params.get('sbm_role') || '').trim(),
        sbmSubmitted: sbmSub,
        establishmentName: String(params.get('establishmentName') || params.get('establishment_name') || '').trim(),
        applicantName: String(params.get('applicantName') || params.get('applicant_name') || '').trim(),
        licenseCategory: String(params.get('licenseCategory') || params.get('license_category') || '').trim()
      };

      // If this is a New License Application payment, auto-redirect to the dedicated Application Fee Receipt page
      if (this.isNewLicensePayment) {
        const queryParams: Record<string, any> = {};
        params.keys.forEach((key) => {
          queryParams[key] = params.get(key);
        });
        this.router.navigate(['/dashboard/new-license/application-fee/receipt'], { queryParams, replaceUrl: true });
        return;
      }

      // Set fallback HOA for New License if empty
      if (this.isNewLicensePayment && !this.vm.hoa) {
        this.vm.hoa = '0039-00-800-45-02';
      }

      this.refreshDerived();
    });
    this.refreshDerived();
  }

  get isNewLicensePayment(): boolean {
    const pType = String(this.vm.paymentType || '').toLowerCase();
    const mCode = String(this.vm.moduleCode || '').trim();
    const appId = String(this.vm.applicationId || '').trim();
    const isWallet = Boolean(this.vm.walletType) || Boolean(this.vm.walletTransactionId);

    // If explicit wallet recharge parameters are present without license application id
    if (isWallet && !appId && !pType.includes('license') && mCode !== '001') {
      return false;
    }

    return (
      pType.includes('new_license') ||
      pType.includes('license_fee') ||
      pType.includes('new-license') ||
      mCode === '001' ||
      Boolean(appId)
    );
  }

  get hasSalesmanBarman(): boolean {
    const mode = String(this.vm.modeOfOperation || '').toLowerCase();
    return (
      Boolean(this.vm.sbmApplicationId) ||
      mode === 'salesman' ||
      mode === 'barman' ||
      mode.includes('salesman') ||
      mode.includes('barman')
    );
  }

  private normalizeStatus(value: string): string {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'success';
    if (raw === 'f' || raw === 'failed' || raw.includes('fail') || raw.includes('error')) return 'failed';
    if (raw === 's' || raw === 'success' || raw.includes('success')) return 'success';
    return raw;
  }

  private refreshDerived(): void {
    const normalized = this.normalizeStatus(this.vm.status);
    this.statusKind = normalized === 'failed' ? 'failed' : 'success';

    if (this.isNewLicensePayment) {
      if (this.statusKind === 'failed') {
        this.headerTitle = 'New License Application Payment Failed';
        this.headerSubtitle = 'Payment could not be completed. Please retry or contact the State Excise Department if the amount was debited.';
        this.statusLabel = 'Payment Failed';
      } else {
        this.headerTitle = 'New License Application Payment Successful';
        this.headerSubtitle = 'Application fee payment received. Your new license application has been successfully submitted.';
        this.statusLabel = 'Payment Successful';
      }
    } else {
      this.headerTitle = this.statusKind === 'failed' ? 'Wallet Recharge Failed' : 'Wallet Recharge Successful';
      this.headerSubtitle =
        this.statusKind === 'failed'
          ? 'Payment could not be completed. Please retry or contact support if the amount was debited.'
          : 'Your wallet has been credited successfully.';

      if (normalized === 'failed') this.statusLabel = 'Failed';
      else if (normalized === 'success') this.statusLabel = 'Payment Successful';
      else this.statusLabel = String(this.vm.status || 'success');
    }
  }

  get formattedAmount(): string {
    const value = Number(this.vm.amount || (this.isNewLicensePayment ? 500 : 0));
    return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get createdAtLabel(): string {
    if (!this.vm.createdAt) {
      return new Date().toLocaleString('en-IN');
    }
    const parsed = new Date(this.vm.createdAt);
    if (Number.isNaN(parsed.getTime())) return String(this.vm.createdAt);
    return parsed.toLocaleString('en-IN');
  }

  copy(text: string): void {
    const value = String(text || '').trim();
    if (!value) return;
    const clipboard = (navigator as any)?.clipboard;
    if (clipboard?.writeText) {
      clipboard.writeText(value).catch(() => this.fallbackCopy(value));
      return;
    }
    this.fallbackCopy(value);
  }

  private fallbackCopy(text: string): void {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch {
      // no-op
    }
  }

  printPayslip(): void {
    window.print();
  }

  goToNewLicenseDashboard(): void {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'new-license',
        source: 'payment-success'
      }
    }).then(() => {
      window.location.reload();
    });
  }

  goToWalletRecharge(): void {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'wallet',
        tab: 'recharge',
        source: 'wallet-recharge-success'
      }
    }).then(() => {
      window.location.reload();
    });
  }

  goToWalletHistory(): void {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'wallet',
        tab: 'history',
        source: 'wallet-recharge-success'
      }
    }).then(() => {
      window.location.reload();
    });
  }
}


