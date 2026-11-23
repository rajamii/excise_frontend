import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TemporaryUploadResponse {
  success: boolean;
  msg?: string;
  id?: number;
  username?: string;
  application_type?: string;
  document_field?: string;
  mrn?: string;
  download_url?: string;
  error?: string;
}

export interface TemporaryDocumentsListResponse {
  success: boolean;
  count: number;
  documents: Array<{
    id: number;
    username: string;
    application_type: string;
    document_field: string;
    mrn: string;
    dms_reference: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    download_url: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class DmsDocumentService {
  private readonly baseUrl = (environment.apiBaseUrl || '').replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  private getUsername(): string {
    try {
      const username = localStorage.getItem('username');
      if (username) return username.trim();
      const raw = localStorage.getItem('currentUser') || localStorage.getItem('user');
      if (raw) {
        if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          return String(parsed?.username || parsed?.id || '').trim();
        }
        return String(raw).trim();
      }
    } catch {}
    return '';
  }

  uploadTemporaryDocument(
    file: File,
    applicationType: string,
    documentField: string
  ): Observable<TemporaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('application_type', applicationType);
    formData.append('document_field', documentField);

    const username = this.getUsername();
    if (username) {
      formData.append('username', username);
    }

    const url = `${this.baseUrl}/transactional/dms/temporary-upload/`;
    return this.http.post<TemporaryUploadResponse>(url, formData);
  }

  getTemporaryDocuments(
    applicationType: string,
    username?: string
  ): Observable<TemporaryDocumentsListResponse> {
    const user = username || this.getUsername();
    let params = new HttpParams().set('application_type', applicationType);
    if (user) {
      params = params.set('username', user);
    }

    const url = `${this.baseUrl}/transactional/dms/temporary-documents/`;
    return this.http.get<TemporaryDocumentsListResponse>(url, { params });
  }

  deleteTemporaryDocument(
    applicationType: string,
    documentField: string,
    username?: string
  ): Observable<any> {
    const user = username || this.getUsername();
    let params = new HttpParams();
    if (user) {
      params = params.set('username', user);
    }

    const url = `${this.baseUrl}/transactional/dms/temporary-delete/${applicationType}/${documentField}/`;
    return this.http.delete(url, { params });
  }

  getTemporaryDownloadUrl(applicationType: string, documentField: string, username?: string): string {
    const user = username || this.getUsername();
    const query = user ? `?username=${encodeURIComponent(user)}` : '';
    return `${this.baseUrl}/transactional/dms/temporary-download/${applicationType}/${documentField}/${query}`;
  }

  getUniversalDocumentUrl(applicationId: string, documentField: string): string {
    return `${this.baseUrl}/transactional/dms/document/${applicationId}/${documentField}/`;
  }
}
