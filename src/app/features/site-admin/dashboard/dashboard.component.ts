import { Component } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependendency';
import { ApplicationStage, DashboardCount } from '../../../core/models/dashboard.model';
import { MatTableDataSource } from '@angular/material/table';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { ApplicationTableComponent } from './application-table/application-table.component';
import { LICENSE_DATA } from '../../../core/models/license-stats.model';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type TableView = 'stats' | 'pending' | 'approved' | 'rejected';

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
    // Fetch dashboard counts
    this.licenseApplicationService.getDashboardCounts()
    .pipe(
      catchError(err => {
        console.error('Failed to fetch dashboard counts:', err);
        // Provide a fallback default value
        return of({ pending: 0, approved: 0, rejected: 0 });
      })
    )
    .subscribe(res => {
      this.dashboardCounts = res;
    });

    // Fetch applications by stage
    this.licenseApplicationService.getApplicationsByStatus().subscribe(res => {
      this.pendingDataSource.data = res.pending; 
      this.approvedDataSource.data = res.approved; 
      this.rejectedDataSource.data = res.rejected;
    }, error => {
      console.error('Error fetching applications:', error); // Log error
    });
  }
}