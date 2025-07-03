import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account } from '../models/accounts';
import { Role } from '../models/role';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}/user`;

  constructor(private http: HttpClient) {}

  // Get all users
  getUsers(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.baseUrl}/list/?username=all`);
  }

  // Get user by username
  getUserByUsername(username: string): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/detail/${username}/`);
  }

  // Get currently logged-in user
  getCurrentUser(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/detail/`);
  }

  // Update user by username
  updateUser(username: string, payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/update/${username}/`, // use correct base path
      payload
    );
  }

  // Retrieves all roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.baseUrl}/roles`);
  }
}
