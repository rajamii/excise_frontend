import { Component, Inject, PLATFORM_ID, OnInit, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';

const normalizeActionTokens = (actions: any): string[] => {
  if (!Array.isArray(actions)) return [];
  return actions.map(a => String(a).trim().toUpperCase()).filter(Boolean);
};

@Component({
  selector: 'app-hologramrequest',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramrequest.component.html',
  styleUrl: './hologramrequest.component.scss'
})
export class HologramrequestComponent implements OnInit {
  Math = Math;
  hologramRequestList: any[] = [];
  summaryHologramRequestList: any[] = [];
  filteredHologramRequestList: any[] = [];
  activeSummaryFilter: string = '';
  private isBrowser = false;
  private initialSummaryAutoSelected = false;

  // Filter properties
  dateFilter: string = '';
  monthFilter: string = '';
  statusFilter: string = '';

  showRequestModal = false;
  selectedRequest: any = null;

  // Rolls Assigned Modal
  showRollsModal = false;
  selectedRequestForRolls: any = null;

  // Holograms Available (sidebar info-only)
  isHologramAvailableSidebarExpanded = false;
  private rollsDetails: any[] = [];
  private hologramAvailability: Record<'LOCAL' | 'EXPORT' | 'DEFENCE', number> = {
    LOCAL: 0,
    EXPORT: 0,
    DEFENCE: 0,
  };

  // Pagination state
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  private hologramService = inject(HologramDataService);

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadHologramRequests();
    this.loadHologramAvailability();
  }

  toggleHologramAvailableSidebar(): void {
    this.isHologramAvailableSidebarExpanded = !this.isHologramAvailableSidebarExpanded;
  }

  private loadHologramAvailability(): void {
    this.hologramService.getRollsDetails().subscribe({
      next: (rolls: any[]) => {
        this.rollsDetails = Array.isArray(rolls) ? rolls : [];
        this.recomputeHologramAvailability();
      },
      error: (err) => {
        console.error('Error loading rolls details for availability sidebar', err);
        this.rollsDetails = [];
        this.hologramAvailability = { LOCAL: 0, EXPORT: 0, DEFENCE: 0 };
      }
    });
  }

  private recomputeHologramAvailability(): void {
    const totals: Record<'LOCAL' | 'EXPORT' | 'DEFENCE', number> = { LOCAL: 0, EXPORT: 0, DEFENCE: 0 };

    for (const roll of this.rollsDetails) {
      const type = String(roll?.type || roll?.hologram_type || roll?.hologramType || '').toUpperCase();
      if (type !== 'LOCAL' && type !== 'EXPORT' && type !== 'DEFENCE') continue;

      const qtyRaw = roll?.available ?? roll?.available_count ?? roll?.availableCount ?? 0;
      const qty = Number(qtyRaw) || 0;
      totals[type] += qty;
    }

    this.hologramAvailability = totals;
  }

  getAvailableHologramsByType(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): number {
    return Number(this.hologramAvailability?.[type]) || 0;
  }

  loadHologramRequests(): void {
    this.hologramService.getRequests().subscribe({
      next: (data) => {
        console.log('📦 Loading hologram requests from API:', data.length, 'items');

        let mapped = data.map((item: any) => {
          const stageName = item.current_stage_name || item.currentStageName || item.status || 'Unknown';
          return {
            ...item,
            // UI compatibility mapping
            refNumber: item.refNo, // Template uses refNumber
            totalHolograms: item.quantity, // Template uses totalHolograms
            hologramType: item.hologram_type || item.hologramType || 'LOCAL', // Use backend type
            status: stageName, // Keep DB stage name for display
            currentStageName: stageName,
            currentStageIsInitial: Boolean(item.current_stage_is_initial ?? item.currentStageIsInitial ?? false),
            currentStageIsFinal: Boolean(item.current_stage_is_final ?? item.currentStageIsFinal ?? false),
            currentStageEntryActions: normalizeActionTokens(item.current_stage_entry_actions || item.currentStageEntryActions || []),
            allowedActions: normalizeActionTokens(item.allowed_actions || item.allowedActions || [])
          };
        });

        // Sort by submission date (newest first)
        mapped.sort((a: any, b: any) => {
          const dateA = new Date(a.submissionDate || '').getTime();
          const dateB = new Date(b.submissionDate || '').getTime();
          return dateB - dateA; // Newest first
        });

        this.hologramRequestList = mapped;
        this.applyFilters();
        this.maybeAutoSelectUnderProcessSummary();
      },
      error: (err) => {
        console.error('Error loading hologram requests', err);
      }
    });
  }

  private maybeAutoSelectUnderProcessSummary(): void {
    if (this.initialSummaryAutoSelected) return;
    this.initialSummaryAutoSelected = true;

    if (this.statusFilter || this.activeSummaryFilter) return;

    // This screen doesn't have a "Pending" card; "UNDER_PROCESS" includes pending-like work.
    if (this.getSummaryRequestStatusCount('UNDER_PROCESS') > 0) {
      this.activeSummaryFilter = 'UNDER_PROCESS';
      this.statusFilter = 'UNDER_PROCESS';
      this.applyFilters();
    }
  }

  private isUsageDateToday(request: any): boolean {
    const usageDate = String(request?.usageDate || '').trim();
    if (!usageDate) return false;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const usageKey = usageDate.slice(0, 10);
    return usageKey === todayKey;
  }

  private isUsageDatePast(request: any): boolean {
    const usageDate = String(request?.usageDate || '').trim();
    if (!usageDate) return false;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const usageKey = usageDate.slice(0, 10);
    return usageKey < todayKey;
  }

  shouldShowUsageDateApprovalNotice(request: any): boolean {
    return this.getWorkflowCategory(request) === 'PENDING' && !this.isUsageDateToday(request) && !this.isUsageDatePast(request);
  }

  shouldShowUsageDateMissedNotice(request: any): boolean {
    // If usage date has passed and the request is still in pending-review bucket, treat it as rejected-by-timeout.
    return this.getWorkflowCategory(request) === 'PENDING' && this.isUsageDatePast(request);
  }

  navigateToHologramRequest(): void {
    this.router.navigate(['/dev-hologramrequestlevel1']);
  }
  private getRequestStatusCategory(requestOrStatus: any): string {
    const workflow = this.getWorkflowCategory(requestOrStatus);

    // Special rule: if the usage date is in the past and the request is still pending review,
    // consider it rejected due to no action taken on usage date.
    if (requestOrStatus && typeof requestOrStatus === 'object') {
      if (workflow === 'PENDING' && this.isUsageDatePast(requestOrStatus)) {
        return 'REJECTED';
      }
    }

    return workflow;
  }

  private getWorkflowCategory(requestOrStatus: any): string {
    if (requestOrStatus && typeof requestOrStatus === 'object') {
      const isInitial = Boolean(requestOrStatus.currentStageIsInitial ?? requestOrStatus.current_stage_is_initial ?? false);
      const isFinal = Boolean(requestOrStatus.currentStageIsFinal ?? requestOrStatus.current_stage_is_final ?? false);
      const entryActions = normalizeActionTokens(requestOrStatus.currentStageEntryActions || requestOrStatus.current_stage_entry_actions || []);
      const allowedActions = normalizeActionTokens(requestOrStatus.allowedActions || requestOrStatus.allowed_actions || []);

      if (isFinal && entryActions.includes('REJECT')) return 'REJECTED';
      if (isFinal) return 'APPROVED';
      if (allowedActions.includes('ISSUE') || allowedActions.includes('APPROVE') || allowedActions.includes('REJECT')) return 'PENDING';
      if (isInitial) return 'PENDING';
      return 'PROCESSING';
    }

    // Fallback for legacy data with only status text.
    const s = String(requestOrStatus || '').toUpperCase();
    if (s.includes('REJECT')) return 'REJECTED';
    if (s.includes('COMPLETE') || s.includes('APPROVE')) return 'APPROVED';
    if (s.includes('SUBMIT') || s.includes('PENDING')) return 'PENDING';
    return 'PROCESSING';
  }

  private isUnderProcessLikeRequest(request: any): boolean {
    const category = this.getRequestStatusCategory(request);
    return category === 'PENDING' || category === 'PROCESSING';
  }

  getSummaryRequestStatusCount(status: string): number {
    const s = String(status || '').toUpperCase();
    if (s === 'UNDER_PROCESS') {
      return this.summaryHologramRequestList.filter(r => this.isUnderProcessLikeRequest(r)).length;
    }
    return this.summaryHologramRequestList.filter(r => this.getRequestStatusCategory(r) === s).length;
  }

  getFilteredRequestStatusCount(status: string): number {
    const s = String(status || '').toUpperCase();
    if (s === 'UNDER_PROCESS') {
      return this.filteredHologramRequestList.filter(r => this.isUnderProcessLikeRequest(r)).length;
    }
    return this.filteredHologramRequestList.filter(r => this.getRequestStatusCategory(r) === s).length;
  }

  // Backward-compatible alias (some templates/build caches may still reference it)
  getRequestStatusCount(status: string): number {
    return this.getSummaryRequestStatusCount(status);
  }

  getStatusFilterLabel(value: string): string {
    const v = String(value || '').toUpperCase();
    if (!v) return 'All';
    if (v === 'UNDER_PROCESS') return 'Under Process';
    if (v === 'APPROVED') return 'Approved';
    if (v === 'REJECTED') return 'Rejected';
    if (v === 'PENDING') return 'Pending';
    if (v === 'PROCESSING') return 'Processing';
    return value;
  }

  getRequestStatusClass(request: any): string {
    const category = this.getRequestStatusCategory(request);
    if (category === 'APPROVED') return 'bg-success-subtle text-success';
    if (category === 'REJECTED') return 'bg-danger-subtle text-danger';
    if (category === 'PENDING') return 'bg-warning-subtle text-warning';
    return 'bg-secondary-subtle text-secondary';
  }

  getStatusIcon(request: any): string {
    const category = this.getRequestStatusCategory(request);
    if (category === 'APPROVED') return 'bi-check-circle-fill';
    if (category === 'REJECTED') return 'bi-x-circle-fill';
    if (category === 'PENDING') return 'bi-clock-fill';
    return 'bi-info-circle-fill';
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
Total Number of Holograms Required: ${request.totalHolograms.toLocaleString('en-IN')}




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

  getTotalRequestedHolograms(): number {
    return this.filteredHologramRequestList.reduce((total, request) => total + (request.totalHolograms || 0), 0);
  }

  // Filter methods
  applyFilters(): void {
    this.summaryHologramRequestList = this.hologramRequestList.filter(request => {
      let matchesDate = true;
      let matchesMonth = true;

      // Date filter (exact date match)
      if (this.dateFilter) {
        const requestDate = new Date(request.submissionDate);
        const requestDateString = requestDate.getUTCFullYear() + '-' +
          String(requestDate.getUTCMonth() + 1).padStart(2, '0') + '-' +
          String(requestDate.getUTCDate()).padStart(2, '0');
        matchesDate = requestDateString === this.dateFilter;
      }

      // Month filter (month and year match)
      if (this.monthFilter) {
        const requestDate = new Date(request.submissionDate);
        const filterDate = new Date(this.monthFilter + '-01');
        matchesMonth = requestDate.getFullYear() === filterDate.getFullYear() &&
          requestDate.getMonth() === filterDate.getMonth();
      }

      return matchesDate && matchesMonth;
    });

    this.filteredHologramRequestList = this.summaryHologramRequestList.filter(request => {
      if (!this.statusFilter) {
        return true;
      }

      const filter = String(this.statusFilter || '').toUpperCase();
      if (filter === 'UNDER_PROCESS') {
        return this.isUnderProcessLikeRequest(request);
      }
      return this.getRequestStatusCategory(request) === filter;
    });

    // Reset pagination to first page when filters are applied
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.dateFilter = '';
    this.monthFilter = '';
    this.statusFilter = '';
    this.activeSummaryFilter = '';
    this.summaryHologramRequestList = [...this.hologramRequestList];
    this.filteredHologramRequestList = [...this.hologramRequestList];
    this.currentPage = 1;
  }

  onDateFilterChange(): void {
    this.applyFilters();
  }

  onMonthFilterChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.syncActiveSummaryFilter();
    this.applyFilters();
  }

  onSummaryCardClick(filter: string): void {
    const normalized = String(filter || '').toUpperCase();
    const current = String(this.statusFilter || '').toUpperCase();

    if (!normalized || normalized === 'ALL') {
      this.activeSummaryFilter = '';
      this.statusFilter = '';
      this.applyFilters();
      return;
    }

    if (current === normalized) {
      this.activeSummaryFilter = '';
      this.statusFilter = '';
      this.applyFilters();
      return;
    }

    this.activeSummaryFilter = normalized;
    this.statusFilter = normalized;
    this.applyFilters();
  }

  private syncActiveSummaryFilter(): void {
    const normalized = String(this.statusFilter || '').toUpperCase();
    if (['APPROVED', 'REJECTED', 'UNDER_PROCESS'].includes(normalized)) {
      this.activeSummaryFilter = normalized;
      return;
    }
    this.activeSummaryFilter = '';
  }



  // Pagination methods
  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(data: any[]): number {
    return Math.max(1, Math.ceil((data?.length || 0) / this.pageSize));
  }

  getPaged<T = any>(data: T[]): T[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (data || []).slice(start, start + this.pageSize);
  }

  goToPage(page: number, data: any[]): void {
    const total = this.getTotalPages(data);
    if (page < 1 || page > total) return;
    this.currentPage = page;
  }

  changePageSize(size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSize = s;
    this.currentPage = 1;
  }

  markPaymentCompleted(refNo: string): void {
    if (!this.isBrowser) return;

    // Get all applications with the same reference number
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');

    // Mark this specific application as paid
    const updatedApplications = applications.map((app: any) => {
      if (app.refNo === refNo) {
        return {
          ...app,
          paymentCompleted: true,
          paymentDate: new Date().toISOString()
        };
      }
      return app;
    });
    localStorage.setItem('hologramApplications', JSON.stringify(updatedApplications));

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

    alert(`Payment marked as completed for ${refNo}.`);

    // Refresh the list
    this.loadHologramRequests();
  }

  // Rolls Assigned Methods
  hasRollsAssigned(request: any): boolean {
    // Check if request has rolls_assigned or rollsAssigned property with data
    const rolls = request.rolls_assigned || request.rollsAssigned || [];
    return Array.isArray(rolls) && rolls.length > 0;
  }

  viewRollsAssigned(request: any): void {
    this.selectedRequestForRolls = request;
    this.showRollsModal = true;
  }

  closeRollsModal(): void {
    this.showRollsModal = false;
    this.selectedRequestForRolls = null;
  }

  getRollsAssigned(request: any): any[] {
    if (!request) return [];
    
    // CRITICAL FIX: Use rolls_assigned which contains the actual allocated ranges from backend
    // rolls_assigned is populated during allocation with the exact ranges that were allocated (e.g., 4-4, 7-7)
    // available_cartons contains full roll ranges from procurement (e.g., 101-101, 102-102) - NOT what we want
    const rollsAssigned = request.rolls_assigned || request.rollsAssigned || [];
    
    // Ensure it's an array and normalize the data structure
    if (!Array.isArray(rollsAssigned)) return [];
    
    console.log('✅ getRollsAssigned - using rolls_assigned:', rollsAssigned);
    
    return rollsAssigned.map((roll: any) => ({
      cartoonNumber: roll.cartoonNumber || roll.cartoon_number || roll.carton_number || 'N/A',
      fromSerial: roll.fromSerial || roll.from_serial || 'N/A',
      toSerial: roll.toSerial || roll.to_serial || 'N/A',
      quantity: roll.quantity || 0
    }));
  }

  getTotalRollsQuantity(request: any): number {
    const rolls = this.getRollsAssigned(request);
    return rolls.reduce((total, roll) => total + (roll.quantity || 0), 0);
  }
}
