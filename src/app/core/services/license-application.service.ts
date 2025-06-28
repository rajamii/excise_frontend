import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApplicationStatus, DashboardCount } from '../models/dashboard.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { LicenseApplication } from '../models/license-application.model';
import { LocationFee } from '../models/location-fee.model';
import { SiteEnquiryFormModel } from '../models/site-enquiry.model';

@Injectable({
  providedIn: 'root'
})
export class LicenseApplicationService {
  private readonly baseUrl = `${environment.apiBaseUrl}/licenseapplication`;
  private passPhotoSubject = new BehaviorSubject<File | null>(null);

  constructor(private http: HttpClient) { }
    
  // ========================== LICENSE APPLICATION ==========================
  
  // Final application submission by the licensee (includes all sections + photo).
  submitLicenseApplication(data: any): Observable<any> {
    return this.http.post<LicenseApplication[]>(`${this.baseUrl}/apply/`, data);
  } 

  // Set the uploaded photo
  setPassPhoto(file: File) {
    this.passPhotoSubject.next(file);
  }

  // Get the uploaded photo
  getPassPhoto(): File | null {
    return this.passPhotoSubject.value;
  }

  getPassPhotoObservable() {
    return this.passPhotoSubject.asObservable();
  }

  // Clear the stored photo by setting it to null
  clearPassPhoto() {
    this.passPhotoSubject.next(null);
  }

  // Updates a license application with the provided changes (e.g., status update, details change)
  updateApplication(id: number, changes: Partial<any>): Observable<LicenseApplication> {
    return this.http.put<LicenseApplication>(`${this.baseUrl}/${id}/update/`, changes);
    // Sends a PUT request to update an application by ID
  }

  // Deletes a license application by its ID
  deleteApplication(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.delete(`${this.baseUrl}/${encodedId}/delete/`);
    // Sends a DELETE request to remove a license application by its ID
  }

  // Fetches the counts for various categories on the dashboard (e.g., number of pending, approved, rejected applications)
  getDashboardCounts(): Observable<DashboardCount> {
    return this.http.get<any>(`${this.baseUrl}/dashboard-counts/`);
    // Sends a GET request to fetch counts for the dashboard statistics
  }

  getLocationFee(): Observable<LocationFee[]> {
    return this.http.get<LocationFee[]>(`${this.baseUrl}/location-fee/`);
    // Sends a GET request to fetch counts for the dashboard statistics
  }

  // Retrieves a list of license applications, categorized by their current status (applied, accepted, pending or rejected)
  getApplicationsByStatus(): Observable<ApplicationStatus> {
    return this.http.get<ApplicationStatus>(
      `${this.baseUrl}/list-by-status/`
    );
    // Sends a GET request to fetch a list of applications, organized by their current stage in the process
  }

  /* Advances the license application to the next stage, including an action and remarks to describe the transition
  Depending on the action, it may include remarks, feeAmount, new license category, or objections. */
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

    // Optional: include new license category during approval if changed
    if (newLicenseCategoryId !== undefined && newLicenseCategoryId !== null) {
      body.newLicenseCategory = newLicenseCategoryId;
    }

    // Only include objections when action is 'raise_objection'
    if (action === 'raise_objection' && objections) {
      body.objections = objections;
    }
    return this.http.post(`${this.baseUrl}/${encodedId}/advance/`, body);
  }

  // Retrieves all objections raised against a given application
  getObjections(applicationId: string): Observable<any[]> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any[]>(`${this.baseUrl}/${encodedId}/objections/`);
  }

  /* Resolves previously raised objections for a given application.
  FormData contains only the corrected fields and possibly a photo. */
  resolveObjections(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post<any>(
      `${this.baseUrl}/${encodedId}/resolve-objections/`,
      formData
    );
  }
  
  /* Submits the site enquiry report associated with the application.
  Submitted by level 2 officer. */
  submitSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/${encodedId}/site-enquiry/`, formData);
  }

  /* Initiates the license printing process for an approved application.
  Responsible for incrementing print count. */
  printLicense(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/${encodedId}/print/`, {});
  }

  getSiteDetails(applicationId: string): Observable<SiteEnquiryFormModel> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<SiteEnquiryFormModel>(`${this.baseUrl}/${encodedId}/site-detail/`);
  }
}
