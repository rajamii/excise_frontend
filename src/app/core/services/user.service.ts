import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account } from '../models/account.model';
import { Role } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  constructor(private http: HttpClient) {}

  // Get all users
  getUsers(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.baseUrl}/users/`);
  }

  // Get user by id
  getUserById(id: number): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/users/${id}/detail/`);
  }

  // Get currently logged-in user
  getCurrentUser(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/users/me/`);
  }

  // Retrieves all roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.baseUrl}/roles/`);
  }

  // Get user by id
  getRoleById(id: number): Observable<Role> {
    return this.http.get<Role>(`${this.baseUrl}/roles/${id}/detail/`);
  }
}
