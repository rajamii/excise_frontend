import { Component, OnInit, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HologramDataService } from '../../licensee/supplyChain/services/hologram-data.service';
import { AccountService } from '../../../core/services/account.service';
import { UnifiedActionsService } from '../../../shared/services/unified-actions.service';

@Component({
  selector: 'app-itcell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './itcell.component.html',
  styleUrl: './itcell.component.scss'
})
export class ITCELLComponent implements OnInit {
  selectedTabIndex = 0;
  showFullInterface = true; // Control whether to show full interface or clean view
  private initialSummaryAutoSelected = false;

  // Hologram Management
  Math = Math;
  hologramData: any[] = [];
  summaryHologramData: any[] = [];
  filteredHologramData: any[] = [];

  // Modal state
  showHologramModal = false;
  selectedHologram: any | null = null;

  // Filters
  selectedMonth: string = '';
  selectedYear: string = '';
  selectedDate: string = '';
  statusFilter: string = 'All';
  companyFilter: string = '';
  companyOptions: string[] = [];
  activeSummaryFilter: string = '';

  // Pagination
  pageSizeOptions: number[] = [5, 10, 15, 20];
  pageSize: number = 5;
  currentPage: number = 1;

  // Available options
  months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  private isBrowser = false;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private route: ActivatedRoute,
    private hologramService: HologramDataService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // Services
  public accountService = inject(AccountService);
  private unifiedActionsService = inject(UnifiedActionsService);
  private router = inject(Router);

  ngOnInit(): void {
    console.log('🚀 IT Cell component initializing...');

    // Check for tab parameter in query params
    this.route.queryParams.subscribe(params => {
      console.log('📋 Query params received:', params);

      // Determine if we should show the full interface or clean view
      if (params['section'] === 'itcell-hologram' || params['section'] === 'process-flow') {
        this.showFullInterface = false; // Clean view for sidenav navigation
      } else {
        this.showFullInterface = false; // Default to clean view for better UX
      }

      if (params['tab'] === 'process-flow' || params['section'] === 'process-flow') {
        console.log('🔄 Switching to Process Flow tab');
        this.selectedTabIndex = 1; // Switch to Process Flow tab
      } else if (params['tab'] === 'hologram' || params['section'] === 'itcell-hologram') {
        console.log('📊 Switching to Hologram Management tab');
        this.selectedTabIndex = 0; // Switch to Hologram Management tab
      } else {
        console.log('📊 Using default Hologram Management tab');
        this.selectedTabIndex = 0; // Default to Hologram Management tab
      }
      console.log('📑 Selected tab index:', this.selectedTabIndex);
      console.log('🎨 Show full interface:', this.showFullInterface);
    });

    this.loadHologramData();
  }

  private loadHologramData(): void {
    console.log('🔍 Loading hologram data...');
    this.hologramService.getProcurements().subscribe({
      next: (data) => {
        console.log('✅ Hologram data received:', data);
        this.hologramData = data.map((item: any) => ({
          ...item,
          // Map API fields to UI expected fields
          refNo: item.refNo,
          date: item.date,
          companyName: item.licenseeName || item.manufacturingUnit,
          localQtyLakh: Number(item.localQty),
          exportQtyLakh: Number(item.exportQty),
          defenceQtyLakh: Number(item.defenceQty),
          status: item.status, // Uses status name from backend
          paymentStatus: item.paymentStatus || item.payment_status || item?.paymentDetails?.payment_status || item?.payment_details?.payment_status || '',
          paymentDetails: item.paymentDetails || item.payment_details || null,
          allowedActions: item.allowedActions || [],
          // Include edit history
          editedByCommissioner: !!(item.editHistory || item.edit_history),
          editHistory: item.editHistory || item.edit_history || null
        }));
        console.log('📊 Processed hologram data:', this.hologramData);
        this.applyFilters();
        this.maybeAutoSelectPendingBucket();
      },
      error: (err) => {
        console.error('❌ Error loading holograms:', err);
        // Show user-friendly error message
        alert('Failed to load hologram data. Please check your connection and try again.');
      }
    });
  }

  private maybeAutoSelectPendingBucket(): void {
    if (this.initialSummaryAutoSelected) return;
    this.initialSummaryAutoSelected = true;

    const selected = String(this.statusFilter || '').trim();
    if (selected && selected.toLowerCase() !== 'all') return;

    if (this.getStatusCount('Pending') > 0) {
      this.statusFilter = 'Pending';
      this.activeSummaryFilter = 'Pending';
      this.applyFilters();
    }
  }

  applyFilters(): void {
    let summary = [...this.hologramData];

    if (this.selectedMonth) {
      summary = summary.filter(item => {
        const itemMonth = new Date(item.date).getMonth() + 1;
        return itemMonth.toString().padStart(2, '0') === this.selectedMonth;
      });
    }

    if (this.selectedYear) {
      summary = summary.filter(item => {
        const itemYear = new Date(item.date).getFullYear();
        return itemYear.toString() === this.selectedYear;
      });
    }

    if (this.selectedDate) {
      summary = summary.filter(item => item.date.startsWith(this.selectedDate));
    }

    this.summaryHologramData = summary;

    // Update company dropdown based on current date/month/year filters
    this.companyOptions = Array.from(
      new Set(
        summary
          .map(item => String(item?.companyName || '').trim())
          .filter(v => !!v)
      )
    ).sort((a, b) => a.localeCompare(b));

    let filtered = [...summary];

    if (this.companyFilter) {
      filtered = filtered.filter(item => String(item?.companyName || '').trim() === this.companyFilter);
    }

    if (this.statusFilter && this.statusFilter !== 'All') {
      const filter = this.normalizeStageToken(this.statusFilter);
      if (filter === 'approved') {
        filtered = filtered.filter(item => this.isApprovedLikeStatus(item));
      } else if (filter === 'edited') {
        filtered = filtered.filter(item => Boolean(item?.editedByCommissioner));
      } else if (filter === 'pending') {
        filtered = filtered.filter(item => this.isPendingLikeStatus(item));
      } else {
        filtered = filtered.filter(item => item.status === this.statusFilter);
      }
    }

    this.filteredHologramData = filtered;
    this.syncActiveSummaryFilter();
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedDate = '';
    this.statusFilter = 'All';
    this.companyFilter = '';
    this.activeSummaryFilter = '';
    this.applyFilters();
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredHologramData.length / this.pageSize));
  }

  getPaged(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredHologramData.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const total = this.getTotalPages();
    if (page < 1 || page > total) return;
    this.currentPage = page;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  onSummaryCardClick(filter: string): void {
    const normalized = String(filter || '').trim().toLowerCase();
    const current = String(this.statusFilter || '').trim().toLowerCase();

    if (!normalized || normalized === 'all') {
      this.statusFilter = 'All';
      this.activeSummaryFilter = '';
      this.applyFilters();
      return;
    }

    if (current === normalized) {
      this.statusFilter = 'All';
      this.activeSummaryFilter = '';
      this.applyFilters();
      return;
    }

    this.statusFilter = filter;
    this.activeSummaryFilter = filter;
    this.applyFilters();
  }

  // Unified action handler
  onUnifiedAction(event: { action: string, item: any }): void {
    const context = this.getUserContext();

    this.unifiedActionsService.executeAction(
      event.action,
      event.item,
      'hologram',
      context
    ).subscribe({
      next: (result) => {
        if (result.success) {
          if (result.message) {
            alert(result.message);
          }
          // Reload data if it was a backend action
          if (['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'ISSUE'].includes(event.action)) {
            this.loadHologramData();
          }
        } else {
          alert(`Action failed: ${result.message}`);
        }
      },
      error: (error) => {
        console.error('Action failed:', error);
        alert(`Action failed: ${error.message || 'Unknown error'}`);
      }
    });
  }

  // Get current user context for actions
  getUserContext(): 'licensee' | 'permit-section' | 'commissioner' | 'itcell' | 'officer-in-charge' {
    return 'itcell'; // IT Cell component always has IT Cell context
  }

  processProcurementAction(hologram: any): void {
    let action = '';
    let confirmationMsg = '';
    let successMsg = '';

    if (hologram.status === 'Submitted') {
      action = 'verify';

      confirmationMsg = 'Are you sure you want to VERIFY this application? It will move to "Under IT Cell Review".';
      successMsg = 'Application verified successfully.';
    } else if (hologram.status === 'Under IT Cell Review') {
      action = 'forward';
      confirmationMsg = 'Are you sure you want to FORWARD this application to the Commissioner?';
      successMsg = 'Application forwarded to Commissioner successfully.';
    } else {
      console.warn('Unknown status for action:', hologram.status);
      return;
    }

    if (!confirm(confirmationMsg)) {
      return;
    }

    this.hologramService.performAction('procurement', hologram.id, action, `Action '${action}' performed by IT Cell`).subscribe({
      next: () => {
        alert(successMsg);
        this.loadHologramData();
      },
      error: (err) => {
        console.error(`Error performing ${action}:`, err);
        alert(`Failed to perform action: ${action}`);
      }
    });
  }

  getTotalHolograms(hologram: any): number {
    return (hologram.localQtyLakh || 0) + (hologram.exportQtyLakh || 0) + (hologram.defenceQtyLakh || 0);
  }

  getProcurementTypes(row: any): Array<'LOCAL' | 'EXPORT' | 'DEFENCE'> {
    const types: Array<'LOCAL' | 'EXPORT' | 'DEFENCE'> = [];

    // Check all quantity fields
    const localQty = (row.localQtyLakh || row.localQty || 0);
    const exportQty = (row.exportQtyLakh || row.exportQty || 0);
    const defenceQty = (row.defenceQtyLakh || row.defenceQty || 0);

    if (localQty > 0) {
      types.push('LOCAL');
    }
    if (exportQty > 0) {
      types.push('EXPORT');
    }
    if (defenceQty > 0) {
      types.push('DEFENCE');
    }

    return types.length > 0 ? types : ['LOCAL']; // Default to LOCAL if nothing found
  }

  calculatePaymentAmount(hologram: any): number {
    if (!hologram) return 0;

    // Calculate total holograms
    const totalHolograms = this.getTotalHolograms(hologram);

    // Calculate payment at ₹0.15 per hologram
    return totalHolograms * 0.15;
  }

  markPaymentCompleted(refNo: string | undefined): void {
    if (!refNo) return;
    // This is a test method for marking payment as completed
    alert('Payment marked as completed for ' + refNo);
    // In real implementation, this would call an API
    this.loadHologramData();
  }

  getStatusClass(status: string): string {
    const token = this.normalizeStageToken(status);

    // Stage 681 — Cartoon/Carton Assigned (final fulfillment)
    if (token.includes('cartoonassigned') || token.includes('cartonassigned')) {
      return 'status-badge-cartoon-assigned';
    }
    // Stage 680 — Payment Completed
    if (token.includes('paymentcompleted')) {
      return 'status-badge-payment-completed';
    }
    // Stage 678 — Approved by Commissioner
    if (token.includes('approvedbycommissioner') || (token.includes('approved') && token.includes('commissioner'))) {
      return 'status-badge-approved-commissioner';
    }
    // Stage 679 — Rejected by Commissioner
    if (token.includes('rejectedbycommissioner') || (token.includes('rejected') && token.includes('commissioner'))) {
      return 'status-badge-rejected';
    }
    // Stage 677 — Forwarded to Commissioner
    if (token.includes('forwardedtocommissioner') || (token.includes('forwarded') && token.includes('commissioner'))) {
      return 'status-badge-forwarded';
    }
    // Stage 676 — Under IT Cell Review
    if (token.includes('underitcellreview') || token.includes('itcellreview')) {
      return 'status-badge-under-review';
    }
    // Stage 75 — Submitted HP
    if (token.includes('submittedhp') || token.includes('submitted')) {
      return 'status-badge-submitted';
    }
    // Generic approved fallback
    if (token.includes('approved')) return 'status-badge-approved-commissioner';
    if (token.includes('rejected')) return 'status-badge-rejected';

    return 'status-badge-default';
  }

  getStatusCount(status: string): number {
    const filter = this.normalizeStageToken(status);
    if (filter === 'edited') {
      return this.summaryHologramData.filter(h => Boolean(h?.editedByCommissioner)).length;
    }
    if (filter === 'approved') {
      return this.summaryHologramData.filter(h => this.isApprovedLikeStatus(h)).length;
    }
    // "Pending" = Submitted + Under IT Cell Review (anything still actionable by IT Cell)
    if (filter === 'pending') {
      return this.summaryHologramData.filter(h => this.isPendingLikeStatus(h)).length;
    }
    return this.summaryHologramData.filter(h => h.status === status).length;
  }

  getTotalQuantity(): number {
    return this.summaryHologramData.reduce((sum, h) => sum + this.getTotalHolograms(h), 0);
  }

  getFilteredTotalQuantity(): number {
    return this.filteredHologramData.reduce((sum, h) => sum + this.getTotalHolograms(h), 0);
  }

  viewHologramDetails(hologram: any): void {
    this.selectedHologram = hologram;
    this.showHologramModal = true;
  }

  closeHologramDetails(): void {
    this.showHologramModal = false;
    this.selectedHologram = null;
  }

  viewApplication(hologram: any): void {
    // Navigate to unified supply chain view page
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        ref: hologram.refNo,
        id: hologram.id,
        type: 'hologram',
        source: 'itcell'
      }
    });
  }

  openSupplyOrderLetter(hologram: any): void {
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        ref: hologram.refNo,
        id: hologram.id,
        type: 'hologram',
        source: 'itcell',
        openSupplyLetter: '1',
      }
    });
  }

  isPaymentCompleted(hologram: any): boolean {
    const paymentStatus = String(hologram?.paymentStatus || '').toLowerCase();
    const stageStatus = String(hologram?.status || '').toLowerCase();
    return (
      paymentStatus.includes('completed') ||
      paymentStatus.includes('paid') ||
      paymentStatus.includes('success') ||
      stageStatus.includes('payment completed') ||
      stageStatus.includes('carton assigned') ||
      stageStatus.includes('forwarded to commissioner')
    );
  }

  viewPaymentSlip(hologram: any): void {
    this.router.navigate(['/payment-slip-view'], {
      queryParams: {
        id: hologram.id,
        type: 'hologram',
        refNo: hologram.refNo,
        ref: hologram.refNo,
        referenceNo: hologram.refNo,
        source: 'itcell',
        section: 'itcell-hologram'
      }
    });
  }

  calculateWalletPayment(hologram: any): number {
    if (!hologram) return 0;

    // Calculate total holograms
    const totalHolograms = this.getTotalHolograms(hologram);

    // Calculate payment at ₹0.15 per hologram
    return totalHolograms * 0.15;
  }

  private syncActiveSummaryFilter(): void {
    const selected = String(this.statusFilter || '').trim();
    if (!selected || selected.toLowerCase() === 'all') {
      this.activeSummaryFilter = '';
      return;
    }
    this.activeSummaryFilter = selected;
  }

  private normalizeStageToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private isApprovedLikeStatus(item: any): boolean {
    const token = this.normalizeStageToken(item?.status);
    const isCartoonAssigned = token.includes('cartoonassigned') || token.includes('cartonassigned');
    return token.includes('approved') || isCartoonAssigned;
  }

  /** Pending = Submitted OR Under IT Cell Review — anything still actionable by IT Cell */
  private isPendingLikeStatus(item: any): boolean {
    if (this.isApprovedLikeStatus(item)) return false;
    const token = this.normalizeStageToken(item?.status);
    return (
      token.includes('submit') ||
      token.includes('underitcellreview') ||
      token.includes('itcellreview') ||
      token.includes('pending') ||
      token.includes('review')
    );
  }

  closeModal(): void {
    this.showHologramModal = false;
    this.selectedHologram = null;
  }
}
