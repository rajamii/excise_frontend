import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

  // Get company registration details by application ID
  getCompanyDetail(applicationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/detail/${applicationId}/`);
  }

  // Get dashboard counts
  getDashboardCounts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard-counts/`);
  }

  // Get applications grouped by status
  getApplicationsByStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list-by-status/`);
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
}