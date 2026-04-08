import { Component, OnChanges, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SupplyChainService } from '../services/supplychain.service';
import { SupplyChainProfileService } from '../../../../core/services/supply-chain-profile.service';
import { PaymentIntegrationService } from '../../../../core/services/payment-integration.service';
import { environment } from '../../../../../environments/environment';

interface Permit {
  number: string;
  amount: number;
  isCancelled: boolean;
  isLocked: boolean;
  lockReason?: string;
  isSelected?: boolean;
}

interface CancellationListResponse {
  results?: any[];
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
  selector: 'app-cancellation-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation-request.component.html',
  styleUrls: ['./cancellation-request.component.scss'],
})
export class CancellationRequestComponent implements OnInit, OnChanges {
  @Input() referenceNo: string = '';
  @Output() close = new EventEmitter<void>();

  requisitionData: any = null;
  permits: Permit[] = [];
  selectedPermits: string[] = [];
  newlySelectedPermits: string[] = [];

  showDeclarationModal = false;
  showWalletConfirmationModal = false;
  showSuccessModal = false;
  showCancelModal = false;

  successMessage = '';
  errorMessage = '';
  isLoading = false;
  isWalletLoading = false;
  isSubmittingCancellation = false;
  walletErrorMessage = '';
  availableWalletBalance = 0;
  walletDeclarationAccepted = false;
  walletSourceLabel = 'Excise / Additional Wallet Balance';

  uploadedFiles: any[] = [];
  currentLicenseeId = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private supplyChainService: SupplyChainService,
    private profileService: SupplyChainProfileService,
    private paymentIntegrationService: PaymentIntegrationService
  ) {}

  ngOnInit() {
    console.log('CancellationRequestComponent: ngOnInit, refNo:', this.referenceNo);
    if (this.referenceNo) {
      this.loadData();
    }
    this.fetchProfile();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('CancellationRequestComponent: ngOnChanges', changes);
    if (changes['referenceNo']?.currentValue) {
      this.loadData();
    }
  }

  fetchProfile() {
    this.profileService.getProfile().subscribe({
      next: (res) => {
        if (res.exists && res.data) {
          this.currentLicenseeId = this.resolveLicenseeId(res.data);
          console.log('Fetched Licensee ID:', this.currentLicenseeId);
          if (this.currentLicenseeId) {
            this.loadWalletBalance();
          } else {
            this.walletErrorMessage = 'Active licensee id not found for the logged-in user.';
          }
        } else {
          console.warn('Profile not found.');
          this.currentLicenseeId = this.resolveLicenseeId();
        }
      },
      error: (err) => {
        console.error('Error fetching profile', err);
        this.currentLicenseeId = this.resolveLicenseeId();
        if (this.currentLicenseeId) {
          this.loadWalletBalance();
        }
      }
    });
  }

  loadData() {
    console.log('CancellationRequestComponent: loading data for', this.referenceNo);
    this.isLoading = true;
    this.errorMessage = '';
    this.selectedPermits = [];
    this.newlySelectedPermits = [];
    this.permits = [];

    this.http
      .get<any[]>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-requisitions/?our_ref_no=${this.referenceNo}`)
      .subscribe({
        next: (reqData) => {
          console.log('CancellationRequestComponent: req Data loaded', reqData);
          if (Array.isArray(reqData) && reqData.length > 0) {
            this.requisitionData = reqData[0];
            this.fetchExistingCancellations();
          } else {
            this.errorMessage = 'Requisition not found.';
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Error loading requisition:', error);
          this.errorMessage = 'Failed to load requisition data.';
          this.isLoading = false;
        }
      });
  }

  fetchExistingCancellations() {
    this.http
      .get<any[] | CancellationListResponse>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/?requisition_ref_no=${this.referenceNo}`)
      .subscribe({
        next: (cancelData) => {
          console.log('Cancellation Data:', cancelData);
          const permitStateMap = new Map<string, { isCancelled: boolean; isLocked: boolean; lockReason: string }>();
          const rows: any[] = Array.isArray(cancelData)
            ? cancelData
            : (Array.isArray(cancelData?.results) ? cancelData.results : []);

          rows.forEach((record: any) => {
            const cancelledRaw =
              record.cancelledPermitNumbers ||
              record.cancelledPermitNumber ||
              record.cancelled_permit_numbers ||
              record.cancelled_permit_number ||
              '';

            if (!cancelledRaw) {
              return;
            }

            const permitNumbers = String(cancelledRaw)
              .split(',')
              .map((num: string) => num.trim())
              .filter((num: string) => num.length > 0);

            const isApproved = this.isCommissionerApprovedCancellation(record);
            const isPaid = this.isPaidCancellation(record);
            const isLocked = this.isActiveCancellationRequest(record) || isPaid;
            const lockReason = isApproved ? 'Cancelled' : (isPaid ? 'Paid' : 'Already submitted');

            permitNumbers.forEach((num: string) => {
              const existing = permitStateMap.get(num) || {
                isCancelled: false,
                isLocked: false,
                lockReason: ''
              };

              permitStateMap.set(num, {
                isCancelled: existing.isCancelled || isApproved,
                isLocked: existing.isLocked || isLocked,
                lockReason: existing.lockReason || (isLocked ? lockReason : '')
              });
            });
          });

          this.generatePermitsFromRequisition(permitStateMap);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading cancellations:', error);
          this.generatePermitsFromRequisition(new Map());
          this.isLoading = false;
        }
      });
  }

  private isCommissionerApprovedCancellation(record: any): boolean {
    const status = String(record?.status || '').toLowerCase();
    const stageName = String(record?.current_stage_name || record?.currentStageName || '').toLowerCase();
    const merged = `${status} ${stageName}`;
    return merged.includes('approved') && merged.includes('commissioner');
  }

  private isRejectedCancellation(record: any): boolean {
    const status = String(record?.status || '').toLowerCase();
    const stageName = String(record?.current_stage_name || record?.currentStageName || '').toLowerCase();
    const merged = `${status} ${stageName}`;
    return merged.includes('reject');
  }

  private isPaidCancellation(record: any): boolean {
    if (record?.payment_completed === true || record?.paymentCompleted === true) {
      return true;
    }

    const paymentStatus = String(
      record?.payment_status ||
      record?.paymentStatus ||
      record?.wallet_payment_status ||
      ''
    ).toLowerCase();

    if (['success', 'paid', 'completed'].includes(paymentStatus)) {
      return true;
    }

    const status = String(record?.status || '').toLowerCase();
    return status.includes('payslip') || status.includes('paid');
  }

  private isActiveCancellationRequest(record: any): boolean {
    return !this.isRejectedCancellation(record);
  }

  private generatePermitsFromRequisition(
    permitStateMap: Map<string, { isCancelled: boolean; isLocked: boolean; lockReason: string }>
  ) {
    const detailsNumbersRaw =
      this.requisitionData?.details_permits_number ||
      this.requisitionData?.detailsPermitsNumber ||
      '';

    const explicitPermitNumbers = String(detailsNumbersRaw)
      .split(',')
      .map((num: string) => num.trim())
      .filter((num: string) => num.length > 0);

    if (explicitPermitNumbers.length > 0) {
      this.permits = explicitPermitNumbers.map((num: string) => ({
        number: num,
        amount: 1000,
        isCancelled: permitStateMap.get(num)?.isCancelled || false,
        isLocked: permitStateMap.get(num)?.isLocked || false,
        lockReason: permitStateMap.get(num)?.lockReason || '',
        isSelected: false
      }));
      return;
    }

    const totalCount =
      this.requisitionData?.requisitonNumberOfPermits ||
      this.requisitionData?.requisiton_number_of_permits ||
      0;

    this.generatePermits(totalCount, permitStateMap);
  }

  generatePermits(
    totalCount: any,
    permitStateMap: Map<string, { isCancelled: boolean; isLocked: boolean; lockReason: string }>
  ) {
    this.permits = [];
    const count = Number(totalCount);
    if (!count || isNaN(count)) {
      return;
    }

    for (let i = 1; i <= count; i++) {
      const numStr = i.toString();
      this.permits.push({
        number: numStr,
        amount: 1000,
        isCancelled: permitStateMap.get(numStr)?.isCancelled || false,
        isLocked: permitStateMap.get(numStr)?.isLocked || false,
        lockReason: permitStateMap.get(numStr)?.lockReason || '',
        isSelected: false
      });
    }
  }

  onPermitSelectionChange() {}

  togglePermit(permit: Permit, event: any) {
    if (permit.isLocked) {
      return;
    }

    permit.isSelected = !!event.target.checked;

    if (event.target.checked) {
      if (!this.newlySelectedPermits.includes(permit.number)) {
        this.newlySelectedPermits.push(permit.number);
      }
      if (!this.selectedPermits.includes(permit.number)) {
        this.selectedPermits.push(permit.number);
      }
    } else {
      this.newlySelectedPermits = this.newlySelectedPermits.filter((num) => num !== permit.number);
      this.selectedPermits = this.selectedPermits.filter((num) => num !== permit.number);
    }

    this.selectedPermits.sort((a, b) => Number(a) - Number(b));
  }

  getTotalBalance(): number {
    if (this.requisitionData?.grainEnaNumber) {
      return Number(this.requisitionData.grainEnaNumber) * this.newlySelectedPermits.length;
    }
    return 0;
  }

  loadPermitNumbers() {}

  loadCancellationData() {}

  onFileSelected(event: any, fileType: string) {
    const file = event.target.files[0];
    if (file) {
      this.uploadedFiles.push({
        file,
        type: fileType,
        name: file.name,
        size: this.formatFileSize(file.size),
      });
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes > 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    return (bytes / 1024).toFixed(2) + ' KB';
  }

  showDeclaration() {
    if (this.isSubmittingCancellation) {
      return;
    }
    const cancellationCharges = this.newlySelectedPermits.length * 1000;
    this.successMessage = `Refund of Rs ${cancellationCharges.toLocaleString()} will be processed after approval by the Commissioner.`;
    this.showDeclarationModal = true;
  }

  openWalletConfirmation() {
    if (this.isSubmittingCancellation) {
      return;
    }
    this.showDeclarationModal = false;

    if (!this.currentLicenseeId) {
      alert('Licensee profile not loaded. Cannot submit cancellation.');
      return;
    }

    this.walletDeclarationAccepted = false;
    this.walletErrorMessage = '';
    this.showWalletConfirmationModal = true;
    this.loadWalletBalance();
  }

  closeWalletConfirmation() {
    if (this.isSubmittingCancellation) {
      return;
    }

    this.showWalletConfirmationModal = false;
    this.walletDeclarationAccepted = false;
    this.walletErrorMessage = '';
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
        this.availableWalletBalance = this.extractCancellationWalletBalance(rows);
        if (!rows.length) {
          this.walletErrorMessage = 'Wallet summary rows are unavailable for the active licensee.';
        }
        this.isWalletLoading = false;
      },
      error: (summaryError) => {
        console.error('Error loading wallet summary:', summaryError);
        this.availableWalletBalance = 0;
        this.walletErrorMessage = 'Unable to load Excise / Additional wallet balance right now.';
        this.isWalletLoading = false;
      }
    });
  }

  confirmCancellation() {
    if (this.isSubmittingCancellation) {
      return;
    }
    if (!this.canProceedWithWalletConfirmation()) {
      return;
    }

    this.isSubmittingCancellation = true;

    const payload = {
      reference_no: this.referenceNo,
      permit_numbers: this.newlySelectedPermits,
      licensee_id: this.currentLicenseeId,
    };

    console.log('Submitting cancellation with payload:', payload);

    this.supplyChainService.submitCancellation(payload).subscribe({
      next: (response: any) => {
        const deductedAmount = this.toNumber(response?.wallet_deduction?.amount ?? this.getCancellationCharges());
        const balanceAfter = this.toNumber(response?.wallet_deduction?.balance_after ?? this.getBalanceAfterDeduction());
        const transactionId = String(response?.wallet_deduction?.transaction_id || '').trim();

        this.availableWalletBalance = balanceAfter;
        this.showWalletConfirmationModal = false;
        this.walletDeclarationAccepted = false;
        this.showSuccessModal = true;
        this.successMessage =
          `${response.message || 'Cancellation request submitted successfully.'}<br>` +
          `Wallet deducted: <strong>${this.formatCurrency(deductedAmount)}</strong><br>` +
          `Balance after deduction: <strong>${this.formatCurrency(balanceAfter)}</strong>` +
          (transactionId ? `<br>Wallet transaction ID: <strong>${transactionId}</strong>` : '');

        this.loadData();
        this.newlySelectedPermits = [];
        this.selectedPermits = [];
        const cancellationId = response?.id;

        // Ensure wallet debit exists (idempotent repair) so wallet history/balance updates reliably.
        if (cancellationId) {
          this.supplyChainService.syncCancellationWalletDebit(cancellationId).subscribe({
            next: (syncRes: any) => {
              const syncBalanceAfter = this.toNumber(syncRes?.wallet_deduction?.balance_after);
              if (Number.isFinite(syncBalanceAfter) && syncBalanceAfter > 0) {
                this.availableWalletBalance = syncBalanceAfter;
              }
            },
            error: (syncErr) => {
              console.warn('Wallet debit sync failed:', syncErr);
            }
          });
        }

        this.isSubmittingCancellation = false;
      },
      error: (error) => {
        console.error('Error submitting cancellation:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        this.errorMessage = 'Failed to submit cancellation: ' + (error.error?.error || error.error?.message || error.message);
        this.isSubmittingCancellation = false;
        alert(this.errorMessage);
      },
    });
  }

  redirectToDashboard() {
    this.showSuccessModal = false;
    this.router.navigate(['/dashboard'], {
      queryParams: { section: 'cancellation' },
      queryParamsHandling: 'merge'
    }).then(() => {
      window.location.reload();
    });
  }

  goBack() {
    this.close.emit();
  }

  getCancellationCharges(): number {
    return this.newlySelectedPermits.length * 1000;
  }

  getBalanceAfterDeduction(): number {
    return this.availableWalletBalance - this.getCancellationCharges();
  }

  hasSufficientWalletBalance(): boolean {
    return this.getBalanceAfterDeduction() >= 0;
  }

  canProceedWithWalletConfirmation(): boolean {
    return (
      !this.isWalletLoading &&
      !this.isSubmittingCancellation &&
      !this.walletErrorMessage &&
      this.walletDeclarationAccepted &&
      this.getCancellationCharges() > 0 &&
      this.hasSufficientWalletBalance()
    );
  }

  formatCurrency(amount: number): string {
    return `Rs ${this.toNumber(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  isPermitSelectionLocked(): boolean {
    return this.permits.length > 0 && this.permits.every((p) => p.isLocked);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractCancellationWalletBalance(rows: WalletSummaryRowLike[]): number {
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
