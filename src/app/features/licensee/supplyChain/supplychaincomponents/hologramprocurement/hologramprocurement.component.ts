import { Component, Inject, PLATFORM_ID, OnInit, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupplyChainProfileService } from '../../../../../core/services/supply-chain-profile.service';
import { HologramDataService, HologramProcurement } from '../../services/hologram-data.service';

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
  hologramList: HologramRow[] = [];
  filteredHologramData: HologramRow[] = [];
  private isBrowser = false;
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

          // Check if there's edit history
          const hasEditHistory = (item as any).editHistory || (item as any).edit_history;

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
            paymentCompleted: item.status === 'Payment Completed' || item.status === 'Cartoon Assigned',
            editedByCommissioner: !!hasEditHistory,
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
      },
      error: (err) => {
        console.error('❌ Error loading procurements:', err);
        this.isLoading = false;
        // Set empty data so the UI shows "No Holograms Found" instead of loading forever
        this.hologramList = [];
        this.filteredHologramData = [];
      }
    });
  }

  private refreshHologramList(): void {
    this.loadHolograms();
  }

  // Filter methods
  applyHologramFilters(): void {
    this.filteredHologramData = this.hologramList.filter(item => {
      let matchesDate = true;
      let matchesMonth = true;
      let matchesYear = true;
      let matchesStatus = true;

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

      if (this.hologramStatusFilter) {
        matchesStatus = (item.status || '').toUpperCase() === this.hologramStatusFilter.toUpperCase();
      }

      return matchesDate && matchesMonth && matchesYear && matchesStatus;
    });

    this.currentPage = 1;
  }

  clearHologramFilters(): void {
    this.hologramDateFilter = '';
    this.hologramMonthFilter = '';
    this.hologramYearFilter = '';
    this.hologramStatusFilter = '';
    this.filteredHologramData = [...this.hologramList];
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
    this.applyHologramFilters();
  }

  // Summary methods
  getHologramStatusCount(status: string): number {
    return this.hologramList.filter(item =>
      (item.status || '').toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  getTotalHologramQuantity(): number {
    return this.hologramList.reduce((total, item) =>
      total + this.getHologramTotal(item), 0
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

  navigateToPaymentPage(hologram: HologramRow): void {
    if (hologram.status !== 'Approved by Commissioner') {
      alert('Payment is pending Commissioner approval.');
      return;
    }

    // In API version, we might redirect to a payment page with ID
    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: {
        tab: 'hologram',
        refNo: hologram.refNo,
        action: 'makePayment',
        id: hologram.id // backend ID
      }
    });
  }

  viewPaymentSlip(item: HologramRow): void {
    this.router.navigate(['/dev-payslip'], {
      queryParams: {
        ref: item.refNo,
        type: 'HOLOGRAM'
      }
    });
  }

  // Payment methods
  isPaymentEnabled(item: HologramRow): boolean {
    return item.status === 'Approved by Commissioner';
  }

  calculatePaymentAmount(hologram: HologramRow): number {
    const totalQty = this.getHologramTotal(hologram);
    return totalQty * 0.15;
  }

  getPaymentStatusClass(item: HologramRow): string {
    const status = (item.status || '').toLowerCase();

    if (status.includes('payment completed') || status.includes('cartoon assigned')) {
      return 'bg-success-subtle text-success';
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
    alert('In API mode, please use the Make Payment button to proceed with transaction.');
  }

  // Clear data methods (for testing)
  clearPaymentSlipData(): void {
    alert('Not supported in API mode');
  }

  clearHologramData(): void {
    alert('Not supported in API mode');
  }
}
