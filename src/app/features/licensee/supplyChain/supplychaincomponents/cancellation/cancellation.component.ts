import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { SupplyChainService } from "../../services/supplychain.service";
import { AccountService } from "../../../../../core/services/account.service";

interface TableData {
  id?: string | number;
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  priority?: string;
  cancellationReason?: string;
  requestDate?: string;
  licenseType?: string;
  allowedActions?: string[];
}

@Component({
  selector: 'app-cancellation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation.component.html',
  styleUrl: './cancellation.component.scss'
})
export class CancellationComponent implements OnInit {
  Math = Math;
  private isBrowser = false;

  // Filter properties for cancellation
  cancellationDateFilter: string = '';
  cancellationStatusFilter: string = '';
  cancellationReasonFilter: string = '';

  // Pagination
  pageSizeOptions: number[] = [5, 10, 15];
  currentPage: number = 1;
  pageSize: number = 5;

  filteredCancellationData: TableData[] = [];

  // Sample data for cancellation applications (from commissioner's perspective)
  cancellationData: TableData[] = [
    {
      referenceNo: "CAN/001/2025",
      submissionDate: "20-Sep-2025",
      requestDate: "20-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "PENDING",
      amount: "15.00",
      priority: "high",
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
      priority: "normal",
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
      priority: "urgent",
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
      priority: "high",
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
      priority: "normal",
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
      priority: "urgent",
      cancellationReason: "Regulatory Violation",
      licenseType: "Retail License"
    }
  ];

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

    this.supplyChainService.getCancellations().subscribe({
      next: (data) => {
        console.log('Raw API response:', data);
        console.log('Number of items received:', data.length);

        this.cancellationData = data.map((item: any, index: number) => {
          const mappedItem = {
            id: item.id || item.pk || `fallback-${index}-${Date.now()}`, // Ensure unique ID
            referenceNo: item.ourRefNo || item.our_ref_no || `CAN/${item.id || index}/2025`,
            submissionDate: item.cancellationDate ? new Date(item.cancellationDate).toLocaleDateString('en-GB') :
              (item.cancellation_date ? new Date(item.cancellation_date).toLocaleDateString('en-GB') :
                (item.requisitionDate ? new Date(item.requisitionDate).toLocaleDateString('en-GB') :
                  new Date().toLocaleDateString('en-GB'))),
            requestDate: item.cancellationDate ? new Date(item.cancellationDate).toLocaleDateString('en-GB') :
              (item.cancellation_date ? new Date(item.cancellation_date).toLocaleDateString('en-GB') :
                (item.requisitionDate ? new Date(item.requisitionDate).toLocaleDateString('en-GB') :
                  new Date().toLocaleDateString('en-GB'))),
            distilleryName: item.branchName || item.branch_name || item.distilleryName || item.distillery_name || 'N/A',
            status: item.status || 'CancellationPending',
            amount: (item.totalCancellationAmount || item.total_cancellation_amount || item.cancellationBrAmount || item.cancellation_br_amount || '0.00').toString(),
            priority: this.determinePriority(item),
            cancellationReason: item.reasonForCancellation || item.reason_for_cancellation || 'Cancellation Request',
            licenseType: item.licenseType || item.license_type || 'Import Permit',
            allowedActions: item.allowedActions || item.allowed_actions || this.getDefaultActions(item.status)
          };

          // Check if this cancellation was approved locally and override status
          const storedStatus = mappedItem.id ? this.getStoredStatus(mappedItem.id) : null;
          if (storedStatus) {
            console.log(`Applying stored status for ${mappedItem.id}: ${storedStatus}`);
            mappedItem.status = storedStatus;
            mappedItem.allowedActions = []; // Clear actions for approved items
          }

          console.log(`Mapped item ${index}:`, mappedItem);
          return mappedItem;
        });

        console.log('Final mapped cancellation data:', this.cancellationData);

        // Check for duplicate IDs
        const ids = this.cancellationData.map(item => item.id);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          console.warn('Duplicate IDs found:', duplicateIds);
        }

        this.applyCancellationFilters();
      },
      error: (err) => {
        console.error('Error fetching cancellations', err);

        // Fallback to sample data for development
        console.log('Using fallback sample data');
        this.loadSampleCancellationData();
      }
    });
  }

  private determinePriority(item: any): string {
    const status = item.status?.toUpperCase();
    const amount = parseFloat(item.totalCancellationAmount || item.total_cancellation_amount || '0');

    if (status?.includes('URGENT') || amount > 50000) {
      return 'urgent';
    } else if (status?.includes('HIGH') || amount > 20000) {
      return 'high';
    } else {
      return 'normal';
    }
  }

  private getDefaultActions(status: string): string[] {
    const statusUpper = status?.toUpperCase();

    if (statusUpper?.includes('APPROVED') || statusUpper?.includes('REJECTED')) {
      return []; // No actions for completed items
    } else if (statusUpper?.includes('PENDING') || statusUpper?.includes('PROCESSING') || statusUpper === 'FORWARDEDCANCELLATIONTOCOMMISSIONER' || !status) {
      return ['APPROVE', 'REJECT']; // Default actions for pending items
    } else {
      return [];
    }
  }

  private loadSampleCancellationData(): void {
    // Keep existing sample data as fallback with unique IDs
    this.cancellationData = [
      {
        id: 'sample-1-' + Date.now(),
        referenceNo: "CAN/001/2025",
        submissionDate: "20-Sep-2025",
        requestDate: "20-Sep-2025",
        distilleryName: "Sikkim Distilleries Ltd",
        status: "CancellationPending",
        amount: "15.00",
        priority: "high",
        cancellationReason: "Business Closure",
        licenseType: "Manufacturing License",
        allowedActions: ['APPROVE', 'REJECT']
      },
      {
        id: 'sample-2-' + Date.now(),
        referenceNo: "CAN/002/2025",
        submissionDate: "19-Sep-2025",
        requestDate: "19-Sep-2025",
        distilleryName: "Darjeeling Artisan Pvt Ltd",
        status: "ApprovedCancellationByCommissioner",
        amount: "20.00",
        priority: "normal",
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
    let filtered = [...this.cancellationData];

    // Date filter
    if (this.cancellationDateFilter) {
      const filterDate = new Date(this.cancellationDateFilter);
      filtered = filtered.filter(item => {
        const itemDate = this.parseDate(item.submissionDate);
        return itemDate.toDateString() === filterDate.toDateString();
      });
    }

    // Status filter
    if (this.cancellationStatusFilter) {
      filtered = filtered.filter(item => {
        const itemStatus = item.status?.toUpperCase();
        const filterStatus = this.cancellationStatusFilter.toUpperCase();

        // Handle different status variations
        if (filterStatus === 'PENDING') {
          return itemStatus === 'PENDING' ||
            itemStatus === 'CANCELLATIONPENDING' ||
            itemStatus === 'FORWARDEDCANCELLATIONTOCOMMISSIONER';
        } else if (filterStatus === 'APPROVED') {
          return itemStatus === 'APPROVED' || itemStatus === 'APPROVEDCANCELLATIONBYCOMMISSIONER';
        } else if (filterStatus === 'REJECTED') {
          return itemStatus === 'REJECTED' || itemStatus === 'REJECTEDCANCELLATIONBYCOMMISSIONER';
        } else {
          return itemStatus === filterStatus;
        }
      });
    }

    // Reason filter
    if (this.cancellationReasonFilter) {
      filtered = filtered.filter(item =>
        item.cancellationReason === this.cancellationReasonFilter
      );
    }

    this.filteredCancellationData = filtered;
    this.resetPagination();
  }

  clearCancellationFilters(): void {
    this.cancellationDateFilter = '';
    this.cancellationStatusFilter = '';
    this.cancellationReasonFilter = '';
    this.applyCancellationFilters();
  }

  onCancellationDateFilterChange(): void {
    this.applyCancellationFilters();
  }

  onCancellationStatusFilterChange(): void {
    this.applyCancellationFilters();
  }

  onCancellationReasonFilterChange(): void {
    this.applyCancellationFilters();
  }

  // Summary methods
  getCancellationStatusCount(status: string): number {
    if (status === 'PENDING') {
      return this.filteredCancellationData.filter(item =>
        item.status === 'PENDING' || item.status === 'CancellationPending'
      ).length;
    } else if (status === 'APPROVED') {
      return this.filteredCancellationData.filter(item =>
        item.status === 'APPROVED' ||
        item.status === 'ApprovedCancellationByCommissioner' ||
        item.status?.toUpperCase().includes('APPROVED')
      ).length;
    } else if (status === 'REJECTED') {
      return this.filteredCancellationData.filter(item =>
        item.status === 'REJECTED' ||
        item.status === 'RejectedCancellationByCommissioner' ||
        item.status?.toUpperCase().includes('REJECTED')
      ).length;
    }
    return this.filteredCancellationData.filter(item => item.status === status).length;
  }

  getUrgentCancellationCount(): number {
    return this.filteredCancellationData.filter(item =>
      item.priority === 'urgent' || item.cancellationReason === 'Non-Compliance' || item.cancellationReason === 'Regulatory Violation'
    ).length;
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
    const itemStatus = item.status?.toUpperCase();
    let action: 'APPROVE' | 'ApprovePayslip' = 'APPROVE';
    let targetStatus = 'ApprovedCancellationByCommissioner';

    if (itemStatus === 'FORWARDEDCANCELLATIONPAYSLIPTOCOMMISSIONER') {
      action = 'ApprovePayslip';
      targetStatus = 'ApprovedCancellationPaySLipByCommissioner';
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
      this.cancellationData[index].status = 'RejectedCancellationByCommissioner';
      this.cancellationData[index].allowedActions = [];
    }

    if (filteredIndex !== -1) {
      this.filteredCancellationData[filteredIndex].status = 'RejectedCancellationByCommissioner';
      this.filteredCancellationData[filteredIndex].allowedActions = [];
    }

    // Force UI refresh immediately
    // Determine action based on status
    const itemStatus = item.status?.toUpperCase();
    let action: 'REJECT' | 'RejectPayslip' = 'REJECT';
    let targetStatus = 'RejectedCancellationByCommissioner';

    if (itemStatus === 'FORWARDEDCANCELLATIONPAYSLIPTOCOMMISSIONER') {
      action = 'RejectPayslip';
      targetStatus = 'RejectedCancellationPaySlipByCommissioner';
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
              this.cancellationData[index].status = 'RejectedCancellationByCommissioner';
              this.cancellationData[index].allowedActions = [];
            }

            if (filteredIndex !== -1) {
              this.filteredCancellationData[filteredIndex].status = 'RejectedCancellationByCommissioner';
              this.filteredCancellationData[filteredIndex].allowedActions = [];
            }

            if (item.id) {
              this.storeApprovedCancellation(item.id, 'RejectedCancellationByCommissioner');
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
    switch (status?.toUpperCase()) {
      case 'PENDING':
      case 'CANCELLATIONPENDING':
      case 'FORWARDEDCANCELLATIONTOCOMMISSIONER':
        return 'pending';
      case 'APPROVED':
      case 'APPROVEDCANCELLATIONBYCOMMISSIONER':
        return 'approved';
      case 'REJECTED':
      case 'REJECTEDCANCELLATIONBYCOMMISSIONER':
        return 'rejected';
      case 'PROCESSING':
        return 'processing';
      case 'EXPIRED':
        return 'expired';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return 'default';
    }
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

    const status = item.status?.toUpperCase();

    // Check if already processed locally
    if (item.id && this.isApprovedInStorage(item.id)) {
      return false; // Don't show buttons if already processed locally
    }

    // Don't show buttons if already approved or rejected (Fallback)
    if (status?.includes('APPROVED') || status?.includes('REJECTED')) {
      return false;
    }

    // Fallback: Only show if user is commissioner and status allows actions
    return this.isCommissioner() && (
      status === 'PENDING' ||
      status === 'CANCELLATIONPENDING' ||
      status === 'FORWARDEDCANCELLATIONTOCOMMISSIONER' ||
      status === 'FORWARDEDCANCELLATIONPAYSLIPTOCOMMISSIONER' || // Enable for payment slip review
      status === 'PROCESSING' ||
      !status || // Handle cases where status might be undefined
      status === 'SUBMITTED'
    );
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
    const status = item.status?.toUpperCase();

    // Check if approved locally first
    const storedStatus = item.id ? this.getStoredStatus(item.id) : null;
    const isApprovedLocally = storedStatus?.toUpperCase().includes('APPROVED') || false;

    // Must be approved (either from API or locally stored) and user must be commissioner
    const isApproved = status?.includes('APPROVED') ||
      status === 'APPROVEDCANCELLATIONBYCOMMISSIONER' ||
      isApprovedLocally;
    const isCommissioner = this.isCommissioner();
    const hasId = !!item.id;

    return isApproved && isCommissioner && hasId;
  }

  canPay(item: TableData): boolean {
    const status = item.status?.toUpperCase();
    const isApproved = status?.includes('APPROVED') || status === 'APPROVEDCANCELLATIONBYCOMMISSIONER';
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
    // Handle DD-MM-YYYY format (common in the app)
    const parts = dateString.split('-');
    if (parts.length === 3) {
      // Assuming DD-MM-YYYY format
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    // Fallback to standard Date parsing
    return new Date(dateString);
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
    const hasRole = this.accountService.hasAnyRole(['level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'site_admin']);
    const isCommissionerRoute = this.isBrowser && window.location.pathname.includes('commissioner');
    return hasRole || isCommissionerRoute;
  }

  isPermitSection(): boolean {
    return this.isBrowser && (window.location.pathname.includes('permit-section') || window.location.pathname.includes('app-permit-section'));
  }

  getUserType(): 'commissioner' | 'permit-section' | 'licensee' {
    if (this.isCommissioner()) return 'commissioner';
    if (this.isPermitSection()) return 'permit-section';
    return 'licensee';
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

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="bi ${this.getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;

    // Add styles
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

    // Add to body
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
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
}