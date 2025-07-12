import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { District } from '../../core/models/district.model';
import { Subdivision } from '../../core/models/subdivision.model';
import { PoliceStation } from '../../core/models/policestation.model';
import { LicenseType } from '../../core/models/license-type.model';
import { LicenseCategory } from '../../core/models/license-category.model';
import { Account } from '../../core/models/accounts';
import { Role } from '../../core/models/role';

@Injectable({ providedIn: 'root' })

export class AdminService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly mastersUrl = `${this.baseUrl}/masters/core`;
  private readonly usersUrl = `${this.baseUrl}/auth`;

  constructor(private http: HttpClient) {}

  // ========================== USER MANAGEMENT ==========================

  // Register a new user
  registerUser(user: Account): Observable<any> {
    return this.http.post(`${this.usersUrl}/users/register/`, user);
  }

  // Update user by id
  updateUser(id: number, payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.usersUrl}/users/${id}/update/`,
      payload
    );
  }

  // Delete user by username
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.usersUrl}/users/${id}/delete/`);
  }


  // ========================== ROLE MANAGEMENT ==========================

  // Create a new user
  createRole(role: Role): Observable<any> {
    return this.http.post(`${this.usersUrl}/roles/register/`, role);
  }

  // Update role by id
  updateRole(id: number, payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.usersUrl}/${id}/users/update/`,
      payload
    );
  }

  // Delete role by id
  deleteRole(username: string): Observable<any> {
    return this.http.delete(`${this.usersUrl}/user/${username}/delete/`);
  }

  // ========================== DISTRICT MANAGEMENT ==========================

  // Adds a new district record
  saveDistrict(district: District): Observable<any> {
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
  saveSubDivision(subdivision: Subdivision): Observable<any> {
    return this.http.post(`${this.mastersUrl}/subdivisions/create/`, subdivision);
  }

  // Updates an existing subdivision by ID
  updateSubDivision(id: number, changes: Partial<Subdivision>): Observable<Subdivision> {
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
  updatePolicestation(id: number, changes: Partial<PoliceStation>): Observable<PoliceStation> {
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
}
