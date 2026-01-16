import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FormDataUtil } from '../../shared/utils/form-data.util';
import { AccountService } from './account.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseUrl = `${environment.apiBaseUrl}/auth/users`;

  constructor(private http: HttpClient, private accountService: AccountService) { }

  sendRegistrationOtp(request: { phoneNumber: string; purpose?: 'register' }): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/auth/users/otp/`, request);
  }

  verifyRegistrationOtp(request: { phoneNumber: string; otp: string | null; otpId: string | null }): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/auth/users/otp/verify/`, request);
  }

  licenseeRegister(request: any): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/auth/users/register/licensee/final/`, request).pipe(
      tap((response: any) => {
        if (response.success && response.tokens) {
          localStorage.setItem('access', response.tokens.access);
          localStorage.setItem('refresh', response.tokens.refresh);
          if (response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
          }
        }
      }),
      // ✅ Load user profile after registration
      switchMap((response: any) => {
        console.log('✅ Registration successful, loading user profile...');
        return this.accountService.identity(true).pipe(
          tap(() => console.log('✅ User profile loaded after registration')),
          catchError(err => {
            console.warn('⚠️ Registration successful but failed to load profile:', err);
            // Don't fail the entire registration if profile load fails
            return throwError(() => err);
          }),
          switchMap(() => [response])
        );
      })
    );
  }

  licenseeSignup(data: any) {
    return this.http.post(`${environment.apiBaseUrl}/auth/users/register/licensee/`, data);
  }

  /**
   * ✅ Login and load user profile
   */
  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login/`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap((response: any) => {
        if (response?.authenticated_user?.access) {
          localStorage.setItem('access', response.authenticated_user.access);
          localStorage.setItem('refresh', response.authenticated_user.refresh);
          console.log('✅ Login successful, tokens saved');
        }
      }),
      // ✅ Load user profile after login
      switchMap((response: any) => {
        console.log('✅ Login successful, loading user profile...');
        return this.accountService.identity(true).pipe(
          tap(() => console.log('✅ User profile loaded after login')),
          catchError(err => {
            console.warn('⚠️ Login successful but failed to load profile:', err);
            return throwError(() => err);
          }),
          switchMap(() => [response])
        );
      }),
      catchError(error => throwError(() => error))
    );
  }

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
        console.log('✅ Logout successful, clearing app data');
        this.accountService.clearAppData();
      }),
      catchError(error => throwError(() => error))
    );
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh');
    if (!refreshToken) return throwError(() => new Error('Missing refresh token'));

    return this.http.post(`${this.baseUrl}/token/refresh/`, { refresh: refreshToken }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap(response => console.log('✅ Token refresh success:', response)),
      catchError(error => throwError(() => error))
    );
  }

  getCaptcha(): Observable<any> {
    return this.http.get(`${this.baseUrl}/get_captcha/`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  sendOtp(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/otp/`, formData).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * ✅ Verify OTP and load user profile
   */
  verifyOtp(data: { phoneNumber: string; otp: string; otpId: string }): Observable<any> {
    const formData = FormDataUtil.buildFormData(data);
    return this.http.post(`${this.baseUrl}/otp/login/`, formData).pipe(
      tap((response: any) => {
        if (response?.authenticated_user?.access) {
          localStorage.setItem('access', response.authenticated_user.access);
          localStorage.setItem('refresh', response.authenticated_user.refresh);
          console.log('✅ OTP login successful, tokens saved');
        }
      }),
      // ✅ Load user profile after OTP login
      switchMap((response: any) => {
        console.log('✅ OTP login successful, loading user profile...');
        return this.accountService.identity(true).pipe(
          tap(() => console.log('✅ User profile loaded after OTP login')),
          catchError(err => {
            console.warn('⚠️ OTP login successful but failed to load profile:', err);
            return throwError(() => err);
          }),
          switchMap(() => [response])
        );
      }),
      catchError(error => throwError(() => error))
    );
  }
}