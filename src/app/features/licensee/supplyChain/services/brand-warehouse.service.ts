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

        // Use the main endpoint since /grouped/ doesn't exist
        return this.http.get<any>(`${this.baseUrl}/`, { params }).pipe(
            map((response: any) => {
                let brands = [];
                if (Array.isArray(response)) {
                    brands = response;
                } else if (response?.results) {
                    brands = response.results;
                } else if (response?.data) {
                    brands = response.data;
                }

                // Group brands by brand name and create the expected structure
                const groupedBrands = new Map<string, any>();

                console.log('🔍 Processing brands for grouping:', brands.length);

                brands.forEach((brand: any) => {
                    const brandName = brand.brandDetails || brand.brand_details || 'Unknown Brand';
                    const distilleryName = brand.distilleryName || brand.distillery_name || '';
                    const brandType = brand.brandType || brand.brand_type || '';
                    const capacitySize = brand.capacitySize || brand.capacity_size || 0;
                    const currentStock = brand.currentStock || brand.current_stock || 0;
                    const maxCapacity = brand.maxCapacity || brand.max_capacity || 0;
                    const status = brand.status || 'OUT_OF_STOCK';
                    const totalUtilized = brand.totalUtilized || brand.total_utilized || 0;
                    const utilizationPercentage = brand.utilizationPercentage || brand.utilization_percentage || 0;
                    const isNew = brand.isNew || brand.is_new || false;

                    // Create a unique key for grouping (brand name + distillery)
                    const groupKey = `${brandName}_${distilleryName}`;

                    if (!groupedBrands.has(groupKey)) {
                        groupedBrands.set(groupKey, {
                            brandName: brandName,
                            distilleryName: distilleryName,
                            brandType: brandType,
                            packSizes: {},
                            totalStock: 0,
                            totalCapacity: 0,
                            totalUtilized: 0,
                            lastUpdated: new Date().toISOString(),
                            overallStatus: 'OUT_OF_STOCK',
                            isNew: false
                        });
                    }

                    const groupedBrand = groupedBrands.get(groupKey);

                    // Add pack size information
                    groupedBrand.packSizes[capacitySize] = {
                        id: brand.id?.toString() || '',
                        capacitySize: capacitySize,
                        currentStock: currentStock,
                        maxCapacity: maxCapacity,
                        status: status,
                        totalUtilized: totalUtilized,
                        reorderLevel: brand.reorderLevel || brand.reorder_level || 0,
                        utilizationPercentage: utilizationPercentage
                    };

                    // Update totals
                    groupedBrand.totalStock += currentStock;
                    groupedBrand.totalCapacity += maxCapacity;
                    groupedBrand.totalUtilized += totalUtilized;

                    // Update overall status (prioritize worst status)
                    if (status === 'OUT_OF_STOCK' || groupedBrand.overallStatus === 'OUT_OF_STOCK') {
                        groupedBrand.overallStatus = 'OUT_OF_STOCK';
                    } else if (status === 'LOW_STOCK' || groupedBrand.overallStatus === 'LOW_STOCK') {
                        groupedBrand.overallStatus = 'LOW_STOCK';
                    } else if (status === 'IN_STOCK') {
                        groupedBrand.overallStatus = 'IN_STOCK';
                    }

                    // Update NEW status
                    if (isNew) {
                        groupedBrand.isNew = true;
                    }
                });

                const result = Array.from(groupedBrands.values());
                console.log('✅ Grouped brands result:', result.length, 'groups');
                console.log('📋 Sample grouped brand:', result[0]);

                return result;
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
                let brands = [];
                if (Array.isArray(response)) {
                    brands = response;
                } else if (response?.results) {
                    brands = response.results;
                } else if (response?.data) {
                    brands = response.data;
                }

                // Transform backend response to match frontend expectations
                return brands.map((brand: any) => ({
                    id: brand.id,
                    distillery_name: brand.distilleryName || brand.distillery_name || '',
                    brand_type: brand.brandType || brand.brand_type || '',
                    brand_details: brand.brandDetails || brand.brand_details || '',
                    current_stock: brand.currentStock || brand.current_stock || 0,
                    capacity_size: brand.capacitySize || brand.capacity_size || 0,
                    total_capacity: brand.totalCapacity || brand.total_capacity || 0,
                    status: brand.status || 'OUT_OF_STOCK',
                    liquor_data: brand.liquorData || brand.liquor_data || null,
                    liquor_data_details: brand.liquorDataDetails || brand.liquor_data_details || null,
                    reorder_level: brand.reorderLevel || brand.reorder_level || 0,
                    max_capacity: brand.maxCapacity || brand.max_capacity || 0,
                    average_daily_usage: brand.averageDailyUsage || brand.average_daily_usage || 0,
                    total_utilized: brand.totalUtilized || brand.total_utilized || 0,
                    utilization_percentage: brand.utilizationPercentage || brand.utilization_percentage || 0,
                    utilizations: brand.utilizations || [],
                    created_at: brand.createdAt || brand.created_at || null,
                    updated_at: brand.updatedAt || brand.updated_at || null
                }));
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
        return this.http.post<any>(`${this.baseUrl}/initialize-all-brands/`, {}).pipe(
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
        // Since /overview/ doesn't exist, calculate from main data
        return this.getBrandWarehouses().pipe(
            map((brands: BrandWarehouse[]) => {
                const overview: WarehouseOverview = {
                    totalBrands: brands.length,
                    totalCapacity: brands.reduce((sum, b) => sum + (b.max_capacity || 0), 0),
                    totalCurrentStock: brands.reduce((sum, b) => sum + (b.current_stock || 0), 0),
                    lowStockAlerts: brands.filter(b => b.status === 'LOW_STOCK').length,
                    outOfStockAlerts: brands.filter(b => b.status === 'OUT_OF_STOCK').length,
                    newArrivals: 0, // TODO: Calculate from recent arrivals
                    todayProduction: 0, // TODO: Calculate from today's production
                    todayConsumption: 0, // TODO: Calculate from today's consumption
                    pendingAdjustments: 0 // TODO: Calculate from pending adjustments
                };
                return overview;
            }),
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
     * Can be called with just filters object or with brandWarehouseId + filters
     */
    getUtilizations(
        brandWarehouseIdOrFilters?: number | {
            brand_warehouse?: number;
            status?: string;
            date_from?: string;
            date_to?: string;
            limit?: number;
        },
        additionalFilters?: {
            limit?: number;
            status?: string;
            date_from?: string;
            date_to?: string;
        }
    ): Observable<BrandWarehouseUtilization[]> {
        let params = new HttpParams();
        let brandWarehouseId: number | undefined;

        // Handle overloaded parameters
        if (typeof brandWarehouseIdOrFilters === 'number') {
            // Called with brandWarehouseId as first parameter
            brandWarehouseId = brandWarehouseIdOrFilters;
            if (additionalFilters) {
                if (additionalFilters.limit) params = params.set('limit', additionalFilters.limit.toString());
                if (additionalFilters.status) params = params.set('status', additionalFilters.status);
                if (additionalFilters.date_from) params = params.set('date_from', additionalFilters.date_from);
                if (additionalFilters.date_to) params = params.set('date_to', additionalFilters.date_to);
            }
        } else if (brandWarehouseIdOrFilters) {
            // Called with filters object only
            const filters = brandWarehouseIdOrFilters;
            if (filters.brand_warehouse) {
                brandWarehouseId = filters.brand_warehouse;
                params = params.set('brand_warehouse', filters.brand_warehouse.toString());
            }
            if (filters.status) params = params.set('status', filters.status);
            if (filters.date_from) params = params.set('date_from', filters.date_from);
            if (filters.date_to) params = params.set('date_to', filters.date_to);
            if (filters.limit) params = params.set('limit', filters.limit.toString());
        }

        return this.http.get<any>(`${this.utilizationUrl}/`, { params }).pipe(
            map((response: any) => {
                let utilizations = [];
                if (Array.isArray(response)) {
                    utilizations = response;
                } else if (response?.results) {
                    utilizations = response.results;
                } else if (response?.data) {
                    utilizations = response.data;
                }

                // Filter by brandWarehouseId if specified and not already filtered by backend
                if (brandWarehouseId && utilizations.length > 0) {
                    utilizations = utilizations.filter((util: any) => 
                        util.brand_warehouse === brandWarehouseId || 
                        util.brand_warehouse_id === brandWarehouseId ||
                        util.brandWarehouse === brandWarehouseId
                    );
                }

                return utilizations;
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

    /**
     * Get arrivals (stock additions) for a brand warehouse
     */
    getArrivals(brandWarehouseId: number, filters?: { limit?: number; days?: number }): Observable<any[]> {
        let params = new HttpParams();
        if (filters?.limit) {
            params = params.set('limit', filters.limit.toString());
        }
        if (filters?.days) {
            params = params.set('days', filters.days.toString());
        }

        return this.http.get<any>(`${this.baseUrl}/${brandWarehouseId}/arrivals/`, { params }).pipe(
            map((response: any) => response?.arrivals || response || []),
            catchError((error) => {
                console.error('getArrivals error:', error);
                return of([]);
            })
        );
    }


}
