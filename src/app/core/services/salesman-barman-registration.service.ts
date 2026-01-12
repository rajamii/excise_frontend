// ================================================================================================
// FILE: core/services/salesman-barman-registration.service.ts
// COMPLETE VERSION - With Payment Method Added
// ================================================================================================

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SalesmanBarmanDocuments } from '../models/salesman-barman.model';

@Injectable({
  providedIn: 'root'
})
export class SalesmanBarmanRegistrationService {
  private apiUrl = 'http://127.0.0.1:8000/transactional/salesman_barman';
  
  private salesmanBarmanDocuments: Partial<SalesmanBarmanDocuments> = {
    passPhoto: undefined,
    aadhaarCard: undefined,
    residentialCertificate: undefined,
    dateofBirthProof: undefined
  };

  constructor(private http: HttpClient) {}

  // ============================================================
  // DOCUMENT MANAGEMENT METHODS
  // ============================================================

  getSalesmanBarmanDocuments(): Partial<SalesmanBarmanDocuments> {
    return { ...this.salesmanBarmanDocuments };
  }

  setSalesmanBarmanDocuments(documents: Partial<SalesmanBarmanDocuments>): void {
    this.salesmanBarmanDocuments = {
      ...this.salesmanBarmanDocuments,
      ...documents
    };
  }

  clearSalesmanBarmanDocuments(): void {
    this.salesmanBarmanDocuments = {
      passPhoto: undefined,
      aadhaarCard: undefined,
      residentialCertificate: undefined,
      dateofBirthProof: undefined
    };
  }

  // ============================================================
  // API METHODS - DASHBOARD & LISTING
  // ============================================================

  getDashboardCounts(): Observable<any> {
    console.log('📊 Fetching Salesman/Barman dashboard counts...');
    
    return this.http.get<any>(`${this.apiUrl}/dashboard-counts/`).pipe(
      map(response => {
        console.log('✅ Salesman/Barman counts received:', response);
        return {
          applied: response.applied || 0,
          pending: response.pending || 0,
          approved: response.approved || 0,
          rejected: response.rejected || 0,
          awaitingPayment: response.awaitingPayment || response.awaiting_payment || 0 // ✅ ADDED
        };
      }),
      catchError(error => {
        console.warn('⚠️ Salesman/Barman dashboard-counts endpoint not available:', error);
        console.log('📊 Returning zero counts for Salesman/Barman');
        return of({
          applied: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          awaitingPayment: 0 // ✅ ADDED
        });
      })
    );
  }

  getApplicationsByStatus(): Observable<any> {
    console.log('📊 Fetching Salesman/Barman applications by status...');
    
    return this.http.get<any>(`${this.apiUrl}/applications-by-status/`).pipe(
      map(response => {
        console.log('✅ Salesman/Barman applications received:', response);
        return {
          applied: response.applied || [],
          pending: response.pending || [],
          approved: response.approved || [],
          rejected: response.rejected || [],
          awaitingPayment: response.awaitingPayment || response.awaiting_payment || [] // ✅ ADDED
        };
      }),
      catchError(error => {
        console.warn('⚠️ Salesman/Barman applications-by-status endpoint not available:', error);
        console.log('📋 Returning empty application lists for Salesman/Barman');
        return of({
          applied: [],
          pending: [],
          approved: [],
          rejected: [],
          awaitingPayment: [] // ✅ ADDED
        });
      })
    );
  }

  getApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/list/`).pipe(
      catchError(error => {
        console.error('Error fetching Salesman/Barman applications:', error);
        return of([]);
      })
    );
  }

  getApplicationById(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any>(`${this.apiUrl}/detail/${encodedId}/`).pipe(
      catchError(error => {
        console.error(`Error fetching Salesman/Barman application ${applicationId}:`, error);
        throw error;
      })
    );
  }

  // ============================================================
  // API METHODS - APPLICATION MANAGEMENT
  // ============================================================

  createSalesmanBarman(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/apply/`, formData).pipe(
      catchError(error => {
        console.error('Error creating Salesman/Barman application:', error);
        throw error;
      })
    );
  }

  advanceApplication(applicationId: string, stageId: number, context: any): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post<any>(
      `${this.apiUrl}/${encodedId}/advance/${stageId}/`,
      { context_data: context } // ✅ FIXED: Use context_data wrapper
    ).pipe(
      catchError(error => {
        console.error('Error advancing Salesman/Barman application:', error);
        throw error;
      })
    );
  }

  getNextStages(applicationId: string): Observable<any[]> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any[]>(`${this.apiUrl}/${encodedId}/next-stages/`).pipe(
      catchError(error => {
        console.error('Error fetching next stages:', error);
        return of([]);
      })
    );
  }

  raiseObjection(
    applicationId: string, 
    objections: { field: string; remarks: string }[], 
    generalRemarks?: string
  ): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const body: any = { objections };
    if (generalRemarks) {
      body.remarks = generalRemarks;
    }
    return this.http.post<any>(
      `${this.apiUrl}/${encodedId}/raise-objection/`,
      body
    ).pipe(
      catchError(error => {
        console.error('Error raising objection:', error);
        throw error;
      })
    );
  }

  getObjections(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any>(`${this.apiUrl}/${encodedId}/objections/`).pipe(
      catchError(error => {
        console.error('Error fetching objections:', error);
        return of([]);
      })
    );
  }

  getLocationFee(): Observable<any[]> {
    console.log('📍 Attempting to load location fees...');
    console.log('📍 Primary endpoint:', `${this.apiUrl}/location-fee/`);
    
    return this.http.get<any[]>(`${this.apiUrl}/location-fee/`).pipe(
      map(response => {
        console.log('✅ Location fees loaded successfully:', response);
        
        if (Array.isArray(response)) {
          return response.map(loc => this.normalizeLocationFee(loc));
        }
        
        console.warn('⚠️ Unexpected response format, returning empty array');
        return [];
      }),
      catchError(error => {
        console.error('❌ Primary location-fee endpoint failed:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url
        });
        
        console.log('🔄 Trying fallback: license application endpoint...');
        return this.tryLicenseEndpointFallback().pipe(
          catchError(fallbackError => {
            console.error('❌ Fallback endpoint also failed:', fallbackError);
            console.warn('⚠️ Using mock location data as last resort');
            return this.getMockLocationFees();
          })
        );
      })
    );
  }

  private tryLicenseEndpointFallback(): Observable<any[]> {
    const fallbackUrl = 'http://127.0.0.1:8000/transactional/license_application/location-fee/';
    console.log('📍 Fallback URL:', fallbackUrl);
    
    return this.http.get<any[]>(fallbackUrl).pipe(
      map(response => {
        console.log('✅ Got location fees from license endpoint:', response);
        if (Array.isArray(response)) {
          return response.map(loc => this.normalizeLocationFee(loc));
        }
        return [];
      })
    );
  }

  private normalizeLocationFee(loc: any): any {
    return {
      id: loc.id || loc.location_id || loc.locationId,
      locationName: loc.locationName || loc.location_name || loc.name || 'Unknown Location',
      feeAmount: loc.feeAmount || loc.fee_amount || loc.amount || 0
    };
  }

  private getMockLocationFees(): Observable<any[]> {
    return of([
      { id: 1, locationName: 'Gangtok (Mock)', feeAmount: 5000 },
      { id: 2, locationName: 'Namchi (Mock)', feeAmount: 3000 },
      { id: 3, locationName: 'Gyalshing (Mock)', feeAmount: 3000 },
      { id: 4, locationName: 'Mangan (Mock)', feeAmount: 2500 }
    ]);
  }

  getApplicationMovement(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any>(`${this.apiUrl}/${encodedId}/movements/`).pipe(
      catchError(error => {
        console.error('Error fetching application movement:', error);
        return of([]);
      })
    );
  }

  deleteApplication(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.delete<any>(`${this.apiUrl}/${encodedId}/delete/`).pipe(
      catchError(error => {
        console.error('Error deleting application:', error);
        throw error;
      })
    );
  }

  resolveObjections(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post<any>(
      `${this.apiUrl}/${encodedId}/resolve-objections/`,
      formData
    ).pipe(
      catchError(error => {
        console.error('Error resolving objections:', error);
        throw error;
      })
    );
  }

  downloadApplicationPDF(applicationId: string): Observable<Blob> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.apiUrl}/${encodedId}/download-pdf/`, { 
      responseType: 'blob' 
    }).pipe(
      catchError(error => {
        console.error('Error downloading PDF:', error);
        throw error;
      })
    );
  }

  getApplicationStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics/`).pipe(
      catchError(error => {
        console.error('Error fetching statistics:', error);
        return of({});
      })
    );
  }

  printLicense(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post<any>(`${this.apiUrl}/${encodedId}/print/`, {}).pipe(
      catchError(error => {
        console.error('Error printing license:', error);
        throw error;
      })
    );
  }

  // ============================================================
  // ✅ NEW: PAYMENT METHOD
  // ============================================================

  /**
   * Pay license fee for Salesman/Barman application
   * Uses unified /auth/ workflow endpoint
   * 
   * @param applicationId - Application ID (e.g., "SBM/2024/001")
   * @param formData - Payment details containing:
   *   - payment_method: string
   *   - transaction_reference: string
   *   - payment_date: string
   *   - amount: number
   *   - remarks: string (optional)
   * @returns Observable with payment confirmation response
   */
  payLicenseFee(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    
    // ✅ IMPORTANT: Use unified /auth/ workflow endpoint for consistency
    const paymentUrl = `http://127.0.0.1:8000/auth/${encodedId}/pay-license-fee/`;
    
    console.log('💳 Processing Salesman/Barman payment:', {
      applicationId,
      endpoint: paymentUrl
    });
    
    return this.http.post<any>(paymentUrl, formData).pipe(
      map(response => {
        console.log('✅ Salesman/Barman payment successful:', response);
        return {
          ...response,
          success: true
        };
      }),
      catchError(error => {
        console.error('❌ Salesman/Barman payment failed:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.detail || error.message
        });
        throw error;
      })
    );
  }
}