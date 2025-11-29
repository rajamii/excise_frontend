// ena-requisition.service.ts
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EnaRequisitionService {
  private apiUrl = `${environment.apiBaseUrl}/transactional/supply_chain/ena-requisitions/`;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error) {
        errorMessage += `\nDetails: ${JSON.stringify(error.error)}`;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  createRequisition(requisitionData: any): Observable<any> {
    return this.http
      .post(this.apiUrl, requisitionData, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getRequisitions(): Observable<any> {
    return this.http
      .get(this.apiUrl, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getRequisitionById(id: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}${id}/`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  updateRequisition(id: string, requisitionData: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}${id}/`, requisitionData, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  deleteRequisition(id: string): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}${id}/`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getNextRefNumber(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}next-ref-number/`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  updateStatus(id: number, statusCode: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}${id}/update-status/`, { status_code: statusCode }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }
}
