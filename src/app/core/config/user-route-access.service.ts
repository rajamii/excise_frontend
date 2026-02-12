  import { inject, isDevMode } from '@angular/core';
  import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
  import { HttpClient } from '@angular/common/http';
  import { of } from 'rxjs';
  import { catchError, map, switchMap } from 'rxjs/operators';
  import { AccountService } from '../services/account.service';
  import { StateStorageService } from './state-storage.service';
  import { environment } from '../../../environments/environment';

  /**
   * Route guard to control access based on user authentication and role/authority.
   * It verifies if the user is logged in and has required permissions before allowing route activation.
   */
export const UserRouteAccessService: CanActivateFn = (
  next: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
    // Inject required services
  const accountService = inject(AccountService);
  const router = inject(Router);
  const stateStorageService = inject(StateStorageService);
  const http = inject(HttpClient);
  const dashboardConfigUrl = `${environment.apiBaseUrl}/auth/roles/dashboard-config/current/`;

    // Attempt to get the current user's account
  return accountService.identity().pipe(
    switchMap(account => {
      if (account) {
        // DB-driven permission key for the route.
        const requiredPermission = next.data['requiredPermission'] as string | undefined;
        const accountPermissions = Array.isArray((account as any)?.permissions)
          ? (account as any).permissions as string[]
          : [];

        // Route is open when no role/permission restriction exists.
        if (!requiredPermission) {
          return of(true);
        }

        // Permission check from user payload when available.
        if (requiredPermission && accountPermissions.includes(requiredPermission)) {
          return of(true);
        }

        // DB-driven fallback from dashboard role config.
        return http.get<any>(dashboardConfigUrl).pipe(
          map(config => {
            const dbPermissions = Array.isArray(config?.permissions) ? config.permissions as string[] : [];

            if (requiredPermission) {
              return dbPermissions.includes(requiredPermission);
            }

            return dbPermissions.includes(requiredPermission);
          }),
          catchError(() => of(false)),
          map(allowed => {
            if (!allowed) {
              if (isDevMode()) {
                console.error(
                  'User does not have required access. authorities=',
                  next.data['authorities'],
                  'requiredPermission=',
                  requiredPermission
                );
              }
              router.navigate(['accessdenied']);
            }
            return allowed;
          })
        );
      }

      // If user is not logged in, store the attempted URL and redirect to login page
      stateStorageService.storeUrl(state.url);
      router.navigate(['/login']);
      return of(false);
    }),
  );
};
