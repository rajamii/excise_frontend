import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module'; 
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationStatus, DashboardCount } from '../../../core/models/dashboard.model';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationTableComponent } from './application-table/application-table.component';
import { LicenseApplication } from '../../../core/models/license-application.model';
import { of, forkJoin } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

type ApplicationType = 'license' | 'new_license';

interface ApplicationTypeOption {
  value: ApplicationType;
  label: string;
}

@Component({
  selector: 'app-licensee-dashboard', 
  standalone: true, 
  imports: [ 
    MaterialModule, 
    ApplicationTableComponent 
  ],
  templateUrl: './licensee-dashboard.component.html',
  styleUrl: './licensee-dashboard.component.scss'   
})
export class LicenseeDashboardComponent implements OnInit {
  // Dashboard counts for applied, pending, approved, and rejected applications
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
    { value: 'new_license', label: 'New License Application' }
  ];

  // Loading state
  isLoading = false;

  constructor(
    protected licenseAppService: LicenseApplicationService,
    private dialog: MatDialog
  ) { }

  // Table Data Sources
  appliedDataSource = new MatTableDataSource<LicenseApplication>();
  pendingDataSource = new MatTableDataSource<LicenseApplication>();
  approvedDataSource = new MatTableDataSource<LicenseApplication>();
  rejectedDataSource = new MatTableDataSource<LicenseApplication>();
  
  // Columns to be displayed in the tables
  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];

  // Active table to display
  activeTable: 'default' | 'applied' | 'pending' | 'approved' | 'rejected' = 'default';

  // Method to switch to a specific table
  showTable(table: 'applied' | 'pending' | 'approved' | 'rejected') {
    this.activeTable = table;
  }

  // Method to go back to the default page
  goBack() {
    this.activeTable = 'default';
  }

  // Lifecycle hook to initialize data
  ngOnInit(): void {
    this.loadDashboardData();
  }

  // Method to handle application type change
  onApplicationTypeChange(): void {
    this.activeTable = 'default';
    this.loadDashboardData();
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
        console.log(`${this.getApplicationTypeLabel()} data loaded:`, result);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.dashboardCounts = { applied: 0, pending: 0, approved: 0, rejected: 0 };
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
            return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      case 'new_license':
        return this.licenseAppService.getNewLicenseDashboardCounts().pipe(
          catchError(err => {
            console.error('Failed to fetch new license application counts:', err);
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