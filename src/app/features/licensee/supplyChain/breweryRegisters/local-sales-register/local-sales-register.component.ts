import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BrandInfo {
  name: string;
  cases: number | '';
}

interface ProductionRow {
  date: string;
  party: string;
  remarks: string;
  totalProduction: number | '';
  brands: BrandInfo[];
  newBrand: string;
  newBrandCases: number | '';
}

@Component({
  selector: 'app-local-sales-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './local-sales-register.component.html',
  styleUrls: ['./local-sales-register.component.scss']
})
export class LocalSalesRegisterComponent {
  rows: ProductionRow[] = [
    { 
      date: '2024-12-01', 
      party: 'Party A', 
      remarks: 'All data correct', 
      totalProduction: 0, 
      brands: [
        { name: 'BRAND A', cases: 50 },
        { name: 'BRAND B', cases: 30 }
      ], 
      newBrand: '', 
      newBrandCases: '' 
    },
    { 
      date: '2024-12-02', 
      party: 'Party B', 
      remarks: 'Checked and verified', 
      totalProduction: 0, 
      brands: [
        { name: 'BRAND C', cases: 25 }
      ], 
      newBrand: '', 
      newBrandCases: '' 
    }
  ];
  detailsIndex: number | null = null;
  // Draft (new entry form)
  draft: ProductionRow = { date: '', party: '', remarks: '', totalProduction: '', brands: [], newBrand: '', newBrandCases: '' };
  modalNewBrand = '';
  modalNewBrandCases: number | '' = '';
  showBrandsModal = false;

  addRow(): void {
    this.rows = [...this.rows, { date: '', party: '', remarks: '', totalProduction: '', brands: [], newBrand: '', newBrandCases: '' }];
  }

  addBrand(index: number): void {
    const row = this.rows[index];
    const name = (this.modalNewBrand || row.newBrand || '').trim();
    const cases = this.modalNewBrandCases || row.newBrandCases || 0;
    if (!name) return;
    const upper = name.toUpperCase();
    
    // Check if brand already exists
    if (row.brands.some(b => b.name === upper)) { 
      row.newBrand = ''; 
      row.newBrandCases = '';
      this.modalNewBrand = '';
      this.modalNewBrandCases = '';
      return; 
    }
    
    row.brands = [...row.brands, { name: upper, cases: cases }];
    row.newBrand = '';
    row.newBrandCases = '';
    this.modalNewBrand = '';
    this.modalNewBrandCases = '';
  }

  openDetails(index: number): void {
    this.detailsIndex = index;
  }

  closeDetails(): void {
    this.detailsIndex = null;
  }

  onBackdrop(ev: MouseEvent): void {
    if ((ev.target as HTMLElement)?.classList.contains('modal')) {
      this.closeDetails();
    }
  }

  // Draft helpers
  addDraftBrand(): void {
    const name = (this.draft.newBrand || '').trim();
    const cases = this.draft.newBrandCases || 0;
    if (!name) return;
    const upper = name.toUpperCase();
    
    // Check if brand already exists
    if (!this.draft.brands.some(b => b.name === upper)) {
      this.draft.brands = [...this.draft.brands, { name: upper, cases: cases }];
      this.updateTotalProduction(); // Auto-update total production
    }
    this.draft.newBrand = '';
    this.draft.newBrandCases = '';
  }

  commitDraft(): void {
    if (!this.draft.date || !this.draft.party) return;
    this.rows = [
      ...this.rows,
      {
        date: this.draft.date,
        party: this.draft.party,
        remarks: this.draft.remarks,
        totalProduction: this.getTotalCases(this.draft.brands), // Use auto-calculated total
        brands: [...this.draft.brands],
        newBrand: '',
        newBrandCases: ''
      }
    ];
    this.clearDraft();
  }

  clearDraft(): void {
    this.draft = { date: '', party: '', remarks: '', totalProduction: '', brands: [], newBrand: '', newBrandCases: '' };
  }

  // Helper methods for brand management
  removeBrand(rowIndex: number, brandIndex: number): void {
    this.rows[rowIndex].brands.splice(brandIndex, 1);
  }

  removeDraftBrand(brandIndex: number): void {
    this.draft.brands.splice(brandIndex, 1);
    this.updateTotalProduction(); // Auto-update total production
  }

  getTotalCases(brands: BrandInfo[]): number {
    return brands.reduce((total, brand) => total + (typeof brand.cases === 'number' ? brand.cases : 0), 0);
  }

  // Auto-calculate total production when brands change
  updateTotalProduction(): void {
    this.draft.totalProduction = this.getTotalCases(this.draft.brands);
  }

  // Brands modal management
  openBrandsModal(): void {
    this.showBrandsModal = true;
  }

  closeBrandsModal(): void {
    this.showBrandsModal = false;
  }

  onBrandsModalBackdrop(ev: MouseEvent): void {
    if ((ev.target as HTMLElement)?.classList.contains('modal')) {
      this.closeBrandsModal();
    }
  }
}
