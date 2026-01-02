import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApplicationStatus, DashboardCount } from '../models/dashboard.model';
import { LicenseApplication } from '../models/license-application.model';
import { LocationFee } from '../models/location-fee.model';
import { SiteEnquiryFormModel } from '../models/site-enquiry.model';
import { NewLicenseApplication } from '../models/new-license-application.model';

@Injectable({
  providedIn: 'root'
})
export class LicenseApplicationService {

  private readonly oldLicenseUrl = `${environment.apiBaseUrl}/transactional/license_application`;
  private readonly newLicenseUrl = `${environment.apiBaseUrl}/transactional/new_license_application`;

  private passPhotoSubject = new BehaviorSubject<File | null>(null);
  private siteDocuments: Map<string, File> = new Map();

  constructor(private http: HttpClient) { }

  // ========================== NEW LICENSE APPLICATION ==========================

  submitNewLicenseApplication(formData: FormData): Observable<NewLicenseApplication> {
    console.log('📤 Submitting New License Application');
    this.logFormData(formData, 'New License Submission');
    return this.http.post<NewLicenseApplication>(`${this.newLicenseUrl}/apply/`, formData);
  }

  prepareNewLicenseFormData(): FormData {
    console.group('📦 Preparing New License Application FormData');

    const sessionKeys = [
      'selectLicenseData',
      'keyInfoData',
      'applicantDetailsData',
      'siteDetailsData',
      'unitDetailsData'
    ];

    const combinedData: Record<string, any> = {};
    sessionKeys.forEach(key => {
      const data = this.getParsedSession(key);
      if (data) {
        Object.assign(combinedData, data);
        console.log(`✅ Loaded ${key}:`, data);
      }
    });

    const formData = new FormData();

    // ✅ **CRITICAL FIX**: Add license_type (PrimaryKeyRelatedField - expects ID)
    if (combinedData['licenseType'] !== undefined && combinedData['licenseType'] !== null) {
      formData.append('license_type', String(parseInt(combinedData['licenseType'])));
      console.log('✅ Added license_type:', combinedData['licenseType']);
    } else {
      console.error('❌ CRITICAL: license_type is missing!');
    }

    // ✅ **CRITICAL FIX**: Add workflow (hardcoded to 1 for new applications)
    // You may need to adjust this based on your workflow setup
    formData.append('workflow', '1');
    console.log('✅ Added workflow: 1');

    // ✅ CodeRelatedField fields (need CODE strings, not IDs)
    if (combinedData['site_district_code']) {
      formData.append('site_district', String(combinedData['site_district_code']));
    }
    if (combinedData['site_subdivision_code']) {
      formData.append('site_subdivision', String(combinedData['site_subdivision_code']));
    }
    if (combinedData['police_station_code']) {
      formData.append('police_station', String(combinedData['police_station_code']));
    }

    // ✅ PrimaryKeyRelatedField fields (need IDs as integers)
    if (combinedData['license_category'] !== undefined && combinedData['license_category'] !== null) {
      formData.append('license_category', String(parseInt(combinedData['license_category'])));
    }
    if (combinedData['license_sub_category'] !== undefined && combinedData['license_sub_category'] !== null) {
      formData.append('license_sub_category', String(parseInt(combinedData['license_sub_category'])));
    }

    // String fields
    const stringFields = [
      'establishment_name', 'site_type', 'applicant_name', 'father_husband_name',
      'nationality', 'gender', 'residential_status', 'present_address', 'permanent_address',
      'pan', 'email', 'mode_of_operation', 'location_category', 'location_name',
      'ward_name', 'business_address', 'road_name', 'construction_type'
    ];
    stringFields.forEach(field => {
      if (combinedData[field]) {
        formData.append(field, String(combinedData[field]));
      }
    });

    // ✅ Mobile number and PIN code (CharField in backend, but numeric validation)
    if (combinedData['mobile_number']) {
      const cleaned = String(combinedData['mobile_number']).replace(/\D/g, '');
      formData.append('mobile_number', cleaned);
    }
    if (combinedData['pin_code']) {
      const cleaned = String(combinedData['pin_code']).replace(/\D/g, '');
      formData.append('pin_code', cleaned);
    }

    // Float fields
    if (combinedData['length']) {
      formData.append('length', String(parseFloat(combinedData['length'])));
    }
    if (combinedData['breadth']) {
      formData.append('breadth', String(parseFloat(combinedData['breadth'])));
    }

    // Date fields (ISO format YYYY-MM-DD)
    if (combinedData['dob']) {
      const date = new Date(combinedData['dob']);
      if (!isNaN(date.getTime())) {
        formData.append('dob', date.toISOString().split('T')[0]);
      }
    }

    // ✅ ChoiceFields - Must match backend choices exactly ("Yes"/"No")
    const yesNoFields = [
      'has_sikkim_certificate', 'has_excise_license',
      'family_excise_license', 'criminal_conviction',
      'noc_obtained'
    ];
    yesNoFields.forEach(field => {
      if (combinedData[field] !== undefined) {
        const value = this.convertToYesNo(combinedData[field]);
        formData.append(field, value);
      }
    });

    // ✅ Site ownership (ChoiceField: "Owned"/"Rented")
    if (combinedData['site_owned'] !== undefined) {
      formData.append('site_owned', String(combinedData['site_owned']));
      console.log('✅ site_owned value:', combinedData['site_owned']);
    }

    // Company details (optional, only if license_type = 2)
    if (Number(combinedData['licenseType']) === 2) {
      if (combinedData['company_name']) formData.append('company_name', combinedData['company_name']);
      if (combinedData['company_address']) formData.append('company_address', combinedData['company_address']);
      if (combinedData['company_pan']) formData.append('company_pan', combinedData['company_pan'].toUpperCase());
      if (combinedData['company_cin']) formData.append('company_cin', combinedData['company_cin'].toUpperCase());
      if (combinedData['incorporation_date']) {
        const date = new Date(combinedData['incorporation_date']);
        if (!isNaN(date.getTime())) {
          formData.append('incorporation_date', date.toISOString().split('T')[0]);
        }
      }
      if (combinedData['company_phone_number']) {
        const cleaned = String(combinedData['company_phone_number']).replace(/\D/g, '');
        formData.append('company_phone_number', cleaned);
      }
      if (combinedData['company_email']) formData.append('company_email', combinedData['company_email']);
    }

    // ✅ File uploads - Required fields
    const passPhoto = this.getPassPhoto();
    if (passPhoto) {
      formData.append('pass_photo', passPhoto, passPhoto.name);
      console.log('✅ Added pass_photo:', passPhoto.name);
    } else {
      console.error('❌ CRITICAL: pass_photo is missing!');
    }

    // Required documents
    const requiredDocs = ['pan_card', 'sikkim_certificate', 'dob_proof'];
    const siteDocuments = this.getAllSiteDocuments();
    
    requiredDocs.forEach(docName => {
      if (siteDocuments[docName]) {
        formData.append(docName, siteDocuments[docName], siteDocuments[docName].name);
        console.log(`✅ Added ${docName}:`, siteDocuments[docName].name);
      } else {
        console.error(`❌ CRITICAL: ${docName} is missing!`);
      }
    });

    // Optional NOC landlord document
    if (siteDocuments['noc_landlord']) {
      formData.append('noc_landlord', siteDocuments['noc_landlord'], siteDocuments['noc_landlord'].name);
      console.log('✅ Added noc_landlord:', siteDocuments['noc_landlord'].name);
    }

    this.logFormData(formData, 'New License Final FormData');
    console.groupEnd();
    return formData;
  }

  private convertToYesNo(value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'yes' || lower === 'true') return 'Yes';
      if (lower === 'no' || lower === 'false') return 'No';
    }
    return 'No';
  }

  getNewLicenseApplications(): Observable<NewLicenseApplication[]> {
    return this.http.get<NewLicenseApplication[]>(`${this.newLicenseUrl}/list/`);
  }

  getNewLicenseApplicationById(applicationId: string): Observable<NewLicenseApplication> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<NewLicenseApplication>(`${this.newLicenseUrl}/detail/${encodedId}/`);
  }

  getNewLicenseApplicationsByStatus(): Observable<ApplicationStatus> {
    return this.http.get<ApplicationStatus>(`${this.newLicenseUrl}/list-by-status/`);
  }

  getNewLicenseDashboardCounts(): Observable<DashboardCount> {
    return this.http.get<DashboardCount>(`${this.newLicenseUrl}/dashboard-counts/`);
  }

  advanceNewLicenseApplication(applicationId: string, stageId: number, context?: any): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const body: any = { context: context || {} };
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/advance/${stageId}/`, body);
  }

  getNewLicenseObjections(applicationId: string): Observable<any[]> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any[]>(`${this.newLicenseUrl}/${encodedId}/objections/`);
  }

  resolveNewLicenseObjections(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/resolve-objections/`, formData);
  }

  printNewLicense(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/print/`, {});
  }

  payNewLicenseFee(applicationId: string, payload: any): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/pay-license-fee/`, payload);
  }

  // ========================== OLD LICENSE APPLICATION ==========================

  submitOldLicenseApplication(formData: FormData): Observable<LicenseApplication> {
    console.log('📤 Submitting Old License Application');
    this.logFormData(formData, 'Old License Submission');
    return this.http.post<LicenseApplication>(`${this.oldLicenseUrl}/apply/`, formData);
  }

  prepareOldLicenseFormData(): FormData {
    const sessionKeys = [
      'selectLicenseData',
      'keyInfoData',
      'addressData',
      'unitDetailsData',
      'memberDetailsData'
    ];

    console.group('📦 Preparing Old License Application FormData');

    const combinedData: Record<string, any> = {};
    sessionKeys.forEach(key => {
      const data = this.getParsedSession(key);
      if (data) {
        Object.assign(combinedData, data);
        console.log(`✅ Loaded ${key}:`, data);
      } else {
        console.warn(`⚠️ Missing session data: ${key}`);
      }
    });

    const formData = new FormData();

    // CodeRelatedField fields (need CODE strings, not IDs)
    if (combinedData['excise_district_code']) {
      formData.append('excise_district', String(combinedData['excise_district_code']));
    }
    if (combinedData['excise_subdivision_code']) {
      formData.append('excise_subdivision', String(combinedData['excise_subdivision_code']));
    }
    if (combinedData['site_subdivision_code']) {
      formData.append('site_subdivision', String(combinedData['site_subdivision_code']));
    }
    if (combinedData['police_station_code']) {
      formData.append('police_station', String(combinedData['police_station_code']));
    }

    // PrimaryKeyRelatedField fields (need IDs as integers)
    if (combinedData['license_category'] !== undefined && combinedData['license_category'] !== null) {
      formData.append('license_category', String(parseInt(combinedData['license_category'])));
    }
    if (combinedData['license_type'] !== undefined && combinedData['license_type'] !== null) {
      formData.append('license_type', String(parseInt(combinedData['license_type'])));
    }

    // String fields
    const stringFields = [
      'license', 'establishment_name', 'email', 'license_nature', 'functioning_status',
      'mode_of_operation', 'location_category', 'location_name', 'ward_name',
      'business_address', 'road_name', 'status', 'member_name', 'father_husband_name',
      'nationality', 'gender', 'pan', 'member_email', 'yearly_license_fee', 'license_no'
    ];
    stringFields.forEach(field => {
      if (combinedData[field]) {
        formData.append(field, String(combinedData[field]));
      }
    });

    // Integer fields
    const integerFields = ['mobile_number', 'pin_code', 'member_mobile_number', 'company_phone_number'];
    integerFields.forEach(field => {
      if (combinedData[field] !== undefined && combinedData[field] !== null) {
        const numValue = Number(String(combinedData[field]).replace(/\D/g, ''));
        if (!isNaN(numValue)) {
          formData.append(field, String(numValue));
        }
      }
    });

    // Float fields
    const floatFields = ['latitude', 'longitude'];
    floatFields.forEach(field => {
      if (combinedData[field] !== undefined && combinedData[field] !== null) {
        const floatValue = parseFloat(String(combinedData[field]));
        if (!isNaN(floatValue)) {
          formData.append(field, String(floatValue));
        }
      }
    });

    // Date fields
    const dateFields = ['initial_grant_date', 'renewed_from', 'valid_up_to', 'incorporation_date'];
    dateFields.forEach(field => {
      if (combinedData[field]) {
        const date = new Date(combinedData[field]);
        if (!isNaN(date.getTime())) {
          formData.append(field, date.toISOString().split('T')[0]);
        }
      }
    });

    // Boolean fields
    formData.append('is_license_fee_paid', 'false');
    formData.append('is_print_fee_paid', 'false');
    formData.append('is_fee_calculated', 'false');
    formData.append('is_license_category_updated', 'false');

    // Company details
    const companyFields = ['company_name', 'company_address', 'company_pan', 'company_cin', 'company_email'];
    companyFields.forEach(field => {
      if (combinedData[field]) {
        formData.append(field, String(combinedData[field]));
      }
    });

    // Photo
    const photoFile = this.getPassPhoto();
    if (photoFile) {
      formData.append('photo', photoFile, photoFile.name);
    }

    this.logFormData(formData, 'Old License Final FormData');
    console.groupEnd();
    return formData;
  }

  submitLicenseApplication(formData: FormData): Observable<LicenseApplication> {
    return this.submitOldLicenseApplication(formData);
  }

  getApplicationById(applicationId: string): Observable<LicenseApplication> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<LicenseApplication>(`${this.oldLicenseUrl}/detail/${encodedId}/`);
  }

  deleteApplication(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.delete(`${this.oldLicenseUrl}/${encodedId}/delete/`);
  }

  getAllApplications(): Observable<LicenseApplication[]> {
    return this.http.get<LicenseApplication[]>(`${this.oldLicenseUrl}/list/`);
  }

  getApplicationsByStatus(): Observable<ApplicationStatus> {
    return this.http.get<ApplicationStatus>(`${this.oldLicenseUrl}/list-by-status/`);
  }

  getDashboardCounts(): Observable<DashboardCount> {
    return this.http.get<DashboardCount>(`${this.oldLicenseUrl}/dashboard-counts/`);
  }

  getLocationFee(): Observable<LocationFee[]> {
    return this.http.get<LocationFee[]>(`${this.oldLicenseUrl}/location-fee/`);
  }

  advanceApplication(applicationId: string, stageId: number, context?: any): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/advance/${stageId}/`, { context: context || {} });
  }

  raiseObjection(applicationId: string, objections: { field: string; remarks: string }[], remarks?: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/raise-objection/`, {
      objections,
      remarks: remarks || ''
    });
  }

  getObjections(applicationId: string): Observable<any[]> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<any[]>(`${this.oldLicenseUrl}/${encodedId}/objections/`);
  }

  resolveObjections(applicationId: string, data: any, photo?: File): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (typeof value === 'boolean') {
          formData.append(key, value ? 'true' : 'false');
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    if (photo) formData.append('photo', photo, photo.name);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/resolve-objections/`, formData);
  }

  submitSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/site-enquiry/`, formData);
  }

  getSiteDetails(applicationId: string): Observable<SiteEnquiryFormModel> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get<SiteEnquiryFormModel>(`${this.oldLicenseUrl}/${encodedId}/site-detail/`);
  }

  printLicense(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/print/`, {});
  }

  payLicenseFee(applicationId: string, payload: any): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/pay-license-fee/`, payload);
  }

  // ========================== PHOTO & DOCUMENT MANAGEMENT ==========================

  setPassPhoto(file: File | null): void {
    this.passPhotoSubject.next(file);
  }

  getPassPhoto(): File | null {
    return this.passPhotoSubject.value;
  }

  getPassPhotoObservable(): Observable<File | null> {
    return this.passPhotoSubject.asObservable();
  }

  clearPassPhoto(): void {
    this.passPhotoSubject.next(null);
  }

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

  // ========================== UTILITY METHODS ==========================

  private getParsedSession(key: string): any {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Failed to parse session key ${key}:`, e);
      return null;
    }
  }

  clearSessionStorage(): void {
    const keys = [
      'selectLicenseData',
      'keyInfoData',
      'addressData',
      'unitDetailsData',
      'memberDetailsData',
      'applicantDetailsData',
      'siteDetailsData'
    ];
    keys.forEach(key => sessionStorage.removeItem(key));
    console.log('✅ Session storage cleared');
  }

  logFormData(formData: FormData, label: string = 'FormData'): void {
    console.group(`📋 ${label}`);
    const entries: Array<[string, any]> = [];
    formData.forEach((value, key) => {
      if (value instanceof File) {
        entries.push([key, `[File: ${value.name}, ${value.size} bytes]`]);
      } else {
        entries.push([key, value]);
      }
    });
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    entries.forEach(([key, value]) => {
      console.log(`  ${key}:`, value);
    });
    console.groupEnd();
  }
}