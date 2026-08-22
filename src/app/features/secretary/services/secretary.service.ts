import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ManufacturingFactory {
  id: string;
  establishment_name: string;
  applicant_name: string;
  company_name: string;
  license_number: string;
  category: string;
  sub_category: string; // 'Distillery' | 'Brewery'
  district: string;
  business_address: string;
  mobile_number: string;
  email: string;
  status: string;
  is_approved: boolean;
  stock_bl: number;
  total_requisitions_count: number;
  total_bl_requested: number;
  pending_requisitions_count: number;
  approved_requisitions_count: number;
  active_transit_permits_count: number;
  dispatched_bl: number;
}

export interface SecretaryBulkSpiritSummary {
  total_units: number;
  distilleries_count: number;
  breweries_count: number;
  total_stock_bl: number;
  total_requested_bl: number;
  total_dispatched_bl: number;
  total_requisitions: number;
}

@Injectable({
  providedIn: 'root'
})
export class SecretaryService {
  private baseUrl = `${environment.apiBaseUrl}/api/secretary/bulk-spirit`;

  constructor(private http: HttpClient) {}

  getBulkSpiritFactories(subCategory: string = 'all', search: string = ''): Observable<{ count: number; factories: ManufacturingFactory[] }> {
    let params = new HttpParams();
    if (subCategory && subCategory !== 'all') {
      params = params.set('sub_category', subCategory);
    }
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<{ count: number; factories: ManufacturingFactory[] }>(`${this.baseUrl}/factories/`, { params });
  }

  getBulkSpiritSummary(): Observable<SecretaryBulkSpiritSummary> {
    return this.http.get<SecretaryBulkSpiritSummary>(`${this.baseUrl}/summary/`);
  }
}
