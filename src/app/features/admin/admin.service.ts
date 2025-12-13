import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { District } from '../../core/models/district.model';
import { Subdivision } from '../../core/models/subdivision.model';
import { PoliceStation } from '../../core/models/policestation.model';
import { LicenseType } from '../../core/models/license-type.model';
import { LicenseCategory } from '../../core/models/license-category.model';
import { LicenseSubcategory } from '../../core/models/license-subcategory.model';
import { LicenseTitle } from '../../core/models/license-title.model';
import { Road } from '../../core/models/road.model';
import { Account } from '../../core/models/account.model';
import { Role } from '../../core/models/role.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly authUrl = `${this.baseUrl}/auth`;
  private readonly mastersUrl = `${this.baseUrl}/masters/core`;

  constructor(private http: HttpClient) { }

  // ========================== USER MANAGEMENT ==========================

  // Register a new user (addUser)
  addUser(user: Account): Observable<any> {
    return this.http.post(`${this.authUrl}/users/register/`, user);
  }

  // Update existing user (backend expects username)
  updateUser(id: number, user: Account): Observable<Account> {
    return this.http.put<Account>(`${this.authUrl}/users/${id}/update/`, user);
  }

  // Get all users
  getUsers(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.authUrl}/users/`);
  }

  // Get user by username
  getUserByUsername(id: string | number): Observable<Account> {
    return this.http.get<Account>(`${this.authUrl}/users/${id}/detail/`);
  }

  // Get currently logged-in user (backend: detail/me/)
  getCurrentUser(): Observable<Account> {
    return this.http.get<Account>(`${this.authUrl}/users/me/`);
  }

  // Delete user by username (backend uses username)
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.authUrl}/users/${id}/delete/`);
  }

  // ========================== ROLE MANAGEMENT ==========================

  // Get all roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.authUrl}/roles/`);
  }

  // Add a new role
  addRole(role: Role): Observable<Role> {
    return this.http.post<Role>(`${this.authUrl}/roles/create/`, role);
  }

  // Update an existing role
  updateRole(id: number, role: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(`${this.authUrl}/roles/${id}/update/`, role);
  }

  // Delete a role
  deleteRole(id: number): Observable<any> {
    return this.http.delete(`${this.authUrl}/roles/${id}/delete/`);
  }

  // ========================== DISTRICT MANAGEMENT ==========================

  // Adds a new district record (saveDistrict/addDistrict)
  saveDistrict(district: District): Observable<any> {
    return this.http.post(`${this.mastersUrl}/districts/create/`, district);
  }

  // Alias for consistency
  addDistrict(district: District): Observable<any> {
    return this.saveDistrict(district);
  }

  updateDistrict(id: number, changes: Partial<District>): Observable<District> {
    return this.http.put<District>(`${this.mastersUrl}/districts/${id}/update/`, changes);
  }

  deleteDistrict(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/districts/${id}/delete/`);
  }

  getDistricts(): Observable<District[]> {
    return this.http.get<District[]>(`${this.mastersUrl}/districts/`);
  }

  // ========================== SUBDIVISION MANAGEMENT ==========================

  // Adds a new subdivision
  saveSubDivision(subdivision: Subdivision): Observable<any> {
    return this.http.post(`${this.mastersUrl}/subdivisions/create/`, subdivision);
  }

  // Alias for consistency
  addSubdivision(subdivision: Subdivision): Observable<any> {
    return this.saveSubDivision(subdivision);
  }

  // Updates an existing subdivision by ID
  updateSubDivision(id: number, changes: Partial<Subdivision>): Observable<Subdivision> {
    return this.http.put<Subdivision>(`${this.mastersUrl}/subdivisions/${id}/update/`, changes);
  }

  // Alias for consistency
  updateSubdivision(id: number, changes: Partial<Subdivision>): Observable<Subdivision> {
    return this.updateSubDivision(id, changes);
  }

  deleteSubdivision(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/subdivisions/${id}/delete/`);
  }

  getSubdivisions(): Observable<Subdivision[]> {
    return this.http.get<Subdivision[]>(`${this.mastersUrl}/subdivisions/`);
  }

  // ========================== POLICE STATION MANAGEMENT ==========================

  addPoliceStation(policeStation: PoliceStation): Observable<any> {
    return this.http.post(`${this.mastersUrl}/police-stations/create/`, policeStation);
  }

  // Updates a police station's details by ID (fixed endpoint path)
  updatePolicestation(id: number, changes: Partial<PoliceStation>): Observable<PoliceStation> {
    return this.http.put<PoliceStation>(`${this.mastersUrl}/police-stations/${id}/update/`, changes);
  }

  // Alias for consistency
  updatePoliceStation(id: number, changes: Partial<PoliceStation>): Observable<PoliceStation> {
    return this.updatePolicestation(id, changes);
  }

  deletePoliceStation(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/police-stations/${id}/delete/`);
  }

  getPoliceStations(): Observable<PoliceStation[]> {
    return this.http.get<PoliceStation[]>(`${this.mastersUrl}/police-stations/`);
  }

  // ========================== LICENSE TYPE MANAGEMENT ==========================

  addLicenseType(licenseType: LicenseType): Observable<any> {
    return this.http.post(`${this.mastersUrl}/license-types/create/`, licenseType);
  }

  updateLicenseType(id: number, changes: Partial<LicenseType>): Observable<LicenseType> {
    return this.http.put<LicenseType>(`${this.mastersUrl}/license-types/${id}/update/`, changes);
  }

  deleteLicenseType(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/license-types/${id}/delete/`);
  }

  getLicenseTypes(): Observable<LicenseType[]> {
    return this.http.get<LicenseType[]>(`${this.mastersUrl}/license-types/`);
  }

  // ========================== LICENSE CATEGORY MANAGEMENT ==========================

  addLicenseCategory(category: LicenseCategory): Observable<any> {
    return this.http.post(`${this.mastersUrl}/license-categories/create/`, category);
  }

  updateLicenseCategory(id: number, changes: Partial<LicenseCategory>): Observable<LicenseCategory> {
    return this.http.put<LicenseCategory>(`${this.mastersUrl}/license-categories/${id}/update/`, changes);
  }

  deleteLicenseCategory(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/license-categories/${id}/delete/`);
  }

  getLicenseCategories(): Observable<LicenseCategory[]> {
    return this.http.get<LicenseCategory[]>(`${this.mastersUrl}/license-categories/`);
  }

  // ========================== LICENSE SUBCATEGORY MANAGEMENT ==========================

  getLicenseSubcategories(): Observable<LicenseSubcategory[]> {
    return this.http.get<LicenseSubcategory[]>(`${this.mastersUrl}/license-subcategories/`);
  }

  addLicenseSubcategory(subcategory: LicenseSubcategory): Observable<LicenseSubcategory> {
    return this.http.post<LicenseSubcategory>(`${this.mastersUrl}/license-subcategories/create/`, subcategory);
  }

  updateLicenseSubcategory(id: number, subcategory: Partial<LicenseSubcategory>): Observable<LicenseSubcategory> {
    return this.http.put<LicenseSubcategory>(`${this.mastersUrl}/license-subcategories/${id}/update/`, subcategory);
  }

  deleteLicenseSubcategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.mastersUrl}/license-subcategories/${id}/delete/`);
  }

  // ========================== LICENSE TITLE MANAGEMENT ==========================

  getLicenseTitles(): Observable<LicenseTitle[]> {
    return this.http.get<LicenseTitle[]>(`${this.mastersUrl}/license-titles/`);
  }

  addLicenseTitle(title: LicenseTitle): Observable<LicenseTitle> {
    return this.http.post<LicenseTitle>(`${this.mastersUrl}/license-titles/create/`, title);
  }

  updateLicenseTitle(id: number, title: Partial<LicenseTitle>): Observable<LicenseTitle> {
    return this.http.put<LicenseTitle>(`${this.mastersUrl}/license-titles/${id}/update/`, title);
  }

  deleteLicenseTitle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.mastersUrl}/license-titles/${id}/delete/`);
  }

  // ========================== ROAD MANAGEMENT ==========================

  getRoads(): Observable<Road[]> {
    return this.http.get<Road[]>(`${this.mastersUrl}/roads/`);
  }

  addRoad(road: Road): Observable<Road> {
    return this.http.post<Road>(`${this.mastersUrl}/roads/create/`, road);
  }

  updateRoad(id: number, road: Partial<Road>): Observable<Road> {
    return this.http.put<Road>(`${this.mastersUrl}/roads/${id}/update/`, road);
  }

  deleteRoad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.mastersUrl}/roads/${id}/delete/`);
  }
}