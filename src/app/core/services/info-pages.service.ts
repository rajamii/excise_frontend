import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  NodalOfficer,
  PublicInformationOfficer,
  DirectorateAndDistrictOfficials,
  GrievanceRedressalOfficer
} from '../../core/models/contact-us.model';
import {
  ExciseSecretary,
  HeadOfOrganisation,
  AboutUs,
  Department,
  ProductsServices,
  RefundCancellationPolicy
} from '../../core/models/about-us.model';

@Injectable({
  providedIn: 'root'
})
export class InfoPagesService {
  // Base URL from environment configuration
  private baseUrl = `${environment.apiBaseUrl}/masters/contact_us`;
  private aboutUsBaseUrl = `${environment.apiBaseUrl}/masters/about_us`;

  constructor(private http: HttpClient) {}

  // Fetch list of Nodal Officers
  getNodalOfficers(): Observable<NodalOfficer[]> {
    return this.http.get<NodalOfficer[]>(`${this.baseUrl}/nodalofficer/list/`);
  }

  createNodalOfficer(data: Partial<NodalOfficer>): Observable<NodalOfficer> {
    return this.http.post<NodalOfficer>(`${this.baseUrl}/nodalofficer/create/`, this.toContactUsFormData(data));
  }

  updateNodalOfficer(id: number, data: Partial<NodalOfficer>): Observable<NodalOfficer> {
    return this.http.put<NodalOfficer>(`${this.baseUrl}/nodalofficer/update/${id}/`, this.toContactUsFormData(data));
  }

  deleteNodalOfficer(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/nodalofficer/delete/${id}/`);
  }

  // Fetch list of Public Information Officers
  getPublicInformationOfficers(): Observable<PublicInformationOfficer[]> {
    return this.http.get<PublicInformationOfficer[]>(`${this.baseUrl}/publicinformationofficer/list/`);
  }

  createPublicInformationOfficer(data: Partial<PublicInformationOfficer>): Observable<PublicInformationOfficer> {
    return this.http.post<PublicInformationOfficer>(`${this.baseUrl}/publicinformationofficer/create/`, this.toContactUsFormData(data));
  }

  updatePublicInformationOfficer(id: number, data: Partial<PublicInformationOfficer>): Observable<PublicInformationOfficer> {
    return this.http.put<PublicInformationOfficer>(`${this.baseUrl}/publicinformationofficer/update/${id}/`, this.toContactUsFormData(data));
  }

  deletePublicInformationOfficer(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/publicinformationofficer/delete/${id}/`);
  }

  // Fetch list of Directorate and District Officials
  getDirectorateAndDistrictOfficials(): Observable<DirectorateAndDistrictOfficials[]> {
    return this.http.get<DirectorateAndDistrictOfficials[]>(`${this.baseUrl}/directoratendistrictofficials/list/`);
  }

  createDirectorateAndDistrictOfficial(data: Partial<DirectorateAndDistrictOfficials>): Observable<DirectorateAndDistrictOfficials> {
    return this.http.post<DirectorateAndDistrictOfficials>(`${this.baseUrl}/directoratendistrictofficials/create/`, this.toContactUsFormData(data));
  }

  updateDirectorateAndDistrictOfficial(id: number, data: Partial<DirectorateAndDistrictOfficials>): Observable<DirectorateAndDistrictOfficials> {
    return this.http.put<DirectorateAndDistrictOfficials>(`${this.baseUrl}/directoratendistrictofficials/update/${id}/`, this.toContactUsFormData(data));
  }

  deleteDirectorateAndDistrictOfficial(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/directoratendistrictofficials/delete/${id}/`);
  }

  // Fetch list of Grievance Redressal Officers
  getGrievanceRedressalOfficers(): Observable<GrievanceRedressalOfficer[]> {
    return this.http.get<GrievanceRedressalOfficer[]>(`${this.baseUrl}/grievanceredressalofficer/list/`);
  }

  createGrievanceRedressalOfficer(data: Partial<GrievanceRedressalOfficer>): Observable<GrievanceRedressalOfficer> {
    return this.http.post<GrievanceRedressalOfficer>(`${this.baseUrl}/grievanceredressalofficer/create/`, this.toContactUsFormData(data));
  }

  updateGrievanceRedressalOfficer(id: number, data: Partial<GrievanceRedressalOfficer>): Observable<GrievanceRedressalOfficer> {
    return this.http.put<GrievanceRedressalOfficer>(`${this.baseUrl}/grievanceredressalofficer/update/${id}/`, this.toContactUsFormData(data));
  }

  deleteGrievanceRedressalOfficer(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/grievanceredressalofficer/delete/${id}/`);
  }

  // Fetch list of Heads of Organisations
  getHeadsOfOrganisations(): Observable<HeadOfOrganisation[]> {
    return this.http.get<HeadOfOrganisation[]>(`${this.aboutUsBaseUrl}/headsoforganisations/list/`);
  }

  createHeadOfOrganisation(data: Partial<HeadOfOrganisation>): Observable<HeadOfOrganisation> {
    return this.http.post<HeadOfOrganisation>(`${this.aboutUsBaseUrl}/headsoforganisations/create/`, this.toInfoPageFormData(data));
  }

  updateHeadOfOrganisation(id: number, data: Partial<HeadOfOrganisation>): Observable<HeadOfOrganisation> {
    return this.http.patch<HeadOfOrganisation>(`${this.aboutUsBaseUrl}/headsoforganisations/update/${id}/`, this.toInfoPageFormData(data));
  }

  deleteHeadOfOrganisation(id: number): Observable<any> {
    return this.http.delete(`${this.aboutUsBaseUrl}/headsoforganisations/delete/${id}/`);
  }

  // Fetch list of Excise Secretaries / Principal Secretaries
  getExciseSecretaries(): Observable<ExciseSecretary[]> {
    return this.http.get<ExciseSecretary[]>(`${this.aboutUsBaseUrl}/excisesecretaries/list/`);
  }

  createExciseSecretary(data: Partial<ExciseSecretary>): Observable<ExciseSecretary> {
    return this.http.post<ExciseSecretary>(`${this.aboutUsBaseUrl}/excisesecretaries/create/`, this.toInfoPageFormData(data));
  }

  updateExciseSecretary(id: number, data: Partial<ExciseSecretary>): Observable<ExciseSecretary> {
    return this.http.put<ExciseSecretary>(`${this.aboutUsBaseUrl}/excisesecretaries/update/${id}/`, this.toInfoPageFormData(data));
  }

  deleteExciseSecretary(id: number): Observable<any> {
    return this.http.delete(`${this.aboutUsBaseUrl}/excisesecretaries/delete/${id}/`);
  }

  // Department
  getDepartment(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.aboutUsBaseUrl}/department/list/`);
  }

  createDepartment(data: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(`${this.aboutUsBaseUrl}/department/create/`, this.toInfoPageFormData(data));
  }

  updateDepartment(id: number, data: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.aboutUsBaseUrl}/department/update/${id}/`, this.toInfoPageFormData(data));
  }

  deleteDepartment(id: number): Observable<any> {
    return this.http.delete(`${this.aboutUsBaseUrl}/department/delete/${id}/`);
  }

  // Products & Services
  getProductsServices(): Observable<ProductsServices[]> {
    return this.http.get<ProductsServices[]>(`${this.aboutUsBaseUrl}/products-services/list/`);
  }

  createProductsServices(data: Partial<ProductsServices>): Observable<ProductsServices> {
    return this.http.post<ProductsServices>(`${this.aboutUsBaseUrl}/products-services/create/`, this.toInfoPageFormData(data));
  }

  updateProductsServices(id: number, data: Partial<ProductsServices>): Observable<ProductsServices> {
    return this.http.put<ProductsServices>(`${this.aboutUsBaseUrl}/products-services/update/${id}/`, this.toInfoPageFormData(data));
  }

  deleteProductsServices(id: number): Observable<any> {
    return this.http.delete(`${this.aboutUsBaseUrl}/products-services/delete/${id}/`);
  }

  // Refund & Cancellation Policy
  getRefundCancellationPolicy(): Observable<RefundCancellationPolicy[]> {
    return this.http.get<RefundCancellationPolicy[]>(`${this.aboutUsBaseUrl}/refund-cancellation-policy/list/`);
  }

  createRefundCancellationPolicy(data: Partial<RefundCancellationPolicy>): Observable<RefundCancellationPolicy> {
    return this.http.post<RefundCancellationPolicy>(`${this.aboutUsBaseUrl}/refund-cancellation-policy/create/`, this.toInfoPageFormData(data));
  }

  updateRefundCancellationPolicy(id: number, data: Partial<RefundCancellationPolicy>): Observable<RefundCancellationPolicy> {
    return this.http.put<RefundCancellationPolicy>(`${this.aboutUsBaseUrl}/refund-cancellation-policy/update/${id}/`, this.toInfoPageFormData(data));
  }

  deleteRefundCancellationPolicy(id: number): Observable<any> {
    return this.http.delete(`${this.aboutUsBaseUrl}/refund-cancellation-policy/delete/${id}/`);
  }

  // About Us Content (General)
  getAboutUs(pageKey?: string): Observable<AboutUs[]> {
    const url = pageKey
      ? `${this.aboutUsBaseUrl}/content/list/?page_key=${encodeURIComponent(pageKey)}`
      : `${this.aboutUsBaseUrl}/content/list/`;
    return this.http.get<AboutUs[]>(url);
  }

  createAboutUs(data: Partial<AboutUs>): Observable<AboutUs> {
    return this.http.post<AboutUs>(`${this.aboutUsBaseUrl}/content/create/`, this.toInfoPageFormData(data));
  }

  updateAboutUs(id: number, data: Partial<AboutUs>): Observable<AboutUs> {
    return this.http.put<AboutUs>(`${this.aboutUsBaseUrl}/content/update/${id}/`, this.toInfoPageFormData(data));
  }

  deleteAboutUs(id: number): Observable<any> {
    return this.http.delete(`${this.aboutUsBaseUrl}/content/delete/${id}/`);
  }

  private toContactUsFormData(data: Record<string, any>): FormData {
    return this.toInfoPageFormData(data);
  }

  private toInfoPageFormData(data: Record<string, any>): FormData {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value, value.name);
        return;
      }

      // Always append non-file fields, including null/empty (send '' for null so backend can clear the field)
      if (value === undefined) {
        return;
      }

      formData.append(key, value === null ? '' : String(value));
    });

    return formData;
  }
}
