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

  createCompany(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/create/`, data);
  }

  getCompanyDetail(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}/`);
  }

  updateCompany(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/update/`, data);
  }

  deleteCompany(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}/delete/`);
  }

  getCompanyByApplicationId(applicationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/appid/${applicationId}/`);
  }

  setCompanyDocuments(docs: Partial<Record<keyof CompanyDocuments, File>>): void {
    this.companyDocs = docs;
  }

  getCompanyDocuments(): Partial<Record<keyof CompanyDocuments, File>> {
    return this.companyDocs;
  }

  clearCompanyDocuments(): void {
    this.companyDocs = {};
  }
}
