import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EnaRequisitionService } from '../../../../core/services/ena-requisition.service';

interface BlDetailRow {
  id: number;
  requisitionId: number;
  referenceNo: string;
  licenseeId: string;
  distilleryName: string;
  tankerCount: number;
  tankerDetails: Array<{ tanker_no: string; bulk_liter: number }>;
  tankerNumbers: string;
  totalBulkLiter: number;
  requestedTotalQuantity: number;
  approvalStatus: string;
  submittedAt: string;
  reviewedAt: string;
  reviewedBy: string;
  reviewRemarks: string;
}

@Component({
  selector: 'app-oic-bl-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bl-review-shell">
      <div class="bl-review-header">
        <div>
          <h5 class="mb-1">BL Details Information</h5>
          <p class="text-muted mb-0">Review arrival bulk-liter submissions before they appear in the licensee bulk record.</p>
        </div>
        <button type="button" class="btn btn-outline-primary btn-sm" (click)="loadRows()" [disabled]="loading">
          Refresh
        </button>
      </div>

      <div class="bl-review-stats">
        <div class="stat-card pending">
          <span class="stat-label">Pending</span>
          <span class="stat-value">{{ getCount('PENDING') }}</span>
        </div>
        <div class="stat-card approved">
          <span class="stat-label">Approved</span>
          <span class="stat-value">{{ getCount('APPROVED') }}</span>
        </div>
        <div class="stat-card rejected">
          <span class="stat-label">Rejected</span>
          <span class="stat-value">{{ getCount('REJECTED') }}</span>
        </div>
      </div>

      <div class="filters-card">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Review Status</label>
            <select class="form-select" [(ngModel)]="reviewStatus" (change)="loadRows()">
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div class="col-md-8">
            <label class="form-label">Search</label>
            <input class="form-control" [(ngModel)]="searchTerm" placeholder="Search by ref no, licensee, distillery or tanker">
          </div>
        </div>
      </div>

      <div *ngIf="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>
      <div *ngIf="loading" class="loading-state">Loading BL details...</div>

      <div class="table-responsive mt-3" *ngIf="!loading">
        <table class="table table-hover align-middle bl-table" *ngIf="filteredRows.length > 0; else emptyState">
          <thead>
            <tr>
              <th>Ref. No</th>
              <th>Licensee</th>
              <th>Distillery</th>
              <th>Tankers</th>
              <th>Tanker Number</th>
              <th>Requested Qty</th>
              <th>Total BL</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Remarks</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of filteredRows">
              <td class="fw-semibold">{{ row.referenceNo }}</td>
              <td>{{ row.licenseeId || '-' }}</td>
              <td>{{ row.distilleryName || '-' }}</td>
              <td>{{ row.tankerCount }}</td>
              <td>{{ row.tankerNumbers || formatTankerNumbers(row.tankerDetails) }}</td>
              <td>{{ row.requestedTotalQuantity | number:'1.2-2' }}</td>
              <td>{{ row.totalBulkLiter | number:'1.2-2' }}</td>
              <td>{{ formatDate(row.submittedAt) }}</td>
              <td>
                <span class="badge"
                  [ngClass]="{
                    'bg-warning text-dark': row.approvalStatus === 'PENDING',
                    'bg-success': row.approvalStatus === 'APPROVED',
                    'bg-danger': row.approvalStatus === 'REJECTED'
                  }">
                  {{ row.approvalStatus }}
                </span>
              </td>
              <td>{{ row.reviewRemarks || '-' }}</td>
              <td class="text-end">
                <div class="action-row" *ngIf="row.approvalStatus === 'PENDING'; else reviewedInfo">
                  <button type="button" class="btn btn-success btn-sm" (click)="approve(row)" [disabled]="actingId === row.id">
                    Approve
                  </button>
                  <button type="button" class="btn btn-outline-danger btn-sm" (click)="reject(row)" [disabled]="actingId === row.id">
                    Reject
                  </button>
                </div>
                <ng-template #reviewedInfo>
                  <small class="text-muted">
                    {{ row.reviewedBy || 'Reviewed' }}<br>
                    {{ formatDate(row.reviewedAt) }}
                  </small>
                </ng-template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="empty-title">No BL detail entries found</div>
          <div class="empty-subtitle">New arrival submissions routed to this OIC will appear here for review.</div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .bl-review-shell {
      padding: 1rem;
      background: #fff;
    }
    .bl-review-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .bl-review-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .stat-card {
      border-radius: 14px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #1f2937;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
    }
    .stat-card.pending { background: #fff7d6; }
    .stat-card.approved { background: #dcfce7; }
    .stat-card.rejected { background: #fee2e2; }
    .stat-label { font-size: 0.875rem; font-weight: 600; }
    .stat-value { font-size: 1.5rem; font-weight: 700; }
    .filters-card {
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #f8fafc;
    }
    .loading-state,
    .empty-state {
      padding: 2rem 1rem;
      text-align: center;
      color: #64748b;
    }
    .empty-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 0.35rem;
    }
    .action-row {
      display: inline-flex;
      gap: 0.5rem;
    }
    .bl-table th {
      white-space: nowrap;
    }
  `]
})
export class OicBlDetailsComponent implements OnInit {
  private enaRequisitionService = inject(EnaRequisitionService);

  loading = false;
  errorMessage = '';
  rows: BlDetailRow[] = [];
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL' = 'ALL';
  searchTerm = '';
  actingId: number | null = null;

  ngOnInit(): void {
    this.loadRows();
  }

  loadRows(): void {
    this.loading = true;
    this.errorMessage = '';
    this.enaRequisitionService.getRequisitionArrivalDetailsByStatus(this.reviewStatus).subscribe({
      next: (response: any) => {
        const rows = Array.isArray(response?.data) ? response.data : [];
        this.rows = rows.map((row: any) => this.mapRow(row));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load BL details for OIC review.';
      }
    });
  }

  get filteredRows(): BlDetailRow[] {
    const token = this.searchTerm.trim().toLowerCase();
    if (!token) {
      return this.rows;
    }
    return this.rows.filter((row) =>
      [
        row.referenceNo,
        row.licenseeId,
        row.distilleryName,
        row.approvalStatus,
        this.formatTankerDetails(row.tankerDetails)
      ].some((value) => String(value || '').toLowerCase().includes(token))
    );
  }

  getCount(status: 'PENDING' | 'APPROVED' | 'REJECTED'): number {
    return this.rows.filter((row) => row.approvalStatus === status).length;
  }

  approve(row: BlDetailRow): void {
    if (!row.id || this.actingId === row.id) {
      return;
    }
    this.actingId = row.id;
    this.enaRequisitionService.reviewRequisitionArrivalDetails(row.id, 'APPROVE').subscribe({
      next: () => {
        this.actingId = null;
        this.reviewStatus = 'ALL';
        this.loadRows();
      },
      error: () => {
        this.actingId = null;
        this.errorMessage = `Unable to approve BL details for ${row.referenceNo}.`;
      }
    });
  }

  reject(row: BlDetailRow): void {
    if (!row.id || this.actingId === row.id) {
      return;
    }
    const remarks = window.prompt('Enter rejection reason for BL details:', row.reviewRemarks || '');
    if (remarks === null) {
      return;
    }
    this.actingId = row.id;
    this.enaRequisitionService.reviewRequisitionArrivalDetails(row.id, 'REJECT', remarks.trim()).subscribe({
      next: () => {
        this.actingId = null;
        this.reviewStatus = 'ALL';
        this.loadRows();
      },
      error: () => {
        this.actingId = null;
        this.errorMessage = `Unable to reject BL details for ${row.referenceNo}.`;
      }
    });
  }

  formatTankerNumbers(details: Array<{ tanker_no: string; bulk_liter: number }>): string {
    if (!Array.isArray(details) || details.length === 0) {
      return '-';
    }
    return details.map((item) => String(item?.tanker_no || '').trim()).filter(Boolean).join(', ') || '-';
  }

  formatTankerDetails(details: Array<{ tanker_no: string; bulk_liter: number }>): string {
    if (!Array.isArray(details) || details.length === 0) {
      return '-';
    }
    return details
      .map((item) => `${String(item?.tanker_no || '').trim()} (${Number(item?.bulk_liter || 0).toFixed(2)} BL)`)
      .join(', ');
  }

  formatDate(value: string): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private mapRow(row: any): BlDetailRow {
    const tankerDetailsRaw = row?.tanker_details ?? row?.tankerDetails ?? [];
    let tankerDetails: Array<{ tanker_no: string; bulk_liter: number }> = [];
    if (Array.isArray(tankerDetailsRaw)) {
      tankerDetails = tankerDetailsRaw;
    } else if (typeof tankerDetailsRaw === 'string') {
      try {
        const parsed = JSON.parse(tankerDetailsRaw);
        tankerDetails = Array.isArray(parsed) ? parsed : [];
      } catch {
        tankerDetails = [];
      }
    }

    return {
      id: Number(row?.id || 0) || 0,
      requisitionId: Number(row?.requisition_id ?? row?.requisitionId ?? 0) || 0,
      referenceNo: String(row?.reference_no ?? row?.referenceNo ?? ''),
      licenseeId: String(row?.licensee_id ?? row?.licenseeId ?? ''),
      distilleryName: String(row?.distillery_name ?? row?.distilleryName ?? ''),
      tankerCount: Number(row?.tanker_count ?? row?.tankerCount ?? tankerDetails.length ?? 0) || 0,
      tankerDetails,
      tankerNumbers: String(row?.tanker_numbers ?? row?.tankerNumbers ?? ''),
      totalBulkLiter: Number(row?.total_bulk_liter ?? row?.totalBulkLiter ?? 0) || 0,
      requestedTotalQuantity: Number(row?.requisition_total_quantity ?? row?.requisitionTotalQuantity ?? 0) || 0,
      approvalStatus: String(row?.approval_status ?? row?.approvalStatus ?? 'PENDING').toUpperCase(),
      submittedAt: String(row?.submitted_at ?? row?.submittedAt ?? ''),
      reviewedAt: String(row?.reviewed_at ?? row?.reviewedAt ?? ''),
      reviewedBy: String(row?.reviewed_by ?? row?.reviewedBy ?? ''),
      reviewRemarks: String(row?.review_remarks ?? row?.reviewRemarks ?? '')
    };
  }
}
