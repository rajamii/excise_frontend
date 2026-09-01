import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../../../../environments/environment';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { ApplicationMovementComponent } from '../../../licensee-dashboard/application-table/application-movement/application-movement.component';
import { RoleService } from '../../../../../core/services/role.service';
import { PaymentIntegrationService } from '../../../../../core/services/payment-integration.service';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { SidebarPendingBadgeService } from '../../../../../shared/services/sidebar-pending-badge.service';
import { timeout } from 'rxjs';
import { ResolveObjectionsDialogComponent } from './resolve-objections-dialog/resolve-objections-dialog.component';
import { ObjectionDetailsDialogComponent } from './objection-details-dialog/objection-details-dialog.component';

interface NewLicenseCounts {
  applied: number;
  pending: number;
  objection: number;
  approved: number;
  rejected: number;
  awaitingPayment?: number;
}

interface NewLicenseItem {
  id: string;
  applicationId: string;
  siteEnquiryIsReverted?: boolean;
  isApproved?: boolean;
  licenseNumber?: string;
  applicantName: string;
  establishmentName: string;
  licenseCategoryName: string;
  licenseSubCategoryName: string;
  submittedOn: string;
  paymentStatus: string;
  isLicenseFeePaid?: boolean;
  isSecurityFeePaid?: boolean;
  canView: boolean;
  canPayNow: boolean;
  canPayLicenseFee?: boolean;
  licenseFeeAmount?: number;
  securityFeeAmount?: number;
  currentStage: string;
  currentStageRaw: string;
  statusGroup: 'applied' | 'pending' | 'objection' | 'approved' | 'rejected' | 'awaiting-payment';
  hasObjectionHistory?: boolean;
  hasObjectionUpdate?: boolean;
  updatedObjectionFields?: string[];
}

interface GroupedNewLicenseResponse {
  applied: any[];
  pending: any[];
  objection: any[];
  approved: any[];
  rejected: any[];
}

@Component({
  selector: 'app-new-license-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './new-license-dashboard.component.html',
  styleUrls: ['./new-license-dashboard.component.scss']
})
export class NewLicenseDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private roleService = inject(RoleService);
  private paymentIntegrationService = inject(PaymentIntegrationService);
  private licenseApplicationService = inject(LicenseApplicationService);
  private sidebarPendingBadgeService = inject(SidebarPendingBadgeService);
  private readonly apiBase = `${environment.apiBaseUrl}/transactional/new_license_application`;

  isLoading = false;
  error: string | null = null;

  counts: NewLicenseCounts = {
    applied: 0,
    pending: 0,
    objection: 0,
    approved: 0,
    rejected: 0,
    awaitingPayment: 0
  };

  private serverCounts: NewLicenseCounts = {
    applied: 0,
    pending: 0,
    objection: 0,
    approved: 0,
    rejected: 0,
    awaitingPayment: 0
  };

  allRows: NewLicenseItem[] = [];
  summaryRows: NewLicenseItem[] = [];
  filteredRows: NewLicenseItem[] = [];
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize = 5;
  pageIndex = 0;
  searchFilter = '';
  dateFilter = '';
  monthFilter = '';
  activeSummaryFilter: NewLicenseItem['statusGroup'] | '' = '';

  get approvedLicenseNumbers(): string[] {
    if (!this.isLicenseeUser()) return [];

    const numbers = this.allRows
      .filter((r) => r?.statusGroup === 'approved' && Boolean(r?.isApproved))
      .map((r) => String(r?.licenseNumber || '').trim())
      .filter(Boolean);

    return Array.from(new Set(numbers));
  }

  

  ngOnInit(): void {
    this.loadData();
    this.sidebarPendingBadgeService.refreshNeeded$.subscribe(() => {
      console.log('🔄 NewLicenseDashboardComponent: Refreshing data due to refreshNeeded signal');
      this.loadData();
    });
  }

  isLicenseeUser(): boolean {
    return this.roleService.isLicenseeRole();
  }

  /** Returns true when the current user needs to take action on this row. */
  needsLicenseeAction(row: NewLicenseItem): boolean {
    if (this.isLicenseeUser()) {
      // Licensee: flag awaiting payment (app fee or license fee) or objection
      if (row.statusGroup === 'objection') return true;
      if (row.canPayNow) return true;
      const stage = String(row.currentStageRaw || '').toLowerCase();
      return (stage.includes('payment') && stage.includes('await')) ||
        stage === 'awaiting_payment' ||
        stage === 'awaiting payment';
    }

    // Admin/officer: flag only pending rows (needs processing by officer).
    // Objection rows are waiting for the licensee to respond — not the officer's action.
    return row.statusGroup === 'pending';
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    // Reset to default pending filter on each fresh load.
    this.activeSummaryFilter = '';
    this.searchFilter = '';
    this.dateFilter = '';
    this.monthFilter = '';

    forkJoin({
      counts: this.licenseApplicationService.getNewLicenseDashboardCounts().pipe(
        catchError(() => of({ applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 }))
      ),
      grouped: this.licenseApplicationService.getNewLicenseApplicationsByStatus().pipe(
        catchError(() => of({ applied: [], pending: [], objection: [], approved: [], rejected: [] }))
      )
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.serverCounts = {
          applied: Number(counts?.applied || 0),
          pending: Number(counts?.pending || 0),
          objection: Number((counts as any)?.objection || 0),
          approved: Number(counts?.approved || 0),
          rejected: Number(counts?.rejected || 0),
          awaitingPayment: 0
        };
        this.allRows = this.flattenGroupedData(grouped);

        // Calculate actual counts from rows
        const actualObjectionCount = this.allRows.filter(r => r.statusGroup === 'objection').length;
        const actualPendingTotal = this.allRows.filter(r => r.statusGroup === 'pending' || r.statusGroup === 'awaiting-payment').length;

        // Default to Pending if any pending/awaiting-payment items exist, else Objection, else Total Applications ('')
        if (this.activeSummaryFilter === '') {
          if (actualPendingTotal > 0) {
            this.activeSummaryFilter = 'pending';
          } else if (actualObjectionCount > 0) {
            this.activeSummaryFilter = 'objection';
          } else {
            this.activeSummaryFilter = '';
          }
        }

        this.applyFilters();

        if (this.allRows.length === 0) {
          this.error = null;
        }
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load new license applications.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const q = this.searchFilter.trim().toLowerCase();

    // Summary rows are affected by search only (counts stay stable when selecting status via card).
    this.summaryRows = this.allRows.filter((row) => {
      const matchesSearch = !q
        || row.applicationId.toLowerCase().includes(q)
        || row.applicantName.toLowerCase().includes(q)
        || row.establishmentName.toLowerCase().includes(q)
        || row.currentStage.toLowerCase().includes(q);

      return matchesSearch;
    });

    const calculated = this.calculateCounts(this.summaryRows);
    this.serverCounts.awaitingPayment = this.allRows.filter(r => r.statusGroup === 'awaiting-payment').length;
    const canUseServerCounts = this.allRows.length === 0 && !this.searchFilter && !this.dateFilter && !this.monthFilter;
    this.counts = canUseServerCounts ? this.serverCounts : calculated;

    // If currently focused on a filter (e.g. 'objection') but that filter has 0 entries, reset to Total Applications ('')
    if (this.activeSummaryFilter) {
      const activeCount = this.counts[this.activeSummaryFilter as keyof NewLicenseCounts] ?? 0;
      if (activeCount === 0) {
        this.activeSummaryFilter = '';
      }
    }

    this.filteredRows = this.summaryRows.filter((row) => {
      // Date filter
      if (this.dateFilter) {
        const isoDate = this.toIsoDate(row.submittedOn);
        if (isoDate !== this.dateFilter) return false;
      }

      // Month filter (yyyy-MM)
      if (this.monthFilter) {
        const isoDate = this.toIsoDate(row.submittedOn);
        if (!isoDate || isoDate.substring(0, 7) !== this.monthFilter) return false;
      }

      // Summary card status filter
      if (this.activeSummaryFilter) {
        if (this.activeSummaryFilter === 'pending') {
          if (row.statusGroup !== 'pending' && row.statusGroup !== 'awaiting-payment') return false;
        } else if (row.statusGroup !== this.activeSummaryFilter) {
          return false;
        }
      }

      return true;
    });

    // Reset pagination whenever filters change.
    this.pageIndex = 0;
  }

  get totalPages(): number {
    if (this.filteredRows.length === 0) return 0;
    return Math.ceil(this.filteredRows.length / this.pageSize);
  }

  get pageStart(): number {
    if (this.filteredRows.length === 0) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get pageEnd(): number {
    if (this.filteredRows.length === 0) return 0;
    return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredRows.length);
  }

  get pagedRows(): NewLicenseItem[] {
    if (this.filteredRows.length === 0) return [];
    const start = this.pageIndex * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  onPageSizeChange(): void {
    this.pageIndex = 0;
  }

  prevPage(): void {
    if (this.pageIndex <= 0) return;
    this.pageIndex -= 1;
  }

  nextPage(): void {
    if (this.totalPages === 0) return;
    if (this.pageIndex >= this.totalPages - 1) return;
    this.pageIndex += 1;
  }

  showApprovedLicenseNumbers(): void {
    const items = this.approvedLicenseNumbers;
    if (items.length === 0) {
      void Swal.fire('License Number', 'No approved license number is available yet.', 'info');
      return;
    }

    const list = items.map((x) => `<li><code>${this.escapeHtml(x)}</code></li>`).join('');
    void Swal.fire({
      title: 'Approved License Number',
      html: `<div style="text-align:left"><ul style="padding-left: 1.25rem; margin:0">${list}</ul></div>`,
      icon: 'info',
      confirmButtonText: 'Close'
    });
  }

  clearFilters(): void {
    this.searchFilter = '';
    this.dateFilter = '';
    this.monthFilter = '';
    this.activeSummaryFilter = '';
    this.applyFilters();
  }

  onSummaryCardClick(group: NewLicenseItem['statusGroup'] | 'all'): void {
    if (group === 'all' || this.activeSummaryFilter === group) {
      this.activeSummaryFilter = '';
      this.applyFilters();
      return;
    }

    this.activeSummaryFilter = group as NewLicenseItem['statusGroup'];
    this.applyFilters();
  }

  viewApplication(row: NewLicenseItem): void {
    const id = row.id || row.applicationId;
    const source = this.getDetailViewSource();
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id,
        ref: row.applicationId,
        type: 'new-license',
        source
      }
    });
  }

  payNow(row: NewLicenseItem): void {
    if (!this.isLicenseeUser()) return;
    if (!row?.applicationId) return;
    if (!row.canPayNow) return;

    const applicationId = String(row.applicationId || '').trim();
    if (!applicationId) return;

    const cooldownRemaining = this.paymentIntegrationService.getCooldownRemainingSeconds(applicationId);
    if (cooldownRemaining > 0) {
      this.paymentIntegrationService.showCooldownPopup(cooldownRemaining);
      return;
    }

    const isPending = String(row.paymentStatus || '').trim().toLowerCase() === 'pending';
    if (isPending) {
      void Swal.fire({
        title: 'Payment Pending',
        html:
          `Your last BillDesk payment attempt is still showing as <b>Pending</b>.<br/>` +
          `There may be an issue with the payment response from BillDesk. You can try again later.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Proceed',
        cancelButtonText: 'Back',
        allowOutsideClick: false,
      }).then((res) => {
        if (!res.isConfirmed) return;
        this.startBilldeskInitiation(applicationId);
      });
      return;
    }

    void Swal.fire({
      title: 'Retry Application Fee Payment?',
      text: `Proceed to pay application fee for ${row.applicationId}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Pay Now',
      cancelButtonText: 'Cancel',
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.startBilldeskInitiation(applicationId);
    });
  }

  payLicenseFee(row: NewLicenseItem): void {
    if (!this.isLicenseeUser()) return;
    if (!row?.applicationId) return;

    const applicationId = String(row.applicationId || '').trim();
    if (!applicationId) return;

    const licenseFee = row.licenseFeeAmount || 5000;
    const securityFee = row.securityFeeAmount || 5000;
    const total = licenseFee + securityFee;

    const feeRow = (label: string, amount: number, accent = false) => `
      <div style="display:flex; justify-content:space-between; align-items:center;
                  padding:10px 14px; border-radius:8px; margin-bottom:6px;
                  background:${accent ? '#f0fdf8' : '#f9fafb'};
                  border:1px solid ${accent ? '#6ee7c7' : '#e5e7eb'};">
        <span style="color:#374151; font-size:14px;">${label}</span>
        <span style="font-weight:700; color:${accent ? '#0d6e56' : '#111827'}; font-size:14px;">&#8377;${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      </div>`;

    void Swal.fire({
      title: '',
      html: `
        <div style="font-family:'Segoe UI',sans-serif; text-align:left;">
          <!-- Header -->
          <div style="text-align:center; margin-bottom:20px;">
            <div style="display:inline-flex; align-items:center; justify-content:center;
                        width:52px; height:52px; border-radius:50%;
                        background:linear-gradient(135deg,#065f46,#10b981); margin-bottom:10px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="white"/>
              </svg>
            </div>
            <div style="font-size:22px; font-weight:700; color:#065f46; line-height:1.2;">Proceed to Pay License Fee</div>
            <div style="font-size:13px; color:#6b7280; margin-top:4px;">Application: <b>${this.escapeHtml(applicationId)}</b></div>
          </div>

          <!-- Fee Summary -->
          <div style="border-radius:10px; border:1px solid #d1fae5; overflow:hidden; margin-bottom:12px;">
            <div style="background:#ecfdf5; padding:10px 16px; font-size:12px; font-weight:600;
                        color:#065f46; letter-spacing:0.6px; text-transform:uppercase;">
              Payment Summary
            </div>
            <div style="padding:12px 12px 4px; background:#ffffff;">
              ${feeRow('License Fee', licenseFee, true)}
              ${feeRow('Security Deposit', securityFee, true)}
            </div>
            <!-- Total -->
            <div style="display:flex; justify-content:space-between; align-items:center;
                        padding:14px 16px; background:linear-gradient(135deg,#065f46,#10b981);
                        border-top:1px solid #6ee7c7;">
              <span style="color:#d1fae5; font-size:15px; font-weight:600;">Total Payable</span>
              <span style="color:#ffffff; font-size:20px; font-weight:800;">&#8377;${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <!-- Info note -->
          <div style="margin-top:14px; padding:14px 16px; background:#f0f9ff; border:1px solid #bae6fd;
                      border-radius:8px; font-size:13px; color:#0369a1; text-align: left; display:flex; flex-direction:column; gap:8px;">
            <div style="font-weight: 700; display:flex; gap:8px; align-items:center;">
              <span style="font-size:16px;">&#8505;</span>
              <span>Important Payment Instructions:</span>
            </div>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.5; color:#334155;">
              <li><b>License Fee:</b> Pay by navigating to the <b>License Fee Wallet</b> tab and clicking <b>Pay Now</b>.</li>
              <li style="background: #fffbeb; padding: 8px 12px; border-radius: 6px; border: 1px solid #fde68a; margin-top: 8px; color: #b45309; list-style-type: none; margin-left: -20px;">
                &#9888; &nbsp;<b>Security Deposit:</b> Simply <b>recharge/add money</b> to the <b>Security Deposit Wallet</b>. Recharging is sufficient to mark it as paid.
              </li>
            </ul>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '&#10003; &nbsp;Proceed to Wallet',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#065f46',
      cancelButtonColor: '#6b7280',
      width: '700px'
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.router.navigate(['/dashboard'], {
        queryParams: {
          section: 'wallet',
          action: 'pay',
          tab: 'license_fee',
          walletView: 'others',
          id: applicationId,
          type: 'new-license',
          ref: applicationId,
          referenceNo: applicationId,
          amount: licenseFee,
          securityAmount: securityFee,
          source: 'new-license'
        }
      });
    });
  }

  private startBilldeskInitiation(applicationId: string): void {
    void Swal.fire({
      title: 'Redirecting to BillDesk',
      text: 'Preparing application fee payment...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    this.paymentIntegrationService
      .initiateNewLicenseFee(String(applicationId).trim(), 500)
      .pipe(timeout(30000))
      .subscribe({
        next: (initRes: any) => {
          Swal.close();
          this.paymentIntegrationService.clearRetryState(applicationId);

          const hasSDK = (initRes?.bdOrderId || initRes?.bd_order_id || initRes?.bdorderid) && 
                         (initRes?.authToken || initRes?.auth_token || initRes?.rdata);

          if (hasSDK) {
            try {
              this.paymentIntegrationService.launchBillDeskSDK(initRes, (txn) => {
                if (txn.status === 'success' || txn.status === '0300') {
                  
                  Swal.fire({
                    title: 'Verifying Payment',
                    text: 'Securely recording your transaction. Please wait...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                  });

                  // FIXED: Manually trigger Webhook to prevent race conditions with table reload
                  const formData = new FormData();
                  const txResponse = txn.transaction_response || txn.auth_token || '';
                  formData.append('transaction_response', txResponse);

                  this.http.post(`${environment.apiBaseUrl}/transactional/payment-gateway/billdesk/webhook/`, formData, { responseType: 'text' })
                    .subscribe({
                      next: () => {
                        this.loadData();
                        Swal.fire('Success', 'Application fee paid and submitted successfully!', 'success');
                      },
                      error: () => {
                        // Fallback refresh
                        setTimeout(() => {
                          this.loadData();
                          Swal.fire('Success', 'Application fee paid and submitted successfully!', 'success');
                        }, 2000);
                      }
                    });
                } else {
                  Swal.fire('Payment Incomplete', 'Payment was cancelled or declined.', 'info');
                }
              });
            } catch (err) {
              void Swal.fire('Error', 'Payment SDK failed to load. Please refresh.', 'error');
            }
          } else {
            this.paymentIntegrationService.recordBilldeskFailure(applicationId);
            void Swal.fire('Error', 'Missing SDK gateway parameters.', 'error');
          }
        },
        error: (err: any) => {
          this.paymentIntegrationService.handleInitiationError(err, applicationId);
        },
      });
  }

  private submitToBillDesk(url: string, requestMsg: string): void {
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'msg';
      input.value = requestMsg;

      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } catch {
      void Swal.fire('Error', 'Unable to redirect to BillDesk. Please try again.', 'error');
    }
  }

  private extractRetryAfterSeconds(err: any): number {
    const httpStatus = Number(err?.status || 0);
    if (httpStatus !== 409) return 0;
    const raw = err?.error?.retry_after_seconds || err?.error?.retryAfterSeconds || 0;
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  }

 

  

  

  private getDetailViewSource(): string {
    const roleId = Number(this.roleService.getCurrentUser()?.roleId || 0);

    if (this.roleService.isLicenseeRole(roleId)) {
      return 'licensee';
    }

    switch (roleId) {
      case 5:
        return 'permit-section';
      case 6:
        return 'itcell';
      case 7:
        return 'officer-in-charge';
      case 9:
      case 10:
        return 'commissioner-dashboard';
      default:
        return 'commissioner-dashboard';
    }
  }

  viewTimeline(row: NewLicenseItem): void {
    const applicationId = String(row.applicationId || '').trim();
    if (!applicationId) return;

    const encoded = encodeURIComponent(applicationId);
    this.http.get<any>(`${this.apiBase}/detail/${encoded}/`).subscribe({
      next: (res: any) => {
        this.dialog.open(ApplicationMovementComponent, {
          width: '700px',
          maxHeight: '80vh',
          data: { movementDataSource: { data: [res] } }
        });
      },
      error: (err: any) => {
        const msg = err?.error?.detail || err?.error?.error || err?.message || 'Failed to load timeline.';
        void Swal.fire('Error', String(msg), 'error');
      }
    });
  }

  private flattenGroupedData(grouped: GroupedNewLicenseResponse): NewLicenseItem[] {
    const mapGroup = (items: any[] | undefined, statusGroup: NewLicenseItem['statusGroup']): NewLicenseItem[] => {
      if (!Array.isArray(items)) {
        return [];
      }

      return items.map((item: any) => {
        const rawPayment = String(
          item?.application_fee_payment_status ||
          item?.applicationFeePaymentStatus ||
          item?.payment_status ||
          item?.paymentStatus ||
          ''
        ).trim();
        const paymentStatus = this.normalizePaymentStatus(rawPayment);
        const feePaid = Boolean(item?.is_application_fee_paid ?? item?.isApplicationFeePaid);
        const canView = paymentStatus === 'Successful' || feePaid;
        const canPayNow = this.isLicenseeUser() && !feePaid && paymentStatus !== 'Successful';
        const paymentDateRaw = item?.application_fee_payment_date || item?.applicationFeePaymentDate;
        const submittedOn = paymentStatus === 'Successful'
          ? this.formatDate(paymentDateRaw || item?.created_at || item?.createdAt || item?.submitted_on)
          : this.formatDate(item?.created_at || item?.createdAt || item?.submitted_on);

        const currentStageRaw = String(item?.current_stage_name || item?.currentStageName || item?.current_stage || '');
        const currentStageId = item?.current_stage_id || item?.currentStageId || item?.current_stage;
        let finalStatusGroup: NewLicenseItem['statusGroup'] = statusGroup;
        if (this.isLicenseeUser()) {
          const rawLower = currentStageRaw.toLowerCase();
          const isAwaiting = 
            rawLower.includes('awaiting') && rawLower.includes('payment') ||
            rawLower.includes('payment') ||
            canPayNow ||
            currentStageId === 23 ||
            currentStageId === '23';

          if (isAwaiting) {
            finalStatusGroup = 'awaiting-payment';
          }
        }

        // Licensee UX: a failed/unpaid application fee means the application is not submitted to workflow yet.
        const currentStage = this.isLicenseeUser() && !canView
          ? (paymentStatus === 'Failed' ? 'Application Not Submitted (Payment Failed)' : 'Application Not Submitted')
          : this.computeCurrentStageLabel(item, finalStatusGroup, currentStageRaw);

        const transactions = Array.isArray(item?.transactions) ? item.transactions : [];
        const txnText = (t: any) => `${t?.action ?? ''} ${t?.remarks ?? ''} ${t?.to_stage ?? ''} ${t?.to_stageName ?? ''} ${t?.to_stage_name ?? ''}`;
        const hasObjectionHistory = transactions.some((t: any) => /objection/i.test(txnText(t)));
        const hasObjectionUpdate = transactions.some((t: any) => /resolve|correct|update/i.test(txnText(t)) && /objection/i.test(txnText(t)));

        const updatedObjectionFields = this.computeUpdatedObjectionFields(item);
        const siteEnquiryIsReverted = Boolean(
          (item?.site_enquiry_is_reverted ?? item?.siteEnquiryIsReverted ?? item?.siteEnquiryReverted) || false
        );

        const applicationId = String(item?.application_id || item?.applicationId || item?.id || 'N/A');
        const isApproved = Boolean(item?.is_approved ?? item?.isApproved ?? statusGroup === 'approved');
        const licenseNumber = this.deriveNewLicenseNaNumber(applicationId, item);

        const isLicenseFeePaid = Boolean(item?.is_license_fee_paid ?? item?.isLicenseFeePaid ?? item?.is_fee_paid ?? item?.isFeePaid);
        const isSecurityFeePaid = Boolean(item?.is_security_fee_paid ?? item?.isSecurityFeePaid ?? item?.is_security_deposit_paid ?? item?.isSecurityDepositPaid);

        const categoryName = String(
          item?.license_category_name ||
          item?.licenseCategoryName ||
          item?.license_category?.name ||
          item?.license_category ||
          item?.license_type_name ||
          item?.licenseTypeName ||
          'N/A'
        ).trim();

        const subCategoryName = String(
          item?.license_sub_category_name ||
          item?.licenseSubCategoryName ||
          item?.license_sub_category?.name ||
          item?.license_sub_category ||
          ''
        ).trim();

        const isAwaitingLicenseFee = this.isLicenseeUser() &&
          (finalStatusGroup === 'awaiting-payment' || String(currentStageId) === '23' || currentStageRaw.toLowerCase().includes('awaiting')) &&
          (!isLicenseFeePaid || !isSecurityFeePaid);

        const rawLicFee = Number(item?.license_fee_amount ?? item?.licenseFeeAmount ?? item?.yearly_license_fee ?? item?.yearlyLicenseFee ?? 5000);
        const rawSecFee = Number(item?.security_fee_amount ?? item?.securityFeeAmount ?? item?.security_deposit_amount ?? item?.securityDepositAmount ?? 5000);
        const licenseFeeAmount = Number.isFinite(rawLicFee) && rawLicFee > 0 ? rawLicFee : 5000;
        const securityFeeAmount = Number.isFinite(rawSecFee) && rawSecFee > 0 ? rawSecFee : licenseFeeAmount;

        return ({
          id: applicationId,
          applicationId,
          siteEnquiryIsReverted,
          isApproved,
          licenseNumber,
          applicantName: this.getApplicantName(item),
          establishmentName: String(item?.establishment_name || item?.establishmentName || 'N/A'),
          licenseCategoryName: categoryName,
          licenseSubCategoryName: subCategoryName,
          submittedOn,
          paymentStatus,
          isLicenseFeePaid,
          isSecurityFeePaid,
          canView,
          canPayNow,
          canPayLicenseFee: isAwaitingLicenseFee,
          licenseFeeAmount,
          securityFeeAmount,
          currentStageRaw,
          currentStage,
          statusGroup: finalStatusGroup,
          hasObjectionHistory,
          hasObjectionUpdate,
          updatedObjectionFields
        });
      });
    };

    const combined = [
      ...mapGroup(grouped?.applied, 'applied'),
      ...mapGroup(grouped?.pending, 'pending'),
      ...mapGroup(grouped?.objection, 'objection'),
      ...mapGroup(grouped?.approved, 'approved'),
      ...mapGroup(grouped?.rejected, 'rejected')
    ];

    // De-duplicate by applicationId (backend sometimes returns the same application twice).
    const priority: Record<NewLicenseItem['statusGroup'], number> = {
      applied: 1,
      pending: 2,
      objection: 3,
      approved: 4,
      rejected: 4,
      'awaiting-payment': 5
    };

    const byId = new Map<string, NewLicenseItem>();
    for (const row of combined) {
      const id = String(row?.applicationId || '').trim();
      if (!id) continue;

      const existing = byId.get(id);
      if (!existing) {
        byId.set(id, row);
        continue;
      }

      const a = priority[row.statusGroup] ?? 0;
      const b = priority[existing.statusGroup] ?? 0;
      if (a > b) {
        byId.set(id, row);
        continue;
      }
    }

    return Array.from(byId.values());
  }

  private computeCurrentStageLabel(item: any, statusGroup: NewLicenseItem['statusGroup'], currentStageRaw: string): string {
    if (this.isLicenseeUser()) {
      return this.simplifyStageForLicensee(statusGroup, currentStageRaw);
    }

    if (statusGroup === 'objection') {
      const raisedByRole = this.inferObjectionRaisedByRoleName(item);
      const label = raisedByRole ? this.toDisplayRoleName(raisedByRole) : 'Admin';
      return `Objection by ${label}`;
    }

    return this.formatStageName(currentStageRaw || statusGroup);
  }

  private inferObjectionRaisedByRoleName(item: any): string {
    const transactions = Array.isArray(item?.transactions) ? item.transactions : [];
    if (!transactions.length) return '';

    const txnText = (t: any) => `${t?.action ?? ''} ${t?.remarks ?? ''}`;

    const objectionTxn =
      transactions.find((t: any) => /objection/i.test(txnText(t)))
      || transactions.find((t: any) => /objection/i.test(String(t?.stage?.name ?? t?.stage_name ?? t?.stage ?? '')));

    const roleName = String(
      objectionTxn?.forwarded_by?.name
      || objectionTxn?.forwardedBy?.name
      || objectionTxn?.forwarded_to?.name
      || objectionTxn?.forwardedTo?.name
      || ''
    ).trim();

    return roleName;
  }

  private toDisplayRoleName(roleName: string): string {
    const cleaned = String(roleName || '').trim();
    if (!cleaned) return 'Admin';
    return cleaned
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private computeUpdatedObjectionFields(item: any): string[] {
    const objections = Array.isArray(item?.objections) ? item.objections : [];
    const resolved = objections
      .filter((o: any) => !!o && (o?.isResolved === true || o?.is_resolved === true))
      .map((o: any) => String(o?.fieldName || o?.field_name || '').trim())
      .filter(Boolean);

    return Array.from(new Set(resolved));
  }

  resolveObjections(row: NewLicenseItem): void {
    if (!this.isLicenseeUser()) return;
    if (row.statusGroup !== 'objection') return;

    const applicationId = String(row.applicationId || '').trim();
    if (!applicationId) return;

    this.dialog.open(ResolveObjectionsDialogComponent, {
      width: 'min(980px, 95vw)',
      maxWidth: '95vw',
      data: { applicationId }
    }).afterClosed().subscribe((updated: boolean) => {
      if (updated) {
        this.loadData();
      }
    });
  }

  viewObjectionDetails(row: NewLicenseItem): void {
    if (this.isLicenseeUser()) return;
    if (!row.hasObjectionHistory) return;

    const applicationId = String(row.applicationId || '').trim();
    if (!applicationId) return;

    this.dialog.open(ObjectionDetailsDialogComponent, {
      width: 'min(820px, 92vw)',
      maxWidth: '92vw',
      panelClass: 'objection-details-dialog',
      data: { applicationId }
    });
  }

  private normalizePaymentStatus(value: string): string {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'Pending';
    if (raw === 's' || raw === 'success' || raw.includes('success')) return 'Successful';
    if (raw === 'f' || raw === 'failed' || raw.includes('fail') || raw.includes('error')) return 'Failed';
    if (raw === 'p' || raw === 'pending' || raw.includes('pending')) return 'Pending';
    return String(value);
  }

  private getApplicantName(item: any): string {
    if (item?.applicant_name) return String(item.applicant_name);
    if (item?.applicantName) return String(item.applicantName);
    if (item?.applicant?.first_name || item?.applicant?.last_name) {
      return `${item?.applicant?.first_name || ''} ${item?.applicant?.last_name || ''}`.trim();
    }
    return 'N/A';
  }

  private formatDate(dateValue: string | undefined): string {
    if (!dateValue) return 'N/A';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return 'N/A';

    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-');
  }

  /** Converts a formatted date string (e.g. "02-May-2026" or ISO) to "yyyy-MM-dd" for filter comparison. */
  private toIsoDate(dateValue: string | undefined): string {
    if (!dateValue) return '';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return '';
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatStageName(stageValue: any): string {
    const raw = String(stageValue ?? '').trim();
    if (!raw) return 'Not available';

    // Backend sometimes returns numeric stage id instead of stage name.
    // Stage 23 = awaiting_payment (critical UX for licensee + admin to take payment action).
    const stageId = Number.parseInt(raw, 10);
    if (Number.isFinite(stageId) && String(stageId) === raw) {
      if (stageId === 23) return 'Awaiting Payment';
    }
    return raw
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private simplifyStageForLicensee(statusGroup: NewLicenseItem['statusGroup'], stageValue: any): string {
    if (statusGroup === 'approved') return 'Approved';
    if (statusGroup === 'rejected') return 'Rejected';
    if (statusGroup === 'objection') return 'Objection by Admin';
    if (statusGroup === 'awaiting-payment') return 'Awaiting Payment';

    const raw = String(stageValue ?? '').toLowerCase();
    const stageId = Number.parseInt(raw, 10);
    if (Number.isFinite(stageId) && String(stageId) === raw) {
      if (stageId === 23) return 'Awaiting Payment';
    }
    if (raw.includes('approved')) return 'Approved';
    if (raw.includes('reject')) return 'Rejected';
    if (raw.includes('awaiting') && raw.includes('payment')) return 'Awaiting Payment';
    // Some backends return payment-related stage names without the "awaiting_" prefix.
    if (raw.includes('payment')) return 'Awaiting Payment';

    // Licensee UX: don't expose internal role/stage names (commissioner/permit section/etc).
    return 'Pending';
  }

  private calculateCounts(rows: NewLicenseItem[]): NewLicenseCounts {
    const next: NewLicenseCounts = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 };
    for (const row of rows || []) {
      if (row?.statusGroup === 'applied') next.applied += 1;
      else if (row?.statusGroup === 'pending' || row?.statusGroup === 'awaiting-payment') next.pending += 1;
      else if (row?.statusGroup === 'objection') next.objection += 1;
      else if (row?.statusGroup === 'approved') next.approved += 1;
      else if (row?.statusGroup === 'rejected') next.rejected += 1;
    }
    return next;
  }

  private deriveNewLicenseNaNumber(applicationId: string, item: any): string {
    const direct = String(item?.license_id || item?.licenseId || item?.license_number || item?.licenseNumber || '').trim();
    if (direct) return direct;

    const id = String(applicationId || '').trim();
    if (id.startsWith('NA/')) return id;
    if (id.startsWith('NLI/')) return `NA/${id.slice(4)}`;
    return '';
  }

  private escapeHtml(text: string): string {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private syncActiveSummaryFilter(): void {
    // activeSummaryFilter is managed directly by onSummaryCardClick; nothing to sync here.
  }
}
