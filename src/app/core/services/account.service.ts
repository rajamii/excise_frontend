import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Account } from '../models/accounts';
import { environment } from '../../../environments/environment';
import { Observable, ReplaySubject, of, shareReplay, catchError, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private baseUrl = `${environment.apiBaseUrl}`;
  private userIdentity: Account | null = null;
  private authenticationState = new ReplaySubject<Account | null>(1); // Emits current authentication state
  private accountCache$?: Observable<Account> | null; // Used to cache the user account observable

  constructor(private http: HttpClient) {}

  // Fetch user details from backend
  getUserDetails(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/user/detail/me/`);
  }

  /**
   * Retrieves user identity. If `force` is true or there's no cached observable, it fetches fresh data.
   * Also sets localStorage and emits authentication state.
   */
  identity(force = false): Observable<Account | null> {
    if (!this.accountCache$ || force) {
      this.accountCache$ = this.getUserDetails().pipe(
        tap(account => {
          // Cache basic user details in localStorage for potential reuse
          localStorage.setItem('username', account.username);
          localStorage.setItem('role', account.role);
          localStorage.setItem('firstName', account.firstName);
          localStorage.setItem('lastName', account.lastName);

          this.authenticate(account); // Update internal auth state
        }),
        shareReplay() // Share the result among subscribers and cache the latest value
      );
    }
    return this.accountCache$.pipe(catchError(() => of(null))); // Gracefully handle errors
  }

  // Sets the current user identity and updates auth state stream
  authenticate(identity: Account | null): void {
    this.userIdentity = identity;
    this.authenticationState.next(this.userIdentity);
    if (!identity) this.accountCache$ = null; // Clear cache if user is unauthenticated
  }

  // Observable for auth state changes (e.g., login/logout)
  getAuthenticationState(): Observable<Account | null> {
    return this.authenticationState.asObservable();
  }

  // Returns whether a user is currently authenticated
  isAuthenticated(): boolean {
    return this.userIdentity !== null;
  }

  /**
   * Checks if user has a specific role (or one of the roles)
   * Case-insensitive comparison.
   */
  hasAnyRole(roles: string[] | string): boolean {
    if (!this.userIdentity?.role) return false;
    const userRole = this.userIdentity.role.toLowerCase().trim();
    return Array.isArray(roles)
      ? roles.some(role => role.toLowerCase().trim() === userRole)
      : roles.toLowerCase().trim() === userRole;
  }

  /*
  // Uncomment if using permissions-based access
  hasModuleAccess(moduleKey: keyof Account['permissions'], required: 'read' | 'read_write'): boolean {
    const permissions = this.userIdentity?.permissions;
    if (!permissions || !permissions[moduleKey] || permissions[moduleKey] === 'none') return false;

    return required === 'read'
      ? permissions[moduleKey] === 'read' || permissions[moduleKey] === 'read_write'
      : permissions[moduleKey] === 'read_write';
  }
  */

  // Sends a password change request
  changePassword(username: string, old_password: string, new_password: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/change_password/`, { username, old_password, new_password });
  }
}
