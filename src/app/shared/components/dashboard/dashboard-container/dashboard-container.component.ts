import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, takeUntil, interval, switchMap } from 'rxjs';

import { DashboardConfig, DashboardWidget, StatCard, User } from '../../../../core/models/dashboard.models';
import { RoleService } from '../../../../core/services/role.service';
import { StatsOverviewComponent } from '../widgets/stats-overview/stats-overview.component';
import { ChartWidgetComponent } from '../widgets/chart-widget/chart-widget.component';
import { TableWidgetComponent } from '../widgets/table-widget/table-widget.component';
import { ApplicationStatsComponent } from '../widgets/application-stats/application-stats.component';

@Component({
  selector: 'app-dashboard-container',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    StatsOverviewComponent,
    ChartWidgetComponent,
    TableWidgetComponent,
    ApplicationStatsComponent
  ],
  templateUrl: './dashboard-container.component.html',
  styleUrls: ['./dashboard-container.component.scss']
})
export class DashboardContainerComponent implements OnInit, OnDestroy {
  @Input() config!: DashboardConfig;
  @Input() user!: User;
  @Input() data: any;

  private destroy$ = new Subject<void>();
  
  widgetData: { [widgetId: string]: any } = {};
  widgetLoading: { [widgetId: string]: boolean } = {};
  
  // Application type filter (for backward compatibility)
  selectedApplicationType = 'all';
  applicationTypes = [
    { value: 'all', label: 'All Applications' },
    { value: 'new_license', label: 'New License' },
    { value: 'renewal', label: 'Renewal' },
    { value: 'modification', label: 'Modification' }
  ];

  constructor(
    public roleService: RoleService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initializeWidgets();
    this.loadAllWidgetData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeWidgets() {
    // Initialize loading states
    this.config.widgets.forEach(widget => {
      this.widgetLoading[widget.id] = false;
      this.widgetData[widget.id] = null;
    });
  }

  private loadAllWidgetData() {
    this.config.widgets.forEach(widget => {
      this.loadWidgetData(widget);
      
      // Set up auto-refresh if specified
      if (widget.data.refreshInterval) {
        interval(widget.data.refreshInterval * 1000)
          .pipe(
            takeUntil(this.destroy$),
            switchMap(() => this.loadWidgetDataObservable(widget))
          )
          .subscribe(data => {
            this.widgetData[widget.id] = data;
            this.widgetLoading[widget.id] = false;
            this.cdr.detectChanges();
          });
      }
    });
  }

  private loadWidgetData(widget: DashboardWidget) {
    if (!widget.data.endpoint) {
      return;
    }

    this.widgetLoading[widget.id] = true;
    
    this.loadWidgetDataObservable(widget)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.widgetData[widget.id] = data;
          this.widgetLoading[widget.id] = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(`Error loading data for widget ${widget.id}:`, error);
          this.widgetLoading[widget.id] = false;
          // Set mock data for development
          this.widgetData[widget.id] = this.getMockData(widget);
          this.cdr.detectChanges();
        }
      });
  }

  private loadWidgetDataObservable(widget: DashboardWidget) {
    const params: any = {};
    
    // Add application type filter if applicable
    if (this.selectedApplicationType !== 'all') {
      params.applicationType = this.selectedApplicationType;
    }

    return this.http.get(widget.data.endpoint!, { params });
  }

  private getMockData(widget: DashboardWidget): any {
    // Return mock data based on widget type for development
    switch (widget.type) {
      case 'stats-overview':
        return {
          applied: Math.floor(Math.random() * 100) + 50,
          pending: Math.floor(Math.random() * 50) + 20,
          approved: Math.floor(Math.random() * 80) + 30,
          rejected: Math.floor(Math.random() * 20) + 5,
          executed: Math.floor(Math.random() * 60) + 25,
          total: Math.floor(Math.random() * 200) + 100
        };
      
      case 'chart-widget':
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Applications',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
            borderColor: 'rgba(33, 150, 243, 1)',
            borderWidth: 2
          }]
        };
      
      case 'table-widget':
        return [
          { id: 1, name: 'Application 1', status: 'Pending', date: '2024-01-15' },
          { id: 2, name: 'Application 2', status: 'Approved', date: '2024-01-14' },
          { id: 3, name: 'Application 3', status: 'Under Review', date: '2024-01-13' }
        ];
      
      default:
        return {};
    }
  }

  // Event handlers
  onStatClicked(widget: DashboardWidget, stat: StatCard) {
    if (stat.route) {
      this.router.navigate([stat.route]);
    }
  }

  onWidgetRefresh(widget: DashboardWidget) {
    this.loadWidgetData(widget);
  }

  onWidgetFullscreen(widget: DashboardWidget) {
    // TODO: Implement fullscreen functionality
    console.log('Fullscreen requested for widget:', widget.id);
  }

  onWidgetExport(widget: DashboardWidget) {
    // TODO: Implement export functionality
    console.log('Export requested for widget:', widget.id);
  }

  onTableRowClick(widget: DashboardWidget, row: any) {
    // TODO: Implement row click handling
    console.log('Row clicked in widget:', widget.id, row);
  }

  onApplicationStatClicked(widget: DashboardWidget, stat: any) {
    // Navigate to applications filtered by stat type
    if (stat.type && this.router) {
      this.router.navigate(['/applications'], { 
        queryParams: { status: stat.type } 
      });
    }
  }

  onApplicationTypeChange() {
    // Reload all widgets when filter changes
    this.loadAllWidgetData();
  }

  // Helper methods
  hasPermission(permissions: string[]): boolean {
    return this.roleService.hasAnyPermission(permissions);
  }

  getVisibleWidgets(): DashboardWidget[] {
    return this.config.widgets.filter(widget => 
      this.hasPermission(widget.permissions) && 
      (widget.isVisible !== false)
    );
  }

  getApplicationTypeLabel(): string {
    const type = this.applicationTypes.find(t => t.value === this.selectedApplicationType);
    return type?.label || 'All Applications';
  }

  // Widget type checks
  isStatsWidget(widget: DashboardWidget): boolean {
    return widget.type === 'stats-overview';
  }

  isApplicationStatsWidget(widget: DashboardWidget): boolean {
    return widget.type === 'application-stats';
  }

  isChartWidget(widget: DashboardWidget): boolean {
    return widget.type === 'chart-widget';
  }

  isTableWidget(widget: DashboardWidget): boolean {
    return widget.type === 'table-widget';
  }

  // Grid layout helpers
  getWidgetGridClass(widget: DashboardWidget): string {
    const classes = [];
    
    if (widget.position.colspan) {
      classes.push(`col-span-${widget.position.colspan}`);
    }
    
    if (widget.position.rowspan) {
      classes.push(`row-span-${widget.position.rowspan}`);
    }
    
    classes.push(`widget-${widget.size.width}`);
    classes.push(`widget-${widget.size.height}`);
    
    return classes.join(' ');
  }

  trackByWidget(index: number, widget: DashboardWidget): string {
    return widget.id;
  }

  // Table helper methods
  getTableColumns(data: any[]): any[] {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => ({
      key,
      label: this.formatColumnLabel(key)
    }));
  }

  getTableColumnKeys(data: any[]): string[] {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }

  private formatColumnLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}