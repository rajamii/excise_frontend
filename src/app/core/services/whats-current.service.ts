import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WhatsCurrent } from '../models/whats-current.model';

@Injectable({
  providedIn: 'root'
})
export class WhatsCurrentService {
  private baseUrl = `${environment.apiBaseUrl}/masters/core/whats-current`;

  constructor(private http: HttpClient) {}

  getWhatsCurrent(category?: string, showAll: boolean = false): Observable<WhatsCurrent[]> {
    let params = new HttpParams();
    if (category) {
      params = params.set('category', category);
    }
    if (showAll) {
      params = params.set('all', 'true');
    }
    return this.http.get<WhatsCurrent[]>(`${this.baseUrl}/`, { params });
  }

  createWhatsCurrent(formData: FormData): Observable<WhatsCurrent> {
    return this.http.post<WhatsCurrent>(`${this.baseUrl}/create/`, formData);
  }

  updateWhatsCurrent(id: number, formData: FormData): Observable<WhatsCurrent> {
    return this.http.put<WhatsCurrent>(`${this.baseUrl}/${id}/update/`, formData);
  }

  deleteWhatsCurrent(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}/delete/`);
  }

  toFormData(data: Record<string, any>): FormData {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value, value.name);
        } else {
          formData.append(key, String(value));
        }
      }
    });
    return formData;
  }
}
