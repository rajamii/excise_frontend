import { inject, isDevMode, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs';
import { AccountService } from '../services/account.service';
import { StateStorageService } from './state-storage.service';

/**
 * Route guard to control access based on user authentication and role/authority.
 * SSR-compatible: allows navigation on server, checks authentication in browser.
 */
export const UserRouteAccessService: CanActivateFn = (
  next: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const platformId = inject(PLATFORM_ID);
  const accountService = inject(AccountService);
  const router = inject(Router);
  const stateStorageService = inject(StateStorageService);

  // If running on server (SSR), allow navigation - will check in browser
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Check localStorage for tokens (browser only)
  const hasAccessToken = localStorage.getItem('access');
  const hasRefreshToken = localStorage.getItem('refresh');

  if (!hasAccessToken || !hasRefreshToken) {
    stateStorageService.storeUrl(state.url);
    router.navigate(['/login']);
    return false;
  }

  // Check for cached identity
  const cachedIdentity = accountService.getUserProfileSync();

  if (cachedIdentity) {
    const authorities = next.data['authorities'];

    if (!authorities || authorities.length === 0 || accountService.hasAnyRole(authorities)) {
      return true;
    }

    if (isDevMode()) {
      console.error('User does not have required authorities:', authorities);
    }

    router.navigate(['accessdenied']);
    return false;
  }

  // No cached identity, fetch from API
  return accountService.identity().pipe(
    map(account => {
      if (account) {
        const authorities = next.data['authorities'];

        if (!authorities || authorities.length === 0 || accountService.hasAnyRole(authorities)) {
          return true;
        }

        if (isDevMode()) {
          console.error('User does not have required authorities:', authorities);
        }

        router.navigate(['accessdenied']);
        return false;
      }

      // API returned null
      stateStorageService.storeUrl(state.url);
      router.navigate(['/login'], { queryParams: { sessionExpired: true } });
      return false;
    })
  );
};