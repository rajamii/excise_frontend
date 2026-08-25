import { Component, Inject, PLATFORM_ID, OnInit, inject } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { SupplyChainService } from "../../services/supplychain.service";
import { AccountService } from "../../../../../core/services/account.service";
import { DistributorPermitService } from "../../../../../core/services/distributor-permit.service";
import { UnifiedActionButtonsComponent } from '../../../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../../../shared/services/unified-actions.service';
import { secureRandomToken } from '../../../../../core/utils/secure-random';

interface TableData {
  id?: string | number;
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  establishmentName?: string;
  status: string;
  amount: string;
  workflowId?: number;
  currentStage?: number;
  permitNumber?: string;
  cancellationReason?: string;
  requestDate?: string;
  licenseType?: string;
  allowedActions?: string[];
  allowedActionConfigs?: any[];
}

@Component({
  selector: 'app-cancellation',
  standalone: true,
  imports: [CommonModule, FormsModule, UnifiedActionButtonsComponent],
  templateUrl: './cancellation.component.html',
  styleUrl: './cancellation.component.scss'
})
export class CancellationComponent implements OnInit {
  Math = Math;
  private isBrowser = false;
  private initialSummaryAutoSelected = false;

  // Filter properties for cancellation
  cancellationDateFilter: string = '';
  cancellationMonthFilter: string = '';
  cancellationStatusFilter: string = '';
  cancellationCompanyFilter: string = '';
  cancellationCompanyOptions: string[] = [];
  activeSummaryFilter: string = '';

  // Pagination
  pageSizeOptions: number[] = [5, 10, 15];
  currentPage: number = 1;
  pageSize: number = 5;

  filteredCancellationData: TableData[] = [];
  summaryCancellationData: TableData[] = [];

  // Sample data for cancellation applications (from commissioner's perspective)
  cancellationData: TableData[] = [
    {
      referenceNo: "CAN/001/2025",
      submissionDate: "20-Sep-2025",
      requestDate: "20-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "PENDING",
      amount: "15.00",
      cancellationReason: "Business Closure",
      licenseType: "Manufacturing License"
    },
    {
      referenceNo: "CAN/002/2025",
      submissionDate: "19-Sep-2025",
      requestDate: "19-Sep-2025",
      distilleryName: "Darjeeling Artisan Pvt Ltd",
      status: "APPROVED",
      amount: "20.00",
      cancellationReason: "Voluntary Surrender",
      licenseType: "Retail License"
    },
    {
      referenceNo: "CAN/003/2025",
      submissionDate: "18-Sep-2025",
      requestDate: "18-Sep-2025",
      distilleryName: "Royal Sikkim Brewery",
      status: "APPROVED",
      amount: "0.00",
      cancellationReason: "Non-Compliance",
      licenseType: "Manufacturing License"
    },
    {
      referenceNo: "CAN/004/2025",
      submissionDate: "17-Sep-2025",
      requestDate: "17-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "PROCESSING",
      amount: "0.00",
      cancellationReason: "License Transfer",
      licenseType: "Wholesale License"
    },
    {
      referenceNo: "CAN/005/2025",
      submissionDate: "16-Sep-2025",
      requestDate: "16-Sep-2025",
      distilleryName: "Eastern Himalaya Distillery",
      status: "REJECTED",
      amount: "0.00",
      cancellationReason: "Financial Issues",
      licenseType: "Manufacturing License"
    },
    {
      referenceNo: "CAN/006/2025",
      submissionDate: "15-Sep-2025",
      requestDate: "15-Sep-2025",
      distilleryName: "Gangtok Premium Spirits",
      status: "PENDING",
      amount: "0.00",
      cancellationReason: "Regulatory Violation",
      licenseType: "Retail License"
    }
  ];

  // Services
  private unifiedActionsService = inject(UnifiedActionsService);
  private distributorPermitService = inject(DistributorPermitService);
  private route = inject(ActivatedRoute);

  isImflMode(): boolean {
    const routeUrl = this.router.url.toLowerCase();
    const section = (this.route?.snapshot?.queryParams?.['section'] || '').toLowerCase();
    return routeUrl.includes('imfl') || routeUrl.includes('distributor') || section.includes('imfl') || section.includes('distributor');
  }

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
    private supplyChainService: SupplyChainService,
    private accountService: AccountService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadCancellationData();
    }
  }

  loadCancellationData() {
    console.log('Loading cancellation data from API...');

    const obs = this.isImflMode()
      ? this.distributorPermitService.getCancellations()
      : this.supplyChainService.getCancellations();

    obs.subscribe({
      next: (data) => {
        console.log('Raw API response:', data);

        this.cancellationData = (data || []).map((item: any, index: number) => {
          const refNo = item.reference_no || item.referenceNo || item.ourRefNo || item.our_ref_no || 'N/A';
          const dateStr = item.submitted_at || item.submittedAt || item.cancellationDate || item.cancellation_date || item.requisitionDate;
          const subDate = dateStr ? new Date(dateStr).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
          const distName = item.distributor_permit_detail?.supplier_company_name || item.supplier_company_name || item.supplierName || item.branchName || item.distilleryName || 'N/A';
          const estName = item.applicant_name || item.applicantName || item.establishmentName || 'N/A';
          const permitNo = item.distributor_permit || item.distributor_permit_ref_no || item.cancelledPermitNumber || item.permitNumber || '-';

          const mappedItem = {
            id: item.id || item.pk || item.reference_no || item.referenceNo || `fallback-${index}-${secureRandomToken(8)}`,
            referenceNo: refNo,
            submissionDate: subDate,
            requestDate: subDate,
            distilleryName: distName,
            establishmentName: estName,
            status: item.current_stage_name || item.currentStageName || item.status || 'Forwarded To Commissioner',
            amount: (item.distributor_permit_detail?.total_import_value || item.totalCancellationAmount || item.cancellationBrAmount || '0.00').toString(),
            workflowId: item.workflow || item.workflow_id || 17,
            currentStage: item.current_stage || item.currentStage || 162,
            permitNumber: permitNo,
            cancellationReason: item.cancellation_reason || item.cancellationReason || 'Cancellation Request',
            licenseType: 'Import Permit Cancellation',
            allowedActions: item.allowed_actions || item.allowedActions || this.getDefaultActions(item.status),
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || []
          };

          // Check if this cancellation was approved locally and override status
          const storedStatus = mappedItem.id ? this.getStoredStatus(mappedItem.id) : null;
          if (storedStatus) {
            mappedItem.status = storedStatus;
            mappedItem.allowedActions = [];
          }

          return mappedItem;
        });

        this.applyCancellationFilters();
        this.maybeAutoSelectPendingSummary();
      },
      error: (err) => console.error('Error loading cancellation data:', err)
    });
  }

  private maybeAutoSelectPendingSummary(): void {
    if (this.initialSummaryAutoSelected) return;
    this.initialSummaryAutoSelected = true;

    if (this.cancellationStatusFilter || this.activeSummaryFilter) return;

    const pendingCount = this.getCancellationStatusCount('PENDING');
    if (pendingCount > 0) {
      this.activeSummaryFilter = 'PENDING';
      this.cancellationStatusFilter = 'PENDING';
      this.applyCancellationFilters();
    }
  }

  // Unified action handler
  onUnifiedAction(event: { action: string, item: any }): void {
    const context = this.getUserContext();

    this.unifiedActionsService.executeAction(
      event.action,
      event.item,
      'cancellation',
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
          this.loadCancellationData();
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

  private normalizeStatus(status: string | null | undefined): string {
    return String(status || '').toLowerCase().replace(/[\s_-]+/g, '');
  }

  private isRejectedStatus(status: string | null | undefined): boolean {
    return this.normalizeStatus(status).includes('reject');
  }

  private isApprovedStatus(status: string | null | undefined): boolean {
    const value = this.normalizeStatus(status);
    return value.includes('approv') && !value.includes('reject');
  }

  private isForwardedPaySlipStatus(status: string | null | undefined): boolean {
    const value = this.normalizeStatus(status);
    return value.includes('forward') && value.includes('payslip');
  }

  private isPendingLikeStatus(status: string | null | undefined): boolean {
    const value = this.normalizeStatus(status);
    if (!value) return true;
    if (this.isApprovedStatus(value) || this.isRejectedStatus(value)) return false;
    return (
      value.includes('pending') ||
      value.includes('processing') ||
      value.includes('submitted') ||
      value.includes('forward')
    );
  }

  private isActionablePending(item: TableData): boolean {
    const actions: string[] = item?.allowedActions ?? [];
    const hasActionableAction = Array.isArray(actions) && actions.some(a => [
      'APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'APPROVEPAYSLIP', 'REJECTPAYSLIP', 'PAY'
    ].includes(String(a || '').toUpperCase()));

    if (Array.isArray(actions) && actions.length > 0) {
      if (hasActionableAction) return true;
      return false;
    }

    const st = this.normalizeStatus(item.status);
    if (st.includes('approv') || st.includes('reject') || st.includes('cancel')) {
      return false;
    }

    if (Array.isArray(actions) && actions.length === 0) {
      return false;
    }

    if (this.isCommissioner()) {
      if (st === 'pending') return true;
      if (st.includes('commissioner') && st.includes('forward') && !st.includes('approv') && !st.includes('reject')) {
        return true;
      }
      return false;
    }
    if (this.isPermitSection()) {
      if (st.includes('commissioner')) return false;
      if (st === 'pending') return true;
      if (st.includes('permitsection') && (st.includes('forward') || st.includes('payslip') || st.includes('submit')) && !st.includes('approv') && !st.includes('reject')) {
        return true;
      }
      return false;
    }
    return this.isPendingLikeStatus(item.status);
  }

  private isPendingSummaryStatus(status: string | null | undefined): boolean {
    const value = this.normalizeStatus(status);
    if (!value) return true;
    if (this.isApprovedStatus(value) || this.isRejectedStatus(value)) return false;
    // Pending summary should NOT include "processing" (those go to "Under Process").
    return (
      value.includes('pending') ||
      value.includes('review') ||
      value.includes('submitted') ||
      value.includes('forward')
    ) && !value.includes('processing');
  }

  private isUnderProcessLikeStatus(status: string | null | undefined): boolean {
    const value = this.normalizeStatus(status);
    if (!value) return false;
    if (this.isApprovedStatus(value) || this.isRejectedStatus(value)) return false;
    if (this.isPendingSummaryStatus(value)) return false;
    // Remaining non-final statuses are treated as under process.
    return true;
  }

  private getDefaultActions(status: string): string[] {
    if (this.isApprovedStatus(status) || this.isRejectedStatus(status)) {
      return []; // No actions for completed items
    } else if (this.isPendingLikeStatus(status)) {
      return ['APPROVE', 'REJECT']; // Default actions for pending items
    } else {
      return [];
    }
  }

  private loadSampleCancellationData(): void {
    // Keep existing sample data as fallback with unique IDs
    this.cancellationData = [
      {
        id: 'sample-1-' + secureRandomToken(8),
        referenceNo: "CAN/001/2025",
        submissionDate: "20-Sep-2025",
        requestDate: "20-Sep-2025",
        distilleryName: "Sikkim Distilleries Ltd",
        status: "CancellationPending",
        amount: "15.00",
        permitNumber: "1",
        cancellationReason: "Business Closure",
        licenseType: "Manufacturing License",
        allowedActions: ['APPROVE', 'REJECT']
      },
      {
        id: 'sample-2-' + secureRandomToken(8),
        referenceNo: "CAN/002/2025",
        submissionDate: "19-Sep-2025",
        requestDate: "19-Sep-2025",
        distilleryName: "Darjeeling Artisan Pvt Ltd",
        status: "ApprovedCancellationByCommissioner",
        amount: "20.00",
        permitNumber: "1",
        cancellationReason: "Voluntary Surrender",
        licenseType: "Retail License",
        allowedActions: []
      }
    ];

    console.log('Sample cancellation data loaded:', this.cancellationData);
    this.applyCancellationFilters();
  }

  // Filter methods
  applyCancellationFilters(): void {
    let summary = [...this.cancellationData].filter(item => this.isVisibleToCurrentAdmin(item));

    // Date filter
    if (this.cancellationDateFilter) {
      const filterDate = new Date(this.cancellationDateFilter);
      summary = summary.filter(item => {
        const itemDate = this.parseDate(item.submissionDate);
        return itemDate.toDateString() === filterDate.toDateString();
      });
    }

    // Month filter (Jan-Dec)
    if (this.cancellationMonthFilter) {
      const monthNum = parseInt(this.cancellationMonthFilter, 10);
      summary = summary.filter(item => {
        const itemDate = this.parseDate(item.submissionDate);
        return itemDate.getMonth() + 1 === monthNum;
      });
    }

    this.summaryCancellationData = summary;

    // Build company options for commissioner filter
    this.cancellationCompanyOptions = Array.from(
      new Set(
        summary
          .map(item => String(item?.establishmentName || item?.distilleryName || '').trim())
          .filter(v => !!v)
      )
    ).sort((a, b) => a.localeCompare(b));

    let filtered = [...summary];

    // Company filter — commissioner only
    if (this.cancellationCompanyFilter) {
      filtered = filtered.filter(item =>
        String(item?.establishmentName || item?.distilleryName || '').trim() === this.cancellationCompanyFilter
      );
    }

    // Status filter
    if (this.cancellationStatusFilter) {
      filtered = filtered.filter(item => {
        const itemStatus = this.normalizeStatus(item.status);
        const filterStatus = this.normalizeStatus(this.cancellationStatusFilter);

        // Handle different status variations
        if (filterStatus === 'pending') {
          return (this.isCommissioner() || this.isPermitSection())
            ? this.isActionablePending(item)
            : this.isPendingSummaryStatus(item.status);
        } else if (filterStatus === 'approved') {
          return this.isApprovedStatus(item.status);
        } else if (filterStatus === 'rejected') {
          return this.isRejectedStatus(item.status);
        } else if (filterStatus === 'underprocess') {
          return this.isUnderProcessLikeStatus(item.status);
        } else {
          return itemStatus === filterStatus;
        }
      });
    }

    this.filteredCancellationData = filtered;
    this.resetPagination();
  }

  clearCancellationFilters(): void {
    this.cancellationDateFilter = '';
    this.cancellationMonthFilter = '';
    this.cancellationStatusFilter = '';
    this.cancellationCompanyFilter = '';
    this.activeSummaryFilter = '';
    this.applyCancellationFilters();
  }

  onCancellationDateFilterChange(): void {
    this.applyCancellationFilters();
  }

  onCancellationMonthFilterChange(): void {
    this.applyCancellationFilters();
  }

  onCancellationStatusFilterChange(): void {
    this.syncActiveSummaryFilter();
    this.applyCancellationFilters();
  }

  // Summary methods
  getCancellationStatusCount(status: string): number {
    if (status === 'PENDING') {
      const predicate = (this.isCommissioner() || this.isPermitSection())
        ? (item: TableData) => this.isActionablePending(item)
        : (item: TableData) => this.isPendingSummaryStatus(item.status);
      return this.summaryCancellationData.filter(predicate).length;
    } else if (status === 'APPROVED') {
      return this.summaryCancellationData.filter(item => this.isApprovedStatus(item.status)).length;
    } else if (status === 'REJECTED') {
      return this.summaryCancellationData.filter(item => this.isRejectedStatus(item.status)).length;
    } else if (status === 'UNDER_PROCESS') {
      return this.summaryCancellationData.filter(item => this.isUnderProcessLikeStatus(item.status)).length;
    }
    return this.summaryCancellationData.filter(
      item => this.normalizeStatus(item.status) === this.normalizeStatus(status)
    ).length;
  }

  getUrgentCancellationCount(): number {
    return this.summaryCancellationData.filter(item =>
      item.cancellationReason === 'Non-Compliance' || item.cancellationReason === 'Regulatory Violation'
    ).length;
  }

  onSummaryCardClick(filter: string): void {
    const normalized = this.normalizeStatus(filter);
    const current = this.normalizeStatus(this.cancellationStatusFilter);

    if (!normalized || normalized === 'all') {
      this.activeSummaryFilter = '';
      this.cancellationStatusFilter = '';
      this.applyCancellationFilters();
      return;
    }

    if (current === normalized) {
      this.activeSummaryFilter = '';
      this.cancellationStatusFilter = '';
      this.applyCancellationFilters();
      return;
    }

    this.activeSummaryFilter = filter;
    this.cancellationStatusFilter = filter;
    this.applyCancellationFilters();
  }

  private syncActiveSummaryFilter(): void {
    const normalized = this.normalizeStatus(this.cancellationStatusFilter);
    if (['pending', 'approved', 'underprocess'].includes(normalized)) {
      this.activeSummaryFilter = this.cancellationStatusFilter;
      return;
    }
    this.activeSummaryFilter = '';
  }

  // Action methods
  reviewCancellation(item: TableData): void {
    // Determine the source based on user type
    const userType = this.getUserType();
    let source = 'licensee-dashboard';

    if (userType === 'commissioner') {
      source = 'commissioner-dashboard';
    } else if (userType === 'permit-section') {
      source = 'permit-section';
    }

    // Navigate to cancellation letter view with reference number
    this.router.navigate(['/dev-cancellation-letter-view'], {
      queryParams: {
        ref: item.referenceNo,
        source: source
      }
    });
  }

  approveCancellation(item: TableData): void {
    if (!item.id) {
      alert('Cannot approve: Missing cancellation ID');
      return;
    }

    if (!confirm('Are you sure you want to approve this cancellation request?')) return;

    console.log('Approving cancellation with ID:', item.id);

    // Add loading state to button
    const approveButton = document.querySelector(`[data-item-id="${item.id}"] .btn-outline-success`);
    if (approveButton) {
      approveButton.classList.add('loading');
    }

    // Immediately update UI to prevent duplicate clicks
    const index = this.cancellationData.findIndex(data => data.id === item.id);
    const filteredIndex = this.filteredCancellationData.findIndex(data => data.id === item.id);

    // Store original status for rollback if needed
    const originalStatus = item.status;
    const originalActions = [...(item.allowedActions || [])];

    // Determine action based on status
    const itemStatus = item.status || '';
    let action: 'APPROVE' | 'ApprovePayslip' = 'APPROVE';
    let targetStatus = 'APPROVED';

    if (this.isForwardedPaySlipStatus(itemStatus)) {
      action = 'ApprovePayslip';
      targetStatus = 'APPROVED_PAYSLIP';
    }

    // Optimistically update the UI immediately
    if (index !== -1) {
      this.cancellationData[index].status = targetStatus;
      this.cancellationData[index].allowedActions = [];
    }

    if (filteredIndex !== -1) {
      this.filteredCancellationData[filteredIndex].status = targetStatus;
      this.filteredCancellationData[filteredIndex].allowedActions = [];
    }

    // Force UI refresh immediately
    this.applyCancellationFilters();

    // Make API call with enhanced error handling
    this.supplyChainService.performCancellationAction(item.id, action, 'commissioner').subscribe({
      next: (response) => {
        console.log('Approval response:', response);

        // Remove loading state and add success animation
        if (approveButton) {
          approveButton.classList.remove('loading');
          approveButton.classList.add('success');
          setTimeout(() => approveButton.classList.remove('success'), 600);
        }

        // Confirm the status update with API response
        const newStatus = response.new_status || response.status || targetStatus;

        // Update with confirmed status from API
        if (index !== -1) {
          this.cancellationData[index].status = newStatus;
          this.cancellationData[index].allowedActions = [];
        }

        if (filteredIndex !== -1) {
          this.filteredCancellationData[filteredIndex].status = newStatus;
          this.filteredCancellationData[filteredIndex].allowedActions = [];
        }

        // Store in localStorage to persist across navigation
        if (item.id) {
          this.storeApprovedCancellation(item.id, newStatus);
        }

        // Show success notification
        this.showNotification('Cancellation Request Approved Successfully', 'success');

        // Show success message with next step (Only for final approval, maybe adjust logic if needed)
        /*
        setTimeout(() => {
          if (confirm('Cancellation approved successfully! Would you like to generate the final letter now?')) {
            this.generateFinalLetter(this.cancellationData[index] || this.filteredCancellationData[filteredIndex]);
          }
        }, 500);
        */
      },
      error: (err) => {
        console.error('Error approving cancellation:', err);

        // Remove loading state
        if (approveButton) {
          approveButton.classList.remove('loading');
        }

        // Rollback optimistic update on error
        if (index !== -1) {
          this.cancellationData[index].status = originalStatus;
          this.cancellationData[index].allowedActions = originalActions;
        }

        if (filteredIndex !== -1) {
          this.filteredCancellationData[filteredIndex].status = originalStatus;
          this.filteredCancellationData[filteredIndex].allowedActions = originalActions;
        }

        this.applyCancellationFilters();

        // Check if it's a specific backend error
        if (err.status === 500) {
          // For 500 errors, assume approval went through but response failed
          if (confirm('Backend server error occurred. The approval might have been processed. Would you like to check the status or try generating the final letter?')) {
            // Keep the optimistic update
            if (index !== -1) {
              this.cancellationData[index].status = targetStatus;
              this.cancellationData[index].allowedActions = [];
            }

            if (filteredIndex !== -1) {
              this.filteredCancellationData[filteredIndex].status = targetStatus;
              this.filteredCancellationData[filteredIndex].allowedActions = [];
            }

            if (item.id) {
              this.storeApprovedCancellation(item.id, targetStatus);
            }
            this.applyCancellationFilters();
          }
        } else {
          this.showNotification(`Failed to approve cancellation: ${err.message || 'Unknown error'}`, 'error');
        }
      }
    });
  }

  rejectCancellation(item: TableData): void {
    if (!item.id) {
      alert('Cannot reject: Missing cancellation ID');
      return;
    }

    if (!confirm('Are you sure you want to reject this cancellation request?')) return;

    console.log('Rejecting cancellation with ID:', item.id);

    // Add loading state to button
    const rejectButton = document.querySelector(`[data-item-id="${item.id}"] .btn-outline-danger`);
    if (rejectButton) {
      rejectButton.classList.add('loading');
    }

    // Immediately update UI to prevent duplicate clicks
    const index = this.cancellationData.findIndex(data => data.id === item.id);
    const filteredIndex = this.filteredCancellationData.findIndex(data => data.id === item.id);

    // Store original status for rollback if needed
    const originalStatus = item.status;
    const originalActions = [...(item.allowedActions || [])];

    // Optimistically update the UI immediately
    if (index !== -1) {
      this.cancellationData[index].status = 'REJECTED';
      this.cancellationData[index].allowedActions = [];
    }

    if (filteredIndex !== -1) {
      this.filteredCancellationData[filteredIndex].status = 'REJECTED';
      this.filteredCancellationData[filteredIndex].allowedActions = [];
    }

    // Force UI refresh immediately
    // Determine action based on status
    const itemStatus = item.status || '';
    let action: 'REJECT' | 'RejectPayslip' = 'REJECT';
    let targetStatus = 'REJECTED';

    if (this.isForwardedPaySlipStatus(itemStatus)) {
      action = 'RejectPayslip';
      targetStatus = 'REJECTED_PAYSLIP';
    }

    // Optimistically update status
    if (index !== -1) {
      this.cancellationData[index].status = targetStatus;
    }
    if (filteredIndex !== -1) {
      this.filteredCancellationData[filteredIndex].status = targetStatus;
    }

    this.applyCancellationFilters();

    this.supplyChainService.performCancellationAction(item.id, action, 'commissioner').subscribe({
      next: (response) => {
        console.log('Rejection response:', response);

        // Remove loading state and add success animation
        if (rejectButton) {
          rejectButton.classList.remove('loading');
          rejectButton.classList.add('success');
          setTimeout(() => rejectButton.classList.remove('success'), 600);
        }

        // Confirm the status update with API response
        const newStatus = response.new_status || response.status || targetStatus;

        // Update with confirmed status from API
        if (index !== -1) {
          this.cancellationData[index].status = newStatus;
          this.cancellationData[index].allowedActions = [];
        }

        if (filteredIndex !== -1) {
          this.filteredCancellationData[filteredIndex].status = newStatus;
          this.filteredCancellationData[filteredIndex].allowedActions = [];
        }

        // Store in localStorage to persist across navigation
        if (item.id) {
          this.storeApprovedCancellation(item.id, newStatus);
        }

        this.showNotification('Cancellation Request Rejected', 'warning');

        // Force change detection to update UI immediately
        this.applyCancellationFilters();
      },
      error: (err) => {
        console.error('Error rejecting cancellation:', err);

        // Remove loading state
        if (rejectButton) {
          rejectButton.classList.remove('loading');
        }

        // Rollback optimistic update on error
        if (index !== -1) {
          this.cancellationData[index].status = originalStatus;
          this.cancellationData[index].allowedActions = originalActions;
        }

        if (filteredIndex !== -1) {
          this.filteredCancellationData[filteredIndex].status = originalStatus;
          this.filteredCancellationData[filteredIndex].allowedActions = originalActions;
        }

        this.applyCancellationFilters();

        // Check if it's a specific backend error
        if (err.status === 500) {
          // For 500 errors, assume rejection went through but response failed
          if (confirm('Backend server error occurred. The rejection might have been processed. Would you like to keep the rejection status?')) {
            // Keep the optimistic update
            if (index !== -1) {
              this.cancellationData[index].status = targetStatus;
              this.cancellationData[index].allowedActions = [];
            }

            if (filteredIndex !== -1) {
              this.filteredCancellationData[filteredIndex].status = targetStatus;
              this.filteredCancellationData[filteredIndex].allowedActions = [];
            }

            if (item.id) {
              this.storeApprovedCancellation(item.id, targetStatus);
            }
            this.applyCancellationFilters();
          }
        } else {
          this.showNotification(`Failed to reject cancellation: ${err.message || 'Unknown error'}`, 'error');
        }
      }
    });
  }

  // Helper methods
  getStatusClass(status: string): string {
    const normalizedStatus = this.normalizeStatus(status);
    if (this.isRejectedStatus(normalizedStatus)) return 'rejected';
    if (this.isApprovedStatus(normalizedStatus)) return 'approved';
    if (normalizedStatus.includes('processing')) return 'processing';
    if (this.isPendingLikeStatus(normalizedStatus)) return 'pending';
    if (normalizedStatus.includes('expired')) return 'expired';
    if (normalizedStatus.includes('cancelled')) return 'cancelled';
    return 'default';
  }

  // Check if approve/reject buttons should be shown
  canApproveOrReject(item: TableData): boolean {
    // DYNAMIC APPROACH: Trust the backend's allowedActions first!
    if (item.allowedActions && item.allowedActions.length > 0) {
      const hasAction = item.allowedActions.some(action =>
        ['APPROVE', 'REJECT', 'FORWARD'].includes(action.toUpperCase())
      );
      if (hasAction) return true;
    }

    const status = item.status || '';

    // Check if already processed locally
    if (item.id && this.isApprovedInStorage(item.id)) {
      return false; // Don't show buttons if already processed locally
    }

    // Don't show buttons if already approved or rejected (Fallback)
    if (this.isApprovedStatus(status) || this.isRejectedStatus(status)) {
      return false;
    }

    // Fallback: Only show if user is commissioner and status allows actions
    return this.isCommissioner() && this.isPendingLikeStatus(status);
  }

  // Check if approve button should be shown
  canApprove(item: TableData): boolean {
    if (!this.canApproveOrReject(item)) {
      return false;
    }

    // If allowedActions exists, check if APPROVE or APPROVEPAYSLIP is included
    if (item.allowedActions && item.allowedActions.length > 0) {
      return item.allowedActions.some(action =>
        action.toUpperCase() === 'APPROVE' ||
        action.toUpperCase() === 'APPROVEPAYSLIP'
      );
    }

    // If no allowedActions, show approve button for pending statuses
    return true;
  }

  // Check if reject button should be shown
  canReject(item: TableData): boolean {
    if (!this.canApproveOrReject(item)) {
      return false;
    }

    // If allowedActions exists, check if REJECT or REJECTPAYSLIP is included
    if (item.allowedActions && item.allowedActions.length > 0) {
      return item.allowedActions.some(action =>
        action.toUpperCase() === 'REJECT' ||
        action.toUpperCase() === 'REJECTPAYSLIP'
      );
    }

    // If no allowedActions, show reject button for pending statuses
    return true;
  }

  generateFinalLetter(item: TableData): void {
    if (!item.id) {
      alert('Cannot generate final letter: Missing cancellation ID');
      return;
    }

    // Validate that the cancellation is approved
    const status = item.status?.toUpperCase();
    if (!status?.includes('APPROVED')) {
      alert('Final letter can only be generated for approved cancellations');
      return;
    }

    console.log('Generating final letter for approved cancellation:', item);

    // Navigate to cancellation final letter view with comprehensive parameters
    this.router.navigate(['/dev-cancellation-final-letter-view'], {
      queryParams: {
        id: item.id,
        source: this.getUserType() === 'commissioner' ? 'commissioner-dashboard' : 'licensee-dashboard',
        status: item.status, // Pass current status
        refNo: item.referenceNo, // Pass reference number
        distillery: item.distilleryName, // Pass distillery name
        approved: 'true', // Explicit approval flag
        reason: item.cancellationReason, // Pass cancellation reason
        licenseType: item.licenseType, // Pass license type
        amount: item.amount // Pass amount if available
      }
    });
  }

  // Check if final letter can be generated (only for approved cancellations)
  canGenerateFinalLetter(item: TableData): boolean {
    const status = item.status || '';

    // Check if approved locally first
    const storedStatus = item.id ? this.getStoredStatus(item.id) : null;
    const isApprovedLocally = this.isApprovedStatus(storedStatus || '');

    // Must be approved (either from API or locally stored) and user must be commissioner
    const isApproved = this.isApprovedStatus(status) || isApprovedLocally;
    const isCommissioner = this.isCommissioner();
    const hasId = !!item.id;

    return isApproved && isCommissioner && hasId;
  }

  canPay(item: TableData): boolean {
    const status = item.status || '';
    const isApproved = this.isApprovedStatus(status);
    // Ensure we are in licensee mode/dashboard if we strictly want to limit it
    const isLicensee = !this.isCommissioner(); // Rough check based on component usage
    return isApproved && isLicensee;
  }

  navigateToPayment(item: TableData): void {
    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: {
        tab: 'cancellation',
        refNo: item.referenceNo,
        amount: item.amount,
        action: 'makePayment',
        id: item.id
      }
    });
  }

  private parseDate(dateString: string): Date {
    const s = String(dateString || '').trim();
    if (!s) return new Date(NaN);

    // YYYY-MM-DD
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const year = parseInt(iso[1], 10);
      const month = parseInt(iso[2], 10) - 1;
      const day = parseInt(iso[3], 10);
      return new Date(year, month, day);
    }

    // DD-MM-YYYY
    const dmyDash = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmyDash) {
      const day = parseInt(dmyDash[1], 10);
      const month = parseInt(dmyDash[2], 10) - 1;
      const year = parseInt(dmyDash[3], 10);
      return new Date(year, month, day);
    }

    // DD/MM/YYYY
    const dmySlash = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmySlash) {
      const day = parseInt(dmySlash[1], 10);
      const month = parseInt(dmySlash[2], 10) - 1;
      const year = parseInt(dmySlash[3], 10);
      return new Date(year, month, day);
    }

    return new Date(s);
  }

  // Pagination methods
  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil((this.filteredCancellationData?.length || 0) / this.pageSize));
  }

  getPaged(): TableData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (this.filteredCancellationData || []).slice(start, start + this.pageSize);
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

  // Dashboard statistics methods
  getDashboardStatistics() {
    return {
      applied: this.getCancellationStatusCount('APPLIED') + this.getCancellationStatusCount('SUBMITTED'),
      pending: this.getCancellationStatusCount('PENDING') + this.getCancellationStatusCount('CANCELLATION_PENDING'),
      approved: this.getCancellationStatusCount('APPROVED') + this.getCancellationStatusCount('CANCELLATION_APPROVED'),
      rejected: this.getCancellationStatusCount('REJECTED') + this.getCancellationStatusCount('CANCELLATION_REJECTED')
    };
  }

  getFilterOptions() {
    return [
      { value: 'all', label: 'All Applications' },
      { value: 'cancellation', label: 'Cancellations' },
      { value: 'pending', label: 'Pending Applications' },
      { value: 'approved', label: 'Approved Applications' },
      { value: 'rejected', label: 'Rejected Applications' }
    ];
  }

  onDashboardFilterChange(filterValue: string): void {
    // Handle dashboard filter changes
    if (filterValue === 'all') {
      this.cancellationStatusFilter = '';
    } else if (filterValue === 'pending') {
      this.cancellationStatusFilter = 'PENDING';
    } else if (filterValue === 'approved') {
      this.cancellationStatusFilter = 'APPROVED';
    } else if (filterValue === 'rejected') {
      this.cancellationStatusFilter = 'REJECTED';
    }
    this.applyCancellationFilters();
  }

  // Persistence methods for approved cancellations
  private storeApprovedCancellation(id: string | number, status: string): void {
    if (!this.isBrowser) return;

    try {
      const approvedCancellations = this.getStoredApprovedCancellations();
      approvedCancellations[id.toString()] = {
        status: status,
        approvedAt: new Date().toISOString(),
        approvedBy: 'commissioner'
      };

      localStorage.setItem('approvedCancellations', JSON.stringify(approvedCancellations));
      console.log('Stored approved cancellation:', id, status);
    } catch (error) {
      console.error('Error storing approved cancellation:', error);
    }
  }

  private getStoredApprovedCancellations(): { [key: string]: any } {
    if (!this.isBrowser) return {};

    try {
      const stored = localStorage.getItem('approvedCancellations');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting stored approved cancellations:', error);
      return {};
    }
  }

  private isApprovedInStorage(id: string | number): boolean {
    const approvedCancellations = this.getStoredApprovedCancellations();
    return !!approvedCancellations[id.toString()];
  }

  private getStoredStatus(id: string | number): string | null {
    const approvedCancellations = this.getStoredApprovedCancellations();
    const stored = approvedCancellations[id.toString()];
    return stored ? stored.status : null;
  }

  // Role detection methods
  isCommissioner(): boolean {
    const hasRole = this.accountService.hasAnyRole(['commissioner', 'commissioner', 'Commissioner']);
    const isCommissionerRoute = this.isBrowser && window.location.pathname.includes('commissioner');
    return hasRole || isCommissionerRoute;
  }

  isPermitSection(): boolean {
    const hasRole = this.accountService.hasAnyRole(['permit-section', 'permit section', 'permit_section', 'Permit Section']);
    const isPermitSectionRoute = this.isBrowser && (window.location.pathname.includes('permit-section') || window.location.pathname.includes('app-permit-section'));
    return hasRole || isPermitSectionRoute;
  }

  getUserType(): 'commissioner' | 'permit-section' | 'licensee' {
    if (this.isCommissioner()) return 'commissioner';
    if (this.isPermitSection()) return 'permit-section';
    return 'licensee';
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

  // Method to clear stored approvals (for development/testing)
  clearStoredApprovals(): void {
    if (!this.isBrowser) return;

    try {
      localStorage.removeItem('approvedCancellations');
      console.log('Cleared stored approvals');
      // Reload data to refresh UI
      this.loadCancellationData();
    } catch (error) {
      console.error('Error clearing stored approvals:', error);
    }
  }

  // Enhanced notification system
  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    if (!this.isBrowser) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    const content = document.createElement('div');
    content.className = 'notification-content';

    const icon = document.createElement('i');
    icon.className = `bi ${this.getNotificationIcon(type)}`;

    const text = document.createElement('span');
    text.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.type = 'button';
    closeButton.addEventListener('click', () => notification.remove());

    const closeIcon = document.createElement('i');
    closeIcon.className = 'bi bi-x';

    closeButton.appendChild(closeIcon);
    content.appendChild(icon);
    content.appendChild(text);
    content.appendChild(closeButton);
    notification.appendChild(content);

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      min-width: 300px;
      max-width: 500px;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
      background: ${this.getNotificationColor(type)};
      color: white;
      font-weight: 500;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  private getNotificationIcon(type: string): string {
    switch (type) {
      case 'success': return 'bi-check-circle-fill';
      case 'error': return 'bi-x-circle-fill';
      case 'warning': return 'bi-exclamation-triangle-fill';
      default: return 'bi-info-circle-fill';
    }
  }

  private getNotificationColor(type: string): string {
    switch (type) {
      case 'success': return 'linear-gradient(135deg, #10b981, #059669)';
      case 'error': return 'linear-gradient(135deg, #ef4444, #dc2626)';
      case 'warning': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      default: return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    }
  }

  // Action include list for unified action buttons
  getActionIncludeList(item: TableData): string[] {
    const actions = ['VIEW'];
    
    // For cancellation, show payment slip after payment is made
    const hasPayment = this.hasPaymentBeenMade(item);
    
    console.log('🔍 getActionIncludeList (cancellation):', {
      itemId: item.id,
      refNo: item.referenceNo,
      status: item.status,
      hasPayment,
      allowedActions: item.allowedActions,
      isCommissioner: this.isCommissioner()
    });
    
    // Show "View Payment Slip" after payment is made
    if (hasPayment) {
      actions.push('VIEW_PAYMENT_SLIP');
    }
    
    // Trust backend for VIEW_PERMIT_SLIP action
    if (item.allowedActions && item.allowedActions.includes('VIEW_PERMIT_SLIP')) {
      console.log('✅ Backend says show VIEW_PERMIT_SLIP');
      actions.push('VIEW_PERMIT_SLIP');
    }
    
    console.log('🔍 Final actions array:', actions);
    return actions;
  }

  hasPaymentBeenMade(item: TableData): boolean {
    // Check if payment has been completed for cancellation
    const status = (item.status || '').toLowerCase().replace(/\s+/g, '');
    
    // Payment indicators for cancellation
    // After submission and payment, status changes to forwarded or approved
    const statusIndicatesPayment = status.includes('forwarded') ||
                                   status.includes('approved') ||
                                   status.includes('payslip') ||
                                   status.includes('paid');
    
    console.log('🔍 hasPaymentBeenMade (cancellation):', {
      status: item.status,
      normalizedStatus: status,
      statusIndicatesPayment
    });
    
    return statusIndicatesPayment;
  }

  canViewPermitSlip(item: TableData): boolean {
    // Only commissioner can view permit slip at final approved stage
    if (!this.isCommissioner()) {
      return false;
    }
    
    const status = this.normalizeStatus(item.status || '');
    const isCommissionerApproved = status.includes('commissioner') && status.includes('approv');
    const isFinalApproved = (isCommissionerApproved || status.includes('finalapproved')) && !this.isRejectedStatus(status);
    
    console.log('🔍 canViewPermitSlip (cancellation):', {
      status: item.status,
      normalizedStatus: status,
      isFinalApproved,
      isCommissioner: this.isCommissioner()
    });
    
    return isFinalApproved;
  }
}
