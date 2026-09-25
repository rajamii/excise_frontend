import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LabelRegistrationService {
  private baseUrl = `${environment.apiBaseUrl}/transactional/label-registration`;
  private readonly draftDocuments = new Map<string, File>();
  private readonly cacheTtlMs = 5 * 60_000;
  private responseCache = new Map<string, { value: unknown; fetchedAt: number }>();
  private inflightRequests = new Map<string, Observable<unknown>>();

  constructor(private http: HttpClient) {}

  private getCurrentUserKey(): string {
    try {
      const username = localStorage.getItem('username');
      if (username) return username.trim();
      const raw = localStorage.getItem('currentUser') || localStorage.getItem('user');
      if (raw) {
        if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          return String(parsed?.username || parsed?.id || 'anon').trim();
        }
        return String(raw).trim();
      }
    } catch {}
    return 'anon';
  }

  public clearCache(): void {
    this.responseCache.clear();
    this.inflightRequests.clear();
    this.clearDraftDocuments();
  }

  private getCachedOrFetch<T>(key: string, requestFactory: () => Observable<T>): Observable<T> {
    const userKey = this.getCurrentUserKey();
    const fullKey = `user:${userKey}:${key}`;
    const cachedEntry = this.responseCache.get(fullKey);
    const now = Date.now();
    if (cachedEntry && now - cachedEntry.fetchedAt < this.cacheTtlMs) {
      return new Observable<T>((subscriber) => {
        subscriber.next(cachedEntry.value as T);
        subscriber.complete();
      });
    }

    const inflightRequest = this.inflightRequests.get(fullKey);
    if (inflightRequest) return inflightRequest as Observable<T>;

    const request$ = requestFactory().pipe(
      tap((value) => this.responseCache.set(fullKey, { value, fetchedAt: Date.now() })),
      finalize(() => this.inflightRequests.delete(fullKey)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.inflightRequests.set(fullKey, request$ as Observable<unknown>);
    return request$;
  }

  private invalidateCache(...keys: string[]): void {
    const userKey = this.getCurrentUserKey();
    for (const key of keys) {
      const fullKey = `user:${userKey}:${key}`;
      this.responseCache.delete(fullKey);
      this.inflightRequests.delete(fullKey);
      this.responseCache.delete(key);
      this.inflightRequests.delete(key);
    }
  }

  applyLabelRegistration(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/apply/`, data).pipe(
      tap(() => this.invalidateCache('label:list', 'label:dashboard-counts', 'label:list-by-status'))
    );
  }

  listLabelRegistrations(): Observable<any> {
    return this.getCachedOrFetch('label:list', () => this.http.get(`${this.baseUrl}/list/`));
  }

  getLabelRegistrationDetail(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.baseUrl}/detail/${encodedId}/`);
  }

  getDashboardCounts(): Observable<any> {
    return this.getCachedOrFetch('label:dashboard-counts', () => this.http.get(`${this.baseUrl}/dashboard-counts/`));
  }

  getApplicationsByStatus(): Observable<any> {
    return this.getCachedOrFetch('label:list-by-status', () => this.http.get(`${this.baseUrl}/list-by-status/`));
  }

  setDraftDocument(key: string, file: File | null): void {
    if (!key) {
      return;
    }

    if (file) {
      this.draftDocuments.set(key, file);
      return;
    }

    this.draftDocuments.delete(key);
  }

  getDraftDocument(key: string): File | null {
    return this.draftDocuments.get(key) ?? null;
  }

  getDraftDocuments(): Array<{ key: string; file: File }> {
    return Array.from(this.draftDocuments.entries()).map(([key, file]) => ({ key, file }));
  }

  clearDraftDocuments(): void {
    this.draftDocuments.clear();
  }
}
