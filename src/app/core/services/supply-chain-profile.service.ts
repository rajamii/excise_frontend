
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ManufacturingUnit {
    name: string;
    licenseeId: string;
    type: string;
}

export interface SupplyChainProfile {
    manufacturingUnitName: string;
    licenseeId: string;
    licenseType?: string;
    address?: string;
    user?: number;
}

export interface ProfileResponse {
    success: boolean;
    exists: boolean;
    data: SupplyChainProfile | null;
}

@Injectable({
    providedIn: 'root'
})
export class SupplyChainProfileService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiBaseUrl}/masters/supply_chain/user-profile`;

    constructor() { }

    getManufacturingUnits(): Observable<{ success: boolean, data: ManufacturingUnit[] }> {
        return this.http.get<{ success: boolean, data: ManufacturingUnit[] }>(`${environment.apiBaseUrl}/masters/supply_chain/user-profile/units/`);
    }

    getProfile(): Observable<ProfileResponse> {
        return this.http.get<ProfileResponse>(`${this.apiUrl}/profile/`);
    }

    createProfile(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/profile/`, data);
    }

    resetProfile(): Observable<any> {
        return this.http.delete(`${this.apiUrl}/profile/`);
    }


}
