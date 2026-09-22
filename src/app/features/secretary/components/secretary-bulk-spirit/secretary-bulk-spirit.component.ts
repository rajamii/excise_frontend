import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  SecretaryService,
  ManufacturingFactory,
  SecretaryBulkSpiritSummary,
  BrandStock,
  BLHistoryItem,
  StorageTankItem,
  RequisitionItem,
  TransitItem
} from '../../services/secretary.service';

@Component({
  selector: 'app-secretary-bulk-spirit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './secretary-bulk-spirit.component.html',
  styleUrls: ['./secretary-bulk-spirit.component.scss']
})
export class SecretaryBulkSpiritComponent implements OnInit {
  isLoading = true;
  error: string | null = null;

  // View state: 'register' = row-wise register table, 'detail' = full dynamic detail page
  currentView: 'register' | 'detail' = 'register';
  selectedFactory: ManufacturingFactory | null = null;
  detailActiveTab: 'overview' | 'tanks' | 'stocks' | 'bl_history' | 'requisitions' | 'transits' | 'directives' = 'overview';

  // Stocks & Brands tab filters
  brandSearchFilter = '';
  brandSizeFilter: 'all' | '750' | '375' | '180' | '650' | '500' | '330' = 'all';

  // BL History tab filters & pagination
  blHistorySearch = '';
  blHistoryTypeFilter: 'ALL' | 'ARRIVAL' | 'USAGE' = 'ALL';
  blHistorySpiritFilter = 'ALL';
  blHistoryStatusFilter = 'ALL';
  blHistoryPage = 1;
  blHistoryPageSize = 10;
  selectedBlHistoryItem: BLHistoryItem | null = null;

  // Requisitions & Permits tab filters
  reqSearchFilter = '';
  reqStatusFilter = 'ALL';

  // Active Transits tab filters
  transitSearchFilter = '';
  transitStatusFilter = 'ALL';

  summary: SecretaryBulkSpiritSummary = {
    total_units: 0,
    distilleries_count: 0,
    breweries_count: 0,
    total_stock_bl: 0,
    total_requested_bl: 0,
    total_dispatched_bl: 0,
    total_requisitions: 0
  };

  factories: ManufacturingFactory[] = [];
  filteredFactories: ManufacturingFactory[] = [];

  activeSubCategoryFilter: 'all' | 'distillery' | 'brewery' = 'all';
  searchFilter = '';
  sortBy: 'default' | 'stock_high' | 'stock_low' | 'name_asc' | 'req_high' = 'default';

  directiveRemarks = '';
  directiveSavedSuccess = false;

  // Pagination State
  pageSize = 5;
  currentPage = 1;

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.detectChanges();
    }
  }

  get paginatedFactories(): ManufacturingFactory[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (this.filteredFactories || []).slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil((this.filteredFactories || []).length / this.pageSize) || 1;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get startIndex(): number {
    if (this.filteredFactories.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredFactories.length);
  }

  constructor(
    private secretaryService: SecretaryService,
    private cdr: ChangeDetectorRef,
    private location: Location,
    private router: Router
  ) {}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    this.secretaryService.getBulkSpiritFactories().subscribe({
      next: (res: any) => {
        const rawList = res.factories || [];
        this.factories = rawList.map((f: any) => this.normalizeFactory(f));
        this.recalculateSummary();
        this.applyFiltersAndSort();

        if (this.selectedFactory) {
          const updated = this.factories.find(f => f.id === this.selectedFactory?.id || f.establishment_name === this.selectedFactory?.establishment_name);
          if (updated) {
            this.selectedFactory = updated;
          }
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching factories:', err);
        this.error = 'Failed to load manufacturing units data. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    this.secretaryService.getBulkSpiritSummary().subscribe({
      next: (res) => {
        if (res) {
          this.summary = { ...this.summary, ...res };
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.warn('Could not fetch summary API:', err)
    });
  }

  recalculateSummary(): void {
    const distCount = this.factories.filter(f => (f.sub_category || '').toLowerCase().includes('distillery')).length;
    const brewCount = this.factories.filter(f => (f.sub_category || '').toLowerCase().includes('brew')).length;
    const totalStock = this.factories.reduce((acc, f) => acc + (f.stock_bl || 0), 0);
    const totalReqBL = this.factories.reduce((acc, f) => acc + (f.total_bl_requested || 0), 0);
    const totalDispBL = this.factories.reduce((acc, f) => acc + (f.dispatched_bl || 0), 0);
    const totalReqs = this.factories.reduce((acc, f) => acc + (f.total_requisitions_count || 0), 0);

    this.summary = {
      total_units: this.factories.length,
      distilleries_count: distCount,
      breweries_count: brewCount,
      total_stock_bl: totalStock,
      total_requested_bl: totalReqBL,
      total_dispatched_bl: totalDispBL,
      total_requisitions: totalReqs
    };
  }

  setFilter(type: 'all' | 'distillery' | 'brewery'): void {
    this.activeSubCategoryFilter = type;
    this.applyFiltersAndSort();
  }

  onSearchChange(): void {
    this.applyFiltersAndSort();
  }

  onSortChange(): void {
    this.applyFiltersAndSort();
  }

  clearSearch(): void {
    this.searchFilter = '';
    this.activeSubCategoryFilter = 'all';
    this.sortBy = 'default';
    this.applyFiltersAndSort();
  }

  private applyFiltersAndSort(): void {
    const q = (this.searchFilter || '').trim().toLowerCase();
    let result = this.factories.filter((f) => {
      const subCat = (f.sub_category || '').toLowerCase();
      const matchesType =
        this.activeSubCategoryFilter === 'all' ||
        subCat.includes(this.activeSubCategoryFilter);

      const estName = (f.establishment_name || '').toLowerCase();
      const compName = (f.company_name || '').toLowerCase();
      const licNo = (f.license_number || '').toLowerCase();
      const dist = (f.district || '').toLowerCase();
      const appName = (f.applicant_name || '').toLowerCase();

      const matchesSearch =
        !q ||
        estName.includes(q) ||
        compName.includes(q) ||
        licNo.includes(q) ||
        dist.includes(q) ||
        appName.includes(q);

      return matchesType && matchesSearch;
    });

    if (this.sortBy === 'stock_high') {
      result.sort((a, b) => (b.stock_bl || 0) - (a.stock_bl || 0));
    } else if (this.sortBy === 'stock_low') {
      result.sort((a, b) => (a.stock_bl || 0) - (b.stock_bl || 0));
    } else if (this.sortBy === 'name_asc') {
      result.sort((a, b) => (a.establishment_name || '').localeCompare(b.establishment_name || ''));
    } else if (this.sortBy === 'req_high') {
      result.sort((a, b) => (b.total_bl_requested || 0) - (a.total_bl_requested || 0));
    }

    this.filteredFactories = result;
    this.currentPage = 1;
  }

  // Open full dynamic detail page
  openDetailPage(factory: ManufacturingFactory): void {
    this.selectedFactory = factory;
    this.currentView = 'detail';
    this.detailActiveTab = 'overview';
    this.brandSearchFilter = '';
    this.brandSizeFilter = 'all';
    this.blHistorySearch = '';
    this.blHistoryTypeFilter = 'ALL';
    this.blHistorySpiritFilter = 'ALL';
    this.blHistoryStatusFilter = 'ALL';
    this.blHistoryPage = 1;
    this.reqSearchFilter = '';
    this.reqStatusFilter = 'ALL';
    this.transitSearchFilter = '';
    this.transitStatusFilter = 'ALL';
    this.selectedBlHistoryItem = null;
    this.directiveRemarks = '';
    this.directiveSavedSuccess = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToRegister(): void {
    this.currentView = 'register';
    this.selectedFactory = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setDetailTab(tab: 'overview' | 'tanks' | 'stocks' | 'bl_history' | 'requisitions' | 'transits' | 'directives'): void {
    this.detailActiveTab = tab;
    if (tab === 'bl_history') {
      this.blHistoryPage = 1;
    }
  }

  // Tank helpers
  getTotalTankCapacity(): number {
    if (!this.selectedFactory?.storage_tanks || this.selectedFactory.storage_tanks.length === 0) return 100000;
    return this.selectedFactory.storage_tanks.reduce((acc, t) => acc + (t.capacity_bl || 0), 0);
  }

  getTotalTankLiveStock(): number {
    if (!this.selectedFactory?.storage_tanks || this.selectedFactory.storage_tanks.length === 0) return this.selectedFactory?.stock_bl || 0;
    return this.selectedFactory.storage_tanks.reduce((acc, t) => acc + (t.current_volume_bl || 0), 0);
  }

  getActiveTanksCount(): number {
    if (!this.selectedFactory?.storage_tanks) return 0;
    return this.selectedFactory.storage_tanks.filter(t => (t.current_volume_bl || 0) > 0).length;
  }

  // BL History helpers & calculations
  getFilteredBlHistory(): BLHistoryItem[] {
    if (!this.selectedFactory || !this.selectedFactory.bl_history) return [];
    const q = (this.blHistorySearch || '').trim().toLowerCase();
    const typeF = this.blHistoryTypeFilter;
    const spiritF = this.blHistorySpiritFilter;
    const statF = this.blHistoryStatusFilter;

    return this.selectedFactory.bl_history.filter(item => {
      const matchSearch = !q ||
        (item.reference_no || '').toLowerCase().includes(q) ||
        (item.bulk_spirit_type || '').toLowerCase().includes(q) ||
        (item.source_or_distillery || '').toLowerCase().includes(q) ||
        (item.destination_purpose || '').toLowerCase().includes(q) ||
        (item.permit_numbers_str || '').toLowerCase().includes(q) ||
        (item.reviewed_by || '').toLowerCase().includes(q) ||
        (item.remarks || '').toLowerCase().includes(q);

      const matchType = typeF === 'ALL' || item.entry_type === typeF;
      const matchSpirit = spiritF === 'ALL' || (item.bulk_spirit_type || '').toLowerCase() === spiritF.toLowerCase();
      const matchStatus = statF === 'ALL' || (item.status || '').toUpperCase().includes(statF.toUpperCase());

      return matchSearch && matchType && matchSpirit && matchStatus;
    });
  }

  get paginatedBlHistory(): BLHistoryItem[] {
    const list = this.getFilteredBlHistory();
    const start = (this.blHistoryPage - 1) * this.blHistoryPageSize;
    return list.slice(start, start + this.blHistoryPageSize);
  }

  get blHistoryTotalPages(): number {
    return Math.ceil(this.getFilteredBlHistory().length / this.blHistoryPageSize) || 1;
  }

  get blHistoryPageNumbers(): number[] {
    return Array.from({ length: this.blHistoryTotalPages }, (_, i) => i + 1);
  }

  get blHistoryStartIndex(): number {
    if (this.getFilteredBlHistory().length === 0) return 0;
    return (this.blHistoryPage - 1) * this.blHistoryPageSize + 1;
  }

  get blHistoryEndIndex(): number {
    return Math.min(this.blHistoryPage * this.blHistoryPageSize, this.getFilteredBlHistory().length);
  }

  setBlHistoryPage(page: number): void {
    if (page >= 1 && page <= this.blHistoryTotalPages) {
      this.blHistoryPage = page;
      this.cdr.detectChanges();
    }
  }

  onBlHistoryPageSizeChange(): void {
    this.blHistoryPage = 1;
    this.cdr.detectChanges();
  }

  openBlItemDetails(item: BLHistoryItem): void {
    this.selectedBlHistoryItem = item;
  }

  closeBlItemDetails(): void {
    this.selectedBlHistoryItem = null;
  }

  getTotalInflowBL(): number {
    if (!this.selectedFactory?.bl_history) return this.selectedFactory?.total_arrivals_bl || 0;
    return this.selectedFactory.bl_history
      .filter(e => e.entry_type === 'ARRIVAL' && (e.status || '').toUpperCase() === 'APPROVED')
      .reduce((acc, e) => acc + (e.quantity || 0), 0);
  }

  getTotalUsageBL(): number {
    if (!this.selectedFactory?.bl_history) return this.selectedFactory?.total_usages_bl || 0;
    return this.selectedFactory.bl_history
      .filter(e => e.entry_type === 'USAGE' && (e.status || '').toUpperCase().includes('APPROV'))
      .reduce((acc, e) => acc + (e.quantity || 0), 0);
  }

  getTotalPendingUsageBL(): number {
    if (!this.selectedFactory?.bl_history) return this.selectedFactory?.total_pending_usages_bl || 0;
    return this.selectedFactory.bl_history
      .filter(e => e.entry_type === 'USAGE' && (e.status || '').toUpperCase().includes('PEND'))
      .reduce((acc, e) => acc + (e.quantity || 0), 0);
  }

  getTotalLossBL(): number {
    if (!this.selectedFactory?.bl_history) return this.selectedFactory?.total_lost_bl || 0;
    return this.selectedFactory.bl_history
      .reduce((acc, e) => acc + (e.lost_bl || 0), 0);
  }

  getAvailableBalanceBL(): number {
    const inflow = this.getTotalInflowBL();
    const usage = this.getTotalUsageBL();
    return Math.max(0, inflow - usage);
  }

  getDistinctSpiritTypesForFactory(): string[] {
    if (!this.selectedFactory?.bl_history) return [];
    const set = new Set<string>();
    this.selectedFactory.bl_history.forEach(e => {
      if (e.bulk_spirit_type) set.add(e.bulk_spirit_type.trim());
    });
    return Array.from(set).sort();
  }

  exportBlHistoryCSV(): void {
    const list = this.getFilteredBlHistory();
    if (!list || list.length === 0) return;

    const headers = ['Date', 'Reference No', 'Type', 'Bulk Spirit Type', 'Quantity (BL)', 'Loss (BL)', 'Status', 'Permit Details', 'Source / Distillery', 'Destination / Purpose', 'Reviewed By', 'Remarks'];
    const rows = list.map(item => [
      `"${item.date || ''}"`,
      `"${item.reference_no || ''}"`,
      `"${item.entry_type === 'ARRIVAL' ? 'Tanker Arrival (Stock In)' : 'Production Usage (Stock Out)'}"`,
      `"${item.bulk_spirit_type || ''}"`,
      `"${item.quantity || 0}"`,
      `"${item.lost_bl || 0}"`,
      `"${item.status || ''}"`,
      `"${item.permit_numbers_str || ''}"`,
      `"${item.source_or_distillery || ''}"`,
      `"${item.destination_purpose || ''}"`,
      `"${item.reviewed_by || ''}"`,
      `"${(item.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BL_History_${(this.selectedFactory?.establishment_name || 'Factory').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Stocks & Brands helpers
  getFilteredBrandStocks(): BrandStock[] {
    if (!this.selectedFactory || !this.selectedFactory.brand_stocks) return [];
    const q = (this.brandSearchFilter || '').trim().toLowerCase();
    const sz = this.brandSizeFilter;

    return this.selectedFactory.brand_stocks.filter(bs => {
      const bName = (bs.brand_name || '').toLowerCase();
      const lType = (bs.liquor_type || '').toLowerCase();
      const edp = (bs.edp_code || '').toLowerCase();
      const matchesSearch = !q || bName.includes(q) || lType.includes(q) || edp.includes(q);

      const matchesSize = sz === 'all' || String(bs.pack_size_ml) === sz;

      return matchesSearch && matchesSize;
    });
  }

  getTotalBrandCases(): number {
    return this.getFilteredBrandStocks().reduce((acc, bs) => acc + (bs.cases_stock || 0), 0);
  }

  getTotalBrandBottles(): number {
    return this.getFilteredBrandStocks().reduce((acc, bs) => acc + (bs.total_bottles || 0), 0);
  }

  getTotalBrandBL(): number {
    return this.getFilteredBrandStocks().reduce((acc, bs) => acc + (bs.total_bl || 0), 0);
  }

  // Requisitions & Permits helpers
  getFilteredRequisitions(): RequisitionItem[] {
    if (!this.selectedFactory?.requisitions) return [];
    const q = (this.reqSearchFilter || '').trim().toLowerCase();
    const sf = this.reqStatusFilter;

    return this.selectedFactory.requisitions.filter(r => {
      const matchSearch = !q ||
        (r.reference_no || '').toLowerCase().includes(q) ||
        (r.bulk_spirit_type || '').toLowerCase().includes(q) ||
        (r.check_post_name || '').toLowerCase().includes(q) ||
        (r.purpose_name || '').toLowerCase().includes(q) ||
        (r.lifted_from || '').toLowerCase().includes(q) ||
        (r.permits_number || '').toLowerCase().includes(q);

      const matchStatus = sf === 'ALL' || (r.status || '').toUpperCase().includes(sf.toUpperCase());
      return matchSearch && matchStatus;
    });
  }

  // Active Transits helpers
  getFilteredTransits(): TransitItem[] {
    if (!this.selectedFactory?.transits) return [];
    const q = (this.transitSearchFilter || '').trim().toLowerCase();
    const sf = this.transitStatusFilter;

    return this.selectedFactory.transits.filter(t => {
      const matchSearch = !q ||
        (t.transit_pass_no || '').toLowerCase().includes(q) ||
        (t.vehicle_no || '').toLowerCase().includes(q) ||
        (t.driver_name || '').toLowerCase().includes(q) ||
        (t.transporter_name || '').toLowerCase().includes(q) ||
        (t.destination || '').toLowerCase().includes(q) ||
        (t.brand || '').toLowerCase().includes(q);

      const matchStatus = sf === 'ALL' || (t.status || '').toUpperCase().includes(sf.toUpperCase());
      return matchSearch && matchStatus;
    });
  }

  saveDirective(): void {
    if (!this.directiveRemarks.trim()) return;
    this.directiveSavedSuccess = true;
    setTimeout(() => {
      this.directiveSavedSuccess = false;
    }, 3500);
  }

  formatNumber(val?: number): string {
    return (val || 0).toLocaleString('en-IN');
  }

  formatDate(val?: string): string {
    if (!val || val === '-') return '-';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return val;
    }
  }

  formatTime(val?: string): string {
    if (!val || val === '-') return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  }

  private normalizeStorageTank(raw: any): StorageTankItem {
    const curVol = Number(raw.current_volume_bl ?? raw.currentVolumeBl ?? 0);
    const cap = Number(raw.capacity_bl ?? raw.capacityBl ?? (curVol <= 50000 ? 50000 : curVol * 1.5));
    const fillPct = cap > 0 ? Number(raw.fill_percentage ?? raw.fillPercentage ?? Math.round((curVol / cap) * 100)) : 0;
    return {
      tank_id: raw.tank_id || raw.tankId || 'TNK-01',
      spirit_type: raw.spirit_type || raw.spiritType || 'Mature Malt Spirit',
      capacity_bl: cap,
      current_volume_bl: curVol,
      fill_percentage: fillPct,
      status: raw.status || (curVol > 0 ? 'Active / Operational' : 'Standby / Empty'),
      total_inflow_bl: Number(raw.total_inflow_bl ?? raw.totalInflowBl ?? curVol),
      total_outflow_bl: Number(raw.total_outflow_bl ?? raw.totalOutflowBl ?? 0),
      total_loss_bl: Number(raw.total_loss_bl ?? raw.totalLossBl ?? 0)
    };
  }

  private normalizeBLHistory(raw: any): BLHistoryItem {
    const eType = String(raw.entry_type || raw.entryType || 'ARRIVAL').toUpperCase() as 'ARRIVAL' | 'USAGE';
    return {
      id: String(raw.id || ''),
      entry_type: eType,
      direction: raw.direction || (eType === 'ARRIVAL' ? 'IN' : 'OUT'),
      date: raw.date || raw.submitted_at || raw.submittedAt || raw.created_at || raw.createdAt || '',
      reference_no: raw.reference_no || raw.referenceNo || raw.ref_no || raw.refNo || '-',
      permit_numbers_str: raw.permit_numbers_str || raw.permitNumbersStr || raw.permits || '-',
      bulk_spirit_type: raw.bulk_spirit_type || raw.bulkSpiritType || 'Mature Malt Spirit',
      source_or_distillery: raw.source_or_distillery || raw.sourceOrDistillery || raw.distillery_name || raw.distilleryName || '-',
      destination_purpose: raw.destination_purpose || raw.destinationPurpose || raw.purpose || '-',
      quantity: Number(raw.quantity ?? raw.total_bulk_liter ?? raw.totalBulkLiter ?? 0),
      lost_bl: Number(raw.lost_bl ?? raw.lostBl ?? 0),
      tanker_count: Number(raw.tanker_count ?? raw.tankerCount ?? 0),
      tanker_details: (raw.tanker_details || raw.tankerDetails || []).map((t: any) => ({
        permit_no: t.permit_no || t.permitNo || '-',
        tanker_no: t.tanker_no || t.tankerNo || 'Tanker',
        bulk_liter: Number(t.bulk_liter ?? t.bulkLiter ?? 0)
      })),
      status: String(raw.status || raw.approval_status || raw.approvalStatus || 'APPROVED').toUpperCase(),
      submitted_by: raw.submitted_by || raw.submittedBy || 'Factory Gate Logistics',
      reviewed_by: raw.reviewed_by || raw.reviewedBy || '',
      reviewed_at: raw.reviewed_at || raw.reviewedAt || null,
      remarks: raw.remarks || raw.review_remarks || raw.reviewRemarks || raw.rejection_reason || raw.rejectionReason || ''
    };
  }

  private normalizeRequisition(raw: any): RequisitionItem {
    return {
      id: raw.id,
      reference_no: raw.reference_no || raw.referenceNo || raw.our_ref_no || raw.ourRefNo || `REQ/${raw.id}/EXCISE`,
      requisition_date: raw.requisition_date || raw.requisitionDate || raw.date || '',
      bulk_spirit_type: raw.bulk_spirit_type || raw.bulkSpiritType || 'Mature Malt Spirit',
      total_bl: Number(raw.total_bl ?? raw.totalBl ?? raw.totalbl ?? 0),
      dispatched_bl: Number(raw.dispatched_bl ?? raw.dispatchedBl ?? 0),
      check_post_name: raw.check_post_name || raw.checkPostName || 'Rangpo Checkpost',
      status: raw.status || 'Pending',
      purpose_name: raw.purpose_name || raw.purposeName || 'Production / Blending',
      lifted_from: raw.lifted_from || raw.liftedFrom || raw.lifted_from_distillery_name || raw.liftedFromDistilleryName || '-',
      permits_number: raw.permits_number || raw.permitsNumber || raw.details_permits_number || raw.detailsPermitsNumber || '-',
      valid_up_to: raw.valid_up_to || raw.validUpTo || '-'
    };
  }

  private normalizeTransit(raw: any): TransitItem {
    return {
      id: String(raw.id || ''),
      transit_pass_no: raw.transit_pass_no || raw.transitPassNo || raw.bill_no || raw.billNo || `TRP/${raw.id}/EXCISE`,
      vehicle_no: raw.vehicle_no || raw.vehicleNo || raw.vehicle_number || raw.vehicleNumber || 'Tanker / Truck',
      driver_name: raw.driver_name || raw.driverName || 'Authorized Driver',
      transporter_name: raw.transporter_name || raw.transporterName || '-',
      destination: raw.destination || raw.to_location || raw.toLocation || raw.sole_distributor_name || raw.soleDistributorName || 'Wholesale Depot',
      brand: raw.brand || 'Consignment Material',
      cases: Number(raw.cases ?? 0),
      dispatched_volume_bl: Number(raw.dispatched_volume_bl ?? raw.dispatchedVolumeBl ?? 0),
      expiry_date: raw.expiry_date || raw.expiryDate || raw.date || '-',
      status: raw.status || 'In Transit',
      created_at: raw.created_at || raw.createdAt || ''
    };
  }

  private normalizeBrandStock(rawBs: any, estName: string, subCat: string, idx: number): BrandStock {
    const isBrewery = (subCat || '').toLowerCase().includes('brew');
    const brandName = String(
      rawBs.brand_name || rawBs.brandName || rawBs.brand || `${estName} ${isBrewery ? 'Premium Beer' : 'Reserve Whisky'}`
    ).trim();

    const liquorType = String(
      rawBs.liquor_type || rawBs.liquorType || rawBs.type || (isBrewery ? 'Beer' : 'IMFL Spirit')
    ).trim();

    const sizeMl = Number(
      rawBs.pack_size_ml ?? rawBs.packSizeMl ?? rawBs.capacity_size ?? rawBs.size ?? 750
    );

    let bpc = Number(rawBs.bottles_per_case ?? rawBs.bottlesPerCase ?? 0);
    if (!bpc || bpc <= 0) {
      if (sizeMl === 750 || sizeMl === 650) bpc = 12;
      else if (sizeMl === 375 || sizeMl === 500 || sizeMl === 330) bpc = 24;
      else if (sizeMl === 180) bpc = 48;
      else bpc = 12;
    }

    const cases = Number(
      rawBs.cases_stock ?? rawBs.casesStock ?? rawBs.current_stock ?? rawBs.cases ?? 0
    );

    let totBottles = Number(rawBs.total_bottles ?? rawBs.totalBottles ?? 0);
    if (!totBottles || totBottles <= 0) {
      totBottles = cases * bpc;
    }

    let totBl = Number(rawBs.total_bl ?? rawBs.totalBl ?? 0);
    if (!totBl || totBl <= 0) {
      totBl = Math.round((totBottles * sizeMl) / 1000.0);
    }

    const edp = String(
      rawBs.edp_code || rawBs.edpCode || `EDP/${isBrewery ? 'BREW' : 'DIST'}/${sizeMl}/00${idx + 1}`
    ).trim();

    const strength = String(
      rawBs.alcohol_strength || rawBs.alcoholStrength || (isBrewery ? '8.0% v/v' : '42.8% v/v')
    ).trim();

    const mrp = Number(rawBs.mrp_per_bottle ?? rawBs.mrpPerBottle ?? 0);

    return {
      brand_name: brandName,
      liquor_type: liquorType,
      pack_size_ml: sizeMl,
      bottles_per_case: bpc,
      cases_stock: cases,
      total_bottles: totBottles,
      total_bl: totBl,
      edp_code: edp,
      alcohol_strength: strength,
      mrp_per_bottle: mrp,
      status: cases > 0 ? 'In Stock' : 'Zero Stock'
    };
  }

  private normalizeFactory(raw: any): ManufacturingFactory {
    const estName = String(raw.establishment_name || raw.establishmentName || raw.company_name || raw.companyName || raw.applicant_name || raw.applicantName || 'Manufacturing Unit').trim();
    const compName = String(raw.company_name || raw.companyName || estName).trim();
    const appName = String(raw.applicant_name || raw.applicantName || 'Authorized Licensee').trim();
    const subCat = String(raw.sub_category || raw.subCategory || raw.subcategory || 'Distillery').trim();
    const normSubCat = subCat.toLowerCase().includes('brew') ? 'Brewery' : 'Distillery';
    const dist = String(raw.district || raw.site_district || raw.siteDistrict || 'Gangtok').trim();
    const rawLicNo = String(raw.license_number || raw.licenseNumber || raw.existing_license_no || raw.existingLicenseNo || raw.id || 'LIC/EXCISE/2026').trim();
    const licNo = rawLicNo.length > 2 ? rawLicNo : `LIC/${raw.id || '2026'}`;

    const stockBL = Number(raw.stock_bl ?? raw.stockBl ?? 0);
    const totalBlReq = Number(raw.total_bl_requested ?? raw.totalBlRequested ?? 0);
    const dispatchedBL = Number(raw.dispatched_bl ?? raw.dispatchedBl ?? 0);
    const reqCount = Number(raw.total_requisitions_count ?? raw.totalRequisitionsCount ?? 0);
    const pendingReqs = Number(raw.pending_requisitions_count ?? raw.pendingRequisitionsCount ?? 0);
    const approvedReqs = Number(raw.approved_requisitions_count ?? raw.approvedRequisitionsCount ?? 0);
    const activeTransits = Number(raw.active_transit_permits_count ?? raw.activeTransitPermitsCount ?? 0);
    const totalArrivalsBL = Number(raw.total_arrivals_bl ?? raw.totalArrivalsBl ?? 0);
    const totalUsagesBL = Number(raw.total_usages_bl ?? raw.totalUsagesBl ?? 0);
    const totalPendingUsagesBL = Number(raw.total_pending_usages_bl ?? raw.totalPendingUsagesBl ?? 0);
    const totalLostBL = Number(raw.total_lost_bl ?? raw.totalLostBl ?? 0);

    const rawBrandStocks = Array.isArray(raw.brand_stocks || raw.brandStocks)
      ? (raw.brand_stocks || raw.brandStocks)
      : [];
    const brandStocksList: BrandStock[] = rawBrandStocks.map((bs: any, idx: number) =>
      this.normalizeBrandStock(bs, estName, normSubCat, idx)
    );

    const rawBlHistory = Array.isArray(raw.bl_history || raw.blHistory)
      ? (raw.bl_history || raw.blHistory)
      : [];
    const blHistoryList: BLHistoryItem[] = rawBlHistory.map((h: any) => this.normalizeBLHistory(h));

    const rawTanks = Array.isArray(raw.storage_tanks || raw.storageTanks)
      ? (raw.storage_tanks || raw.storageTanks)
      : [];
    const storageTanksList: StorageTankItem[] = rawTanks.map((t: any) => this.normalizeStorageTank(t));

    const rawReqs = Array.isArray(raw.requisitions || raw.requisitionList)
      ? (raw.requisitions || raw.requisitionList)
      : [];
    const reqsList: RequisitionItem[] = rawReqs.map((r: any) => this.normalizeRequisition(r));

    const rawTransits = Array.isArray(raw.transits || raw.transitList)
      ? (raw.transits || raw.transitList)
      : [];
    const transitsList: TransitItem[] = rawTransits.map((tr: any) => this.normalizeTransit(tr));

    return {
      id: raw.id || raw.application_id || raw.applicationId || 'NLI/1101/2026-27/0001',
      establishment_name: estName,
      applicant_name: appName,
      company_name: compName,
      license_number: licNo,
      category: 'Manufacturing',
      sub_category: normSubCat,
      district: dist,
      business_address: raw.business_address || raw.businessAddress || `${dist}, Sikkim`,
      mobile_number: raw.mobile_number || raw.mobileNumber || raw.company_phone_number || raw.companyPhoneNumber || '9800001234',
      email: raw.email || raw.company_email || raw.companyEmail || 'factory@excise.gov.in',
      status: (raw.is_approved || raw.isApproved) ? 'Active' : (raw.status || 'Under Review'),
      is_approved: Boolean(raw.is_approved || raw.isApproved),
      stock_bl: stockBL,
      total_arrivals_bl: totalArrivalsBL,
      total_usages_bl: totalUsagesBL,
      total_pending_usages_bl: totalPendingUsagesBL,
      total_lost_bl: totalLostBL,
      total_requisitions_count: reqCount,
      total_bl_requested: totalBlReq,
      pending_requisitions_count: pendingReqs,
      approved_requisitions_count: approvedReqs,
      active_transit_permits_count: transitsList.length || activeTransits,
      dispatched_bl: dispatchedBL,
      storage_tanks: storageTanksList,
      brand_stocks: brandStocksList,
      bl_history: blHistoryList,
      requisitions: reqsList,
      transits: transitsList
    };
  }

  getStockPercentage(bl?: number): number {
    const val = bl || 0;
    const maxCapacity = 250000;
    const pct = Math.round((val / maxCapacity) * 100);
    return Math.min(Math.max(pct, 10), 100);
  }
}
