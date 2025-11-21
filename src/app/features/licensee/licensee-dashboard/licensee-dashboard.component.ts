import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module'; 
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationStatus, DashboardCount } from '../../../core/models/dashboard.model';
import { LicenseApplicationService, UnifiedApplication } from '../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationTableComponent } from './application-table/application-table.component';
import { LicenseApplication } from '../../../core/models/license-application.model';

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
export class LicenseeDashboardComponent implements OnInit{
  // Dashboard counts for applied, pending, approved, and rejected applications
  dashboardCounts: DashboardCount = { applied: 0, pending: 0, approved: 0, rejected: 0 };

  // Arrays to store applications
  appliedApplications: ApplicationStatus[] = [];
  pendingApplications: ApplicationStatus[] = [];
  approvedApplications: ApplicationStatus[] = [];
  rejectedApplications: ApplicationStatus[] = [];

  constructor(
    protected licenseAppService: LicenseApplicationService,
    private dialog: MatDialog
  ) { }

  // Table Data Sources
  appliedDataSource = new MatTableDataSource<UnifiedApplication>();
  pendingDataSource = new MatTableDataSource<UnifiedApplication>();
  approvedDataSource = new MatTableDataSource<UnifiedApplication>();
  rejectedDataSource = new MatTableDataSource<UnifiedApplication>();
  
  // Columns to be displayed in the tables
  displayedColumns: string[] = ['slNo', 'id', 'applicationType', 'currentStage', 'remarks', 'performedBy', 'actions'];

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
    // Fetch unified dashboard counts
    this.licenseAppService.getUnifiedDashboardCounts().subscribe({
      next: (res) => {
        this.dashboardCounts = res; // Update dashboard counts
      },
      error: (err) => {
        console.error('Failed to fetch dashboard counts', err);
      }
    });

    // Fetch unified applications by stage
    this.licenseAppService.getUnifiedApplicationsByStatus().subscribe(res => {
      this.appliedDataSource.data = res.applied;
      this.pendingDataSource.data = res.pending;
      this.approvedDataSource.data = res.approved;
      this.rejectedDataSource.data = res.rejected;
    }, error => {
      console.error('Error fetching applications:', error);
    });
  }
}
