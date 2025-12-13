import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SalesmanBarman, SalesmanBarmanDocuments } from '../models/salesman-barman.model';
import { DashboardCount } from '../models/dashboard.model';
import { UnifiedApplication } from '../models/shared-application.model';

@Injectable({
  providedIn: 'root'
})
export class SalesmanBarmanRegistrationService {
  private baseUrl = `${environment.apiBaseUrl}/transactional/salesman_barman`;

  private documents: Partial<Record<keyof SalesmanBarmanDocuments, File>> = {};

  constructor(private http: HttpClient) {}

  // === CREATE ===
  createSalesmanBarman(data: FormData): Observable<SalesmanBarman> {
    return this.http.post<SalesmanBarman>(`${this.baseUrl}/apply/`, data);
  }

  // === LIST ===
  getSalesmanBarmanList(): Observable<SalesmanBarman[]> {
    return this.http.get<SalesmanBarman[]>(`${this.baseUrl}/list/`);
  }

  // === DETAIL ===
  getSalesmanBarmanDetail(applicationId: string): Observable<SalesmanBarman> {
    return this.http.get<SalesmanBarman>(`${this.baseUrl}/detail/${applicationId}/`);
  }

  // === ADVANCE STAGE ===
  advanceStage(applicationId: string, stageId: number, context?: any): Observable<SalesmanBarman> {
    return this.http.post<SalesmanBarman>(`${this.baseUrl}/${applicationId}/advance/${stageId}/`, { context: context || {} });
  }

  // === NEXT STAGES ===
  getNextStages(applicationId: string): Observable<Array<{id: number, name: string}>> {
    return this.http.get<Array<{id: number, name: string}>>(`${this.baseUrl}/${applicationId}/next-stages/`);
  }

  // === DOCUMENT HANDLING ===
  setSalesmanBarmanDocuments(docs: Partial<Record<keyof SalesmanBarmanDocuments, File>>): void {
    this.documents = { ...this.documents, ...docs };
  }

  getSalesmanBarmanDocuments(): Partial<Record<keyof SalesmanBarmanDocuments, File>> {
    return this.documents;
  }

  clearSalesmanBarmanDocuments(): void {
    this.documents = {};
  }

  getDashboardCounts(): Observable<DashboardCount> {
    return this.http.get<DashboardCount>(`${this.baseUrl}/dashboard-counts/`);
  }

  getApplicationsByStatus(): Observable<{
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }> {
    return this.http.get<any>(`${this.baseUrl}/applications-by-status/`);
  }
}