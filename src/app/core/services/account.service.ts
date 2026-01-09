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
  private baseUrl = `${environment.apiBaseUrl}`;
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
    return this.http.get<Account>(`${this.baseUrl}/auth/users/me/`);
  }

  identity(force = false): Observable<Account | null> {
    if (!this.accountCache$ || force) {
      this.accountCache$ = this.getUserDetails().pipe(
        tap(account => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('username', account?.username ?? '');
            localStorage.setItem('role', account.role!.name);
            localStorage.setItem('firstName', account.firstName);
            localStorage.setItem('lastName', account.lastName);

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

  changePassword(username: string, old_password: string, new_password: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/change_password/`, { username, old_password, new_password });
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
