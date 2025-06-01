import { Component } from '@angular/core';

import { MaterialModule } from '../../../shared/material.module';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependendency';
import Swal from 'sweetalert2';
import { SiteAdminService } from '../site-admin-service';
import { ApplicationStage, DashboardCount } from '../../../core/models/dashboard.model';
import { MatTableDataSource } from '@angular/material/table';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { ApplicationTableComponent } from './application-table/application-table.component';

// Interface for license statistics
export interface LicenseStatistics {
  slNo: number;           
  serviceName: string;   
  applied: string;       
  rejected: number;
  approved: number;       
  executed: string;      
  pending: number;        
}

// Sample data for LicenseStatistics, representing different services
const LICENSE_DATA: LicenseStatistics[] = [
  {slNo: 1, serviceName: 'New License Application', applied: '102', rejected: 0, approved: 14, executed: '9', pending: 88},
  {slNo: 2, serviceName: 'Renewal of Excise License', applied: '3,372', rejected: 0, approved: 0, executed: '3,352', pending: 20},
  {slNo: 3, serviceName: 'Label Registration of Packaged Liquor', applied: '0', rejected: 0, approved: 0, executed: '0', pending: 0},
  {slNo: 4, serviceName: 'Import of Bulk Spirit', applied: '0', rejected: 0, approved: 0, executed: '0', pending: 88},
  {slNo: 5, serviceName: 'Import of Packaged Foreign Liquor', applied: '0', rejected: 0, approved: 0, executed: '0', pending: 0},
  {slNo: 6, serviceName: 'Import Packaged Foreign Liquor from Custom Station', applied: '0', rejected: 0, approved: 0, executed: '0', pending: 0},
];

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
  pendingApplications: ApplicationStage[] = [];
  approvedApplications: ApplicationStage[] = [];
  rejectedApplications: ApplicationStage[] = [];

  constructor(
    public baseDependancy: BaseDependency, 
    protected licenseApplicationService: LicenseApplicationService 
  ) { 
    super(baseDependancy); // Calling the parent class constructor
  }

  // Table Data Sources
  statsDataSource = LICENSE_DATA; // Data source for license statistics
  pendingDataSource = new MatTableDataSource<ApplicationStage>(); // Data source for pending applications
  approvedDataSource = new MatTableDataSource<ApplicationStage>(); // Data source for approved applications
  rejectedDataSource = new MatTableDataSource<ApplicationStage>(); // Data source for rejected applications
  
  // Columns to be displayed in the tables
  statsColumns: string[] = ['slNo', 'serviceName', 'rejected', 'approved', 'executed', 'pending'];
  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];

  // Active table to display
  activeTable: 'stats' | 'pending' | 'approved' | 'rejected' = 'stats';

  // Method to switch to a specific table
  showTable(table: 'pending' | 'approved' | 'rejected') {
    this.activeTable = table;
  }

  // Method to go back to the statistics table
  goBackToStats() {
    this.activeTable = 'stats';
  }

  // Lifecycle hook to initialize data
  ngOnInit(): void {
    // Fetch dashboard counts
    this.licenseApplicationService.getDashboardCounts().subscribe({
      next: (res) => {
        this.dashboardCounts = res; // Update dashboard counts
        console.log(res)
      },
      error: (err) => {
        console.error('Failed to fetch dashboard counts', err); // Log error
      }
    });

    // Fetch applications by stage
    this.licenseApplicationService.getApplicationsByStatus().subscribe(res => {
      this.pendingDataSource.data = res.pending; 
      this.approvedDataSource.data = res.approved; 
      this.rejectedDataSource.data = res.rejected;
      console.log(this.pendingDataSource.data);
    }, error => {
      console.error('Error fetching applications:', error); // Log error
    });
  }
}