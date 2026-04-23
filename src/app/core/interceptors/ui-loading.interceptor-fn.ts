import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { UiLoadingService } from '../services/ui-loading.service';

export const uiLoadingInterceptorFn: HttpInterceptorFn = (req, next) => {
  const loading = inject(UiLoadingService);

  if (req.headers.has('X-Skip-Loader')) {
    return next(req);
  }

  const url = (req.url || '').toLowerCase();
  if (
    url.includes('/assets/') ||
    url.endsWith('.svg') ||
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.jpeg')
  ) {
    return next(req);
  }

  const method = (req.method || 'GET').toUpperCase();
  const kind = method === 'GET' || method === 'HEAD' ? 'background' : 'blocking';

  loading.beginHttp(kind);
  return next(req).pipe(finalize(() => loading.endHttp(kind)));
};

