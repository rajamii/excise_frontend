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
  detailsPermitsNumber?: string;
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
  arrivalApprovalStatus?: string;
  arrivalReviewRemarks?: string;
  arrivalTotalPermitsCount?: number;
  arrivalApprovedPermitsCount?: number;
  arrivalPendingPermitsCount?: number;
  arrivalRejectedPermitsCount?: number;
  arrivalCancelledPermitsCount?: number;
  arrivalRemainingPermitsCount?: number;
  arrivalApprovedPermitNumbers?: string;
  arrivalCancelledPermitNumbers?: string;
}


interface TankerArrivalEntry {
  permit_no?: string;
  tanker_no: string;
  bulk_liter: number | null;
  approval_status?: string;
  detail_id?: number;
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
  editedByOic: boolean;
  editedAt: string;
  editedBy: string;
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
  private initialSummaryAutoSelected = false;

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
  summaryRequisitionData: TableData[] = [];
  private revalidationApprovedDateByRef: Record<string, string> = {};
  private revalidationActiveByRef: Record<string, boolean> = {};
  public activeRevalidationPermitNumbers = new Set<string>();

  // Filter properties
  requisitionDateFilter: string = '';
  requisitionMonthFilter: string = '';
  requisitionYearFilter: string = '';
  requisitionStatusFilter: string = '';
  requisitionCompanyFilter: string = '';
  requisitionCompanyOptions: string[] = [];
  activeSummaryFilter: string = '';

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
  arrivalPermitNumbers: string[] = [];
  arrivalAllowedBulkLiterByPermit: Record<string, number> = {};
  selectedArrivalPermitNo: string = '';
  arrivalPermitDraftEntries: TankerArrivalEntry[] = [];
  arrivalSavedEntriesByPermit: Record<string, TankerArrivalEntry[]> = {};
  private arrivalPermitRevisionByPermit: Record<string, number> = {};
  private arrivalPermitSavedRevisionByPermit: Record<string, number> = {};
  arrivalServerEntriesByPermit: Record<string, TankerArrivalEntry[]> = {};
  arrivalServerPermitStatusByPermit: Record<string, string> = {};
  isArrivalViewModalOpen: boolean = false;
  arrivalViewErrorMessage: string = '';
  arrivalViewTankerCount: number = 0;
  arrivalViewTotalBulkLiter: number = 0;
  arrivalViewEntries: TankerArrivalEntry[] = [];
  arrivalViewPermitNumbers: string[] = [];
  selectedArrivalViewPermitNo: string = '';
  arrivalViewVisibleEntries: TankerArrivalEntry[] = [];
  arrivalViewApprovalStatus: string = '';
  arrivalViewReviewRemarks: string = '';
  arrivalViewEditedByOic: boolean = false;
  arrivalViewEditedAt: string = '';
  arrivalViewEditedBy: string = '';
  arrivalViewPermitStatusByPermit: Record<string, string> = {};
  arrivalViewCancelledPermits: string[] = [];
  arrivalViewCancelRequestedPermits: string[] = [];
  isArrivalSummaryModalOpen: boolean = false;
  isArrivalSummaryLoading: boolean = false;
  arrivalSummaryErrorMessage: string = '';
  arrivalSummaryDateFilter: string = '';
  arrivalSummaryMonthFilter: string = '';
  allArrivalDetailsRows: ArrivalDetailsRow[] = [];
  filteredArrivalDetailsRows: ArrivalDetailsRow[] = [];
  arrivalSummaryPageSizeOptions: number[] = [5, 10, 25, 50];
  arrivalSummaryPageSize: number = 5;
  arrivalSummaryPageIndex: number = 0;
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
  pageSize: number = 5;
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
        this.revalidationActiveByRef = this.buildRevalidationActiveRefIndex(revalidations || []);

        this.activeRevalidationPermitNumbers.clear();
        (revalidations || []).forEach((row: any) => {
          const status = this.normalizeStageToken(row?.status);
          const stageName = this.normalizeStageToken(row?.current_stage_name || row?.currentStageName);
          const statusCode = this.normalizeStageToken(row?.status_code || row?.statusCode);
          const combined = `${status} ${stageName} ${statusCode}`;
          const isFinished =
            combined.includes('reject') ||
            combined.includes('cancel') ||
            combined.includes('approv') ||
            combined.includes('rv09');

          // Only unapproved/pending revalidations lock permits
          if (!isFinished) {
            const permitsRaw = String(row?.detailsPermitsNumber || row?.details_permits_number || '');
            permitsRaw.split(',').forEach((p) => {
              const token = p.trim();
              if (token) {
                this.activeRevalidationPermitNumbers.add(token);
              }
            });
          }
        });

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
              this.toBooleanFlag(
                item.can_initiate_cancellation ??
                item.canInitiateCancellation ??
                item.canCancel ??
                item.can_cancel,
                undefined
              ) ?? undefined,
            commissionerStatus: item.commissionerStatus || item.commissioner_status,
            forwardedToCommissioner: item.forwardedToCommissioner || item.forwarded_to_commissioner || false,
            canCancel: this.toBooleanFlag(item.canCancel ?? item.can_cancel, undefined) ?? undefined,
            allowedActions: item.allowedActions || item.allowed_actions || [],
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
            // Additional properties that might be needed
            quantity: item.quantity || item.totalQuantity || item.total_quantity,
            numberOfPermits:
              item.numberOfPermits ||
              item.number_of_permits ||
              item.requisiton_number_of_permits ||
              item.requisition_number_of_permits ||
              1,
            detailsPermitsNumber: item.detailsPermitsNumber || item.details_permits_number || '',
            bulkSpiritType: item.bulkSpiritType || item.bulk_spirit_type,
            strengthTo: item.strengthTo || item.strength_to,
            liftedFrom: item.liftedFrom || item.lifted_from,
            viaRoute: item.viaRoute || item.via_route,
            checkpostEntry: item.checkpostEntry || item.checkpost_entry,
            purpose: item.purpose,
            paymentStatus: item.paymentStatus || item.payment_status || '',
            paymentId: item.paymentId || item.payment_id || item.transactionId || item.transaction_id || '',
            paymentDate: item.paymentDate || item.payment_date || '',
            hasActiveRevalidation: this.toBooleanFlag(item.hasActiveRevalidation ?? item.has_active_revalidation, false) ?? false,
            has_active_revalidation: this.toBooleanFlag(item.has_active_revalidation, false) ?? false,
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
            arrivalTotalBulkLiter: Number(item.arrival_total_bulk_liter || item.arrivalTotalBulkLiter || 0) || 0,
            arrivalApprovalStatus: String(item.arrival_approval_status || item.arrivalApprovalStatus || ''),
            arrivalReviewRemarks: String(item.arrival_review_remarks || item.arrivalReviewRemarks || ''),
            arrivalTotalPermitsCount: Number(item.arrival_total_permits_count ?? item.arrivalTotalPermitsCount ?? item.arrival_total_permits ?? 0) || 0,
            arrivalApprovedPermitsCount: Number(item.arrival_approved_permits_count ?? item.arrivalApprovedPermitsCount ?? item.arrival_approved_permits ?? 0) || 0,
            arrivalPendingPermitsCount: Number(item.arrival_pending_permits_count ?? item.arrivalPendingPermitsCount ?? item.arrival_pending_permits ?? 0) || 0,
            arrivalRejectedPermitsCount: Number(item.arrival_rejected_permits_count ?? item.arrivalRejectedPermitsCount ?? item.arrival_rejected_permits ?? 0) || 0,
            arrivalCancelledPermitsCount: Number(item.arrival_cancelled_permits_count ?? item.arrivalCancelledPermitsCount ?? item.arrival_cancelled_permits ?? 0) || 0,
            arrivalRemainingPermitsCount: Number(item.arrival_remaining_permits_count ?? item.arrivalRemainingPermitsCount ?? item.arrival_remaining_permits ?? 0) || 0,
            arrivalApprovedPermitNumbers: String(item.arrival_approved_permit_numbers || item.arrivalApprovedPermitNumbers || ''),
            arrivalCancelledPermitNumbers: String(item.arrival_cancelled_permit_numbers || item.arrivalCancelledPermitNumbers || '')
          };
        });

        console.log('DEBUG: Processed requisition data:', this.requisitionData);
        console.log('DEBUG: Each item allowedActions:');
        this.requisitionData.forEach(item => {
          console.log(`  ID ${item.id}: allowedActions =`, item.allowedActions, `(length: ${item.allowedActions?.length || 0})`);
        });

        this.applyFilters();
        this.maybeAutoSelectPendingSummary();
        this.tryAutoOpenArrivalModal();
        this.tryAutoOpenCancellationModal();
      },
      error: (error) => {
        console.error('Error loading requisitions:', error);
        // Show empty state or error message
        this.requisitionData = [];
        this.summaryRequisitionData = [];
        this.filteredRequisitionData = [];
        this.revalidationApprovedDateByRef = {};
        this.revalidationActiveByRef = {};
        this.activeRevalidationPermitNumbers.clear();
      }
    });
  }

  private maybeAutoSelectPendingSummary(): void {
    if (this.initialSummaryAutoSelected) return;
    this.initialSummaryAutoSelected = true;

    // If user already selected a filter (or came in with one), don't override.
    if (this.requisitionStatusFilter || this.activeSummaryFilter) return;

    const pendingCount = this.getRequisitionStatusCount('PENDING');
    if (pendingCount > 0) {
      this.activeSummaryFilter = 'PENDING';
      this.requisitionStatusFilter = 'PENDING';
      this.applyFilters();
    }
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
    this.summaryRequisitionData = this.requisitionData.filter(item => {
      // Admin visibility: only show records at or past this admin's stage
      if (!this.isVisibleToCurrentAdmin(item)) return false;

      let matches = true;

      const submissionDate =
        this.parseDate(item.submissionDateRaw) ||
        this.parseDate(item.submissionDate);

      if (this.requisitionDateFilter) {
        matches =
          matches &&
          Boolean(submissionDate) &&
          this.toIsoDay(submissionDate as Date) === this.requisitionDateFilter;
      }

      if (this.requisitionMonthFilter) {
        matches =
          matches &&
          Boolean(submissionDate) &&
          this.toIsoMonth(submissionDate as Date) === this.requisitionMonthFilter;
      }

      if (this.requisitionYearFilter) {
        matches =
          matches &&
          Boolean(submissionDate) &&
          String((submissionDate as Date).getFullYear()) === String(this.requisitionYearFilter);
      }

      return matches;
    });

    // Build company options for commissioner filter
    this.requisitionCompanyOptions = Array.from(
      new Set(
        this.summaryRequisitionData
          .map(item => String(item?.establishmentName || item?.distilleryName || '').trim())
          .filter(v => !!v)
      )
    ).sort((a, b) => a.localeCompare(b));

    this.filteredRequisitionData = this.summaryRequisitionData.filter(item => {
      // Company filter — commissioner only
      if (this.requisitionCompanyFilter) {
        const company = String(item?.establishmentName || item?.distilleryName || '').trim();
        if (company !== this.requisitionCompanyFilter) return false;
      }

      if (!this.requisitionStatusFilter) {
        return true;
      }

      const filter = this.normalizeStageToken(this.requisitionStatusFilter);
      if (filter === 'pending' || filter === 'review') {
        return (this.isCommissioner() || this.isPermitSection())
          ? this.isPendingLikeStatus(item)
          : this.isPendingSummaryStatus(item);
      }
      if (filter === 'approved') {
        return this.isApprovedLikeStatus(item);
      }
      if (filter === 'rejected') {
        return this.isRejectedLikeStatus(item);
      }
      if (filter === 'underprocess') {
        return this.isUnderProcessLikeStatus(item);
      }
      if (filter === 'cancellation' || filter === 'cancel' || filter === 'cancelled') {
        return this.isCancellationLikeStatus(item);
      }
      const token = `${this.normalizeStageToken(item.status)} ${this.normalizeStageToken(item.currentStageName)}`;
      return token.includes(filter);
    });

    this.currentPage = 1;
  }

  isCommissioner(): boolean {
    return this.accountService.hasAnyRole('commissioner');
  }

  isPermitSection(): boolean {
    return this.accountService.hasAnyRole(['permit-section', 'permit section', 'permit_section', 'Permit Section']);
  }

  /**
   * Visibility rule for admin users:
   * - Show the record if the admin has actions to take (allowedActions non-empty) — it's their turn.
   * - Show the record if it has already passed through their stage (historical) — they already acted.
   * - Hide the record if it hasn't reached their stage yet.
   * Licensee users always see all their own records.
   */
  isVisibleToCurrentAdmin(item: TableData): boolean {
    // Licensee sees everything (scoped by backend to their own records)
    if (!this.isCommissioner() && !this.isPermitSection()) return true;

    // If the backend says there are actions to take → it's this admin's turn
    if ((item.allowedActions?.length ?? 0) > 0) return true;

    // If the record has already passed through this admin's stage → show for history
    const combined = `${String(item.status ?? '')} ${String(item.currentStageName ?? '')}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (this.isCommissioner() && combined.includes('commissioner')) return true;
    if (this.isPermitSection() && combined.includes('permitsection')) return true;

    // For Permit Section / Commissioner: PENDING status means the application was just submitted by the
    // licensee and is awaiting admin review — this IS their stage (backend returns these via API).
    // Show these records even when the backend hasn't yet populated allowedActions.
    if ((this.isPermitSection() || this.isCommissioner()) && combined.includes('pending')) return true;

    // Record hasn't reached this admin's stage yet → hide it
    return false;
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
    const token = this.normalizeStageToken(item.status);
    return token.includes('forward') && token.includes('commissioner');
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
    // 2. After commissioner approves (final stage) → Show BOTH "View Payment Slip" AND "View Permit Slip" for commissioner/permit section
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
    
    // Show "View Permit Slip" for commissioner and permit section after final approval
    if (isFinalApproved && (this.isCommissioner() || this.isPermitSection())) {
      actions.push('VIEW_SLIP');
    }
    
    console.log('🔍 Final actions array:', actions);
    return actions;
  }

  canCancelRequisition(item: TableData): boolean {
    const allowed = (item.allowedActions || []).map(a => String(a || '').toUpperCase());
    if (allowed.includes('REQUEST_CANCELLATION')) {
      return true;
    }
    const allowedConfigs = (item.allowedActionConfigs || []).map((c: any) => String(c?.action || '').toUpperCase());
    if (allowedConfigs.includes('REQUEST_CANCELLATION')) {
      return true;
    }
    const backendFlag = item.canInitiateCancellation;
    if (backendFlag === true) {
      return true;
    }
    if (backendFlag === false) {
      return false;
    }
    const status = (item.status || '').toLowerCase().replace(/\s+/g, '');
    // Fallback: show cancel for approved requisitions when backend flags are missing.
    if (status.includes('approved') && !status.includes('cancel')) {
      const hasRevalidationOnSameRef = this.hasActiveRevalidationOnSameRef(item);
      if (!hasRevalidationOnSameRef) {
        return true;
      }
    }

    const isFinalApproved = this.isCommissionerFinalApproval(item);

    if (!isFinalApproved) {
      console.log('canCancelRequisition: Not in final approved stage');
      return false;
    }

    const isCancelled = status.includes('cancel') || status.includes('cancelled');
    if (isCancelled) {
      console.log('canCancelRequisition: Already cancelled or in progress');
      return false;
    }

    const hasRevalidationOnSameRef = this.hasActiveRevalidationOnSameRef(item);
    if (hasRevalidationOnSameRef) {
      console.log('canCancelRequisition: Revalidation already placed for same requisition ref');
      return false;
    }

    console.log('canCancelRequisition: Cancellation allowed (final approved stage)');
    return true;
  }

  shouldShowCancelPermit(item: TableData): boolean {
    // Commissioner dashboard should not expose cancellation initiation.
    if (this.isCommissioner() || this.isPermitSection()) {
      return false;
    }

    // For licensee users, hide cancellation initiation after commissioner approval stage.
    const statusToken = this.normalizeStageToken(item.status);
    const stageToken = this.normalizeStageToken(item.currentStageName);
    const isApprovedCommissioner =
      (statusToken.includes('approved') && statusToken.includes('commissioner')) ||
      (stageToken.includes('approved') && stageToken.includes('commissioner'));
    if (isApprovedCommissioner) {
      return false;
    }

    if (this.canCancelRequisition(item)) {
      return true;
    }
    const status = (item.status || '').toLowerCase();
    if (status.includes('approved') && !status.includes('cancel')) {
      return true;
    }
    return false;
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
    const status = this.normalizeStageToken(item.status);
    const stageName = this.normalizeStageToken(item.currentStageName);
    
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
    const isApprovedStatus = (
      (status.includes('approv') || status.includes('issued') || status.includes('complete')) ||
      (stageName.includes('approv') || stageName.includes('issued') || stageName.includes('complete'))
    ) && !status.includes('reject') && !stageName.includes('reject');
    
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

    const status = String(item?.arrivalApprovalStatus || '').toUpperCase();
    const remaining = Number(item?.arrivalRemainingPermitsCount ?? 0) || 0;
    const rejectedPermits = Number(item?.arrivalRejectedPermitsCount ?? 0) || 0;
    const totalPermits = Number(item?.arrivalTotalPermitsCount ?? 0) || 0;
    const approvedPermits = Number(item?.arrivalApprovedPermitsCount ?? 0) || 0;
    const cancelledPermits = Number(item?.arrivalCancelledPermitsCount ?? 0) || 0;

    if (!this.isCommissionerFinalApproval(item)) {
      return false;
    }

    // If everything is already resolved, do not show update.
    if (status === 'APPROVED' && remaining <= 0 && rejectedPermits <= 0) {
      return false;
    }
    if (totalPermits > 0 && (approvedPermits + cancelledPermits) >= totalPermits && remaining <= 0 && rejectedPermits <= 0) {
      return false;
    }

    // Permit-wise partial arrival: allow updating while there are permits remaining to be submitted (or rejected permits to re-submit).
    if (remaining > 0 || rejectedPermits > 0) {
      return true;
    }

    // If we have permit counts and nothing left, hide update.
    if (totalPermits > 0) {
      return false;
    }

    // Backward compatible: if we don't have permit counts, fall back to previous behavior.
    const allowResubmitAfterReject = status === 'REJECTED';
    return !Boolean(item.hasArrivalDetails) || allowResubmitAfterReject;
  }

  canViewArrivalDetails(item: TableData): boolean {
    if (this.isCommissioner() || this.isPermitSection()) {
      return false;
    }

    const status = String(item?.arrivalApprovalStatus || '').toUpperCase();
    const approvedPermits = Number(item?.arrivalApprovedPermitsCount ?? 0) || 0;
    const pendingPermits = Number(item?.arrivalPendingPermitsCount ?? 0) || 0;
    const cancelledPermits = Number(item?.arrivalCancelledPermitsCount ?? 0) || 0;
    const total = Number(item?.arrivalTotalBulkLiter ?? 0);
    const hasAnySubmitted =
      approvedPermits > 0 ||
      pendingPermits > 0 ||
      cancelledPermits > 0 ||
      (Number.isFinite(total) ? total > 0 : Boolean(item.hasArrivalDetails));

    if (status === 'REJECTED' && !cancelledPermits) {
      // After OIC rejection, tanker data is cleared and licensee must re-enter; keep inventory hidden unless
      // there are cancelled permits to show in the "BL Details" modal.
      return false;
    }

    return this.isCommissionerFinalApproval(item) && hasAnySubmitted;
  }

  isArrivalRejected(item: TableData): boolean {
    return String(item?.arrivalApprovalStatus || '').toUpperCase() === 'REJECTED';
  }

  shouldShowArrivalRejectedBadge(item: TableData): boolean {
    if (!this.isArrivalRejected(item)) {
      return false;
    }

    const totalPermits = Number(item?.arrivalTotalPermitsCount ?? 0) || 0;
    const remaining = Number(item?.arrivalRemainingPermitsCount ?? 0) || 0;
    const rejectedPermits = Number(item?.arrivalRejectedPermitsCount ?? 0) || 0;

    // Only show this banner when the licensee actually needs to re-enter data.
    // In permit-wise mode that means there are rejected/remaining permits; in legacy mode we rely on status alone.
    if (totalPermits > 0 && remaining <= 0 && rejectedPermits <= 0) {
      return false;
    }

    return this.canUpdateArrival(item);
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
    // Default to current running month; user can clear filters to view all months together.
    this.arrivalSummaryMonthFilter = this.toIsoMonth(new Date());
    this.allArrivalDetailsRows = [];
    this.filteredArrivalDetailsRows = [];
    this.arrivalSummaryPageIndex = 0;
    this.arrivalSummaryPageSize = 5;

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
    this.arrivalSummaryPageIndex = 0;
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

    // Reset pagination whenever filters change.
    this.arrivalSummaryPageIndex = 0;
  }

  get arrivalSummaryTotalPages(): number {
    if (this.filteredArrivalDetailsRows.length === 0) return 0;
    const size = Number(this.arrivalSummaryPageSize || 10) || 10;
    return Math.ceil(this.filteredArrivalDetailsRows.length / size);
  }

  get arrivalSummaryPageStart(): number {
    if (this.filteredArrivalDetailsRows.length === 0) return 0;
    const size = Number(this.arrivalSummaryPageSize || 10) || 10;
    return this.arrivalSummaryPageIndex * size + 1;
  }

  get arrivalSummaryPageEnd(): number {
    if (this.filteredArrivalDetailsRows.length === 0) return 0;
    const size = Number(this.arrivalSummaryPageSize || 10) || 10;
    return Math.min((this.arrivalSummaryPageIndex + 1) * size, this.filteredArrivalDetailsRows.length);
  }

  get pagedArrivalDetailsRows(): ArrivalDetailsRow[] {
    if (this.filteredArrivalDetailsRows.length === 0) return [];
    const size = Number(this.arrivalSummaryPageSize || 10) || 10;
    const start = this.arrivalSummaryPageIndex * size;
    return this.filteredArrivalDetailsRows.slice(start, start + size);
  }

  onArrivalSummaryPageSizeChange(): void {
    this.arrivalSummaryPageIndex = 0;
  }

  prevArrivalSummaryPage(): void {
    if (this.arrivalSummaryPageIndex <= 0) return;
    this.arrivalSummaryPageIndex -= 1;
  }

  nextArrivalSummaryPage(): void {
    const total = this.arrivalSummaryTotalPages;
    if (total === 0) return;
    if (this.arrivalSummaryPageIndex >= total - 1) return;
    this.arrivalSummaryPageIndex += 1;
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
      .map((r) => `${String(r?.tanker_no || '').trim()}: ${Number(r?.bulk_liter || 0).toFixed(2)} BL`)
      .join(', ');
  }

  getTankerDetailsDisplayLines(rows: TankerArrivalEntry[], itemsPerLine: number = 2): string[] {
    if (!Array.isArray(rows) || rows.length === 0) {
      return ['-'];
    }

    const formattedRows = rows.map((row) =>
      `${String(row?.tanker_no || '').trim()}: ${Number(row?.bulk_liter || 0).toFixed(2)} BL`
    );

    const lines: string[] = [];
    for (let index = 0; index < formattedRows.length; index += itemsPerLine) {
      lines.push(formattedRows.slice(index, index + itemsPerLine).join(', '));
    }

    return lines;
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
      permit_no: String(item?.permit_no ?? item?.permitNo ?? '').trim() || undefined,
      tanker_no: String(item?.tanker_no ?? item?.tankerNo ?? ''),
      bulk_liter: Number(item?.bulk_liter ?? item?.bulkLiter ?? 0) || 0
    }));

    const requisitionTotalQty = Number(
      row?.requisition_total_quantity ??
      row?.requisitionTotalQuantity ??
      row?.requested_total_quantity ??
      row?.requestedTotalQuantity ??
      row?.requisition?.totalbl ??
      0
    ) || 0;
    const requisitionPermitCount = Number(
      row?.requisition_number_of_permits ??
      row?.requisitionNumberOfPermits ??
      row?.requisition?.requisiton_number_of_permits ??
      row?.requisition?.requisition_number_of_permits ??
      0
    ) || 0;
    const permitsInThisEntry = Array.from(
      new Set(
        tankerDetails
          .map((t) => String(t?.permit_no || '').trim())
          .filter((t) => Boolean(t))
      )
    );
    const perPermitQty = requisitionPermitCount > 0 ? (requisitionTotalQty / requisitionPermitCount) : requisitionTotalQty;
    const requestedQtyForEntry = permitsInThisEntry.length > 0 ? (perPermitQty * permitsInThisEntry.length) : requisitionTotalQty;

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
      // Show requested qty for the permit(s) in this arrival entry, not the whole requisition reference.
      requestedTotalQuantity: requestedQtyForEntry,
      distilleryName: String(
        row?.distillery_name ??
        row?.distilleryName ??
        row?.requisition?.lifted_from_distillery_name ??
        ''
      ),
      editedByOic: Boolean(row?.edited_by_oic ?? row?.editedByOic ?? false),
      editedAt: String(row?.edited_at ?? row?.editedAt ?? ''),
      editedBy: String(row?.edited_by ?? row?.editedBy ?? '')
    };
  }

  openArrivalModal(item: TableData): void {
    if (!item.id) {
      alert('Unable to update arrival: requisition id is missing.');
      return;
    }

    this.selectedArrivalRequisition = item;
    this.arrivalErrorMessage = '';
    this.arrivalPermitNumbers = this.resolveArrivalPermitNumbers(item);
    this.rebuildArrivalPermitAllocation();
    this.selectedArrivalPermitNo = this.arrivalPermitNumbers[0] || '';
    this.arrivalSavedEntriesByPermit = {};
    this.arrivalPermitRevisionByPermit = {};
    this.arrivalPermitSavedRevisionByPermit = {};
    this.arrivalServerEntriesByPermit = {};
    this.arrivalServerPermitStatusByPermit = {};
    this.arrivalPermitDraftEntries = this.buildDefaultArrivalPermitDraftEntries();
    this.arrivalTankerCount = this.arrivalPermitNumbers.length > 0 ? 0 : 1;
    this.arrivalEntries = this.arrivalPermitNumbers.length > 0 ? [] : [{ tanker_no: '', bulk_liter: null }];
    this.isArrivalModalOpen = true;

    // Load all existing submissions to lock already-submitted permits and show preview.
    this.enaRequisitionService.getRequisitionArrivalDetails(item.id, 'ALL').subscribe({
      next: (response: any) => {
        const data = response?.data;
        if (!data) {
          return;
        }

        const entries = Array.isArray(data.tanker_details) ? data.tanker_details : [];
        const normalizedExisting: TankerArrivalEntry[] = entries
          .map((row: any) => ({
            permit_no: String(row?.permit_no ?? row?.permitNo ?? '').trim() || undefined,
            tanker_no: String(row?.tanker_no ?? row?.tankerNo ?? '').trim(),
            bulk_liter: (() => {
              const n = Number(row?.bulk_liter ?? row?.bulkLiter ?? 0);
              return Number.isFinite(n) && n > 0 ? n : null;
            })()
          }))
          .filter((x: TankerArrivalEntry) => x.permit_no || x.tanker_no || (x.bulk_liter ?? 0) > 0);

        if (this.arrivalPermitNumbers.length > 0) {
          const statuses = data?.permit_statuses ?? data?.permitStatuses ?? {};
          if (statuses && typeof statuses === 'object') {
            Object.keys(statuses).forEach((permitNo) => {
              const token = String(permitNo || '').trim();
              if (!token) return;
              this.arrivalServerPermitStatusByPermit[token] = String((statuses as any)[permitNo] || '').toUpperCase();
            });
          }

          const grouped: Record<string, TankerArrivalEntry[]> = {};
          for (const row of normalizedExisting) {
            const permitNo = String(row?.permit_no || '').trim();
            if (!permitNo) continue;
            if (!grouped[permitNo]) grouped[permitNo] = [];
            grouped[permitNo].push({ permit_no: permitNo, tanker_no: row.tanker_no, bulk_liter: row.bulk_liter });
          }
          this.arrivalServerEntriesByPermit = grouped;

          this.selectedArrivalPermitNo = this.arrivalPermitNumbers[0] || '';
          this.onArrivalPermitChange();
          this.recalculateArrivalDerivedCounts();
        } else {
          const tankerCount = Number(data.tanker_count || normalizedExisting.length || 1);
          this.arrivalTankerCount = tankerCount > 0 ? tankerCount : 1;
          this.arrivalEntries = normalizedExisting.length
            ? normalizedExisting.map((row) => ({ tanker_no: row.tanker_no, bulk_liter: row.bulk_liter }))
            : [{ tanker_no: '', bulk_liter: null }];
          this.syncArrivalEntriesLength();
        }
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
    this.arrivalPermitNumbers = [];
    this.arrivalAllowedBulkLiterByPermit = {};
    this.selectedArrivalPermitNo = '';
    this.arrivalPermitDraftEntries = [];
    this.arrivalSavedEntriesByPermit = {};
    this.arrivalPermitRevisionByPermit = {};
    this.arrivalPermitSavedRevisionByPermit = {};
    this.arrivalServerEntriesByPermit = {};
    this.arrivalServerPermitStatusByPermit = {};
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
    this.arrivalViewPermitNumbers = [];
    this.selectedArrivalViewPermitNo = '';
    this.arrivalViewVisibleEntries = [];
    this.arrivalViewApprovalStatus = '';
    this.arrivalViewReviewRemarks = '';
    this.arrivalViewEditedByOic = false;
    this.arrivalViewEditedAt = '';
    this.arrivalViewEditedBy = '';
    this.arrivalViewPermitStatusByPermit = {};
    this.arrivalViewCancelledPermits = [];
    this.arrivalViewCancelRequestedPermits = [];
    this.isArrivalViewModalOpen = true;

    this.enaRequisitionService.getRequisitionArrivalDetails(item.id, 'ALL').subscribe({
      next: (response: any) => {
        const raw = response?.data ?? response;
        const data = raw?.data ?? raw;
        if (!data) {
          this.arrivalViewErrorMessage = 'No arrival details found for this requisition.';
          return;
        }

        // Use requisition permits list so we can show cancelled permits even without tanker rows.
        this.arrivalViewPermitNumbers = this.resolveArrivalPermitNumbers(item);
        this.arrivalViewPermitNumbers.sort((a, b) => {
          const an = Number(a);
          const bn = Number(b);
          const aNum = Number.isFinite(an) && String(an) === a;
          const bNum = Number.isFinite(bn) && String(bn) === b;
          if (aNum && bNum) return an - bn;
          return a.localeCompare(b);
        });

        const statuses = data?.permit_statuses ?? data?.permitStatuses ?? {};
        if (statuses && typeof statuses === 'object') {
          Object.keys(statuses).forEach((permitNo) => {
            const token = String(permitNo || '').trim();
            if (!token) return;
            this.arrivalViewPermitStatusByPermit[token] = String((statuses as any)[permitNo] || '').toUpperCase();
          });
        }

        if ((!this.arrivalViewPermitNumbers || this.arrivalViewPermitNumbers.length === 0) && statuses && typeof statuses === 'object') {
          this.arrivalViewPermitNumbers = Object.keys(statuses)
            .map((p) => String(p || '').trim())
            .filter(Boolean);
          this.arrivalViewPermitNumbers.sort((a, b) => {
            const an = Number(a);
            const bn = Number(b);
            const aNum = Number.isFinite(an) && String(an) === a;
            const bNum = Number.isFinite(bn) && String(bn) === b;
            if (aNum && bNum) return an - bn;
            return a.localeCompare(b);
          });
        }

        this.arrivalViewCancelledPermits = (this.arrivalViewPermitNumbers || []).filter(
          (p) => this.getArrivalViewPermitServerStatus(p) === 'CANCELLED'
        );
        this.arrivalViewCancelRequestedPermits = (this.arrivalViewPermitNumbers || []).filter(
          (p) => this.getArrivalViewPermitServerStatus(p) === 'CANCEL_REQUESTED'
        );

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

        this.arrivalViewEntries = entries
          .map((row: any) => ({
            permit_no: String(row?.permit_no ?? row?.permitNo ?? '').trim() || undefined,
            tanker_no: String(row?.tanker_no ?? row?.tankerNo ?? ''),
            bulk_liter: Number(row?.bulk_liter ?? row?.bulkLiter ?? 0) || 0,
            approval_status: String(row?.approval_status ?? row?.approvalStatus ?? '').toUpperCase()
          }))
          .filter((row: any) => String(row?.approval_status || '').toUpperCase() !== 'REJECTED');
        this.arrivalViewTankerCount = this.arrivalViewEntries.length;
        this.arrivalViewTotalBulkLiter = this.arrivalViewEntries.reduce((sum: number, row: any) => {
          const liters = Number(row?.bulk_liter ?? 0);
          return sum + (Number.isFinite(liters) ? liters : 0);
        }, 0);
        this.arrivalViewApprovalStatus = String(data?.approval_status ?? data?.approvalStatus ?? '');
        this.arrivalViewReviewRemarks = String(data?.review_remarks ?? data?.reviewRemarks ?? '');
        this.arrivalViewEditedByOic = Boolean(data?.edited_by_oic ?? data?.editedByOic ?? false);
        this.arrivalViewEditedAt = String(data?.edited_at ?? data?.editedAt ?? '');
        this.arrivalViewEditedBy = String(data?.edited_by ?? data?.editedBy ?? '');

        // Default to "All permits".
        this.selectedArrivalViewPermitNo = '';
        this.onArrivalViewPermitChange();
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
    this.arrivalViewPermitNumbers = [];
    this.selectedArrivalViewPermitNo = '';
    this.arrivalViewVisibleEntries = [];
    this.arrivalViewApprovalStatus = '';
    this.arrivalViewReviewRemarks = '';
    this.arrivalViewEditedByOic = false;
    this.arrivalViewEditedAt = '';
    this.arrivalViewEditedBy = '';
    this.arrivalViewPermitStatusByPermit = {};
    this.arrivalViewCancelledPermits = [];
    this.arrivalViewCancelRequestedPermits = [];
    this.selectedArrivalRequisition = null;
  }

  onArrivalViewPermitChange(): void {
    const token = String(this.selectedArrivalViewPermitNo || '').trim();
    if (!token) {
      this.arrivalViewVisibleEntries = this.arrivalViewEntries;
      return;
    }
    this.arrivalViewVisibleEntries = (this.arrivalViewEntries || []).filter(
      (row: any) => String(row?.permit_no || '').trim() === token
    );
  }

  getArrivalViewPermitServerStatus(permitNo: string): string {
    const token = String(permitNo || '').trim();
    return String(this.arrivalViewPermitStatusByPermit[token] || '').toUpperCase();
  }

  getArrivalViewPermitLabelSuffix(permitNo: string): string {
    const status = this.getArrivalViewPermitServerStatus(permitNo);
    const isRevalidated = this.activeRevalidationPermitNumbers.has(permitNo);
    
    if (status === 'APPROVED') return isRevalidated ? ' (approved, revalidated)' : ' (approved)';
    if (status === 'PENDING') return isRevalidated ? ' (submitted, revalidated)' : ' (submitted)';
    if (status === 'CANCEL_REQUESTED') return ' (cancelled - pending)';
    if (status === 'CANCELLED') return ' (cancelled)';
    if (status === 'REJECTED') return ' (rejected)';
    
    // If no arrival status but is revalidated, show revalidated only
    if (isRevalidated) return ' (revalidated)';
    
    return '';
  }

  isArrivalViewSelectedPermitCancelled(): boolean {
    const token = String(this.selectedArrivalViewPermitNo || '').trim();
    if (!token) return false;
    const status = this.getArrivalViewPermitServerStatus(token);
    return status === 'CANCELLED' || status === 'CANCEL_REQUESTED';
  }

  getArrivalViewSelectedPermitCancelMessage(): string {
    const token = String(this.selectedArrivalViewPermitNo || '').trim();
    if (!token) return '';
    const status = this.getArrivalViewPermitServerStatus(token);
    if (status === 'CANCELLED') return `Permit ${token} has been cancelled.`;
    if (status === 'CANCEL_REQUESTED') return `Permit ${token} cancellation is submitted and pending approval.`;
    return '';
  }

  onArrivalTankerCountChange(): void {
    if (this.arrivalPermitNumbers.length > 0) {
      // Permit-wise mode: tanker count is derived from saved tankers.
      this.recalculateArrivalDerivedCounts();
      return;
    }
    if (!Number.isFinite(this.arrivalTankerCount)) {
      this.arrivalTankerCount = 1;
    }
    this.arrivalTankerCount = Math.max(1, Math.floor(this.arrivalTankerCount));
    this.syncArrivalEntriesLength();
  }

  private syncArrivalEntriesLength(): void {
    while (this.arrivalEntries.length < this.arrivalTankerCount) {
      this.arrivalEntries.push({ tanker_no: '', bulk_liter: null, permit_no: undefined });
    }
    while (this.arrivalEntries.length > this.arrivalTankerCount) {
      this.arrivalEntries.pop();
    }
  }

  getArrivalTotalBulkLiter(): number {
    if (this.arrivalPermitNumbers.length > 0) {
      return Object.values(this.arrivalSavedEntriesByPermit).reduce((sum, rows) => {
        return (
          sum +
          (rows || []).reduce((innerSum, row) => {
            const liters = Number(row?.bulk_liter ?? 0);
            return innerSum + (Number.isFinite(liters) ? liters : 0);
          }, 0)
        );
      }, 0);
    }

    return this.arrivalEntries.reduce((sum, row) => {
      const liters = Number(row.bulk_liter || 0);
      return sum + (Number.isFinite(liters) ? liters : 0);
    }, 0);
  }

  getArrivalAllowedBulkLiter(): number {
    return Number(this.selectedArrivalRequisition?.requestedTotalQuantity || 0);
  }

  private resolveArrivalPermitNumbers(item: TableData | null): string[] {
    const raw = String(item?.detailsPermitsNumber || '').trim();
    const tokens = raw
      .split(',')
      .map((x) => String(x || '').trim())
      .filter(Boolean);
    if (tokens.length > 0) {
      return tokens;
    }
    const count = Math.max(0, Math.floor(Number(item?.numberOfPermits || 0) || 0));
    if (count <= 0) {
      return [];
    }
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }

  private rebuildArrivalPermitAllocation(): void {
    const permits = this.arrivalPermitNumbers;
    const total = Number(this.getArrivalAllowedBulkLiter() || 0);
    const count = permits.length;
    this.arrivalAllowedBulkLiterByPermit = {};
    if (!Number.isFinite(total) || total <= 0 || count <= 0) {
      return;
    }

    const factor = 100;
    const base = Math.floor((total / count) * factor) / factor;
    let running = 0;
    for (let i = 0; i < count; i++) {
      const permitNo = permits[i];
      const expected =
        i === count - 1 ? Math.round((total - running) * factor) / factor : base;
      running += expected;
      this.arrivalAllowedBulkLiterByPermit[permitNo] = expected;
    }
  }

  getArrivalExpectedBulkLiterForPermit(permitNo: string | null | undefined): number | null {
    const token = String(permitNo || '').trim();
    if (!token) return null;
    const expected = Number(this.arrivalAllowedBulkLiterByPermit[token]);
    return Number.isFinite(expected) && expected > 0 ? expected : null;
  }

  isArrivalPermitTaken(permitNo: string, rowIndex: number): boolean {
    const token = String(permitNo || '').trim();
    if (!token) return false;
    return this.arrivalEntries.some((row, idx) => idx !== rowIndex && String(row?.permit_no || '').trim() === token);
  }

  private hasValidArrivalRows(): boolean {
    if (this.arrivalPermitNumbers.length > 0) {
      // Permit-wise mode validity: at least one permit saved (draft must be saved via "Save Permit").
      return this.getArrivalSubmissionPermitCount() > 0;
    }

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
    if (this.arrivalPermitNumbers.length > 0) {
      // Partial submissions allowed in permit-wise mode.
      return this.getArrivalSubmissionPermitCount() > 0;
    }
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
    if (this.arrivalPermitNumbers.length > 0) {
      return this.getArrivalSubmissionPermitCount() > 0;
    }
    return this.hasValidArrivalRows() && this.isArrivalTotalMatchingRequested();
  }

  saveArrivalDetails(): void {
    if (!this.selectedArrivalRequisition?.id) {
      this.arrivalErrorMessage = 'Unable to save arrival details: requisition id is missing.';
      return;
    }

    if (this.arrivalTankerCount <= 0) {
      this.arrivalErrorMessage = 'Count must be greater than 0.';
      return;
    }

    const normalizedRows = this.normalizeArrivalRowsForSave();
    if (!normalizedRows.ok) {
      this.arrivalErrorMessage = normalizedRows.message;
      return;
    }

    const enteredTotalBulkLiter = normalizedRows.rows.reduce((sum, row) => sum + row.bulk_liter, 0);
    const allowedBulkLiter = this.getArrivalAllowedBulkLiter();
    if (allowedBulkLiter > 0 && enteredTotalBulkLiter > allowedBulkLiter) {
      this.arrivalErrorMessage =
        `Entered total bulk liter (${enteredTotalBulkLiter.toFixed(2)}) cannot exceed requested total quantity (${allowedBulkLiter.toFixed(2)}).`;
      return;
    }
    // Allow less-than-requested bulk liter (short receipt) but do not allow exceeding the requested quantity.

    const payload = {
      tanker_count: this.arrivalTankerCount,
      tanker_details: normalizedRows.rows.map((row) => ({
        permit_no: row.permit_no || undefined,
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
                  arrivalTotalBulkLiter: enteredTotalBulkLiter,
                  arrivalApprovalStatus: 'PENDING',
                  arrivalReviewRemarks: ''
                }
              : row
          );
          this.filteredRequisitionData = this.filteredRequisitionData.map((row) =>
            row.id === savedReqId
              ? {
                  ...row,
                  hasArrivalDetails: true,
                  arrivalTankerCount: enteredTankerCount,
                  arrivalTotalBulkLiter: enteredTotalBulkLiter,
                  arrivalApprovalStatus: 'PENDING',
                  arrivalReviewRemarks: ''
                }
              : row
          );
        }
        if (this.arrivalPermitNumbers.length > 0) {
          const submittedPermits = Array.from(new Set(normalizedRows.rows.map((x) => String(x.permit_no || '').trim()).filter(Boolean)));
          submittedPermits.forEach((permitNo) => {
            const savedRows = this.arrivalSavedEntriesByPermit[permitNo] || [];
            if (Array.isArray(savedRows) && savedRows.length > 0) {
              this.arrivalServerEntriesByPermit[permitNo] = savedRows.map((r) => ({
                permit_no: permitNo,
                tanker_no: String(r?.tanker_no || '').trim(),
                bulk_liter: r?.bulk_liter ?? null
              }));
            }
            this.arrivalServerPermitStatusByPermit[permitNo] = 'PENDING';
            delete this.arrivalSavedEntriesByPermit[permitNo];
          });
          // After submission, switch to first remaining permit (if any).
          const nextPermit =
            this.arrivalPermitNumbers.find((p) => !this.isArrivalPermitLocked(p)) ||
            this.arrivalPermitNumbers[0] ||
            '';
          this.selectedArrivalPermitNo = nextPermit;
          this.onArrivalPermitChange();
        }

        alert('Arrival details submitted to OIC successfully.');
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
        if (apiMessage && typeof apiMessage === 'object') {
          try {
            this.arrivalErrorMessage = JSON.stringify(apiMessage);
            return;
          } catch {
            // fall through
          }
        }
        this.arrivalErrorMessage = apiMessage || 'Failed to save arrival details.';
      }
    });
  }

  getArrivalViewExpectedBulkLiterForPermit(permitNo: string | null | undefined): number | null {
    const token = String(permitNo || '').trim();
    if (!token) return null;

    const permits = (this.arrivalViewPermitNumbers || []).map((x) => String(x || '').trim()).filter(Boolean);
    const count = permits.length;
    const total = Number(this.selectedArrivalRequisition?.requestedTotalQuantity || 0);
    if (!Number.isFinite(total) || total <= 0 || count <= 0) return null;

    const factor = 100;
    const base = Math.floor((total / count) * factor) / factor;
    let running = 0;
    for (let i = 0; i < count; i++) {
      const p = permits[i];
      const expected = i === count - 1 ? Math.round((total - running) * factor) / factor : base;
      if (p === token) return expected;
      running += expected;
    }

    return null;
  }

  // Permit-wise arrival helpers
  private buildDefaultArrivalPermitDraftEntries(): TankerArrivalEntry[] {
    return [{ tanker_no: '', bulk_liter: null }];
  }

  onArrivalPermitChange(): void {
    if (!this.selectedArrivalPermitNo) {
      this.arrivalPermitDraftEntries = this.buildDefaultArrivalPermitDraftEntries();
      return;
    }
    const status = this.getArrivalPermitServerStatus(this.selectedArrivalPermitNo);
    if (status === 'PENDING' || status === 'APPROVED') {
      this.arrivalPermitDraftEntries = this.loadArrivalPermitServerEntries(this.selectedArrivalPermitNo);
      return;
    }
    this.arrivalPermitDraftEntries = this.loadArrivalPermitDraftEntries(this.selectedArrivalPermitNo);
  }

  private loadArrivalPermitDraftEntries(permitNo: string): TankerArrivalEntry[] {
    const saved = this.arrivalSavedEntriesByPermit[String(permitNo || '').trim()];
    const rows = Array.isArray(saved) && saved.length > 0 ? saved : this.buildDefaultArrivalPermitDraftEntries();
    return rows.map((x) => ({
      permit_no: String(permitNo || '').trim(),
      tanker_no: String(x?.tanker_no || '').trim(),
      bulk_liter: x?.bulk_liter != null ? Number(x.bulk_liter) : null
    }));
  }

  private loadArrivalPermitServerEntries(permitNo: string): TankerArrivalEntry[] {
    const token = String(permitNo || '').trim();
    const serverRows = this.arrivalServerEntriesByPermit[token] || [];
    if (!Array.isArray(serverRows) || serverRows.length === 0) {
      return [{ permit_no: token, tanker_no: '', bulk_liter: null }];
    }
    return serverRows.map((x) => ({
      permit_no: token,
      tanker_no: String(x?.tanker_no || '').trim(),
      bulk_liter: x?.bulk_liter != null ? Number(x.bulk_liter) : null
    }));
  }

  getArrivalPermitServerStatus(permitNo: string): string {
    const token = String(permitNo || '').trim();
    return String(this.arrivalServerPermitStatusByPermit[token] || '').toUpperCase();
  }

  isArrivalPermitLocked(permitNo: string): boolean {
    const status = this.getArrivalPermitServerStatus(permitNo);
    const isLockedByServer = status === 'PENDING' || status === 'APPROVED' || status === 'CANCELLED' || status === 'CANCEL_REQUESTED';
    const isLockedByReval = this.activeRevalidationPermitNumbers.has(permitNo);
    return isLockedByServer || isLockedByReval;
  }

  markArrivalPermitDirty(): void {
    const permitNo = String(this.selectedArrivalPermitNo || '').trim();
    if (!permitNo) return;
    if (this.isArrivalPermitLocked(permitNo)) return;
    this.arrivalPermitRevisionByPermit[permitNo] = (this.arrivalPermitRevisionByPermit[permitNo] || 0) + 1;
  }

  addArrivalPermitTankerRow(): void {
    if (this.isArrivalPermitLocked(this.selectedArrivalPermitNo)) return;
    this.arrivalPermitDraftEntries.push({ permit_no: this.selectedArrivalPermitNo, tanker_no: '', bulk_liter: null });
    this.markArrivalPermitDirty();
    this.recalculateArrivalDerivedCounts();
  }

  removeArrivalPermitTankerRow(index: number): void {
    if (this.isArrivalPermitLocked(this.selectedArrivalPermitNo)) return;
    if (index < 0 || index >= this.arrivalPermitDraftEntries.length) return;
    this.arrivalPermitDraftEntries.splice(index, 1);
    if (this.arrivalPermitDraftEntries.length === 0) {
      this.arrivalPermitDraftEntries = this.buildDefaultArrivalPermitDraftEntries();
    }
    this.markArrivalPermitDirty();
    this.recalculateArrivalDerivedCounts();
  }

  getArrivalPermitDraftTotalBulkLiter(): number {
    return (this.arrivalPermitDraftEntries || []).reduce((sum, row) => {
      const liters = Number(row?.bulk_liter ?? 0);
      return sum + (Number.isFinite(liters) ? liters : 0);
    }, 0);
  }

  isArrivalPermitDraftUnderfilled(): boolean {
    const permitNo = String(this.selectedArrivalPermitNo || '').trim();
    if (!permitNo) return false;
    const expected = this.getArrivalExpectedBulkLiterForPermit(permitNo);
    if (expected == null || expected <= 0) return false;
    const entered = this.getArrivalPermitDraftTotalBulkLiter();
    // Underfilled means strictly less than expected (after rounding tolerance).
    return expected - entered > 0.0001;
  }

  isArrivalPermitSaved(permitNo: string): boolean {
    const token = String(permitNo || '').trim();
    if (!token) return false;
    const savedRows = this.arrivalSavedEntriesByPermit[token];
    if (!Array.isArray(savedRows) || savedRows.length === 0) return false;
    return (this.arrivalPermitSavedRevisionByPermit[token] || 0) === (this.arrivalPermitRevisionByPermit[token] || 0);
  }

  private isArrivalPermitDraftValid(): { ok: boolean; message: string } {
    const permitNo = String(this.selectedArrivalPermitNo || '').trim();
    if (!permitNo) {
      return { ok: false, message: 'Please select a permit number.' };
    }

    const expected = this.getArrivalExpectedBulkLiterForPermit(permitNo);
    if (expected == null) {
      return { ok: false, message: 'Unable to determine expected bulk liter for selected permit.' };
    }

    const normalized = this.arrivalPermitDraftEntries.map((row, index) => ({
      tanker_no: String(row?.tanker_no || '').trim(),
      bulk_liter: Number(row?.bulk_liter ?? 0),
      row: index + 1
    }));

    const invalid = normalized.find((x) => !x.tanker_no || !Number.isFinite(x.bulk_liter) || x.bulk_liter <= 0);
    if (invalid) {
      return { ok: false, message: `Please enter valid tanker number and bulk liter for tanker row ${invalid.row}.` };
    }

    const sum = normalized.reduce((s, x) => s + x.bulk_liter, 0);
    if (sum - expected > 0.0001) {
      return { ok: false, message: `Total bulk liter for permit ${permitNo} cannot exceed ${expected.toFixed(2)}.` };
    }

    return { ok: true, message: '' };
  }

  canSaveSelectedPermit(): boolean {
    if (this.isArrivalSaving) return false;
    if (this.arrivalPermitNumbers.length === 0) return false;
    if (this.isArrivalPermitLocked(this.selectedArrivalPermitNo)) return false;
    return this.isArrivalPermitDraftValid().ok;
  }

  saveSelectedPermit(): void {
    const permitNo = String(this.selectedArrivalPermitNo || '').trim();
    if (!permitNo) return;
    const valid = this.isArrivalPermitDraftValid();
    if (!valid.ok) {
      this.arrivalErrorMessage = valid.message;
      return;
    }

    this.arrivalSavedEntriesByPermit[permitNo] = this.arrivalPermitDraftEntries.map((x) => ({
      permit_no: permitNo,
      tanker_no: String(x?.tanker_no || '').trim(),
      bulk_liter: x?.bulk_liter != null ? Number(x.bulk_liter) : null
    }));
    // Mark saved revision equal to current revision (draft considered saved).
    this.arrivalPermitSavedRevisionByPermit[permitNo] = this.arrivalPermitRevisionByPermit[permitNo] || 0;
    this.arrivalErrorMessage = '';
    this.recalculateArrivalDerivedCounts();
  }

  getArrivalSubmissionPermitNumbers(): string[] {
    const permits = Object.keys(this.arrivalSavedEntriesByPermit || {});
    return permits
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .filter((permitNo) => this.isArrivalPermitSaved(permitNo))
      .filter((permitNo) => (this.arrivalSavedEntriesByPermit[permitNo] || []).length > 0);
  }

  getArrivalSubmissionPermitCount(): number {
    return this.getArrivalSubmissionPermitNumbers().length;
  }

  private recalculateArrivalDerivedCounts(): void {
    if (this.arrivalPermitNumbers.length === 0) return;
    const totalTankers = Object.values(this.arrivalSavedEntriesByPermit).reduce((sum, rows) => sum + (rows?.length || 0), 0);
    this.arrivalTankerCount = Math.max(0, totalTankers);
  }

  private hydrateArrivalPermitsFromExisting(existing: TankerArrivalEntry[]): void {
    const permits = this.arrivalPermitNumbers;
    const permitSet = new Set(permits);
    const rowsWithPermit = existing.filter((x) => Boolean(String(x?.permit_no || '').trim()));

    if (rowsWithPermit.length === 0 && existing.length === permits.length) {
      // Backward compatibility: existing data saved without permit_no but one row per permit.
      for (let i = 0; i < permits.length; i++) {
        const permitNo = permits[i];
        const row = existing[i];
        if (!row) continue;
        this.arrivalSavedEntriesByPermit[permitNo] = [
          { permit_no: permitNo, tanker_no: String(row?.tanker_no || '').trim(), bulk_liter: row?.bulk_liter ?? null }
        ];
        this.arrivalPermitRevisionByPermit[permitNo] = 0;
        this.arrivalPermitSavedRevisionByPermit[permitNo] = 0;
      }
      return;
    }

    const grouped: Record<string, TankerArrivalEntry[]> = {};
    for (const row of rowsWithPermit) {
      const permitNo = String(row.permit_no || '').trim();
      if (!permitSet.has(permitNo)) continue;
      if (!grouped[permitNo]) grouped[permitNo] = [];
      grouped[permitNo].push({
        permit_no: permitNo,
        tanker_no: String(row?.tanker_no || '').trim(),
        bulk_liter: row?.bulk_liter ?? null
      });
    }

    for (const permitNo of permits) {
      const rows = grouped[permitNo];
      if (Array.isArray(rows) && rows.length > 0) {
        this.arrivalSavedEntriesByPermit[permitNo] = rows;
        this.arrivalPermitRevisionByPermit[permitNo] = 0;
        this.arrivalPermitSavedRevisionByPermit[permitNo] = 0;
      }
    }
  }

  private normalizeArrivalRowsForSave():
    | { ok: true; rows: Array<{ permit_no: string; tanker_no: string; bulk_liter: number }> }
    | { ok: false; message: string } {
    if (this.arrivalPermitNumbers.length > 0) {
      const permitsToSubmit = this.getArrivalSubmissionPermitNumbers();
      if (permitsToSubmit.length <= 0) {
        return { ok: false, message: 'Please save tanker details for at least one permit before submitting.' };
      }

      const flattened: Array<{ permit_no: string; tanker_no: string; bulk_liter: number }> = [];
      for (const permitNo of permitsToSubmit) {
        const expected = this.getArrivalExpectedBulkLiterForPermit(permitNo);
        if (expected == null) {
          return { ok: false, message: `Unable to determine expected bulk liter for permit ${permitNo}.` };
        }
        const rows = this.arrivalSavedEntriesByPermit[permitNo] || [];
        if (!Array.isArray(rows) || rows.length === 0) {
          return { ok: false, message: `Please save tanker details for permit ${permitNo}.` };
        }
        const sum = rows.reduce((s, r) => s + (Number(r?.bulk_liter ?? 0) || 0), 0);
        if (sum - expected > 0.0001) {
          return { ok: false, message: `Total bulk liter for permit ${permitNo} cannot exceed ${expected.toFixed(2)}.` };
        }
        for (const [idx, r] of rows.entries()) {
          const tankerNo = String(r?.tanker_no || '').trim();
          const liters = Number(r?.bulk_liter ?? 0);
          if (!tankerNo || !Number.isFinite(liters) || liters <= 0) {
            return { ok: false, message: `Please enter valid tanker number and bulk liter for permit ${permitNo} row ${idx + 1}.` };
          }
          flattened.push({ permit_no: permitNo, tanker_no: tankerNo, bulk_liter: liters });
        }
      }
      this.arrivalTankerCount = flattened.length;
      if (this.arrivalTankerCount <= 0) {
        return { ok: false, message: 'Please add tanker details before submitting.' };
      }
      return { ok: true, rows: flattened };
    }

    // Non-permit mode (legacy)
    const normalizedRows = this.arrivalEntries.map((row, index) => ({
      permit_no: '',
      tanker_no: String(row.tanker_no || '').trim(),
      bulk_liter: Number(row.bulk_liter || 0),
      row: index + 1
    }));

    const invalidRow = normalizedRows.find((row) => !row.tanker_no || !Number.isFinite(row.bulk_liter) || row.bulk_liter <= 0);
    if (invalidRow) {
      return { ok: false, message: `Please enter valid tanker number and bulk liter for row ${invalidRow.row}.` };
    }

    return {
      ok: true,
      rows: normalizedRows.map((x) => ({ permit_no: x.permit_no, tanker_no: x.tanker_no, bulk_liter: x.bulk_liter }))
    };
  }

  clearFilters(): void {
    this.requisitionDateFilter = '';
    this.requisitionMonthFilter = '';
    this.requisitionYearFilter = '';
    this.requisitionStatusFilter = '';
    this.requisitionCompanyFilter = '';
    this.activeSummaryFilter = '';
    this.applyFilters();
  }

  clearRequisitionFilters(): void {
    this.clearFilters();
  }

  onRequisitionStatusFilterChange(): void {
    this.syncActiveSummaryFilter();
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

  onSummaryCardClick(filter: string): void {
    const normalized = this.normalizeStageToken(filter);
    const current = this.normalizeStageToken(this.requisitionStatusFilter);

    if (!normalized || normalized === 'all') {
      this.activeSummaryFilter = '';
      this.requisitionStatusFilter = '';
      this.applyFilters();
      return;
    }

    if (current === normalized) {
      this.activeSummaryFilter = '';
      this.requisitionStatusFilter = '';
      this.applyFilters();
      return;
    }

    this.activeSummaryFilter = filter;
    this.requisitionStatusFilter = filter;
    this.applyFilters();
  }

  private syncActiveSummaryFilter(): void {
    const normalized = this.normalizeStageToken(this.requisitionStatusFilter);
    if (['pending', 'approved', 'rejected', 'underprocess', 'cancellation', 'cancel', 'cancelled'].includes(normalized)) {
      this.activeSummaryFilter = this.requisitionStatusFilter;
      return;
    }
    this.activeSummaryFilter = '';
  }

  getRequisitionStatusCount(status: string): number {
    const filter = this.normalizeStageToken(status);
    if (filter === 'pending' || filter === 'review') {
      // Commissioner and Permit Section: pending = action required RIGHT NOW
      const predicate = (this.isCommissioner() || this.isPermitSection())
        ? (item: TableData) => this.isPendingLikeStatus(item)
        : (item: TableData) => this.isPendingSummaryStatus(item);
      return this.summaryRequisitionData.filter(predicate).length;
    }
    if (filter === 'approved') {
      return this.summaryRequisitionData.filter(item => this.isApprovedLikeStatus(item)).length;
    }
    if (filter === 'rejected') {
      return this.summaryRequisitionData.filter(item => this.isRejectedLikeStatus(item)).length;
    }
    if (filter === 'underprocess') {
      return this.summaryRequisitionData.filter(item => this.isUnderProcessLikeStatus(item)).length;
    }
    if (filter === 'cancellation' || filter === 'cancel' || filter === 'cancelled') {
      return this.summaryRequisitionData.filter(item => this.isCancellationLikeStatus(item)).length;
    }
    return this.summaryRequisitionData.filter(
      item => `${this.normalizeStageToken(item.status)} ${this.normalizeStageToken(item.currentStageName)}`.includes(filter)
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

  shouldShowRevalidatedBadge(item: TableData): boolean {
    return this.hasActiveRevalidationOnSameRef(item);
  }

  getRevalidatedPermitsForCurrentArrival(): string[] {
    return this.arrivalPermitNumbers.filter(p => this.activeRevalidationPermitNumbers.has(p));
  }

  hasActiveRevalidationOnSameRef(item: TableData): boolean {
    const refKey = this.normalizeRefToken(item.referenceNo);
    return Boolean(refKey && this.revalidationActiveByRef[refKey]);
  }

  /**
   * Get comma-separated list of cancelled permit numbers
   */
  getCancelledPermitNumbers(item: TableData): string {
    return item.arrivalCancelledPermitNumbers || '';
  }

  /**
   * Get comma-separated list of arrived permit numbers  
   */
  getArrivedPermitNumbers(item: TableData): string {
    return item.arrivalApprovedPermitNumbers || '';
  }

  /**
   * Get list of permit numbers that went to revalidation
   */
  getRevalidatedPermitNumbers(item: TableData): string {
    if (!item.detailsPermitsNumber) return '';
    
    const permits = item.detailsPermitsNumber.split(',').map(p => p.trim()).filter(Boolean);
    const revalidatedPermits = permits.filter(p => this.activeRevalidationPermitNumbers.has(p));
    
    return revalidatedPermits.join(', ');
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
      const combined = `${status} ${stageName}`;
      const approvedByCommissioner =
        combined.includes('approv') &&
        combined.includes('commissioner') &&
        !combined.includes('reject');
      const approved = approvedByCommissioner || statusCode === 'rv09';

      if (!approved) {
        continue;
      }

      const rawRef = this.resolveRevalidationLinkedRequisitionRef(row);
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

  private buildRevalidationActiveRefIndex(rows: any[]): Record<string, boolean> {
    const index: Record<string, boolean> = {};
    for (const row of rows || []) {
      const rawRef = this.resolveRevalidationLinkedRequisitionRef(row);
      const refKey = this.normalizeRefToken(rawRef);
      if (!refKey) continue;

      const status = this.normalizeStageToken(row?.status);
      const stageName = this.normalizeStageToken(row?.current_stage_name || row?.currentStageName);
      const statusCode = this.normalizeStageToken(row?.status_code || row?.statusCode);
      const combined = `${status} ${stageName} ${statusCode}`;

      // Consider revalidation "active/placed" for this requisition ref unless explicitly rejected/cancelled.
      const isRejectedOrCancelled =
        combined.includes('reject') ||
        combined.includes('cancel');

      if (!isRejectedOrCancelled) {
        index[refKey] = true;
      }
    }
    return index;
  }

  private resolveRevalidationLinkedRequisitionRef(row: any): string {
    const candidates = [
      row?.requisition_ref_no,
      row?.requisitionRefNo,
      row?.original_requisition_ref,
      row?.originalRequisitionRef,
      row?.reference_no,
      row?.referenceNo,
      row?.ref_no,
      row?.refNo,
      row?.our_ref_no,
      row?.ourRefNo
    ];

    for (const value of candidates) {
      const ref = String(value || '').trim();
      if (!ref) continue;
      // Prefer requisition-style refs for linkage.
      if (ref.toUpperCase().startsWith('REQ/')) {
        return ref;
      }
    }

    // Check if any candidate starts with REV/ and convert REV/ -> REQ/
    for (const value of candidates) {
      const ref = String(value || '').trim();
      if (ref.toUpperCase().startsWith('REV/')) {
        return ref.toUpperCase().replace('REV/', 'REQ/');
      }
    }

    // fallback
    return String(candidates.find((v) => String(v || '').trim()) || '').trim();
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

  isApprovedCommissionerAwaitingPayment(item: TableData): boolean {
    const status = this.normalizeStageToken(item?.status);
    const stage = this.normalizeStageToken(item?.currentStageName);
    const combined = `${status} ${stage}`;

    // Once payment is made the item moves to a post-payment stage — no longer actionable
    const postPaymentMarkers = ['forwardedpayslip', 'approvedpayslip', 'rejectedpayslip', 'paymentcompleted', 'paymentdone', 'permitsection'];
    if (postPaymentMarkers.some(m => combined.includes(m))) return false;

    // Also clear if a payment reference exists on the item
    if (item?.paymentId || item?.paymentDate) return false;

    // Business rule: "APPROVED COMMISSIONER" still needs payment, so keep it in Pending.
    return combined.includes('approvedcommissioner');
  }

  /**
   * Commissioner-specific: is this the FINAL approved state?
   * Only items that have completed the full payslip cycle (stage 33 actioned)
   * or have been issued/completed are truly approved for the commissioner's count.
   * "APPROVED COMMISSIONER" (stage 29) is NOT final — still needs payment.
   */
  private isCommissionerFinalApproved(item: TableData): boolean {
    const status = this.normalizeStageToken(item?.status);
    const stage = this.normalizeStageToken(item?.currentStageName);
    const combined = `${status} ${stage}`;
    const stageId = Number(item?.currentStage ?? -1);

    // Explicitly NOT final: approved_commissioner awaiting payment
    if (this.isApprovedCommissionerAwaitingPayment(item)) return false;
    // Explicitly NOT final: forwarded payslip still at permit section
    if (combined.includes('forwardedpayslip') && combined.includes('permitsection')) return false;
    // Rejected payslip = rejected final
    if (combined.includes('rejectedpayslip')) return false;

    // Final approved: payslip was approved, or permit issued, or complete
    if (combined.includes('approvedpayslip')) return true;
    if (combined.includes('issued') || combined.includes('complete') || combined.includes('paymentcompleted')) return true;
    // Backend marks it as final stage and it's approved
    if (item?.currentStageIsFinal === true &&
        (combined.includes('approv') || combined.includes('issued') || combined.includes('complete'))) return true;
    // Stage 33 has been actioned (stageId > 33 means past it)
    if (stageId > 33) return true;

    return false;
  }

  /**
   * Commissioner-specific: is this the FINAL rejected state?
   */
  private isCommissionerFinalRejected(item: TableData): boolean {
    const status = this.normalizeStageToken(item?.status);
    const stage = this.normalizeStageToken(item?.currentStageName);
    const combined = `${status} ${stage}`;

    // Rejected payslip = final rejection
    if (combined.includes('rejectedpayslip')) return true;
    // Backend marks it as final stage and it's rejected
    if (item?.currentStageIsFinal === true && combined.includes('reject')) return true;
    return false;
  }

  private isApprovedLikeStatus(item: TableData): boolean {
    // For commissioner: use strict final-approval check
    if (this.isCommissioner()) {
      return this.isCommissionerFinalApproved(item);
    }
    if (this.isApprovedCommissionerAwaitingPayment(item)) {
      return false;
    }
    const status = this.normalizeStageToken(item?.status);
    const stage = this.normalizeStageToken(item?.currentStageName);
    return (
      status.includes('approv') ||
      stage.includes('approv') ||
      status.includes('issued') ||
      stage.includes('issued') ||
      status.includes('complete') ||
      stage.includes('complete')
    ) && !this.isRejectedLikeStatus(item);
  }

  private isRejectedLikeStatus(item: TableData): boolean {
    // For commissioner: use strict final-rejection check
    if (this.isCommissioner()) {
      return this.isCommissionerFinalRejected(item);
    }
    const status = this.normalizeStageToken(item?.status);
    const stage = this.normalizeStageToken(item?.currentStageName);
    return status.includes('reject') || stage.includes('reject');
  }

  private isPendingLikeStatus(item: TableData): boolean {
    // For commissioner: pending = action required (via allowedActions APPROVE) OR the record
    // has plain PENDING status (just submitted, awaiting commissioner review — backend may
    // not populate allowedActions at this initial stage yet), OR the status indicates
    // the item has been forwarded to the commissioner (e.g. "FORWARDED COMMISSIONER").
    if (this.isCommissioner()) {
      const actions: string[] = item?.allowedActions ?? [];
      if (Array.isArray(actions) && actions.includes('APPROVE')) return true;
      const statusToken = this.normalizeStageToken(item?.status);
      const stageToken = this.normalizeStageToken(item?.currentStageName);
      const combined = `${statusToken} ${stageToken}`;
      // Plain PENDING = just submitted
      if (statusToken === 'pending' || stageToken === 'pending') return true;
      // Forwarded to commissioner and not yet approved/rejected by commissioner
      if (combined.includes('commissioner') &&
          combined.includes('forward') &&
          !combined.includes('approv') &&
          !combined.includes('reject')) return true;
      return false;
    }
    // For permit section: pending = action required (via allowedActions) OR the record
    // has status PENDING (just submitted by licensee, awaiting PS review — backend may
    // not populate allowedActions at this early stage yet), OR the status indicates
    // the item is currently at the PS stage (e.g. "FORWARDED PAYSLIP PERMIT SECTION"
    // means the payslip came back to PS for approval after the licensee paid).
    if (this.isPermitSection()) {
      const actions: string[] = item?.allowedActions ?? [];
      const hasActionableAction = Array.isArray(actions) && (actions.includes('APPROVE') || actions.includes('REJECT') ||
             actions.includes('FORWARD') || actions.includes('VERIFY'));
      if (hasActionableAction) return true;
      const statusToken = this.normalizeStageToken(item?.status);
      const stageToken = this.normalizeStageToken(item?.currentStageName);
      const combined = `${statusToken} ${stageToken}`;
      // Plain PENDING = just submitted by licensee
      if (statusToken === 'pending' || stageToken === 'pending') return true;
      // Status indicates the item is currently AT the Permit Section stage:
      //  • "FORWARDED PAYSLIP PERMIT SECTION" → payslip back at PS for approval
      //  • Any other "forwarded * permit section" or "payslip * permit section" variant
      // Condition: contains 'permitsection' + (a forwarding/payslip indicator) AND not yet approved/rejected
      if (combined.includes('permitsection') &&
          (combined.includes('forward') || combined.includes('payslip') || combined.includes('submit')) &&
          !combined.includes('approv') &&
          !combined.includes('reject')) return true;
      return false;
    }
    if (this.isApprovedCommissionerAwaitingPayment(item)) {
      return true;
    }
    if (this.isApprovedLikeStatus(item) || this.isRejectedLikeStatus(item)) {
      return false;
    }
    const status = this.normalizeStageToken(item?.status);
    const stage = this.normalizeStageToken(item?.currentStageName);
    const combined = `${status} ${stage}`;
    return (
      combined.includes('pending') ||
      combined.includes('review') ||
      combined.includes('submit') ||
      combined.includes('forward')
    );
  }


  private isCancellationLikeStatus(item: TableData): boolean {
    const status = this.normalizeStageToken(item?.status);
    const stage = this.normalizeStageToken(item?.currentStageName);
    const combined = `${status} ${stage}`;
    return combined.includes('cancel');
  }

  private isUnderProcessLikeStatus(item: TableData): boolean {
    // For commissioner: under process = visible but no action needed right now,
    // not final approved, not final rejected, not cancelled.
    if (this.isCommissioner()) {
      if (this.isApprovedLikeStatus(item)) return false;
      if (this.isRejectedLikeStatus(item)) return false;
      if (this.isCancellationLikeStatus(item)) return false;
      if (this.isPendingLikeStatus(item)) return false;
      // Everything else the commissioner can see is "under process"
      return true;
    }
    // For permit section: same logic — under process = visible, no action needed right now
    if (this.isPermitSection()) {
      if (this.isApprovedLikeStatus(item)) return false;
      if (this.isRejectedLikeStatus(item)) return false;
      if (this.isCancellationLikeStatus(item)) return false;
      if (this.isPendingLikeStatus(item)) return false;
      return true;
    }
    if (this.isApprovedCommissionerAwaitingPayment(item)) {
      return false;
    }
    if (this.isApprovedLikeStatus(item) || this.isRejectedLikeStatus(item)) {
      return false;
    }
    if (this.isCancellationLikeStatus(item)) {
      return false;
    }
    const status = this.normalizeStageToken(item?.status);
    const stage = this.normalizeStageToken(item?.currentStageName);
    const combined = `${status} ${stage}`;
    const isCommissionerStage = combined.includes('commissioner');
    const isPermitSectionAll =
      (combined.includes('permit') && combined.includes('section') && combined.includes('all')) ||
      combined.includes('permitsectionall');
    return isCommissionerStage || isPermitSectionAll;
  }

  private isPendingSummaryStatus(item: TableData): boolean {
    // For licensee view: anything in-flight (pending OR under process) counts as Pending,
    // since the licensee has no action to take — they're just waiting.
    return this.isPendingLikeStatus(item) && !this.isCancellationLikeStatus(item);
  }

  private toBooleanFlag(value: any, fallback?: boolean): boolean | undefined {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }

    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'null', 'none'].includes(normalized)) {
      return false;
    }

    return fallback;
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
      pending: this.getRequisitionStatusCount('PENDING'),
      underProcess: this.getRequisitionStatusCount('UNDERPROCESS'),
      approved: this.getRequisitionStatusCount('APPROVED'),
      rejected: this.getRequisitionStatusCount('REJECTED')
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
