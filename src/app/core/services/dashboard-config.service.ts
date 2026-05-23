import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import { DashboardConfig, DashboardWidget, NavigationItem } from '../models/dashboard.models';
import { RoleService } from './role.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardConfigService {
  private readonly dashboardConfigApiUrl = `${environment.apiBaseUrl}/auth/roles/dashboard-config`;
  private configCache: { [roleId: number]: DashboardConfig } = {};
  private currentConfig$?: Observable<DashboardConfig>;
  private currentConfigRoleId: number | null = null;

  constructor(
    private roleService: RoleService,
    private http: HttpClient
  ) {
    // Clear cached /current/ config when user context changes (login/logout/switch account).
    this.roleService.currentUser$.subscribe((user) => {
      if (!user) {
        this.currentConfig$ = undefined;
        this.currentConfigRoleId = null;
        return;
      }

      const roleId = Number(user.roleId || 0) || null;
      if (roleId != null && this.currentConfigRoleId != null && this.currentConfigRoleId !== roleId) {
        this.currentConfig$ = undefined;
        this.currentConfigRoleId = null;
      }
    });
  }

  getDashboardConfig(roleId: number): Observable<DashboardConfig> {
    return this.http
      .get<DashboardConfig>(`${this.dashboardConfigApiUrl}/${roleId}/`)
      .pipe(tap((config) => (this.configCache[roleId] = config)));
  }

  getCurrentUserDashboardConfig(): Observable<DashboardConfig> {
    const currentUser = this.roleService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('No current user found'));
    }

    return this.http
      .get<DashboardConfig>(`${this.dashboardConfigApiUrl}/current/`)
      .pipe(tap((config) => (this.configCache[currentUser.roleId] = config)));
  }

  /**
   * Cached version of getCurrentUserDashboardConfig(). Reuses the same in-flight request
   * and shares the last successful value for the current role.
   */
  getCurrentUserDashboardConfigCached(forceRefresh = false): Observable<DashboardConfig> {
    const currentUser = this.roleService.getCurrentUser();

    // During initial login/bootstrapping, guards may run before RoleService is hydrated.
    // In that case, still allow fetching /current/ and cache by the roleId returned by API.
    // If the API response doesn't include a roleId, currentConfigRoleId may be null; still reuse the in-flight cache.
    if (
      !forceRefresh &&
      this.currentConfig$ &&
      (!currentUser || this.currentConfigRoleId == null || this.currentConfigRoleId === currentUser.roleId)
    ) {
      return this.currentConfig$;
    }

    this.currentConfig$ = this.http
      .get<DashboardConfig>(`${this.dashboardConfigApiUrl}/current/`)
      .pipe(
        tap((config) => {
          const roleIdFromApi = Number((config as any)?.roleId) || null;
          const roleId = currentUser?.roleId ?? roleIdFromApi ?? null;
          if (roleId != null) {
            this.configCache[roleId] = config;
            this.currentConfigRoleId = roleId;
          } else {
            this.currentConfigRoleId = null;
          }
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.currentConfig$;
  }

  // Helper methods
  getWidgetsByRole(roleId: number): DashboardWidget[] {
    return this.configCache[roleId]?.widgets || [];
  }

  getNavigationByRole(roleId: number): NavigationItem[] {
    return this.configCache[roleId]?.navigation || [];
  }

  getLayoutByRole(roleId: number): string {
    return this.configCache[roleId]?.layout || 'admin';
  }
}
