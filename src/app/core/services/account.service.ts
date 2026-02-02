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

  /**
   * ✅ Get current user (for backward compatibility)
   */
  getCurrentUser(): Observable<Account | null> {
    return this.identity();
  }

  /**
   * ✅ Get current user roles
   */
  getCurrentUserRoles(): string[] {
    if (!this.userIdentity?.role) return [];
    return [this.userIdentity.role.name];
  }

  /**
   * ✅ Get user profile synchronously from memory
   */
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
            localStorage.setItem('role', account.role!.name);
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

  hasAnyRole(roles: string[] | string): boolean {
    if (!this.userIdentity?.role) return false;
    const userRole = this.userIdentity.role.name.toLowerCase().trim();
    return Array.isArray(roles)
      ? roles.some(role => role.toLowerCase().trim() === userRole)
      : roles.toLowerCase().trim() === userRole;
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