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
  cancellationReason?: string;
  requestDate?: string;
  licenseType?: string;
  destination?: string;
  transportMode?: string;
  vehicleNumber?: string;
  permitValidUntil?: string;
  localQtyLakh?: number;
  exportQtyLakh?: number;
  defenceQtyLakh?: number;
  totalQtyLakh?: number;
  hologramType?: string;
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
  activeTab = "requisition"; // Start with requisition tab as default
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

  // Filter properties for cancellation
  cancellationDateFilter: string = '';
  cancellationStatusFilter: string = '';
  cancellationReasonFilter: string = '';

  // Filter properties for transit
  transitDateFilter: string = '';
  transitStatusFilter: string = '';
  transitDestinationFilter: string = '';

  // Filter properties for hologram
  hologramDateFilter: string = '';
  hologramStatusFilter: string = '';
  hologramTypeFilter: string = '';

  // Filtered data arrays
  filteredRequisitionData: CommissionerTableData[] = [];
  filteredRevalidationData: CommissionerTableData[] = [];
  filteredCancellationData: CommissionerTableData[] = [];
  filteredTransitData: CommissionerTableData[] = [];
  filteredHologramData: CommissionerTableData[] = [];

  // Modal properties
  showReviewModal = false;
  selectedApplication: CommissionerTableData | null = null;

  // Hologram details modal properties
  showHologramDetailsModal = false;
  selectedHologramApplication: CommissionerTableData | null = null;

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

  // Sample data for cancellation applications (from commissioner's perspective)
  cancellationData: CommissionerTableData[] = [
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

  // Sample data for transit permit applications (from commissioner's perspective)
  transitData: CommissionerTableData[] = [
    {
      referenceNo: "TRN/BF801",
      submissionDate: "22-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "PENDING",
      amount: "2500.00",
      priority: "high",
      destination: "Delhi",
      transportMode: "Road",
      vehicleNumber: "SK01AB1234",
      permitValidUntil: "30-Sep-2025"
    },
    {
      referenceNo: "TRN/BF802",
      submissionDate: "21-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "APPROVED",
      amount: "3200.00",
      priority: "normal",
      destination: "Mumbai",
      transportMode: "Road",
      vehicleNumber: "MH12CD5678",
      permitValidUntil: "28-Sep-2025"
    },
    {
      referenceNo: "TRN/BF803",
      submissionDate: "20-Sep-2025",
      distilleryName: "Royal Sikkim Brewery",
      status: "ISSUED",
      amount: "1800.00",
      priority: "urgent",
      destination: "Kolkata",
      transportMode: "Road",
      vehicleNumber: "WB03EF9012",
      permitValidUntil: "25-Sep-2025"
    },
    {
      referenceNo: "TRN/BF804",
      submissionDate: "19-Sep-2025",
      distilleryName: "Mountain View Distilleries",
      status: "PROCESSING",
      amount: "2100.00",
      priority: "normal",
      destination: "Bangalore",
      transportMode: "Road",
      vehicleNumber: "KA05GH3456",
      permitValidUntil: "27-Sep-2025"
    },
    {
      referenceNo: "TRN/BF805",
      submissionDate: "18-Sep-2025",
      distilleryName: "Eastern Himalaya Distillery",
      status: "PENDING",
      amount: "2800.00",
      priority: "high",
      destination: "Chennai",
      transportMode: "Road",
      vehicleNumber: "TN09IJ7890",
      permitValidUntil: "26-Sep-2025"
    },
    {
      referenceNo: "TRN/BF806",
      submissionDate: "17-Sep-2025",
      distilleryName: "Gangtok Premium Spirits",
      status: "REJECTED",
      amount: "1500.00",
      priority: "normal",
      destination: "Guwahati",
      transportMode: "Road",
      vehicleNumber: "AS01KL2345",
      permitValidUntil: "24-Sep-2025"
    }
  ];

  // Sample data for hologram applications (from commissioner's perspective)
  hologramData: CommissionerTableData[] = [
    {
      referenceNo: "HOL/BF901",
      submissionDate: "23-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "PENDING",
      amount: "15000.00",
      priority: "high",
      localQtyLakh: 2.5,
      exportQtyLakh: 1.0,
      defenceQtyLakh: 0.5,
      totalQtyLakh: 4.0,
      hologramType: "Security Hologram"
    },
    {
      referenceNo: "HOL/BF902",
      submissionDate: "22-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "APPROVED",
      amount: "22000.00",
      priority: "normal",
      localQtyLakh: 3.2,
      exportQtyLakh: 1.8,
      defenceQtyLakh: 0.0,
      totalQtyLakh: 5.0,
      hologramType: "Premium Hologram"
    },
    {
      referenceNo: "HOL/BF903",
      submissionDate: "21-Sep-2025",
      distilleryName: "Royal Sikkim Brewery",
      status: "ISSUED",
      amount: "18500.00",
      priority: "urgent",
      localQtyLakh: 2.8,
      exportQtyLakh: 0.7,
      defenceQtyLakh: 1.0,
      totalQtyLakh: 4.5,
      hologramType: "Standard Hologram"
    },
    {
      referenceNo: "HOL/BF904",
      submissionDate: "20-Sep-2025",
      distilleryName: "Mountain View Distilleries",
      status: "PROCESSING",
      amount: "12000.00",
      priority: "normal",
      localQtyLakh: 2.0,
      exportQtyLakh: 0.5,
      defenceQtyLakh: 0.0,
      totalQtyLakh: 2.5,
      hologramType: "Security Hologram"
    },
    {
      referenceNo: "HOL/BF905",
      submissionDate: "19-Sep-2025",
      distilleryName: "Eastern Himalaya Distillery",
      status: "PENDING",
      amount: "25000.00",
      priority: "high",
      localQtyLakh: 4.0,
      exportQtyLakh: 2.0,
      defenceQtyLakh: 0.5,
      totalQtyLakh: 6.5,
      hologramType: "Premium Hologram"
    },
    {
      referenceNo: "HOL/BF906",
      submissionDate: "18-Sep-2025",
      distilleryName: "Gangtok Premium Spirits",
      status: "REJECTED",
      amount: "8000.00",
      priority: "normal",
      localQtyLakh: 1.5,
      exportQtyLakh: 0.0,
      defenceQtyLakh: 0.0,
      totalQtyLakh: 1.5,
      hologramType: "Standard Hologram"
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
    this.filteredCancellationData = [...this.cancellationData];
    this.filteredTransitData = [...this.transitData];
    this.filteredHologramData = [...this.hologramData];

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

  getCancellationStatusCount(status: string): number {
    return this.filteredCancellationData.filter(item => item.status === status).length;
  }

  getUrgentCancellationCount(): number {
    return this.filteredCancellationData.filter(item => 
      item.priority === 'urgent' || item.cancellationReason === 'Non-Compliance' || item.cancellationReason === 'Regulatory Violation'
    ).length;
  }

  getTransitStatusCount(status: string): number {
    return this.filteredTransitData.filter(item => item.status === status).length;
  }

  getUrgentTransitCount(): number {
    return this.filteredTransitData.filter(item => 
      item.priority === 'urgent' || item.priority === 'high'
    ).length;
  }

  getTotalTransitAmount(): number {
    return this.filteredTransitData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }

  getHologramStatusCount(status: string): number {
    return this.filteredHologramData.filter(item => item.status === status).length;
  }

  getUrgentHologramCount(): number {
    return this.filteredHologramData.filter(item => 
      item.priority === 'urgent' || item.priority === 'high'
    ).length;
  }

  getTotalHologramQuantity(): number {
    return this.filteredHologramData.reduce((total, item) => total + (item.totalQtyLakh || 0), 0);
  }

  getTotalHologramAmount(): number {
    return this.filteredHologramData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
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

  // Filter methods for cancellation
  onCancellationDateFilterChange(): void {
    this.applyCancellationFilters();
  }

  onCancellationStatusFilterChange(): void {
    this.applyCancellationFilters();
  }

  onCancellationReasonFilterChange(): void {
    this.applyCancellationFilters();
  }

  clearCancellationFilters(): void {
    this.cancellationDateFilter = '';
    this.cancellationStatusFilter = '';
    this.cancellationReasonFilter = '';
    this.applyCancellationFilters();
  }

  private applyCancellationFilters(): void {
    let filtered = [...this.cancellationData];

    if (this.cancellationDateFilter) {
      filtered = filtered.filter(item => {
        const itemDate = this.parseDate(item.submissionDate);
        const filterDate = new Date(this.cancellationDateFilter);
        return itemDate.toDateString() === filterDate.toDateString();
      });
    }

    if (this.cancellationStatusFilter) {
      filtered = filtered.filter(item => item.status === this.cancellationStatusFilter);
    }

    if (this.cancellationReasonFilter) {
      filtered = filtered.filter(item => item.cancellationReason === this.cancellationReasonFilter);
    }

    this.filteredCancellationData = filtered;
    this.resetPagination('cancellation');
  }

  // Filter methods for transit
  onTransitDateFilterChange(): void {
    this.applyTransitFilters();
  }

  onTransitStatusFilterChange(): void {
    this.applyTransitFilters();
  }

  onTransitDestinationFilterChange(): void {
    this.applyTransitFilters();
  }

  clearTransitFilters(): void {
    this.transitDateFilter = '';
    this.transitStatusFilter = '';
    this.transitDestinationFilter = '';
    this.applyTransitFilters();
  }

  private applyTransitFilters(): void {
    let filtered = [...this.transitData];

    if (this.transitDateFilter) {
      filtered = filtered.filter(item => {
        const itemDate = this.parseDate(item.submissionDate);
        const filterDate = new Date(this.transitDateFilter);
        return itemDate.toDateString() === filterDate.toDateString();
      });
    }

    if (this.transitStatusFilter) {
      filtered = filtered.filter(item => item.status === this.transitStatusFilter);
    }

    if (this.transitDestinationFilter) {
      filtered = filtered.filter(item => item.destination === this.transitDestinationFilter);
    }

    this.filteredTransitData = filtered;
    this.resetPagination('transit');
  }

  // Filter methods for hologram
  onHologramDateFilterChange(): void {
    this.applyHologramFilters();
  }

  onHologramStatusFilterChange(): void {
    this.applyHologramFilters();
  }

  onHologramTypeFilterChange(): void {
    this.applyHologramFilters();
  }

  clearHologramFilters(): void {
    this.hologramDateFilter = '';
    this.hologramStatusFilter = '';
    this.hologramTypeFilter = '';
    this.applyHologramFilters();
  }

  private applyHologramFilters(): void {
    let filtered = [...this.hologramData];

    if (this.hologramDateFilter) {
      filtered = filtered.filter(item => {
        const itemDate = this.parseDate(item.submissionDate);
        const filterDate = new Date(this.hologramDateFilter);
        return itemDate.toDateString() === filterDate.toDateString();
      });
    }

    if (this.hologramStatusFilter) {
      filtered = filtered.filter(item => item.status === this.hologramStatusFilter);
    }

    if (this.hologramTypeFilter) {
      filtered = filtered.filter(item => item.hologramType === this.hologramTypeFilter);
    }

    this.filteredHologramData = filtered;
    this.resetPagination('hologram');
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
    // Navigate to requisition letter view with reference number
    this.router.navigate(['/dev-requisition-letter-view'], {
      queryParams: { ref: item.referenceNo }
    });
  }

  reviewRevalidation(item: CommissionerTableData): void {
    // Navigate to revalidation letter view with reference number
    this.router.navigate(['/dev-revalidation-letter-view'], {
      queryParams: { ref: item.referenceNo }
    });
  }

  reviewCancellation(item: CommissionerTableData): void {
    // Navigate to cancellation letter view with reference number
    this.router.navigate(['/dev-cancellation-letter-view'], {
      queryParams: { ref: item.referenceNo }
    });
  }

  reviewTransit(item: CommissionerTableData): void {
    // Navigate to transit permit letter view with reference number
    this.router.navigate(['/dev-transit-permit-letter-view'], {
      queryParams: { ref: item.referenceNo }
    });
  }

  reviewHologram(item: CommissionerTableData): void {
    // Navigate to hologram letter view with reference number
    this.router.navigate(['/dev-hologram-letter-view'], {
      queryParams: { ref: item.referenceNo }
    });
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

  approveCancellation(item: CommissionerTableData): void {
    item.status = 'APPROVED';
    console.log('Approved cancellation:', item.referenceNo);
  }

  rejectCancellation(item: CommissionerTableData): void {
    item.status = 'REJECTED';
    console.log('Rejected cancellation:', item.referenceNo);
  }

  approveTransit(item: CommissionerTableData): void {
    item.status = 'APPROVED';
    console.log('Approved transit permit:', item.referenceNo);
  }

  rejectTransit(item: CommissionerTableData): void {
    item.status = 'REJECTED';
    console.log('Rejected transit permit:', item.referenceNo);
  }

  issueTransit(item: CommissionerTableData): void {
    item.status = 'ISSUED';
    console.log('Issued transit permit:', item.referenceNo);
  }

  approveHologram(item: CommissionerTableData): void {
    item.status = 'APPROVED';
    console.log('Approved hologram application:', item.referenceNo);
  }

  rejectHologram(item: CommissionerTableData): void {
    item.status = 'REJECTED';
    console.log('Rejected hologram application:', item.referenceNo);
  }

  issueHologram(item: CommissionerTableData): void {
    item.status = 'ISSUED';
    console.log('Issued hologram:', item.referenceNo);
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
      } else if (this.activeTab === 'cancellation') {
        this.approveCancellation(this.selectedApplication);
      } else if (this.activeTab === 'transit') {
        this.approveTransit(this.selectedApplication);
      } else if (this.activeTab === 'hologram') {
        this.approveHologram(this.selectedApplication);
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
      } else if (this.activeTab === 'cancellation') {
        this.rejectCancellation(this.selectedApplication);
      } else if (this.activeTab === 'transit') {
        this.rejectTransit(this.selectedApplication);
      } else if (this.activeTab === 'hologram') {
        this.rejectHologram(this.selectedApplication);
      } else {
        this.rejectApplication(this.selectedApplication);
      }
      this.closeReviewModal();
    }
  }

  issueFromModal(): void {
    if (this.selectedApplication) {
      if (this.activeTab === 'transit') {
        this.issueTransit(this.selectedApplication);
      } else if (this.activeTab === 'hologram') {
        this.issueHologram(this.selectedApplication);
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

  // Hologram details modal methods
  viewHologramDetails(item: CommissionerTableData): void {
    console.log('viewHologramDetails called with:', item);
    this.selectedHologramApplication = item;
    this.showHologramDetailsModal = true;
    console.log('Modal should be visible now:', this.showHologramDetailsModal);
  }

  closeHologramDetailsModal(): void {
    this.showHologramDetailsModal = false;
    this.selectedHologramApplication = null;
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