import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Account } from '../models/account.model';
import { Role } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}/auth/users`;
  private readonly rolesUrl = `${environment.apiBaseUrl}/auth/roles`;

  constructor(private http: HttpClient) { }

  // Get all users
  getUsers(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.baseUrl}/`);
  }

  // Get user by id
  getUserById(id: number): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/${id}/detail/`);
  }

  // Backward compatibility: treat username as identifier if provided
  getUserByUsername(identifier: string | number): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/${identifier}/detail/`);
  }

  // Get currently logged-in user
  getCurrentUser(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/me/`);
  }

  // Retrieves all roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.rolesUrl}/`);
  }

  // Get role by id - NOTE: Backend only provides role list, individual role detail endpoint not available
  // Use getRoles() and filter by id if needed
  getRoleById(id: number): Observable<Role> {
    return this.http.get<Role[]>(`${this.rolesUrl}/`).pipe(
      map(roles => roles.find(role => role.id === id)!)
    );
  }
}
