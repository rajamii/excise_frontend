import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-brands-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brands-details.component.html',
  styleUrls: ['./brands-details.component.scss']
})
export class BrandsDetailsComponent {
  // Header controls
  selectedMonth = '11';
  selectedYear = new Date().getFullYear().toString();
  selectedDate = new Date().toISOString().substring(0, 10);

  months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];
  years = Array.from({ length: 7 }, (_, i) => (2022 + i).toString());

  // Brand switching
  activeBrand: 'SDL' | 'JAGATJIT' = 'SDL';

  baseRows: BrandRow[] = [];
  rows: BrandRow[] = [];
  totals: BrandTotals = this.computeTotals([]);

  // New entry form data
  newEntry: BrandRow = {
    brandName: '',
    liquorType: 'Whisky',
    alcoholPercent: '',
    sizeMl: 0,
    producedDate: new Date().toISOString().substring(0, 10),
    qtyInHandLocal: 0,
    qtyInHandExport: 0,
    qtyProducedLocal: 0,
    qtyProducedExport: 0,
    qtyIssuedLocal: 0,
    qtyIssuedExport: 0,
    closingLocal: 0,
    closingExport: 0,
    isCompleted: false
  };

  constructor() {
    this.loadRows();
  }

  setBrand(brand: 'SDL' | 'JAGATJIT'): void {
    if (this.activeBrand === brand) return;
    this.activeBrand = brand;
    this.loadRows();
  }

  loadRows(): void {
    const data = this.activeBrand === 'SDL' ? SDL_SAMPLE : JAGATJIT_SAMPLE;
    this.baseRows = data;
    this.applyFilters();
  }

  applyFilters(): void {
    const byMonthYear = (d: string) => {
      if (!d) return false;
      const m = d.substring(5, 7);
      const y = d.substring(0, 4);
      if (this.selectedDate) {
        return d === this.selectedDate;
      }
      const monthOk = this.selectedMonth ? m === this.selectedMonth : true;
      const yearOk = this.selectedYear ? y === this.selectedYear : true;
      return monthOk && yearOk;
    };

    const filtered = this.baseRows.filter(r => byMonthYear(r.producedDate));
    this.rows = filtered;
    this.totals = this.computeTotals(filtered);
  }

  computeTotals(rows: BrandRow[]): BrandTotals {
    const sum = (k: keyof BrandRow) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return {
      qtyInHandLocal: sum('qtyInHandLocal'),
      qtyInHandExport: sum('qtyInHandExport'),
      qtyProducedLocal: sum('qtyProducedLocal'),
      qtyProducedExport: sum('qtyProducedExport'),
      qtyIssuedLocal: sum('qtyIssuedLocal'),
      qtyIssuedExport: sum('qtyIssuedExport'),
      closingLocal: sum('closingLocal'),
      closingExport: sum('closingExport')
    };
  }

  exportCsv(): void {
    const headers = [
      'Brand', 'Alcohol%', 'Size(ml)', 'QtyInHandLocal', 'QtyInHandExport', 'QtyProducedLocal', 'QtyProducedExport', 'QtyIssuedLocal', 'QtyIssuedExport', 'ClosingLocal', 'ClosingExport'
    ];
    const lines = this.rows.map(r => [
      r.brandName,
      r.alcoholPercent,
      r.sizeMl,
      r.qtyInHandLocal,
      r.qtyInHandExport,
      r.qtyProducedLocal,
      r.qtyProducedExport,
      r.qtyIssuedLocal,
      r.qtyIssuedExport,
      r.closingLocal,
      r.closingExport
    ].join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `brands-register-${this.activeBrand}-${this.selectedMonth}-${this.selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  print(): void {
    window.print();
  }

  updateClosingBalance(row: BrandRow): void {
    row.closingLocal = row.qtyInHandLocal + row.qtyProducedLocal - row.qtyIssuedLocal;
    row.closingExport = row.qtyInHandExport + row.qtyProducedExport - row.qtyIssuedExport;
    this.applyFilters(); // Recalculate totals
  }

  onQuantityChange(row: BrandRow): void {
    this.updateClosingBalance(row);
  }

  addNewBrand(): void {
    const newBrand: BrandRow = {
      brandName: '',
      liquorType: this.activeBrand === 'SDL' ? 'Whisky' : 'Whisky',
      alcoholPercent: '42.8%',
      sizeMl: 750,
      producedDate: new Date().toISOString().substring(0, 10),
      qtyInHandLocal: 0,
      qtyInHandExport: 0,
      qtyProducedLocal: 0,
      qtyProducedExport: 0,
      qtyIssuedLocal: 0,
      qtyIssuedExport: 0,
      closingLocal: 0,
      closingExport: 0
    };
    this.baseRows.push(newBrand);
    this.applyFilters();
  }

  removeBrand(index: number): void {
    this.baseRows.splice(index, 1);
    this.applyFilters();
  }

  getLiquorTypes(): string[] {
    return ['Vodka', 'Brandy', 'Whisky', 'Rum', 'Gin', 'Wine', 'Liquor'];
  }

  isRowComplete(row: BrandRow): boolean {
    const hasRequiredFields = !!(row.brandName && row.brandName.trim() !== '' &&
      row.alcoholPercent && row.sizeMl > 0);

    if (this.activeBrand === 'SDL') {
      return hasRequiredFields && !!(row.liquorType && row.liquorType.trim() !== '');
    }

    return hasRequiredFields;
  }

  markRowAsDone(row: BrandRow): void {
    if (this.isRowComplete(row)) {
      row.isCompleted = true;
      this.updateClosingBalance(row);
    }
  }

  clearAllData(): void {
    this.baseRows = [];
    this.rows = [];
    this.totals = this.computeTotals([]);
  }

  // New entry methods
  createEmptyBrandRow(): BrandRow {
    return {
      brandName: '',
      liquorType: this.activeBrand === 'SDL' ? 'Whisky' : 'Whisky',
      alcoholPercent: '',
      sizeMl: 0,
      producedDate: new Date().toISOString().substring(0, 10),
      qtyInHandLocal: 0,
      qtyInHandExport: 0,
      qtyProducedLocal: 0,
      qtyProducedExport: 0,
      qtyIssuedLocal: 0,
      qtyIssuedExport: 0,
      closingLocal: 0,
      closingExport: 0,
      isCompleted: false
    };
  }

  isNewEntryValid(): boolean {
    return !!(this.newEntry.brandName &&
      this.newEntry.brandName.trim() !== '' &&
      this.newEntry.alcoholPercent &&
      this.newEntry.sizeMl > 0);
  }

  addNewEntry(): void {
    if (this.isNewEntryValid()) {
      // Calculate closing balance
      this.newEntry.closingLocal = this.newEntry.qtyInHandLocal + this.newEntry.qtyProducedLocal - this.newEntry.qtyIssuedLocal;
      this.newEntry.closingExport = this.newEntry.qtyInHandExport + this.newEntry.qtyProducedExport - this.newEntry.qtyIssuedExport;

      // Add to base rows
      this.baseRows.push({ ...this.newEntry });

      // Clear the form
      this.clearNewEntry();

      // Refresh the display
      this.applyFilters();
    }
  }

  clearNewEntry(): void {
    this.newEntry = this.createEmptyBrandRow();
  }
}

// Types
interface BrandRow {
  brandName: string;
  liquorType?: string;
  variant?: string;
  alcoholPercent: string;
  sizeMl: number;
  producedDate: string; // ISO yyyy-mm-dd
  qtyInHandLocal: number;
  qtyInHandExport: number;
  qtyProducedLocal: number;
  qtyProducedExport: number;
  qtyIssuedLocal: number;
  qtyIssuedExport: number;
  closingLocal: number;
  closingExport: number;
  isCompleted?: boolean; // Track if row is done/locked
}

interface BrandTotals {
  qtyInHandLocal: number;
  qtyInHandExport: number;
  qtyProducedLocal: number;
  qtyProducedExport: number;
  qtyIssuedLocal: number;
  qtyIssuedExport: number;
  closingLocal: number;
  closingExport: number;
}

// Sample data mimicking the image layout
const SDL_SAMPLE: BrandRow[] = [
  {
    brandName: 'OLD GOLD PREMIUM WHISKY (KHUKRI)',
    alcoholPercent: '42.8%',
    sizeMl: 180,
    producedDate: '2025-11-11',
    qtyInHandLocal: 0,
    qtyInHandExport: 0,
    qtyProducedLocal: 329,
    qtyProducedExport: 0,
    qtyIssuedLocal: 50,
    qtyIssuedExport: 0,
    closingLocal: 279,
    closingExport: 0
  },
  {
    brandName: 'SHANGRILA WHISKY',
    alcoholPercent: '42.8%',
    sizeMl: 750,
    producedDate: '2025-11-10',
    qtyInHandLocal: 0,
    qtyInHandExport: 0,
    qtyProducedLocal: 356,
    qtyProducedExport: 0,
    qtyIssuedLocal: 356,
    qtyIssuedExport: 0,
    closingLocal: 0,
    closingExport: 0
  },
  {
    brandName: 'OCEAN BLUE PREMIUM WHISKY',
    alcoholPercent: '42.8%',
    sizeMl: 375,
    producedDate: '2025-10-29',
    qtyInHandLocal: 20,
    qtyInHandExport: 0,
    qtyProducedLocal: 0,
    qtyProducedExport: 0,
    qtyIssuedLocal: 15,
    qtyIssuedExport: 0,
    closingLocal: 5,
    closingExport: 0
  }
];

const JAGATJIT_SAMPLE: BrandRow[] = [
  {
    brandName: 'JAGATJIT PREMIUM WHISKY',
    alcoholPercent: '42.8%',
    sizeMl: 750,
    producedDate: '2025-11-03',
    qtyInHandLocal: 205,
    qtyInHandExport: 0,
    qtyProducedLocal: 0,
    qtyProducedExport: 0,
    qtyIssuedLocal: 205,
    qtyIssuedExport: 0,
    closingLocal: 0,
    closingExport: 0
  },
  {
    brandName: 'JAGATJIT FINE WHISKY',
    alcoholPercent: '42.8%',
    sizeMl: 180,
    producedDate: '2025-11-01',
    qtyInHandLocal: 25,
    qtyInHandExport: 0,
    qtyProducedLocal: 0,
    qtyProducedExport: 0,
    qtyIssuedLocal: 25,
    qtyIssuedExport: 0,
    closingLocal: 0,
    closingExport: 0
  }
];
