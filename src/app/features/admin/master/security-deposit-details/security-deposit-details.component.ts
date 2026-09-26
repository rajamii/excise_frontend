import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { AdminService } from '../../admin.service';

export interface SecurityDepositRecordItem {
  id: number;
  applicant_user_id?: string;
  applicantUserId?: string;
  username?: string;
  applicant_name?: string;
  applicantName?: string;
  application_id?: string;
  applicationId?: string;
  reference_no?: string;
  referenceNo?: string;
  license_id?: string;
  licenseId?: string;
  establishment_name?: string;
  establishmentName?: string;
  amount: number | string;
  refunded_amount?: number | string;
  refundedAmount?: number | string;
  balance_amount?: number | string;
  balanceAmount?: number | string;
  status: string;
  transaction_id?: string;
  transactionId?: string;
  payment_date?: string;
  paymentDate?: string;
  from_date?: string;
  fromDate?: string;
  to_date?: string;
  toDate?: string;
  deposit_duration_days?: number;
  depositDurationDays?: number;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
  is_license_active?: boolean;
  isLicenseActive?: boolean;
  license_status_label?: string;
  licenseStatusLabel?: string;
  application_status?: string;
  applicationStatus?: string;
  application_stage?: string;
  applicationStage?: string;
  is_application_approved?: boolean;
  isApplicationApproved?: boolean;
  license_category_name?: string;
  licenseCategoryName?: string;
}

@Component({
  selector: 'app-security-deposit-details',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, DatePipe],
  templateUrl: './security-deposit-details.component.html',
  styleUrl: './security-deposit-details.component.scss'
})
export class SecurityDepositDetailsComponent implements OnInit {
  @ViewChild('deductDialogTpl') deductDialogTpl!: TemplateRef<any>;
  @ViewChild('detailsDialogTpl') detailsDialogTpl!: TemplateRef<any>;

  private dialogRef?: MatDialogRef<any>;

  // Data & Loading states
  records: SecurityDepositRecordItem[] = [];
  isLoading = false;
  isProcessing = false;

  // Statistics Cards
  stats = {
    total_deposit_amount: 0,
    total_balance_amount: 0,
    total_deducted_amount: 0,
    total_records_count: 0,
    total_active_count: 0,
    total_deducted_count: 0,
    total_refunded_count: 0,
  };

  // Filters
  searchTerm = '';
  selectedStatus = 'all';
  fromDate = '';
  toDate = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalRecords = 0;
  totalPages = 1;

  // Modal working states
  selectedRecord: SecurityDepositRecordItem | null = null;
  deductAmount: number = 0;
  deductRemarks: string = '';
  deductActionType: string = 'DEDUCTED';

  displayedColumns: string[] = [
    'sl',
    'applicantInfo',
    'appLicenseInfo',
    'appStatus',
    'amountInfo',
    'depositPeriod',
    'paymentDetails',
    'status',
    'actions',
  ];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.isLoading = true;
    this.adminService
      .getSecurityDepositRecords({
        search: this.searchTerm.trim() || undefined,
        status: this.selectedStatus !== 'all' ? this.selectedStatus : undefined,
        from_date: this.fromDate || undefined,
        to_date: this.toDate || undefined,
        page: this.currentPage,
        page_size: this.pageSize,
      })
      .subscribe({
        next: (resp) => {
          this.isLoading = false;
          this.records = resp?.results || [];
          this.totalRecords = resp?.count || this.records.length;
          this.totalPages = resp?.total_pages || 1;
          this.currentPage = resp?.page || 1;
          if (resp?.stats) {
            this.stats = {
              total_deposit_amount: Number(resp.stats.total_deposit_amount || 0),
              total_balance_amount: Number(resp.stats.total_balance_amount || 0),
              total_deducted_amount: Number(resp.stats.total_deducted_amount || 0),
              total_records_count: Number(resp.stats.total_records_count || this.totalRecords),
              total_active_count: Number(resp.stats.total_active_count || 0),
              total_deducted_count: Number(resp.stats.total_deducted_count || 0),
              total_refunded_count: Number(resp.stats.total_refunded_count || 0),
            };
          } else {
            this.recalculateStatsFromRecords();
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Failed to load security deposit records:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error Loading Records',
            text: err?.error?.detail || 'Unable to fetch security deposit records from server.',
          });
        },
      });
  }

  private recalculateStatsFromRecords(): void {
    let deposit = 0;
    let balance = 0;
    let deducted = 0;
    let active = 0;
    let dedCount = 0;
    let refCount = 0;

    for (const r of this.records) {
      const d = this.getDepositAmount(r);
      const b = this.getBalanceAmount(r);
      const ref = this.getRefundedAmount(r);
      deposit += d;
      balance += b;
      deducted += ref;
      if (r.status === 'PAID') active++;
      if (r.status === 'DEDUCTED' || r.status === 'FORFEITED') dedCount++;
      if (r.status === 'REFUNDED') refCount++;
    }

    this.stats = {
      total_deposit_amount: deposit,
      total_balance_amount: balance,
      total_deducted_amount: deducted,
      total_records_count: this.records.length,
      total_active_count: active,
      total_deducted_count: dedCount,
      total_refunded_count: refCount,
    };
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadRecords();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadRecords();
  }

  onResetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.fromDate = '';
    this.toDate = '';
    this.currentPage = 1;
    this.loadRecords();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadRecords();
  }

  // Open Deduct / Forfeit Modal
  openDeductModal(record: SecurityDepositRecordItem): void {
    this.selectedRecord = record;
    const balance = this.getBalanceAmount(record);
    this.deductAmount = balance > 0 ? balance : this.getDepositAmount(record);
    this.deductRemarks = '';
    this.deductActionType = 'DEDUCTED';

    this.dialogRef = this.dialog.open(this.deductDialogTpl, {
      width: '620px',
      disableClose: true,
      panelClass: 'custom-deposit-dialog',
    });
  }

  // Open Details Modal
  openDetailsModal(record: SecurityDepositRecordItem): void {
    this.selectedRecord = record;
    this.dialogRef = this.dialog.open(this.detailsDialogTpl, {
      width: '680px',
      panelClass: 'custom-deposit-dialog',
    });
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = undefined;
    }
  }

  // Submit Deduction
  submitDeduction(): void {
    if (!this.selectedRecord) return;

    if (!this.deductAmount || this.deductAmount <= 0) {
      Swal.fire('Validation Error', 'Please enter a valid deduction amount greater than zero.', 'warning');
      return;
    }

    const availableBalance = this.getBalanceAmount(this.selectedRecord);
    if (this.deductAmount > availableBalance) {
      Swal.fire(
        'Invalid Amount',
        `Deduction amount (₹${this.deductAmount}) cannot exceed available balance (₹${availableBalance}).`,
        'warning'
      );
      return;
    }

    if (!this.deductRemarks || !this.deductRemarks.trim()) {
      Swal.fire('Remarks Required', 'Please enter reason / remarks for deducting this security deposit.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Confirm Security Amount Deduction',
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6;">
          <p>Are you sure you want to deduct and forfeit <b>₹${this.deductAmount.toLocaleString('en-IN')}</b> from this security deposit?</p>
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin-top: 10px; border-radius: 6px; color: #92400e; font-size: 13px;">
            <b>⚠️ Important Notice:</b><br/>
            • The associated license will be <b>permanently suspended and deactivated</b>.<br/>
            • The application status will be <b>officially marked as Terminated</b>.<br/>
            • The licensee's security deposit balance will be <b>debited and forfeited</b>.
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Deduct & Terminate License',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeDeduction();
      }
    });
  }

  private executeDeduction(): void {
    if (!this.selectedRecord) return;
    this.isProcessing = true;

    this.adminService
      .deductSecurityDeposit(this.selectedRecord.id, {
        deduct_amount: this.deductAmount,
        remarks: this.deductRemarks.trim(),
        action_type: this.deductActionType,
      })
      .subscribe({
        next: (resp) => {
          this.isProcessing = false;
          this.closeDialog();
          Swal.fire({
            icon: 'success',
            title: 'Security Deposit Deducted',
            html: `
              <p>${resp?.message || 'Amount deducted and license suspended successfully.'}</p>
              <p style="color: #666; font-size: 13px;">License ID: <b>${resp?.details?.license_id || this.getLicenseId(this.selectedRecord) || 'N/A'}</b></p>
            `,
          });
          this.loadRecords();
        },
        error: (err) => {
          this.isProcessing = false;
          console.error('Deduction failed:', err);
          Swal.fire({
            icon: 'error',
            title: 'Deduction Failed',
            text: err?.error?.detail || err?.message || 'Failed to deduct security deposit.',
          });
        },
      });
  }

  // Safe Property Accessors (supports snake_case and camelCase)
  getApplicantName(item: any): string {
    return item?.applicant_name || item?.applicantName || item?.username || 'Applicant';
  }

  getUsername(item: any): string {
    return item?.username || item?.applicant_user_id || item?.applicantUserId || '';
  }

  getEstablishmentName(item: any): string {
    return item?.establishment_name || item?.establishmentName || '';
  }

  getApplicationId(item: any): string {
    return item?.application_id || item?.applicationId || item?.reference_no || item?.referenceNo || 'N/A';
  }

  getLicenseId(item: any): string {
    return item?.license_id || item?.licenseId || '';
  }

  getDepositAmount(item: any): number {
    return Number(item?.amount || 0);
  }

  getRefundedAmount(item: any): number {
    return Number(item?.refunded_amount ?? item?.refundedAmount ?? 0);
  }

  getBalanceAmount(item: any): number {
    return Number(item?.balance_amount ?? item?.balanceAmount ?? item?.amount ?? 0);
  }

  getDurationDays(item: any): string {
    const days = item?.deposit_duration_days ?? item?.depositDurationDays;
    if (days !== undefined && days !== null) {
      return `${days} Days`;
    }
    return '0 Days';
  }

  getFromDate(item: any): string {
    return item?.from_date || item?.fromDate || item?.payment_date || item?.paymentDate || '';
  }

  getToDate(item: any): string {
    return item?.to_date || item?.toDate || '';
  }

  getPaymentDate(item: any): string {
    return item?.payment_date || item?.paymentDate || item?.created_at || item?.createdAt || '';
  }

  getTransactionId(item: any): string {
    return item?.transaction_id || item?.transactionId || '';
  }

  getApplicationStatus(item: any): string {
    const st = item?.application_status || item?.applicationStatus;
    if (st) return st;
    if (item?.is_application_approved || item?.isApplicationApproved) return 'Approved';
    return 'Under Review';
  }

  getApplicationBadgeClass(item: any): string {
    const st = this.getApplicationStatus(item).toLowerCase();
    if (st.includes('terminate')) return 'app-badge-terminated';
    if (st.includes('approve')) return 'app-badge-approved';
    if (st.includes('reject')) return 'app-badge-rejected';
    if (st.includes('await') || st.includes('pay')) return 'app-badge-awaiting';
    return 'app-badge-review';
  }

  getStatusBadgeClass(status: string): string {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'PAID':
        return 'badge-paid';
      case 'DEDUCTED':
      case 'FORFEITED':
        return 'badge-deducted';
      case 'REFUNDED':
        return 'badge-refunded';
      case 'PARTIALLY_REFUNDED':
        return 'badge-partially-refunded';
      case 'ADJUSTED':
        return 'badge-adjusted';
      default:
        return 'badge-default';
    }
  }

  formatCurrency(val: any): string {
    const num = Number(val || 0);
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
