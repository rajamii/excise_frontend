import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RoleService } from '../services/role.service';

@Injectable({
  providedIn: 'root'
})
export class RoleDashboardGuard implements CanActivate {

  constructor(
    private roleService: RoleService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    const currentUser = this.roleService.getCurrentUser();
    
    if (!currentUser) {
      console.warn('No current user found, redirecting to login');
      this.router.navigate(['/login']);
      return false;
    }

    // Check if user has permission to access dashboard
    const hasPermission = this.roleService.hasPermission('dashboard.view');
    
    if (!hasPermission) {
      console.warn(`User ${currentUser.username} does not have dashboard.view permission`);
      this.router.navigate(['/unauthorized']);
      return false;
    }

    // Log dashboard access for debugging
    console.log(`✅ Dashboard access granted for user: ${currentUser.username} (Role: ${currentUser.role.displayName})`);
    
    return true;
  }
}