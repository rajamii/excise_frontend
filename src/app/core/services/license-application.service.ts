import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApplicationStatus, DashboardCount } from '../models/dashboard.model';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { LicenseApplication } from '../models/license-application.model';
import { LocationFee } from '../models/location-fee.model';
import { SiteEnquiryFormModel } from '../models/site-enquiry.model';
import { NewLicenseApplication } from '../models/new-license-application.model';


export interface UnifiedApplication extends LicenseApplication {
  applicationType: 'existing' | 'new';
  displayId: string;
}

@Injectable({
  providedIn: 'root'
})

export class LicenseApplicationService {

  private readonly baseUrl = `${environment.apiBaseUrl}/transactional/license_application`;
  private readonly newLicenseBaseUrl = `${environment.apiBaseUrl}/transactional/new-license-application`;
  // Store for passport photo
  private passPhotoSubject = new BehaviorSubject<File | null>(null);

  // Store for site documents
  private siteDocuments: Map<string, File> = new Map();

  constructor(private http: HttpClient) { }

  // ========================== OLD LICENSE APPLICATION ==========================

  // Final application submission by the licensee (includes all sections + photo).
  submitLicenseApplication(data: any): Observable<any> {
    console.log(data);
    return this.http.post<LicenseApplication[]>(`${this.baseUrl}/apply/`, data);
  }

  // Updates a license application with the provided changes (e.g., status update, details change)
  updateApplication(id: number, changes: Partial<any>): Observable<LicenseApplication> {
    return this.http.put<LicenseApplication>(`${this.baseUrl}/${id}/update/`, changes);
  }

  // Deletes a license application by its ID
  deleteApplication(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.delete(`${this.baseUrl}/${encodedId}/delete/`);
  }

  // Fetches the counts for various categories on the dashboard (e.g., number of pending, approved, rejected applications)
  getDashboardCounts(): Observable<DashboardCount> {
    return this.http.get<any>(`${this.baseUrl}/dashboard-counts/`);
  }

  getLocationFee(): Observable<LocationFee[]> {
    return this.http.get<LocationFee[]>(`${this.baseUrl}/location-fee/`);
  }

  // Retrieves a list of license applications, categorized by their current status (applied, accepted, pending or rejected)
  getApplicationsByStatus(): Observable<ApplicationStatus> {
    return this.http.get<ApplicationStatus>(`${this.baseUrl}/list-by-status/`);
  }

  getNextStages(applicationId: string): Observable<any[]> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any[]>(`${this.baseUrl}/${encodedId}/next-stages/`);
  }

  // Advances the application to the next stage based on the provided action (approve, reject, raise objection)
  advanceApplication(
    applicationId: string,
    stageID: string | undefined,
    remarks: string | undefined,
    feeAmount: number | undefined,
    action: 'approve' | 'reject' | 'raise_objection',
    newLicenseCategoryId?: number,
    objections?: { field: string; remarks: string }[],
    context?: any
  ): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const encodedStageId = encodeURIComponent(stageID ?? '');
    const body: any = {
      remarks,
      feeAmount,
      action,
      context
    };

    // Optional: include new license category during approval if changed
    if (newLicenseCategoryId !== undefined && newLicenseCategoryId !== null) {
      body.newLicenseCategory = newLicenseCategoryId;
    }

    // Only include objections when action is 'raise_objection'
    if (action === 'raise_objection' && objections) {
      body.objections = objections;
    }
    return this.http.post(`${this.baseUrl}/${encodedId}/advance/${encodedStageId}/`, body);
  }

  // Method to raise objections for a given application
  raiseObjection(applicationId: string, objections: { field: string; remarks: string }[], remarks?: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const body: any = {
      objections: objections.map(obj => ({ field: obj.field, remarks: obj.remarks })), // Map 'field' to 'field_name' for backend compatibility
      remarks
    };
    return this.http.post(`${this.baseUrl}/${encodedId}/raise-objection/`, body);
  }

  // Retrieves all objections raised against a given application
  getObjections(applicationId: string): Observable<any[]> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any[]>(`${this.baseUrl}/${encodedId}/objections/`);
  }

  // Resolves previously raised objections for a given application.
  resolveObjections(applicationId: string, data: { [key: string]: any }, photo?: File): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const formData = new FormData();

    // Append fields to FormData
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        // Handle dropdowns (e.g., licenseCategory, siteSubdivision) by sending the ID or code
        if (['licenseCategory', 'licenseType', 'exciseDistrict', 'exciseSubdivision', 'siteSubdivision', 'policeStation'].includes(key)) {
          formData.append(key, value.id || value.subdivisionCode || value.districtCode || value.policeStationCode || value.toString());
        } else {
          formData.append(key, value.toString());
        }
      }
    }

    // Append photo if provided
    if (photo) {
      formData.append('photo', photo, photo.name);
    }

    // Log FormData for debugging
    console.log('FormData entries:');
    for (const pair of formData.entries()) {
      console.log(`${pair[0]}: ${pair[1]}`);
    }

    return this.http.post(`${this.baseUrl}/${encodedId}/resolve-objections/`, formData);
  }

  // Submits the site enquiry report associated with the application.
  submitSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/${encodedId}/site-enquiry/`, formData);
  }

  // Initiates the license printing process for an approved application.
  printLicense(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/${encodedId}/print/`, {});
  }

  getSiteDetails(applicationId: string): Observable<SiteEnquiryFormModel> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<SiteEnquiryFormModel>(`${this.baseUrl}/${encodedId}/site-detail/`);
  }

  payLicenseFee(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.baseUrl}/${encodedId}/pay-license-fee/`, {});
  }

  // ========================== NEW LICENSE APPLICATION ==========================

  /**
   * Submit new license application
   * Converts camelCase to snake_case and builds FormData
   */
  submitNewLicenseApplication(formData: FormData): Observable<NewLicenseApplication> {
    return this.http.post<NewLicenseApplication>(`${this.newLicenseBaseUrl}/apply/`, formData);
  }

  /**
   * Update new license application (only at draft/level_1/level_1_objection stages)
   */
  updateNewLicenseApplication(applicationId: string, formData: FormData): Observable<NewLicenseApplication> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.patch<NewLicenseApplication>(`${this.newLicenseBaseUrl}/${encodedId}/update/`, formData);
  }

  /**
   * Prepare FormData for new license application submission
   * Handles field name mapping from camelCase to snake_case
   */
  prepareNewLicenseFormData(): FormData {
  const formData = new FormData();
  const get = (key: string) => JSON.parse(sessionStorage.getItem(key) || '{}');

  const select = get('selectLicenseData');
  const keyInfo = get('keyInfoData');
  const applicant = get('applicantDetailsData');
  const site = get('siteDetailsData');
  const company = get('unitDetailsData');

  const append = (camel: string, value: any) => {
    if (value === null || value === undefined || value === '' || value === false) return;
    const snake = this.toSnakeCase(camel);
    formData.append(String(snake), value instanceof Blob ? value : String(value));
  };

  // === MUST HAVE ===
  append('licenseType', select.licenseType);
  append('licenseCategory', keyInfo.licenseCategory);
  append('licenseSubCategory', keyInfo.licenseSubCategory);
  append('establishmentName', keyInfo.establishmentName);
  append('siteType', keyInfo.siteType);

  const fullName = [applicant.firstName, applicant.middleName, applicant.lastName].filter(Boolean).join(' ');
  append('applicantName', fullName);
  append('fatherHusbandName', applicant.fatherHusbandName);
  append('dob', this.formatDate(applicant.dob));
  append('gender', applicant.gender);
  append('nationality', applicant.nationality);
  append('residentialStatus', applicant.residentialStatus);
  append('presentAddress', applicant.presentAddress);
  append('permanentAddress', applicant.permanentAddress || applicant.presentAddress);
  append('pan', (applicant.pan || '').toUpperCase());
  append('email', applicant.email);
  append('mobileNumber', applicant.mobileNumber);
  append('modeOfOperation', applicant.modeOfOperation);

  append('hasSikkimCertificate', applicant.hasSikkimCertificate ? 'Yes' : 'No');
  append('hasExciseLicense', applicant.hasExciseLicense ? 'Yes' : 'No');
  append('familyExciseLicense', applicant.familyExciseLicense ? 'Yes' : 'No');
  append('criminalConviction', applicant.criminalConviction ? 'Yes' : 'No');

  // === SITE - CODES! ===
  append('site_district', site.siteDistrict);
  append('site_subdivision', site.siteSubdivision);
  append('police_station', site.policeStation);
  append('locationCategory', site.locationCategory);
  append('locationName', site.locationName);
  append('wardName', site.wardName);
  append('businessAddress', site.businessAddress);
  append('road_name', site.roadNameCode || site.roadName);
  append('pinCode', site.pinCode);
  append('constructionType', site.constructionType);
  append('length', site.length);
  append('breadth', site.breadth);
  append('siteOwned', site.siteOwned || 'Yes');
  if (site.siteOwned === 'No') append('nocObtained', site.nocObtained || 'No');

  // === COMPANY ===
  if (select.licenseType == 2) {
    append('companyName', company.companyName);
    append('companyAddress', company.companyAddress);
    append('companyPan', (company.companyPan || '').toUpperCase());
    append('companyCin', company.companyCin?.toUpperCase());
    append('incorporationDate', this.formatDate(company.incorporationDate));
    append('companyPhoneNumber', company.companyPhoneNumber);
    append('companyEmail', company.companyEmail);
  }

  // === FILES ===
  if (this.getPassPhoto()) append('pass_photo', this.getPassPhoto()!);
  ['panCard', 'sikkimCertificate', 'dobProof'].forEach(key => {
    const file = this.siteDocuments.get(key);
    if (file) append(key, file);
  });
  if (site.siteOwned === 'No' && this.siteDocuments.get('nocLandlord')) {
    append('nocLandlord', this.siteDocuments.get('nocLandlord')!);
  }

  append('workflow', '1');

  this.logFormData(formData);
  return formData;
}

  /**
   * Get list of all new license applications
   */
  getNewLicenseApplications(): Observable<NewLicenseApplication[]> {
    return this.http.get<NewLicenseApplication[]>(`${this.newLicenseBaseUrl}/list/`);
  }

  /**
   * Get new license application by ID
   */
  getNewLicenseApplicationById(applicationId: string): Observable<NewLicenseApplication> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<NewLicenseApplication>(`${this.newLicenseBaseUrl}/detail/${encodedId}/`);
  }

  /**
   * Delete new license application (only at level_1 stage)
   */
  deleteNewLicenseApplication(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.delete(`${this.newLicenseBaseUrl}/${encodedId}/delete/`);
  }

  /**
   * Get dashboard counts for new license applications
   */
  getNewLicenseDashboardCounts(): Observable<DashboardCount> {
    return this.http.get<DashboardCount>(`${this.newLicenseBaseUrl}/dashboard-counts/`);
  }

  /**
   * Get new license applications grouped by status
   */
  getNewLicenseApplicationsByStatus(): Observable<ApplicationStatus> {
    return this.http.get<ApplicationStatus>(`${this.newLicenseBaseUrl}/list-by-status/`);
  }

  /**
   * Advance new license application to next stage
   */
  advanceNewLicenseApplication(
    applicationId: string,
    action: 'approve' | 'reject' | 'raise_objection',
    remarks?: string,
    feeAmount?: number,
    newLicenseCategoryId?: number,
    objections?: { field: string; remarks: string }[]
  ): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);

    const body: any = {
      action,
      remarks: remarks || ''
    };

    if (feeAmount !== undefined) {
      body.fee_amount = feeAmount;
    }

    if (newLicenseCategoryId !== undefined) {
      body.new_license_category = newLicenseCategoryId;
    }

    if (action === 'raise_objection' && objections) {
      body.objections = objections;
    }

    return this.http.post(`${this.newLicenseBaseUrl}/${encodedId}/advance/`, body);
  }

  /**
   * Get objections for new license application
   */
  getNewLicenseObjections(applicationId: string): Observable<any[]> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any[]>(`${this.newLicenseBaseUrl}/${encodedId}/objections/`);
  }

  /**
   * Resolve objections for new license application
   */
  resolveNewLicenseObjections(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseBaseUrl}/${encodedId}/resolve-objections/`, formData);
  }

  /**
   * Submit site enquiry report for new license application (Level 2)
   */
  submitNewLicenseSiteEnquiry(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post<any>(`${this.newLicenseBaseUrl}/${encodedId}/site-enquiry/`, formData);
  }

  /**
   * Get site enquiry details for new license application
   */
  getNewLicenseSiteEnquiryDetail(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any>(`${this.newLicenseBaseUrl}/${encodedId}/site-detail/`);
  }

  /**
   * Print new license (only for approved applications)
   */
  printNewLicense(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseBaseUrl}/${encodedId}/print/`, {});
  }



  // ========================== PASSPORT PHOTO MANAGEMENT ==========================

  // Set the uploaded photo
  setPassPhoto(file: File | null): void {
    this.passPhotoSubject.next(file);
  }

  // Get the uploaded photo
  getPassPhoto(): File | null {
    return this.passPhotoSubject.value;
  }

  getPassPhotoObservable(): Observable<File | null> {
    return this.passPhotoSubject.asObservable();
  }

  // Clear the stored photo by setting it to null
  clearPassPhoto(): void {
    this.passPhotoSubject.next(null);
  }



  // ========================== SITE DOCUMENTS MANAGEMENT ==========================

  setSiteDocument(documentName: string, file: File): void {
    this.siteDocuments.set(documentName, file);
  }

  getSiteDocument(documentName: string): File | null {
    return this.siteDocuments.get(documentName) || null;
  }

  getAllSiteDocuments(): Record<string, File> {
    const docs: Record<string, File> = {};
    this.siteDocuments.forEach((file, key) => {
      docs[key] = file;
    });
    return docs;
  }

  removeSiteDocument(documentName: string): void {
    this.siteDocuments.delete(documentName);
  }

  clearAllDocuments(): void {
    this.passPhotoSubject.next(null);
    this.siteDocuments.clear();
  }

  /** Get combined dashboard counts (Old + New) */
  getUnifiedDashboardCounts(): Observable<DashboardCount> {
    return forkJoin({
      old: this.getDashboardCounts(),
      new: this.getNewLicenseDashboardCounts()
    }).pipe(
      map(({ old, new: newCounts }) => ({
        applied: (old?.applied || 0) + (newCounts?.applied || 0),
        pending: (old?.pending || 0) + (newCounts?.pending || 0),
        approved: (old?.approved || 0) + (newCounts?.approved || 0),
        rejected: (old?.rejected || 0) + (newCounts?.rejected || 0),
      }))
    );
  }

  /** Get combined applications by status (correctly typed) */
  getUnifiedApplicationsByStatus(): Observable<{
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }> {
    return forkJoin({
      old: this.getApplicationsByStatus(),
      new: this.getNewLicenseApplicationsByStatus()
    }).pipe(
      map(({ old, new: newApps }) => {
        const toUnified = (app: any, type: 'existing' | 'new'): UnifiedApplication => ({
          ...app,
          applicationType: type,
          // Safely get ID — old uses `id`, new uses `applicationId` or `id`
          displayId: (app.applicationId || app.id || 'N/A') as string,
        });

        return {
          applied: [
            ...(old.applied || []).map(a => toUnified(a, 'existing')),
            ...(newApps.applied || []).map(a => toUnified(a, 'new'))
          ],
          pending: [
            ...(old.pending || []).map(a => toUnified(a, 'existing')),
            ...(newApps.pending || []).map(a => toUnified(a, 'new'))
          ],
          approved: [
            ...(old.approved || []).map(a => toUnified(a, 'existing')),
            ...(newApps.approved || []).map(a => toUnified(a, 'new'))
          ],
          rejected: [
            ...(old.rejected || []).map(a => toUnified(a, 'existing')),
            ...(newApps.rejected || []).map(a => toUnified(a, 'new'))
          ]
        };
      })
    );
  }

  // ========================== UTILITY METHODS ==========================

  /**
   * Convert camelCase string to snake_case
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toISOString().split('T')[0];
  }
  // private formatDate(date: string | Date | null): string {
  //   if (!date) return '';
  //   const d = new Date(date);
  //   return d.toISOString().split('T')[0]; // YYYY-MM-DD
  // }

  /**
   * Log FormData contents for debugging
   */
  logFormData(formData: FormData, prefix = 'FormData'): void {
    console.log(`${prefix}:`);
    const entries: string[] = [];
    formData.forEach((value, key) => {
      if (value instanceof File) {
        entries.push(`${key}: [File] ${value.name} (${value.size} bytes)`);
      } else {
        entries.push(`${key}: ${value}`);
      }
    });
    console.table(entries);
  }
}