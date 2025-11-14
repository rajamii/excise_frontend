import { Injectable } from '@angular/core';
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

  constructor(private http: HttpClient) { }

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

  updateDistrict(id: number, changes: Partial<District>): Observable<District> {
    return this.http.put<District>(`${this.mastersUrl}/districts/${id}/update/`, changes);
  }

  deleteDistrict(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/districts/${id}/delete/`);
  }

  getDistricts(): Observable<District[]> {
    return this.http.get<District[]>(`${this.mastersUrl}/districts/list/`);
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

  deleteSubdivision(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/subdivisions/${id}/delete/`);
  }

  getSubdivisions(): Observable<Subdivision[]> {
    return this.http.get<Subdivision[]>(`${this.mastersUrl}/subdivisions/list/`);
  }

  // ========================== POLICE STATION MANAGEMENT ==========================
  addPoliceStation(policeStation: PoliceStation): Observable<any> {
    return this.http.post(`${this.mastersUrl}/police-stations/create/`, policeStation);
  }

  // Updates a police station’s details by ID
  updatePolicestation(id: number, changes: Partial<PoliceStation>): Observable<PoliceStation> {
    return this.http.put<PoliceStation>(`${this.mastersUrl}/policestations/update/${id}/`, changes);
  }

  deletePoliceStation(id: number): Observable<any> {
    return this.http.delete(`${this.mastersUrl}/police-stations/${id}/delete/`);
  }

  getPoliceStations(): Observable<PoliceStation[]> {
    return this.http.get<PoliceStation[]>(`${this.mastersUrl}/policestations/list/`);
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
    return this.http.get<LicenseType[]>(`${this.mastersUrl}/licensetypes/list/`);
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

  getLicenseCategories(): Observable<LicenseCategory[]> {
    return this.http.get<LicenseCategory[]>(`${this.mastersUrl}/licensecategories/list/`);
  }

  // ========================== LICENSE SUBCATEGORY MANAGEMENT ==========================
  getLicenseSubcategories(): Observable<LicenseSubcategory[]> {
    return this.http.get<LicenseSubcategory[]>(`${this.mastersUrl}/license-subcategories/list/`);
  }

  addLicenseSubcategory(subcategory: LicenseSubcategory): Observable<LicenseSubcategory> {
    return this.http.post<LicenseSubcategory>(`${this.mastersUrl}/license-subcategories/create/`, subcategory);
  }

  updateLicenseSubcategory(id: number, subcategory: Partial<LicenseSubcategory>): Observable<LicenseSubcategory> {
    return this.http.put<LicenseSubcategory>(`${this.mastersUrl}/license-subcategories/update/${id}/`, subcategory);
  }

  deleteLicenseSubcategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.mastersUrl}/license-subcategories/delete/${id}/`);
  }

  // ========================== LICENSE TITLE MANAGEMENT ==========================
  getLicenseTitles(): Observable<LicenseTitle[]> {
    return this.http.get<LicenseTitle[]>(`${this.mastersUrl}/licensetitles/list/`);
  }

  addLicenseTitle(title: LicenseTitle): Observable<LicenseTitle> {
    return this.http.post<LicenseTitle>(`${this.mastersUrl}/licensetitles/create/`, title);
  }

  updateLicenseTitle(id: number, title: Partial<LicenseTitle>): Observable<LicenseTitle> {
    return this.http.put<LicenseTitle>(`${this.mastersUrl}/licensetitles/update/${id}/`, title);
  }

  deleteLicenseTitle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.mastersUrl}/licensetitles/delete/${id}/`);
  }

  // ========================== ROAD MANAGEMENT ==========================
  getRoads(): Observable<Road[]> {
    return this.http.get<Road[]>(`${this.mastersUrl}/roads/list/`);
  }

  addRoad(road: Road): Observable<Road> {
    return this.http.post<Road>(`${this.mastersUrl}/roads/create/`, road);
  }

  updateRoad(id: number, road: Partial<Road>): Observable<Road> {
    return this.http.put<Road>(`${this.mastersUrl}/roads/update/${id}/`, road);
  }

  deleteRoad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.mastersUrl}/roads/delete/${id}/`);
  }
}
