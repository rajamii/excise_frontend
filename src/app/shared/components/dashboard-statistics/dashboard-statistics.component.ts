import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface StatisticsData {
  applied: number;
  pending: number;
  objection?: number;
  approved: number;
  rejected: number;
  dailyEntry?: number;
}

interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-dashboard-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="dashboard-statistics">
      <div class="stats-grid">

        <!-- Applied -->
        <div class="stat-card applied">
          <div class="card-header">
            <div class="circle-icon blue-bg">
              <mat-icon>send</mat-icon>
            </div>
            <div class="card-trend positive">
              <mat-icon>trending_up</mat-icon>
              <span>All</span>
            </div>
          </div>
          <div class="card-content">
            <div class="value">{{ statistics.applied }}</div>
            <div class="label">Applied</div>
          </div>
        </div>

        <!-- Pending -->
        <div class="stat-card pending">
          <div class="card-header">
            <div class="circle-icon yellow-bg">
              <mat-icon>schedule</mat-icon>
            </div>
            <div class="card-trend" [class.negative]="statistics.pending > 0">
              <mat-icon>{{ statistics.pending > 0 ? 'trending_up' : 'trending_flat' }}</mat-icon>
              <span>{{ statistics.pending > 0 ? 'Action needed' : 'Clear' }}</span>
            </div>
          </div>
          <div class="card-content">
            <div class="value">{{ statistics.pending }}</div>
            <div class="label">Pending</div>
          </div>
        </div>

        <!-- Objection (optional) -->
        <div class="stat-card objection" *ngIf="statistics.objection !== undefined">
          <div class="card-header">
            <div class="circle-icon orange-bg">
              <mat-icon>error_outline</mat-icon>
            </div>
            <div class="card-trend" [class.negative]="(statistics.objection || 0) > 0">
              <mat-icon>{{ (statistics.objection || 0) > 0 ? 'trending_up' : 'trending_flat' }}</mat-icon>
              <span>{{ (statistics.objection || 0) > 0 ? 'Needs review' : 'None' }}</span>
            </div>
          </div>
          <div class="card-content">
            <div class="value">{{ statistics.objection || 0 }}</div>
            <div class="label">Objection</div>
          </div>
        </div>

        <!-- Approved -->
        <div class="stat-card approved">
          <div class="card-header">
            <div class="circle-icon green-bg">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="card-trend positive">
              <mat-icon>trending_up</mat-icon>
              <span>Good</span>
            </div>
          </div>
          <div class="card-content">
            <div class="value">{{ statistics.approved }}</div>
            <div class="label">Approved</div>
          </div>
        </div>

        <!-- Rejected -->
        <div class="stat-card rejected">
          <div class="card-header">
            <div class="circle-icon red-bg">
              <mat-icon>cancel</mat-icon>
            </div>
            <div class="card-trend" [class.negative]="statistics.rejected > 0">
              <mat-icon>{{ statistics.rejected > 0 ? 'trending_down' : 'trending_flat' }}</mat-icon>
              <span>{{ statistics.rejected > 0 ? 'Review' : 'None' }}</span>
            </div>
          </div>
          <div class="card-content">
            <div class="value">{{ statistics.rejected }}</div>
            <div class="label">Rejected</div>
          </div>
        </div>

        <!-- Daily Entry (optional) -->
        <div class="stat-card daily-entry" *ngIf="statistics.dailyEntry !== undefined">
          <div class="card-header">
            <div class="circle-icon purple-bg">
              <mat-icon>calendar_today</mat-icon>
            </div>
            <div class="card-trend positive">
              <mat-icon>trending_flat</mat-icon>
              <span>Today</span>
            </div>
          </div>
          <div class="card-content">
            <div class="value">{{ statistics.dailyEntry }}</div>
            <div class="label">Daily Entry</div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .dashboard-statistics {
      margin-bottom: 2rem;
      background: transparent;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
    }

    .stat-card {
      border-radius: 1.25rem;
      padding: 0;
      box-shadow: none;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      border: none;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transform: translateY(0);
      min-height: 160px;
    }

    /* decorative bubble top-right */
    .stat-card::before {
      content: '';
      position: absolute;
      top: -50px;
      right: -50px;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.35);
      pointer-events: none;
      transition: all 0.4s ease;
    }

    .stat-card:hover {
      transform: translateY(-6px);
      box-shadow:
        0 12px 36px rgba(28, 43, 120, 0.15),
        0 4px 12px rgba(28, 43, 120, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .stat-card:hover::before {
      transform: scale(1.1);
      opacity: 0.8;
    }

    .stat-card:hover .circle-icon {
      transform: scale(1.08);
    }



    /* ---- card-header ---- */
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem 1.5rem 0;
      position: relative;
      z-index: 1;
    }

    /* ---- circle icon ---- */
    .circle-icon {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow:
        0 6px 20px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      z-index: 1;
    }

    .circle-icon mat-icon {
      font-size: 1.75rem;
      width: 1.75rem;
      height: 1.75rem;
      color: #fff;
      z-index: 1;
      position: relative;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
    }

    .blue-bg   { background: linear-gradient(135deg, #1C2B78 0%, #2563eb 100%); }
    .red-bg    { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); }
    .green-bg  { background: linear-gradient(135deg, #059669 0%, #10b981 100%); }
    .yellow-bg { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); }
    .orange-bg { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); }
    .purple-bg { background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); }

    /* ---- card-trend badge ---- */
    .card-trend {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8125rem;
      font-weight: 700;
      padding: 0.4rem 0.75rem;
      border-radius: 1.5rem;
      background: rgba(0, 0, 0, 0.04);
      transition: all 0.3s ease;
    }

    .card-trend.positive {
      color: #10b981;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.15);
    }

    .card-trend.negative {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.15);
    }

    .card-trend mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    /* ---- card-content ---- */
    .card-content {
      padding: 1rem 1.5rem 1rem;
      flex: 1;
      position: relative;
      z-index: 1;
    }

    .value {
      font-size: 2.25rem;
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: 0.4rem;
      letter-spacing: -0.02em;
    }

    .label {
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 0.5rem;
    }

    .sub-info {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
      font-weight: 600;
      line-height: 1.6;
    }



    /* ---- per-card colour themes ---- */
    .stat-card { background: transparent; }

    .stat-card.applied {
      background: linear-gradient(135deg, rgba(239,246,255,0.6) 0%, rgba(219,234,254,0.6) 100%);
    }
    .stat-card.applied::before { background: rgba(96, 165, 250, 0.3); }
    .stat-card.applied .value  { color: #2563eb; }
    .stat-card.applied .label  { color: #3b82f6; }

    .stat-card.pending {
      background: linear-gradient(135deg, rgba(254,252,232,0.6) 0%, rgba(254,249,195,0.6) 100%);
    }
    .stat-card.pending::before { background: rgba(251, 191, 36, 0.3); }
    .stat-card.pending .value  { color: #ca8a04; }
    .stat-card.pending .label  { color: #eab308; }

    .stat-card.objection {
      background: linear-gradient(135deg, rgba(255,247,237,0.6) 0%, rgba(254,215,170,0.6) 100%);
    }
    .stat-card.objection::before { background: rgba(251, 146, 60, 0.3); }
    .stat-card.objection .value  { color: #ea580c; }
    .stat-card.objection .label  { color: #f97316; }

    .stat-card.approved {
      background: linear-gradient(135deg, rgba(240,253,244,0.6) 0%, rgba(220,252,231,0.6) 100%);
    }
    .stat-card.approved::before { background: rgba(52, 211, 153, 0.3); }
    .stat-card.approved .value  { color: #16a34a; }
    .stat-card.approved .label  { color: #22c55e; }

    .stat-card.rejected {
      background: linear-gradient(135deg, rgba(255,241,242,0.6) 0%, rgba(255,228,230,0.6) 100%);
    }
    .stat-card.rejected::before { background: rgba(251, 113, 133, 0.3); }
    .stat-card.rejected .value  { color: #dc2626; }
    .stat-card.rejected .label  { color: #f43f5e; }

    .stat-card.daily-entry {
      background: linear-gradient(135deg, rgba(245,243,255,0.6) 0%, rgba(237,233,254,0.6) 100%);
    }
    .stat-card.daily-entry::before { background: rgba(167, 139, 250, 0.3); }
    .stat-card.daily-entry .value  { color: #7c3aed; }
    .stat-card.daily-entry .label  { color: #8b5cf6; }

    /* ---- responsive ---- */
    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }
      .stat-card { min-height: 160px; }
      .value { font-size: 1.75rem; }
    }

    @media (max-width: 480px) {
      .stats-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardStatisticsComponent {
  @Input() statistics: StatisticsData = {
    applied: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  };

  @Input() filterOptions: FilterOption[] = [
    { value: 'all', label: 'All Applications' }
  ];

  @Input() showSelectionMessage: boolean = false;

  @Output() filterChange = new EventEmitter<string>();
}
