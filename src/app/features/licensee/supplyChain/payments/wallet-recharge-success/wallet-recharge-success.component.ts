import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

type RechargeSuccessViewModel = {
  transactionId: string;
  walletTransactionId: string;
  walletType: string;
  hoa: string;
  amount: number;
  status: string;
  createdAt: string;
};

@Component({
  selector: 'app-wallet-recharge-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wallet-recharge-success.component.html',
  styleUrls: ['./wallet-recharge-success.component.scss']
})
export class WalletRechargeSuccessComponent {
  vm: RechargeSuccessViewModel = {
    transactionId: '',
    walletTransactionId: '',
    walletType: '',
    hoa: '',
    amount: 0,
    status: 'pending', // FIXED: Change baseline fallback to pending instead of success
    createdAt: ''
  };

  statusKind: 'success' | 'failed' | 'pending' = 'pending'; // Added explicit pending tier
  headerTitle = 'Wallet Recharge Status';
  headerSubtitle = 'Processing payment update...';
  statusLabel = 'Pending';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParamMap.subscribe((params) => {
      // -----------------------------------------------------------------
      // FIXED: Extract raw parameter and normalize to a standard lowercase token
      // -----------------------------------------------------------------
      const rawStatus = params.get('orderStatus') || params.get('status') || 'pending';
      const normalizedStatus = String(rawStatus).trim().toLowerCase();

      this.vm = {
        transactionId: String(params.get('orderRefNumber') || params.get('transaction_id') || params.get('transactionId') || '').trim(),
        walletTransactionId: String(params.get('sbiOrderRefNumber') || params.get('sbi_order_ref') || params.get('walletTransactionId') || '').trim(),
        walletType: String(params.get('walletType') || '').trim(),
        hoa: String(params.get('hoa') || '').trim(),
        amount: Number(params.get('orderAmount') || params.get('amount') || 0),
        status: normalizedStatus, // Safely bound as uniform lowercase
        createdAt: String(params.get('createdAt') || '').trim()
      };
      
      this.refreshDerived();
    });
  }

  private refreshDerived(): void {
    // -----------------------------------------------------------------
    // FIXED: Clean matching logic handling all 3 gateway states safely
    // -----------------------------------------------------------------
    if (this.vm.status === 'failed' || this.vm.status.includes('fail')) {
      this.statusKind = 'failed';
      this.headerTitle = 'Wallet Recharge Failed';
      this.headerSubtitle = 'The payment could not be completed. Your wallet balance was not charged.';
      this.statusLabel = 'Transaction Failed';
    } else if (this.vm.status === 'success' || this.vm.status.includes('success')) {
      this.statusKind = 'success';
      this.headerTitle = 'Wallet Recharge Successful';
      this.headerSubtitle = 'Amount credited successfully via SBI ePay.';
      this.statusLabel = 'Payment Successful';
    } else {
      this.statusKind = 'pending';
      this.headerTitle = 'Wallet Recharge Pending';
      this.headerSubtitle = 'Your transaction verification is currently processing. Please wait or check history.';
      this.statusLabel = 'Pending Verification';
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
    } catch { }
  }

  goToWalletRecharge(): void {
    this.router.navigate(['/dashboard'], {
      queryParams: { section: 'wallet', tab: 'recharge', source: 'wallet-recharge-success' }
    }).then(() => { window.location.reload(); });
  }

  goToWalletHistory(): void {
    this.router.navigate(['/dashboard'], {
      queryParams: { section: 'wallet', tab: 'history', source: 'wallet-recharge-success' }
    }).then(() => { window.location.reload(); });
  }
}