import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { RoleService } from '../services/role.service';
import { AccountService } from '../services/account.service';
import { User } from '../models/role.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoleDashboardGuard implements CanActivate {
  constructor(
    private roleService: RoleService,
    private accountService: AccountService,
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return of(true);
    }

    // Always hydrate from backend identity/config to avoid stale session-role permissions.
    return this.accountService.identity().pipe(
      switchMap(accountUser => {
        if (!accountUser) {
          this.router.navigate(['/login']);
          return of(false);
        }

        const roleId = Number(accountUser?.role?.id) || 0;
        const role = this.roleService.getRoleById(roleId)!;

        const mappedUser: User = {
          id: accountUser.id || 0,
          username: accountUser.username || 'user',
          email: accountUser.email || '',
          fullName: `${accountUser.firstName || ''} ${accountUser.lastName || ''}`.trim() || 'User',
          roleId,
          role,
          permissions: role.permissions || [],
          isActive: true,
          lastLogin: new Date()
        };

        return this.http.get<any>(`${environment.apiBaseUrl}/auth/roles/dashboard-config/current/`).pipe(
          map((config) => {
            const dbPermissions = Array.isArray(config?.permissions) ? config.permissions : [];
            const dbRoleName = config?.roleName || mappedUser.role?.displayName || 'User';

            const dbBackedUser: User = {
              ...mappedUser,
              role: {
                ...mappedUser.role,
                name: dbRoleName,
                displayName: dbRoleName,
                permissions: dbPermissions
              },
              permissions: dbPermissions
            };

            this.roleService.setCurrentUser(dbBackedUser);
            return this.validateDashboardAccess(dbBackedUser);
          }),
          catchError(() => {
            this.roleService.setCurrentUser(mappedUser);
            return of(this.validateDashboardAccess(mappedUser));
          })
        );
      }),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }

  private validateDashboardAccess(currentUser: User): boolean {
    if (!(currentUser.permissions || []).includes('dashboard.view')) {
      this.router.navigate(['/accessdenied']);
      return false;
    }

    console.log(`Dashboard access granted for user: ${currentUser.username} (Role ID: ${currentUser.roleId})`);
    return true;
  }
}
