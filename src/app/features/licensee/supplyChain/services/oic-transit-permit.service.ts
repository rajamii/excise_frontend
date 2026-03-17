import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

export interface TransitPermitDetail {
  id: number;
  bill_no: string;
  sole_distributor_name: string;
  date: string;
  depot_address: string;
  brand: string;
  size_ml: number;
  cases: number;
  vehicle_number: string;
  licensee_id: string;
  bottle_type: string;
  brand_owner: string;
  liquor_type: string;
  exfactory_price_rs_per_case: number;
  excise_duty_rs_per_case: number;
  education_cess_rs_per_case: number;
  additional_excise_duty_rs_per_case: number;
  manufacturing_unit_name: string;
  total_education_cess: number;
  total_excise_duty: number;
  total_additional_excise: number;
  total_amount: number;
  workflow: number | null;
  status: string;
  status_code: string;
  current_stage: number | null;
  current_stage_name?: string;
  current_stage_description?: string;
  current_stage_is_initial?: boolean;
  current_stage_is_final?: boolean;
  current_stage_entry_actions?: string[];
  workflow_name?: string;
  allowed_actions?: string[];
  created_at: string;
  updated_at: string;
}

export interface GroupedTransitPermit {
  bill_no: string;
  sole_distributor_name: string;
  date: string;
  depot_address: string;
  vehicle_number: string;
  licensee_id: string;
  status: string;
  status_label?: string;
  status_code: string;
  current_stage_name?: string;
  current_stage_is_initial?: boolean;
  current_stage_is_final?: boolean;
  current_stage_entry_actions?: string[];
  total_amount: number;
  total_cases: number;
  total_products: number;
  brands: TransitPermitDetail[];
  created_at: string;
  updated_at: string;
  allowed_actions?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class OicTransitPermitService {
  private apiUrl = `${environment.apiBaseUrl}/transactional/supply_chain/transit-permits`;

  constructor(private http: HttpClient) { }

  /**
   * Get all transit permits
   */
  getAllTransitPermits(): Observable<TransitPermitDetail[]> {
    return this.http.get<TransitPermitDetail[]>(this.apiUrl);
  }

  /**
   * Get transit permits by bill number
   */
  getTransitPermitByBillNo(billNo: string): Observable<TransitPermitDetail[]> {
    const params = new HttpParams().set('bill_no', billNo);
    return this.http.get<TransitPermitDetail[]>(this.apiUrl, { params });
  }

  /**
   * Get grouped transit permits (grouped by bill_no)
   */
  getGroupedTransitPermits(): Observable<GroupedTransitPermit[]> {
    return this.getAllTransitPermits().pipe(
      map(permits => this.groupPermitsByBillNo(permits))
    );
  }

  /**
   * Get filtered transit permits for OIC (only paid permits)
   * Shows permits that have been paid and are ready for OIC review
   */
  getOICTransitPermits(): Observable<GroupedTransitPermit[]> {
    return this.getGroupedTransitPermits().pipe(
      map(permits => permits.filter(permit => !permit.current_stage_is_initial))
    );
  }

  /**
   * Perform action on transit permit (PAY, APPROVE, REJECT)
   */
  performAction(permitId: number, action: 'PAY' | 'APPROVE' | 'REJECT', remarks?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/action/${permitId}/`, { action, remarks });
  }

  /**
   * Group permits by bill_no
   */
  private groupPermitsByBillNo(permits: TransitPermitDetail[]): GroupedTransitPermit[] {
    const grouped = new Map<string, GroupedTransitPermit>();

    permits.forEach((permit: any) => {
      const billNo = permit.bill_no || permit.billNo;

      if (!billNo) return;

      if (!grouped.has(billNo)) {
        grouped.set(billNo, {
          bill_no: billNo,
          sole_distributor_name: permit.sole_distributor_name || permit.soleDistributorName,
          date: permit.date,
          depot_address: permit.depot_address || permit.depotAddress,
          vehicle_number: permit.vehicle_number || permit.vehicleNumber,
          licensee_id: permit.licensee_id || permit.licenseeId,
          status: permit.status,
          status_label: permit.current_stage_description || permit.current_stage_name || permit.status,
          status_code: permit.status_code || permit.statusCode,
          current_stage_name: permit.current_stage_name || permit.currentStageName,
          current_stage_is_initial: permit.current_stage_is_initial ?? permit.currentStageIsInitial ?? false,
          current_stage_is_final: permit.current_stage_is_final ?? permit.currentStageIsFinal ?? false,
          current_stage_entry_actions: permit.current_stage_entry_actions || permit.currentStageEntryActions || [],
          total_amount: 0,
          total_cases: 0,
          total_products: 0,
          brands: [],
          created_at: permit.created_at || permit.createdAt,
          updated_at: permit.updated_at || permit.updatedAt,
          allowed_actions: permit.allowed_actions || permit.allowedActions
        });
      }

      const group = grouped.get(billNo)!;
      group.brands.push(permit);

      const amount = parseFloat(permit.total_amount || permit.totalAmount || '0');
      const cases = parseInt(permit.cases || '0', 10);

      group.total_amount += amount;
      group.total_cases += cases;
      group.total_products += 1;
      group.current_stage_is_initial = permit.current_stage_is_initial ?? group.current_stage_is_initial ?? false;
      group.current_stage_is_final = permit.current_stage_is_final ?? group.current_stage_is_final ?? false;
      const entryActions = permit.current_stage_entry_actions || [];
      if (Array.isArray(entryActions) && entryActions.length > 0) {
        group.current_stage_entry_actions = Array.from(
          new Set([...(group.current_stage_entry_actions || []), ...entryActions.map((a: any) => String(a).toUpperCase())])
        );
      }
      const allowed = permit.allowed_actions || [];
      if (Array.isArray(allowed) && allowed.length > 0) {
        group.allowed_actions = Array.from(
          new Set([...(group.allowed_actions || []), ...allowed.map((a: any) => String(a).toUpperCase())])
        );
      }
    });

    return Array.from(grouped.values());
  }

  /**
   * Get statistics for OIC dashboard
   */
  getOICStatistics(): Observable<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    return this.getOICTransitPermits().pipe(
      map(permits => {
        const toActions = (actions: any) =>
          Array.isArray(actions) ? actions.map((a: any) => String(a).toUpperCase()) : [];
        const isPending = (p: GroupedTransitPermit) => toActions(p.allowed_actions).includes('APPROVE') || toActions(p.allowed_actions).includes('REJECT');
        const isApproved = (p: GroupedTransitPermit) => !!p.current_stage_is_final && toActions(p.current_stage_entry_actions).includes('APPROVE');
        const isRejected = (p: GroupedTransitPermit) => !!p.current_stage_is_final && toActions(p.current_stage_entry_actions).includes('REJECT');

        const stats = {
          pending: permits.filter(isPending).length,
          approved: permits.filter(isApproved).length,
          rejected: permits.filter(isRejected).length,
          total: permits.length
        };
        return stats;
      })
    );
  }
}
