import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";

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
  status: string;
}

@Component({
  selector: "app-supply-chain",
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  private isBrowser = false;
  showHologramModal = false;
  
  // Filter properties
  dateFilter: string = '';
  monthFilter: string = '';
  statusFilter: string = '';
  selectedHologram: HologramRow | null = null;
  showRequestModal = false;
  selectedRequest: any = null;

  // Sample data for display only
  requisitionData: TableData[] = [
    {
      referenceNo: "BF502/EXCISE",
      submissionDate: "22-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status:
        "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
      amount: "8.00",
    },
    {
      referenceNo: "BF503/EXCISE",
      submissionDate: "21-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "APPLICATION UNDER REVIEW BY DEPARTMENT.",
      amount: "12.50",
    },
    {
      referenceNo: "BF504/EXCISE",
      submissionDate: "20-Sep-2025",
      distilleryName: "Royal Sikkim Brewery",
      status: "PERMIT APPROVED AND READY FOR COLLECTION.",
      amount: "15.75",
    },
    {
      referenceNo: "BF505/EXCISE",
      submissionDate: "19-Sep-2025",
      distilleryName: "Mountain View Distilleries",
      status: "DOCUMENTATION VERIFICATION IN PROGRESS.",
      amount: "9.25",
    },
    {
      referenceNo: "BF506/EXCISE",
      submissionDate: "18-Sep-2025",
      distilleryName: "Eastern Himalaya Distillery",
      status: "PERMIT PROCESSING - AWAITING FINAL APPROVAL.",
      amount: "11.00",
    },
    {
      referenceNo: "BF507/EXCISE",
      submissionDate: "17-Sep-2025",
      distilleryName: "Gangtok Premium Spirits",
      status: "APPLICATION SUBMITTED - INITIAL REVIEW COMPLETED.",
      amount: "14.25",
    },
    {
      referenceNo: "BF508/EXCISE",
      submissionDate: "16-Sep-2025",
      distilleryName: "Khangchendzonga Breweries",
      status: "PERMIT READY FOR DISPATCH TO LICENSEE.",
      amount: "13.50",
    },
    {
      referenceNo: "BF509/EXCISE",
      submissionDate: "15-Sep-2025",
      distilleryName: "Teesta Valley Distilleries",
      status: "TECHNICAL EVALUATION IN PROGRESS.",
      amount: "16.80",
    },
    {
      referenceNo: "BF510/EXCISE",
      submissionDate: "14-Sep-2025",
      distilleryName: "Rangit River Spirits",
      status: "COMPLIANCE CHECK COMPLETED - AWAITING CLEARANCE.",
      amount: "10.75",
    },
    {
      referenceNo: "BF511/EXCISE",
      submissionDate: "13-Sep-2025",
      distilleryName: "Sikkim Highland Brewery",
      status: "PERMIT APPROVED - COLLECTION NOTICE SENT.",
      amount: "18.90",
    },
    {
      referenceNo: "BF512/EXCISE",
      submissionDate: "12-Sep-2025",
      distilleryName: "Pelling Craft Distillery",
      status: "APPLICATION UNDER DEPARTMENTAL REVIEW.",
      amount: "7.60",
    },
    {
      referenceNo: "BF513/EXCISE",
      submissionDate: "11-Sep-2025",
      distilleryName: "Yuksom Traditional Spirits",
      status: "PERMIT GENERATION IN FINAL STAGE.",
      amount: "20.25",
    },
    {
      referenceNo: "BF514/EXCISE",
      submissionDate: "10-Sep-2025",
      distilleryName: "Namchi Valley Breweries",
      status: "DOCUMENTATION REVIEW COMPLETED - PROCESSING.",
      amount: "12.40",
    },
    {
      referenceNo: "BF515/EXCISE",
      submissionDate: "09-Sep-2025",
      distilleryName: "Jorethang Premium Distillery",
      status: "PERMIT ISSUED - READY FOR COLLECTION.",
      amount: "19.15",
    },
  ];

  revlidationData: TableData[] = [
    {
      referenceNo: "IMP/SUP-AGDIST",
      submissionDate: "22-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "IMPORT PERMIT EXTENDS 45 DAYS - INVALID",
      amount: "0.00",
      isLive: true,
      isInvalid: true,
    },
    {
      referenceNo: "REV/BF601",
      submissionDate: "18-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "REVALIDATION REQUEST PENDING APPROVAL",
      amount: "5.00",
      isLive: false,
      isInvalid: false,
    },
    {
      referenceNo: "REV/BF602",
      submissionDate: "17-Sep-2025",
      distilleryName: "Royal Sikkim Brewery",
      status: "PERMIT EXPIRED - REQUIRES IMMEDIATE REVALIDATION",
      amount: "7.50",
      isLive: true,
      isInvalid: true,
    },
    {
      referenceNo: "REV/BF603",
      submissionDate: "16-Sep-2025",
      distilleryName: "Mountain View Distilleries",
      status: "REVALIDATION APPROVED - PERMIT EXTENDED",
      amount: "6.25",
      isLive: false,
      isInvalid: false,
    },
  ];

  cancellationData: TableData[] = [
    {
      referenceNo: "CAN/BF701",
      submissionDate: "15-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "CANCELLATION REQUEST APPROVED",
      amount: "0.00",
    },
    {
      referenceNo: "CAN/BF702",
      submissionDate: "14-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "CANCELLATION UNDER REVIEW",
      amount: "0.00",
    },
  ];
  transitData: TableData[] = [
    {
      referenceNo: "TRN/BF801",
      submissionDate: "13-Sep-2025",
      distilleryName: "Royal Sikkim Brewery",
      status: "TRANSIT PERMIT ISSUED",
      amount: "10.00",
    },
    {
      referenceNo: "TRN/BF802",
      submissionDate: "12-Sep-2025",
      distilleryName: "Mountain View Distilleries",
      status: "TRANSIT APPLICATION PROCESSING",
      amount: "8.50",
    },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.refreshHologramList();
    this.loadRequisitionData();
    this.loadTransitData();
    this.loadHologramRequests();
  }

  ngOnInit(): void {
    // Check for tab query parameter
    if (this.isBrowser) {
      const tab = this.route.snapshot.queryParamMap.get('tab');
      if (tab) {
        this.setActiveTab(tab);
      }
    }
  }

  private refreshHologramList(): void {
    if (!this.isBrowser) {
      this.hologramList = [];
      return;
    }
    
    // Load from both old hologramRequests and new hologramApplications
    const storedRequests = JSON.parse(localStorage.getItem("hologramRequests") || "[]");
    const storedApplications = JSON.parse(localStorage.getItem("hologramApplications") || "[]");
    
    // Map old format
    const mappedRequests: HologramRow[] = (storedRequests || []).map((r: any) => ({
      refNo: r.refNo,
      date: r.date,
      companyName: r.companyName,
      localQtyLakh: r.localQtyLakh,
      exportQtyLakh: r.exportQtyLakh,
      defenceQtyLakh: r.defenceQtyLakh,
      status: "Submitted",
    }));
    
    // Map new format from dashboard
    const mappedApplications: HologramRow[] = (storedApplications || []).map((a: any) => ({
      refNo: a.refNo,
      date: a.date,
      companyName: a.companyName,
      localQtyLakh: a.localQtyLakh,
      exportQtyLakh: a.exportQtyLakh,
      defenceQtyLakh: a.defenceQtyLakh,
      status: a.status || "Submitted",
    }));
    
    // Combine both lists and remove duplicates by refNo
    const combined = [...mappedApplications, ...mappedRequests];
    const uniqueMap = new Map();
    combined.forEach(item => {
      if (!uniqueMap.has(item.refNo)) {
        uniqueMap.set(item.refNo, item);
      }
    });
    
    let mapped = Array.from(uniqueMap.values());

    if (!mapped.length) {
      // Seed with demo rows so user can see how it looks
      const today = new Date().toISOString().split("T")[0];
      mapped.push(
        {
          refNo: "YB/1/BREW/" + String(new Date().getFullYear()).slice(-2),
          date: today,
          companyName: "Yuksom Breweries Ltd.",
          localQtyLakh: 15,
          exportQtyLakh: 0,
          defenceQtyLakh: 0,
          status: "Draft",
        },
        {
          refNo: "YB/2/BREW/" + String(new Date().getFullYear()).slice(-2),
          date: today,
          companyName: "Yuksom Breweries Ltd.",
          localQtyLakh: 10,
          exportQtyLakh: 2,
          defenceQtyLakh: 0,
          status: "Submitted",
        },
      );
      // Persist the seeded rows so the hologram view page can find them by ref
      localStorage.setItem(
        "hologramRequests",
        JSON.stringify(
          mapped.map((m) => ({
            refNo: m.refNo,
            date: m.date,
            companyName: m.companyName,
            localQtyLakh: m.localQtyLakh,
            exportQtyLakh: m.exportQtyLakh,
            defenceQtyLakh: m.defenceQtyLakh,
          })),
        ),
      );
    } else {
      // Sort by date (newest first)
      mapped = mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    this.hologramList = mapped;
  }

  private loadRequisitionData(): void {
    if (!this.isBrowser) {
      return;
    }

    // Load import permit requests from localStorage
    const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');

    // Sort by submission time (newest first) to ensure proper ordering
    importPermitRequests.sort((a: any, b: any) => {
      const dateA = new Date(a.submittedAt || a.date).getTime();
      const dateB = new Date(b.submittedAt || b.date).getTime();
      return dateB - dateA; // Newest first
    });

    // Convert import permit data to requisition format
    const importPermitData: TableData[] = importPermitRequests
      .filter((permit: any) => permit.type !== 'transit-permit') // Exclude transit permits from requisition tab
      .map((permit: any) => ({
        referenceNo: permit.refNo,
        submissionDate: new Date(permit.date).toLocaleDateString('en-GB'),
        distilleryName: this.getDistilleryDisplayName(permit.liftedFrom),
        status: "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
        amount: "8.00"
      }));

    // Get the original sample data (without any previously added import permits)
    const originalSampleData: TableData[] = [
      {
        referenceNo: "BF502/EXCISE",
        submissionDate: "22-Sep-2025",
        distilleryName: "Sikkim Distilleries Ltd",
        status: "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
        amount: "8.00",
      },
      {
        referenceNo: "BF503/EXCISE",
        submissionDate: "21-Sep-2025",
        distilleryName: "Himalayan Distilleries Pvt Ltd",
        status: "APPLICATION UNDER REVIEW BY DEPARTMENT.",
        amount: "12.50",
      },
      {
        referenceNo: "BF504/EXCISE",
        submissionDate: "20-Sep-2025",
        distilleryName: "Royal Sikkim Brewery",
        status: "PERMIT APPROVED AND READY FOR COLLECTION.",
        amount: "15.75",
      },
      {
        referenceNo: "BF505/EXCISE",
        submissionDate: "19-Sep-2025",
        distilleryName: "Mountain View Distilleries",
        status: "DOCUMENTATION VERIFICATION IN PROGRESS.",
        amount: "9.25",
      },
      {
        referenceNo: "BF506/EXCISE",
        submissionDate: "18-Sep-2025",
        distilleryName: "Eastern Himalaya Distillery",
        status: "PERMIT PROCESSING - AWAITING FINAL APPROVAL.",
        amount: "11.00",
      }
    ];

    // Combine with sample data, putting new submissions at the top
    this.requisitionData = [...importPermitData, ...originalSampleData];
  }

  private loadTransitData(): void {
    if (!this.isBrowser) {
      return;
    }

    // Load transit permit requests from localStorage
    const transitPermitRequests = JSON.parse(localStorage.getItem('transitPermitRequests') || '[]');

    // Also check importPermitRequests for transit permits (for backward compatibility)
    const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
    const transitFromImport = importPermitRequests.filter((permit: any) => permit.type === 'transit-permit');

    // Combine both sources
    const allTransitRequests = [...transitPermitRequests, ...transitFromImport];

    // Sort by submission time (newest first)
    allTransitRequests.sort((a: any, b: any) => {
      const dateA = new Date(a.submissionDate || a.date).getTime();
      const dateB = new Date(b.submissionDate || b.date).getTime();
      return dateB - dateA; // Newest first
    });

    // Convert transit permit data to table format
    const transitPermitData: TableData[] = allTransitRequests.map((permit: any) => ({
      referenceNo: permit.billNo || permit.refNo,
      submissionDate: new Date(permit.submissionDate || permit.date).toLocaleDateString('en-GB'),
      distilleryName: permit.soleDistributor || permit.distilleryName || 'Unknown Distributor',
      status: permit.status || 'TRANSIT PERMIT ISSUED',
      amount: (permit.totalAmount || permit.brAmount || 0).toFixed(2)
    }));

    // Get the original sample data
    const originalTransitData: TableData[] = [
      {
        referenceNo: "TRN/BF801",
        submissionDate: "13-Sep-2025",
        distilleryName: "Royal Sikkim Brewery",
        status: "TRANSIT PERMIT ISSUED",
        amount: "10.00",
      },
      {
        referenceNo: "TRN/BF802",
        submissionDate: "12-Sep-2025",
        distilleryName: "Mountain View Distilleries",
        status: "TRANSIT APPLICATION PROCESSING",
        amount: "8.50",
      },
    ];

    // Combine with sample data, putting new submissions at the top
    this.transitData = [...transitPermitData, ...originalTransitData];
  }

  private getDistilleryDisplayName(value: string): string {
    switch (value) {
      case 'sikkim-distilleries':
        return 'Sikkim Distilleries Ltd';
      case 'mountain-spirits':
        return 'Mountain Spirits Pvt Ltd';
      case 'highland-breweries':
        return 'Highland Breweries';
      case 'gangtok':
        return 'Gangtok Depot';
      case 'namchi':
        return 'Namchi Depot';
      case 'gyalshing':
        return 'Gyalshing Depot';
      case 'mangan':
        return 'Mangan Depot';
      default:
        return value || 'Unknown Distillery';
    }
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
    } else if (tab === "requisition") {
      // refresh requisition data on each visit
      this.loadRequisitionData();
    } else if (tab === "transit") {
      // refresh transit data on each visit
      this.loadTransitData();
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
    // Navigate to supply-chain hologram view
    this.router.navigate(["/dev-supply-chain-hologram-view"], {
      queryParams: { ref: item.refNo },
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

  requestRevlidation(item: TableData): void {
    // Navigate to payment confirmation page (development route)
    this.router.navigate(["/dev-payment-confirmation"], {
      queryParams: {
        tab: "revalidation",
        referenceNo: item.referenceNo,
      },
    });
  }

  viewWallet(): void {
    // Navigate to payment confirmation page (development route)
    this.router.navigate(["/dev-payment-confirmation"]);
  }

  viewHologram(refNo: string): void {
    this.router.navigate(["/dev-hologram"], { queryParams: { ref: refNo } });
  }

  openTransitApplication(refNo: string): void {
    this.router.navigate(["/dev-transit-permit"], {
      queryParams: { ref: refNo },
    });
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

  openApplicationView(): void {
    // Navigate to transit application view
    console.log('Application View button clicked');
    this.router.navigate(["/dev-supply-chain-transit-view"], {
      queryParams: { ref: "TRP/12/EXCISE" },
    });
  }

  applicationCheck(item: TableData): void {
    // Navigate to transit view level 1 component
    console.log('Application Check clicked for:', item.referenceNo);
    this.router.navigate(["/dev-supply-chain-transit-view-level1"], {
      queryParams: { ref: item.referenceNo },
    });
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

  toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden;
  }

  // Pagination state per tab
  pageSizeOptions: number[] = [5, 10, 15];
  pageSizeByTab: Record<string, number> = {
    requisition: 5,
    revalidation: 5,
    cancellation: 5,
    transit: 5,
    hologram: 5,
    'hologram-request': 5,
  };
  currentPageByTab: Record<string, number> = {
    requisition: 1,
    revalidation: 1,
    cancellation: 1,
    transit: 1,
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
    
    // Add sample data if no requests exist (for demonstration)
    if (storedRequests.length === 0) {
      const sampleRequests = [
        {
          refNumber: 'HRQ/241101/001',
          usageDate: '2024-11-15',
          brandName: 'sikkim-supreme',
          bottleSize: '375ml',
          totalHolograms: 5000,
          remarks: 'Urgent requirement for festival season',
          submissionDate: '2024-11-01T10:30:00.000Z',
          status: 'APPROVED'
        },
        {
          refNumber: 'HRQ/241031/002',
          usageDate: '2024-11-20',
          brandName: 'himalayan-gold',
          bottleSize: '180ml',
          totalHolograms: 3000,
          remarks: 'Regular monthly requirement',
          submissionDate: '2024-10-31T14:15:00.000Z',
          status: 'PENDING'
        },
        {
          refNumber: 'HRQ/241030/003',
          usageDate: '2024-11-25',
          brandName: 'royal-sikkim',
          bottleSize: '750ml',
          totalHolograms: 2000,
          remarks: 'Premium brand production',
          submissionDate: '2024-10-30T09:45:00.000Z',
          status: 'PROCESSING'
        }
      ];
      
      // Save sample data to localStorage
      localStorage.setItem('hologramRequests', JSON.stringify(sampleRequests));
      storedRequests = sampleRequests;
    }
    
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
}
