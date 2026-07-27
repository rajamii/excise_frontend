// ena-requisition.service.ts
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, finalize, of, shareReplay, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EnaRequisitionService {
  private apiUrl = `${environment.apiBaseUrl}/transactional/supply_chain/ena-requisitions/`;
  private readonly cacheTtlMs = 60_000;
  private readonly responseCache = new Map<string, { value: unknown; fetchedAt: number }>();
  private readonly inflightRequests = new Map<string, Observable<unknown>>();
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  private getCachedOrFetch<T>(key: string, requestFactory: () => Observable<T>): Observable<T> {
    const cachedEntry = this.responseCache.get(key);
    const now = Date.now();
    if (cachedEntry && now - cachedEntry.fetchedAt < this.cacheTtlMs) {
      return of(cachedEntry.value as T);
    }

    const inflightRequest = this.inflightRequests.get(key);
    if (inflightRequest) {
      return inflightRequest as Observable<T>;
    }

    const request$ = requestFactory().pipe(
      tap((value) => {
        this.responseCache.set(key, { value, fetchedAt: Date.now() });
      }),
      finalize(() => {
        this.inflightRequests.delete(key);
      }),
      shareReplay(1)
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

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error) {
        errorMessage += `\nDetails: ${JSON.stringify(error.error)}`;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  createRequisition(requisitionData: any): Observable<any> {
    return this.http
      .post(this.apiUrl, requisitionData, this.httpOptions)
      .pipe(tap(() => this.invalidateCache('requisitions:list')))
      .pipe(catchError(this.handleError));
  }

  getRequisitions(): Observable<any> {
    return this.getCachedOrFetch('requisitions:list', () =>
      this.http
        .get(this.apiUrl, this.httpOptions)
        .pipe(catchError(this.handleError))
    );
  }

  getRequisitionById(id: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}${id}/`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  updateRequisition(id: string, requisitionData: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}${id}/`, requisitionData, this.httpOptions)
      .pipe(tap(() => this.invalidateCache('requisitions:list')))
      .pipe(catchError(this.handleError));
  }

  deleteRequisition(id: string): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}${id}/`, this.httpOptions)
      .pipe(tap(() => this.invalidateCache('requisitions:list')))
      .pipe(catchError(this.handleError));
  }

  getNextRefNumber(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}next-ref-number/`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  performAction(id: number, action: 'APPROVE' | 'REJECT'): Observable<any> {
    return this.http
      .post(`${this.apiUrl}${id}/perform-action/`, { action: action }, this.httpOptions)
      .pipe(tap(() => this.invalidateCache('requisitions:list')))
      .pipe(catchError(this.handleError));
  }

  getRequisitionArrivalDetails(id: number, scope?: 'APPROVED' | 'PENDING' | 'REJECTED' | 'ALL'): Observable<any> {
    const qs = scope && scope !== 'ALL' ? `?scope=${encodeURIComponent(scope)}` : '';
    return this.http
      .get(`${this.apiUrl}${id}/arrival-bulk-liter-details/${qs}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getAllRequisitionArrivalDetails(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}arrival-bulk-liter-details/`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getRequisitionArrivalDetailsByStatus(reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'): Observable<any> {
    return this.http
      .get(`${this.apiUrl}arrival-bulk-liter-details/?review_status=${encodeURIComponent(reviewStatus)}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  saveRequisitionArrivalDetails(
    id: number,
    payload: {
      tanker_count: number;
      tanker_details: Array<{ permit_no?: string; tanker_no: string; bulk_liter: number }>;
      detail_id?: number;
    }
  ): Observable<any> {
    return this.http
      .post(`${this.apiUrl}${id}/arrival-bulk-liter-details/`, payload, this.httpOptions)
      .pipe(tap(() => this.invalidateCache('requisitions:list')))
      .pipe(catchError(this.handleError));
  }

  reviewRequisitionArrivalDetails(
    detailId: number,
    action: 'APPROVE' | 'REJECT',
    remarks: string = '',
    permitNo?: string
  ): Observable<any> {
    const payload: any = { action, remarks };
    const permitToken = String(permitNo || '').trim();
    if (permitToken) {
      payload.permit_no = permitToken;
    }
    return this.http
      .post(
        `${this.apiUrl}arrival-bulk-liter-details/${detailId}/review/`,
        payload,
        this.httpOptions
      )
      .pipe(tap(() => this.invalidateCache('requisitions:list')))
      .pipe(catchError(this.handleError));
  }
}
