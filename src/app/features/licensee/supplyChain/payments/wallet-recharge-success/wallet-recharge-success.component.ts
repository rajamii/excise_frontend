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
    status: 'success',
    createdAt: ''
  };

  statusKind: 'success' | 'failed' = 'success';
  headerTitle = 'Wallet Recharge Successful';
  headerSubtitle = 'Amount credited for testing (dummy flow).';
  statusLabel = 'Payment Successful';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.refreshDerived();
    this.route.queryParamMap.subscribe((params) => {
      this.vm = {
        transactionId: String(params.get('transactionId') || '').trim(),
        walletTransactionId: String(params.get('walletTransactionId') || '').trim(),
        walletType: String(params.get('walletType') || '').trim(),
        hoa: String(params.get('hoa') || '').trim(),
        amount: Number(params.get('amount') || 0),
        status: String(params.get('status') || 'success').trim(),
        createdAt: String(params.get('createdAt') || '').trim()
      };
      this.refreshDerived();
    });
  }

  private normalizeStatus(value: string): string {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'success';
    if (raw === 'f' || raw === 'failed' || raw.includes('fail')) return 'failed';
    if (raw === 's' || raw === 'success' || raw.includes('success')) return 'success';
    return raw;
  }

  private refreshDerived(): void {
    const normalized = this.normalizeStatus(this.vm.status);
    this.statusKind = normalized === 'failed' ? 'failed' : 'success';

    this.headerTitle = this.statusKind === 'failed' ? 'Wallet Recharge Failed' : 'Wallet Recharge Successful';
    this.headerSubtitle =
      this.statusKind === 'failed'
        ? 'Payment could not be completed. Please retry or contact support if the amount is debited.'
        : 'Amount credited for testing (dummy flow).';

    if (normalized === 'failed') this.statusLabel = 'Failed';
    else if (normalized === 'success') this.statusLabel = 'Payment Successful';
    else this.statusLabel = String(this.vm.status || 'success');
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
    } catch {
      // no-op
    }
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

