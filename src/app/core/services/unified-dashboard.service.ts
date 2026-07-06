import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DashboardCount } from '../models/dashboard.model';
import { UnifiedApplication } from '../models/unified-application.model';
import { Objection } from '../models/license-application.model';
import { AccountService } from './account.service';
import { DashboardConfig, NavigationItem } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class UnifiedDashboardService {
  private baseUrl = `${environment.apiBaseUrl}/transactional`;
  private workflowUrl = `${environment.apiBaseUrl}/auth/`;
  private unifiedCountsCache$?: Observable<DashboardCount>;
  private unifiedCountsCacheKey: string | null = null;
  private detailedCountsCache$?: Observable<{
    total: DashboardCount;
    newLicense: DashboardCount;
    renewal: DashboardCount;
    salesman: DashboardCount;
    company: DashboardCount;
  }>;
  private detailedCountsCacheKey: string | null = null;
  private unifiedAppsCache$?: Observable<{
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    objection: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
    awaitingPayment?: UnifiedApplication[];
  }>;
  private unifiedAppsCacheKey: string | null = null;
  private cacheUserKey: string | null = null;

  private endpoints = {
    renewal: `${this.baseUrl}/license_renewal_application`,
    new: `${this.baseUrl}/new_license_application`,
    salesman: `${this.baseUrl}/salesman_barman`,
    company: `${this.baseUrl}/company-registration`,
    label: `${this.baseUrl}/label-registration`
  };

  private readonly allTypes: UnifiedApplication['type'][] = [
    'license-renewal',
    'new-license',
    'salesman-barman',
    'company-registration',
    'label-registration'
  ];

  private inferAppTypeFromId(applicationId: string): UnifiedApplication['type'] | '' {
    const id = String(applicationId || '').trim().toUpperCase();
    if (!id) return '';
    if (id.startsWith('NLI/')) return 'new-license';
    if (id.startsWith('LIC/')) return 'license-renewal';
    if (id.startsWith('LRA/')) return 'license-renewal';
    if (id.startsWith('RSBM/')) return 'license-renewal';
    if (id.startsWith('NA/')) return 'new-license';
    if (id.startsWith('LA/')) return 'license-renewal';
    return '';
  }

  private toStageToken(app: any): string {
    const raw = app?.current_stage ?? app?.currentStage ?? '';
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }

    const stageName =
      app?.current_stage_name ??
      app?.currentStageName ??
      '';
    const asString = String(stageName || '').trim();
    if (!asString) return '';

    // Convert DB stage display names like "District User" / "Site Enquiry Officer" / "Objection"
    // into a stable token for UI grouping.
    return asString
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
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

  public clearUnifiedAppsCache(): void {
    this.unifiedAppsCache$ = undefined;
    this.unifiedAppsCacheKey = null;
    this.unifiedCountsCache$ = undefined;
    this.unifiedCountsCacheKey = null;
    this.detailedCountsCache$ = undefined;
    this.detailedCountsCacheKey = null;
  }


  private flattenNavigation(items: NavigationItem[] = []): NavigationItem[] {
    const out: NavigationItem[] = [];
    const visit = (list: NavigationItem[]) => {
      for (const item of list || []) {
        out.push(item);
        if (Array.isArray(item.children) && item.children.length) visit(item.children);
      }
    };
    visit(items || []);
    return out;
  }

  private inferEnabledTypesFromConfig(config?: DashboardConfig): UnifiedApplication['type'][] {
    if (!config) return this.allTypes.slice();

    const haystack = this.flattenNavigation(config.navigation)
      .map((x) => `${x?.label || ''} ${x?.route || ''}`.toLowerCase())
      .join(' | ');

    const enabled = new Set<UnifiedApplication['type']>();
    if (/(license[_ -]?application|renewal|licen[cs]e[_ -]?renewal)/.test(haystack)) enabled.add('license-renewal');
    if (/(new[_ -]?license|new[_ -]?licen[cs]e|new_license_application)/.test(haystack)) enabled.add('new-license');
    if (/(salesman|barman|salesman_barman)/.test(haystack)) enabled.add('salesman-barman');
    if (/(company|company[_ -]?registration|company-registration)/.test(haystack)) enabled.add('company-registration');

    return enabled.size ? Array.from(enabled) : this.allTypes.slice();
  }

  getUnifiedDashboardCounts(config?: DashboardConfig, forceRefresh = false): Observable<DashboardCount> {
    const enabledTypes = Array.from(new Set([...this.inferEnabledTypesFromConfig(config), 'license-renewal']));
    const cacheKey = enabledTypes.slice().sort().join('|');
    if (!forceRefresh && this.unifiedCountsCache$ && this.unifiedCountsCacheKey === cacheKey) {
      return this.unifiedCountsCache$;
    }
    const tasks: Array<Observable<DashboardCount>> = [];

    const empty: DashboardCount = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 } as DashboardCount;

    const getUrl = (url: string) => forceRefresh ? `${url}?cb=${Date.now()}` : url;

    if (enabledTypes.includes('license-renewal')) {
      tasks.push(
        this.http.get<DashboardCount>(getUrl(`${this.endpoints.renewal}/dashboard-counts/`)).pipe(
          catchError((err) => {
            console.error(' Renewal counts error:', err);
            return of(empty);
          })
        )
      );
    }

    if (enabledTypes.includes('new-license')) {
      tasks.push(
        this.http.get<DashboardCount>(getUrl(`${this.endpoints.new}/dashboard-counts/`)).pipe(
          catchError((err) => {
            console.error(' New license counts error:', err);
            return of(empty);
          })
        )
      );
    }

    if (enabledTypes.includes('salesman-barman')) {
      tasks.push(
        this.http.get<DashboardCount>(getUrl(`${this.endpoints.salesman}/dashboard-counts/`)).pipe(
          catchError((err) => {
            console.error(' Salesman counts error:', err);
            return of(empty);
          })
        )
      );
    }

    if (enabledTypes.includes('company-registration')) {
      tasks.push(
        this.http.get<DashboardCount>(getUrl(`${this.endpoints.company}/dashboard-counts/`)).pipe(
          catchError((err) => {
            console.error(' Company registration counts error:', err);
            return of(empty);
          })
        )
      );
    }

    if (!tasks.length) {
      this.unifiedCountsCacheKey = cacheKey;
      this.unifiedCountsCache$ = of(empty).pipe(shareReplay({ bufferSize: 1, refCount: false }));
      return this.unifiedCountsCache$;
    }

    this.unifiedCountsCacheKey = cacheKey;
    this.unifiedCountsCache$ = forkJoin(tasks).pipe(
      map((results) =>
        results.reduce(
          (acc, cur) => ({
            applied: (acc.applied || 0) + (cur.applied || 0),
            pending: (acc.pending || 0) + (cur.pending || 0),
            objection: (acc.objection || 0) + (cur.objection || 0),
            approved: (acc.approved || 0) + (cur.approved || 0),
            rejected: (acc.rejected || 0) + (cur.rejected || 0),
            awaitingPayment: (acc.awaitingPayment || 0) + (cur.awaitingPayment || (cur as any).awaiting_payment || 0)
          }),
          { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 } as any
        )
      )
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));

    return this.unifiedCountsCache$;
  }

  getDetailedUnifiedDashboardCounts(config?: DashboardConfig, forceRefresh = false, month?: number, year?: number): Observable<{
    total: DashboardCount;
    newLicense: DashboardCount;
    renewal: DashboardCount;
    salesman: DashboardCount;
    company: DashboardCount;
  }> {
    const enabledTypes = Array.from(new Set([...this.inferEnabledTypesFromConfig(config), 'license-renewal', 'company-registration', 'salesman-barman', 'new-license']));
    const cacheKey = [
      enabledTypes.slice().sort().join('|'),
      `month:${month ?? 'all'}`,
      `year:${year ?? 'all'}`
    ].join('::');

    if (!forceRefresh && this.detailedCountsCache$ && this.detailedCountsCacheKey === cacheKey) {
      return this.detailedCountsCache$;
    }

    const empty: DashboardCount = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 } as DashboardCount;

    const buildUrl = (base: string): string => {
      const params = new URLSearchParams();
      if (forceRefresh) params.set('cb', Date.now().toString());
      if (month != null) params.set('month', String(month));
      if (year != null) params.set('year', String(year));
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    };

    this.detailedCountsCacheKey = cacheKey;
    this.detailedCountsCache$ = forkJoin({
      newLicense: enabledTypes.includes('new-license')
        ? this.http.get<DashboardCount>(buildUrl(`${this.endpoints.new}/dashboard-counts/`)).pipe(catchError(() => of(empty)))
        : of(empty),
      renewal: enabledTypes.includes('license-renewal')
        ? this.http.get<DashboardCount>(buildUrl(`${this.endpoints.renewal}/dashboard-counts/`)).pipe(catchError(() => of(empty)))
        : of(empty),
      salesman: enabledTypes.includes('salesman-barman')
        ? this.http.get<DashboardCount>(buildUrl(`${this.endpoints.salesman}/dashboard-counts/`)).pipe(catchError(() => of(empty)))
        : of(empty),
      company: enabledTypes.includes('company-registration')
        ? this.http.get<DashboardCount>(buildUrl(`${this.endpoints.company}/dashboard-counts/`)).pipe(catchError(() => of(empty)))
        : of(empty)
    }).pipe(
      map((res) => {
        const total = {
          applied: (res.newLicense.applied || 0) + (res.renewal.applied || 0) + (res.salesman.applied || 0) + (res.company.applied || 0),
          pending: (res.newLicense.pending || 0) + (res.renewal.pending || 0) + (res.salesman.pending || 0) + (res.company.pending || 0),
          objection: (res.newLicense.objection || 0) + (res.renewal.objection || 0) + (res.salesman.objection || 0) + (res.company.objection || 0),
          approved: (res.newLicense.approved || 0) + (res.renewal.approved || 0) + (res.salesman.approved || 0) + (res.company.approved || 0),
          rejected: (res.newLicense.rejected || 0) + (res.renewal.rejected || 0) + (res.salesman.rejected || 0) + (res.company.rejected || 0),
          awaitingPayment: (res.newLicense.awaitingPayment || (res.newLicense as any).awaiting_payment || 0) +
                           (res.renewal.awaitingPayment || (res.renewal as any).awaiting_payment || 0) +
                           (res.salesman.awaitingPayment || (res.salesman as any).awaiting_payment || 0) +
                           (res.company.awaitingPayment || (res.company as any).awaiting_payment || 0)
        } as DashboardCount;
        return {
          total,
          newLicense: res.newLicense,
          renewal: res.renewal,
          salesman: res.salesman,
          company: res.company
        };
      })
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));

    return this.detailedCountsCache$;
  }

  // Get applications from all 4 types (added company)
  getUnifiedApplicationsByStatus(forceRefresh = false, config?: DashboardConfig): Observable<{
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    objection: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
    awaitingPayment?: UnifiedApplication[];
  }> {
    const enabledTypes = Array.from(new Set([...this.inferEnabledTypesFromConfig(config), 'license-renewal', 'company-registration']));
    const cacheKey = enabledTypes.slice().sort().join('|');

    if (!forceRefresh && this.unifiedAppsCache$ && this.unifiedAppsCacheKey === cacheKey) {
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

    const requests: Array<Observable<any>> = [];
    const types: UnifiedApplication['type'][] = [];

    const push = (type: UnifiedApplication['type'], req$: Observable<any>) => {
      types.push(type);
      requests.push(req$);
    };

    const getUrl = (url: string) => forceRefresh ? `${url}?cb=${Date.now()}` : url;

    if (enabledTypes.includes('license-renewal')) {
      push(
        'license-renewal',
        this.http.get<any>(getUrl(`${this.endpoints.renewal}/list-by-status/`)).pipe(
          catchError((err) => {
            console.error('Renewal error:', err);
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        )
      );
    }

    if (enabledTypes.includes('new-license')) {
      push(
        'new-license',
        this.http.get<any>(getUrl(`${this.endpoints.new}/list-by-status/`)).pipe(
          catchError((err) => {
            console.error('New License error:', err);
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        )
      );
    }

    if (enabledTypes.includes('salesman-barman')) {
      push(
        'salesman-barman',
        this.http.get<any>(getUrl(`${this.endpoints.salesman}/list-by-status/`)).pipe(
          catchError((err) => {
            console.error('Salesman error:', err);
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        )
      );
    }

    if (enabledTypes.includes('company-registration')) {
      push(
        'company-registration',
        this.http.get<any>(getUrl(`${this.endpoints.company}/list-by-status/`)).pipe(
          catchError((err) => {
            console.error('Company registration error:', err);
            return of({ applied: [], pending: [], approved: [], rejected: [] });
          })
        )
      );
    }

    this.unifiedAppsCacheKey = cacheKey;

    this.unifiedAppsCache$ = forkJoin(requests).pipe(
      map((responses) => {
        const getResponse = (t: UnifiedApplication['type']): any => {
          const idx = types.indexOf(t);
          return idx >= 0 ? responses[idx] : { applied: [], pending: [], approved: [], rejected: [] };
        };

        const renewal = getResponse('license-renewal');
        const newLic = getResponse('new-license');
        const salesman = getResponse('salesman-barman');
        const company = getResponse('company-registration');

        const normalize = (data: any, type: UnifiedApplication['type']) => {
          if (!data) {
            return { applied: [], pending: [], objection: [], approved: [], rejected: [], awaitingPayment: [] };
          }

          const hasStatusStructure = (
            data.hasOwnProperty('applied') ||
            data.hasOwnProperty('pending') ||
            data.hasOwnProperty('objection') ||
            data.hasOwnProperty('approved') ||
            data.hasOwnProperty('rejected') ||
            data.hasOwnProperty('awaitingPayment') ||
            data.hasOwnProperty('awaiting_payment')
          );

          if (!hasStatusStructure) {
            console.error(`${type}: Missing status structure`);
            return { applied: [], pending: [], objection: [], approved: [], rejected: [], awaitingPayment: [] };
          }

          const extractArray = (statusData: any, statusName: string): UnifiedApplication[] => {
            if (!Array.isArray(statusData)) return [];
            
            return statusData.map((app: any) => {
              const applicationId = 
                app.application_id ||
                app.applicationId ||
                app.id ||
                '';

              let currentStage = this.toStageToken(app);
              const currentStageId = app.current_stage_id || app.currentStageId || null;

              const unifiedApp: UnifiedApplication = {
                type,
                applicationId: String(applicationId),
                currentStage: String(currentStage || ''),
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

          const extractAwaitingPayment = (): UnifiedApplication[] => {
            const awaiting = data.awaitingPayment ?? data.awaiting_payment ?? [];
            if (!Array.isArray(awaiting)) return [];
            return extractArray(awaiting, 'awaiting-payment');
          };

          return {
            applied: extractArray(data.applied, 'applied'),
            pending: extractArray(data.pending, 'pending'),
            objection: extractArray((data as any).objection, 'objection'),
            approved: extractArray(data.approved, 'approved'),
            rejected: extractArray(data.rejected, 'rejected'),
            awaitingPayment: extractAwaitingPayment()
          };
        };

        const normalizedRenewal = normalize(renewal, 'license-renewal');
        const normalizedNewLic = normalize(newLic, 'new-license');
        const normalizedSalesman = normalize(salesman, 'salesman-barman');
        const normalizedCompany = normalize(company, 'company-registration');

        let allApplied = [...normalizedRenewal.applied, ...normalizedNewLic.applied, ...normalizedSalesman.applied, ...normalizedCompany.applied];
        let allPending = [...normalizedRenewal.pending, ...normalizedNewLic.pending, ...normalizedSalesman.pending, ...normalizedCompany.pending];
        const allObjection = [...normalizedRenewal.objection, ...normalizedNewLic.objection, ...normalizedSalesman.objection, ...normalizedCompany.objection];
        let allApproved = [...normalizedRenewal.approved, ...normalizedNewLic.approved, ...normalizedSalesman.approved, ...normalizedCompany.approved];
        const allRejected = [...normalizedRenewal.rejected, ...normalizedNewLic.rejected, ...normalizedSalesman.rejected, ...normalizedCompany.rejected];

        const awaitingPaymentApps: UnifiedApplication[] = [];
        
        const isAwaitingPayment = (app: UnifiedApplication): boolean => {
          const stage = String(app.currentStage || '').toLowerCase();
          const stageId = app.raw?.current_stage_id || app.raw?.currentStageId;
          const isAwaitingByName = stage === 'awaiting_payment' || stage.includes('awaiting') || stage === 'awaiting payment';
          const isAwaitingById = 
            stageId === 23 || stageId === 31 || stageId === 109 || stageId === 119 || stageId === 122 || 
            Number(stageId) === 23 || Number(stageId) === 31 || Number(stageId) === 109 || Number(stageId) === 119 || Number(stageId) === 122;
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

        const directAwaiting = [
          ...normalizedRenewal.awaitingPayment,
          ...normalizedNewLic.awaitingPayment,
          ...normalizedSalesman.awaitingPayment,
          ...normalizedCompany.awaitingPayment
        ];
        awaitingPaymentApps.push(...directAwaiting);

        return {
          applied: uniqueByKey(stillApplied),
          pending: uniqueByKey(stillPending),
          objection: uniqueByKey(allObjection),
          approved: uniqueByKey(stillApproved),
          rejected: uniqueByKey(allRejected),
          awaitingPayment: uniqueByKey(awaitingPaymentApps),
        };
      }),
      shareReplay({ bufferSize: 1, refCount: false })
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
      'company-registration': this.endpoints.company,
      'label-registration': this.endpoints.label
    };

    const inferred = this.inferAppTypeFromId(applicationId);
    const resolvedType = inferred || type;
    const encodedId = encodeURIComponent(applicationId);
    const url = `${mapping[resolvedType]}/detail/${encodedId}/`;
    return this.http.get<any>(url);
  }

  getObjections(applicationId: string): Observable<Objection[]> {
    const encodedId = encodeURIComponent(String(applicationId || '').trim());
    return this.http.get<Objection[]>(`${this.workflowUrl}${encodedId}/objections/`);
  }

  resolveObjections(applicationId: string, type: UnifiedApplication['type'], formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(String(applicationId || '').trim());
    void type;

    // Some backends/proxies return non-JSON (HTML/empty) on auth/CSRF issues which breaks JSON parsing.
    // Post as text and parse leniently to keep the UI error handling meaningful.
    return this.http.post(`${this.workflowUrl}${encodedId}/resolve-objections/`, formData, {
      responseType: 'text',
      headers: new HttpHeaders({ Accept: 'application/json' })
    }).pipe(
      map((text: any) => {
        const raw = String(text ?? '').trim();
        if (!raw) return {};
        if (raw.startsWith('<')) return { _raw: raw };
        try { return JSON.parse(raw); } catch { return { _raw: raw }; }
      })
    );
  }

  payLicenseFee(applicationId: string): Observable<any> {
    return this.http.post<any>(`${this.workflowUrl}${applicationId}/pay-license-fee/`, {});
  }
}
