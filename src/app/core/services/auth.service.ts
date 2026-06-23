import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FormDataUtil } from '../../shared/utils/form-data.util';
import { AccountService } from './account.service';

@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private readonly blockedUsersStorageKey = 'frontend_blocked_users';

  private baseUrl = `${environment.apiBaseUrl}/auth/users`;

  constructor(private http: HttpClient, private accountService: AccountService) { }

  private getBlockedUsers(): Array<{ username?: string; phoneNumber?: string }> {
    try {
      const raw = localStorage.getItem(this.blockedUsersStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private isBlockedByUsername(username: string): boolean {
    const normalized = String(username || '').trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return this.getBlockedUsers().some(
      entry => String(entry?.username || '').trim().toLowerCase() === normalized
    );
  }

  private isBlockedByPhone(phoneNumber: string): boolean {
    const normalized = String(phoneNumber || '').replace(/\D/g, '').slice(0, 10);
    if (!normalized) {
      return false;
    }
    return this.getBlockedUsers().some(
      entry => String(entry?.phoneNumber || '').replace(/\D/g, '').slice(0, 10) === normalized
    );
  }

  private blockedUserError(): Observable<never> {
    return throwError(() => ({
      status: 403,
      error: {
        detail: 'This user has been deleted and is not allowed to log in from this system.'
      }
    }));
  }

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
      
      // Load user profile after registration
      switchMap((response: any) => {
        return this.accountService.identity(true).pipe(
          catchError(err => {
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

  // Login and load user profile
  login(data: any): Observable<any> {
    if (this.isBlockedByUsername(String(data?.username || ''))) {
      return this.blockedUserError();
    }
    return this.http.post(`${this.baseUrl}/login/`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    }).pipe(
      tap((response: any) => {
        if (response?.authenticated_user?.access) {
          localStorage.setItem('access', response.authenticated_user.access);
          localStorage.setItem('refresh', response.authenticated_user.refresh);
        }
      }),
      
      // Load user profile after login
      switchMap((response: any) => {
        return this.accountService.identity(true).pipe(
          catchError(err => {
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
      catchError(error => throwError(() => error))
    );
  }

  getCaptcha(): Observable<any> {
    return this.http.get(`${this.baseUrl}/get_captcha/`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  sendOtp(formData: FormData): Observable<any> {
    const phoneNumber = String(formData.get('phoneNumber') || '');
    if (this.isBlockedByPhone(phoneNumber)) {
      return this.blockedUserError();
    }
    return this.http.post(`${this.baseUrl}/otp/`, formData).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Verify OTP and load user profile
  verifyOtp(
    data: { phoneNumber: string; otp: string; otpId: string },
    options?: { loadProfile?: boolean }
  ): Observable<any> {
    if (this.isBlockedByPhone(String(data?.phoneNumber || ''))) {
      return this.blockedUserError();
    }
    const loadProfile = options?.loadProfile !== false;
    const formData = FormDataUtil.buildFormData(data);
    return this.http.post(`${this.baseUrl}/otp/login/`, formData).pipe(
      tap((response: any) => {
        if (response?.authenticated_user?.access) {
          localStorage.setItem('access', response.authenticated_user.access);
          localStorage.setItem('refresh', response.authenticated_user.refresh);
        }
      }),
      switchMap((response: any) => {
        if (!loadProfile) {
          return of(response);
        }
        return this.accountService.identity(true).pipe(switchMap(() => [response]));
      }),
      catchError(error => throwError(() => error))
    );
  }

  // Send email with the reset link
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/password-reset/`, { email });
  }

  // Confirm the new password using the token from the email
  confirmPasswordReset(payload: { uidb64: string, token: string, new_password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/password-reset-confirm/`, payload);
  }
}
