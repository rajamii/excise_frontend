import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account } from '../models/accounts';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = `${environment.apiBaseUrl}/user`;

  constructor(private http: HttpClient) {}

  // Fetches the list of all users
  listUsers(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.baseUrl}/list/`);
  }

  // Retrieves a specific user's details by username
  getUser(username: string): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/detail/${username}/`);
  }

  // Sends a request to create a new user
  createUser(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/create/`, data);
  }

  // Updates an existing user's details
  updateUser(username: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/update/${username}/`, data);
  }

  // Deletes a user by username
  deleteUser(username: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${username}/`);
  }
}
