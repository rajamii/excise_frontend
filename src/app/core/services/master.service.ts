import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { District } from '../../core/models/district.model';
import { Subdivision } from '../../core/models/subdivision.model';
import { PoliceStation } from '../../core/models/policestation.model';
import { LicenseType } from '../../core/models/license-type.model';
import { LicenseCategory } from '../../core/models/license-category.model';
import { LicenseSubcategory } from '../models/license-subcategory.model';
import { LicenseTitle } from '../models/license-title.model';
import { Road } from '../models/road.model';

@Injectable({
  providedIn: 'root'
})
export class MasterService {
  private readonly baseUrl = `${environment.apiBaseUrl}/masters/core`;

  constructor(private http: HttpClient) { }

  // Fetches a list of all districts
  getDistrict(): Observable<District[]> {
    return this.http.get<District[]>(`${this.baseUrl}/districts`);
  }

  // Retrieves all subdivisions
  getSubdivision(): Observable<Subdivision[]> {
    return this.http.get<Subdivision[]>(`${this.baseUrl}/subdivisions`);
  }

  // Gets subdivisions filtered by a specific district ID
  getSubDivisionByDistrictCode(id: number): Observable<Subdivision[]> {
    return this.http.get<Subdivision[]>(`${this.baseUrl}/subdivisions/${id}`);
  }

  // Retrieves all police stations
  getPoliceStations(): Observable<PoliceStation[]> {
    return this.http.get<PoliceStation[]>(`${this.baseUrl}/police-stations`);
  }

  // Retrieves police stations within a specified subdivision (by code)
  getPoliceStationBySubDivision(code: number): Observable<PoliceStation[]> {
    return this.http.get<PoliceStation[]>(`${this.baseUrl}/subdivision/detail/${code}`);
  }

  // Fetches all available license types
  getLicenseTypes(): Observable<LicenseType[]> {
    return this.http.get<LicenseType[]>(`${this.baseUrl}/license-types`);
  }

  // Fetches all license categories
  getLicenseCategories(): Observable<LicenseCategory[]> {
    return this.http.get<LicenseCategory[]>(`${this.baseUrl}/license-categories`);
  }

  // Fetches all license subcategories
  getLicenseSubcategories(): Observable<LicenseSubcategory[]> {
    return this.http.get<LicenseSubcategory[]>(`${this.baseUrl}/license-subcategories`);
  }

  // Fetches all available license titles
  getLicenseTitles(): Observable<LicenseTitle[]> {
    return this.http.get<LicenseTitle[]>(`${this.baseUrl}/license-titles`);
  }

  // Fetches all available roads
  getRoads(): Observable<Road[]> {
    return this.http.get<Road[]>(`${this.baseUrl}/roads`);
  }
}
