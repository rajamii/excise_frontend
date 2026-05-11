import { isPlatformBrowser } from '@angular/common';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!isPlatformBrowser(this.platformId)) {
      return next.handle(req);
    }

    // Only attach CSRF token for unsafe methods.
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next.handle(req);
    }

    // Only attach for API calls (avoid third-party calls).
    const apiBase = String(environment.apiBaseUrl || '').replace(/\/+$/, '');
    if (apiBase && !req.url.startsWith(apiBase)) {
      return next.handle(req);
    }

    // Django default cookie/header names.
    const token = this.getCookie('csrftoken');
    if (!token) return next.handle(req);

    if (req.headers.has('X-CSRFToken')) return next.handle(req);

    return next.handle(
      req.clone({
        setHeaders: { 'X-CSRFToken': token }
      })
    );
  }

  private getCookie(name: string): string | null {
    try {
      const cookies = String(document.cookie || '').split(';');
      for (const c of cookies) {
        const [k, ...rest] = c.trim().split('=');
        if (k === name) return decodeURIComponent(rest.join('='));
      }
      return null;
    } catch {
      return null;
    }
  }
}

