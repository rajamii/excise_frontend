import { Component, OnInit, OnDestroy, AfterViewInit, ViewEncapsulation, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, filter, takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { RoleService } from '../../../../core/services/role.service';
import { User } from '../../../../core/models/dashboard.models';
import { AccountService } from '../../../../core/services/account.service';
import { DashboardConfigService } from '../../../../core/services/dashboard-config.service';
import { LicenseMeService } from '../../../../core/services/license-me.service';
import { environment } from '../../../../../environments/environment';
import { SidebarPendingBadgeService } from '../../../services/sidebar-pending-badge.service';
import {
  filterRowsForSupplyChainSidebarMenus,
  isLicenseeWalletNavEligible
} from '../../../utils/wallet-nav-eligibility.util';

@Component({
  selector: 'app-unified-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatExpansionModule,
    MatMenuModule
  ],
  templateUrl: './unified-layout.component.html',
  styleUrls: ['./unified-layout.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UnifiedLayoutComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  private readonly licenseApiBase = `${environment.apiBaseUrl}/masters/license`;
  private readonly newLicenseApiBase = `${environment.apiBaseUrl}/transactional/new_license_application`;
  private badgeRefreshReady = false;
  private badgeRefreshQueued = false;
  
  @ViewChild('sidenav') sidenav?: MatSidenav;

  currentUser: User | null = null;
  userName = '';
  isSidenavOpen = false;
  loaded = true;
  user: any;
  currentLayout: string = 'admin';
  showDistilleryMenus = false;
  showBreweryOrDistilleryMenus = false;
  /** Whether the Bulk Spirit group is expanded in the sidebar (default: closed) */
  bulkSpiritExpanded = false;
  adminBulkSpiritExpanded = false;
  adminAboutUsExpanded = false;
  adminContactUsExpanded = false;
  adminMasterDataExpanded = false;
  adminLicenseMasterDataExpanded = false;
  adminBrandMasterDataExpanded = false;
  adminBrandMasterDetailsIIExpanded = false;
  adminUserManagementExpanded = false;
  hasBreweryOrDistilleryWalletViews = false;
  /** Manufacturing licensees (including non–brewery/distillery) who may use Payment & Wallet. */
  showManufacturingWalletNav = false;
  showSpecialPermitMenu = false;

  myLicenses: any[] = [];
  selectedLicenseGroupKey = '';
  // Wallet menu visibility is derived from current license + application rows (multi-application safe).
  pendingBadgeCounts: Record<string, number> = {};
  private lastMenuAccessUserKey: string | null = null;
  readonly sidebarSectionLabels: Record<string, string> = {
    requisition: 'Requisition',
    revalidation: 'Revalidation',
    cancellation: 'Cancellation',
    transit: 'Transit Permit',
    hologram: 'New Procurement',
    'distributor-permit': 'Import Permit'
  };
  private dbNavigationRoutes = new Set<string>();
  private dbPermissionTokens = new Set<string>();
  readonly officerSectionItems: Array<{
    section: string;
    label: string;
    icon: string;
    group?: string;
    showOnlyForDistributor?: boolean;
    hideForSiteAdmin?: boolean;
    hideForPermitSection?: boolean;
    hideForItCell?: boolean;
    hideForOic?: boolean;
    hideForCommissioner?: boolean;
    showOnlyForOic?: boolean;
    showOnlyForCommissioner?: boolean;
  }> = [
    { section: 'new-license', label: 'New License', icon: 'add_business', hideForSiteAdmin: true, hideForPermitSection: true, hideForItCell: true, hideForOic: true },
    { section: 'license-renewal', label: 'License Renewal', icon: 'autorenew', hideForSiteAdmin: true, hideForPermitSection: true, hideForItCell: true, hideForOic: true },
    { section: 'special-permit', label: 'Dry Day Permit', icon: 'assignment_turned_in', hideForSiteAdmin: true, hideForPermitSection: true, hideForItCell: true, hideForOic: true },
    { section: 'requisition', label: 'Requisition', icon: 'description', group: 'Bulk Spirit' },
    { section: 'revalidation', label: 'Revalidation', icon: 'refresh', group: 'Bulk Spirit', hideForPermitSection: true },
    { section: 'cancellation', label: 'Cancellation', icon: 'cancel', group: 'Bulk Spirit', hideForPermitSection: true },
    { section: 'transit', label: 'Transit Permit', icon: 'local_shipping', hideForCommissioner: true, hideForPermitSection: true },
    { section: 'transit-applications', label: 'Transit Applications', icon: 'local_shipping', hideForPermitSection: true },
    { section: 'bl-details', label: 'Bulk Spirit Details', icon: 'water_drop', showOnlyForOic: true },
    // ── Hologram group (all hologram items consecutive so the header renders correctly) ──
    { section: 'hologram', label: 'New Procurement', icon: 'qr_code', group: 'Hologram', hideForOic: true },
    { section: 'itcell-hologram', label: 'Procurement', icon: 'qr_code', group: 'Hologram', hideForOic: true, hideForCommissioner: true },
    { section: 'hologram-register', label: 'Procurement', icon: 'qr_code', group: 'Hologram', hideForCommissioner: true },
    { section: 'oic-hologram-requests', label: 'Requests', icon: 'description', group: 'Hologram', showOnlyForOic: true },
    { section: 'hologram-daily-entry', label: 'Daily Entry', icon: 'today', group: 'Hologram', hideForCommissioner: true },
    { section: 'monthly-hologram-statement', label: 'Monthly Statement', icon: 'description', group: 'Hologram' },
    { section: 'hologram-inventory', label: 'Inventory', icon: 'inventory_2', group: 'Hologram', showOnlyForOic: true },
    { section: 'commissioner-hologram-working-records', label: 'Working Records', icon: 'fact_check', group: 'Hologram', showOnlyForCommissioner: true },
    { section: 'commissioner-monthly-view-details', label: 'Monthly View Details', icon: 'calendar_month', showOnlyForCommissioner: true },
    // ── Other ──
      { section: 'stock-inventory', label: 'Stock Inventory', icon: 'inventory' },
      { section: 'salesman-barman-registration', label: 'Salesman/Barman Registration', icon: 'badge' },
      { section: 'company-registration', label: 'Company Registration', icon: 'apartment' },
      { section: 'company-collaboration', label: 'Company Collaboration', icon: 'groups', hideForSiteAdmin: true },
      { section: 'single-window', label: 'User Details', icon: 'manage_search', hideForSiteAdmin: true },
      { section: 'payment-transactions', label: 'Transactions', icon: 'receipt_long', hideForSiteAdmin: true },
      { section: 'officer-activity', label: 'Officer Activity', icon: 'assignment', hideForSiteAdmin: true }
    ];

  constructor(
    private roleService: RoleService,
    private accountService: AccountService,
    private dashboardConfigService: DashboardConfigService,
    private licenseMeService: LicenseMeService,
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sidebarPendingBadgeService: SidebarPendingBadgeService
  ) {}

  ngOnInit() {
    console.log('🔍 UnifiedLayout ngOnInit - Initial currentUser:', this.currentUser);
    
    // Initialize user info first
    this.initializeUserAndAuth();

    // Auto-expand admin groups based on current route
    this.expandAdminGroupsForPath(this.router.url);

    // Auto-close the sidebar after navigation from menu selections.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url || '';
        this.expandAdminGroupsForPath(url);
        if (this.isSidenavOpen) {
          this.closeSidenav();
        }
      });

    // Listen to badge refresh broadcasts to update pending count badges
    this.sidebarPendingBadgeService.refreshNeeded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 UNIFIED LAYOUT: Refreshing sidebar badges due to triggerRefresh');
        this.refreshSidebarBadges(true, 'full');
      });
  }

  ngAfterViewInit() {
    // The sidebar state is already set via [opened] binding in template
    // No need for additional logic here
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeUserAndAuth() {
    // First, try to get user from role service (might be cached)
    const cachedUser = this.roleService.getCurrentUser();
    
    if (cachedUser) {
      console.log('✅ Found cached user in role service:', cachedUser);
      this.currentUser = cachedUser;
      this.setupInitialSidebarState();
      // Avoid double-fetching menu access; auth-state subscription below will rehydrate menus.
      this.loaded = true;
    }

    // Always subscribe to authentication state for real-time updates
    this.accountService.getAuthenticationState().subscribe((acc) => {
      console.log('🔍 Authentication state changed:', acc);
      
      if (acc !== null) {
        this.user = acc;

        // Build username exactly like original
        this.userName = this.user.firstName!;

        // Append last name if it exists
        if (this.user.lastName !== null) {
          this.userName = this.userName + ' ' + this.user.lastName;
        }

        // IMPORTANT: Update the role service with the actual logged-in user
        this.updateRoleServiceWithActualUser(acc);
        this.setupInitialSidebarState();
        this.loadLicenseeMenuAccess();
        
        // Mark component as fully loaded
        this.loaded = true;
      } else {
        // Only redirect to login if we're sure there's no authentication
        // and we're not on the login page already
        const currentUrl = this.router.url;
        if (!currentUrl.includes('/login') && !currentUrl.includes('/') && this.loaded) {
          console.log('⚠️ No authentication found, redirecting to login');
          this.router.navigate(['/']);
        }
      }
    });
  }

  private setupInitialSidebarState() {
    // Keep sidebar closed by default on login
    const shouldBeOpen = false;
    this.isSidenavOpen = shouldBeOpen;
    console.log('🔍 Setup initial sidebar state - shouldBeOpen:', shouldBeOpen, 'isLicenseeUser:', this.isLicenseeUser());
  }

  private updateRoleServiceWithActualUser(accountUser: any) {
    // Use backend role id directly (no name-based mapping)
    const roleId = Number(accountUser?.role?.id) || 1;
    const baseRole = this.roleService.getRoleById(roleId);
    const backendRoleName = accountUser?.role?.name || accountUser?.role?.displayName;
    this.currentLayout = String(accountUser?.role?.layout || '').toLowerCase() || this.currentLayout;

    // Create the unified user object
    const unifiedUser: User = {
      id: accountUser.id || 1,
      username: accountUser.username || accountUser.login || 'user',
      email: accountUser.email || 'user@excise.gov',
      fullName: `${accountUser.firstName || ''} ${accountUser.lastName || ''}`.trim() || 'User',
      roleId: roleId,
      role: {
        id: roleId,
        name: backendRoleName || baseRole?.name || 'user',
        displayName: backendRoleName || 'User',
        permissions: baseRole?.permissions || [],
        hierarchy: baseRole?.hierarchy || 999
      },
      permissions: baseRole?.permissions || [],
      isActive: true,
      lastLogin: new Date()
    };

    // Update the role service with the actual user
    this.roleService.setCurrentUser(unifiedUser);
    this.currentUser = unifiedUser;

    console.log('✅ Updated role service with actual user:', {
      roleId: roleId,
      roleIdFromAccount: accountUser?.role?.id,
      displayName: unifiedUser.role?.displayName
    });

    // Hydrate permissions from DB config so new roles work without frontend code changes.
    this.dashboardConfigService
      .getCurrentUserDashboardConfigCached()
      .pipe(
        catchError((error) => {
          console.warn('Could not load dashboard-config/current for role permissions:', error);
          return of(null);
        })
      )
      .subscribe((config) => {
        if (!config) {
          return;
        }

        const dbPermissions = Array.isArray(config?.permissions) ? config.permissions : [];
        const dbNavigation = Array.isArray(config?.navigation) ? config.navigation : [];
        const dbRoleName = config?.roleName || unifiedUser.role?.displayName || 'User';
        this.currentLayout = String(config?.layout || this.currentLayout || 'admin').toLowerCase();
        this.hydrateDbMenuAccess(dbNavigation, dbPermissions);

        const dbBackedUser: User = {
          ...unifiedUser,
          role: {
            ...unifiedUser.role,
            name: dbRoleName,
            displayName: dbRoleName,
            permissions: dbPermissions
          },
          permissions: dbPermissions
        };

        this.roleService.setCurrentUser(dbBackedUser);
        this.currentUser = dbBackedUser;
        // Avoid duplicate badge API calls during login:
        // the sidenav can be opened before DB-backed config/permissions are hydrated.
        // Queue a single refresh and run it once config is ready.
        this.badgeRefreshReady = true;
        if (this.isSidenavOpen && this.badgeRefreshQueued) {
          this.badgeRefreshQueued = false;
          this.refreshSidebarBadges(false, 'full');
        }
      });
  }

  private hydrateDbMenuAccess(navigation: any[], permissions: string[]): void {
    this.dbNavigationRoutes.clear();
    this.dbPermissionTokens.clear();

    const collectRoutes = (items: any[]) => {
      for (const item of items || []) {
        const route = String(item?.route || '').trim().toLowerCase();
        if (route) {
          this.dbNavigationRoutes.add(route);
        }
        if (Array.isArray(item?.children)) {
          collectRoutes(item.children);
        }
      }
    };

    collectRoutes(navigation || []);

    for (const entry of permissions || []) {
      const normalized = String(entry || '').trim().toLowerCase();
      if (!normalized) {
        continue;
      }
      this.dbPermissionTokens.add(normalized);
    }
  }

  // Method to toggle the sidebar (sidenav) - Fixed to properly track state
  snavToggle(sidenav: any) {
    sidenav.toggle();
    // State is updated by onSidenavStateChange.
    console.log('🔍 Sidebar toggled - new state:', this.isSidenavOpen);
  }

  // Handle sidebar state changes (opened/closed)
  onSidenavStateChange(isOpen: boolean) {
    this.isSidenavOpen = isOpen;

    if (isOpen) {
      if (!this.badgeRefreshReady) {
        this.badgeRefreshQueued = true;
        return;
      }
      this.refreshSidebarBadges(false, 'full');
    }
    console.log('🔍 Sidebar state changed:', isOpen);
  }

  closeSidenav(): void {
    if (!this.isSidenavOpen) {
      return;
    }

    try {
      this.sidenav?.close();
    } finally {
      this.isSidenavOpen = false;
    }
  }

  openSidenav(): void {
    if (this.isSidenavOpen) {
      return;
    }

    try {
      this.sidenav?.open();
    } finally {
      this.isSidenavOpen = true;
    }
  }

  getPendingCount(section: string): number {
    const key = String(section || '').trim().toLowerCase();
    return Number(this.pendingBadgeCounts?.[key] || 0);
  }

  imflPermitExpanded = false;

  navigateToImflPermitTab(tab: string): void {
    this.router.navigate(['/dashboard'], {
      queryParams: { section: 'distributor-permit', tab }
    });
    this.closeSidenav();
  }

  isImflTabActive(tab: string): boolean {
    const url = this.router.url || '';
    if (tab === 'requisition') {
      return !url.includes('tab=revalidation') && !url.includes('tab=cancellation');
    }
    return url.includes(`tab=${tab}`);
  }

  /** Total pending badge count across all Bulk Spirit sub-sections visible to the current user */
  getBulkSpiritTotalBadge(): number {
    const sections = this.officerSectionItems
      .filter(item => item.group === 'Bulk Spirit' && this.shouldShowOfficerSectionItem(item))
      .map(item => item.section);
    if (this.isLicenseeUser()) {
      return this.getPendingCount('requisition:payment');
    }
    const keys = sections.length > 0 ? sections : ['requisition', 'revalidation', 'cancellation'];
    return keys.reduce((sum, s) => sum + this.getPendingCount(s), 0);
  }

  /** Total pending badge count across all Hologram sub-sections visible to the current user */
  getHologramTotalBadge(): number {
    const sections = this.officerSectionItems
      .filter(item => item.group === 'Hologram' && this.shouldShowOfficerSectionItem(item))
      .map(item => item.section);
    if (this.isLicenseeUser()) {
      return this.getPendingCount('hologram:payment');
    }
    const keys = sections.length > 0 ? sections : ['hologram', 'hologram-request'];
    return keys.reduce((sum, s) => sum + this.getPendingCount(s), 0);
  }

  private refreshSidebarBadges(force = false, mode: 'light' | 'full' = 'light'): void {
    if (this.isSiteAdminUser()) {
      if (Object.keys(this.pendingBadgeCounts || {}).length > 0) {
        this.pendingBadgeCounts = {};
        this.triggerUiRefresh();
      }
      return;
    }

    // For licensee users, show payment-pending badges on New License, Salesman/Barman,
    // and supply chain nav items (Bulk Spirit + Hologram sub-sections).
    if (this.isLicenseeUser()) {
      const hasDbRoute = (pattern: RegExp): boolean => {
        for (const route of this.dbNavigationRoutes) {
          if (pattern.test(String(route || ''))) return true;
        }
        return false;
      };

      const licenseeSections: string[] = ['new-license', 'license-renewal', 'salesman-barman-registration', 'company-registration', 'company-collaboration', 'special-permit', 'distributor-permit'];
      // Distillery licensees always see Bulk Spirit menus even when DB navigation routes are incomplete.
      // Ensure Requisition payment-pending badge still loads in that case.
      if (this.showDistilleryMenus || hasDbRoute(/requisition|ena|bulk[_-]?spirit/)) {
        licenseeSections.push('requisition');
      }
      // Brewery/distillery licensees can see hologram-related menus; load badge even if routes are missing.
      if (this.showBreweryOrDistilleryMenus || hasDbRoute(/hologram/)) {
        licenseeSections.push('hologram');
      }

      this.sidebarPendingBadgeService
        .refresh(licenseeSections, force, { audience: 'licensee', mode })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (counts) => {
            this.pendingBadgeCounts = counts || {};
            this.triggerUiRefresh();
          },
          error: () => {
            this.pendingBadgeCounts = {};
            this.triggerUiRefresh();
          }
        });
      return;
    }

    const sections = this.getVisibleOfficerSections();
    if (sections.length === 0) {
      if (Object.keys(this.pendingBadgeCounts || {}).length > 0) {
        this.pendingBadgeCounts = {};
        this.triggerUiRefresh();
      }
      return;
    }

    this.sidebarPendingBadgeService
      .refresh(sections, force, { mode })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (counts) => {
          this.pendingBadgeCounts = counts || {};
          this.triggerUiRefresh();
        },
        error: () => {
          this.pendingBadgeCounts = {};
          this.triggerUiRefresh();
        }
      });
  }

  private getVisibleOfficerSections(): string[] {
    if (this.isLicenseeUser()) return [];

    const sections: string[] = [
      'distributor-permit',
      'imfl-permit',
      'distributor-permit-requisition',
      'imfl-requisition',
      'distributor-permit-revalidation',
      'imfl-revalidation',
      'distributor-permit-cancellation',
      'imfl-cancellation',
      'cancellation'
    ];
    for (const item of this.officerSectionItems) {
      if (!this.shouldShowOfficerSectionItem(item)) continue;
      sections.push(item.section);
    }
    return sections;
  }

  getImflPermitTotalPendingCount(): number {
    const req = this.getPendingCount('distributor-permit') || this.getPendingCount('distributor-permit-requisition') || this.getPendingCount('imfl-requisition');
    const rev = this.getPendingCount('distributor-permit-revalidation') || this.getPendingCount('imfl-revalidation');
    const can = this.getPendingCount('distributor-permit-cancellation') || this.getPendingCount('imfl-cancellation');
    return req + rev + can;
  }

  private shouldShowOfficerSectionItem(item: {
    section: string;
    label: string;
    icon: string;
    hideForSiteAdmin?: boolean;
    hideForPermitSection?: boolean;
    hideForItCell?: boolean;
    hideForOic?: boolean;
    hideForCommissioner?: boolean;
    showOnlyForOic?: boolean;
    showOnlyForCommissioner?: boolean;
  }): boolean {
    if (item.showOnlyForOic && !this.isOicUser()) return false;
    if (item.showOnlyForCommissioner && !this.isCommissionerUser()) return false;
    if (item.hideForSiteAdmin && this.isSiteAdminUser()) return false;
    if (item.hideForPermitSection && this.isPermitSectionUser()) return false;
    if (item.hideForItCell && this.isItCellUser()) return false;
    if (item.hideForOic && this.isOicUser()) return false;
    if (item.hideForCommissioner && this.isCommissionerUser()) return false;
    if (!this.canAccessSection(item.section)) return false;
    return true;
  }

  // Method to handle the "View Profile" button click - exactly like original
  viewProfile(): void {
    console.log('Button Clicked!');
    // TODO: Import and open UserProfileComponent dialog
    // const dialogRef = this.dialog.open(UserProfileComponent, {
    //   width: '500px',
    // });
  }

  // Method to open user profile dialog
  openUserProfile(): void {
    console.log('User profile clicked!');
    
    // Dynamically import the appropriate user profile component based on user role
    if (this.isLicenseeUser()) {
      // Import licensee user profile component
      import('../../../../features/licensee/licensee-home/user-profile/user-profile.component')
        .then(({ UserProfileComponent }) => {
          const dialogRef = this.dialog.open(UserProfileComponent, {
            width: '600px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            panelClass: 'user-profile-dialog'
          });
        })
        .catch(error => {
          console.error('Error loading licensee user profile component:', error);
          // Fallback to basic user info display
          this.showBasicUserInfo();
        });
    } else {
      // Import admin user profile component
      import('../../../../features/admin/home/user-profile/user-profile.component')
        .then(({ UserProfileComponent }) => {
          const dialogRef = this.dialog.open(UserProfileComponent, {
            width: '600px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            panelClass: 'user-profile-dialog'
          });
        })
        .catch(error => {
          console.error('Error loading admin user profile component:', error);
          // Fallback to basic user info display
          this.showBasicUserInfo();
        });
    }
  }

  // Fallback method to show basic user info if component loading fails
  private showBasicUserInfo(): void {
    const userInfo = this.user || this.currentUser;
    const displayName = this.userName || userInfo?.fullName || 'User';
    const role = this.getRoleDisplayName();
    const email = userInfo?.email || 'N/A';
    const username = userInfo?.username || userInfo?.login || 'N/A';

    Swal.fire({
      title: 'User Profile',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; font-weight: bold;">Name:</td>
              <td style="padding: 8px;">${displayName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; font-weight: bold;">Username:</td>
              <td style="padding: 8px;">${username}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; font-weight: bold;">Email:</td>
              <td style="padding: 8px;">${email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; font-weight: bold;">Role:</td>
              <td style="padding: 8px;">${role}</td>
            </tr>
          </table>
        </div>
      `,
      confirmButtonText: 'Close',
      width: 500,
      padding: '1rem'
    });
  }

  // Supply Chain navigation - Navigate to unified dashboard with supply chain tab
  openSupplyChain(): void {
    // Instead of navigating to separate supply chain component,
    // navigate to dashboard and switch to supply chain tab
    this.router.navigate(['/dashboard'], { 
      queryParams: { tab: 'supply-chain' } 
    });
  }

  private readonly bulkSpiritSections = new Set(['requisition', 'revalidation', 'cancellation']);
  private readonly hologramSections = new Set([
    'hologram', 'hologram-request', 'hologram-daily-entry',
    'monthly-hologram-statement', 'hologram-inventory',
    'itcell-hologram', 'hologram-register', 'oic-hologram-requests',
    'commissioner-hologram-working-records'
  ]);

  /** Whether the Hologram group is expanded in the sidebar (default: closed) */
  hologramExpanded = false;

  // Navigate to specific supply chain section
  navigateToSupplyChain(section: string): void {
    // Auto-collapse groups when navigating away from their sub-items
    if (!this.bulkSpiritSections.has(section)) this.bulkSpiritExpanded = false;
    if (!this.hologramSections.has(section)) this.hologramExpanded = false;
    this.router.navigate(['/dashboard'], { 
      queryParams: { section: section } 
    });
    this.closeSidenav();
  }

  navigateToWalletView(section: string = 'wallet'): void {
    if (this.isLicenseeUser() && !this.showManufacturingWalletNav) {
      return;
    }
    // Wallet is not a bulk spirit or hologram section — collapse both groups
    this.bulkSpiritExpanded = false;
    this.hologramExpanded = false;

    const walletView: 'wallets' | 'others' =
      this.isLicenseeUser() && !this.hasBreweryOrDistilleryWalletViews ? 'others' : 'wallets';
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section,
        tab: 'recharge',
        source: 'sidenav-wallet',
        walletView
      }
    });
    this.closeSidenav();
  }

  navigateToLicenseeRegistration(type: 'company' | 'collaboration' | 'salesman-barman' | 'label'): void {
    // Registration sections are not bulk spirit or hologram — collapse both groups
    this.bulkSpiritExpanded = false;
    this.hologramExpanded = false;
    const sectionMap: Record<'company' | 'collaboration' | 'salesman-barman' | 'label', string> = {
      company: 'company-registration',
      collaboration: 'company-collaboration',
      'salesman-barman': 'salesman-barman-registration',
      label: 'label-registration'
    };
    const section = sectionMap[type];

    this.router.navigate(['/dashboard'], {
      queryParams: { section }
    });
    this.closeSidenav();
  }

  // Navigate to role-specific sections
  navigateToSection(section: string): void {
    // Auto-collapse groups when navigating away from their sub-items
    if (!this.bulkSpiritSections.has(section)) this.bulkSpiritExpanded = false;
    if (!this.hologramSections.has(section)) this.hologramExpanded = false;
    
  if (section === 'hologram-inventory') {
      // Open hologram inventory as a full page (not inside the dashboard section card)
      this.router.navigate(['/dashboard/hologram-overview']);
    } else if (section === 'transit-applications' && this.isOicUser()) {
       // When OIC opens transit applications from the sidebar, focus pending items by default.
       this.router.navigate(['/dashboard'], {
         queryParams: { section: section, focus: 'pending' }
       });
    } else if (section === 'bl-details' && this.isOicUser() && this.getPendingCount(section) > 0) {
      // When there are pending ENA arrival details, open the module focused on pending items.
      this.router.navigate(['/dashboard'], {
        queryParams: { section: section, focus: 'pending' }
      });
    } else if (section === 'itcell-hologram') {
      // For IT Cell hologram procurement, navigate with tab parameter to show the hologram tab
      this.router.navigate(['/dashboard'], { 
        queryParams: { section: section, tab: 'hologram' } 
      });
    } else {
      this.router.navigate(['/dashboard'], { 
        queryParams: { section: section } 
      });
    }

    this.closeSidenav();
  }

  // Navigation method - exactly like original
  navigateTo(route: string): void {
    switch (route) {
      case 'transit-permit-register':
        this.router.navigate(['/dev-transit-permit-register']);
        break;
      case 'daily-record-register':
        this.router.navigate(['/dev-daily-record-register']);
        break;
      case 'daily-production-register':
        this.router.navigate(['/dev-daily-production-register']);
        break;
      case 'yuksom-local-sales-register':
        this.router.navigate(['/dev-local-sales-register']);
        break;
      case 'beer-production-register':
        this.router.navigate(['/dev-beer-production-register']);
        break;
      case 'hologram-monthly-report':
        this.router.navigate(['/dev-hologram-monthly-report']);
        break;
      case 'dashboard':
        this.router.navigate(['/dev-supply-chain']);
        break;
      case 'payments':
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'wallet',
            tab: 'recharge',
            source: 'sidenav-payments',
            nav: Date.now()
          }
        });
        break;
      case 'payment-receipt':
        this.router.navigate(['/dev-payment-receipt']);
        break;
      default:
        this.router.navigate(['/dev-supply-chain']);
    }

    this.closeSidenav();
  }

  // License info dialog - exactly like original
  openLicenseInfo(): void {
    Swal.fire({
      title: 'Apply for License',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <h4>Eligibility Criteria</h4>
          <ul>
            <li>Must be at least 21 years old</li>
            <li>Resident of Sikkim or valid permission</li>
            <li>No criminal record under Excise laws</li>
          </ul>
          <h4>Required Documents</h4>
          <ul>
            <li>Certificate of Identification / Sikkim Subject / RC</li>
            <li>Proof of Age (e.g. Aadhaar)</li>
            <li>Landlord NOC (if rented)</li>
            <li>Trade License</li>
            <li>Photograph of site</li>
          </ul>
          <h4>Fees</h4>
          <p>License Fee: ₹13,500 - 20,000<br>Processing Fee: ₹500</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Start Application',
      cancelButtonText: 'Cancel',
      width: 700,
      padding: '1rem',
      customClass: {
        popup: 'swal-wide',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/licensee/apply-license']);
      }
    });
  }

  // New License info dialog - exactly like original
  openNewLicenseInfo(): void {
    Swal.fire({
      title: 'Apply for License',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <h4>Eligibility Criteria</h4>
          <ul>
            <li>Must be at least 21 years old</li>
            <li>Resident of Sikkim or valid permission</li>
            <li>No criminal record under Excise laws</li>
          </ul>
          <h4>Required Documents</h4>
          <ul>
            <li>Certificate of Identification / Sikkim Subject / RC</li>
            <li>Proof of Age (e.g. Aadhaar)</li>
            <li>Landlord NOC (if rented)</li>
            <li>Trade License</li>
            <li>Photograph of site</li>
          </ul>
          <h4>Fees</h4>
          <p>License Fee: ₹13,500 - 20,000<br>Processing Fee: ₹500</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Start Application',
      cancelButtonText: 'Cancel',
      width: 700,
      padding: '1rem',
      customClass: {
        popup: 'swal-wide',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/licensee/apply-new-license']);
      }
    });
  }
  private getCurrentDashboardContext(): { isDashboardRoute: boolean; isBaseDashboardRoute: boolean; section: string } {
    const urlTree = this.router.parseUrl(this.router.url);
    const primarySegments = urlTree.root.children['primary']?.segments?.map((segment) => segment.path) ?? [];
    const isDashboardRoute = primarySegments.length >= 1 && primarySegments[0] === 'dashboard';
    const isBaseDashboardRoute = isDashboardRoute && primarySegments.length === 1;

    const querySection = String(urlTree.queryParams?.['section'] ?? '').trim();
    const childSegment = isDashboardRoute && primarySegments.length >= 2 ? String(primarySegments[1] || '').trim() : '';

    // Map dashboard child routes to sidebar sections (so the correct menu stays highlighted).
    let sectionFromPath = '';
    if (childSegment === 'hologram-overview') {
      sectionFromPath = 'hologram-inventory';
    }

    const section = querySection || sectionFromPath;

    return { isDashboardRoute, isBaseDashboardRoute, section };
  }

  private resolveSidebarSection(section: string): string {
    const value = String(section || '').trim();
    const parentSectionMap: Record<string, string> = {
      // Licensee form pages should keep their parent menu highlighted
      'import-permit': 'requisition',
      'transit-permit': 'transit',
      'hologram-new': 'hologram',
      'hologram-request-form': 'hologram-request',
      'new-license-apply': 'new-license',
      'special-permit-apply': 'special-permit',
      'company-registration-apply': 'company-registration',
      'company-collaboration-apply': 'company-collaboration',
      'salesman-barman-registration-apply': 'salesman-barman-registration',
      // Officer nested page
      'hologram-overview': 'hologram-inventory'
    };

    return parentSectionMap[value] || value;
  }

  isDashboardHomeActive(): boolean {
    const context = this.getCurrentDashboardContext();
    return context.isBaseDashboardRoute && !context.section;
  }

  isDashboardSectionActive(section: string): boolean {
    const context = this.getCurrentDashboardContext();
    const activeSection = this.resolveSidebarSection(context.section);
    const targetSection = this.resolveSidebarSection(section);
    return context.isDashboardRoute && activeSection === targetSection;
  }

  isWalletActive(): boolean {
    return this.isDashboardSectionActive('wallet');
  }

  isAdminRouteActive(routePrefix: string): boolean {
    const currentPath = this.router.url.split('?')[0].split('#')[0];
    return currentPath === routePrefix || currentPath.startsWith(`${routePrefix}/`);
  }

  expandAdminGroupsForPath(url: string): void {
    if (!url) return;
    const normalized = url.toLowerCase();
    
    // User Management
    if (normalized.includes('/admin/users') ||
        normalized.includes('/admin/oic') ||
        normalized.includes('/admin/roles') ||
        normalized.includes('section=single-window')) {
      this.adminUserManagementExpanded = true;
    }
    
    // Master Data
    if (normalized.includes('/admin/districts') ||
        normalized.includes('/admin/subdivisions') ||
        normalized.includes('/admin/roads') ||
        normalized.includes('/admin/police-stations') ||
        normalized.includes('/admin/locations') ||
        normalized.includes('/admin/blocks') ||
        normalized.includes('/admin/urban-wards') ||
        normalized.includes('/admin/rural-wards')) {
      this.adminMasterDataExpanded = true;
    }
    
    // License Master Data
    if (normalized.includes('/admin/license-validity-period') ||
        normalized.includes('/admin/license-types') ||
        normalized.includes('/admin/license-categories') ||
        normalized.includes('/admin/additional-charges') ||
        normalized.includes('/admin/pachwai-excess') ||
        normalized.includes('/admin/fixed-fees') ||
        normalized.includes('/admin/license-terms') ||
        normalized.includes('/admin/license-titles') ||
        normalized.includes('/admin/dry-day-calendar') ||
        normalized.includes('/admin/license-subcategories')) {
      this.adminLicenseMasterDataExpanded = true;
    }
    
    // Brand Master Data (originally hologram)
    if (normalized.includes('/admin/hologram') ||
        normalized.includes('/admin/brand-ml-in-cases') ||
        normalized.includes('/admin/hologram-suppliers')) {
      this.adminBrandMasterDataExpanded = true;
    }
    
    // Brand Master Details II
    if (normalized.includes('/admin/brand-owners') || normalized.includes('/admin/company-details') || normalized.includes('/admin/kinds-brands')) {
      this.adminBrandMasterDetailsIIExpanded = true;
    }
    
    // Bulk Spirit
    if (normalized.includes('/admin/bulk-spirit')) {
      this.adminBulkSpiritExpanded = true;
    }
    
    // Home Page / About Us
    if (normalized.includes('/admin/about-us') ||
        normalized.includes('/admin/preventive-raids') ||
        normalized.includes('/admin/whats-current')) {
      this.adminAboutUsExpanded = true;
    }
    
    // Contact Us
    if (normalized.includes('/admin/contact-us')) {
      this.adminContactUsExpanded = true;
    }
  }

  getSidebarLabel(section: string, fallbackLabel?: string): string {
    return this.sidebarSectionLabels[section] || fallbackLabel || section;
  }

  /**
   * Returns true when the item at `index` is the first item of its group in the array.
   * The header is shown if this is the first item of the group AND at least one item
   * in the group is accessible to the current user.
   */
  isFirstInGroup(index: number): boolean {
    const item = this.officerSectionItems[index];
    if (!item?.group) return false;
    // Must be the first occurrence of this group in the array
    for (let i = 0; i < index; i++) {
      if (this.officerSectionItems[i].group === item.group) return false;
    }
    // At least one item in the group must be accessible
    return this.officerSectionItems.some(
      it => it.group === item.group && this.canAccessSection(it.section)
    );
  }

  isGroupExpanded(group: string): boolean {
    if (group === 'Bulk Spirit') return this.bulkSpiritExpanded;
    if (group === 'Hologram') return this.hologramExpanded;
    return true;
  }

  toggleGroup(group: string): void {
    if (group === 'Bulk Spirit') this.bulkSpiritExpanded = !this.bulkSpiritExpanded;
    else if (group === 'Hologram') this.hologramExpanded = !this.hologramExpanded;
  }

  getGroupIcon(group: string): string {
    if (group === 'Bulk Spirit') return 'water_drop';
    if (group === 'Hologram') return 'qr_code_2';
    return 'folder';
  }

  /** Total pending badge for a named group — used on the collapsed group header for all user types */
  getGroupTotalBadge(group: string): number {
    if (group === 'Bulk Spirit') return this.getBulkSpiritTotalBadge();
    if (group === 'Hologram') return this.getHologramTotalBadge();
    return 0;
  }

  // Check if user is licensee/supply chain
  isLicenseeUser(): boolean {
    // Primary source: DB-backed dashboard layout.
    if (String(this.currentLayout || '').toLowerCase() === 'licensee') {
      return true;
    }

    // DB-backed permission hints.
    const licenseeTokens = ['licensee.module.view', 'licensee', 'licensee_applications'];
    for (const token of licenseeTokens) {
      if (this.dbPermissionTokens.has(token)) {
        return true;
      }
    }
    for (const permission of this.dbPermissionTokens) {
      if (permission.includes('licensee')) {
        return true;
      }
    }

    // Backward-compatible fallback while older role configs are being updated.
    return (this.currentUser?.permissions || []).includes('licensee.module.view')
      || this.currentUser?.roleId === 2
      || this.currentUser?.roleId === 16;
  }

  private loadLicenseeMenuAccess(): void {
    // This visibility rule is only for licensee menus.
    if (!this.isLicenseeUser()) {
      this.showDistilleryMenus = false;
      this.showBreweryOrDistilleryMenus = false;
      this.hasBreweryOrDistilleryWalletViews = false;
      this.showManufacturingWalletNav = false;
      return;
    }

    // Default for new users: keep only base menu options visible.
    this.showDistilleryMenus = false;
    this.showBreweryOrDistilleryMenus = false;
    this.hasBreweryOrDistilleryWalletViews = false;
    this.showManufacturingWalletNav = false;

    const key = String(this.currentUser?.username || this.user?.username || this.user?.login || '').trim() || null;
    if (key && this.lastMenuAccessUserKey === key && this.myLicenses.length) {
      return;
    }
    this.lastMenuAccessUserKey = key;

    this.licenseMeService.getMyLicenses().subscribe({
      next: (licenses) => {
        const licenseRows = Array.isArray(licenses) ? licenses : [];
        this.myLicenses = licenseRows;
        this.ensureSelectedLicenseGroup();

        // Avoid heavy application list APIs during login; derive menu visibility from issued licenses.
        this.applySubtypeMenuRules(licenseRows);
      },
      error: (error) => {
        console.error('Failed to evaluate menu access from combined sources:', error);
        this.showDistilleryMenus = false;
        this.showBreweryOrDistilleryMenus = false;
        this.hasBreweryOrDistilleryWalletViews = false;
        this.showManufacturingWalletNav = false;
        this.myLicenses = [];
        this.selectedLicenseGroupKey = '';
        this.triggerUiRefresh();
      }
    });
  }

  private ensureSelectedLicenseGroup(): void {
    const groups = this.getLicenseGroups();
    if (groups.length === 0) {
      this.selectedLicenseGroupKey = '';
      return;
    }
    if (this.selectedLicenseGroupKey && groups.some((g) => g.key === this.selectedLicenseGroupKey)) {
      return;
    }
    const preferred = groups.find((g) => g.items.some((x) => Boolean(x?.is_active ?? x?.isActive)));
    this.selectedLicenseGroupKey = (preferred || groups[0]).key;
  }

  get selectedLicenseDisplay(): string {
    const group = this.getLicenseGroups().find((g) => g.key === this.selectedLicenseGroupKey);
    if (!group) return '';
    const active = group.items.find((x) => Boolean(x?.is_active ?? x?.isActive));
    const best = active || group.items[0];
    return String(best?.license_id || best?.licenseId || '').trim();
  }

  openLicenseNumbersPopup(): void {
    if (!this.isLicenseeUser()) return;

    Swal.fire({
      title: 'Loading Details',
      html: 'Please wait...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.licenseMeService.getMyLicenses().subscribe({
      next: (licenses) => {
        Swal.close();
        const licenseRows = Array.isArray(licenses) ? licenses : [];
        this.myLicenses = licenseRows;
        this.ensureSelectedLicenseGroup();
        this.applySubtypeMenuRules(licenseRows);

        const groups = this.getLicenseGroups();
        if (groups.length === 0) {
          void Swal.fire('License Number', 'No license number is available yet.', 'info');
          return;
        }

        const selectHtml = groups.length > 1
          ? `
            <div class="lp-filter-row">
              <label class="lp-filter-label" for="licenseGroup">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M7 12h10M10 18h4"/></svg>
                Filter by License Type
              </label>
              <select id="licenseGroup" class="lp-filter-select">
                ${groups.map((g) => `<option value="${this.escapeHtml(g.key)}">${this.escapeHtml(g.label)}</option>`).join('')}
              </select>
            </div>
          `
          : '';

        void Swal.fire({
          html: `
            <div class="lp-modal">
              <!-- Header -->
              <div class="lp-header">
                <div class="lp-header-icon">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2.5"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    <circle cx="12" cy="14" r="2"/>
                    <line x1="12" y1="16" x2="12" y2="18"/>
                  </svg>
                </div>
                <div class="lp-header-text">
                  <div class="lp-title-row">
                    <h2 class="lp-title">License &amp; Application Numbers</h2>
                    <button class="lp-my-licenses-btn" id="lpMyLicensesBtn" type="button">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      My Licenses
                    </button>
                  </div>
                  <p class="lp-subtitle">Your registered license details and renewal history</p>
                </div>
                <button class="lp-close-btn" id="lpCloseBtn" type="button" aria-label="Close">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <!-- Body -->
              <div class="lp-body">
                ${selectHtml}
                <div id="licenseGroupLabel" class="lp-category-badge"></div>
                <div id="licenseList"></div>
              </div>
            </div>
          `,
          showConfirmButton: false,
          showCloseButton: false,
          padding: 0,
          background: 'transparent',
          customClass: { popup: 'lp-swal-popup', htmlContainer: 'lp-swal-html' },
          didOpen: () => {
            document.getElementById('lpCloseBtn')?.addEventListener('click', () => Swal.close());
            document.getElementById('lpMyLicensesBtn')?.addEventListener('click', () => {
              Swal.close();
              this.navigateToSupplyChain('new-license');
            });
            const selectEl = document.getElementById('licenseGroup') as HTMLSelectElement | null;
            const initialKey = groups.some((g) => g.key === this.selectedLicenseGroupKey) ? this.selectedLicenseGroupKey : groups[0].key;
            if (selectEl) {
              selectEl.value = initialKey;
              selectEl.addEventListener('change', () => {
                this.renderLicensePopupList(groups, selectEl.value);
              });
            }
            this.renderLicensePopupList(groups, initialKey);
          }
        });
      },
      error: (error) => {
        Swal.close();
        console.error('Failed to load license details for popup:', error);
        void Swal.fire('Error', 'Failed to retrieve license details. Please try again.', 'error');
      }
    });
  }

  openMyLicensesDialog(): void {
    import('../../../../features/licensee/my-licenses/my-licenses.component')
      .then(({ MyLicensesComponent }) => {
        this.dialog.open(MyLicensesComponent, {
          width: '900px',
          maxHeight: '90vh'
        });
      })
      .catch((err) => {
        console.error('Failed to load My Licenses dialog:', err);
      });
  }

  private renderLicensePopupList(groups: Array<{ key: string; label: string; items: any[] }>, groupKey: string): void {
    const labelEl = document.getElementById('licenseGroupLabel');
    const target = document.getElementById('licenseList');
    if (!target) return;

    const group = groups.find((g) => g.key === groupKey) || groups[0];
    this.selectedLicenseGroupKey = group.key;
    if (labelEl) {
      labelEl.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        ${this.escapeHtml(group.label || 'License')}
      `;
    }

    const items = group.items
      .map((x) => {
        const rawDetails = x?.renewalDetails ?? x?.renewal_details ?? [];
        const details = Array.isArray(rawDetails) ? rawDetails : [];
        return {
          id: String(x?.license_id || x?.licenseId || '').trim(),
          renewalCount: Number(x?.renewalCount ?? x?.renewal_count ?? 0),
          renewalDetails: details
        };
      })
      .filter((item) => item.id)
      .sort((a, b) => this.compareLicenseIdsDesc(a.id, b.id));

    if (!items.length) {
      target.innerHTML = `
        <div class="lp-empty">
          <div class="lp-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <p class="lp-empty-text">No license found for this selection.</p>
        </div>`;
      return;
    }

    const cardsHtml = items.map((item, idx) => {
      const renewalRows = item.renewalDetails.map((d: any) => {
        const appId = String(d?.applicationId || d?.application_id || '').trim();
        const dateVal = String(d?.date || '').trim();
        return `
          <div class="lp-renewal-row">
            <span class="lp-renewal-connector">└</span>
            <div class="lp-renewal-content">
              <span class="lp-renewal-label">Renewal Application</span>
              <code class="lp-renewal-appid">${this.escapeHtml(appId)}</code>
              ${dateVal ? `<span class="lp-renewal-date">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Renewed on ${this.escapeHtml(dateVal)}
              </span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="lp-card">
          <div class="lp-card-header">
            <div class="lp-card-num-wrap">
              <span class="lp-card-index">#${idx + 1}</span>
              <div class="lp-card-num-block">
                <span class="lp-card-num-label">License Number</span>
                <code class="lp-license-id">${this.escapeHtml(item.id)}</code>
              </div>
            </div>
            <div class="lp-renewal-badge ${item.renewalCount > 0 ? 'has-renewals' : 'no-renewals'}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              ${item.renewalCount} Renewal${item.renewalCount !== 1 ? 's' : ''}
            </div>
          </div>
          ${renewalRows ? `<div class="lp-renewals-section">${renewalRows}</div>` : ''}
        </div>
      `;
    }).join('');

    target.innerHTML = `<div class="lp-cards-list">${cardsHtml}</div>`;
    this.triggerUiRefresh();
  }

  private getLicenseGroups(): Array<{ key: string; label: string; items: any[] }> {
    const rows = Array.isArray(this.myLicenses) ? this.myLicenses : [];
    if (rows.length === 0) return [];

    const toText = (v: any) => String(v ?? '').trim();
    const byKey = new Map<string, { key: string; label: string; items: any[] }>();

    for (const row of rows) {
      // Exclude inactive salesman/barman licenses
      const sbRole = toText(row?.salesman_barman_role || row?.salesmanBarmanRole);
      const isSb = Boolean(sbRole || String(row?.application_type || row?.applicationType || '').toLowerCase().includes('salesman') || String(row?.application_type || row?.applicationType || '').toLowerCase().includes('barman'));
      const isActive = row?.is_active ?? row?.isActive;
      if (isSb && isActive === false) {
        continue;
      }

      const category = toText(row?.license_category || row?.licenseCategory);
      const subCategory = toText(row?.license_sub_category || row?.licenseSubCategory);
      const appType = toText(row?.application_type || row?.applicationType);
      const labelParts = [category, subCategory].filter(Boolean);
      let label = labelParts.length ? labelParts.join(' • ') : (appType || 'License');
      
      if (sbRole) {
        label = `${label} • ${sbRole}`;
      }

      const key = `${label}__${toText(row?.license_sub_category_id || row?.licenseSubCategoryId || '')}__${appType}`;

      const existing = byKey.get(key);
      if (existing) {
        existing.items.push(row);
      } else {
        byKey.set(key, { key, label, items: [row] });
      }
    }

    const groups = Array.from(byKey.values());
    for (const g of groups) {
      g.items = g.items
        .filter((x) => String(x?.license_id || x?.licenseId || '').trim())
        .sort((a, b) => this.compareLicenseIdsDesc(
          String(a?.license_id || a?.licenseId || ''),
          String(b?.license_id || b?.licenseId || '')
        ));
    }

    return groups.sort((a, b) => a.label.localeCompare(b.label));
  }

  private compareLicenseIdsDesc(a: string, b: string): number {
    const ax = this.parseLicenseIdSortKey(a);
    const bx = this.parseLicenseIdSortKey(b);
    if (ax.yearStart !== bx.yearStart) return bx.yearStart - ax.yearStart;
    if (ax.serial !== bx.serial) return bx.serial - ax.serial;
    return String(b).localeCompare(String(a));
  }

  private parseLicenseIdSortKey(id: string): { yearStart: number; serial: number } {
    const text = String(id || '');
    const fy = /\/(\d{4})-(\d{2})\//.exec(text);
    const yearStart = fy ? Number(fy[1]) : 0;
    const serialMatch = /\/(\d+)\s*$/.exec(text);
    const serial = serialMatch ? Number(serialMatch[1]) : 0;
    return { yearStart, serial };
  }

  private escapeHtml(text: string): string {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private applySubtypeMenuRules(rows: any[]): void {
    const hasDistilleryAny = rows.some((item) => this.isDistillery(item));
    const hasBreweryAny = rows.some((item) => this.isBrewery(item));
    const menuRows = filterRowsForSupplyChainSidebarMenus(rows);
    const hasDistillery = menuRows.some((item) => this.isDistillery(item));
    const hasBrewery = menuRows.some((item) => this.isBrewery(item));

    // Distillery: full supply-chain menu (hidden until license fee paid if still awaiting payment).
    this.showDistilleryMenus = hasDistillery;
    // Brewery OR Distillery: transit + hologram menus.
    this.showBreweryOrDistilleryMenus = hasDistillery || hasBrewery;
    this.hasBreweryOrDistilleryWalletViews = hasDistilleryAny || hasBreweryAny;
    // Wallet becomes visible once the source application reaches `awaiting_payment`
    // (Awaiting License Fee Payment) or final approval.
    this.showManufacturingWalletNav = this.computeWalletNavVisible(rows);

    // Dynamic: show Special Permit menu only if ANY active license has is_special_permit_allowed=true
    // or if the user is District User (roleId 4) or Commissioner (roleId 10)
    const userRoleId = Number(this.currentUser?.roleId || this.user?.role?.id || 0);
    this.showSpecialPermitMenu = [4, 10].includes(userRoleId) || rows.some((row) =>
      row?.isSpecialPermitAllowed === true || row?.is_special_permit_allowed === true
    );

    console.log('Resolved menu flags:', {
      hasDistillery,
      hasBrewery,
      showDistilleryMenus: this.showDistilleryMenus,
      showBreweryOrDistilleryMenus: this.showBreweryOrDistilleryMenus,
      showManufacturingWalletNav: this.showManufacturingWalletNav,
      showSpecialPermitMenu: this.showSpecialPermitMenu
    });

    if (rows.length > 0) {
      const sample = rows[0];
      console.log('Subtype parse sample:', {
        sample,
        parsedId: this.extractSubCategoryId(sample),
        parsedName: this.extractSubCategoryName(sample)
      });
    }

    this.triggerUiRefresh();
  }

  private computeWalletNavVisible(rows: any[]): boolean {
    const list = Array.isArray(rows) ? rows : [];

    for (const item of list) {
      // Wallet becomes visible for licensees when:
      // - an issued license exists (license_id), OR
      // - an application reaches awaiting_payment / approved with required selections.
      if (isLicenseeWalletNavEligible(item)) {
        return true;
      }
    }

    return false;
  }

  private isApprovedStage(item: any): boolean {
    const stage = String(
      item?.current_stage_name ??
      item?.currentStageName ??
      item?.current_stage ??
      item?.currentStage ??
      ''
    ).toLowerCase();
    return stage.includes('approved');
  }

  private isAwaitingPaymentStage(item: any): boolean {
    const stage = String(
      item?.current_stage_name ??
      item?.currentStageName ??
      item?.current_stage ??
      item?.currentStage ??
      ''
    ).toLowerCase();
    const normalized = stage.replace(/[^a-z0-9]/g, '');
    return normalized === 'awaitingpayment' || (normalized.includes('awaiting') && normalized.includes('payment'));
  }

  private isDistillery(item: any): boolean {
    const subCategoryId = this.extractSubCategoryId(item);
    if (subCategoryId === 2) {
      return true;
    }
    const name = this.extractSubCategoryName(item);
    return name.includes('distiller');
  }

  private isBrewery(item: any): boolean {
    const subCategoryId = this.extractSubCategoryId(item);
    if (subCategoryId === 1) {
      return true;
    }
    const name = this.extractSubCategoryName(item);
    return name.includes('brew');
  }

  private extractSubCategoryId(item: any): number {
    const nested = item?.license_sub_category ?? item?.licenseSubCategory;
    const raw =
      item?.license_sub_category_id ??
      item?.licenseSubCategoryId ??
      (typeof nested === 'object' ? nested?.id : nested) ??
      0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private extractSubCategoryName(item: any): string {
    const nested = item?.license_sub_category ?? item?.licenseSubCategory;
    const raw =
      item?.license_sub_category_name ??
      item?.licenseSubCategoryName ??
      (typeof nested === 'object'
        ? (nested?.description ?? nested?.name ?? nested?.label ?? '')
        : nested ?? '');
    return String(raw ?? '').toLowerCase();
  }

  private triggerUiRefresh(): void {
    try {
      this.cdr.detectChanges();
    } catch {
      // no-op: avoid lifecycle timing errors
    }
  }

  isSiteAdminUser(): boolean {
    // Primary source: DB-backed admin navigation routes.
    const adminRoutes = [
      '/dashboard/admin/users',
      '/dashboard/admin/roles',
      '/dashboard/admin/districts',
      '/dashboard/admin/subdivisions',
      '/dashboard/admin/police-stations',
      '/dashboard/admin/license-types',
      '/dashboard/admin/license-categories',
      '/dashboard/admin/license-titles',
      '/dashboard/admin/license-subcategories',
      '/dashboard/admin/roads',
      '/dashboard/admin/oic',
      '/dashboard/admin/dry-day-calendar'
    ];

    const hasAdminNav = adminRoutes.some((route) =>
      this.dbNavigationRoutes.has(route.toLowerCase())
    );
    if (hasAdminNav) {
      return true;
    }

    // DB-backed permission hints.
    for (const permission of this.dbPermissionTokens) {
      if (permission.includes('roles') || permission.includes('users') || permission.includes('masters')) {
        return true;
      }
    }

    // Backward-compatible fallback while older role configs are being updated.
    return this.currentUser?.roleId === 1;
  }

  isOicUser(): boolean {
    const roleId = Number(this.currentUser?.roleId || this.user?.role?.id || 0);
    if (roleId === 7) {
      return true;
    }

    const roleName = String(
      this.currentUser?.role?.name ||
      this.currentUser?.role?.displayName ||
      this.user?.role?.name ||
      this.user?.role?.displayName ||
      ''
    ).toLowerCase();
    const normalized = roleName.replace(/[^a-z0-9]/g, '');
    return normalized.includes('officerincharge') || normalized === 'oic' || normalized === 'offcierincharge';
  }

  isCommissionerUser(): boolean {
    const roleId = Number(this.currentUser?.roleId || this.user?.role?.id || 0);
    if (roleId === 10) {
      return true;
    }

    const roleName = String(
      this.currentUser?.role?.name ||
      this.currentUser?.role?.displayName ||
      this.user?.role?.name ||
      this.user?.role?.displayName ||
      ''
    ).toLowerCase();
    const normalized = roleName.replace(/[^a-z0-9]/g, '');
    return normalized.includes('commissioner');
  }

  isPermitSectionUser(): boolean {
    const roleId = Number(this.currentUser?.roleId || this.user?.role?.id || 0);
    if (roleId === 5) {
      return true;
    }

    const roleName = String(
      this.currentUser?.role?.name ||
      this.currentUser?.role?.displayName ||
      this.user?.role?.name ||
      this.user?.role?.displayName ||
      ''
    ).toLowerCase();
    const normalized = roleName.replace(/[^a-z0-9]/g, '');
    return normalized.includes('permitsection');
  }

  isDistributorUser(): boolean {
    const roleId = Number(this.currentUser?.roleId || this.user?.role?.id || 0);
    if (roleId === 16) {
      return true;
    }
    const normalized = this.getNormalizedRoleName();
    return normalized === 'distributor' || normalized.includes('distributor');
  }

  isItCellUser(): boolean {
    const roleId = Number(this.currentUser?.roleId || this.user?.role?.id || 0);
    if (roleId === 6) {
      return true;
    }

    return this.getNormalizedRoleName().includes('itcell');
  }

  private getNormalizedRoleName(): string {
    const roleName = String(
      this.currentUser?.role?.name ||
      this.currentUser?.role?.displayName ||
      this.user?.role?.name ||
      this.user?.role?.displayName ||
      ''
    ).toLowerCase();
    return roleName.replace(/[^a-z0-9]/g, '');
  }

  private canAccessCompanyCollaborationWorkflow(): boolean {
    const roleId = Number(this.currentUser?.roleId || this.user?.role?.id || 0);
    // Permit Section (5), Commissioner (10), and Distributor (16)
    if ([5, 10, 16].includes(roleId)) {
      return true;
    }

    // Fallback: check by role name (exact match to avoid 'jointcommissioner' matching 'commissioner')
    const normalizedRole = this.getNormalizedRoleName();
    return normalizedRole === 'permitsection' || normalizedRole === 'commissioner' || normalizedRole === 'distributor' || normalizedRole.includes('distributor');
  }

  private canAccessCompanyRegistrationWorkflow(): boolean {
    const roleId = Number(this.currentUser?.roleId || this.user?.role?.id || 0);
    if ([5, 10, 16].includes(roleId)) {
      return true;
    }

    // Fallback: check by role name (exact match to avoid 'jointcommissioner' matching 'commissioner')
    const normalizedRole = this.getNormalizedRoleName();
    return normalizedRole === 'permitsection' || normalizedRole === 'commissioner' || normalizedRole === 'distributor' || normalizedRole.includes('distributor');
  }

  canAccessSection(section: string): boolean {
    const roleId = Number(this.currentUser?.roleId || this.user?.role?.id || 0);

    if (section === 'special-permit') {
      return roleId === 4 || roleId === 10;
    }

    // Activity log should be visible for everyone (admins see officer activity, licensees see their own activity).
    if (section === 'officer-activity') {
      return true;
    }

    if (section === 'distributor-permit') {
      return this.isDistributorUser();
    }

    if (section === 'single-window' || section === 'single-window-detail') {
      return roleId === 3 || roleId === 1;
    }

    if (section === 'payment-transactions') {
      return roleId === 3;
    }

    if (section === 'company-registration') {
      return this.canAccessCompanyRegistrationWorkflow();
    }

    if (section === 'company-collaboration') {
      return this.canAccessCompanyCollaborationWorkflow();
    }

    if (this.isLicenseeUser() || this.isSiteAdminUser()) {
      return false;
    }

    // Joint Commissioner should NOT access New Hologram Procurement.
    if (roleId === 9 && section === 'hologram') {
      return false;
    }

    if (this.isPermitSectionUser() && (section === 'new-license' || section === 'license-renewal' || section === 'transit-applications' || section === 'transit')) {
      return false;
    }

    if (this.isItCellUser() && (section === 'new-license' || section === 'license-renewal')) {
      return false;
    }

    // Allow OIC-only sections even if DB navigation tokens are incomplete.
    if ((section === 'hologram-inventory' || section === 'oic-hologram-requests' || section === 'bl-details' || section === 'hologram-register' || section === 'hologram-daily-entry') && this.isOicUser()) {
      return true;
    }

    if (this.isOicUser() && (section === 'itcell-hologram' || section === 'new-license' || section === 'license-renewal' || section === 'hologram')) {
      return false;
    }

    if (this.isCommissionerUser() && (section === 'itcell-hologram' || section === 'hologram-register' || section === 'hologram-daily-entry' || section === 'transit')) {
      return false;
    }

    // Keep commissioner procurement tab visible even if DB navigation tokens are incomplete.
    if (roleId === 10 && section === 'hologram') {
      return true;
    }

    if ((roleId === 5 || roleId === 10 || this.isPermitSectionUser() || this.isCommissionerUser()) && (section === 'distributor-permit' || section === 'imfl-permit')) {
      return true;
    }


    const sectionRouteToken = String(section || '').trim().toLowerCase();
    if (this.dbNavigationRoutes.has(sectionRouteToken)) {
      return true;
    }
    if (this.dbNavigationRoutes.has(`/dashboard?section=${sectionRouteToken}`)) {
      return true;
    }
    if (this.dbNavigationRoutes.has(`dashboard?section=${sectionRouteToken}`)) {
      return true;
    }

    if (sectionRouteToken === 'license-renewal' && this.canAccessSection('new-license')) {
      return true;
    }

    const tokenMap: Record<string, string[]> = {
      'new-license': ['new_license', 'new-license', 'license_application', 'new_license_application'],
      'license-renewal': ['license_renewal_application', 'license-renewal', 'license_renewal', 'license_application', 'new_license_application'],
      'requisition': ['ena_requisition', 'requisition'],
      'revalidation': ['ena_revalidation', 'revalidation'],
      'cancellation': ['ena_cancellation', 'cancellation'],
      'transit': ['transit_permit', 'transit'],
      'hologram': ['hologram_procurement', 'hologram_request', 'hologram'],
      'commissioner-hologram-working-records': ['daily_hologram', 'hologram_daily', 'daily_register', 'hologram_register', 'hologram'],
      'commissioner-monthly-view-details': ['hologram_monthly', 'monthly_hologram', 'hologram_statement', 'hologram'],
      'itcell-hologram': ['hologram_procurement', 'itcell_hologram', 'it_cell', 'hologram'],
      'transit-applications': ['transit_permit', 'transit'],
            'monthly-hologram-statement': ['hologram_monthly', 'monthly_hologram', 'hologram_statement'],
      'hologram-inventory': ['hologram_inventory', 'hologram_overview', 'hologram'],
      'oic-hologram-requests': ['hologram_request', 'hologram_requests', 'hologram_register', 'hologram'],
      'hologram-register': ['hologram_register', 'hologram'],
      'hologram-daily-entry': ['hologram_daily', 'hologram'],
      'stock-inventory': ['stock_inventory', 'inventory', 'brandwarehouse'],
      'bl-details': ['bl_details', 'bulk_liter', 'bulk_detail', 'arrival_bulk_liter', 'arrival_details', 'bl'],
      'officer-activity': ['officer_activity', 'officer'],
      'distributor-permit': ['distributor_permit', 'distributor-permit'],
      'salesman-barman-registration': ['salesman_barman', 'salesman-barman', 'salesmanbarman'],
      'company-registration': ['company_registration', 'company-registration', 'companyregistration'],
      'company-collaboration': ['company_collaboration', 'company-collaboration', 'companycollaboration'],
    };
    const matcherTokens = tokenMap[sectionRouteToken] || [sectionRouteToken];

    for (const permission of this.dbPermissionTokens) {
      for (const token of matcherTokens) {
        if (permission.includes(token)) {
          return true;
        }
      }
    }

    return false;
  }

  // Check if user has active license
  hasActiveLicense(): boolean {
    return this.user?.hasActiveLicense || false;
  }

  // Get role display name for header
  getRoleDisplayName(): string {
    const candidates = [
      this.user?.role?.name,
      this.user?.role?.displayName,
      this.currentUser?.role?.name,
      this.currentUser?.role?.displayName
    ];

    const roleName = candidates.find((v) => !!v && !String(v).startsWith('Role ID:'));
    return roleName || 'User';
  }
}
