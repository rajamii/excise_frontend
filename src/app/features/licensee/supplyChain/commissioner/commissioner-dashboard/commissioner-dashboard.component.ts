import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { SupplyChainService } from '../../services/supplychain.service';
import { environment } from '../../../../../../environments/environment';
import { AccountService } from '../../../../../core/services/account.service';
import { DailyhologramrecordregisterComponent } from "../dailyhologramrecordregister/dailyhologramrecordregister.component";
import { RequisitionComponent } from "../../supplychaincomponents/requisition/requisition.component";
import { CancellationComponent } from "../../supplychaincomponents/cancellation/cancellation.component";
import { TransitComponent } from "../../supplychaincomponents/transit/transit.component";
import { PaymentSlipsViewComponent } from "../payment-slips-view/payment-slips-view.component";
import { HologramDetailsViewComponent } from "../hologram-details-view/hologram-details-view.component";


export interface CommissionerTableData {
  id?: string; // Added for actions
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
  // Additional fields for detailed view
  date?: string;
  submittedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  remarks?: string;
  // Payment slip tracking fields
  uploadedTypes?: string[];
  requiredTypes?: string[];
  slipDetails?: { [key: string]: any };
  // Edit tracking fields
  editedByCommissioner?: boolean;
  editHistory?: {
    editedBy: string;
    editedDate: string;
    originalQuantities: {
      local: number;
      export: number;
      defence: number;
      total: number;
    };
    updatedQuantities: {
      local: number;
      export: number;
      defence: number;
      total: number;
    };
  };
  // Commissioner status tracking
  commissionerStatus?: string;
  allowedActions?: string[]; // stored from backend
}

@Component({
  selector: "app-commissioner-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule, DailyhologramrecordregisterComponent, RequisitionComponent, CancellationComponent, TransitComponent, PaymentSlipsViewComponent, HologramDetailsViewComponent],
  templateUrl: "./commissioner-dashboard.component.html",
  styleUrls: ["./commissioner-dashboard.component.scss"],
})
export class CommissionerDashboardComponent implements OnInit {
  Math = Math;
  activeTab = "requisition"; // Start with requisition tab as default
  private isBrowser = false;

  // Filter properties for revalidation
  revalidationDateFilter: string = '';
  revalidationStatusFilter: string = '';
  revalidationPriorityFilter: string = '';

  // Filter properties for hologram
  hologramDateFilter: string = '';
  hologramStatusFilter: string = '';
  hologramTypeFilter: string = '';

  // Filtered data arrays
  filteredRevalidationData: CommissionerTableData[] = [];
  filteredHologramData: CommissionerTableData[] = [];

  // Modal properties
  showReviewModal = false;
  selectedApplication: CommissionerTableData | null = null;

  // Hologram details modal properties
  showHologramDetailsModal = false;
  selectedHologramApplication: CommissionerTableData | null = null;
  
  // Payment slips modal properties (separate from hologram details)
  showPaymentSlipsModal = false;
  selectedApplicationForSlips: CommissionerTableData | null = null;

  // Overdue hologram entries
  overdueHologramEntries: any[] = [];
  showOverdueAlert = false;

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

  // Sample data for hologram applications (from commissioner's perspective)
  hologramData: CommissionerTableData[] = [
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
    private http: HttpClient,
    private supplyChainService: SupplyChainService,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Load hologram applications from IT Cell
    this.loadHologramApplicationsFromITCell();
    
    // Fetch real revalidation data from backend
    this.fetchRevalidationData();

    // Initialize filtered data
    this.filteredRevalidationData = []; // Will be populated by fetchRevalidationData
    this.filteredHologramData = [...this.hologramData];

    // Check for tab query parameter
    if (this.isBrowser) {
      const tab = this.route.snapshot.queryParamMap.get('tab');
      if (tab) {
        this.setActiveTab(tab);
      }

      // Load overdue hologram entries
      this.loadOverdueEntries();

      // Listen for overdue alerts from daily register
      window.addEventListener('overdueHologramAlert', (event: any) => {
        this.overdueHologramEntries = event.detail.entries || [];
        this.showOverdueAlert = this.overdueHologramEntries.length > 0;
      });

      // Check for overdue entries every minute
      setInterval(() => {
        this.loadOverdueEntries();
      }, 60000);

      // Auto-refresh hologram data when storage changes (from IT Cell or other tabs)
      window.addEventListener('storage', (event) => {
        if (event.key === 'hologramRequests' || 
            event.key === 'hologramPaymentSlipTracking' || 
            event.key === 'hologramApplications') {
          console.log('🔄 Storage changed, refreshing Commissioner hologram data...');
          this.loadHologramApplicationsFromITCell();
        }
      });

      // Refresh data when tab becomes visible
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.activeTab === 'hologram') {
          console.log('🔄 Tab became visible, refreshing Commissioner hologram data...');
          this.loadHologramApplicationsFromITCell();
        }
      });

      // Refresh hologram data every 30 seconds when on hologram tab
      setInterval(() => {
        if (this.activeTab === 'hologram') {
          console.log('🔄 Auto-refresh: Reloading Commissioner hologram data...');
          this.loadHologramApplicationsFromITCell();
        }
      }, 30000); // 30 seconds
    }
  }

  loadHologramApplicationsFromITCell(): void {
    if (!this.isBrowser) return;

    // Load hologram requests from IT Cell
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    
    // Filter those that have been forwarded by IT Cell to Commissioner
    // In the new flow: IT Cell forwards directly to Commissioner (no payment slip upload required)
    const applicationsForCommissioner = hologramRequests.filter((req: any) => {
      // Must be forwarded by IT Cell to Commissioner
      if (req.itCellStatus === 'Forwarded' && req.commissionerStatus === 'Pending') {
        return true;
      }
      
      // Also include already approved/rejected by Commissioner
      if (req.commissionerStatus === 'Approved' || req.commissionerStatus === 'Rejected') {
        return true;
      }
      
      return false;
    });

    // Convert to commissioner table format
    const convertedData: CommissionerTableData[] = applicationsForCommissioner.map((req: any) => {
      // Determine status based on payment and approval stages
      let displayStatus = 'PENDING';
      
      // Check payment completion first
      if (req.paymentCompleted === true) {
        displayStatus = 'PAYMENT COMPLETED';
      }
      // Then check commissioner approval
      else if (req.commissionerStatus === 'Approved') {
        displayStatus = 'APPROVED';
      } else if (req.commissionerStatus === 'Rejected') {
        displayStatus = 'REJECTED';
      }

      return {
        referenceNo: req.refNo,
        submissionDate: req.date || req.submittedDate,
        distilleryName: req.companyName,
        status: displayStatus,
        amount: this.calculateHologramAmount(req).toString(),
        priority: req.commissionerStatus === 'Pending' ? 'high' : 'normal',
        localQtyLakh: req.localQtyLakh || 0,
        exportQtyLakh: req.exportQtyLakh || 0,
        defenceQtyLakh: req.defenceQtyLakh || 0,
        totalQtyLakh: (req.localQtyLakh || 0) + (req.exportQtyLakh || 0) + (req.defenceQtyLakh || 0),
        hologramType: 'Security Hologram'
      };
    });

    // Replace sample data with real data (show applications forwarded by IT Cell)
    this.hologramData = convertedData;
    this.filteredHologramData = [...this.hologramData];
  
  }

  calculateHologramAmount(req: any): number {
    const total = (req.localQtyLakh || 0) + (req.exportQtyLakh || 0) + (req.defenceQtyLakh || 0);
    // Rate is 0.15 rupees per hologram piece (wallet payment only)
    return total * 0.15;
  }

  loadOverdueEntries(): void {
    const overdueData = localStorage.getItem('overdueHologramEntries');
    if (overdueData) {
      this.overdueHologramEntries = JSON.parse(overdueData);
      this.showOverdueAlert = this.overdueHologramEntries.length > 0;
    } else {
      this.overdueHologramEntries = [];
      this.showOverdueAlert = false;
    }
  }

  dismissOverdueAlert(): void {
    this.showOverdueAlert = false;
  }

  viewDailyRegister(): void {
    this.setActiveTab('daily-register');
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
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

  viewMonthlyReport(): void {
    // Navigate to monthly hologram statement for distilleries and breweries
    const now = new Date();
    const month = now.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
    const year = now.getFullYear().toString();
    
    this.router.navigate(['/dev/monthlyhologramstatement-oic'], {
      queryParams: {
        month: month,
        year: year,
        type: 'LOCAL',
        referrer: 'commissioner'
      }
    });
  }

  // Status count methods
  getRevalidationStatusCount(status: string): number{
    return this.filteredRevalidationData.filter(item => item.status === status).length;
  }

  getUrgentRevalidationCount(): number {
    return this.filteredRevalidationData.filter(item => 
      item.priority === 'urgent' || item.isExpired || (item.daysLeft !== undefined && item.daysLeft <= 7)
    ).length;
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
    const s = status?.toUpperCase() || '';
    if (s.includes('PENDING') || s.includes('FORWARDED')) return 'pending';
    if (s.includes('APPROVED')) return 'approved';
    if (s.includes('REJECTED')) return 'rejected';
    if (s.includes('INVALID')) return 'expired';
    if (s.includes('PROCESSING')) return 'processing';
    if (s.includes('EXPIRED')) return 'expired';
    return 'default';
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
  async fetchRevalidationData() {
    try {
      console.log('Fetching revalidation data from backend...');
      // Use direct HTTP or service
      let response: any;
      if (this.supplyChainService) {
        response = await firstValueFrom(this.supplyChainService.getRevalidationData());
      } else {
         // Fallback manual fetch if service issue (unlikely)
         console.warn('Service unavailable, trying manual fetch');
         // const url = ...
         return; 
      }

      console.log('Header/Data response:', response);
      
      const rawData = Array.isArray(response) ? response : (response?.results || []);

      this.revalidationData = rawData.map((item: any) => {
        // Calculate days left and status info
        // Assuming backend gives us revalidationDate and we assume 30 days validity or getting it from item
        
        // Parsing dates
        const subDate = new Date(item.revalidationDate || item.revalidation_date || item.created_at);
        const expiryDate = new Date(subDate);
        expiryDate.setDate(subDate.getDate() + 30); // Defaulting to 30 days validity assumption if not provided
        
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isExpired = diffDays <= 0;

        // Map status
        // Use backend status directly as requested
        const status = item.status; 

        // Determine priority based on expiry/status
        let priority = 'normal';
        if (isExpired || diffDays < 5) priority = 'urgent';
        else if (diffDays < 10) priority = 'high';

        return {
          referenceNo: item.ourRefNo || item.our_ref_no,
          submissionDate: subDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
          expiryDate: expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
          distilleryName: item.distilleryName || item.distillery_name || 'Unknown Distillery',
          status: status,
          amount: item.revalidationBrAmount || item.revalidation_br_amount || '0.00',
          priority: priority,
          isExpired: isExpired,
          daysLeft: diffDays,
          // Store original ID for actions
          id: item.id,
          allowedActions: item.allowedActions || item.allowed_actions || [] 
        } as any; // Cast to any to allow extra fields like ID
      });

      this.filteredRevalidationData = [...this.revalidationData];
      console.log('Mapped Revalidation Data:', this.filteredRevalidationData);

    } catch (error) {
      console.error('Error fetching revalidation data:', error);
    }
  }

  // Action methods
  reviewRevalidation(item: any): void{
    // Navigate to revalidation letter view with reference number
    this.router.navigate(['/dev-revalidation-letter-view'], {
      queryParams: { ref: item.referenceNo }
    });
  }

  reviewHologram(item: CommissionerTableData): void {
    // Navigate to supply chain hologram view with reference number and from parameter
    this.router.navigate(['/dev-supply-chain-hologram-view'], {
      queryParams: { 
        ref: item.referenceNo,
        from: 'commissioner'
      }
    });
  }

  approveRevalidation(item: any): void {
    if (!item.id) {
        console.error('No ID found for action');
        return;
    }
    
    // Call API
    this.supplyChainService.performRevalidationAction(item.id, 'APPROVE', 'commissioner').subscribe({
        next: (res: any) => {
            alert('Revalidation Approved Successfully');
            this.fetchRevalidationData(); // Refresh
        },
        error: (err: any) => {
            console.error('Approval failed', err);
            alert('Approval Failed: ' + (err.error?.error || err.message));
        }
    });
  }

  rejectRevalidation(item: any): void {
    if (!item.id) {
        console.error('No ID found for action');
        return;
    }

    this.supplyChainService.performRevalidationAction(item.id, 'REJECT', 'commissioner').subscribe({
        next: (res: any) => {
            alert('Revalidation Rejected');
            this.fetchRevalidationData(); // Refresh
        },
        error: (err: any) => {
            console.error('Rejection failed', err);
            alert('Rejection Failed: ' + (err.error?.error || err.message));
        }
    });
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

  approveHologram(item: CommissionerTableData): void {
    item.status = 'APPROVED';
    
    
    // Update in hologramRequests storage to enable payment (no slip upload needed in new flow)
    if (this.isBrowser) {
      const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      const index = hologramRequests.findIndex((req: any) => req.refNo === item.referenceNo);
      if (index !== -1) {
        hologramRequests[index].commissionerStatus = 'Approved';
        hologramRequests[index].paymentEnabled = true; // Enable payment after Commissioner approval
        hologramRequests[index].status = 'Approved by Commissioner - Ready for Payment';
        hologramRequests[index].approvedBy = 'Commissioner';
        hologramRequests[index].approvedDate = new Date().toISOString().split('T')[0];
        
        // If there's a pending edit, now apply the quantities and make it visible
        if (hologramRequests[index].hasUnapprovedEdit && hologramRequests[index].pendingEditHistory) {
          // Apply the pending quantities
          if (hologramRequests[index].pendingQuantities) {
            hologramRequests[index].localQtyLakh = hologramRequests[index].pendingQuantities.local;
            hologramRequests[index].exportQtyLakh = hologramRequests[index].pendingQuantities.export;
            hologramRequests[index].defenceQtyLakh = hologramRequests[index].pendingQuantities.defence;
            delete hologramRequests[index].pendingQuantities;
          }
          // Make edit history visible
          hologramRequests[index].editedByCommissioner = true;
          hologramRequests[index].editHistory = hologramRequests[index].pendingEditHistory;
          delete hologramRequests[index].pendingEditHistory;
          delete hologramRequests[index].hasUnapprovedEdit;
        }
        
        localStorage.setItem('hologramRequests', JSON.stringify(hologramRequests));
      }

      // Also update hologramApplications (used by supply chain dashboard)
      const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
      // Update all rows with the same refNo
      applications.forEach((app: any) => {
        if (app.refNo === item.referenceNo) {
          app.status = 'Approved by Commissioner - Ready for Payment';
          app.commissionerStatus = 'Approved';
          app.paymentEnabled = true; // Enable payment after Commissioner approval
          app.approvedBy = 'Commissioner';
          app.approvedDate = new Date().toISOString().split('T')[0];
          
          // If there's a pending edit, now apply the quantities and make it visible
          if (app.hasUnapprovedEdit && app.pendingEditHistory) {
            // Apply the pending quantities
            if (app.pendingQuantities) {
              app.localQtyLakh = app.pendingQuantities.local;
              app.exportQtyLakh = app.pendingQuantities.export;
              app.defenceQtyLakh = app.pendingQuantities.defence;
              delete app.pendingQuantities;
            }
            // Make edit history visible
            app.editedByCommissioner = true;
            app.editHistory = app.pendingEditHistory;
            delete app.pendingEditHistory;
            delete app.hasUnapprovedEdit;
          }
        }
      });
      localStorage.setItem('hologramApplications', JSON.stringify(applications));
    }
    
    // Reload hologram data to reflect changes
    this.loadHologramApplicationsFromITCell();
    this.applyHologramFilters();
    
    console.log('Approved hologram application:', item.referenceNo);
    alert('Hologram application approved by Commissioner. Supply chain user can now proceed with payment.');
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
      } else if (this.activeTab === 'hologram') {
        this.approveHologram(this.selectedApplication);
      }
      // Note: Requisition, Cancellation, Transit approval is now handled in their respective components
      this.closeReviewModal();
    }
  }

  rejectFromModal(): void {
    if (this.selectedApplication) {
      if (this.activeTab === 'revalidation') {
        this.rejectRevalidation(this.selectedApplication);
      } else if (this.activeTab === 'hologram') {
        this.rejectHologram(this.selectedApplication);
      }
      // Note: Requisition, Cancellation, Transit rejection is now handled in their respective components
      this.closeReviewModal();
    }
  }

  issueFromModal(): void {
    if (this.selectedApplication) {
      if (this.activeTab === 'hologram') {
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
    
    // Load full details from hologramRequests
    if (this.isBrowser) {
      const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      const fullDetails = hologramRequests.find((req: any) => req.refNo === item.referenceNo);
      
      if (fullDetails) {
        // Merge full details with table data
        this.selectedHologramApplication = {
          ...item,
          ...fullDetails,
          referenceNo: item.referenceNo,
          submissionDate: item.submissionDate,
          distilleryName: item.distilleryName,
          commissionerStatus: fullDetails.commissionerStatus
        };
      } else {
        this.selectedHologramApplication = item;
      }
    } else {
      this.selectedHologramApplication = item;
    }
    
    // Reset edit mode
    // this.isEditingQuantity = false; // Moved to component
    
    this.showHologramDetailsModal = true;
    console.log('Modal should be visible now:', this.showHologramDetailsModal);
    console.log('Selected hologram details:', this.selectedHologramApplication);
    console.log('Commissioner Status:', this.selectedHologramApplication?.commissionerStatus);
  }

  closeHologramDetailsModal(): void {
    this.showHologramDetailsModal = false;
    this.selectedHologramApplication = null;
  }
  
  // Handle events from hologram details modal
  onHologramApprove(application: CommissionerTableData): void {
    this.approveHologram(application);
    this.closeHologramDetailsModal();
  }

  onHologramDataUpdated(): void {
    this.loadHologramApplicationsFromITCell();
    this.applyHologramFilters();
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

  // Check if payment is completed for hologram (ALL types with same ref must be paid)
  isPaymentCompleted(item: CommissionerTableData): boolean {
    if (!this.isBrowser) return false;
    
    // Check if ALL applications with the same reference number have payment completed
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const sameRefApplications = applications.filter((app: any) => app.refNo === item.referenceNo);
    
    if (sameRefApplications.length === 0) return false;
    
    // All applications with this ref must have paymentCompleted = true
    return sameRefApplications.every((app: any) => app.paymentCompleted === true);
  }

  // View payment slip for completed payments
  viewPaymentSlip(item: CommissionerTableData): void {
    this.router.navigate(['/dev-payslip'], {
      queryParams: {
        ref: item.referenceNo,
        type: 'HOLOGRAM'
      }
    });
  }

  // View uploaded payment slips for an application (separate modal)
  viewUploadedSlips(application: CommissionerTableData): void {
    this.selectedApplicationForSlips = application;
    this.showPaymentSlipsModal = true;
  }

  // Close payment slips modal
  closePaymentSlipsModal(): void {
    this.showPaymentSlipsModal = false;
    this.selectedApplicationForSlips = null;
  }



  // Handle events from payment slips modal
  onPaymentSlipsApprove(application: CommissionerTableData): void {
    this.approveHologram(application);
    this.closePaymentSlipsModal();
  }

  onPaymentSlipsReject(application: CommissionerTableData): void {
    this.rejectHologram(application);
    this.closePaymentSlipsModal();
  }
}
