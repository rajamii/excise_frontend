// src/app/core/services/master.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { District } from '../../core/models/district.model';
import { Subdivision } from '../../core/models/subdivision.model';
import { PoliceStation } from '../../core/models/policestation.model';
import { LicenseType } from '../../core/models/license-type.model';
import { LicenseCategory } from '../../core/models/license-category.model';
import { LicenseSubcategory } from '../models/license-subcategory.model';
import { LicenseTitle } from '../models/license-title.model';
import { Road } from '../models/road.model';

export interface BulkSpiritType {
  spritId: number;
  strengthFrom: string;
  strengthTo: string;
  priceBl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Checkpost {
  id: number;
  checkpost_name: string;
}

export interface Purpose {
  id: number;
  purpose_name: string;
}

export interface Distillery {
  id: number;
  distilleryName: string;
  distilleryAddress: string;
  distilleryState: string;
  viaRoute: string;
  distillery_name?: string;
  distillery_address?: string;
  distillery_state?: string;
  via_route?: string;
}

/**
 * NEW: DistRow type for distributors
 */
export interface DistRow {
  id: number;
  distributorName: string;
  depoAddress: string;
}
export interface LiquorRates {
  brand: string;
  size: string;
  exFactoryPrice: number;
  educationCess: number;
  exciseDuty: number;
  additionalExcise: number;
  additionalExcise12_5: number;
  bottlingFee: number;
  exportFee: number;
  mrpPerBottle: number;
  totalPricePerCase: number;
}
@Injectable({
  providedIn: 'root',
})
export class MasterService {
  // note: this.baseUrl is used for "masters/core" endpoints
  private readonly baseUrl = `${environment.apiBaseUrl}/masters/core`;

  constructor(private http: HttpClient) {}

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
    return this.http.get<PoliceStation[]>(
      `${this.baseUrl}/subdivision/detail/${code}`
    );
  }

  // Fetches all available license types
  getLicenseTypes(): Observable<LicenseType[]> {
    return this.http.get<LicenseType[]>(`${this.baseUrl}/license-types`);
  }

  // Fetches all license categories
  getLicenseCategories(): Observable<LicenseCategory[]> {
    return this.http.get<LicenseCategory[]>(
      `${this.baseUrl}/license-categories`
    );
  }

  // Fetches all license subcategories
  getLicenseSubcategories(): Observable<LicenseSubcategory[]> {
    return this.http.get<LicenseSubcategory[]>(
      `${this.baseUrl}/license-subcategories`
    );
  }

  // Fetches all available license titles
  getLicenseTitles(): Observable<LicenseTitle[]> {
    return this.http.get<LicenseTitle[]>(`${this.baseUrl}/license-titles`);
  }

  // Fetches all available roads
  getRoads(): Observable<Road[]> {
    return this.http.get<Road[]>(`${this.baseUrl}/roads`);
  }

  /**
   * Fetches all active bulk spirit types
   */
  getBulkSpiritTypes(): Observable<BulkSpiritType[]> {
    return this.http
      .get<{ success: boolean; data: BulkSpiritType[] }>(
        `${environment.apiBaseUrl}/transactional/supply_chain/bulk-spirit/bulk-spirit-types/`
      )
      .pipe(map((response) => response.data || []));
  }

  /**
   * Fetches all distilleries
   */
  getDistilleries(): Observable<Distillery[]> {
    return this.http
      .get<{ success?: boolean; data?: Distillery[] }>(
        `${environment.apiBaseUrl}/transactional/supply_chain/ena-distillery-types/`
      )
      .pipe(map((response: any) => response.data || []));
  }

  /**
   * Fetches all checkposts
   */
  getCheckposts(): Observable<Checkpost[]> {
    return this.http
      .get<{ status?: string; data?: Checkpost[] }>(
        `${environment.apiBaseUrl}/transactional/supply_chain/checkposts/`
      )
      .pipe(
        map((response: any) => {
          if (response && response.status === 'success') {
            return response.data || [];
          }
          throw new Error('Failed to fetch checkposts');
        }),
        catchError((err) => {
          console.error('getCheckposts error', err);
          return of([]);
        })
      );
  }

  /**
   * Fetches all purposes
   */
  getPurposes(): Observable<Purpose[]> {
    return this.http
      .get<{ success?: boolean; data?: Purpose[] }>(
        `${environment.apiBaseUrl}/transactional/supply_chain/purposes/`
      )
      .pipe(map((response: any) => response.data || []));
  }

  /**
   * Fetches all liquor brands with their sizes
   */
  getLiquorBrands(): Observable<{ brandName: string; sizes: number[] }[]> {
    return this.http
      .get<{
        success?: boolean;
        data?: { brandName: string; sizes: number[] }[];
      }>(
        `${environment.apiBaseUrl}/transactional/supply_chain/liquor-data/brands/`
      )
      .pipe(map((response: any) => response.data || []));
  }

  public getLiquorRates(
    brandName: string,
    size: string
  ): Observable<LiquorRates> {
    return this.http
      .get<{
        success: boolean;
        data: LiquorRates;
      }>(
        `${environment.apiBaseUrl}/transactional/supply_chain/liquor-data/rates/`,
        {
          params: {
            brand_name: brandName,
            pack_size_ml: size.replace('ml', ''),
          },
        }
      )
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error('Failed to fetch liquor rates');
          }
          return response.data;
        }),
        catchError((error) => {
          console.error('Error fetching liquor rates:', error);
          // Return default values on error
          return of({
            brand: brandName,
            size: `${size}ml`,
            exFactoryPrice: 0,
            educationCess: 0,
            exciseDuty: 0,
            additionalExcise: 0,
            additionalExcise12_5: 0,
            bottlingFee: 0,
            exportFee: 0,
            mrpPerBottle: 0,
            totalPricePerCase: 0,
          });
        })
      );
  }

  getDistributors(): Observable<DistRow[]> {
    const dataUrl = `${environment.apiBaseUrl}/transactional/supply_chain/distributor-data/`;

    return this.http.get<DistRow[]>(dataUrl).pipe(
      map((response: any) => {
        if (Array.isArray(response)) {
          return response;
        } else if (response?.results && Array.isArray(response.results)) {
          return response.results;
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }
}
