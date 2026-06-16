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
    license_id?: string;
    factory_id?: number | null;
    factory_name?: string;
    distillery_name: string;
    brand_type: string;
    brand_id?: number | null;
    brand_name?: string;
    liquor_type?: number | null;
    current_stock: number;
    capacity_size: number;
    ex_factory_price_rs_per_case?: number;
    excise_duty_rs_per_case?: number;
    education_cess_rs_per_case?: number;
    additional_excise_duty_rs_per_case?: number;
    additional_excise_duty_12_5_percent_rs_per_case?: number;
    mrp_rs_per_bottle?: number;
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
    // Prefer transactional routes: many production reverse proxies only forward `/transactional/...` to Django.
    private baseUrl = `${environment.apiBaseUrl}/transactional/supply_chain/brand-warehouse/brand-warehouse`; 
    private utilizationUrl = `${environment.apiBaseUrl}/transactional/supply_chain/brand-warehouse/brand-warehouse-utilization`; 

    constructor(private http: HttpClient) { } 
 
    private normalizeValidLicenseId(value?: string): string { 
        // Guardrail: only send `license_id` when it matches an issued/app id format.
        // Sending numeric/plain ids can accidentally over-restrict scoped queries on the server.
        const normalized = String(value || '').trim(); 
        if ( 
            normalized.startsWith('NA/') || 
            normalized.startsWith('NLI/') || 
            normalized.startsWith('LA/') ||
            normalized.startsWith('SB/') ||
            /^MP[A-Z0-9]+$/i.test(normalized)
        ) { 
            return normalized; 
        } 
        return ''; 
    } 

    /**
     * Get brands grouped by brand name with all pack sizes
     */
    getGroupedBrandWarehouses(filters?: {
        license_id?: string;
        distillery_name?: string;
        brand_type?: string;
        status?: string;
        stock_level?: string;
    }): Observable<any[]> {
        let params = new HttpParams();

        if (filters) {
            const normalizedLicenseId = this.normalizeValidLicenseId(filters.license_id);
            if (normalizedLicenseId) params = params.set('license_id', normalizedLicenseId);
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
                    const brandId = brand.brandId ?? brand.brand_id ?? null;
                    const brandName = brand.brandName || brand.brand_name || 'Unknown Brand';
                    const licenseId = String(brand.licenseId || brand.license_id || '').trim();
                    const factoryId = brand.factoryId ?? brand.factory_id ?? null;
                    const factoryName = brand.factoryName || brand.factory_name || '';
                    const distilleryName = brand.distilleryName || brand.distillery_name || factoryName || '';
                    const brandType = brand.brandType || brand.brand_type || '';
                    const capacitySize = brand.capacitySize || brand.capacity_size || 0;
                    const currentStock = brand.currentStock || brand.current_stock || 0;
                    const maxCapacity = brand.maxCapacity || brand.max_capacity || 0;
                    const status = brand.status || 'OUT_OF_STOCK';
                    const totalUtilized = brand.totalUtilized || brand.total_utilized || 0;
                    const utilizationPercentage = brand.utilizationPercentage || brand.utilization_percentage || 0;
                    const isNew = brand.isNew || brand.is_new || false;

                    // Create a unique key for grouping (brand name + distillery)
                    const groupKey = `${brandId ?? brandName}_${licenseId || distilleryName}`;

                    if (!groupedBrands.has(groupKey)) {
                        groupedBrands.set(groupKey, {
                            factoryId: factoryId,
                            factoryName: factoryName || distilleryName,
                            brandId: brandId,
                            brandName: brandName,
                            licenseId: licenseId || '',
                            distilleryName: distilleryName,
                            brandType: brandType,
                            packSizes: {},
                            totalStock: 0,
                            totalCapacity: 0,
                            totalUtilized: 0,
                            lastUpdated: brand.updatedAt || brand.updated_at || brand.createdAt || brand.created_at || '',
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

                    // Keep most recent update timestamp in grouped row
                    const incomingUpdatedAt = brand.updatedAt || brand.updated_at || brand.createdAt || brand.created_at;
                    if (incomingUpdatedAt) {
                        const currentTs = new Date(groupedBrand.lastUpdated).getTime() || 0;
                        const incomingTs = new Date(incomingUpdatedAt).getTime() || 0;
                        if (incomingTs > currentTs) {
                            groupedBrand.lastUpdated = incomingUpdatedAt;
                        }
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
        license_id?: string;
        distillery_name?: string;
        brand_type?: string;
        status?: string;
        stock_level?: string;
    }): Observable<BrandWarehouse[]> {
        let params = new HttpParams();

        if (filters) {
            const normalizedLicenseId = this.normalizeValidLicenseId(filters.license_id);
            if (normalizedLicenseId) params = params.set('license_id', normalizedLicenseId);
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
                    license_id: String(brand.licenseId || brand.license_id || '').trim(),
                    factory_id: brand.factoryId ?? brand.factory_id ?? null,
                    factory_name: brand.factoryName || brand.factory_name || '',
                    distillery_name: brand.distilleryName || brand.distillery_name || brand.factoryName || brand.factory_name || '',
                    brand_type: brand.brandType || brand.brand_type || '',
                    brand_id: brand.brandId ?? brand.brand_id ?? null,
                    brand_name: brand.brandName || brand.brand_name || '',
                    liquor_type: brand.liquorType ?? brand.liquor_type ?? null,
                    current_stock: brand.currentStock || brand.current_stock || 0,
                    capacity_size: brand.capacitySize || brand.capacity_size || 0,
                    ex_factory_price_rs_per_case: Number(brand.exFactoryPriceRsPerCase ?? brand.ex_factory_price_rs_per_case ?? 0),
                    excise_duty_rs_per_case: Number(brand.exciseDutyRsPerCase ?? brand.excise_duty_rs_per_case ?? 0),
                    education_cess_rs_per_case: Number(brand.educationCessRsPerCase ?? brand.education_cess_rs_per_case ?? 0),
                    additional_excise_duty_rs_per_case: Number(brand.additionalExciseDutyRsPerCase ?? brand.additional_excise_duty_rs_per_case ?? 0),
                    additional_excise_duty_12_5_percent_rs_per_case: Number(brand.additionalExciseDuty125PercentRsPerCase ?? brand.additional_excise_duty_12_5_percent_rs_per_case ?? 0),
                    mrp_rs_per_bottle: Number(brand.mrpRsPerBottle ?? brand.mrp_rs_per_bottle ?? 0),
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
    getWarehouseOverview(filters?: {
        license_id?: string;
        distillery_name?: string;
        brand_type?: string;
        status?: string;
        stock_level?: string;
    }): Observable<WarehouseOverview> {
        // Since /overview/ doesn't exist, calculate from main data
        return this.getBrandWarehouses(filters).pipe(
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
            params = params.set('brand_warehouse', brandWarehouseId.toString());
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
     * Get monthly production total from production-summary endpoint
     */
    getMonthlyProductionTotal(days: number): Observable<number> {
        const params = new HttpParams().set('days', days.toString());
        return this.http.get<any>(
            `${this.baseUrl}/production-summary/`,
            { params }
        ).pipe(
            map((res: any) => {
                // API returns camelCase keys via response renderer
                const val =
                    res?.summary?.monthProduction ??
                    res?.summary?.month_production ??
                    res?.summary?.totalQuantity ??
                    res?.summary?.total_quantity ??
                    0;
                return Number(val) || 0;
            }),
            catchError((err) => {
                console.error('getMonthlyProductionTotal error:', err);
                return of(0);
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

    /**
     * Get cancelled permits for a brand warehouse
     */
    getCancellations(brandWarehouseId: number): Observable<any[]> {
        return this.http.get<any>(`${this.baseUrl}/${brandWarehouseId}/canceled-permits/`).pipe(
            map((response: any) => response?.cancellations || []),
            catchError((error) => {
                console.error('getCancellations error:', error);
                return of([]);
            })
        );
    }


}
