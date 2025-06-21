import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = `${environment.apiBaseUrl}`; // Base URL for the API
  private apiUrl = `${this.baseUrl}/api`;

  constructor(private http: HttpClient) {}

  // Fetch CAPTCHA image or data from the backend
  getCaptcha(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/user/get_captcha/`).pipe(
      catchError((error) => {
        console.error('Error fetching CAPTCHA:', error);
        return throwError(() => error);
      })
    );
  }

  // Login request to authenticate user
  login(data: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(`${this.baseUrl}/user/login/`, data, { headers }).pipe(
      catchError((error) => {
        console.error('Login failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Send OTP to user's registered contact (email/phone)
  sendOtp(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/user/otp/`, formData).pipe(
      catchError((error) => {
        console.error('Error sending OTP:', error);
        return throwError(() => error);
      })
    );
  }

  // Verify the received OTP for login
  verifyOtp(data:{phonenumber: string, otp: string, otp_id: string}): Observable<any> {
      return this.http.post(`${this.baseUrl}/user/otp/login/`, data).pipe(
      catchError((error) => {
        console.error('❌ OTP verification error:', error);
        return throwError(() => new Error('Failed to verify OTP.'));
      })
    );
  }

  // Logout the user and invalidate refresh token
  logout(): Observable<any> {
    const refresh = localStorage.getItem('refresh');
    const access = localStorage.getItem('access');
  
    if (!refresh || !access) {
      console.error("No token found for logout.");
      return throwError(() => new Error("No token found"));
    }

    // Include access token in Authorization header
    const headers = {
      'Authorization': `Bearer ${access}`,
      'Content-Type': 'application/json'
    };
  
    return this.http.post(`${this.baseUrl}/user/logout/`, { refresh }, { headers }).pipe(
      catchError((error) => {
        console.error('Logout failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Refresh access token using the refresh token
  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh');

    if (!refreshToken) {
      console.error('Refresh token is missing!');
      return throwError(() => new Error('Refresh token missing'));
    }

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.baseUrl}/token/refresh/`, { refresh: refreshToken }, { headers }).pipe(
      catchError((error) => {
        console.error('Token refresh failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Get statistical/chart data from the backend
  getChart(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/count/`).pipe(
      catchError((error) => {
        console.error('Error fetching chart data:', error);
        return throwError(() => error);
      })
    );
  }
}
