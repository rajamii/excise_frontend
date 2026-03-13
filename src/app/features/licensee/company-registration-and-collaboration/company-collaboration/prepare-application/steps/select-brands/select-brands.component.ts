import { Component, DoCheck, EventEmitter, Output, OnDestroy, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { FormsModule } from '@angular/forms';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationBrand,
  CompanyCollaborationFeeStructure
} from '../../../../../../../core/models/company-collaboration.model';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';

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
  availableSizes: string[] = [];

  // Filter properties — matches PDF: Liquor Category / Liquor Kind / Liquor Type
  selectedCategory: string = '';
  selectedKind: string = '';
  selectedType: string = '';
  searchTerm: string = '';

  // Dynamic filter options
  categories: string[] = [];
  kinds: string[] = [];
  types: string[] = [];

  /**
   * Per-brand, per-size selection.
   * Key: brandId (string), Value: Set of selected pack sizes (e.g. "750 Ml", "375 Ml", "180 Ml")
   */
  selectedBrandSizes: Map<string, Set<string>> = new Map();

  /** Derived: brands that have at least one size selected, with their selectedSizes populated. */
  selectedBrands: CompanyCollaborationBrand[] = [];

  private lastBottlerSignature = '';

  constructor(private companyCollaborationService: CompanyCollaborationService) {}

  ngOnInit() {
    this.lastBottlerSignature = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails) || '';
    this.loadBrands();
  }

  ngDoCheck(): void {
    const currentSignature = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails) || '';
    if (currentSignature !== this.lastBottlerSignature) {
      this.lastBottlerSignature = currentSignature;
      this.loadBrands();
    }
  }

  ngOnDestroy() {
    this.saveSelection();
  }

  // ---------------------------------------------------------------------------
  // Filter initialisation
  // ---------------------------------------------------------------------------

  private initializeFilters() {
    this.categories = [...new Set(this.allBrands.map((b) => b.category).filter(Boolean))].sort();
    this.kinds      = [...new Set(this.allBrands.map((b) => (b as any).kind).filter(Boolean))].sort();
    this.types      = [...new Set(this.allBrands.map((b) => b.type).filter(Boolean))].sort();
  }

  private ensureFilterSelection() {
    if (this.selectedCategory && !this.categories.includes(this.selectedCategory)) this.selectedCategory = '';
    if (this.selectedKind     && !this.kinds.includes(this.selectedKind))           this.selectedKind = '';
    if (this.selectedType     && !this.types.includes(this.selectedType))           this.selectedType = '';
  }

  // ---------------------------------------------------------------------------
  // Load brands from service
  // ---------------------------------------------------------------------------

  private loadBrands(): void {
    const bottlerDetails  = this.getBottlerDetails();
    const brandOwnerCode  = String(bottlerDetails?.brandOwnerCode || bottlerDetails?.brandOwner || '').trim();
    const brandOwnerName  = String(bottlerDetails?.brandOwnerName || '').trim();

    this.showOverview = false;

    if (!brandOwnerCode) {
      this.allBrands = [];
      this.filteredBrands = [];
      this.categories = [];
      this.kinds = [];
      this.types = [];
      this.selectedBrandSizes.clear();
      this.selectedBrands = [];
      this.feeStructure = null;
      sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
      sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary);
      this.saveSelection();
      return;
    }

    this.isLoadingBrands = true;
    this.companyCollaborationService.getBrandsByOwner(brandOwnerCode, brandOwnerName).subscribe({
      next: (brands) => {
        this.allBrands = brands;
        this.initializeFilters();
        this.ensureFilterSelection();
        this.loadSavedSelection();
        this.pruneSelectedBrandSizes();
        this.filterBrands();
        this.updateSelectedBrands();
        this.saveSelection();
        this.isLoadingBrands = false;
      },
      error: (error) => {
        console.error('Failed to load collaboration brands:', error);
        this.allBrands = [];
        this.filteredBrands = [];
        this.categories = [];
        this.kinds = [];
        this.types = [];
        this.selectedBrandSizes.clear();
        this.saveSelection();
        this.isLoadingBrands = false;
      }
    });
  }

  private getBottlerDetails(): any {
    const saved = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Session storage
  // ---------------------------------------------------------------------------

  private loadSavedSelection() {
    const saved = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    if (!saved) return;
    try {
      // Saved format: { brandId: string[] } — sizes selected per brand
      const parsed = JSON.parse(saved) as Record<string, string[]>;
      this.selectedBrandSizes = new Map(
        Object.entries(parsed).map(([id, sizes]) => [id, new Set(Array.isArray(sizes) ? sizes : [])])
      );
    } catch (error) {
      console.error('Error loading saved brand selection:', error);
    }
  }

  private saveSelection() {
    this.updateSelectedBrands();

    // Persist as { brandId: string[] }
    const serialisable: Record<string, string[]> = {};
    this.selectedBrandSizes.forEach((sizes, id) => {
      if (sizes.size > 0) serialisable[id] = Array.from(sizes);
    });
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds, JSON.stringify(serialisable));
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands, JSON.stringify(this.selectedBrands));
    this.companyCollaborationService.setSelectedBrands(this.selectedBrands);
  }

  private pruneSelectedBrandSizes(): void {
    const validIds = new Set(this.allBrands.map((b) => String(b.id)));
    this.selectedBrandSizes.forEach((_, id) => {
      if (!validIds.has(id)) this.selectedBrandSizes.delete(id);
    });
  }

  private updateSelectedBrands(): void {
    this.selectedBrands = this.allBrands
      .filter((b) => {
        const sizes = this.selectedBrandSizes.get(String(b.id));
        return sizes && sizes.size > 0;
      })
      .map((b) => ({
        ...b,
        selectedSizes: Array.from(this.selectedBrandSizes.get(String(b.id))!)
      }));
  }

  // ---------------------------------------------------------------------------
  // Filter logic
  // ---------------------------------------------------------------------------

  filterBrands() {
    this.filteredBrands = this.allBrands.filter((brand) => {
      const matchesCategory = !this.selectedCategory || brand.category === this.selectedCategory;
      const matchesKind     = !this.selectedKind     || (brand as any).kind === this.selectedKind;
      const matchesType     = !this.selectedType     || brand.type === this.selectedType;
      const matchesSearch   = !this.searchTerm ||
        brand.brand_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        brand.brand_code.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesCategory && matchesKind && matchesType && matchesSearch;
    });

    this.availableSizes = this.buildAvailableSizes(this.filteredBrands);
  }

  private buildAvailableSizes(brands: CompanyCollaborationBrand[]): string[] {
    const seen = new Set<string>();
    const sizes: string[] = [];
    brands.forEach((brand) => {
      (brand.sizes || []).forEach((size) => {
        if (size === null || size === undefined) return;
        const label = String(size);
        if (!label || seen.has(label)) return;
        seen.add(label);
        sizes.push(label);
      });
    });
    return sizes;
  }

  // ---------------------------------------------------------------------------
  // Per-size selection helpers
  // ---------------------------------------------------------------------------

  isSizeSelected(brandId: string | number, size: string): boolean {
    return this.selectedBrandSizes.get(String(brandId))?.has(size) ?? false;
  }

  isSelected(brandId: string | number): boolean {
    const sizes = this.selectedBrandSizes.get(String(brandId));
    return !!(sizes && sizes.size > 0);
  }

  toggleBrandSize(brandId: string | number, size: string) {
    const key = String(brandId);
    if (!this.selectedBrandSizes.has(key)) {
      this.selectedBrandSizes.set(key, new Set());
    }
    const sizes = this.selectedBrandSizes.get(key)!;
    if (sizes.has(size)) {
      sizes.delete(size);
    } else {
      sizes.add(size);
    }
    if (sizes.size === 0) this.selectedBrandSizes.delete(key);
    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  isAllSelected(): boolean {
    return this.filteredBrands.length > 0 &&
      this.filteredBrands.every((b) => this.isSelected(b.id));
  }

  isIndeterminate(): boolean {
    const selectedCount = this.filteredBrands.filter((b) => this.isSelected(b.id)).length;
    return selectedCount > 0 && selectedCount < this.filteredBrands.length;
  }

  /** Toggle all available sizes for a single brand row. */
  toggleAllSizesForBrand(brand: CompanyCollaborationBrand) {
    const key = String(brand.id);
    const allSelected = brand.sizes.every((s) => this.isSizeSelected(brand.id, s));
    if (allSelected) {
      this.selectedBrandSizes.delete(key);
    } else {
      this.selectedBrandSizes.set(key, new Set(brand.sizes));
    }
    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  isAllSizesSelectedForBrand(brand: CompanyCollaborationBrand): boolean {
    return brand.sizes.length > 0 && brand.sizes.every((s) => this.isSizeSelected(brand.id, s));
  }

  isSomeSizesSelectedForBrand(brand: CompanyCollaborationBrand): boolean {
    const selected = brand.sizes.filter((s) => this.isSizeSelected(brand.id, s));
    return selected.length > 0 && selected.length < brand.sizes.length;
  }

  /** Select/deselect all visible sizes for all filtered brands. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.filteredBrands.forEach((b) => this.selectedBrandSizes.delete(String(b.id)));
    } else {
      this.filteredBrands.forEach((b) => {
        const key = String(b.id);
        this.selectedBrandSizes.set(key, new Set(b.sizes));
      });
    }
    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  /** Total number of brand+size combinations selected. */
  getSelectedCount(): number {
    let count = 0;
    this.selectedBrandSizes.forEach((sizes) => { count += sizes.size; });
    return count;
  }

  getSelectedBrandCount(): number {
    return this.selectedBrands.length;
  }

  removeBrand(brandId: string | number) {
    this.selectedBrandSizes.delete(String(brandId));
    this.saveSelection();
    if (this.showOverview) this.refreshFeeStructure();
  }

  resetSelection() {
    this.selectedBrandSizes.clear();
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary);
    this.companyCollaborationService.clearSelectedBrands();
    this.selectedBrands = [];
    this.feeStructure = null;
    this.showOverview = false;
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  goBack() {
    this.saveSelection();
    this.back.emit();
  }

  addSelectedBrands() {
    this.saveSelection();
    if (this.getSelectedCount() === 0) return;
    this.showOverview = true;
    this.refreshFeeStructure();
  }

  addMoreProduct() {
    this.showOverview = false;
  }

  proceedToSubmit() {
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
      next: (feeStructure) => {
        this.feeStructure = feeStructure;
        sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure, JSON.stringify(feeStructure));
        this.isLoadingFee = false;
      },
      error: (error) => {
        console.error('Failed to load company collaboration fee structure:', error);
        this.feeStructure = null;
        sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
        this.isLoadingFee = false;
      }
    });
  }

  private saveOverviewSummary(): void {
    const overviewSummary = {
      totalBrands:     this.selectedBrands.length,
      totalAmount:     this.getTotalAmount(),
      applicationDate: this.getCurrentDate(),
      selectedBrands:  this.selectedBrands
    };
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary, JSON.stringify(overviewSummary));
  }
}
