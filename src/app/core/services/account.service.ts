import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject, catchError, mergeMap, of, shareReplay, tap } from 'rxjs';
import { Account } from '../models/accounts';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private baseUrl = `${environment.apiBaseUrl}`; // Base URL for the API

  // Stores the currently authenticated user's identity
  private userIdentity: Account | null = null;

  // Emits current authentication state changes
  private authenticationState = new ReplaySubject<Account | null>(1);

  // Caches the current account observable to prevent duplicate API calls
  private accountCache$?: Observable<Account> | null;

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // Fetches all user details from the API
  getUserDetails(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/user/list/`, {});
  }

  // Logs out the user and clears local storage
  logout(): Observable<any> {
    return this.apiService.logout().pipe(
      tap(() => {
        // Clear tokens and user-related data from local storage
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        localStorage.removeItem('firstName');
        localStorage.removeItem('lastName');

        // Update authentication state to null
        this.authenticate(null);
      }),
      catchError((error) => {
        console.error("Logout API error:", error);
        return throwError(() => error);
      })
    );
  }

  // Returns an observable of the current authentication state
  getAuthenticationState(): Observable<Account | null> {
    return this.authenticationState.asObservable();
  }

  // Sets the authentication state and updates the cache
  authenticate(identity: Account | null): void {
    this.userIdentity = identity;
    this.authenticationState.next(this.userIdentity);

    // Clear the cached account observable if the identity is null
    if (!identity) {
      this.accountCache$ = null;
    }
  }

  // Checks if the user has a specific role
  hasAnyRole(roles: string[] | string): boolean {
    if (!this.userIdentity || !this.userIdentity.role) {
      return false;
    }
  
    const userRole = this.userIdentity.role.toLowerCase().trim();
  
    if (Array.isArray(roles)) {
      return roles.some(role => role.toLowerCase().trim() === userRole);
    }
  
    return roles.toLowerCase().trim() === userRole;
  }
  

  // Fetches the user identity, with caching and optional force refresh
  identity(force?: boolean): Observable<Account | null> {
    if (!this.accountCache$ || force) {
      this.accountCache$ = this.getUserDetails().pipe(
        tap((account: Account) => {
          // Save account data to local storage
          localStorage.setItem('userName', account.username);
          localStorage.setItem('role', account.role);
          localStorage.setItem('firstName', account.firstName);
          localStorage.setItem('lastName', account.lastName);

          // Set internal state
          this.authenticate(account);
        }),
        shareReplay(), // Share the response among multiple subscribers
      );
    }

    // Return the cached observable or null if it fails
    return this.accountCache$.pipe(catchError(() => of(null)));
  }

  // Checks if the user is authenticateda
  isAuthenticated(): boolean {
    return this.userIdentity !== null;
  }

  // Allows a user to change their password
  changePassword(username: string, old_password: string, new_password: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/api/change_password/`, { username, old_password, new_password });
  }
}
