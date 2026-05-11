import { Component, Inject, PLATFORM_ID, OnInit, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupplyChainProfileService } from '../../../../../core/services/supply-chain-profile.service';
import { HologramDataService, HologramProcurement } from '../../services/hologram-data.service';
import { RoleService } from '../../../../../core/services/role.service';

/* Use the interface from service, but alias or extend if needed for grid */
type HologramRow = HologramProcurement & {
  // UI specific fields mapped from API response
  procurementType?: 'Local' | 'Export' | 'Defence';
  // FIXED: These display the ORIGINAL requested quantities (never change)
  localQtyLakh?: number;
  exportQtyLakh?: number;
  defenceQtyLakh?: number;
  paymentCompleted?: boolean;
  editedByCommissioner?: boolean;
  companyName?: string;
  status: string; // Ensure status is mandatory string for UI
  allowed_actions?: string[];
  allowedActions?: string[];
};

@Component({
  selector: 'app-hologramprocurement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramprocurement.component.html',
  styleUrl: './hologramprocurement.component.scss'
})
export class HologramprocurementComponent implements OnInit {
  Math = Math;
  private readonly persistentPaymentRefsKey = 'hologramPersistentPaymentRefs';
  hologramList: HologramRow[] = [];
  filteredHologramData: HologramRow[] = [];
  summaryHologramData: HologramRow[] = [];
  activeSummaryFilter: string = '';
  private isBrowser = false;
  private initialSummaryAutoSelected = false;
  private persistentPaymentRefs = new Set<string>();
  showHologramModal = false;
  selectedHologram: HologramRow | null = null;
  currentUnitName: string | null = null;
  isLoading = false;

  // Filter properties
  hologramDateFilter: string = '';
  hologramMonthFilter: string = '';
  hologramYearFilter: string = '';
  hologramStatusFilter: string = '';

  // Pagination
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  private hologramService = inject(HologramDataService);
  private roleService = inject(RoleService);

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
    private profileService: SupplyChainProfileService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('🏗️ Hologram Procurement Component constructed, isBrowser:', this.isBrowser);
  }

  ngOnInit(): void {
    console.log('🚀 Hologram Procurement Component initializing...');
    if (this.isBrowser) {
      this.loadPersistentPaymentRefs();
      this.isLoading = true;
      this.profileService.getProfile().subscribe({
        next: (res) => {
          console.log('📋 Profile service response:', res);
          if (res.data) {
            this.currentUnitName = res.data.manufacturingUnitName;
            console.log('✅ Current unit name:', this.currentUnitName);
            this.loadHolograms();
          } else {
            console.warn('⚠️ No profile data found, loading holograms anyway');
            this.loadHolograms();
          }
        },
        error: (err) => {
          console.error('❌ Error loading profile, loading holograms anyway:', err);
          this.loadHolograms();
        }
      });
    } else {
      console.log('⚠️ Not in browser environment, skipping initialization');
    }
  }

  private loadHolograms(): void {
    console.log('🔄 Starting to load holograms...');
    this.isLoading = true;
    this.hologramService.getProcurements().subscribe({
      next: (data) => {
        console.log('📦 Loading hologram data from API:', data.length, 'items');
        this.isLoading = false;

        let mapped: HologramRow[] = data.map(item => {
          // FIXED: Use requested_* quantities for display (these never change)
          // Fallback to regular qty for existing records without requested_* fields
          const requestedLocal = Number((item as any).requested_local_qty || item.localQty);
          const requestedExport = Number((item as any).requested_export_qty || item.exportQty);
          const requestedDefence = Number((item as any).requested_defence_qty || item.defenceQty);

          // Check if there's edit history (commissioner may update quantities)
          const hasEditHistory = (item as any).editHistory || (item as any).edit_history;
          const editedByRaw = (hasEditHistory as any)?.editedBy || (hasEditHistory as any)?.edited_by || '';
          const editedByToken = String(editedByRaw || '').toLowerCase();
          const normalizedPaymentStatus = String((item as any).paymentStatus || (item as any).payment_status || '').toLowerCase();
          const isWalletPaid = normalizedPaymentStatus === 'completed' || normalizedPaymentStatus === 'success';
          // Mark as edited by commissioner if edit_history exists (only commissioner can edit)
          const isEditedByCommissioner = !!hasEditHistory;

          return {
            ...item,
            // Ensure numeric values (API returns strings for Decimals)
            localQty: Number(item.localQty),
            exportQty: Number(item.exportQty),
            defenceQty: Number(item.defenceQty),

            // CRITICAL: UI displays ORIGINAL REQUESTED quantities (never change after submission)
            localQtyLakh: requestedLocal,  // FIXED: Original requested quantity
            exportQtyLakh: requestedExport, // FIXED: Original requested quantity
            defenceQtyLakh: requestedDefence, // FIXED: Original requested quantity
            paymentCompleted: isWalletPaid || item.status === 'Payment Completed' || item.status === 'Cartoon Assigned',
            editedByCommissioner: isEditedByCommissioner,
            editHistory: hasEditHistory || undefined,
            companyName: item.manufacturingUnit || item.licenseeName || '', // Map to companyName
            status: item.status || 'Submitted', // Default status
          };
        });

        // Determine procurement type
        mapped = mapped.map(item => {
          if (!item.procurementType) {
            if (item.exportQty > 0) {
              item.procurementType = 'Export';
            } else if (item.defenceQty > 0) {
              item.procurementType = 'Defence';
            } else {
              item.procurementType = 'Local';
            }
          }
          return item;
        });

        // Filter by Unit Name (Backend handles this via user context, but double check)
        if (this.currentUnitName) {
          // Backend already filters by user's licensee profile
        }

        // Sort by date (newest first)
        mapped.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());

        this.hologramList = mapped;
        this.filteredHologramData = [...this.hologramList];
        this.applyHologramFilters(); // Re-apply filters if any
        if (!this.initialSummaryAutoSelected) {
          this.initialSummaryAutoSelected = true;

          if (!this.hologramStatusFilter && !this.activeSummaryFilter) {
            // Prefer pending bucket when available.
            const preferred =
              (this.getHologramStatusCount('PENDING') > 0 && 'PENDING') ||
              (this.getHologramStatusCount('SUBMITTED') > 0 && 'SUBMITTED') ||
              (this.getHologramStatusCount('UNDER_PROCESS') > 0 && 'UNDER_PROCESS') ||
              (this.getHologramStatusCount('EDITED') > 0 && 'EDITED') ||
              '';

            if (preferred) {
              this.activeSummaryFilter = preferred;
              this.hologramStatusFilter = preferred;
              this.applyHologramFilters();
            }
          }
        }
      },
      error: (err) => {
        console.error('❌ Error loading procurements:', err);
        this.isLoading = false;
        // Set empty data so the UI shows "No Holograms Found" instead of loading forever
        this.hologramList = [];
        this.summaryHologramData = [];
        this.filteredHologramData = [];
      }
    });
  }

  private refreshHologramList(): void {
    this.loadHolograms();
  }

  /** True when the current user is a licensee (not an admin). */
  private isLicenseeUser(): boolean {
    return this.roleService.isLicenseeRole();
  }

  /** True when the current user is a commissioner-level admin. */
  private isCommissionerUser(): boolean {
    return this.roleService.hasAnyRoleByName(['commissioner', 'joint_commissioner', 'level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'site_admin']);
  }

  /** True when the current user is a permit-section admin. */
  private isPermitSectionUser(): boolean {
    return this.roleService.hasAnyRoleByName(['permit-section', 'permit section', 'permit_section']);
  }

  /** True when the current user is an IT-cell admin. */
  private isItCellUser(): boolean {
    return this.roleService.hasAnyRoleByName(['it-cell', 'it_cell', 'itcell']);
  }

  /**
   * Visibility rule for admin users:
   * - Show the record if the admin has actions to take (allowedActions non-empty) — it's their turn.
   * - Show the record if it has already passed through their stage (historical) — they already acted.
   * - Hide the record if it hasn't reached their stage yet.
   * Licensee users always see all their own records.
   */
  isVisibleToCurrentAdmin(item: HologramRow): boolean {
    // Licensee sees everything (scoped by backend to their own records)
    if (this.isLicenseeUser()) return true;

    const actions = item.allowedActions || item.allowed_actions || [];
    if ((actions as string[]).length > 0) return true;

    // Historical: record has already passed through this admin's stage
    const combined = `${String(item.status ?? '')} ${String((item as any).currentStageName ?? '')}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (this.isCommissionerUser() && combined.includes('commissioner')) return true;
    if (this.isPermitSectionUser() && combined.includes('permitsection')) return true;
    if (this.isItCellUser() && combined.includes('itcell')) return true;

    return false;
  }

  // Filter methods
  applyHologramFilters(): void {
    this.summaryHologramData = this.hologramList.filter(item => {
      // Admin visibility: only show records at or past this admin's stage
      if (!this.isVisibleToCurrentAdmin(item)) return false;

      let matchesDate = true;
      let matchesMonth = true;
      let matchesYear = true;

      const itemDate = new Date(item.date || '');

      if (this.hologramDateFilter) {
        const filterDate = new Date(this.hologramDateFilter);
        matchesDate = itemDate.getFullYear() === filterDate.getFullYear() &&
          itemDate.getMonth() === filterDate.getMonth() &&
          itemDate.getDate() === filterDate.getDate();
      }

      if (this.hologramMonthFilter) {
        const filterDate = new Date(this.hologramMonthFilter + '-01');
        matchesMonth = itemDate.getFullYear() === filterDate.getFullYear() &&
          itemDate.getMonth() === filterDate.getMonth();
      }

      if (this.hologramYearFilter) {
        const filterYear = parseInt(this.hologramYearFilter);
        matchesYear = itemDate.getFullYear() === filterYear;
      }

      return matchesDate && matchesMonth && matchesYear;
    });

    let filtered = [...this.summaryHologramData];

    this.filteredHologramData = filtered.filter(item => {
      if (!this.hologramStatusFilter) {
        return true;
      }

      const filter = this.normalizeStageToken(this.hologramStatusFilter);
      if (filter === 'submitted') {
        return this.isSubmittedLikeStatus(item);
      }
      if (filter === 'draft') {
        return this.isDraftLikeStatus(item);
      }
      if (filter === 'pending') {
        return this.isPendingLikeStatus(item);
      }
      if (filter === 'underprocess') {
        return this.isUnderProcessLikeStatus(item);
      }
      if (filter === 'edited') {
        return this.isEditedByCommissionerLike(item);
      }
      if (filter === 'approved') {
        return this.isApprovedLikeStatus(item);
      }

      return this.normalizeStageToken(item.status).includes(filter);
    });

    this.currentPage = 1;
  }

  clearHologramFilters(): void {
    this.hologramDateFilter = '';
    this.hologramMonthFilter = '';
    this.hologramYearFilter = '';
    this.hologramStatusFilter = '';
    this.activeSummaryFilter = '';
    this.filteredHologramData = [...this.hologramList];
    this.summaryHologramData = [...this.hologramList];
    this.currentPage = 1;
  }

  onHologramDateFilterChange(): void {
    this.applyHologramFilters();
  }

  onHologramMonthFilterChange(): void {
    this.applyHologramFilters();
  }

  onHologramYearFilterChange(): void {
    this.applyHologramFilters();
  }

  onHologramStatusFilterChange(): void {
    this.syncActiveSummaryFilter();
    this.applyHologramFilters();
  }

  // Summary methods
  getHologramStatusCount(status: string): number {
    const filter = this.normalizeStageToken(status);
    if (filter === 'pending') {
      return this.summaryHologramData.filter(item => this.isPendingLikeStatus(item)).length;
    }
    if (filter === 'submitted') {
      return this.summaryHologramData.filter(item => this.isSubmittedLikeStatus(item)).length;
    }
    if (filter === 'draft') {
      return this.summaryHologramData.filter(item => this.isDraftLikeStatus(item)).length;
    }
    if (filter === 'underprocess') {
      return this.summaryHologramData.filter(item => this.isUnderProcessLikeStatus(item)).length;
    }
    if (filter === 'edited') {
      return this.summaryHologramData.filter(item => this.isEditedByCommissionerLike(item)).length;
    }
    if (filter === 'approved') {
      return this.summaryHologramData.filter(item => this.isApprovedLikeStatus(item)).length;
    }
    return this.summaryHologramData.filter(item =>
      this.normalizeStageToken(item.status).includes(filter)
    ).length;
  }

  getTotalHologramQuantity(): number {
    return this.summaryHologramData.reduce((total, item) =>
      total + this.getHologramTotal(item), 0
    );
  }

  onSummaryCardClick(filter: string): void {
    const normalized = this.normalizeStageToken(filter);
    const current = this.normalizeStageToken(this.hologramStatusFilter);

    if (!normalized || normalized === 'all') {
      this.activeSummaryFilter = '';
      this.hologramStatusFilter = '';
      this.applyHologramFilters();
      return;
    }

    if (current === normalized) {
      this.activeSummaryFilter = '';
      this.hologramStatusFilter = '';
      this.applyHologramFilters();
      return;
    }

    this.activeSummaryFilter = filter;
    this.hologramStatusFilter = filter;
    this.applyHologramFilters();
  }

  private syncActiveSummaryFilter(): void {
    const normalized = this.normalizeStageToken(this.hologramStatusFilter);
    if (['pending', 'submitted', 'underprocess', 'edited', 'approved'].includes(normalized)) {
      this.activeSummaryFilter = this.hologramStatusFilter;
      return;
    }
    this.activeSummaryFilter = '';
  }

  private normalizeStageToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private isDraftLikeStatus(item: HologramRow): boolean {
    return this.normalizeStageToken(item.status).includes('draft');
  }

  private isSubmittedLikeStatus(item: HologramRow): boolean {
    const token = this.normalizeStageToken(item.status);
    return token.includes('submit') && !token.includes('draft');
  }

  private isEditedByCommissionerLike(item: HologramRow): boolean {
    if (item.editedByCommissioner) return true;
    const history: any = (item as any).editHistory || (item as any).edit_history;
    return !!history;
  }

  private isApprovedLikeStatus(item: HologramRow): boolean {
    const token = this.normalizeStageToken(item.status);
    // Licensee UX: treat as "Approved" only once cartons are assigned (or payment is completed).
    // Commissioner approval alone should remain Pending until carton assignment happens.
    const isCartoonAssigned = token.includes('cartoonassigned') || token.includes('cartonassigned');
    const isPaymentCompleted = token.includes('paymentcompleted');
    return (isCartoonAssigned || isPaymentCompleted) && !token.includes('reject');
  }

  private isUnderProcessLikeStatus(item: HologramRow): boolean {
    if (this.isDraftLikeStatus(item) || this.isSubmittedLikeStatus(item) || this.isApprovedLikeStatus(item)) {
      return false;
    }
    if (this.isEditedByCommissionerLike(item)) {
      return false;
    }

    const token = this.normalizeStageToken(item.status);
    if (token.includes('cartoonassigned') || token.includes('cartonassigned')) {
      return false;
    }
    return (
      token.includes('itcell') ||
      token.includes('commissioner') ||
      token.includes('payment') ||
      token.includes('processing') ||
      token.includes('forward') ||
      token.includes('under')
    );
  }

  private isPendingLikeStatus(item: HologramRow): boolean {
    // Licensee UX: Pending = submitted + in-workflow + edited (anything still circulating for approvals).
    if (this.isApprovedLikeStatus(item)) {
      return false;
    }
    return (
      this.isSubmittedLikeStatus(item) ||
      this.isUnderProcessLikeStatus(item) ||
      this.isEditedByCommissionerLike(item)
    );
  }

  getHologramTotal(row: HologramRow): number {
    return (
      (row.localQty || 0) +
      (row.exportQty || 0) +
      (row.defenceQty || 0)
    );
  }

  getProcurementType(row: HologramRow): 'Local' | 'Export' | 'Defence' {
    if (row.procurementType) {
      return row.procurementType;
    }

    if (row.exportQty > 0) {
      return 'Export';
    } else if (row.defenceQty > 0) {
      return 'Defence';
    } else {
      return 'Local';
    }
  }

  // Returns array of all procurement types present in the request
  getProcurementTypes(row: HologramRow): Array<'Local' | 'Export' | 'Defence'> {
    const types: Array<'Local' | 'Export' | 'Defence'> = [];

    // Check all quantity fields (both naming conventions)
    const localQty = (row.localQtyLakh || (row as any).localQty || 0);
    const exportQty = (row.exportQtyLakh || (row as any).exportQty || 0);
    const defenceQty = (row.defenceQtyLakh || (row as any).defenceQty || 0);

    if (localQty > 0) {
      types.push('Local');
    }
    if (exportQty > 0) {
      types.push('Export');
    }
    if (defenceQty > 0) {
      types.push('Defence');
    }

    // Fallback to procurementType if no quantities set
    if (types.length === 0 && row.procurementType) {
      types.push(row.procurementType);
    }

    return types.length > 0 ? types : ['Local']; // Default to Local if nothing found
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredHologramData.length / this.pageSize));
  }

  getPaged(data: HologramRow[]): HologramRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const total = this.getTotalPages();
    if (page < 1 || page > total) return;
    this.currentPage = page;
  }

  updatePagination(): void {
    this.currentPage = 1;
  }

  // Modal methods
  openHologramDetails(row: HologramRow): void {
    this.selectedHologram = row;
    this.showHologramModal = true;
  }

  closeHologramDetails(): void {
    this.showHologramModal = false;
    this.selectedHologram = null;
  }

  getTotalHolograms(hologram: HologramRow): number {
    return this.getHologramTotal(hologram);
  }

  getEditHistory(hologram: HologramRow | null): any {
    if (!hologram) return null;
    return (hologram as any).editHistory || (hologram as any).edit_history || null;
  }

  // Navigation methods
  viewHologramApplication(item: HologramRow): void {
    this.router.navigate(["/supply-chain-view"], {
      queryParams: {
        ref: item.refNo,
        id: item.id,
        type: 'hologram',
        source: 'licensee'
      },
    });
  }

  navigateTo(route: string) {
    this.router.navigate(["/dev-hologram"]);
  }

  viewPaymentSlip(item: HologramRow): void {
    this.router.navigate(['/payment-slip-view'], {
      queryParams: {
        id: item.id,
        type: 'hologram',
        refNo: item.refNo,
        ref: item.refNo,
        referenceNo: item.refNo,
        source: 'licensee'
      }
    });
  }

  shouldShowMakePayment(item: HologramRow): boolean {
    // Payment is a licensee-only action; admins (IT Cell, Permit Section, Commissioner, etc.) should not see it.
    if (!this.roleService.isLicenseeRole()) {
      return false;
    }

    const status = String(item.status || '').toLowerCase().replace(/\s+/g, '');
    const refNo = String(item.refNo || '').trim();
    const hasPersistentPaymentAccess = !!refNo && this.persistentPaymentRefs.has(refNo);
    return (
      hasPersistentPaymentAccess ||
      status.includes('approvedbycommissioner') ||
      status.includes('commissionerapproved') ||
      status.includes('approved') ||
      status.includes('payment') ||
      status.includes('paymentcompleted') ||
      status.includes('cartoonassigned')
    );
  }

  /**
   * Returns true when the item is at stage 78 "Approved by Commissioner" and
   * the current user is a licensee who needs to make payment.
   * Clears once payment is made (stage moves to Payment Completed / Cartoon Assigned).
   */
  isApprovedByCommissioner(item: HologramRow): boolean {
    if (!this.roleService.isLicenseeRole()) return false;

    // Match by stage ID (most reliable)
    const stageId = Number((item as any).current_stage ?? (item as any).currentStage ?? (item as any).stage_id ?? -1);
    if (stageId === 78) return true;

    const status = String(item.status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    // Exclude post-payment stages — payment already done
    if (status.includes('paymentcompleted') || status.includes('cartoonassigned') || status.includes('cartonassigned')) {
      return false;
    }
    return status.includes('approvedbycommissioner') || status.includes('commissionerapproved');
  }

  navigateToWalletRecharge(item: HologramRow, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.persistPaymentAccessForRef(item.refNo);

    const queryParams = {
      section: 'wallet',
      tab: 'hologram',
      source: 'hologram-procurement',
      refNo: item.refNo,
      action: 'makePayment'
    };

    this.router.navigate(['/dashboard'], {
      queryParams
    }).then((ok) => {
      if (!ok && this.isBrowser) {
        const target = `/dashboard?section=wallet&tab=hologram&source=hologram-procurement&refNo=${encodeURIComponent(String(item.refNo || ''))}&action=makePayment`;
        window.location.assign(target);
      }
    }).catch(() => {
      if (this.isBrowser) {
        const target = `/dashboard?section=wallet&tab=hologram&source=hologram-procurement&refNo=${encodeURIComponent(String(item.refNo || ''))}&action=makePayment`;
        window.location.assign(target);
      }
    });
  }

  calculatePaymentAmount(hologram: HologramRow): number {
    const totalQty = this.getHologramTotal(hologram);
    return totalQty * 0.15;
  }

  getPaymentStatusClass(item: HologramRow): string {
    const status = (item.status || '').toLowerCase();

    if (status.includes('payment completed') || status.includes('cartoon assigned') || status.includes('carton assigned')) {
      return 'bg-success-subtle text-success';
    } else if (this.isApprovedByCommissioner(item)) {
      // Stage 78 — payment required by licensee → amber/yellow to draw attention
      return 'bg-warning-subtle text-warning fw-semibold';
    } else if (status.includes('approved')) {
      return 'bg-primary-subtle text-primary';
    } else if (status.includes('pending') || status.includes('submitted') || status.includes('under')) {
      return 'bg-warning-subtle text-warning';
    } else if (status.includes('rejected')) {
      return 'bg-danger-subtle text-danger';
    } else {
      return 'bg-secondary-subtle text-secondary';
    }
  }

  markPaymentCompleted(refNo: string | undefined): void {
    if (!refNo) return;
    // This was a test method in legacy. 
    // In real implementation, payment is handled via payment gateway or separate flow.
    // For now, we can maybe call an API to mark it?
    // Or just show alert that "This is testing only"
    alert('In API mode, please use the Submit Payment button inside View Details.');
  }

  // Clear data methods (for testing)
  clearPaymentSlipData(): void {
    alert('Not supported in API mode');
  }

  clearHologramData(): void {
    alert('Not supported in API mode');
  }

  private loadPersistentPaymentRefs(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem(this.persistentPaymentRefsKey) || '[]');
      const refs = Array.isArray(stored)
        ? stored.map((ref: any) => String(ref || '').trim()).filter(Boolean)
        : [];
      this.persistentPaymentRefs = new Set(refs);
    } catch {
      this.persistentPaymentRefs = new Set<string>();
    }
  }

  private persistPaymentAccessForRef(refNo: string | undefined): void {
    const normalizedRef = String(refNo || '').trim();
    if (!this.isBrowser || !normalizedRef) {
      return;
    }

    this.persistentPaymentRefs.add(normalizedRef);
    try {
      localStorage.setItem(this.persistentPaymentRefsKey, JSON.stringify(Array.from(this.persistentPaymentRefs)));
    } catch {
      // Ignore storage failures and keep runtime state.
    }
  }
}
