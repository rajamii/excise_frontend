import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Licensee } from '../models/license.model';

@Injectable({ providedIn: 'root' })
export class LicenseService {
  private readonly baseUrl = `${environment.apiBaseUrl}/masters/license`;

  constructor(private http: HttpClient) {}

  // Fetch active licensees with optional filters for district code, license category, and mode
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
    
    if (mode) {
      const formattedMode = mode.charAt(0).toUpperCase() + mode.slice(1);
      params = params.set('mode', formattedMode);
    }

    return this.http.get<Licensee[]>(`${this.baseUrl}/active/`, { params }).pipe();
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
