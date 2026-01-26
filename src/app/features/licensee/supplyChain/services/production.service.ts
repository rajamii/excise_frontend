import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface ProductionBatch {
  id: number;
  batchReference: string;
  sourceReference?: string;  // Request Register Entry reference number
  productionDate: string;
  productionTime: string;
  productionDatetime: string;
  formattedReference: string;
  quantityProduced: number;
  stockBefore: number;
  stockAfter: number;
  productionManager: string;
  approvedBy?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  brandName: string;
  packSize: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionSummary {
  total_batches: number;
  total_quantity: number;
  average_batch_size: number;
  today_production: number;
  today_batches: number;
  week_production: number;
  week_batches: number;
  month_production: number;
  month_batches: number;
  last_production_date?: string;
  period_days: number;
}

export interface DailyProductionSummary {
  date: string;
  total_quantity: number;
  batch_count: number;
  brands_produced: string[];
  production_managers: string[];
  reference_numbers: string[];
}

export interface CreateProductionBatch {
  brand_warehouse_id: number;
  batch_reference?: string;
  production_date: string;
  production_time: string;
  quantity_produced: number;
  production_manager: string;
  approved_by?: string;
  notes?: string;
}

export interface ProductionHistoryResponse {
  success: boolean;
  productionHistory: ProductionBatch[];  // Changed from production_history to productionHistory
  summary: {
    totalQuantity: number;  // Changed from total_quantity
    totalBatches: number;   // Changed from total_batches
    averageBatchSize: number;  // Changed from average_batch_size
    periodDays: number;     // Changed from period_days
  };
  brandInfo: {
    brandName: string;      // Changed from brand_name
    packSize: string;       // Changed from pack_size
    currentStock: number;   // Changed from current_stock
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProductionService {
  private readonly API_BASE = `${environment.apiBaseUrl}/transactional/supply_chain/brand-warehouse`;

  constructor(private http: HttpClient) { }

  /**
   * Get production history for a specific brand warehouse
   */
  getProductionHistory(brandWarehouseId: number, limit: number = 20, days: number = 30): Observable<ProductionHistoryResponse> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('days', days.toString());

    return this.http.get<ProductionHistoryResponse>(
      `${this.API_BASE}/brand-warehouse/${brandWarehouseId}/production-history/`,
      { params }
    );
  }

  /**
   * Add a new production batch
   */
  addProductionBatch(brandWarehouseId: number, productionData: CreateProductionBatch): Observable<any> {
    return this.http.post(
      `${this.API_BASE}/brand-warehouse/${brandWarehouseId}/add-production/`,
      productionData
    );
  }

  /**
   * Get overall production summary for all Sikkim brands
   */
  getProductionSummary(days: number = 30): Observable<{ success: boolean; summary: ProductionSummary }> {
    const params = new HttpParams().set('days', days.toString());
    
    return this.http.get<{ success: boolean; summary: ProductionSummary }>(
      `${this.API_BASE}/brand-warehouse/production-summary/`,
      { params }
    );
  }

  /**
   * Get daily production summary
   */
  getDailyProductionSummary(date?: string): Observable<{
    success: boolean;
    date: string;
    summary: DailyProductionSummary;
    batches: ProductionBatch[];
  }> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }

    return this.http.get<{
      success: boolean;
      date: string;
      summary: DailyProductionSummary;
      batches: ProductionBatch[];
    }>(`${this.API_BASE}/production-batch/daily-summary/`, { params });
  }

  /**
   * Get production data for a specific brand
   */
  getBrandProduction(brandWarehouseId: number, days: number = 30): Observable<{
    success: boolean;
    brand_info: {
      id: number;
      brand_name: string;
      pack_size: string;
      current_stock: number;
    };
    summary: {
      total_quantity: number;
      total_batches: number;
      average_batch_size: number;
      period_days: number;
    };
    production_history: ProductionBatch[];
  }> {
    const params = new HttpParams()
      .set('brand_warehouse_id', brandWarehouseId.toString())
      .set('days', days.toString());

    return this.http.get<any>(
      `${this.API_BASE}/production-batch/brand-production/`,
      { params }
    );
  }

  /**
   * Get all production batches with filters
   */
  getProductionBatches(filters?: {
    brand_warehouse?: number;
    date_from?: string;
    date_to?: string;
    status?: string;
  }): Observable<ProductionBatch[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.brand_warehouse) {
        params = params.set('brand_warehouse', filters.brand_warehouse.toString());
      }
      if (filters.date_from) {
        params = params.set('date_from', filters.date_from);
      }
      if (filters.date_to) {
        params = params.set('date_to', filters.date_to);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
    }

    return this.http.get<ProductionBatch[]>(
      `${this.API_BASE}/production-batch/`,
      { params }
    );
  }

  /**
   * Create a new production batch
   */
  createProductionBatch(productionData: CreateProductionBatch): Observable<{
    success: boolean;
    message: string;
    production_batch: ProductionBatch;
    updated_stock: {
      previous_stock: number;
      new_stock: number;
      quantity_added: number;
    };
  }> {
    return this.http.post<any>(
      `${this.API_BASE}/production-batch/`,
      productionData
    );
  }

  /**
   * Update a production batch
   */
  updateProductionBatch(batchId: number, productionData: Partial<CreateProductionBatch>): Observable<ProductionBatch> {
    return this.http.patch<ProductionBatch>(
      `${this.API_BASE}/production-batch/${batchId}/`,
      productionData
    );
  }

  /**
   * Delete a production batch
   */
  deleteProductionBatch(batchId: number): Observable<any> {
    return this.http.delete(
      `${this.API_BASE}/production-batch/${batchId}/`
    );
  }
}