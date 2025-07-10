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
  private readonly mastersUrl = `${this.baseUrl}/masters`;

  constructor(private http: HttpClient) {}

  // ========================== USER MANAGEMENT ==========================

  // Register a new user
  registerUser(user: Account): Observable<any> {
    return this.http.post(`${this.baseUrl}/user/register/`, user);
  }

  // Get all users
  getUsers(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.baseUrl}/user/list/?username=all`);
  }

  // Get user by username
  getUserByUsername(username: string): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/user/detail/${username}/`);
  }

  // Get currently logged-in user
  getCurrentUser(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/user/detail/`);
  }

/*   // Update user by username
  updateUser(username: string, changes: Partial<Account>): Observable<Account> {
    return this.http.put<Account>(`${this.baseUrl}/user/update/${username}/`, changes);
  } */

  // Delete user by username
  deleteUser(username: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/user/delete/${username}/`);
  }

  // ========================== DISTRICT MANAGEMENT ==========================

  // Adds a new district record
  saveDistrict(district: District): Observable<any> {
    return this.http.post(`${this.mastersUrl}/districts/create/`, district);
  }

  // Updates details of an existing district by ID
  updateDistrict(id: number, changes: Partial<District>): Observable<District> {
    return this.http.put<District>(`${this.mastersUrl}/districts/update/${id}/`, changes);
  }

  // Deletes a district by ID
  deleteDistrict(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/districts/delete/${id}/`);
  }

  // ========================== SUBDIVISION MANAGEMENT ==========================

  // Adds a new subdivision
  saveSubDivision(subdivision: Subdivision): Observable<any> {
    return this.http.post(`${this.mastersUrl}/subdivisions/create/`, subdivision);
  }

  // Updates an existing subdivision by ID
  updateSubDivision(id: number, changes: Partial<Subdivision>): Observable<Subdivision> {
    return this.http.put<Subdivision>(`${this.mastersUrl}/subdivisions/update/${id}/`, changes);
  }

  // Deletes a subdivision by ID
  deleteSubdivision(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/subdivisions/delete/${id}/`);
  }

  // ========================== POLICE STATION MANAGEMENT ==========================

  // Adds a new police station
  addPoliceStation(policeStation: PoliceStation): Observable<any> {
    return this.http.post(`${this.mastersUrl}/policestations/create/`, policeStation);
  }

  // Updates a police station’s details by ID
  updatePolicestation(id: number, changes: Partial<PoliceStation>): Observable<PoliceStation> {
    return this.http.put<PoliceStation>(`${this.mastersUrl}/policestations/update/${id}/`, changes);
  }

  // Deletes a police station by ID
  deletePoliceStation(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/policestations/delete/${id}/`);
  }

  // ========================== LICENSE TYPE MANAGEMENT ==========================

  // Adds a new license type
  addLicenseType(licenseType: LicenseType): Observable<any> {
    return this.http.post(`${this.mastersUrl}/licensetypes/create/`, licenseType);
  }

  // Updates an existing license type by ID
  updateLicenseType(id: number, changes: Partial<LicenseType>): Observable<LicenseType> {
    return this.http.put<LicenseType>(`${this.mastersUrl}/licensetypes/update/${id}/`, changes);
  }

  // Deletes a license type by ID
  deleteLicenseType(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/licensetypes/delete/${id}/`);
  }

  // ========================== LICENSE CATEGORY MANAGEMENT ==========================

  // Adds a new license category
  addLicenseCategory(category: LicenseCategory): Observable<any> {
    return this.http.post(`${this.mastersUrl}/licensecategories/create/`, category);
  }

  // Updates an existing license category by ID
  updateLicenseCategory(id: number, changes: Partial<LicenseCategory>): Observable<LicenseCategory> {
    return this.http.put<LicenseCategory>(`${this.mastersUrl}/licensecategories/update/${id}/`, changes);
  }

  // Deletes a license category by ID
  deleteLicenseCategory(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/licensecategories/delete/${id}/`);
  }
}
