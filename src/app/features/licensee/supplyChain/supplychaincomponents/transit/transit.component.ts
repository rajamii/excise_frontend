import { Component, Inject, PLATFORM_ID, OnInit, Input } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SupplyChainProfileService } from "../../../../../core/services/supply-chain-profile.service";
import { Router } from "@angular/router";
import { SupplyChainService } from "../../services/supplychain.service";

interface TableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  backendStatus?: string; // Original backend status for role-based logic
  amount: string;
  destination?: string;
  depotAddress?: string; // Add separate depot address field
  transportMode?: string;
  vehicleNumber?: string;
  permitValidUntil?: string;
}

interface ProductDetail {
  brand: string;
  size_ml: number;
  cases: number;
  bottle_type?: string;
  brand_owner?: string;
  liquor_type?: string;
  manufacturing_unit_name?: string;
}

@Component({
  selector: 'app-transit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transit.component.html',
  styleUrl: './transit.component.scss'
})
export class TransitComponent implements OnInit {
  Math = Math;
  private isBrowser = false;

  /**
   * User role determines which action buttons to show:
   * - 'licensee': View + Pay (when PENDING)
   * - 'oic': View + Approve/Reject (when forwarded to OIC)
   * - 'permit': View + Approve/Reject (when forwarded to Permit Section)
   * - 'commissioner': View + Approve/Reject (when forwarded to Commissioner)
   */
  @Input() userRole: 'licensee' | 'oic' | 'permit' | 'commissioner' = 'licensee';

  // Filter properties for transit
  transitDateFilter: string = '';
  transitStatusFilter: string = '';
  transitDestinationFilter: string = '';

  // Pagination
  pageSizeOptions: number[] = [5, 10, 15, 20, 50];
  currentPage: number = 1;
  pageSize: number = 5;

  filteredTransitData: TableData[] = [];
  
  // Store raw backend data for brand details
  rawTransitData: any[] = [];
  
  // Modal data
  selectedPermitRef: string = '';
  selectedBrandDetails: ProductDetail[] = [];

  // Sample data for transit permit applications
  transitData: TableData[] = [
    {
      referenceNo: "TRN/BF801",
      submissionDate: "22-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "PENDING",
      amount: "2500.00",
      destination: "Delhi",
      depotAddress: "Gangtok",
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
      destination: "Mumbai",
      depotAddress: "Gangtok",
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
      destination: "Kolkata",
      depotAddress: "Gangtok",
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
      destination: "Bangalore",
      depotAddress: "Gangtok",
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
      destination: "Chennai",
      depotAddress: "Gangtok",
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
      destination: "Guwahati",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "AS01KL2345",
      permitValidUntil: "24-Sep-2025"
    },
    {
      referenceNo: "TRN/BF807",
      submissionDate: "16-Sep-2025",
      distilleryName: "Sikkim Highland Distillery",
      status: "PENDING",
      amount: "2200.00",
      destination: "Pune",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "MH14PQ6789",
      permitValidUntil: "23-Sep-2025"
    },
    {
      referenceNo: "TRN/BF808",
      submissionDate: "15-Sep-2025",
      distilleryName: "Himalayan Peak Spirits",
      status: "APPROVED",
      amount: "2900.00",
      destination: "Hyderabad",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "TS07RS1234",
      permitValidUntil: "22-Sep-2025"
    },
    {
      referenceNo: "TRN/BF809",
      submissionDate: "14-Sep-2025",
      distilleryName: "Eastern Spirits Ltd",
      status: "ISSUED",
      amount: "3100.00",
      destination: "Ahmedabad",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "GJ01TU5678",
      permitValidUntil: "21-Sep-2025"
    },
    {
      referenceNo: "TRN/BF810",
      submissionDate: "13-Sep-2025",
      distilleryName: "Mountain Brew Company",
      status: "PROCESSING",
      amount: "2600.00",
      destination: "Jaipur",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "RJ14VW9012",
      permitValidUntil: "20-Sep-2025"
    },
    {
      referenceNo: "TRN/BF811",
      submissionDate: "12-Sep-2025",
      distilleryName: "Sikkim Valley Distillery",
      status: "PENDING",
      amount: "2400.00",
      destination: "Lucknow",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "UP32XY3456",
      permitValidUntil: "19-Sep-2025"
    },
    {
      referenceNo: "TRN/BF812",
      submissionDate: "11-Sep-2025",
      distilleryName: "Royal Mountain Spirits",
      status: "APPROVED",
      amount: "2700.00",
      destination: "Bhopal",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "MP09ZA7890",
      permitValidUntil: "18-Sep-2025"
    },
    {
      referenceNo: "TRN/BF813",
      submissionDate: "10-Sep-2025",
      distilleryName: "Himalayan Gold Distillery",
      status: "ISSUED",
      amount: "3300.00",
      destination: "Chandigarh",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "CH01BC1234",
      permitValidUntil: "17-Sep-2025"
    },
    {
      referenceNo: "TRN/BF814",
      submissionDate: "09-Sep-2025",
      distilleryName: "Eastern Crown Spirits",
      status: "PROCESSING",
      amount: "2000.00",
      destination: "Patna",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "BR01DE5678",
      permitValidUntil: "16-Sep-2025"
    },
    {
      referenceNo: "TRN/BF815",
      submissionDate: "08-Sep-2025",
      distilleryName: "Sikkim Premium Distillery",
      status: "PENDING",
      amount: "2800.00",
      destination: "Raipur",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "CG04FG9012",
      permitValidUntil: "15-Sep-2025"
    },
    {
      referenceNo: "TRN/BF816",
      submissionDate: "07-Sep-2025",
      distilleryName: "Mountain Crest Spirits",
      status: "REJECTED",
      amount: "1900.00",
      destination: "Bhubaneswar",
      depotAddress: "Gangtok",
      transportMode: "Road",
      vehicleNumber: "OD05HI3456",
      permitValidUntil: "14-Sep-2025"
    }
  ];

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
    private profileService: SupplyChainProfileService,
    private supplyChainService: SupplyChainService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Initialize with sample data first
    this.filteredTransitData = [...this.transitData];
    
    if (this.isBrowser) {
      this.loadTransitData();
    } else {
      // If not in browser, still apply filters to show sample data
      this.applyTransitFilters();
    }
  }

  /**
   * Returns the backend status directly for display
   * No mapping - just like requisition/revalidation components
   */
  private mapBackendStatusToDisplayStatus(backendStatus: string): string {
    // Return backend status directly, just like requisition component
    return backendStatus || 'Pending';
  }

  loadTransitData(): void {
    this.supplyChainService.getTransitPermits().subscribe({
      next: (data) => {
        // Store raw data for brand details
        this.rawTransitData = data;
        
        if (!data || data.length === 0) {
          this.applyTransitFilters();
          return;
        }

        // Group by bill_no
        const grouped = new Map<string, any>();

        data.forEach(item => {
          // keys might be camelCase due to DRF settings
          const billNo = item.billNo || item.bill_no;
          const distributorName = item.soleDistributorName || item.sole_distributor_name;
          const destination = item.depotAddress || item.depot_address;
          const vehicleNumber = item.vehicleNumber || item.vehicle_number;
          const date = item.date;

          // Get the status from backend - support both camelCase and snake_case
          const backendStatus = item.status || '';
          const displayStatus = this.mapBackendStatusToDisplayStatus(backendStatus);

          // Calculate duties for this row (supporting both casings)
          const excise = parseFloat(item.exciseDutyRsPerCase || item.excise_duty_rs_per_case || '0');
          const cess = parseFloat(item.educationCessRsPerCase || item.education_cess_rs_per_case || '0');
          const additional = parseFloat(item.additionalExciseDutyRsPerCase || item.additional_excise_duty_rs_per_case || '0');
          const cases = parseInt(item.cases || '0', 10);

          // Use backend total if available, else calculate
          let rowTotal = 0;
          if (item.totalAmount || item.total_amount) {
            rowTotal = parseFloat(item.totalAmount || item.total_amount);
          } else {
            rowTotal = (excise + cess + additional) * cases;
          }

          if (billNo && !grouped.has(billNo)) {
            grouped.set(billNo, {
              referenceNo: billNo,
              submissionDate: date,
              distilleryName: distributorName,
              status: displayStatus, // Use status from database with proper mapping
              backendStatus: backendStatus, // Store original backend status for role-based logic
              amount: rowTotal,
              destination: destination, // This should be the actual destination
              depotAddress: destination, // Store depot address separately
              transportMode: 'Road',
              vehicleNumber: vehicleNumber,
              permitValidUntil: ''
            });
          } else if (billNo) {
            // Accumulate amount for existing bill
            const existing = grouped.get(billNo);
            existing.amount += rowTotal;
          }
        });

        // Convert amounts to string with 2 decimals and replace sample data
        this.transitData = Array.from(grouped.values()).map(item => ({
          ...item,
          amount: item.amount.toFixed(2)
        }));

        this.applyTransitFilters();
      },
      error: (err) => {
        console.error('Failed to load transit data', err);
        // Fallback to sample data if API fails
        this.applyTransitFilters();
      }
    });
  }

  // Filter methods
  applyTransitFilters(): void {
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
    this.resetPagination();
  }

  clearTransitFilters(): void {
    this.transitDateFilter = '';
    this.transitStatusFilter = '';
    this.transitDestinationFilter = '';
    this.applyTransitFilters();
  }

  onTransitDateFilterChange(): void {
    this.applyTransitFilters();
  }

  onTransitStatusFilterChange(): void {
    this.applyTransitFilters();
  }

  onTransitDestinationFilterChange(): void {
    this.applyTransitFilters();
  }

  // Summary methods
  getTransitStatusCount(status: string): number {
    return this.filteredTransitData.filter(item => item.status === status).length;
  }

  getUrgentTransitCount(): number {
    // Since we removed priority, we can base urgency on status or other criteria
    // For now, let's count items that need immediate attention (PENDING status)
    return this.filteredTransitData.filter(item =>
      item.status === 'PENDING' || item.status === 'Ready for Payment'
    ).length;
  }

  getTotalTransitAmount(): number {
    return this.filteredTransitData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }

  // Action methods
  reviewTransit(item: TableData): void {
    // Navigate to transit permit letter view with reference number
    this.router.navigate(['/dev-transit-permit-letter-view'], {
      queryParams: { ref: item.referenceNo }
    });
  }

  payTransit(item: TableData): void {
    // Navigate to payment confirmation page with Transit Permit tab active
    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: {
        billNo: item.referenceNo,
        tab: 'transit'
      }
    });
  }

  /**
   * Determines if the Pay button should be shown for an item
   * Only for licensees when status is 'Ready for Payment'
   */
  canShowPayButton(item: TableData): boolean {
    if (this.userRole !== 'licensee') return false;
    // Check both display status and backend status
    return item.status === 'Ready for Payment' || item.backendStatus === 'Ready for Payment';
  }

  /**
   * Determines if Approve/Reject buttons should be shown for an item
   * Only for officers when the application is forwarded to their specific stage
   */
  canShowApproveRejectButtons(item: TableData): boolean {
    if (this.userRole === 'licensee') return false;

    const backendStatus = item.backendStatus || '';

    switch (this.userRole) {
      case 'oic':
        // OIC can approve/reject when payment is done and forwarded to them
        return backendStatus === 'PaymentSuccessfulandForwardedToOfficerincharge';
      case 'permit':
        // Permit section can approve/reject when forwarded to them
        return backendStatus.toLowerCase().includes('permit section') ||
          backendStatus.toLowerCase().includes('forwarded to permit');
      case 'commissioner':
        // Commissioner can approve/reject when forwarded to them
        return backendStatus.toLowerCase().includes('commissioner') ||
          backendStatus.toLowerCase().includes('forwarded to commissioner');
      default:
        return false;
    }
  }

  approveTransit(item: TableData): void {
    item.status = 'APPROVED';
    console.log('Approved transit permit:', item.referenceNo);
  }

  rejectTransit(item: TableData): void {
    item.status = 'REJECTED';
    console.log('Rejected transit permit:', item.referenceNo);
  }

  issueTransit(item: TableData): void {
    item.status = 'ISSUED';
    console.log('Issued transit permit:', item.referenceNo);
  }

  // Helper methods
  getStatusClass(status: string): string {
    if (!status) return 'default';

    const statusLower = status.toLowerCase();

    // IMPORTANT: Check cancelled/rejected FIRST before success
    // Cancelled / Rejected / Refund states (check this FIRST)
    if (statusLower.includes('cancelled') || statusLower.includes('rejected') || statusLower.includes('refund') || statusLower.includes('denied')) {
      return 'rejected';
    }

    // Ready for Payment / Pending states
    if (statusLower.includes('ready for payment') || statusLower === 'pending' || statusLower.includes('waiting')) {
      return 'pending';
    }

    // Forwarded / Processing states
    if (statusLower.includes('forwarded') || statusLower === 'processing' || statusLower.includes('in progress')) {
      return 'processing';
    }

    // Approved / Success states (check this AFTER cancelled)
    if (statusLower.includes('approved') || statusLower.includes('success') || statusLower.includes('accepted')) {
      return 'approved';
    }

    // Issued / Completed states
    if (statusLower.includes('issued') || statusLower.includes('completed') || statusLower.includes('delivered')) {
      return 'issued';
    }

    return 'default';
  }

  getStatusIcon(status: string): string {
    if (!status) return 'bi-circle';

    const statusLower = status.toLowerCase();

    // IMPORTANT: Check cancelled/rejected FIRST before success
    // Cancelled / Rejected / Refund states (check this FIRST)
    if (statusLower.includes('cancelled') || statusLower.includes('rejected') || statusLower.includes('refund') || statusLower.includes('denied')) {
      return 'bi-x-circle-fill';
    }

    // Ready for Payment / Pending states
    if (statusLower.includes('ready for payment') || statusLower === 'pending' || statusLower.includes('waiting')) {
      return 'bi-clock-fill';
    }

    // Forwarded / Processing states
    if (statusLower.includes('forwarded') || statusLower === 'processing' || statusLower.includes('in progress')) {
      return 'bi-arrow-repeat';
    }

    // Approved / Success states (check this AFTER cancelled)
    if (statusLower.includes('approved') || statusLower.includes('success') || statusLower.includes('accepted')) {
      return 'bi-check-circle-fill';
    }

    // Issued / Completed states
    if (statusLower.includes('issued') || statusLower.includes('completed') || statusLower.includes('delivered')) {
      return 'bi-patch-check-fill';
    }

    return 'bi-circle';
  }

  private parseDate(dateString: string): Date {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateString);
  }

  navigateTo(route: string) {
    if (route === 'transit-permit') {
      this.router.navigate(['/licensee/supply-chain/transit-permit']);
    } else {
      this.router.navigate([route]);
    }
  }
  // Pagination methods
  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil((this.filteredTransitData?.length || 0) / this.pageSize));
  }

  getPaged(): TableData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (this.filteredTransitData || []).slice(start, start + this.pageSize);
  }

  goToPage(page: number | string): void {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const total = this.getTotalPages();
    if (pageNum < 1 || pageNum > total || isNaN(pageNum)) return;
    this.currentPage = pageNum;
  }

  resetPagination(): void {
    this.currentPage = 1;
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.changePageSize(target.value);
    }
  }

  changePageSize(size: string | number | undefined): void {
    if (!size) return;
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s || isNaN(s)) return;
    this.pageSize = s;
    this.currentPage = 1;
  }

  showAllData(): void {
    this.pageSize = this.filteredTransitData.length || 50;
    this.currentPage = 1;
  }

  getPageNumbers(): (number | string)[] {
    const totalPages = this.getTotalPages();
    const currentPage = this.getCurrentPage();
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 4) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 3) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }

  // Brand Details Methods
  openBrandDetailsModal(referenceNo: string): void {
    this.selectedPermitRef = referenceNo;
    this.selectedBrandDetails = this.getBrandDetailsForPermit(referenceNo);
    
    // Open the modal using Bootstrap
    const modalElement = document.getElementById('brandDetailsModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  getBrandCount(referenceNo: string): number {
    return this.rawTransitData.filter(item => 
      (item.billNo || item.bill_no) === referenceNo
    ).length;
  }

  getBrandDetailsForPermit(referenceNo: string): ProductDetail[] {
    return this.rawTransitData
      .filter(item => (item.billNo || item.bill_no) === referenceNo)
      .map(item => ({
        brand: item.brand || '',
        size_ml: item.sizeMl || item.size_ml || 0,
        cases: item.cases || 0,
        bottle_type: item.bottleType || item.bottle_type || '',
        brand_owner: item.brandOwner || item.brand_owner || '',
        liquor_type: item.liquorType || item.liquor_type || '',
        manufacturing_unit_name: item.manufacturingUnitName || item.manufacturing_unit_name || ''
      }));
  }

  getTotalCases(): number {
    return this.selectedBrandDetails.reduce((total, product) => total + (product.cases || 0), 0);
  }

  exportBrandDetails(): void {
    // Create CSV content
    const headers = ['Brand', 'Size (ml)', 'Cases', 'Bottle Type', 'Brand Owner', 'Liquor Type', 'Manufacturing Unit'];
    const csvContent = [
      headers.join(','),
      ...this.selectedBrandDetails.map(product => [
        `"${product.brand}"`,
        product.size_ml,
        product.cases,
        `"${product.bottle_type || 'N/A'}"`,
        `"${product.brand_owner || 'N/A'}"`,
        `"${product.liquor_type || 'N/A'}"`,
        `"${product.manufacturing_unit_name || 'N/A'}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brand-details-${this.selectedPermitRef}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
