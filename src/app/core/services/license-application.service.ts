import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LicenseApplicationService {

  private readonly oldLicenseUrl = `${environment.apiBaseUrl}/transactional/license_application`;
  private readonly newLicenseUrl = `${environment.apiBaseUrl}/transactional/new_license_application`;

  private passPhotoSubject = new BehaviorSubject<File | null>(null);
  private siteDocumentsSubject = new BehaviorSubject<Map<string, File>>(new Map());

  constructor(private http: HttpClient) { }

  getPassPhoto(): File | null {
    return this.passPhotoSubject.value;
  }

  setPassPhoto(file: File): void {
    this.passPhotoSubject.next(file);
  }

  clearPassPhoto(): void {
    this.passPhotoSubject.next(null);
  }

  getPassPhotoObservable(): Observable<File | null> {
    return this.passPhotoSubject.asObservable();
  }

  setSiteDocument(docName: string, file: File): void {
    const current = this.siteDocumentsSubject.value;
    current.set(docName, file);
    this.siteDocumentsSubject.next(current);
  }

  getSiteDocument(docName: string): File | null {
    return this.siteDocumentsSubject.value.get(docName) || null;
  }

  removeSiteDocument(docName: string): void {
    const current = this.siteDocumentsSubject.value;
    current.delete(docName);
    this.siteDocumentsSubject.next(current);
  }

  getAllSiteDocuments(): Map<string, File> {
    return this.siteDocumentsSubject.value;
  }

  clearAllDocuments(): void {
    this.clearPassPhoto();
    this.siteDocumentsSubject.next(new Map());
  }

  /**
   * ✅ NEW LICENSE APPLICATION - Already working, keeping as is
   * Prepare FormData with CODES (not IDs) for CodeRelatedField
   */
  prepareNewLicenseFormData(): FormData {
    const formData = new FormData();

    console.group('📦 Preparing NEW LICENSE FormData');

    const selectLicenseData = this.getSessionData('selectLicenseData');
    const keyInfoData = this.getSessionData('keyInfoData');
    const applicantDetailsData = this.getSessionData('applicantDetailsData');
    const siteDetailsData = this.getSessionData('siteDetailsData');
    const unitDetailsData = this.getSessionData('unitDetailsData');

    const djangoFields: Record<string, any> = {};

    // 1. LICENSE TYPE (required)
    if (selectLicenseData?.license_type) {
      djangoFields['license_type'] = selectLicenseData.license_type;
    }

    // 2. KEY INFO (required)
    if (keyInfoData) {
      if (keyInfoData.license_category) {
        djangoFields['license_category'] = keyInfoData.license_category;
      }
      if (keyInfoData.license_sub_category) {
        djangoFields['license_sub_category'] = keyInfoData.license_sub_category;
      }
      if (keyInfoData.establishment_name) {
        djangoFields['establishment_name'] = keyInfoData.establishment_name;
      }
      if (keyInfoData.site_type) {
        djangoFields['site_type'] = keyInfoData.site_type;
      }
    }

    // 3. APPLICANT DETAILS (required)
    if (applicantDetailsData) {
      if (applicantDetailsData.applicant_name) {
        djangoFields['applicant_name'] = applicantDetailsData.applicant_name;
      }
      if (applicantDetailsData.father_husband_name) {
        djangoFields['father_husband_name'] = applicantDetailsData.father_husband_name;
      }
      if (applicantDetailsData.dob) {
        djangoFields['dob'] = this.formatDate(applicantDetailsData.dob);
      }
      if (applicantDetailsData.gender) {
        djangoFields['gender'] = applicantDetailsData.gender;
      }
      if (applicantDetailsData.nationality) {
        djangoFields['nationality'] = applicantDetailsData.nationality;
      }
      if (applicantDetailsData.residential_status) {
        djangoFields['residential_status'] = applicantDetailsData.residential_status;
      }
      if (applicantDetailsData.present_address) {
        djangoFields['present_address'] = applicantDetailsData.present_address;
      }
      if (applicantDetailsData.permanent_address) {
        djangoFields['permanent_address'] = applicantDetailsData.permanent_address;
      }
      if (applicantDetailsData.pan) {
        djangoFields['pan'] = applicantDetailsData.pan;
      }
      if (applicantDetailsData.email) {
        djangoFields['email'] = applicantDetailsData.email;
      }
      if (applicantDetailsData.mobile_number) {
        djangoFields['mobile_number'] = applicantDetailsData.mobile_number;
      }
      if (applicantDetailsData.mode_of_operation) {
        djangoFields['mode_of_operation'] = applicantDetailsData.mode_of_operation;
      }
      if (applicantDetailsData.has_sikkim_certificate) {
        djangoFields['has_sikkim_certificate'] = applicantDetailsData.has_sikkim_certificate;
      }
      if (applicantDetailsData.has_excise_license) {
        djangoFields['has_excise_license'] = applicantDetailsData.has_excise_license;
      }
      if (applicantDetailsData.family_excise_license) {
        djangoFields['family_excise_license'] = applicantDetailsData.family_excise_license;
      }
      if (applicantDetailsData.criminal_conviction) {
        djangoFields['criminal_conviction'] = applicantDetailsData.criminal_conviction;
      }
    }

    // 4. SITE DETAILS - ✅ CRITICAL: Get CODES from master data
    if (siteDetailsData) {
      const districts = JSON.parse(sessionStorage.getItem('districts') || '[]');
      const subdivisions = JSON.parse(sessionStorage.getItem('subdivisions') || '[]');
      const policeStations = JSON.parse(sessionStorage.getItem('policeStations') || '[]');
      const roads = JSON.parse(sessionStorage.getItem('roads') || '[]');

      if (siteDetailsData.district) {
        const district = districts.find((d: any) => d.id === Number(siteDetailsData.district));
        if (district) {
          djangoFields['site_district'] = String(district.districtCode);
          console.log('✅ District Code:', district.districtCode);
        } else {
          console.error('❌ District not found for ID:', siteDetailsData.district);
        }
      }

      if (siteDetailsData.subdivision) {
        const subdivision = subdivisions.find((s: any) => s.id === Number(siteDetailsData.subdivision));
        if (subdivision) {
          djangoFields['site_subdivision'] = String(subdivision.subdivisionCode);
          console.log('✅ Subdivision Code:', subdivision.subdivisionCode);
        } else {
          console.error('❌ Subdivision not found for ID:', siteDetailsData.subdivision);
        }
      }

      if (siteDetailsData.police_station) {
        const policeStation = policeStations.find((p: any) => p.id === Number(siteDetailsData.police_station));
        if (policeStation) {
          djangoFields['police_station'] = String(policeStation.policeStationCode);
          console.log('✅ Police Station Code:', policeStation.policeStationCode);
        } else {
          console.error('❌ Police Station not found for ID:', siteDetailsData.police_station);
        }
      }

      if (siteDetailsData.road) {
        const road = roads.find((r: any) => r.id === Number(siteDetailsData.road));
        if (road) {
          djangoFields['road_name'] = String(road.roadName);
          console.log('✅ Road Name:', road.roadName);
        } else {
          console.error('❌ Road not found for ID:', siteDetailsData.road);
        }
      }

      if (siteDetailsData.location_category) {
        djangoFields['location_category'] = siteDetailsData.location_category;
      }
      if (siteDetailsData.location_name) {
        djangoFields['location_name'] = siteDetailsData.location_name;
      }
      if (siteDetailsData.ward_name) {
        djangoFields['ward_name'] = siteDetailsData.ward_name;
      }
      if (siteDetailsData.address) {
        djangoFields['business_address'] = siteDetailsData.address;
      }
      if (siteDetailsData.pin_code) {
        djangoFields['pin_code'] = siteDetailsData.pin_code;
      }
      if (siteDetailsData.construction_type) {
        djangoFields['construction_type'] = siteDetailsData.construction_type;
      }
      if (siteDetailsData.length) {
        djangoFields['length'] = siteDetailsData.length;
      }
      if (siteDetailsData.breadth) {
        djangoFields['breadth'] = siteDetailsData.breadth;
      }
      if (siteDetailsData.site_owned) {
        djangoFields['site_owned'] = siteDetailsData.site_owned;
      }

      if (siteDetailsData.site_owned === 'No' && siteDetailsData.noc_obtained) {
        djangoFields['noc_obtained'] = siteDetailsData.noc_obtained;
      } else if (siteDetailsData.site_owned === 'Yes') {
        djangoFields['noc_obtained'] = 'No';
      }

      if (siteDetailsData.trade_license_covered) {
        djangoFields['trade_license_covered'] = siteDetailsData.trade_license_covered;
      }
    }

    // 5. COMPANY DETAILS (optional)
    if (unitDetailsData && Object.keys(unitDetailsData).length > 0) {
      if (unitDetailsData.company_name) {
        djangoFields['company_name'] = unitDetailsData.company_name;
      }
      if (unitDetailsData.company_address) {
        djangoFields['company_address'] = unitDetailsData.company_address;
      }
      if (unitDetailsData.company_pan) {
        djangoFields['company_pan'] = unitDetailsData.company_pan;
      }
      if (unitDetailsData.company_cin) {
        djangoFields['company_cin'] = unitDetailsData.company_cin;
      }
      if (unitDetailsData.incorporation_date) {
        djangoFields['incorporation_date'] = this.formatDate(unitDetailsData.incorporation_date);
      }
      if (unitDetailsData.company_phone_number) {
        djangoFields['company_phone_number'] = unitDetailsData.company_phone_number;
      }
      if (unitDetailsData.company_email) {
        djangoFields['company_email'] = unitDetailsData.company_email;
      }
    }

    console.log('✅ Django Model Fields:', djangoFields);

    console.group('📋 Adding fields to FormData:');
    Object.entries(djangoFields).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        console.log(`  ${key}: ${JSON.stringify(value)} (${typeof value})`);
        formData.append(key, String(value));
      } else {
        console.log(`  ${key}: SKIPPED (null/undefined/empty)`);
      }
    });
    console.groupEnd();

    const passPhoto = this.getPassPhoto();
    if (passPhoto) {
      console.log('✅ Adding pass_photo:', passPhoto.name);
      formData.append('pass_photo', passPhoto, passPhoto.name);
    }

    const siteDocuments = this.getAllSiteDocuments();
    if (siteDocuments.size > 0) {
      console.log('✅ Adding site documents:', siteDocuments.size);
      siteDocuments.forEach((file: File, docName: string) => {
        console.log(`  - ${docName}: ${file.name}`);
        formData.append(docName, file, file.name);
      });
    }

    console.log('✅ NEW LICENSE FormData prepared');
    console.groupEnd();

    return formData;
  }

  submitNewLicenseApplication(formData: FormData): Observable<any> {
    const url = `${this.newLicenseUrl}/apply/`;
    console.log('📤 Submitting NEW LICENSE Application to:', url);
    return this.http.post(url, formData);
  }

  /**
   * ✅ OLD LICENSE APPLICATION - FIXED with snake_case field names
   * Backend expects STRING CODES for excise_district, excise_subdivision, site_subdivision, police_station
   * AND snake_case field names (NOT camelCase)
   */
  prepareOldLicenseFormData(): FormData {
    const formData = new FormData();
    console.group('📦 Preparing OLD LICENSE FormData');

    const selectLicenseData = this.getSessionData('selectLicenseData');
    const keyInfoData = this.getSessionData('keyInfoData');
    const addressData = this.getSessionData('addressData');
    const unitDetailsData = this.getSessionData('unitDetailsData');
    const memberDetailsData = this.getSessionData('memberDetailsData');

    const formFields: Record<string, any> = {};

    // Get master data for code lookups
    const districts = JSON.parse(sessionStorage.getItem('districts') || '[]');
    const subdivisions = JSON.parse(sessionStorage.getItem('subdivisions') || '[]');
    const policeStations = JSON.parse(sessionStorage.getItem('policeStations') || '[]');
    const roads = JSON.parse(sessionStorage.getItem('roads') || '[]');

    // ✅ 1. SELECT LICENSE DATA - Convert IDs to CODES, use snake_case
    if (selectLicenseData) {
      // excise_district: CodeRelatedField expects STRING CODE
      if (selectLicenseData.excise_district) {
        const district = districts.find((d: any) => d.id === Number(selectLicenseData.excise_district));
        if (district) {
          formFields['excise_district'] = String(district.districtCode);
          console.log('✅ excise_district:', district.districtCode);
        }
      }

      // license_category: PrimaryKeyRelatedField expects INTEGER ID
      if (selectLicenseData.license_category) {
        formFields['license_category'] = Number(selectLicenseData.license_category);
      }

      // excise_subdivision: CodeRelatedField expects STRING CODE
      if (selectLicenseData.excise_subdivision) {
        const subdivision = subdivisions.find((s: any) => s.id === Number(selectLicenseData.excise_subdivision));
        if (subdivision) {
          formFields['excise_subdivision'] = String(subdivision.subdivisionCode);
          console.log('✅ excise_subdivision:', subdivision.subdivisionCode);
        }
      }

      // license: CharField
      if (selectLicenseData.license) {
        formFields['license'] = selectLicenseData.license;
      }
    }

    // ✅ 2. KEY INFO DATA - use snake_case
    if (keyInfoData) {
      if (keyInfoData.license_type) {
        formFields['license_type'] = Number(keyInfoData.license_type);
      }
      if (keyInfoData.establishment_name) {
        formFields['establishment_name'] = keyInfoData.establishment_name;
      }
      if (keyInfoData.mobile_number) {
        formFields['mobile_number'] = Number(keyInfoData.mobile_number);
      }
      if (keyInfoData.email) {
        formFields['email'] = keyInfoData.email;
      }
      if (keyInfoData.license_no) {
        formFields['license_no'] = keyInfoData.license_no;
      }
      if (keyInfoData.initial_grant_date) {
        formFields['initial_grant_date'] = keyInfoData.initial_grant_date;
      }
      if (keyInfoData.renewed_from) {
        formFields['renewed_from'] = keyInfoData.renewed_from;
      }
      if (keyInfoData.valid_up_to) {
        formFields['valid_up_to'] = keyInfoData.valid_up_to;
      }
      if (keyInfoData.yearly_license_fee) {
        formFields['yearly_license_fee'] = keyInfoData.yearly_license_fee;
      }
      if (keyInfoData.license_nature) {
        formFields['license_nature'] = keyInfoData.license_nature;
      }
      if (keyInfoData.functioning_status) {
        formFields['functioning_status'] = keyInfoData.functioning_status;
      }
      if (keyInfoData.mode_of_operation) {
        formFields['mode_of_operation'] = keyInfoData.mode_of_operation;
      }
    }

    // ✅ 3. ADDRESS DATA - Convert IDs to CODES, use snake_case
    if (addressData) {
      // site_subdivision: CodeRelatedField expects STRING CODE
      if (addressData.site_subdivision) {
        const subdivision = subdivisions.find((s: any) => s.id === Number(addressData.site_subdivision));
        if (subdivision) {
          formFields['site_subdivision'] = String(subdivision.subdivisionCode);
          console.log('✅ site_subdivision:', subdivision.subdivisionCode);
        }
      }

      // police_station: CodeRelatedField expects STRING CODE
      if (addressData.police_station) {
        const policeStation = policeStations.find((p: any) => p.id === Number(addressData.police_station));
        if (policeStation) {
          formFields['police_station'] = String(policeStation.policeStationCode);
          console.log('✅ police_station:', policeStation.policeStationCode);
        }
      }

      if (addressData.location_category) {
        formFields['location_category'] = addressData.location_category;
      }
      if (addressData.location_name) {
        formFields['location_name'] = addressData.location_name;
      }
      if (addressData.ward_name) {
        formFields['ward_name'] = addressData.ward_name;
      }
      if (addressData.business_address) {
        formFields['business_address'] = addressData.business_address;
      }

      // road_name: CharField expects STRING
      if (addressData.road_name) {
        // Check if it's already a string (road name) or an ID
        if (typeof addressData.road_name === 'string' && !addressData.road_name.match(/^\d+$/)) {
          formFields['road_name'] = String(addressData.road_name);
          console.log('✅ road_name (direct):', addressData.road_name);
        } else {
          const road = roads.find((r: any) => r.id === Number(addressData.road_name));
          if (road) {
            formFields['road_name'] = String(road.roadName);
            console.log('✅ road_name (from ID):', road.roadName);
          }
        }
      }

      if (addressData.pin_code) {
        formFields['pin_code'] = Number(addressData.pin_code);
      }
      if (addressData.latitude) {
        formFields['latitude'] = Number(addressData.latitude);
      }
      if (addressData.longitude) {
        formFields['longitude'] = Number(addressData.longitude);
      }
    }

    // ✅ 4. UNIT DETAILS (optional) - use snake_case
    if (unitDetailsData && Object.keys(unitDetailsData).length > 0) {
      if (unitDetailsData.company_name) {
        formFields['company_name'] = unitDetailsData.company_name;
      }
      if (unitDetailsData.company_address) {
        formFields['company_address'] = unitDetailsData.company_address;
      }
      if (unitDetailsData.company_pan) {
        formFields['company_pan'] = unitDetailsData.company_pan;
      }
      if (unitDetailsData.company_cin) {
        formFields['company_cin'] = unitDetailsData.company_cin;
      }
      if (unitDetailsData.incorporation_date) {
        formFields['incorporation_date'] = unitDetailsData.incorporation_date;
      }
      if (unitDetailsData.company_phone_number) {
        formFields['company_phone_number'] = Number(unitDetailsData.company_phone_number);
      }
      if (unitDetailsData.company_email) {
        formFields['company_email'] = unitDetailsData.company_email;
      }
    }

    // ✅ 5. MEMBER DETAILS - use snake_case
    if (memberDetailsData) {
      if (memberDetailsData.status) {
        formFields['status'] = memberDetailsData.status;
      }
      if (memberDetailsData.member_name) {
        formFields['member_name'] = memberDetailsData.member_name;
      }
      if (memberDetailsData.father_husband_name) {
        formFields['father_husband_name'] = memberDetailsData.father_husband_name;
      }
      if (memberDetailsData.nationality) {
        formFields['nationality'] = memberDetailsData.nationality;
      }
      if (memberDetailsData.gender) {
        formFields['gender'] = memberDetailsData.gender;
      }
      if (memberDetailsData.pan) {
        formFields['pan'] = memberDetailsData.pan;
      }
      if (memberDetailsData.member_mobile_number) {
        formFields['member_mobile_number'] = Number(memberDetailsData.member_mobile_number);
      }
      if (memberDetailsData.member_email) {
        formFields['member_email'] = memberDetailsData.member_email;
      }
    }

    console.log('✅ Old License Form Fields:', formFields);

    // Add all fields to formData
    Object.entries(formFields).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        console.log(`  ${key}: ${value} (${typeof value})`);
        formData.append(key, String(value));
      }
    });

    // ✅ Add passport photo with correct field name
    const passPhoto = this.getPassPhoto();
    if (passPhoto) {
      console.log('✅ Adding photo:', passPhoto.name);
      formData.append('photo', passPhoto, passPhoto.name);
    } else {
      console.error('❌ CRITICAL: Missing passport photo!');
    }

    console.log('✅ OLD LICENSE FormData prepared');
    console.groupEnd();

    return formData;
  }

  submitOldLicenseApplication(formData: FormData): Observable<any> {
    const url = `${this.oldLicenseUrl}/apply/`;
    console.log('📤 Submitting OLD LICENSE Application to:', url);
    return this.http.post(url, formData);
  }

  // ============================================================
  // HELPER METHODS (Shared by both New and Old License)
  // ============================================================

  private getSessionData(key: string): any {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`❌ Failed to parse session data for ${key}:`, e);
      return null;
    }
  }

  private formatDate(value: any): string {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else if (typeof value === 'string' && value.includes('T')) {
      const date = new Date(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(value);
  }

  // ============================================================
  // OLD LICENSE APPLICATION METHODS
  // ============================================================

  advanceApplication(applicationId: string, stageId: number, context?: any): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/advance/${stageId}/`, { context: context || {} });
  }

  raiseObjection(applicationId: string, objections: { field: string; remarks: string }[], generalRemarks?: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const body: any = { objections };
    if (generalRemarks) body.remarks = generalRemarks;
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/raise-objection/`, body);
  }

  getApplicationsByStatus(): Observable<any> {
    return this.http.get(`${this.oldLicenseUrl}/list-by-status/`);
  }

  getDashboardCounts(): Observable<any> {
    return this.http.get(`${this.oldLicenseUrl}/dashboard-counts/`);
  }

  getApplicationById(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/detail/${encodedId}/`);
  }

  getObjections(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/${encodedId}/objections/`);
  }

  getSiteDetails(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/${encodedId}/site-detail/`);
  }

  getLocationFee(): Observable<any> {
    return this.http.get(`${this.oldLicenseUrl}/location-fee/`);
  }

  getApplicationMovement(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/${encodedId}/movements/`);
  }

  getNextStages(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/${encodedId}/next-stages/`);
  }

  submitSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/site-enquiry/`, formData);
  }

  updateSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.put(`${this.oldLicenseUrl}/${encodedId}/site-enquiry/`, formData);
  }

  searchApplications(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.oldLicenseUrl}/search/`, { params });
  }

  downloadApplicationPDF(applicationId: string): Observable<Blob> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/${encodedId}/download-pdf/`, { responseType: 'blob' });
  }

  getApplicationStats(): Observable<any> {
    return this.http.get(`${this.oldLicenseUrl}/statistics/`);
  }

  printLicense(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/print/`, {});
  }

  resolveObjections(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/resolve-objections/`, formData);
  }

  deleteApplication(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.delete(`${this.oldLicenseUrl}/${encodedId}/delete/`);
  }

  payLicenseFee(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/pay-license-fee/`, formData);
  }

  // ============================================================
  // NEW LICENSE APPLICATION METHODS
  // ============================================================

  /**
   * Get next stages for NEW LICENSE applications
   */
  getNewLicenseNextStages(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/${encodedId}/next-stages/`);
  }

  /**
   * Advance NEW LICENSE application to next stage
   */
  advanceNewLicenseApplication(applicationId: string, stageId: number, context?: any): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/advance/${stageId}/`, { context: context || {} });
  }

  /**
   * Raise objection for NEW LICENSE application
   */
  raiseNewLicenseObjection(applicationId: string, objections: { field: string; remarks: string }[], generalRemarks?: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const body: any = { objections };
    if (generalRemarks) body.remarks = generalRemarks;
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/raise-objection/`, body);
  }

  /**
   * Get NEW LICENSE application by ID
   */
  getNewLicenseApplicationById(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/detail/${encodedId}/`);
  }

  /**
   * Get objections for NEW LICENSE application
   */
  getNewLicenseObjections(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/${encodedId}/objections/`);
  }

  /**
   * Get location fees for NEW LICENSE applications
   */
  getNewLicenseLocationFee(): Observable<any> {
    return this.http.get(`${this.newLicenseUrl}/location-fee/`);
  }

  /**
   * Get application movement for NEW LICENSE
   */
  getNewLicenseApplicationMovement(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/${encodedId}/movements/`);
  }

  /**
   * Delete NEW LICENSE application
   */
  deleteNewLicenseApplication(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.delete(`${this.newLicenseUrl}/${encodedId}/delete/`);
  }

  /**
   * Print NEW LICENSE
   */
  printNewLicense(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/print/`, {});
  }

  /**
   * Resolve objections for NEW LICENSE application
   */
  resolveNewLicenseObjections(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/resolve-objections/`, formData);
  }

  /**
   * Pay license fee for NEW LICENSE application
   */
  payNewLicenseFee(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/pay-license-fee/`, formData);
  }

  /**
   * Get dashboard counts for NEW LICENSE applications
   */
  getNewLicenseDashboardCounts(): Observable<any> {
    return this.http.get(`${this.newLicenseUrl}/dashboard-counts/`);
  }

  /**
   * Get NEW LICENSE applications by status
   */
  getNewLicenseApplicationsByStatus(): Observable<any> {
    return this.http.get(`${this.newLicenseUrl}/list-by-status/`);
  }

  /**
   * Get site details for NEW LICENSE application
   */
  getNewLicenseSiteDetails(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/${encodedId}/site-detail/`);
  }

  /**
   * Submit site enquiry data for NEW LICENSE
   */
  submitNewLicenseSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/site-enquiry/`, formData);
  }

  /**
   * Update site enquiry data for NEW LICENSE
   */
  updateNewLicenseSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.put(`${this.newLicenseUrl}/${encodedId}/site-enquiry/`, formData);
  }

  /**
   * Search NEW LICENSE applications
   */
  searchNewLicenseApplications(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.newLicenseUrl}/search/`, { params });
  }

  /**
   * Download NEW LICENSE application PDF
   */
  downloadNewLicenseApplicationPDF(applicationId: string): Observable<Blob> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/${encodedId}/download-pdf/`, { responseType: 'blob' });
  }

  /**
   * Get NEW LICENSE application stats
   */
  getNewLicenseApplicationStats(): Observable<any> {
    return this.http.get(`${this.newLicenseUrl}/statistics/`);
  }
}