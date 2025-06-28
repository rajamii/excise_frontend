import { Component } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module'; 
import { RouterModule } from '@angular/router'; 
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependency'; 
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationStatus, DashboardCount } from '../../../core/models/dashboard.model';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApplicationTableComponent } from './application-table/application-table.component';
import { LicenseApplication } from '../../../core/models/license-application.model';

@Component({
  selector: 'app-licensee-dashboard', 
  standalone: true, 
  imports: [ 
    MaterialModule, 
    RouterModule,
    MatDialogModule,
    ApplicationTableComponent 
  ],
  templateUrl: './licensee-dashboard.component.html',
  styleUrl: './licensee-dashboard.component.scss'   
})
export class LicenseeDashboardComponent extends BaseComponent{
  // Dashboard counts for applied, pending, approved, and rejected applications
  dashboardCounts: DashboardCount = { applied: 0, pending: 0, approved: 0, rejected: 0 };

  // Arrays to store applications
  appliedApplications: ApplicationStatus[] = [];
  pendingApplications: ApplicationStatus[] = [];
  approvedApplications: ApplicationStatus[] = [];
  rejectedApplications: ApplicationStatus[] = [];

  constructor(
    public baseDependancy: BaseDependency,
    protected licenseApplicationService: LicenseApplicationService,
    private dialog: MatDialog
  ) { 
    super(baseDependancy); // Calling the parent class constructor
  }

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
  goBack(){
    this.activeTable = 'default';
  }

  // Lifecycle hook to initialize data
  ngOnInit(): void {
    // Fetch dashboard counts
    this.licenseApplicationService.getDashboardCounts().subscribe({
      next: (res) => {
        this.dashboardCounts = res; // Update dashboard counts
      },
      error: (err) => {
        console.error('Failed to fetch dashboard counts', err);
      }
    });

    // Fetch applications by stage
    this.licenseApplicationService.getApplicationsByStatus().subscribe(res => {
      this.appliedDataSource.data = res.applied;
      this.pendingDataSource.data = res.pending;
      this.approvedDataSource.data = res.approved;
      this.rejectedDataSource.data = res.rejected;
    }, error => {
      console.error('Error fetching applications:', error);
    });
  }
}
