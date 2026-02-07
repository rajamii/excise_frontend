import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { FormsModule } from '@angular/forms';

interface Brand {
  id: number;
  brand_code: string;
  brand_name: string;
  category: string;
  type: string;
  strength: number;
  sizes: string[];
  brand_owner_code: string;
  status: string;
}

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

  // Sample brands data - in real app, this would come from a service
  allBrands: Brand[] = [
    {
      id: 1,
      brand_code: 'NA',
      brand_name: 'NA',
      category: 'NA',
      type: 'NA',
      strength: 3,
      sizes: ['NA'],
      brand_owner_code: 'NA',
      status: 'Active'
    },
    {
      id: 2,
      brand_code: 'NA',
      brand_name: 'NA',
      category: 'NA',
      type: 'NA',
      strength: 2,
      sizes: ['NA'],
      brand_owner_code: 'NA',
      status: 'Active'
    },
    {
      id: 3,
      brand_code: 'NA',
      brand_name: 'NA',
      category: 'NA',
      type: 'NA',
      strength: 1,
      sizes: ['NA'],
      brand_owner_code: 'NA',
      status: 'Active'
    },


  ];

  filteredBrands: Brand[] = [];
  selectedBrandIds: Set<number> = new Set();

  // Filter properties
  selectedCategory: string = '';
  selectedType: string = '';
  searchTerm: string = '';

  // Dynamic filter options
  categories: string[] = [];
  types: string[] = [];

  ngOnInit() {
    this.initializeFilters();
    this.loadSavedSelection();
    this.filterBrands();
  }

  ngOnDestroy() {
    this.saveSelection();
  }

  private initializeFilters() {
    // Extract unique categories and types
    this.categories = [...new Set(this.allBrands.map(brand => brand.category))].sort();
    this.types = [...new Set(this.allBrands.map(brand => brand.type))].sort();
  }

  private loadSavedSelection() {
    const saved = sessionStorage.getItem('selectedBrands');
    if (saved) {
      try {
        const savedIds = JSON.parse(saved);
        this.selectedBrandIds = new Set(savedIds);
      } catch (error) {
        console.error('Error loading saved brand selection:', error);
      }
    }
  }

  private saveSelection() {
    const selectedIds = Array.from(this.selectedBrandIds);
    sessionStorage.setItem('selectedBrands', JSON.stringify(selectedIds));

    // Also save detailed brand information
    const selectedBrands = this.getSelectedBrands();
    sessionStorage.setItem('selectedBrandsDetails', JSON.stringify(selectedBrands));
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

  isSelected(brandId: number): boolean {
    return this.selectedBrandIds.has(brandId);
  }

  toggleBrand(brandId: number) {
    if (this.selectedBrandIds.has(brandId)) {
      this.selectedBrandIds.delete(brandId);
    } else {
      this.selectedBrandIds.add(brandId);
    }
    this.saveSelection();
  }

  isAllSelected(): boolean {
    return this.filteredBrands.length > 0 &&
      this.filteredBrands.every(brand => this.selectedBrandIds.has(brand.id));
  }

  isIndeterminate(): boolean {
    const selectedCount = this.filteredBrands.filter(brand => this.selectedBrandIds.has(brand.id)).length;
    return selectedCount > 0 && selectedCount < this.filteredBrands.length;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      // Unselect all filtered brands
      this.filteredBrands.forEach(brand => this.selectedBrandIds.delete(brand.id));
    } else {
      // Select all filtered brands
      this.filteredBrands.forEach(brand => this.selectedBrandIds.add(brand.id));
    }
    this.saveSelection();
  }

  getSelectedCount(): number {
    return this.selectedBrandIds.size;
  }

  getSelectedBrands(): Brand[] {
    return this.allBrands.filter(brand => this.selectedBrandIds.has(brand.id));
  }

  resetSelection() {
    this.selectedBrandIds.clear();
    sessionStorage.removeItem('selectedBrands');
    sessionStorage.removeItem('selectedBrandsDetails');
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