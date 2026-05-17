import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LicenseFee } from '../models/license-fee.model';
/**
 * Master Service - Complete Version with All Endpoints
 * 
 * Handles all API calls to Django backend master data endpoints
 * ✅ Includes: All original endpoints + 3 new tables (LocationCategory, LocationSubcategory, Ward)
 * 
 * PRODUCTION READY - 2025
 */
@Injectable({
  providedIn: 'root'
})
export class MasterService {



  // Base URL for all master data endpoints
  private readonly BASE_URL = `${environment.apiBaseUrl}/masters/core`;
  private readonly MASTERS_URL = `${environment.apiBaseUrl}/masters`;

  // User endpoints (licensee profiles live here)
  private readonly USER_BASE_URL = `${environment.apiBaseUrl}/auth/users`;

  // =========================================================================
  // ENDPOINT URLs
  // =========================================================================
  private readonly LICENSEE_PROFILE_URL = `${this.USER_BASE_URL}/licensee-profiles`;
  private readonly LICENSE_CATEGORY_URL = `${this.BASE_URL}/license-categories`;
  private readonly LICENSE_TYPE_URL = `${this.BASE_URL}/license-types`;
  private readonly STATE_URL = `${this.BASE_URL}/states`;
  private readonly DISTRICT_URL = `${this.BASE_URL}/districts`;
  private readonly SUBDIVISION_URL = `${this.BASE_URL}/subdivisions`;
  private readonly POLICE_STATION_URL = `${this.BASE_URL}/police-stations`;
  private readonly LICENSE_SUBCATEGORY_URL = `${this.BASE_URL}/license-subcategories`;
  private readonly LICENSE_TITLE_URL = `${this.BASE_URL}/license-titles`;
  private readonly ROAD_URL = `${this.BASE_URL}/roads`;
  private readonly NOTIFICATION_URL = `${this.MASTERS_URL}/notification`;
  private readonly LOCATION_URL = `${this.BASE_URL}/locations`;
  private readonly LICENSE_FEE_URL = `${this.BASE_URL}/license-fees`;

  // ✅ NEW: Endpoints for the 3 new tables
  private readonly LOCATION_CATEGORY_URL = `${this.BASE_URL}/location-categories`;
  private readonly LOCATION_SUBCATEGORY_URL = `${this.BASE_URL}/location-subcategories`;
  private readonly WARD_URL = `${this.BASE_URL}/wards`;

  constructor(private http: HttpClient) {

  }

  // =========================================================================
  // LICENSEE PROFILE ENDPOINTS
  // =========================================================================

  getLicenseeProfiles(): Observable<any> {
    return this.http.get(`${this.LICENSEE_PROFILE_URL}/`);
  }

  // ✅ NEW: Get current user's own profile (no ID needed)
  getMyLicenseeProfile(): Observable<any> {
    return this.http.get(`${this.LICENSEE_PROFILE_URL}/me/`);
  }

  patchMyLicenseeProfile(data: any): Observable<any> {
    return this.http.patch(`${this.LICENSEE_PROFILE_URL}/me/`, data);
  }

  getLicenseeProfile(id: number): Observable<any> {
    return this.http.get(`${this.LICENSEE_PROFILE_URL}/${id}/`);
  }

  createLicenseeProfile(data: any): Observable<any> {
    return this.http.post(`${this.LICENSEE_PROFILE_URL}/me/`, data);
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
    if (id !== undefined) {
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

  getSubdivision(id?: number): Observable<any> {
    if (id !== undefined) {
      return this.http.get(`${this.SUBDIVISION_URL}/${id}/`);
    }
    return this.http.get(`${this.SUBDIVISION_URL}/`);
  }

  getSubdivisionsByDistrict(districtCode: string | number): Observable<any> {
    return this.http.get(`${this.SUBDIVISION_URL}/?district=${districtCode}`);
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
  // NOTIFICATION ENDPOINTS
  // =========================================================================

  getNotifications(): Observable<any> {
    return this.http.get<any[]>(`${this.NOTIFICATION_URL}/list/`).pipe(
      map((data) => this.mapNotifications(data))
    );
  }

  getPublicNotifications(limit?: number): Observable<any> {
    const suffix = limit ? `?limit=${limit}` : '';
    return this.http.get<any[]>(`${this.NOTIFICATION_URL}/public/${suffix}`).pipe(
      map((data) => this.mapNotifications(data))
    );
  }

  private mapNotifications(data: any): any[] {
    if (!Array.isArray(data)) return [];
    return data.map((notification) => this.mapNotification(notification));
  }

  private mapNotification(notification: any): any {
    return {
      ...notification,
      notificationDate: notification.notificationDate ?? notification.notification_date,
      notificationFile: notification.notificationFile ?? notification.notification_file,
      notificationFileUrl: notification.notificationFileUrl ?? notification.notification_file_url,
      notificationFileDownloadUrl: notification.notificationFileDownloadUrl ?? notification.notification_file_download_url,
      isActive: notification.isActive ?? notification.is_active,
    };
  }
  getNotification(id: number): Observable<any> {
    return this.http.get(`${this.NOTIFICATION_URL}/detail/${id}/`);
  }

  createNotification(data: any): Observable<any> {
    return this.http.post(`${this.NOTIFICATION_URL}/create/`, data);
  }

  updateNotification(id: number, data: any): Observable<any> {
    return this.http.put(`${this.NOTIFICATION_URL}/update/${id}/`, data);
  }

  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.NOTIFICATION_URL}/delete/${id}/`);
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

  /**
   * ✅ Get locations filtered by district
   */
  getLocationsByDistrict(districtCode: string | number): Observable<any> {
    return this.http.get(`${this.LOCATION_URL}/?district=${districtCode}`);
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

  lookupLicenseFee(
    licenseCategoryId: number | string,
    licenseSubcategoryId: number | string,
    locationCode: number | string
  ): Observable<LicenseFee> {
    const params = new HttpParams()
      .set('license_category_id', String(licenseCategoryId))
      .set('license_subcategory_id', String(licenseSubcategoryId))
      .set('location_code', String(locationCode));

    return this.http.get<LicenseFee>(`${this.LICENSE_FEE_URL}/lookup/`, { params });
  }

  /** Categories that have at least one active fee record */
  getLicenseFeeAvailableCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.LICENSE_FEE_URL}/available-categories/`);
  }

  /** Subcategories that have a fee record for the given category */
  getLicenseFeeAvailableSubcategories(licenseCategoryId: number | string): Observable<any[]> {
    const params = new HttpParams().set('license_category_id', String(licenseCategoryId));
    return this.http.get<any[]>(`${this.LICENSE_FEE_URL}/available-subcategories/`, { params });
  }

  /** Locations that have a fee record for the given category + subcategory */
  getLicenseFeeAvailableLocations(licenseCategoryId: number | string, licenseSubcategoryId: number | string): Observable<any[]> {
    const params = new HttpParams()
      .set('license_category_id', String(licenseCategoryId))
      .set('license_subcategory_id', String(licenseSubcategoryId));
    return this.http.get<any[]>(`${this.LICENSE_FEE_URL}/available-locations/`, { params });
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

  // =========================================================================
  // ✅ NEW: LOCATION CATEGORY ENDPOINTS
  // =========================================================================

  /**
   * Get all location categories (Urban, Rural, Hill Station, etc.)
   */
  getLocationCategories(): Observable<any> {
    return this.http.get(`${this.LOCATION_CATEGORY_URL}/`);
  }

  /**
   * Get single location category by ID
   */
  getLocationCategory(id: number): Observable<any> {
    return this.http.get(`${this.LOCATION_CATEGORY_URL}/${id}/`);
  }

  createLocationCategory(data: any): Observable<any> {
    return this.http.post(`${this.LOCATION_CATEGORY_URL}/create/`, data);
  }

  updateLocationCategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.LOCATION_CATEGORY_URL}/${id}/update/`, data);
  }

  deleteLocationCategory(id: number): Observable<any> {
    return this.http.delete(`${this.LOCATION_CATEGORY_URL}/${id}/delete/`);
  }

  // =========================================================================
  // ✅ NEW: LOCATION SUBCATEGORY ENDPOINTS
  // =========================================================================

  /**
   * Get all location subcategories
   */
  getLocationSubcategories(): Observable<any> {
    return this.http.get(`${this.LOCATION_SUBCATEGORY_URL}/`);
  }

  /**
   * Get single location subcategory by ID
   */
  getLocationSubcategory(id: number): Observable<any> {
    return this.http.get(`${this.LOCATION_SUBCATEGORY_URL}/${id}/`);
  }

  /**
   * ✅ Get location subcategories filtered by category
   */
  getLocationSubcategoriesByCategory(categoryId: number): Observable<any> {
    return this.http.get(`${this.LOCATION_SUBCATEGORY_URL}/?category_id=${categoryId}`);
  }

  createLocationSubcategory(data: any): Observable<any> {
    return this.http.post(`${this.LOCATION_SUBCATEGORY_URL}/create/`, data);
  }

  updateLocationSubcategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.LOCATION_SUBCATEGORY_URL}/${id}/update/`, data);
  }

  deleteLocationSubcategory(id: number): Observable<any> {
    return this.http.delete(`${this.LOCATION_SUBCATEGORY_URL}/${id}/delete/`);
  }

  // =========================================================================
  // ✅ NEW: WARD ENDPOINTS
  // =========================================================================

  /**
   * Get all wards
   */
  getWards(): Observable<any> {
    return this.http.get(`${this.WARD_URL}/`);
  }

  /**
   * Get single ward by ID
   */
  getWard(id: number): Observable<any> {
    return this.http.get(`${this.WARD_URL}/${id}/`);
  }

  /**
   * ✅ Get wards filtered by location code
   */
  getWardsByLocation(locationCode: string | number): Observable<any> {
    return this.http.get(`${this.WARD_URL}/?location_code=${locationCode}`);
  }

  createWard(data: any): Observable<any> {
    return this.http.post(`${this.WARD_URL}/create/`, data);
  }

  updateWard(id: number, data: any): Observable<any> {
    return this.http.put(`${this.WARD_URL}/${id}/update/`, data);
  }

  deleteWard(id: number): Observable<any> {
    return this.http.delete(`${this.WARD_URL}/${id}/delete/`);
  }
}
