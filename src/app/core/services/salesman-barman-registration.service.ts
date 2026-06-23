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

  createSalesmanBarman(data: FormData): Observable<SalesmanBarman> {
    return this.http.post<SalesmanBarman>(`${this.baseUrl}/apply/`, data);
  }

  getSalesmanBarmanList(): Observable<SalesmanBarman[]> {
    return this.http.get<SalesmanBarman[]>(`${this.baseUrl}/list/`);
  }

  getSalesmanBarmanDetail(applicationId: string): Observable<SalesmanBarman> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<SalesmanBarman>(`${this.baseUrl}/detail/${encodedId}/?_=${new Date().getTime()}`);
  }

  payRegistrationLicenseFee(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/${encodedId}/pay-license-fee/`, {});
  }

  advanceStage(applicationId: string, stageId: number, context?: any): Observable<SalesmanBarman> {
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.workflowBaseUrl}/${encodedId}/advance/${stageId}/`;
    return this.http.post<SalesmanBarman>(url, { context_data: context || {} });
  }

  getNextStages(applicationId: string): Observable<Array<{id: number, name: string, description: string}>> {
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.workflowBaseUrl}/${encodedId}/next-stages/`;
    return this.http.get<Array<{id: number, name: string, description: string}>>(url);
  }

  raiseObjection(
    applicationId: string,
    objections: Array<{field: string, remarks: string}>,
    remarks?: string
  ): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.workflowBaseUrl}/${encodedId}/raise-objection/`;
    return this.http.post(url, {
      objections,
      remarks: remarks || 'Objections raised'
    });
  }


  getObjections(applicationId: string): Observable<any[]> {
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.workflowBaseUrl}/${encodedId}/objections/`;
    return this.http.get<any[]>(url);
  }

  resolveObjections(
    applicationId: string,
    objectionIds?: number[],
    updatedFields?: any,
    remarks?: string
  ): Observable<SalesmanBarman> {
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.workflowBaseUrl}/${encodedId}/resolve-objections/`;
    return this.http.post<SalesmanBarman>(url, {
      objection_ids: objectionIds,
      updated_fields: updatedFields || {},
      remarks: remarks || 'Objections resolved'
    });
  }

  printRegistration(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const url = `${this.baseUrl}/${encodedId}/print/`;
    return this.http.post(url, {});
  }

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
    return this.http.get<any>(`${this.baseUrl}/list-by-status/`);
  }

  renewLicense(licenseId: string): Observable<any> {
    const encodedId = encodeURIComponent(licenseId);
    return this.http.post(`${this.baseUrl}/renew/${encodedId}/`, {});
  }
}
