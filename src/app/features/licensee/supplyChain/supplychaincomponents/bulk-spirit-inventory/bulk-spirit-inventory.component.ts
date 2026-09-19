import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EnaRequisitionService } from '../../../../../core/services/ena-requisition.service';
import { BulkSpiritUsageService } from '../../../../../core/services/bulk-spirit-usage.service';

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

export interface LiveSpiritTypeStockItem {
  bulkSpiritType: string;
  totalArrivedBl: number;
  totalApprovedUsageBl: number;
  totalPendingUsageBl: number;
  availableBl: number;
  status: string;
}

export interface LiveInventorySummary {
  items: LiveSpiritTypeStockItem[];
  totalArrivedBl: number;
  totalUsedBl: number;
  totalPendingBl: number;
  totalAvailableBl: number;
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
  private bulkSpiritUsageService = inject(BulkSpiritUsageService);

  loading = false;
  errorMessage = '';

  // Active View Tab: 'live-inventory' | 'arrival-entries'
  activeView: 'live-inventory' | 'arrival-entries' = 'live-inventory';

  // Live Inventory by Spirit Type
  liveInventory: LiveInventorySummary = {
    items: [],
    totalArrivedBl: 0,
    totalUsedBl: 0,
    totalPendingBl: 0,
    totalAvailableBl: 0
  };
  spiritSearchTerm = '';
  filteredSpiritItems: LiveSpiritTypeStockItem[] = [];

  // Arrival Entries
  dateFilter = '';
  monthFilter = '';
  arrivalSearchTerm = '';
  allArrivalRows: ArrivalDetailsRow[] = [];
  filteredArrivalRows: ArrivalDetailsRow[] = [];

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

  goToUsage(spiritType?: string): void {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'bulk-spirit-usage',
        ...(spiritType ? { spiritType } : {})
      }
    });
  }

  setActiveView(view: 'live-inventory' | 'arrival-entries'): void {
    this.activeView = view;
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      summary: this.bulkSpiritUsageService.getInventorySummary().pipe(catchError(() => of(null))),
      arrivals: this.enaRequisitionService.getAllRequisitionArrivalDetails().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ summary, arrivals }: any) => {
        // 1. Normalize Live Inventory by Type
        this.liveInventory = this.normalizeLiveInventory(summary);
        this.applySpiritFilter();

        // 2. Normalize Arrival Rows
        let rawList: any[] = [];
        if (Array.isArray(arrivals)) {
          rawList = arrivals;
        } else if (Array.isArray(arrivals?.data)) {
          rawList = arrivals.data;
        } else if (Array.isArray(arrivals?.results)) {
          rawList = arrivals.results;
        }

        this.allArrivalRows = rawList.map((r: any) => this.mapArrivalRow(r));
        this.applyArrivalFilters();

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load Bulk Spirit inventory and arrival records.';
      }
    });
  }

  private normalizeLiveInventory(res: any): LiveInventorySummary {
    const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    const items: LiveSpiritTypeStockItem[] = rawList.map((item: any) => {
      const arrived = Number((item?.totalArrivedBl ?? item?.total_arrived_bl) || 0);
      const used = Number((item?.totalApprovedUsageBl ?? item?.total_approved_usage_bl) || 0);
      const pending = Number((item?.totalPendingUsageBl ?? item?.total_pending_usage_bl) || 0);
      const available = Number((item?.availableBl ?? item?.available_bl) || 0);

      let status = 'No Stock';
      if (available > 0) {
        status = 'In Stock';
      } else if (pending > 0) {
        status = 'Pending Approval';
      }

      return {
        bulkSpiritType: String(
          item?.bulkSpiritType ??
          item?.bulk_spirit_type ??
          item?.bulk_spirit_kind_type ??
          item?.bulkSpiritKindType ??
          item?.spirit_type ??
          item?.spiritType ??
          ''
        ).trim(),
        totalArrivedBl: arrived,
        totalApprovedUsageBl: used,
        totalPendingUsageBl: pending,
        availableBl: available,
        status
      };
    }).filter((i: LiveSpiritTypeStockItem) => Boolean(i.bulkSpiritType));

    // Sort: items with available stock first, then alphabetically
    items.sort((a, b) => {
      if (b.availableBl !== a.availableBl) {
        return b.availableBl - a.availableBl;
      }
      return a.bulkSpiritType.localeCompare(b.bulkSpiritType);
    });

    return {
      items,
      totalArrivedBl: Number((res?.totalArrivedBl ?? res?.total_arrived_bl) || 0),
      totalUsedBl: Number((res?.totalUsedBl ?? res?.total_used_bl) || 0),
      totalPendingBl: Number((res?.totalPendingBl ?? res?.total_pending_bl) || 0),
      totalAvailableBl: Number((res?.totalAvailableBl ?? res?.total_available_bl) || 0)
    };
  }

  applySpiritFilter(): void {
    const q = (this.spiritSearchTerm || '').trim().toLowerCase();
    if (!q) {
      this.filteredSpiritItems = [...this.liveInventory.items];
      return;
    }
    this.filteredSpiritItems = this.liveInventory.items.filter(item =>
      item.bulkSpiritType.toLowerCase().includes(q)
    );
  }

  private mapArrivalRow(r: any): ArrivalDetailsRow {
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

  applyArrivalFilters(): void {
    const term = (this.arrivalSearchTerm || '').trim().toLowerCase();

    this.filteredArrivalRows = this.allArrivalRows.filter(row => {
      if (term) {
        const matchesRef = row.referenceNo.toLowerCase().includes(term);
        const matchesDist = row.distilleryName.toLowerCase().includes(term);
        const matchesTankers = row.tankerDetails.some(t =>
          (t.tanker_no || '').toLowerCase().includes(term) ||
          (t.permit_no || '').toLowerCase().includes(term)
        );
        if (!matchesRef && !matchesDist && !matchesTankers) return false;
      }

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

  clearArrivalFilters(): void {
    this.dateFilter = '';
    this.monthFilter = '';
    this.arrivalSearchTerm = '';
    this.applyArrivalFilters();
  }

  getFilteredTotalBL(): number {
    return this.filteredArrivalRows.reduce((acc, r) => acc + (r.totalBulkLiter || 0), 0);
  }

  getFilteredTotalTankers(): number {
    return this.filteredArrivalRows.reduce((acc, r) => acc + (r.tankerCount || 0), 0);
  }

  getMonthlyRows(): MonthlySummaryRow[] {
    const map = new Map<string, { entries: number; tankers: number; totalBL: number }>();

    for (const row of this.filteredArrivalRows) {
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

  get pagedArrivalRows(): ArrivalDetailsRow[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredArrivalRows.slice(start, start + this.pageSize);
  }

  get totalArrivalPages(): number {
    return Math.max(1, Math.ceil(this.filteredArrivalRows.length / this.pageSize));
  }

  get pageStart(): number {
    return this.filteredArrivalRows.length === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredArrivalRows.length);
  }

  prevPage(): void {
    if (this.pageIndex > 0) this.pageIndex--;
  }

  nextPage(): void {
    if (this.pageIndex < this.totalArrivalPages - 1) this.pageIndex++;
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

  getAvailablePercentage(item: LiveSpiritTypeStockItem): number {
    if (!item.totalArrivedBl || item.totalArrivedBl <= 0) return 0;
    return Math.min(100, Math.round((item.availableBl / item.totalArrivedBl) * 100));
  }
}
