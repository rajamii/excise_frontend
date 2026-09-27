import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface IMFLHologramProcurementItem {
  id?: number;
  ref_no?: string;
  reference_no?: string;
  referenceNo?: string;
  refNo?: string;
  applicant?: number;
  applicant_name?: string;
  applicantName?: string;
  applicant_email?: string;
  distributor_name?: string;
  distributorName?: string;
  license_number?: string;
  licenseNumber?: string;
  establishment_name?: string;
  establishmentName?: string;
  quantity: number;
  rate_per_piece?: number;
  ratePerPiece?: number;
  total_amount?: number;
  totalAmount?: number;
  payment_status?: string;
  paymentStatus?: string;
  payment_date?: string | null;
  paymentDate?: string | null;
  payment_details?: any;
  paymentDetails?: any;
  workflow?: number;
  workflow_name?: string;
  current_stage?: number;
  current_stage_name?: string;
  currentStageName?: string;
  status?: string;
  remarks?: string;
  allowed_actions?: string[];
  allowedActions?: string[];
  created_at?: string;
  createdAt?: string;
  submitted_date?: string;
  updated_at?: string;
}

export interface IMFLHologramArrivalItem {
  id?: number;
  procurement?: number;
  procurement_id?: number;
  procurement_ref_no?: string;
  procurementRefNo?: string;
  imfl_hologram_ref_no?: string;
  imflHologramRefNo?: string;
  distributor_name?: string;
  distributorName?: string;
  license_number?: string;
  licenseNumber?: string;
  establishment_name?: string;
  establishmentName?: string;
  total_holograms: number;
  totalHolograms?: number;
  procured_quantity?: number;
  procuredQuantity?: number;
  payment_status?: string;
  paymentStatus?: string;
  hologram_from_range: string;
  hologramFromRange?: string;
  hologram_to_range: string;
  hologramToRange?: string;
  hologram_ranges?: Array<{ from: string; to: string; count?: number; status?: string }>;
  hologramRanges?: Array<{ from: string; to: string; count?: number; status?: string }>;
  damaged_total?: number;
  damagedTotal?: number;
  damaged_holograms_range?: any[];
  damagedHologramsRange?: any[];
  received_by?: number;
  received_by_username?: string;
  receivedByUsername?: string;
  recorded_by_name?: string;
  recordedByName?: string;
  arrival_date?: string;
  arrivalDate?: string;
  status?: string;
  remarks?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImflHologramProcurementService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/transactional/distributor-permit/hologram-procurement`;
  private arrivalUrl = `${environment.apiBaseUrl}/transactional/distributor-permit/hologram-arrival`;

  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  getProcurements(queryParams?: Record<string, any>): Observable<any> {
    let params = new HttpParams();
    if (queryParams) {
      Object.keys(queryParams).forEach((k) => {
        if (queryParams[k] !== undefined && queryParams[k] !== null && queryParams[k] !== '') {
          params = params.set(k, queryParams[k]);
        }
      });
    }
    return this.http.get<any>(`${this.baseUrl}/`, { params });
  }

  getProcurement(id: number): Observable<IMFLHologramProcurementItem> {
    return this.http.get<IMFLHologramProcurementItem>(`${this.baseUrl}/${id}/`);
  }

  createProcurement(data: {
    quantity: number;
    distributor_name?: string;
    license_number?: string;
    establishment_name?: string;
    remarks?: string;
  }): Observable<IMFLHologramProcurementItem> {
    return this.http.post<IMFLHologramProcurementItem>(`${this.baseUrl}/`, data).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  performAction(id: number, action: string, remarks?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/action/`, { action, remarks }).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  payViaWallet(id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/pay/`, {}).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  // --- IMFL Hologram Arrivals ---
  getHologramArrivals(params?: any): Observable<IMFLHologramArrivalItem[]> {
    return this.http.get<IMFLHologramArrivalItem[]>(`${this.arrivalUrl}/`, { params });
  }

  getHologramArrival(id: number): Observable<IMFLHologramArrivalItem> {
    return this.http.get<IMFLHologramArrivalItem>(`${this.arrivalUrl}/${id}/`);
  }

  createHologramArrival(data: Partial<IMFLHologramArrivalItem>): Observable<IMFLHologramArrivalItem> {
    return this.http.post<IMFLHologramArrivalItem>(`${this.arrivalUrl}/`, data).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  updateHologramArrival(id: number, data: Partial<IMFLHologramArrivalItem>): Observable<IMFLHologramArrivalItem> {
    return this.http.patch<IMFLHologramArrivalItem>(`${this.arrivalUrl}/${id}/`, data).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  getApprovedProcurementsForArrival(): Observable<any[]> {
    return this.http.get<any[]>(`${this.arrivalUrl}/approved-procurements/`);
  }

  getHologramOverview(): Observable<any> {
    return this.http.get<any>(`${this.arrivalUrl}/overview/`);
  }
}
