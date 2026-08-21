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

  private getCachedOrFetch<T>(key: string, requestFactory: () => Observable<T>): Observable<T> {
    const cachedEntry = this.responseCache.get(key);
    const now = Date.now();
    if (cachedEntry && now - cachedEntry.fetchedAt < this.cacheTtlMs) {
      return new Observable<T>((subscriber) => {
        subscriber.next(cachedEntry.value as T);
        subscriber.complete();
      });
    }

    const inflightRequest = this.inflightRequests.get(key);
    if (inflightRequest) return inflightRequest as Observable<T>;

    const request$ = requestFactory().pipe(
      tap((value) => this.responseCache.set(key, { value, fetchedAt: Date.now() })),
      finalize(() => this.inflightRequests.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.inflightRequests.set(key, request$ as Observable<unknown>);
    return request$;
  }

  private invalidateCache(...keys: string[]): void {
    for (const key of keys) {
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
