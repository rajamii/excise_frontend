import { catchError, map, Observable, of, throwError } from "rxjs";
import { environment } from "../../../../../environments/environment";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";

import { BulkSpiritType, Checkpost, Distillery, DistRow, LiquorRates, Purpose } from "../models/supply-chain.models";

@Injectable({
  providedIn: 'root',
})
export class SupplyChainService {
  constructor(private http: HttpClient) { }

  getBulkSpiritTypes(licenseSubCategoryId?: number): Observable<BulkSpiritType[]> {
    let params = new HttpParams();
    if (typeof licenseSubCategoryId === 'number') {
      params = params.set('license_sub_category_id', String(licenseSubCategoryId));
    }

    return this.http
      .get<{ success: boolean; data: BulkSpiritType[] }>(
        `${environment.apiBaseUrl}/masters/supply_chain/bulk-spirit/bulk-spirit-types/`,
        { params }
      )
      .pipe(map((response) => response.data || []));
  }

  getDistilleries(
    licenseeIds: string[] = [],
    establishmentNames: string[] = [],
    licenseIds: string[] = []
  ): Observable<Distillery[]> {
    let params = new HttpParams();
    const normalizedIds = (licenseeIds || [])
      .map((id) => String(id).trim())
      .filter((id) => !!id);
    const normalizedNames = (establishmentNames || [])
      .map((name) => String(name).trim())
      .filter((name) => !!name);
    const normalizedLicenseIds = (licenseIds || [])
      .map((id) => String(id).trim())
      .filter((id) => !!id);

    if (normalizedIds.length > 0) {
      params = params.set('licensee_id', normalizedIds.join(','));
    }
    if (normalizedNames.length > 0) {
      params = params.set('establishment_name', normalizedNames.join(','));
    }
    if (normalizedLicenseIds.length > 0) {
      params = params.set('license_id', normalizedLicenseIds.join(','));
    }

    return this.http
      .get<{ success?: boolean; data?: Distillery[] }>(
        `${environment.apiBaseUrl}/masters/supply_chain/ena-distillery-types/`,
        { params }
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

  getLiquorBrands(distilleryName?: string): Observable<{ brandName: string; sizes: number[] }[]> { 
    let params = new HttpParams(); 
    if (distilleryName) params = params.set('distillery', distilleryName); 
 
    const parse = (response: any) => response?.data || response?.results || response || []; 
 
    // Some deployments expose this endpoint via short route `/brands/`, others only via masters route.
    return this.http 
      .get<{ success?: boolean; data?: { brandName: string; sizes: number[] }[] }>( 
        `${environment.apiBaseUrl}/brands/`, 
        { params } 
      ) 
      .pipe( 
        map(parse), 
        catchError(() => 
          this.http 
            .get<{ success?: boolean; data?: { brandName: string; sizes: number[] }[] }>( 
              `${environment.apiBaseUrl}/masters/supply_chain/liquor-data/brands/`, 
              { params } 
            ) 
            .pipe(map(parse)) 
        ) 
      ); 
  } 

  public getLiquorRates(
    brandName: string,
    size: string
  ): Observable<LiquorRates> {
    const rawSize = String(size || '').trim();
    const packSizeMl = rawSize.replace(/[^0-9]/g, '');
    return this.http
      .get<{
        success: boolean;
        data: LiquorRates;
      }>(
        `${environment.apiBaseUrl}/rates/`,
        {
          params: {
            brand_name: brandName,
            pack_size_ml: packSizeMl,
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
          return throwError(() => error);
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

  createRevalidationFromRequisition(requisitionId?: string, requisitionRef?: string): Observable<any> {
    const payload: any = {};
    if (requisitionId) payload.requisition_id = requisitionId;
    if (requisitionRef) payload.requisition_ref_no = requisitionRef;

    return this.http.post<any>(
      `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/from-requisition/`,
      payload
    ).pipe(
      catchError((error) => {
        console.error('createRevalidationFromRequisition error', error);
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

  getCancellationData(): Observable<any[]> {
    return this.getCancellations();
  }

  getCancellationDetail(id: string): Observable<any> {
    return this.getCancellationById(id);
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

  performCancellationAction(id: number | string, action: 'APPROVE' | 'REJECT' | 'SubmitPayslip' | 'ApprovePayslip' | 'RejectPayslip', role: string = 'permit-section'): Observable<any> {
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

  syncCancellationWalletDebit(id: number | string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/${id}/sync_wallet_debit/`,
      {}
    ).pipe(
      catchError((error) => {
        console.error('syncCancellationWalletDebit error', error);
        throw error;
      })
    );
  }



  getTransitPermitById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/transactional/supply_chain/transit-permits/${id}/`).pipe(
      catchError((error) => {
        console.error('getTransitPermitById error', error);
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
        if (Array.isArray(response?.results)) return response.results;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.data?.results)) return response.data.results;

        // Some deployments wrap responses differently; if we can't detect an array,
        // return an empty list and let the fallback below handle it.
        return [];
      }),
      map((rows: any[]) => {
        if (Array.isArray(rows) && rows.length > 0) return rows;
        // Fallback defaults if API returns 200 but no usable payload
        return [
          { ml: 750, pieces_in_case: 12 },
          { ml: 375, pieces_in_case: 24 },
          { ml: 180, pieces_in_case: 48 }
        ];
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

  getBrandWarehouseStock(distilleryName?: string, brandName?: string, licenseId?: string): Observable<any[]> { 
    const params: any = {}; 
    if (distilleryName) params.distillery_name = distilleryName; 
    if (brandName) params.brand_name = brandName; 
    const normalizedLicenseId = String(licenseId || '').trim(); 
    if (normalizedLicenseId) { 
      // Backend accepts plain license ids too (not only NA/NLI prefixed ones). 
      params.license_id = normalizedLicenseId; 
    } 
 
    console.log('getBrandWarehouseStock called with params:', params); 
 
    const parse = (response: any) => { 
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
    }; 
 
    // NOTE: On some servers (nginx), only `/transactional/...` routes are proxied to Django,
    // while the short alias `/brand-warehouse/` is served by the frontend (HTML) causing JSON parse errors.
    const transactionalUrl = `${environment.apiBaseUrl}/transactional/supply_chain/brand-warehouse/brand-warehouse/`; 
    const shortUrl = `${environment.apiBaseUrl}/brand-warehouse/`; 
 
    return this.http.get<any[]>(transactionalUrl, { params }).pipe( 
      map(parse), 
      catchError((error) => { 
        console.error('getBrandWarehouseStock error (transactional route)', error); 
        return this.http.get<any[]>(shortUrl, { params }).pipe( 
          map(parse), 
          catchError((error2) => { 
            console.error('getBrandWarehouseStock error (short route)', error2); 
            return of([]); 
          }) 
        ); 
      }) 
    ); 
  } 
} 

