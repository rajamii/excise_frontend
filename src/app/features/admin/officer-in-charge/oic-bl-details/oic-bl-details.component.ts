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
      <section class="hero-panel">
        <div class="hero-copy">
          <span class="eyebrow">Officer Review Desk</span>
          <h2>BL Details Information</h2>
          <p>Review arrival bulk-liter submissions before they move into the licensee bulk record and permanent BL history.</p>
        </div>
        <button type="button" class="refresh-btn" (click)="loadRows()" [disabled]="loading">
          <span class="refresh-icon">?</span>
          Refresh
        </button>
      </section>

      <section class="stats-grid">
        <article class="stat-card pending">
          <div>
            <span class="stat-kicker">Awaiting action</span>
            <h3>Pending</h3>
          </div>
          <div class="stat-pill">{{ getCount('PENDING') }}</div>
        </article>
        <article class="stat-card approved">
          <div>
            <span class="stat-kicker">Cleared by OIC</span>
            <h3>Approved</h3>
          </div>
          <div class="stat-pill">{{ getCount('APPROVED') }}</div>
        </article>
        <article class="stat-card rejected">
          <div>
            <span class="stat-kicker">Sent back</span>
            <h3>Rejected</h3>
          </div>
          <div class="stat-pill">{{ getCount('REJECTED') }}</div>
        </article>
      </section>

      <section class="filters-panel">
        <div class="filters-heading">
          <div>
            <h4>Review Filters</h4>
            <p>Switch between live queue and reviewed entries without losing the reference history.</p>
          </div>
        </div>
        <div class="filters-grid">
          <label class="field-block">
            <span class="field-label">Review Status</span>
            <select class="field-input" [(ngModel)]="reviewStatus" (change)="loadRows()">
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
          <label class="field-block search-block">
            <span class="field-label">Search</span>
            <input class="field-input" [(ngModel)]="searchTerm" placeholder="Search by ref no, licensee, distillery or tanker">
          </label>
        </div>
      </section>

      <div *ngIf="errorMessage" class="status-banner error">{{ errorMessage }}</div>
      <div *ngIf="loading" class="loading-state">Loading BL details...</div>

      <section class="table-panel" *ngIf="!loading">
        <div class="table-panel-header" *ngIf="filteredRows.length > 0">
          <div>
            <h4>Submission Register</h4>
            <p>{{ filteredRows.length }} record{{ filteredRows.length === 1 ? '' : 's' }} visible in the current view.</p>
          </div>
        </div>

        <div class="table-wrap" *ngIf="filteredRows.length > 0; else emptyState">
          <table class="bl-table">
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
                <td class="ref-cell">
                  <div class="ref-primary">{{ row.referenceNo }}</div>
                  <div class="ref-secondary">BL submission</div>
                </td>
                <td>
                  <div class="primary-text">{{ row.licenseeId || '-' }}</div>
                </td>
                <td>
                  <div class="primary-text">{{ row.distilleryName || '-' }}</div>
                </td>
                <td>
                  <span class="count-chip">{{ row.tankerCount }}</span>
                </td>
                <td>
                  <div class="tanker-badge">{{ row.tankerNumbers || formatTankerNumbers(row.tankerDetails) }}</div>
                </td>
                <td class="numeric">{{ row.requestedTotalQuantity | number:'1.2-2' }}</td>
                <td class="numeric strong">{{ row.totalBulkLiter | number:'1.2-2' }}</td>
                <td>
                  <div class="primary-text">{{ formatDate(row.submittedAt) }}</div>
                </td>
                <td>
                  <span class="status-chip"
                    [ngClass]="{
                      'pending': row.approvalStatus === 'PENDING',
                      'approved': row.approvalStatus === 'APPROVED',
                      'rejected': row.approvalStatus === 'REJECTED'
                    }">
                    {{ row.approvalStatus }}
                  </span>
                </td>
                <td>
                  <div class="remarks-cell">{{ row.reviewRemarks || 'No remarks added' }}</div>
                </td>
                <td class="actions-cell">
                  <div class="action-row" *ngIf="row.approvalStatus === 'PENDING'; else reviewedInfo">
                    <button type="button" class="action-btn approve" (click)="approve(row)" [disabled]="actingId === row.id">
                      Approve
                    </button>
                    <button type="button" class="action-btn reject" (click)="reject(row)" [disabled]="actingId === row.id">
                      Reject
                    </button>
                  </div>
                  <ng-template #reviewedInfo>
                    <div class="review-meta">
                      <div class="review-user">{{ row.reviewedBy || 'Reviewed' }}</div>
                      <div class="review-time">{{ formatDate(row.reviewedAt) }}</div>
                    </div>
                  </ng-template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="empty-orb">BL</div>
          <div class="empty-title">No BL detail entries found</div>
          <div class="empty-subtitle">New arrival submissions routed to this OIC will appear here for review.</div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .bl-review-shell {
      --ink: #172554;
      --muted: #64748b;
      --line: #dbe4ef;
      --panel: #ffffff;
      --panel-alt: #f8fbff;
      --shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      padding: 1.25rem;
      background:
        radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 28%),
        linear-gradient(180deg, #f8fbff 0%, #f3f6fb 100%);
      border-radius: 24px;
      color: #0f172a;
    }

    .hero-panel,
    .filters-panel,
    .table-panel {
      background: var(--panel);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 22px;
      box-shadow: var(--shadow);
    }

    .hero-panel {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.4rem 1.5rem;
      margin-bottom: 1.1rem;
      background:
        linear-gradient(135deg, rgba(13, 71, 161, 0.95), rgba(14, 116, 144, 0.92)),
        linear-gradient(180deg, #163c8f, #0f766e);
      color: #fff;
      overflow: hidden;
      position: relative;
    }

    .hero-panel::after {
      content: '';
      position: absolute;
      inset: auto -60px -70px auto;
      width: 220px;
      height: 220px;
      background: radial-gradient(circle, rgba(255,255,255,0.18), transparent 65%);
      pointer-events: none;
    }

    .eyebrow {
      display: inline-block;
      padding: 0.32rem 0.7rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.16);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 0.8rem;
    }

    .hero-copy h2 {
      margin: 0 0 0.45rem;
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .hero-copy p {
      margin: 0;
      max-width: 56rem;
      color: rgba(255, 255, 255, 0.84);
      font-size: 1rem;
      line-height: 1.6;
    }

    .refresh-btn {
      border: none;
      border-radius: 14px;
      background: #fff;
      color: #164e63;
      padding: 0.8rem 1rem;
      font-weight: 700;
      min-width: 132px;
      box-shadow: 0 10px 22px rgba(2, 12, 27, 0.18);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .refresh-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 14px 28px rgba(2, 12, 27, 0.22);
    }

    .refresh-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .refresh-icon {
      display: inline-block;
      margin-right: 0.45rem;
      font-size: 1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat-card {
      position: relative;
      border-radius: 20px;
      padding: 1.15rem 1.2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      overflow: hidden;
      border: 1px solid transparent;
      box-shadow: var(--shadow);
    }

    .stat-card::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 5px;
      border-radius: 20px 0 0 20px;
    }

    .stat-card.pending {
      background: linear-gradient(135deg, #fff8dc, #fff2b8);
      border-color: #f3df89;
    }

    .stat-card.pending::before {
      background: #d4a72c;
    }

    .stat-card.approved {
      background: linear-gradient(135deg, #e6f8ee, #cbf0dc);
      border-color: #9dd5b6;
    }

    .stat-card.approved::before {
      background: #15803d;
    }

    .stat-card.rejected {
      background: linear-gradient(135deg, #fce8e8, #f7d3d3);
      border-color: #efb6b6;
    }

    .stat-card.rejected::before {
      background: #b91c1c;
    }

    .stat-kicker {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(15, 23, 42, 0.62);
      margin-bottom: 0.35rem;
    }

    .stat-card h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
    }

    .stat-pill {
      min-width: 54px;
      height: 54px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      font-size: 1.5rem;
      font-weight: 800;
      background: rgba(255, 255, 255, 0.72);
      color: var(--ink);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
    }

    .filters-panel {
      padding: 1.2rem;
      margin-bottom: 1rem;
      background: linear-gradient(180deg, #ffffff, #f8fbff);
    }

    .filters-heading h4,
    .table-panel-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: #0f172a;
    }

    .filters-heading p,
    .table-panel-header p {
      margin: 0.35rem 0 0;
      color: var(--muted);
      font-size: 0.92rem;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: 260px minmax(0, 1fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    .field-block {
      display: block;
    }

    .field-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 0.5rem;
      letter-spacing: 0.02em;
    }

    .field-input {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      background: #fff;
      min-height: 50px;
      padding: 0.8rem 0.95rem;
      color: #0f172a;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }

    .field-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
      background: #fcfdff;
    }

    .status-banner {
      border-radius: 16px;
      padding: 0.95rem 1rem;
      margin-bottom: 1rem;
      font-weight: 600;
    }

    .status-banner.error {
      color: #991b1b;
      background: #fee2e2;
      border: 1px solid #fecaca;
    }

    .loading-state,
    .empty-state {
      background: linear-gradient(180deg, #fff, #f8fbff);
      border: 1px dashed #cbd5e1;
      border-radius: 20px;
      padding: 2.4rem 1rem;
      text-align: center;
      color: var(--muted);
    }

    .table-panel {
      padding: 1rem;
      background: linear-gradient(180deg, #ffffff, #fbfdff);
    }

    .table-wrap {
      overflow: auto;
      border-radius: 18px;
      border: 1px solid #dbe4ef;
      background: #fff;
    }

    .bl-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 1220px;
    }

    .bl-table thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      white-space: nowrap;
      background: linear-gradient(180deg, #eff5ff, #e8f1ff);
      color: #1e3a8a;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.95rem 0.85rem;
      border-bottom: 1px solid #cfe0ff;
    }

    .bl-table tbody td {
      padding: 1rem 0.85rem;
      border-bottom: 1px solid #edf2f7;
      vertical-align: middle;
      color: #0f172a;
      background: #fff;
    }

    .bl-table tbody tr:hover td {
      background: #f8fbff;
    }

    .ref-primary,
    .primary-text,
    .review-user {
      font-weight: 700;
      color: #0f172a;
    }

    .ref-secondary,
    .review-time {
      margin-top: 0.2rem;
      font-size: 0.8rem;
      color: var(--muted);
    }

    .count-chip {
      display: inline-flex;
      min-width: 36px;
      height: 36px;
      align-items: center;
      justify-content: center;
      padding: 0 0.7rem;
      border-radius: 999px;
      font-weight: 800;
      color: #1d4ed8;
      background: #dbeafe;
      border: 1px solid #bfdbfe;
    }

    .tanker-badge {
      display: inline-block;
      max-width: 260px;
      padding: 0.48rem 0.72rem;
      border-radius: 12px;
      background: #eef6ff;
      border: 1px solid #d4e5ff;
      color: #0f3b78;
      font-weight: 600;
      line-height: 1.45;
      word-break: break-word;
    }

    .numeric {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .numeric.strong {
      font-weight: 800;
      color: #0b6b46;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 108px;
      padding: 0.46rem 0.8rem;
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: 1px solid transparent;
    }

    .status-chip.pending {
      color: #8a5a00;
      background: #fff4cf;
      border-color: #f5df8b;
    }

    .status-chip.approved {
      color: #166534;
      background: #dcfce7;
      border-color: #9fdfb3;
    }

    .status-chip.rejected {
      color: #991b1b;
      background: #fee2e2;
      border-color: #f6b9b9;
    }

    .remarks-cell {
      max-width: 220px;
      color: #475569;
      line-height: 1.45;
      word-break: break-word;
    }

    .actions-cell {
      text-align: right;
      min-width: 170px;
    }

    .action-row {
      display: inline-flex;
      gap: 0.55rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .action-btn {
      border: none;
      border-radius: 12px;
      padding: 0.62rem 0.9rem;
      font-weight: 700;
      font-size: 0.84rem;
      transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
    }

    .action-btn:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .action-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .action-btn.approve {
      color: #fff;
      background: linear-gradient(135deg, #15803d, #16a34a);
      box-shadow: 0 10px 18px rgba(21, 128, 61, 0.24);
    }

    .action-btn.reject {
      color: #991b1b;
      background: #fff1f2;
      border: 1px solid #fecdd3;
    }

    .empty-state {
      margin-top: 0.5rem;
    }

    .empty-orb {
      width: 72px;
      height: 72px;
      margin: 0 auto 1rem;
      border-radius: 22px;
      display: grid;
      place-items: center;
      font-weight: 900;
      letter-spacing: 0.06em;
      color: #1d4ed8;
      background: linear-gradient(135deg, #dbeafe, #eff6ff);
      border: 1px solid #bfdbfe;
    }

    .empty-title {
      font-size: 1.12rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.4rem;
    }

    .empty-subtitle {
      max-width: 460px;
      margin: 0 auto;
      line-height: 1.6;
    }

    @media (max-width: 1024px) {
      .stats-grid,
      .filters-grid {
        grid-template-columns: 1fr;
      }

      .hero-panel {
        flex-direction: column;
        align-items: stretch;
      }

      .refresh-btn {
        width: 100%;
      }
    }

    @media (max-width: 640px) {
      .bl-review-shell {
        padding: 0.75rem;
        border-radius: 18px;
      }

      .hero-copy h2 {
        font-size: 1.45rem;
      }

      .hero-panel,
      .filters-panel,
      .table-panel {
        border-radius: 18px;
      }

      .bl-table {
        min-width: 1080px;
      }
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
        this.formatTankerDetails(row.tankerDetails),
        row.tankerNumbers
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
