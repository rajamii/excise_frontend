import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TimerConfig {
  id?: number;
  code: string;
  description: string;
  delay_value: number;
  delay_unit: string;
  is_active: boolean;
  validity_period_days?: number | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private baseUrl = `${environment.apiBaseUrl}/masters/core/timer-configs`;

  constructor(private http: HttpClient) {}

  getTimers(): Observable<TimerConfig[]> {
    return this.http.get<TimerConfig[]>(`${this.baseUrl}/`);
  }

  createTimer(data: Partial<TimerConfig>): Observable<TimerConfig> {
    return this.http.post<TimerConfig>(`${this.baseUrl}/create/`, data);
  }

  updateTimer(id: number, data: Partial<TimerConfig>): Observable<TimerConfig> {
    return this.http.put<TimerConfig>(`${this.baseUrl}/${id}/update/`, data);
  }

  deleteTimer(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}/delete/`);
  }

  toggleActive(id: number): Observable<TimerConfig> {
    return this.http.patch<TimerConfig>(`${this.baseUrl}/${id}/toggle-active/`, {});
  }
}
