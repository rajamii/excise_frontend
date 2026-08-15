import { Component, OnInit, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { SupplyChainService } from '../../services/supplychain.service';
import { environment } from '../../../../../../environments/environment';
import { AccountService } from '../../../../../core/services/account.service';
import { UnifiedActionButtonsComponent } from '../../../../../shared/components/unified-action-buttons/unified-action-buttons.component';
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
  validityPeriodDays?: number;
  distilleryName: string;
  factoryName?: string;
  status: string;
  statusCode?: string;
  amount: string;
  isLive?: boolean;
  isInvalid?: boolean;
  allowedActions?: string[]; // Dynamic actions from backend
  workflowId?: number;
  currentStage?: number;
  currentStageIsFinal?: boolean | string; // Indicates if current stage is final approval
  allowedActionConfigs?: any[];
}

@Component({
  selector: 'app-revalidation',
  standalone: true,
  imports: [CommonModule, FormsModule, UnifiedActionButtonsComponent],
  templateUrl: './revalidation.component.html',
  styleUrl: './revalidation.component.scss'
})
export class RevalidationComponent implements OnInit {
  Math = Math;
  private isBrowser = false;
  private initialSummaryAutoSelected = false;

  // Filter properties for revalidation
  revalidationDateFilter: string = '';
  revalidationMonthFilter: string = '';
  revalidationYearFilter: string = '';
  revalidationStatusFilter: string = '';
  revalidationCompanyFilter: string = '';
  revalidationCompanyOptions: string[] = [];
  activeSummaryFilter: string = '';

  filteredRevalidationData: TableData[] = [];
  summaryRevalidationData: TableData[] = [];

  revlidationData: TableData[] = [];

  // Pagination state
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  // Services
  private unifiedActionsService = inject(UnifiedActionsService);

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
    this.fetchRevalidationData();
  }

  async fetchRevalidationData() {
    try {
      console.log('DEBUG: Fetching data...');

      let response: any;

      if (this.supplyChainService) {
        console.log('DEBUG: Using SupplyChainService');
        response = await firstValueFrom(this.supplyChainService.getRevalidationData());
      } else {
        console.warn('DEBUG: Service undefined! Using direct Http as fallback.');
        const url = `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/`;
        response = await firstValueFrom(this.http.get<any[]>(url));

        // Manual handling of results structure if direct call
        if (response && !Array.isArray(response) && response.results) {
          response = response.results;
        }
      }

      console.log('DEBUG: Raw Response:', response);

      this.revlidationData = (response || []).map((item: any) => {
        const dateVal = item.revalidationDate || item.revalidation_date;
        let formattedDate = '';
        try {
          formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '';
        } catch (e) {
          formattedDate = '';
        }

        return {
          id: item.id, // Map ID
          referenceNo: item.ourRefNo || item.our_ref_no,
          submissionDate: formattedDate,
          submissionDateRaw: dateVal || '',
          revalidationDateRaw: item.revalidationDate || item.revalidation_date || '',
          requisitionDateRaw: item.requisitionDate || item.requisition_date || '',
          approvalDateRaw: item.approvalDate || item.approval_date || '',
          updatedAtRaw: item.updatedAt || item.updated_at || '',
          expiryDateRaw: item.expiryDate || item.expiry_date || '',
          validityPeriodDays: Number(item.validityPeriodDays || item.validity_period_days || 45),
          factoryName: item.establishment_name || item.establishmentName || item.factory_name || item.factoryName || '',
          distilleryName: item.distilleryName || item.distillery_name,
          status: item.status,
          statusCode: item.statusCode || item.status_code || '',
          amount: item.revalidationBrAmount || item.revalidation_br_amount || '0.00',
          isLive: !item.status?.includes('INVALID') && !item.status?.includes('EXPIRED'),
          isInvalid: item.status?.includes('INVALID') || item.status?.includes('EXPIRED'),
          allowedActions: item.allowedActions || item.allowed_actions || [],
          allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
          workflowId: item.workflow || item.workflow_id || item.workflowId,
          currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId
        }
      });

      // Freeze objects to prevent mutations
      this.revlidationData.forEach(item => {
        Object.freeze(item.allowedActions);
      });

      this.applyRevalidationFilters();
      this.maybeAutoSelectPendingSummary();
      console.log('DEBUG: Processed Data length:', this.filteredRevalidationData.length);
      console.log('DEBUG: Each item allowedActions:');
      this.filteredRevalidationData.forEach(item => {
        console.log(`  ID ${item.id}: allowedActions =`, item.allowedActions, `(length: ${item.allowedActions?.length || 0})`);
      });

      console.log('DEBUG: revlidationData[0] reference check:');
      console.log('  revlidationData[0]:', this.revlidationData[0]);
      console.log('  filteredRevalidationData[0]:', this.filteredRevalidationData[0]);
      console.log('  Same object?', this.revlidationData[0] === this.filteredRevalidationData[0]);

    } catch (error) {
      console.error('Error fetching revalidation data:', error);
    }
  }

  private maybeAutoSelectPendingSummary(): void {
    if (this.initialSummaryAutoSelected) return;
    this.initialSummaryAutoSelected = true;

    if (this.revalidationStatusFilter || this.activeSummaryFilter) return;

    const pendingCount = this.getRevalidationStatusCount('PENDING');
    if (pendingCount > 0) {
      this.activeSummaryFilter = 'PENDING';
      this.revalidationStatusFilter = 'PENDING';
      this.applyRevalidationFilters();
    }
  }

  // Revalidation filter methods
  applyRevalidationFilters(): void {
    console.log('applyRevalidationFilters called');
    console.log('Source data (revlidationData) before filter:');
    this.revlidationData.forEach(item => {
      console.log(`  ID ${item.id}: allowedActions =`, item.allowedActions);
    });

    console.log('Applying revalidation filters:', {
      dateFilter: this.revalidationDateFilter,
      monthFilter: this.revalidationMonthFilter,
      yearFilter: this.revalidationYearFilter,
      statusFilter: this.revalidationStatusFilter
    });

    this.summaryRevalidationData = this.revlidationData.filter(item => {
      // Admin visibility: only show records at or past this admin's stage
      if (!this.isVisibleToCurrentAdmin(item)) return false;

      const submissionDate =
        this.parseDate(item.submissionDateRaw) ||
        this.parseDate(item.submissionDate);

      if (!submissionDate) {
        return !this.revalidationDateFilter && !this.revalidationMonthFilter && !this.revalidationYearFilter;
      }

      if (this.revalidationDateFilter && this.toIsoDay(submissionDate) !== this.revalidationDateFilter) {
        return false;
      }

      if (this.revalidationMonthFilter && this.toIsoMonth(submissionDate) !== this.revalidationMonthFilter) {
        return false;
      }

      if (this.revalidationYearFilter && String(submissionDate.getFullYear()) !== String(this.revalidationYearFilter)) {
        return false;
      }

      return true;
    });

    // Build company options for commissioner filter
    this.revalidationCompanyOptions = Array.from(
      new Set(
        this.summaryRevalidationData
          .map(item => String(item?.factoryName || item?.distilleryName || '').trim())
          .filter(v => !!v)
      )
    ).sort((a, b) => a.localeCompare(b));

    this.filteredRevalidationData = this.summaryRevalidationData.filter(item => {
      // Company filter — commissioner only
      if (this.revalidationCompanyFilter) {
        const company = String(item?.factoryName || item?.distilleryName || '').trim();
        if (company !== this.revalidationCompanyFilter) return false;
      }

      if (!this.revalidationStatusFilter) {
        return true;
      }

      const filter = this.normalizeStageToken(this.revalidationStatusFilter);
      if (filter === 'actionrequired') {
        return this.isActionRequiredLikeStatus(item);
      }
      if (filter === 'approved') {
        return this.isApprovedLikeStatus(item);
      }
      if (filter === 'pending') {
        return this.isPendingLikeStatus(item);
      }
      if (filter === 'underprocess') {
        return this.isUnderProcessLikeStatus(item);
      }
      return this.normalizeStageToken(item.status).includes(filter);
    });

    console.log('Filtered data after filter:');
    this.filteredRevalidationData.forEach(item => {
      console.log(`  ID ${item.id}: allowedActions =`, item.allowedActions);
    });

    this.resetPagination();
  }

  clearRevalidationFilters(): void {
    this.revalidationDateFilter = '';
    this.revalidationMonthFilter = '';
    this.revalidationYearFilter = '';
    this.revalidationStatusFilter = '';
    this.revalidationCompanyFilter = '';
    this.activeSummaryFilter = '';
    this.summaryRevalidationData = [...this.revlidationData];
    this.filteredRevalidationData = [...this.revlidationData];
    this.resetPagination();
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
    this.syncActiveSummaryFilter();
    this.applyRevalidationFilters();
  }

  onSummaryCardClick(filter: string): void {
    const normalized = this.normalizeStageToken(filter);
    const current = this.normalizeStageToken(this.revalidationStatusFilter);

    if (!normalized || normalized === 'all') {
      this.activeSummaryFilter = '';
      this.revalidationStatusFilter = '';
      this.applyRevalidationFilters();
      return;
    }

    if (current === normalized) {
      this.activeSummaryFilter = '';
      this.revalidationStatusFilter = '';
      this.applyRevalidationFilters();
      return;
    }

    this.activeSummaryFilter = filter;
    this.revalidationStatusFilter = filter;
    this.applyRevalidationFilters();
  }

  private syncActiveSummaryFilter(): void {
    const normalized = this.normalizeStageToken(this.revalidationStatusFilter);
    if (['pending', 'approved', 'underprocess', 'actionrequired'].includes(normalized)) {
      this.activeSummaryFilter = this.revalidationStatusFilter;
      return;
    }
    this.activeSummaryFilter = '';
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
    // For commissioner: pending = action required RIGHT NOW (allowedActions has APPROVE)
    if (this.isCommissioner()) {
      const actions: string[] = item?.allowedActions ?? [];
      return Array.isArray(actions) && actions.includes('APPROVE');
    }
    // For permit section: same — only pending when action is needed right now
    if (this.isPermitSection()) {
      const actions: string[] = item?.allowedActions ?? [];
      return Array.isArray(actions) && (actions.includes('APPROVE') || actions.includes('REJECT') ||
             actions.includes('FORWARD') || actions.includes('VERIFY'));
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
    return this.revlidationData.filter(item => item.isLive).length;
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
          // Reload data if it was a backend action
          if (['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'EXTEND'].includes(event.action)) {
            this.loadRevalidationData();
          }
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

  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRevalidationData.length / this.pageSize));
  }

  getPaged(): TableData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const paged = this.filteredRevalidationData.slice(start, start + this.pageSize);
    console.log('getPaged() returning:', paged.length, 'items');
    console.log('CHECK SOURCE DATA - revlidationData[0]:', this.revlidationData[0]?.allowedActions);
    console.log('CHECK FILTERED DATA - filteredRevalidationData[0]:', this.filteredRevalidationData[0]?.allowedActions);
    paged.forEach(item => {
      console.log(`  Paged ID ${item.id}: allowedActions =`, item.allowedActions);
    });
    return paged;
  }

  goToPage(page: number): void {
    const total = this.getTotalPages();
    if (page < 1 || page > total) return;
    this.currentPage = page;
  }

  resetPagination(): void {
    this.currentPage = 1;
  }

  changePageSize(size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSize = s;
    this.currentPage = 1;
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
    return this.isBrowser && (window.location.pathname.includes('permit-section') || window.location.pathname.includes('app-permit-section'));
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
    
    console.log('🔍 getActionIncludeList (revalidation):', {
      itemId: item.id,
      refNo: item.referenceNo,
      status: item.status,
      hasPayment,
      allowedActions: item.allowedActions,
      isCommissioner: this.isCommissioner()
    });
    
    // Show "View Payment Slip" after payment is made (₹1000 deducted)
    if (hasPayment) {
      actions.push('VIEW_PAYMENT_SLIP');
    }
    
    // Trust backend for VIEW_PERMIT_SLIP action
    if (item.allowedActions && item.allowedActions.includes('VIEW_PERMIT_SLIP')) {
      console.log('✅ Backend says show VIEW_PERMIT_SLIP');
      actions.push('VIEW_PERMIT_SLIP');
    }
    
    console.log('🔍 Final actions array:', actions);
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
    
    console.log('🔍 hasPaymentBeenMade check (revalidation):', {
      status,
      statusIndicatesPayment,
      result: statusIndicatesPayment
    });
    
    return statusIndicatesPayment;
  }

  canViewPermitSlip(item: TableData): boolean {
    // Only commissioner can view permit slip at final approved stage
    if (!this.isCommissioner()) {
      return false;
    }
    
    const status = (item.status || '').toLowerCase().replace(/\s+/g, '');
    const currentStageIsFinal = item.currentStageIsFinal === true || item.currentStageIsFinal === 'true';
    
    // Check if it's at final approved stage
    // For revalidation, show permit slip when forwarded to commissioner OR approved by commissioner
    const isApprovedByCommissioner =
      status.includes('approv') && status.includes('commissioner') && !status.includes('reject');
    const isForwardedToCommissioner =
      status.includes('forward') && status.includes('commissioner') && !status.includes('reject');
    const isFinalApproved = (status.includes('approved') && currentStageIsFinal) ||
                           isApprovedByCommissioner ||
                           isForwardedToCommissioner ||
                           status.includes('finalapproved');
    
    console.log('🔍 canViewPermitSlip (revalidation):', {
      status: item.status,
      normalizedStatus: status,
      currentStageIsFinal,
      isFinalApproved,
      isCommissioner: this.isCommissioner()
    });
    
    return isFinalApproved;
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

    const toDateFromApi = this.parseDate(item.expiryDateRaw);
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
