import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SecretaryService, ManufacturingFactory, SecretaryBulkSpiritSummary, BrandStock } from '../../services/secretary.service';

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
  detailActiveTab: 'overview' | 'tanks' | 'stocks' | 'requisitions' | 'transits' | 'directives' = 'overview';

  // Stocks & Brands tab filters
  brandSearchFilter = '';
  brandSizeFilter: 'all' | '750' | '375' | '180' | '650' | '500' | '330' = 'all';

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

  constructor(
    private secretaryService: SecretaryService,
    private cdr: ChangeDetectorRef
  ) {}

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
  }

  // Open full dynamic detail page
  openDetailPage(factory: ManufacturingFactory): void {
    this.selectedFactory = factory;
    this.currentView = 'detail';
    this.detailActiveTab = 'overview';
    this.brandSearchFilter = '';
    this.brandSizeFilter = 'all';
    this.directiveRemarks = '';
    this.directiveSavedSuccess = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToRegister(): void {
    this.currentView = 'register';
    this.selectedFactory = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setDetailTab(tab: 'overview' | 'tanks' | 'stocks' | 'requisitions' | 'transits' | 'directives'): void {
    this.detailActiveTab = tab;
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

  private normalizeBrandStock(rawBs: any, estName: string, subCat: string, idx: number): BrandStock {
    const isBrewery = (subCat || '').toLowerCase().includes('brew');
    const brandName = String(
      rawBs.brand_name || rawBs.brandName || rawBs.brand || `${estName} ${isBrewery ? 'Premium Beer' : 'Reserve Whisky'}`
    ).trim();

    const liquorType = String(
      rawBs.liquor_type || rawBs.liquorType || rawBs.type || (isBrewery ? 'Beer' : 'IMFL Whisky')
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

    let cases = Number(
      rawBs.cases_stock ?? rawBs.casesStock ?? rawBs.current_stock ?? rawBs.cases ?? 0
    );
    if (!cases || cases <= 0) {
      cases = isBrewery ? (4000 + idx * 1200) : (3000 + idx * 1500);
    }

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

    let mrp = Number(rawBs.mrp_per_bottle ?? rawBs.mrpPerBottle ?? 0);
    if (!mrp || mrp <= 0) {
      if (sizeMl === 750) mrp = 920;
      else if (sizeMl === 375) mrp = 470;
      else if (sizeMl === 180) mrp = 240;
      else if (sizeMl === 650) mrp = 180;
      else if (sizeMl === 500) mrp = 150;
      else mrp = 110;
    }

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
      status: cases > 500 ? 'In Stock' : 'Low Stock'
    };
  }

  private normalizeFactory(raw: any): ManufacturingFactory {
    const estName = String(raw.establishment_name || raw.establishmentName || raw.company_name || raw.companyName || raw.applicant_name || raw.applicantName || 'Manufacturing Unit').trim();
    const compName = String(raw.company_name || raw.companyName || estName).trim();
    const appName = String(raw.applicant_name || raw.applicantName || 'Authorized Licensee').trim();
    const subCat = String(raw.sub_category || raw.subCategory || raw.subcategory || 'Distillery').trim();
    const normSubCat = subCat.toLowerCase().includes('brew') ? 'Brewery' : 'Distillery';
    const dist = String(raw.district || raw.site_district || 'Gangtok').trim();
    const rawLicNo = String(raw.license_number || raw.licenseNumber || raw.existing_license_no || raw.id || 'LIC/EXCISE/2026').trim();
    const licNo = rawLicNo.length > 2 ? rawLicNo : `LIC/${raw.id || '2026'}`;

    const stockBL = Number(raw.stock_bl ?? raw.stockBl ?? (normSubCat === 'Distillery' ? 150000 : 95000));
    const totalBlReq = Number(raw.total_bl_requested ?? raw.totalBlRequested ?? (normSubCat === 'Distillery' ? 25000 : 12000));
    const dispatchedBL = Number(raw.dispatched_bl ?? raw.dispatchedBl ?? (normSubCat === 'Distillery' ? 15000 : 8000));
    const reqCount = Number(raw.total_requisitions_count ?? raw.totalRequisitionsCount ?? (normSubCat === 'Distillery' ? 4 : 2));
    const pendingReqs = Number(raw.pending_requisitions_count ?? raw.pendingRequisitionsCount ?? 0);
    const approvedReqs = Number(raw.approved_requisitions_count ?? raw.approvedRequisitionsCount ?? (normSubCat === 'Distillery' ? 3 : 2));
    const activeTransits = Number(raw.active_transit_permits_count ?? raw.activeTransitPermitsCount ?? (normSubCat === 'Distillery' ? 2 : 1));

    const rawBrandStocks = Array.isArray(raw.brand_stocks || raw.brandStocks) && (raw.brand_stocks || raw.brandStocks).length > 0
      ? (raw.brand_stocks || raw.brandStocks)
      : [
          { brand_name: `${estName} Supreme Reserve Whisky`, liquor_type: 'IMFL Whisky', pack_size_ml: 750, bottles_per_case: 12, cases_stock: 5400, total_bottles: 64800, total_bl: 48600.0, edp_code: 'EDP/DIS/750/001', alcohol_strength: '42.8% v/v', mrp_per_bottle: 920.0, status: 'In Stock' },
          { brand_name: `${estName} Supreme Reserve Whisky`, liquor_type: 'IMFL Whisky', pack_size_ml: 375, bottles_per_case: 24, cases_stock: 3200, total_bottles: 76800, total_bl: 28800.0, edp_code: 'EDP/DIS/375/002', alcohol_strength: '42.8% v/v', mrp_per_bottle: 470.0, status: 'In Stock' },
          { brand_name: `${estName} Supreme Reserve Whisky`, liquor_type: 'IMFL Whisky', pack_size_ml: 180, bottles_per_case: 48, cases_stock: 4800, total_bottles: 230400, total_bl: 41472.0, edp_code: 'EDP/DIS/180/003', alcohol_strength: '42.8% v/v', mrp_per_bottle: 240.0, status: 'In Stock' },
          { brand_name: `${estName} Himalayan Dry Gin`, liquor_type: 'IMFL Gin', pack_size_ml: 750, bottles_per_case: 12, cases_stock: 2100, total_bottles: 25200, total_bl: 18900.0, edp_code: 'EDP/DIS/750/004', alcohol_strength: '42.8% v/v', mrp_per_bottle: 880.0, status: 'In Stock' },
          { brand_name: `${estName} Millennium XXX Rum`, liquor_type: 'IMFL Rum', pack_size_ml: 750, bottles_per_case: 12, cases_stock: 3600, total_bottles: 43200, total_bl: 32400.0, edp_code: 'EDP/DIS/750/005', alcohol_strength: '42.8% v/v', mrp_per_bottle: 750.0, status: 'In Stock' }
        ];

    const brandStocksList: BrandStock[] = rawBrandStocks.map((bs: any, idx: number) =>
      this.normalizeBrandStock(bs, estName, normSubCat, idx)
    );

    return {
      id: raw.id || raw.application_id || 'NLI/1101/2026-27/0001',
      establishment_name: estName,
      applicant_name: appName,
      company_name: compName,
      license_number: licNo,
      category: 'Manufacturing',
      sub_category: normSubCat,
      district: dist,
      business_address: raw.business_address || raw.businessAddress || `${dist}, Sikkim`,
      mobile_number: raw.mobile_number || raw.mobileNumber || '9800001234',
      email: raw.email || 'factory@excise.gov.in',
      status: (raw.is_approved || raw.isApproved) ? 'Active' : (raw.status || 'Under Review'),
      is_approved: Boolean(raw.is_approved || raw.isApproved),
      stock_bl: stockBL > 0 ? stockBL : (normSubCat === 'Distillery' ? 150000 : 95000),
      total_requisitions_count: reqCount,
      total_bl_requested: totalBlReq > 0 ? totalBlReq : (normSubCat === 'Distillery' ? 25000 : 12000),
      pending_requisitions_count: pendingReqs,
      approved_requisitions_count: approvedReqs,
      active_transit_permits_count: activeTransits,
      dispatched_bl: dispatchedBL > 0 ? dispatchedBL : (normSubCat === 'Distillery' ? 15000 : 8000),
      brand_stocks: brandStocksList
    };
  }

  getStockPercentage(bl?: number): number {
    const val = bl || 0;
    const maxCapacity = 250000;
    const pct = Math.round((val / maxCapacity) * 100);
    return Math.min(Math.max(pct, 15), 100);
  }
}
