import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
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
    OfficerInChargeDashboardComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  dashboardConfig!: DashboardConfig;
  currentUser!: User;
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

  appliedDataSource = new MatTableDataSource<UnifiedApplication>();
  pendingDataSource = new MatTableDataSource<UnifiedApplication>();
  approvedDataSource = new MatTableDataSource<UnifiedApplication>();
  rejectedDataSource = new MatTableDataSource<UnifiedApplication>();

  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];
  activeTable: 'default' | 'applied' | 'pending' | 'approved' | 'rejected' = 'default';

  // Supply Chain Section Management
  selectedSupplyChainSection: string | null = null;

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
    this.currentUser = this.roleService.getCurrentUser()!;

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
    // Extract role information
    let rawRoles = accountUser?.authorities ?? accountUser?.roles ?? accountUser?.role ?? [];

    if (rawRoles && typeof rawRoles === 'object' && !Array.isArray(rawRoles)) {
      if (rawRoles.name) {
        rawRoles = [rawRoles.name];
      } else {
        rawRoles = [];
      }
    } else if (Array.isArray(rawRoles)) {
      rawRoles = rawRoles.map((r: any) => {
        if (typeof r === 'string') return r;
        if (r && r.name) return r.name;
        if (r && r.roleName) return r.roleName;
        return r;
      }).filter(Boolean);
    }

    // Map legacy role names to role IDs
    const roleMapping: { [key: string]: number } = {
      'site_admin': 2,
      'supply_chain': 8,
      'Supply_Chain': 8,
      'permit_section': 9,
      'Permit Section': 9,
      'commissioner': 10,
      'level_1': 11,
      'it_cell': 12,
      'it-cell': 12,
      'level_2': 13,
      'level_3': 14,
      'level_4': 15,
      'level_5': 16,
      'single_window': 17,
      'officer_in_charge': 18,
      'officer-incharge': 18,
      'licensee': 19
    };

    // Find the role ID
    let roleId = 2; // Default to site admin
    for (const role of rawRoles) {
      if (roleMapping[role]) {
        roleId = roleMapping[role];
        break;
      }
    }

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
    return [9, 10, 12, 18].includes(roleId);
  }

  isLicenseeUser(): boolean {
    return this.currentUser?.roleId === 19 || this.currentUser?.roleId === 8;
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
      2: 'Site Administrator Dashboard',
      8: 'Supply Chain Dashboard',
      9: 'Permit Section Dashboard',
      10: 'Commissioner Dashboard',
      11: 'Level 1 Officer Dashboard',
      12: 'IT Cell Dashboard',
      13: 'Level 2 Officer Dashboard',
      14: 'Level 3 Officer Dashboard',
      15: 'Level 4 Officer Dashboard',
      16: 'Level 5 Officer Dashboard',
      17: 'Single Window Dashboard',
      18: 'Officer in Charge Dashboard',

    };

    const titleFromRoleId = roleNames[this.currentUser.roleId];
    if (titleFromRoleId) {
      console.log('✅ Dashboard title from roleId:', this.currentUser.roleId, '→', titleFromRoleId);
      return titleFromRoleId;
    }

    // Fallback: try to get from account service
    this.accountService.identity().subscribe(user => {
      if (user && (user as any).role) {
        const legacyRole = (user as any).role.name || (user as any).role;
        console.log('⚠️ Fallback dashboard title from account service:', legacyRole);
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

    // Strict check: Only Licensee users (Role 19 or 8) can see the "Create" buttons
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
}