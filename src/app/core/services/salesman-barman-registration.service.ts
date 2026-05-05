import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SalesmanBarman, SalesmanBarmanDocuments } from '../models/salesman-barman.model';
import { DashboardCount } from '../models/dashboard.model';
import { UnifiedApplication } from '../models/unified-application.model';

@Injectable({
  providedIn: 'root'
})
export class SalesmanBarmanRegistrationService {
  private baseUrl = `${environment.apiBaseUrl}/transactional/salesman_barman`;
  private workflowBaseUrl = `${environment.apiBaseUrl}/auth`;

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
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<SalesmanBarman>(`${this.baseUrl}/detail/${encodedId}/`);
  }

  payRegistrationLicenseFee(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/${encodedId}/pay-license-fee/`, {});
  }

  // === ADVANCE STAGE ===
  advanceStage(applicationId: string, stageId: number, context?: any): Observable<SalesmanBarman> {
    console.log('🚀 advanceStage called:', { applicationId, stageId, context });
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.workflowBaseUrl}/${encodedId}/advance/${stageId}/`;
    console.log('📍 Advancing to URL:', url);
    return this.http.post<SalesmanBarman>(url, { context_data: context || {} });
  }

  // === NEXT STAGES ===
  getNextStages(applicationId: string): Observable<Array<{id: number, name: string, description: string}>> {
    console.log('📋 getNextStages called for:', applicationId);
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.workflowBaseUrl}/${encodedId}/next-stages/`;
    console.log('📍 Fetching next stages from URL:', url);
    return this.http.get<Array<{id: number, name: string, description: string}>>(url);
  }

  // === RAISE OBJECTION ===
  raiseObjection(
    applicationId: string,
    objections: Array<{field: string, remarks: string}>,
    remarks?: string
  ): Observable<any> {
    console.log('🚨 raiseObjection called:', { applicationId, objections, remarks });
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.workflowBaseUrl}/${encodedId}/raise-objection/`;
    console.log('📍 Raising objection at URL:', url);
    return this.http.post(url, {
      objections,
      remarks: remarks || 'Objections raised'
    });
  }

  // === GET OBJECTIONS ===
  getObjections(applicationId: string): Observable<any[]> {
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.workflowBaseUrl}/${encodedId}/objections/`;
    console.log('📍 Getting objections from URL:', url);
    return this.http.get<any[]>(url);
  }

  // === RESOLVE OBJECTIONS ===
  resolveObjections(
    applicationId: string,
    objectionIds?: number[],
    updatedFields?: any,
    remarks?: string
  ): Observable<SalesmanBarman> {
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.workflowBaseUrl}/${encodedId}/resolve-objections/`;
    console.log('📍 Resolving objections at URL:', url);
    return this.http.post<SalesmanBarman>(url, {
      objection_ids: objectionIds,
      updated_fields: updatedFields || {},
      remarks: remarks || 'Objections resolved'
    });
  }

  // === ✅ PRINT REGISTRATION ===
  printRegistration(applicationId: string): Observable<any> {
    console.log('🖨️ printRegistration called for:', applicationId);
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.baseUrl}/${encodedId}/print/`;
    console.log('📍 Printing from URL:', url);
    return this.http.post(url, {});
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

  // === DASHBOARD ===
  getDashboardCounts(): Observable<DashboardCount> {
    return this.http.get<DashboardCount>(`${this.baseUrl}/dashboard-counts/`);
  }

  getApplicationsByStatus(): Observable<{
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }> {
    return this.http.get<any>(`${this.baseUrl}/list-by-status/`);
  }

  // ✅ RENEWAL METHOD
  
  /**
   * Renew a salesman/barman license
   */
  renewLicense(licenseId: string): Observable<any> {
    const encodedId = encodeURIComponent(licenseId);
    return this.http.post(`${this.baseUrl}/renew/${encodedId}/`, {});
  }
}
