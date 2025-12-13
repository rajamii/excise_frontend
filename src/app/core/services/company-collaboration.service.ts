import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CompanyCollaborationService {
    // Backend repository does not expose collaboration endpoints; keep a safe guard.
    private baseUrl = `${environment.apiBaseUrl}`;

    constructor(private http: HttpClient) { }

    createCollaboration(data: any): Observable<any> {
        return this.unavailable();
    }

    getCollaborations(params: any = {}): Observable<any> {
        return this.unavailable();
    }

    getCollaboration(id: number): Observable<any> {
        return this.unavailable();
    }

    updateCollaboration(id: number, data: any): Observable<any> {
        return this.unavailable();
    }

    deleteCollaboration(id: number): Observable<any> {
        return this.unavailable();
    }

    private unavailable(): Observable<never> {
        throw new Error('Company collaboration APIs are not available in the backend.');
    }
}

