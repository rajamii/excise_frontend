import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, finalize, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface BrandStock {
  brand_name?: string;
  liquor_type?: string;
  pack_size_ml?: number;
  bottles_per_case?: number;
  cases_stock?: number;
  total_bottles?: number;
  total_bl?: number;
  edp_code?: string;
  alcohol_strength?: string;
  mrp_per_bottle?: number;
  status?: string;
}

export interface ManufacturingFactory {
  id?: string;
  establishment_name?: string;
  applicant_name?: string;
  company_name?: string;
  license_number?: string;
  category?: string;
  sub_category?: string;
  district?: string;
  business_address?: string;
  mobile_number?: string;
  email?: string;
  status?: string;
  is_approved?: boolean;
  stock_bl?: number;
  total_requisitions_count?: number;
  total_bl_requested?: number;
  pending_requisitions_count?: number;
  approved_requisitions_count?: number;
  active_transit_permits_count?: number;
  dispatched_bl?: number;
  brand_stocks?: Array<BrandStock>;
}

export interface SecretaryBulkSpiritSummary {
  total_units?: number;
  distilleries_count?: number;
  breweries_count?: number;
  total_stock_bl?: number;
  total_requested_bl?: number;
  total_dispatched_bl?: number;
  total_requisitions?: number;
}

export interface DryDayPermitItem {
  application_id?: string;
  applicant_name?: string;
  excise_district?: string;
  reason_remarks?: string;
  duration_days?: string;
  dates_requested?: string;
  status?: string;
  submitted_at?: string;
  submittedAt?: string;
  created_at?: string;
  financial_year?: string;
  is_approved?: boolean;
  is_fee_paid?: boolean;
}

export interface CommercialCancellationItem {
  reference_no?: string;
  referenceNo?: string;
  our_ref_no?: string;
  ourRefNo?: string;
  requisition_ref?: string;
  requisitionRef?: string;
  requisitionRefNo?: string;
  requisition_ref_no?: string;
  distributor_name?: string;
  distributorName?: string;
  distributor_username?: string;
  distributorUsername?: string;
  distillery_name?: string;
  distilleryName?: string;
  establishment_name?: string;
  establishmentName?: string;
  spirit_type?: string;
  spiritType?: string;
  cancelled_bl?: number;
  cancelledBl?: number;
  total_bl?: number;
  totalBl?: number;
  cancellation_fee?: number;
  cancellationFee?: number;
  totalCancellationAmount?: number;
  total_cancellation_amount?: number;
  cancelled_permit_no?: string;
  cancelledPermitNo?: string;
  cancelled_permit_number?: string;
  cancelledPermitNumber?: string;
  status?: string;
  reason?: string;
  submitted_at?: string;
  submittedAt?: string;
  created_at?: string;
  createdAt?: string;
}

export type ImflCancellationDetailItem = CommercialCancellationItem;

export interface LicenseCancellationItem {
  cancellation_id?: string;
  licensee_name?: string;
  license_number?: string;
  cancellation_reason?: string;
  cancellation_type?: string;
  effective_date?: string;
  status?: string;
  submitted_at?: string;
  submittedAt?: string;
}

export interface BarmanRegistrationItem {
  registration_id?: string;
  application_id?: string;
  applicant_name?: string;
  role?: string;
  role_type?: string;
  establishment_name?: string;
  license_number?: string;
  police_verification_status?: string;
  excise_district?: string;
  mobile_number?: string;
  email?: string;
  gender?: string;
  dob?: string;
  aadhaar?: string;
  pan?: string;
  current_stage?: string;
  documents?: any;
  status?: string;
  submitted_at?: string;
  submittedAt?: string;
  created_at?: string;
  is_approved?: boolean;
}

export type SalesmanBarmanItem = BarmanRegistrationItem;

export interface LabelRegistrationItem {
  label_id?: string;
  brand_name?: string;
  category?: string;
  applicant_name?: string;
  mrp?: number;
  validity_period?: string;
  status?: string;
  submitted_at?: string;
  submittedAt?: string;
}

export interface CompanyRegistrationItem {
  company_id?: string;
  application_id?: string;
  company_name?: string;
  company_phone?: string;
  company_email?: string;
  applicant_name?: string;
  category?: string;
  brand_type?: string;
  key_member?: string;
  member_phone?: string;
  designation?: string;
  registration_number?: string;
  factory_address?: string;
  country?: string;
  state?: string;
  payment_amount?: number;
  status?: string;
  submitted_at?: string;
  submittedAt?: string;
  created_at?: string;
  is_approved?: boolean;
}

export interface CompanyCollaborationItem {
  collaboration_id?: string;
  application_id?: string;
  distillery_name?: string;
  brand_owner_name?: string;
  brand_owner_code?: string;
  brand_owner_pan?: string;
  licensee_name?: string;
  license_number?: string;
  factory_address?: string;
  brands_collaborated?: string;
  partner_company?: string;
  collaboration_type?: string;
  financial_year?: string;
  status?: string;
  submitted_at?: string;
  submittedAt?: string;
  created_at?: string;
  is_approved?: boolean;
}

export interface NewLicenseApplicationItem {
  application_id?: string;
  license_no?: string;
  applicant_name?: string;
  establishment_name?: string;
  company_name?: string;
  category?: string;
  sub_category?: string;
  excise_district?: string;
  mobile_number?: string;
  email?: string;
  financial_year?: string;
  is_approved?: boolean;
  is_fee_paid?: boolean;
  fee_amount?: number;
  expiry_date?: string;
  status?: string;
  current_stage?: string;
  created_at?: string;
}

export interface LicenseRenewalAppItem {
  application_id?: string;
  old_license_no?: string;
  new_license_no?: string;
  license_no?: string;
  applicant_name?: string;
  establishment_name?: string;
  category?: string;
  sub_category?: string;
  excise_district?: string;
  mobile_number?: string;
  email?: string;
  financial_year?: string;
  is_approved?: boolean;
  is_fee_paid?: boolean;
  fee_amount?: number;
  expiry_date?: string;
  status?: string;
  current_stage?: string;
  created_at?: string;
}

export interface SpecialPermitItem {
  permit_id?: string;
  applicant_name?: string;
  event_name?: string;
  venue_address?: string;
  event_date?: string;
  permit_fee?: number;
  status?: string;
  submitted_at?: string;
  submittedAt?: string;
}

export interface SecretaryLicensesOverview {
  summary_kpis: {
    total_active_licenses?: number;
    pending_license_applications?: number;
    pending_dry_day_permits?: number;
    pending_cancellations?: number;
    barman_registrations_pending?: number;
    label_registrations_pending?: number;
    special_permits_pending?: number;
    dry_day_permits_count?: number;
    salesman_barman_count?: number;
    company_registrations_count?: number;
    company_collaborations_count?: number;
    new_license_apps_count?: number;
    license_renewals_count?: number;
    total_licenses_count?: number;
  };
  dry_day_permits?: Array<DryDayPermitItem>;
  commercial_cancellations?: Array<CommercialCancellationItem>;
  license_cancellations?: Array<LicenseCancellationItem>;
  barman_registrations?: Array<BarmanRegistrationItem>;
  salesman_barman_applications?: Array<BarmanRegistrationItem>;
  label_registrations?: Array<LabelRegistrationItem>;
  company_registrations?: Array<CompanyRegistrationItem>;
  company_collaborations?: Array<CompanyCollaborationItem>;
  new_license_applications?: Array<NewLicenseApplicationItem>;
  license_renewals?: Array<LicenseRenewalAppItem>;
  special_permits?: Array<SpecialPermitItem>;
}

export interface ImflRequisitionItem {
  reference_no?: string;
  referenceNo?: string;
  our_ref_no?: string;
  ourRefNo?: string;
  distributor_name?: string;
  distributorName?: string;
  distributor_username?: string;
  distributorUsername?: string;
  distillery_name?: string;
  distilleryName?: string;
  spirit_type?: string;
  spiritType?: string;
  purpose_name?: string;
  purposeName?: string;
  origin?: string;
  destination?: string;
  lifted_from?: string;
  liftedFrom?: string;
  supplier_name?: string;
  supplierName?: string;
  route?: string;
  strength?: string;
  requested_cases?: number;
  total_bl?: number;
  totalBl?: number;
  totalbl?: number;
  permits_count?: number;
  permitsCount?: number;
  requisiton_number_of_permits?: number;
  valid_up_to?: string;
  validUpTo?: string;
  status?: string;
  submitted_at?: string;
  submittedAt?: string;
  created_at?: string;
  createdAt?: string;
}

export type ImflRequisitionDetailItem = ImflRequisitionItem;
export type ImflRevalidationDetailItem = any;

export interface ImflTransitPermitItem {
  permit_no?: string;
  requisition_ref?: string;
  distributor_name?: string;
  distillery_name?: string;
  vehicle_no?: string;
  dispatch_date?: string;
  valid_till?: string;
  status?: string;
}

export interface ImflBrandStockItem {
  brand_name?: string;
  category?: string;
  pack_size?: string;
  cases_available?: number;
  bottles_available?: number;
  mrp_per_case?: number;
}

export interface ImflDistributorAccountItem {
  user_id?: string;
  distributor_name?: string;
  contact_person?: string;
  district?: string;
  active_wallet_balance?: number;
  total_requisitions_count?: number;
  status?: string;
}

export interface SecretaryImflOverview {
  summary_kpis?: {
    total_distributors_count?: number;
    total_active_stock_cases?: number;
    total_pending_requisitions?: number;
    total_transit_permits_active?: number;
    total_revenue_collected?: number;
    requisitions_count?: number;
    revalidations_count?: number;
    cancellations_count?: number;
    total_imfl_records?: number;
  };
  requisitions?: Array<ImflRequisitionItem>;
  revalidations?: Array<any>;
  transit_permits?: Array<ImflTransitPermitItem>;
  cancellations?: Array<CommercialCancellationItem>;
  brand_stocks?: Array<ImflBrandStockItem>;
  distributor_accounts?: Array<ImflDistributorAccountItem>;
}

@Injectable({
  providedIn: 'root'
})
export class SecretaryService {
  private baseUrl = `${environment.apiBaseUrl}/api/secretary/bulk-spirit`;
  private readonly cacheTtlMs = 5 * 60_000;
  private responseCache = new Map<string, { value: unknown; fetchedAt: number }>();
  private inflightRequests = new Map<string, Observable<unknown>>();

  constructor(private http: HttpClient) {}

  private getCachedOrFetch<T>(key: string, requestFactory: () => Observable<T>): Observable<T> {
    const cachedEntry = this.responseCache.get(key);
    const now = Date.now();
    if (cachedEntry && now - cachedEntry.fetchedAt < this.cacheTtlMs) {
      return new Observable<T>((subscriber) => {
        subscriber.next(cachedEntry.value as T);
        subscriber.complete();
      });
    }

    const inflightRequest = this.inflightRequests.get(key);
    if (inflightRequest) return inflightRequest as Observable<T>;

    const request$ = requestFactory().pipe(
      tap((value) => this.responseCache.set(key, { value, fetchedAt: Date.now() })),
      finalize(() => this.inflightRequests.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.inflightRequests.set(key, request$ as Observable<unknown>);
    return request$;
  }

  public invalidateCache(...keys: string[]): void {
    for (const key of keys) {
      this.responseCache.delete(key);
      this.inflightRequests.delete(key);
    }
  }

  public invalidateCacheByPrefix(prefix: string): void {
    for (const key of Array.from(this.responseCache.keys())) {
      if (key.startsWith(prefix)) {
        this.responseCache.delete(key);
        this.inflightRequests.delete(key);
      }
    }
  }

  getManufacturingFactories(subCategory?: string, search?: string): Observable<{ count: number; factories: Array<ManufacturingFactory> }> {
    let params = new HttpParams();
    if (subCategory && subCategory !== 'all') {
      params = params.set('sub_category', subCategory);
    }
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    const cacheKey = `secretary:factories:${subCategory || 'all'}:${(search || '').trim()}`;
    return this.getCachedOrFetch(cacheKey, () =>
      this.http.get<{ count: number; factories: Array<ManufacturingFactory> }>(`${this.baseUrl}/factories/`, { params })
    );
  }

  getBulkSpiritFactories(subCategory?: string, search?: string): Observable<{ count: number; factories: Array<ManufacturingFactory> }> {
    return this.getManufacturingFactories(subCategory, search);
  }

  getBulkSpiritSummary(): Observable<SecretaryBulkSpiritSummary> {
    return this.getCachedOrFetch('secretary:summary', () =>
      this.http.get<SecretaryBulkSpiritSummary>(`${this.baseUrl}/summary/`)
    );
  }

  getLicensesOverview(): Observable<SecretaryLicensesOverview> {
    return this.http.get<SecretaryLicensesOverview>(`${environment.apiBaseUrl}/api/secretary/licenses/?_t=${Date.now()}`);
  }

  getImflOverview(): Observable<SecretaryImflOverview> {
    return this.getCachedOrFetch('secretary:imfl-overview', () =>
      this.http.get<SecretaryImflOverview>(`${environment.apiBaseUrl}/api/secretary/imfl/`)
    );
  }

  getRevenueOverview(): Observable<SecretaryRevenueOverview> {
    return this.getCachedOrFetch('secretary:revenue-overview', () =>
      this.http.get<SecretaryRevenueOverview>(`${environment.apiBaseUrl}/api/secretary/revenue/`)
    );
  }

  getTimelineOverview(): Observable<SecretaryTimelineOverview> {
    return this.getCachedOrFetch('secretary:timeline-overview', () =>
      this.http.get<SecretaryTimelineOverview>(`${environment.apiBaseUrl}/api/secretary/timeline/`)
    );
  }
}

export interface SecretaryRevenueHeadItem {
  head_name?: string;
  headName?: string;
  head_of_account?: string;
  headOfAccount?: string;
  total_credit?: number;
  totalCredit?: number;
  total_debit?: number;
  totalDebit?: number;
  current_balance?: number;
  currentBalance?: number;
  total_paid_to_excise?: number;
  accounts_count?: number;
  accountsCount?: number;
}

export interface SecretaryTopContributorItem {
  rank?: number;
  tier_badge?: string;
  tierBadge?: string;
  user_id?: string;
  userId?: string;
  licensee_name?: string;
  licenseeName?: string;
  manufacturing_unit?: string;
  manufacturingUnit?: string;
  category?: string;
  sub_category?: string;
  subCategory?: string;
  total_revenue_contributed?: number;
  totalRevenueContributed?: number;
  total_fd_amount?: number;
  totalFdAmount?: number;
  current_balance?: number;
  currentBalance?: number;
  wallets_count?: number;
  walletsCount?: number;
  updated_at?: string;
  month?: string;
  financial_year?: string;
}

export interface SecretarySecurityDepositItem {
  licensee_id?: string;
  licenseeId?: string;
  user_id?: string;
  userId?: string;
  licensee_name?: string;
  licenseeName?: string;
  manufacturing_unit?: string;
  manufacturingUnit?: string;
  category?: string;
  sub_category?: string;
  subCategory?: string;
  fd_credit_amount?: number;
  fdCreditAmount?: number;
  fd_current_balance?: number;
  fdCurrentBalance?: number;
  status?: string;
  updated_at?: string;
  updatedAt?: string;
  month?: string;
  financial_year?: string;
}

export interface SecretaryRevenueOverview {
  summary_kpis: {
    total_revenue_collected?: number;
    totalRevenueCollected?: number;
    net_excise_revenue_collected?: number;
    netExciseRevenueCollected?: number;
    total_active_balance?: number;
    totalActiveBalance?: number;
    total_security_deposit_fd?: number;
    totalSecurityDepositFd?: number;
    top_contributors_count?: number;
    topContributorsCount?: number;
  };
  revenue_heads?: Array<SecretaryRevenueHeadItem>;
  top_contributors?: Array<SecretaryTopContributorItem>;
  security_deposits?: Array<SecretarySecurityDepositItem>;
}

export interface SecretaryTimelineStep {
  step_no?: number;
  icon?: string;
  status_class?: string;
  badge_class?: string;
  event_title?: string;
  event_date?: string;
  event_description?: string;
  user_details?: string;
  forwarded_info?: string;
  objection_info?: {
    field_name?: string;
    remarks?: string;
    raised_by?: string;
    raised_on?: string;
    is_resolved?: boolean;
    resolved_by?: string;
  };
  payment_breakdown?: {
    license_fee?: {
      amount?: number;
      paid_at?: string;
      status?: string;
    };
    security_deposit?: {
      amount?: number;
      paid_at?: string;
      status?: string;
    };
  };
  time_taken?: string;
  status_text?: string;
}

export interface SecretaryTimelineItem {
  application_id: string;
  license_no?: string;
  applicant_name: string;
  mobile_no: string;
  establishment_name: string;
  license_type: string;
  category: string;
  current_status: string;
  status_code: string;
  days_elapsed: string;
  approval_status: string;
  approved_by: string;
  approval_date: string;
  time_taken: string;
  current_stage: string;
  pending_officer_name: string;
  steps: Array<SecretaryTimelineStep>;
}

export interface SecretaryPendingQueueItem {
  application_id: string;
  applicant_name: string;
  mobile_no: string;
  establishment_name: string;
  license_type: string;
  category: string;
  current_stage: string;
  pending_officer_name: string;
  days_elapsed: string;
  sla_status: string;
  submission_date: string;
}

export interface SecretaryTimelineOverview {
  summary_kpis: {
    total_applications?: number;
    pending_applications?: number;
    approved_applications?: number;
    rejected_applications?: number;
    avg_processing_days?: string;
  };
  timeline_records?: Array<SecretaryTimelineItem>;
  pending_queue?: Array<SecretaryPendingQueueItem>;
}
