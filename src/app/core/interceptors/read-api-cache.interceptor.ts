import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ReadApiCacheInterceptor implements HttpInterceptor {
  private static instance: ReadApiCacheInterceptor | null = null;
  private readonly cacheTtlMs = 5 * 60_000;
  private readonly cache = new Map<string, { response: HttpResponse<unknown>; fetchedAt: number }>();
  private readonly inflight = new Map<string, Observable<HttpEvent<unknown>>>();

  constructor() {
    ReadApiCacheInterceptor.instance = this;
  }

  public static clearCache(): void {
    if (ReadApiCacheInterceptor.instance) {
      ReadApiCacheInterceptor.instance.clear();
    }
  }

  private readonly cacheablePatterns: RegExp[] = [
    // Static / master catalog references only
    /\/masters\/supply_chain\/liquor-rates\/?/,
    /\/masters\/supply_chain\/purpose\/?/,
    /\/masters\/supply_chain\/distilleries\/?/,
    /\/masters\/supply_chain\/checkposts\/?/,
  ];

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (req.method !== 'GET') {
      return next.handle(req).pipe(
        tap((event) => {
          if (event instanceof HttpResponse && this.shouldClearOnMutation(req.url)) {
            this.clear();
          }
        })
      );
    }

    if (!this.isCacheable(req.url)) {
      return next.handle(req);
    }

    const key = this.buildCacheKey(req);
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < this.cacheTtlMs) {
      return of(cached.response.clone());
    }

    const inflightRequest = this.inflight.get(key);
    if (inflightRequest) {
      return inflightRequest;
    }

    const request$ = next.handle(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.cache.set(key, { response: event.clone(), fetchedAt: Date.now() });
        }
      }),
      finalize(() => this.inflight.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.inflight.set(key, request$);
    return request$;
  }

  private isCacheable(url: string): boolean {
    return this.cacheablePatterns.some((pattern) => pattern.test(url));
  }

  private shouldClearOnMutation(url: string): boolean {
    return true;
  }

  public clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  private buildCacheKey(req: HttpRequest<unknown>): string {
    const authKey = req.headers.get('Authorization') || '';
    return `${this.normalizeUrl(req.urlWithParams)}::${authKey}`;
  }

  private normalizeUrl(urlWithParams: string): string {
    const [path, query = ''] = urlWithParams.split('?');
    if (!query) return path;

    const params = new URLSearchParams(query);
    for (const key of ['cb', '_', '_t', 'timestamp']) {
      params.delete(key);
    }
    const normalizedQuery = params.toString();
    return normalizedQuery ? `${path}?${normalizedQuery}` : path;
  }
}
