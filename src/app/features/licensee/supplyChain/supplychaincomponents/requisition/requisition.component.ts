import { Component, OnInit, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../../../../core/services/account.service';
import { EnaRequisitionService } from '../../../../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../services/supplychain.service';
import { CancellationRequestComponent } from '../../cancellation-request/cancellation-request.component';
import { UnifiedActionButtonsComponent } from '../../../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../../../shared/services/unified-actions.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface TableData {
  id?: number;
  referenceNo: string;
  submissionDate: string;
  submissionDateRaw?: string;
  approvalDateRaw?: string;
  distilleryName: string;
  status: string;
  amount: string;
  workflowId?: number;
  currentStage?: number;
  currentStageName?: string;
  currentStageIsFinal?: boolean;
  statusCode?: string;
  canInitiateCancellation?: boolean;
  commissionerStatus?: string;
  forwardedToCommissioner?: boolean;
  canCancel?: boolean;
  allowedActions?: string[];
  allowedActionConfigs?: any[];
  quantity?: number;
  numberOfPermits?: number;
  bulkSpiritType?: string;
  strengthTo?: string;
  liftedFrom?: string;
  viaRoute?: string;
  checkpostEntry?: string;
  purpose?: string;
  paymentStatus?: string;
  paymentId?: string;
  paymentDate?: string;
  hasActiveRevalidation?: boolean;
  has_active_revalidation?: boolean;
}

@Component({
  selector: 'app-requisition',
  standalone: true,
  imports: [CommonModule, FormsModule, CancellationRequestComponent, UnifiedActionButtonsComponent],
  templateUrl: './requisition.component.html',
  styleUrls: ['./requisition.component.scss']
})
export class RequisitionComponent implements OnInit {
  Math = Math;
  private isBrowser = false;

  // Services
  public accountService = inject(AccountService);
  private router = inject(Router);
  private enaRequisitionService = inject(EnaRequisitionService);
  private supplyChainService = inject(SupplyChainService);
  private unifiedActionsService = inject(UnifiedActionsService);

  // Data properties
  requisitionData: TableData[] = [];
  filteredRequisitionData: TableData[] = [];
  private revalidationApprovedDateByRef: Record<string, string> = {};

  // Filter properties
  requisitionDateFilter: string = '';
  requisitionMonthFilter: string = '';
  requisitionYearFilter: string = '';
  requisitionStatusFilter: string = '';

  // Modal properties
  isCancellationModalOpen: boolean = false;
  selectedRequisition: TableData | null = null;
  selectedRequisitionRef: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadData();
  }

  // Unified action handler
  onUnifiedAction(event: { action: string, item: any }): void {
    const context = this.getUserContext();

    this.unifiedActionsService.executeAction(
      event.action,
      event.item,
      'requisition',
      context
    ).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (result.message) {
            alert(result.message);
          }
          if (['APPROVE', 'REJECT', 'FORWARD', 'VERIFY'].includes(event.action)) {
            this.loadData();
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

  getUserContext(): 'licensee' | 'permit-section' | 'commissioner' | 'itcell' | 'officer-in-charge' {
    if (this.isCommissioner()) return 'commissioner';
    if (this.isPermitSection()) return 'permit-section';
    return 'licensee';
  }

  // Load data based on user type
  loadData(): void {
    console.log('DEBUG: Loading requisition data...');

    forkJoin({
      requisitions: this.enaRequisitionService.getRequisitions().pipe(catchError(() => of([]))),
      revalidations: this.supplyChainService.getRevalidationData().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ requisitions, revalidations }: { requisitions: any; revalidations: any[] }) => {
        const response = requisitions;
        console.log('DEBUG: Raw requisition response:', response);

        // Handle array, DRF paginated `{ results }`, and `{ data }` envelopes.
        let data: any[] = [];
        if (Array.isArray(response)) {
          data = response;
        } else if (response?.results && Array.isArray(response.results)) {
          data = response.results;
        } else if (response?.data && Array.isArray(response.data)) {
          data = response.data;
        }

        this.revalidationApprovedDateByRef = this.buildRevalidationApprovedDateIndex(revalidations || []);

        this.requisitionData = (data || []).map((item: any) => {
          // Format date properly
          const dateVal = item.submissionDate || item.submission_date || item.requisitionDate || item.requisition_date || item.date || item.created_at;
          let formattedDate = '';
          try {
            formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }).replace(/ /g, '-') : '';
          } catch (e) {
            formattedDate = dateVal || '';
          }

          return {
            id: item.id,
            referenceNo: item.ourRefNo || item.our_ref_no || item.referenceNo || item.ref_no || 'N/A',
            submissionDate: formattedDate,
            submissionDateRaw: dateVal || '',
            approvalDateRaw: item.approvalDate || item.approval_date || '',
            distilleryName: item.liftedFromDistilleryName || item.lifted_from_distillery_name || item.distilleryName || item.distillery_name || item.manufacturingUnit || 'N/A',
            status: item.status || 'PENDING',
            amount: item.amount || item.paymentAmount || item.payment_amount || item.totalAmount || item.total_amount || item.totalbl || '0.00',
            workflowId: item.workflow || item.workflow_id || item.workflowId,
            currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId,
            currentStageName:
              item.current_stage_name ||
              item.currentStageName ||
              (typeof item.current_stage === 'string' ? item.current_stage : '') ||
              '',
            currentStageIsFinal: Boolean(
              item.current_stage_is_final ??
              item.currentStageIsFinal ??
              false
            ),
            statusCode: item.status_code || item.statusCode || '',
            canInitiateCancellation: Boolean(
              item.can_initiate_cancellation ?? item.canInitiateCancellation ?? false
            ),
            commissionerStatus: item.commissionerStatus || item.commissioner_status,
            forwardedToCommissioner: item.forwardedToCommissioner || item.forwarded_to_commissioner || false,
            canCancel: item.canCancel || item.can_cancel || false,
            allowedActions: item.allowedActions || item.allowed_actions || [],
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
            // Additional properties that might be needed
            quantity: item.quantity || item.totalQuantity || item.total_quantity,
            numberOfPermits: item.numberOfPermits || item.number_of_permits || 1,
            bulkSpiritType: item.bulkSpiritType || item.bulk_spirit_type,
            strengthTo: item.strengthTo || item.strength_to,
            liftedFrom: item.liftedFrom || item.lifted_from,
            viaRoute: item.viaRoute || item.via_route,
            checkpostEntry: item.checkpostEntry || item.checkpost_entry,
            purpose: item.purpose,
            paymentStatus: item.paymentStatus || item.payment_status || '',
            paymentId: item.paymentId || item.payment_id || item.transactionId || item.transaction_id || '',
            paymentDate: item.paymentDate || item.payment_date || '',
            hasActiveRevalidation: Boolean(item.hasActiveRevalidation || item.has_active_revalidation || false),
            has_active_revalidation: Boolean(item.has_active_revalidation || false)
          };
        });

        console.log('DEBUG: Processed requisition data:', this.requisitionData);
        console.log('DEBUG: Each item allowedActions:');
        this.requisitionData.forEach(item => {
          console.log(`  ID ${item.id}: allowedActions =`, item.allowedActions, `(length: ${item.allowedActions?.length || 0})`);
        });

        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading requisitions:', error);
        // Show empty state or error message
        this.requisitionData = [];
        this.filteredRequisitionData = [];
        this.revalidationApprovedDateByRef = {};
      }
    });
  }

  applyFilters(): void {
    this.filteredRequisitionData = this.requisitionData.filter(item => {
      let matches = true;

      if (this.requisitionDateFilter) {
        matches = matches && item.submissionDate.includes(this.requisitionDateFilter);
      }

      if (this.requisitionStatusFilter) {
        matches = matches && item.status.toLowerCase().includes(this.requisitionStatusFilter.toLowerCase());
      }

      return matches;
    });
  }

  isCommissioner(): boolean {
    return this.accountService.hasAnyRole('commissioner');
  }

  isPermitSection(): boolean {
    return this.accountService.hasAnyRole(['permit-section', 'permit section', 'permit_section', 'Permit Section']);
  }

  approveRequisition(item: TableData): void {
    if (!item.id) {
      alert(' Item ID is required');
      return;
    }

    if (!confirm('Are you sure you want to approve this requisition?')) {
      return;
    }

    this.enaRequisitionService.performAction(item.id, 'APPROVE').subscribe({
      next: (response) => {
        alert('Requisition approved successfully');
        this.loadData();
      },
      error: (error) => {
        console.error('Error approving requisition:', error);
        alert('Failed to approve requisition. ' + (error.error?.message || ''));
      }
    });
  }

  forwardToCommissioner(item: TableData): void {
    this.approveRequisition(item);
  }

  isForwardedToCommissioner(item: TableData): boolean {
    return item.status.toLowerCase().includes('forwarded') ||
      item.status.toLowerCase().includes('commissioner');
  }

  canPerformAction(item: TableData): boolean {
    if (item.allowedActions && item.allowedActions.includes('APPROVE')) {
      return true;
    }
    return false;
  }

  canReject(item: TableData): boolean {
    if (item.allowedActions && item.allowedActions.includes('REJECT')) {
      return true;
    }
    return false;
  }

  getActionIncludeList(item: TableData): string[] {
    const actions = ['VIEW'];
    
    // WORKFLOW LOGIC:
    // 1. After licensee pays → Show "View Payment Slip" for everyone (licensee, permit section, commissioner)
    // 2. After commissioner approves (final stage) → Show BOTH "View Payment Slip" AND "View Permit Slip" for commissioner
    // 3. For approved requisitions → Show "Cancel" button (if no active revalidation/cancellation)
    
    const hasPayment = this.hasPaymentBeenMade(item);
    const isFinalApproved = this.isCommissionerFinalApproval(item);
    const canCancel = this.canCancelRequisition(item);
    
    console.log('🔍 getActionIncludeList:', {
      itemId: item.id,
      refNo: item.referenceNo,
      status: item.status,
      hasPayment,
      isFinalApproved,
      canCancel,
      isCommissioner: this.isCommissioner()
    });
    
    // Show "View Payment Slip" after payment is made (for all roles)
    if (hasPayment) {
      actions.push('VIEW_PAYMENT_SLIP');
    }
    
    // Show "View Permit Slip" only for commissioner after final approval
    if (isFinalApproved && this.isCommissioner()) {
      actions.push('VIEW_SLIP');
    }
    
    // Show "Cancel" button for approved requisitions (if allowed)
    if (canCancel) {
      actions.push('REQUEST_CANCELLATION');
    }
    
    console.log('🔍 Final actions array:', actions);
    return actions;
  }

  canCancelRequisition(item: TableData): boolean {
    // Check if cancellation is allowed for this requisition
    const status = (item.status || '').toLowerCase().replace(/\s+/g, '');
    const isFinalApproved = this.isCommissionerFinalApproval(item);
    
    // Must be approved first
    if (!isFinalApproved) {
      console.log('🔍 canCancelRequisition: Not approved yet');
      return false;
    }
    
    // Check if already cancelled or cancellation in progress
    const isCancelled = status.includes('cancel') || status.includes('cancelled');
    if (isCancelled) {
      console.log('🔍 canCancelRequisition: Already cancelled or in progress');
      return false;
    }
    
    // Check if there's an active revalidation
    // This would need to be checked via backend API or item property
    const hasActiveRevalidation = item['hasActiveRevalidation'] || item['has_active_revalidation'];
    if (hasActiveRevalidation) {
      console.log('🔍 canCancelRequisition: Active revalidation in progress');
      return false;
    }
    
    console.log('🔍 canCancelRequisition: Cancellation allowed');
    return true;
  }

  hasPaymentBeenMade(item: TableData): boolean {
    // Check if payment has been completed
    const status = (item.status || '').toLowerCase().replace(/\s+/g, '');
    const stageName = (item.currentStageName || '').toLowerCase().replace(/\s+/g, '');
    const paymentStatus = (item.paymentStatus || '').toLowerCase();
    
    // Payment indicators - ONLY show after licensee has actually paid
    const hasPaymentId = Boolean(item.paymentId || item.paymentDate);
    
    // Status must explicitly indicate payment was made
    const statusIndicatesPayment = status.includes('payslip') ||
                                   status.includes('payment') ||
                                   stageName.includes('payslip') ||
                                   stageName.includes('payment') ||
                                   paymentStatus.includes('success') ||
                                   paymentStatus.includes('completed');
    
    // Special case: If it's approved/final stage, payment must have been made earlier
    const isFinalStage = Boolean(item.currentStageIsFinal);
    const isApproved = status.includes('approved') || status.includes('issued') || status.includes('complete');
    const paymentMadeInEarlierStage = isFinalStage && isApproved;
    
    console.log('🔍 hasPaymentBeenMade check:', {
      status,
      stageName,
      hasPaymentId,
      statusIndicatesPayment,
      paymentMadeInEarlierStage,
      result: hasPaymentId || statusIndicatesPayment || paymentMadeInEarlierStage
    });
    
    return hasPaymentId || statusIndicatesPayment || paymentMadeInEarlierStage;
  }

  isCommissionerFinalApproval(item: TableData): boolean {
    // Check if commissioner has given final approval
    const isFinalStage = Boolean(item.currentStageIsFinal);
    const status = (item.status || '').toLowerCase().replace(/\s+/g, '');
    const stageName = (item.currentStageName || '').toLowerCase().replace(/\s+/g, '');
    
    // STRICT CHECK: Must be explicitly marked as final stage by backend
    // Don't rely on status alone - backend must set currentStageIsFinal = true
    if (!isFinalStage) {
      console.log('🔍 isCommissionerFinalApproval: NOT final stage', {
        status,
        stageName,
        isFinalStage
      });
      return false;
    }
    
    // Final approval indicators (only checked if isFinalStage is true)
    const isApprovedStatus = status === 'approved' || 
                             status.includes('approvedbycommissioner') ||
                             status.includes('commissionerapproved') ||
                             status.includes('issued') || 
                             status.includes('complete') ||
                             stageName.includes('issued') || 
                             stageName.includes('complete') ||
                             stageName.includes('approved');
    
    console.log('🔍 isCommissionerFinalApproval check:', {
      status,
      stageName,
      isFinalStage,
      isApprovedStatus,
      result: isFinalStage && isApprovedStatus
    });
    
    // Must be BOTH final stage AND approved status
    return isFinalStage && isApprovedStatus;
  }

  shouldShowCommissionerPermitSlip(item: TableData): boolean {
    // DEPRECATED: Use isCommissionerFinalApproval instead
    // Keeping for backward compatibility
    return this.isCommissionerFinalApproval(item);
  }

  viewRequisitionApplication(item: TableData): void {
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id: item.id,
        ref: item.referenceNo,
        type: 'requisition',
        source: this.getUserContext()
      }
    });
  }

  openCancellationModal(item: TableData): void {
    this.selectedRequisition = item;
    this.selectedRequisitionRef = item.referenceNo;
    this.isCancellationModalOpen = true;
  }

  closeCancellationModal(): void {
    this.isCancellationModalOpen = false;
    this.selectedRequisition = null;
    this.selectedRequisitionRef = '';
  }

  clearFilters(): void {
    this.requisitionDateFilter = '';
    this.requisitionMonthFilter = '';
    this.requisitionYearFilter = '';
    this.requisitionStatusFilter = '';
    this.applyFilters();
  }

  clearRequisitionFilters(): void {
    this.clearFilters();
  }

  onRequisitionStatusFilterChange(): void {
    this.applyFilters();
  }

  onRequisitionYearFilterChange(): void {
    this.applyFilters();
  }

  onRequisitionMonthFilterChange(): void {
    this.applyFilters();
  }

  onRequisitionDateFilterChange(): void {
    this.applyFilters();
  }

  getRequisitionStatusCount(status: string): number {
    return this.filteredRequisitionData.filter(item =>
      item.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  shouldShowPermitSlip(item: TableData): boolean {
    return item.status.toLowerCase().includes('approved') ||
      item.status.toLowerCase().includes('issued');
  }

  isRevalidationApprovedByCommissioner(item: TableData): boolean {
    const refKey = this.normalizeRefToken(item.referenceNo);
    return Boolean(refKey && this.revalidationApprovedDateByRef[refKey]);
  }

  getCommissionerApprovalDate(item: TableData): string {
    if (!this.isCommissionerFinalApproval(item)) {
      return '-';
    }
    const approvedDate = this.parseDate(item.approvalDateRaw);
    return approvedDate ? this.formatDisplayDate(approvedDate) : '-';
  }

  getRevalidationExtensionRange(item: TableData): string {
    if (!this.isRevalidationApprovedByCommissioner(item)) {
      return '-';
    }

    const refKey = this.normalizeRefToken(item.referenceNo);
    const fromDate =
      this.parseDate(item.approvalDateRaw) ||
      this.parseDate(this.revalidationApprovedDateByRef[refKey]) ||
      this.parseDate(item.submissionDateRaw) ||
      this.parseDate(item.submissionDate);

    if (!fromDate) {
      return '-';
    }

    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 45);
    return `${this.formatDisplayDate(fromDate)} to ${this.formatDisplayDate(toDate)}`;
  }

  private parseDate(value: string | undefined): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-');
  }

  private buildRevalidationApprovedDateIndex(rows: any[]): Record<string, string> {
    const index: Record<string, string> = {};
    for (const row of rows || []) {
      const status = this.normalizeStageToken(row?.status);
      const stageName = this.normalizeStageToken(row?.current_stage_name || row?.currentStageName);
      const statusCode = this.normalizeStageToken(row?.status_code || row?.statusCode);
      const approved =
        status.includes('approvedrevalidationbycommissioner') ||
        stageName.includes('approvedrevalidationbycommissioner') ||
        statusCode === 'rv09';

      if (!approved) {
        continue;
      }

      const rawRef =
        row?.our_ref_no ||
        row?.ourRefNo ||
        row?.referenceNo ||
        row?.ref_no ||
        '';
      const refKey = this.normalizeRefToken(rawRef);
      if (!refKey) {
        continue;
      }

      const approvedOn =
        row?.approved_at ||
        row?.approvedAt ||
        row?.updated_at ||
        row?.updatedAt ||
        row?.revalidation_date ||
        row?.revalidationDate ||
        row?.created_at ||
        row?.createdAt ||
        '';

      if (approvedOn) {
        index[refKey] = approvedOn;
      }
    }
    return index;
  }

  private normalizeRefToken(value: any): string {
    return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  canShowRequisitionPaymentSlip(item: TableData): boolean {
    const status = this.normalizeStageToken(item?.status);
    const stageName = this.normalizeStageToken(item?.currentStageName);
    const statusCode = this.normalizeStageToken(item?.statusCode);
    const paymentStatus = this.normalizeStageToken(item?.paymentStatus);
    const canCancel = Boolean(item?.canInitiateCancellation || item?.canCancel);
    const hasPaymentRef = Boolean(item?.paymentId || item?.paymentDate);

    if (canCancel) return true;
    if (statusCode === 'rq09') return true;

    const postSlipStageMarkers = [
      'forwardedpayslip',
      'approvedpayslip',
      'rejectedpayslip',
      'approved'
    ];

    const combined = `${status} ${stageName} ${paymentStatus}`;
    if (postSlipStageMarkers.some(marker => combined.includes(marker))) return true;
    if (hasPaymentRef) return true;

    return false;
  }

  openRequisitionSlip(item: TableData, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const id = item?.id;
    const refNo = String(item?.referenceNo || '').trim();
    const queryParams = {
      id: id || undefined,
      type: 'requisition',
      refNo: refNo || undefined,
      ref: refNo || undefined,
      referenceNo: refNo || undefined,
      source: this.getUserContext()
    };

    console.log('[REQUISITION] Slip click', { id, refNo, queryParams, status: item?.status, stage: item?.currentStageName });

    if (this.isBrowser) {
      const params = new URLSearchParams();
      if (queryParams.id) params.set('id', String(queryParams.id));
      if (queryParams.type) params.set('type', String(queryParams.type));
      if (queryParams.refNo) params.set('refNo', String(queryParams.refNo));
      if (queryParams.ref) params.set('ref', String(queryParams.ref));
      if (queryParams.referenceNo) params.set('referenceNo', String(queryParams.referenceNo));
      if (queryParams.source) params.set('source', String(queryParams.source));
      const query = params.toString();
      const target = query ? `/payment-slip-view?${query}` : '/payment-slip-view';
      console.log('[REQUISITION] Direct slip target:', target);
      window.location.assign(target);
      return;
    }

    this.router.navigate(['/payment-slip-view'], { queryParams })
      .then((ok) => {
        if (ok) return;
        if (!this.isBrowser) return;
        const params = new URLSearchParams();
        if (queryParams.id) params.set('id', String(queryParams.id));
        if (queryParams.type) params.set('type', String(queryParams.type));
        if (queryParams.refNo) params.set('refNo', String(queryParams.refNo));
        if (queryParams.ref) params.set('ref', String(queryParams.ref));
        if (queryParams.referenceNo) params.set('referenceNo', String(queryParams.referenceNo));
        if (queryParams.source) params.set('source', String(queryParams.source));
        const query = params.toString();
        window.location.href = query ? `/payment-slip-view?${query}` : '/payment-slip-view';
      })
      .catch(() => {
        if (!this.isBrowser) return;
        const params = new URLSearchParams();
        if (queryParams.id) params.set('id', String(queryParams.id));
        if (queryParams.type) params.set('type', String(queryParams.type));
        if (queryParams.refNo) params.set('refNo', String(queryParams.refNo));
        if (queryParams.ref) params.set('ref', String(queryParams.ref));
        if (queryParams.referenceNo) params.set('referenceNo', String(queryParams.referenceNo));
        if (queryParams.source) params.set('source', String(queryParams.source));
        const query = params.toString();
        window.location.href = query ? `/payment-slip-view?${query}` : '/payment-slip-view';
      });
  }

  private normalizeStageToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  viewSlip(item: TableData): void {
    this.router.navigate(['/dev-requisition-permit-slip'], {
      queryParams: {
        id: item.id,
        ref: item.referenceNo
      }
    });
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequisitionData.length / this.pageSize));
  }

  getPaged(): TableData[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredRequisitionData.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  changePageSize(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
  }

  navigateTo(route: string): void {
    this.router.navigate([`/${route}`]);
  }

  getTotalRequisitionAmount(): number {
    return this.filteredRequisitionData.reduce((total, item) => {
      return total + (parseFloat(item.amount) || 0);
    }, 0);
  }

  getPriority(item: TableData): string {
    // Return priority based on status or other criteria
    if (item.status.toLowerCase().includes('urgent')) {
      return 'high';
    } else if (item.status.toLowerCase().includes('pending')) {
      return 'medium';
    }
    return 'normal';
  }

  // Dashboard statistics methods
  getDashboardStatistics() {
    return {
      applied: this.getRequisitionStatusCount('APPLIED') + this.getRequisitionStatusCount('SUBMITTED'),
      pending: this.getRequisitionStatusCount('PENDING') + this.getRequisitionStatusCount('UNDER_REVIEW'),
      approved: this.getRequisitionStatusCount('APPROVED') + this.getRequisitionStatusCount('APPROVED_BY_COMMISSIONER'),
      rejected: this.getRequisitionStatusCount('REJECTED') + this.getRequisitionStatusCount('REJECTED_BY_COMMISSIONER')
    };
  }

  getFilterOptions() {
    return [
      { value: 'all', label: 'All Applications' },
      { value: 'requisition', label: 'Requisitions' },
      { value: 'pending', label: 'Pending Applications' },
      { value: 'approved', label: 'Approved Applications' },
      { value: 'rejected', label: 'Rejected Applications' }
    ];
  }

  onDashboardFilterChange(filterValue: string): void {
    // Handle dashboard filter changes
    if (filterValue === 'all') {
      this.requisitionStatusFilter = '';
    } else if (filterValue === 'pending') {
      this.requisitionStatusFilter = 'PENDING';
    } else if (filterValue === 'approved') {
      this.requisitionStatusFilter = 'APPROVED';
    } else if (filterValue === 'rejected') {
      this.requisitionStatusFilter = 'REJECTED';
    }
    this.applyFilters();
  }
}
