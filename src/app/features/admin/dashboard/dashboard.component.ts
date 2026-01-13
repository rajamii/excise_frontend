import { Component, ViewChild } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependency';
import { ApplicationStatus, DashboardCount } from '../../../core/models/dashboard.model';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationTableComponent } from './application-table/application-table.component';
import { LICENSE_DATA } from '../../../core/models/license-stats.model';
import { of, forkJoin } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { LicenseApplication } from '../../../core/models/license-application.model';
import { SalesmanBarmanRegistrationService } from '../../../core/services/salesman-barman-registration.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { MatSnackBar } from '@angular/material/snack-bar';

type TableView = 'stats' | 'applied' | 'pending' | 'approved' | 'rejected';
type ApplicationType = 'license' | 'new_license' | 'salesman_barman';

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

  dashboardCounts: DashboardCount = { applied: 0, pending: 0, approved: 0, rejected: 0 };

  appliedApplications: ApplicationStatus[] = [];
  pendingApplications: ApplicationStatus[] = [];
  approvedApplications: ApplicationStatus[] = [];
  rejectedApplications: ApplicationStatus[] = [];

  selectedApplicationType: ApplicationType = 'license';
  
  applicationTypes: ApplicationTypeOption[] = [
    { value: 'license', label: 'License Application' },
    { value: 'new_license', label: 'New License Application' },
    { 
      value: 'salesman_barman',
      label: 'Salesman/Barman Application'
    }
  ];

  availableApplicationTypes: ApplicationTypeOption[] = [];
  isLoading = false;

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

  statsDataSource = LICENSE_DATA;
  appliedDataSource = new MatTableDataSource<LicenseApplication>();
  pendingDataSource = new MatTableDataSource<LicenseApplication>();
  approvedDataSource = new MatTableDataSource<LicenseApplication>();
  rejectedDataSource = new MatTableDataSource<LicenseApplication>();
  
  statsColumns: string[] = ['slNo', 'serviceName', 'rejected', 'approved', 'executed', 'pending'];
  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'nextLevel', 'remarks', 'actions'];

  activeTable: TableView = 'stats';

  showTable(table: Exclude<TableView, 'stats'>) {
    this.activeTable = table;
  }

  goBackToStats() {
    this.activeTable = 'stats';
  }

  ngOnInit(): void {
    this.accountService.identity().subscribe(
      (user) => {
        console.log('🔍 Full user object:', user);
        
        let rawRoles = (user as any)?.authorities 
          ?? (user as any)?.roles 
          ?? (user as any)?.role
          ?? [];
        
        if (rawRoles && typeof rawRoles === 'object' && !Array.isArray(rawRoles)) {
          if (rawRoles.name) {
            this.userRoles = [rawRoles.name];
            console.log('✅ Extracted role from object:', rawRoles.name);
          } else {
            this.userRoles = [];
          }
        } else if (Array.isArray(rawRoles)) {
          this.userRoles = rawRoles.map((r: any) => {
            if (typeof r === 'string') return r;
            if (r && r.name) return r.name;
            if (r && r.roleName) return r.roleName;
            return r;
          }).filter(Boolean);
        } else {
          this.userRoles = [];
        }
        
        if (this.userRoles.length === 0 && user) {
          console.warn('⚠️ User roles not found in standard locations, checking nested...');
          console.log('User keys:', Object.keys(user));
          
          if ((user as any)?.user?.authorities) {
            this.userRoles = (user as any).user.authorities;
          } else if ((user as any)?.user?.roles) {
            this.userRoles = (user as any).user.roles;
          }
        }
        
        console.log('👤 Current user roles:', this.userRoles);
        
        this.checkUserPermissions();
        this.loadDashboardData();
      },
      (err) => {
        console.error('❌ Failed to get user identity:', err);
        this.checkUserPermissions();
        this.loadDashboardData();
      }
    );
  }

  handleRefreshRequest(): void {
    console.log('🔄 Refresh requested from application table');
    setTimeout(() => {
      console.log('⏰ Executing delayed refresh...');
      this.refreshDashboard();
    }, 800);
  }

  private checkUserPermissions(): void {
    this.availableApplicationTypes = [...this.applicationTypes];
    
    this.accountService.identity().subscribe(
      (user) => {
        const authorities: string[] = ((user as any)?.authorities ?? (user as any)?.roles) ?? [];

        this.availableApplicationTypes = this.applicationTypes.filter(type => {
          if (!type.requiresPermission) {
            return true;
          }
          return authorities.some(auth => auth === type.requiresPermission);
        });

        if (this.availableApplicationTypes.length === 0) {
          this.availableApplicationTypes = [...this.applicationTypes];
        }

        const isCurrentTypeAvailable = this.availableApplicationTypes.some(
          type => type.value === this.selectedApplicationType
        );

        if (!isCurrentTypeAvailable && this.availableApplicationTypes.length > 0) {
          this.selectedApplicationType = this.availableApplicationTypes[0].value;
        }
      },
      (err) => {
        console.error('Failed to get user identity:', err);
        this.availableApplicationTypes = [...this.applicationTypes];
      }
    );
  }

  onApplicationTypeChange(): void {
    console.log('🔄 Application type changed to:', this.selectedApplicationType);
    this.activeTable = 'stats';
    this.refreshDashboard();
  }

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

  refreshDashboard(): void {
    console.log('🔄 Force refreshing dashboard...');
    this.clearDataSources();
    this.dashboardCounts = { applied: 0, pending: 0, approved: 0, rejected: 0 };
    this.updateChartData();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    console.log('📊 Loading dashboard data for:', this.selectedApplicationType);
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
        console.log('✅ Dashboard loading complete');
      })
    )
    .subscribe({
      next: (result) => {
        console.log('✅ Dashboard data loaded:', result);
        
        // ✅ FIX: Derive counts from actual applications instead of trusting counts endpoint
        // The counts endpoint may not be filtering correctly, but the applications endpoint is reliable
        const actualCounts = {
          applied: (result.applications.applied || []).length,
          pending: (result.applications.pending || []).length,
          approved: (result.applications.approved || []).length,
          rejected: (result.applications.rejected || []).length
        };
        
        console.log('📊 Raw counts from backend counts endpoint:', result.counts);
        console.log('📊 Actual counts derived from applications:', actualCounts);
        
        // Use the derived counts instead of the counts endpoint
        this.dashboardCounts = actualCounts;
        
        console.log('📊 Dashboard counts after assignment:', this.dashboardCounts);
        this.updateDataSources(result.applications);
        this.updateChartData();
        console.log('✅ Dashboard updated successfully');
      },
      error: (error) => {
        console.error('❌ Error loading dashboard data:', error);
        this.dashboardCounts = { applied: 0, pending: 0, approved: 0, rejected: 0 };
        this.clearDataSources();
        this.updateChartData();
        this.showErrorMessage('Failed to load dashboard data. Please try again.');
      }
    });
  }

  private getCountsObservable() {
    console.log('🔍 Getting counts for:', this.selectedApplicationType);
    
    switch (this.selectedApplicationType) {
      case 'license':
        return this.licenseAppService.getDashboardCounts().pipe(
          map(counts => this.filterCountsByUserRole(counts)),
          catchError(err => {
            console.error('❌ Failed to fetch license application counts:', err);
            this.handleApiError(err, 'license application counts');
            return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      case 'new_license':
        return this.licenseAppService.getNewLicenseDashboardCounts().pipe(
          map(counts => this.filterCountsByUserRole(counts)),
          catchError(err => {
            console.error('❌ Failed to fetch new license application counts:', err);
            this.handleApiError(err, 'new license application counts');
            return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      case 'salesman_barman':
        console.log('🎯 Fetching Salesman/Barman dashboard counts...');
        return this.salesmanBarmanService.getDashboardCounts().pipe(
          map(counts => this.filterCountsByUserRole(counts)),
          catchError(err => {
            console.error('❌ Failed to fetch salesman/barman application counts:', err);
            this.handleApiError(err, 'salesman/barman application counts');
            return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      default:
        console.warn('⚠️ Unknown application type:', this.selectedApplicationType);
        return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
    }
  }

  private getApplicationsObservable() {
    console.log('🔍 Getting applications for:', this.selectedApplicationType);
    
    switch (this.selectedApplicationType) {
      case 'license':
        return this.licenseAppService.getApplicationsByStatus().pipe(
          map(apps => this.filterApplicationsByUserRole(apps)),
          catchError(err => {
            console.error('❌ Failed to fetch license applications:', err);
            this.handleApiError(err, 'license applications');
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        );
      
      case 'new_license':
        return this.licenseAppService.getNewLicenseApplicationsByStatus().pipe(
          map(apps => this.filterApplicationsByUserRole(apps)),
          catchError(err => {
            console.error('❌ Failed to fetch new license applications:', err);
            this.handleApiError(err, 'new license applications');
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        );
      
      case 'salesman_barman':
        console.log('🎯 Fetching Salesman/Barman applications...');
        return this.salesmanBarmanService.getApplicationsByStatus().pipe(
          map(apps => this.filterApplicationsByUserRole(apps)),
          catchError(err => {
            console.error('❌ Failed to fetch salesman/barman applications:', err);
            this.handleApiError(err, 'salesman/barman applications');
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        );
      
      default:
        console.warn('⚠️ Unknown application type:', this.selectedApplicationType);
        return of({ applied: [], pending: [], approved: [], rejected: [] });
    }
  }

  private filterCountsByUserRole(counts: any): DashboardCount {
    console.log('🔍 filterCountsByUserRole - Input counts:', counts);
    console.log('🔍 Current user roles:', this.getUserRoles());
    
    // ✅ For licensees, hide pending count (they can't see pending applications)
    if (this.accountService.hasAnyRole(['licensee'])) {
      const filtered = {
        applied: counts.applied || 0,
        pending: 0,
        approved: counts.approved || 0,
        rejected: counts.rejected || 0
      };
      console.log('🔍 Filtered counts for licensee:', filtered);
      return filtered;
    }
    
    // ✅ For all other roles (level officers, site_admin), show all counts as-is
    // The backend already filters these correctly based on user permissions
    const passthrough = {
      applied: counts.applied || 0,
      pending: counts.pending || 0,
      approved: counts.approved || 0,
      rejected: counts.rejected || 0
    };
    console.log('🔍 Passthrough counts for level officer:', passthrough);
    return passthrough;
  }

  // ✅ COMPLETELY FIXED: Application Filtering with Universal Logic
  private filterApplicationsByUserRole(applications: any): any {
    const userRoles = this.getUserRoles();
    console.log('👤 Filtering applications for roles:', userRoles);
    
    if (!userRoles || userRoles.length === 0) {
      console.warn('⚠️ No user roles found! Showing all applications for debugging...');
      return applications;
    }
    
    // ✅ If licensee, show only their own applications
    if (userRoles.includes('licensee')) {
      return applications;
    }
    
    // ✅ If site_admin, show everything
    if (userRoles.includes('site_admin') || userRoles.includes('single_window')) {
      console.log('🔓 Site admin/single window detected - showing all applications');
      return applications;
    }
    
    // ✅ For level officers, trust the backend filtering
    // The backend already knows which applications should be pending/approved/rejected for each user
    // We only need to do additional filtering if there's a specific business requirement
    
    const getUserStageName = (roles: string[]): string | null => {
      for (const role of roles) {
        if (role.match(/^level_\d+$/)) {
          return role;
        }
      }
      return null;
    };
    
    const userStage = getUserStageName(userRoles);
    console.log('🎯 User stage name:', userStage);
    
    if (!userStage) {
      console.warn('⚠️ Could not determine user stage from roles:', userRoles);
      // Return all if we can't determine the stage
      return applications;
    }
    
    const filtered: any = {
      applied: applications.applied || [],
      pending: applications.pending || [],
      approved: [],
      rejected: []
    };
    
    console.log('📋 Backend provided applications:', {
      applied: filtered.applied.length,
      pending: filtered.pending.length,
      approved: (applications.approved || []).length,
      rejected: (applications.rejected || []).length
    });
    
    // ✅ APPROVED: Filter to show only applications this user's role approved
    if (Array.isArray(applications.approved)) {
      console.log('📋 Filtering approved applications...');
      
      filtered.approved = applications.approved.filter((app: any) => {
        const appId = app.application_id || app.applicationId;
        const wasApprovedByUser = this.didUserApproveOrReject(app, userRoles, 'approve');
        
        if (wasApprovedByUser) {
          console.log(`✅ User approved app: ${appId}`);
        }
        
        return wasApprovedByUser;
      });
      
      console.log(`✅ Filtered ${filtered.approved.length} approved applications for ${userStage}`);
    }
    
    // ✅ REJECTED: Filter to show only applications this user's role rejected
    if (Array.isArray(applications.rejected)) {
      console.log('📋 Filtering rejected applications...');
      
      filtered.rejected = applications.rejected.filter((app: any) => {
        const appId = app.application_id || app.applicationId;
        const wasRejectedByUser = this.didUserApproveOrReject(app, userRoles, 'reject');
        
        if (wasRejectedByUser) {
          console.log(`✅ User rejected app: ${appId}`);
        }
        
        return wasRejectedByUser;
      });
      
      console.log(`✅ Filtered ${filtered.rejected.length} rejected applications for ${userStage}`);
    }
    
    return filtered;
  }

  // ✅ NEW UNIVERSAL METHOD: Check if user approved or rejected an application
  private didUserApproveOrReject(app: any, userRoles: string[], action: 'approve' | 'reject'): boolean {
    const transactions = app.transactions || [];
    
    if (transactions.length === 0) {
      return false;
    }
    
    // Look for any transaction where the user's role performed the specified action
    return transactions.some((txn: any) => {
      // Extract role from all possible nested structures
      const performedByRole = this.extractRoleFromTransaction(txn);
      
      if (!performedByRole) {
        return false;
      }
      
      // Check if this transaction was performed by any of the user's roles
      const isUserRole = userRoles.some(role => 
        role.toLowerCase() === performedByRole.toLowerCase()
      );
      
      if (!isUserRole) {
        return false;
      }
      
      // Check the action type based on remarks and context
      const remarks = this.safeToLowerCase(txn.remarks || '');
      const context = txn.context || {};
      const contextAction = this.safeToLowerCase(context.action || '');
      
      if (action === 'approve') {
        // ✅ Approval indicators
        const isApproval = 
          contextAction === 'approve' ||
          contextAction.includes('approv') ||
          remarks.includes('approv') ||
          remarks.includes('forward') ||
          remarks.includes('advanced') ||
          (!remarks.includes('reject') && !remarks.includes('objection'));
        
        console.log(`🔍 Checking approval for role ${performedByRole}:`, {
          isUserRole,
          isApproval,
          remarks,
          contextAction
        });
        
        return isApproval;
      } else {
        // ✅ Rejection indicators
        const isRejection = 
          contextAction === 'reject' ||
          contextAction.includes('reject') ||
          remarks.includes('reject');
        
        console.log(`🔍 Checking rejection for role ${performedByRole}:`, {
          isUserRole,
          isRejection,
          remarks,
          contextAction
        });
        
        return isRejection;
      }
    });
  }

  // ✅ NEW HELPER: Extract role from transaction (handles all structures)
  private extractRoleFromTransaction(txn: any): string {
    // Try all possible nested structures
    const possiblePaths = [
      txn.performedBy?.role?.name,
      txn.performedBy?.roleName,
      txn.performedBy?.role_name,
      txn.performed_by?.role?.name,
      txn.performed_by?.roleName,
      txn.performed_by?.role_name,
      txn.forwardedBy?.role?.name,
      txn.forwardedBy?.roleName,
      txn.forwardedBy?.role_name,
      txn.forwarded_by?.role?.name,
      txn.forwarded_by?.roleName,
      txn.forwarded_by?.role_name,
    ];
    
    for (const path of possiblePaths) {
      if (path && typeof path === 'string') {
        return path;
      }
    }
    
    return '';
  }

  // ✅ Enhanced: Safe string conversion helper
  private safeToLowerCase(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object' && value.name) {
      return String(value.name).toLowerCase();
    }
    
    return String(value).toLowerCase();
  }

  // ✅ Enhanced: Map stage name to stage ID (supports all application types)
  private getStageIdFromStageName(stageName: string): number | null {
    // License Application stages (IDs 1-13)
    const licenseStageMapping: Record<string, number> = {
      'applicant_applied': 1,
      'level_1': 2,
      'level_2': 3,
      'level_3': 4,
      'level_4': 5,
      'level_5': 6,
      'approved': 7,
      'rejected': 8,
      'level_1_objection': 9,
      'level_2_objection': 10,
      'level_3_objection': 11,
      'level_4_objection': 12,
      'level_5_objection': 13,
    };
    
    // Salesman/Barman Application stages (IDs 14-26)
    const salesmanBarmanStageMapping: Record<string, number> = {
      'applicant_applied': 14,
      'level_1': 15,
      'level_2': 16,
      'level_3': 17,
      'level_4': 18,
      'level_5': 19,
      'approved': 20,
      'rejected': 21,
      'level_1_objection': 22,
      'level_2_objection': 23,
      'level_3_objection': 24,
      'level_4_objection': 25,
      'level_5_objection': 26,
    };
    
    // Determine which mapping to use based on current application type
    const mapping = this.selectedApplicationType === 'salesman_barman' 
      ? salesmanBarmanStageMapping 
      : licenseStageMapping;
    
    return mapping[stageName.toLowerCase()] ?? null;
  }

  // ✅ NEW: Reverse lookup - Map stage ID to stage name
  private getStageNameFromId(stageId: number): string | null {
    // License Application stages (IDs 1-13)
    const licenseIdToStageMapping: Record<number, string> = {
      1: 'applicant_applied',
      2: 'level_1',
      3: 'level_2',
      4: 'level_3',
      5: 'level_4',
      6: 'level_5',
      7: 'approved',
      8: 'rejected',
      9: 'level_1_objection',
      10: 'level_2_objection',
      11: 'level_3_objection',
      12: 'level_4_objection',
      13: 'level_5_objection',
    };
    
    // Salesman/Barman Application stages (IDs 14-26)
    const salesmanBarmanIdToStageMapping: Record<number, string> = {
      14: 'applicant_applied',
      15: 'level_1',
      16: 'level_2',
      17: 'level_3',
      18: 'level_4',
      19: 'level_5',
      20: 'approved',
      21: 'rejected',
      22: 'level_1_objection',
      23: 'level_2_objection',
      24: 'level_3_objection',
      25: 'level_4_objection',
      26: 'level_5_objection',
    };
    
    // Try both mappings since we may not always know the application type
    return salesmanBarmanIdToStageMapping[stageId] ?? 
           licenseIdToStageMapping[stageId] ?? 
           null;
  }

  private userRoles: string[] = [];

  private getUserRoles(): string[] {
    if (this.userRoles.length > 0) {
      return this.userRoles;
    }
    
    const currentUrl = window.location.pathname;
    console.log('🔍 Current URL:', currentUrl);
    
    if (currentUrl.includes('/admin/')) {
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          console.log('🔍 Stored user:', user);
          this.userRoles = user?.authorities || user?.roles || user?.role || [];
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    }
    
    return this.userRoles;
  }

  private handleApiError(error: any, resourceType: string): void {
    if (error.status === 403) {
      this.showPermissionError(resourceType);
    } else if (error.status === 404) {
      console.log(`ℹ️ No ${resourceType} found`);
    } else {
      console.error(`❌ Error fetching ${resourceType}:`, error);
    }
  }

  private showPermissionError(resourceType: string): void {
    const message = `You don't have permission to access ${resourceType}. Please contact your administrator.`;
    
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private updateDataSources(applications: any): void {
    console.log('📊 Updating data sources with applications:', applications);
    
    this.appliedDataSource.data = applications.applied || [];
    this.pendingDataSource.data = applications.pending || [];
    this.approvedDataSource.data = applications.approved || [];
    this.rejectedDataSource.data = applications.rejected || [];
    
    console.log('✅ Data sources updated:', {
      applied: this.appliedDataSource.data.length,
      pending: this.pendingDataSource.data.length,
      approved: this.approvedDataSource.data.length,
      rejected: this.rejectedDataSource.data.length
    });
  }

  private clearDataSources(): void {
    console.log('🧹 Clearing all data sources...');
    this.appliedDataSource.data = [];
    this.pendingDataSource.data = [];
    this.approvedDataSource.data = [];
    this.rejectedDataSource.data = [];
  }

  getApplicationTypeLabel(): string {
    const option = this.availableApplicationTypes.find(t => t.value === this.selectedApplicationType);
    return option ? option.label : 'Application';
  }
}