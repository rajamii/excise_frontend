import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LabelRegistrationService {
  private baseUrl = `${environment.apiBaseUrl}/transactional/label-registration`;

  constructor(private http: HttpClient) {}

  applyLabelRegistration(data: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/apply/`, data);
  }

  listLabelRegistrations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list/`);
  }

  getLabelRegistrationDetail(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.baseUrl}/detail/${encodedId}/`);
  }
}
