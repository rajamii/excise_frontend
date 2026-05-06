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
import { timeout } from 'rxjs';

interface NewLicenseCounts {
  applied: number;
  pending: number;
  objection: number;
  approved: number;
  rejected: number;
}

interface NewLicenseItem {
  id: string;
  applicationId: string;
  applicantName: string;
  establishmentName: string;
  submittedOn: string;
  paymentStatus: string;
  canView: boolean;
  canPayNow: boolean;
  currentStage: string;
  currentStageRaw: string;
  statusGroup: 'applied' | 'pending' | 'objection' | 'approved' | 'rejected';
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
  private readonly apiBase = `${environment.apiBaseUrl}/transactional/new_license_application`;

  isLoading = false;
  error: string | null = null;

  counts: NewLicenseCounts = {
    applied: 0,
    pending: 0,
    objection: 0,
    approved: 0,
    rejected: 0
  };

  private serverCounts: NewLicenseCounts = {
    applied: 0,
    pending: 0,
    objection: 0,
    approved: 0,
    rejected: 0
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

  private readonly billdeskRetryStateKey = 'new_license_billdesk_retry_state_v1';
  private readonly billdeskCooldownSeconds = 15 * 60;

  ngOnInit(): void {
    this.loadData();
  }

  isLicenseeUser(): boolean {
    return this.roleService.isLicenseeRole();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      counts: this.http.get<NewLicenseCounts>(`${this.apiBase}/dashboard-counts/`).pipe(
        catchError(() => of({ applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 }))
      ),
      grouped: this.http.get<GroupedNewLicenseResponse>(`${this.apiBase}/list-by-status/`).pipe(
        catchError(() => of({ applied: [], pending: [], objection: [], approved: [], rejected: [] }))
      )
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.serverCounts = {
          applied: Number(counts?.applied || 0),
          pending: Number(counts?.pending || 0),
          objection: Number((counts as any)?.objection || 0),
          approved: Number(counts?.approved || 0),
          rejected: Number(counts?.rejected || 0)
        };
        this.allRows = this.flattenGroupedData(grouped);
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

    this.filteredRows = this.summaryRows.filter((row) => {
      // Date filter
      if (this.dateFilter) {
        const rowDate = (row.submittedOn || '').split('T')[0];
        // submittedOn may be formatted as "dd-MMM-yyyy", convert to ISO for comparison
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
        if (row.statusGroup !== this.activeSummaryFilter) return false;
      }

      return true;
    });

    const calculated = this.calculateCounts(this.summaryRows);
    const canUseServerCounts = this.allRows.length === 0 && !this.searchFilter && !this.dateFilter && !this.monthFilter;
    this.counts = canUseServerCounts ? this.serverCounts : calculated;

    this.syncActiveSummaryFilter();

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

    const cooldownRemaining = this.getCooldownRemainingSeconds(applicationId);
    if (cooldownRemaining > 0) {
      this.showCooldownPopup(cooldownRemaining);
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

  private startBilldeskInitiation(applicationId: string): void {
    void Swal.fire({
      title: 'Redirecting to BillDesk',
      text: 'Preparing application fee payment...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    this.paymentIntegrationService
      .initiateBilldeskNewLicenseApplicationFee({
        application_id: String(applicationId).trim(),
        amount: 500,
        payment_module_code: '001',
      })
      .pipe(timeout(30000))
      .subscribe({
        next: (initRes: any) => {
          Swal.close();
          this.clearRetryState(applicationId);

          const billdeskUrl = String(initRes?.billdeskUrl || initRes?.billdesk_url || '').trim();
          const requestMsg = String(initRes?.requestMsg || initRes?.request_msg || '').trim();
          if (!billdeskUrl || !requestMsg) {
            this.recordBilldeskFailure(applicationId);
            void Swal.fire('Error', 'BillDesk initiation failed: missing gateway parameters.', 'error');
            return;
          }
          this.submitToBillDesk(billdeskUrl, requestMsg);
        },
        error: (err: any) => {
          Swal.close();

          const retrySeconds = this.extractRetryAfterSeconds(err);
          if (retrySeconds > 0) {
            this.showBilldeskPendingRetryPopup(retrySeconds);
            return;
          }

          const timerSeconds = this.recordBilldeskFailure(applicationId);
          if (timerSeconds > 0) {
            this.showCooldownPopup(timerSeconds);
            return;
          }

          if (String(err?.name || '').toLowerCase() === 'timeouterror') {
            void Swal.fire('Timeout', 'BillDesk initiation timed out. Please try again.', 'error');
            return;
          }

          const msg =
            err?.error?.detail ||
            err?.error?.message ||
            err?.message ||
            'Unable to initiate BillDesk payment. Please try again later.';
          void Swal.fire('Error', String(msg), 'error');
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

  private showBilldeskPendingRetryPopup(retryAfterSeconds: number): void {
    const totalSeconds = Math.max(1, Math.floor(retryAfterSeconds));
    const format = (seconds: number) => {
      const s = Math.max(0, Math.floor(seconds));
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    };

    let interval: any;
    void Swal.fire({
      icon: 'info',
      title: 'Payment Already Pending',
      html: `A BillDesk transaction is already pending. Please wait <b>${format(totalSeconds)}</b> and try again.`,
      showConfirmButton: true,
      confirmButtonText: 'OK',
      allowOutsideClick: false,
      didOpen: () => {
        const content = Swal.getHtmlContainer();
        let remaining = totalSeconds;
        interval = setInterval(() => {
          remaining -= 1;
          if (!content) return;
          const b = content.querySelector('b');
          if (b) b.textContent = format(remaining);
          if (remaining <= 0) clearInterval(interval);
        }, 1000);
      },
      willClose: () => {
        if (interval) clearInterval(interval);
      },
    });
  }

  private showCooldownPopup(retryAfterSeconds: number): void {
    const totalSeconds = Math.max(1, Math.floor(retryAfterSeconds));
    const format = (seconds: number) => {
      const s = Math.max(0, Math.floor(seconds));
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    };

    let interval: any;
    void Swal.fire({
      icon: 'info',
      title: 'Please Try Later',
      html: `There seems to be an issue with the payment server. Please try again after <b>${format(totalSeconds)}</b>.`,
      showConfirmButton: true,
      confirmButtonText: 'OK',
      allowOutsideClick: false,
      didOpen: () => {
        const content = Swal.getHtmlContainer();
        let remaining = totalSeconds;
        interval = setInterval(() => {
          remaining -= 1;
          if (!content) return;
          const b = content.querySelector('b');
          if (b) b.textContent = format(remaining);
          if (remaining <= 0) clearInterval(interval);
        }, 1000);
      },
      willClose: () => {
        if (interval) clearInterval(interval);
      },
    });
  }

  private readRetryState(): Record<string, { failures: number; cooldownUntil?: number }> {
    try {
      const raw = String(localStorage.getItem(this.billdeskRetryStateKey) || '').trim();
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeRetryState(state: Record<string, { failures: number; cooldownUntil?: number }>): void {
    try {
      localStorage.setItem(this.billdeskRetryStateKey, JSON.stringify(state || {}));
    } catch {
      // no-op
    }
  }

  private getCooldownRemainingSeconds(applicationId: string): number {
    const id = String(applicationId || '').trim();
    if (!id) return 0;

    const state = this.readRetryState();
    const entry = state[id];
    const until = Number(entry?.cooldownUntil || 0);
    if (!until || !Number.isFinite(until)) return 0;

    const now = Date.now();
    if (now >= until) {
      delete state[id];
      this.writeRetryState(state);
      return 0;
    }

    return Math.max(1, Math.floor((until - now) / 1000));
  }

  private clearRetryState(applicationId: string): void {
    const id = String(applicationId || '').trim();
    if (!id) return;

    const state = this.readRetryState();
    if (state[id]) {
      delete state[id];
      this.writeRetryState(state);
    }
  }

  // Returns cooldown seconds if lock started, otherwise 0.
  private recordBilldeskFailure(applicationId: string): number {
    const id = String(applicationId || '').trim();
    if (!id) return 0;

    const state = this.readRetryState();
    const current = state[id] || { failures: 0 };

    const now = Date.now();
    const cooldownUntil = Number(current.cooldownUntil || 0);
    if (cooldownUntil && Number.isFinite(cooldownUntil) && now < cooldownUntil) {
      return Math.max(1, Math.floor((cooldownUntil - now) / 1000));
    }

    const failures = Number(current.failures || 0) + 1;
    if (failures >= 3) {
      const until = now + this.billdeskCooldownSeconds * 1000;
      state[id] = { failures: 0, cooldownUntil: until };
      this.writeRetryState(state);
      return this.billdeskCooldownSeconds;
    }

    state[id] = { failures };
    this.writeRetryState(state);
    return 0;
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
        const canView = paymentStatus === 'Successful' && feePaid;
        const canPayNow = this.isLicenseeUser() && !feePaid && paymentStatus !== 'Successful';
        const paymentDateRaw = item?.application_fee_payment_date || item?.applicationFeePaymentDate;
        const submittedOn = paymentStatus === 'Successful'
          ? this.formatDate(paymentDateRaw || item?.created_at || item?.createdAt || item?.submitted_on)
          : this.formatDate(item?.created_at || item?.createdAt || item?.submitted_on);

        const currentStageRaw = String(item?.current_stage_name || item?.currentStageName || item?.current_stage || '');
        const currentStageComputed = this.isLicenseeUser()
          ? this.simplifyStageForLicensee(statusGroup, currentStageRaw)
          : this.formatStageName(currentStageRaw || statusGroup);

        // Licensee UX: a failed/unpaid application fee means the application is not submitted to workflow yet.
        const currentStage = this.isLicenseeUser() && !canView
          ? (paymentStatus === 'Failed' ? 'Application Not Submitted (Payment Failed)' : 'Application Not Submitted')
          : currentStageComputed;

        return ({
          id: String(item?.application_id || item?.applicationId || item?.id || 'N/A'),
          applicationId: String(item?.application_id || item?.applicationId || item?.id || 'N/A'),
          applicantName: this.getApplicantName(item),
          establishmentName: String(item?.establishment_name || item?.establishmentName || 'N/A'),
          submittedOn,
          paymentStatus,
          canView,
          canPayNow,
          currentStageRaw,
          currentStage,
          statusGroup
        });
      });
    };

    return [
      ...mapGroup(grouped?.applied, 'applied'),
      ...mapGroup(grouped?.pending, 'pending'),
      ...mapGroup(grouped?.objection, 'objection'),
      ...mapGroup(grouped?.approved, 'approved'),
      ...mapGroup(grouped?.rejected, 'rejected')
    ];
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
    const next: NewLicenseCounts = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 };
    for (const row of rows || []) {
      if (row?.statusGroup === 'applied') next.applied += 1;
      else if (row?.statusGroup === 'pending') next.pending += 1;
      else if (row?.statusGroup === 'objection') next.objection += 1;
      else if (row?.statusGroup === 'approved') next.approved += 1;
      else if (row?.statusGroup === 'rejected') next.rejected += 1;
    }
    return next;
  }

  private syncActiveSummaryFilter(): void {
    // activeSummaryFilter is managed directly by onSummaryCardClick; nothing to sync here.
  }
}
