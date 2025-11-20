import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { RequisitionComponent } from "./supplychaincomponents/requisition/requisition.component";
import { RevalidationComponent } from "./supplychaincomponents/revalidation/revalidation.component";
import { CancellationComponent } from "./supplychaincomponents/cancellation/cancellation.component";
import { TransitComponent } from "./supplychaincomponents/transit/transit.component";

interface TableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  isLive?: boolean;
  isInvalid?: boolean;
}

interface HologramRow {
  refNo: string;
  date: string;
  companyName: string;
  localQtyLakh?: number;
  exportQtyLakh?: number;
  defenceQtyLakh?: number;
  procurementType?: 'Local' | 'Export' | 'Defence'; // Add procurement type
  status: string;
  paymentCompleted?: boolean;
  editedByCommissioner?: boolean;
  editHistory?: any;
}

@Component({
  selector: "app-supply-chain",
  standalone: true,
  imports: [CommonModule, FormsModule, RequisitionComponent, RevalidationComponent, CancellationComponent, TransitComponent],
  templateUrl: "./supply-chain.component.html",
  styleUrls: ["./supply-chain.component.scss"],
})
export class SupplyChainComponent implements OnInit {
  Math = Math;
  selectedDate = "";
  selectedMonth = "";
  selectedYear = "";
  selectedDistillery = "";
  selectedStatus = "";
  activeTab = "requisition";
  sidebarHidden = true;
  hologramList: HologramRow[] = [];
  hologramRequestList: any[] = [];
  filteredHologramRequestList: any[] = [];
  filteredHologramData: any[] = [];
  private isBrowser = false;
  showHologramModal = false;
  showMultiTypePaymentModal = false;
  selectedPaymentHologram: HologramRow | null = null;
  paymentRemarks: string = '';
  multiTypePaymentItems: HologramRow[] = [];

  // Filter properties for hologram requests
  dateFilter: string = '';
  monthFilter: string = '';
  statusFilter: string = '';
  
  // Filter properties for hologram
  hologramDateFilter: string = '';
  hologramMonthFilter: string = '';
  hologramYearFilter: string = '';
  hologramStatusFilter: string = '';
  selectedHologram: HologramRow | null = null;
  showRequestModal = false;
  selectedRequest: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.refreshHologramList();
  }

  ngOnInit(): void {
    // Initialize filtered data
    this.filteredHologramData = [...this.hologramList];

    // Check for tab query parameter
    if (this.isBrowser) {
      const tab = this.route.snapshot.queryParamMap.get('tab');
      if (tab) {
        this.setActiveTab(tab);
      }

      // Add visibility change listener to refresh data when user returns to tab
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.activeTab === 'hologram') {
          console.log('🔄 Tab became visible, refreshing hologram data...');
          this.refreshHologramList();
        }
      });

      // Add storage event listener to detect changes from other tabs/windows
      window.addEventListener('storage', (event) => {
        if (event.key === 'hologramRequests' || event.key === 'hologramApplications') {
          console.log('🔄 Storage changed, refreshing hologram data...');
          this.refreshHologramList();
        }
      });
    }
  }

  private refreshHologramList(): void {
    if (!this.isBrowser) {
      this.hologramList = [];
      return;
    }

    // Load from hologramApplications (single source of truth)
    const storedApplications = JSON.parse(localStorage.getItem("hologramApplications") || "[]");
    
    // Also load hologramRequests to get approval status
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    
    console.log('📦 Loading hologram data from hologramApplications:', storedApplications.length, 'items');
    console.log('📦 Loading approval data from hologramRequests:', hologramRequests.length, 'items');

    // Map the data and merge with approval status
    let mapped: HologramRow[] = (storedApplications || []).map((a: any) => {
      // Find matching request to get approval status
      const request = hologramRequests.find((req: any) => req.refNo === a.refNo);
      
      // Determine display status based on payment and approval stages
      let displayStatus = request?.status || a.status || "Submitted";
      
      // If payment completed, show "Payment Completed"
      if (request?.paymentCompleted === true || a.paymentCompleted === true) {
        displayStatus = "Payment Completed";
      }
      
      return {
        refNo: a.refNo,
        date: a.date,
        companyName: a.companyName,
        localQtyLakh: a.localQtyLakh,
        exportQtyLakh: a.exportQtyLakh,
        defenceQtyLakh: a.defenceQtyLakh,
        procurementType: a.procurementType, // Include procurement type
        status: displayStatus, // Use determined status
        paymentCompleted: a.paymentCompleted || request?.paymentCompleted || false,
        editedByCommissioner: a.editedByCommissioner || request?.editedByCommissioner || false,
        editHistory: a.editHistory || request?.editHistory || null,
      };
    });

    console.log('📦 Mapped hologram data:', mapped.length, 'items');

    // Sort by date (newest first) if we have data
    if (mapped.length > 0) {
      mapped = mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Ensure all items have procurementType set (fallback for old data)
    mapped = mapped.map(item => {
      if (!item.procurementType) {
        // Determine type from quantities
        if (item.exportQtyLakh && item.exportQtyLakh > 0) {
          item.procurementType = 'Export';
        } else if (item.defenceQtyLakh && item.defenceQtyLakh > 0) {
          item.procurementType = 'Defence';
        } else {
          item.procurementType = 'Local';
        }
      }
      return item;
    });

    this.hologramList = mapped;
    this.filteredHologramData = [...this.hologramList];
  }



  // UI interaction methods only
  onSearch(): void {
    // Frontend search logic only
  }

  onClear(): void {
    this.selectedDate = "";
    this.selectedMonth = "";
    this.selectedYear = "";
    this.selectedDistillery = "";
    this.selectedStatus = "";
  }

  setActiveTab(tab: string): void {
    console.log('setActiveTab called with:', tab);
    this.activeTab = tab;
    if (tab === "hologram") {
      // refresh list on each visit
      this.refreshHologramList();
    } else if (tab === "hologram-request") {
      console.log('Loading hologram requests for tab');
      // refresh hologram requests on each visit
      this.loadHologramRequests();
    }
  }

  viewApplication(item: TableData, event?: Event): void {
    // Prevent form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Navigate to specific application view based on reference number type
    const refNo = item.referenceNo;

    if (refNo.includes("REV") || refNo.includes("IMP/SUP")) {
      // Revalidation applications
      this.router.navigate(["/dev-supply-chain-revalidation-view"], {
        queryParams: { ref: refNo },
      });
    } else if (refNo.includes("CAN")) {
      // Cancellation applications
      this.router.navigate(["/dev-supply-chain-cancellation-view"], {
        queryParams: { ref: refNo },
      });
    } else if (refNo.includes("TRN")) {
      // Transit permit applications
      this.router.navigate(["/dev-supply-chain-transit-view"], {
        queryParams: { ref: refNo },
      });
    } else {
      // Requisition applications (BF, IBPS, etc.)
      this.router.navigate(["/dev-supply-chain-application-view"], {
        queryParams: { ref: refNo },
      });
    }
  }

  viewHologramApplication(item: HologramRow): void {
    // Navigate to supply-chain hologram view with ref and type
    this.router.navigate(["/dev-supply-chain-hologram-view"], {
      queryParams: { 
        ref: item.refNo,
        type: item.procurementType || this.getProcurementType(item)
      },
    });
  }

  viewSlip(item: TableData): void {
    // Navigate to payment confirmation page (development route)
    this.router.navigate(["/dev-payment-confirmation"], {
      queryParams: {
        tab: "requisition",
        referenceNo: item.referenceNo,
        action: "viewSlip",
      },
    });
  }

  viewWallet(): void {
    // Navigate to payment confirmation page (development route)
    this.router.navigate(["/dev-payment-confirmation"]);
  }

  toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden;
    console.log('Sidebar toggled. sidebarHidden:', this.sidebarHidden);
  }

  viewHologram(refNo: string): void {
    this.router.navigate(["/dev-hologram"], { queryParams: { ref: refNo } });
  }

  openHologramDetails(row: HologramRow): void {
    this.selectedHologram = row;
    this.showHologramModal = true;
  }

  closeHologramDetails(): void {
    this.showHologramModal = false;
    this.selectedHologram = null;
  }

  getHologramTotal(row: HologramRow): number {
    return (
      (row.localQtyLakh || 0) +
      (row.exportQtyLakh || 0) +
      (row.defenceQtyLakh || 0)
    );
  }

  getProcurementType(row: HologramRow): 'Local' | 'Export' | 'Defence' {
    // Return the stored type if available
    if (row.procurementType) {
      return row.procurementType;
    }
    
    // Fallback: determine from quantities
    if (row.exportQtyLakh && row.exportQtyLakh > 0) {
      return 'Export';
    } else if (row.defenceQtyLakh && row.defenceQtyLakh > 0) {
      return 'Defence';
    } else {
      return 'Local';
    }
  }



  // Check if payment button should be enabled (requires Commissioner approval)
  isPaymentEnabled(item: HologramRow): boolean {
    if (!this.isBrowser) {
      return false;
    }

    // Get the hologram request from localStorage to check Commissioner approval
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const request = hologramRequests.find((req: any) => req.refNo === item.refNo);

    if (!request) {
      return false;
    }

    // NEW FLOW: Payment is enabled only if Commissioner has approved
    // No payment slip upload required before payment
    const commissionerApproved = request.commissionerStatus === 'Approved';

    return commissionerApproved;
  }

  navigateTo(route: string): void {
    switch (route) {
      case "import-permit":
        this.router.navigate(["/dev-import-permit"]);
        break;
      case "transit-permit":
        this.router.navigate(["/dev-transit-permit"]);
        break;
      case "hologram":
        this.router.navigate(["/dev-hologram"]);
        break;
      case "request-hologram":
        this.router.navigate(["/dev-hologramrequestlevel1"]);
        break;
      case "transit-permit-register":
        this.router.navigate(["/dev-transit-permit-register"]);
        break;
      case "daily-record-register":
        this.router.navigate(["/dev-daily-record-register"]);
        break;
      case "daily-production-register":
        this.router.navigate(["/dev-daily-production-register"]);
        break;
      case "brands-details":
        this.router.navigate(["/dev-brands-details"]);
        break;
      case "yuksom-local-sales-register":
        this.router.navigate(["/dev-local-sales-register"]);
        break;
      case "beer-production-register":
        this.router.navigate(["/dev-beer-production-register"]);
        break;
      case "hologram-daily-register":
        this.router.navigate(["/dev-hologram-daily-register"]);
        break;
      case "hologram-monthly-report":
        this.router.navigate(["/dev-hologram-monthly-report"]);
        break;
      case "dashboard":
        this.router.navigate(["/dev-supply-chain"]);
        break;
      case "payments":
        this.router.navigate(["/dev-payment-confirmation"]);
        break;
      case "payment-receipt":
        this.router.navigate(["/dev-payment-receipt"]);
        break;
      default:
        this.router.navigate(["/dev-supply-chain"]);
    }
  }

  // Pagination state per tab
  pageSizeOptions: number[] = [5, 10, 15];
  pageSizeByTab: Record<string, number> = {
    hologram: 5,
    'hologram-request': 5,
  };
  currentPageByTab: Record<string, number> = {
    hologram: 1,
    'hologram-request': 1,
  };

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

  // Debug method - can be called from browser console
  testDateFilter(dateString: string): void {
    console.log('Testing date filter with:', dateString);
    this.dateFilter = dateString;
    this.applyFilters();
  }

  changePageSize(tab: string, size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSizeByTab[tab] = s;
    this.currentPageByTab[tab] = 1;
  }

  // Hologram Request Methods
  loadHologramRequests(): void {
    console.log('loadHologramRequests called, isBrowser:', this.isBrowser);

    if (!this.isBrowser) {
      this.hologramRequestList = [];
      return;
    }

    // Load hologram requests from localStorage
    let storedRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    console.log('Stored requests:', storedRequests);

    // Sort by submission date (newest first)
    this.hologramRequestList = storedRequests.sort((a: any, b: any) => {
      const dateA = new Date(a.submissionDate).getTime();
      const dateB = new Date(b.submissionDate).getTime();
      return dateB - dateA; // Newest first
    });

    // Initialize filtered list
    this.filteredHologramRequestList = [...this.hologramRequestList];

    console.log('Final hologramRequestList:', this.hologramRequestList);

    // Debug: Log all submission dates for testing
    this.hologramRequestList.forEach(request => {
      const date = new Date(request.submissionDate);
      const dateString = date.getUTCFullYear() + '-' +
        String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(date.getUTCDate()).padStart(2, '0');
      console.log('Request:', request.refNumber, 'Date:', request.submissionDate, 'Formatted:', dateString);
    });
  }

  navigateToHologramRequest(): void {
    this.router.navigate(['/dev-hologramrequestlevel1']);
  }

  getBrandLabel(brandValue: string): string {
    const brandMap: { [key: string]: string } = {
      'sikkim-supreme': 'Sikkim Supreme Whisky',
      'himalayan-gold': 'Himalayan Gold Rum',
      'royal-sikkim': 'Royal Sikkim Brandy',
      'mountain-dew': 'Mountain Dew Vodka',
      'gangtok-special': 'Gangtok Special Whisky',
      'teesta-valley': 'Teesta Valley Rum',
      'khangchendzonga': 'Khangchendzonga Premium',
      'yuksom-heritage': 'Yuksom Heritage Whisky'
    };
    return brandMap[brandValue] || brandValue;
  }

  getRequestStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-warning-subtle text-warning';
      case 'APPROVED':
        return 'bg-success-subtle text-success';
      case 'REJECTED':
        return 'bg-danger-subtle text-danger';
      case 'PROCESSING':
        return 'bg-info-subtle text-info';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }

  viewHologramRequestApplication(request: any): void {
    this.selectedRequest = request;
    this.showRequestModal = true;
  }

  closeRequestModal(): void {
    this.showRequestModal = false;
    this.selectedRequest = null;
  }

  downloadRequestApplication(request: any): void {
    const applicationContent = this.generateRequestApplicationTemplate(request);
    const filename = `Hologram_Request_${request.refNumber.replace(/\//g, '_')}.txt`;
    this.downloadFile(applicationContent, filename);
  }

  private generateRequestApplicationTemplate(request: any): string {
    const submissionDate = new Date(request.submissionDate).toLocaleDateString('en-IN');
    const usageDate = new Date(request.usageDate).toLocaleDateString('en-IN');
    const brandLabel = this.getBrandLabel(request.brandName);

    return `
HOLOGRAM REQUEST APPLICATION
============================

Reference Number: ${request.refNumber}
Application Date: ${submissionDate}

APPLICANT DETAILS:
------------------
Company Name: Sikkim Distilleries Ltd
License Number: SDL/2024/001
Address: Industrial Area, Rangpo, East Sikkim - 737132
Contact: +91-3592-252001
Email: info@sikkimdistilleries.com

REQUEST DETAILS:
----------------
Date to Use Hologram in Factory: ${usageDate}
Brand Name: ${brandLabel}
Bottle Size: ${request.bottleSize}
Total Number of Holograms Required: ${request.totalHolograms.toLocaleString('en-IN')}

${request.remarks ? `Additional Information:\n${request.remarks}\n` : ''}

DECLARATION:
------------
I hereby declare that the information provided above is true and correct to the best of my knowledge. 
I understand that any false information may lead to rejection of this application and/or legal action.

The holograms requested will be used solely for the production of the specified brand and bottle size 
mentioned in this application. Any misuse or unauthorized use of holograms will be reported immediately 
to the concerned authorities.

I agree to comply with all rules and regulations set forth by the Excise Department, Government of Sikkim, 
regarding the use and handling of security holograms.


Signature: _____________________
Name: [Authorized Signatory]
Designation: [Managing Director/Authorized Representative]
Date: ${submissionDate}


FOR OFFICE USE ONLY:
--------------------
Application Received Date: ___________
Received By: ___________
Processing Fee: ₹___________
Approval Status: ${request.status}
Approved By: ___________
Date of Approval: ___________
Hologram Dispatch Date: ___________

Remarks: ________________________________
________________________________________
________________________________________

Signature of Approving Authority: ___________
Name: ___________
Designation: ___________
Date: ___________

============================
End of Application
============================
`;
  }

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Additional methods for register view
  getRequestStatusCount(status: string): number {
    return this.hologramRequestList.filter(request => request.status === status).length;
  }

  getFilteredRequestStatusCount(status: string): number {
    return this.filteredHologramRequestList.filter(request => request.status === status).length;
  }

  getTotalRequestedHolograms(): number {
    return this.hologramRequestList.reduce((total, request) => total + (request.totalHolograms || 0), 0);
  }

  // Filter methods
  applyFilters(): void {
    console.log('Applying filters:', { dateFilter: this.dateFilter, monthFilter: this.monthFilter, statusFilter: this.statusFilter });

    this.filteredHologramRequestList = this.hologramRequestList.filter(request => {
      let matchesDate = true;
      let matchesMonth = true;
      let matchesStatus = true;

      // Date filter (exact date match)
      if (this.dateFilter) {
        const requestDate = new Date(request.submissionDate);
        // Handle timezone by using UTC date
        const requestDateString = requestDate.getUTCFullYear() + '-' +
          String(requestDate.getUTCMonth() + 1).padStart(2, '0') + '-' +
          String(requestDate.getUTCDate()).padStart(2, '0');
        matchesDate = requestDateString === this.dateFilter;
        console.log('Date comparison:', {
          originalDate: request.submissionDate,
          requestDateString,
          dateFilter: this.dateFilter,
          matches: matchesDate
        });
      }

      // Month filter (month and year match)
      if (this.monthFilter) {
        const requestDate = new Date(request.submissionDate);
        const filterDate = new Date(this.monthFilter + '-01');
        matchesMonth = requestDate.getFullYear() === filterDate.getFullYear() &&
          requestDate.getMonth() === filterDate.getMonth();
        console.log('Month comparison:', {
          requestYear: requestDate.getFullYear(),
          requestMonth: requestDate.getMonth(),
          filterYear: filterDate.getFullYear(),
          filterMonth: filterDate.getMonth(),
          matches: matchesMonth
        });
      }

      // Status filter
      if (this.statusFilter) {
        matchesStatus = request.status === this.statusFilter;
        console.log('Status comparison:', { requestStatus: request.status, statusFilter: this.statusFilter, matches: matchesStatus });
      }

      const finalMatch = matchesDate && matchesMonth && matchesStatus;
      console.log('Final match for request:', request.refNumber, finalMatch);

      return finalMatch;
    });

    console.log('Filtered results:', this.filteredHologramRequestList.length, 'out of', this.hologramRequestList.length);

    // Reset pagination to first page when filters are applied
    this.resetPagination('hologram-request');
  }

  clearFilters(): void {
    this.dateFilter = '';
    this.monthFilter = '';
    this.statusFilter = '';
    this.filteredHologramRequestList = [...this.hologramRequestList];
    this.resetPagination('hologram-request');
  }

  onDateFilterChange(): void {
    console.log('Date filter changed to:', this.dateFilter);
    this.applyFilters();
  }

  onMonthFilterChange(): void {
    console.log('Month filter changed to:', this.monthFilter);
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    console.log('Status filter changed to:', this.statusFilter);
    this.applyFilters();
  }



  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bi bi-clock';
      case 'APPROVED':
        return 'bi bi-check-circle';
      case 'REJECTED':
        return 'bi bi-x-circle';
      case 'PROCESSING':
        return 'bi bi-hourglass-split';
      default:
        return 'bi bi-question-circle';
    }
  }

  // Hologram filter methods
  applyHologramFilters(): void {
    console.log('Applying hologram filters:', {
      dateFilter: this.hologramDateFilter,
      monthFilter: this.hologramMonthFilter,
      yearFilter: this.hologramYearFilter,
      statusFilter: this.hologramStatusFilter
    });

    this.filteredHologramData = this.hologramList.filter(item => {
      let matchesDate = true;
      let matchesMonth = true;
      let matchesYear = true;
      let matchesStatus = true;

      // Parse the date from ISO format
      const itemDate = new Date(item.date);

      // Date filter (exact date match)
      if (this.hologramDateFilter) {
        const filterDate = new Date(this.hologramDateFilter);
        matchesDate = itemDate.getFullYear() === filterDate.getFullYear() &&
          itemDate.getMonth() === filterDate.getMonth() &&
          itemDate.getDate() === filterDate.getDate();
      }

      // Month filter (month and year match)
      if (this.hologramMonthFilter) {
        const filterDate = new Date(this.hologramMonthFilter + '-01');
        matchesMonth = itemDate.getFullYear() === filterDate.getFullYear() &&
          itemDate.getMonth() === filterDate.getMonth();
      }

      // Year filter
      if (this.hologramYearFilter) {
        const filterYear = parseInt(this.hologramYearFilter);
        matchesYear = itemDate.getFullYear() === filterYear;
      }

      // Status filter (exact match)
      if (this.hologramStatusFilter) {
        matchesStatus = item.status.toUpperCase() === this.hologramStatusFilter.toUpperCase();
      }

      const finalMatch = matchesDate && matchesMonth && matchesYear && matchesStatus;
      console.log('Hologram match for:', item.refNo, finalMatch);

      return finalMatch;
    });

    console.log('Filtered hologram results:', this.filteredHologramData.length, 'out of', this.hologramList.length);

    // Reset pagination to first page when filters are applied
    this.resetPagination('hologram');
  }

  clearHologramFilters(): void {
    this.hologramDateFilter = '';
    this.hologramMonthFilter = '';
    this.hologramYearFilter = '';
    this.hologramStatusFilter = '';
    this.filteredHologramData = [...this.hologramList];
    this.resetPagination('hologram');
  }

  onHologramDateFilterChange(): void {
    console.log('Hologram date filter changed to:', this.hologramDateFilter);
    this.applyHologramFilters();
  }

  onHologramMonthFilterChange(): void {
    console.log('Hologram month filter changed to:', this.hologramMonthFilter);
    this.applyHologramFilters();
  }

  onHologramYearFilterChange(): void {
    console.log('Hologram year filter changed to:', this.hologramYearFilter);
    this.applyHologramFilters();
  }

  onHologramStatusFilterChange(): void {
    console.log('Hologram status filter changed to:', this.hologramStatusFilter);
    this.applyHologramFilters();
  }

  // Hologram summary methods
  getHologramStatusCount(status: string): number {
    return this.hologramList.filter(item =>
      item.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  getTotalHologramQuantity(): number {
    return this.hologramList.reduce((total, item) => 
      total + this.getHologramTotal(item), 0
    );
  }





  // Navigate to payment confirmation page for hologram wallet payment (₹0.15 per hologram)
  navigateToPaymentPage(hologram: HologramRow): void {
    if (!this.isBrowser) return;

    // Check if Commissioner has approved
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const request = hologramRequests.find((req: any) => req.refNo === hologram.refNo);
    
    if (!request || request.commissionerStatus !== 'Approved') {
      alert('Payment is pending Commissioner approval. Please wait for Commissioner to approve your application.');
      return;
    }

    // Check if payment already completed for this reference number
    if (request.paymentCompleted === true) {
      alert('Payment has already been completed for this reference number.');
      return;
    }

    // Check if there are multiple types for the same reference number
    const sameRefItems = this.hologramList.filter(item => item.refNo === hologram.refNo);
    
    if (sameRefItems.length > 1) {
      // Multiple types exist - check if all are ready for payment
      const allApproved = sameRefItems.every(item => {
        const req = hologramRequests.find((r: any) => r.refNo === item.refNo);
        return req && req.commissionerStatus === 'Approved';
      });

      if (!allApproved) {
        // Not all types are ready for payment
        const notReadyTypes = sameRefItems.filter(item => {
          const req = hologramRequests.find((r: any) => r.refNo === item.refNo);
          return !req || req.commissionerStatus !== 'Approved';
        }).map(item => this.getProcurementType(item));

        alert(
          `Multiple types exist for reference number ${hologram.refNo}.\n\n` +
          `The following types are not yet ready for payment:\n${notReadyTypes.join(', ')}\n\n` +
          `All types must be approved by Commissioner before making payment.`
        );
        return;
      }

      // All types are ready - show multi-type payment modal
      this.multiTypePaymentItems = sameRefItems;
      this.showMultiTypePaymentModal = true;
      return;
    }

    // Single type - proceed with normal payment flow
    this.proceedToPayment(hologram.refNo);
  }

  // Close multi-type payment modal
  closeMultiTypePaymentModal(): void {
    this.showMultiTypePaymentModal = false;
    this.multiTypePaymentItems = [];
  }

  // Proceed to payment for all types
  proceedToMultiTypePayment(): void {
    if (this.multiTypePaymentItems.length === 0) return;
    
    const refNo = this.multiTypePaymentItems[0].refNo;
    this.closeMultiTypePaymentModal();
    this.proceedToPayment(refNo);
  }

  // Common method to proceed to payment page
  private proceedToPayment(refNo: string): void {
    if (!this.isBrowser) return;

    // Mark that payment page has been visited (for showing test button)
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const updatedRequests = hologramRequests.map((req: any) => {
      if (req.refNo === refNo) {
        return { ...req, paymentPageVisited: true };
      }
      return req;
    });
    localStorage.setItem('hologramRequests', JSON.stringify(updatedRequests));

    // Navigate to payment confirmation page with hologram tab active
    // Note: We only pass refNo, not type, because payment is for ALL types under this ref
    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: { 
        tab: 'hologram',
        refNo: refNo,
        action: 'makePayment'
      }
    });
  }

  // Calculate total payment amount for all types under same reference
  getTotalPaymentForRef(refNo: string): number {
    const sameRefItems = this.hologramList.filter(item => item.refNo === refNo);
    return sameRefItems.reduce((total, item) => total + this.calculatePaymentAmount(item), 0);
  }

  // Get total quantity for all types under same reference
  getTotalQuantityForRef(refNo: string): number {
    const sameRefItems = this.hologramList.filter(item => item.refNo === refNo);
    return sameRefItems.reduce((total, item) => total + this.getHologramTotal(item), 0);
  }

  // Check if payment page has been visited (for showing test button)
  hasVisitedPaymentPage(item: HologramRow): boolean {
    if (!this.isBrowser) return false;
    
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const request = hologramRequests.find((req: any) => req.refNo === item.refNo);
    
    return request?.paymentPageVisited === true;
  }



  calculatePaymentAmount(hologram: HologramRow): number {
    // Wallet payment rate is ₹0.15 per hologram
    const totalQty = this.getHologramTotal(hologram);
    return totalQty * 0.15;
  }

  // Clear payment slip data for testing
  clearPaymentSlipData(): void {
    if (!this.isBrowser) return;
    
    const confirmed = window.confirm('This will clear all uploaded payment slips. Are you sure?');
    if (!confirmed) return;

    // Clear payment slips from localStorage
    localStorage.removeItem('hologramPayments');
    
    // Update hologram applications to remove paymentSlipUploaded flag
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const updatedApplications = applications.map((app: any) => {
      const { paymentSlipUploaded, ...rest } = app;
      return rest;
    });
    localStorage.setItem('hologramApplications', JSON.stringify(updatedApplications));
    
    // Refresh the hologram list
    this.refreshHologramList();
    
    alert('Payment slip data cleared successfully!');
  }

  // Clear all hologram data for testing
  clearHologramData(): void {
    if (!this.isBrowser) return;
    
    const confirmed = window.confirm('This will clear ALL hologram data including applications, payments, and transactions. Are you sure?');
    if (!confirmed) return;

    // Clear all hologram-related data from localStorage
    localStorage.removeItem('hologramApplications');
    localStorage.removeItem('hologramPayments');
    localStorage.removeItem('hologramPaymentTransactions');
    localStorage.removeItem('hologramRequests');
    
    // Refresh the hologram list
    this.refreshHologramList();
    
    alert('All hologram data cleared successfully!');
  }

  // Mark payment as completed (for testing - this should be called from payment confirmation component)
  markPaymentCompleted(refNo: string): void {
    if (!this.isBrowser) return;

    // Get all applications with the same reference number
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const sameRefApplications = applications.filter((app: any) => app.refNo === refNo);
    
    // Check if ALL applications with this ref number have payment completed
    const allPaid = sameRefApplications.every((app: any) => app.paymentCompleted === true);
    
    if (!allPaid) {
      // Mark this specific application as paid
      const updatedApplications = applications.map((app: any) => {
        if (app.refNo === refNo && app.procurementType === this.getProcurementType(this.hologramList.find(h => h.refNo === refNo)!)) {
          return {
            ...app,
            paymentCompleted: true,
            paymentDate: new Date().toISOString()
          };
        }
        return app;
      });
      localStorage.setItem('hologramApplications', JSON.stringify(updatedApplications));
      
      // Check again if all are now paid
      const updatedSameRefApps = updatedApplications.filter((app: any) => app.refNo === refNo);
      const nowAllPaid = updatedSameRefApps.every((app: any) => app.paymentCompleted === true);
      
      if (nowAllPaid) {
        // All payments completed - update status
        this.updateAllPaymentsCompleted(refNo);
      } else {
        alert(`Payment marked for this type. ${updatedSameRefApps.filter((a: any) => !a.paymentCompleted).length} more payment(s) pending for ${refNo}.`);
      }
    } else {
      alert(`All payments already completed for ${refNo}.`);
    }

    // Refresh the hologram list
    this.refreshHologramList();
  }

  // Update status when all payments for a reference number are completed
  private updateAllPaymentsCompleted(refNo: string): void {
    if (!this.isBrowser) return;

    // Update hologramRequests
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const updatedRequests = hologramRequests.map((req: any) => {
      if (req.refNo === refNo) {
        return {
          ...req,
          paymentCompleted: true,
          status: 'Payment Completed',
          paymentDate: new Date().toISOString()
        };
      }
      return req;
    });
    localStorage.setItem('hologramRequests', JSON.stringify(updatedRequests));

    // Update hologramApplications - set status for all with same ref
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const updatedApplications = applications.map((app: any) => {
      if (app.refNo === refNo) {
        return {
          ...app,
          paymentCompleted: true,
          status: 'Payment Completed',
          paymentDate: new Date().toISOString()
        };
      }
      return app;
    });
    localStorage.setItem('hologramApplications', JSON.stringify(updatedApplications));

    alert(`All payments completed for ${refNo}. Status updated to "Payment Completed" in all dashboards.`);
  }

  // Get payment status class for styling
  getPaymentStatusClass(item: HologramRow): string {
    const status = item.status?.toLowerCase() || '';
    
    if (status.includes('payment completed') || item.paymentCompleted) {
      return 'bg-success-subtle text-success';
    } else if (status.includes('approved')) {
      return 'bg-primary-subtle text-primary';
    } else if (status.includes('pending')) {
      return 'bg-warning-subtle text-warning';
    } else if (status.includes('rejected')) {
      return 'bg-danger-subtle text-danger';
    } else {
      return 'bg-secondary-subtle text-secondary';
    }
  }

  // View payment slip for completed payments
  viewPaymentSlip(item: HologramRow): void {
    // Navigate to payslip component with ref and type
    this.router.navigate(['/dev-payslip'], {
      queryParams: {
        ref: item.refNo,
        type: 'HOLOGRAM'
      }
    });
  }




  // Close hologram details modal (alias for closeHologramDetails to match HTML)
  closeHologramDetailsModal(): void {
    this.closeHologramDetails();
  }

  // Get total holograms (alias for getHologramTotal to match HTML)
  getTotalHolograms(hologram: HologramRow): number {
    return this.getHologramTotal(hologram);
  }
}
