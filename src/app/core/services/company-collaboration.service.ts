import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CompanyCollaborationBrand,
  CompanyCollaborationBrandOwner,
  CompanyCollaborationFeeStructure
} from '../models/company-collaboration.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unwrapArray<T>(response: any, context: string): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === 'object') {
    const candidateKeys = ['data', 'results', 'items', 'brands', 'brand_owners', 'companies'];
    for (const key of candidateKeys) {
      if (Array.isArray(response[key])) return response[key] as T[];
    }
    const firstArrayKey = Object.keys(response).find((k) => Array.isArray(response[k]));
    if (firstArrayKey) {
      console.warn(`[CompanyCollaborationService] ${context}: unwrapped from key "${firstArrayKey}"`);
      return response[firstArrayKey] as T[];
    }
  }
  console.error(`[CompanyCollaborationService] ${context}: unexpected shape:`, response);
  return [];
}

/**
 * Maps a master_brand_owner row (after camelCase conversion by DRF middleware) to
 * the CompanyCollaborationBrandOwner interface.
 *
 * Master serializer fields (camelCase after middleware):
 *   brandOwnerCode, brandOwnerName, brandOwnerTypeDesc, brandOwnerMobileNo,
 *   brandOwnerCompanyAddress, brandOwnerAddress, brandOwnerPan, brandOwnerEmail,
 *   enableStatus, liquorBownerCode
 */
function normalizeBrandOwner(raw: any): CompanyCollaborationBrandOwner {
  return {
    id:              raw.brandOwnerCode   ?? raw.brand_owner_code   ?? '',
    brand_owner_code: raw.brandOwnerCode  ?? raw.brand_owner_code   ?? '',
    company_name:    raw.brandOwnerName   ?? raw.brand_owner_name   ?? '',
    company_address: raw.brandOwnerCompanyAddress ?? raw.brand_owner_company_address ?? '',
    office_address:  raw.brandOwnerCompanyAddress ?? raw.brand_owner_company_address ?? '',
    factory_address: raw.brandOwnerAddress        ?? raw.brand_owner_address         ?? '',
    pan_no:          raw.brandOwnerPan    ?? raw.brand_owner_pan    ?? '',
    mobile:          raw.brandOwnerMobileNo ?? raw.brand_owner_mobile_no ?? '',
    email:           raw.brandOwnerEmail  ?? raw.brand_owner_email  ?? '',
    owner_type:      raw.brandOwnerTypeDesc ?? raw.brand_owner_type_desc ?? '',
    brand_owner_licensee_id_no: raw.brandOwnerLicenseeIdNo ?? raw.brand_owner_licensee_id_no ?? '',
    brand_owner_origin: raw.brandOwnerOrigin ?? raw.brand_owner_origin ?? '',
    location:        '',
    status:          raw.enableStatus === 'E' || raw.enable_status === 'E' ? 'Active' : 'Inactive',
    brand_count:     0,
    members:         []
  };
}

/**
 * Maps a master_liquor_brand row (after camelCase conversion) to
 * the CompanyCollaborationBrand interface.
 *
 * Master serializer fields (camelCase after middleware):
 *   liquorBrandCode, liquorBrandDesc, liquorCatDesc, liquorKindDesc,
 *   liquorKindAbbr (via LiquorKindSerializer), liquorTypeDesc, deleteStatus
 */
function normalizeBrand(raw: any): CompanyCollaborationBrand {
  return {
    id:               raw.id               ?? raw.liquorBrandCode  ?? raw.liquor_brand_code  ?? '',
    brand_code:       raw.liquorBrandCode  ?? raw.liquor_brand_code  ?? String(raw.id ?? ''),
    brand_name:       raw.liquorBrandDesc  ?? raw.liquor_brand_desc  ?? '',
    category:         raw.liquorCatDesc    ?? raw.liquor_cat_desc    ?? '',
    kind:             raw.liquorKindAbbr   ?? raw.liquor_kind_abbr   ?? raw.liquorKindDesc ?? raw.liquor_kind_desc ?? '',
    type:             raw.liquorTypeDesc   ?? raw.liquor_type_desc   ?? '',
    brand_owner_code: raw.brandNameAlias   ?? raw.brand_name_alias   ?? '',
    status:           raw.deleteStatus === 'N' || raw.delete_status === 'N' ? 'Active' : 'Inactive',
    liquorCatCode:    raw.liquorCat        ?? raw.liquor_cat         ?? undefined,
    liquorKindId:     raw.liquorKind       ?? raw.liquor_kind        ?? undefined,
    liquorTypeId:     raw.liquorType       ?? raw.liquor_type        ?? undefined,
    pack_sizes:       raw.pack_sizes       ?? raw.packSizes          ?? [],
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class CompanyCollaborationService {
  private baseUrl     = `${environment.apiBaseUrl}/transactional/company-collaboration`;
  private mastersUrl  = `${environment.apiBaseUrl}/masters/company-collaboration`;

  private selectedBrands: CompanyCollaborationBrand[] = [];

  constructor(private http: HttpClient) {}

  // ── Application lifecycle ──────────────────────────────────────────────────

  applyCompanyCollaboration(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/apply/`, data);
  }

  listCompanyCollaborations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list/`);
  }

  getCompanyCollaborationDetail(applicationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/detail/${encodeURIComponent(applicationId)}/`);
  }

  getDashboardCounts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard-counts/`);
  }

  getApplicationsByStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list-by-status/`);
  }

  // ── Master data ────────────────────────────────────────────────────────────

  /**
   * GET /masters/company-collaboration/brand-owners/
   * Returns enabled brand owners from master_brand_owner.
   */
  getBrandOwners(): Observable<CompanyCollaborationBrandOwner[]> {
    return this.http.get<any>(`${this.mastersUrl}/company-details/`).pipe(
      map((response) => {
        const raw = unwrapArray<any>(response, 'getBrandOwners');
        return raw.map(normalizeBrandOwner);
      }),
      catchError((err) => {
        console.error('[CompanyCollaborationService] getBrandOwners failed:', err);
        return throwError(() => err);
      })
    );
  }

  createBrandOwner(data: any): Observable<any> {
    return this.http.post(`${this.mastersUrl}/brand-owners/create/`, data);
  }

  updateBrandOwner(code: string, data: any): Observable<any> {
    return this.http.put(`${this.mastersUrl}/brand-owners/${encodeURIComponent(code)}/update/`, data);
  }

  deleteBrandOwner(code: string): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/brand-owners/${encodeURIComponent(code)}/delete/`);
  }

  getCompanyDetailsList(): Observable<any[]> {
    return this.http.get<any[]>(`${this.mastersUrl}/company-details/`);
  }

  createCompanyDetail(data: any): Observable<any> {
    return this.http.post(`${this.mastersUrl}/company-details/create/`, data);
  }

  updateCompanyDetail(code: string, data: any): Observable<any> {
    return this.http.put(`${this.mastersUrl}/company-details/${encodeURIComponent(code)}/update/`, data);
  }

  deleteCompanyDetail(code: string): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/company-details/${encodeURIComponent(code)}/delete/`);
  }

  getBrandOwnerTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.mastersUrl}/brand-owner-types/`);
  }

  // Categories CRUD
  getCategoriesCrudList(): Observable<any[]> {
    return this.http.get<any[]>(`${this.mastersUrl}/liquor-categories-crud/`);
  }
  createCategoryCrud(data: any): Observable<any> {
    return this.http.post(`${this.mastersUrl}/liquor-categories-crud/create/`, data);
  }
  updateCategoryCrud(pk: number | string, data: any): Observable<any> {
    return this.http.put(`${this.mastersUrl}/liquor-categories-crud/${pk}/update/`, data);
  }
  deleteCategoryCrud(pk: number | string): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/liquor-categories-crud/${pk}/delete/`);
  }

  // Kinds CRUD
  getKindsCrudList(): Observable<any[]> {
    return this.http.get<any[]>(`${this.mastersUrl}/liquor-kinds-crud/`);
  }
  createKindCrud(data: any): Observable<any> {
    return this.http.post(`${this.mastersUrl}/liquor-kinds-crud/create/`, data);
  }
  updateKindCrud(pk: number | string, data: any): Observable<any> {
    return this.http.put(`${this.mastersUrl}/liquor-kinds-crud/${pk}/update/`, data);
  }
  deleteKindCrud(pk: number | string): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/liquor-kinds-crud/${pk}/delete/`);
  }

  // Types CRUD
  getTypesCrudList(): Observable<any[]> {
    return this.http.get<any[]>(`${this.mastersUrl}/liquor-types-crud/`);
  }
  createTypeCrud(data: any): Observable<any> {
    return this.http.post(`${this.mastersUrl}/liquor-types-crud/create/`, data);
  }
  updateTypeCrud(pk: number | string, data: any): Observable<any> {
    return this.http.put(`${this.mastersUrl}/liquor-types-crud/${pk}/update/`, data);
  }
  deleteTypeCrud(pk: number | string): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/liquor-types-crud/${pk}/delete/`);
  }

  // Brands CRUD (with search)
  getBrandsCrudList(search: string): Observable<any[]> {
    let params = new HttpParams().set('search', search);
    return this.http.get<any[]>(`${this.mastersUrl}/liquor-brands-crud/`, { params });
  }
  createBrandCrud(data: any): Observable<any> {
    return this.http.post(`${this.mastersUrl}/liquor-brands-crud/create/`, data);
  }
  updateBrandCrud(pk: number | string, data: any): Observable<any> {
    return this.http.put(`${this.mastersUrl}/liquor-brands-crud/${pk}/update/`, data);
  }
  deleteBrandCrud(pk: number | string): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/liquor-brands-crud/${pk}/delete/`);
  }

  // Brand Pack Sizes (from master_liquor_product)
  getBrandPackSizes(brandCode: string): Observable<any[]> {
    const encoded = encodeURIComponent(brandCode);
    return this.http.get<any[]>(`${this.mastersUrl}/liquor-brands-crud/pack-sizes/${encoded}/`);
  }
  addBrandPackSize(brandCode: string, measureValue: number): Observable<any> {
    const encoded = encodeURIComponent(brandCode);
    // POST to the same pack-sizes URL — the backend differentiates GET vs POST by HTTP method
    // (Avoids URL routing conflict with <path:brand_code> greedily capturing /add/)
    return this.http.post(`${this.mastersUrl}/liquor-brands-crud/pack-sizes/${encoded}/`, { measureValue });
  }
  deleteBrandPackSize(sizeId: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/liquor-brands-crud/pack-sizes/${sizeId}/delete/`);
  }

  /**
   * GET /masters/company-collaboration/liquor-brands/
   * Returns all active brands. Optionally filtered by cat/kind/type IDs.
   */
  getBrands(catCode?: number | string, kindId?: number | string, typeId?: number | string): Observable<CompanyCollaborationBrand[]> {
    let params = new HttpParams();
    if (catCode)  params = params.set('cat',  String(catCode));
    if (kindId)   params = params.set('kind', String(kindId));
    if (typeId)   params = params.set('type', String(typeId));

    return this.http.get<any>(`${this.mastersUrl}/liquor-brands/`, { params }).pipe(
      map((response) => unwrapArray<any>(response, 'getBrands').map(normalizeBrand)),
      catchError((err) => {
        console.error('[CompanyCollaborationService] getBrands failed:', err);
        return throwError(() => err);
      })
    );
  }


  /**
   * GET /masters/company-collaboration/liquor-categories/
   */
  getLiquorCategories(): Observable<any[]> {
    return this.http.get<any>(`${this.mastersUrl}/liquor-categories/`).pipe(
      map((r) => unwrapArray<any>(r, 'getLiquorCategories')),
      catchError((err) => { console.error('[CompanyCollaborationService] getLiquorCategories failed:', err); return throwError(() => err); })
    );
  }

  /**
   * GET /masters/company-collaboration/liquor-kinds/?cat=<catCode>
   */
  getLiquorKinds(catCode?: number | string): Observable<any[]> {
    let params = new HttpParams();
    if (catCode) params = params.set('cat', String(catCode));
    return this.http.get<any>(`${this.mastersUrl}/liquor-kinds/`, { params }).pipe(
      map((r) => unwrapArray<any>(r, 'getLiquorKinds')),
      catchError((err) => { console.error('[CompanyCollaborationService] getLiquorKinds failed:', err); return throwError(() => err); })
    );
  }

  /**
   * GET /masters/company-collaboration/liquor-types/?cat=<catCode>&kind=<kindId>
   */
  getLiquorTypes(catCode?: number | string, kindId?: number | string): Observable<any[]> {
    let params = new HttpParams();
    if (catCode) params = params.set('cat',  String(catCode));
    if (kindId)  params = params.set('kind', String(kindId));
    return this.http.get<any>(`${this.mastersUrl}/liquor-types/`, { params }).pipe(
      map((r) => unwrapArray<any>(r, 'getLiquorTypes')),
      catchError((err) => { console.error('[CompanyCollaborationService] getLiquorTypes failed:', err); return throwError(() => err); })
    );
  }

  /**
   * GET /masters/company-collaboration/fee/
   * Returns the active fee structure from master_brand_owner_fee.
   */
  getFeeStructure(): Observable<CompanyCollaborationFeeStructure> {
    return this.http.get<any>(`${this.mastersUrl}/fee/`).pipe(
      map((response): CompanyCollaborationFeeStructure => {
        const payload = response?.data ?? response ?? {};
        return {
          applicationFee:   Number(payload.registrationFee   ?? payload.registration_fee   ?? payload.applicationFee   ?? payload.application_fee   ?? 0),
          collaborationFee: Number(payload.collaborationFees ?? payload.collaboration_fees  ?? payload.collaborationFee ?? payload.collaboration_fee  ?? 0),
          securityDeposit:  Number(payload.securityDeposit   ?? payload.security_deposit   ?? 0)
        };
      }),
      catchError((err) => {
        console.error('[CompanyCollaborationService] getFeeStructure failed:', err);
        return throwError(() => err);
      })
    );
  }


  // ── Workflow actions ───────────────────────────────────────────────────────

  performWorkflowAction(applicationId: string, action: string, remarks: string = ''): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/workflow-action/${encodedId}/`, { action, remarks });
  }

  // Pay collaboration fee via license_fee wallet
  payCollaborationFee(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/pay-fee/${encodedId}/`, {});
  }

  // ── Selected brands state ──────────────────────────────────────────────────

  setSelectedBrands(brands: CompanyCollaborationBrand[]): void { this.selectedBrands = [...brands]; }
  getSelectedBrands(): CompanyCollaborationBrand[] { return this.selectedBrands; }
  clearSelectedBrands(): void { this.selectedBrands = []; }
}
