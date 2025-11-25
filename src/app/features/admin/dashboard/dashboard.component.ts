import { Component } from '@angular/core';
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

type TableView = 'stats' | 'applied' | 'pending' | 'approved' | 'rejected';
type ApplicationType = 'license' | 'new_license' | 'salesman_barman';

interface ApplicationTypeOption {
  value: ApplicationType;
  label: string;
}

@Component({
  selector: 'app-dashboard', 
  standalone: true,         
  imports: [MaterialModule, ApplicationTableComponent], 
  templateUrl: './dashboard.component.html', 
  styleUrls: ['./dashboard.component.scss'], 
})
export class DashboardComponent extends BaseComponent {
  // Dashboard counts for pending, approved, and rejected applications
  dashboardCounts: DashboardCount = { pending: 0, approved: 0, rejected: 0 };

  // Arrays to store applications 
  appliedApplications: ApplicationStatus[] = [];
  pendingApplications: ApplicationStatus[] = [];
  approvedApplications: ApplicationStatus[] = [];
  rejectedApplications: ApplicationStatus[] = [];

  // Application Type Filter
  selectedApplicationType: ApplicationType = 'license'; // Default to License Application
  applicationTypes: ApplicationTypeOption[] = [
    { value: 'license', label: 'License Application' },
    { value: 'new_license', label: 'New License Application' },
    { value: 'salesman_barman', label: 'Salesman/Barman Application' }
  ];

  // Loading state
  isLoading = false;

  constructor(
    public baseDependancy: BaseDependency,
    public override salesmanBarmanService: SalesmanBarmanRegistrationService
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
    this.loadDashboardData();
  }

  // Method to handle application type change
  onApplicationTypeChange(): void {
    this.activeTable = 'stats'; // Reset to stats view when filter changes
    this.loadDashboardData();
  }

  // Load dashboard data based on selected application type
  loadDashboardData(): void {
    this.isLoading = true;

    // Determine which service to call based on selected type
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
          pending: result.counts.pending || 0,
          approved: result.counts.approved || 0,
          rejected: result.counts.rejected || 0
        };
        this.updateDataSources(result.applications);
        console.log(`${this.getApplicationTypeLabel()} data loaded:`, result);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        // Reset to default values on error
        this.dashboardCounts = { pending: 0, approved: 0, rejected: 0 };
        this.clearDataSources();
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
            return of({ pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      case 'new_license':
        return this.licenseAppService.getNewLicenseDashboardCounts().pipe(
          catchError(err => {
            console.error('Failed to fetch new license application counts:', err);
            return of({ pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      case 'salesman_barman':
        return this.salesmanBarmanService.getDashboardCounts().pipe(
          catchError(err => {
            console.error('Failed to fetch salesman/barman application counts:', err);
            return of({ pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      default:
        return of({ pending: 0, approved: 0, rejected: 0 });
    }
  }

  // Get applications observable based on selected application type
  private getApplicationsObservable() {
    switch (this.selectedApplicationType) {
      case 'license':
        return this.licenseAppService.getApplicationsByStatus().pipe(
          catchError(err => {
            console.error('Failed to fetch license applications:', err);
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        );
      
      case 'new_license':
        return this.licenseAppService.getNewLicenseApplicationsByStatus().pipe(
          catchError(err => {
            console.error('Failed to fetch new license applications:', err);
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        );
      
      case 'salesman_barman':
        return this.salesmanBarmanService.getApplicationsByStatus().pipe(
          catchError(err => {
            console.error('Failed to fetch salesman/barman applications:', err);
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        );
      
      default:
        return of({ applied: [], pending: [], approved: [], rejected: [] });
    }
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
    const option = this.applicationTypes.find(t => t.value === this.selectedApplicationType);
    return option ? option.label : 'Application';
  }
}