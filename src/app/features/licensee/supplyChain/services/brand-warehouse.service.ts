import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';

// Interfaces
export interface BrandWarehouseUtilization {
    id?: number;
    brand_warehouse?: number;
    permit_no: string;
    date: string;
    distributor: string;
    depot_address: string;
    vehicle: string;
    quantity: number;
    cases: number;
    bottles_per_case: number;
    total_bottles?: number;
    status: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
    approved_by?: string;
    approval_date?: string;
    created_at?: string;
    updated_at?: string;
}

export interface BrandWarehouse {
    id?: number;
    distillery_name: string;
    brand_type: string;
    brand_details?: string;
    current_stock: number;
    capacity_size: number;
    total_capacity?: number;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';
    liquor_data?: number;
    liquor_data_details?: any;
    reorder_level: number;
    max_capacity: number;
    average_daily_usage: number;
    total_utilized?: number;
    utilization_percentage?: number;
    utilizations?: BrandWarehouseUtilization[];
    created_at?: string;
    updated_at?: string;
}

export interface WarehouseOverview {
    totalBrands: number;
    totalCapacity: number;
    totalCurrentStock: number;
    lowStockAlerts: number;
    outOfStockAlerts: number;
    newArrivals: number;
    todayProduction: number;
    todayConsumption: number;
    pendingAdjustments: number;
}

export interface StockAdjustment {
    adjustment_type: 'ADD' | 'SUBTRACT';
    quantity: number;
    reason: string;
}

@Injectable({
    providedIn: 'root'
})
export class BrandWarehouseService {
    private baseUrl = `${environment.apiBaseUrl}/transactional/supply_chain/brand-warehouse/brand-warehouse`;
    private utilizationUrl = `${environment.apiBaseUrl}/transactional/supply_chain/brand-warehouse/brand-warehouse-utilization`;

    constructor(private http: HttpClient) { }

    /**
     * Get brands grouped by brand name with all pack sizes
     */
    getGroupedBrandWarehouses(filters?: {
        distillery_name?: string;
        brand_type?: string;
        status?: string;
        stock_level?: string;
    }): Observable<any[]> {
        let params = new HttpParams();

        if (filters) {
            if (filters.distillery_name) params = params.set('distillery_name', filters.distillery_name);
            if (filters.brand_type) params = params.set('brand_type', filters.brand_type);
            if (filters.status) params = params.set('status', filters.status);
            if (filters.stock_level) params = params.set('stock_level', filters.stock_level);
        }

        return this.http.get<any>(`${this.baseUrl}/grouped/`, { params }).pipe(
            map((response: any) => {
                if (Array.isArray(response)) return response;
                if (response?.results) return response.results;
                if (response?.data) return response.data;
                return [];
            }),
            catchError((error) => {
                console.error('getGroupedBrandWarehouses error:', error);
                return of([]);
            })
        );
    }

    /**
     * Get all brand warehouse entries with optional filters
     */
    getBrandWarehouses(filters?: {
        distillery_name?: string;
        brand_type?: string;
        status?: string;
        stock_level?: string;
    }): Observable<BrandWarehouse[]> {
        let params = new HttpParams();

        if (filters) {
            if (filters.distillery_name) params = params.set('distillery_name', filters.distillery_name);
            if (filters.brand_type) params = params.set('brand_type', filters.brand_type);
            if (filters.status) params = params.set('status', filters.status);
            if (filters.stock_level) params = params.set('stock_level', filters.stock_level);
        }

        return this.http.get<any>(`${this.baseUrl}/`, { params }).pipe(
            map((response: any) => {
                if (Array.isArray(response)) return response;
                if (response?.results) return response.results;
                if (response?.data) return response.data;
                return [];
            }),
            catchError((error) => {
                console.error('getBrandWarehouses error:', error);
                return of([]);
            })
        );
    }

    /**
     * Get single brand warehouse entry by ID
     */
    getBrandWarehouseById(id: number): Observable<BrandWarehouse | null> {
        return this.http.get<any>(`${this.baseUrl}/${id}/`).pipe(
            map((response: any) => response?.data || response || null),
            catchError((error) => {
                console.error('getBrandWarehouseById error:', error);
                return of(null);
            })
        );
    }

    /**
     * Create new brand warehouse entry
     */
    createBrandWarehouse(data: Partial<BrandWarehouse>): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/`, data).pipe(
            catchError((error) => {
                console.error('createBrandWarehouse error:', error);
                throw error;
            })
        );
    }

    /**
     * Update brand warehouse entry
     */
    updateBrandWarehouse(id: number, data: Partial<BrandWarehouse>): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/${id}/`, data).pipe(
            catchError((error) => {
                console.error('updateBrandWarehouse error:', error);
                throw error;
            })
        );
    }

    /**
     * Partially update brand warehouse entry
     */
    patchBrandWarehouse(id: number, data: Partial<BrandWarehouse>): Observable<any> {
        return this.http.patch<any>(`${this.baseUrl}/${id}/`, data).pipe(
            catchError((error) => {
                console.error('patchBrandWarehouse error:', error);
                throw error;
            })
        );
    }

    /**
     * Delete brand warehouse entry
     */
    deleteBrandWarehouse(id: number): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/${id}/`).pipe(
            catchError((error) => {
                console.error('deleteBrandWarehouse error:', error);
                throw error;
            })
        );
    }

    /**
     * Initialize Sikkim brands from liquor_data_details
     */
    initializeSikkimBrands(): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/initialize-sikkim-brands/`, {}).pipe(
            catchError((error) => {
                console.error('initializeSikkimBrands error:', error);
                throw error;
            })
        );
    }

    /**
     * Add utilization record to a brand warehouse
     */
    addUtilization(brandWarehouseId: number, data: Partial<BrandWarehouseUtilization>): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/${brandWarehouseId}/add-utilization/`,
            data
        ).pipe(
            catchError((error) => {
                console.error('addUtilization error:', error);
                throw error;
            })
        );
    }

    /**
     * Adjust stock for a brand warehouse
     */
    adjustStock(brandWarehouseId: number, adjustment: StockAdjustment): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/${brandWarehouseId}/adjust-stock/`,
            adjustment
        ).pipe(
            catchError((error) => {
                console.error('adjustStock error:', error);
                throw error;
            })
        );
    }

    /**
     * Get warehouse overview statistics
     */
    getWarehouseOverview(): Observable<WarehouseOverview> {
        return this.http.get<any>(`${this.baseUrl}/overview/`).pipe(
            map((response: any) => response?.data || response || {}),
            catchError((error) => {
                console.error('getWarehouseOverview error:', error);
                return of({
                    totalBrands: 0,
                    totalCapacity: 0,
                    totalCurrentStock: 0,
                    lowStockAlerts: 0,
                    outOfStockAlerts: 0,
                    newArrivals: 0,
                    todayProduction: 0,
                    todayConsumption: 0,
                    pendingAdjustments: 0
                });
            })
        );
    }

    /**
     * Get utilization records with optional filters
     */
    getUtilizations(filters?: {
        brand_warehouse?: number;
        status?: string;
        date_from?: string;
        date_to?: string;
    }): Observable<BrandWarehouseUtilization[]> {
        let params = new HttpParams();

        if (filters) {
            if (filters.brand_warehouse) params = params.set('brand_warehouse', filters.brand_warehouse.toString());
            if (filters.status) params = params.set('status', filters.status);
            if (filters.date_from) params = params.set('date_from', filters.date_from);
            if (filters.date_to) params = params.set('date_to', filters.date_to);
        }

        return this.http.get<any>(`${this.utilizationUrl}/`, { params }).pipe(
            map((response: any) => {
                if (Array.isArray(response)) return response;
                if (response?.results) return response.results;
                if (response?.data) return response.data;
                return [];
            }),
            catchError((error) => {
                console.error('getUtilizations error:', error);
                return of([]);
            })
        );
    }

    /**
     * Approve a utilization record
     */
    approveUtilization(utilizationId: number, approvedBy: string): Observable<any> {
        return this.http.post<any>(
            `${this.utilizationUrl}/${utilizationId}/approve/`,
            { approved_by: approvedBy }
        ).pipe(
            catchError((error) => {
                console.error('approveUtilization error:', error);
                throw error;
            })
        );
    }

    /**
     * Cancel a utilization record
     */
    cancelUtilization(utilizationId: number): Observable<any> {
        return this.http.post<any>(
            `${this.utilizationUrl}/${utilizationId}/cancel/`,
            {}
        ).pipe(
            catchError((error) => {
                console.error('cancelUtilization error:', error);
                throw error;
            })
        );
    }
}
