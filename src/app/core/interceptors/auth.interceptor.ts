import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AccountService } from '../services/account.service';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isHandlingTokenExpiry = false;

  constructor(
    private router: Router,
    private accountService: AccountService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        const isBrowser = isPlatformBrowser(this.platformId);
        if (
          isBrowser &&
          err.status === 401 &&
          this.isTokenExpired(err) &&
          !this.isHandlingTokenExpiry
        ) {
          this.isHandlingTokenExpiry = true;

          this.accountService.clearAppData();
          this.router.navigate(['/login'], {
            queryParams: { sessionExpired: true }
          });

          this.isHandlingTokenExpiry = false;
        }

        return throwError(() => err);
      })
    );
  }

  private isTokenExpired(err: HttpErrorResponse): boolean {
    const detail = err.error?.detail || '';
    const code = err.error?.code || '';
    return (
      code === 'token_not_valid' ||
      detail.toLowerCase().includes('expired')
    );
  }
}
