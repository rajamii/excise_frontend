import { Component, OnInit, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../../../../core/services/account.service';
import { EnaRequisitionService } from '../../../../../core/services/ena-requisition.service';

interface TableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  // Additional fields for workflow logic if available from backend
  commissionerStatus?: string;
  forwardedToCommissioner?: boolean;
}

@Component({
  selector: 'app-requisition',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // Data
  requisitionData: TableData[] = [];
  filteredRequisitionData: TableData[] = [];

  // Filter properties
  requisitionDateFilter: string = '';
  requisitionMonthFilter: string = '';
  requisitionYearFilter: string = '';
  requisitionStatusFilter: string = '';

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
        // Sort by submission time (newest first) - assuming created_at or requisition_date
        data.sort((a: any, b: any) => {
          const dateA = new Date(a.requisition_date || a.created_at).getTime();
          const dateB = new Date(b.requisition_date || b.created_at).getTime();
          return dateB - dateA;
        });

        // Map backend data to TableData
        const mappedData: TableData[] = data.map((item: any) => {
          return {
            referenceNo: item.our_ref_no,
            submissionDate: new Date(item.requisition_date).toLocaleDateString('en-GB'),
            distilleryName: item.lifted_from_distillery_name || item.lifted_from || 'Unknown',
            status: item.status || 'Pending',
            amount: item.totalbl || item.br_amount || '0.00',
            commissionerStatus: item.status, // Mapping status to commissionerStatus for now
            forwardedToCommissioner: true // Assuming all are forwarded for now or need backend field
          };
        });

        this.requisitionData = mappedData;
        this.applyRequisitionFilters(); // Apply initial filters (which sets filteredRequisitionData)
      },
      error: (error) => {
        console.error('Error fetching requisitions:', error);
        // Handle error (e.g., show toast)
      }
    });
  }

  private getDistilleryDisplayName(value: string): string {
    // This might not be needed if backend returns full name, but keeping for safety
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
    if (status === 'PENDING' || status === 'REJECTED') {
      // For commissioner view, match exact status
      return this.filteredRequisitionData.filter(item =>
        item.status.toUpperCase() === status
      ).length;
    }
    // For other statuses, use includes for backward compatibility
    return this.filteredRequisitionData.filter(item =>
      item.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  getPriority(item: TableData): string {
    // Determine priority based on status and submission date
    const submissionDate = new Date(item.submissionDate.split('/').reverse().join('-')); // Changed split to '/' for en-GB
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

      // Parse DD/MM/YYYY
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

  // Workflow actions - Placeholder for now as backend integration for these actions is pending
  approveRequisition(item: TableData): void {
    alert('Approve functionality not yet connected to backend.');
  }

  rejectRequisition(item: TableData): void {
    alert('Reject functionality not yet connected to backend.');
  }

  forwardToCommissioner(item: TableData): void {
    alert('Forward functionality not yet connected to backend.');
  }

  isForwardedToCommissioner(item: TableData): boolean {
    return !!item.forwardedToCommissioner;
  }

  isPendingCommissionerApproval(item: TableData): boolean {
    return item.status === 'pending' || item.status === 'Pending';
  }

  payForRequisition(item: TableData): void {
    alert(`Payment processing for requisition ${item.referenceNo}. Amount: ₹${item.amount}`);
  }
  
  clearAllRequisitionData(): void {
      alert('Clear data functionality is disabled for backend data.');
  }
}
