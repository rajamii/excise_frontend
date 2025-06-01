import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApplicationsByStage, DashboardCount } from '../models/dashboard.model';
import { Observable } from 'rxjs';
import { LicenseApplication } from '../models/license-application.model';
import { OtherEnquiryPoints } from '../models/site-enquiry.model';

@Injectable({
  providedIn: 'root'
})
export class LicenseApplicationService {
  private readonly baseUrl = environment.apiBaseUrl;
  private shopImage: Partial<Record<keyof OtherEnquiryPoints, File>> = {};

  constructor(private http: HttpClient) { }
    
    // ========================== LICENSE APPLICATION ===============================


  // Updates a license application with the provided changes (e.g., status update, details change)
  updateApplication(id: number, changes: Partial<any>): Observable<LicenseApplication> {
    return this.http.put<LicenseApplication>(`${this.baseUrl}/licenseapplication/${id}/update/`, changes);
    // Sends a PUT request to update an application by ID
  }

  // Deletes a license application by its ID
  deleteApplication(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/licenseapplication/${id}/delete/`);
    // Sends a DELETE request to remove a license application by its ID
  }

  // Fetches the counts for various categories on the dashboard (e.g., number of pending, approved, rejected applications)
  getDashboardCounts(): Observable<DashboardCount> {
    return this.http.get<any>(`${this.baseUrl}/licenseapplication/dashboard-counts/`);
    // Sends a GET request to fetch counts for the dashboard statistics
  }

  // Retrieves a list of license applications, categorized by their current status (applied, accepted, pending or rejected)
  getApplicationsByStatus(): Observable<ApplicationsByStage> {
    return this.http.get<ApplicationsByStage>(
      `${this.baseUrl}/licenseapplication/list-by-status/`
    );
    // Sends a GET request to fetch a list of applications, organized by their current stage in the process
  }

  // Advances the license application to the next stage, including an action and remarks to describe the transition
  advanceApplication(applicationId: number, action: string, remarks: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/licenseapplication/${applicationId}/advance/`, {
      id: applicationId,
      action: action,
      remarks: remarks
    });
    // Sends a POST request to advance the application to a new stage, with the given action and remarks
  }

  printLicense(applicationId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/licenseapplication/${applicationId}/print/`, { responseType: 'blob' });
    // Sends a GET request to print the license for the specified application ID
  }

  setShopImage(docs: Partial<Record<keyof OtherEnquiryPoints, File>>) {
    this.shopImage = { ...this.shopImage, ...docs };
  }

  getShopImage(): Partial<Record<keyof OtherEnquiryPoints, File>> {
    return this.shopImage;
  }

  clearShopImage(): void {
    this.shopImage = {};
  }
}
