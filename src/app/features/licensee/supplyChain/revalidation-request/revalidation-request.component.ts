import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyChainService } from '../services/supplychain.service';
import { SupplyChainProfileService } from '../../../../core/services/supply-chain-profile.service';
import { PaymentIntegrationService } from '../../../../core/services/payment-integration.service';

interface DisplayData {
  refNo: string;
  date: Date;
  totalENA: string;
  bulk_spirit_type: string;
  permitNumbers: string;
  permitDate: Date;
  expiryDate: Date;
}

interface WalletSummaryRowLike {
  wallet_type?: string;
  walletType?: string;
  module_type?: string;
  moduleType?: string;
  head_of_account?: string;
  headOfAccount?: string;
  current_balance?: string | number;
  currentBalance?: string | number;
}

@Component({
  selector: 'app-revalidation-request',
  standalone: true,
  templateUrl: './revalidation-request.component.html',
  styleUrls: ['./revalidation-request.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class RevalidationRequestComponent implements OnInit {
  readonly revalidationCharge = 1000;

  message = '';
  messageType = 'danger';
  isViewMode = false;
  currentLicenseeId = '';
  availableWalletBalance = 0;
  walletSourceLabel = 'Excise / Additional Wallet Balance';
  walletErrorMessage = '';
  isWalletLoading = false;
  isSubmittingRevalidation = false;
  showDeclaration = false;
  showWalletConfirmation = false;
  walletDeclarationAccepted = false;
  currentStatus = '';
  currentAllowedActions: string[] = [];

  displayData: DisplayData = {
    refNo: '',
    date: new Date(),
    totalENA: '0',
    bulk_spirit_type: '',
    permitNumbers: '',
    permitDate: new Date(),
    expiryDate: new Date(),
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supplyChainService: SupplyChainService,
    private profileService: SupplyChainProfileService,
    private paymentIntegrationService: PaymentIntegrationService
  ) {}

  ngOnInit() {
    this.fetchProfile();
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      this.isViewMode = params['mode'] === 'view';

      if (id) {
        this.loadRevalidationData(id);
      } else {
        this.showMessage('No Revalidation ID provided.', 'danger');
        setTimeout(() => this.goBack(), 2000);
      }
    });
  }

  private loadRevalidationData(id: string) {
    this.supplyChainService.getRevalidationDetail(id).subscribe({
      next: (data) => {
        this.currentStatus = data.status || '';
        this.currentAllowedActions = data.allowedActions || data.allowed_actions || [];
        this.displayData = {
          refNo: data.ourRefNo || data.our_ref_no,
          date: new Date(data.revalidationDate || data.revalidation_date),
          totalENA: data.totalBl || data.total_bl,
          bulk_spirit_type: data.strength || data.bulk_spirit_type || '',
          permitNumbers: (data.requisitonNumberOfPermits || data.requisiton_number_of_permits || '0').toString(),
          permitDate: new Date(data.requisitionDate || data.requisition_date),
          expiryDate: new Date(data.revalidationDate || data.revalidation_date),
        };
      },
      error: (error) => {
        this.showMessage('Error loading data: ' + error.message, 'danger');
      },
    });
  }

  private fetchProfile() {
    this.profileService.getProfile().subscribe({
      next: (res: any) => {
        this.currentLicenseeId = this.resolveLicenseeId(res?.data);
        if (!this.currentLicenseeId) {
          this.walletErrorMessage = 'Active licensee id not found for the logged-in user.';
          return;
        }
        this.loadWalletBalance();
      },
      error: () => {
        this.currentLicenseeId = this.resolveLicenseeId();
        if (this.currentLicenseeId) {
          this.loadWalletBalance();
        } else {
          this.walletErrorMessage = 'Active licensee id not found for the logged-in user.';
        }
      }
    });
  }

  showDeclarationModal() {
    if (this.isSubmittingRevalidation) {
      return;
    }
    if (!this.canSubmitRevalidation()) {
      return;
    }
    this.showDeclaration = true;
  }

  closeDeclarationModal() {
    if (this.isSubmittingRevalidation) {
      return;
    }
    this.showDeclaration = false;
  }

  openWalletConfirmation() {
    if (this.isSubmittingRevalidation) {
      return;
    }
    this.showDeclaration = false;

    if (!this.currentLicenseeId) {
      this.showMessage('Licensee profile not loaded. Cannot submit revalidation.', 'danger');
      return;
    }

    this.walletDeclarationAccepted = false;
    this.showWalletConfirmation = true;
    this.loadWalletBalance();
  }

  closeWalletConfirmation() {
    if (this.isSubmittingRevalidation) {
      return;
    }
    this.showWalletConfirmation = false;
    this.walletDeclarationAccepted = false;
  }

  private loadWalletBalance() {
    if (!this.currentLicenseeId) {
      this.walletErrorMessage = 'Active licensee id not found for the logged-in user.';
      return;
    }

    this.isWalletLoading = true;
    this.walletErrorMessage = '';

    this.paymentIntegrationService.getWalletSummary(this.currentLicenseeId).subscribe({
      next: (response) => {
        const rows = Array.isArray(response?.results) ? response.results : [];
        this.availableWalletBalance = this.extractRevalidationWalletBalance(rows);
        if (!rows.length) {
          this.walletErrorMessage = 'Wallet summary rows are unavailable for the active licensee.';
        }
        this.isWalletLoading = false;
      },
      error: () => {
        this.availableWalletBalance = 0;
        this.walletErrorMessage = 'Unable to load Excise / Additional wallet balance right now.';
        this.isWalletLoading = false;
      }
    });
  }

  submitRevalidation() {
    if (this.isSubmittingRevalidation) {
      return;
    }
    if (!this.canProceedWithWalletConfirmation()) {
      return;
    }

    const id = this.route.snapshot.queryParams['id'];
    if (!id) {
      this.showMessage('No Revalidation ID found to submit.', 'danger');
      return;
    }

    this.isSubmittingRevalidation = true;

    this.supplyChainService.submitRevalidation(id).subscribe({
      next: () => {
        this.showWalletConfirmation = false;
        this.walletDeclarationAccepted = false;
        this.availableWalletBalance = this.getBalanceAfterDeduction();
        this.showMessage('Revalidation request submitted successfully!', 'success');

        setTimeout(() => {
          this.router.navigate(['/dashboard'], { queryParams: { section: 'revalidation' } });
        }, 1500);
      },
      error: (error) => {
        console.error('Submission error:', error);
        const errMsg = error.error?.message || error.error?.error || error.message || 'Unknown error';
        this.showMessage('Failed to submit revalidation: ' + errMsg, 'danger');
        this.isSubmittingRevalidation = false;
      }
    });
  }

  getBalanceAfterDeduction(): number {
    return this.availableWalletBalance - this.revalidationCharge;
  }

  hasSufficientWalletBalance(): boolean {
    return this.getBalanceAfterDeduction() >= 0;
  }

  canProceedWithWalletConfirmation(): boolean {
    return (
      !this.isWalletLoading &&
      !this.isSubmittingRevalidation &&
      !this.walletErrorMessage &&
      this.walletDeclarationAccepted &&
      this.hasSufficientWalletBalance()
    );
  }

  canSubmitRevalidation(): boolean {
    const normalizedStatus = String(this.currentStatus || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.currentAllowedActions.includes('REQUEST_REVALIDATION') ||
      normalizedStatus === 'importpermitextends45daysinvalid';
  }

  formatCurrency(amount: number): string {
    return `Rs ${this.toNumber(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  goBack() {
    const sourceParam = String(this.route.snapshot.queryParams['source'] || '').trim().toLowerCase();
    let normalizedSource = 'licensee-dashboard';

    if (sourceParam.includes('commissioner')) {
      normalizedSource = 'commissioner-dashboard';
    } else if (sourceParam.includes('permit-section')) {
      normalizedSource = 'permit-section';
    } else if (sourceParam.includes('licensee')) {
      normalizedSource = 'licensee-dashboard';
    }

    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'revalidation',
        source: normalizedSource
      }
    });
  }

  private showMessage(msg: string, type: string) {
    this.message = msg;
    this.messageType = type;

    setTimeout(() => {
      this.message = '';
      if (type === 'success') {
        this.isSubmittingRevalidation = false;
      }
    }, 5000);
  }

  private extractRevalidationWalletBalance(rows: WalletSummaryRowLike[]): number {
    return rows.reduce((sum, row) => {
      const walletType = String(row.wallet_type ?? row.walletType ?? '').toLowerCase();
      const moduleType = String(row.module_type ?? row.moduleType ?? '').toLowerCase();
      const hoa = String(row.head_of_account ?? row.headOfAccount ?? '').trim();
      const inferredWalletType = walletType || this.inferWalletTypeFromHoa(hoa);

      if (inferredWalletType === 'education_cess' || inferredWalletType === 'hologram') {
        return sum;
      }

      if (inferredWalletType === 'excise' || inferredWalletType === 'brewery' || moduleType === 'brewery') {
        return sum + this.toNumber(row.current_balance ?? row.currentBalance ?? 0);
      }

      return sum;
    }, 0);
  }

  private inferWalletTypeFromHoa(hoa: string): string {
    if (hoa === '0045-00-112-45-03') {
      return 'education_cess';
    }
    if (
      hoa === '0039-00-800-45-01' ||
      hoa === '0039-00-105-45-04' ||
      hoa === '0039-80-800-45-01'
    ) {
      return 'hologram';
    }
    if (hoa === '0038-00-102-45-00') {
      return 'brewery';
    }
    return 'excise';
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private resolveLicenseeId(profileData?: any): string {
    const fromProfile = this.pickFirstNonEmpty(profileData, [
      'licenseeId',
      'licensee_id',
      'licenseId',
      'license_id',
      'licenseeIdNo',
      'licensee_id_no'
    ]);

    if (fromProfile) {
      return fromProfile;
    }

    const fromSession = sessionStorage.getItem('currentUser');
    if (fromSession) {
      try {
        const parsed = JSON.parse(fromSession);
        return this.pickFirstNonEmpty(parsed, [
          'licensee_id',
          'licenseeId',
          'license_id',
          'licenseId',
          'licensee_id_no',
          'licenseeIdNo',
          'username',
          'userName'
        ]);
      } catch (error) {
        console.error('Invalid currentUser session payload:', error);
      }
    }

    return '';
  }

  private pickFirstNonEmpty(source: any, keys: string[]): string {
    if (!source || typeof source !== 'object') {
      return '';
    }

    for (const key of keys) {
      const value = String(source?.[key] ?? '').trim();
      if (value) {
        return value;
      }
    }

    return '';
  }
}
