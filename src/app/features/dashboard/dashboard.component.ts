import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, finalize } from 'rxjs';

import { DashboardConfig, User } from '../../core/models/dashboard.models';
import { RoleService } from '../../core/services/role.service';
import { DashboardConfigService } from '../../core/services/dashboard-config.service';
import { UnifiedDashboardService } from '../../core/services/unified-dashboard.service';
import { UnifiedApplication } from '../../core/models/unified-application.model';
import { DashboardCount } from '../../core/models/dashboard.model';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationTableComponent } from '../licensee/licensee-dashboard/application-table/application-table.component';
import { SalesmanBarmanRegistrationService } from '../../core/services/salesman-barman-registration.service';
import { AccountService } from '../../core/services/account.service';
import Swal from 'sweetalert2';

// Supply Chain Components
import { RequisitionComponent } from '../licensee/supplyChain/supplychaincomponents/requisition/requisition.component';
import { RevalidationComponent } from '../licensee/supplyChain/supplychaincomponents/revalidation/revalidation.component';
import { CancellationComponent } from '../licensee/supplyChain/supplychaincomponents/cancellation/cancellation.component';
import { TransitComponent } from '../licensee/supplyChain/supplychaincomponents/transit/transit.component';
import { HologramprocurementComponent } from '../licensee/supplyChain/supplychaincomponents/hologramprocurement/hologramprocurement.component';
import { HologramrequestComponent } from '../licensee/supplyChain/supplychaincomponents/hologramrequest/hologramrequest.component';
import { TransitPermitComponent } from '../licensee/supplyChain/transit-permit/transit-permit.component';
import { ImportPermitComponent } from '../licensee/supplyChain/import-permit/import-permit.component';
import { Hologramrequestlevel1Component } from '../licensee/supplyChain/HoloGram/hologramrequestlevel1/hologramrequestlevel1.component';
import { HologramComponent } from '../licensee/supplyChain/HoloGram/hologram/hologram.component';

// Officer-specific Components
import { BrandsDetailsComponent } from '../licensee/supplyChain/registers/brands-details/brands-details.component';
import { HologramMonthlyReportComponent } from '../licensee/supplyChain/registers/hologram-monthly-report/hologram-monthly-report.component';
import { HologramdetailsComponent } from '../licensee/supplyChain/HoloGram/hologramdetails/hologramdetails.component';
import { OicdailyhologramregisterComponent } from '../licensee/supplyChain/registers/oicdailyhologramregister/oicdailyhologramregister.component';
import { BrandwarehouseComponent } from '../licensee/supplyChain/registers/brandwarehouse/brandwarehouse.component';
import { ITCELLComponent } from '../admin/it-cell/itcell.component';
import { HologramoveriewComponent } from '../licensee/supplyChain/HoloGram/hologramoveriew/hologramoveriew.component';

// Role-specific Dashboard Components
import { PermitSectionDashboardComponent } from './role-components/permit-section-dashboard.component';
import { CommissionerDashboardComponent as CommissionerDashboard } from './role-components/commissioner-dashboard.component';
import { ITCellDashboardComponent } from './role-components/itcell-dashboard.component';
import { OfficerInChargeDashboardComponent } from './role-components/officer-in-charge-dashboard.component';
import { PrepareApplicationComponent as CompanyPrepareApplicationComponent } from '../licensee/company-registration-and-collaboration/company-registration-and-collaboration/company-registration/prepare-application/prepare-application.component';
import { PrepareApplicationComponent as SalesmanPrepareApplicationComponent } from '../licensee/salesman-registration/prepare-application.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTabsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    ApplicationTableComponent,
    // Supply Chain Components
    RequisitionComponent,
    RevalidationComponent,
    CancellationComponent,
    TransitComponent,
    HologramprocurementComponent,
    HologramrequestComponent,
    TransitPermitComponent,
    ImportPermitComponent,
    Hologramrequestlevel1Component,
    HologramComponent,
    // Officer-specific Components
    BrandsDetailsComponent,
    HologramMonthlyReportComponent,
    HologramdetailsComponent,
    OicdailyhologramregisterComponent,
    BrandwarehouseComponent,
    ITCELLComponent,
    HologramoveriewComponent,
    // Role-specific Dashboard Components
    PermitSectionDashboardComponent,
    CommissionerDashboard,
    ITCellDashboardComponent,
    OfficerInChargeDashboardComponent,
    CompanyPrepareApplicationComponent,
    SalesmanPrepareApplicationComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  dashboardConfig!: DashboardConfig;
  currentUser: User | null = null;
  dashboardData: any = {};
  isLoading = true;
  error: string | null = null;

  // Professional dashboard properties (from licensee dashboard)
  dashboardCounts: DashboardCount & { awaitingPayment?: number } = {
    applied: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    awaitingPayment: 0
  };

  selectedApplicationType: 'all' | 'license-renewal' | 'new-license' | 'salesman-barman' = 'all';
  selectedMetricsPeriod: 'today' | 'week' | 'month' | 'quarter' = 'week';

  appliedDataSource = new MatTableDataSource<UnifiedApplication>();
  pendingDataSource = new MatTableDataSource<UnifiedApplication>();
  approvedDataSource = new MatTableDataSource<UnifiedApplication>();
  rejectedDataSource = new MatTableDataSource<UnifiedApplication>();

  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];
  activeTable: 'default' | 'applied' | 'pending' | 'approved' | 'rejected' = 'default';

  // Supply Chain Section Management
  selectedSupplyChainSection: string | null = null;

  // Professional dashboard enhancements
  previousCounts: DashboardCount = { applied: 0, pending: 0, approved: 0, rejected: 0 };
  recentActivities: any[] = [];
  performanceMetrics: any[] = [];
  customStats: any[] = [];
  quickActions: any[] = [];

  constructor(
    private roleService: RoleService,
    private dashboardConfigService: DashboardConfigService,
    private unifiedDashboardService: UnifiedDashboardService,
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private accountService: AccountService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.initializeDashboard();
    this.handleQueryParams();
    this.initializeProfessionalFeatures();
  }

  private initializeProfessionalFeatures(): void {
    // Initialize quick actions based on role
    this.initializeQuickActions();
    
    // Initialize custom stats based on role
    this.initializeCustomStats();
    
    // Load recent activities
    this.loadRecentActivities();
    
    // Load performance metrics for admin roles
    if (this.shouldShowPerformanceMetrics()) {
      this.loadPerformanceMetrics();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Handle query parameters for supply chain section navigation
  private handleQueryParams(): void {
    // Subscribe to query parameter changes
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const section = params['section'];
        if (section) {
          this.selectedSupplyChainSection = section;
        }
      });
  }

  private initializeDashboard() {
    // Get current user from role service
    this.currentUser = this.roleService.getCurrentUser();

    // If no current user in role service, try to get from account service
    if (!this.currentUser) {
      this.accountService.identity().subscribe(accountUser => {
        if (accountUser) {
          // Map account user to unified user (same logic as unified layout)
          const mappedUser = this.mapAccountUserToUnifiedUser(accountUser);
          this.roleService.setCurrentUser(mappedUser);
          this.currentUser = mappedUser;
          this.proceedWithDashboardLoad();
        } else {
          this.error = 'No user found. Please log in again.';
          this.isLoading = false;
        }
      });
    } else {
      this.proceedWithDashboardLoad();
    }
  }

  private mapAccountUserToUnifiedUser(accountUser: any): User {
    // Use backend role id directly (no name-based mapping)
    const roleId = Number(accountUser?.role?.id) || 1;

    return {
      id: accountUser.id || 1,
      username: accountUser.username || accountUser.login || 'user',
      email: accountUser.email || 'user@excise.gov',
      fullName: `${accountUser.firstName || ''} ${accountUser.lastName || ''}`.trim() || 'User',
      roleId: roleId,
      role: this.roleService.getRoleById(roleId)!,
      permissions: this.roleService.getRoleById(roleId)?.permissions || [],
      isActive: true,
      lastLogin: new Date()
    };
  }

  private proceedWithDashboardLoad() {
    // Load dashboard configuration
    this.dashboardConfigService.getCurrentUserDashboardConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.dashboardConfig = config;
          this.loadDashboardData();
        },
        error: (error) => {
          console.error('Error loading dashboard configuration:', error);
          this.error = 'Failed to load dashboard configuration.';
          this.isLoading = false;
        }
      });
  }

  private loadDashboardData() {
    // If no specific section is selected, load dashboard stats
    if (!this.selectedSupplyChainSection) {
      this.loadDashboardStats();
    } else {
      this.isLoading = false; // Directly show the section
    }
  }

  private loadDashboardStats() {
    this.isLoading = true;

    // Use the unified dashboard service for all roles
    forkJoin({
      counts: this.unifiedDashboardService.getUnifiedDashboardCounts(),
      applications: this.unifiedDashboardService.getUnifiedApplicationsByStatus()
    })
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: (result) => {
          let filteredApplications = {
            applied: result.applications.applied || [],
            pending: result.applications.pending || [],
            awaitingPayment: result.applications.awaitingPayment || [],
            approved: result.applications.approved || [],
            rejected: result.applications.rejected || []
          };

          if (this.selectedApplicationType !== 'all') {
            filteredApplications = {
              applied: filteredApplications.applied.filter(app => app.type === this.selectedApplicationType),
              pending: filteredApplications.pending.filter(app => app.type === this.selectedApplicationType),
              awaitingPayment: filteredApplications.awaitingPayment.filter(app => app.type === this.selectedApplicationType),
              approved: filteredApplications.approved.filter(app => app.type === this.selectedApplicationType),
              rejected: filteredApplications.rejected.filter(app => app.type === this.selectedApplicationType)
            };
          }

          // Store counts separately but combine pending display
          this.dashboardCounts = {
            applied: filteredApplications.applied.length,
            pending: filteredApplications.pending.length,
            awaitingPayment: filteredApplications.awaitingPayment.length,
            approved: filteredApplications.approved.length,
            rejected: filteredApplications.rejected.length
          };

          // Combine pending and awaiting payment into one datasource
          this.updateDataSources({
            applied: filteredApplications.applied,
            pending: [...filteredApplications.pending, ...filteredApplications.awaitingPayment],
            approved: filteredApplications.approved,
            rejected: filteredApplications.rejected
          });
        },
        error: (error) => {
          console.error('❌ Error loading dashboard data:', error);
          this.dashboardCounts = { applied: 0, pending: 0, awaitingPayment: 0, approved: 0, rejected: 0 };
          this.clearDataSources();
        }
      });
  }

  shouldShowRoleSpecificDashboard(): boolean {
    const roleId = this.currentUser?.roleId;

    // If a specific section is selected, we should show generic supply chain content
    // instead of the role-specific dashboard component
    if (this.selectedSupplyChainSection) {
      return false;
    }

    // Roles that have their own full dashboard component (SPA-like)
    return roleId ? [5, 6, 7, 10].includes(roleId) : false;
  }

  isLicenseeUser(): boolean {
    return this.currentUser?.roleId === 2;
  }

  // Supply Chain Section Handlers
  clearSupplyChainSection(): void {
    this.selectedSupplyChainSection = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: null },
      queryParamsHandling: 'merge'
    });
  }

  // Professional dashboard methods (from licensee dashboard)
  showTable(table: 'applied' | 'pending' | 'approved' | 'rejected') {
    this.activeTable = table;
  }

  goBack() {
    this.activeTable = 'default';
  }

  onApplicationTypeChange(): void {
    this.activeTable = 'default';
    this.loadDashboardData();
  }

  private updateDataSources(result: {
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }): void {
    this.appliedDataSource.data = result.applied || [];
    this.pendingDataSource.data = result.pending || [];
    this.approvedDataSource.data = result.approved || [];
    this.rejectedDataSource.data = [];
  }

  private clearDataSources(): void {
    this.appliedDataSource.data = [];
    this.pendingDataSource.data = [];
    this.approvedDataSource.data = [];
    this.rejectedDataSource.data = [];
  }

  onPaymentConfirmed(application: UnifiedApplication): void {
    Swal.fire({
      title: 'Confirm Payment Receipt',
      text: `Have you received the payment for application ${application.applicationId}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Payment Received',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.processPayment(application);
      }
    });
  }

  private processPayment(application: UnifiedApplication): void {
    Swal.fire({
      title: 'Processing...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    this.salesmanBarmanService.getNextStages(application.applicationId).subscribe({
      next: (stages: any[]) => {
        const approvalStage = stages.find(s => {
          const stageName = (s.name || s.stage_name || '').toLowerCase();
          const stageId = s.id || s.stage_id;
          return stageName === 'approved' || stageId === 12 || stageId === 16;
        });

        if (!approvalStage) {
          console.error('❌ No approval stage found in:', stages);
          Swal.fire('Error', 'No approval stage found. Available stages: ' + stages.map(s => s.name || s.id).join(', '), 'error');
          return;
        }

        const stageId = approvalStage.id || approvalStage.stage_id;
        this.salesmanBarmanService.advanceStage(application.applicationId, stageId, {
          payment_confirmed: true,
          remarks: 'Payment received and confirmed'
        }).subscribe({
          next: (_response) => {
            Swal.fire({
              title: 'Success!',
              text: 'Payment confirmed and application approved.',
              icon: 'success'
            }).then(() => {
              this.loadDashboardData();
            });
          },
          error: (err) => {
            console.error('❌ Error advancing application:', err);
            Swal.fire('Error', err?.error?.detail || 'Failed to process payment.', 'error');
          }
        });
      },
      error: (err) => {
        console.error('❌ Error fetching stages:', err);
        Swal.fire('Error', 'Failed to fetch approval stages: ' + (err?.error?.detail || err?.message || 'Unknown error'), 'error');
      }
    });
  }

  // Helper method to check if user has required permissions
  hasPermission(permissions: string[]): boolean {
    return this.roleService.hasAnyPermission(permissions);
  }

  // Method to handle dashboard refresh
  onDashboardRefresh() {
    this.isLoading = true;
    this.error = null;
    this.initializeDashboard();
  }

  // Get role-specific title
  getDashboardTitle(): string {
    if (!this.currentUser) return 'Dashboard';

    // First try role ID mapping
    const roleNames: { [key: number]: string } = {
      1: 'Site Administrator Dashboard',
      2: 'Licensee Dashboard',
      3: 'Single Window Dashboard',
      4: 'District User Dashboard',
      5: 'Permit Section Dashboard',
      6: 'IT Cell Dashboard',
      7: 'Officer in Charge Dashboard',
      8: 'Sub Enquiry Officer Dashboard',
      9: 'Joint Commissioner Dashboard',
      10: 'Commissioner Dashboard',
      11: 'Secretary Dashboard',
    };

    const titleFromRoleId = roleNames[this.currentUser?.roleId || 0];
    if (titleFromRoleId) {
      console.log('✅ Dashboard title from roleId:', this.currentUser?.roleId, '→', titleFromRoleId);
      return titleFromRoleId;
    }

    // Fallback: try to get from account service
    this.accountService.identity().subscribe(user => {
      if (user && (user as any).role) {
        console.log('⚠️ Fallback dashboard title from account service role id:', (user as any).role.id);
      }
    });

    return 'Dashboard';
  }

  // Get supply chain section title
  getSupplyChainSectionTitle(): string {
    const titles: { [key: string]: string } = {
      // Common sections
      'requisition': 'Requisition Management',
      'revalidation': 'Revalidation Management',
      'cancellation': 'Cancellation Management',
      'transit': 'Transit Management',
      'hologram': 'Hologram Procurement',
      'hologram-request': 'Hologram Request',
      'company-registration': 'Company Registration',
      'salesman-barman-registration': 'Salesman/Barman Registration',

      // SPA Forms
      'transit-permit': 'Apply Transit Permit',
      'import-permit': 'New Requisition Application',
      'hologram-request-form': 'New Hologram Request',
      'hologram-new': 'New Hologram Procurement',

      // IT Cell Sections
      'itcell-hologram': 'Hologram Management (IT Cell)',
      'process-flow': 'Process Flow Diagram',

      // Officer Sections
      'transit-applications': 'Transit Applications',
      'brands': 'Brand Details',
      'monthly-hologram-statement': 'Monthly Hologram Statement',
      'hologram-register': 'Hologram Register',
      'hologram-daily-entry': 'Daily Hologram Entry',
      'stock-inventory': 'Brand Warehouse Stock',

      'hologram-overview': 'Hologram Overview',
      'officer-activity': 'Officer Activity',
      'system-monitoring': 'System Monitoring'
    };

    return titles[this.selectedSupplyChainSection || ''] || 'Management';
  }

  // Header Action Logic
  showHeaderAction(): boolean {
    if (!this.selectedSupplyChainSection) return false;

    // Strict check: Only Licensee users (Role ID 2) can see the "Create" buttons
    // Officers (OIC, Commissioner, Permit Section, etc.) should only see the list/tables
    if (!this.isLicenseeUser()) {
      return false;
    }

    const section = this.selectedSupplyChainSection;

    // List of sections that have a "Create" action for Licensees
    const sectionsWithActions = [
      'requisition',
      'transit',
      'hologram',
      'hologram-request'
    ];

    return sectionsWithActions.includes(section);
  }

  getHeaderActionLabel(): string {
    const section = this.selectedSupplyChainSection;

    switch (section) {
      case 'requisition': return 'New Requisition';
      case 'transit': return 'Apply Transit';
      case 'hologram': return 'New Hologram';
      case 'hologram-request': return 'New Request';
      default: return 'Create New';
    }
  }

  getHeaderActionIcon(): string {
    const section = this.selectedSupplyChainSection;

    switch (section) {
      case 'requisition': return 'add_circle';
      case 'transit': return 'local_shipping';
      case 'hologram': return 'add_circle';
      case 'hologram-request': return 'add_circle';
      default: return 'add';
    }
  }

  onHeaderAction(): void {
    const section = this.selectedSupplyChainSection;

    if (section === 'requisition') {
      // Navigate within SPA to the import permit (requisition) application form
      this.router.navigate(['/dashboard'], { queryParams: { section: 'import-permit' } });
    } else if (section === 'transit') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'transit-permit' } });
    } else if (section === 'hologram') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'hologram-new' } });
    } else if (section === 'hologram-request') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'hologram-request-form' } });
    }
  }



  // Open wallet dialog
  openWallet(): void {
    // Navigate to the existing payment confirmation page which has wallet functionality
    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: {
        tab: 'recharge', // Default to recharge/wallet tab
        source: 'dashboard-requisition'
      }
    });
  }

  // Remove the fallback method since we're using existing component
  // private showBasicWalletInfo(): void { ... }

  // ========================================
  // PROFESSIONAL DASHBOARD ENHANCEMENTS
  // ========================================

  // Notification system
  getNotificationCount(): number {
    const roleId = this.currentUser?.roleId;
    if (!roleId) return 0;

    // Calculate notifications based on role and pending items
    let count = 0;
    
    // For admin roles, count items requiring attention
    if (roleId && [1, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(roleId)) {
      count += this.dashboardCounts.pending || 0;
      count += this.dashboardCounts.awaitingPayment || 0;
    }
    
    // For licensee roles, count rejected items and payment due
    if (roleId && [2].includes(roleId)) {
      count += this.dashboardCounts.rejected || 0;
      count += this.dashboardCounts.awaitingPayment || 0;
    }

    return Math.min(count, 99); // Cap at 99
  }

  // Quick Actions based on role
  initializeQuickActions(): void {
    const roleId = this.currentUser?.roleId;
    this.quickActions = [];

    switch (roleId) {
      case 2: // Licensee
        this.quickActions = [
          { id: 'new-requisition', label: 'New Requisition', icon: 'add_circle', color: 'primary', action: () => this.navigateToSection('import-permit') },
          { id: 'transit-permit', label: 'Transit Permit', icon: 'local_shipping', color: 'accent', action: () => this.navigateToSection('transit-permit') },
          { id: 'hologram-request', label: 'Hologram Request', icon: 'security', color: 'warn', action: () => this.navigateToSection('hologram-request-form') },
          { id: 'payment-wallet', label: 'Payment & Wallet', icon: 'account_balance_wallet', color: 'primary', action: () => this.openWallet() }
        ];
        break;
      
      case 5: // Permit Section
        this.quickActions = [
          { id: 'review-permits', label: 'Review Permits', icon: 'assignment', color: 'primary', action: () => this.navigateToSection('requisition') },
          { id: 'approve-transit', label: 'Transit Approvals', icon: 'local_shipping', color: 'accent', action: () => this.navigateToSection('transit') },
          { id: 'generate-report', label: 'Generate Report', icon: 'assessment', color: 'warn', action: () => this.generateReport() }
        ];
        break;
      
      case 10: // Commissioner
        this.quickActions = [
          { id: 'final-approvals', label: 'Final Approvals', icon: 'verified', color: 'primary', action: () => this.showTable('pending') },
          { id: 'hologram-management', label: 'Hologram Management', icon: 'security', color: 'accent', action: () => this.navigateToSection('hologram') },
          { id: 'system-reports', label: 'System Reports', icon: 'analytics', color: 'warn', action: () => this.generateSystemReport() }
        ];
        break;
      
      case 7: // Officer in Charge
        this.quickActions = [
          { id: 'hologram-register', label: 'Hologram Register', icon: 'book', color: 'primary', action: () => this.navigateToSection('hologram-register') },
          { id: 'daily-entry', label: 'Daily Entry', icon: 'today', color: 'accent', action: () => this.navigateToSection('hologram-daily-entry') },
          { id: 'stock-check', label: 'Stock Inventory', icon: 'inventory', color: 'warn', action: () => this.navigateToSection('stock-inventory') }
        ];
        break;
      
      case 6: // IT Cell
        this.quickActions = [
          { id: 'system-monitor', label: 'System Monitor', icon: 'monitor', color: 'primary', action: () => this.navigateToSection('system-monitoring') },
          { id: 'user-management', label: 'User Management', icon: 'people', color: 'accent', action: () => this.manageUsers() },
          { id: 'backup-system', label: 'System Backup', icon: 'backup', color: 'warn', action: () => this.initiateBackup() }
        ];
        break;
    }
  }

  getQuickActions(): any[] {
    return this.quickActions;
  }

  executeQuickAction(action: any): void {
    if (action.action && typeof action.action === 'function') {
      action.action();
    }
  }

  // Custom Statistics based on role
  initializeCustomStats(): void {
    const roleId = this.currentUser?.roleId;
    this.customStats = [];

    switch (roleId) {
      case 2: // Licensee
        this.customStats = [
          {
            id: 'wallet-balance',
            label: 'Wallet Balance',
            value: '₹25,000',
            icon: 'account_balance_wallet',
            colorClass: 'purple-bg',
            trend: 5,
            subInfo: 'Available for payments',
            actionText: 'Recharge'
          },
          {
            id: 'active-permits',
            label: 'Active Permits',
            value: '12',
            icon: 'verified',
            colorClass: 'indigo-bg',
            trend: 8,
            subInfo: 'Valid permits',
            actionText: 'View Details'
          }
        ];
        break;
      
      case 5: // Permit Section
        this.customStats = [
          {
            id: 'processing-time',
            label: 'Avg Processing Time',
            value: '3.2 days',
            icon: 'schedule',
            colorClass: 'orange-bg',
            trend: -12,
            subInfo: 'Improved efficiency',
            actionText: 'View Metrics'
          }
        ];
        break;
      
      case 10: // Commissioner
        this.customStats = [
          {
            id: 'revenue-generated',
            label: 'Revenue Generated',
            value: '₹2.5M',
            icon: 'monetization_on',
            colorClass: 'green-bg',
            trend: 15,
            subInfo: 'This month',
            actionText: 'View Report'
          },
          {
            id: 'compliance-rate',
            label: 'Compliance Rate',
            value: '94.5%',
            icon: 'verified_user',
            colorClass: 'blue-bg',
            trend: 3,
            subInfo: 'System wide',
            actionText: 'View Details'
          }
        ];
        break;
      
      case 7: // Officer in Charge
        this.customStats = [
          {
            id: 'hologram-stock',
            label: 'Hologram Stock',
            value: '1,250',
            icon: 'inventory_2',
            colorClass: 'teal-bg',
            trend: -5,
            subInfo: 'Units available',
            actionText: 'Manage Stock'
          }
        ];
        break;
    }
  }

  getCustomStats(): any[] {
    return this.customStats;
  }

  handleCustomStatClick(stat: any): void {
    switch (stat.id) {
      case 'wallet-balance':
        this.openWallet();
        break;
      case 'active-permits':
        this.showTable('approved');
        break;
      case 'processing-time':
        this.generateReport();
        break;
      case 'revenue-generated':
        this.generateSystemReport();
        break;
      case 'compliance-rate':
        this.viewComplianceDetails();
        break;
      case 'hologram-stock':
        this.navigateToSection('stock-inventory');
        break;
      default:
        console.log('Custom stat clicked:', stat);
    }
  }

  // Statistics display logic
  shouldShowStatCard(type: string): boolean {
    const roleId = this.currentUser?.roleId;
    
    // All roles can see basic stats
    if (['applied', 'pending', 'approved', 'rejected'].includes(type)) {
      return true;
    }
    
    return false;
  }

  getStatTrend(type: string): number {
    // Mock trend data - in real app, this would come from backend
    const trends: { [key: string]: number } = {
      applied: 12,
      pending: -8,
      approved: 15,
      rejected: -5
    };
    
    return trends[type] || 0;
  }

  getStatSubInfo(type: string): string {
    const roleId = this.currentUser?.roleId;
    
    switch (type) {
      case 'applied':
        return 'New submissions';
      case 'pending':
        return roleId === 10 ? 'Awaiting your review' : 'Under review';
      case 'approved':
        return 'Successfully processed';
      case 'rejected':
        return 'Require attention';
      default:
        return '';
    }
  }

  // Performance Metrics
  shouldShowPerformanceMetrics(): boolean {
    const roleId = this.currentUser?.roleId;
    // Show for admin roles
    return roleId ? [1, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(roleId) : false;
  }

  loadPerformanceMetrics(): void {
    // Mock performance data - in real app, this would come from backend
    const roleId = this.currentUser?.roleId;
    
    this.performanceMetrics = [
      {
        label: 'Applications Processed',
        value: '156',
        icon: 'assignment_turned_in',
        color: '#4CAF50',
        change: 12
      },
      {
        label: 'Average Processing Time',
        value: '2.3 days',
        icon: 'schedule',
        color: '#FF9800',
        change: -8
      },
      {
        label: 'Success Rate',
        value: '94.2%',
        icon: 'trending_up',
        color: '#2196F3',
        change: 3
      },
      {
        label: 'User Satisfaction',
        value: '4.7/5',
        icon: 'star',
        color: '#9C27B0',
        change: 5
      }
    ];

    // Customize based on role
    if (roleId === 10) { // Commissioner
      this.performanceMetrics.push({
        label: 'Revenue Generated',
        value: '₹2.5M',
        icon: 'monetization_on',
        color: '#4CAF50',
        change: 18
      });
    }
  }

  getPerformanceMetrics(): any[] {
    return this.performanceMetrics;
  }

  onMetricsPeriodChange(): void {
    this.loadPerformanceMetrics();
  }

  // Recent Activities
  loadRecentActivities(): void {
    // Mock activity data - in real app, this would come from backend
    const roleId = this.currentUser?.roleId;
    
    this.recentActivities = [
      {
        id: 1,
        type: 'approval',
        icon: 'check_circle',
        title: 'Application Approved',
        description: 'Transit permit TP001/2024 has been approved',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        user: 'Commissioner Office',
        actions: [
          { id: 'view', icon: 'visibility', label: 'View' }
        ]
      },
      {
        id: 2,
        type: 'submission',
        icon: 'send',
        title: 'New Application Submitted',
        description: 'Requisition REQ003/2024 submitted for review',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        user: 'ABC Distillery',
        actions: [
          { id: 'review', icon: 'rate_review', label: 'Review' }
        ]
      },
      {
        id: 3,
        type: 'payment',
        icon: 'payment',
        title: 'Payment Received',
        description: 'Payment of ₹15,000 received for application NL002/2024',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        user: 'XYZ Licensee'
      },
      {
        id: 4,
        type: 'rejection',
        icon: 'cancel',
        title: 'Application Rejected',
        description: 'Hologram request HR001/2024 rejected due to incomplete documents',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        user: 'Permit Section',
        actions: [
          { id: 'details', icon: 'info', label: 'Details' }
        ]
      }
    ];

    // Filter activities based on role permissions
    if (roleId && [2].includes(roleId)) { // Licensee role
      this.recentActivities = this.recentActivities.filter(activity => 
        ['approval', 'rejection', 'payment'].includes(activity.type)
      );
    }
  }

  getRecentActivities(): any[] {
    return this.recentActivities;
  }

  executeActivityAction(action: any, activity: any): void {
    switch (action.id) {
      case 'view':
      case 'details':
        this.viewActivityDetails(activity);
        break;
      case 'review':
        this.reviewApplication(activity);
        break;
      default:
        console.log('Activity action:', action, activity);
    }
  }

  viewAllActivities(): void {
    // Navigate to full activity log
    console.log('Navigate to full activity log');
  }

  // Helper methods for actions
  private navigateToSection(section: string): void {
    this.router.navigate(['/dashboard'], { queryParams: { section } });
  }

  private generateReport(): void {
    console.log('Generate report functionality');
    // Implement report generation
  }

  private generateSystemReport(): void {
    console.log('Generate system report functionality');
    // Implement system report generation
  }

  private manageUsers(): void {
    console.log('User management functionality');
    // Navigate to user management
  }

  private initiateBackup(): void {
    console.log('System backup functionality');
    // Implement backup functionality
  }

  private viewComplianceDetails(): void {
    console.log('View compliance details');
    // Navigate to compliance dashboard
  }

  private viewActivityDetails(activity: any): void {
    console.log('View activity details:', activity);
    // Show activity details modal or navigate
  }

  private reviewApplication(activity: any): void {
    console.log('Review application:', activity);
    // Navigate to application review
  }

  // Add Math to component for template access
  Math = Math;
}
