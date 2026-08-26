import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DistributorBrandMaster,
  DistributorPermitApplication,
  DistributorSupplier
} from '../models/distributor-permit.model';

@Injectable({
  providedIn: 'root'
})
export class DistributorPermitService {
  private readonly baseUrl = `${environment.apiBaseUrl}/transactional/distributor-permit`;
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

  private invalidateCacheByPrefix(prefix: string): void {
    for (const key of Array.from(this.responseCache.keys())) {
      if (key.startsWith(prefix)) this.responseCache.delete(key);
    }
    for (const key of Array.from(this.inflightRequests.keys())) {
      if (key.startsWith(prefix)) this.inflightRequests.delete(key);
    }
  }

  clearCache(): void {
    this.responseCache.clear();
    this.inflightRequests.clear();
  }

  getDashboardCounts(tab: 'requisition' | 'revalidation' | 'cancellation' = 'requisition', force = false): Observable<any> {
    let params = new HttpParams().set('tab', tab);
    if (force) {
      params = params.set('_t', Date.now().toString());
    }
    return this.http.get<any>(`${this.baseUrl}/dashboard-counts/`, { params });
  }

  listApplications(status?: string): Observable<DistributorPermitApplication[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<DistributorPermitApplication[]>(`${this.baseUrl}/`, { params });
  }

  getApplication(referenceNo: string): Observable<DistributorPermitApplication> {
    return this.http.get<DistributorPermitApplication>(`${this.baseUrl}/${encodeURIComponent(referenceNo)}/`);
  }

  createApplication(payload: DistributorPermitApplication): Observable<DistributorPermitApplication> {
    return this.http.post<DistributorPermitApplication>(`${this.baseUrl}/`, payload).pipe(
      tap(() => this.clearCache())
    );
  }

  getSuppliers(): Observable<DistributorSupplier[]> {
    return this.http.get<DistributorSupplier[]>(`${this.baseUrl}/suppliers/`);
  }

  getBrandMaster(q = ''): Observable<{ success: boolean; data: DistributorBrandMaster[]; total: number }> {
    let params = new HttpParams().set('limit', 250);
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    return this.getCachedOrFetch(`brand-master:${q.trim() || 'all'}`, () =>
      this.http.get<{ success: boolean; data: DistributorBrandMaster[]; total: number }>(
        `${this.baseUrl}/brand-master/`,
        { params }
      )
    );
  }

  getPremises(): Observable<{ destination: string }> {
    return this.getCachedOrFetch('premises', () =>
      this.http.get<{ destination: string }>(`${this.baseUrl}/premises/`)
    );
  }

  getWalletBalances(): Observable<{ excise_balance: number; education_cess_balance: number }> {
    return this.http.get<{ excise_balance: number; education_cess_balance: number }>(`${this.baseUrl}/wallet-balances/`);
  }

  getRevalidations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/revalidation/`);
  }

  getRevalidationDetail(referenceNo: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/revalidation/${encodeURIComponent(referenceNo)}/`);
  }

  createRevalidation(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/revalidation/`, payload).pipe(
      tap(() => this.clearCache())
    );
  }

  getCancellations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cancellation/`);
  }

  getCancellation(referenceNo: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cancellation/${encodeURIComponent(referenceNo)}/`);
  }

  createCancellation(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cancellation/`, payload).pipe(
      tap(() => this.clearCache())
    );
  }

  getRevalidationSchedules(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/revalidation-schedules/`);
  }

  getArrivals(permitNo?: string): Observable<any[]> {
    let params = new HttpParams();
    if (permitNo) {
      params = params.set('permit_number', permitNo);
    }
    return this.http.get<any[]>(`${this.baseUrl}/arrival/`, { params });
  }

  createArrival(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/arrival/`, payload).pipe(
      tap(() => this.clearCache())
    );
  }

  createCasesProcessed(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cases-processed/`, payload);
  }

  getCasesProcessed(params?: any): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((k) => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          httpParams = httpParams.set(k, params[k]);
        }
      });
    }
    return this.http.get<any[]>(`${this.baseUrl}/cases-processed/`, { params: httpParams });
  }

  performCasesProcessedAction(id: number | string, action: string, remarks = ''): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cases-processed/${id}/action/`, { action, remarks });
  }
}
