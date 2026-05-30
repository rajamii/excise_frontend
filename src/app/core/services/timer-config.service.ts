import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type TimerUnit = 'second' | 'minute' | 'hour' | 'day' | 'month' | string;

export interface TimerConfig {
  code: string;
  description?: string;
  delay_value?: number;
  delay_unit?: TimerUnit;
  delay_seconds: number;
  delay_ms: number;
  source?: 'db' | 'default' | string;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TimerConfigService {
  private cache = new Map<string, Observable<TimerConfig>>();

  constructor(private http: HttpClient) {}

  getTimerConfig(code: string, fallbackSeconds = 0): Observable<TimerConfig> {
    const normalized = String(code || '').trim();
    if (!normalized) {
      return of({
        code: normalized,
        delay_seconds: fallbackSeconds,
        delay_ms: fallbackSeconds * 1000,
        source: 'default'
      });
    }

    const existing = this.cache.get(normalized);
    if (existing) {
      return existing;
    }

    const url = `${environment.apiBaseUrl}/masters/core/timer-config/`;
    const req = this.http.get<any>(url, { params: { code: normalized } }).pipe(
      map((res) => {
        const delaySeconds = Number(res?.delay_seconds ?? res?.delaySeconds ?? 0);
        const delayMs = Number(res?.delay_ms ?? res?.delayMs ?? 0);
        const resolvedSeconds =
          Number.isFinite(delaySeconds) && delaySeconds > 0
            ? delaySeconds
            : Number.isFinite(delayMs) && delayMs > 0
              ? Math.floor(delayMs / 1000)
              : fallbackSeconds;

        return {
          code: String(res?.code ?? normalized),
          description: res?.description,
          delay_value: res?.delay_value ?? res?.delayValue,
          delay_unit: res?.delay_unit ?? res?.delayUnit,
          delay_seconds: resolvedSeconds,
          delay_ms: resolvedSeconds * 1000,
          source: res?.source ?? 'db',
          is_active: res?.is_active ?? res?.isActive
        } as TimerConfig;
      }),
      catchError(() =>
        of({
          code: normalized,
          delay_seconds: fallbackSeconds,
          delay_ms: fallbackSeconds * 1000,
          source: 'default'
        } as TimerConfig)
      ),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.cache.set(normalized, req);
    return req;
  }
}

