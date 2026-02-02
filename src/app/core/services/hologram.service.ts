import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DailyRegisterEntry {
  id: number;
  referenceNo: string;
  distilleryName: string;
  submissionDate: string;
  submissionTime: string;
  approvalDate?: string;
  approvalTime?: string;
  usageDate: string;
  hologramType: string;
  quantity: number;
  status: 'APPLIED' | 'UNDER_PROCESS' | 'COMPLETED';
  completedOnTime?: boolean;
  isOverdue: boolean;
  timeRemaining?: string;
  deadline?: string;
  completionDate?: string;
  completionTime?: string;
  officerName?: string;
  brandsEntered?: Array<{
    brand: string;
    brandCode?: string;
    bottleSize: string;
    quantity: number;
    usageDate: string;
    rollsAssigned?: Array<{
      rollId?: number;
      cartoonNumber?: string;
      rollNumber?: string;
      quantity?: number;
      fromSerial?: string;
      toSerial?: string;
    }>;
    serialRanges?: Array<{
      from: string;
      to: string;
      count?: number;
      rollNumber?: string;
    }>;
  }>;
  currentStage: string;
}

export interface DailyRegisterSummary {
  totalEntries: number;
  applied: number;
  underProcess: number;
  completedOnTime: number;
  completedLate: number;
  overdue: number;
}

export interface DailyRegisterResponse {
  summary: DailyRegisterSummary;
  entries: DailyRegisterEntry[];
}

@Injectable({
  providedIn: 'root'
})
export class HologramService {
  private apiUrl = `${environment.apiBaseUrl}/transactional/supply_chain/hologram`;

  constructor(private http: HttpClient) {}

  /**
   * Get daily register overview for commissioner dashboard
   */
  getDailyRegisterOverview(): Observable<DailyRegisterResponse> {
    return this.http.get<DailyRegisterResponse>(
      `${this.apiUrl}/commissioner-dashboard/daily_register_overview/`
    );
  }

  /**
   * Get filtered daily register entries
   */
  getFilteredDailyRegister(filters: {
    referenceNo?: string;
    distillery?: string;
    status?: string;
    hologramType?: string;
    dateFrom?: string;
    dateTo?: string;
    onlyOverdue?: boolean;
  }): Observable<DailyRegisterResponse> {
    let params = new HttpParams();
    
    if (filters.referenceNo) {
      params = params.set('reference_no', filters.referenceNo);
    }
    if (filters.distillery) {
      params = params.set('distillery', filters.distillery);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.hologramType) {
      params = params.set('hologram_type', filters.hologramType);
    }
    if (filters.dateFrom) {
      params = params.set('date_from', filters.dateFrom);
    }
    if (filters.dateTo) {
      params = params.set('date_to', filters.dateTo);
    }
    if (filters.onlyOverdue) {
      params = params.set('only_overdue', 'true');
    }

    return this.http.get<DailyRegisterResponse>(
      `${this.apiUrl}/commissioner-dashboard/daily_register_overview/`,
      { params }
    );
  }

  /**
   * Export daily register data
   */
  exportDailyRegister(format: 'csv' | 'excel' = 'excel'): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/commissioner-dashboard/export_daily_register/`,
      {
        params: { format },
        responseType: 'blob'
      }
    );
  }
}
