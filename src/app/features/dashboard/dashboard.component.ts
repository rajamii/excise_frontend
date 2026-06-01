import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, finalize, of, catchError, interval, skip } from 'rxjs';

import { DashboardConfig, User } from '../../core/models/dashboard.models';
import { RoleService } from '../../core/services/role.service';
import { DashboardConfigService } from '../../core/services/dashboard-config.service';
import { UnifiedDashboardService } from '../../core/services/unified-dashboard.service';
import { LicenseMeService } from '../../core/services/license-me.service';
import { UnifiedApplication } from '../../core/models/unified-application.model';
import { DashboardCount } from '../../core/models/dashboard.model';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationTableComponent } from '../licensee/licensee-dashboard/application-table/application-table.component';
import { SalesmanBarmanRegistrationService } from '../../core/services/salesman-barman-registration.service';
import { AccountService } from '../../core/services/account.service';
import { HologramDataService } from '../licensee/supplyChain/services/hologram-data.service';
import { SidebarPendingBadgeService } from '../../shared/services/sidebar-pending-badge.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';
import {
  filterRowsForSupplyChainSidebarMenus,
  isLicenseeWalletNavEligible
} from '../../shared/utils/wallet-nav-eligibility.util';

// Supply Chain Components
import { RequisitionComponent } from '../licensee/supplyChain/supplychaincomponents/requisition/requisition.component';
import { RevalidationComponent } from '../licensee/supplyChain/supplychaincomponents/revalidation/revalidation.component';
import { CancellationComponent } from '../licensee/supplyChain/supplychaincomponents/cancellation/cancellation.component';
import { TransitComponent } from '../licensee/supplyChain/supplychaincomponents/transit/transit.component';
import { OicTransitPermitComponent } from '../licensee/supplyChain/supplychaincomponents/oic-transit-permit/oic-transit-permit.component';
import { HologramprocurementComponent } from '../licensee/supplyChain/supplychaincomponents/hologramprocurement/hologramprocurement.component';
import { HologramrequestComponent } from '../licensee/supplyChain/supplychaincomponents/hologramrequest/hologramrequest.component';
import { TransitPermitComponent } from '../licensee/supplyChain/transit-permit/transit-permit.component';
import { ImportPermitComponent } from '../licensee/supplyChain/import-permit/import-permit.component';
import { Hologramrequestlevel1Component } from '../licensee/supplyChain/HoloGram/hologramrequestlevel1/hologramrequestlevel1.component';
import { HologramComponent } from '../licensee/supplyChain/HoloGram/hologram/hologram.component';
import { NewLicenseDashboardComponent } from '../licensee/supplyChain/supplychaincomponents/new-license/new-license-dashboard.component';
import { LicenseRenewalDashboardComponent } from '../licensee/supplyChain/supplychaincomponents/license-renewal/license-renewal-dashboard.component';
import { RegistrationManagementComponent } from '../licensee/supplyChain/supplychaincomponents/registration-management/registration-management.component';
import { PaymentConfirmationComponent } from '../licensee/supplyChain/payments/paymentconformationpage/payment-confirmation.component';

// Officer-specific Components
import { HologramMonthlyReportComponent } from '../licensee/supplyChain/registers/hologram-monthly-report/hologram-monthly-report.component';
import { HologramdetailsComponent } from '../licensee/supplyChain/HoloGram/hologramdetails/hologramdetails.component';
import { OfficerinchargehologramreqComponent } from '../licensee/supplyChain/HoloGram/officerinchargehologramreq/officerinchargehologramreq.component';
import { OicdailyhologramregisterComponent } from '../licensee/supplyChain/registers/oicdailyhologramregister/oicdailyhologramregister.component';
import { BrandwarehouseComponent } from '../licensee/supplyChain/registers/brandwarehouse/brandwarehouse.component';
import { OicBlDetailsComponent } from '../admin/officer-in-charge/oic-bl-details/oic-bl-details.component';
import { ITCELLComponent } from '../admin/it-cell/itcell.component';
import { HologramoveriewComponent } from '../licensee/supplyChain/HoloGram/hologramoveriew/hologramoveriew.component';
import { DailyhologramrecordregisterComponent } from '../admin/commissioner/dailyhologramrecordregister/dailyhologramrecordregister.component';

// Role-specific Dashboard Components
import { PermitSectionDashboardComponent } from './role-components/permit-section-dashboard.component';
import { CommissionerDashboardComponent as CommissionerDashboard } from './role-components/commissioner-dashboard.component';
import { ITCellDashboardComponent } from './role-components/itcell-dashboard.component';
import { OfficerInChargeDashboardComponent } from './role-components/officer-in-charge-dashboard.component';
import { PrepareApplicationComponent as CompanyPrepareApplicationComponent } from '../licensee/company-registration-and-collaboration/company-registration/prepare-application/prepare-application.component';
import { PrepareApplicationComponent as CompanyCollaborationPrepareApplicationComponent } from '../licensee/company-registration-and-collaboration/company-collaboration/prepare-application/prepare-application.component';
import { PrepareApplicationComponent as SalesmanPrepareApplicationComponent } from '../licensee/salesman-registration/prepare-application.component';
import { LabelRegistrationPrepareApplicationComponent } from '../licensee/label-registration/prepare-application/prepare-application.component';
import { ApplyNewLicenseComponent } from '../licensee/apply-new-license/apply-new-license.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    ApplicationTableComponent,
    // Supply Chain Components
    RequisitionComponent,
    RevalidationComponent,
    CancellationComponent,
    TransitComponent,
    OicTransitPermitComponent,
    HologramprocurementComponent,
    HologramrequestComponent,
    TransitPermitComponent,
    ImportPermitComponent,
    Hologramrequestlevel1Component,
    HologramComponent,
    NewLicenseDashboardComponent,
    LicenseRenewalDashboardComponent,
    RegistrationManagementComponent,
    PaymentConfirmationComponent,
    // Officer-specific Components
    HologramMonthlyReportComponent,
    HologramdetailsComponent,
    OfficerinchargehologramreqComponent,
    OicdailyhologramregisterComponent,
    BrandwarehouseComponent,
    OicBlDetailsComponent,
    ITCELLComponent,
    HologramoveriewComponent,
    DailyhologramrecordregisterComponent,
    // Role-specific Dashboard Components
    PermitSectionDashboardComponent,
    CommissionerDashboard,
    ITCellDashboardComponent,
    OfficerInChargeDashboardComponent,
    CompanyPrepareApplicationComponent,
    CompanyCollaborationPrepareApplicationComponent,
    SalesmanPrepareApplicationComponent,
    LabelRegistrationPrepareApplicationComponent,
    ApplyNewLicenseComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild(DailyhologramrecordregisterComponent)
  private dailyHologramWorkingRecords?: DailyhologramrecordregisterComponent;

  private destroy$ = new Subject<void>();
  private readonly licenseApiBase = `${environment.apiBaseUrl}/masters/license`;
  private readonly newLicenseApiBase = `${environment.apiBaseUrl}/transactional/new_license_application`;

  dashboardConfig!: DashboardConfig;
  currentUser: User | null = null;
  dashboardData: any = {};
  isLoading = false;
  error: string | null = null;

  // Professional dashboard properties (from licensee dashboard)
  dashboardCounts: DashboardCount & { awaitingPayment?: number } = {
    applied: 0,
    pending: 0,
    objection: 0,
    approved: 0,
    rejected: 0,
    awaitingPayment: 0
  };

  supplyChainPendingCounts: Record<string, number> = {};
  oicActionPendingCounts: Record<string, number> = {};

  selectedMetricsPeriod: 'today' | 'week' | 'month' | 'quarter' = 'week';

  appliedDataSource = new MatTableDataSource<UnifiedApplication>();
  pendingDataSource = new MatTableDataSource<UnifiedApplication>();
  objectionDataSource = new MatTableDataSource<UnifiedApplication>();
  approvedDataSource = new MatTableDataSource<UnifiedApplication>();
  rejectedDataSource = new MatTableDataSource<UnifiedApplication>();

  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];
  activeTable: 'default' | 'applied' | 'pending' | 'objection' | 'approved' | 'rejected' = 'approved';
  private applicationsLoaded = false;
  private applicationsLoading = false;

  // Supply Chain Section Management
  selectedSupplyChainSection: string | null = null;
  walletViewMode: 'wallets' | 'others' = 'wallets';
  private licenseeMenuAccessResolved = false;
  private showDistilleryMenus = false;
  private showBreweryOrDistilleryMenus = false;
  private showBreweryOrDistilleryWalletViews = false;
  private showManufacturingWalletNav = false;
  private walletEligibilityResolved = false;
  private walletEligibilityLoading = false;

  // Professional dashboard enhancements
  previousCounts: DashboardCount = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 };
  recentActivities: any[] = [];
  performanceMetrics: any[] = [];
  customStats: any[] = [];
  quickActions: any[] = [];

  // User activity log (Officer Activity / License Activity)
  userActivities: any[] = [];
  userActivityLoading = false;
  userActivityError: string | null = null;
  userActivityLimit = 500;
  activityFilterType = '';
  activityFilterUserId = '';
  activityFilterMonth = '';       // YYYY-MM
  activityFilterDate = '';        // YYYY-MM-DD
  activityFilterAction = '';      // '' | 'LOGIN' | 'LOGOUT'

  // Pagination
  activityPage = 1;
  activityPageSize = 10;
  activityTotalCount = 0;

  get activityTotalPages(): number {
    return Math.max(1, Math.ceil(this.activityTotalCount / this.activityPageSize));
  }

  get activityPagedRows(): any[] {
    const start = (this.activityPage - 1) * Number(this.activityPageSize);
    return this.userActivities.slice(start, start + Number(this.activityPageSize));
  }

  get activityPageNumbers(): number[] {
    const total = this.activityTotalPages;
    const current = this.activityPage;
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  activityGoToPage(page: number): void {
    if (page < 1 || page > this.activityTotalPages) return;
    this.activityPage = page;
  }

  now = new Date();
  greetingText = 'Welcome';
  userDisplayName = 'User';
  userRoleDisplayName = 'User';
  private pendingHologramOverviewRedirect = false;

  constructor(
    private roleService: RoleService,
    private dashboardConfigService: DashboardConfigService,
    private unifiedDashboardService: UnifiedDashboardService,
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private accountService: AccountService,
    private hologramService: HologramDataService,
    private sidebarPendingBadgeService: SidebarPendingBadgeService,
    private licenseMeService: LicenseMeService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.startWelcomeClock();
    this.bindCurrentUser();
    this.handleQueryParams();
    this.initializeDashboard();
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

  private startWelcomeClock(): void {
    this.refreshWelcomeText();
    interval(60_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.now = new Date();
        this.refreshWelcomeText();
      });
  }

  private bindCurrentUser(): void {
    this.roleService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUser = user;
          this.refreshWelcomeText();
          this.tryRedirectHologramOverview();
        }
      });
  }

  private tryRedirectHologramOverview(): void {
    if (!this.pendingHologramOverviewRedirect) return;
    if (this.currentUser?.roleId !== 7) return; // Only OIC

    this.pendingHologramOverviewRedirect = false;
    this.router.navigate(['/dashboard/hologram-overview'], { replaceUrl: true });
  }

  private refreshWelcomeText(): void {
    const hour = this.now.getHours();
    if (hour < 12) this.greetingText = 'Good morning';
    else if (hour < 17) this.greetingText = 'Good afternoon';
    else if (hour < 21) this.greetingText = 'Good evening';
    else this.greetingText = 'Welcome';

    const name = (this.currentUser?.fullName || '').trim() || (this.currentUser?.username || '').trim();
    this.userDisplayName = name || 'User';

    let roleFromUser =
      (this.currentUser?.role?.displayName || '').trim() ||
      (this.currentUser?.role?.name || '').trim();

    // If RoleService fallback labels are present, prefer backend/localStorage role name for dynamic roles.
    if (/^Role ID:\s*\d+$/i.test(roleFromUser) || /^Role\s+\d+$/i.test(roleFromUser)) {
      const backendRoleName =
        String((this.accountService.getCurrentUser() as any)?.role?.name || '').trim() ||
        String(localStorage.getItem('role') || '').trim();
      if (backendRoleName) {
        roleFromUser = this.humanizeRoleName(backendRoleName);
      }
    } else if (roleFromUser) {
      roleFromUser = this.humanizeRoleName(roleFromUser);
    }

    if (roleFromUser) {
      this.userRoleDisplayName = roleFromUser;
    } else if (this.currentUser?.roleId) {
      this.userRoleDisplayName = this.roleService.getRoleName(this.currentUser.roleId);
    } else {
      this.userRoleDisplayName = 'User';
    }
  }

  private humanizeRoleName(value: string): string {
    const cleaned = String(value || '').trim();
    if (!cleaned) return '';

    return cleaned
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(' ');
  }

  // Handle query parameters for supply chain section navigation
  private handleQueryParams(): void {
    const initialSection = this.route.snapshot.queryParamMap.get('section');
    this.selectedSupplyChainSection = initialSection || null;
    this.enforceSectionAccess();
    this.walletViewMode = this.readWalletViewFromParams(this.route.snapshot.queryParams);
    this.ensureWalletViewParamAllowed(this.route.snapshot.queryParams);

    if (this.selectedSupplyChainSection === 'hologram-overview') {
      this.pendingHologramOverviewRedirect = true;
      this.tryRedirectHologramOverview();
    }

    // Subscribe to query parameter changes
    this.route.queryParams
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe(params => {
        const section = params['section'];
        this.selectedSupplyChainSection = section || null;
        this.enforceSectionAccess();
        this.walletViewMode = this.readWalletViewFromParams(params);
        this.ensureWalletViewParamAllowed(params);

        if (this.selectedSupplyChainSection === 'hologram-overview') {
          this.pendingHologramOverviewRedirect = true;
          this.tryRedirectHologramOverview();
        }

        if (this.selectedSupplyChainSection === 'officer-activity') {
          this.loadUserActivities();
        }

        // Navigating back to /dashboard (clearing section) should always reload stats.
        if (!this.selectedSupplyChainSection) {
          this.activeTable = 'approved';
          this.loadDashboardData();
        }
      });
  }

  get activitySectionTitle(): string {
    return this.isLicenseeUser() ? 'License Activity' : 'Officer Activity';
  }

  loadUserActivities(): void {
    if (!this.currentUser) {
      return;
    }

    this.userActivityLoading = true;
    this.userActivityError = null;
    this.activityPage = 1; // reset to first page on every fresh load

    let params = new HttpParams().set('limit', String(Number(this.userActivityLimit) || 500));

    const type = String(this.activityFilterType || '').trim();
    if (type) {
      params = params.set('type', type);
    }

    // Login / Logout quick filter
    const action = String(this.activityFilterAction || '').trim();
    if (action) {
      params = params.set('action', action);
    }

    // Month filter (YYYY-MM)
    const month = String(this.activityFilterMonth || '').trim();
    if (month) {
      params = params.set('month', month);
    }

    // Specific date filter (YYYY-MM-DD) — takes precedence over month if both set
    const date = String(this.activityFilterDate || '').trim();
    if (date) {
      params = params.set('date', date);
    }

    // Only admins/officers can filter other users; licensee always gets their own activity from backend.
    const userId = String(this.activityFilterUserId || '').trim();
    if (!this.isLicenseeUser() && userId) {
      params = params.set('user_id', userId);
    }

    this.http.get<any[]>(`${environment.apiBaseUrl}/transactional/logs/activities/`, { params })
      .pipe(
        finalize(() => (this.userActivityLoading = false)),
        catchError((err) => {
          this.userActivityError = err?.error?.detail || 'Failed to load activity log.';
          this.userActivities = [];
          this.activityTotalCount = 0;
          return of([]);
        })
      )
      .subscribe((rows: any[]) => {
        this.userActivities = Array.isArray(rows) ? rows : [];
        this.activityTotalCount = this.userActivities.length;
      });
  }

  private getActivityCode(row: any): string {
    return String(row?.activity_type || row?.activityType || '').trim().toUpperCase();
  }

  private getActivityDisplay(row: any): string {
    return String(row?.activity_type_display || row?.activityTypeDisplay || '').trim().toLowerCase();
  }

  private getRowTimestampMs(row: any): number | null {
    const raw = row?.timestamp || row?.created_at || row?.createdAt;
    if (!raw) return null;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : null;
  }

  getActivityActionLabel(row: any): string {
    // Check both the raw code and the display value (API may return either)
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);

    if (code === 'LOGIN'  || display === 'login')          return 'Login';
    if (code === 'LOGOUT' || display === 'logout')         return 'Logout';
    if (code === 'REG'    || display.includes('registr'))  return 'Registration';
    if (code === 'PASS_RESET' || display.includes('password')) return 'Password Reset';
    if (code === 'USR_UPD'   || display.includes('update'))    return 'User Update';
    if (code === 'USR_DEL'   || display.includes('delet'))     return 'User Delete';

    // Fallback: use display value if available, else code
    return (row?.activity_type_display || row?.activityTypeDisplay || code || 'Activity');
  }

  getActivityBadgeClass(row: any): string {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);

    if (code === 'LOGIN'  || display === 'login')          return 'act-badge--login';
    if (code === 'LOGOUT' || display === 'logout')         return 'act-badge--logout';
    if (code === 'PASS_RESET' || display.includes('password')) return 'act-badge--warn';
    if (code === 'USR_DEL'   || display.includes('delet'))     return 'act-badge--danger';
    if (code === 'USR_UPD'   || display.includes('update'))    return 'act-badge--update';
    if (code === 'REG'    || display.includes('registr'))  return 'act-badge--reg';
    return 'act-badge--default';
  }

  getActivityIcon(row: any): string {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);

    if (code === 'LOGIN'  || display === 'login')   return 'login';
    if (code === 'LOGOUT' || display === 'logout')  return 'logout';
    if (code === 'PASS_RESET' || display.includes('password')) return 'key';
    if (code === 'USR_DEL'   || display.includes('delet'))     return 'person_remove';
    if (code === 'USR_UPD'   || display.includes('update'))    return 'manage_accounts';
    if (code === 'REG'    || display.includes('registr'))      return 'person_add';
    return 'radio_button_checked';
  }

  isLoginActivity(row: any): boolean {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    return code === 'LOGIN' || display === 'login';
  }

  isLogoutActivity(row: any): boolean {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    return code === 'LOGOUT' || display === 'logout';
  }

  isWarnActivity(row: any): boolean {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    return code === 'PASS_RESET' || code === 'USR_DEL' ||
           display.includes('password') || display.includes('delet');
  }

  isInfoActivity(row: any): boolean {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    return code === 'REG' || code === 'USR_UPD' ||
           display.includes('registr') || display.includes('update');
  }

  /** Returns first ~70 chars of user agent — browser + OS only, no full UA string */
  getShortUserAgent(userAgent: any): string {
    const ua = String(userAgent || '').trim();
    if (!ua) return '';
    const lower = ua.toLowerCase();
    const browser =
      lower.includes('edg/') ? 'Edge' :
      lower.includes('chrome/') ? 'Chrome' :
      lower.includes('firefox/') ? 'Firefox' :
      lower.includes('safari/') && !lower.includes('chrome/') ? 'Safari' :
      'Browser';
    const os =
      lower.includes('windows') ? 'Windows' :
      lower.includes('android') ? 'Android' :
      lower.includes('iphone') || lower.includes('ipad') ? 'iOS' :
      lower.includes('mac os') || lower.includes('macintosh') ? 'macOS' :
      lower.includes('linux') ? 'Linux' : '';
    return os ? `${browser} / ${os}` : browser;
  }

  /**
   * Session duration:
   * - LOGOUT row → find the nearest LOGIN in the full list (same user, within 24h), show |diff|
   * - LOGIN row  → find the nearest LOGOUT after it (same user, within 24h), show diff
   *
   * Uses loose equality for user_id to handle int/string mismatches from the API.
   * Falls back to ignoring user_id when only one user's data is present (licensee view).
   */
  getSessionDuration(row: any): string | null {
    const code    = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    const isLogin  = code === 'LOGIN'  || display === 'login';
    const isLogout = code === 'LOGOUT' || display === 'logout';

    if (!isLogin && !isLogout) return null;

    const rowTimeMs = this.getRowTimestampMs(row);
    if (!rowTimeMs) return null;

    // Use loose equality — API may return user_id as int, stored as number, but coerce to string for safety
    const userId = row?.user_id != null ? String(row.user_id) : null;

    const sameUser = (candidate: any): boolean => {
      if (!userId) return true; // no user_id on row — match all (single-user view)
      const cId = candidate?.user_id != null ? String(candidate.user_id) : null;
      if (!cId) return true;
      return cId === userId;
    };

    const formatDiff = (ms: number): string => {
      const absMs = Math.abs(ms);
      const mins  = Math.floor(absMs / 60000);
      if (mins < 1) return '< 1 min';
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

    if (isLogout) {
      // Find the nearest LOGIN by the same user — closest absolute time within 24h window.
      let bestDiff: number | null = null;

      for (const candidate of this.userActivities) {
        if (!candidate || candidate === row) continue;
        if (!sameUser(candidate)) continue;
        const cCode    = this.getActivityCode(candidate);
        const cDisplay = this.getActivityDisplay(candidate);
        if (cCode !== 'LOGIN' && cDisplay !== 'login') continue;
        const loginTime = this.getRowTimestampMs(candidate);
        if (!loginTime) continue;
        const diff = Math.abs(rowTimeMs - loginTime);
        if (diff > WINDOW_MS) continue;
        if (bestDiff === null || diff < bestDiff) {
          bestDiff = diff;
        }
      }

      return bestDiff !== null ? formatDiff(bestDiff) : null;
    }

    // LOGIN row: find the nearest LOGOUT for the same user within 24h.
    let bestDiff: number | null = null;

    for (const candidate of this.userActivities) {
      if (!candidate || candidate === row) continue;
      if (!sameUser(candidate)) continue;
      const cCode    = this.getActivityCode(candidate);
      const cDisplay = this.getActivityDisplay(candidate);
      if (cCode !== 'LOGOUT' && cDisplay !== 'logout') continue;
      const logoutTime = this.getRowTimestampMs(candidate);
      if (!logoutTime) continue;
      const diff = Math.abs(logoutTime - rowTimeMs);
      if (diff > WINDOW_MS) continue;
      if (bestDiff === null || diff < bestDiff) {
        bestDiff = diff;
      }
    }

    return bestDiff !== null ? formatDiff(bestDiff) : null;
  }

  /** Single compact summary line for the detail area */
  getActivitySummaryLine(row: any): string {
    const code = this.getActivityCode(row);
    const display = this.getActivityDisplay(row);
    const meta = (row?.metadata && typeof row.metadata === 'object') ? row.metadata : {};

    const isLogin  = code === 'LOGIN'  || display === 'login';
    const isLogout = code === 'LOGOUT' || display === 'logout';
    const isReg    = code === 'REG'    || display.includes('registr');

    if (isLogin) {
      const method = String(meta?.auth_method ?? meta?.authMethod ?? meta?.method ?? '').trim();
      return method ? `Auth method: ${method}` : 'Session started';
    }
    if (isLogout) {
      const method = String(meta?.method ?? meta?.logout_method ?? meta?.logoutMethod ?? '').trim();
      return method ? `Logout method: ${method}` : 'Session ended';
    }
    if (isReg) {
      const src = String(meta?.initial_source ?? meta?.initialSource ?? '').trim();
      const method = String(meta?.registration_method ?? meta?.registrationMethod ?? meta?.method ?? '').trim();
      const parts = [method && `via ${method}`, src && `source: ${src}`].filter(Boolean);
      return parts.length ? parts.join(', ') : 'Account registered';
    }
    if (code === 'PASS_RESET' || display.includes('password')) return 'Password reset completed';
    if (code === 'USR_UPD' || display.includes('update')) {
      const fields = meta?.updated_fields ?? meta?.updatedFields ?? meta?.fields;
      if (Array.isArray(fields) && fields.length) {
        return `Updated: ${fields.slice(0, 3).map((v: any) => String(v)).join(', ')}${fields.length > 3 ? '…' : ''}`;
      }
      return 'Profile updated';
    }
    if (code === 'USR_DEL' || display.includes('delet')) return 'Account deleted';

    // Fallback: render all metadata key-value pairs compactly
    const entries = Object.entries(meta).filter(([_, v]) => v !== null && v !== undefined && v !== '');
    if (entries.length) {
      return entries.slice(0, 3).map(([k, v]) => `${this.humanizeKey(k)}: ${String(v).slice(0, 40)}`).join(' · ');
    }
    return '';
  }

  private humanizeKey(key: string): string {
    return String(key || '')
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim()
      .split(/\s+/)
      .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  private readWalletViewFromParams(params: any): 'wallets' | 'others' {
    if (this.selectedSupplyChainSection !== 'wallet') {
      return 'wallets';
    }
    // Only force "others" when wallet eligibility is fully resolved and we know the user
    // does not have access to the distillery/brewery wallet views. Otherwise, default to
    // "wallets" for a friendlier first-load.
    if (
      this.isLicenseeUser() &&
      this.licenseeMenuAccessResolved &&
      this.walletEligibilityResolved &&
      !this.showBreweryOrDistilleryWalletViews
    ) {
      return 'others';
    }
    const value = String(params?.walletView || '').trim().toLowerCase();
    return value === 'others' ? 'others' : 'wallets';
  }

  private ensureWalletViewParamAllowed(params: any): void {
    if (this.selectedSupplyChainSection !== 'wallet') {
      return;
    }
    if (!this.isLicenseeUser()) {
      return;
    }
    if (!this.licenseeMenuAccessResolved) {
      return;
    }
    if (!this.walletEligibilityResolved || this.showBreweryOrDistilleryWalletViews) {
      return;
    }

    const raw = String(params?.walletView || '').trim().toLowerCase();
    if (raw === 'others' || raw === '') {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { walletView: 'others' },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  shouldShowWalletViewToggle(): boolean {
    if (this.selectedSupplyChainSection !== 'wallet') {
      return false;
    }
    if (!this.isLicenseeUser()) {
      return true;
    }
    if (!this.licenseeMenuAccessResolved) {
      return false;
    }
    return this.showManufacturingWalletNav && this.showBreweryOrDistilleryWalletViews;
  }

  setWalletViewMode(mode: 'wallets' | 'others'): void {
    if (
      this.isLicenseeUser() &&
      this.licenseeMenuAccessResolved &&
      this.walletEligibilityResolved &&
      !this.showBreweryOrDistilleryWalletViews
    ) {
      mode = 'others';
    }
    if (!mode || this.walletViewMode === mode) return;
    this.walletViewMode = mode;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { walletView: mode },
      queryParamsHandling: 'merge'
    });
  }

  private initializeDashboard() {
    // Get current user from role service
    this.currentUser = this.roleService.getCurrentUser();
    this.refreshWelcomeText();

    // If no current user in role service, try to get from account service
    if (!this.currentUser) {
      this.accountService.identity().subscribe(accountUser => {
        if (accountUser) {
          // Map account user to unified user (same logic as unified layout)
          const mappedUser = this.mapAccountUserToUnifiedUser(accountUser);
          this.roleService.setCurrentUser(mappedUser);
          this.currentUser = mappedUser;
          this.refreshWelcomeText();
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
    this.dashboardConfigService.getCurrentUserDashboardConfigCached()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.dashboardConfig = config;
          this.loadLicenseeMenuAccess();
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
    // Officer dashboards are full-page components and should render directly
    // without waiting for unified stats/table data.
    if (this.shouldShowRoleSpecificDashboard()) {
      this.isLoading = false;
      return;
    }

    // If no specific section is selected, load dashboard stats
    if (!this.selectedSupplyChainSection) {
      this.loadDashboardStatsLight();
    } else {
      this.isLoading = false; // Directly show the section
    }
  }

  getSupplyChainPendingCount(section: string): number {
    const key = String(section || '').trim().toLowerCase();
    return Number(this.supplyChainPendingCounts?.[key] || 0);
  }

  getOicPendingCount(section: string): number {
    const key = String(section || '').trim().toLowerCase();
    return Number(this.oicActionPendingCounts?.[key] || 0);
  }

  getSupplyChainPendingTotal(): number {
    return this.getSupplyChainPendingCount('requisition') + this.getSupplyChainPendingCount('hologram');
  }

  isOicUser(): boolean {
    const roleId = Number(this.currentUser?.roleId || 0);
    if (roleId === 7) return true;

    const roleName = String(this.currentUser?.role?.name || this.currentUser?.role?.displayName || '').toLowerCase();
    const normalized = roleName.replace(/[^a-z0-9]/g, '');
    return normalized.includes('officerincharge') || normalized === 'oic' || normalized === 'offcierincharge';
  }

  private refreshSupplyChainPendingCounts(force = false): void {
    if (!this.isLicenseeUser()) {
      this.supplyChainPendingCounts = {};
      return;
    }

    this.sidebarPendingBadgeService
      .refresh(['requisition', 'hologram'], force, { audience: 'licensee', mode: 'full' })
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of({} as Record<string, number>))
      )
      .subscribe((counts) => {
        this.supplyChainPendingCounts = counts || {};
      });
  }

  private refreshOicActionPendingCount(force = false): void {
    if (!this.isOicUser()) {
      this.oicActionPendingCounts = {};
      return;
    }

    // OIC dashboard "Pending" should reflect only items where the user has an action
    // (align with sidebar badges), not all in-flight applications.
    // Include Daily Hologram Entry so OIC remembers to complete the daily register.
    const sections = ['transit-applications', 'hologram-daily-entry'];
    this.sidebarPendingBadgeService
      .refresh(sections, force, { audience: 'officer', mode: 'full' })
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of({} as Record<string, number>))
      )
      .subscribe((counts) => {
        this.oicActionPendingCounts = counts || {};
        const total = Object.values(counts || {}).reduce((sum, v) => sum + Number(v || 0), 0);
        this.dashboardCounts = { ...this.dashboardCounts, pending: total };
      });
  }

  private loadDashboardStatsLight() {
    // Keep login fast: fetch only counts. Lists are fetched on-demand when user opens a table.
    this.applicationsLoaded = false;
    this.applicationsLoading = false;
    this.clearDataSources();

    this.unifiedDashboardService
      .getUnifiedDashboardCounts(this.dashboardConfig)
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: (counts) => {
          this.dashboardCounts = {
            applied: counts?.applied || 0,
            pending: counts?.pending || 0,
            objection: counts?.objection || 0,
            approved: counts?.approved || 0,
            rejected: counts?.rejected || 0,
            awaitingPayment: 0
          };
          this.refreshSupplyChainPendingCounts();
          this.refreshOicActionPendingCount();
        },
        error: (error) => {
          console.error('❌ Error loading dashboard counts:', error);
          this.dashboardCounts = { applied: 0, pending: 0, objection: 0, awaitingPayment: 0, approved: 0, rejected: 0 };
          this.supplyChainPendingCounts = {};
        }
      });
  }

  private loadDashboardStats() {
    // Use the unified dashboard service for all roles
    forkJoin({
      counts: this.unifiedDashboardService.getUnifiedDashboardCounts(this.dashboardConfig),
      applications: this.unifiedDashboardService.getUnifiedApplicationsByStatus(false, this.dashboardConfig),
      hologramProcurements: this.isLicenseeUser()
        ? this.hologramService.getProcurements().pipe(catchError(() => of([])))
        : of([])
    })
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: (result) => {
          let filteredApplications = {
            applied: result.applications.applied || [],
            pending: result.applications.pending || [],
            objection: (result.applications as any).objection || [],
            awaitingPayment: result.applications.awaitingPayment || [],
            approved: result.applications.approved || [],
            rejected: result.applications.rejected || []
          };

          // Product requirement: newly submitted applications should appear under Pending.
          const pendingBucket = [
            ...filteredApplications.pending,
            ...filteredApplications.awaitingPayment,
            ...filteredApplications.applied
          ];

          // Store counts separately but combine pending display
          this.dashboardCounts = {
            applied: 0,
            pending: pendingBucket.length,
            awaitingPayment: filteredApplications.awaitingPayment.length,
            objection: filteredApplications.objection.length,
            approved: filteredApplications.approved.length,
            rejected: filteredApplications.rejected.length
          };

          // Licensee UX: include hologram procurement workflow (circulating for approvals) in Pending/Approved totals.
          if (this.isLicenseeUser()) {
            const hologramCounts = this.countLicenseeHologramProcurements(result.hologramProcurements || []);
            this.dashboardCounts = {
              ...this.dashboardCounts,
              pending: (this.dashboardCounts.pending || 0) + hologramCounts.pending,
              approved: (this.dashboardCounts.approved || 0) + hologramCounts.approved,
              rejected: (this.dashboardCounts.rejected || 0) + hologramCounts.rejected
            };
          }

          // Show submitted + pending + awaiting payment together in Pending table.
          this.updateDataSources({
            applied: [],
            pending: pendingBucket,
            objection: filteredApplications.objection,
            approved: filteredApplications.approved,
            rejected: filteredApplications.rejected
          });

          this.refreshSupplyChainPendingCounts();
          this.refreshOicActionPendingCount();
        },
        error: (error) => {
          console.error('❌ Error loading dashboard data:', error);
          this.dashboardCounts = { applied: 0, pending: 0, objection: 0, awaitingPayment: 0, approved: 0, rejected: 0 };
          this.clearDataSources();
          this.supplyChainPendingCounts = {};
        }
      });
  }

  private ensureApplicationsLoaded(forceRefresh = false): void {
    if (this.applicationsLoading) return;
    if (!forceRefresh && this.applicationsLoaded) return;

    this.applicationsLoading = true;

    forkJoin({
      applications: this.unifiedDashboardService.getUnifiedApplicationsByStatus(forceRefresh, this.dashboardConfig),
      hologramProcurements: this.isLicenseeUser()
        ? this.hologramService.getProcurements().pipe(catchError(() => of([])))
        : of([])
    })
      .pipe(finalize(() => { this.applicationsLoading = false; }))
      .subscribe({
        next: (result) => {
          this.applicationsLoaded = true;

          const filteredApplications = {
            applied: result.applications.applied || [],
            pending: result.applications.pending || [],
            objection: (result.applications as any).objection || [],
            awaitingPayment: result.applications.awaitingPayment || [],
            approved: result.applications.approved || [],
            rejected: result.applications.rejected || []
          };

          const pendingBucket = [
            ...filteredApplications.pending,
            ...filteredApplications.awaitingPayment,
            ...filteredApplications.applied
          ];

          this.dashboardCounts = {
            ...this.dashboardCounts,
            awaitingPayment: filteredApplications.awaitingPayment.length
          };

          if (this.isLicenseeUser()) {
            const hologramCounts = this.countLicenseeHologramProcurements(result.hologramProcurements || []);
            this.dashboardCounts = {
              ...this.dashboardCounts,
              pending: (this.dashboardCounts.pending || 0) + hologramCounts.pending,
              approved: (this.dashboardCounts.approved || 0) + hologramCounts.approved,
              rejected: (this.dashboardCounts.rejected || 0) + hologramCounts.rejected
            };
          }

          this.updateDataSources({
            applied: [],
            pending: pendingBucket,
            objection: filteredApplications.objection,
            approved: filteredApplications.approved,
            rejected: filteredApplications.rejected
          });

          this.refreshSupplyChainPendingCounts();
        },
        error: (error) => {
          console.error('❌ Error loading dashboard applications:', error);
          this.clearDataSources();
          this.supplyChainPendingCounts = {};
        }
      });
  }

  private countLicenseeHologramProcurements(procurements: any[]): { pending: number; approved: number; rejected: number } {
    const rows = Array.isArray(procurements) ? procurements : [];
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    for (const row of rows) {
      const statusToken = this.normalizeStageToken(row?.status);
      if (!statusToken) continue;

      if (statusToken.includes('reject')) {
        rejected += 1;
        continue;
      }

      // Only count as approved once cartons are assigned (or payment is completed).
      const isCartonAssigned = statusToken.includes('cartoonassigned') || statusToken.includes('cartonassigned');
      const isPaymentCompleted = statusToken.includes('paymentcompleted');
      if (isCartonAssigned || isPaymentCompleted) {
        approved += 1;
        continue;
      }

      // Pending = anything still in workflow approvals / commissioner approval, excluding drafts.
      if (statusToken.includes('draft')) {
        continue;
      }
      pending += 1;
    }

    return { pending, approved, rejected };
  }

  private normalizeStageToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
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

  isCommissionerUser(): boolean {
    const roleId = Number(this.currentUser?.roleId || 0);
    if (roleId === 10) {
      return true;
    }

    const roleName = String(
      this.currentUser?.role?.name ||
      this.currentUser?.role?.displayName ||
      ''
    ).toLowerCase();
    const normalized = roleName.replace(/[^a-z0-9]/g, '');
    return normalized.includes('commissioner');
  }

  canRenderWalletSection(): boolean {
    return true;
  }

  private enforceSectionAccess(): void {
    if ([5, 6].includes(Number(this.currentUser?.roleId || 0)) && String(this.selectedSupplyChainSection || '') === 'new-license') {
      this.selectedSupplyChainSection = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: null, tab: null, source: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }

    // Licensee: cannot open ENA / transit / hologram until license fee is paid (exclude awaiting unpaid rows).
    if (
      this.isLicenseeUser() &&
      this.licenseeMenuAccessResolved &&
      this.selectedSupplyChainSection
    ) {
      const sec = String(this.selectedSupplyChainSection);
      const enaSections = new Set([
        'requisition',
        'revalidation',
        'cancellation',
        'import-permit'
      ]);
      const breweryDistSections = new Set([
        'transit',
        'hologram',
        'hologram-request',
        'transit-permit',
        'oic-transit',
        'hologram-new',
        'hologram-request-form'
      ]);
      const blocked =
        (enaSections.has(sec) && !this.showDistilleryMenus) ||
        (breweryDistSections.has(sec) && !this.showBreweryOrDistilleryMenus);
      if (blocked) {
        this.selectedSupplyChainSection = null;
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { section: null, tab: null, source: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        return;
      }
    }

    // Joint Commissioner should not access New Hologram Procurement.
    if (this.currentUser?.roleId === 9 && String(this.selectedSupplyChainSection || '') === 'hologram') {
      this.selectedSupplyChainSection = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: null, tab: null, source: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }

    if (this.currentUser?.roleId === 5 && ['transit-applications'].includes(String(this.selectedSupplyChainSection || ''))) {
      this.selectedSupplyChainSection = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: null, tab: null, source: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }

    if (this.selectedSupplyChainSection !== 'wallet') {
      return;
    }
    if (!this.isLicenseeUser()) {
      return;
    }
    if (!this.licenseeMenuAccessResolved) {
      return;
    }
    if (!this.walletEligibilityResolved) {
      this.ensureLicenseeWalletEligibilityLoaded();
      return;
    }
    // Wallet becomes visible once the source application reaches `awaiting_payment`
    // (Awaiting License Fee Payment) or final approval.
    if (!this.showManufacturingWalletNav) {
      this.selectedSupplyChainSection = null;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: null, tab: null, source: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }
  }

  private loadLicenseeMenuAccess(): void {
    if (!this.isLicenseeUser()) {
      this.licenseeMenuAccessResolved = true;
      this.showDistilleryMenus = false;
      this.showBreweryOrDistilleryMenus = false;
      this.showBreweryOrDistilleryWalletViews = false;
      this.showManufacturingWalletNav = false;
      return;
    }

    this.licenseeMenuAccessResolved = false;
    this.showDistilleryMenus = false;
    this.showBreweryOrDistilleryMenus = false;
    this.showBreweryOrDistilleryWalletViews = false;
    this.showManufacturingWalletNav = false;

    // Keep login fast: derive initial menu visibility only from licenses.
    // Wallet eligibility and application-derived menus are computed lazily when the user opens wallet.
    this.walletEligibilityResolved = false;
    this.walletEligibilityLoading = false;
    this.licenseMeService
      .getMyLicenses()
      .subscribe({
        next: (licenses) => {
          const licenseRows = Array.isArray(licenses) ? licenses : [];
          const menuRows = filterRowsForSupplyChainSidebarMenus(licenseRows);
          const hasDistillery = menuRows.some((item) => this.isDistillery(item));
          const hasBrewery = menuRows.some((item) => this.isBrewery(item));

          this.showDistilleryMenus = hasDistillery;
          this.showBreweryOrDistilleryMenus = hasDistillery || hasBrewery;
          this.showBreweryOrDistilleryWalletViews = hasDistillery || hasBrewery;
          this.showManufacturingWalletNav = false;
          this.licenseeMenuAccessResolved = true;
          this.enforceSectionAccess();
          this.ensureWalletViewParamAllowed(this.route.snapshot.queryParams);
        },
        error: () => {
          this.showDistilleryMenus = false;
          this.showBreweryOrDistilleryMenus = false;
          this.showBreweryOrDistilleryWalletViews = false;
          this.showManufacturingWalletNav = false;
          this.licenseeMenuAccessResolved = true;
          this.enforceSectionAccess();
        }
      });
  }

  private ensureLicenseeWalletEligibilityLoaded(): void {
    if (!this.isLicenseeUser()) return;
    if (!this.licenseeMenuAccessResolved) return;
    if (this.walletEligibilityResolved || this.walletEligibilityLoading) return;

    this.walletEligibilityLoading = true;

    forkJoin({
      licenses: this.licenseMeService.getMyLicenses(),
      approvedPayload: this.http.get<any>(`${this.newLicenseApiBase}/list-by-status/`).pipe(catchError(() => of({ approved: [] }))),
      allApplications: this.http.get<any[]>(`${this.newLicenseApiBase}/list/`).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ licenses, approvedPayload, allApplications }) => {
        const licenseRows = Array.isArray(licenses) ? licenses : [];
        const approvedRows = Array.isArray(approvedPayload?.approved) ? approvedPayload.approved : [];
        const allRows = Array.isArray(allApplications) ? allApplications : [];
        const approvedFromAll = allRows.filter((item) => this.isApprovedStage(item));
        const awaitingPaymentFromAll = allRows.filter((item) => this.isAwaitingPaymentStage(item));
        const combinedRows = [...licenseRows, ...approvedRows, ...approvedFromAll, ...awaitingPaymentFromAll];

        this.showManufacturingWalletNav = this.computeWalletNavVisible(combinedRows);
        this.walletEligibilityResolved = true;
        this.walletEligibilityLoading = false;

        this.enforceSectionAccess();
        this.ensureWalletViewParamAllowed(this.route.snapshot.queryParams);
      },
      error: () => {
        this.showManufacturingWalletNav = false;
        this.walletEligibilityResolved = true;
        this.walletEligibilityLoading = false;
        this.enforceSectionAccess();
      }
    });
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

  private computeWalletNavVisible(rows: any[]): boolean {
    const list = Array.isArray(rows) ? rows : [];

    const appsById = new Map<string, any>();
    for (const item of list) {
      const appId = String(item?.application_id ?? item?.applicationId ?? item?.pk ?? '').trim();
      if (appId) {
        appsById.set(appId, item);
      }
    }

    const isNewLicenseDerivedLicenseRow = (item: any): boolean => {
      const srcId = String(item?.source_object_id ?? item?.sourceObjectId ?? '').trim().toUpperCase();
      return srcId.startsWith('NLI/');
    };

    for (const item of list) {
      const hasLicenseId = !!(item?.license_id ?? item?.licenseId);

      const appId = String(item?.application_id ?? item?.applicationId ?? '').trim();
      if (appId && !hasLicenseId) {
        if (isLicenseeWalletNavEligible(item)) {
          return true;
        }
        continue;
      }

      if (hasLicenseId) {
        if (!isNewLicenseDerivedLicenseRow(item)) {
          return true;
        }

        const srcId = String(item?.source_object_id ?? item?.sourceObjectId ?? '').trim();
        const srcApp = srcId ? appsById.get(srcId) : undefined;
        if (srcApp && isLicenseeWalletNavEligible(srcApp)) {
          return true;
        }
      }
    }

    return false;
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

  // Supply Chain Section Handlers
  clearSupplyChainSection(): void {
    const parentSectionMap: Record<string, string> = {
      'import-permit': 'requisition',
      'transit-permit': 'transit',
      'hologram-new': 'hologram',
      'hologram-request-form': 'hologram-request',
      'new-license-apply': 'new-license',
      'company-registration-apply': 'company-registration',
      'company-collaboration-apply': 'company-collaboration',
      'salesman-barman-registration-apply': 'salesman-barman-registration'
    };

    const current = String(this.selectedSupplyChainSection || '').trim();
    const parent = parentSectionMap[current];

    if (parent) {
      this.selectedSupplyChainSection = parent;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { section: parent },
        queryParamsHandling: 'merge'
      });
      return;
    }

    this.selectedSupplyChainSection = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: null },
      queryParamsHandling: 'merge'
    });
  }

  // Professional dashboard methods (from licensee dashboard)
  showTable(table: 'applied' | 'pending' | 'objection' | 'approved' | 'rejected') {
    this.activeTable = table;
    // Load list-by-status APIs only when user opens a table.
    this.ensureApplicationsLoaded(false);
  }

  goBack() {
    this.activeTable = 'approved';
  }

  openFinalLicense(application: UnifiedApplication): void {
    if (!this.hasPermission(['licensee.module.view'])) {
      Swal.fire('Not allowed', 'Print license is available only for Licensee users.', 'info');
      return;
    }

    const applicationId =
      application?.applicationId ||
      (application as any)?.raw?.application_id ||
      (application as any)?.raw?.applicationId ||
      '';

    this.router.navigate(['/licensee/final-license'], {
      queryParams: {
        applicationId,
        type: application?.type || '',
        returnUrl: this.router.url
      }
    });
  }

  viewApplication(application: UnifiedApplication): void {
    // This is primarily used by Licensee dashboard tables to open the application view.
    const applicationId =
      application?.applicationId ||
      (application as any)?.raw?.application_id ||
      (application as any)?.raw?.applicationId ||
      '';

    if (!applicationId) return;

    const type = (application as any)?.type || (application as any)?.raw?.type || '';

    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id: applicationId,
        ref: applicationId,
        type,
        source: 'licensee'
      }
    });
  }

  private updateDataSources(result: {
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    objection: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }): void {
    this.appliedDataSource.data = result.applied || [];
    this.pendingDataSource.data = result.pending || [];
    this.objectionDataSource.data = result.objection || [];
    this.approvedDataSource.data = result.approved || [];
    this.rejectedDataSource.data = result.rejected || [];
  }

  private clearDataSources(): void {
    this.appliedDataSource.data = [];
    this.pendingDataSource.data = [];
    this.objectionDataSource.data = [];
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
      12: 'Deputy Commissioner Dashboard',
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
    if (this.selectedSupplyChainSection === 'officer-activity') {
      return this.isLicenseeUser() ? 'License Activity' : 'Officer Activity';
    }
    const titles: { [key: string]: string } = {
      // Common sections
      'requisition': 'Requisition Management',
      'revalidation': 'Revalidation Management',
      'cancellation': 'Cancellation Management',
      'transit': 'Transit Management',
      'hologram': 'Hologram Procurement',
      'commissioner-hologram-working-records': 'Hologram Working Records',
      'commissioner-monthly-view-details': 'Monthly View Details',
      'hologram-request': 'Hologram Request',
      'company-registration': 'Company Registration',
      'company-registration-apply': 'Company Registration',
      'company-collaboration': 'Company Collaboration',
      'company-collaboration-apply': 'Company Collaboration',
      'salesman-barman-registration': 'Salesman/Barman Registration',
      'salesman-barman-registration-apply': 'Salesman/Barman Registration',
      'label-registration': 'Label Registration',
      'new-license': 'New License Management',
      'new-license-apply': 'Apply New License',

      // SPA Forms
      'transit-permit': 'Apply Transit Permit',
      'import-permit': 'New Requisition Application',
      'hologram-request-form': 'New Hologram Request',
      'hologram-new': 'New Hologram Procurement',
      'wallet': 'Payment & Wallet',

      // IT Cell Sections
      'itcell-hologram': 'Hologram Management (IT Cell)',
      'process-flow': 'Process Flow Diagram',

      // Officer Sections
      'transit-applications': 'Transit Applications',
      'brands': 'Brand Details',
      'monthly-hologram-statement': 'Monthly Hologram Statement',
      'oic-hologram-requests': 'Hologram Requests',
      'hologram-register': 'Hologram Procurement',
      'hologram-daily-entry': 'Daily Hologram Entry',
      'stock-inventory': 'Brand Warehouse Stock',
      'bl-details': 'Bulk Spirit Details',

      'hologram-overview': 'Hologram Overview',
      'officer-activity': 'Officer Activity',
      'system-monitoring': 'System Monitoring'
    };

    return titles[this.selectedSupplyChainSection || ''] || 'Management';
  }

  // Header Action Logic
  showHeaderAction(): boolean {
    if (!this.selectedSupplyChainSection) return false;

    const section = this.selectedSupplyChainSection;

    // Commissioner: show Refresh for Working Records
    if (section === 'commissioner-hologram-working-records' && this.isCommissionerUser()) {
      return true;
    }

    // Licensee: show Create actions only
    if (!this.isLicenseeUser()) {
      return false;
    }

    // List of sections that have a "Create" action for Licensees
    const sectionsWithActions = [
      'requisition',
      'transit',
      'hologram',
      'hologram-request',
      'new-license',
      'company-registration',
      'company-collaboration',
      'salesman-barman-registration'
    ];

    return sectionsWithActions.includes(section);
  }

  getHeaderActionLabel(): string {
    const section = this.selectedSupplyChainSection;

    switch (section) {
      case 'commissioner-hologram-working-records': return 'Refresh';
      case 'requisition': return 'New Requisition';
      case 'transit': return 'Apply Transit';
      case 'hologram': return 'New Hologram';
      case 'hologram-request': return 'New Request';
      case 'new-license': return 'Apply New License';
      case 'company-registration': return 'Apply Company';
      case 'company-collaboration': return 'Apply Collaboration';
      case 'salesman-barman-registration': return 'Apply Salesman/Barman';
      default: return 'Create New';
    }
  }

  getHeaderActionIcon(): string {
    const section = this.selectedSupplyChainSection;

    switch (section) {
      case 'commissioner-hologram-working-records': return 'refresh';
      case 'requisition': return 'add_circle';
      case 'transit': return 'local_shipping';
      case 'hologram': return 'add_circle';
      case 'hologram-request': return 'add_circle';
      case 'new-license': return 'add_circle';
      case 'company-registration': return 'add_circle';
      case 'company-collaboration': return 'add_circle';
      case 'salesman-barman-registration': return 'add_circle';
      default: return 'add';
    }
  }

  onHeaderAction(): void {
    const section = this.selectedSupplyChainSection;

    if (section === 'commissioner-hologram-working-records') {
      this.dailyHologramWorkingRecords?.refreshData();
      return;
    }

    if (section === 'requisition') {
      // Navigate within SPA to the import permit (requisition) application form
      this.router.navigate(['/dashboard'], { queryParams: { section: 'import-permit' } });
    } else if (section === 'transit') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'transit-permit' } });
    } else if (section === 'hologram') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'hologram-new' } });
    } else if (section === 'hologram-request') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'hologram-request-form' } });
    } else if (section === 'new-license') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'new-license-apply' } });
    } else if (section === 'company-registration') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'company-registration-apply' } });
    } else if (section === 'company-collaboration') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'company-collaboration-apply' } });
    } else if (section === 'salesman-barman-registration') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'salesman-barman-registration-apply' } });
    }
  }



  // Open wallet dialog
  openWallet(): void {
    const walletView =
      this.isLicenseeUser() &&
      this.licenseeMenuAccessResolved &&
      this.walletEligibilityResolved &&
      !this.showBreweryOrDistilleryWalletViews
        ? 'others'
        : 'wallets';
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'wallet',
        tab: 'recharge', // Default to recharge/wallet tab
        walletView,
        source: 'dashboard-wallet',
        nav: Date.now()
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
    if (['applied', 'pending', 'objection', 'approved', 'rejected'].includes(type)) {
      return true;
    }
    
    return false;
  }

  getStatTrend(type: string): number {
    // Mock trend data - in real app, this would come from backend
    const trends: { [key: string]: number } = {
      applied: 12,
      pending: -8,
      objection: 6,
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
      case 'objection':
        return 'Needs correction';
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

  openDashboardSection(section: string): void {
    if (section === 'hologram-overview' && this.currentUser?.roleId === 7) {
      this.router.navigate(['/dashboard/hologram-overview']);
      return;
    }
    this.router.navigate(['/dashboard'], { queryParams: { section } });
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
