import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface StatisticsData {
  applied: number;
  pending: number;
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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-statistics">
      <!-- Statistics Cards -->
      <div class="statistics-cards">
        <div class="stat-card applied">
          <div class="stat-icon">
            <i class="bi bi-arrow-right-circle"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ statistics.applied }}</div>
            <div class="stat-label">APPLIED</div>
          </div>
        </div>

        <div class="stat-card pending">
          <div class="stat-icon">
            <i class="bi bi-clock"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ statistics.pending }}</div>
            <div class="stat-label">PENDING</div>
          </div>
        </div>

        <div class="stat-card approved">
          <div class="stat-icon">
            <i class="bi bi-check-circle"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ statistics.approved }}</div>
            <div class="stat-label">APPROVED</div>
          </div>
        </div>

        <div class="stat-card rejected">
          <div class="stat-icon">
            <i class="bi bi-x-circle"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ statistics.rejected }}</div>
            <div class="stat-label">REJECTED</div>
          </div>
        </div>

        <div class="stat-card daily-entry" *ngIf="statistics.dailyEntry !== undefined">
          <div class="stat-icon">
            <i class="bi bi-calendar-check"></i>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ statistics.dailyEntry }}</div>
            <div class="stat-label">DAILY ENTRY</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-statistics {
      margin-bottom: 2rem;
    }

    .statistics-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: white;
    }

    .stat-card.applied .stat-icon {
      background: #3b82f6; /* Blue */
    }

    .stat-card.pending .stat-icon {
      background: #f59e0b; /* Orange */
    }

    .stat-card.approved .stat-icon {
      background: #10b981; /* Green */
    }

    .stat-card.rejected .stat-icon {
      background: #ef4444; /* Red */
    }

    .stat-card.daily-entry .stat-icon {
      background: #8b5cf6; /* Purple */
    }

    .stat-content {
      flex: 1;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      color: #1f2937;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #6b7280;
      margin-top: 0.25rem;
      letter-spacing: 0.05em;
    }

    @media (max-width: 768px) {
      .statistics-cards {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .stat-card {
        padding: 1rem;
      }

      .stat-icon {
        width: 50px;
        height: 50px;
        font-size: 1.25rem;
      }

      .stat-number {
        font-size: 1.5rem;
      }

      .filter-section {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .statistics-cards {
        grid-template-columns: 1fr;
      }
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
