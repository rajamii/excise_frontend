import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Master Service - Direct Django Connection
 * 
 * IMPORTANT: Class name is MasterService (not MastersService)
 * to match existing imports throughout the codebase
 */
@Injectable({
  providedIn: 'root'
})
export class MasterService {
  
  // Django backend base URL
  private readonly DJANGO_BASE = 'http://localhost:8000';
  
  // Base URL for all master data endpoints
  private readonly BASE_URL = `${this.DJANGO_BASE}/masters/core`;
  
  // Specific endpoint URLs
  private readonly LICENSEE_PROFILE_URL = `${this.BASE_URL}/licensee-profiles`;
  private readonly LICENSE_CATEGORY_URL = `${this.BASE_URL}/license-categories`;
  private readonly LICENSE_TYPE_URL = `${this.BASE_URL}/license-types`;
  private readonly STATE_URL = `${this.BASE_URL}/states`;
  private readonly DISTRICT_URL = `${this.BASE_URL}/districts`;
  private readonly SUBDIVISION_URL = `${this.BASE_URL}/subdivisions`;
  private readonly POLICE_STATION_URL = `${this.BASE_URL}/police-stations`;
  private readonly LICENSE_SUBCATEGORY_URL = `${this.BASE_URL}/license-subcategories`;
  private readonly LICENSE_TITLE_URL = `${this.BASE_URL}/license-titles`;
  private readonly ROAD_URL = `${this.BASE_URL}/roads`;
  private readonly LOCATION_URL = `${this.BASE_URL}/locations`;
  private readonly LICENSE_FEE_URL = `${this.BASE_URL}/license-fees`;

  constructor(private http: HttpClient) {
    console.log('🔧 MasterService initialized');
    console.log('📍 Django Base:', this.DJANGO_BASE);
    console.log('📍 Base URL:', this.BASE_URL);
  }

  // =========================================================================
  // LICENSEE PROFILE ENDPOINTS
  // =========================================================================

  getLicenseeProfiles(): Observable<any> {
    return this.http.get(`${this.LICENSEE_PROFILE_URL}/`);
  }

  getLicenseeProfile(id: number): Observable<any> {
    return this.http.get(`${this.LICENSEE_PROFILE_URL}/${id}/`);
  }

  createLicenseeProfile(data: any): Observable<any> {
    return this.http.post(`${this.LICENSEE_PROFILE_URL}/create/`, data);
  }

  updateLicenseeProfile(id: number, data: any): Observable<any> {
    return this.http.put(`${this.LICENSEE_PROFILE_URL}/${id}/update/`, data);
  }

  patchLicenseeProfile(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.LICENSEE_PROFILE_URL}/${id}/update/`, data);
  }

  deleteLicenseeProfile(id: number): Observable<any> {
    return this.http.delete(`${this.LICENSEE_PROFILE_URL}/${id}/delete/`);
  }

  // =========================================================================
  // LICENSE CATEGORY ENDPOINTS
  // =========================================================================

  getLicenseCategories(): Observable<any> {
    return this.http.get(`${this.LICENSE_CATEGORY_URL}/`);
  }

  getLicenseCategory(id: number): Observable<any> {
    return this.http.get(`${this.LICENSE_CATEGORY_URL}/${id}/`);
  }

  createLicenseCategory(data: any): Observable<any> {
    return this.http.post(`${this.LICENSE_CATEGORY_URL}/create/`, data);
  }

  updateLicenseCategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.LICENSE_CATEGORY_URL}/${id}/update/`, data);
  }

  deleteLicenseCategory(id: number): Observable<any> {
    return this.http.delete(`${this.LICENSE_CATEGORY_URL}/${id}/delete/`);
  }

  // =========================================================================
  // LICENSE TYPE ENDPOINTS
  // =========================================================================

  getLicenseTypes(): Observable<any> {
    return this.http.get(`${this.LICENSE_TYPE_URL}/`);
  }

  getLicenseType(id: number): Observable<any> {
    return this.http.get(`${this.LICENSE_TYPE_URL}/${id}/`);
  }

  createLicenseType(data: any): Observable<any> {
    return this.http.post(`${this.LICENSE_TYPE_URL}/create/`, data);
  }

  updateLicenseType(id: number, data: any): Observable<any> {
    return this.http.put(`${this.LICENSE_TYPE_URL}/${id}/update/`, data);
  }

  deleteLicenseType(id: number): Observable<any> {
    return this.http.delete(`${this.LICENSE_TYPE_URL}/${id}/delete/`);
  }

  // =========================================================================
  // STATE ENDPOINTS
  // =========================================================================

  getStates(): Observable<any> {
    return this.http.get(`${this.STATE_URL}/`);
  }

  getState(id: number): Observable<any> {
    return this.http.get(`${this.STATE_URL}/${id}/`);
  }

  createState(data: any): Observable<any> {
    return this.http.post(`${this.STATE_URL}/create/`, data);
  }

  updateState(id: number, data: any): Observable<any> {
    return this.http.put(`${this.STATE_URL}/${id}/update/`, data);
  }

  deleteState(id: number): Observable<any> {
    return this.http.delete(`${this.STATE_URL}/${id}/delete/`);
  }

  // =========================================================================
  // DISTRICT ENDPOINTS
  // =========================================================================

  getDistricts(): Observable<any> {
    return this.http.get(`${this.DISTRICT_URL}/`);
  }

  getDistrict(id?: number): Observable<any> {
    if (id) {
      return this.http.get(`${this.DISTRICT_URL}/${id}/`);
    }
    return this.http.get(`${this.DISTRICT_URL}/`);
  }

  createDistrict(data: any): Observable<any> {
    return this.http.post(`${this.DISTRICT_URL}/create/`, data);
  }

  updateDistrict(id: number, data: any): Observable<any> {
    return this.http.put(`${this.DISTRICT_URL}/${id}/update/`, data);
  }

  deleteDistrict(id: number): Observable<any> {
    return this.http.delete(`${this.DISTRICT_URL}/${id}/delete/`);
  }

  // =========================================================================
  // SUBDIVISION ENDPOINTS
  // =========================================================================

  getSubdivisions(): Observable<any> {
    return this.http.get(`${this.SUBDIVISION_URL}/`);
  }

  getSubdivision(id: number): Observable<any> {
    return this.http.get(`${this.SUBDIVISION_URL}/${id}/`);
  }

  createSubdivision(data: any): Observable<any> {
    return this.http.post(`${this.SUBDIVISION_URL}/create/`, data);
  }

  updateSubdivision(id: number, data: any): Observable<any> {
    return this.http.put(`${this.SUBDIVISION_URL}/${id}/update/`, data);
  }

  deleteSubdivision(id: number): Observable<any> {
    return this.http.delete(`${this.SUBDIVISION_URL}/${id}/delete/`);
  }

  // =========================================================================
  // POLICE STATION ENDPOINTS
  // =========================================================================

  getPoliceStations(): Observable<any> {
    return this.http.get(`${this.POLICE_STATION_URL}/`);
  }

  getPoliceStation(id: number): Observable<any> {
    return this.http.get(`${this.POLICE_STATION_URL}/${id}/`);
  }

  createPoliceStation(data: any): Observable<any> {
    return this.http.post(`${this.POLICE_STATION_URL}/create/`, data);
  }

  updatePoliceStation(id: number, data: any): Observable<any> {
    return this.http.put(`${this.POLICE_STATION_URL}/${id}/update/`, data);
  }

  deletePoliceStation(id: number): Observable<any> {
    return this.http.delete(`${this.POLICE_STATION_URL}/${id}/delete/`);
  }

  // =========================================================================
  // LICENSE SUBCATEGORY ENDPOINTS
  // =========================================================================

  getLicenseSubcategories(): Observable<any> {
    return this.http.get(`${this.LICENSE_SUBCATEGORY_URL}/`);
  }

  getLicenseSubcategory(id: number): Observable<any> {
    return this.http.get(`${this.LICENSE_SUBCATEGORY_URL}/${id}/`);
  }

  createLicenseSubcategory(data: any): Observable<any> {
    return this.http.post(`${this.LICENSE_SUBCATEGORY_URL}/create/`, data);
  }

  updateLicenseSubcategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.LICENSE_SUBCATEGORY_URL}/${id}/update/`, data);
  }

  deleteLicenseSubcategory(id: number): Observable<any> {
    return this.http.delete(`${this.LICENSE_SUBCATEGORY_URL}/${id}/delete/`);
  }

  // =========================================================================
  // LICENSE TITLE ENDPOINTS
  // =========================================================================

  getLicenseTitles(): Observable<any> {
    return this.http.get(`${this.LICENSE_TITLE_URL}/`);
  }

  getLicenseTitle(id: number): Observable<any> {
    return this.http.get(`${this.LICENSE_TITLE_URL}/${id}/`);
  }

  createLicenseTitle(data: any): Observable<any> {
    return this.http.post(`${this.LICENSE_TITLE_URL}/create/`, data);
  }

  updateLicenseTitle(id: number, data: any): Observable<any> {
    return this.http.put(`${this.LICENSE_TITLE_URL}/${id}/update/`, data);
  }

  deleteLicenseTitle(id: number): Observable<any> {
    return this.http.delete(`${this.LICENSE_TITLE_URL}/${id}/delete/`);
  }

  // =========================================================================
  // ROAD ENDPOINTS
  // =========================================================================

  getRoads(): Observable<any> {
    return this.http.get(`${this.ROAD_URL}/`);
  }

  getRoad(id: number): Observable<any> {
    return this.http.get(`${this.ROAD_URL}/${id}/`);
  }

  createRoad(data: any): Observable<any> {
    return this.http.post(`${this.ROAD_URL}/create/`, data);
  }

  updateRoad(id: number, data: any): Observable<any> {
    return this.http.put(`${this.ROAD_URL}/${id}/update/`, data);
  }

  deleteRoad(id: number): Observable<any> {
    return this.http.delete(`${this.ROAD_URL}/${id}/delete/`);
  }

  // =========================================================================
  // LOCATION ENDPOINTS
  // =========================================================================

  getLocations(): Observable<any> {
    return this.http.get(`${this.LOCATION_URL}/`);
  }

  getLocation(id: number): Observable<any> {
    return this.http.get(`${this.LOCATION_URL}/${id}/`);
  }

  createLocation(data: any): Observable<any> {
    return this.http.post(`${this.LOCATION_URL}/create/`, data);
  }

  updateLocation(id: number, data: any): Observable<any> {
    return this.http.put(`${this.LOCATION_URL}/${id}/update/`, data);
  }

  deleteLocation(id: number): Observable<any> {
    return this.http.delete(`${this.LOCATION_URL}/${id}/delete/`);
  }

  // =========================================================================
  // LICENSE FEE ENDPOINTS
  // =========================================================================

  getLicenseFees(): Observable<any> {
    return this.http.get(`${this.LICENSE_FEE_URL}/`);
  }

  getLicenseFee(id: number): Observable<any> {
    return this.http.get(`${this.LICENSE_FEE_URL}/${id}/`);
  }

  createLicenseFee(data: any): Observable<any> {
    return this.http.post(`${this.LICENSE_FEE_URL}/create/`, data);
  }

  updateLicenseFee(id: number, data: any): Observable<any> {
    return this.http.put(`${this.LICENSE_FEE_URL}/${id}/update/`, data);
  }

  deleteLicenseFee(id: number): Observable<any> {
    return this.http.delete(`${this.LICENSE_FEE_URL}/${id}/delete/`);
  }
}