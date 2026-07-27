import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PreventiveRaid } from '../models/preventive-raids.model';

@Injectable({
  providedIn: 'root'
})
export class PreventiveRaidsService {
  private baseUrl = `${environment.apiBaseUrl}/masters/preventive_raids`;

  constructor(private http: HttpClient) {}

  getPreventiveRaids(): Observable<PreventiveRaid[]> {
    return this.http.get<PreventiveRaid[]>(`${this.baseUrl}/list/`);
  }

  createPreventiveRaid(formData: FormData): Observable<PreventiveRaid> {
    return this.http.post<PreventiveRaid>(`${this.baseUrl}/create/`, formData);
  }

  updatePreventiveRaid(id: number, formData: FormData): Observable<PreventiveRaid> {
    return this.http.put<PreventiveRaid>(`${this.baseUrl}/update/${id}/`, formData);
  }

  deletePreventiveRaid(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${id}/`);
  }

  toFormData(data: Record<string, any>, files?: File[]): FormData {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    if (files) {
      files.forEach((file) => {
        formData.append('uploaded_images', file, file.name);
      });
    }
    return formData;
  }
}
