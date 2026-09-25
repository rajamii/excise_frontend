import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, of, shareReplay, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Account } from '../models/account.model';
import { Role } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth/users`;
  private readonly rolesUrl = `${environment.apiBaseUrl}/auth/roles`;
  private readonly cacheTtlMs = 60_000;
  private readonly responseCache = new Map<string, { value: unknown; fetchedAt: number }>();
  private readonly inflightRequests = new Map<string, Observable<unknown>>();

  constructor(private http: HttpClient) { }

  private getCurrentUserKey(): string {
    try {
      const username = localStorage.getItem('username');
      if (username) return username.trim();
      const raw = localStorage.getItem('currentUser') || localStorage.getItem('user');
      if (raw) {
        if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          return String(parsed?.username || parsed?.id || 'anon').trim();
        }
        return String(raw).trim();
      }
    } catch {}
    return 'anon';
  }

  public clearCache(): void {
    this.responseCache.clear();
    this.inflightRequests.clear();
  }

  private getCachedOrFetch<T>(key: string, requestFactory: () => Observable<T>): Observable<T> {
    const userKey = this.getCurrentUserKey();
    const fullKey = `user:${userKey}:${key}`;
    const cachedEntry = this.responseCache.get(fullKey);
    const now = Date.now();
    if (cachedEntry && now - cachedEntry.fetchedAt < this.cacheTtlMs) {
      return of(cachedEntry.value as T);
    }

    const inflightRequest = this.inflightRequests.get(fullKey);
    if (inflightRequest) {
      return inflightRequest as Observable<T>;
    }

    const request$ = requestFactory().pipe(
      tap((value) => {
        this.responseCache.set(fullKey, { value, fetchedAt: Date.now() });
      }),
      finalize(() => {
        this.inflightRequests.delete(fullKey);
      }),
      shareReplay(1)
    );

    this.inflightRequests.set(fullKey, request$ as Observable<unknown>);
    return request$;
  }

  private invalidateCache(...keys: string[]): void {
    const userKey = this.getCurrentUserKey();
    for (const key of keys) {
      const fullKey = `user:${userKey}:${key}`;
      this.responseCache.delete(fullKey);
      this.inflightRequests.delete(fullKey);
      this.responseCache.delete(key);
      this.inflightRequests.delete(key);
    }
  }

  // Get all users
  getUsers(): Observable<Account[]> {
    return this.getCachedOrFetch('users:list', () => this.http.get<Account[]>(`${this.baseUrl}/`));
  }

  // Get user by id
  getUserById(id: number): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/${id}/detail/`);
  }

  // Backward compatibility: treat username as identifier if provided
  getUserByUsername(identifier: string | number): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/${identifier}/detail/`);
  }

  // Get currently logged-in user
  getCurrentUser(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/me/`);
  }

  // Retrieves all roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.rolesUrl}/`);
  }

  // Get role by id - NOTE: Backend only provides role list, individual role detail endpoint not available
  // Use getRoles() and filter by id if needed
  getRoleById(id: number): Observable<Role> {
    return this.http.get<Role[]>(`${this.rolesUrl}/`).pipe(
      map(roles => roles.find(role => role.id === id)!)
    );
  }

  // Toggle user is_active status (activate / deactivate)
  toggleUserActive(id: number): Observable<{ message: string; is_active: boolean }> {
    return this.http.patch<{ message: string; is_active: boolean }>(
      `${this.baseUrl}/${id}/toggle-active/`,
      {}
    ).pipe(
      tap(() => this.invalidateCache('users:list'))
    );
  }
}
