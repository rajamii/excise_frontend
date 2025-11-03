import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Licensee } from '../models/license.model';

@Injectable({ providedIn: 'root' })
export class LicenseService {
  /** The URL you tested in the browser */
  private readonly baseUrl = `${environment.apiBaseUrl}/masters/license`;

  constructor(private http: HttpClient) {}

  /** Fetch licensees filtered by district (and optionally by category) */
  getActiveLicensees(
    districtCode?: number | string,
    licenseCategory?: string
  ): Observable<Licensee[]> {
    let params = new HttpParams();
    if (districtCode != null) {
      params = params.set('district_code', districtCode.toString());
    }
    if (licenseCategory) {
      params = params.set('license_category', licenseCategory);
    }
    return this.http.get<Licensee[]>(`${this.baseUrl}/active/`, { params });
  }
}