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
  updateUser(username: string, changes: Partial<Account>): Observable<Account> {
    return this.http.put<Account>(`${this.baseUrl}/update/${username}/`, changes);
  }

  // Retrieves all roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.baseUrl}/roles`);
  }
}
