import { Component, DoCheck, EventEmitter, Output, OnDestroy, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { FormsModule } from '@angular/forms';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationBrand
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
  selectedBrandIds: Set<string> = new Set();
  isLoadingBrands = false;

  // Filter properties
  selectedCategory: string = '';
  selectedType: string = '';
  searchTerm: string = '';

  // Dynamic filter options
  categories: string[] = [];
  types: string[] = [];
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

  private initializeFilters() {
    this.categories = [...new Set(this.allBrands.map(brand => brand.category))].sort();
    this.types = [...new Set(this.allBrands.map(brand => brand.type))].sort();
  }

  private loadSavedSelection() {
    const saved = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    if (saved) {
      try {
        const savedIds = JSON.parse(saved);
        this.selectedBrandIds = new Set(
          Array.isArray(savedIds) ? savedIds.map((id) => String(id)) : []
        );
      } catch (error) {
        console.error('Error loading saved brand selection:', error);
      }
    }
  }

  private saveSelection() {
    const selectedIds = Array.from(this.selectedBrandIds);
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds, JSON.stringify(selectedIds));

    const selectedBrands = this.getSelectedBrands();
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands, JSON.stringify(selectedBrands));
    this.companyCollaborationService.setSelectedBrands(selectedBrands);
  }

  private loadBrands(): void {
    const bottlerDetails = this.getBottlerDetails();
    const brandOwnerCode = String(bottlerDetails?.brandOwnerCode || bottlerDetails?.brandOwner || '').trim();
    const brandOwnerName = String(bottlerDetails?.brandOwnerName || '').trim();

    if (!brandOwnerCode) {
      this.allBrands = [];
      this.filteredBrands = [];
      this.categories = [];
      this.types = [];
      this.selectedBrandIds.clear();
      this.saveSelection();
      return;
    }

    this.isLoadingBrands = true;
    this.companyCollaborationService.getBrandsByOwner(brandOwnerCode, brandOwnerName).subscribe({
      next: (brands) => {
        this.allBrands = brands;
        this.initializeFilters();
        this.loadSavedSelection();
        this.pruneSelectedBrandIds();
        this.filterBrands();
        this.saveSelection();
        this.isLoadingBrands = false;
      },
      error: (error) => {
        console.error('Failed to load collaboration brands:', error);
        this.allBrands = [];
        this.filteredBrands = [];
        this.categories = [];
        this.types = [];
        this.selectedBrandIds.clear();
        this.saveSelection();
        this.isLoadingBrands = false;
      }
    });
  }

  private getBottlerDetails(): any {
    const saved = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
    if (!saved) {
      return null;
    }

    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading bottler details from session storage:', error);
      return null;
    }
  }

  private pruneSelectedBrandIds(): void {
    const validIds = new Set(this.allBrands.map((brand) => String(brand.id)));
    this.selectedBrandIds = new Set(
      Array.from(this.selectedBrandIds).filter((id) => validIds.has(id))
    );
  }

  filterBrands() {
    this.filteredBrands = this.allBrands.filter(brand => {
      const matchesCategory = !this.selectedCategory || brand.category === this.selectedCategory;
      const matchesType = !this.selectedType || brand.type === this.selectedType;
      const matchesSearch = !this.searchTerm ||
        brand.brand_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        brand.brand_code.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesCategory && matchesType && matchesSearch;
    });
  }

  isSelected(brandId: string | number): boolean {
    return this.selectedBrandIds.has(String(brandId));
  }

  toggleBrand(brandId: string | number) {
    const key = String(brandId);
    if (this.selectedBrandIds.has(key)) {
      this.selectedBrandIds.delete(key);
    } else {
      this.selectedBrandIds.add(key);
    }
    this.saveSelection();
  }

  isAllSelected(): boolean {
    return this.filteredBrands.length > 0 &&
      this.filteredBrands.every((brand) => this.selectedBrandIds.has(String(brand.id)));
  }

  isIndeterminate(): boolean {
    const selectedCount = this.filteredBrands.filter((brand) => this.selectedBrandIds.has(String(brand.id))).length;
    return selectedCount > 0 && selectedCount < this.filteredBrands.length;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.filteredBrands.forEach((brand) => this.selectedBrandIds.delete(String(brand.id)));
    } else {
      this.filteredBrands.forEach((brand) => this.selectedBrandIds.add(String(brand.id)));
    }
    this.saveSelection();
  }

  getSelectedCount(): number {
    return this.selectedBrandIds.size;
  }

  getSelectedBrands(): CompanyCollaborationBrand[] {
    return this.allBrands.filter((brand) => this.selectedBrandIds.has(String(brand.id)));
  }

  resetSelection() {
    this.selectedBrandIds.clear();
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    this.companyCollaborationService.clearSelectedBrands();
  }

  goBack() {
    this.saveSelection();
    this.back.emit();
  }

  proceedToNext() {
    this.saveSelection(); // <-- Make sure this is first
    this.next.emit();
  }
}
