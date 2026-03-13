import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../../../../core/services/account.service';
import { EnaRequisitionService } from '../../../../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../services/supplychain.service';
import { CancellationRequestComponent } from '../../cancellation-request/cancellation-request.component';
import { UnifiedActionButtonsComponent } from '../../../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../../../shared/services/unified-actions.service';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface TableData {
  id?: number;
  referenceNo: string;
  submissionDate: string;
  submissionDateRaw?: string;
  approvalDateRaw?: string;
  distilleryName: string;
  establishmentName?: string;
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
  licenseeId?: string;
  requestedTotalQuantity?: number;
  hasArrivalDetails?: boolean;
  arrivalTankerCount?: number;
  arrivalTotalBulkLiter?: number;
}

interface TankerArrivalEntry {
  tanker_no: string;
  bulk_liter: number | null;
}

interface ArrivalDetailsRow {
  id: number;
  requisitionId: number;
  referenceNo: string;
  licenseeId: string;
  tankerCount: number;
  tankerDetails: TankerArrivalEntry[];
  totalBulkLiter: number;
  arrivalDate: string;
  requestedTotalQuantity: number;
  distilleryName: string;
}

interface ArrivalMonthSummaryRow {
  monthKey: string;
  monthLabel: string;
  totalBulkLiter: number;
  totalTankers: number;
  entries: number;
}

@Component({
  selector: 'app-requisition',
  standalone: true,
  imports: [CommonModule, FormsModule, CancellationRequestComponent, UnifiedActionButtonsComponent],
  templateUrl: './requisition.component.html',
  styleUrls: ['./requisition.component.scss']
})
export class RequisitionComponent implements OnInit, OnDestroy {
  Math = Math;
  private isBrowser = false;

  // Services
  public accountService = inject(AccountService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
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
  isArrivalModalOpen: boolean = false;
  isArrivalSaving: boolean = false;
  selectedArrivalRequisition: TableData | null = null;
  arrivalErrorMessage: string = '';
  arrivalTankerCount: number = 1;
  arrivalEntries: TankerArrivalEntry[] = [];
  isArrivalViewModalOpen: boolean = false;
  arrivalViewErrorMessage: string = '';
  arrivalViewTankerCount: number = 0;
  arrivalViewTotalBulkLiter: number = 0;
  arrivalViewEntries: TankerArrivalEntry[] = [];
  isArrivalSummaryModalOpen: boolean = false;
  isArrivalSummaryLoading: boolean = false;
  arrivalSummaryErrorMessage: string = '';
  arrivalSummaryDateFilter: string = '';
  arrivalSummaryMonthFilter: string = '';
  allArrivalDetailsRows: ArrivalDetailsRow[] = [];
  filteredArrivalDetailsRows: ArrivalDetailsRow[] = [];
  private sidebarGuardTimer: ReturnType<typeof setInterval> | null = null;
  private queryParamSub: Subscription | null = null;
  private pendingArrivalRef: string = '';
  private pendingArrivalId: number | null = null;
  private autoArrivalHandled = false;
  private pendingCancellationRef: string = '';
  private pendingCancellationId: number | null = null;
  private autoCancellationHandled = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [5, 10, 25, 50];

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.cleanupSidebarLockState();
    this.captureArrivalAutoOpenRequest();
    this.captureCancellationAutoOpenRequest();
    this.queryParamSub = this.route.queryParamMap.subscribe(() => {
      this.captureCancellationAutoOpenRequest();
      this.tryAutoOpenCancellationModal();
    });
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.queryParamSub) {
      this.queryParamSub.unsubscribe();
      this.queryParamSub = null;
    }
    this.cleanupSidebarLockState();
    this.setBulkRecordModalMode(false);
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
            establishmentName:
              item.establishmentName ||
              item.establishment_name ||
              item.manufacturingUnitName ||
              item.manufacturing_unit_name ||
              item.licenseeName ||
              item.licensee_name ||
              'N/A',
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
            canInitiateCancellation:
              item.can_initiate_cancellation ??
              item.canInitiateCancellation ??
              item.canCancel ??
              item.can_cancel,
            commissionerStatus: item.commissionerStatus || item.commissioner_status,
            forwardedToCommissioner: item.forwardedToCommissioner || item.forwarded_to_commissioner || false,
            canCancel: item.canCancel ?? item.can_cancel,
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
            has_active_revalidation: Boolean(item.has_active_revalidation || false),
            licenseeId: item.licensee_id || item.licenseeId || '',
            requestedTotalQuantity: Number(
              item.totalbl ??
              item.total_bl ??
              item.quantity ??
              item.totalQuantity ??
              item.total_quantity ??
              0
            ) || 0,
            hasArrivalDetails: Boolean(item.has_arrival_details || item.hasArrivalDetails || false),
            arrivalTankerCount: Number(item.arrival_tanker_count || item.arrivalTankerCount || 0) || 0,
            arrivalTotalBulkLiter: Number(item.arrival_total_bulk_liter || item.arrivalTotalBulkLiter || 0) || 0
          };
        });

        console.log('DEBUG: Processed requisition data:', this.requisitionData);
        console.log('DEBUG: Each item allowedActions:');
        this.requisitionData.forEach(item => {
          console.log(`  ID ${item.id}: allowedActions =`, item.allowedActions, `(length: ${item.allowedActions?.length || 0})`);
        });

        this.applyFilters();
        this.tryAutoOpenArrivalModal();
        this.tryAutoOpenCancellationModal();
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

  private captureArrivalAutoOpenRequest(): void {
    const shouldOpen = this.route.snapshot.queryParamMap.get('openArrival') === '1';
    if (!shouldOpen) return;

    const ref = String(this.route.snapshot.queryParamMap.get('ref') || '').trim();
    const idRaw = String(this.route.snapshot.queryParamMap.get('id') || '').trim();
    const idParsed = Number(idRaw);

    this.pendingArrivalRef = ref.toUpperCase();
    this.pendingArrivalId = Number.isFinite(idParsed) && idParsed > 0 ? idParsed : null;
    this.autoArrivalHandled = false;
  }

  private captureCancellationAutoOpenRequest(): void {
    const refRaw = String(this.route.snapshot.queryParamMap.get('openCancellationRef') || '').trim();
    if (!refRaw) return;

    const idRaw = String(this.route.snapshot.queryParamMap.get('openCancellationId') || '').trim();
    const idParsed = Number(idRaw);

    this.pendingCancellationRef = this.normalizeRefToken(refRaw);
    this.pendingCancellationId = Number.isFinite(idParsed) && idParsed > 0 ? idParsed : null;
    this.autoCancellationHandled = false;
  }

  private tryAutoOpenArrivalModal(): void {
    if (this.autoArrivalHandled) return;
    if (!this.route.snapshot.queryParamMap.get('openArrival')) return;
    if (!this.requisitionData.length) return;

    const targetById = this.pendingArrivalId != null
      ? this.requisitionData.find((row) => Number(row.id || 0) === this.pendingArrivalId)
      : null;

    const targetByRef = !targetById && this.pendingArrivalRef
      ? this.requisitionData.find((row) => String(row.referenceNo || '').trim().toUpperCase() === this.pendingArrivalRef)
      : null;

    const target = targetById || targetByRef;
    if (!target) return;

    this.autoArrivalHandled = true;
    this.openArrivalModal(target);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { openArrival: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private tryAutoOpenCancellationModal(): void {
    if (this.autoCancellationHandled) return;
    if (!this.route.snapshot.queryParamMap.get('openCancellationRef')) return;
    if (!this.requisitionData.length) return;

    const targetById = this.pendingCancellationId != null
      ? this.requisitionData.find((row) => Number(row.id || 0) === this.pendingCancellationId)
      : null;

    const targetByRef = !targetById && this.pendingCancellationRef
      ? this.requisitionData.find((row) => this.normalizeRefToken(row.referenceNo) === this.pendingCancellationRef)
      : null;

    const target = targetById || targetByRef;
    if (!target) return;

    this.autoCancellationHandled = true;
    this.openCancellationModal(target);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        openCancellationRef: null,
        openCancellationId: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
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
    console.log('🔍 getActionIncludeList:', {
      itemId: item.id,
      refNo: item.referenceNo,
      status: item.status,
      hasPayment,
      isFinalApproved,
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
    
    console.log('🔍 Final actions array:', actions);
    return actions;
  }

  canCancelRequisition(item: TableData): boolean {
    const backendEligibility = item.canInitiateCancellation ?? item.canCancel;
    const status = (item.status || '').toLowerCase().replace(/\s+/g, '');
    const stageName = (item.currentStageName || '').toLowerCase().replace(/\s+/g, '');
    const statusCode = (item.statusCode || '').toUpperCase();
    const isCommissionerApproved =
      this.isCommissionerFinalApproval(item) ||
      statusCode === 'RQ_09' ||
      status.includes('approvedbycommissioner') ||
      stageName.includes('approvedbycommissioner');

    if (isCommissionerApproved) {
      console.log('canCancelRequisition: Hidden for commissioner-approved requisitions');
      return false;
    }

    if (backendEligibility === true) {
      return true;
    }

    // Check if cancellation is allowed for this requisition
    const isFinalApproved =
      status === 'approved';
    
    // Must be approved first
    if (!isFinalApproved) {
      console.log('canCancelRequisition: Not approved yet');
      return false;
    }
    
    // Check if already cancelled or cancellation in progress
    const isCancelled = status.includes('cancel') || status.includes('cancelled');
    if (isCancelled) {
      console.log('canCancelRequisition: Already cancelled or in progress');
      return false;
    }
    
    // Check if there's an active revalidation
    const hasActiveRevalidation = item['hasActiveRevalidation'] || item['has_active_revalidation'];
    if (hasActiveRevalidation) {
      console.log('canCancelRequisition: Active revalidation in progress');
      return false;
    }

    if (backendEligibility === false) {
      console.log('canCancelRequisition: Backend returned false, using approved-state fallback for licensee view');
    }
    
    console.log('canCancelRequisition: Cancellation allowed');
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

  canUpdateArrival(item: TableData): boolean {
    if (this.isCommissioner() || this.isPermitSection()) {
      return false;
    }
    return this.isCommissionerFinalApproval(item) && !Boolean(item.hasArrivalDetails);
  }

  canViewArrivalDetails(item: TableData): boolean {
    if (this.isCommissioner() || this.isPermitSection()) {
      return false;
    }
    return this.isCommissionerFinalApproval(item) && Boolean(item.hasArrivalDetails);
  }

  canViewArrivalSummary(): boolean {
    return !this.isCommissioner() && !this.isPermitSection();
  }

  openArrivalSummaryModal(): void {
    this.closeSidebarIfOpen();
    this.setBulkRecordModalMode(true);
    this.isArrivalSummaryModalOpen = true;
    this.isArrivalSummaryLoading = true;
    this.arrivalSummaryErrorMessage = '';
    this.arrivalSummaryDateFilter = '';
    this.arrivalSummaryMonthFilter = '';
    this.allArrivalDetailsRows = [];
    this.filteredArrivalDetailsRows = [];

    this.enaRequisitionService.getAllRequisitionArrivalDetails().subscribe({
      next: (response: any) => {
        const rows = Array.isArray(response?.data) ? response.data : [];
        this.allArrivalDetailsRows = rows.map((row: any) => this.mapArrivalSummaryRow(row));
        this.applyArrivalSummaryFilters();
        this.isArrivalSummaryLoading = false;
      },
      error: () => {
        this.isArrivalSummaryLoading = false;
        this.arrivalSummaryErrorMessage = 'Unable to load BL details summary.';
      }
    });
  }

  private closeSidebarIfOpen(): void {
    if (!this.isBrowser) {
      return;
    }
    // Unified layout close button for left sidebar.
    const closeBtn = document.querySelector(
      'app-unified-layout .clean-sidenav .user-profile .close-btn'
    ) as HTMLButtonElement | null;
    if (closeBtn) {
      closeBtn.click();
    }
  }

  private setBulkRecordModalMode(isOpen: boolean): void {
    if (!this.isBrowser) {
      return;
    }
    const className = 'bulk-record-modal-open';
    if (isOpen) {
      document.body.classList.add(className);
      this.ensureSidebarClosed();
      if (this.sidebarGuardTimer) {
        clearInterval(this.sidebarGuardTimer);
      }
      this.sidebarGuardTimer = setInterval(() => {
        if (!this.isArrivalSummaryModalOpen) {
          return;
        }
        this.ensureSidebarClosed();
      }, 300);
    } else {
      document.body.classList.remove(className);
      if (this.sidebarGuardTimer) {
        clearInterval(this.sidebarGuardTimer);
        this.sidebarGuardTimer = null;
      }
      this.cleanupSidebarLockState();
    }
  }

  private ensureSidebarClosed(): void {
    const sidenav = document.querySelector('app-unified-layout .clean-sidenav') as HTMLElement | null;
    const isOpened = Boolean(sidenav?.classList.contains('mat-drawer-opened'));
    if (!isOpened) {
      return;
    }
    const closeBtn = document.querySelector(
      'app-unified-layout .clean-sidenav .user-profile .close-btn'
    ) as HTMLButtonElement | null;
    if (closeBtn) {
      closeBtn.click();
    }
  }

  private cleanupSidebarLockState(): void {
    if (!this.isBrowser) {
      return;
    }
    document.body.classList.remove('bulk-record-modal-open');
    const sidenav = document.querySelector('app-unified-layout .clean-sidenav') as HTMLElement | null;
    if (!sidenav) {
      return;
    }
    sidenav.style.removeProperty('display');
    sidenav.style.removeProperty('visibility');
    sidenav.style.removeProperty('pointer-events');
  }

  closeArrivalSummaryModal(): void {
    this.isArrivalSummaryModalOpen = false;
    this.isArrivalSummaryLoading = false;
    this.arrivalSummaryErrorMessage = '';
    this.arrivalSummaryDateFilter = '';
    this.arrivalSummaryMonthFilter = '';
    this.allArrivalDetailsRows = [];
    this.filteredArrivalDetailsRows = [];
    this.setBulkRecordModalMode(false);
  }

  onArrivalSummaryDateFilterChange(): void {
    this.applyArrivalSummaryFilters();
  }

  onArrivalSummaryMonthFilterChange(): void {
    this.applyArrivalSummaryFilters();
  }

  applyArrivalSummaryFilters(): void {
    const dateFilter = (this.arrivalSummaryDateFilter || '').trim();
    const monthFilter = (this.arrivalSummaryMonthFilter || '').trim();

    this.filteredArrivalDetailsRows = this.allArrivalDetailsRows.filter((row) => {
      const date = this.parseDate(row.arrivalDate);
      if (!date) {
        // If no valid date exists, still keep row when no date/month filter is applied.
        return !dateFilter && !monthFilter;
      }
      const dayToken = this.toIsoDay(date);
      const monthToken = this.toIsoMonth(date);
      if (dateFilter && dayToken !== dateFilter) {
        return false;
      }
      if (monthFilter && monthToken !== monthFilter) {
        return false;
      }
      return true;
    });
  }

  getArrivalSummaryMonthlyRows(): ArrivalMonthSummaryRow[] {
    const bucket: Record<string, ArrivalMonthSummaryRow> = {};
    for (const row of this.filteredArrivalDetailsRows) {
      const date = this.parseDate(row.arrivalDate);
      if (!date) {
        continue;
      }
      const monthKey = this.toIsoMonth(date);
      if (!bucket[monthKey]) {
        bucket[monthKey] = {
          monthKey,
          monthLabel: date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
          totalBulkLiter: 0,
          totalTankers: 0,
          entries: 0
        };
      }
      bucket[monthKey].totalBulkLiter += Number(row.totalBulkLiter || 0);
      bucket[monthKey].totalTankers += Number(row.tankerCount || 0);
      bucket[monthKey].entries += 1;
    }

    return Object.values(bucket).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  getFilteredArrivalTotalBulkLiter(): number {
    return this.filteredArrivalDetailsRows.reduce((sum, row) => sum + (Number(row.totalBulkLiter || 0)), 0);
  }

  formatArrivalDate(value: string): string {
    const date = this.parseDate(value);
    if (!date) {
      return '-';
    }
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTankerDetailsShort(rows: TankerArrivalEntry[]): string {
    if (!Array.isArray(rows) || rows.length === 0) {
      return '-';
    }
    return rows
      .map((r) => `${String(r?.tanker_no || '').trim()}: ${Number(r?.bulk_liter || 0).toFixed(2)} Bulk Liter`)
      .join(', ');
  }

  private mapArrivalSummaryRow(row: any): ArrivalDetailsRow {
    const tankerDetailsRaw =
      row?.tanker_details ??
      row?.tankerDetails ??
      row?.details ??
      [];

    let tankerDetailsList: any[] = [];
    if (Array.isArray(tankerDetailsRaw)) {
      tankerDetailsList = tankerDetailsRaw;
    } else if (typeof tankerDetailsRaw === 'string') {
      try {
        const parsed = JSON.parse(tankerDetailsRaw);
        tankerDetailsList = Array.isArray(parsed) ? parsed : [];
      } catch {
        tankerDetailsList = [];
      }
    }

    const tankerDetails: TankerArrivalEntry[] = tankerDetailsList.map((item: any) => ({
      tanker_no: String(item?.tanker_no ?? item?.tankerNo ?? ''),
      bulk_liter: Number(item?.bulk_liter ?? item?.bulkLiter ?? 0) || 0
    }));

    return {
      id: Number(row?.id ?? 0) || 0,
      requisitionId: Number(row?.requisition_id ?? row?.requisitionId ?? row?.requisition ?? 0) || 0,
      referenceNo: String(
        row?.reference_no ??
        row?.referenceNo ??
        row?.our_ref_no ??
        row?.ourRefNo ??
        ''
      ),
      licenseeId: String(row?.licensee_id ?? row?.licenseeId ?? ''),
      tankerCount: Number(row?.tanker_count ?? row?.tankerCount ?? tankerDetails.length ?? 0) || 0,
      tankerDetails,
      totalBulkLiter: Number(
        row?.total_bulk_liter ??
        row?.totalBulkLiter ??
        row?.total_bl ??
        row?.totalbl ??
        0
      ) || 0,
      arrivalDate: String(
        row?.arrival_date ??
        row?.arrivalDate ??
        row?.updated_at ??
        row?.updatedAt ??
        row?.created_at ??
        row?.createdAt ??
        ''
      ),
      requestedTotalQuantity: Number(
        row?.requisition_total_quantity ??
        row?.requisitionTotalQuantity ??
        row?.requested_total_quantity ??
        row?.requestedTotalQuantity ??
        row?.requisition?.totalbl ??
        0
      ) || 0,
      distilleryName: String(
        row?.distillery_name ??
        row?.distilleryName ??
        row?.requisition?.lifted_from_distillery_name ??
        ''
      )
    };
  }

  openArrivalModal(item: TableData): void {
    if (!item.id) {
      alert('Unable to update arrival: requisition id is missing.');
      return;
    }

    this.selectedArrivalRequisition = item;
    this.arrivalErrorMessage = '';
    this.arrivalTankerCount = 1;
    this.arrivalEntries = [{ tanker_no: '', bulk_liter: null }];
    this.isArrivalModalOpen = true;

    this.enaRequisitionService.getRequisitionArrivalDetails(item.id).subscribe({
      next: (response: any) => {
        const data = response?.data;
        if (!data) {
          return;
        }

        const entries = Array.isArray(data.tanker_details) ? data.tanker_details : [];
        const tankerCount = Number(data.tanker_count || entries.length || 1);

        this.arrivalTankerCount = tankerCount > 0 ? tankerCount : 1;
        this.arrivalEntries = entries.length
          ? entries.map((row: any) => ({
              tanker_no: String(row?.tanker_no || ''),
              bulk_liter: Number(row?.bulk_liter || 0) || null
            }))
          : [{ tanker_no: '', bulk_liter: null }];

        this.syncArrivalEntriesLength();
      },
      error: (error: any) => {
        const status = Number(error?.status || 0);
        if (status === 404) {
          // No previous data saved yet; keep empty form.
          return;
        }
        if (status === 403) {
          this.arrivalErrorMessage = 'You are not allowed to view existing arrival details for this requisition.';
          return;
        }
        // For transient/server setup issues, keep popup usable without showing a blocking warning.
        console.warn('Arrival details preload failed', { status, error });
      }
    });
  }

  closeArrivalModal(): void {
    this.isArrivalModalOpen = false;
    this.isArrivalSaving = false;
    this.selectedArrivalRequisition = null;
    this.arrivalErrorMessage = '';
    this.arrivalTankerCount = 1;
    this.arrivalEntries = [];
  }

  openArrivalViewModal(item: TableData): void {
    if (!item.id) {
      alert('Unable to view arrival details: requisition id is missing.');
      return;
    }
    this.selectedArrivalRequisition = item;
    this.arrivalViewErrorMessage = '';
    this.arrivalViewTankerCount = 0;
    this.arrivalViewTotalBulkLiter = 0;
    this.arrivalViewEntries = [];
    this.isArrivalViewModalOpen = true;

    this.enaRequisitionService.getRequisitionArrivalDetails(item.id).subscribe({
      next: (response: any) => {
        const raw = response?.data ?? response;
        const data = raw?.data ?? raw;
        if (!data) {
          this.arrivalViewErrorMessage = 'No arrival details found for this requisition.';
          return;
        }

        const entriesRaw = data?.tanker_details ?? data?.tankerDetails ?? [];
        let entries: any[] = [];
        if (Array.isArray(entriesRaw)) {
          entries = entriesRaw;
        } else if (typeof entriesRaw === 'string') {
          try {
            const parsed = JSON.parse(entriesRaw);
            entries = Array.isArray(parsed) ? parsed : [];
          } catch {
            entries = [];
          }
        }

        this.arrivalViewEntries = entries.map((row: any) => ({
          tanker_no: String(row?.tanker_no ?? row?.tankerNo ?? ''),
          bulk_liter: Number(row?.bulk_liter ?? row?.bulkLiter ?? 0) || 0
        }));
        this.arrivalViewTankerCount = Number(data?.tanker_count ?? data?.tankerCount ?? this.arrivalViewEntries.length ?? 0) || 0;
        this.arrivalViewTotalBulkLiter = Number(data?.total_bulk_liter ?? data?.totalBulkLiter ?? data?.totalbl ?? 0) || 0;
      },
      error: () => {
        this.arrivalViewErrorMessage = 'Unable to load BL details.';
      }
    });
  }

  closeArrivalViewModal(): void {
    this.isArrivalViewModalOpen = false;
    this.arrivalViewErrorMessage = '';
    this.arrivalViewTankerCount = 0;
    this.arrivalViewTotalBulkLiter = 0;
    this.arrivalViewEntries = [];
    this.selectedArrivalRequisition = null;
  }

  onArrivalTankerCountChange(): void {
    if (!Number.isFinite(this.arrivalTankerCount)) {
      this.arrivalTankerCount = 1;
    }
    this.arrivalTankerCount = Math.max(1, Math.floor(this.arrivalTankerCount));
    this.syncArrivalEntriesLength();
  }

  private syncArrivalEntriesLength(): void {
    while (this.arrivalEntries.length < this.arrivalTankerCount) {
      this.arrivalEntries.push({ tanker_no: '', bulk_liter: null });
    }
    while (this.arrivalEntries.length > this.arrivalTankerCount) {
      this.arrivalEntries.pop();
    }
  }

  getArrivalTotalBulkLiter(): number {
    return this.arrivalEntries.reduce((sum, row) => {
      const liters = Number(row.bulk_liter || 0);
      return sum + (Number.isFinite(liters) ? liters : 0);
    }, 0);
  }

  getArrivalAllowedBulkLiter(): number {
    return Number(this.selectedArrivalRequisition?.requestedTotalQuantity || 0);
  }

  private hasValidArrivalRows(): boolean {
    if (this.arrivalTankerCount <= 0 || this.arrivalEntries.length !== this.arrivalTankerCount) {
      return false;
    }
    return this.arrivalEntries.every((row) => {
      const tankerNo = String(row.tanker_no || '').trim();
      const liters = Number(row.bulk_liter || 0);
      return Boolean(tankerNo) && Number.isFinite(liters) && liters > 0;
    });
  }

  isArrivalTotalMatchingRequested(): boolean {
    const allowed = this.getArrivalAllowedBulkLiter();
    if (allowed <= 0) {
      return false;
    }
    const entered = this.getArrivalTotalBulkLiter();
    return Math.abs(entered - allowed) < 0.0001;
  }

  canSaveArrivalDetails(): boolean {
    if (this.isArrivalSaving) {
      return false;
    }
    if (!this.selectedArrivalRequisition?.id) {
      return false;
    }
    return this.hasValidArrivalRows() && this.isArrivalTotalMatchingRequested();
  }

  saveArrivalDetails(): void {
    if (!this.selectedArrivalRequisition?.id) {
      this.arrivalErrorMessage = 'Unable to save arrival details: requisition id is missing.';
      return;
    }

    if (this.arrivalTankerCount <= 0) {
      this.arrivalErrorMessage = 'Tanker count must be greater than 0.';
      return;
    }

    const normalizedRows = this.arrivalEntries.map((row, index) => ({
      tanker_no: String(row.tanker_no || '').trim(),
      bulk_liter: Number(row.bulk_liter || 0),
      row: index + 1
    }));

    const invalidRow = normalizedRows.find((row) => !row.tanker_no || !Number.isFinite(row.bulk_liter) || row.bulk_liter <= 0);
    if (invalidRow) {
      this.arrivalErrorMessage = `Please enter valid tanker number and bulk liter for tanker ${invalidRow.row}.`;
      return;
    }

    const enteredTotalBulkLiter = normalizedRows.reduce((sum, row) => sum + row.bulk_liter, 0);
    const allowedBulkLiter = this.getArrivalAllowedBulkLiter();
    if (allowedBulkLiter > 0 && enteredTotalBulkLiter > allowedBulkLiter) {
      this.arrivalErrorMessage =
        `Entered total bulk liter (${enteredTotalBulkLiter.toFixed(2)}) cannot exceed requested total quantity (${allowedBulkLiter.toFixed(2)}).`;
      return;
    }
    if (allowedBulkLiter > 0 && Math.abs(enteredTotalBulkLiter - allowedBulkLiter) >= 0.0001) {
      this.arrivalErrorMessage =
        `Entered total bulk liter (${enteredTotalBulkLiter.toFixed(2)}) must exactly match requested total quantity (${allowedBulkLiter.toFixed(2)}).`;
      return;
    }

    const payload = {
      tanker_count: this.arrivalTankerCount,
      tanker_details: normalizedRows.map((row) => ({
        tanker_no: row.tanker_no,
        bulk_liter: row.bulk_liter
      }))
    };

    this.isArrivalSaving = true;
    this.arrivalErrorMessage = '';

    this.enaRequisitionService.saveRequisitionArrivalDetails(this.selectedArrivalRequisition.id, payload).subscribe({
      next: () => {
        this.isArrivalSaving = false;
        const savedReqId = this.selectedArrivalRequisition?.id;
        const enteredTotalBulkLiter = this.getArrivalTotalBulkLiter();
        const enteredTankerCount = this.arrivalTankerCount;
        if (savedReqId) {
          this.requisitionData = this.requisitionData.map((row) =>
            row.id === savedReqId
              ? {
                  ...row,
                  hasArrivalDetails: true,
                  arrivalTankerCount: enteredTankerCount,
                  arrivalTotalBulkLiter: enteredTotalBulkLiter
                }
              : row
          );
          this.filteredRequisitionData = this.filteredRequisitionData.map((row) =>
            row.id === savedReqId
              ? {
                  ...row,
                  hasArrivalDetails: true,
                  arrivalTankerCount: enteredTankerCount,
                  arrivalTotalBulkLiter: enteredTotalBulkLiter
                }
              : row
          );
        }
        alert('Arrival details saved successfully.');
        this.closeArrivalModal();
        this.loadData();
      },
      error: (error: any) => {
        this.isArrivalSaving = false;
        const apiMessage =
          error?.error?.message ||
          error?.error?.tanker_details?.[0] ||
          error?.error?.tanker_details ||
          error?.message;
        this.arrivalErrorMessage = apiMessage || 'Failed to save arrival details.';
      }
    });
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
