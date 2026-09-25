import { Injectable, Inject, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Account } from '../models/account.model';
import { environment } from '../../../environments/environment';
import { Observable, ReplaySubject, of, shareReplay, catchError, tap } from 'rxjs';
import { TokenUtil } from '../../shared/utils/token.util';
import { Router } from '@angular/router';
import { RoleService } from './role.service';
import { ReadApiCacheInterceptor } from '../interceptors/read-api-cache.interceptor';
import { UnifiedDashboardService } from './unified-dashboard.service';
import { LicenseApplicationService } from './license-application.service';
import { CompanyRegistrationService } from './company-registration.service';
import { LabelRegistrationService } from './label-registration.service';
import { SpecialPermitService } from './special-permit.service';
import { UserService } from './user.service';
import { CompanyCollaborationService } from './company-collaboration.service';
import { DistributorPermitService } from './distributor-permit.service';
import { EnaRequisitionService } from './ena-requisition.service';
import { SidebarPendingBadgeService } from '../../shared/services/sidebar-pending-badge.service';
import { SupplyChainService } from '../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../features/licensee/supplyChain/services/hologram-data.service';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private readonly blockedUsersStorageKey = 'frontend_blocked_users';
  getCurrentUser() {
    return this.userIdentity;
  }
  getCurrentUserRoles() {
    return this.userIdentity?.role?.id ? [this.userIdentity.role.id] : [];
  }
  private baseUrl = `${environment.apiBaseUrl}/auth/users`;
  private userIdentity: Account | null = null;
  private authenticationState = new ReplaySubject<Account | null>(1);
  private accountCache$?: Observable<Account> | null;
  private logoutTimer?: any;

  constructor(
    private http: HttpClient,
    private roleService: RoleService,
    private router: Router,
    private injector: Injector,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    console.log('🔧 AccountService constructor called');
    console.log('🌐 isPlatformBrowser:', isPlatformBrowser(this.platformId));

    // Only restore identity if in browser (not during SSR)
    if (isPlatformBrowser(this.platformId)) {
      this.restoreIdentityFromStorage();
    }
  }

  /**
   * Restore user identity from localStorage (browser only)
   * Only restores if BOTH access and refresh tokens exist
   */
  private restoreIdentityFromStorage(): void {
    console.log('🔍 restoreIdentityFromStorage called');

    // Check if tokens exist FIRST
    const accessToken = localStorage.getItem('access');
    const refreshToken = localStorage.getItem('refresh');

    console.log('📦 Tokens in localStorage:', {
      hasAccess: !!accessToken,
      hasRefresh: !!refreshToken,
      accessLength: accessToken?.length || 0,
      refreshLength: refreshToken?.length || 0
    });

    // If no tokens, don't restore identity (user is not logged in)
    if (!accessToken || !refreshToken) {
      console.log('❌ No tokens found - emitting NULL to authenticationState');
      this.authenticationState.next(null);
      return;
    }

    console.log('✅ Tokens found - checking user data...');

    // Tokens exist, now check for user data
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    const roleId = Number(localStorage.getItem('role_id') || 0);
    const firstName = localStorage.getItem('firstName');
    const lastName = localStorage.getItem('lastName');
    const hasActiveLicense = localStorage.getItem('has_active_license');

    console.log('📦 User data in localStorage:', {
      username,
      role,
      roleId,
      firstName,
      lastName,
      hasActiveLicense
    });

    if (username && role && firstName && lastName) {
      this.userIdentity = {
        username,
        firstName,
        lastName,
        hasActiveLicense: hasActiveLicense === 'true',
        role: {
          name: role,
          id: roleId
        }
      } as Account;

      console.log('✅ Restoring user identity:', this.userIdentity);
      this.authenticationState.next(this.userIdentity);
    } else {
      console.log('⚠️ Tokens exist but user data incomplete - emitting NULL');
      this.authenticationState.next(null);
    }
  }

  getUserDetails(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/me/`);
  }

  getUserProfileSync(): Account | null {
    return this.userIdentity;
  }

  identity(force = false): Observable<Account | null> {
    if (!this.accountCache$ || force) {
      this.accountCache$ = this.getUserDetails().pipe(
        tap(account => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('username', account?.username ?? '');
            console.log('User Identity Loaded:', account);
            localStorage.setItem('role_id', String(account?.role?.id ?? ''));
            localStorage.setItem('firstName', account.firstName);
            localStorage.setItem('lastName', account.lastName);
            localStorage.setItem('has_active_license', String(account.hasActiveLicense ?? false));
            if (account?.district) {
              localStorage.setItem('district', typeof account.district === 'string' ? account.district : JSON.stringify(account.district));
            }
            localStorage.setItem('currentUser', JSON.stringify(account));

            // Auto logout
            const access = localStorage.getItem('access');
            const expiry = access ? TokenUtil.getTokenExpiry(access) : null;
            if (expiry) {
              const timeout = expiry - Date.now();
              this.logoutTimer = setTimeout(() => {
                this.clearAppData();
                this.router.navigate(['/login'], { queryParams: { sessionExpired: true } });
              }, timeout);
            }
          }

          this.authenticate(account);
        }),
        shareReplay()
      );
    }

    // Return pending request if exists
    if (!force && this.accountCache$) {
      return this.accountCache$.pipe(catchError(() => of(null)));
    }

    // Make new API request
    this.accountCache$ = this.getUserDetails().pipe(
      tap(account => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('username', account?.username ?? '');
          localStorage.setItem('role', account.role!.name);
          localStorage.setItem('firstName', account.firstName);
          localStorage.setItem('lastName', account.lastName);
          localStorage.setItem('has_active_license', String(account.hasActiveLicense ?? false));

          // Setup auto logout timer
          const access = localStorage.getItem('access');
          const expiry = access ? TokenUtil.getTokenExpiry(access) : null;
          if (expiry) {
            const timeout = expiry - Date.now();
            if (this.logoutTimer) {
              clearTimeout(this.logoutTimer);
            }
            this.logoutTimer = setTimeout(() => {
              this.clearAppData();
              this.router.navigate(['/login'], { queryParams: { sessionExpired: true } });
            }, timeout);
          }
        }

        this.authenticate(account);
      }),
      shareReplay(1)
    );

    return this.accountCache$.pipe(
      catchError(() => {
        // If we have cached identity, return it despite API error
        if (this.userIdentity) {
          return of(this.userIdentity);
        }

        this.accountCache$ = null;
        return of(null);
      })
    );
  }

  authenticate(identity: Account | null): void {
    const prevUsername = this.userIdentity?.username;
    const nextUsername = identity?.username;
    console.log('🔐 authenticate called with:', identity);
    this.userIdentity = identity;
    this.authenticationState.next(this.userIdentity);
    if (!identity) {
      this.accountCache$ = null;
      this.clearAllServiceCaches();
    } else if (prevUsername && nextUsername && prevUsername !== nextUsername) {
      this.accountCache$ = null;
      this.clearAllServiceCaches();
    }
  }

  getAuthenticationState(): Observable<Account | null> {
    console.log('👂 getAuthenticationState() subscribed');
    return this.authenticationState.asObservable();
  }

  isAuthenticated(): boolean {
    return this.userIdentity !== null;
  }

  hasAnyRole(roles: Array<string | number> | string | number): boolean {
    if (!this.userIdentity?.role) return false;
    const userRoleId = this.userIdentity.role.id;
    const legacyNameToId: Record<string, number> = {
      site_admin: 1,
      licensee: 2,
      single_window: 3,
      district_user: 4,
      permit_section: 5,
      'permit section': 5,
      it_cell: 6,
      'it-cell': 6,
      officer_in_charge: 7,
      'officer-incharge': 7,
      sub_enquiry_officer: 8,
      joint_commissioner: 9,
      commissioner: 10,
      secretary: 11,
      supply_chain: 2
    };
    const hasRole = (role: string | number): boolean => {
      if (typeof role === 'number') {
        return userRoleId === role;
      }
      const normalizedRole = role.toLowerCase().trim();
      const mappedRoleId = legacyNameToId[normalizedRole];
      return mappedRoleId ? userRoleId === mappedRoleId : false;
    };
    return Array.isArray(roles) ? roles.some(hasRole) : hasRole(roles);
  }

  changePassword(userId: number, old_password: string, new_password: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${userId}/update/`, {
      password: new_password,
      old_password: old_password
    });
  }

  public clearAllServiceCaches(): void {
    console.log('🧹 AccountService: Clearing all domain and dashboard caches');
    try {
      ReadApiCacheInterceptor.clearCache();
    } catch (e) {}

    try {
      const unifiedDashboard = this.injector.get(UnifiedDashboardService, null);
      unifiedDashboard?.clearCache();
    } catch (e) {}

    try {
      const licenseApp = this.injector.get(LicenseApplicationService, null);
      licenseApp?.clearCache();
    } catch (e) {}

    try {
      const companyReg = this.injector.get(CompanyRegistrationService, null);
      companyReg?.clearCache();
    } catch (e) {}

    try {
      const labelReg = this.injector.get(LabelRegistrationService, null);
      labelReg?.clearCache();
    } catch (e) {}

    try {
      const specialPermit = this.injector.get(SpecialPermitService, null);
      specialPermit?.clearCache();
    } catch (e) {}

    try {
      const userService = this.injector.get(UserService, null);
      userService?.clearCache();
    } catch (e) {}

    try {
      const companyCollab = this.injector.get(CompanyCollaborationService, null);
      companyCollab?.clearCache();
    } catch (e) {}

    try {
      const distributorPermit = this.injector.get(DistributorPermitService, null);
      distributorPermit?.clearCache();
    } catch (e) {}

    try {
      const sidebarBadge = this.injector.get(SidebarPendingBadgeService, null);
      sidebarBadge?.triggerRefresh();
    } catch (e) {}

    try {
      const supplyChain = this.injector.get(SupplyChainService, null);
      supplyChain?.clearCache();
    } catch (e) {}

    try {
      const hologram = this.injector.get(HologramDataService, null);
      hologram?.clearCache();
    } catch (e) {}

    try {
      const enaRequisition = this.injector.get(EnaRequisitionService, null);
      enaRequisition?.clearCache();
    } catch (e) {}
  }

  clearAppData(): void {
    console.log('🗑️ clearAppData called');

    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = undefined;
    }

    this.roleService.clearCurrentUser();
    this.clearAllServiceCaches();

    if (isPlatformBrowser(this.platformId)) {
      // Preserve certain keys across logout
      const blockedUsers = localStorage.getItem(this.blockedUsersStorageKey);
      const dismissedBanner = sessionStorage.getItem('dismissedLicenseBanner');
      
      localStorage.clear();
      sessionStorage.clear();
      
      // Restore preserved keys
      if (blockedUsers) {
        localStorage.setItem(this.blockedUsersStorageKey, blockedUsers);
      }
      if (dismissedBanner) {
        sessionStorage.setItem('dismissedLicenseBanner', dismissedBanner);
      }
      
      console.log('💾 Cleared localStorage and sessionStorage (preserved banner dismissal state)');
    }

    this.userIdentity = null;
    this.accountCache$ = null;
    this.authenticate(null);
  }
}
