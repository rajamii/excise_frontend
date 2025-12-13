import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FormDataUtil } from '../../shared/utils/form-data.util';
import { AccountService } from './account.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseUrl = `${environment.apiBaseUrl}/auth/users`;  // ✅ Changed from /user to /auth/users

  constructor(private http: HttpClient, private accountService: AccountService) {}

  // Standard login using JSON body
  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login/`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Logout user by sending refresh token and Authorization header.
   * Returns error if either token is missing.
   */
  logout(): Observable<any> {
    const refresh = localStorage.getItem('refresh');
    const access = localStorage.getItem('access');

    if (!refresh || !access) return throwError(() => new Error('No token found'));

    const headers = {
      'Authorization': `Bearer ${access}`,
      'Content-Type': 'application/json'
    };

    return this.http.post(`${this.baseUrl}/logout/`, { refresh }, { headers }).pipe(
      tap(() => {
        // Clear data and emit auth state change
        this.accountService.clearAppData();
      }),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Requests a new access token using the refresh token.
   * Logs success in console for debug.
   */
  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh');
    if (!refreshToken) return throwError(() => new Error('Missing refresh token'));

    return this.http.post(`${this.baseUrl}/token/refresh/`, { refresh: refreshToken }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap(response => console.log('Refresh success:', response)), // Debug log
      catchError(error => throwError(() => error))
    );
  }

  // Gets a CAPTCHA image or challenge for the login form
  getCaptcha(): Observable<any> {
    return this.http.get(`${this.baseUrl}/get_captcha/`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Sends OTP request with multipart form data (e.g., for phone verification)
  sendOtp(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/otp/`, formData).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Verifies OTP using form-data format, built using utility service.
   * Used for login after OTP is sent.
   */
  verifyOtp(data: { phoneNumber: string; otp: string; otpId: string }): Observable<any> {
    const formData = FormDataUtil.buildFormData(data);
    return this.http.post(`${this.baseUrl}/otp/login/`, formData).pipe(
      catchError(error => throwError(() => error))
    );
  }
}