import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DashboardConfig, DashboardWidget, NavigationItem } from '../models/dashboard.models';
import { RoleService } from './role.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardConfigService {
  private readonly dashboardConfigApiUrl = `${environment.apiBaseUrl}/auth/roles/dashboard-config`;
  private configCache: { [roleId: number]: DashboardConfig } = {};

  constructor(
    private roleService: RoleService,
    private http: HttpClient
  ) {}

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
