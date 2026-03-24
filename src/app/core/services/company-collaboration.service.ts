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

function normalizeBrandOwner(raw: any): CompanyCollaborationBrandOwner {
  return {
    id:                raw.id,
    brand_owner_code:  raw.brandOwnerCode  ?? raw.brand_owner_code  ?? '',
    company_name:      raw.companyName     ?? raw.company_name      ?? raw.brandOwner ?? '',
    company_address:   raw.companyAddress  ?? raw.company_address   ?? '',
    location:          raw.location        ?? '',
    status:            raw.status          ?? '',
    brand_count:       raw.brandCount      ?? raw.brand_count       ?? 0,
    pan_no:            raw.panNo           ?? raw.pan_no            ?? '',
    office_address:    raw.officeAddress   ?? raw.office_address    ?? raw.companyAddress ?? raw.company_address ?? '',
    factory_address:   raw.factoryAddress  ?? raw.factory_address   ?? '',
    mobile:            raw.mobile          ?? raw.phone             ?? '',
    email:             raw.email           ?? '',
    members:           raw.members         ?? []
  };
}

function normalizeBrand(raw: any): CompanyCollaborationBrand {
  let sizes: string[] = [];
  const rawSizes = raw.sizes ?? raw.capacitySize ?? raw.capacity_size ?? raw.packSizes ?? raw.pack_sizes;
  if (Array.isArray(rawSizes))           sizes = rawSizes.map(String).filter(Boolean);
  else if (typeof rawSizes === 'string') sizes = rawSizes.split(',').map((s: string) => s.trim()).filter(Boolean);
  else if (rawSizes != null)             sizes = [String(rawSizes)];

  return {
    id:               raw.id,
    brand_code:       raw.brandCode       ?? raw.brand_code       ?? String(raw.id ?? ''),
    brand_name:       raw.brandName       ?? raw.brand_name       ?? raw.brandDetails ?? raw.brand_details ?? '',
    category:         raw.category        ?? raw.distilleryName   ?? raw.distillery_name ?? '',
    type:             raw.brandType       ?? raw.brand_type       ?? raw.type ?? '',
    strength:         raw.strength        ?? 0,
    sizes,
    brand_owner_code: raw.brandOwnerCode  ?? raw.brand_owner_code ?? '',
    status:           raw.status          ?? ''
  };
}

@Injectable({ providedIn: 'root' })
export class CompanyCollaborationService {
  private baseUrl = `${environment.apiBaseUrl}/transactional/company-collaboration`;
  private selectedBrands: CompanyCollaborationBrand[] = [];

  constructor(private http: HttpClient) {}

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

  getBrandOwners(): Observable<CompanyCollaborationBrandOwner[]> {
    return this.http.get<any>(`${this.baseUrl}/brand-owners/`).pipe(
      map((response) => {
        const raw = unwrapArray<any>(response, 'getBrandOwners');
        const normalized = raw.map(normalizeBrandOwner);
        console.log('[CompanyCollaborationService] getBrandOwners normalized:', normalized);
        return normalized;
      }),
      catchError((err) => {
        console.error('[CompanyCollaborationService] getBrandOwners failed:', err);
        return throwError(() => err);
      })
    );
  }

  getBrandsByOwner(brandOwnerCode: string, brandOwnerName?: string): Observable<CompanyCollaborationBrand[]> {
    let params = new HttpParams().set('brand_owner_code', brandOwnerCode);
    if (brandOwnerName) params = params.set('brand_owner_name', brandOwnerName);

    return this.http.get<any>(`${this.baseUrl}/brands/`, { params }).pipe(
      map((response) => {
        const raw = unwrapArray<any>(response, 'getBrandsByOwner');
        const normalized = raw.map(normalizeBrand);
        console.log('[CompanyCollaborationService] getBrandsByOwner normalized:', normalized);
        return normalized;
      }),
      catchError((err) => {
        console.error('[CompanyCollaborationService] getBrandsByOwner failed:', err);
        return throwError(() => err);
      })
    );
  }

  getFeeStructure(brandIds: Array<string | number>, selectedBrands: CompanyCollaborationBrand[] = []): Observable<CompanyCollaborationFeeStructure> {
    return this.http.post<any>(`${this.baseUrl}/fee-structure/`, { brandIds, selectedBrands }).pipe(
      map((response): CompanyCollaborationFeeStructure => {
        const payload = response?.data ?? response?.fee ?? response ?? {};
        return {
          applicationFee:   Number(payload.applicationFee   ?? payload.application_fee   ?? 0),
          collaborationFee: Number(payload.collaborationFee ?? payload.collaboration_fee ?? 0),
          securityDeposit:  Number(payload.securityDeposit  ?? payload.security_deposit  ?? 0)
        };
      }),
      catchError((err) => {
        console.error('[CompanyCollaborationService] getFeeStructure failed:', err);
        return throwError(() => err);
      })
    );
  }

  setSelectedBrands(brands: CompanyCollaborationBrand[]): void { this.selectedBrands = [...brands]; }
  getSelectedBrands(): CompanyCollaborationBrand[] { return this.selectedBrands; }
  clearSelectedBrands(): void { this.selectedBrands = []; }
}