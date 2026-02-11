import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

interface ApplicationStat {
  type: string;
  label: string;
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-application-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './application-stats.component.html',
  styleUrls: ['./application-stats.component.scss']
})
export class ApplicationStatsComponent implements OnInit, OnChanges {
  @Input() data: any;
  @Input() loading = false;
  @Input() title = 'Application Statistics';
  @Input() showTitle = true;
  @Input() showTrends = true;
  @Input() showPercentages = true;
  @Output() statClicked = new EventEmitter<ApplicationStat>();
  @Output() refreshRequested = new EventEmitter<void>();

  applicationStats: ApplicationStat[] = [];
  totalApplications = 0;

  ngOnInit() {
    this.processStatsData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.processStatsData();
    }
  }

  private processStatsData() {
    if (!this.data) {
      this.applicationStats = [];
      this.totalApplications = 0;
      return;
    }

    // Calculate total applications
    this.totalApplications = (this.data.applied || 0) + 
                            (this.data.pending || 0) + 
                            (this.data.approved || 0) + 
                            (this.data.rejected || 0);

    // Create application statistics
    this.applicationStats = [
      {
        type: 'applied',
        label: 'Applications Submitted',
        value: this.data.applied || 0,
        percentage: this.calculatePercentage(this.data.applied || 0),
        trend: this.determineTrend(this.data.applied, this.data.appliedPrevious),
        trendValue: this.calculateTrendValue(this.data.applied, this.data.appliedPrevious),
        color: '#2196F3',
        icon: 'send'
      },
      {
        type: 'pending',
        label: 'Under Review',
        value: this.data.pending || 0,
        percentage: this.calculatePercentage(this.data.pending || 0),
        trend: this.determineTrend(this.data.pending, this.data.pendingPrevious),
        trendValue: this.calculateTrendValue(this.data.pending, this.data.pendingPrevious),
        color: '#FF9800',
        icon: 'schedule'
      },
      {
        type: 'approved',
        label: 'Approved',
        value: this.data.approved || 0,
        percentage: this.calculatePercentage(this.data.approved || 0),
        trend: this.determineTrend(this.data.approved, this.data.approvedPrevious),
        trendValue: this.calculateTrendValue(this.data.approved, this.data.approvedPrevious),
        color: '#4CAF50',
        icon: 'check_circle'
      },
      {
        type: 'rejected',
        label: 'Rejected',
        value: this.data.rejected || 0,
        percentage: this.calculatePercentage(this.data.rejected || 0),
        trend: this.determineTrend(this.data.rejected, this.data.rejectedPrevious),
        trendValue: this.calculateTrendValue(this.data.rejected, this.data.rejectedPrevious),
        color: '#F44336',
        icon: 'cancel'
      }
    ];
  }

  private calculatePercentage(value: number): number {
    if (this.totalApplications === 0) return 0;
    return Math.round((value / this.totalApplications) * 100);
  }

  private determineTrend(current: number = 0, previous: number = 0): 'up' | 'down' | 'stable' {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  }

  private calculateTrendValue(current: number = 0, previous: number = 0): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  onStatClick(stat: ApplicationStat) {
    this.statClicked.emit(stat);
  }

  onRefresh() {
    this.refreshRequested.emit();
  }

  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  getTrendClass(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return 'trend-up';
      case 'down': return 'trend-down';
      default: return 'trend-stable';
    }
  }

  formatValue(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  trackByStat(index: number, stat: ApplicationStat): string {
    return stat.type;
  }
}