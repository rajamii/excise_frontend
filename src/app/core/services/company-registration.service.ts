import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CompanyDocuments } from '../models/company.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyRegistrationService {
  // Backend: transactional/company-registration/*
  private baseUrl = `${environment.apiBaseUrl}/transactional/company-registration`;
  private companyDocs: Partial<Record<keyof CompanyDocuments, File>> = {};

  constructor(private http: HttpClient) { }

  // Create new company registration application
  applyCompanyRegistration(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/apply/`, data);
  }

  // Get list of all company registrations
  listCompanyRegistrations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list/`);
  }

  // Backward-compatible list endpoint
  getCompanyList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/`);
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
    return this.http.get(url).pipe(
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
  getApplicationsByStatus(): Observable<any> {
    const url = `${this.baseUrl}/list-by-status/`;
    console.log(' Company Registration API Call:', url);
    return this.http.get(url).pipe(
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
    return this.http.post(`${this.baseUrl}/detail/${encodedId}/pay-license-fee/`, {});
  }
}
