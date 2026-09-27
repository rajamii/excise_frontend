import { Component, OnInit, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { SupplyChainService } from '../../services/supplychain.service';
import { environment } from '../../../../../../environments/environment';
import { AccountService } from '../../../../../core/services/account.service';

import { UnifiedActionsService } from '../../../../../shared/services/unified-actions.service';

interface TableData {
  id: string;
  referenceNo: string;
  submissionDate: string;
  submissionDateRaw?: string;
  revalidationDateRaw?: string;
  requisitionDateRaw?: string;
  approvalDateRaw?: string;
  updatedAtRaw?: string;
  expiryDateRaw?: string;
  validUpToRaw?: string;
  validityPeriodDays?: number;
  distilleryName: string;
  factoryName?: string;
  establishmentName?: string;
  establishmentType?: string;
  status: string;
  statusCode?: string;
  amount: string;
  isLive?: boolean;
  isInvalid?: boolean;
  allowedActions?: string[];
  workflowId?: number;
  currentStage?: number;
  currentStageIsFinal?: boolean | string;
  allowedActionConfigs?: any[];
  detailsPermitsNumber?: string;
  requisitionNumberOfPermits?: number;
}

@Component({
  selector: 'app-revalidation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './revalidation.component.html',
  styleUrl: './revalidation.component.scss'
})
export class RevalidationComponent implements OnInit {
  Math = Math;
  private isBrowser = false;
  private initialFilterApplied = false;

  // Filter properties for revalidation
  revalidationDateFilter: string = '';
  revalidationMonthFilter: string = '';
  revalidationYearFilter: string = '';
  revalidationStatusFilter: string = '';
  revalidationCompanyFilter: string = '';
  revalidationCompanyOptions: string[] = [];
  activeSummaryFilter: string = '';
  searchFilter: string = '';
  private searchSubject = new Subject<string>();

  filteredRevalidationData: TableData[] = [];
  summaryRevalidationData: TableData[] = [];
  revlidationData: TableData[] = [];

  // Pagination & Loading state
  isLoading = false;
  totalCount = 0;
  totalPages = 0;
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  countsLoaded = false;
  counts = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    underprocess: 0,
    live: 0,
    invalid: 0
  };

  get pageStart(): number {
    if (this.totalCount === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }

  // Services
  private unifiedActionsService = inject(UnifiedActionsService);
  private route = inject(ActivatedRoute);

  constructor(
    private router: Router,
    private supplyChainService: SupplyChainService,
    private http: HttpClient,
    private accountService: AccountService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('DEBUG: RevalidationComponent Constructor');
  }

  ngOnInit(): void {
    console.log('DEBUG: ngOnInit');
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((term) => {
      this.searchFilter = term;
      this.currentPage = 1;
      this.fetchRevalidationData();
    });

    this.loadCounts();
  }

  loadCounts(): void {
    this.supplyChainService.getRevalidationCounts().subscribe({
      next: (resp) => {
        if (resp && typeof resp === 'object') {
          this.counts = {
            total: Number(resp.total || 0),
            pending: Number(resp.pending || 0),
            approved: Number(resp.approved || 0),
            rejected: Number(resp.rejected || 0),
            underprocess: Number(resp.underprocess || 0),
            live: Number(resp.live || 0),
            invalid: Number(resp.invalid || 0)
          };
          this.countsLoaded = true;

          if (!this.initialFilterApplied) {
            this.initialFilterApplied = true;
            const statusParam = String(this.route?.snapshot?.queryParams?.['status'] || '').toUpperCase().trim();
            if (statusParam && ['PENDING', 'UNDERPROCESS', 'APPROVED', 'REJECTED', 'ALL'].includes(statusParam)) {
              this.activeSummaryFilter = statusParam === 'ALL' ? '' : statusParam;
              this.revalidationStatusFilter = statusParam === 'ALL' ? '' : statusParam;
            } else {
              this.activeSummaryFilter = 'PENDING';
              this.revalidationStatusFilter = 'PENDING';
            }
            this.currentPage = 1;
            this.fetchRevalidationData();
          }
        }
      },
      error: () => {
        if (!this.initialFilterApplied) {
          this.initialFilterApplied = true;
          this.activeSummaryFilter = 'PENDING';
          this.revalidationStatusFilter = 'PENDING';
          this.fetchRevalidationData();
        }
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  async fetchRevalidationData() {
    if (!this.initialFilterApplied) {
      return;
    }
    try {
      console.log('DEBUG: Fetching revalidation data...');
      this.isLoading = true;

      const params: Record<string, any> = {
        page: this.currentPage,
        page_size: this.pageSize
      };

      if (this.revalidationStatusFilter) {
        params['status'] = this.revalidationStatusFilter;
      }
      if (this.searchFilter?.trim()) {
        params['search'] = this.searchFilter.trim();
      }
      if (this.revalidationDateFilter) {
        params['date'] = this.revalidationDateFilter;
      }
      if (this.revalidationMonthFilter) {
        params['month'] = this.revalidationMonthFilter;
      }
      if (this.revalidationYearFilter) {
        params['year'] = this.revalidationYearFilter;
      }
      if (this.revalidationCompanyFilter) {
        params['company'] = this.revalidationCompanyFilter;
      }

      let response: any;
      if (this.supplyChainService) {
        response = await firstValueFrom(this.supplyChainService.getRevalidationData(params));
      } else {
        const url = `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/`;
        response = await firstValueFrom(this.http.get<any>(url, { params }));
      }

      console.log('DEBUG: Raw Response:', response);

      let data: any[] = [];
      if (response?.results && Array.isArray(response.results)) {
        this.totalCount = Number(response.count ?? 0);
        this.totalPages = Number(response.total_pages ?? Math.ceil(this.totalCount / this.pageSize) ?? 1);
        data = response.results;
      } else if (Array.isArray(response)) {
        data = response;
        this.totalCount = data.length;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
      } else {
        data = [];
        this.totalCount = 0;
        this.totalPages = 0;
      }

      this.revlidationData = data.map((item: any) => {
        const dateVal = item.revalidationDate || item.revalidation_date;
        let formattedDate = '';
        try {
          formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '';
        } catch (e) {
          formattedDate = '';
        }

        return {
          id: item.id,
          referenceNo: item.ourRefNo || item.our_ref_no,
          submissionDate: formattedDate,
          submissionDateRaw: dateVal || '',
          revalidationDateRaw: item.revalidationDate || item.revalidation_date || '',
          requisitionDateRaw: item.requisitionDate || item.requisition_date || '',
          approvalDateRaw: item.approvalDate || item.approval_date || '',
          updatedAtRaw: item.updatedAt || item.updated_at || '',
          expiryDateRaw: item.expiryDate || item.expiry_date || '',
          validUpToRaw: item.validUpTo || item.valid_up_to || '',
          validityPeriodDays: Number(item.validityPeriodDays || item.validity_period_days || 45),
          factoryName: item.establishment_name || item.establishmentName || item.factory_name || item.factoryName || '',
          establishmentName: item.establishment_name || item.establishmentName || item.factory_name || item.factoryName || item.distilleryName || item.distillery_name || 'Mount Distilleries Limited',
          establishmentType: item.establishment_type || item.establishmentType || item.license_subcategory || item.subcategory || 'Distillery',
          distilleryName: item.distilleryName || item.distillery_name,
          status: item.status,
          statusCode: item.statusCode || item.status_code || '',
          amount: item.revalidationBrAmount || item.revalidation_br_amount || '0.00',
          isLive: !item.status?.includes('INVALID') && !item.status?.includes('EXPIRED'),
          isInvalid: item.status?.includes('INVALID') || item.status?.includes('EXPIRED'),
          allowedActions: item.allowedActions || item.allowed_actions || [],
          allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
          workflowId: item.workflow || item.workflow_id || item.workflowId,
          currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId,
          detailsPermitsNumber: item.detailsPermitsNumber || item.details_permits_number || '',
          requisitionNumberOfPermits: item.requisitionNumberOfPermits || item.requisition_number_of_permits || item.requisiton_number_of_permits || 0
        };
      });

      this.filteredRevalidationData = this.revlidationData;
      this.summaryRevalidationData = this.revlidationData;
      this.isLoading = false;
    } catch (error) {
      console.error('Error fetching revalidation data:', error);
      this.revlidationData = [];
      this.filteredRevalidationData = [];
      this.summaryRevalidationData = [];
      this.totalCount = 0;
      this.totalPages = 0;
      this.isLoading = false;
    }
  }

  private maybeAutoSelectPendingSummary(): void {
    if (this.initialFilterApplied) return;
    this.initialFilterApplied = true;

    if (this.revalidationStatusFilter || this.activeSummaryFilter) return;

    const pendingCount = this.getRevalidationStatusCount('PENDING');
    if (pendingCount > 0) {
      this.activeSummaryFilter = 'PENDING';
      this.revalidationStatusFilter = 'PENDING';
      this.currentPage = 1;
      this.fetchRevalidationData();
    }
  }

  // Revalidation filter methods
  applyRevalidationFilters(): void {
    this.currentPage = 1;
    this.fetchRevalidationData();
  }

  clearRevalidationFilters(): void {
    this.revalidationDateFilter = '';
    this.revalidationMonthFilter = '';
    this.revalidationYearFilter = '';
    this.revalidationStatusFilter = '';
    this.revalidationCompanyFilter = '';
    this.searchFilter = '';
    this.activeSummaryFilter = '';
    this.currentPage = 1;
    this.fetchRevalidationData();
  }

  onRevalidationDateFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationMonthFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationYearFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationStatusFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationCompanyFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onSummaryCardClick(filter: string): void {
    const normalized = this.normalizeStageToken(filter);
    const current = this.normalizeStageToken(this.revalidationStatusFilter);

    if (!normalized || normalized === 'all') {
      this.activeSummaryFilter = '';
      this.revalidationStatusFilter = '';
    } else if (current === normalized) {
      this.activeSummaryFilter = '';
      this.revalidationStatusFilter = '';
    } else {
      this.activeSummaryFilter = filter;
      this.revalidationStatusFilter = filter;
    }
    this.currentPage = 1;
    this.fetchRevalidationData();
  }

  private syncActiveSummaryFilter(): void {
    const normalized = this.normalizeStageToken(this.revalidationStatusFilter);
    if (['pending', 'approved', 'underprocess', 'actionrequired'].includes(normalized)) {
      this.activeSummaryFilter = this.revalidationStatusFilter;
      return;
    }
    this.activeSummaryFilter = '';
  }

  getPermitsDisplay(item: TableData): string {
    const rawPermits = item.detailsPermitsNumber || '';
    if (!rawPermits || rawPermits.trim() === '') {
      return '-';
    }
    const permitsList = rawPermits.split(',').map(p => p.trim()).filter(Boolean);
    const count = permitsList.length;
    return `${count} (Permit No(s): ${permitsList.join(', ')})`;
  }

  private normalizeStageToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private parseDate(value: string | undefined): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toIsoDay(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toIsoMonth(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private isInvalidLikeStatus(item: TableData): boolean {
    const status = this.normalizeStageToken(item?.status);
    return status.includes('invalid') || status.includes('expire');
  }

  private isActionRequiredLikeStatus(item: TableData): boolean {
    const status = this.normalizeStageToken(item?.status);
    return status.includes('importpermitextends45days');
  }

  private isApprovedLikeStatus(item: TableData): boolean {
    if (this.isActionRequiredLikeStatus(item)) {
      return false;
    }
    const status = this.normalizeStageToken(item?.status);
    const code = this.normalizeStageToken(item?.statusCode);
    return (
      status.includes('approv') ||
      status.includes('issued') ||
      code === 'rv09'
    );
  }

  private isPendingLikeStatus(item: TableData): boolean {
    const statusToken = this.normalizeToken(item?.status);
    if (statusToken.includes('approv') || statusToken.includes('reject') || statusToken.includes('invalid') || statusToken.includes('expire')) {
      return false;
    }

    // For commissioner: pending = action required RIGHT NOW or forwarded to commissioner awaiting action
    if (this.isCommissioner()) {
      const actions: string[] = item?.allowedActions ?? [];
      const hasApprove = Array.isArray(actions) && (actions.includes('APPROVE') || actions.includes('REJECT'));
      if (hasApprove) return true;
      return statusToken.includes('commissioner') || statusToken.includes('forward') || statusToken === 'pending' || statusToken.includes('submit');
    }

    // For permit section: pending when action is needed right now by permit section
    if (this.isPermitSection()) {
      const actions: string[] = item?.allowedActions ?? [];
      const hasAction = Array.isArray(actions) && (actions.includes('APPROVE') || actions.includes('REJECT') ||
             actions.includes('FORWARD') || actions.includes('VERIFY'));
      if (hasAction) return true;
      return statusToken.includes('permitsection') || statusToken === 'pending' || statusToken.includes('forward') || statusToken.includes('submit');
    }

    if (this.isInvalidLikeStatus(item) || this.isApprovedLikeStatus(item) || this.isActionRequiredLikeStatus(item)) {
      return false;
    }
    return true;
  }

  private isUnderProcessLikeStatus(item: TableData): boolean {
    if (this.isInvalidLikeStatus(item) || this.isApprovedLikeStatus(item) || this.isActionRequiredLikeStatus(item)) {
      return false;
    }
    if (this.isPendingLikeStatus(item)) {
      return false;
    }
    return true;
  }

  getRevalidationStatusCount(status: string): number {
    const filter = this.normalizeStageToken(status);

    if (this.isCommissioner() || this.isPermitSection()) {
      if (filter === 'actionrequired' || filter === 'invalid') {
        return 0;
      }
      if (this.countsLoaded) {
        if (filter === 'approved') return this.counts.approved;
        if (filter === 'pending') {
          const computed = this.summaryRevalidationData.filter(item => this.isPendingLikeStatus(item)).length;
          return Math.max(this.counts.pending || 0, computed);
        }
        if (filter === 'rejected') return this.counts.rejected;
        if (filter === 'total' || filter === 'all') {
          const calculated = (Number(this.counts.pending) || 0) + (Number(this.counts.approved) || 0) + (Number(this.counts.rejected) || 0);
          return calculated > 0 ? calculated : (this.counts.total || 0);
        }
      }
      if (filter === 'pending') {
        return this.summaryRevalidationData.filter(item => this.isPendingLikeStatus(item)).length;
      }
      if (filter === 'approved') {
        return this.summaryRevalidationData.filter(item => this.isApprovedLikeStatus(item)).length;
      }
      if (filter === 'rejected') {
        return this.summaryRevalidationData.filter(item => this.normalizeStageToken(item.status).includes('reject')).length;
      }
      if (filter === 'underprocess') {
        return this.summaryRevalidationData.filter(item => this.isUnderProcessLikeStatus(item)).length;
      }
      if (filter === 'total' || filter === 'all') {
        return this.summaryRevalidationData.length;
      }
    }

    if (this.countsLoaded) {
      if (filter === 'actionrequired' || filter === 'invalid') {
        return this.counts.invalid || 0;
      }
      if (filter === 'approved') return this.counts.approved;
      if (filter === 'pending') {
        const computed = this.summaryRevalidationData.filter(item => this.isPendingLikeStatus(item)).length;
        return Math.max(this.counts.pending || 0, computed);
      }
      if (filter === 'underprocess') return this.counts.underprocess;
      if (filter === 'rejected') return this.counts.rejected;
      if (filter === 'live') return this.counts.live;
      if (filter === 'total' || filter === 'all') return this.counts.total;
      return (this.counts as any)[filter] ?? 0;
    }

    if (filter === 'actionrequired') {
      return this.summaryRevalidationData.filter(item => this.isActionRequiredLikeStatus(item)).length;
    }
    if (filter === 'approved') {
      return this.summaryRevalidationData.filter(item => this.isApprovedLikeStatus(item)).length;
    }
    if (filter === 'pending') {
      return this.summaryRevalidationData.filter(item => this.isPendingLikeStatus(item)).length;
    }
    if (filter === 'underprocess') {
      return this.summaryRevalidationData.filter(item => this.isUnderProcessLikeStatus(item)).length;
    }
    return this.summaryRevalidationData.filter(item => this.normalizeStageToken(item.status).includes(filter)).length;
  }

  getLiveRevalidationCount(): number {
    return this.countsLoaded ? this.counts.live : this.revlidationData.filter(item => item.isLive).length;
  }

  getTotalRevalidationAmount(): number {
    return this.revlidationData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }

  viewApplication(item: TableData, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Determine the source based on user type
    const userType = this.getUserType();
    let source = 'licensee-dashboard';

    if (userType === 'commissioner') {
      source = 'commissioner-dashboard';
    } else if (userType === 'permit-section') {
      source = 'permit-section';
    }

    const refNo = item.referenceNo;

    if (this.isCommissionerApprovedRevalidation(item)) {
      this.router.navigate(["/unified-letter-view/revalidation"], {
        queryParams: {
          id: item.id,
          ref: refNo,
          source: source
        },
      });
      return;
    }

    this.router.navigate(["/dev-supply-chain-revalidation-request"], {
      queryParams: {
        id: item.id,
        ref: refNo,
        source: source,
        mode: 'view'
      },
    });
  }

  /** Opens the stable ENA details view, independent of the shared action-button workflow. */
  openDetails(item: TableData): void {
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id: item.id,
        ref: item.referenceNo,
        type: 'revalidation',
        source: this.getUserContext()
      }
    });
  }

  /** Opens the matching payment slip for this revalidation. */
  openPaymentSlip(item: TableData): void {
    this.router.navigate(['/payment-slip-view'], {
      queryParams: {
        id: item.id,
        ref: item.referenceNo,
        refNo: item.referenceNo,
        referenceNo: item.referenceNo,
        type: 'revalidation',
        source: this.getUserContext()
      }
    });
  }

  /** Opens the revalidation permit slip / approval letter. */
  openPermitSlip(item: TableData): void {
    const userType = this.getUserType();
    const source = userType === 'commissioner' ? 'commissioner-dashboard' : (userType === 'permit-section' ? 'permit-section' : 'licensee-dashboard');
    const refNo = item.referenceNo || item.id;

    this.router.navigate(["/unified-letter-view/revalidation"], {
      queryParams: {
        id: item.id,
        ref: refNo,
        refNo: refNo,
        source: source
      },
    });
  }

  // Unified action handler
  onUnifiedAction(event: { action: string, item: any }): void {
    const context = this.getUserContext();

    this.unifiedActionsService.executeAction(
      event.action,
      event.item,
      'revalidation',
      context
    ).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (result.message) {
            alert(result.message);
          }
          this.supplyChainService.clearCache();
          try {
            const interceptorModule = require('../../../../../core/interceptors/read-api-cache.interceptor');
            if (interceptorModule?.ReadApiCacheInterceptor) {
              interceptorModule.ReadApiCacheInterceptor.clearCache();
            }
          } catch (e) {}
          this.loadRevalidationData();
        } else {
          alert(`Action failed: ${result.message}`);
        }
      },
      error: (error: any) => {
        console.error('Action failed:', error);
        alert(`Action failed: ${error.message || 'Unknown error'}`);
      }
    });
  }

  // Get current user context for actions
  getUserContext(): 'licensee' | 'permit-section' | 'commissioner' | 'itcell' | 'officer-in-charge' {
    if (this.isCommissioner()) return 'commissioner';
    if (this.isPermitSection()) return 'permit-section';
    return 'licensee';
  }

  // Load revalidation data
  loadRevalidationData(): void {
    this.fetchRevalidationData();
  }

  requestRevlidation(item: TableData): void {
    this.router.navigate(["/dev-supply-chain-revalidation-request"], {
      queryParams: {
        id: item.id,
      },
    });
  }

  shouldShowRequestRevalidation(item: TableData): boolean {
    if (this.isCommissioner() || this.isPermitSection() || this.isAdmin()) {
      return false;
    }
    const actions = item?.allowedActions || [];
    return actions.includes('REQUEST_REVALIDATION') || (actions.length > 0 && !actions.every(a => a.startsWith('VIEW')));
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(): number {
    return this.totalPages;
  }

  getPaged(): TableData[] {
    return this.filteredRevalidationData;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages() && page !== this.currentPage && !this.isLoading) {
      this.currentPage = page;
      this.fetchRevalidationData();
    }
  }

  resetPagination(): void {
    this.currentPage = 1;
  }

  changePageSize(size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s || s === this.pageSize) return;
    this.pageSize = s;
    this.currentPage = 1;
    this.fetchRevalidationData();
  }

  // Role detection methods
  isCommissioner(): boolean {
    const hasRole = this.accountService.hasAnyRole([
      10,
      'commissioner',
      'joint_commissioner',
      'level_1',
      'level_2',
      'level_3',
      'level_4',
      'level_5',
      'site_admin'
    ]);
    const isCommissionerRoute = this.isBrowser && window.location.pathname.includes('commissioner');
    return hasRole || isCommissionerRoute;
  }

  isPermitSection(): boolean {
    const hasRole = this.accountService.hasAnyRole(['permit-section', 'permit section', 'permit_section', 'Permit Section']);
    const isPermitSectionRoute = this.isBrowser && (window.location.pathname.includes('permit-section') || window.location.pathname.includes('app-permit-section'));
    return hasRole || isPermitSectionRoute;
  }

  isAdmin(): boolean {
    return this.isCommissioner() || this.isPermitSection() || this.accountService.hasAnyRole(['admin', 'site_admin', 'super_admin', 'level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'officer']);
  }

  /**
   * Visibility rule for admin users:
   * - Show the record if the admin has actions to take (allowedActions non-empty) — it's their turn.
   * - Show the record if it has already passed through their stage (historical) — they already acted.
   * - Hide the record if it hasn't reached their stage yet.
   * Licensee users always see all their own records.
   */
  isVisibleToCurrentAdmin(item: TableData): boolean {
    if (!this.isCommissioner() && !this.isPermitSection()) return true;

    if ((item.allowedActions?.length ?? 0) > 0) return true;

    const combined = `${String(item.status ?? '')} ${String((item as any).currentStageName ?? '')}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (this.isCommissioner() && combined.includes('commissioner')) return true;
    if (this.isPermitSection() && combined.includes('permitsection')) return true;

    return false;
  }

  getUserType(): 'commissioner' | 'permit-section' | 'licensee' {
    if (this.isCommissioner()) return 'commissioner';
    if (this.isPermitSection()) return 'permit-section';
    return 'licensee';
  }

  getCompanyColumnLabel(): string {
    return this.isCommissioner() ? 'Factory Name' : 'Distillery Name';
  }

  getCompanyDisplayName(item: TableData): string {
    if (this.isCommissioner()) {
      return item.factoryName || '-';
    }
    return item.distilleryName || '-';
  }

  // Workflow actions
  approveRevalidation(item: TableData): void {
    if (!item.id) {
      console.error('Revalidation ID not found');
      return;
    }

    // Pass generic remarks or prompt user
    this.supplyChainService.performRevalidationAction(item.id, 'APPROVE', 'Approved from Revalidation Component').subscribe({
      next: (response) => {
        alert(`Action successful! Status updated to: ${response.status}`);
        this.fetchRevalidationData(); // Reload data
      },
      error: (error) => {
        console.error('Error performing action:', error);
        alert('Failed to perform action. ' + (error.error?.error || error.error?.message || ''));
      }
    });
  }

  rejectRevalidation(item: TableData): void {
    if (!item.id) {
      console.error('Revalidation ID not found');
      return;
    }

    this.supplyChainService.performRevalidationAction(item.id, 'REJECT', 'Rejected from Revalidation Component').subscribe({
      next: (response) => {
        alert(`Action successful! Status updated to: ${response.status}`);
        this.fetchRevalidationData(); // Reload data
      },
      error: (error) => {
        console.error('Error performing action:', error);
        alert('Failed to perform action. ' + (error.error?.error || error.error?.message || ''));
      }
    });
  }

  canPerformAction(item: TableData): boolean {
    if (item.status?.includes('INVALID')) return false;
    console.log(`[ID: ${item.id}] canPerformAction - allowedActions:`, item.allowedActions);
    if (item.allowedActions && item.allowedActions.includes('APPROVE')) {
      console.log(`[ID: ${item.id}] ✓ APPROVE button WILL SHOW`);
      return true;
    }
    console.log(`[ID: ${item.id}] ✗ APPROVE button HIDDEN`);
    return false;
  }

  canReject(item: TableData): boolean {
    if (item.status?.includes('INVALID')) return false;
    console.log(`[ID: ${item.id}] canReject - allowedActions:`, item.allowedActions);
    if (item.allowedActions && item.allowedActions.includes('REJECT')) {
      console.log(`[ID: ${item.id}] ✓ REJECT button WILL SHOW`);
      return true;
    }
    console.log(`[ID: ${item.id}] ✗ REJECT button HIDDEN`);
    return false;
  }

  getActionIncludeList(item: TableData): string[] {
    const actions = ['VIEW', ...(item.allowedActions || [])];
    
    // For revalidation, show payment slip after submission (₹1000 deduction)
    const hasPayment = this.hasPaymentBeenMade(item);
    if (hasPayment) {
      actions.push('VIEW_PAYMENT_SLIP');
    }
    
    if (this.canViewPermitSlip(item)) {
      actions.push('VIEW_PERMIT_SLIP');
    }
    
    return Array.from(new Set(actions));
  }

  hasPaymentBeenMade(item: TableData): boolean {
    // Check if payment has been completed (₹1000 deducted from wallet)
    const status = (item.status || '').toLowerCase().replace(/\s+/g, '');
    
    // Payment indicators for revalidation
    // After submission, ₹1000 is deducted, so any status after submission indicates payment
    const statusIndicatesPayment = status.includes('forwarded') ||
                                   status.includes('approved') ||
                                   status.includes('revalidation') ||
                                   status.includes('submitted') ||
                                   status.includes('pending');
    
    return statusIndicatesPayment;
  }

  canViewPermitSlip(item: TableData): boolean {
    if (!item) return false;
    // License user should not see permit slip / approval letter
    if (!this.isAdmin()) {
      return false;
    }
    const status = this.normalizeToken(item.status);
    if (status.includes('reject')) return false;

    const isApproved =
      this.isCommissionerApprovedRevalidation(item) ||
      status.includes('approved') ||
      status.includes('approv') ||
      status.includes('finalapproved') ||
      status.includes('issued');

    const hasSlipAction =
      Array.isArray(item.allowedActions) &&
      (item.allowedActions.includes('VIEW_PERMIT_SLIP') || item.allowedActions.includes('VIEW_SLIP'));

    return isApproved || hasSlipAction;
  }

  getRevalidationExtensionRange(item: TableData): string {
    if (!this.isCommissionerApprovedRevalidation(item)) {
      return '-';
    }

    const fromDate =
      this.parseDate(item.approvalDateRaw) ||
      this.parseDate(item.requisitionDateRaw) ||
      this.parseDate(item.revalidationDateRaw) ||
      this.parseDate(item.updatedAtRaw) ||
      this.parseDate(item.submissionDateRaw) ||
      this.parseDate(item.submissionDate);

    if (!fromDate) {
      return '-';
    }

    const toDateFromApi = this.parseDate(item.expiryDateRaw) || this.parseDate(item.validUpToRaw);
    if (toDateFromApi) {
      return `${this.formatDisplayDate(fromDate)} to ${this.formatDisplayDate(toDateFromApi)}`;
    }

    const validityDays = Number.isFinite(item.validityPeriodDays) ? Number(item.validityPeriodDays) : 45;
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + Math.max(validityDays, 0));
    return `${this.formatDisplayDate(fromDate)} to ${this.formatDisplayDate(toDate)}`;
  }

  private isCommissionerApprovedRevalidation(item: TableData): boolean {
    const status = this.normalizeToken(item.status);
    const statusCode = this.normalizeToken(item.statusCode);
    const looksApprovedByCommissioner =
      status.includes('approv') &&
      status.includes('commissioner') &&
      !status.includes('reject');
    return looksApprovedByCommissioner || statusCode === 'rv09';
  }

  private formatDisplayDate(date: Date): string {
    return date
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      .replace(/ /g, '-');
  }

  private normalizeToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Returns the CSS modifier class for the status badge based on stage ID and status name.
   * Stage IDs: 47 = Approved By Commissioner, 48 = Rejected By Commissioner,
   *            63 = Forwarded To Commissioner, 64 = IMPORT PERMIT EXTENDS 45 DAYS
   */
  getStatusBadgeClass(item: TableData): string {
    const stageId = Number(item?.currentStage ?? -1);
    const status = this.normalizeToken(item?.status);

    // Match by stage ID first (most reliable)
    if (stageId === 47) return 'status-approved';
    if (stageId === 48) return 'status-rejected';
    if (stageId === 63) return 'status-forwarded';
    if (stageId === 64) return 'status-extended';

    // Fallback: match by status name keywords
    if (status.includes('approvedbycommissioner') || status.includes('approvedcommissioner')) return 'status-approved';
    if (status.includes('rejectedbycommissioner') || status.includes('rejectedcommissioner')) return 'status-rejected';
    if (status.includes('forwardedtocommissioner') || status.includes('forwardedcommissioner')) return 'status-forwarded';
    if (status.includes('importpermitextends') || status.includes('extends45')) return 'status-extended';
    if (status.includes('approv') || status.includes('issued')) return 'status-approved';
    if (status.includes('reject') || status.includes('cancel')) return 'status-rejected';
    if (status.includes('invalid') || status.includes('expire')) return 'status-expired';
    if (status.includes('pending')) return 'status-pending';
    if (status.includes('forward') || status.includes('submit') || status.includes('review') || status.includes('process')) return 'status-forwarded';

    return 'status-default';
  }

}
