import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DistributorBrandMaster,
  DistributorPermitApplication,
  DistributorSupplier
} from '../models/distributor-permit.model';

@Injectable({
  providedIn: 'root'
})
export class DistributorPermitService {
  private readonly baseUrl = `${environment.apiBaseUrl}/transactional/distributor-permit`;

  constructor(private http: HttpClient) {}

  listApplications(status?: string): Observable<DistributorPermitApplication[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<DistributorPermitApplication[]>(`${this.baseUrl}/`, { params });
  }

  getApplication(referenceNo: string): Observable<DistributorPermitApplication> {
    return this.http.get<DistributorPermitApplication>(`${this.baseUrl}/${encodeURIComponent(referenceNo)}/`);
  }

  createApplication(payload: DistributorPermitApplication): Observable<DistributorPermitApplication> {
    return this.http.post<DistributorPermitApplication>(`${this.baseUrl}/`, payload);
  }

  getSuppliers(): Observable<DistributorSupplier[]> {
    return this.http.get<DistributorSupplier[]>(`${this.baseUrl}/suppliers/?active_only=1`);
  }

  getBrandMaster(q = ''): Observable<{ success: boolean; data: DistributorBrandMaster[]; total: number }> {
    let params = new HttpParams().set('limit', 250);
    if (q.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<{ success: boolean; data: DistributorBrandMaster[]; total: number }>(
      `${this.baseUrl}/brand-master/`,
      { params }
    );
  }

  getPremises(): Observable<{ destination: string }> {
    return this.http.get<{ destination: string }>(`${this.baseUrl}/premises/`);
  }

  getRevalidations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/revalidation/`);
  }

  createRevalidation(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/revalidation/`, payload);
  }

  getCancellations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cancellation/`);
  }

  createCancellation(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cancellation/`, payload);
  }

  getRevalidationSchedules(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/revalidation-schedules/`);
  }
}
