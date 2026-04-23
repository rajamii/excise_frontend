import { Component, EventEmitter, Output, OnDestroy, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { FormsModule } from '@angular/forms';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationBrand,
  CompanyCollaborationFeeStructure,
  LiquorCategory,
  LiquorKind,
  LiquorType
} from '../../../../../../../core/models/company-collaboration.model';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';

@Component({
  selector: 'app-select-brands',
  standalone: true,
  imports: [MaterialModule, FormsModule],
  templateUrl: './select-brands.component.html',
  styleUrl: './select-brands.component.scss'
})
export class SelectBrandsComponent implements OnInit, OnDestroy {
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  allBrands: CompanyCollaborationBrand[] = [];
  filteredBrands: CompanyCollaborationBrand[] = [];
  isLoadingBrands = false;
  isLoadingFee = false;
  showOverview = false;
  feeStructure: CompanyCollaborationFeeStructure | null = null;
  displayedColumns: string[] = ['serialNo', 'brandCode', 'brandName', 'category', 'kind', 'type', 'action'];

  // ── Master dropdown data ───────────────────────────────────────────────────
  allCategories: LiquorCategory[] = [];
  allKinds: LiquorKind[] = [];
  allTypes: LiquorType[] = [];

  categories: LiquorCategory[] = [];
  kinds: LiquorKind[] = [];
  types: LiquorType[] = [];

  selectedCatCode: number | null = null;
  selectedKindId:  number | null = null;
  selectedTypeId:  number | null = null;
  searchTerm = '';

  // ── Selection state — set of selected brand IDs ────────────────────────────
  selectedBrandIds = new Set<string>();
  selectedBrands: CompanyCollaborationBrand[] = [];

  constructor(private svc: CompanyCollaborationService) {}

  ngOnInit(): void { this.loadMasterData(); }

  ngOnDestroy(): void { this.saveSelection(); }

  // ---------------------------------------------------------------------------
  // Master data loading
  // ---------------------------------------------------------------------------

  private loadMasterData(): void {
    this.isLoadingBrands = true;
    this.showOverview = false;

    forkJoin({
      categories: this.svc.getLiquorCategories(),
      kinds:      this.svc.getLiquorKinds(),
      types:      this.svc.getLiquorTypes(),
      brands:     this.svc.getBrands()
    }).subscribe({
      next: ({ categories, kinds, types, brands }) => {
        this.allCategories = categories.map((c: any) => ({
          liquorCatCode: c.liquorCatCode ?? c.liquor_cat_code,
          liquorCatDesc: c.liquorCatDesc ?? c.liquor_cat_desc,
          liquorCatAbbr: c.liquorCatAbbr ?? c.liquor_cat_abbr
        }));
        this.allKinds = kinds.map((k: any) => ({
          id:             k.id,
          liquorCatCode:  k.liquorCat       ?? k.liquor_cat,
          liquorKindCode: k.liquorKindCode  ?? k.liquor_kind_code,
          liquorKindDesc: k.liquorKindDesc  ?? k.liquor_kind_desc,
          liquorKindAbbr: k.liquorKindAbbr  ?? k.liquor_kind_abbr
        }));
        this.allTypes = types.map((t: any) => ({
          id:             t.id,
          liquorCatCode:  t.liquorCat       ?? t.liquor_cat,
          liquorKindId:   t.liquorKind      ?? t.liquor_kind,
          liquorTypeCode: t.liquorTypeCode  ?? t.liquor_type_code,
          liquorTypeDesc: t.liquorTypeDesc  ?? t.liquor_type_desc
        }));

        this.allBrands = brands;
        this.categories = [...this.allCategories];
        this.rebuildKinds();
        this.loadSavedSelection();
        this.filterBrands();
        this.updateSelectedBrands();
        this.saveSelection();
        this.isLoadingBrands = false;
      },
      error: (err) => {
        console.error('Failed to load master data:', err);
        this.isLoadingBrands = false;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Cascade handlers
  // ---------------------------------------------------------------------------

  onCategoryChange(): void {
    this.selectedKindId = null;
    this.selectedTypeId = null;
    this.rebuildKinds();
    this.filterBrands();
  }

  onKindChange(): void {
    this.selectedTypeId = null;
    this.rebuildTypes();
    this.filterBrands();
  }

  onTypeChange(): void { this.filterBrands(); }

  private rebuildKinds(): void {
    this.kinds = this.selectedCatCode
      ? this.allKinds.filter((k) => k.liquorCatCode === this.selectedCatCode)
      : [...this.allKinds];
    if (this.selectedKindId && !this.kinds.find((k) => k.id === this.selectedKindId)) {
      this.selectedKindId = null;
    }
    this.rebuildTypes();
  }

  private rebuildTypes(): void {
    let source = this.allTypes;
    if (this.selectedCatCode) source = source.filter((t) => t.liquorCatCode === this.selectedCatCode);
    if (this.selectedKindId)  source = source.filter((t) => t.liquorKindId  === this.selectedKindId);
    this.types = source;
    if (this.selectedTypeId && !this.types.find((t) => t.id === this.selectedTypeId)) {
      this.selectedTypeId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Brand filtering
  // ---------------------------------------------------------------------------

  filterBrands(): void {
    this.filteredBrands = this.allBrands.filter((brand) => {
      const catMatch  = !this.selectedCatCode || brand.liquorCatCode === this.selectedCatCode;
      const kindMatch = !this.selectedKindId  || brand.liquorKindId  === this.selectedKindId;
      const typeMatch = !this.selectedTypeId  || brand.liquorTypeId  === this.selectedTypeId;
      const search    = !this.searchTerm      ||
        brand.brand_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        brand.brand_code.toLowerCase().includes(this.searchTerm.toLowerCase());
      return catMatch && kindMatch && typeMatch && search;
    });
  }

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  isSelected(brandId: string | number): boolean {
    return this.selectedBrandIds.has(String(brandId));
  }

  toggleBrand(brand: CompanyCollaborationBrand): void {
    const key = String(brand.id);
    const updated = new Set(this.selectedBrandIds);
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    this.selectedBrandIds = updated;
    this.updateSelectedBrands();
    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  isAllSelected(): boolean {
    return this.filteredBrands.length > 0 &&
      this.filteredBrands.every((b) => this.isSelected(b.id));
  }

  isIndeterminate(): boolean {
    const n = this.filteredBrands.filter((b) => this.isSelected(b.id)).length;
    return n > 0 && n < this.filteredBrands.length;
  }

  masterToggle(): void {
    const updated = new Set(this.selectedBrandIds);
    if (this.isAllSelected()) {
      this.filteredBrands.forEach((b) => updated.delete(String(b.id)));
    } else {
      this.filteredBrands.forEach((b) => updated.add(String(b.id)));
    }
    this.selectedBrandIds = updated;
    this.updateSelectedBrands();
    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  removeBrand(brandId: string | number): void {
    const updated = new Set(this.selectedBrandIds);
    updated.delete(String(brandId));
    this.selectedBrandIds = updated;
    this.updateSelectedBrands();
    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  getSelectedBrandCount(): number { return this.selectedBrandIds.size; }

  resetSelection(): void {
    this.selectedBrandIds = new Set();
    this.selectedCatCode = null;
    this.selectedKindId  = null;
    this.selectedTypeId  = null;
    this.searchTerm = '';
    this.selectedBrands = [];
    this.feeStructure = null;
    this.showOverview = false;
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary);
    this.svc.clearSelectedBrands();
    this.rebuildKinds();
    this.filterBrands();
  }

  // ---------------------------------------------------------------------------
  // Session storage
  // ---------------------------------------------------------------------------

  private loadSavedSelection(): void {
    const saved = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as string[];
      this.selectedBrandIds = new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      this.selectedBrandIds = new Set();
    }
  }

  private saveSelection(): void {
    sessionStorage.setItem(
      COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds,
      JSON.stringify(Array.from(this.selectedBrandIds))
    );
    sessionStorage.setItem(
      COMPANY_COLLAB_STORAGE_KEYS.selectedBrands,
      JSON.stringify(this.selectedBrands)
    );
    this.svc.setSelectedBrands(this.selectedBrands);
  }

  private updateSelectedBrands(): void {
    this.selectedBrands = this.allBrands.filter((b) => this.selectedBrandIds.has(String(b.id)));
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  goBack(): void { this.saveSelection(); this.back.emit(); }

  addSelectedBrands(): void {
    this.saveSelection();
    if (this.selectedBrandIds.size === 0) return;
    this.showOverview = true;
    this.refreshFeeStructure();
  }

  addMoreProduct(): void { this.showOverview = false; }

  proceedToSubmit(): void {
    this.saveSelection();
    if (this.selectedBrands.length === 0 || !this.feeStructure) return;
    this.saveOverviewSummary();
    this.next.emit();
  }

  // ---------------------------------------------------------------------------
  // Fee structure
  // ---------------------------------------------------------------------------

  getTotalAmount(): number {
    if (!this.feeStructure) return 0;
    return Number(this.feeStructure.applicationFee || 0)
         + Number(this.feeStructure.collaborationFee || 0)
         + Number(this.feeStructure.securityDeposit || 0);
  }

  getCurrentDate(): string { return new Date().toLocaleDateString('en-GB'); }

  private refreshFeeStructure(): void {
    if (this.selectedBrands.length === 0) {
      this.feeStructure = null;
      sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
      return;
    }
    this.isLoadingFee = true;
    this.svc.getFeeStructure().subscribe({
      next: (fee) => {
        this.feeStructure = fee;
        sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure, JSON.stringify(fee));
        this.isLoadingFee = false;
      },
      error: (err) => {
        console.error('Failed to load fee structure:', err);
        this.feeStructure = null;
        sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
        this.isLoadingFee = false;
      }
    });
  }

  private saveOverviewSummary(): void {
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary, JSON.stringify({
      totalBrands:     this.selectedBrands.length,
      totalAmount:     this.getTotalAmount(),
      applicationDate: this.getCurrentDate(),
      selectedBrands:  this.selectedBrands
    }));
  }
}
