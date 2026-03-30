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
          <h2>ENA Details Information</h2>
          <p>Review arrival ENA submissions before they move into the licensee ENA record and permanent ENA history.</p>
        </div>
        <button type="button" class="refresh-btn" (click)="loadRows()" [disabled]="loading">
          <span class="refresh-icon" aria-hidden="true">R</span>
          <span>{{ loading ? 'Refreshing...' : 'Refresh' }}</span>
        </button>
      </section>

      <section class="stats-grid">
        <article class="stat-card total stat-card-clickable" role="button" tabindex="0" aria-label="Show all ENA details"
          (click)="onStatCardClick('ALL')" (keydown.enter)="onStatCardClick('ALL')"
          (keydown.space)="onStatCardClick('ALL'); $event.preventDefault()"
          [class.active]="isStatCardActive('ALL')">
          <div>
            <span class="stat-kicker">All submissions</span>
            <h3>Total Applications</h3>
          </div>
          <div class="stat-pill">{{ getTotalCount() }}</div>
        </article>

        <article class="stat-card pending stat-card-clickable" role="button" tabindex="0" aria-label="Filter pending ENA details"
  (click)="onStatCardClick('PENDING')" (keydown.enter)="onStatCardClick('PENDING')"
  (keydown.space)="onStatCardClick('PENDING'); $event.preventDefault()"
  [class.active]="isStatCardActive('PENDING')">
          <div>
            <span class="stat-kicker">Awaiting action</span>
            <h3>Pending</h3>
          </div>
          <div class="stat-pill">{{ getCount('PENDING') }}</div>
        </article>
        <article class="stat-card approved stat-card-clickable" role="button" tabindex="0" aria-label="Filter approved ENA details"
  (click)="onStatCardClick('APPROVED')" (keydown.enter)="onStatCardClick('APPROVED')"
  (keydown.space)="onStatCardClick('APPROVED'); $event.preventDefault()"
  [class.active]="isStatCardActive('APPROVED')">
          <div>
            <span class="stat-kicker">Cleared by OIC</span>
            <h3>Approved</h3>
          </div>
          <div class="stat-pill">{{ getCount('APPROVED') }}</div>
        </article>
        <article class="stat-card rejected stat-card-clickable" role="button" tabindex="0" aria-label="Filter rejected ENA details"
  (click)="onStatCardClick('REJECTED')" (keydown.enter)="onStatCardClick('REJECTED')"
  (keydown.space)="onStatCardClick('REJECTED'); $event.preventDefault()"
  [class.active]="isStatCardActive('REJECTED')">
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
          <br>
          </div>
        </div>
        <div class="filters-grid">
          <label class="field-block">
            <span class="field-label">Month</span>
            <input type="month" class="field-input" [(ngModel)]="selectedMonth">
          </label>
          <label class="field-block">
            <span class="field-label">From Date</span>
            <input type="date" class="field-input" [(ngModel)]="fromDate">
          </label>
          <label class="field-block">
            <span class="field-label">To Date</span>
            <input type="date" class="field-input" [(ngModel)]="toDate">
          </label>
          <label class="field-block search-block">
            <span class="field-label">Search</span>
            <input class="field-input" [(ngModel)]="searchTerm" placeholder="Search by ref no, licensee, distillery or tanker">
          </label>
        </div>
      </section>

      <div *ngIf="errorMessage" class="status-banner error">{{ errorMessage }}</div>
      <div *ngIf="loading" class="loading-state">Loading ENA details...</div>

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
                  <div class="ref-secondary">ENA submission</div>
                </td>
                <td>
                  <div class="primary-text">{{ row.licenseeId || '-' }}</div>
                </td>
                <td>
                  <div class="primary-text">{{ row.distilleryName || '-' }}</div>
                </td>
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
                  <div class="action-stack">
                    <button type="button" class="action-btn details" (click)="openDetailsModal(row)">
                      View Details
                    </button>
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
                        <div class="review-time">{{ formatDate(row.reviewedAt) }}</div>
                      </div>
                    </ng-template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>


      <ng-container *ngIf="selectedDetailsRow as details">
        <div class="details-modal-backdrop" (click)="closeDetailsModal()"></div>
        <div class="details-modal" role="dialog" aria-modal="true">
          <div class="details-modal-card" (click)="$event.stopPropagation()">
            <div class="details-hero">
              <div class="details-modal-title">
                <div class="details-kicker-row">
                  <span class="details-kicker">ENA Entry Details</span>
                  <span class="details-status-badge"
                    [ngClass]="{
                      'pending': details.approvalStatus === 'PENDING',
                      'approved': details.approvalStatus === 'APPROVED',
                      'rejected': details.approvalStatus === 'REJECTED'
                    }">
                    {{ details.approvalStatus }}
                  </span>
                </div>
                <h3>{{ details.referenceNo }}</h3>
                <p>{{ details.distilleryName || '-' }}</p>
                <div class="details-meta-pills">
                  <div class="details-meta-pill">
                    <span class="meta-pill-label">Licensee</span>
                    <strong>{{ details.licenseeId || '-' }}</strong>
                  </div>
                  <div class="details-meta-pill">
                    <span class="meta-pill-label">Submitted</span>
                    <strong>{{ formatDate(details.submittedAt || '') }}</strong>
                  </div>
                </div>
              </div>
              <button type="button" class="details-close" (click)="closeDetailsModal()">Close</button>
            </div>

            <div class="details-metrics">
              <div class="metric-card tankers">
                <span class="metric-label">Tankers</span>
                <strong>{{ details.tankerCount || 0 }}</strong>
                <small>Vehicle count in this ENA entry</small>
              </div>
              <div class="metric-card quantity">
                <span class="metric-label">Requested Qty</span>
                <strong>{{ details.requestedTotalQuantity || 0 | number:'1.2-2' }}</strong>
                <small>Requested in the requisition</small>
              </div>
              <div class="metric-card total">
                <span class="metric-label">Total ENA</span>
                <strong>{{ details.totalBulkLiter || 0 | number:'1.2-2' }}</strong>
                <small>Submitted across tanker rows</small>
              </div>
            </div>

            <div class="details-info-grid">
              <div class="info-box">
                <span class="info-label">Licensee ID</span>
                <div>{{ details.licenseeId || '-' }}</div>
              </div>
              <div class="info-box">
                <span class="info-label">Submission Time</span>
                <div>{{ formatDate(details.submittedAt || '') }}</div>
              </div>
              <div class="info-box status-box">
                <span class="info-label">Review Status</span>
                <div class="status-text">{{ details.approvalStatus || '-' }}</div>
              </div>
            </div>

            <div class="details-table-card">
              <div class="details-table-head">
                <div>
                  <h4>Tanker Manifest</h4>
                  <p>Tanker-wise ENA information submitted by the licensee.</p>
                </div>
                <div class="manifest-count">{{ details.tankerDetails.length }} Row{{ details.tankerDetails.length === 1 ? '' : 's' }}</div>
              </div>
              <div class="details-table-wrap">
                <table class="details-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tanker Number</th>
                      <th>Bulk Liter</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of details.tankerDetails; let i = index">
                      <td>{{ i + 1 }}</td>
                      <td>{{ item.tanker_no || '-' }}</td>
                      <td>{{ item.bulk_liter || 0 | number:'1.2-2' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="empty-orb">ENA</div>
          <div class="empty-title">No ENA detail entries found</div>
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
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
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
      display: inline-grid;
      place-items: center;
      width: 1.55rem;
      height: 1.55rem;
      margin-right: 0.45rem;
      border-radius: 999px;
      background: linear-gradient(135deg, #dbeafe, #e0f2fe);
      color: #0f3b78;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat-card {
      --stat-accent-start: #0ea5e9;
      --stat-accent-end: #2563eb;
      position: relative;
      border-radius: 20px;
      padding: 1.15rem 1.2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      overflow: hidden;
      border: 1px solid transparent;
      box-shadow: var(--shadow);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }


    .stat-card-clickable {
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .stat-card-clickable:hover {
      transform: translateY(-3px);
      box-shadow: 0 18px 38px rgba(15, 23, 42, 0.12);
    }

    .stat-card-clickable:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.2), 0 18px 38px rgba(15, 23, 42, 0.12);
    }

    .stat-card.active {
      border-color: rgba(13, 110, 253, 0.4);
      box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.15), 0 18px 38px rgba(15, 23, 42, 0.12);
    }

    .stat-card::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 5px;
      border-radius: 20px 0 0 20px;
    }

    .stat-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--stat-accent-start), var(--stat-accent-end));
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.25s ease;
      pointer-events: none;
      z-index: 1;
    }

    .stat-card-clickable:hover::after,
    .stat-card.active::after {
      transform: scaleX(1);
    }

    .stat-card.total {
      --stat-accent-start: #3b82f6;
      --stat-accent-end: #1d4ed8;
      background: linear-gradient(135deg, rgba(219, 234, 254, 0.9), rgba(191, 219, 254, 0.7));
      border-color: rgba(59, 130, 246, 0.35);
    }

    .stat-card.total::before {
      background: #1d4ed8;
    }

    .stat-card.pending {
      --stat-accent-start: #f59e0b;
      --stat-accent-end: #d97706;
      background: linear-gradient(135deg, #fff8dc, #fff2b8);
      border-color: #f3df89;
    }

    .stat-card.pending::before {
      background: #d4a72c;
    }

    .stat-card.approved {
      --stat-accent-start: #22c55e;
      --stat-accent-end: #15803d;
      background: linear-gradient(135deg, #e6f8ee, #cbf0dc);
      border-color: #9dd5b6;
    }

    .stat-card.approved::before {
      background: #15803d;
    }

    .stat-card.rejected {
      --stat-accent-start: #ef4444;
      --stat-accent-end: #b91c1c;
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
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      align-items: start;
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
    .primary-text {
      font-weight: 700;
      color: #0f172a;
    }

    .ref-secondary,
    .review-time {
      margin-top: 0.2rem;
      font-size: 0.8rem;
      color: var(--muted);
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
      min-width: 190px;
    }

    .action-stack {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.55rem;
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


    .action-btn.details {
      color: #1d4ed8;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      min-width: 118px;
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


    .details-modal-backdrop {
      position: fixed;
      inset: 0;
      background: linear-gradient(180deg, rgba(241, 245, 249, 0.42), rgba(226, 232, 240, 0.62));
      backdrop-filter: blur(10px);
      z-index: 1040;
    }

    .details-modal {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      z-index: 1050;
    }

    .details-modal-card {
      width: min(960px, 100%);
      max-height: calc(100vh - 3rem);
      overflow: auto;
      background:
        radial-gradient(circle at top right, rgba(191, 219, 254, 0.38), transparent 22%),
        radial-gradient(circle at top left, rgba(224, 242, 254, 0.52), transparent 28%),
        linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
      border-radius: 30px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 28px 70px rgba(148, 163, 184, 0.28);
      padding: 1.6rem;
    }

    .details-hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.1rem 1.15rem 1.25rem;
      margin-bottom: 1.2rem;
      border-radius: 24px;
      background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.98));
      border: 1px solid #dbeafe;
    }

    .details-modal-title {
      min-width: 0;
      flex: 1;
    }

    .details-kicker-row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      flex-wrap: wrap;
      margin-bottom: 0.75rem;
    }

    .details-kicker {
      display: inline-block;
      padding: 0.35rem 0.78rem;
      border-radius: 999px;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #1d4ed8;
      background: #ffffff;
      border: 1px solid #bfdbfe;
      font-weight: 800;
    }

    .details-status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 118px;
      padding: 0.38rem 0.8rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border: 1px solid transparent;
    }

    .details-status-badge.pending {
      color: #8a5a00;
      background: #fff7d6;
      border-color: #f6df93;
    }

    .details-status-badge.approved {
      color: #166534;
      background: #dcfce7;
      border-color: #9fdfb3;
    }

    .details-status-badge.rejected {
      color: #991b1b;
      background: #fee2e2;
      border-color: #f6b9b9;
    }

    .details-modal-title h3 {
      margin: 0;
      font-size: 2rem;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.03em;
      line-height: 1.05;
    }

    .details-modal-title p {
      margin: 0.55rem 0 0;
      color: #64748b;
      font-size: 1.03rem;
      line-height: 1.55;
      max-width: 44rem;
    }

    .details-meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .details-meta-pill {
      min-width: 210px;
      padding: 0.75rem 0.9rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid #dce9f7;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
    }

    .meta-pill-label {
      display: block;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 0.35rem;
      font-weight: 800;
    }

    .details-meta-pill strong {
      color: #1e293b;
      font-size: 0.98rem;
      font-weight: 800;
    }

    .details-close {
      border: 1px solid #d7e1ec;
      border-radius: 999px;
      background: #ffffff;
      color: #334155;
      padding: 0.82rem 1.2rem;
      font-weight: 800;
      box-shadow: 0 8px 22px rgba(148, 163, 184, 0.14);
      transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }

    .details-close:hover {
      background: #f8fbff;
      border-color: #bfd2e6;
      box-shadow: 0 12px 26px rgba(148, 163, 184, 0.18);
      transform: translateY(-1px);
    }

    .details-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .metric-card,
    .info-box {
      position: relative;
      background: linear-gradient(180deg, #ffffff, #f9fbff);
      border: 1px solid #dbe7f2;
      border-radius: 22px;
      padding: 1.05rem 1.1rem;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
    }

    .metric-card::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 5px;
      border-radius: 22px 0 0 22px;
    }

    .metric-card.tankers::before {
      background: #2563eb;
    }

    .metric-card.quantity::before {
      background: #0f766e;
    }

    .metric-card.total::before {
      background: #7c3aed;
    }

    .metric-label,
    .info-label {
      display: block;
      font-size: 0.74rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 0.45rem;
      font-weight: 800;
    }

    .metric-card strong {
      display: block;
      font-size: 1.6rem;
      color: #0f172a;
      letter-spacing: -0.03em;
      margin-bottom: 0.28rem;
    }

    .metric-card small {
      display: block;
      color: #64748b;
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .details-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.15rem;
    }

    .info-box div {
      color: #1e293b;
      font-size: 1rem;
      line-height: 1.5;
      font-weight: 700;
    }

    .status-box .status-text {
      display: inline-flex;
      align-items: center;
      min-height: 38px;
      padding: 0.35rem 0.8rem;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 0.84rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .details-table-card {
      padding: 1rem;
      border-radius: 24px;
      background: linear-gradient(180deg, #ffffff, #f9fbff);
      border: 1px solid #dbe7f2;
    }

    .details-table-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.9rem;
    }

    .details-table-head h4 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
    }

    .details-table-head p {
      margin: 0.28rem 0 0;
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .manifest-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 90px;
      padding: 0.5rem 0.8rem;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #dbeafe;
      font-size: 0.8rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .details-table-wrap {
      border: 1px solid #dbe7f2;
      border-radius: 20px;
      overflow: auto;
      background: #ffffff;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
    }

    .details-table th,
    .details-table td {
      padding: 1rem 1.05rem;
      border-bottom: 1px solid #edf2f7;
      text-align: left;
    }

    .details-table th {
      background: linear-gradient(180deg, #f5f9ff, #edf4ff);
      color: #1e40af;
      font-size: 0.79rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 800;
    }

    .details-table tbody tr {
      background: #ffffff;
    }

    .details-table tbody tr:hover td {
      background: #f9fbff;
    }

    .details-table tbody tr:last-child td {
      border-bottom: none;
    }

    @media (max-width: 1024px) {
      .stats-grid,
      .filters-grid,
      .details-metrics,
      .details-info-grid {
        grid-template-columns: 1fr;
      }

      .hero-panel,
      .details-hero,
      .details-table-head {
        flex-direction: column;
        align-items: stretch;
      }

      .refresh-btn,
      .details-close {
        width: 100%;
      }

      .details-meta-pill {
        min-width: 0;
      }
    }

    @media (max-width: 640px) {
      .bl-review-shell {
        padding: 0.75rem;
        border-radius: 18px;
      }

      .hero-copy h2,
      .details-modal-title h3 {
        font-size: 1.45rem;
      }

      .hero-panel,
      .filters-panel,
      .table-panel,
      .details-modal-card,
      .details-hero,
      .details-table-card {
        border-radius: 18px;
      }

      .details-modal {
        padding: 0.75rem;
      }

      .details-modal-card {
        padding: 1rem;
      }

      .details-meta-pills {
        flex-direction: column;
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
  selectedDetailsRow: BlDetailRow | null = null;
  selectedMonth: string = '';
  fromDate: string = '';
  toDate: string = '';

  ngOnInit(): void {
    // Set default to current running month
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM format
    this.selectedMonth = currentMonth;
    
    this.loadRows();
  }

  loadRows(): void {
    this.loading = true;
    this.errorMessage = '';
    this.enaRequisitionService.getRequisitionArrivalDetailsByStatus('ALL').subscribe({
      next: (response: any) => {
        const rows = Array.isArray(response?.data) ? response.data : [];
        this.rows = rows.map((row: any) => this.mapRow(row));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load ENA details for OIC review.';
      }
    });
  }

  get filteredRows(): BlDetailRow[] {
    const statusFiltered = this.reviewStatus === 'ALL'
      ? this.rows
      : this.rows.filter((row) => row.approvalStatus === this.reviewStatus);

    const token = this.searchTerm.trim().toLowerCase();
    if (!token) {
      return statusFiltered;
    }

    return statusFiltered.filter((row) =>
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

  
  

  getTotalCount(): number {
    return this.rows.length;
  }

  onStatCardClick(status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'): void {
    this.reviewStatus = status === 'ALL' ? 'ALL' : (this.reviewStatus === status ? 'ALL' : status);
  }

  isStatCardActive(status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'): boolean {
    return this.reviewStatus === status;
  }

  openDetailsModal(row: BlDetailRow): void {
    this.selectedDetailsRow = row;
  }

  closeDetailsModal(): void {
    this.selectedDetailsRow = null;
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
        this.errorMessage = `Unable to approve ENA details for ${row.referenceNo}.`;
      }
    });
  }

  reject(row: BlDetailRow): void {
    if (!row.id || this.actingId === row.id) {
      return;
    }
    const remarks = window.prompt('Enter rejection reason for ENA details:', row.reviewRemarks || '');
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
        this.errorMessage = `Unable to reject ENA details for ${row.referenceNo}.`;
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
      .map((item) => `${String(item?.tanker_no || '').trim()} (${Number(item?.bulk_liter || 0).toFixed(2)} ENA)`)
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
    let tankerDetailsSource: any[] = [];
    if (Array.isArray(tankerDetailsRaw)) {
      tankerDetailsSource = tankerDetailsRaw;
    } else if (typeof tankerDetailsRaw === 'string') {
      try {
        const parsed = JSON.parse(tankerDetailsRaw);
        tankerDetailsSource = Array.isArray(parsed) ? parsed : [];
      } catch {
        tankerDetailsSource = [];
      }
    }
    const tankerDetails = this.normalizeTankerDetails(
      tankerDetailsSource,
      row?.tanker_numbers ?? row?.tankerNumbers ?? '',
      row?.total_bulk_liter ?? row?.totalBulkLiter ?? 0
    );

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

  private normalizeTankerDetails(rawDetails: any[], tankerNumbersValue: any, totalBulkLiterValue: any): Array<{ tanker_no: string; bulk_liter: number }> {
    const normalized = (Array.isArray(rawDetails) ? rawDetails : [])
      .map((item: any) => {
        const tankerNo = String(
          item?.tanker_no ??
          item?.tankerNo ??
          item?.tanker_number ??
          item?.tankerNumber ??
          ''
        ).trim();
        const bulkLiter = Number(
          item?.bulk_liter ??
          item?.bulkLiter ??
          item?.bulk_litre ??
          item?.bulkLitre ??
          0
        ) || 0;
        return { tanker_no: tankerNo, bulk_liter: bulkLiter };
      })
      .filter((item) => item.tanker_no || item.bulk_liter > 0);

    if (normalized.length > 0) {
      return normalized;
    }

    const tankerNumbers = String(tankerNumbersValue ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (tankerNumbers.length === 0) {
      return [];
    }

    const totalBulkLiter = Number(totalBulkLiterValue ?? 0) || 0;
    return tankerNumbers.map((tankerNo, index) => ({
      tanker_no: tankerNo,
      bulk_liter: index === 0 ? totalBulkLiter : 0
    }));
  }
}

