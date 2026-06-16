import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AccountService } from './account.service';

@Injectable({ providedIn: 'root' })
export class LicenseMeService {
  private readonly apiUrl = `${environment.apiBaseUrl}/masters/license/me/`;
  private cache$?: Observable<any[]>;
  private cacheUserKey: string | null = null;
  private lastFetchMs = 0;

  constructor(private http: HttpClient, private accountService: AccountService) {
    this.accountService.getAuthenticationState().subscribe((account) => {
      const nextKey = account?.username ? String(account.username) : null;
      if (nextKey !== this.cacheUserKey) {
        this.cacheUserKey = nextKey;
        this.cache$ = undefined;
        this.lastFetchMs = 0;
      }
    });
  }

  getMyLicenses(forceRefresh = false): Observable<any[]> {
    const now = Date.now();
    if (!forceRefresh && this.cache$ && now - this.lastFetchMs < 15_000) {
      return this.cache$;
    }

    this.lastFetchMs = now;
    this.cache$ = this.http.get<any[]>(this.apiUrl).pipe(
      catchError(() => of([])),
      tap(() => {
        this.lastFetchMs = Date.now();
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.cache$;
  }
}

