import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LicenseApplicationService {

  private readonly oldLicenseUrl = `${environment.apiBaseUrl}/transactional/license_application`;
  private readonly newLicenseUrl = `${environment.apiBaseUrl}/transactional/new_license_application`;
  private readonly siteEnquiryUrl = `${environment.apiBaseUrl}/transactional/site_enquiry`;
  private readonly workflowUrl = `${environment.apiBaseUrl}/auth`;

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

  prepareOldLicenseFormData(): FormData {
    const formData = new FormData();
    console.group('📦 Preparing OLD LICENSE FormData');

    const selectLicenseData = this.getSessionData('selectLicenseData');
    const keyInfoData = this.getSessionData('keyInfoData');
    const addressData = this.getSessionData('addressData');
    const unitDetailsData = this.getSessionData('unitDetailsData');
    const memberDetailsData = this.getSessionData('memberDetailsData');

    console.log('📄 Raw Session Data:');
    console.log('  selectLicenseData:', selectLicenseData);
    console.log('  keyInfoData:', keyInfoData);
    console.log('  addressData:', addressData);
    console.log('  unitDetailsData:', unitDetailsData);
    console.log('  memberDetailsData:', memberDetailsData);

    const districts = JSON.parse(sessionStorage.getItem('districts') || '[]');
    const subdivisions = JSON.parse(sessionStorage.getItem('subdivisions') || '[]');
    const policeStations = JSON.parse(sessionStorage.getItem('policeStations') || '[]');

    console.log('📊 Master Data:', {
      districts: districts.length,
      subdivisions: subdivisions.length,
      policeStations: policeStations.length
    });

    if (selectLicenseData) {
      if (selectLicenseData.excise_district) {
        const districtId = selectLicenseData.excise_district;
        const district = districts.find((d: any) => d.id === Number(districtId));
        if (district) {
          const code = String(district.districtCode || district.district_code);
          formData.append('excise_district', code);
          console.log('✅ excise_district:', code);
        } else {
          console.error('❌ District not found for ID:', districtId);
        }
      }

      if (selectLicenseData.license_category) {
        formData.append('license_category', String(selectLicenseData.license_category));
        console.log('✅ license_category:', selectLicenseData.license_category);
      }

      if (selectLicenseData.excise_subdivision) {
        const subdivisionId = selectLicenseData.excise_subdivision;
        const subdivision = subdivisions.find((s: any) => s.id === Number(subdivisionId));
        if (subdivision) {
          const code = String(subdivision.subdivisionCode || subdivision.subdivision_code);
          formData.append('excise_subdivision', code);
          console.log('✅ excise_subdivision:', code);
        } else {
          console.error('❌ Excise subdivision not found for ID:', subdivisionId);
        }
      }

      if (selectLicenseData.license) {
        formData.append('license', String(selectLicenseData.license));
        console.log('✅ license:', selectLicenseData.license);
      }
    }

    if (keyInfoData) {
      if (keyInfoData.license_type) {
        formData.append('license_type', String(keyInfoData.license_type));
        console.log('✅ license_type:', keyInfoData.license_type);
      }
      if (keyInfoData.establishment_name) {
        formData.append('establishment_name', String(keyInfoData.establishment_name));
      }
      if (keyInfoData.mobile_number) {
        formData.append('mobile_number', String(keyInfoData.mobile_number));
      }
      if (keyInfoData.email) {
        formData.append('email', String(keyInfoData.email));
      }
      if (keyInfoData.license_no) {
        formData.append('license_no', String(keyInfoData.license_no));
      }
      if (keyInfoData.initial_grant_date) {
        formData.append('initial_grant_date', String(keyInfoData.initial_grant_date));
      }
      if (keyInfoData.renewed_from) {
        formData.append('renewed_from', String(keyInfoData.renewed_from));
      }
      if (keyInfoData.valid_up_to) {
        formData.append('valid_up_to', String(keyInfoData.valid_up_to));
      }
      if (keyInfoData.yearly_license_fee) {
        formData.append('yearly_license_fee', String(keyInfoData.yearly_license_fee));
      }
      if (keyInfoData.license_nature) {
        formData.append('license_nature', String(keyInfoData.license_nature));
      }
      if (keyInfoData.functioning_status) {
        formData.append('functioning_status', String(keyInfoData.functioning_status));
      }
      if (keyInfoData.mode_of_operation) {
        formData.append('mode_of_operation', String(keyInfoData.mode_of_operation));
      }
    }

    if (addressData) {
      if (addressData.site_subdivision) {
        const subdivisionId = addressData.site_subdivision;
        const subdivision = subdivisions.find((s: any) => s.id === Number(subdivisionId));
        if (subdivision) {
          const code = String(subdivision.subdivisionCode || subdivision.subdivision_code);
          formData.append('site_subdivision', code);
          console.log('✅ site_subdivision:', code);
        } else {
          console.error('❌ Site subdivision not found for ID:', subdivisionId);
        }
      }

      if (addressData.police_station) {
        const policeStationId = addressData.police_station;
        const policeStation = policeStations.find((p: any) => p.id === Number(policeStationId));
        if (policeStation) {
          const code = String(policeStation.policeStationCode || policeStation.police_station_code);
          formData.append('police_station', code);
          console.log('✅ police_station:', code);
        } else {
          console.error('❌ Police station not found for ID:', policeStationId);
        }
      }

      if (addressData.location_category) {
        formData.append('location_category', String(addressData.location_category));
      }
      if (addressData.location_name) {
        formData.append('location_name', String(addressData.location_name));
      }
      if (addressData.ward_name) {
        formData.append('ward_name', String(addressData.ward_name));
      }
      if (addressData.business_address) {
        formData.append('business_address', String(addressData.business_address));
      }
      if (addressData.road_name) {
        formData.append('road_name', String(addressData.road_name));
      }
      if (addressData.pin_code) {
        formData.append('pin_code', String(addressData.pin_code));
      }
      if (addressData.latitude) {
        formData.append('latitude', String(addressData.latitude));
      }
      if (addressData.longitude) {
        formData.append('longitude', String(addressData.longitude));
      }
    }

    if (unitDetailsData && Object.keys(unitDetailsData).length > 0) {
      if (unitDetailsData.company_name) {
        formData.append('company_name', String(unitDetailsData.company_name));
      }
      if (unitDetailsData.company_address) {
        formData.append('company_address', String(unitDetailsData.company_address));
      }
      if (unitDetailsData.company_pan) {
        formData.append('company_pan', String(unitDetailsData.company_pan));
      }
      if (unitDetailsData.company_cin) {
        formData.append('company_cin', String(unitDetailsData.company_cin));
      }
      if (unitDetailsData.incorporation_date) {
        formData.append('incorporation_date', String(unitDetailsData.incorporation_date));
      }
      if (unitDetailsData.company_phone_number) {
        formData.append('company_phone_number', String(unitDetailsData.company_phone_number));
      }
      if (unitDetailsData.company_email) {
        formData.append('company_email', String(unitDetailsData.company_email));
      }
    }

    if (memberDetailsData) {
      if (memberDetailsData.status) {
        formData.append('status', String(memberDetailsData.status));
      }
      if (memberDetailsData.member_name) {
        formData.append('member_name', String(memberDetailsData.member_name));
      }
      if (memberDetailsData.father_husband_name) {
        formData.append('father_husband_name', String(memberDetailsData.father_husband_name));
      }
      if (memberDetailsData.nationality) {
        formData.append('nationality', String(memberDetailsData.nationality));
      }
      if (memberDetailsData.gender) {
        formData.append('gender', String(memberDetailsData.gender));
      }
      if (memberDetailsData.pan) {
        formData.append('pan', String(memberDetailsData.pan));
      }
      if (memberDetailsData.member_mobile_number) {
        formData.append('member_mobile_number', String(memberDetailsData.member_mobile_number));
      }
      if (memberDetailsData.member_email) {
        formData.append('member_email', String(memberDetailsData.member_email));
      }
    }

    const passPhoto = this.getPassPhoto();
    if (passPhoto) {
      formData.append('photo', passPhoto, passPhoto.name);
      console.log('✅ Photo added:', passPhoto.name);
    } else {
      console.error('❌ CRITICAL: Missing passport photo!');
    }

    console.log('✅ FormData preparation complete');
    console.groupEnd();

    return formData;
  }

  submitOldLicenseApplication(formData: FormData): Observable<any> {
    const url = `${this.oldLicenseUrl}/apply/`;
    console.log('📤 Submitting OLD LICENSE Application to:', url);
    return this.http.post(url, formData);
  }

  private getSessionData(key: string): any {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`❌ Failed to parse session data for ${key}:`, e);
      return null;
    }
  }

  /**
   * ✅ FINAL FIX FOR NEW LICENSE - Converts IDs to CODES with correct field names
   */
  prepareNewLicenseFormData(): FormData {
    const formData = new FormData();
    console.group('📦 Preparing NEW LICENSE FormData');

    const selectLicenseData = this.getSessionData('selectLicenseData');
    const keyInfoData = this.getSessionData('keyInfoData');
    const applicantDetailsData = this.getSessionData('applicantDetailsData');
    const memberDetailsData = this.getSessionData('memberDetailsData');
    const siteDetailsData = this.getSessionData('siteDetailsData');
    const unitDetailsData = this.getSessionData('unitDetailsData');

    console.log('📄 Raw Session Data:');
    console.log('  selectLicenseData:', selectLicenseData);
    console.log('  keyInfoData:', keyInfoData);
    console.log('  applicantDetailsData:', applicantDetailsData);
    console.log('  memberDetailsData:', memberDetailsData);
    console.log('  siteDetailsData:', siteDetailsData);
    console.log('  unitDetailsData:', unitDetailsData);

    // ✅ Get master data for code lookups
    const districts = JSON.parse(sessionStorage.getItem('districts') || '[]');
    const subdivisions = JSON.parse(sessionStorage.getItem('subdivisions') || '[]');
    const policeStations = JSON.parse(sessionStorage.getItem('policeStations') || '[]');
    const roads = JSON.parse(sessionStorage.getItem('roads') || '[]');

    console.log('📊 Master Data:', {
      districts: districts.length,
      subdivisions: subdivisions.length,
      policeStations: policeStations.length,
      roads: roads.length
    });

    // ✅ 1. LICENSE TYPE - Send ID as INTEGER
    const selectedLicenseTypeId = Number(selectLicenseData?.licenseType || selectLicenseData?.license_type || 0);
    const isIndividualApplication = selectedLicenseTypeId === 1;

    if (selectLicenseData?.licenseType || selectLicenseData?.license_type) {
      const licenseTypeId = selectedLicenseTypeId;
      formData.append('license_type', String(licenseTypeId));
      console.log('✅ license_type ID:', licenseTypeId);
    }

    // ✅ 2. KEY INFO
    if (keyInfoData) {
      if (keyInfoData.license_category) {
        formData.append('license_category', String(keyInfoData.license_category));
        console.log('✅ license_category ID:', keyInfoData.license_category);
      }
      if (keyInfoData.license_sub_category) {
        formData.append('license_sub_category', String(keyInfoData.license_sub_category));
        console.log('✅ license_sub_category ID:', keyInfoData.license_sub_category);
      }
      if (keyInfoData.establishment_name) {
        formData.append('establishment_name', String(keyInfoData.establishment_name));
      }
      if (keyInfoData.site_type) {
        formData.append('site_type', String(keyInfoData.site_type));
      }
      if (keyInfoData.existing_site_license) {
        formData.append('existing_site_license', String(keyInfoData.existing_site_license));
      }

      const pachwai = keyInfoData.pachwai ?? keyInfoData.pachwai_flag ?? keyInfoData.pachwai_selected;
      if (typeof pachwai === 'boolean') {
        formData.append('pachwai', pachwai ? 'true' : 'false');
      }
      const draughtBeer = keyInfoData.draught_beer ?? keyInfoData.draughtBeer;
      if (typeof draughtBeer === 'boolean') {
        formData.append('draught_beer', draughtBeer ? 'true' : 'false');
      }
    }

    // ✅ 3. APPLICANT DETAILS
    if (applicantDetailsData) {
      if (applicantDetailsData.applicant_name) {
        formData.append('applicant_name', String(applicantDetailsData.applicant_name));
      }
      if (applicantDetailsData.father_husband_name) {
        formData.append('father_husband_name', String(applicantDetailsData.father_husband_name));
      }
      if (applicantDetailsData.dob) {
        formData.append('dob', this.formatDate(applicantDetailsData.dob));
      }
      if (applicantDetailsData.gender) {
        formData.append('gender', String(applicantDetailsData.gender));
      }
      if (applicantDetailsData.nationality) {
        formData.append('nationality', String(applicantDetailsData.nationality));
      }
      if (applicantDetailsData.residential_status) {
        formData.append('residential_status', String(applicantDetailsData.residential_status));
      }
      if (applicantDetailsData.present_address) {
        formData.append('present_address', String(applicantDetailsData.present_address));
      }
      if (applicantDetailsData.permanent_address) {
        formData.append('permanent_address', String(applicantDetailsData.permanent_address));
      }
      if (applicantDetailsData.pan) {
        formData.append('pan', String(applicantDetailsData.pan));
      }
      if (applicantDetailsData.email) {
        formData.append('email', String(applicantDetailsData.email));
      }
      if (applicantDetailsData.mobile_number) {
        formData.append('mobile_number', String(applicantDetailsData.mobile_number));
      }
      if (applicantDetailsData.mode_of_operation) {
        formData.append('mode_of_operation', String(applicantDetailsData.mode_of_operation));
      }
      if (isIndividualApplication && applicantDetailsData.coi_rc_ss) {
        formData.append('coi_rc_ss', String(applicantDetailsData.coi_rc_ss));
      }
      if (applicantDetailsData.has_sikkim_certificate) {
        const hasSikkimCertificate = isIndividualApplication ? applicantDetailsData.has_sikkim_certificate : 'No';
        formData.append('has_sikkim_certificate', String(hasSikkimCertificate));
      }
      if (applicantDetailsData.has_excise_license) {
        formData.append('has_excise_license', String(applicantDetailsData.has_excise_license));
      }
      if (applicantDetailsData.existing_license_category_id) {
        formData.append('existing_license_category_id', String(applicantDetailsData.existing_license_category_id));
      }
      if (applicantDetailsData.existing_license_no) {
        formData.append('existing_license_no', String(applicantDetailsData.existing_license_no));
      }
      if (applicantDetailsData.family_excise_license) {
        formData.append('family_excise_license', String(applicantDetailsData.family_excise_license));
      }
      if (applicantDetailsData.family_license_category_id) {
        formData.append('family_license_category_id', String(applicantDetailsData.family_license_category_id));
      }
      if (applicantDetailsData.family_license_no) {
        formData.append('family_license_no', String(applicantDetailsData.family_license_no));
      }
      if (applicantDetailsData.criminal_conviction) {
        formData.append('criminal_conviction', String(applicantDetailsData.criminal_conviction));
      }
      if (applicantDetailsData.marital_status) {
        formData.append('marital_status', String(applicantDetailsData.marital_status));
      }
    }

    // ✅ 4. SITE DETAILS - CRITICAL: Convert IDs to CODES
    // ✅ 3A. MEMBER DETAILS (conditional salesman / barman flow)
    if (memberDetailsData) {
      if (memberDetailsData.member_name) {
        formData.append('member_name', String(memberDetailsData.member_name));
      }
      if (memberDetailsData.member_mobile_number) {
        formData.append('member_mobile_number', String(memberDetailsData.member_mobile_number));
      }
      if (memberDetailsData.member_email) {
        formData.append('member_email', String(memberDetailsData.member_email));
      }
      if (memberDetailsData.aadhaar) {
        formData.append('aadhaar', String(memberDetailsData.aadhaar));
      }
      if (memberDetailsData.sikkim_subject !== null && memberDetailsData.sikkim_subject !== undefined) {
        formData.append('sikkim_subject', String(memberDetailsData.sikkim_subject));
      }
    }

    if (siteDetailsData) {
      // site_district - Send CODE as STRING
      if (siteDetailsData.district) {
        const districtId = siteDetailsData.district;
        const district = districts.find((d: any) => d.id === Number(districtId));
        if (district) {
          const code = String(district.districtCode || district.district_code);
          formData.append('site_district', code);
          console.log('✅ site_district CODE:', code);
        } else {
          console.error('❌ District not found for ID:', districtId);
        }
      }

      // site_subdivision - Send CODE as STRING
      if (siteDetailsData.subdivision) {
        const subdivisionId = siteDetailsData.subdivision;
        const subdivision = subdivisions.find((s: any) => s.id === Number(subdivisionId));
        if (subdivision) {
          const code = String(subdivision.subdivisionCode || subdivision.subdivision_code);
          formData.append('site_subdivision', code);
          console.log('✅ site_subdivision CODE:', code);
        } else {
          console.error('❌ Subdivision not found for ID:', subdivisionId);
        }
      }

      // police_station - Send CODE as STRING
      if (siteDetailsData.police_station) {
        const policeStationId = siteDetailsData.police_station;
        const policeStation = policeStations.find((p: any) => p.id === Number(policeStationId));
        if (policeStation) {
          const code = String(policeStation.policeStationCode || policeStation.police_station_code);
          formData.append('police_station', code);
          console.log('✅ police_station CODE:', code);
        } else {
          console.error('❌ Police station not found for ID:', policeStationId);
        }
      }

      // ✅ CRITICAL FIX: road_name is CharField, send the road NAME (string), not code
      if (siteDetailsData.road) {
        const roadId = siteDetailsData.road;
        const road = roads.find((r: any) => r.id === Number(roadId));
        if (road) {
          const roadName = String(road.roadName || road.road_name || road.name);
          formData.append('road_name', roadName);
          console.log('✅ road_name STRING:', roadName);
        } else {
          console.error('❌ Road not found for ID:', roadId);
        }
      }

      if (siteDetailsData.location_category) {
        formData.append('location_category', String(siteDetailsData.location_category_name || siteDetailsData.location_category));
      }
      // ✅ FIXED: Added missing location_subcategory
      if (siteDetailsData.location_subcategory) {
        formData.append('location_subcategory', String(siteDetailsData.location_subcategory));
      }
      // ✅ FIXED: Use location_name (display name saved by site-details component)
      if (siteDetailsData.location_name) {
        formData.append('location_name', String(siteDetailsData.location_name));
      }
      // ✅ FIXED: Use ward_name (display name saved by site-details component)
      if (siteDetailsData.ward_name) {
        formData.append('ward_name', String(siteDetailsData.ward_name));
      }
      if (siteDetailsData.address) {
        formData.append('business_address', String(siteDetailsData.address));
      }
      if (siteDetailsData.pin_code) {
        formData.append('pin_code', String(siteDetailsData.pin_code));
      }
      if (siteDetailsData.construction_type) {
        formData.append('construction_type', String(siteDetailsData.construction_type));
      }
      if (siteDetailsData.length) {
        formData.append('length', String(siteDetailsData.length));
      }
      if (siteDetailsData.breadth) {
        formData.append('breadth', String(siteDetailsData.breadth));
      }
      if (siteDetailsData.site_owned) {
        formData.append('site_owned', String(siteDetailsData.site_owned));
      }
      // ✅ CRITICAL: noc_obtained field
      if (siteDetailsData.noc_obtained !== null && siteDetailsData.noc_obtained !== undefined) {
        formData.append('noc_obtained', String(siteDetailsData.noc_obtained));
        console.log('✅ noc_obtained:', siteDetailsData.noc_obtained);
      } else if (siteDetailsData.site_owned === 'Yes') {
        // If site is owned, noc_obtained should be 'No'
        formData.append('noc_obtained', 'No');
        console.log('✅ noc_obtained (auto): No');
      }
      if (siteDetailsData.trade_license_covered) {
        formData.append('trade_license_covered', String(siteDetailsData.trade_license_covered));
      }
    }

    // ✅ 5. COMPANY DETAILS (optional)
    if (unitDetailsData && Object.keys(unitDetailsData).length > 0) {
      if (unitDetailsData.company_name) {
        formData.append('company_name', String(unitDetailsData.company_name));
      }
      if (unitDetailsData.company_address) {
        formData.append('company_address', String(unitDetailsData.company_address));
      }
      if (unitDetailsData.company_pan) {
        formData.append('company_pan', String(unitDetailsData.company_pan));
      }
      if (unitDetailsData.company_cin) {
        formData.append('company_cin', String(unitDetailsData.company_cin));
      }
      if (unitDetailsData.incorporation_date) {
        formData.append('incorporation_date', this.formatDate(unitDetailsData.incorporation_date));
      }
      if (unitDetailsData.company_phone_number) {
        formData.append('company_phone_number', String(unitDetailsData.company_phone_number));
      }
      if (unitDetailsData.company_email) {
        formData.append('company_email', String(unitDetailsData.company_email));
      }
    }

    // ✅ 6. DOCUMENTS
    const passPhoto = this.getPassPhoto();
    if (passPhoto) {
      formData.append('pass_photo', passPhoto, passPhoto.name);
      console.log('✅ pass_photo added:', passPhoto.name);
    } else {
      console.error('❌ CRITICAL: Missing pass_photo!');
    }

    const siteDocuments = this.getAllSiteDocuments();
    const supportedDocumentFields = new Set([
      'pan_card',
      'sikkim_certificate',
      'dob_proof',
      'parcha',
      'noc',
      'trade_license',
      'member_pass_photo',
      'member_aadhaar_card',
      'member_residential_certificate',
      'member_dob_proof'
    ]);
    siteDocuments.forEach((file: File, docName: string) => {
      if (!supportedDocumentFields.has(docName)) {
        return;
      }
      formData.append(docName, file, file.name);
      console.log(`✅ ${docName} added:`, file.name);
    });

    console.log('✅ NEW LICENSE FormData preparation complete');
    console.groupEnd();

    return formData;
  }

  submitNewLicenseApplication(formData: FormData): Observable<any> {
    return this.http.post(`${this.newLicenseUrl}/apply/`, formData);
  }

  createNewLicenseApplicationDraft(formData: FormData): Observable<any> {
    return this.http.post(`${this.newLicenseUrl}/apply/draft/`, formData);
  }

  forceSubmitNewLicenseApplication(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(String(applicationId || '').trim());
    return this.http.post(`${this.newLicenseUrl}/force-submit/${encodedId}/`, {});
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

  // Other methods remain the same...
  advanceApplication(applicationId: string, stageId: number, context?: any): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/advance/${stageId}/`, {
      context_data: context || {},
      remarks: context?.remarks || ''
    });
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

  getLicenseFee(): Observable<any> {
    return this.http.get(`${this.oldLicenseUrl}/license-fee/`);
  }

  getApplicationMovement(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/${encodedId}/movements/`);
  }

  getNextStages(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/${encodedId}/next-stages/`);
  }

  getSiteEnquiryReport(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.siteEnquiryUrl}/${encodedId}/site-enquiry/`);
  }

  revertSiteEnquiryReport(applicationId: string, remarks: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.siteEnquiryUrl}/${encodedId}/site-enquiry/revert/`, {
      remarks: remarks || ''
    });
  }

  submitSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(
      `${this.siteEnquiryUrl}/${encodedId}/site-enquiry/`,
      formData,
      { headers: new HttpHeaders({ Accept: 'application/json' }) }
    );
  }

  updateSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(
      `${this.siteEnquiryUrl}/${encodedId}/site-enquiry/`,
      formData,
      { headers: new HttpHeaders({ Accept: 'application/json' }) }
    );
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
    return this.http.post(`${this.workflowUrl}/${encodedId}/resolve-objections/`, formData, {
      responseType: 'text',
      headers: new HttpHeaders({ Accept: 'application/json' })
    }).pipe(
      map((text: any) => {
        const raw = String(text ?? '').trim();
        if (!raw) return {};
        if (raw.startsWith('<')) return { _raw: raw };
        try { return JSON.parse(raw); } catch { return { _raw: raw }; }
      })
    );
  }

  deleteApplication(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.delete(`${this.oldLicenseUrl}/${encodedId}/delete/`);
  }

  payLicenseFee(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.oldLicenseUrl}/${encodedId}/pay-license-fee/`, formData);
  }

  getNewLicenseNextStages(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/${encodedId}/next-stages/`);
  }

  advanceNewLicenseApplication(applicationId: string, stageId: number, context?: any): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/advance/${stageId}/`, {
      context_data: context || {},
      remarks: context?.remarks || ''
    });
  }

  raiseNewLicenseObjection(applicationId: string, objections: { field: string; remarks: string }[], generalRemarks?: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    const body: any = { objections };
    if (generalRemarks) body.remarks = generalRemarks;
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/raise-objection/`, body);
  }

  getNewLicenseApplicationById(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/detail/${encodedId}/`);
  }

  getNewFinalLicenseData(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/final-license/${encodedId}/`);
  }

  getOldFinalLicenseData(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/final-license/${encodedId}/`);
  }

  getNewFinalLicensePassportPhoto(applicationId: string): Observable<Blob> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/final-license/${encodedId}/passport-photo/`, { responseType: 'blob' });
  }

  getOldFinalLicensePassportPhoto(applicationId: string): Observable<Blob> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/final-license/${encodedId}/passport-photo/`, { responseType: 'blob' });
  }

  getNewFinalLicenseQrCode(applicationId: string): Observable<Blob> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/final-license/${encodedId}/qr-code/`, { responseType: 'blob' });
  }

  getOldFinalLicenseQrCode(applicationId: string): Observable<Blob> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.oldLicenseUrl}/final-license/${encodedId}/qr-code/`, { responseType: 'blob' });
  }

  getNewLicenseObjections(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/${encodedId}/objections/`);
  }

  getNewLicenseLicenseFee(): Observable<any> {
    return this.http.get(`${this.newLicenseUrl}/license-fee/`);
  }

  getNewLicenseApplicationMovement(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/${encodedId}/movements/`);
  }

  deleteNewLicenseApplication(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.delete(`${this.newLicenseUrl}/${encodedId}/delete/`);
  }

  printNewLicense(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/print/`, {});
  }

  resolveNewLicenseObjections(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    // Resolve objections is handled by the workflow API, not the transactional app endpoints.
    return this.http.post(`${this.workflowUrl}/${encodedId}/resolve-objections/`, formData, {
      responseType: 'text'
    }).pipe(
      map((text: any) => {
        const raw = String(text ?? '').trim();
        if (!raw) return {};
        if (raw.startsWith('<')) return { _raw: raw };
        try { return JSON.parse(raw); } catch { return { _raw: raw }; }
      })
    );
  }

  payNewLicenseFee(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/pay-license-fee/`, formData);
  }

  payNewLicenseSecurityFee(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(`${this.newLicenseUrl}/${encodedId}/pay-security-fee/`, {});
  }

  getNewLicenseDashboardCounts(): Observable<any> {
    return this.http.get(`${this.newLicenseUrl}/dashboard-counts/`);
  }

  getNewLicenseApplicationsByStatus(): Observable<any> {
    return this.http.get(`${this.newLicenseUrl}/list-by-status/`);
  }

  getNewLicenseSiteDetails(applicationId: string): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/${encodedId}/site-detail/`);
  }

  submitNewLicenseSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(
      `${this.siteEnquiryUrl}/${encodedId}/site-enquiry/`,
      formData,
      { headers: new HttpHeaders({ Accept: 'application/json' }) }
    );
  }

  updateNewLicenseSiteEnquiryData(applicationId: string, formData: FormData): Observable<any> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.post(
      `${this.siteEnquiryUrl}/${encodedId}/site-enquiry/`,
      formData,
      { headers: new HttpHeaders({ Accept: 'application/json' }) }
    );
  }

  searchNewLicenseApplications(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.newLicenseUrl}/search/`, { params });
  }

  downloadNewLicenseApplicationPDF(applicationId: string): Observable<Blob> {
    const encodedId = encodeURIComponent(applicationId);
    return this.http.get(`${this.newLicenseUrl}/${encodedId}/download-pdf/`, { responseType: 'blob' });
  }

  getNewLicenseApplicationStats(): Observable<any> {
    return this.http.get(`${this.newLicenseUrl}/statistics/`);
  }

  // ✅ RENEWAL METHODS
  
  /**
   * Renew an old license application (license-renewal type)
   */
  renewLicense(licenseId: string): Observable<any> {
    const encodedId = encodeURIComponent(licenseId);
    return this.http.post(`${this.oldLicenseUrl}/renew/${encodedId}/`, {});
  }

  /**
   * Renew a new license application (new-license type)
   */
  renewNewLicense(licenseId: string): Observable<any> {
    const encodedId = encodeURIComponent(licenseId);
    return this.http.post(`${this.newLicenseUrl}/renew/${encodedId}/`, {});
  }
}
