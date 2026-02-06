import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Account } from '../models/account.model';
import { environment } from '../../../environments/environment';
import { Observable, ReplaySubject, of, shareReplay, catchError, tap } from 'rxjs';
import { TokenUtil } from '../../shared/utils/token.util';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
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
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  getUserDetails(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/me/`);
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
    return this.accountCache$.pipe(catchError(() => of(null)));
  }

  authenticate(identity: Account | null): void {
    this.userIdentity = identity;
    this.authenticationState.next(this.userIdentity);
    if (!identity) this.accountCache$ = null;
  }

  getAuthenticationState(): Observable<Account | null> {
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
    console.warn('Password change endpoint not Available.');
    return this.http.put(`${this.baseUrl}/${userId}/update/`, {
      password: new_password,
      old_password: old_password
    });
  }

  clearAppData(): void {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = undefined;
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
      sessionStorage.clear();
    }
    this.authenticate(null);
  }
}
