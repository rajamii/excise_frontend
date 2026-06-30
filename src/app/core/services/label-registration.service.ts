import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LabelRegistrationService {
  private baseUrl = `${environment.apiBaseUrl}/transactional/label-registration`;
  private readonly draftDocuments = new Map<string, File>();

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

  getDashboardCounts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard-counts/`);
  }

  getApplicationsByStatus(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list-by-status/`);
  }

  setDraftDocument(key: string, file: File | null): void {
    if (!key) {
      return;
    }

    if (file) {
      this.draftDocuments.set(key, file);
      return;
    }

    this.draftDocuments.delete(key);
  }

  getDraftDocument(key: string): File | null {
    return this.draftDocuments.get(key) ?? null;
  }

  getDraftDocuments(): Array<{ key: string; file: File }> {
    return Array.from(this.draftDocuments.entries()).map(([key, file]) => ({ key, file }));
  }

  clearDraftDocuments(): void {
    this.draftDocuments.clear();
  }
}
