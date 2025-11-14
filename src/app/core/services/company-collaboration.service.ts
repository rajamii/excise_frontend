import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CompanyCollaborationService {
    private baseUrl = `${environment.apiBaseUrl}/masters/company-collaboration/collaboration/`;

    constructor(private http: HttpClient) { }

    createCollaboration(data: any): Observable<any> {
        return this.http.post(this.baseUrl, data);
    }

    getCollaborations(params: any = {}): Observable<any> {
        return this.http.get(this.baseUrl, { params });
    }

    getCollaboration(id: number): Observable<any> {
        return this.http.get(`${this.baseUrl}${id}/`);
    }

    updateCollaboration(id: number, data: any): Observable<any> {
        return this.http.patch(`${this.baseUrl}${id}/`, data);
    }

    deleteCollaboration(id: number): Observable<any> {
        return this.http.delete(`${this.baseUrl}${id}/`);
    }
}

