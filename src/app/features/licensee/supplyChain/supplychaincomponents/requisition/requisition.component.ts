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

interface TableData {
  id?: number;
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  commissionerStatus?: string;
  forwardedToCommissioner?: boolean;
  canCancel?: boolean;
  allowedActions?: string[];
  quantity?: number;
  numberOfPermits?: number;
  bulkSpiritType?: string;
  strengthTo?: string;
  liftedFrom?: string;
  viaRoute?: string;
  checkpostEntry?: string;
  purpose?: string;
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

    this.enaRequisitionService.getRequisitions().subscribe({
      next: (response: any) => {
        console.log('DEBUG: Raw requisition response:', response);

        // Handle both array response and paginated response
        let data = response;
        if (response && !Array.isArray(response) && response.results) {
          data = response.results;
        }

        this.requisitionData = (data || []).map((item: any) => {
          // Format date properly
          const dateVal = item.submissionDate || item.submission_date || item.date;
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
            referenceNo: item.ourRefNo || item.our_ref_no || item.referenceNo || item.ref_no || `REQ-${item.id}`,
            submissionDate: formattedDate,
            distilleryName: item.distilleryName || item.distillery_name || item.manufacturingUnit || 'N/A',
            status: item.status || 'PENDING',
            amount: item.amount || item.totalAmount || item.total_amount || '0.00',
            commissionerStatus: item.commissionerStatus || item.commissioner_status,
            forwardedToCommissioner: item.forwardedToCommissioner || item.forwarded_to_commissioner || false,
            canCancel: item.canCancel || item.can_cancel || false,
            allowedActions: item.allowedActions || item.allowed_actions || [],
            // Additional properties that might be needed
            quantity: item.quantity || item.totalQuantity || item.total_quantity,
            numberOfPermits: item.numberOfPermits || item.number_of_permits || 1,
            bulkSpiritType: item.bulkSpiritType || item.bulk_spirit_type,
            strengthTo: item.strengthTo || item.strength_to,
            liftedFrom: item.liftedFrom || item.lifted_from,
            viaRoute: item.viaRoute || item.via_route,
            checkpostEntry: item.checkpostEntry || item.checkpost_entry,
            purpose: item.purpose
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
    return this.accountService.hasAnyRole('permit-section');
  }

  approveRequisition(item: TableData): void {
    if (!item.id) {
      alert('Item ID is required');
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

  viewRequisitionApplication(item: TableData): void {
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id: item.id,
        ref: item.referenceNo,
        type: 'requisition',
        source: 'licensee'
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