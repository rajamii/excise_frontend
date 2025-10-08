import { Component, OnInit } from '@angular/core';
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
export class LocalSalesRegisterComponent implements OnInit {
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

  // Filters for register view
  filters = {
    date: '',
    party: '',
    brand: '',
    month: '', // '01'..'12'
    year: ''   // '2020'..'2026'
  };

  // Month and Year dropdown options
  monthOptions: { label: string; value: string }[] = [
    { label: 'January', value: '01' },
    { label: 'February', value: '02' },
    { label: 'March', value: '03' },
    { label: 'April', value: '04' },
    { label: 'May', value: '05' },
    { label: 'June', value: '06' },
    { label: 'July', value: '07' },
    { label: 'August', value: '08' },
    { label: 'September', value: '09' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' }
  ];

  yearOptions: string[] = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];

  ngOnInit(): void {
    // Default month/year to current
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    if (!this.filters.month) this.filters.month = mm;
    if (!this.filters.year) this.filters.year = yyyy;
  }

  get filteredRows(): ProductionRow[] {
    const dateFilter = (this.filters.date || '').trim();
    const partyFilter = (this.filters.party || '').trim().toLowerCase();
    const brandFilter = (this.filters.brand || '').trim().toLowerCase();
    const monthFilter = (this.filters.month || '').trim(); // '01'..'12'
    const yearFilter = (this.filters.year || '').trim();   // '2020'..'2026'

    return this.rows.filter(row => {
      const rowDate = (row.date || '').trim();
      const rowMonth = rowDate ? rowDate.slice(5, 7) : '';
      const rowYear = rowDate ? rowDate.slice(0, 4) : '';
      const matchesDate = !dateFilter || row.date === dateFilter;
      const matchesParty = !partyFilter || (row.party || '').toLowerCase().includes(partyFilter);
      const matchesBrand = !brandFilter || row.brands.some(b => (b.name || '').toLowerCase().includes(brandFilter));
      const matchesMonth = !monthFilter || rowMonth === monthFilter;
      const matchesYear = !yearFilter || rowYear === yearFilter;
      return matchesDate && matchesParty && matchesBrand && matchesMonth && matchesYear;
    });
  }

  clearFilters(): void {
    this.filters = { date: '', party: '', brand: '', month: '', year: '' };
  }

  private monthNames: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  getHeadingMonthYear(): string {
    const monthCode = (this.filters.month || '').trim(); // '01'..'12'
    const yearVal = (this.filters.year || '').trim();
    if (monthCode && yearVal) {
      const monthIndex = Math.max(0, Math.min(11, parseInt(monthCode, 10) - 1));
      return `${this.monthNames[monthIndex]} ${yearVal}`;
    }
    if (monthCode) {
      const monthIndex = Math.max(0, Math.min(11, parseInt(monthCode, 10) - 1));
      return `${this.monthNames[monthIndex]}`;
    }
    if (yearVal) return yearVal;
    return '';
  }

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

  // Brands Production Record (aggregated per current filters)
  showBrandsSummary = false;

  get aggregatedBrands(): { name: string; totalCases: number }[] {
    const totals = new Map<string, number>();
    for (const row of this.filteredRows) {
      for (const b of row.brands) {
        const name = (b.name || '').toUpperCase();
        const value = typeof b.cases === 'number' ? b.cases : 0;
        totals.set(name, (totals.get(name) || 0) + value);
      }
    }
    return Array.from(totals.entries())
      .map(([name, totalCases]) => ({ name, totalCases }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get aggregatedTotalCases(): number {
    return this.aggregatedBrands.reduce((sum, b) => sum + b.totalCases, 0);
  }

  openBrandsSummary(): void {
    this.showBrandsSummary = true;
  }

  closeBrandsSummary(): void {
    this.showBrandsSummary = false;
  }

  onBrandsSummaryBackdrop(ev: MouseEvent): void {
    if ((ev.target as HTMLElement)?.classList.contains('modal')) {
      this.closeBrandsSummary();
    }
  }
}
