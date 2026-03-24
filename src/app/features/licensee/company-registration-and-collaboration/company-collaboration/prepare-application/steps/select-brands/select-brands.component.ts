import { Component, DoCheck, EventEmitter, Output, OnDestroy, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { FormsModule } from '@angular/forms';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationBrand,
  CompanyCollaborationFeeStructure
} from '../../../../../../../core/models/company-collaboration.model';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';

// ---------------------------------------------------------------------------
// DB field → dropdown mapping
//
//  brand_warehouse column  │  CompanyCollaborationBrand field  │  Dropdown
// ─────────────────────────┼───────────────────────────────────┼────────────────
//  distillery_name         │  category                         │  Liquor Category
//  brand_type (derived)    │  kind       (IMFL / OSBI)         │  Liquor Kind
//  brand_type              │  type                             │  Liquor Type
//  brand_details           │  brand_name                       │  Brands table rows
//  capacity_size           │  sizes                            │  Pack-size columns
// ---------------------------------------------------------------------------

/**
 * Liquor types that belong to OSBI (Other State Brewery Industry) per Sikkim
 * excise classification. Everything else is IMFL.
 */
const OSBI_TYPES = new Set(['Beer', 'Wine']);

@Component({
  selector: 'app-select-brands',
  standalone: true,
  imports: [MaterialModule, FormsModule],
  templateUrl: './select-brands.component.html',
  styleUrl: './select-brands.component.scss'
})
export class SelectBrandsComponent implements OnInit, OnDestroy, DoCheck {
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  allBrands: CompanyCollaborationBrand[] = [];
  filteredBrands: CompanyCollaborationBrand[] = [];
  isLoadingBrands = false;
  isLoadingFee = false;
  showOverview = false;
  feeStructure: CompanyCollaborationFeeStructure | null = null;
  displayedColumns: string[] = ['serialNo', 'brandCode', 'brandName', 'type', 'strength', 'sizes', 'action'];

  // ── Active filter values ───────────────────────────────────────────────────
  /** Maps to brand_warehouse.distillery_name  →  brand.category */
  selectedCategory: string = '';
  /** Derived from brand_warehouse.brand_type  →  'IMFL' | 'OSBI' */
  selectedKind: string = '';
  /** Maps to brand_warehouse.brand_type       →  brand.type */
  selectedType: string = '';
  searchTerm: string = '';

  // ── Dropdown option lists (cascade) ───────────────────────────────────────
  /** Distinct distillery_name values */
  categories: string[] = [];
  /** 'IMFL' and/or 'OSBI' — derived from brand_type */
  kinds: string[] = [];
  /** Distinct brand_type values, filtered by selectedCategory + selectedKind */
  types: string[] = [];

  /** Distinct pack sizes in the current filtered result, sorted descending */
  availableSizes: string[] = [];

  /** brandId → selected size strings */
  selectedSizeMap: Record<string, string[]> = {};

  /** Brands with at least one size selected */
  selectedBrands: CompanyCollaborationBrand[] = [];

  private lastBottlerSignature = '';

  constructor(private companyCollaborationService: CompanyCollaborationService) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.lastBottlerSignature = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails) || '';
    this.loadBrands();
  }

  /** Re-load brands whenever the bottler selection changes in session storage */
  ngDoCheck(): void {
    const current = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails) || '';
    if (current !== this.lastBottlerSignature) {
      this.lastBottlerSignature = current;
      this.loadBrands();
    }
  }

  ngOnDestroy(): void {
    this.saveSelection();
  }

  // ---------------------------------------------------------------------------
  // Kind derivation — brand_warehouse has no explicit kind column,
  // so we derive it client-side from brand_type.
  // ---------------------------------------------------------------------------

  /**
   * Returns 'OSBI' for Beer/Wine, 'IMFL' for everything else.
   * Matches Sikkim Excise classification.
   */
  private deriveKind(brandType: string): string {
    return OSBI_TYPES.has(brandType) ? 'OSBI' : 'IMFL';
  }

  // ---------------------------------------------------------------------------
  // Merge rows that share the same brand_details into one row with all sizes
  // (brand_warehouse stores one row per capacity_size)
  // ---------------------------------------------------------------------------

  private mergeBrandsByName(brands: CompanyCollaborationBrand[]): CompanyCollaborationBrand[] {
    const map = new Map<string, CompanyCollaborationBrand>();
    brands.forEach((brand) => {
      const sizes = this.normaliseSizes(brand.sizes);
      // Inject derived `kind` so cascade filtering works without a backend change
      const enriched = { ...brand, sizes, kind: this.deriveKind(brand.type || '') };
      const key = brand.brand_name.trim().toLowerCase();
      if (map.has(key)) {
        const existing = map.get(key)!;
        map.set(key, { ...existing, sizes: [...new Set([...existing.sizes, ...sizes])] });
      } else {
        map.set(key, enriched);
      }
    });
    return Array.from(map.values());
  }

  /** API may return sizes as a comma-string, a single number, or an array */
  private normaliseSizes(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
    return [String(raw)];
  }

  // ---------------------------------------------------------------------------
  // Filter initialisation — all three lists are derived from brand_warehouse
  // ---------------------------------------------------------------------------

  /**
   * Builds the top-level (Category) dropdown from distillery_name.
   * Kind and Type lists are built by the cascade methods below.
   */
  private initializeFilters(): void {
    // Liquor Category  ←  brand_warehouse.distillery_name  (via brand.category)
    this.categories = [...new Set(this.allBrands.map((b) => b.category).filter(Boolean))].sort();

    // Kick off cascade so kinds/types reflect any pre-selected category
    this.rebuildKinds();
  }

  /**
   * Liquor Kind  ←  derived from brand_warehouse.brand_type
   * Filtered to only include kinds available within the currently selected Category.
   */
  private rebuildKinds(): void {
    const source = this.selectedCategory
      ? this.allBrands.filter((b) => b.category === this.selectedCategory)
      : this.allBrands;

    this.kinds = [...new Set(source.map((b) => (b as any).kind).filter(Boolean))].sort();

    // If the currently chosen kind is no longer in the list, reset it
    if (this.selectedKind && !this.kinds.includes(this.selectedKind)) {
      this.selectedKind = '';
    }

    this.rebuildTypes();
  }

  /**
   * Liquor Type  ←  brand_warehouse.brand_type  (via brand.type)
   * Filtered to only include types available within the selected Category + Kind.
   */
  private rebuildTypes(): void {
    let source = this.allBrands;
    if (this.selectedCategory) source = source.filter((b) => b.category === this.selectedCategory);
    if (this.selectedKind)     source = source.filter((b) => (b as any).kind === this.selectedKind);

    this.types = [...new Set(source.map((b) => b.type).filter(Boolean))].sort();

    // If the currently chosen type is no longer in the list, reset it
    if (this.selectedType && !this.types.includes(this.selectedType)) {
      this.selectedType = '';
    }
  }

  private ensureFilterSelection(): void {
    if (this.selectedCategory && !this.categories.includes(this.selectedCategory)) this.selectedCategory = '';
    if (this.selectedKind     && !this.kinds.includes(this.selectedKind))           this.selectedKind = '';
    if (this.selectedType     && !this.types.includes(this.selectedType))           this.selectedType = '';
  }

  // ---------------------------------------------------------------------------
  // Public cascade handlers — called by (selectionChange) in the template
  // ---------------------------------------------------------------------------

  /** Called when the user picks a Liquor Category (distillery_name) */
  onCategoryChange(): void {
    this.selectedKind = '';
    this.selectedType = '';
    this.rebuildKinds();   // rebuilds kinds → calls rebuildTypes internally
    this.filterBrands();
  }

  /** Called when the user picks a Liquor Kind (IMFL / OSBI) */
  onKindChange(): void {
    this.selectedType = '';
    this.rebuildTypes();
    this.filterBrands();
  }

  /** Called when the user picks a Liquor Type (brand_type) */
  onTypeChange(): void {
    this.filterBrands();
  }

  // ---------------------------------------------------------------------------
  // Brand loading
  // ---------------------------------------------------------------------------

  private loadBrands(): void {
    const bottlerDetails = this.getBottlerDetails();
    const brandOwnerCode = String(bottlerDetails?.brandOwnerCode || bottlerDetails?.brandOwner || '').trim();
    const brandOwnerName = String(bottlerDetails?.brandOwnerName || '').trim();

    this.showOverview = false;

    if (!brandOwnerCode) {
      this.resetAllBrandState();
      return;
    }

    this.isLoadingBrands = true;
    this.companyCollaborationService.getBrandsByOwner(brandOwnerCode, brandOwnerName).subscribe({
      next: (brands) => {
        // brand_warehouse rows → enriched brand objects with derived `kind`
        this.allBrands = this.mergeBrandsByName(brands);
        this.initializeFilters();
        this.ensureFilterSelection();
        this.loadSavedSelection();
        this.pruneSelection();
        this.filterBrands();
        this.updateSelectedBrands();
        this.saveSelection();
        this.isLoadingBrands = false;
      },
      error: (error) => {
        console.error('Failed to load collaboration brands:', error);
        this.resetAllBrandState();
        this.isLoadingBrands = false;
      }
    });
  }

  private resetAllBrandState(): void {
    this.allBrands = [];
    this.filteredBrands = [];
    this.availableSizes = [];
    this.categories = [];
    this.kinds = [];
    this.types = [];
    this.selectedSizeMap = {};
    this.selectedBrands = [];
    this.feeStructure = null;
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary);
    this.saveSelection();
  }

  private getBottlerDetails(): any {
    const saved = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
    if (!saved) return null;
    try { return JSON.parse(saved); } catch { return null; }
  }

  // ---------------------------------------------------------------------------
  // Filter logic — applied after every cascade / search change
  // ---------------------------------------------------------------------------

  filterBrands(): void {
    this.filteredBrands = this.allBrands.filter((brand) => {
      // Liquor Category  ←  distillery_name
      const matchesCategory = !this.selectedCategory || brand.category === this.selectedCategory;
      // Liquor Kind  ←  derived IMFL / OSBI
      const matchesKind = !this.selectedKind || (brand as any).kind === this.selectedKind;
      // Liquor Type  ←  brand_type
      const matchesType = !this.selectedType || brand.type === this.selectedType;
      // Free-text search on brand_details / brand_code
      const matchesSearch = !this.searchTerm ||
        brand.brand_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        brand.brand_code.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesCategory && matchesKind && matchesType && matchesSearch;
    });

    // Recompute pack-size columns from filtered result (capacity_size values)
    const sizeSet = new Set<string>();
    this.filteredBrands.forEach((b) => b.sizes.forEach((s) => sizeSet.add(s)));
    this.availableSizes = Array.from(sizeSet).sort((a, b) => parseFloat(b) - parseFloat(a));
  }

  // ---------------------------------------------------------------------------
  // Session storage
  // ---------------------------------------------------------------------------

  private loadSavedSelection(): void {
    const saved = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Record<string, string[]>;
      this.selectedSizeMap = {};
      Object.entries(parsed).forEach(([id, sizes]) => {
        if (Array.isArray(sizes) && sizes.length > 0) {
          this.selectedSizeMap[id] = sizes;
        }
      });
    } catch (err) {
      console.error('Error loading saved brand selection:', err);
    }
  }

  private saveSelection(): void {
    this.updateSelectedBrands();
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds, JSON.stringify(this.selectedSizeMap));
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands, JSON.stringify(this.selectedBrands));
    this.companyCollaborationService.setSelectedBrands(this.selectedBrands);
  }

  private pruneSelection(): void {
    const validIds = new Set(this.allBrands.map((b) => String(b.id)));
    const pruned: Record<string, string[]> = {};
    Object.keys(this.selectedSizeMap).forEach((id) => {
      if (validIds.has(id)) pruned[id] = this.selectedSizeMap[id];
    });
    this.selectedSizeMap = pruned;
  }

  private updateSelectedBrands(): void {
    this.selectedBrands = this.allBrands
      .filter((b) => {
        const sizes = this.selectedSizeMap[String(b.id)];
        return sizes && sizes.length > 0;
      })
      .map((b) => ({ ...b, selectedSizes: [...this.selectedSizeMap[String(b.id)]] }));
  }

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  isSizeSelected(brandId: string | number, size: string): boolean {
    const sizes = this.selectedSizeMap[String(brandId)];
    return sizes ? sizes.includes(size) : false;
  }

  isSelected(brandId: string | number): boolean {
    const sizes = this.selectedSizeMap[String(brandId)];
    return !!(sizes && sizes.length > 0);
  }

  toggleBrandSize(brandId: string | number, size: string): void {
    const key = String(brandId);
    const current = this.selectedSizeMap[key] ?? [];
    const updated = current.includes(size)
      ? current.filter((s) => s !== size)
      : [...current, size];

    if (updated.length === 0) {
      const copy = { ...this.selectedSizeMap };
      delete copy[key];
      this.selectedSizeMap = copy;
    } else {
      this.selectedSizeMap = { ...this.selectedSizeMap, [key]: updated };
    }

    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  toggleAllSizesForBrand(brand: CompanyCollaborationBrand): void {
    const key = String(brand.id);
    const allSelected = brand.sizes.every((s) => this.isSizeSelected(brand.id, s));
    if (allSelected) {
      const copy = { ...this.selectedSizeMap };
      delete copy[key];
      this.selectedSizeMap = copy;
    } else {
      this.selectedSizeMap = { ...this.selectedSizeMap, [key]: [...brand.sizes] };
    }
    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  isAllSizesSelectedForBrand(brand: CompanyCollaborationBrand): boolean {
    return brand.sizes.length > 0 && brand.sizes.every((s) => this.isSizeSelected(brand.id, s));
  }

  isSomeSizesSelectedForBrand(brand: CompanyCollaborationBrand): boolean {
    const n = brand.sizes.filter((s) => this.isSizeSelected(brand.id, s)).length;
    return n > 0 && n < brand.sizes.length;
  }

  isAllSelected(): boolean {
    return this.filteredBrands.length > 0 && this.filteredBrands.every((b) => this.isSelected(b.id));
  }

  isIndeterminate(): boolean {
    const n = this.filteredBrands.filter((b) => this.isSelected(b.id)).length;
    return n > 0 && n < this.filteredBrands.length;
  }

  masterToggle(): void {
    const copy = { ...this.selectedSizeMap };
    if (this.isAllSelected()) {
      this.filteredBrands.forEach((b) => delete copy[String(b.id)]);
    } else {
      this.filteredBrands.forEach((b) => { copy[String(b.id)] = [...b.sizes]; });
    }
    this.selectedSizeMap = copy;
    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  getSelectedCount(): number {
    return Object.values(this.selectedSizeMap).reduce((sum, sizes) => sum + sizes.length, 0);
  }

  getSelectedBrandCount(): number {
    return this.selectedBrands.length;
  }

  removeBrand(brandId: string | number): void {
    const copy = { ...this.selectedSizeMap };
    delete copy[String(brandId)];
    this.selectedSizeMap = copy;
    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  resetSelection(): void {
    this.selectedSizeMap = {};
    this.selectedCategory = '';
    this.selectedKind = '';
    this.selectedType = '';
    this.searchTerm = '';
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary);
    this.companyCollaborationService.clearSelectedBrands();
    this.selectedBrands = [];
    this.feeStructure = null;
    this.showOverview = false;
    this.rebuildKinds();
    this.filterBrands();
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  goBack(): void {
    this.saveSelection();
    this.back.emit();
  }

  addSelectedBrands(): void {
    this.saveSelection();
    if (this.getSelectedCount() === 0) return;
    this.showOverview = true;
    this.refreshFeeStructure();
  }

  addMoreProduct(): void {
    this.showOverview = false;
  }

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
    return (
      Number(this.feeStructure.applicationFee   || 0) +
      Number(this.feeStructure.collaborationFee || 0) +
      Number(this.feeStructure.securityDeposit  || 0)
    );
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-GB');
  }

  private refreshFeeStructure(): void {
    if (this.selectedBrands.length === 0) {
      this.feeStructure = null;
      sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
      return;
    }
    this.isLoadingFee = true;
    this.companyCollaborationService.getFeeStructure(
      this.selectedBrands.map((b) => b.id),
      this.selectedBrands
    ).subscribe({
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
