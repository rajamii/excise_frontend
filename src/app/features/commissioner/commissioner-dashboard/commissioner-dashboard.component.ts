import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";

interface CommissionerTableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  priority?: string;
  expiryDate?: string;
  isExpired?: boolean;
  daysLeft?: number;
}

@Component({
  selector: "app-commissioner-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./commissioner-dashboard.component.html",
  styleUrls: ["./commissioner-dashboard.component.scss"],
})
export class CommissionerDashboardComponent implements OnInit {
  Math = Math;
  activeTab = "revalidation"; // Start with revalidation tab as requested
  sidebarHidden = true;
  private isBrowser = false;

  // Filter properties for requisition
  requisitionDateFilter: string = '';
  requisitionStatusFilter: string = '';
  requisitionLicenseeFilter: string = '';
  
  // Filter properties for revalidation
  revalidationDateFilter: string = '';
  revalidationStatusFilter: string = '';
  revalidationPriorityFilter: string = '';

  // Filtered data arrays
  filteredRequisitionData: CommissionerTableData[] = [];
  filteredRevalidationData: CommissionerTableData[] = [];

  // Modal properties
  showReviewModal = false;
  selectedApplication: CommissionerTableData | null = null;

  // Sample data for requisition applications (from commissioner's perspective)
  requisitionData: CommissionerTableData[] = [
    {
      referenceNo: "BF502/EXCISE",
      submissionDate: "22-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "PENDING",
      amount: "8.00",
      priority: "normal"
    },
    {
      referenceNo: "BF503/EXCISE",
      submissionDate: "21-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "PENDING",
      amount: "12.50",
      priority: "high"
    },
    {
      referenceNo: "BF504/EXCISE",
      submissionDate: "20-Sep-2025",
      distilleryName: "Royal Sikkim Brewery",
      status: "APPROVED",
      amount: "15.75",
      priority: "normal"
    },
    {
      referenceNo: "BF505/EXCISE",
      submissionDate: "19-Sep-2025",
      distilleryName: "Mountain View Distilleries",
      status: "PROCESSING",
      amount: "9.25",
      priority: "normal"
    },
    {
      referenceNo: "BF506/EXCISE",
      submissionDate: "18-Sep-2025",
      distilleryName: "Eastern Himalaya Distillery",
      status: "PENDING",
      amount: "11.00",
      priority: "urgent"
    }
  ];

  // Sample data for revalidation applications (from commissioner's perspective)
  revalidationData: CommissionerTableData[] = [
    {
      referenceNo: "REV/BF601",
      submissionDate: "18-Sep-2025",
      expiryDate: "25-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "PENDING",
      amount: "5.00",
      priority: "urgent",
      isExpired: false,
      daysLeft: 3
    },
    {
      referenceNo: "REV/BF602",
      submissionDate: "17-Sep-2025",
      expiryDate: "20-Sep-2025",
      distilleryName: "Royal Sikkim Brewery",
      status: "PENDING",
      amount: "7.50",
      priority: "urgent",
      isExpired: true,
      daysLeft: -2
    },
    {
      referenceNo: "REV/BF603",
      submissionDate: "16-Sep-2025",
      expiryDate: "30-Oct-2025",
      distilleryName: "Mountain View Distilleries",
      status: "APPROVED",
      amount: "6.25",
      priority: "normal",
      isExpired: false,
      daysLeft: 38
    },
    {
      referenceNo: "REV/BF604",
      submissionDate: "15-Sep-2025",
      expiryDate: "28-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "PENDING",
      amount: "8.00",
      priority: "high",
      isExpired: false,
      daysLeft: 6
    },
    {
      referenceNo: "REV/BF605",
      submissionDate: "14-Sep-2025",
      expiryDate: "18-Sep-2025",
      distilleryName: "Gangtok Premium Spirits",
      status: "REJECTED",
      amount: "4.50",
      priority: "urgent",
      isExpired: true,
      daysLeft: -4
    }
  ];

  // Pagination state per tab
  pageSizeOptions: number[] = [5, 10, 15];
  pageSizeByTab: Record<string, number> = {
    requisition: 5,
    revalidation: 5,
    cancellation: 5,
    transit: 5,
    hologram: 5,
  };
  currentPageByTab: Record<string, number> = {
    requisition: 1,
    revalidation: 1,
    cancellation: 1,
    transit: 1,
    hologram: 1,
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Initialize filtered data
    this.filteredRequisitionData = [...this.requisitionData];
    this.filteredRevalidationData = [...this.revalidationData];

    // Check for tab query parameter
    if (this.isBrowser) {
      const tab = this.route.snapshot.queryParamMap.get('tab');
      if (tab) {
        this.setActiveTab(tab);
      }
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden;
  }

  // Navigation methods
  navigateTo(route: string): void {
    switch (route) {
      case "requisition-review":
        this.setActiveTab('requisition');
        break;
      case "revalidation-review":
        this.setActiveTab('revalidation');
        break;
      case "cancellation-review":
        this.setActiveTab('cancellation');
        break;
      case "transit-review":
        this.setActiveTab('transit');
        break;
      case "monthly-report":
        // Navigate to monthly report page
        break;
      case "annual-report":
        // Navigate to annual report page
        break;
      case "compliance-report":
        // Navigate to compliance report page
        break;
      default:
        break;
    }
  }

  viewReports(): void {
    // Navigate to reports dashboard
    console.log('View Reports clicked');
  }

  // Status count methods
  getRequisitionStatusCount(status: string): number {
    return this.filteredRequisitionData.filter(item => item.status === status).length;
  }

  getRevalidationStatusCount(status: string): number {
    return this.filteredRevalidationData.filter(item => item.status === status).length;
  }

  getUrgentRevalidationCount(): number {
    return this.filteredRevalidationData.filter(item => 
      item.priority === 'urgent' || item.isExpired || (item.daysLeft !== undefined && item.daysLeft <= 7)
    ).length;
  }

  // Status class helper
  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'pending';
      case 'APPROVED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      case 'PROCESSING':
        return 'processing';
      case 'EXPIRED':
        return 'expired';
      default:
        return 'default';
    }
  }

  // Filter methods for requisition
  onRequisitionDateFilterChange(): void {
    this.applyRequisitionFilters();
  }

  onRequisitionStatusFilterChange(): void {
    this.applyRequisitionFilters();
  }

  onRequisitionLicenseeFilterChange(): void {
    this.applyRequisitionFilters();
  }

  clearRequisitionFilters(): void {
    this.requisitionDateFilter = '';
    this.requisitionStatusFilter = '';
    this.requisitionLicenseeFilter = '';
    this.applyRequisitionFilters();
  }

  private applyRequisitionFilters(): void {
    let filtered = [...this.requisitionData];

    if (this.requisitionDateFilter) {
      filtered = filtered.filter(item => {
        const itemDate = this.parseDate(item.submissionDate);
        const filterDate = new Date(this.requisitionDateFilter);
        return itemDate.toDateString() === filterDate.toDateString();
      });
    }

    if (this.requisitionStatusFilter) {
      filtered = filtered.filter(item => item.status === this.requisitionStatusFilter);
    }

    if (this.requisitionLicenseeFilter) {
      filtered = filtered.filter(item => item.distilleryName === this.requisitionLicenseeFilter);
    }

    this.filteredRequisitionData = filtered;
    this.resetPagination('requisition');
  }

  // Filter methods for revalidation
  onRevalidationDateFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationStatusFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationPriorityFilterChange(): void {
    this.applyRevalidationFilters();
  }

  clearRevalidationFilters(): void {
    this.revalidationDateFilter = '';
    this.revalidationStatusFilter = '';
    this.revalidationPriorityFilter = '';
    this.applyRevalidationFilters();
  }

  private applyRevalidationFilters(): void {
    let filtered = [...this.revalidationData];

    if (this.revalidationDateFilter) {
      filtered = filtered.filter(item => {
        const itemDate = this.parseDate(item.submissionDate);
        const filterDate = new Date(this.revalidationDateFilter);
        return itemDate.toDateString() === filterDate.toDateString();
      });
    }

    if (this.revalidationStatusFilter) {
      filtered = filtered.filter(item => item.status === this.revalidationStatusFilter);
    }

    if (this.revalidationPriorityFilter) {
      filtered = filtered.filter(item => item.priority === this.revalidationPriorityFilter);
    }

    this.filteredRevalidationData = filtered;
    this.resetPagination('revalidation');
  }

  // Utility method to parse date
  private parseDate(dateString: string): Date {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateString);
  }

  // Action methods
  reviewApplication(item: CommissionerTableData): void {
    this.selectedApplication = item;
    this.showReviewModal = true;
  }

  reviewRevalidation(item: CommissionerTableData): void {
    this.selectedApplication = item;
    this.showReviewModal = true;
  }

  approveApplication(item: CommissionerTableData): void {
    item.status = 'APPROVED';
    console.log('Approved application:', item.referenceNo);
  }

  rejectApplication(item: CommissionerTableData): void {
    item.status = 'REJECTED';
    console.log('Rejected application:', item.referenceNo);
  }

  approveRevalidation(item: CommissionerTableData): void {
    item.status = 'APPROVED';
    console.log('Approved revalidation:', item.referenceNo);
  }

  rejectRevalidation(item: CommissionerTableData): void {
    item.status = 'REJECTED';
    console.log('Rejected revalidation:', item.referenceNo);
  }

  extendRevalidation(item: CommissionerTableData): void {
    // Extend the expiry date by 30 days
    if (item.expiryDate) {
      const currentExpiry = this.parseDate(item.expiryDate);
      currentExpiry.setDate(currentExpiry.getDate() + 30);
      item.expiryDate = currentExpiry.toLocaleDateString('en-GB');
      item.isExpired = false;
      item.daysLeft = Math.ceil((currentExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      item.status = 'APPROVED';
    }
    console.log('Extended revalidation:', item.referenceNo);
  }

  // Modal methods
  closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedApplication = null;
  }

  approveFromModal(): void {
    if (this.selectedApplication) {
      if (this.activeTab === 'revalidation') {
        this.approveRevalidation(this.selectedApplication);
      } else {
        this.approveApplication(this.selectedApplication);
      }
      this.closeReviewModal();
    }
  }

  rejectFromModal(): void {
    if (this.selectedApplication) {
      if (this.activeTab === 'revalidation') {
        this.rejectRevalidation(this.selectedApplication);
      } else {
        this.rejectApplication(this.selectedApplication);
      }
      this.closeReviewModal();
    }
  }

  extendFromModal(): void {
    if (this.selectedApplication && this.activeTab === 'revalidation') {
      this.extendRevalidation(this.selectedApplication);
      this.closeReviewModal();
    }
  }

  // Pagination methods
  getCurrentPage(tab: string): number {
    return this.currentPageByTab[tab] ?? 1;
  }

  getPageSize(tab: string): number {
    return this.pageSizeByTab[tab] ?? 5;
  }

  getTotalPages(data: any[], tab: string): number {
    const size = this.getPageSize(tab);
    return Math.max(1, Math.ceil((data?.length || 0) / size));
  }

  getPaged<T = any>(data: T[], tab: string): T[] {
    const size = this.getPageSize(tab);
    const page = this.getCurrentPage(tab);
    const start = (page - 1) * size;
    return (data || []).slice(start, start + size);
  }

  goToPage(tab: string, page: number, data: any[]): void {
    const total = this.getTotalPages(data, tab);
    if (page < 1 || page > total) return;
    this.currentPageByTab[tab] = page;
  }

  resetPagination(tab: string): void {
    this.currentPageByTab[tab] = 1;
  }

  changePageSize(tab: string, size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSizeByTab[tab] = s;
    this.currentPageByTab[tab] = 1;
  }
}