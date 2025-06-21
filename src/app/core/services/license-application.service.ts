import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApplicationsByStage, DashboardCount } from '../models/dashboard.model';
import { Observable } from 'rxjs';
import { LicenseApplication } from '../models/license-application.model';
import { LocationFee } from '../models/location-fee.model';
import { SiteEnquiryFormModel } from '../models/site-enquiry.model';

@Injectable({
  providedIn: 'root'
})
export class LicenseApplicationService {
  private readonly baseUrl = environment.apiBaseUrl;

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

  getLocationFee(): Observable<LocationFee[]> {
    return this.http.get<LocationFee[]>(`${this.baseUrl}/licenseapplication/location-fee/`);
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
  advanceApplication(
    applicationId: string,
    remarks: string | undefined,
    feeAmount: number | undefined,
    action: 'approve' | 'reject' | 'raise_objection',
    newLicenseCategoryId?: number,
    objections?: { field: string; remarks: string }[]
  ): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const body: any = {
      remarks,
      feeAmount,
      action,
    };

    if (newLicenseCategoryId !== undefined && newLicenseCategoryId !== null) {
      body.new_license_category = newLicenseCategoryId;
    }

    if (action === 'raise_objection' && objections) {
      body.objections = objections;
    }
    return this.http.post(`${this.baseUrl}/licenseapplication/${encodedId}/advance/`, body);
  }

  getObjections(applicationId: string): Observable<any[]> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any[]>(`${this.baseUrl}/licenseapplication/${encodedId}/objections/`);
  }

  resolveObjections(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post<any>(
      `${this.baseUrl}/licenseapplication/${encodedId}/resolve-objections/`,
      formData
    );
  }
  
  submitSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/licenseapplication/${encodedId}/site-enquiry/`, formData);
  }

   submitLicenseApplication(data: any): Observable<any> {
    return this.http.post<LicenseApplication[]>(`${this.baseUrl}/licenseapplication/apply/`, data);
  } 

  printLicense(applicationId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/licenseapplication/${applicationId}/print/`, { responseType: 'blob' });
    // Sends a GET request to print the license for the specified application ID
  }
}
