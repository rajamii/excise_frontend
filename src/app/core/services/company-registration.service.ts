import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError, finalize, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CompanyDocuments } from '../models/company.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyRegistrationService {
  // Backend: transactional/company-registration/*
  private baseUrl = `${environment.apiBaseUrl}/transactional/company-registration`;
  private companyDocs: Partial<Record<keyof CompanyDocuments, File>> = {};
  private readonly cacheTtlMs = 5 * 60_000;
  private responseCache = new Map<string, { value: unknown; fetchedAt: number }>();
  private inflightRequests = new Map<string, Observable<unknown>>();

  constructor(private http: HttpClient) { }

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

  // Create new company registration application
  applyCompanyRegistration(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/apply/`, data).pipe(
      tap(() => this.invalidateCache('company:list', 'company:root-list', 'company:dashboard-counts', 'company:list-by-status'))
    );
  }

  // Get list of all company registrations
  listCompanyRegistrations(): Observable<any> {
    return this.getCachedOrFetch('company:list', () => this.http.get(`${this.baseUrl}/list/`));
  }

  // Backward-compatible list endpoint
  getCompanyList(): Observable<any> {
    return this.getCachedOrFetch('company:root-list', () => this.http.get(`${this.baseUrl}/`));
  }

  // Get company record by numeric id (admin/master style endpoint)
  getCompanyById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/`);
  }

  // Get company registration details by application ID
  getCompanyDetail(applicationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/detail/${applicationId}/`);
  }

  // Get dashboard counts
  getDashboardCounts(): Observable<any> {
    const url = `${this.baseUrl}/dashboard-counts/`;
    console.log(' Company Registration API Call:', url);
    return this.getCachedOrFetch('company:dashboard-counts', () => this.http.get(url)).pipe(
      tap(response => {
        console.log(' Company Registration Response:', response);
      }),
      catchError(error => {
        console.error(' Company Registration Error:', error);
        console.error(' Error Status:', error.status);
        console.error(' Error Details:', error.error);
        console.error(' Error URL:', url);
        throw error;
      })
    );
  }

  // Get applications grouped by status
  getApplicationsByStatus(params?: any): Observable<any> {
    const url = `${this.baseUrl}/list-by-status/`;
    console.log(' Company Registration API Call:', url);
    const cacheKey = `company:list-by-status:${JSON.stringify(params || {})}`;
    return this.getCachedOrFetch(cacheKey, () => this.http.get(url, { params })).pipe(
      tap(response => {
        console.log(' Company Registration Response:', response);
      }),
      catchError(error => {
        console.error(' Company Registration Error:', error);
        console.error(' Error Status:', error.status);
        console.error(' Error Details:', error.error);
        console.error(' Error URL:', url);
        throw error;
      })
    );
  }

  // Document management methods
  setCompanyDocuments(docs: Partial<Record<keyof CompanyDocuments, File>>): void {
    this.companyDocs = { ...this.companyDocs, ...docs };
  }

  getCompanyDocuments(): Partial<Record<keyof CompanyDocuments, File>> {
    return this.companyDocs;
  }

  clearCompanyDocuments(): void {
    this.companyDocs = {};
  }

  // Pay company registration fee via wallet
  payCompanyRegistrationFee(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/pay-fee/${encodedId}/`, {}).pipe(
      tap(() => this.invalidateCache('company:list', 'company:root-list', 'company:dashboard-counts'))
    );
  }
}
