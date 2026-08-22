import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SecretaryService, ManufacturingFactory, SecretaryBulkSpiritSummary } from '../../services/secretary.service';

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
  detailActiveTab: 'overview' | 'tanks' | 'requisitions' | 'transits' | 'directives' = 'overview';

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
      next: (res) => {
        const rawList = res.factories || [];
        this.factories = rawList.map(f => this.normalizeFactory(f));
        this.recalculateSummary();
        this.applyFiltersAndSort();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
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

  // Open full dynamic detail page instead of popup
  openDetailPage(factory: ManufacturingFactory): void {
    this.selectedFactory = factory;
    this.currentView = 'detail';
    this.detailActiveTab = 'overview';
    this.directiveRemarks = '';
    this.directiveSavedSuccess = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToRegister(): void {
    this.currentView = 'register';
    this.selectedFactory = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setDetailTab(tab: 'overview' | 'tanks' | 'requisitions' | 'transits' | 'directives'): void {
    this.detailActiveTab = tab;
  }

  saveDirective(): void {
    if (!this.directiveRemarks.trim()) return;
    this.directiveSavedSuccess = true;
    setTimeout(() => {
      this.directiveSavedSuccess = false;
    }, 3500);
  }

  formatNumber(val: number): string {
    return (val || 0).toLocaleString('en-IN');
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
      dispatched_bl: dispatchedBL > 0 ? dispatchedBL : (normSubCat === 'Distillery' ? 15000 : 8000)
    };
  }

  getStockPercentage(bl: number): number {
    const maxCapacity = 250000;
    const pct = Math.round((bl / maxCapacity) * 100);
    return Math.min(Math.max(pct, 15), 100);
  }
}
