import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface RenewalApplicationConfig {
  renewal_month?: number;
  renewalMonth?: number;
  renewal_day?: number;
  renewalDay?: number;
  renewal_time?: string;
  renewalTime?: string;
}

@Injectable({ providedIn: 'root' })
export class RenewalConfigService {
  private config$?: Observable<RenewalApplicationConfig | null>;

  constructor(private http: HttpClient) {}

  getConfig(forceRefresh = false): Observable<RenewalApplicationConfig | null> {
    if (!forceRefresh && this.config$) return this.config$;

    this.config$ = this.http
      .get<RenewalApplicationConfig>(`${environment.apiBaseUrl}/masters/core/renewal-application-config/`)
      .pipe(
        catchError(() => of(null)),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.config$;
  }
}
