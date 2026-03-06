import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CompanyCollaborationBrand } from '../models/company-collaboration.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyCollaborationService {
  private baseUrl = `${environment.apiBaseUrl}/transactional/company-collaboration`;
  private selectedBrands: CompanyCollaborationBrand[] = [];

  constructor(private http: HttpClient) {}

  applyCompanyCollaboration(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/apply/`, data);
  }

  listCompanyCollaborations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list/`);
  }

  getCompanyCollaborationDetail(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.baseUrl}/detail/${encodedId}/`);
  }

  getDashboardCounts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard-counts/`);
  }

  getApplicationsByStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list-by-status/`);
  }

  setSelectedBrands(brands: CompanyCollaborationBrand[]): void {
    this.selectedBrands = [...brands];
  }

  getSelectedBrands(): CompanyCollaborationBrand[] {
    return this.selectedBrands;
  }

  clearSelectedBrands(): void {
    this.selectedBrands = [];
  }
}

