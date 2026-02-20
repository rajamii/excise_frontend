import { Component, Inject, PLATFORM_ID, OnInit, Input, inject } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SupplyChainProfileService } from "../../../../../core/services/supply-chain-profile.service";
import { Router } from "@angular/router";
import { SupplyChainService } from "../../services/supplychain.service";
import { UnifiedActionButtonsComponent } from '../../../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../../../shared/services/unified-actions.service';
import { AccountService } from '../../../../../core/services/account.service';

interface TableData {
  id?: number;
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  statusCode?: string;
  backendStatus?: string; // Original backend status for role-based logic
  amount: string;
  workflowId?: number;
  currentStage?: number;
  destination?: string;
  depotAddress?: string; // Add separate depot address field
  transportMode?: string;
  vehicleNumber?: string;
  permitValidUntil?: string;
  allowedActions?: string[]; // Dynamic actions from backend
  allowedActionConfigs?: any[];
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
  imports: [CommonModule, FormsModule, UnifiedActionButtonsComponent],
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
  transitData: TableData[] = [];

  // Services
  public accountService = inject(AccountService);
  private unifiedActionsService = inject(UnifiedActionsService);

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
  private mapBackendStatusToDisplayStatus(backendStatus: string, currentStageDescription?: string): string {
    const stageDescription = String(currentStageDescription || '').trim();
    if (stageDescription) return stageDescription;
    const value = String(backendStatus || '').trim();
    if (!value) return 'Pending';
    return value;
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
          const displayStatus = this.mapBackendStatusToDisplayStatus(
            backendStatus,
            item.current_stage_description || item.currentStageDescription
          );

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
              id: item.id, // Add ID for actions
              referenceNo: billNo,
              submissionDate: date,
              distilleryName: distributorName,
              status: displayStatus, // Use status from database with proper mapping
              statusCode: item.statusCode || item.status_code || '',
              backendStatus: backendStatus, // Store original backend status for role-based logic
              amount: rowTotal,
              workflowId: item.workflow || item.workflow_id || item.workflowId,
              currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId,
              destination: destination, // This should be the actual destination
              depotAddress: destination, // Store depot address separately
              transportMode: 'Road',
              vehicleNumber: vehicleNumber,
              permitValidUntil: '',
              allowedActions: item.allowedActions || item.allowed_actions || [], // Add allowed actions
              allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || []
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

  // Unified action handler
  onUnifiedAction(event: { action: string, item: any }): void {
    const context = this.getUserContext();
    const action = String(event.action || '').toUpperCase();

    this.unifiedActionsService.executeAction(
      action,
      event.item,
      'transit',
      context
    ).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (result.message) {
            alert(result.message);
          }
          // Reload data if it was a backend action
          if (['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'TERMINATE'].includes(action)) {
            this.loadTransitData();
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

  // Get current user context for actions
  getUserContext(): 'licensee' | 'permit-section' | 'commissioner' | 'itcell' | 'officer-in-charge' {
    if (this.isCommissioner()) return 'commissioner';
    if (this.isPermitSection()) return 'permit-section';
    if (this.isOfficerInCharge()) return 'officer-in-charge';
    return 'licensee';
  }

  // User role checks
  isCommissioner(): boolean {
    return this.accountService.hasAnyRole('commissioner');
  }

  isPermitSection(): boolean {
    return this.accountService.hasAnyRole('permit-section');
  }

  isOfficerInCharge(): boolean {
    return this.accountService.hasAnyRole('officer-in-charge');
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
      item.status === 'PENDING'
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

  getTransitIncludeActions(item: TableData): string[] {
    return ['VIEW'];
  }

  canShowPaymentSlip(item: TableData): boolean {
    const statusCode = String(item?.statusCode || '').trim().toUpperCase();
    const text = `${item?.status || ''} ${item?.backendStatus || ''}`.toLowerCase();
    if (statusCode === 'TRP_03' || statusCode === 'TRP_04') return true;
    return (
      text.includes('approved') ||
      text.includes('rejected') ||
      text.includes('cancelled') ||
      text.includes('refund initiated')
    );
  }

  openTransitSlip(item: TableData): void {
    const billNo = String(item?.referenceNo || '').trim();
    const queryParams = {
      type: 'transit',
      refNo: billNo || undefined,
      billNo: billNo || undefined,
      source: this.getUserContext()
    };

    this.router.navigate(['/payment-slip-view'], { queryParams })
      .then((ok) => {
        if (ok) return;
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams();
        if (queryParams.type) params.set('type', String(queryParams.type));
        if (queryParams.refNo) params.set('refNo', String(queryParams.refNo));
        if (queryParams.billNo) params.set('billNo', String(queryParams.billNo));
        if (queryParams.source) params.set('source', String(queryParams.source));
        const query = params.toString();
        window.location.href = query ? `/payment-slip-view?${query}` : '/payment-slip-view';
      })
      .catch(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams();
        if (queryParams.type) params.set('type', String(queryParams.type));
        if (queryParams.refNo) params.set('refNo', String(queryParams.refNo));
        if (queryParams.billNo) params.set('billNo', String(queryParams.billNo));
        if (queryParams.source) params.set('source', String(queryParams.source));
        const query = params.toString();
        window.location.href = query ? `/payment-slip-view?${query}` : '/payment-slip-view';
      });
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
      // Navigate within SPA to the transit permit application form
      this.router.navigate(['/dashboard'], {
        queryParams: { section: 'transit-permit' }
      });
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

  // Dashboard statistics methods
  getDashboardStatistics() {
    return {
      applied: this.getTransitStatusCount('APPLIED') + this.getTransitStatusCount('SUBMITTED'),
      pending: this.getTransitStatusCount('PENDING') + this.getTransitStatusCount('UNDER_REVIEW'),
      approved: this.getTransitStatusCount('APPROVED') + this.getTransitStatusCount('APPROVED_BY_COMMISSIONER'),
      rejected: this.getTransitStatusCount('REJECTED') + this.getTransitStatusCount('REJECTED_BY_COMMISSIONER')
    };
  }

  getFilterOptions() {
    return [
      { value: 'all', label: 'All Applications' },
      { value: 'transit', label: 'Transit Permits' },
      { value: 'pending', label: 'Pending Applications' },
      { value: 'approved', label: 'Approved Applications' },
      { value: 'rejected', label: 'Rejected Applications' }
    ];
  }

  onDashboardFilterChange(filterValue: string): void {
    // Handle dashboard filter changes
    if (filterValue === 'all') {
      this.transitStatusFilter = '';
    } else if (filterValue === 'pending') {
      this.transitStatusFilter = 'PENDING';
    } else if (filterValue === 'approved') {
      this.transitStatusFilter = 'APPROVED';
    } else if (filterValue === 'rejected') {
      this.transitStatusFilter = 'REJECTED';
    }
    this.applyTransitFilters();
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

  // Brand Details Panel
  showBrandDetailsPanel: boolean = false;

  // Brand Details Methods
  openBrandDetailsModal(referenceNo: string): void {
    this.selectedPermitRef = referenceNo;
    this.selectedBrandDetails = this.getBrandDetailsForPermit(referenceNo);
    this.showBrandDetailsPanel = true;
  }

  closeBrandDetailsPanel(): void {
    this.showBrandDetailsPanel = false;
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

  /**
   * Formats distributor names to show proper company names
   * Shows full company names like "Sikkim Distilleries Ltd" for all user roles
   */
  getFormattedDistributorName(distilleryName: string): string {
    if (!distilleryName) return 'N/A';

    // Map common distillery names to their full company names
    const companyNameMap: { [key: string]: string } = {
      'sikkim': 'Sikkim Distilleries Ltd',
      'sikkim distillery': 'Sikkim Distilleries Ltd',
      'sikkim distilleries': 'Sikkim Distilleries Ltd',
      'himalayan': 'Himalayan Distilleries Pvt Ltd',
      'himalayan distillery': 'Himalayan Distilleries Pvt Ltd',
      'royal': 'Royal Distilleries & Breweries Ltd',
      'royal distillery': 'Royal Distilleries & Breweries Ltd',
      'united': 'United Breweries Ltd',
      'united breweries': 'United Breweries Ltd',
      'mcleod': 'McLeod Russel India Ltd',
      'mcleod russel': 'McLeod Russel India Ltd'
    };

    const lowerName = distilleryName.toLowerCase().trim();

    // Check for exact matches first
    if (companyNameMap[lowerName]) {
      return companyNameMap[lowerName];
    }

    // Check for partial matches
    for (const key in companyNameMap) {
      if (lowerName.includes(key)) {
        return companyNameMap[key];
      }
    }

    // If no mapping found, format the existing name to look more professional
    return distilleryName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') + (distilleryName.toLowerCase().includes('ltd') || distilleryName.toLowerCase().includes('pvt') ? '' : ' Ltd');
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
