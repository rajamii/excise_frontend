import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SpecialPermitService {
  private readonly baseUrl = `${environment.apiBaseUrl}/transactional/special-permit`;

  constructor(private http: HttpClient) {}

  getEligibleLicenses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/eligible-licenses/`);
  }

  applySpecialPermit(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/apply/`, data);
  }

  listSpecialPermits(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/list/`);
  }

  getDashboardCounts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard-counts/`);
  }

  getApplicationsByStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list-by-status/`);
  }

  getSpecialPermitDetail(applicationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/detail/${encodeURIComponent(applicationId)}/`);
  }
}
