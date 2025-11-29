import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApplicationStatus, DashboardCount } from '../models/dashboard.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { LicenseApplication } from '../models/license-application.model';
import { LocationFee } from '../models/location-fee.model';
import { SiteEnquiryFormModel } from '../models/site-enquiry.model';
import { 
  NewLicenseApplication, 
} from '../models/new-license-application.model';

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
      objections: objections.map(obj => ({ field: obj.field, remarks: obj.remarks })),
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
   * ✅ FIXED: All required backend fields with proper defaults
   */
  prepareNewLicenseFormData(): FormData {
    const formData = new FormData();
    
    // Get all session data
    const selectLicenseData = this.getParsedSession('selectLicenseData');
    const keyInfoData = this.getParsedSession('keyInfoData');
    const applicantDetailsData = this.getParsedSession('applicantDetailsData');
    const siteDetailsData = this.getParsedSession('siteDetailsData');
    const unitDetailsData = this.getParsedSession('unitDetailsData');

    console.log('📦 Session Data Retrieved:', {
      selectLicenseData,
      keyInfoData,
      applicantDetailsData,
      siteDetailsData,
      unitDetailsData
    });

    // ===== STEP 1: SELECT LICENSE =====
    if (selectLicenseData?.licenseType) {
      formData.append('license_type', selectLicenseData.licenseType.toString());
      console.log('✅ License Type:', selectLicenseData.licenseType);
    } else {
      console.error('❌ Missing: licenseType');
    }

    // ===== STEP 2: KEY INFO (BASIC INFORMATION) =====
    if (keyInfoData) {
      if (keyInfoData.licenseCategory) {
        formData.append('license_category', keyInfoData.licenseCategory.toString());
        console.log('✅ License Category:', keyInfoData.licenseCategory);
      } else {
        console.error('❌ Missing: license_category');
      }
      
      if (keyInfoData.licenseSubCategory) {
        formData.append('license_sub_category', keyInfoData.licenseSubCategory.toString());
        console.log('✅ License Sub Category:', keyInfoData.licenseSubCategory);
      } else {
        console.error('❌ Missing: license_sub_category');
      }
      
      if (keyInfoData.establishmentName) {
        formData.append('establishment_name', keyInfoData.establishmentName);
        console.log('✅ Establishment Name:', keyInfoData.establishmentName);
      } else {
        console.error('❌ Missing: establishment_name');
      }
      
      // ✅ FIX: location_district comes from siteDetailsData
      if (siteDetailsData?.siteDistrict) {
        formData.append('location_district', siteDetailsData.siteDistrict.toString());
        console.log('✅ Location District:', siteDetailsData.siteDistrict);
      } else {
        console.error('❌ Missing: location_district (from siteDistrict)');
      }
      
      if (keyInfoData.siteType) {
        formData.append('site_type', keyInfoData.siteType);
        console.log('✅ Site Type:', keyInfoData.siteType);
      } else {
        console.error('❌ Missing: site_type');
      }
    }

    // ===== STEP 3: APPLICANT DETAILS =====
    if (applicantDetailsData) {
      // ✅ FIX: Status field (marital status) with default
      if (applicantDetailsData.maritalStatus) {
        formData.append('status', applicantDetailsData.maritalStatus);
        console.log('✅ Status (Marital):', applicantDetailsData.maritalStatus);
      } else if (applicantDetailsData.status) {
        formData.append('status', applicantDetailsData.status);
        console.log('✅ Status:', applicantDetailsData.status);
      } else {
        formData.append('status', 'Single');
        console.warn('⚠️ Status defaulted to: Single');
      }

      // Build full name from first, middle, last
      const nameParts = [
        applicantDetailsData.firstName,
        applicantDetailsData.middleName,
        applicantDetailsData.lastName
      ].filter(Boolean);
      
      if (nameParts.length > 0) {
        const fullName = nameParts.join(' ');
        formData.append('applicant_name', fullName);
        console.log('✅ Applicant Name:', fullName);
      } else if (applicantDetailsData.applicantName) {
        formData.append('applicant_name', applicantDetailsData.applicantName);
        console.log('✅ Applicant Name (fallback):', applicantDetailsData.applicantName);
      } else {
        console.error('❌ Missing: applicant_name');
      }

      if (applicantDetailsData.fatherHusbandName) {
        formData.append('father_husband_name', applicantDetailsData.fatherHusbandName);
        console.log('✅ Father/Husband Name:', applicantDetailsData.fatherHusbandName);
      } else {
        console.error('❌ Missing: father_husband_name');
      }

      // ✅ FIX: Date of Birth - CRITICAL REQUIRED FIELD
      if (applicantDetailsData.dob) {
        const dobDate = new Date(applicantDetailsData.dob);
        const formattedDob = dobDate.toISOString().split('T')[0];
        formData.append('dob', formattedDob);
        console.log('✅ DOB:', formattedDob);
      } else {
        console.error('❌ CRITICAL: dob is missing! This is required by backend.');
      }

      if (applicantDetailsData.nationality) {
        formData.append('nationality', applicantDetailsData.nationality);
        console.log('✅ Nationality:', applicantDetailsData.nationality);
      } else {
        console.error('❌ Missing: nationality');
      }

      if (applicantDetailsData.gender) {
        formData.append('gender', applicantDetailsData.gender);
        console.log('✅ Gender:', applicantDetailsData.gender);
      } else {
        console.error('❌ Missing: gender');
      }

      if (applicantDetailsData.pan) {
        formData.append('pan', applicantDetailsData.pan.toUpperCase());
        console.log('✅ PAN:', applicantDetailsData.pan.toUpperCase());
      } else {
        console.error('❌ Missing: pan');
      }
      
      // ✅ FIX: Mobile number - check all possible field names
      const mobileNumber = applicantDetailsData.applicantMobileNumber || 
                          applicantDetailsData.mobileNumber || 
                          applicantDetailsData.mobile;
      
      if (mobileNumber) {
        const cleanedMobile = String(mobileNumber).replace(/\D/g, '');
        formData.append('applicant_mobile_number', cleanedMobile);
        console.log('✅ Mobile Number:', cleanedMobile);
      } else {
        console.error('❌ CRITICAL: applicant_mobile_number is missing!');
      }
      
      // ✅ FIX: Email - check all possible field names
      const email = applicantDetailsData.applicantEmail || 
                   applicantDetailsData.email;
      
      if (email) {
        formData.append('applicant_email', email.toLowerCase());
        console.log('✅ Email:', email);
      } else {
        console.error('❌ CRITICAL: applicant_email is missing!');
      }
    }

    // ===== STEP 4: SITE DETAILS =====
    if (siteDetailsData) {
      if (siteDetailsData.siteSubdivision) {
        formData.append('site_subdivision', siteDetailsData.siteSubdivision.toString());
        console.log('✅ Site Subdivision:', siteDetailsData.siteSubdivision);
      } else {
        console.error('❌ Missing: site_subdivision');
      }

      if (siteDetailsData.policeStation) {
        formData.append('police_station', siteDetailsData.policeStation.toString());
        console.log('✅ Police Station:', siteDetailsData.policeStation);
      } else {
        console.error('❌ Missing: police_station');
      }

      if (siteDetailsData.locationCategory) {
        formData.append('location_category', siteDetailsData.locationCategory);
        console.log('✅ Location Category:', siteDetailsData.locationCategory);
      } else {
        console.error('❌ Missing: location_category');
      }

      if (siteDetailsData.locationName) {
        formData.append('location_name', siteDetailsData.locationName);
        console.log('✅ Location Name:', siteDetailsData.locationName);
      } else {
        console.error('❌ Missing: location_name');
      }

      if (siteDetailsData.wardName) {
        formData.append('ward_name', siteDetailsData.wardName);
        console.log('✅ Ward Name:', siteDetailsData.wardName);
      } else {
        console.error('❌ Missing: ward_name');
      }

      if (siteDetailsData.businessAddress) {
        formData.append('business_address', siteDetailsData.businessAddress);
        console.log('✅ Business Address:', siteDetailsData.businessAddress);
      } else {
        console.error('❌ Missing: business_address');
      }

      if (siteDetailsData.roadName) {
        formData.append('road_name', siteDetailsData.roadName);
        console.log('✅ Road Name:', siteDetailsData.roadName);
      } else {
        console.error('❌ Missing: road_name');
      }

      if (siteDetailsData.pinCode) {
        formData.append('pin_code', siteDetailsData.pinCode.toString());
        console.log('✅ PIN Code:', siteDetailsData.pinCode);
      } else {
        console.error('❌ Missing: pin_code');
      }

      // Optional fields
      if (siteDetailsData.latitude) {
        formData.append('latitude', siteDetailsData.latitude.toString());
        console.log('✅ Latitude:', siteDetailsData.latitude);
      }

      if (siteDetailsData.longitude) {
        formData.append('longitude', siteDetailsData.longitude.toString());
        console.log('✅ Longitude:', siteDetailsData.longitude);
      }

      if (siteDetailsData.constructionType) {
        formData.append('construction_type', siteDetailsData.constructionType);
        console.log('✅ Construction Type:', siteDetailsData.constructionType);
      } else {
        console.error('❌ Missing: construction_type');
      }

      if (siteDetailsData.length) {
        formData.append('length', siteDetailsData.length.toString());
        console.log('✅ Length:', siteDetailsData.length);
      }

      if (siteDetailsData.breadth) {
        formData.append('breadth', siteDetailsData.breadth.toString());
        console.log('✅ Breadth:', siteDetailsData.breadth);
      }

      if (siteDetailsData.siteOwned) {
        formData.append('site_owned', siteDetailsData.siteOwned);
        console.log('✅ Site Owned:', siteDetailsData.siteOwned);
      } else {
        console.error('❌ Missing: site_owned');
      }

      // ✅ FIX: NOC Obtained - provide default value if missing
      if (siteDetailsData.nocObtained) {
        formData.append('noc_obtained', siteDetailsData.nocObtained);
        console.log('✅ NOC Obtained:', siteDetailsData.nocObtained);
      } else {
        formData.append('noc_obtained', 'No');
        console.warn('⚠️ NOC Obtained defaulted to: No');
      }

      // ✅ FIX: Trade license covered - provide default value
      if (siteDetailsData.tradeLicenseCovered) {
        formData.append('trade_license_covered', siteDetailsData.tradeLicenseCovered);
        console.log('✅ Trade License Covered:', siteDetailsData.tradeLicenseCovered);
      } else {
        formData.append('trade_license_covered', 'No');
        console.warn('⚠️ Trade License Covered defaulted to: No');
      }
    }

    // ===== STEP 5: COMPANY DETAILS (only if licenseType is 2 - Company) =====
    if (selectLicenseData?.licenseType === 2 && unitDetailsData) {
      console.log('📋 Adding Company Details (License Type = Company)');
      
      if (unitDetailsData.companyName) {
        formData.append('company_name', unitDetailsData.companyName);
        console.log('✅ Company Name:', unitDetailsData.companyName);
      }
      if (unitDetailsData.companyAddress) {
        formData.append('company_address', unitDetailsData.companyAddress);
        console.log('✅ Company Address:', unitDetailsData.companyAddress);
      }
      if (unitDetailsData.companyPan) {
        formData.append('company_pan', unitDetailsData.companyPan.toUpperCase());
        console.log('✅ Company PAN:', unitDetailsData.companyPan.toUpperCase());
      }
      if (unitDetailsData.companyCin) {
        formData.append('company_cin', unitDetailsData.companyCin.toUpperCase());
        console.log('✅ Company CIN:', unitDetailsData.companyCin.toUpperCase());
      }
      if (unitDetailsData.incorporationDate) {
        const incDate = new Date(unitDetailsData.incorporationDate);
        const formattedIncDate = incDate.toISOString().split('T')[0];
        formData.append('incorporation_date', formattedIncDate);
        console.log('✅ Incorporation Date:', formattedIncDate);
      }
      if (unitDetailsData.companyPhoneNumber) {
        const cleanedPhone = String(unitDetailsData.companyPhoneNumber).replace(/\D/g, '');
        formData.append('company_phone_number', cleanedPhone);
        console.log('✅ Company Phone:', cleanedPhone);
      }
      if (unitDetailsData.companyEmail) {
        formData.append('company_email', unitDetailsData.companyEmail.toLowerCase());
        console.log('✅ Company Email:', unitDetailsData.companyEmail);
      }
    }

    // ===== PASSPORT PHOTO (REQUIRED) =====
    const photo = this.getPassPhoto();
    if (photo) {
      formData.append('photo', photo, photo.name);
      console.log('✅ Photo:', photo.name, `(${photo.size} bytes)`);
    } else {
      console.error('❌ CRITICAL: Passport photo is missing! This is a required field.');
    }

    // ===== FINAL VALIDATION =====
    console.log('\n🔍 FormData Validation Summary:');
    let entryCount = 0;
    let fileCount = 0;
    formData.forEach((value) => {
      entryCount++;
      if (value instanceof File) fileCount++;
    });
    console.log(`✅ Total entries: ${entryCount}`);
    console.log(`📎 Files: ${fileCount}`);
    console.log('================================\n');

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

  // ========================== UTILITY METHODS ==========================

  /**
   * Helper method to safely parse session storage
   */
  private getParsedSession(key: string): any {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Failed to parse session key ${key}:`, e);
      return null;
    }
  }

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

  /**
   * Log FormData contents for debugging
   */
  logFormData(formData: FormData, prefix = 'FormData'): void {
    console.log(`\n========== ${prefix} ==========`);
    const entries: Array<{Field: string, Value: string}> = [];
    
    formData.forEach((value, key) => {
      if (value instanceof File) {
        entries.push({
          Field: key,
          Value: `[File] ${value.name} (${value.size} bytes)`
        });
      } else {
        entries.push({
          Field: key,
          Value: String(value)
        });
      }
    });
    
    console.table(entries);
    console.log('================================\n');
  }
}