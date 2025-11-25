import { catchError, map, Observable, of } from "rxjs";
import { environment } from "../../../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

import { BulkSpiritType, Checkpost, Distillery, DistRow, LiquorRates, Purpose } from "../models/supply-chain.models";

@Injectable ({
    providedIn: 'root',
})
export class SupplyChainService {
     constructor(private http: HttpClient) {}

  getBulkSpiritTypes(): Observable<BulkSpiritType[]> {
    return this.http
      .get<{ success: boolean; data: BulkSpiritType[] }>(
        `${environment.apiBaseUrl}/transactional/supply_chain/bulk-spirit/bulk-spirit-types/`
      )
      .pipe(map((response) => response.data || []));
  }

    getDistilleries(): Observable<Distillery[]> {
      return this.http
        .get<{ success?: boolean; data?: Distillery[] }>(
          `${environment.apiBaseUrl}/transactional/supply_chain/ena-distillery-types/`
        )
        .pipe(map((response: any) => response.data || []));
    }

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

      getPurposes(): Observable<Purpose[]> {
        return this.http
          .get<{ success?: boolean; data?: Purpose[] }>(
            `${environment.apiBaseUrl}/transactional/supply_chain/purposes/`
          )
          .pipe(map((response: any) => response.data || []));
      }

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

