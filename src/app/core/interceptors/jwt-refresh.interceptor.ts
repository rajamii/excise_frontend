import { isPlatformBrowser } from '@angular/common';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable, catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtRefreshInterceptor implements HttpInterceptor {
  // Flag to prevent multiple refresh requests at once
  private isRefreshing = false;

  // Emits the new access token when available
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object, // Check if code is running in browser
    private authService: AuthService // Service to handle API calls including refresh
  ) {}


  // Intercepts HTTP requests to attach access token and handle token expiration (401).
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('access');

      // Public routes that shouldn't have Authorization header
      const publicEndpoints = [
        '/get_captcha/',
        '/captcha/',
        '/token/refresh/',
        '/masters/core/timer-config/'
      ];

      // If the request is public, skip attaching token
      const isPublic = publicEndpoints.some(publicUrl => req.url.includes(publicUrl));

      if (!isPublic && token) {
        req = this.addToken(req, token);
      }

      return next.handle(req).pipe(
        catchError(error => {
          if (!isPublic && error instanceof HttpErrorResponse && error.status === 401) {
            return this.handle401Error(req, next);
          }
          return throwError(() => error);
        })
      );
    }

    return next.handle(req);
  }

  // Adds Authorization header with Bearer token to outgoing requests.
  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Handles 401 Unauthorized errors by refreshing the access token if possible.
  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = localStorage.getItem('refresh');

      if (!refreshToken) {
        console.error('No refresh token found. This might be a login issue.');
        // Don't logout immediately - let the error propagate so the component can handle it
        this.isRefreshing = false;
        return throwError(() => new Error('No refresh token available'));
      }

      // Call API to get new access token using the refresh token
      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          this.isRefreshing = false;

          // Accept either response.access or response.new_access_token
          const newAccessToken = response.access || response.new_access_token;

          if (!newAccessToken) {
            console.error('No new access token received, logging out.');
            this.logoutAndRedirect();
            return throwError(() => new Error('No new access token received'));
          }

          // Store new access token and continue with the original request
          localStorage.setItem('access', newAccessToken);

          this.refreshTokenSubject.next(newAccessToken);

          return next.handle(this.addToken(req, newAccessToken));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          console.error('Refresh token expired or invalid. Logging out.');
          this.logoutAndRedirect();
          return throwError(() => err);
        })
      );
    } else {
      // If a refresh is already in progress, wait until it's done
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap((token) => {
          return next.handle(this.addToken(req, token as string));
        })
      );
    }
  }


  private logoutAndRedirect() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    this.authService.logout();
  }
}
