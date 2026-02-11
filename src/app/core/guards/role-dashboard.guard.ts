import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { RoleService } from '../services/role.service';
import { AccountService } from '../services/account.service';
import { User } from '../models/role.models';

@Injectable({
  providedIn: 'root'
})
export class RoleDashboardGuard implements CanActivate {
  constructor(
    private roleService: RoleService,
    private accountService: AccountService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const currentUser = this.roleService.getCurrentUser();
    if (currentUser) {
      return this.validateDashboardAccess(currentUser);
    }

    return this.accountService.identity().pipe(
      map(accountUser => {
        if (!accountUser) {
          this.router.navigate(['/login']);
          return false;
        }

        const roleId = Number(accountUser?.role?.id) || 0;
        const role = this.roleService.getRoleById(roleId);
        if (!role) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

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

        this.roleService.setCurrentUser(mappedUser);
        return this.validateDashboardAccess(mappedUser);
      }),
      catchError(() => {
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }

  private validateDashboardAccess(currentUser: User): boolean {
    if (!this.roleService.hasPermission('dashboard.view')) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    console.log(`Dashboard access granted for user: ${currentUser.username} (Role ID: ${currentUser.roleId})`);
    return true;
  }
}
