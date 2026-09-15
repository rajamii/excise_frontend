import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface IMFLBrandItem {
  id?: number;
  supplier?: number;
  supplier_id?: number;
  supplierId?: number;
  supplier_name?: string;
  supplierName?: string;
  supplier_master_name?: string;
  supplierMasterName?: string;
  brand_name: string;
  brandName?: string;
  size_ml: number;
  sizeMl?: number;
  pieces_per_case: number;
  piecesPerCase?: number;
  edp_per_case: number;
  edpPerCase?: number;
  import_pass_fee_per_case: number;
  importPassFeePerCase?: number;
  mrp_per_bottle: number;
  mrpPerBottle?: number;
  additional_ed_per_case: number;
  additionalEdPerCase?: number;
  education_cess_per_case: number;
  educationCessPerCase?: number;
  created_at?: string;
  createdAt?: string;
}

export interface IMFLSupplierItem {
  id?: number;
  supplier_master_name: string;
  supplierMasterName?: string;
  supplier_name: string;
  supplierName?: string;
  address?: string;
  route_details?: string;
  routeDetails?: string;
  brands?: IMFLBrandItem[];
  brands_count?: number;
  brandsCount?: number;
  created_at?: string;
  createdAt?: string;
}

export interface SupplierBrandStats {
  totalSuppliers: number;
  totalBrands: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImflSupplierBrandService {
  private http = inject(HttpClient);
  private suppliersUrl = `${environment.apiBaseUrl}/transactional/distributor-permit/admin-suppliers`;
  private brandsUrl = `${environment.apiBaseUrl}/transactional/distributor-permit/admin-brands`;

  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  // Suppliers CRUD
  getSuppliers(search?: string): Observable<IMFLSupplierItem[] | { results: IMFLSupplierItem[] }> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('q', search.trim());
    }
    return this.http.get<IMFLSupplierItem[] | { results: IMFLSupplierItem[] }>(`${this.suppliersUrl}/`, { params });
  }

  getSupplier(id: number): Observable<IMFLSupplierItem> {
    return this.http.get<IMFLSupplierItem>(`${this.suppliersUrl}/${id}/`);
  }

  createSupplier(data: Partial<IMFLSupplierItem>): Observable<IMFLSupplierItem> {
    return this.http.post<IMFLSupplierItem>(`${this.suppliersUrl}/`, data).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  updateSupplier(id: number, data: Partial<IMFLSupplierItem>): Observable<IMFLSupplierItem> {
    return this.http.put<IMFLSupplierItem>(`${this.suppliersUrl}/${id}/`, data).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  deleteSupplier(id: number): Observable<any> {
    return this.http.delete<any>(`${this.suppliersUrl}/${id}/`).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  getSummaryStats(): Observable<SupplierBrandStats> {
    return this.http.get<SupplierBrandStats>(`${this.suppliersUrl}/summary-stats/`);
  }

  // Brands CRUD
  getBrands(supplierId?: number, search?: string): Observable<IMFLBrandItem[] | { results: IMFLBrandItem[] }> {
    let params = new HttpParams();
    if (supplierId) {
      params = params.set('supplier_id', supplierId.toString());
    }
    if (search && search.trim()) {
      params = params.set('q', search.trim());
    }
    return this.http.get<IMFLBrandItem[] | { results: IMFLBrandItem[] }>(`${this.brandsUrl}/`, { params });
  }

  getBrand(id: number): Observable<IMFLBrandItem> {
    return this.http.get<IMFLBrandItem>(`${this.brandsUrl}/${id}/`);
  }

  createBrand(data: Partial<IMFLBrandItem>): Observable<IMFLBrandItem> {
    return this.http.post<IMFLBrandItem>(`${this.brandsUrl}/`, data).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  updateBrand(id: number, data: Partial<IMFLBrandItem>): Observable<IMFLBrandItem> {
    return this.http.put<IMFLBrandItem>(`${this.brandsUrl}/${id}/`, data).pipe(
      tap(() => this.triggerRefresh())
    );
  }

  deleteBrand(id: number): Observable<any> {
    return this.http.delete<any>(`${this.brandsUrl}/${id}/`).pipe(
      tap(() => this.triggerRefresh())
    );
  }
}
