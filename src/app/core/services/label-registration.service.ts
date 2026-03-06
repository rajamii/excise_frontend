import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LabelRegistrationDocuments } from '../models/label-registration.model';

@Injectable({
  providedIn: 'root'
})
export class LabelRegistrationService {
  private baseUrl = `${environment.apiBaseUrl}/transactional/label-registration`;
  private labelDocuments: Partial<Record<keyof LabelRegistrationDocuments, File>> = {};

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

  setLabelDocuments(docs: Partial<Record<keyof LabelRegistrationDocuments, File>>): void {
    this.labelDocuments = { ...this.labelDocuments, ...docs };
  }

  getLabelDocuments(): Partial<Record<keyof LabelRegistrationDocuments, File>> {
    return this.labelDocuments;
  }

  removeLabelDocument(key: keyof LabelRegistrationDocuments): void {
    const docs = { ...this.labelDocuments };
    delete docs[key];
    this.labelDocuments = docs;
  }

  clearLabelDocuments(): void {
    this.labelDocuments = {};
  }
}
