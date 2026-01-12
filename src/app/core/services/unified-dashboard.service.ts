import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DashboardCount } from '../models/dashboard.model';
import { UnifiedApplication } from '../models/unified-application.model';
import { Objection } from '../models/license-application.model';

@Injectable({ providedIn: 'root' })
export class UnifiedDashboardService {
  private baseUrl = `${environment.apiBaseUrl}/transactional`;

  private endpoints = {
    renewal: `${this.baseUrl}/license_application`,
    new: `${this.baseUrl}/new_license_application`,
    salesman: `${this.baseUrl}/salesman_barman`
  };

  constructor(private http: HttpClient) { }

  /** Combine counts from all 3 application types */
  getUnifiedDashboardCounts(): Observable<DashboardCount> {
    const requests = [
      this.http.get<DashboardCount>(`${this.endpoints.renewal}/dashboard-counts/`),
      this.http.get<DashboardCount>(`${this.endpoints.new}/dashboard-counts/`),
      this.http.get<DashboardCount>(`${this.endpoints.salesman}/dashboard-counts/`)
    ];

    return forkJoin(requests).pipe(
      map(([renewal, newLic, salesman]) => ({
        applied: (renewal.applied || 0) + (newLic.applied || 0) + (salesman.applied || 0),
        pending: (renewal.pending || 0) + (newLic.pending || 0) + (salesman.pending || 0),
        approved: (renewal.approved || 0) + (newLic.approved || 0) + (salesman.approved || 0),
        rejected: (renewal.rejected || 0) + (newLic.rejected || 0) + (salesman.rejected || 0),
      }))
    );
  }

  /** Combine list-by-status from all 3 types into UnifiedApplication[] */
  getUnifiedApplicationsByStatus(): Observable<{
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }> {
    const requests = [
      this.http.get<any>(`${this.endpoints.renewal}/list-by-status/`),
      this.http.get<any>(`${this.endpoints.new}/list-by-status/`),
      this.http.get<any>(`${this.endpoints.salesman}/list-by-status/`)
    ];

    return forkJoin(requests).pipe(
      map(([renewal, newLic, salesman]) => {
        const normalize = (apps: any[], type: UnifiedApplication['type']): UnifiedApplication[] =>
          apps.map(app => ({
            type,
            applicationId: app.application_id || app.applicationId,
            currentStage: app.current_stage || app.currentStage,
            currentStageName: app.current_stage_name || app.currentStageName ||
              (app.current_stage?.name) || 'Unknown',
            isApproved: app.is_approved ?? app.isApproved ?? false,
            establishmentName: app.establishment_name || app.establishmentName || null,
            applicantFullName:
              app.applicant_name ||
              `${app.firstName || ''} ${app.middleName || ''} ${app.lastName || ''}`.trim() ||
              app.applicantFullName ||
              'N/A',
            mobileNumber: app.mobile_number || app.mobileNumber,
            email: app.email || app.emailId,
            licenseCategoryName:
              app.license_category?.name ||
              app.licenseCategoryName ||
              app.license_category,
            siteDistrictName:
              app.site_district?.name ||
              app.excise_district?.name ||
              app.district ||
              'N/A',
            transactions: app.transactions || [],
            raw: app  // keep full original for detail view
          }));

        const result = {
          applied: [] as UnifiedApplication[],
          pending: [] as UnifiedApplication[],
          approved: [] as UnifiedApplication[],
          rejected: [] as UnifiedApplication[]
        };

        // Merge renewal
        result.applied.push(...normalize(renewal.applied || [], 'license-renewal'));
        result.pending.push(...normalize(renewal.pending || [], 'license-renewal'));
        result.approved.push(...normalize(renewal.approved || [], 'license-renewal'));
        result.rejected.push(...normalize(renewal.rejected || [], 'license-renewal'));

        // Merge new license
        result.applied.push(...normalize(newLic.applied || [], 'new-license'));
        result.pending.push(...normalize(newLic.pending || [], 'new-license'));
        result.approved.push(...normalize(newLic.approved || [], 'new-license'));
        result.rejected.push(...normalize(newLic.rejected || [], 'new-license'));

        // Merge salesman/barman
        result.applied.push(...normalize(salesman.applied || [], 'salesman-barman'));
        result.pending.push(...normalize(salesman.pending || [], 'salesman-barman'));
        result.approved.push(...normalize(salesman.approved || [], 'salesman-barman'));
        result.rejected.push(...normalize(salesman.rejected || [], 'salesman-barman'));

        return result;
      })
    );
  }

  /** Fetch detail using correct endpoint based on type */
  getApplicationDetail(applicationId: string, type: UnifiedApplication['type']): Observable<any> {
    const mapping: Record<UnifiedApplication['type'], string> = {
      'license-renewal': this.endpoints.renewal,
      'new-license': this.endpoints.new,
      'salesman-barman': this.endpoints.salesman
    };
    const url = `${mapping[type]}/detail/${applicationId}/`;
    return this.http.get<any>(url);
  }

  getObjections(applicationId: string, type: UnifiedApplication['type']): Observable<Objection[]> {

    return this.http.get<Objection[]>(`${this.baseUrl}/auth/objections/${applicationId}/`); // Assume endpoint exists for all
  }

  resolveObjections(applicationId: string, type: UnifiedApplication['type'], formData: FormData): Observable<any> {

    return this.http.post<any>(`${this.baseUrl}/auth/objections/${applicationId}/`, formData);
  }

}