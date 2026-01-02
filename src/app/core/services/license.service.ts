import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Licensee } from '../models/license.model';

@Injectable({ providedIn: 'root' })
export class LicenseService {
  private readonly baseUrl = `${environment.apiBaseUrl}/masters/license`;

  constructor(private http: HttpClient) {}

  /**
   * Fetch active licensees filtered by district, category, and optional mode.
   * 🔴 FIX: Capitalizes mode parameter to match database format
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
    
    // 🔴 FIX: Capitalize mode to match database format
    // Frontend sends: "salesman" -> Backend expects: "Salesman"
    if (mode) {
      const formattedMode = mode.charAt(0).toUpperCase() + mode.slice(1);
      params = params.set('mode', formattedMode);
    }

    return this.http.get<Licensee[]>(`${this.baseUrl}/active/`, { params });
  }
}