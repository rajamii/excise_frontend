import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AccountService } from './account.service';

@Injectable({ providedIn: 'root' })
export class LicenseMeService {
  private readonly apiUrl = `${environment.apiBaseUrl}/masters/license/me/`;

  constructor(private http: HttpClient) {}

  getMyLicenses(forceRefresh = false): Observable<any[]> {
    const url = forceRefresh ? `${this.apiUrl}?cb=${Date.now()}` : this.apiUrl;
    return this.http.get<any[]>(url).pipe(
      catchError(() => of([]))
    );
  }
}

