import { Component, OnInit, OnDestroy, AfterViewInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { RoleService } from '../../../../core/services/role.service';
import { User } from '../../../../core/models/dashboard.models';
import { AccountService } from '../../../../core/services/account.service';
import { environment } from '../../../../../environments/environment';

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
  private readonly dashboardConfigApiBase = `${environment.apiBaseUrl}/auth/roles/dashboard-config`;
  
  currentUser: User | null = null;
  userName = '';
  isSidenavOpen = false;
  loaded = true;
  user: any;
  currentLayout: string = 'admin';
  showDistilleryMenus = false;
  showBreweryOrDistilleryMenus = false;
  readonly sidebarSectionLabels: Record<string, string> = {
    requisition: 'Ena Requisition',
    revalidation: 'Ena Revalidation',
    cancellation: 'Ena Cancellation',
    transit: 'Transit Permit',
    hologram: 'New Hologram Procurement'
  };
  private dbNavigationRoutes = new Set<string>();
  private dbPermissionTokens = new Set<string>();
  readonly officerSectionItems: Array<{
    section: string;
    label: string;
    icon: string;
    hideForSiteAdmin?: boolean;
    hideForPermitSection?: boolean;
    hideForOic?: boolean;
    hideForCommissioner?: boolean;
    showOnlyForOic?: boolean;
    showOnlyForCommissioner?: boolean;
  }> = [
    { section: 'new-license', label: 'New License', icon: 'add_business', hideForSiteAdmin: true, hideForOic: true },
    { section: 'requisition', label: 'Ena Requisition', icon: 'description' },
    { section: 'revalidation', label: 'Ena Revalidation', icon: 'refresh', hideForPermitSection: true },
    { section: 'cancellation', label: 'Ena Cancellation', icon: 'cancel' },
    { section: 'hologram', label: 'New Hologram Procurement', icon: 'qr_code', hideForOic: true },
    { section: 'commissioner-hologram-working-records', label: 'Hologram Working Records', icon: 'fact_check', showOnlyForCommissioner: true },
    { section: 'commissioner-monthly-view-details', label: 'Monthly View Details', icon: 'calendar_month', showOnlyForCommissioner: true },
    { section: 'transit', label: 'Transit Permit', icon: 'local_shipping', hideForCommissioner: true },
    { section: 'itcell-hologram', label: 'Hologram Procurement', icon: 'qr_code', hideForOic: true, hideForCommissioner: true },
    { section: 'transit-applications', label: 'Transit Applications', icon: 'local_shipping', hideForPermitSection: true },
    { section: 'brands', label: 'Brands Details', icon: 'label' },
    { section: 'monthly-hologram-statement', label: 'Monthly Hologram Statement', icon: 'description' },
    { section: 'hologram-inventory', label: 'Hologram Inventory', icon: 'inventory_2', showOnlyForOic: true },
    { section: 'hologram-register', label: 'Hologram Registers', icon: 'qr_code', hideForCommissioner: true },
    { section: 'hologram-daily-entry', label: 'Hologram Daily Entry', icon: 'today', hideForCommissioner: true },
    { section: 'stock-inventory', label: 'Stock Inventory', icon: 'inventory' },
    { section: 'officer-activity', label: 'Officer Activity', icon: 'assignment' },
    { section: 'salesman-barman-registration', label: 'Salesman/Barman Registration', icon: 'badge' },
    { section: 'company-registration', label: 'Company Registration', icon: 'apartment' },
  ];

  constructor(
    private roleService: RoleService,
    private accountService: AccountService,
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('🔍 UnifiedLayout ngOnInit - Initial currentUser:', this.currentUser);
    
    // Initialize user info first
    this.initializeUserAndAuth();
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
      this.loadLicenseeMenuAccess();
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
    // Set initial sidebar state based on user role
    const shouldBeOpen = !this.isLicenseeUser();
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
    this.http
      .get<any>(`${this.dashboardConfigApiBase}/current/`)
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
    // Update our state to match the actual sidenav state
    this.isSidenavOpen = sidenav.opened;
    console.log('🔍 Sidebar toggled - new state:', this.isSidenavOpen);
  }

  // Handle sidebar state changes (opened/closed)
  onSidenavStateChange(isOpen: boolean) {
    this.isSidenavOpen = isOpen;
    console.log('🔍 Sidebar state changed:', isOpen);
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

  // Navigate to specific supply chain section
  navigateToSupplyChain(section: string): void {
    this.router.navigate(['/dashboard'], { 
      queryParams: { section: section } 
    });
  }

  navigateToWalletView(section: string = 'wallet'): void {
    if (this.isLicenseeUser() && !this.showBreweryOrDistilleryMenus) {
      return;
    }

    this.router.navigate(['/dashboard'], {
      queryParams: {
        section,
        tab: 'recharge',
        source: 'sidenav-wallet'
      }
    });
  }

  navigateToLicenseeRegistration(type: 'company' | 'salesman-barman'): void {
    const section =
      type === 'company'
        ? 'company-registration'
        : 'salesman-barman-registration';

    this.router.navigate(['/dashboard'], {
      queryParams: { section }
    });
  }

  // Navigate to role-specific sections
  navigateToSection(section: string): void {
    // For all officer roles, navigate to dashboard with section parameter
    // This keeps the unified layout and sidebar open
    
    if (section === 'hologram-inventory') {
      // Navigate to the hologram overview page
      this.router.navigate(['/dev-hologram-overview']);
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
      case 'brands-details':
        this.router.navigate(['/dev-brands-details']);
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
            source: 'sidenav-payments'
          }
        });
        break;
      case 'payment-receipt':
        this.router.navigate(['/dev-payment-receipt']);
        break;
      default:
        this.router.navigate(['/dev-supply-chain']);
    }
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
  private getCurrentDashboardContext(): { isBaseDashboardRoute: boolean; section: string } {
    const urlTree = this.router.parseUrl(this.router.url);
    const primarySegments = urlTree.root.children['primary']?.segments?.map((segment) => segment.path) ?? [];
    const isBaseDashboardRoute = primarySegments.length === 1 && primarySegments[0] === 'dashboard';
    const section = String(urlTree.queryParams?.['section'] ?? '').trim();

    return { isBaseDashboardRoute, section };
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
      'company-registration-apply': 'company-registration',
      'salesman-barman-registration-apply': 'salesman-barman-registration',
      // Officer nested page
      'hologram-overview': 'hologram-register'
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
    return context.isBaseDashboardRoute && activeSection === targetSection;
  }

  isWalletActive(): boolean {
    return this.isDashboardSectionActive('wallet');
  }

  getSidebarLabel(section: string, fallbackLabel?: string): string {
    return this.sidebarSectionLabels[section] || fallbackLabel || section;
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
      || this.currentUser?.roleId === 2;
  }

  private loadLicenseeMenuAccess(): void {
    // This visibility rule is only for licensee menus.
    if (!this.isLicenseeUser()) {
      this.showDistilleryMenus = false;
      this.showBreweryOrDistilleryMenus = false;
      return;
    }

    // Default for new users: keep only base menu options visible.
    this.showDistilleryMenus = false;
    this.showBreweryOrDistilleryMenus = false;

    forkJoin({
      licenses: this.http.get<any[]>(`${this.licenseApiBase}/me/`).pipe(
        catchError((error) => {
          console.error('Failed to read /masters/license/me/:', error);
          return of([]);
        })
      ),
      approvedPayload: this.http.get<any>(`${this.newLicenseApiBase}/list-by-status/`).pipe(
        catchError((error) => {
          console.error('Failed to read /transactional/new_license_application/list-by-status/:', error);
          return of({ approved: [] });
        })
      ),
      allApplications: this.http.get<any[]>(`${this.newLicenseApiBase}/list/`).pipe(
        catchError((error) => {
          console.error('Failed to read /transactional/new_license_application/list/:', error);
          return of([]);
        })
      )
    }).subscribe({
      next: ({ licenses, approvedPayload, allApplications }) => {
        const licenseRows = Array.isArray(licenses) ? licenses : [];
        const approvedRows = Array.isArray(approvedPayload?.approved) ? approvedPayload.approved : [];
        const allRows = Array.isArray(allApplications) ? allApplications : [];
        const approvedFromAll = allRows.filter((item) => this.isApprovedStage(item));
        const combinedRows = [...licenseRows, ...approvedRows, ...approvedFromAll];

        console.log('Menu data sources:', {
          licenses: licenseRows.length,
          approvedByStatus: approvedRows.length,
          approvedFromList: approvedFromAll.length
        });

        this.applySubtypeMenuRules(combinedRows);
      },
      error: (error) => {
        console.error('Failed to evaluate menu access from combined sources:', error);
        this.showDistilleryMenus = false;
        this.showBreweryOrDistilleryMenus = false;
        this.triggerUiRefresh();
      }
    });
  }

  private applySubtypeMenuRules(rows: any[]): void {
    const hasDistillery = rows.some((item) => this.isDistillery(item));
    const hasBrewery = rows.some((item) => this.isBrewery(item));

    // Distillery: full supply-chain menu.
    this.showDistilleryMenus = hasDistillery;
    // Brewery OR Distillery: transit + hologram menus.
    this.showBreweryOrDistilleryMenus = hasDistillery || hasBrewery;

    console.log('Resolved menu flags:', {
      hasDistillery,
      hasBrewery,
      showDistilleryMenus: this.showDistilleryMenus,
      showBreweryOrDistilleryMenus: this.showBreweryOrDistilleryMenus
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
      '/dashboard/admin/oic'
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

  canAccessSection(section: string): boolean {
    if (this.isLicenseeUser() || this.isSiteAdminUser()) {
      return false;
    }

    if (this.isPermitSectionUser() && section === 'transit-applications') {
      return false;
    }

    // Allow hologram-inventory for OIC users only
    if (section === 'hologram-inventory' && this.isOicUser()) {
      return true;
    }

    if (this.isOicUser() && (section === 'itcell-hologram' || section === 'new-license' || section === 'hologram')) {
      return false;
    }

    if (this.isCommissionerUser() && (section === 'itcell-hologram' || section === 'hologram-register' || section === 'hologram-daily-entry' || section === 'transit')) {
      return false;
    }

    // Keep commissioner procurement tab visible even if DB navigation tokens are incomplete.
    if (this.isCommissionerUser() && section === 'hologram') {
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

    const tokenMap: Record<string, string[]> = {
      'new-license': ['new_license', 'new-license', 'license_application', 'new_license_application'],
      'requisition': ['ena_requisition', 'requisition'],
      'revalidation': ['ena_revalidation', 'revalidation'],
      'cancellation': ['ena_cancellation', 'cancellation'],
      'transit': ['transit_permit', 'transit'],
      'hologram': ['hologram_procurement', 'hologram_request', 'hologram'],
      'commissioner-hologram-working-records': ['daily_hologram', 'hologram_daily', 'daily_register', 'hologram_register', 'hologram'],
      'commissioner-monthly-view-details': ['hologram_monthly', 'monthly_hologram', 'hologram_statement', 'hologram'],
      'itcell-hologram': ['hologram_procurement', 'itcell_hologram', 'it_cell', 'hologram'],
      'transit-applications': ['transit_permit', 'transit'],
      'brands': ['brand', 'brands'],
      'monthly-hologram-statement': ['hologram_monthly', 'monthly_hologram', 'hologram_statement'],
      'hologram-inventory': ['hologram_inventory', 'hologram_overview', 'hologram'],
      'hologram-register': ['hologram_register', 'hologram'],
      'hologram-daily-entry': ['hologram_daily', 'hologram'],
      'stock-inventory': ['stock_inventory', 'inventory', 'brandwarehouse'],
      'officer-activity': ['officer_activity', 'officer'],
      'salesman-barman-registration': ['salesman_barman', 'salesman-barman', 'salesmanbarman'],
      'company-registration': ['company_registration', 'company-registration', 'companyregistration'],
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

