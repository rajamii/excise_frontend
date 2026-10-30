import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, takeUntil, timeout } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../../../../environments/environment';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { ApplicationMovementComponent } from '../../../licensee-dashboard/application-table/application-movement/application-movement.component';
import { RoleService } from '../../../../../core/services/role.service';
import { PaymentIntegrationService } from '../../../../../core/services/payment-integration.service';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { SidebarPendingBadgeService } from '../../../../../shared/services/sidebar-pending-badge.service';
import { ResolveObjectionsDialogComponent } from './resolve-objections-dialog/resolve-objections-dialog.component';
import { ObjectionDetailsDialogComponent } from './objection-details-dialog/objection-details-dialog.component';
import { ApplicationFeeSlipDialogComponent } from './application-fee-slip-dialog/application-fee-slip-dialog.component';

export interface ActiveCountdownTimer {
  timerType: 'objection' | 'payment';
  label: string;
  title: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedTime: string;
  urgency: 'normal' | 'warn' | 'critical' | 'expired';
  warningText: string;
  targetDeadline: Date;
  rejectionStage: string;
}

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
  isApplicationFeePaid?: boolean;
  applicationFeeTransactionId?: string;
  applicationFeePaymentDate?: string;
  modeOfOperation?: string;
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

  // Countdown timer fields
  isPaymentTimerActive?: boolean;
  paymentDeadlineAt?: string | null;
  paymentTimeRemainingSeconds?: number | null;
  isObjectionTimerActive?: boolean;
  objectionDeadlineAt?: string | null;
  objectionTimeRemainingSeconds?: number | null;
  activeTimer?: ActiveCountdownTimer | null;
  rejectionReason?: string | null;
  isAutoRejected?: boolean;
  isPaymentFailed?: boolean;
  isPaymentPending?: boolean;
  applicationFeeTransactions?: any[];
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
export class NewLicenseDashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private roleService = inject(RoleService);
  private paymentIntegrationService = inject(PaymentIntegrationService);
  private licenseApplicationService = inject(LicenseApplicationService);
  private sidebarPendingBadgeService = inject(SidebarPendingBadgeService);
  private readonly apiBase = `${String(environment.apiBaseUrl || '').replace(/\/+$/, '')}/transactional/new_license_application`;
  get canForceSubmit(): boolean {
    if (typeof window === 'undefined') return false;
    const host = String(window.location?.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  }

  private countdownInterval: any = null;
  private expiredTriggeredIds = new Set<string>();
  private initialFilterApplied = false;

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

  rows: NewLicenseItem[] = [];
  totalCount = 0;
  totalPages = 0;
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize = 5;
  pageIndex = 0;
  searchFilter = '';
  dateFilter = '';
  monthFilter = '';
  activeSummaryFilter: NewLicenseItem['statusGroup'] | '' = '';

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  get approvedLicenseNumbers(): string[] {
    if (!this.isLicenseeUser()) return [];

    const numbers = this.rows
      .filter((r) => r?.statusGroup === 'approved' && Boolean(r?.isApproved))
      .map((r) => String(r?.licenseNumber || '').trim())
      .filter(Boolean);

    return Array.from(new Set(numbers));
  }

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((term) => {
      this.searchFilter = term;
      this.pageIndex = 0;
      this.loadData();
    });

    this.loadData();
    this.sidebarPendingBadgeService.refreshNeeded$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      console.log('🔄 NewLicenseDashboardComponent: Refreshing data due to refreshNeeded signal');
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.licenseApplicationService.setActiveNewLicenseTimers([]);
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
    this.loadCounts();
    if (this.initialFilterApplied) {
      this.loadTableData();
    }
  }

  loadCounts(): void {
    const filters: Record<string, any> = {};
    if (this.searchFilter.trim()) filters['search'] = this.searchFilter.trim();
    if (this.dateFilter) filters['date'] = this.dateFilter;
    if (this.monthFilter) filters['month'] = this.monthFilter;

    this.licenseApplicationService.getNewLicenseDashboardCounts(filters).pipe(
      catchError(() => of({ applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 }))
    ).subscribe((counts) => {
      this.counts = {
        applied: Number(counts?.applied || 0),
        pending: Number(counts?.pending || 0),
        objection: Number((counts as any)?.objection || 0),
        approved: Number(counts?.approved || 0),
        rejected: Number(counts?.rejected || 0),
        awaitingPayment: Number((counts as any)?.awaiting_payment || 0)
      };

      if (!this.initialFilterApplied) {
        this.initialFilterApplied = true;
        const statusParam = String(this.route.snapshot.queryParams['status'] || '').toLowerCase();
        if (['applied', 'pending', 'objection', 'approved', 'rejected', 'awaiting-payment'].includes(statusParam)) {
          this.activeSummaryFilter = statusParam as NewLicenseItem['statusGroup'];
        } else if (this.counts.pending > 0) {
          this.activeSummaryFilter = 'pending';
        } else {
          this.activeSummaryFilter = '';
        }
        this.pageIndex = 0;
        this.loadTableData();
      }
    });
  }

  loadTableData(): void {
    this.isLoading = true;
    this.error = null;

    const params: Record<string, any> = {
      page: this.pageIndex + 1,
      page_size: this.pageSize
    };

    if (this.activeSummaryFilter) {
      params['status'] = this.activeSummaryFilter;
    }
    if (this.searchFilter.trim()) {
      params['search'] = this.searchFilter.trim();
    }
    if (this.dateFilter) {
      params['date'] = this.dateFilter;
    }
    if (this.monthFilter) {
      params['month'] = this.monthFilter;
    }

    this.licenseApplicationService.getNewLicenseApplicationsByStatus(params).pipe(
      catchError(() => {
        this.error = 'Failed to load new license applications.';
        this.isLoading = false;
        return of(null);
      })
    ).subscribe((resp) => {
      if (!resp) return;

      if (resp.results && Array.isArray(resp.results)) {
        this.totalCount = Number(resp.count ?? 0);
        this.totalPages = Number(resp.total_pages ?? Math.ceil(this.totalCount / this.pageSize) ?? 1);
        this.rows = this.mapRawItemsToRows(resp.results, this.activeSummaryFilter);
      } else if (typeof resp === 'object') {
        // Fallback for legacy grouped format
        const all = this.flattenGroupedData(resp);
        this.totalCount = all.length;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
        const start = this.pageIndex * this.pageSize;
        this.rows = all.slice(start, start + this.pageSize);
      } else {
        this.rows = [];
        this.totalCount = 0;
        this.totalPages = 0;
      }

      this.startCountdownTimer();
      this.isLoading = false;
    });
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadData();
  }

  applyFilters(): void {
    this.onFilterChange();
  }

  get pageStart(): number {
    if (this.totalCount === 0) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get pageEnd(): number {
    if (this.totalCount === 0) return 0;
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalCount);
  }

  get pagedRows(): NewLicenseItem[] {
    return this.rows;
  }

  trackByApplicationId(index: number, row: NewLicenseItem): string {
    return row?.applicationId || row?.id || String(index);
  }

  onPageSizeChange(): void {
    this.pageIndex = 0;
    this.loadTableData();
  }

  prevPage(): void {
    if (this.pageIndex <= 0) return;
    this.pageIndex -= 1;
    this.loadTableData();
  }

  nextPage(): void {
    if (this.totalPages === 0 || this.pageIndex >= this.totalPages - 1) return;
    this.pageIndex += 1;
    this.loadTableData();
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
    this.pageIndex = 0;
    this.loadData();
  }

  onSummaryCardClick(group: NewLicenseItem['statusGroup'] | 'all'): void {
    if (group === 'all' || this.activeSummaryFilter === group) {
      this.activeSummaryFilter = '';
    } else {
      this.activeSummaryFilter = group as NewLicenseItem['statusGroup'];
    }
    this.pageIndex = 0;
    this.loadTableData();
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
    const isFailed = String(row.paymentStatus || '').trim().toLowerCase() === 'failed';
    const categoryName = String(row.licenseCategoryName || '').trim();
    const subCategoryName = String(row.licenseSubCategoryName || '').trim();

    const titleText = isFailed
      ? 'Retry Application Fee Payment'
      : (isPending ? 'Application Fee Payment (Pending)' : 'Pay Application Fee');

    const modalHtml = `
      <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; text-align:left;">
        <!-- Header -->
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid #e2e8f0;">
          <div style="width:50px; height:50px; border-radius:12px; background:linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(29, 78, 216, 0.25); flex-shrink:0;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 7.28V5.5C21 4.67 20.33 4 19.5 4H4.5C3.67 4 3 4.67 3 5.5V18.5C3 19.33 3.67 20 4.5 20H19.5C20.33 20 21 19.33 21 18.5V16.72C21.61 16.36 22 15.73 22 15V9C22 8.27 21.61 7.64 21 7.28ZM20 9V15H17C16.45 15 16 14.55 16 14V10C16 9.45 16.45 9 17 9H20ZM5 6H19V7.28C18.39 7.64 18 8.27 18 9V15C18 15.73 18.39 16.36 19 16.72V18H5V6ZM10 14H13V12H10V14ZM8 10H10V8H8V10Z" fill="white"/>
            </svg>
          </div>
          <div style="flex-grow:1;">
            <div style="font-size:19px; font-weight:700; color:#0f172a; line-height:1.2;">
              ${this.escapeHtml(titleText)}
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-top:5px; flex-wrap:wrap;">
              <span style="font-size:12px; font-weight:600; color:#1e40af; background:#dbeafe; padding:2px 8px; border-radius:4px;">
                ${this.escapeHtml(applicationId)}
              </span>
              ${categoryName ? `<span style="font-size:12px; color:#475569; font-weight:500;">${this.escapeHtml(categoryName)}${subCategoryName ? ` - ${this.escapeHtml(subCategoryName)}` : ''}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Status & Retry Guidance Notice -->
        ${isFailed ? `
          <div style="background:#fef2f2; border:1px solid #fecaca; border-left:4px solid #ef4444; border-radius:8px; padding:12px 14px; margin-bottom:14px;">
            <div style="display:flex; align-items:flex-start; gap:10px;">
              <span style="font-size:18px; line-height:1; color:#ef4444;">&#9888;</span>
              <div style="font-size:13px; color:#991b1b; line-height:1.45;">
                <div style="font-weight:700; margin-bottom:3px;">Previous Payment Attempt Failed</div>
                Your earlier payment attempt was not completed or got cancelled. No payment was credited towards this application.
                <div style="margin-top:6px; color:#7f1d1d; font-weight:600;">
                  &#10003; You can safely retry paying the application fee below. Your application will be submitted for departmental review once payment succeeds.
                </div>
              </div>
            </div>
          </div>
        ` : (isPending ? `
          <div style="background:#fffbeb; border:1px solid #fde68a; border-left:4px solid #f59e0b; border-radius:8px; padding:12px 14px; margin-bottom:14px;">
            <div style="display:flex; align-items:flex-start; gap:10px;">
              <span style="font-size:18px; line-height:1; color:#f59e0b;">&#9203;</span>
              <div style="font-size:13px; color:#92400e; line-height:1.45;">
                <div style="font-weight:700; margin-bottom:3px;">Payment Awaiting Gateway Response</div>
                Your last attempt is currently awaiting confirmation from BillDesk. If money was debited from your account, please wait up to 15-30 minutes for automated reconciliation.
                <div style="margin-top:6px; color:#78350f; font-weight:600;">
                  &#10003; If no money was debited or you want to try again with a different payment mode, you can retry below.
                </div>
              </div>
            </div>
          </div>
        ` : `
          <div style="background:#f0f9ff; border:1px solid #bae6fd; border-left:4px solid #0284c7; border-radius:8px; padding:12px 14px; margin-bottom:14px;">
            <div style="display:flex; align-items:flex-start; gap:10px;">
              <span style="font-size:18px; line-height:1; color:#0284c7;">&#9432;</span>
              <div style="font-size:13px; color:#0369a1; line-height:1.45;">
                <div style="font-weight:700; margin-bottom:3px;">Application Processing Fee Required</div>
                To submit your new license application for departmental scrutiny, an application fee of &#8377;500.00 is required.
              </div>
            </div>
          </div>
        `)}

        <!-- Fee Breakdown Box -->
        <div style="border-radius:10px; border:1px solid #e2e8f0; overflow:hidden; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="background:#f8fafc; padding:8px 14px; font-size:11px; font-weight:700; color:#475569; letter-spacing:0.5px; text-transform:uppercase; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between;">
            <span>Fee Particulars</span>
            <span>Amount</span>
          </div>
          <div style="padding:10px 14px; background:#ffffff;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; font-size:13px; color:#334155;">
              <span>New License Application Fee (One-time)</span>
              <span style="font-weight:600; color:#0f172a;">&#8377;500.00</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; font-size:13px; color:#64748b;">
              <span>Gateway Charges (BillDesk)</span>
              <span style="font-weight:600; color:#16a34a;">FREE (&#8377;0.00)</span>
            </div>
          </div>
          <!-- Total -->
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:linear-gradient(135deg, #1e293b, #0f172a); border-top:1px solid #334155;">
            <div>
              <span style="color:#94a3b8; font-size:12px; font-weight:500; display:block;">Total Amount Payable</span>
              <span style="color:#cbd5e1; font-size:11px;">(Inclusive of all taxes)</span>
            </div>
            <span style="color:#38bdf8; font-size:20px; font-weight:800; letter-spacing:0.5px;">&#8377;500.00</span>
          </div>
        </div>

        <!-- Security Badge -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:9px 12px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; font-size:12px; color:#64748b; margin-bottom:${this.canForceSubmit ? '14px' : '4px'};">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="color:#16a34a; font-size:14px;">&#128274;</span>
            <span><b>256-Bit SSL Encrypted</b> BillDesk Gateway</span>
          </div>
          <span>UPI &#8226; NetBanking &#8226; Cards</span>
        </div>

        <!-- Dev Testing Panel (Localhost Only) -->
        ${this.canForceSubmit ? `
          <div style="border:1.5px dashed #f59e0b; border-radius:10px; padding:12px 14px; background:#fffbeb; margin-bottom:6px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
              <div style="font-size:12px; font-weight:700; color:#b45309; display:flex; align-items:center; gap:6px;">
                <span>&#9881;</span>
                <span>Developer Testing Tools (Localhost Simulation)</span>
              </div>
              <span style="font-size:10px; color:#92400e; background:#fef3c7; padding:2px 6px; border-radius:4px; font-weight:700;">DEV ONLY</span>
            </div>
            <p style="font-size:12px; color:#78350f; margin:0 0 10px 0; line-height:1.4;">
              Simulate payment outcomes directly from this table popup to test retrying and status transitions:
            </p>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;">
              <button id="dev-sim-success-btn" type="button"
                style="padding:8px 8px; font-size:12px; font-weight:700; color:#ffffff; background:#16a34a; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 1px 2px rgba(0,0,0,0.1);"
                onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
                <span>&#10003;</span> Force Success
              </button>
              <button id="dev-sim-failed-btn" type="button"
                style="padding:8px 8px; font-size:12px; font-weight:700; color:#ffffff; background:#dc2626; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 1px 2px rgba(0,0,0,0.1);"
                onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">
                <span>&#10007;</span> Force Failed
              </button>
              <button id="dev-sim-pending-btn" type="button"
                style="padding:8px 8px; font-size:12px; font-weight:700; color:#78350f; background:#fde68a; border:1px solid #f59e0b; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 1px 2px rgba(0,0,0,0.05);"
                onmouseover="this.style.background='#fcd34d'" onmouseout="this.style.background='#fde68a'">
                <span>&#9203;</span> Force Pending
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    void Swal.fire({
      title: '',
      html: modalHtml,
      showCancelButton: true,
      confirmButtonText: '&#10148; &nbsp;Proceed to Pay via BillDesk (&#8377;500.00)',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1d4ed8',
      cancelButtonColor: '#64748b',
      width: '640px',
      allowOutsideClick: false,
      didOpen: (modalEl) => {
        if (!this.canForceSubmit) return;
        const btnSuccess = modalEl.querySelector('#dev-sim-success-btn');
        if (btnSuccess) {
          btnSuccess.addEventListener('click', () => {
            Swal.close();
            this.executeDevForceSubmit(applicationId, 'S');
          });
        }
        const btnFailed = modalEl.querySelector('#dev-sim-failed-btn');
        if (btnFailed) {
          btnFailed.addEventListener('click', () => {
            Swal.close();
            this.executeDevForceSubmit(applicationId, 'F');
          });
        }
        const btnPending = modalEl.querySelector('#dev-sim-pending-btn');
        if (btnPending) {
          btnPending.addEventListener('click', () => {
            Swal.close();
            this.executeDevForceSubmit(applicationId, 'P');
          });
        }
      }
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.startBilldeskInitiation(applicationId);
    });
  }

  executeDevForceSubmit(applicationId: string, statusKind: 'S' | 'F' | 'P'): void {
    const isSuccess = statusKind === 'S';
    const isPending = statusKind === 'P';

    Swal.fire({
      title: 'Simulating Payment...',
      text: isSuccess
        ? 'Processing simulated payment success and advancing workflow...'
        : isPending
        ? 'Recording simulated pending gateway transaction...'
        : 'Recording simulated payment failure...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.licenseApplicationService.forceSubmitNewLicenseApplication(applicationId, statusKind).subscribe({
      next: (res: any) => {
        this.loadData();
        if (isSuccess) {
          Swal.fire({
            icon: 'success',
            title: 'Payment Successful (Dev Sim)',
            html:
              `<div style="font-family:'Segoe UI',sans-serif; text-align:center;">` +
              `<p style="font-size:15px; color:#166534; font-weight:600; margin-bottom:8px;">` +
              `Application Fee of &#8377;500.00 Paid Successfully!` +
              `</p>` +
              `<p style="font-size:13px; color:#475569;">` +
              `Application <b>${this.escapeHtml(applicationId)}</b> has been submitted and moved to <b>District User</b> for initial review.` +
              `</p>` +
              `</div>`,
            confirmButtonText: 'Done',
            confirmButtonColor: '#16a34a'
          });
        } else if (isPending) {
          Swal.fire({
            icon: 'warning',
            title: 'Payment Pending (Dev Sim)',
            html:
              `<div style="font-family:'Segoe UI',sans-serif; text-align:center;">` +
              `<p style="font-size:15px; color:#9a3412; font-weight:600; margin-bottom:8px;">` +
              `Payment Transaction Awaiting Response` +
              `</p>` +
              `<p style="font-size:13px; color:#475569;">` +
              `Application <b>${this.escapeHtml(applicationId)}</b> is marked as <b>Awaiting Response</b>.<br/>` +
              `Stage remains at <b>Applied</b>. You can test checking status or retrying payment.` +
              `</p>` +
              `</div>`,
            confirmButtonText: 'Understood',
            confirmButtonColor: '#d97706'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Payment Failed (Dev Sim)',
            html:
              `<div style="font-family:'Segoe UI',sans-serif; text-align:center;">` +
              `<p style="font-size:15px; color:#991b1b; font-weight:600; margin-bottom:8px;">` +
              `Simulated Payment Failed` +
              `</p>` +
              `<p style="font-size:13px; color:#475569;">` +
              `The transaction was declined or failed for <b>${this.escapeHtml(applicationId)}</b>.<br/>` +
              `Stage remains at <b>Application Not Submitted (Payment Failed)</b>.<br/>` +
              `You can now click <b>Pay Now</b> again from the table to test retrying payment!` +
              `</p>` +
              `</div>`,
            confirmButtonText: 'Understood',
            confirmButtonColor: '#dc2626'
          });
        }
      },
      error: (err: any) => {
        this.loadData();
        const msg = err?.error?.detail || err?.message || 'Failed to simulate payment.';
        Swal.fire('Simulation Error', msg, 'error');
      }
    });
  }

  getStageBadgeClass(row: NewLicenseItem): string {
    if (this.isRowTerminated(row)) return 'rejected';
    if (row.isPaymentFailed) return 'payment-failed';
    if (row.isPaymentPending) return 'payment-pending';
    return row.statusGroup;
  }

  payLicenseFee(row: NewLicenseItem): void {
    if (!this.isLicenseeUser()) return;
    if (!row?.applicationId) return;

    const applicationId = String(row.applicationId || '').trim();
    if (!applicationId) return;

    const openModalWithData = (data: any) => {
      const licenseFee = Number(data?.license_fee_amount ?? data?.licenseFeeAmount ?? row.licenseFeeAmount ?? 5000);
      const securityFee = Number(data?.security_fee_amount ?? data?.securityFeeAmount ?? row.securityFeeAmount ?? 5000);
      const total = licenseFee + securityFee;

      const baseLicenseFee = Number(data?.base_license_fee ?? data?.baseLicenseFee ?? 0);
      const additionalBreakdown = Array.isArray(data?.additional_charges_breakdown) ? data.additional_charges_breakdown : (data?.additionalChargesBreakdown || []);

      const pachwai = Boolean(data?.pachwai);
      const draughtBeer = Boolean(data?.draught_beer ?? data?.draughtBeer);
      const miniBar = Boolean(data?.mini_bar ?? data?.miniBar);
      const miniBarQty = Number(data?.mini_bar_quantity ?? data?.miniBarQuantity ?? 1);

      // Build breakdown rows
      const breakdownItems: { label: string; amount: number }[] = [];
      if (additionalBreakdown.length > 0) {
        additionalBreakdown.forEach((item: any) => {
          breakdownItems.push({
            label: item.label || item.code || 'Additional Charge',
            amount: Number(item.amount || 0)
          });
        });
      } else {
        if (pachwai) breakdownItems.push({ label: 'Pachwai (Additional)', amount: 3000 });
        if (draughtBeer) breakdownItems.push({ label: 'Draught Beer (Additional)', amount: 5000 });
        if (miniBar) breakdownItems.push({ label: `Mini Bar (Additional x${miniBarQty || 1})`, amount: 1000 * (miniBarQty || 1) });
      }

      const additionalTotal = breakdownItems.reduce((sum, item) => sum + item.amount, 0);
      const resolvedBaseFee = baseLicenseFee > 0 ? baseLicenseFee : Math.max(0, licenseFee - additionalTotal);
      const hasAdditional = breakdownItems.length > 0;

      const feeRow = (label: string, amount: number, accent = false) => `
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:10px 14px; border-radius:8px; margin-bottom:6px;
                    background:${accent ? '#f0fdf8' : '#f9fafb'};
                    border:1px solid ${accent ? '#6ee7c7' : '#e5e7eb'};">
          <span style="color:#374151; font-size:14px;">${label}</span>
          <span style="font-weight:700; color:${accent ? '#0d6e56' : '#111827'}; font-size:14px;">&#8377;${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>`;

      const breakdownHtml = hasAdditional
        ? `
          <div style="margin-top:14px; border-radius:10px; border:1px solid #d1fae5; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#065f46,#059669); color:#fff; padding:10px 16px; font-size:13px; font-weight:600; letter-spacing:0.5px; display:flex; justify-content:space-between; align-items:center;">
              <span>&#9783; Itemized Fee Breakdown</span>
              <span style="font-size:12px; font-weight:400; opacity:0.95;">Total License Fee: &#8377;${licenseFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="padding:12px 12px 4px; background:#ffffff;">
              ${feeRow('Base License Fee', resolvedBaseFee)}
              ${breakdownItems.map(item => feeRow(item.label, item.amount)).join('')}

              <div style="display:flex; justify-content:space-between; align-items:center;
                          padding:10px 14px; border-radius:8px; margin-top:8px; margin-bottom:6px;
                          background:#ecfdf5; border:1.5px solid #10b981;">
                <span style="color:#065f46; font-size:14px; font-weight:700;">Total License Fee</span>
                <span style="font-weight:800; color:#065f46; font-size:15px;">&#8377;${licenseFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div style="padding:10px 16px; font-size:12px; color:#047857; background:#f0fdf4; border-top:1px dashed #a7f3d0; line-height:1.5;">
              &#9432; <b>Breakdown Summary:</b> Base Fee (&#8377;${resolvedBaseFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) + Additional Category Charges (&#8377;${additionalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) = <b>&#8377;${licenseFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Total License Fee</b>.
            </div>
          </div>
        `
        : '';

      void Swal.fire({
        title: '',
        html: `
          <div style="font-family:'Segoe UI',sans-serif; text-align:left;">
            <!-- Header -->
            <div style="text-align:center; margin-bottom:18px;">
              <div style="display:inline-flex; align-items:center; justify-content:center;
                          width:50px; height:50px; border-radius:50%;
                          background:linear-gradient(135deg,#065f46,#10b981); margin-bottom:8px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="white"/>
                </svg>
              </div>
              <div style="font-size:21px; font-weight:700; color:#065f46; line-height:1.2;">Proceed to Pay License Fee</div>
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

            ${breakdownHtml}

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
    };

    const encoded = encodeURIComponent(applicationId);
    this.http.get<any>(`${this.apiBase}/detail/${encoded}/`).subscribe({
      next: (detail) => openModalWithData(detail || row),
      error: () => openModalWithData(row)
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

                  const base = String(environment.apiBaseUrl || '').replace(/\/+$/, '');
                  this.http.post(`${base}/transactional/payment-gateway/billdesk/webhook/`, formData, { responseType: 'text' })
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
                  this.loadData();
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
          width: '95vw',
          maxWidth: '1400px',
          maxHeight: '90vh',
          panelClass: 'application-movement-dialog',
          data: { movementDataSource: { data: [res] } }
        });
      },
      error: (err: any) => {
        const msg = err?.error?.detail || err?.error?.error || err?.message || 'Failed to load timeline.';
        void Swal.fire('Error', String(msg), 'error');
      }
    });
  }

  openApplicationFeeSlip(row: NewLicenseItem): void {
    if (!row?.applicationId) return;

    this.dialog.open(ApplicationFeeSlipDialogComponent, {
      width: '820px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'application-fee-slip-dialog-panel',
      data: {
        applicationId: row.applicationId,
        applicantName: row.applicantName,
        establishmentName: row.establishmentName,
        licenseCategoryName: row.licenseCategoryName,
        licenseSubCategoryName: row.licenseSubCategoryName,
        modeOfOperation: row.modeOfOperation || 'Self',
        submittedOn: row.submittedOn,
        paymentStatus: row.paymentStatus || 'Successful',
        transactionId: row.applicationFeeTransactionId || '',
        paymentDate: row.applicationFeePaymentDate || '',
        amount: 500.00,
        transactions: row.applicationFeeTransactions || []
      }
    });
  }

  mapRawItemsToRows(items: any[], fallbackStatusGroup?: NewLicenseItem['statusGroup'] | ''): NewLicenseItem[] {
    if (!Array.isArray(items)) return [];
    return items.map((item) => this.mapRawItemToRow(item, fallbackStatusGroup));
  }

  mapRawItemToRow(item: any, fallbackStatusGroup?: NewLicenseItem['statusGroup'] | ''): NewLicenseItem {
    const rawStatusGroup = item?.status_group || item?.statusGroup || item?.status || fallbackStatusGroup || 'applied';
    const statusGroup: NewLicenseItem['statusGroup'] = 
      rawStatusGroup === 'approved' ? 'approved' :
      rawStatusGroup === 'pending' ? 'pending' :
      rawStatusGroup === 'objection' ? 'objection' :
      rawStatusGroup === 'rejected' ? 'rejected' :
      rawStatusGroup === 'awaiting-payment' || rawStatusGroup === 'awaiting_payment' ? 'awaiting-payment' :
      'applied';

    const rawPayment = String(
      item?.application_fee_payment_status ||
      item?.applicationFeePaymentStatus ||
      item?.payment_status ||
      item?.paymentStatus ||
      ''
    ).trim();
    const paymentStatus = this.normalizePaymentStatus(rawPayment);
    const feePaid = Boolean(item?.is_application_fee_paid ?? item?.isApplicationFeePaid);
    const currentStageRaw = String(item?.current_stage_name || item?.currentStageName || item?.current_stage || '');
    const currentStageId = item?.current_stage_id || item?.currentStageId || item?.current_stage;
    const rawLower = currentStageRaw.toLowerCase();
    const isTerminated = rawLower.includes('terminat') || rawLower.includes('forfeit') || rawLower.includes('cancel') || rawLower.includes('revoke') || rawLower.includes('suspend');
    const isRejected = rawStatusGroup === 'rejected' || rawLower.includes('reject') || isTerminated;

    const isApplicationFeePaid = Boolean(feePaid || paymentStatus === 'Successful');
    const canPayNow = this.isLicenseeUser() && !isApplicationFeePaid && !isRejected;
    const canView = Boolean(item?.id || item?.application_id || item?.applicationId);
    const applicationFeeTransactionId = String(
      item?.application_fee_transaction_id ||
      item?.applicationFeeTransactionId ||
      item?.transaction_id ||
      item?.transactionId ||
      ''
    ).trim();
    const applicationFeePaymentDate = item?.application_fee_payment_date || item?.applicationFeePaymentDate || null;
    const modeOfOperation = String(item?.mode_of_operation || item?.modeOfOperation || 'Self');

    const paymentDateRaw = item?.application_fee_payment_date || item?.applicationFeePaymentDate;
    const submittedOn = paymentStatus === 'Successful'
      ? this.formatDate(paymentDateRaw || item?.created_at || item?.createdAt || item?.submitted_on)
      : this.formatDate(item?.created_at || item?.createdAt || item?.submitted_on);

    const applicationId = String(item?.application_id || item?.applicationId || item?.id || 'N/A');
    const isApproved = Boolean((item?.is_approved ?? item?.isApproved ?? rawLower.includes('approved') ?? (rawStatusGroup === 'approved')) && !isRejected && !isTerminated);
    const licenseNumber = this.deriveNewLicenseNaNumber(applicationId, item);

    let finalStatusGroup: NewLicenseItem['statusGroup'] = 'pending';
    if (isRejected) {
      finalStatusGroup = 'rejected';
    } else if (isApproved) {
      finalStatusGroup = 'approved';
    } else if (rawLower.includes('objection') || item?.is_objection_timer_active) {
      finalStatusGroup = 'objection';
    } else if (this.isLicenseeUser()) {
      const isAwaiting = 
        (rawLower.includes('awaiting') && rawLower.includes('payment')) ||
        (rawLower.includes('payment') && !rawLower.includes('reject') && !isTerminated) ||
        currentStageId === 23 ||
        currentStageId === '23';

      if (isAwaiting) {
        finalStatusGroup = 'awaiting-payment';
      } else if (rawStatusGroup === 'applied' || rawLower.includes('initial') || !isApplicationFeePaid) {
        finalStatusGroup = 'applied';
      } else {
        finalStatusGroup = 'pending';
      }
    } else {
      finalStatusGroup = (rawStatusGroup === 'applied' && rawLower.includes('initial')) ? 'applied' : 'pending';
    }

    // Licensee UX: a failed/unpaid application fee means the application is not submitted to workflow yet.
    const isPaymentFailed = this.isLicenseeUser() && !isApplicationFeePaid && paymentStatus === 'Failed';
    const isPaymentPending = this.isLicenseeUser() && !isApplicationFeePaid && paymentStatus === 'Pending';

    let currentStage = '';
    if (this.isLicenseeUser()) {
      if (!isApplicationFeePaid) {
        if (paymentStatus === 'Failed') {
          currentStage = 'Application Not Submitted (Payment Failed)';
        } else if (paymentStatus === 'Pending') {
          currentStage = 'Application Not Submitted (Payment Pending - Awaiting response from BillDesk)';
        } else {
          currentStage = String(item?.display_stage || item?.displayStage || 'Application Not Submitted');
        }
      } else {
        currentStage = this.simplifyStageForLicensee(finalStatusGroup, currentStageRaw);
      }
    } else {
      currentStage = String(item?.display_stage || item?.displayStage || this.computeCurrentStageLabel(item, finalStatusGroup, currentStageRaw));
    }

    const transactions = Array.isArray(item?.transactions) ? item.transactions : [];
    const txnText = (t: any) => `${t?.action ?? ''} ${t?.remarks ?? ''} ${t?.to_stage ?? ''} ${t?.to_stageName ?? ''} ${t?.to_stage_name ?? ''}`;
    const hasObjectionHistory = transactions.some((t: any) => /objection/i.test(txnText(t)));
    const hasObjectionUpdate = transactions.some((t: any) => /resolve|correct|update/i.test(txnText(t)) && /objection/i.test(txnText(t)));

    const updatedObjectionFields = this.computeUpdatedObjectionFields(item);
    const siteEnquiryIsReverted = Boolean(
      (item?.site_enquiry_is_reverted ?? item?.siteEnquiryIsReverted ?? item?.siteEnquiryReverted) || false
    );

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
      !isRejected &&
      (finalStatusGroup === 'awaiting-payment' || String(currentStageId) === '23' || (currentStageRaw.toLowerCase().includes('awaiting') && !rawLower.includes('reject'))) &&
      (!isLicenseFeePaid || !isSecurityFeePaid);

    const rawLicFee = Number(item?.license_fee_amount ?? item?.licenseFeeAmount ?? item?.yearly_license_fee ?? item?.yearlyLicenseFee ?? 5000);
    const rawSecFee = Number(item?.security_fee_amount ?? item?.securityFeeAmount ?? item?.security_deposit_amount ?? item?.securityDepositAmount ?? 5000);
    const licenseFeeAmount = Number.isFinite(rawLicFee) && rawLicFee > 0 ? rawLicFee : 5000;
    const securityFeeAmount = Number.isFinite(rawSecFee) && rawSecFee > 0 ? rawSecFee : licenseFeeAmount;

    const isPaymentTimerActive = Boolean(item?.is_payment_timer_active ?? item?.isPaymentTimerActive);
    const paymentDeadlineAt = item?.payment_deadline_at || item?.paymentDeadlineAt || null;
    const paymentTimeRemainingSeconds = item?.payment_time_remaining_seconds ?? item?.paymentTimeRemainingSeconds ?? null;

    const isObjectionTimerActive = Boolean(item?.is_objection_timer_active ?? item?.isObjectionTimerActive);
    const objectionDeadlineAt = item?.objection_deadline_at || item?.objectionDeadlineAt || null;
    const objectionTimeRemainingSeconds = item?.objection_time_remaining_seconds ?? item?.objectionTimeRemainingSeconds ?? null;

    const stageId = Number(currentStageId || 0);
    const isAutoRejected = Boolean(
      (item?.is_auto_rejected ?? item?.isAutoRejected) ||
      stageId === 180 ||
      stageId === 166 ||
      (rawLower.includes('no action') && rawLower.includes('reject')) ||
      (rawLower.includes('payment') && rawLower.includes('reject')) ||
      (rawLower.includes('objection') && rawLower.includes('reject'))
    );

    let rejectionReason = String(
      item?.rejection_reason ||
      item?.rejectionReason ||
      item?.rejection_remarks ||
      item?.rejectionRemarks ||
      item?.remarks ||
      ''
    ).trim() || null;

    if (!rejectionReason && isRejected) {
      if (isTerminated || rawLower.includes('terminat') || rawLower.includes('forfeit')) {
        rejectionReason = 'Application terminated and security deposit deducted/forfeited.';
      } else if (stageId === 180 || (rawLower.includes('payment') && rawLower.includes('reject'))) {
        rejectionReason = 'Application automatically rejected: License Fee and Security Deposit payments were not completed within the allowed payment window.';
      } else if (stageId === 166 || (rawLower.includes('objection') && rawLower.includes('reject'))) {
        rejectionReason = 'Application automatically rejected: No action or clarification was submitted on the raised objection within the allowed time limit.';
      } else {
        rejectionReason = `Application rejected at stage: ${currentStage}`;
      }
    }

    return {
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
      isApplicationFeePaid,
      applicationFeeTransactionId,
      applicationFeePaymentDate,
      modeOfOperation,
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
      updatedObjectionFields,
      isPaymentTimerActive,
      paymentDeadlineAt,
      paymentTimeRemainingSeconds,
      isObjectionTimerActive,
      objectionDeadlineAt,
      objectionTimeRemainingSeconds,
      activeTimer: null,
      rejectionReason,
      isAutoRejected,
      isPaymentFailed,
      isPaymentPending,
      applicationFeeTransactions: Array.isArray(item?.applicationFeeTransactions)
        ? item.applicationFeeTransactions
        : (Array.isArray(item?.application_fee_transactions) ? item.application_fee_transactions : [])
    };
  }

  private flattenGroupedData(grouped: GroupedNewLicenseResponse): NewLicenseItem[] {
    const combined = [
      ...this.mapRawItemsToRows(grouped?.applied, 'applied'),
      ...this.mapRawItemsToRows(grouped?.pending, 'pending'),
      ...this.mapRawItemsToRows(grouped?.objection, 'objection'),
      ...this.mapRawItemsToRows(grouped?.approved, 'approved'),
      ...this.mapRawItemsToRows(grouped?.rejected, 'rejected')
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
    const rawLower = String(currentStageRaw || '').toLowerCase();
    if (rawLower.includes('terminat') || rawLower.includes('forfeit') || rawLower.includes('revoke') || rawLower.includes('suspend')) {
      return 'Terminated';
    }

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
    const raw = String(stageValue ?? '').toLowerCase();
    if (raw.includes('terminat') || raw.includes('forfeit') || raw.includes('revoke') || raw.includes('suspend')) return 'Terminated';
    if (raw.includes('reject')) return 'Rejected';
    if (statusGroup === 'rejected') {
      if (raw.includes('terminat') || raw.includes('forfeit') || raw.includes('revoke') || raw.includes('suspend')) return 'Terminated';
      return 'Rejected';
    }
    if (statusGroup === 'approved') return 'Approved';
    if (statusGroup === 'objection') return 'Objection by Admin';
    if (statusGroup === 'awaiting-payment') return 'Awaiting Payment';

    const stageId = Number.parseInt(raw, 10);
    if (Number.isFinite(stageId) && String(stageId) === raw) {
      if (stageId === 23) return 'Awaiting Payment';
    }
    if (raw.includes('approved')) return 'Approved';
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
    const candidates = [
      item?.issued_license_id,
      item?.issuedLicenseId,
      item?.license_id,
      item?.licenseId,
      item?.license_number,
      item?.licenseNumber,
      item?.license
    ];

    for (const c of candidates) {
      if (!c) continue;
      const val = String(typeof c === 'object' ? (c.license_id || c.id || '') : c).trim();
      if (val.startsWith('NA/')) return val;
    }

    const id = String(applicationId || '').trim();
    if (id.startsWith('NA/')) return id;
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

  // ── Countdown Timer Mechanics ─────────────────────────────────────────────

  startCountdownTimer(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    this.updateAllCountdowns();
    this.countdownInterval = setInterval(() => {
      this.updateAllCountdowns();
    }, 1000);
  }

  updateAllCountdowns(): void {
    const nowMs = Date.now();
    if (!this.isLicenseeUser()) {
      this.licenseApplicationService.setActiveNewLicenseTimers([]);
      for (const row of this.rows) {
        row.activeTimer = null;
      }
      return;
    }

    for (const row of this.rows) {
      row.activeTimer = this.computeRowTimer(row, nowMs);
    }

    const activeList = this.rows
      .filter((r: NewLicenseItem) => !!r.activeTimer)
      .map((r: NewLicenseItem) => ({
        applicationId: r.applicationId,
        licenseCategoryName: r.licenseCategoryName,
        applicantName: r.applicantName,
        statusGroup: r.statusGroup,
        currentStage: r.currentStage,
        activeTimer: r.activeTimer,
        canPayLicenseFee: r.canPayLicenseFee,
        canPayNow: r.canPayNow,
        rawRow: r
      }))
      .sort((a: any, b: any) => (a.activeTimer?.targetDeadline?.getTime() || 0) - (b.activeTimer?.targetDeadline?.getTime() || 0));

    this.licenseApplicationService.setActiveNewLicenseTimers(activeList);
  }

  computeRowTimer(row: NewLicenseItem, nowMs: number): ActiveCountdownTimer | null {
    // Timers are strictly shown ONLY to licensee users who need to take action
    if (!this.isLicenseeUser()) {
      return null;
    }

    // Timer is strictly shown ONLY for active Objection or Payment stages
    if (row.statusGroup === 'approved' || row.statusGroup === 'rejected') {
      return null;
    }

    const rawStageLower = String(row.currentStageRaw || '').toLowerCase();
    if (rawStageLower.includes('reject') || rawStageLower.includes('approved')) {
      return null;
    }

    // 1. Objection Timer Check
    const isObjection = row.statusGroup === 'objection' || row.isObjectionTimerActive || rawStageLower.includes('objection');
    if (isObjection) {
      let deadlineMs: number | null = null;
      if (row.objectionDeadlineAt) {
        const parsed = new Date(row.objectionDeadlineAt).getTime();
        if (!isNaN(parsed)) deadlineMs = parsed;
      }
      if (!deadlineMs && row.objectionTimeRemainingSeconds != null && row.objectionTimeRemainingSeconds > 0) {
        deadlineMs = nowMs + (row.objectionTimeRemainingSeconds * 1000);
      }
      if (!deadlineMs) {
        const base = row.submittedOn ? new Date(row.submittedOn).getTime() : nowMs;
        deadlineMs = (isNaN(base) ? nowMs : base) + (7 * 24 * 60 * 60 * 1000);
      }

      const diff = deadlineMs - nowMs;
      return this.buildCountdownObject('objection', diff, deadlineMs, row);
    }

    // 2. Payment Timer Check (Stage 23 / Awaiting Payment)
    const isAwaitingPayment = row.statusGroup === 'awaiting-payment' ||
      row.canPayLicenseFee ||
      row.isPaymentTimerActive ||
      (rawStageLower.includes('awaiting') && rawStageLower.includes('payment')) ||
      (rawStageLower.includes('payment') && (!row.isLicenseFeePaid || !row.isSecurityFeePaid));

    if (isAwaitingPayment && (!row.isLicenseFeePaid || !row.isSecurityFeePaid)) {
      let deadlineMs: number | null = null;
      if (row.paymentDeadlineAt) {
        const parsed = new Date(row.paymentDeadlineAt).getTime();
        if (!isNaN(parsed)) deadlineMs = parsed;
      }
      if (!deadlineMs && row.paymentTimeRemainingSeconds != null && row.paymentTimeRemainingSeconds > 0) {
        deadlineMs = nowMs + (row.paymentTimeRemainingSeconds * 1000);
      }
      if (!deadlineMs) {
        const base = row.submittedOn ? new Date(row.submittedOn).getTime() : nowMs;
        deadlineMs = (isNaN(base) ? nowMs : base) + (7 * 24 * 60 * 60 * 1000);
      }

      const diff = deadlineMs - nowMs;
      return this.buildCountdownObject('payment', diff, deadlineMs, row);
    }

    return null;
  }

  private buildCountdownObject(
    timerType: 'objection' | 'payment',
    diffMs: number,
    deadlineMs: number,
    row: NewLicenseItem
  ): ActiveCountdownTimer {
    const isObjection = timerType === 'objection';
    const label = isObjection ? 'Objection Timer' : 'Payment Timer';
    const title = isObjection ? 'Time Remaining (Objection)' : 'Time Remaining (Payment)';
    const rejectionStage = isObjection
      ? 'Rejected: No Action Taken on Objection'
      : 'Rejected: No Action Taken at Payment Stage';

    if (diffMs <= 0) {
      if (!this.expiredTriggeredIds.has(row.applicationId)) {
        this.expiredTriggeredIds.add(row.applicationId);
        this.triggerTimerExpiration(row.applicationId);
      }
      return {
        timerType,
        label,
        title,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formattedTime: '00d : 00h : 00m : 00s',
        urgency: 'expired',
        warningText: 'Deadline expired. Auto-rejecting...',
        targetDeadline: new Date(deadlineMs),
        rejectionStage
      };
    }

    const totalSec = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    let urgency: ActiveCountdownTimer['urgency'] = 'normal';
    if (diffMs <= 24 * 60 * 60 * 1000) {
      urgency = 'critical';
    } else if (diffMs <= 48 * 60 * 60 * 1000) {
      urgency = 'warn';
    }

    const warningText = isObjection
      ? 'Auto-rejects on expiry'
      : 'Auto-rejects on expiry';

    return {
      timerType,
      label,
      title,
      days,
      hours,
      minutes,
      seconds,
      formattedTime: `${this.padZero(days)}d : ${this.padZero(hours)}h : ${this.padZero(minutes)}m : ${this.padZero(seconds)}s`,
      urgency,
      warningText,
      targetDeadline: new Date(deadlineMs),
      rejectionStage
    };
  }

  padZero(num: number): string {
    return String(num < 0 ? 0 : num).padStart(2, '0');
  }

  triggerTimerExpiration(applicationId: string): void {
    if (!applicationId || applicationId === 'N/A') return;
    const encoded = encodeURIComponent(applicationId);
    this.http.post<any>(`${this.apiBase}/${encoded}/trigger-timer-expiration/`, {}).subscribe({
      next: (res) => {
        console.log(`[Timer Expired] Auto-rejection executed for ${applicationId}:`, res);
        this.sidebarPendingBadgeService.triggerRefresh();
        this.loadData();
      },
      error: (err) => {
        console.error(`[Timer Expired] Failed to trigger auto-rejection for ${applicationId}:`, err);
        this.sidebarPendingBadgeService.triggerRefresh();
        setTimeout(() => this.loadData(), 1500);
      }
    });
  }

  isRowTerminated(row: NewLicenseItem): boolean {
    const raw = String(row?.currentStageRaw || '').toLowerCase();
    const stage = String(row?.currentStage || '').toLowerCase();
    return raw.includes('terminat') || stage.includes('terminat') || raw.includes('forfeit') || stage.includes('forfeit') || raw.includes('revoke') || stage.includes('revoke') || raw.includes('suspend') || stage.includes('suspend');
  }

  isRowRejected(row: NewLicenseItem): boolean {
    const raw = String(row?.currentStageRaw || '').toLowerCase();
    const stage = String(row?.currentStage || '').toLowerCase();
    return row?.statusGroup === 'rejected' || raw.includes('reject') || stage.includes('reject') || this.isRowTerminated(row);
  }

  getComputedRejectionNote(row: NewLicenseItem): string {
    if (this.isRowTerminated(row)) {
      return 'Application and associated license officially terminated by department administration. Security deposit deducted/forfeited.';
    }
    if (row?.rejectionReason && !row.rejectionReason.toLowerCase().includes('auto-reject') && !row.rejectionReason.toLowerCase().includes('payment deadline')) {
      return row.rejectionReason;
    }
    const raw = String(row?.currentStageRaw || '').toLowerCase();
    if (raw.includes('payment')) {
      return 'Payment window closed before completing required fee payments.';
    }
    if (raw.includes('objection')) {
      return 'Objection response period expired without clarification.';
    }
    return 'Application was rejected by the department.';
  }
}
