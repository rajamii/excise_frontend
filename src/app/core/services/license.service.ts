import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Licensee } from '../models/license.model';

@Injectable({ providedIn: 'root' })
export class LicenseService {
  private readonly baseUrl = `${environment.apiBaseUrl}/masters/license`;

  constructor(private http: HttpClient) {}

  /**
   * Fetch active licensees filtered by district, category, and optional mode.
   * Capitalizes mode parameter to match database format.
   */
  getActiveLicensees(
    districtCode?: number | string,
    licenseCategory?: string,
    mode?: string
  ): Observable<Licensee[]> {
    let params = new HttpParams();

    if (districtCode != null) {
      params = params.set('district_code', districtCode.toString());
    }
    
    if (licenseCategory) {
      params = params.set('license_category', licenseCategory);
    }
    
    // Capitalize mode to match database format
    // Frontend sends: "salesman" -> Backend expects: "Salesman"
    if (mode) {
      const formattedMode = mode.charAt(0).toUpperCase() + mode.slice(1);
      params = params.set('mode', formattedMode);
    }

    return this.http.get<Licensee[]>(`${this.baseUrl}/active/`, { params }).pipe(
      tap(licensees => {
        console.log('📦 API Response - Licensees:', licensees);
        if (licensees.length > 0) {
          console.log('🔍 First licensee structure:', licensees[0]);
          console.log('  - licenseeId (camelCase):', licensees[0].licenseeId);
          console.log('  - licensee_id (snake_case):', licensees[0].licensee_id);
          console.log('  - id (display):', licensees[0].id);
          console.log('  - establishmentName:', licensees[0].establishmentName);
          console.log('  - establishment_name:', licensees[0].establishment_name);
        }
      })
    );
  }

  getLicenseDetail(licenseId: string): Observable<any> {
    const encodedId = encodeURIComponent(String(licenseId || '').trim());
    return this.http.get(`${this.baseUrl}/detail/${encodedId}/`);
  }

  printLicense(licenseId: string): Observable<any> {
    const encodedId = encodeURIComponent(String(licenseId || '').trim());
    return this.http.get(`${this.baseUrl}/${encodedId}/print/`);
  }

  payPrintFee(licenseId: string): Observable<any> {
    const encodedId = encodeURIComponent(String(licenseId || '').trim());
    return this.http.post(`${this.baseUrl}/${encodedId}/pay-print-fee/`, {});
  }
}
