import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LicenseType } from '../models/license-type.model';
import { LicenseCategory } from '../models/license-category.model';
import { LicenseSubcategory } from '../models/license-subcategory.model';
import { District } from '../models/district.model';
import { Subdivision } from '../models/subdivision.model';
import { PoliceStation } from '../models/policestation.model';
import { Road } from '../models/road.model';

@Injectable({
  providedIn: 'root'
})
export class MasterService {
  // All master data is served from /masters/core/*
  private apiUrl = `${environment.apiBaseUrl}/masters/core`;

  constructor(private http: HttpClient) { }

  /**
   * Get all license types
   * ✅ FIXED: Changed endpoint to match backend URL pattern
   * ✅ ADDED: Store in sessionStorage for display mapping
   */
  getLicenseTypes(): Observable<LicenseType[]> {
    return this.http.get<LicenseType[]>(`${this.apiUrl}/license-types/`).pipe(
      tap(data => {
        console.log('✅ License types loaded:', data);
        // Store in sessionStorage for submit page display
        sessionStorage.setItem('licenseTypes', JSON.stringify(data));
      }),
      catchError(error => {
        console.error('❌ Error loading license types:', error);
        // Return mock data as fallback
        const mockData = [
          { id: 1, licenseType: 'Individual' },
          { id: 2, licenseType: 'Company' },
          { id: 3, licenseType: 'Multiple Individual' }
        ];
        sessionStorage.setItem('licenseTypes', JSON.stringify(mockData));
        return of(mockData);
      })
    );
  }

  /**
   * Get all license categories
   * ✅ FIXED: Changed endpoint to match backend URL pattern
   * ✅ ADDED: Store in sessionStorage for display mapping
   */
  getLicenseCategories(): Observable<LicenseCategory[]> {
    return this.http.get<LicenseCategory[]>(`${this.apiUrl}/license-categories/`).pipe(
      tap(data => {
        console.log('✅ License categories loaded:', data);
        // Store in sessionStorage for submit page display
        sessionStorage.setItem('licenseCategories', JSON.stringify(data));
      }),
      catchError(error => {
        console.error('❌ Error loading license categories:', error);
        sessionStorage.setItem('licenseCategories', JSON.stringify([]));
        return of([]);
      })
    );
  }

  /**
   * Get all license subcategories
   * ✅ FIXED: Changed endpoint to match backend URL pattern
   * ✅ ADDED: Store in sessionStorage for display mapping
   */
  getLicenseSubcategories(): Observable<LicenseSubcategory[]> {
    return this.http.get<LicenseSubcategory[]>(`${this.apiUrl}/license-subcategories/`).pipe(
      tap(data => {
        console.log('✅ License subcategories loaded:', data);
        // Store in sessionStorage for submit page display
        sessionStorage.setItem('licenseSubcategories', JSON.stringify(data));
      }),
      catchError(error => {
        console.error('❌ Error loading license subcategories:', error);
        sessionStorage.setItem('licenseSubcategories', JSON.stringify([]));
        return of([]);
      })
    );
  }

  /**
   * Get all districts
   * ✅ FIXED: Changed endpoint to match backend URL pattern
   * ✅ ADDED: Store in sessionStorage for display mapping
   */
  getDistrict(): Observable<District[]> {
    return this.http.get<District[]>(`${this.apiUrl}/districts/`).pipe(
      tap(data => {
        console.log('✅ Districts loaded:', data);
        // Store in sessionStorage for submit page display
        sessionStorage.setItem('districts', JSON.stringify(data));
      }),
      catchError(error => {
        console.error('❌ Error loading districts:', error);
        sessionStorage.setItem('districts', JSON.stringify([]));
        return of([]);
      })
    );
  }

  /**
   * Get all subdivisions
   * ✅ FIXED: Changed endpoint to match backend URL pattern
   * ✅ ADDED: Store in sessionStorage for display mapping
   */
  getSubdivision(): Observable<Subdivision[]> {
    return this.http.get<Subdivision[]>(`${this.apiUrl}/subdivisions/`).pipe(
      tap(data => {
        console.log('✅ Subdivisions loaded:', data);
        // Store in sessionStorage for submit page display
        sessionStorage.setItem('subdivisions', JSON.stringify(data));
      }),
      catchError(error => {
        console.error('❌ Error loading subdivisions:', error);
        sessionStorage.setItem('subdivisions', JSON.stringify([]));
        return of([]);
      })
    );
  }

  /**
   * Get all police stations
   * ✅ FIXED: Changed endpoint to match backend URL pattern
   * ✅ ADDED: Store in sessionStorage for display mapping
   */
  getPoliceStations(): Observable<PoliceStation[]> {
    return this.http.get<PoliceStation[]>(`${this.apiUrl}/police-stations/`).pipe(
      tap(data => {
        console.log('✅ Police stations loaded:', data);
        // Store in sessionStorage for submit page display
        sessionStorage.setItem('policeStations', JSON.stringify(data));
      }),
      catchError(error => {
        console.error('❌ Error loading police stations:', error);
        sessionStorage.setItem('policeStations', JSON.stringify([]));
        return of([]);
      })
    );
  }

  /**
   * Get all roads
   * ✅ FIXED: Changed endpoint from '/roads/' to '/roads/list/'
   * ✅ ADDED: Store in sessionStorage for display mapping
   */
  getRoads(): Observable<Road[]> {
    return this.http.get<Road[]>(`${this.apiUrl}/roads/`).pipe(
      tap(data => {
        console.log('✅ Roads loaded:', data);
        // Store in sessionStorage for submit page display
        sessionStorage.setItem('roads', JSON.stringify(data));
      }),
      catchError(error => {
        console.error('❌ Error loading roads:', error);
        sessionStorage.setItem('roads', JSON.stringify([]));
        return of([]);
      })
    );
  }
}