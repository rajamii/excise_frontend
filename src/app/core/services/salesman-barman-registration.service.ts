import { Injectable } from '@angular/core';
import { SalesmanBarmanDocuments } from '../models/salesman-barman.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SalesmanBarmanRegistrationService {
  private baseUrl = `${environment.apiBaseUrl}/salesman_barman`; // Base URL for the API
  private salesmanBarmanDocs: Partial<Record<keyof SalesmanBarmanDocuments, File>> = {};

  constructor(private http: HttpClient) { }

  getSalesmanBarmanList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list /`);
  }

  createSalesmanBarman(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/create/`, data);
  }

  getSalesmanBarmanDetail(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/detail/${id}/`);
  }

  setSalesmanBarmanDocuments(docs: Partial<Record<keyof SalesmanBarmanDocuments, File>>): void {
    this.salesmanBarmanDocs = { ...this.salesmanBarmanDocs, ...docs };
  }

  getSalesmanBarmanDocuments(): Partial<Record<keyof SalesmanBarmanDocuments, File>> {
    return this.salesmanBarmanDocs;
  }

  clearSalesmanBarmanDocuments(): void {
    this.salesmanBarmanDocs = {};
  }
}
