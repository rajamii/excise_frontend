import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SpecialPermitService {
  private readonly baseUrl = `${environment.apiBaseUrl}/transactional/special-permit`;
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

  clearCache(): void {
    this.responseCache.clear();
    this.inflightRequests.clear();
  }

  getEligibleLicenses(): Observable<any[]> {
    return this.getCachedOrFetch('special:eligible-licenses', () =>
      this.http.get<any[]>(`${this.baseUrl}/eligible-licenses/`)
    );
  }

  applySpecialPermit(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/apply/`, data).pipe(
      tap(() => this.clearCache())
    );
  }

  listSpecialPermits(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/list/`);
  }

  getDashboardCounts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard-counts/`);
  }

  getApplicationsByStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list-by-status/`);
  }

  getSpecialPermitDetail(applicationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/detail/${encodeURIComponent(applicationId)}/`);
  }

  paySpecialPermitFee(applicationId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/pay/${encodeURIComponent(applicationId)}/`, {}).pipe(
      tap(() => this.invalidateCache('special:list', 'special:dashboard-counts', 'special:list-by-status'))
    );
  }

  getDryDayCalendar(financialYear: string): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/transactional/special-permit/master-dry-day/`, {
      params: { financial_year: financialYear }
    });
  }

  getSpecialPermitQrCode(applicationId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/qr-code/${encodeURIComponent(applicationId)}/`, { responseType: 'blob' });
  }
}
