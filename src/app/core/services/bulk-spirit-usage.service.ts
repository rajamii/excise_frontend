import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BulkSpiritUsageRecord {
  id: number;
  reference_no: string;
  licensee_id: string;
  distillery_name: string;
  applicant: number;
  applicant_name: string;
  bulk_spirit_type: string;
  quantity: number;
  purpose: string;
  remarks: string;
  status: string;
  status_code: string;
  rejection_reason: string;
  workflow: number;
  current_stage: number;
  current_stage_name: string;
  reviewed_by: string;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
  allowed_actions?: string[];
}

export interface BulkSpiritInventoryItem {
  bulk_spirit_type: string;
  total_arrived_bl: number;
  total_approved_usage_bl: number;
  total_pending_usage_bl: number;
  available_bl: number;
}

export interface BulkSpiritInventorySummaryResponse {
  status: string;
  data: BulkSpiritInventoryItem[];
  total_arrived_bl: number;
  total_used_bl: number;
  total_pending_bl: number;
  total_available_bl: number;
}

@Injectable({
  providedIn: 'root'
})
export class BulkSpiritUsageService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/transactional/supply_chain/bulk-spirit-usage/`;

  getUsageRequests(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getInventorySummary(): Observable<BulkSpiritInventorySummaryResponse> {
    return this.http.get<BulkSpiritInventorySummaryResponse>(`${this.apiUrl}inventory-summary/`);
  }

  createUsageRequest(payload: {
    bulk_spirit_type: string;
    quantity: number;
    purpose?: string;
    remarks?: string;
    licensee_id?: string;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload);
  }

  performAction(id: number, action: 'APPROVE' | 'REJECT', remarks: string = ''): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}${id}/perform-action/`, { action, remarks });
  }
}
