import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { UiLoadingService } from '../services/ui-loading.service';

@Injectable()
export class UiLoadingInterceptor implements HttpInterceptor {
  constructor(private readonly loading: UiLoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Allow callers to opt-out (eg: background polling, prefetching).
    if (req.headers.has('X-Skip-Loader')) {
      return next.handle(req);
    }

    // Skip static assets.
    const url = (req.url || '').toLowerCase();
    if (url.includes('/assets/') || url.endsWith('.svg') || url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
      return next.handle(req);
    }

    const method = (req.method || 'GET').toUpperCase();
    const kind = method === 'GET' || method === 'HEAD' ? 'background' : 'blocking';

    this.loading.beginHttp(kind);
    return next.handle(req).pipe(finalize(() => this.loading.endHttp(kind)));
  }
}

