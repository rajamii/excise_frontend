import { catchError, map, Observable, of } from "rxjs";
import { environment } from "../../../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

import { BulkSpiritType, Checkpost, Distillery, DistRow, LiquorRates, Purpose } from "../models/supply-chain.models";

@Injectable({
  providedIn: 'root',
})
export class SupplyChainService {
  constructor(private http: HttpClient) { }

  getBulkSpiritTypes(): Observable<BulkSpiritType[]> {
    return this.http
      .get<{ success: boolean; data: BulkSpiritType[] }>(
        `${environment.apiBaseUrl}/masters/supply_chain/bulk-spirit/bulk-spirit-types/`
      )
      .pipe(map((response) => response.data || []));
  }

  getDistilleries(): Observable<Distillery[]> {
    return this.http
      .get<{ success?: boolean; data?: Distillery[] }>(
        `${environment.apiBaseUrl}/masters/supply_chain/ena-distillery-types/`
      )
      .pipe(map((response: any) => response.data || []));
  }

  getCheckposts(): Observable<Checkpost[]> {
    return this.http
      .get<{ status?: string; data?: Checkpost[] }>(
        `${environment.apiBaseUrl}/masters/supply_chain/checkposts/checkposts/`
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
        `${environment.apiBaseUrl}/masters/supply_chain/purposes/purposes/`
      )
      .pipe(map((response: any) => response.data || []));
  }

  getLiquorBrands(): Observable<{ brandName: string; sizes: number[] }[]> {
    return this.http
      .get<{
        success?: boolean;
        data?: { brandName: string; sizes: number[] }[];
      }>(
        `${environment.apiBaseUrl}/masters/supply_chain/liquor-data/brands/`
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
        `${environment.apiBaseUrl}/masters/supply_chain/liquor-data/rates/`,
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
  getBottleTypes(): Observable<any[]> {
    return this.http
      .get<any>(
        `${environment.apiBaseUrl}/masters/supply_chain/transit-permit/bottle-types/`
      )
      .pipe(
        map((response) => {
          console.log('Bottle Types API Response:', response);
          if (Array.isArray(response)) {
            return response;
          } else if (response?.results) {
            return response.results;
          }
          return [];
        }),
        catchError((error) => {
          console.error('getBottleTypes error:', error);
          return of([]);
        })
      );
  }
  getDistributors(): Observable<DistRow[]> {
    const dataUrl = `${environment.apiBaseUrl}/masters/supply_chain/distributor-data/`;

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

  getStatuses(): Observable<any[]> {
    return this.http
      .get<{ success?: boolean; data?: any[] }>(
        `${environment.apiBaseUrl}/masters/supply_chain/status-master/`
      )
      .pipe(map((response: any) => response.results || response || []));
  }

  getRevalidationData(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/`).pipe(
      map((response: any) => {
        if (Array.isArray(response)) {
          return response;
        } else if (response?.results && Array.isArray(response.results)) {
          return response.results;
        }
        return [];
      }),
      catchError((error) => {
        console.error('getRevalidationData error', error);
        return of([]);
      })
    );
  }

  getRevalidationDetail(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/${id}/`).pipe(
      catchError((error) => {
        console.error('getRevalidationDetail error', error);
        throw error;
      })
    );
  }

  submitRevalidation(id: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/${id}/submit_revalidation/`,
      {}
    ).pipe(
      catchError((error) => {
        console.error('submitRevalidation error', error);
        throw error;
      })
    );
  }

  performRevalidationAction(id: string, action: 'APPROVE' | 'REJECT', role: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/${id}/perform_action/`,
      { action, role }
    ).pipe(
      catchError((error) => {
        console.error('performRevalidationAction error', error);
        throw error;
      })
    );
  }

  submitCancellation(payload: any): Observable<any> {
    const url = `${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/submit/`;
    console.log('submitCancellation: Payload:', payload);
    console.log('submitCancellation: URL:', url);
    return this.http.post<any>(url, payload).pipe(
      catchError((error) => {
        console.error('submitCancellation error', error);
        throw error;
      })
    );
  }

  getCancellations(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/`).pipe(
      map((response: any) => {
        if (Array.isArray(response)) return response;
        if (response?.results) return response.results;
        return [];
      }),
      catchError((error) => {
        console.error('getCancellations error', error);
        return of([]);
      })
    );
  }

  getCancellationById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/${id}/`).pipe(
      catchError((error) => {
        console.error('getCancellationById error', error);
        throw error;
      })
    );
  }

  getCancellationLetterData(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/${id}/generate_final_letter/`).pipe(
      catchError((error) => {
        console.error('getCancellationLetterData error', error);
        throw error;
      })
    );
  }

  performCancellationAction(id: number | string, action: 'APPROVE' | 'REJECT', role: string = 'permit-section'): Observable<any> {
    return this.http.post<any>(
      `${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/${id}/perform_action/`,
      { action, role }
    ).pipe(
      catchError((error) => {
        console.error('performCancellationAction error', error);
        throw error;
      })
    );
  }



  getTransitPermits(billNo?: string): Observable<any[]> {
    let url = `${environment.apiBaseUrl}/transactional/supply_chain/transit-permits/`;
    if (billNo) {
      url += `?bill_no=${encodeURIComponent(billNo)}`;
    }
    return this.http.get<any[]>(url).pipe(
      map((response: any) => {
        if (Array.isArray(response)) return response;
        if (response?.results) return response.results;
        return [];
      }),
      catchError((error) => {
        console.error('getTransitPermits error', error);
        return of([]);
      })
    );
  }

  submitTransitPermit(payload: any): Observable<any> {
    const url = `${environment.apiBaseUrl}/transactional/supply_chain/transit-permits/submit/`;
    return this.http.post<any>(url, payload).pipe(
      catchError((error) => {
        console.error('submitTransitPermit error', error);
        throw error;
      })
    );
  }

  performTransitPermitAction(id: string | number, action: 'PAY' | 'APPROVE' | 'REJECT', role: string = 'licensee'): Observable<any> {
    return this.http.post<any>(
      `${environment.apiBaseUrl}/transactional/supply_chain/transit-permits/action/${id}/`,
      { action, role }
    ).pipe(
      catchError((error) => {
        console.error('performTransitPermitAction error', error);
        throw error;
      })
    );
  }

  getBrandMlInCases(): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.apiBaseUrl}/masters/supply_chain/transit-permit/brand-ml-in-cases/`
    ).pipe(
      map((response: any) => {
        if (Array.isArray(response)) return response;
        if (response?.results) return response.results;
        return [];
      }),
      catchError((error) => {
        console.error('getBrandMlInCases error', error);
        // Fallback for demo
        return of([
          { ml: 750, pieces_in_case: 12 },
          { ml: 375, pieces_in_case: 24 },
          { ml: 180, pieces_in_case: 48 }
        ]);
      })
    );
  }

  updateBrandMlInCases(id: number, piecesInCase: number): Observable<any> {
    return this.http.patch<any>(
      `${environment.apiBaseUrl}/masters/supply_chain/transit-permit/brand-ml-in-cases/${id}/`,
      { pieces_in_case: piecesInCase }
    ).pipe(
      catchError((error) => {
        console.error('updateBrandMlInCases error', error);
        throw error;
      })
    );
  }

  getBrandWarehouseStock(distilleryName: string, brandName?: string): Observable<any[]> {
    const params: any = {};
    if (distilleryName) params.distillery_name = distilleryName;
    if (brandName) params.brand_name = brandName;

    console.log('getBrandWarehouseStock called with params:', params);

    return this.http.get<any[]>(
      `${environment.apiBaseUrl}/transactional/supply_chain/brand-warehouse/brand-warehouse/`,
      { params }
    ).pipe(
      map((response: any) => {
        console.log('getBrandWarehouseStock raw response:', response);
        if (Array.isArray(response)) {
          console.log('Response is array, length:', response.length);
          return response;
        }
        if (response?.results) {
          console.log('Response has results, length:', response.results.length);
          return response.results;
        }
        console.log('Response format not recognized, returning empty array');
        return [];
      }),
      catchError((error) => {
        console.error('getBrandWarehouseStock error', error);
        return of([]);
      })
    );
  }
}

