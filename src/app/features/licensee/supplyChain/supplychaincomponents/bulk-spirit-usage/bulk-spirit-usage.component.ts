import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  BulkSpiritUsageService,
  BulkSpiritUsageRecord
} from '../../../../../core/services/bulk-spirit-usage.service';
import { AccountService } from '../../../../../core/services/account.service';

export interface NormalizedInventoryItem {
  bulkSpiritType: string;
  totalArrivedBl: number;
  totalApprovedUsageBl: number;
  totalPendingUsageBl: number;
  availableBl: number;
}

export interface NormalizedInventorySummary {
  items: NormalizedInventoryItem[];
  totalArrivedBl: number;
  totalUsedBl: number;
  totalPendingBl: number;
  totalAvailableBl: number;
}

@Component({
  selector: 'app-bulk-spirit-usage',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './bulk-spirit-usage.component.html',
  styleUrls: ['./bulk-spirit-usage.component.scss']
})
export class BulkSpiritUsageComponent implements OnInit {
  private router = inject(Router);
  public accountService = inject(AccountService);
  private bulkSpiritUsageService = inject(BulkSpiritUsageService);

  loading = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  inventorySummary: NormalizedInventorySummary = {
    items: [],
    totalArrivedBl: 0,
    totalUsedBl: 0,
    totalPendingBl: 0,
    totalAvailableBl: 0
  };

  usageHistory: BulkSpiritUsageRecord[] = [];
  filteredUsageHistory: BulkSpiritUsageRecord[] = [];

  // Form Fields
  selectedSpiritType: string = '';
  requestedQuantity: number | null = null;
  purpose: string = 'Production / Blending';
  remarks: string = '';

  // Filter Fields
  statusFilter: string = 'ALL';
  searchTerm: string = '';
  monthFilter: string = '';

  ngOnInit(): void {
    this.loadData();
  }

  goBackToRequisition(): void {
    this.router.navigate(['/dashboard'], { queryParams: { section: 'requisition' } });
  }

  private normalizeInventorySummary(res: any): NormalizedInventorySummary {
    const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    const items: NormalizedInventoryItem[] = rawList.map((item: any) => ({
      bulkSpiritType: String(
        item?.bulkSpiritType ??
        item?.bulk_spirit_type ??
        item?.bulk_spirit_kind_type ??
        item?.bulkSpiritKindType ??
        item?.spirit_type ??
        item?.spiritType ??
        ''
      ).trim(),
      totalArrivedBl: Number((item?.totalArrivedBl ?? item?.total_arrived_bl) || 0),
      totalApprovedUsageBl: Number((item?.totalApprovedUsageBl ?? item?.total_approved_usage_bl) || 0),
      totalPendingUsageBl: Number((item?.totalPendingUsageBl ?? item?.total_pending_usage_bl) || 0),
      availableBl: Number((item?.availableBl ?? item?.available_bl) || 0)
    })).filter((i: NormalizedInventoryItem) => Boolean(i.bulkSpiritType));

    return {
      items,
      totalArrivedBl: Number((res?.totalArrivedBl ?? res?.total_arrived_bl) || 0),
      totalUsedBl: Number((res?.totalUsedBl ?? res?.total_used_bl) || 0),
      totalPendingBl: Number((res?.totalPendingBl ?? res?.total_pending_bl) || 0),
      totalAvailableBl: Number((res?.totalAvailableBl ?? res?.total_available_bl) || 0)
    };
  }

  private normalizeUsageRecord(r: any): BulkSpiritUsageRecord {
    return {
      id: Number(r?.id || 0),
      reference_no: String(r?.referenceNo ?? r?.reference_no ?? r?.ref_no ?? ''),
      licensee_id: String(r?.licenseeId ?? r?.licensee_id ?? ''),
      distillery_name: String(r?.distilleryName ?? r?.distillery_name ?? ''),
      applicant: Number(r?.applicant || 0),
      applicant_name: String(r?.applicantName ?? r?.applicant_name ?? ''),
      bulk_spirit_type: String(r?.bulkSpiritType ?? r?.bulk_spirit_type ?? ''),
      quantity: Number(r?.quantity || 0),
      purpose: String(r?.purpose || ''),
      remarks: String(r?.remarks || ''),
      status: String(r?.status || 'Pending'),
      status_code: String(r?.statusCode ?? r?.status_code ?? ''),
      rejection_reason: String(r?.rejectionReason ?? r?.rejection_reason ?? ''),
      workflow: Number(r?.workflow || 0),
      current_stage: Number((r?.currentStage ?? r?.current_stage) || 0),
      current_stage_name: String((r?.currentStageName ?? r?.current_stage_name) || ''),
      reviewed_by: String((r?.reviewedBy ?? r?.reviewed_by) || ''),
      reviewed_at: String((r?.reviewedAt ?? r?.reviewed_at) || ''),
      created_at: String((r?.createdAt ?? r?.created_at) || ''),
      updated_at: String((r?.updatedAt ?? r?.updated_at) || '')
    };
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      inventory: this.bulkSpiritUsageService.getInventorySummary().pipe(catchError(() => of(null))),
      history: this.bulkSpiritUsageService.getUsageRequests().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ inventory, history }: any) => {
        this.inventorySummary = this.normalizeInventorySummary(inventory);

        let rawRecords: any[] = [];
        if (Array.isArray(history)) {
          rawRecords = history;
        } else if (history?.results && Array.isArray(history.results)) {
          rawRecords = history.results;
        } else if (history?.data && Array.isArray(history.data)) {
          rawRecords = history.data;
        }
        this.usageHistory = rawRecords.map(r => this.normalizeUsageRecord(r));
        this.applyFilters();

        if (this.inventorySummary.items.length > 0) {
          const withStock = this.inventorySummary.items.find(item => item.availableBl > 0);
          if (withStock) {
            this.selectedSpiritType = withStock.bulkSpiritType;
          } else if (!this.selectedSpiritType) {
            this.selectedSpiritType = this.inventorySummary.items[0].bulkSpiritType;
          }
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load Bulk Spirit inventory and usage records.';
      }
    });
  }

  applyFilters(): void {
    this.filteredUsageHistory = this.usageHistory.filter((item) => {
      const st = String(item.status || '').toUpperCase();
      if (this.statusFilter !== 'ALL') {
        if (this.statusFilter === 'PENDING' && !st.includes('PENDING')) return false;
        if (this.statusFilter === 'APPROVED' && !st.includes('APPROVED')) return false;
        if (this.statusFilter === 'REJECTED' && !st.includes('REJECTED')) return false;
      }

      if (this.monthFilter && item.created_at) {
        if (item.created_at.slice(0, 7) !== this.monthFilter) return false;
      }

      if (this.searchTerm) {
        const q = this.searchTerm.toLowerCase();
        const ref = String(item.reference_no || '').toLowerCase();
        const sp = String(item.bulk_spirit_type || '').toLowerCase();
        const pur = String(item.purpose || '').toLowerCase();
        if (!ref.includes(q) && !sp.includes(q) && !pur.includes(q)) return false;
      }

      return true;
    });
  }

  getSelectedSpiritAvailableBL(): number {
    if (!this.inventorySummary?.items || !this.selectedSpiritType) {
      return 0;
    }
    const found = this.inventorySummary.items.find(
      d => d.bulkSpiritType.toLowerCase() === this.selectedSpiritType.toLowerCase()
    );
    return found ? found.availableBl : 0;
  }

  getSelectedAvailableBL(): number {
    return this.getSelectedSpiritAvailableBL();
  }

  isQuantityValid(): boolean {
    const qty = Number(this.requestedQuantity || 0);
    const available = this.getSelectedSpiritAvailableBL();
    return qty > 0 && qty <= available && Boolean(this.selectedSpiritType);
  }

  isFormValid(): boolean {
    return this.isQuantityValid();
  }

  submitUsage(): void {
    if (!this.isQuantityValid()) return;

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      bulk_spirit_type: this.selectedSpiritType,
      bulkSpiritType: this.selectedSpiritType,
      quantity: Number(this.requestedQuantity),
      purpose: this.purpose || 'Production / Blending',
      remarks: this.remarks || ''
    };

    this.bulkSpiritUsageService.createUsageRequest(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        const ref = res?.referenceNo || res?.reference_no || '';
        this.successMessage = `Usage request ${ref} submitted successfully and forwarded to Officer-In-Charge for approval!`;
        this.requestedQuantity = null;
        this.remarks = '';
        this.loadData();
      },
      error: (err: any) => {
        this.submitting = false;
        const msg = err?.error?.quantity || err?.error?.bulkSpiritType || err?.error?.bulk_spirit_type || err?.error?.message || err?.message || 'Failed to submit usage request.';
        this.errorMessage = Array.isArray(msg) ? msg.join(' ') : String(msg);
      }
    });
  }

  getStatusCount(status: string): number {
    if (status === 'ALL') return this.usageHistory.length;
    return this.usageHistory.filter(item => String(item.status || '').toUpperCase().includes(status)).length;
  }
}
