import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DashboardCount } from '../models/dashboard.model';
import { UnifiedApplication } from '../models/unified-application.model';
import { Objection } from '../models/license-application.model';
import { AccountService } from './account.service';

@Injectable({ providedIn: 'root' })
export class UnifiedDashboardService {
  private baseUrl = `${environment.apiBaseUrl}/transactional`;
  private workflowUrl = `${environment.apiBaseUrl}/auth/`;
  private unifiedAppsCache$?: Observable<{
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
    awaitingPayment?: UnifiedApplication[];
  }>;
  private cacheUserKey: string | null = null;

  private endpoints = {
    renewal: `${this.baseUrl}/license_application`,
    new: `${this.baseUrl}/new_license_application`,
    salesman: `${this.baseUrl}/salesman_barman`,
    company: `${this.baseUrl}/company-registration`
  };

  private inferAppTypeFromId(applicationId: string): UnifiedApplication['type'] | '' {
    const id = String(applicationId || '').trim().toUpperCase();
    if (!id) return '';
    if (id.startsWith('NLI/')) return 'new-license';
    if (id.startsWith('LIC/')) return 'license-renewal';
    if (id.startsWith('NA/')) return 'new-license';
    if (id.startsWith('LA/')) return 'license-renewal';
    return '';
  }

  constructor(private http: HttpClient, private accountService: AccountService) {
    
    this.accountService.getAuthenticationState().subscribe((account) => {
      const nextKey = account?.username ? String(account.username) : null;
      if (nextKey !== this.cacheUserKey) {
        this.cacheUserKey = nextKey;
        this.clearUnifiedAppsCache();
      }
    });
  }

  private clearUnifiedAppsCache(): void {
    this.unifiedAppsCache$ = undefined;
  }

  
  getUnifiedDashboardCounts(): Observable<DashboardCount> {
    const requests = [
      this.http.get<DashboardCount>(`${this.endpoints.renewal}/dashboard-counts/`).pipe(
        catchError(err => {
          console.error(' Renewal counts error:', err);
          return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
        })
      ),
      this.http.get<DashboardCount>(`${this.endpoints.new}/dashboard-counts/`).pipe(
        catchError(err => {
          console.error(' New license counts error:', err);
          return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
        })
      ),
      this.http.get<DashboardCount>(`${this.endpoints.salesman}/dashboard-counts/`).pipe(
        catchError(err => {
          console.error(' Salesman counts error:', err);
          return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
        })
      ),
      this.http.get<DashboardCount>(`${this.endpoints.company}/dashboard-counts/`).pipe(
        catchError(err => {
          console.error(' Company registration counts error:', err);
          return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
        })
      )
    ];

    return forkJoin(requests).pipe(
      map(([renewal, newLic, salesman, company]) => ({
        applied: (renewal.applied || 0) + (newLic.applied || 0) + (salesman.applied || 0) + (company.applied || 0),
        pending: (renewal.pending || 0) + (newLic.pending || 0) + (salesman.pending || 0) + (company.pending || 0),
        approved: (renewal.approved || 0) + (newLic.approved || 0) + (salesman.approved || 0) + (company.approved || 0),
        rejected: (renewal.rejected || 0) + (newLic.rejected || 0) + (salesman.rejected || 0) + (company.rejected || 0),
      }))
    );
  }

  // Get applications from all 4 types (added company)
  getUnifiedApplicationsByStatus(forceRefresh = false): Observable<{
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
    awaitingPayment?: UnifiedApplication[];
  }> {
    if (!forceRefresh && this.unifiedAppsCache$) {
      return this.unifiedAppsCache$;
    }

    const uniqueByKey = (apps: UnifiedApplication[]): UnifiedApplication[] => {
      const seen = new Set<string>();
      return (apps || []).filter((app) => {
        const key = `${app.type}::${app.applicationId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const requests = [
      this.http.get<any>(`${this.endpoints.renewal}/list-by-status/`).pipe(
        catchError(err => {
          console.error('Renewal error:', err);
          return of({ applied: [], pending: [], approved: [], rejected: [] });
        })
      ),
      this.http.get<any>(`${this.endpoints.new}/list-by-status/`).pipe(
        catchError(err => {
          console.error('New License error:', err);
          return of({ applied: [], pending: [], approved: [], rejected: [] });
        })
      ),
      this.http.get<any>(`${this.endpoints.salesman}/list-by-status/`).pipe(
        catchError(err => {
          console.error('Salesman error:', err);
          return of({ applied: [], pending: [], approved: [], rejected: [] });
        })
      ),
      //  ADDED: Company registration applications
      this.http.get<any>(`${this.endpoints.company}/list-by-status/`).pipe(
        catchError(err => {
          console.error('Company registration error:', err);
          return of({ applied: [], pending: [], approved: [], rejected: [] });
        })
      )
    ];

    this.unifiedAppsCache$ = forkJoin(requests).pipe(
      map(([renewal, newLic, salesman, company]) => {
        const normalize = (data: any, type: UnifiedApplication['type']) => {
          if (!data) {
            return { applied: [], pending: [], approved: [], rejected: [], awaitingPayment: [] };
          }

          const hasStatusStructure = (
            data.hasOwnProperty('applied') ||
            data.hasOwnProperty('pending') ||
            data.hasOwnProperty('approved') ||
            data.hasOwnProperty('rejected')
          );

          if (!hasStatusStructure) {
            console.error(`${type}: Missing status structure`);
            return { applied: [], pending: [], approved: [], rejected: [], awaitingPayment: [] };
          }

          const extractArray = (statusData: any, statusName: string): UnifiedApplication[] => {
            if (!Array.isArray(statusData)) return [];
            
            return statusData.map((app: any) => {
              const applicationId = 
                app.application_id ||
                app.applicationId ||
                app.id ||
                '';

              let currentStage = app.current_stage || app.currentStage;
              const currentStageId = app.current_stage_id || app.currentStageId || null;
              
              if (typeof currentStage === 'number') {
                const stageIdToName: { [key: number]: string } = {
                  1: 'applicant_applied', 2: 'level_1', 3: 'level_2', 4: 'level_3', 5: 'level_4', 6: 'level_5',
                  7: 'level_1_objection', 8: 'level_2_objection', 9: 'level_3_objection', 10: 'level_4_objection', 11: 'level_5_objection',
                  12: 'approved', 13: 'applicant_applied', 14: 'level_1', 15: 'level_2', 16: 'approved',
                  23: 'awaiting_payment', 24: 'rejected_by_level_1', 25: 'rejected_by_level_2', 26: 'rejected_by_level_3',
                  27: 'rejected_by_level_4', 28: 'rejected_by_level_5', 29: 'rejected', 30: 'objection_raised', 31: 'awaiting_payment'
                };
                currentStage = stageIdToName[currentStage] || String(currentStage);
              }

              const unifiedApp: UnifiedApplication = {
                type,
                applicationId: String(applicationId),
                currentStage: String(currentStage),
                currentStageName: app.current_stage_name || app.currentStageName || 'Unknown',
                isApproved: app.is_approved ?? app.isApproved ?? false,
                establishmentName: app.establishment_name || app.establishmentName || app.company_name || app.companyName || null,
                applicantFullName: this.getApplicantName(app, type),
                mobileNumber: app.mobile_number || app.mobileNumber || app.company_mobile_number || app.companyMobileNumber || '',
                email: app.email || app.emailId || app.email_id || app.company_email_id || app.companyEmailId || '',
                licenseCategoryName: this.getLicenseCategoryName(app),
                siteDistrictName: this.getDistrictName(app),
                transactions: Array.isArray(app.transactions) ? app.transactions : [],
                raw: {
                  ...app,
                  current_stage_id: currentStageId || (typeof app.current_stage === 'number' ? app.current_stage : null)
                }
              };

              return unifiedApp;
            });
          };

          return {
            applied: extractArray(data.applied, 'applied'),
            pending: extractArray(data.pending, 'pending'),
            approved: extractArray(data.approved, 'approved'),
            rejected: extractArray(data.rejected, 'rejected'),
            awaitingPayment: []
          };
        };

        const normalizedRenewal = normalize(renewal, 'license-renewal');
        const normalizedNewLic = normalize(newLic, 'new-license');
        const normalizedSalesman = normalize(salesman, 'salesman-barman');
        const normalizedCompany = normalize(company, 'company-registration'); // ✅ ADDED

        // FIXED: Include company applications in aggregation
        let allApplied = [...normalizedRenewal.applied, ...normalizedNewLic.applied, ...normalizedSalesman.applied, ...normalizedCompany.applied];
        let allPending = [...normalizedRenewal.pending, ...normalizedNewLic.pending, ...normalizedSalesman.pending, ...normalizedCompany.pending];
        let allApproved = [...normalizedRenewal.approved, ...normalizedNewLic.approved, ...normalizedSalesman.approved, ...normalizedCompany.approved];
        const allRejected = [...normalizedRenewal.rejected, ...normalizedNewLic.rejected, ...normalizedSalesman.rejected, ...normalizedCompany.rejected];

        const awaitingPaymentApps: UnifiedApplication[] = [];
        
        const isAwaitingPayment = (app: UnifiedApplication): boolean => {
          const stage = String(app.currentStage || '').toLowerCase();
          const stageId = app.raw?.current_stage_id || app.raw?.currentStageId;
          const isAwaitingByName = stage === 'awaiting_payment' || stage.includes('awaiting') || stage === 'awaiting payment';
          const isAwaitingById = stageId === 23 || stageId === 31 || Number(stageId) === 23 || Number(stageId) === 31;
          return isAwaitingByName || isAwaitingById;
        };
        
        const stillPending = allPending.filter(app => {
          if (isAwaitingPayment(app)) {
            awaitingPaymentApps.push(app);
            return false;
          }
          return true;
        });

        const stillApproved = allApproved.filter(app => {
          if (isAwaitingPayment(app)) {
            awaitingPaymentApps.push(app);
            return false;
          }
          return true;
        });

        const stillApplied = allApplied.filter(app => {
          if (isAwaitingPayment(app)) {
            awaitingPaymentApps.push(app);
            return false;
          }
          return true;
        });

        return {
          applied: uniqueByKey(stillApplied),
          pending: uniqueByKey(stillPending),
          approved: uniqueByKey(stillApproved),
          rejected: uniqueByKey(allRejected),
          awaitingPayment: uniqueByKey(awaitingPaymentApps),
        };
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    return this.unifiedAppsCache$;
  }

  private getApplicantName(app: any, type: UnifiedApplication['type']): string {
    if (app.applicant_name) return app.applicant_name;
    if (app.applicantName) return app.applicantName;
    if (app.member_name) return app.member_name;
    if (app.memberName) return app.memberName;
    
    // ADDED: Company registration name fields
    if (type === 'company-registration') {
      return app.company_name || app.companyName || 'N/A';
    }
    
    if (type === 'salesman-barman') {
      const firstName = app.first_name || app.firstName || '';
      const middleName = app.middle_name || app.middleName || '';
      const lastName = app.last_name || app.lastName || '';
      const fullName = `${firstName} ${middleName} ${lastName}`.trim();
      if (fullName) return fullName;
    }
    
    return 'N/A';
  }

  private getLicenseCategoryName(app: any): string {
    if (app.license_category && typeof app.license_category === 'object') {
      return app.license_category.name || app.license_category.licenseCategory || app.license_category.license_category || 'N/A';
    }
    // ADDED: Fallback for company registration (may use "brand_type" or "license")
    return app.license_category_name || app.licenseCategoryName || app.license_category || app.brand_type || app.brandType || app.license || 'N/A';
  }

  private getDistrictName(app: any): string {
    if (app.site_district && typeof app.site_district === 'object') {
      return app.site_district.name || app.site_district.district || 'N/A';
    }
    if (app.excise_district && typeof app.excise_district === 'object') {
      return app.excise_district.name || app.excise_district.district || 'N/A';
    }
    if (app.district && typeof app.district === 'object') {
      return app.district.name || app.district.district || 'N/A';
    }
    // ADDED: Fallback for company registration (may use "state")
    return app.site_district_name || app.excise_district_name || app.district || app.state || 'N/A';
  }

  getApplicationDetail(applicationId: string, type: UnifiedApplication['type']): Observable<any> {
    const mapping: Record<UnifiedApplication['type'], string> = {
      'license-renewal': this.endpoints.renewal,
      'new-license': this.endpoints.new,
      'salesman-barman': this.endpoints.salesman,
      'company-registration': this.endpoints.company // ✅ ADDED
    };

    const inferred = this.inferAppTypeFromId(applicationId);
    const resolvedType = inferred || type;
    const encodedId = encodeURIComponent(applicationId);
    const url = `${mapping[resolvedType]}/detail/${encodedId}/`;
    return this.http.get<any>(url);
  }

  getObjections(applicationId: string): Observable<Objection[]> {
    return this.http.get<Objection[]>(`${this.workflowUrl}${applicationId}/objections/`);
  }

  resolveObjections(applicationId: string, type: UnifiedApplication['type'], formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.workflowUrl}${applicationId}/resolve-objections/`, formData);
  }

  payLicenseFee(applicationId: string): Observable<any> {
    return this.http.post<any>(`${this.workflowUrl}${applicationId}/pay-license-fee/`, {});
  }
}
