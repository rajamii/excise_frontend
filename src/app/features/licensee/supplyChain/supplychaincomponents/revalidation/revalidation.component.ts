import { Component, OnInit, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { SupplyChainService } from '../../services/supplychain.service';
import { environment } from '../../../../../../environments/environment';
import { AccountService } from '../../../../../core/services/account.service';
import { UnifiedActionButtonsComponent } from '../../../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../../../shared/services/unified-actions.service';

interface TableData {
  id: string;
  referenceNo: string;
  submissionDate: string;
  submissionDateRaw?: string;
  revalidationDateRaw?: string;
  requisitionDateRaw?: string;
  approvalDateRaw?: string;
  updatedAtRaw?: string;
  distilleryName: string;
  factoryName?: string;
  status: string;
  statusCode?: string;
  amount: string;
  isLive?: boolean;
  isInvalid?: boolean;
  allowedActions?: string[]; // Dynamic actions from backend
  workflowId?: number;
  currentStage?: number;
  currentStageIsFinal?: boolean | string; // Indicates if current stage is final approval
  allowedActionConfigs?: any[];
}

@Component({
  selector: 'app-revalidation',
  standalone: true,
  imports: [CommonModule, FormsModule, UnifiedActionButtonsComponent],
  templateUrl: './revalidation.component.html',
  styleUrl: './revalidation.component.scss'
})
export class RevalidationComponent implements OnInit {
  Math = Math;
  private isBrowser = false;

  // Filter properties for revalidation
  revalidationDateFilter: string = '';
  revalidationMonthFilter: string = '';
  revalidationYearFilter: string = '';
  revalidationStatusFilter: string = '';

  filteredRevalidationData: TableData[] = [];

  revlidationData: TableData[] = [];

  // Pagination state
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  // Services
  private unifiedActionsService = inject(UnifiedActionsService);

  constructor(
    private router: Router,
    private supplyChainService: SupplyChainService,
    private http: HttpClient,
    private accountService: AccountService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('DEBUG: RevalidationComponent Constructor');
  }

  ngOnInit(): void {
    console.log('DEBUG: ngOnInit');
    this.fetchRevalidationData();
  }

  async fetchRevalidationData() {
    try {
      console.log('DEBUG: Fetching data...');

      let response: any;

      if (this.supplyChainService) {
        console.log('DEBUG: Using SupplyChainService');
        response = await firstValueFrom(this.supplyChainService.getRevalidationData());
      } else {
        console.warn('DEBUG: Service undefined! Using direct Http as fallback.');
        const url = `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/`;
        response = await firstValueFrom(this.http.get<any[]>(url));

        // Manual handling of results structure if direct call
        if (response && !Array.isArray(response) && response.results) {
          response = response.results;
        }
      }

      console.log('DEBUG: Raw Response:', response);

      this.revlidationData = (response || []).map((item: any) => {
        const dateVal = item.revalidationDate || item.revalidation_date;
        let formattedDate = '';
        try {
          formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '';
        } catch (e) {
          formattedDate = '';
        }

        return {
          id: item.id, // Map ID
          referenceNo: item.ourRefNo || item.our_ref_no,
          submissionDate: formattedDate,
          submissionDateRaw: dateVal || '',
          revalidationDateRaw: item.revalidationDate || item.revalidation_date || '',
          requisitionDateRaw: item.requisitionDate || item.requisition_date || '',
          approvalDateRaw: item.approvalDate || item.approval_date || '',
          updatedAtRaw: item.updatedAt || item.updated_at || '',
          factoryName: item.establishment_name || item.establishmentName || item.factory_name || item.factoryName || '',
          distilleryName: item.distilleryName || item.distillery_name,
          status: item.status,
          statusCode: item.statusCode || item.status_code || '',
          amount: item.revalidationBrAmount || item.revalidation_br_amount || '0.00',
          isLive: !item.status?.includes('INVALID') && !item.status?.includes('EXPIRED'),
          isInvalid: item.status?.includes('INVALID') || item.status?.includes('EXPIRED'),
          allowedActions: item.allowedActions || item.allowed_actions || [],
          allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
          workflowId: item.workflow || item.workflow_id || item.workflowId,
          currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId
        }
      });

      // Freeze objects to prevent mutations
      this.revlidationData.forEach(item => {
        Object.freeze(item.allowedActions);
      });

      this.filteredRevalidationData = [...this.revlidationData];
      console.log('DEBUG: Processed Data length:', this.filteredRevalidationData.length);
      console.log('DEBUG: Each item allowedActions:');
      this.filteredRevalidationData.forEach(item => {
        console.log(`  ID ${item.id}: allowedActions =`, item.allowedActions, `(length: ${item.allowedActions?.length || 0})`);
      });

      console.log('DEBUG: revlidationData[0] reference check:');
      console.log('  revlidationData[0]:', this.revlidationData[0]);
      console.log('  filteredRevalidationData[0]:', this.filteredRevalidationData[0]);
      console.log('  Same object?', this.revlidationData[0] === this.filteredRevalidationData[0]);

    } catch (error) {
      console.error('Error fetching revalidation data:', error);
    }
  }

  // Revalidation filter methods
  applyRevalidationFilters(): void {
    console.log('applyRevalidationFilters called');
    console.log('Source data (revlidationData) before filter:');
    this.revlidationData.forEach(item => {
      console.log(`  ID ${item.id}: allowedActions =`, item.allowedActions);
    });

    console.log('Applying revalidation filters:', {
      dateFilter: this.revalidationDateFilter,
      monthFilter: this.revalidationMonthFilter,
      yearFilter: this.revalidationYearFilter,
      statusFilter: this.revalidationStatusFilter
    });

    this.filteredRevalidationData = this.revlidationData.filter(item => {
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

          if (this.revalidationDateFilter) {
            const filterDate = new Date(this.revalidationDateFilter);
            matchesDate = itemDate.getFullYear() === filterDate.getFullYear() &&
              itemDate.getMonth() === filterDate.getMonth() &&
              itemDate.getDate() === filterDate.getDate();
          }

          if (this.revalidationMonthFilter) {
            const filterDate = new Date(this.revalidationMonthFilter + '-01');
            matchesMonth = itemDate.getFullYear() === filterDate.getFullYear() &&
              itemDate.getMonth() === filterDate.getMonth();
          }

          if (this.revalidationYearFilter) {
            const filterYear = parseInt(this.revalidationYearFilter);
            matchesYear = itemDate.getFullYear() === filterYear;
          }
        }
      }

      if (this.revalidationStatusFilter) {
        matchesStatus = item.status.toLowerCase().includes(this.revalidationStatusFilter.toLowerCase());
      }

      const finalMatch = matchesDate && matchesMonth && matchesYear && matchesStatus;

      return finalMatch;
    });

    console.log('Filtered data after filter:');
    this.filteredRevalidationData.forEach(item => {
      console.log(`  ID ${item.id}: allowedActions =`, item.allowedActions);
    });

    this.resetPagination();
  }

  clearRevalidationFilters(): void {
    this.revalidationDateFilter = '';
    this.revalidationMonthFilter = '';
    this.revalidationYearFilter = '';
    this.revalidationStatusFilter = '';
    this.filteredRevalidationData = [...this.revlidationData];
    this.resetPagination();
  }

  onRevalidationDateFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationMonthFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationYearFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationStatusFilterChange(): void {
    this.applyRevalidationFilters();
  }

  getRevalidationStatusCount(status: string): number {
    return this.revlidationData.filter(item =>
      item.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  getLiveRevalidationCount(): number {
    return this.revlidationData.filter(item => item.isLive).length;
  }

  getTotalRevalidationAmount(): number {
    return this.revlidationData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }

  viewApplication(item: TableData, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Determine the source based on user type
    const userType = this.getUserType();
    let source = 'licensee-dashboard';

    if (userType === 'commissioner') {
      source = 'commissioner-dashboard';
    } else if (userType === 'permit-section') {
      source = 'permit-section';
    }

    const refNo = item.referenceNo;

    if (item.status && item.status.toLowerCase() === 'approvedrevalidationbycommissioner') {
      this.router.navigate(["/dev-revalidation-permit-slip"], {
        queryParams: {
          id: item.id,
          ref: refNo,
          source: source
        },
      });
      return;
    }

    this.router.navigate(["/dev-supply-chain-revalidation-request"], {
      queryParams: {
        id: item.id,
        ref: refNo,
        source: source,
        mode: 'view'
      },
    });
  }

  // Unified action handler
  onUnifiedAction(event: { action: string, item: any }): void {
    const context = this.getUserContext();

    this.unifiedActionsService.executeAction(
      event.action,
      event.item,
      'revalidation',
      context
    ).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (result.message) {
            alert(result.message);
          }
          // Reload data if it was a backend action
          if (['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'EXTEND'].includes(event.action)) {
            this.loadRevalidationData();
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
    return 'licensee';
  }

  // Load revalidation data
  loadRevalidationData(): void {
    this.fetchRevalidationData();
  }

  requestRevlidation(item: TableData): void {
    this.router.navigate(["/dev-supply-chain-revalidation-request"], {
      queryParams: {
        id: item.id,
      },
    });
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRevalidationData.length / this.pageSize));
  }

  getPaged(): TableData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const paged = this.filteredRevalidationData.slice(start, start + this.pageSize);
    console.log('getPaged() returning:', paged.length, 'items');
    console.log('CHECK SOURCE DATA - revlidationData[0]:', this.revlidationData[0]?.allowedActions);
    console.log('CHECK FILTERED DATA - filteredRevalidationData[0]:', this.filteredRevalidationData[0]?.allowedActions);
    paged.forEach(item => {
      console.log(`  Paged ID ${item.id}: allowedActions =`, item.allowedActions);
    });
    return paged;
  }

  goToPage(page: number): void {
    const total = this.getTotalPages();
    if (page < 1 || page > total) return;
    this.currentPage = page;
  }

  resetPagination(): void {
    this.currentPage = 1;
  }

  changePageSize(size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSize = s;
    this.currentPage = 1;
  }

  // Role detection methods
  isCommissioner(): boolean {
    const hasRole = this.accountService.hasAnyRole([
      10,
      'commissioner',
      'joint_commissioner',
      'level_1',
      'level_2',
      'level_3',
      'level_4',
      'level_5',
      'site_admin'
    ]);
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

  getCompanyColumnLabel(): string {
    return this.isCommissioner() ? 'Factory Name' : 'Distillery Name';
  }

  getCompanyDisplayName(item: TableData): string {
    if (this.isCommissioner()) {
      return item.factoryName || '-';
    }
    return item.distilleryName || '-';
  }

  // Workflow actions
  approveRevalidation(item: TableData): void {
    if (!item.id) {
      console.error('Revalidation ID not found');
      return;
    }

    // Pass generic remarks or prompt user
    this.supplyChainService.performRevalidationAction(item.id, 'APPROVE', 'Approved from Revalidation Component').subscribe({
      next: (response) => {
        alert(`Action successful! Status updated to: ${response.status}`);
        this.fetchRevalidationData(); // Reload data
      },
      error: (error) => {
        console.error('Error performing action:', error);
        alert('Failed to perform action. ' + (error.error?.error || error.error?.message || ''));
      }
    });
  }

  rejectRevalidation(item: TableData): void {
    if (!item.id) {
      console.error('Revalidation ID not found');
      return;
    }

    this.supplyChainService.performRevalidationAction(item.id, 'REJECT', 'Rejected from Revalidation Component').subscribe({
      next: (response) => {
        alert(`Action successful! Status updated to: ${response.status}`);
        this.fetchRevalidationData(); // Reload data
      },
      error: (error) => {
        console.error('Error performing action:', error);
        alert('Failed to perform action. ' + (error.error?.error || error.error?.message || ''));
      }
    });
  }

  canPerformAction(item: TableData): boolean {
    if (item.status?.includes('INVALID')) return false;
    console.log(`[ID: ${item.id}] canPerformAction - allowedActions:`, item.allowedActions);
    if (item.allowedActions && item.allowedActions.includes('APPROVE')) {
      console.log(`[ID: ${item.id}] ✓ APPROVE button WILL SHOW`);
      return true;
    }
    console.log(`[ID: ${item.id}] ✗ APPROVE button HIDDEN`);
    return false;
  }

  canReject(item: TableData): boolean {
    if (item.status?.includes('INVALID')) return false;
    console.log(`[ID: ${item.id}] canReject - allowedActions:`, item.allowedActions);
    if (item.allowedActions && item.allowedActions.includes('REJECT')) {
      console.log(`[ID: ${item.id}] ✓ REJECT button WILL SHOW`);
      return true;
    }
    console.log(`[ID: ${item.id}] ✗ REJECT button HIDDEN`);
    return false;
  }

  getActionIncludeList(item: TableData): string[] {
    const actions = ['VIEW'];
    
    // For revalidation, show payment slip after submission (₹1000 deduction)
    const hasPayment = this.hasPaymentBeenMade(item);
    
    console.log('🔍 getActionIncludeList (revalidation):', {
      itemId: item.id,
      refNo: item.referenceNo,
      status: item.status,
      hasPayment,
      allowedActions: item.allowedActions,
      isCommissioner: this.isCommissioner()
    });
    
    // Show "View Payment Slip" after payment is made (₹1000 deducted)
    if (hasPayment) {
      actions.push('VIEW_PAYMENT_SLIP');
    }
    
    // Trust backend for VIEW_PERMIT_SLIP action
    if (item.allowedActions && item.allowedActions.includes('VIEW_PERMIT_SLIP')) {
      console.log('✅ Backend says show VIEW_PERMIT_SLIP');
      actions.push('VIEW_PERMIT_SLIP');
    }
    
    console.log('🔍 Final actions array:', actions);
    return actions;
  }

  hasPaymentBeenMade(item: TableData): boolean {
    // Check if payment has been completed (₹1000 deducted from wallet)
    const status = (item.status || '').toLowerCase().replace(/\s+/g, '');
    
    // Payment indicators for revalidation
    // After submission, ₹1000 is deducted, so any status after submission indicates payment
    const statusIndicatesPayment = status.includes('forwarded') ||
                                   status.includes('approved') ||
                                   status.includes('revalidation') ||
                                   status.includes('submitted') ||
                                   status.includes('pending');
    
    console.log('🔍 hasPaymentBeenMade check (revalidation):', {
      status,
      statusIndicatesPayment,
      result: statusIndicatesPayment
    });
    
    return statusIndicatesPayment;
  }

  canViewPermitSlip(item: TableData): boolean {
    // Only commissioner can view permit slip at final approved stage
    if (!this.isCommissioner()) {
      return false;
    }
    
    const status = (item.status || '').toLowerCase().replace(/\s+/g, '');
    const currentStageIsFinal = item.currentStageIsFinal === true || item.currentStageIsFinal === 'true';
    
    // Check if it's at final approved stage
    // For revalidation, show permit slip when forwarded to commissioner OR approved by commissioner
    const isFinalApproved = (status.includes('approved') && currentStageIsFinal) ||
                           status.includes('approvedrevalidationbycommissioner') ||
                           status.includes('forwardedrevalidationtocommissioner') || // Show for commissioner review
                           status.includes('finalapproved');
    
    console.log('🔍 canViewPermitSlip (revalidation):', {
      status: item.status,
      normalizedStatus: status,
      currentStageIsFinal,
      isFinalApproved,
      isCommissioner: this.isCommissioner()
    });
    
    return isFinalApproved;
  }

  getRevalidationExtensionRange(item: TableData): string {
    if (!this.isCommissionerApprovedRevalidation(item)) {
      return '-';
    }

    const fromDate =
      this.parseDate(item.approvalDateRaw) ||
      this.parseDate(item.requisitionDateRaw) ||
      this.parseDate(item.revalidationDateRaw) ||
      this.parseDate(item.updatedAtRaw) ||
      this.parseDate(item.submissionDateRaw) ||
      this.parseDate(item.submissionDate);

    if (!fromDate) {
      return '-';
    }

    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 45);
    return `${this.formatDisplayDate(fromDate)} to ${this.formatDisplayDate(toDate)}`;
  }

  private isCommissionerApprovedRevalidation(item: TableData): boolean {
    const status = this.normalizeToken(item.status);
    const statusCode = this.normalizeToken(item.statusCode);
    return status.includes('approvedrevalidationbycommissioner') || statusCode === 'rv09';
  }

  private parseDate(value: string | undefined): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDisplayDate(date: Date): string {
    return date
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      .replace(/ /g, '-');
  }

  private normalizeToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

}
