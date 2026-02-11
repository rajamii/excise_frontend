import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StatCard } from '../../../../../core/models/dashboard.models';

@Component({
  selector: 'app-stats-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './stats-overview.component.html',
  styleUrls: ['./stats-overview.component.scss']
})
export class StatsOverviewComponent implements OnInit, OnChanges {
  @Input() data: any;
  @Input() loading = false;
  @Input() title = 'Statistics Overview';
  @Input() showTitle = true;
  @Input() cardClickable = true;
  @Output() statClicked = new EventEmitter<StatCard>();
  @Output() refreshRequested = new EventEmitter<void>();

  statsData: StatCard[] = [];

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
      this.statsData = [];
      return;
    }

    // Convert API data to stat cards format
    this.statsData = [
      {
        type: 'applied',
        value: this.data.applied || 0,
        label: 'Applied',
        icon: 'send',
        colorClass: 'blue-bg',
        route: '/applications?status=applied',
        permissions: ['applications.view']
      },
      {
        type: 'pending',
        value: this.data.pending || 0,
        label: 'Pending',
        icon: 'schedule',
        colorClass: 'yellow-bg',
        route: '/applications?status=pending',
        permissions: ['applications.view']
      },
      {
        type: 'approved',
        value: this.data.approved || 0,
        label: 'Approved',
        icon: 'check_circle',
        colorClass: 'green-bg',
        route: '/applications?status=approved',
        permissions: ['applications.view']
      },
      {
        type: 'rejected',
        value: this.data.rejected || 0,
        label: 'Rejected',
        icon: 'cancel',
        colorClass: 'red-bg',
        route: '/applications?status=rejected',
        permissions: ['applications.view']
      }
    ];

    // Add additional stats if available
    if (this.data.executed !== undefined) {
      this.statsData.push({
        type: 'executed',
        value: this.data.executed || 0,
        label: 'Executed',
        icon: 'done_all',
        colorClass: 'purple-bg',
        route: '/applications?status=executed',
        permissions: ['applications.view']
      });
    }

    if (this.data.total !== undefined) {
      this.statsData.push({
        type: 'total',
        value: this.data.total || 0,
        label: 'Total',
        icon: 'apps',
        colorClass: 'gray-bg',
        route: '/applications',
        permissions: ['applications.view']
      });
    }
  }

  onStatClick(stat: StatCard) {
    if (this.cardClickable) {
      this.statClicked.emit(stat);
    }
  }

  onRefresh() {
    this.refreshRequested.emit();
  }

  formatValue(value: number | string): string {
    if (typeof value === 'number') {
      // Format large numbers with K, M notation
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
      }
      return value.toString();
    }
    return value.toString();
  }

  trackByStat(index: number, stat: StatCard): string {
    return stat.type;
  }
}