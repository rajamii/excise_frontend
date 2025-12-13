import { Component, ViewChild } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependency';
import { ApplicationStatus, DashboardCount } from '../../../core/models/dashboard.model';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationTableComponent } from './application-table/application-table.component';
import { LICENSE_DATA } from '../../../core/models/license-stats.model';
import { of, forkJoin } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LicenseApplication } from '../../../core/models/license-application.model';
import { SalesmanBarmanRegistrationService } from '../../../core/services/salesman-barman-registration.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { MatSnackBar } from '@angular/material/snack-bar';

type TableView = 'stats' | 'applied' | 'pending' | 'approved' | 'rejected';
type ApplicationType = 'license' | 'new_license' | '/salesman_barman/';

interface ApplicationTypeOption {
  value: ApplicationType;
  label: string;
  requiresPermission?: string;
}

@Component({
  selector: 'app-dashboard', 
  standalone: true,         
  imports: [MaterialModule, ApplicationTableComponent, BaseChartDirective], 
  templateUrl: './dashboard.component.html', 
  styleUrls: ['./dashboard.component.scss'], 
})
export class DashboardComponent extends BaseComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Dashboard counts for pending, approved, and rejected applications
  dashboardCounts: DashboardCount = { applied: 0, pending: 0, approved: 0, rejected: 0 };

  // Arrays to store applications 
  appliedApplications: ApplicationStatus[] = [];
  pendingApplications: ApplicationStatus[] = [];
  approvedApplications: ApplicationStatus[] = [];
  rejectedApplications: ApplicationStatus[] = [];

  // Application Type Filter
  selectedApplicationType: ApplicationType = 'license';
  applicationTypes: ApplicationTypeOption[] = [
    { value: 'license', label: 'License Application' },
    { value: 'new_license', label: 'New License Application' },
    { 
      value: '/salesman_barman/', 
      label: 'Salesman/Barman Application',
      requiresPermission: 'SALESMAN_BARMAN_ACCESS'
    }
  ];

  // Available application types after permission check
  availableApplicationTypes: ApplicationTypeOption[] = [];

  // Loading state
  isLoading = false;

  // Chart Configuration - Data and Behavior Only
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Applied', 'Pending', 'Approved', 'Rejected'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        label: 'Applications',
        backgroundColor: [
          'rgba(28, 43, 120, 0.8)',
          'rgba(231, 184, 0, 0.8)',
          'rgba(9, 255, 0, 0.8)',
          'rgba(255, 0, 0, 0.8)'
        ],
        borderColor: [
          'rgba(28, 43, 120, 1)',
          'rgba(231, 184, 0, 1)',
          'rgba(9, 255, 0, 1)',
          'rgba(255, 0, 0, 1)'
        ],
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: [
          'rgba(28, 43, 120, 0.9)',
          'rgba(231, 184, 0, 0.9)',
          'rgba(9, 255, 0, 0.9)',
          'rgba(255, 0, 0, 0.9)'
        ]
      }
    ]
  };

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.8,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 14,
            weight: 'bold'
          },
          color: '#1C2B78',
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(28, 43, 120, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#1C2B78',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            const value = context.parsed.y ?? 0;
            label += value + ' application(s)';
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 13,
            weight: 'bold'
          },
          color: '#1C2B78'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 12
          },
          color: '#666',
          callback: (tickValue: string | number | undefined) => {
            if (typeof tickValue === 'number' && Number.isInteger(tickValue)) {
              return tickValue;
            }
            return null;
          }
        },
        grid: {
          color: 'rgba(28, 43, 120, 0.1)'
        }
      } as any
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  };

  public barChartType: ChartConfiguration<'bar'>['type'] = 'bar';

  constructor(
    public baseDependancy: BaseDependency,
    public override salesmanBarmanService: SalesmanBarmanRegistrationService,
    private snackBar: MatSnackBar
  ) { 
    super(baseDependancy);
  }

  // Table Data Sources
  statsDataSource = LICENSE_DATA;
  appliedDataSource = new MatTableDataSource<LicenseApplication>();
  pendingDataSource = new MatTableDataSource<LicenseApplication>();
  approvedDataSource = new MatTableDataSource<LicenseApplication>();
  rejectedDataSource = new MatTableDataSource<LicenseApplication>();
  
  // Columns to be displayed in the tables
  statsColumns: string[] = ['slNo', 'serviceName', 'rejected', 'approved', 'executed', 'pending'];
  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];

  // Active table to display
  activeTable: TableView = 'stats';

  // Method to switch to a specific table
  showTable(table: Exclude<TableView, 'stats'>) {
    this.activeTable = table;
  }

  // Method to go back to the statistics table
  goBackToStats() {
    this.activeTable = 'stats';
  }

  // Lifecycle hook to initialize data
  ngOnInit(): void {
    this.checkUserPermissions();
    this.loadDashboardData();
  }

  // Check user permissions and filter available application types
  private checkUserPermissions(): void {
    // Get user account asynchronously (identity() returns Observable<Account | null>)
    this.accountService.identity().subscribe(
      (user) => {
        // Account type may not expose 'authorities' directly; cast to any and also fallback to 'roles' if present
        const authorities: string[] = ((user as any)?.authorities ?? (user as any)?.roles) ?? [];

        // Filter application types based on permissions
        this.availableApplicationTypes = this.applicationTypes.filter(type => {
          // If no permission required, include it
          if (!type.requiresPermission) {
            return true;
          }

          // Check if user has the required permission
          return authorities.some(auth => auth === type.requiresPermission);
        });

        // If current selection is not available, default to first available
        const isCurrentTypeAvailable = this.availableApplicationTypes.some(
          type => type.value === this.selectedApplicationType
        );

        if (!isCurrentTypeAvailable && this.availableApplicationTypes.length > 0) {
          this.selectedApplicationType = this.availableApplicationTypes[0].value;
        }
      },
      (err) => {
        console.error('Failed to get user identity:', err);
        // Fallback: include only non-restricted types
        this.availableApplicationTypes = this.applicationTypes.filter(t => !t.requiresPermission);
        if (this.availableApplicationTypes.length > 0) {
          this.selectedApplicationType = this.availableApplicationTypes[0].value;
        }
      }
    );
  }

  // Method to handle application type change
  onApplicationTypeChange(): void {
    this.activeTable = 'stats';
    this.loadDashboardData();
  }

  // Update chart data
  updateChartData(): void {
    this.barChartData.datasets[0].data = [
      this.dashboardCounts.applied ?? 0,
      this.dashboardCounts.pending ?? 0,
      this.dashboardCounts.approved ?? 0,
      this.dashboardCounts.rejected ?? 0
    ];
    
    if (this.chart) {
      this.chart.update();
    }
  }

  // Load dashboard data based on selected application type
  loadDashboardData(): void {
    this.isLoading = true;

    const countsObservable = this.getCountsObservable();
    const applicationsObservable = this.getApplicationsObservable();

    forkJoin({
      counts: countsObservable,
      applications: applicationsObservable
    })
    .pipe(
      finalize(() => {
        this.isLoading = false;
      })
    )
    .subscribe({
      next: (result) => {
        this.dashboardCounts = {
          applied: result.counts.applied || 0,
          pending: result.counts.pending || 0,
          approved: result.counts.approved || 0,
          rejected: result.counts.rejected || 0
        };
        this.updateDataSources(result.applications);
        this.updateChartData();
        console.log(`${this.getApplicationTypeLabel()} data loaded:`, result);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.dashboardCounts = { applied: 0, pending: 0, approved: 0, rejected: 0 };
        this.clearDataSources();
        this.updateChartData();
        
        // Show user-friendly error message
        this.showErrorMessage('Failed to load dashboard data. Please try again.');
      }
    });
  }

  // Get counts observable based on selected application type
  private getCountsObservable() {
    switch (this.selectedApplicationType) {
      case 'license':
        return this.licenseAppService.getDashboardCounts().pipe(
          catchError(err => {
            console.error('Failed to fetch license application counts:', err);
            this.handleApiError(err, 'license application counts');
            return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      case 'new_license':
        return this.licenseAppService.getNewLicenseDashboardCounts().pipe(
          catchError(err => {
            console.error('Failed to fetch new license application counts:', err);
            this.handleApiError(err, 'new license application counts');
            return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      case '/salesman_barman/':
        return this.salesmanBarmanService.getDashboardCounts().pipe(
          catchError(err => {
            console.error('Failed to fetch salesman/barman application counts:', err);
            this.handleApiError(err, 'salesman/barman application counts');
            return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      default:
        return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
    }
  }

  // Get applications observable based on selected application type
  private getApplicationsObservable() {
    switch (this.selectedApplicationType) {
      case 'license':
        return this.licenseAppService.getApplicationsByStatus().pipe(
          catchError(err => {
            console.error('Failed to fetch license applications:', err);
            this.handleApiError(err, 'license applications');
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        );
      
      case 'new_license':
        return this.licenseAppService.getNewLicenseApplicationsByStatus().pipe(
          catchError(err => {
            console.error('Failed to fetch new license applications:', err);
            this.handleApiError(err, 'new license applications');
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        );
      
      case '/salesman_barman/':
        return this.salesmanBarmanService.getApplicationsByStatus().pipe(
          catchError(err => {
            console.error('Failed to fetch salesman/barman applications:', err);
            this.handleApiError(err, 'salesman/barman applications');
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        );
      
      default:
        return of({ applied: [], pending: [], approved: [], rejected: [] });
    }
  }

  // Handle API errors with appropriate user messages
  private handleApiError(error: any, resourceType: string): void {
    if (error.status === 403) {
      this.showPermissionError(resourceType);
    } else if (error.status === 404) {
      console.log(`No ${resourceType} found`);
    } else {
      console.error(`Error fetching ${resourceType}:`, error);
    }
  }

  // Show permission error to user
  private showPermissionError(resourceType: string): void {
    const message = `You don't have permission to access ${resourceType}. Please contact your administrator.`;
    
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Show generic error message
  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Update data sources with fetched applications
  private updateDataSources(applications: any): void {
    this.appliedDataSource.data = applications.applied || [];
    this.pendingDataSource.data = applications.pending || [];
    this.approvedDataSource.data = applications.approved || [];
    this.rejectedDataSource.data = applications.rejected || [];
  }

  // Clear all data sources
  private clearDataSources(): void {
    this.appliedDataSource.data = [];
    this.pendingDataSource.data = [];
    this.approvedDataSource.data = [];
    this.rejectedDataSource.data = [];
  }

  // Get human-readable label for current application type
  getApplicationTypeLabel(): string {
    const option = this.availableApplicationTypes.find(t => t.value === this.selectedApplicationType);
    return option ? option.label : 'Application';
  }
}