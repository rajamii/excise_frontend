import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ProductionRow {
  date: string;
  party: string;
  remarks: string;
  totalProduction: number | '';
  brands: string[];
  newBrand: string;
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
    { date: '2024-12-01', party: 'Party A', remarks: 'All data correct', totalProduction: 0, brands: [], newBrand: '' },
    { date: '2024-12-02', party: 'Party B', remarks: 'Checked and verified', totalProduction: 0, brands: [], newBrand: '' }
  ];
  detailsIndex: number | null = null;
  // Draft (new entry form)
  draft: ProductionRow = { date: '', party: '', remarks: '', totalProduction: '', brands: [], newBrand: '' };
  modalNewBrand = '';

  addRow(): void {
    this.rows = [...this.rows, { date: '', party: '', remarks: '', totalProduction: '', brands: [], newBrand: '' }];
  }

  addBrand(index: number): void {
    const row = this.rows[index];
    const name = (this.modalNewBrand || row.newBrand || '').trim();
    if (!name) return;
    const upper = name.toUpperCase();
    if (row.brands.includes(upper)) { row.newBrand = ''; return; }
    row.brands = [...row.brands, upper];
    row.newBrand = '';
    this.modalNewBrand = '';
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
    if (!name) return;
    const upper = name.toUpperCase();
    if (!this.draft.brands.includes(upper)) {
      this.draft.brands = [...this.draft.brands, upper];
    }
    this.draft.newBrand = '';
  }

  commitDraft(): void {
    if (!this.draft.date || !this.draft.party) return;
    this.rows = [
      ...this.rows,
      {
        date: this.draft.date,
        party: this.draft.party,
        remarks: this.draft.remarks,
        totalProduction: this.draft.totalProduction || 0,
        brands: [...this.draft.brands],
        newBrand: ''
      }
    ];
    this.clearDraft();
  }

  clearDraft(): void {
    this.draft = { date: '', party: '', remarks: '', totalProduction: '', brands: [], newBrand: '' };
  }
}
