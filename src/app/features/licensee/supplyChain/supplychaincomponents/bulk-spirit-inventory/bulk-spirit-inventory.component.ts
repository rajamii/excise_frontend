import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EnaRequisitionService } from '../../../../../core/services/ena-requisition.service';

export interface TankerArrivalDetailItem {
  permit_no?: string;
  tanker_no?: string;
  bulk_liter?: number;
}

export interface ArrivalDetailsRow {
  id: number;
  requisitionId: number;
  referenceNo: string;
  distilleryName: string;
  arrivalDate: string;
  tankerCount: number;
  requestedTotalQuantity: number;
  totalBulkLiter: number;
  editedByOic: boolean;
  approvalStatus: string;
  tankerDetails: TankerArrivalDetailItem[];
}

export interface MonthlySummaryRow {
  monthKey: string;
  monthLabel: string;
  entries: number;
  totalTankers: number;
  totalBulkLiter: number;
}

@Component({
  selector: 'app-bulk-spirit-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './bulk-spirit-inventory.component.html',
  styleUrls: ['./bulk-spirit-inventory.component.scss']
})
export class BulkSpiritInventoryComponent implements OnInit {
  private router = inject(Router);
  private enaRequisitionService = inject(EnaRequisitionService);

  loading = false;
  errorMessage = '';

  dateFilter = '';
  monthFilter = '';
  searchTerm = '';
  allRows: ArrivalDetailsRow[] = [];
  filteredRows: ArrivalDetailsRow[] = [];

  pageSizeOptions = [5, 10, 25, 50];
  pageSize = 10;
  pageIndex = 0;

  ngOnInit(): void {
    const d = new Date();
    this.monthFilter = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.loadData();
  }

  goBackToRequisition(): void {
    this.router.navigate(['/dashboard'], { queryParams: { section: 'requisition' } });
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.enaRequisitionService.getAllRequisitionArrivalDetails().subscribe({
      next: (response: any) => {
        let rawList: any[] = [];
        if (Array.isArray(response)) {
          rawList = response;
        } else if (Array.isArray(response?.data)) {
          rawList = response.data;
        } else if (Array.isArray(response?.results)) {
          rawList = response.results;
        }

        this.allRows = rawList.map((r: any) => this.mapRow(r));
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load Bulk Spirit inventory arrival records.';
      }
    });
  }

  private mapRow(r: any): ArrivalDetailsRow {
    const rawDetails = r?.tanker_details ?? r?.tankerDetails ?? r?.details ?? [];
    let tankerDetails: TankerArrivalDetailItem[] = [];
    if (Array.isArray(rawDetails)) {
      tankerDetails = rawDetails.map((item: any) => ({
        permit_no: String(item?.permit_no ?? item?.permitNo ?? '').trim() || undefined,
        tanker_no: String(item?.tanker_no ?? item?.tankerNo ?? '').trim(),
        bulk_liter: Number(item?.bulk_liter ?? item?.bulkLiter ?? 0) || 0
      }));
    } else if (typeof rawDetails === 'string') {
      try {
        const parsed = JSON.parse(rawDetails);
        if (Array.isArray(parsed)) {
          tankerDetails = parsed.map((item: any) => ({
            permit_no: String(item?.permit_no ?? item?.permitNo ?? '').trim() || undefined,
            tanker_no: String(item?.tanker_no ?? item?.tankerNo ?? '').trim(),
            bulk_liter: Number(item?.bulk_liter ?? item?.bulkLiter ?? 0) || 0
          }));
        }
      } catch {
        tankerDetails = [];
      }
    }

    // Resolve arrival / submitted date
    let arrivalDate = String(
      r?.arrival_date ??
      r?.arrivalDate ??
      r?.submitted_at ??
      r?.submittedAt ??
      r?.updated_at ??
      r?.updatedAt ??
      r?.created_at ??
      r?.createdAt ??
      ''
    ).trim();

    // Requisition totals
    const reqTotal = Number(
      r?.requisition_total_quantity ??
      r?.requisitionTotalQuantity ??
      r?.requested_total_quantity ??
      r?.requestedTotalQuantity ??
      r?.totalbl ??
      r?.total_bl ??
      r?.requisition?.totalbl ??
      0
    ) || 0;

    const totalBL = Number(
      r?.total_bulk_liter ??
      r?.totalBulkLiter ??
      r?.total_bl ??
      r?.totalbl ??
      0
    ) || 0;

    const tankerCount = Number(r?.tanker_count ?? r?.tankerCount ?? tankerDetails.length ?? 0) || 0;

    const refNo = String(
      r?.reference_no ??
      r?.referenceNo ??
      r?.our_ref_no ??
      r?.ourRefNo ??
      r?.ref_no ??
      '-'
    ).trim();

    const distillery = String(
      r?.distillery_name ??
      r?.distilleryName ??
      r?.distillery ??
      r?.lifted_from_distillery_name ??
      r?.requisition?.lifted_from_distillery_name ??
      '-'
    ).trim();

    return {
      id: Number(r?.id || 0),
      requisitionId: Number(r?.requisition_id ?? r?.requisitionId ?? r?.requisition ?? 0) || 0,
      referenceNo: refNo || '-',
      distilleryName: distillery || '-',
      arrivalDate: arrivalDate,
      tankerCount: tankerCount,
      requestedTotalQuantity: reqTotal > 0 ? reqTotal : totalBL,
      totalBulkLiter: totalBL,
      editedByOic: Boolean(r?.edited_by_oic ?? r?.editedByOic ?? false),
      approvalStatus: String(r?.approval_status ?? r?.approvalStatus ?? 'APPROVED').toUpperCase(),
      tankerDetails: tankerDetails
    };
  }

  applyFilters(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();

    this.filteredRows = this.allRows.filter(row => {
      // Search term
      if (term) {
        const matchesRef = row.referenceNo.toLowerCase().includes(term);
        const matchesDist = row.distilleryName.toLowerCase().includes(term);
        const matchesTankers = row.tankerDetails.some(t =>
          (t.tanker_no || '').toLowerCase().includes(term) ||
          (t.permit_no || '').toLowerCase().includes(term)
        );
        if (!matchesRef && !matchesDist && !matchesTankers) return false;
      }

      // Date filter (YYYY-MM-DD)
      if (this.dateFilter) {
        let rowDateStr = '';
        if (row.arrivalDate) {
          if (row.arrivalDate.length >= 10 && row.arrivalDate.includes('-')) {
            rowDateStr = row.arrivalDate.slice(0, 10);
          } else {
            const d = new Date(row.arrivalDate);
            if (!isNaN(d.getTime())) {
              rowDateStr = d.toISOString().slice(0, 10);
            }
          }
        }
        if (rowDateStr && rowDateStr !== this.dateFilter) return false;
      }

      // Month filter (YYYY-MM)
      if (this.monthFilter) {
        let rowMonthStr = '';
        if (row.arrivalDate) {
          if (row.arrivalDate.length >= 7 && row.arrivalDate.includes('-')) {
            rowMonthStr = row.arrivalDate.slice(0, 7);
          } else {
            const d = new Date(row.arrivalDate);
            if (!isNaN(d.getTime())) {
              rowMonthStr = d.toISOString().slice(0, 7);
            }
          }
        }
        if (rowMonthStr && rowMonthStr !== this.monthFilter) return false;
      }

      return true;
    });
    this.pageIndex = 0;
  }

  clearFilters(): void {
    this.dateFilter = '';
    this.monthFilter = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  getFilteredTotalBL(): number {
    return this.filteredRows.reduce((acc, r) => acc + (r.totalBulkLiter || 0), 0);
  }

  getFilteredTotalTankers(): number {
    return this.filteredRows.reduce((acc, r) => acc + (r.tankerCount || 0), 0);
  }

  getMonthlyRows(): MonthlySummaryRow[] {
    const map = new Map<string, { entries: number; tankers: number; totalBL: number }>();

    for (const row of this.filteredRows) {
      let monthKey = 'Unknown';
      if (row.arrivalDate) {
        if (row.arrivalDate.length >= 7 && row.arrivalDate.includes('-')) {
          monthKey = row.arrivalDate.slice(0, 7);
        } else {
          const d = new Date(row.arrivalDate);
          if (!isNaN(d.getTime())) {
            monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          }
        }
      }

      const cur = map.get(monthKey) || { entries: 0, tankers: 0, totalBL: 0 };
      cur.entries += 1;
      cur.tankers += row.tankerCount;
      cur.totalBL += row.totalBulkLiter;
      map.set(monthKey, cur);
    }

    const res: MonthlySummaryRow[] = [];
    map.forEach((val, key) => {
      let label = key;
      if (key !== 'Unknown') {
        const parts = key.split('-');
        if (parts.length === 2) {
          const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
          label = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        }
      }
      res.push({
        monthKey: key,
        monthLabel: label,
        entries: val.entries,
        totalTankers: val.tankers,
        totalBulkLiter: val.totalBL
      });
    });

    return res.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  get pagedRows(): ArrivalDetailsRow[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  get pageStart(): number {
    return this.filteredRows.length === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredRows.length);
  }

  prevPage(): void {
    if (this.pageIndex > 0) this.pageIndex--;
  }

  nextPage(): void {
    if (this.pageIndex < this.totalPages - 1) this.pageIndex++;
  }

  getTankerDetailsLines(details: TankerArrivalDetailItem[]): string[] {
    if (!Array.isArray(details) || details.length === 0) return ['No details recorded'];
    return details.map(d => {
      const p = d.permit_no ? `Permit #${d.permit_no}: ` : '';
      const t = d.tanker_no || '-';
      const bl = Number(d.bulk_liter || 0).toFixed(2);
      return `${p}${t} (${bl} BL)`;
    });
  }
}
