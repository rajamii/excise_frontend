import { inject, isDevMode, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AccountService } from '../services/account.service';
import { DashboardConfigService } from '../services/dashboard-config.service';
import { StateStorageService } from './state-storage.service';

/**
 * Route guard to control access based on authentication and route permissions.
 * - SSR: allows navigation on server side, validates in browser.
 * - Browser: validates tokens, identity, then role/permission requirements.
 */
export const UserRouteAccessService: CanActivateFn = (
  next: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const accountService = inject(AccountService);
  const router = inject(Router);
  const stateStorageService = inject(StateStorageService);
  const dashboardConfigService = inject(DashboardConfigService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const isDevOnly = next.data?.['devOnly'] === true;
  if (isDevOnly && !isDevMode()) {
    router.navigate(['/accessdenied']);
    return false;
  }

  const hasAccessToken = localStorage.getItem('access');
  const hasRefreshToken = localStorage.getItem('refresh');

  if (!hasAccessToken || !hasRefreshToken) {
    stateStorageService.storeUrl(state.url);
    router.navigate(['/login']);
    return false;
  }

  const evaluateLegacyAuthorities = (authorities?: string[]): boolean => {
    if (!authorities || authorities.length === 0) {
      return true;
    }

    const allowed = accountService.hasAnyRole(authorities);
    if (!allowed) {
      if (isDevMode()) {
        console.error('User does not have required authorities:', authorities);
      }
      router.navigate(['/accessdenied']);
    }
    return allowed;
  };

  return accountService.identity().pipe(
    switchMap(account => {
      if (!account) {
        stateStorageService.storeUrl(state.url);
        router.navigate(['/login'], { queryParams: { sessionExpired: true } });
        return of(false);
      }

      // Dev-only routes should require a valid session, but should not be blocked by
      // DB permission config while developing/testing.
      if (isDevOnly) {
        return of(true);
      }

      const requiredPermission = next.data['requiredPermission'] as string | undefined;
      const authorities = next.data['authorities'] as string[] | undefined;

      if (!requiredPermission) {
        return of(evaluateLegacyAuthorities(authorities));
      }

      const accountPermissions = Array.isArray((account as any)?.permissions)
        ? ((account as any).permissions as string[])
        : [];

      if (accountPermissions.includes(requiredPermission)) {
        return of(true);
      }

      return dashboardConfigService.getCurrentUserDashboardConfigCached().pipe(
        map(config => {
          const dbPermissions = Array.isArray(config?.permissions) ? (config.permissions as string[]) : [];
          return dbPermissions.includes(requiredPermission);
        }),
        catchError(() => of(false)),
        map(allowed => {
          if (!allowed) {
            if (isDevMode()) {
              console.error(
                'User does not have required access. authorities=',
                authorities,
                'requiredPermission=',
                requiredPermission
              );
            }
            router.navigate(['/accessdenied']);
          }
          return allowed;
        })
      );
    })
  );
};
