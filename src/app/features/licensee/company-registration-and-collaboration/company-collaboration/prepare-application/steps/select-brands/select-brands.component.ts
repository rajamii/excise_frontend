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
  isSearchingBrands = false;
  isLoadingFee = false;
  showOverview = false;
  feeStructure: CompanyCollaborationFeeStructure | null = null;
  displayedColumns: string[] = ['serialNo', 'brandCode', 'brandName', 'category', 'kind', 'type', 'action'];

  // Pagination state
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 15, 20];

  /** True only after the user has clicked Search at least once for the current filters */
  hasSearched = false;

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
      types:      this.svc.getLiquorTypes()
    }).subscribe({
      next: ({ categories, kinds, types }) => {
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

        this.categories = [...this.allCategories];
        this.rebuildKinds();
        this.loadSavedSelection();
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
    this.allBrands = [];
    this.filteredBrands = [];
    this.hasSearched = false;
  }

  onKindChange(): void {
    this.selectedTypeId = null;
    this.rebuildTypes();
    this.allBrands = [];
    this.filteredBrands = [];
    this.hasSearched = false;
  }

  onTypeChange(): void {
    this.allBrands = [];
    this.filteredBrands = [];
    this.hasSearched = false;
  }

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

  searchFilteredBrands(): void {
    if (!this.selectedCatCode || !this.selectedKindId || !this.selectedTypeId) {
      return;
    }
    this.isSearchingBrands = true;
    this.hasSearched = true;
    this.svc.getBrands(this.selectedCatCode, this.selectedKindId, this.selectedTypeId).subscribe({
      next: (brands) => {
        this.allBrands = brands;
        
        // Restore selection states for the newly loaded brands
        if (this.selectedBrands.length > 0) {
          this.selectedBrands.forEach((sb) => {
            const match = this.allBrands.find((b) => String(b.id) === String(sb.id));
            if (match) {
              match.selected_sizes = sb.selected_sizes;
            }
          });
        }
        
        this.filterBrands();
        this.isSearchingBrands = false;
      },
      error: (err) => {
        console.error('Failed to load brands:', err);
        this.isSearchingBrands = false;
      }
    });
  }

  filterBrands(): void {
    this.pageIndex = 0; // Reset page index on filter change
    this.filteredBrands = this.allBrands.filter((brand) => {
      const search = !this.searchTerm ||
        brand.brand_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        brand.brand_code.toLowerCase().includes(this.searchTerm.toLowerCase());
      return search;
    });
  }

  // ---------------------------------------------------------------------------
  // Pagination helpers
  // ---------------------------------------------------------------------------

  onPageChange(event: any): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  getPagedBrands(): CompanyCollaborationBrand[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredBrands.slice(start, end);
  }

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  isSizeSelected(brand: CompanyCollaborationBrand, sizeLabel: string): boolean {
    return brand.selected_sizes ? brand.selected_sizes.includes(sizeLabel) : false;
  }

  toggleBrandSize(brand: CompanyCollaborationBrand, sizeLabel: string): void {
    if (!brand.selected_sizes) {
      brand.selected_sizes = [];
    }
    const idx = brand.selected_sizes.indexOf(sizeLabel);
    if (idx > -1) {
      brand.selected_sizes.splice(idx, 1);
    } else {
      brand.selected_sizes.push(sizeLabel);
    }

    const key = String(brand.id);
    if (brand.selected_sizes.length > 0) {
      this.selectedBrandIds.add(key);
    } else {
      this.selectedBrandIds.delete(key);
    }

    this.updateSelectedBrands();
    this.saveSelection();
    this.refreshFeeStructure();
  }

  isSelected(brandId: string | number): boolean {
    return this.selectedBrandIds.has(String(brandId));
  }

  getSelectedBrandCount(): number {
    return this.selectedBrandIds.size;
  }

  resetSelection(): void {
    this.selectedBrandIds = new Set();
    this.selectedCatCode = null;
    this.selectedKindId  = null;
    this.selectedTypeId  = null;
    this.searchTerm = '';
    this.selectedBrands = [];
    this.filteredBrands = [];
    this.allBrands = [];
    this.feeStructure = null;
    this.showOverview = false;
    this.pageIndex = 0;
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary);
    this.svc.clearSelectedBrands();
    this.rebuildKinds();
  }

  // ---------------------------------------------------------------------------
  // Session storage
  // ---------------------------------------------------------------------------

  private loadSavedSelection(): void {
    const savedIds = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    const savedBrands = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    if (savedIds) {
      try {
        const parsed = JSON.parse(savedIds) as string[];
        this.selectedBrandIds = new Set(Array.isArray(parsed) ? parsed : []);
      } catch {
        this.selectedBrandIds = new Set();
      }
    }
    if (savedBrands) {
      try {
        const parsedBrands = JSON.parse(savedBrands) as CompanyCollaborationBrand[];
        if (Array.isArray(parsedBrands)) {
          this.selectedBrands = parsedBrands;
          this.selectedBrands.forEach((sb) => {
            const match = this.allBrands.find((b) => String(b.id) === String(sb.id));
            if (match) {
              match.selected_sizes = sb.selected_sizes;
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse saved brands:', e);
      }
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
    const newSelectedMap = new Map<string, CompanyCollaborationBrand>();
    
    // Keep previously selected brands
    this.selectedBrands.forEach(b => newSelectedMap.set(String(b.id), b));
    
    // Update state of currently loaded brands
    this.allBrands.forEach((b) => {
      const key = String(b.id);
      if (this.selectedBrandIds.has(key)) {
        newSelectedMap.set(key, b);
      } else {
        newSelectedMap.delete(key);
      }
    });
    
    this.selectedBrands = Array.from(newSelectedMap.values()).filter(b => this.selectedBrandIds.has(String(b.id)));
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
    if (this.selectedBrandIds.size === 0) return;
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
