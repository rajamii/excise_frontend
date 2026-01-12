import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationStatus, DashboardCount } from '../../../core/models/dashboard.model';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationTableComponent } from './application-table/application-table.component';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { UnifiedDashboardService } from '../../../core/services/unified-dashboard.service';
import { UnifiedApplication } from '../../../core/models/unified-application.model';

type ApplicationType = 'license' | 'new_license' | 'salesman_barman';

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

  // Loading state
  isLoading = false;

  constructor(
    protected licenseAppService: LicenseApplicationService,
    private unifiedService: UnifiedDashboardService,
    private dialog: MatDialog
  ) { }

  // Table Data Sources
  appliedDataSource = new MatTableDataSource<UnifiedApplication>();
  pendingDataSource = new MatTableDataSource<UnifiedApplication>();
  approvedDataSource = new MatTableDataSource<UnifiedApplication>();
  rejectedDataSource = new MatTableDataSource<UnifiedApplication>();

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
    return this.unifiedService.getUnifiedDashboardCounts();
  }

  // Get applications observable based on selected application type  
  private getApplicationsObservable() {
    return this.unifiedService.getUnifiedApplicationsByStatus();
  }

  // Update data sources with fetched applications
  private updateDataSources(result: {
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }): void {
    this.appliedDataSource.data = result.applied || [];
    this.pendingDataSource.data = result.pending || [];
    this.approvedDataSource.data = result.approved || [];
    this.rejectedDataSource.data = result.rejected || [];
  }

  // Clear all data sources
  private clearDataSources(): void {
    this.appliedDataSource.data = [];
    this.pendingDataSource.data = [];
    this.approvedDataSource.data = [];
    this.rejectedDataSource.data = [];
  }
}