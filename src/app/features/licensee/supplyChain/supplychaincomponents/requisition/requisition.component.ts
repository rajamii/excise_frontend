import { Component, OnInit, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../../../../core/services/account.service';

interface TableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
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
    this.filteredRequisitionData = [...this.requisitionData];
  }

  navigateTo(route: string){
        this.router.navigate(["/dev-import-permit"]);
        
    }
  
  private loadRequisitionData(): void {
    if (!this.isBrowser) {
      return;
    }

    // Load import permit requests from localStorage
    const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');

    // Sort by submission time (newest first)
    importPermitRequests.sort((a: any, b: any) => {
      const dateA = new Date(a.submittedAt || a.date).getTime();
      const dateB = new Date(b.submittedAt || b.date).getTime();
      return dateB - dateA;
    });

    // Filter based on user role
    let filteredRequests = importPermitRequests.filter((permit: any) => permit.type !== 'transit-permit');
    
    // Commissioner should only see requisitions that have been explicitly forwarded to them
    // Requisitions must go through a workflow before reaching commissioner
    if (this.isCommissioner()) {
      console.log('🔍 Commissioner filter - Before filtering:', filteredRequests.length, 'requisitions');
      console.log('📋 All requisitions:', filteredRequests.map((p: any) => ({
        refNo: p.refNo,
        commissionerStatus: p.commissionerStatus,
        forwardedToCommissioner: p.forwardedToCommissioner
      })));
      
      filteredRequests = filteredRequests.filter((permit: any) => {
        // STRICT: Only show if explicitly marked for commissioner review
        // This ensures new requisitions don't appear immediately
        const hasCommissionerStatus = permit.commissionerStatus && 
                                      (permit.commissionerStatus === 'Pending' ||
                                       permit.commissionerStatus === 'Approved' ||
                                       permit.commissionerStatus === 'Rejected');
        
        const isForwardedToCommissioner = permit.forwardedToCommissioner === true;
        
        const shouldShow = hasCommissionerStatus || isForwardedToCommissioner;
        
        console.log(`  ${permit.refNo}: commissionerStatus=${permit.commissionerStatus}, forwarded=${permit.forwardedToCommissioner}, show=${shouldShow}`);
        
        // Must have at least one of these flags set
        return shouldShow;
      });
      
      console.log('✅ Commissioner view - After filtering:', filteredRequests.length, 'requisitions');
    }

    // Convert import permit data to requisition format
    const importPermitData: TableData[] = filteredRequests.map((permit: any) => {
      // Determine status based on workflow
      let displayStatus = permit.commissionerStatus || "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.";
      
      // If forwarded to commissioner but not yet approved/rejected, show "Forwarded to Commissioner"
      if (permit.forwardedToCommissioner && permit.commissionerStatus === 'PENDING') {
        displayStatus = 'Forwarded to Commissioner';
      }
      
      // If approved by commissioner, show "Approved by Commissioner"
      // Check if it was forwarded and approved (approvedBy field may or may not exist)
      if (permit.commissionerStatus === 'APPROVED' && permit.forwardedToCommissioner) {
        displayStatus = 'Approved by Commissioner';
      }
      
      return {
        referenceNo: permit.refNo,
        submissionDate: new Date(permit.date).toLocaleDateString('en-GB'),
        distilleryName: this.getDistilleryDisplayName(permit.liftedFrom),
        status: displayStatus,
        amount: "8.00"
      };
    });

    // Only use real data from localStorage
    this.requisitionData = [...importPermitData];
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
    const submissionDate = new Date(item.submissionDate.split('-').reverse().join('-'));
    const daysSinceSubmission = Math.floor((new Date().getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (item.status === 'PENDING' && daysSinceSubmission > 7) {
      return 'urgent';
    } else if (item.status === 'PENDING' && daysSinceSubmission > 3) {
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

      const dateParts = item.submissionDate.split('-');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0]);
        const monthName = dateParts[1];
        const year = parseInt(dateParts[2]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.indexOf(monthName) + 1;

        if (month > 0) {
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

  // Clear all requisition data
  clearAllRequisitionData(): void {
    if (!this.isBrowser) {
      return;
    }

    if (confirm('Are you sure you want to clear all requisition data? This action cannot be undone.')) {
      // Clear import permit requests from localStorage
      localStorage.removeItem('importPermitRequests');
      
      // Reload the data
      this.requisitionData = [];
      this.filteredRequisitionData = [];
      
      alert('All requisition data has been cleared successfully.');
    }
  }

  // Role detection methods
  isCommissioner(): boolean {
    // Check if user has commissioner role
    const hasRole = this.accountService.hasAnyRole(['level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'site_admin']);
    
    // Also check if we're in the commissioner dashboard (for testing/demo purposes)
    const isCommissionerRoute = this.isBrowser && window.location.pathname.includes('commissioner');
    
    const result = hasRole || isCommissionerRoute;
    console.log('isCommissioner check:', { hasRole, isCommissionerRoute, result, path: window.location.pathname });
    
    return result;
  }

  isPermitSection(): boolean {
    // Check if we're in the permit section dashboard
    // Check for both 'permit-section' and 'app-permit-section' in the URL
    const result = this.isBrowser && (window.location.pathname.includes('permit-section') || window.location.pathname.includes('app-permit-section'));
    console.log('isPermitSection check:', { result, path: this.isBrowser ? window.location.pathname : 'SSR', href: this.isBrowser ? window.location.href : 'SSR' });
    return result;
  }

  getUserType(): 'commissioner' | 'permit-section' | 'licensee' {
    if (this.isCommissioner()) return 'commissioner';
    if (this.isPermitSection()) return 'permit-section';
    return 'licensee';
  }

  approveRequisition(item: TableData): void {
    if (confirm(`Are you sure you want to approve requisition ${item.referenceNo}?`)) {
      console.log('Approving requisition:', item.referenceNo);
      
      if (!this.isBrowser) return;
      
      // Update in localStorage
      const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
      const index = importPermitRequests.findIndex((r: any) => r.refNo === item.referenceNo);
      
      if (index !== -1) {
        importPermitRequests[index].commissionerStatus = 'APPROVED';
        importPermitRequests[index].approvedDate = new Date().toISOString();
        importPermitRequests[index].approvedBy = 'Commissioner';
        localStorage.setItem('importPermitRequests', JSON.stringify(importPermitRequests));
        
        alert(`Requisition ${item.referenceNo} has been approved successfully. Licensee can now proceed with payment.`);
        this.loadRequisitionData();
        this.filteredRequisitionData = [...this.requisitionData];
      }
    }
  }

  rejectRequisition(item: TableData): void {
    const reason = prompt(`Please provide a reason for rejecting requisition ${item.referenceNo}:`);
    if (reason !== null && reason.trim() !== '') {
      console.log('Rejecting requisition:', item.referenceNo, 'Reason:', reason);
      
      if (!this.isBrowser) return;
      
      // Update in localStorage
      const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
      const index = importPermitRequests.findIndex((r: any) => r.refNo === item.referenceNo);
      
      if (index !== -1) {
        importPermitRequests[index].commissionerStatus = 'REJECTED';
        importPermitRequests[index].rejectionReason = reason;
        localStorage.setItem('importPermitRequests', JSON.stringify(importPermitRequests));
        
        alert(`Requisition ${item.referenceNo} has been rejected.`);
        this.loadRequisitionData();
        this.filteredRequisitionData = [...this.requisitionData];
      }
    }
  }

  // Permit Section: Forward to Commissioner
  forwardToCommissioner(item: TableData): void {
    if (confirm(`Forward requisition ${item.referenceNo} to Commissioner for approval?`)) {
      console.log('Forwarding to commissioner:', item.referenceNo);
      
      if (!this.isBrowser) return;
      
      // Update in localStorage
      const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
      const index = importPermitRequests.findIndex((r: any) => r.refNo === item.referenceNo);
      
      if (index !== -1) {
        importPermitRequests[index].forwardedToCommissioner = true;
        importPermitRequests[index].commissionerStatus = 'PENDING';
        importPermitRequests[index].forwardedDate = new Date().toISOString();
        localStorage.setItem('importPermitRequests', JSON.stringify(importPermitRequests));
        
        alert(`Requisition ${item.referenceNo} has been forwarded to Commissioner for approval.`);
        this.loadRequisitionData();
        this.filteredRequisitionData = [...this.requisitionData];
      }
    }
  }

  isForwardedToCommissioner(item: TableData): boolean {
    if (!this.isBrowser) return false;
    
    const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
    const permit = importPermitRequests.find((r: any) => r.refNo === item.referenceNo);
    
    const isForwarded = permit?.forwardedToCommissioner === true || permit?.commissionerStatus === 'PENDING';
    console.log(`isForwardedToCommissioner(${item.referenceNo}):`, { isForwarded, forwardedFlag: permit?.forwardedToCommissioner, status: permit?.commissionerStatus });
    
    return isForwarded;
  }

  // Check if requisition is pending commissioner approval
  isPendingCommissionerApproval(item: TableData): boolean {
    if (!this.isBrowser) return false;
    
    const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
    const permit = importPermitRequests.find((r: any) => r.refNo === item.referenceNo);
    
    return permit?.commissionerStatus === 'PENDING' && permit?.forwardedToCommissioner === true;
  }

  // Supply Chain: Make Payment
  payForRequisition(item: TableData): void {
    if (confirm(`Proceed to payment for requisition ${item.referenceNo}? Amount: ₹${item.amount}`)) {
      console.log('Processing payment for:', item.referenceNo);
      
      // TODO: Implement payment gateway integration
      alert(`Payment processing for requisition ${item.referenceNo}. Amount: ₹${item.amount}`);
      
      // Navigate to payment page or open payment modal
      // this.router.navigate(['/payment'], { queryParams: { ref: item.referenceNo, amount: item.amount } });
    }
  }
}
