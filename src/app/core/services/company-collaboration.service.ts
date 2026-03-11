import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CompanyCollaborationBrand,
  CompanyCollaborationBrandOwner,
  CompanyCollaborationFeeStructure,
  CompanyCollaborationMember
} from '../models/company-collaboration.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyCollaborationService {
  private baseUrl = `${environment.apiBaseUrl}/transactional/company-collaboration`;
  private selectedBrands: CompanyCollaborationBrand[] = [];

  constructor(private http: HttpClient) {}

  applyCompanyCollaboration(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/apply/`, data);
  }

  getBrandOwners(): Observable<CompanyCollaborationBrandOwner[]> {
    return this.http.get<any>(`${this.baseUrl}/brand-owners/`).pipe(
      map((response) => {
        const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        return data.map((item: any) => this.mapBrandOwner(item));
      })
    );
  }

  getBrandsByOwner(brandOwnerCode: string, brandOwner?: string): Observable<CompanyCollaborationBrand[]> {
    let params = new HttpParams().set('brand_owner_code', brandOwnerCode);
    if (brandOwner) {
      params = params.set('brand_owner', brandOwner);
    }

    return this.http.get<any>(`${this.baseUrl}/brands/`, { params }).pipe(
      map((response) => {
        const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        return data.map((item: any) => this.mapBrand(item));
      })
    );
  }

  getFeeStructure(
    selectedBrandIds: Array<string | number>,
    selectedBrands: CompanyCollaborationBrand[] = []
  ): Observable<CompanyCollaborationFeeStructure> {
    return this.http.post<any>(`${this.baseUrl}/fee-structure/`, {
      selected_brand_ids: selectedBrandIds,
      selected_brands: selectedBrands
    }).pipe(
      map((response) => this.mapFeeStructure(response?.data || response || {}))
    );
  }

  listCompanyCollaborations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list/`);
  }

  getCompanyCollaborationDetail(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.baseUrl}/detail/${encodedId}/`);
  }

  getDashboardCounts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard-counts/`);
  }

  getApplicationsByStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list-by-status/`);
  }

  setSelectedBrands(brands: CompanyCollaborationBrand[]): void {
    this.selectedBrands = [...brands];
  }

  getSelectedBrands(): CompanyCollaborationBrand[] {
    return this.selectedBrands;
  }

  clearSelectedBrands(): void {
    this.selectedBrands = [];
  }

  private mapBrandOwner(item: any): CompanyCollaborationBrandOwner {
    const rawMembers = Array.isArray(item?.members)
      ? item.members
      : Array.isArray(item?.company_members)
        ? item.company_members
        : [];

    return {
      id: String(item?.id ?? item?.brandOwnerCode ?? item?.brand_owner_code ?? ''),
      brand_owner_code: String(item?.brandOwnerCode ?? item?.brand_owner_code ?? item?.id ?? ''),
      company_name: String(item?.companyName ?? item?.company_name ?? item?.brandOwner ?? item?.brand_owner ?? ''),
      pan_no: String(item?.panNo ?? item?.pan_no ?? item?.pan ?? ''),
      office_address: String(item?.officeAddress ?? item?.office_address ?? item?.registeredOfficeAddress ?? item?.registered_office_address ?? item?.companyAddress ?? item?.company_address ?? ''),
      factory_address: String(item?.factoryAddress ?? item?.factory_address ?? ''),
      mobile: String(item?.mobile ?? item?.mobileNo ?? item?.mobile_no ?? item?.phone ?? ''),
      email: String(item?.email ?? item?.emailAddress ?? item?.email_address ?? ''),
      location: String(item?.location ?? item?.companyAddress ?? item?.company_address ?? ''),
      status: String(item?.status ?? 'Active'),
      brand_count: Number(item?.brandCount ?? item?.brand_count ?? 0),
      members: rawMembers.map((m: any) => ({
        member_name:    String(m?.memberName    ?? m?.member_name    ?? m?.name        ?? ''),
        designation:    String(m?.designation   ?? m?.designationName ?? ''),
        member_address: String(m?.memberAddress ?? m?.member_address ?? m?.address    ?? ''),
        contact_number: String(m?.contactNumber ?? m?.contact_number ?? m?.phone      ?? ''),
        email:          String(m?.email         ?? m?.emailAddress   ?? m?.email_address ?? '')
      }))
    };
  }

  private mapBrand(item: any): CompanyCollaborationBrand {
    const kindValue =
      item?.kind ??
      item?.liquorKind ??
      item?.liquor_kind ??
      item?.liquor_kind_name ??
      item?.kind_name;

    return {
      id: String(item?.id ?? item?.brandCode ?? item?.brand_code ?? ''),
      brand_code: String(item?.brandCode ?? item?.brand_code ?? item?.id ?? ''),
      brand_name: String(item?.brandName ?? item?.brand_name ?? ''),
      category: String(item?.category ?? 'General'),
      kind: kindValue ? String(kindValue) : '',
      type: String(item?.type ?? 'General'),
      strength: item?.strength === null || item?.strength === undefined || item?.strength === ''
        ? null
        : Number(item.strength),
      sizes: Array.isArray(item?.sizes) ? item.sizes.map((size: unknown) => String(size)) : [],
      brand_owner_code: item?.brandOwnerCode ?? item?.brand_owner_code ?? undefined,
      status: item?.status ?? undefined
    };
  }

  private mapFeeStructure(item: any): CompanyCollaborationFeeStructure {
    return {
      applicationFee: Number(item?.applicationFee ?? item?.application_fee ?? 0),
      collaborationFee: Number(item?.collaborationFee ?? item?.collaboration_fee ?? 0),
      securityDeposit: Number(item?.securityDeposit ?? item?.security_deposit ?? 0)
    };
  }
}

