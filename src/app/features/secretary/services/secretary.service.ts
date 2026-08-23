import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface BrandStock {
  brand_name: string;
  liquor_type: string;
  pack_size_ml: number;
  bottles_per_case: number;
  cases_stock: number;
  total_bottles: number;
  total_bl: number;
  edp_code: string;
  alcohol_strength: string;
  mrp_per_bottle: number;
  status: string;
}

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
  brand_stocks?: BrandStock[];
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

export interface DryDayPermitItem {
  application_id: string;
  applicant_name: string;
  excise_district: string;
  reason_remarks: string;
  duration_days: string;
  dates_requested: string;
  financial_year: string;
  status: string;
  is_approved: boolean;
  is_fee_paid: boolean;
  created_at: string;
}

export interface SalesmanBarmanItem {
  application_id: string;
  applicant_name: string;
  role: string;
  establishment_name: string;
  excise_district: string;
  mobile_number: string;
  email: string;
  gender: string;
  dob: string;
  aadhaar: string;
  pan: string;
  status: string;
  is_approved: boolean;
  current_stage: string;
  created_at: string;
  documents?: {
    passPhoto?: boolean;
    aadhaarCard?: boolean;
    residentialCertificate?: boolean;
    dateofBirthProof?: boolean;
  };
}

export interface CompanyRegistrationItem {
  application_id: string;
  company_name: string;
  brand_type: string;
  factory_address: string;
  country: string;
  state: string;
  company_phone: string;
  company_email: string;
  key_member: string;
  designation: string;
  member_phone: string;
  status: string;
  is_approved: boolean;
  payment_amount: number;
  created_at: string;
}

export interface CompanyCollaborationItem {
  application_id: string;
  brand_owner_name: string;
  brand_owner_code: string;
  brand_owner_pan: string;
  licensee_name: string;
  license_number: string;
  factory_address: string;
  brands_collaborated: string;
  status: string;
  is_approved: boolean;
  financial_year: string;
  created_at: string;
}

export interface ImflRequisitionItem {
  reference_no: string;
  supplier_name: string;
  logistics_partner: string;
  origin: string;
  destination: string;
  status: string;
  submitted_at: string;
  valid_up_to: string;
}

export interface SecretaryLicensesOverview {
  summary_kpis: {
    dry_day_permits_count: number;
    salesman_barman_count: number;
    company_registrations_count: number;
    company_collaborations_count: number;
    imfl_requisitions_count?: number;
    total_licenses_count: number;
  };
  dry_day_permits: DryDayPermitItem[];
  salesman_barman_applications: SalesmanBarmanItem[];
  company_registrations: CompanyRegistrationItem[];
  company_collaborations: CompanyCollaborationItem[];
  imfl_requisitions?: ImflRequisitionItem[];
}

export interface ImflRequisitionDetailItem {
  reference_no: string;
  distillery_name: string;
  lifted_from: string;
  purpose_name: string;
  route: string;
  spirit_type: string;
  strength: string;
  total_bl: number;
  permits_count: number;
  status: string;
  submitted_at: string;
  valid_up_to: string;
  referenceNo?: string;
  distilleryName?: string;
  liftedFrom?: string;
  purposeName?: string;
  spiritType?: string;
  totalBl?: number;
  permitsCount?: number;
  submittedAt?: string;
  validUpTo?: string;
  our_ref_no?: string;
  ourRefNo?: string;
  distributor_name?: string;
  distributorName?: string;
  distributor_username?: string;
  distributorUsername?: string;
  supplier_name?: string;
  supplierName?: string;
  origin?: string;
  destination?: string;
  totalbl?: number;
  requisiton_number_of_permits?: number;
  created_at?: string;
  createdAt?: string;
}

export interface ImflRevalidationDetailItem {
  reference_no: string;
  distillery_name: string;
  spirit_type: string;
  total_bl: number;
  revalidation_date: string;
  revalidation_fee: number;
  branch_name: string;
  status: string;
  reason: string;
  submitted_at: string;
  referenceNo?: string;
  distilleryName?: string;
  distributor_name?: string;
  distributorName?: string;
  distributor_username?: string;
  distributorUsername?: string;
  spiritType?: string;
  totalBl?: number;
  revalidationDate?: string;
  revalidationFee?: number;
  branchName?: string;
  submittedAt?: string;
  valid_up_to?: string;
  validUpTo?: string;
  our_ref_no?: string;
  ourRefNo?: string;
  establishment_name?: string;
  establishmentName?: string;
  revalidation_br_amount?: number;
  revalidationBrAmount?: number;
  created_at?: string;
  createdAt?: string;
}

export interface ImflCancellationDetailItem {
  reference_no: string;
  requisition_ref: string;
  distillery_name: string;
  distributor_name?: string;
  distributorName?: string;
  distributor_username?: string;
  distributorUsername?: string;
  spirit_type: string;
  cancelled_bl: number;
  cancellation_fee: number;
  cancelled_permit_no: string;
  status: string;
  reason: string;
  submitted_at: string;
  referenceNo?: string;
  requisitionRef?: string;
  distilleryName?: string;
  spiritType?: string;
  cancelledBl?: number;
  cancellationFee?: number;
  cancelledPermitNo?: string;
  submittedAt?: string;
  valid_up_to?: string;
  validUpTo?: string;
  our_ref_no?: string;
  ourRefNo?: string;
  requisition_ref_no?: string;
  requisitionRefNo?: string;
  establishment_name?: string;
  establishmentName?: string;
  cancelled_permit_number?: string;
  cancelledPermitNumber?: string;
  total_cancellation_amount?: number;
  totalCancellationAmount?: number;
  total_bl?: number;
  totalBl?: number;
  created_at?: string;
  createdAt?: string;
}

export interface SecretaryImflOverview {
  summary_kpis: {
    requisitions_count: number;
    revalidations_count: number;
    cancellations_count: number;
    total_imfl_records: number;
  };
  requisitions: ImflRequisitionDetailItem[];
  revalidations: ImflRevalidationDetailItem[];
  cancellations: ImflCancellationDetailItem[];
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

  getLicensesOverview(): Observable<SecretaryLicensesOverview> {
    return this.http.get<SecretaryLicensesOverview>(`${environment.apiBaseUrl}/api/secretary/licenses/`);
  }

  getImflOverview(): Observable<SecretaryImflOverview> {
    return this.http.get<SecretaryImflOverview>(`${environment.apiBaseUrl}/api/secretary/imfl/`);
  }

  getRevenueOverview(): Observable<SecretaryRevenueOverview> {
    return this.http.get<SecretaryRevenueOverview>(`${environment.apiBaseUrl}/api/secretary/revenue/`);
  }
}

export interface SecretaryRevenueHeadItem {
  head_name: string;
  headName?: string;
  total_credit: number;
  totalCredit?: number;
  total_debit: number;
  totalDebit?: number;
  current_balance: number;
  currentBalance?: number;
  accounts_count: number;
  accountsCount?: number;
}

export interface SecretaryTopContributorItem {
  rank?: number;
  tier_badge?: string;
  tierBadge?: string;
  user_id: string;
  userId?: string;
  licensee_name: string;
  licenseeName?: string;
  manufacturing_unit: string;
  manufacturingUnit?: string;
  category: string;
  sub_category: string;
  subCategory?: string;
  total_revenue_contributed: number;
  totalRevenueContributed?: number;
  total_fd_amount: number;
  totalFdAmount?: number;
  current_balance: number;
  currentBalance?: number;
  wallets_count: number;
  walletsCount?: number;
}

export interface SecretarySecurityDepositItem {
  licensee_id: string;
  licenseeId?: string;
  user_id: string;
  userId?: string;
  licensee_name: string;
  licenseeName?: string;
  manufacturing_unit: string;
  manufacturingUnit?: string;
  category: string;
  sub_category: string;
  subCategory?: string;
  fd_credit_amount: number;
  fdCreditAmount?: number;
  fd_current_balance: number;
  fdCurrentBalance?: number;
  status: string;
  updated_at: string;
  updatedAt?: string;
}

export interface SecretaryRevenueOverview {
  summary_kpis: {
    total_revenue_collected: number;
    totalRevenueCollected?: number;
    total_active_balance: number;
    totalActiveBalance?: number;
    total_security_deposit_fd: number;
    totalSecurityDepositFd?: number;
    top_contributors_count: number;
    topContributorsCount?: number;
  };
  revenue_heads: SecretaryRevenueHeadItem[];
  top_contributors: SecretaryTopContributorItem[];
  security_deposits: SecretarySecurityDepositItem[];
}
