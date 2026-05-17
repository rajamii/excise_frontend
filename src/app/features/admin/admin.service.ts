import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { District } from '../../core/models/district.model';
import { Subdivision } from '../../core/models/subdivision.model';
import { PoliceStation } from '../../core/models/policestation.model';
import { LicenseType } from '../../core/models/license-type.model';
import { LicenseCategory } from '../../core/models/license-category.model';
import { Account } from '../../core/models/account.model';
import { Role } from '../../core/models/role.model';
import { LicenseSubcategory } from '../../core/models/license-subcategory.model';
import { LicenseTitle } from '../../core/models/license-title.model';
import { Road } from '../../core/models/road.model';
import { Notification } from '../../core/models/notification.model';
import { LicenseFormTermsResponse } from './master/license-terms/license-terms.model';

export type UserPayload = Omit<Partial<Account>, 'district' | 'subdivision' | 'role'> & {
  district?: number;
  subdivision?: number;
  role?: number;
  isActive?: boolean;
  confirmPassword?: string;
};

export interface OICApprovedEstablishment {
  applicationId: string;
  establishmentName: string;
  licenseId: string;
  licenseeId: string;
  districtCode: string;
  subdivisionCode: string;
}

export interface OICOfficerRecord {
  id: number;
  officerId: number;
  username: string;
  name: string;
  email: string;
  phoneNumber: string;
  applicationId: string;
  licenseId: string;
  licensee_id: string;
  establishment_name: string;
  establishmentName?: string;
  created_at: string;
  createdAt?: string;
  officer_created_at?: string;
  officerCreatedAt?: string;
  isActive?: boolean;
}

export interface CreateOICOfficerPayload {
  approvedApplicationId: string;
  name: string;
  email: string;
  phoneNumber: string;
}

@Injectable({ providedIn: 'root' })

export class AdminService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly mastersUrl = `${this.baseUrl}/masters/core`;
  private readonly mastersBaseUrl = `${this.baseUrl}/masters`;
  private readonly licenseMastersUrl = `${this.baseUrl}/masters/license`;
  private readonly usersUrl = `${this.baseUrl}/auth`;

  constructor(private http: HttpClient) { }

  // ========================== USER MANAGEMENT ==========================

  // Add a new user
  addUser(user: UserPayload): Observable<any> {
    console.log('Adding user:', user);
    return this.http.post(`${this.usersUrl}/users/register/`, user).pipe(
      catchError(err => {
        console.error('registration Error:', err)
        throw err;
      })
    );
  }

  // Update user by id
  updateUser(id: number, changes: UserPayload): Observable<any> {
    return this.http.put<Account>(
      `${this.usersUrl}/users/${id}/update/`,
      changes
    );
  }

  // Delete user by username
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.usersUrl}/users/${id}/delete/`);
  }

  // OIC officer management for Site Admin
  getOICApprovedEstablishments(): Observable<OICApprovedEstablishment[]> {
    return this.http.get<OICApprovedEstablishment[]>(
      `${this.usersUrl}/users/oic/approved-establishments/`
    );
  }

  getOICOfficers(): Observable<OICOfficerRecord[]> {
    return this.http.get<OICOfficerRecord[]>(
      `${this.usersUrl}/users/oic/officers/`
    );
  }

  createOICOfficer(payload: CreateOICOfficerPayload): Observable<any> {
    return this.http.post(
      `${this.usersUrl}/users/oic/officers/create/`,
      payload
    );
  }

  updateOICOfficer(assignmentId: number, payload: CreateOICOfficerPayload): Observable<any> {
    return this.http.put(
      `${this.usersUrl}/users/oic/officers/${assignmentId}/update/`,
      payload
    );
  }

  setOICOfficerActive(assignmentId: number, isActive: boolean): Observable<any> {
    return this.http.patch(
      `${this.usersUrl}/users/oic/officers/${assignmentId}/set-active/`,
      { isActive }
    );
  }

  deleteOICOfficer(assignmentId: number): Observable<any> {
    return this.http.delete(
      `${this.usersUrl}/users/oic/officers/${assignmentId}/delete/`
    );
  }


  // ========================== ROLE MANAGEMENT ==========================

  // Adds a new role record
  addRole(role: Role): Observable<any> {
    const payload = {
      name: role.name,
      can_view: role.canView,
      can_add: role.canAdd,
      can_update: role.canUpdate,
      can_delete: role.canDelete,
      precedence: role.rolePrecedence,
    };
    return this.http.post(`${this.usersUrl}/roles/create/`, payload);
  }

  // Updates details of an existing role by ID
  updateRole(id: number, changes: Partial<Role>): Observable<Role> {
    const payload: any = { ...changes };
    if (changes.canView) payload.can_view = changes.canView;
    if (changes.canAdd) payload.can_add = changes.canAdd;
    if (changes.canUpdate) payload.can_update = changes.canUpdate;
    if (changes.canDelete) payload.can_delete = changes.canDelete;
    if (changes.rolePrecedence !== undefined) payload.precedence = changes.rolePrecedence;

    // Cleanup camelCase keys if they are still present (optional but cleaner)
    delete payload.canView;
    delete payload.canAdd;
    delete payload.canUpdate;
    delete payload.canDelete;
    delete payload.rolePrecedence;
    delete payload.id;

    return this.http.put<Role>(`${this.usersUrl}/roles/${id}/update/`, payload);
  }

  // Deletes a district by ID
  deleteRole(id: number): Observable<any> {
    return this.http.delete(`${this.usersUrl}/roles/${id}/delete/`);
  }

  // ========================== DISTRICT MANAGEMENT ==========================

  // Adds a new district record
  addDistrict(district: District): Observable<any> {
    return this.http.post(`${this.mastersUrl}/districts/create/`, district);
  }

  // Updates details of an existing district by ID
  updateDistrict(id: number, changes: Partial<District>): Observable<District> {
    return this.http.put<District>(`${this.mastersUrl}/districts/${id}/update/`, changes);
  }

  // Deletes a district by ID
  deleteDistrict(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/districts/${id}/delete/`);
  }

  // ========================== SUBDIVISION MANAGEMENT ==========================

  // Adds a new subdivision
  addSubdivision(subdivision: Subdivision): Observable<any> {
    return this.http.post(`${this.mastersUrl}/subdivisions/create/`, subdivision);
  }

  // Updates an existing subdivision by ID
  updateSubdivision(id: number, changes: Partial<Subdivision>): Observable<Subdivision> {
    return this.http.put<Subdivision>(`${this.mastersUrl}/subdivisions/${id}/update/`, changes);
  }

  // Deletes a subdivision by ID
  deleteSubdivision(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/subdivisions/${id}/delete/`);
  }

  // ========================== POLICE STATION MANAGEMENT ==========================

  // Adds a new police station
  addPoliceStation(policeStation: PoliceStation): Observable<any> {
    return this.http.post(`${this.mastersUrl}/police-stations/create/`, policeStation);
  }

  // Updates a police station’s details by ID
  updatePoliceStation(id: number, changes: Partial<PoliceStation>): Observable<PoliceStation> {
    return this.http.put<PoliceStation>(`${this.mastersUrl}/police-stations/${id}/update/`, changes);
  }

  // Deletes a police station by ID
  deletePoliceStation(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/police-stations/${id}/delete/`);
  }

  // ========================== LICENSE TYPE MANAGEMENT ==========================

  // Adds a new license type
  addLicenseType(licenseType: LicenseType): Observable<any> {
    return this.http.post(`${this.mastersUrl}/license-types/create/`, licenseType);
  }

  // Updates an existing license type by ID
  updateLicenseType(id: number, changes: Partial<LicenseType>): Observable<LicenseType> {
    return this.http.put<LicenseType>(`${this.mastersUrl}/license-types/${id}/update/`, changes);
  }

  // Deletes a license type by ID
  deleteLicenseType(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/license-types/${id}/delete/`);
  }

  // ========================== LICENSE CATEGORY MANAGEMENT ==========================

  // Adds a new license category
  addLicenseCategory(category: LicenseCategory): Observable<any> {
    return this.http.post(`${this.mastersUrl}/license-categories/create/`, category);
  }

  // Updates an existing license category by ID
  updateLicenseCategory(id: number, changes: Partial<LicenseCategory>): Observable<LicenseCategory> {
    return this.http.put<LicenseCategory>(`${this.mastersUrl}/license-categories/${id}/update/`, changes);
  }

  // Deletes a license category by ID
  deleteLicenseCategory(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/license-categories/${id}/delete/`);
  }

  // ========================== LICENSE SUBCATEGORY MANAGEMENT ==========================

  // Adds a new license subcategory
  addLicenseSubcategory(category: LicenseSubcategory): Observable<any> {
    return this.http.post(`${this.mastersUrl}/license-subcategories/create/`, category);
  }

  // Updates an existing license subcategory by ID
  updateLicenseSubcategory(id: number, changes: Partial<LicenseSubcategory>): Observable<LicenseSubcategory> {
    return this.http.put<LicenseSubcategory>(`${this.mastersUrl}/license-subcategories/${id}/update/`, changes);
  }

  // Deletes a license subcategory by ID
  deleteLicenseSubcategory(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/license-subcategories/${id}/delete/`);
  }

  // ========================== LICENSE TITLE MANAGEMENT ==========================

  // Adds a new license title
  addLicenseTitle(category: LicenseTitle): Observable<any> {
    return this.http.post(`${this.mastersUrl}/license-titles/create/`, category);
  }

  // Updates an existing license title by ID
  updateLicenseTitle(id: number, changes: Partial<LicenseTitle>): Observable<LicenseTitle> {
    return this.http.put<LicenseTitle>(`${this.mastersUrl}/license-titles/${id}/update/`, changes);
  }

  // Deletes a license title by ID
  deleteLicenseTitle(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/license-titles/${id}/delete/`);
  }

  // ========================== ROAD MANAGEMENT ==========================

  // Adds a new road
  addRoad(category: Road): Observable<any> {
    return this.http.post(`${this.mastersUrl}/roads/create/`, category);
  }

  // Updates an existing road by ID
  updateRoad(id: number, changes: Partial<Road>): Observable<Road> {
    return this.http.put<Road>(`${this.mastersUrl}/roads/${id}/update/`, changes);
  }

  // Deletes a road by ID
  deleteRoad(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/roads/${id}/delete/`);
  }

  // ========================== NOTIFICATION MANAGEMENT ==========================

  // Adds a new notification
  addNotification(notification: FormData | Notification): Observable<any> {
    return this.http.post(`${this.mastersBaseUrl}/notification/create/`, notification);
  }

  // Updates an existing notification by ID
  updateNotification(id: number, changes: FormData | Partial<Notification>): Observable<Notification> {
    return this.http.put<Notification>(`${this.mastersBaseUrl}/notification/update/${id}/`, changes);
  }

  // Deletes a notification by ID
  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.mastersBaseUrl}/notification/delete/${id}/`);
  }

  // ========================== LICENSE TERMS (LEGACY CODES) ==========================

  getLicenseFormTerms(licenseeCatCode: number, licenseeScatCode: number): Observable<LicenseFormTermsResponse> {
    return this.http.get<LicenseFormTermsResponse>(
      `${this.licenseMastersUrl}/form-terms/?licensee_cat_code=${licenseeCatCode}&licensee_scat_code=${licenseeScatCode}`
    );
  }

  updateLicenseFormTerms(licenseeCatCode: number, licenseeScatCode: number, terms: string[]): Observable<LicenseFormTermsResponse> {
    return this.http.put<LicenseFormTermsResponse>(
      `${this.licenseMastersUrl}/form-terms/update/`,
      {
        licensee_cat_code: licenseeCatCode,
        licensee_scat_code: licenseeScatCode,
        terms,
      }
    );
  }
}
