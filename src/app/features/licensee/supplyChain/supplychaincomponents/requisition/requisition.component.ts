import { Component, OnInit, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../../../../core/services/account.service';
import { EnaRequisitionService } from '../../../../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../services/supplychain.service';
import { CancellationRequestComponent } from '../../cancellation-request/cancellation-request.component';

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
  allowedActions?: string[]; // Dynamic actions from backend
}

@Component({
  selector: 'app-requisition',
  standalone: true,
  imports: [CommonModule, FormsModule, CancellationRequestComponent],
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

  // Data
  requisitionData: TableData[] = [];
  filteredRequisitionData: TableData[] = [];

  // Filter properties
  requisitionDateFilter: string = '';
  requisitionMonthFilter: string = '';
  requisitionYearFilter: string = '';
  requisitionStatusFilter: string = '';

  // Cancellation Modal State
  isCancellationModalOpen: boolean = false;
  selectedRequisitionRef: string = '';

  // Pagination
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadRequisitionData();
  }

  navigateTo(route: string){
        this.router.navigate(["/dev-import-permit"]);  
    }
  
  private loadRequisitionData(): void {
    if (!this.isBrowser) {
      return;
    }

    this.enaRequisitionService.getRequisitions().subscribe({
      next: (data: any[]) => {
        console.log('Raw backend data:', data); // Debug log
        
        // Sort by submission time (newest first)
        data.sort((a: any, b: any) => {
          const dateA = new Date(a.requisitionDate || a.requisition_date || a.createdAt || a.created_at).getTime();
          const dateB = new Date(b.requisitionDate || b.requisition_date || b.createdAt || b.created_at).getTime();
          return dateB - dateA;
        });

        // Map backend data to TableData
        const mappedData: TableData[] = data.map((item: any) => {
          const refNo = item.ourRefNo || item.our_ref_no || 'N/A';
          const reqDate = item.requisitionDate || item.requisition_date;
          const distilleryName = item.liftedFromDistilleryName || item.lifted_from_distillery_name || 
                                 item.liftedFrom || item.lifted_from || 'Unknown';
          const status = item.status || 'Pending';
          const amount = item.totalbl || item.totalBl || item.brAmount || item.br_amount || '0.00';
          
          // Map allowed actions from backend
          const allowedActions = item.allowedActions || item.allowed_actions || [];

          return {
            id: item.id,
            referenceNo: refNo,
            submissionDate: reqDate ? new Date(reqDate).toLocaleDateString('en-GB') : 'Invalid Date',
            distilleryName: distilleryName,
            status: status,
            amount: typeof amount === 'number' ? amount.toString() : amount,
            commissionerStatus: status,
            forwardedToCommissioner: true,
            allowedActions: allowedActions,
            canCancel: item.canInitiateCancellation || item.can_initiate_cancellation || false
          };
        });

        this.requisitionData = mappedData;
        this.applyRequisitionFilters();
      },
      error: (error) => {
        console.error('Error fetching requisitions:', error);
      }
    });
  }

  private getDistilleryDisplayName(value: string): string {
    const map: { [key: string]: string } = {
      'sikkim-distilleries': 'Sikkim Distilleries Ltd',
      'mountain-spirits': 'Mountain Spirits Pvt Ltd',
      'highland-breweries': 'Highland Breweries',
      'gangtok': 'Gangtok Depot',
      'namchi': 'Namchi Depot',
      'gyalshing': 'Gyalshing Depot',
      'mangan': 'Mangan Depot'
    };
    return map[value] || value || 'Unknown Distillery';
  }

  // Summary methods
  getTotalRequisitionAmount(): number {
    return this.filteredRequisitionData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }

  getRequisitionStatusCount(status: string): number {
    const targetStatus = status.toUpperCase();
    
    // Strict check for APPROVED to avoid counting 'ApprovedByCommissioner'
    if (targetStatus === 'APPROVED') {
      return this.filteredRequisitionData.filter(item =>
        item.status.toUpperCase() === 'APPROVED'
      ).length;
    }

    if (targetStatus === 'PENDING' || targetStatus === 'REJECTED') {
      return this.filteredRequisitionData.filter(item =>
        item.status.toUpperCase() === targetStatus
      ).length;
    }
    
    return this.filteredRequisitionData.filter(item =>
      item.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  getPriority(item: TableData): string {
    const submissionDate = new Date(item.submissionDate.split('/').reverse().join('-'));
    const daysSinceSubmission = Math.floor((new Date().getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (item.status.toUpperCase() === 'PENDING' && daysSinceSubmission > 7) {
      return 'urgent';
    } else if (item.status.toUpperCase() === 'PENDING' && daysSinceSubmission > 3) {
      return 'high';
    }
    return 'normal';
  }

  // Filter methods
  applyRequisitionFilters(): void {
    this.filteredRequisitionData = this.requisitionData.filter(item => {
      let matchesDate = true;
      let matchesMonth = true;
      let matchesYear = true;
      let matchesStatus = true;

      const dateParts = item.submissionDate.split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const year = parseInt(dateParts[2]);
        const itemDate = new Date(year, month - 1, day);

        if (this.requisitionDateFilter) {
          const filterDate = new Date(this.requisitionDateFilter);
          matchesDate = itemDate.getFullYear() === filterDate.getFullYear() &&
            itemDate.getMonth() === filterDate.getMonth() &&
            itemDate.getDate() === filterDate.getDate();
        }

        if (this.requisitionMonthFilter) {
          const filterDate = new Date(this.requisitionMonthFilter + '-01');
          matchesMonth = itemDate.getFullYear() === filterDate.getFullYear() &&
            itemDate.getMonth() === filterDate.getMonth();
        }

        if (this.requisitionYearFilter) {
          const filterYear = parseInt(this.requisitionYearFilter);
          matchesYear = itemDate.getFullYear() === filterYear;
        }
      }

      if (this.requisitionStatusFilter) {
        matchesStatus = item.status.toLowerCase().includes(this.requisitionStatusFilter.toLowerCase());
      }

      return matchesDate && matchesMonth && matchesYear && matchesStatus;
    });

    this.currentPage = 1;
  }

  clearRequisitionFilters(): void {
    this.requisitionDateFilter = '';
    this.requisitionMonthFilter = '';
    this.requisitionYearFilter = '';
    this.requisitionStatusFilter = '';
    this.filteredRequisitionData = [...this.requisitionData];
    this.currentPage = 1;
  }

  onRequisitionDateFilterChange(): void {
    this.applyRequisitionFilters();
  }

  onRequisitionMonthFilterChange(): void {
    this.applyRequisitionFilters();
  }

  onRequisitionYearFilterChange(): void {
    this.applyRequisitionFilters();
  }

  onRequisitionStatusFilterChange(): void {
    this.applyRequisitionFilters();
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequisitionData.length / this.pageSize));
  }

  getPaged(): TableData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRequisitionData.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const total = this.getTotalPages();
    if (page < 1 || page > total) return;
    this.currentPage = page;
  }

  changePageSize(size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSize = s;
    this.currentPage = 1;
  }

  // Navigation methods
  viewRequisitionApplication(item: TableData): void {
    this.router.navigate(["/dev-supply-chain-application-view"], {
      queryParams: { ref: item.referenceNo }
    });
  }

  viewSlip(item: TableData): void {
    this.router.navigate(["/dev-final-requisition-letters"], {
      queryParams: {
        ref: item.referenceNo,
      },
    });
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

  // Workflow actions
  approveRequisition(item: TableData): void {
    if (!(item as any).id) {
      console.error('Requisition ID not found');
      return;
    }

    this.enaRequisitionService.performAction((item as any).id, 'APPROVE').subscribe({
      next: (response) => {
        alert(`Action successful! Status updated to: ${response.data.status}`);
        this.loadRequisitionData(); // Reload data
      },
      error: (error) => {
        console.error('Error performing action:', error);
        alert('Failed to perform action. ' + (error.error?.message || ''));
      }
    });
  }

  rejectRequisition(item: TableData): void {
    if (!(item as any).id) {
      console.error('Requisition ID not found');
      return;
    }

    this.enaRequisitionService.performAction((item as any).id, 'REJECT').subscribe({
      next: (response) => {
        alert(`Action successful! Status updated to: ${response.data.status}`);
        this.loadRequisitionData(); // Reload data
      },
      error: (error) => {
        console.error('Error performing action:', error);
        alert('Failed to perform action. ' + (error.error?.message || ''));
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
    // Fully dynamic check!
    // We just check if 'APPROVE' is in the allowed actions list returned by backend.
    if (item.allowedActions && item.allowedActions.includes('APPROVE')) {
      return true;
    }
    return false;
  }

  canReject(item: TableData): boolean {
    // Check if 'REJECT' is in the allowed actions list
    if (item.allowedActions && item.allowedActions.includes('REJECT')) {
      return true;
    }
    return false;
  }

  // Deprecated: Use canPerformAction instead
  isPendingCommissionerApproval(item: TableData): boolean {
    return this.canPerformAction(item);
  }

  payForRequisition(item: TableData): void {
    if (!(item as any).id) {
      console.error('Requisition ID not found');
      return;
    }

    // For licensee, "Pay" button means they're submitting payment slip
    // This triggers the transition from ApprovedByCommissioner -> ForwardedPaySLipToPermitSection
    this.enaRequisitionService.performAction((item as any).id, 'APPROVE').subscribe({
      next: (response) => {
        alert(`Payment slip submitted successfully! Status updated to: ${response.data.status}`);
        this.loadRequisitionData(); // Reload data
      },
      error: (error) => {
        console.error('Error submitting payment slip:', error);
        alert('Failed to submit payment slip. ' + (error.error?.message || ''));
      }
    });
  }
  
  clearAllRequisitionData(): void {
      alert('Clear data functionality is disabled for backend data.');
  }

  requestCancellation(item: TableData): void {
    if (!item.referenceNo) return;
    this.openCancellationModal(item);
  }

  openCancellationModal(item: TableData) {
    console.log('Opening Cancellation Modal for:', item.referenceNo);
    this.selectedRequisitionRef = item.referenceNo;
    this.isCancellationModalOpen = true;
  }

  closeCancellationModal() {
    this.isCancellationModalOpen = false;
    this.selectedRequisitionRef = '';
    // Refresh data in case cancellation was submitted
    this.loadRequisitionData();
  }
}
