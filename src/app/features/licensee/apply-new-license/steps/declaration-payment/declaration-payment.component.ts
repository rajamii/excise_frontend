import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { FormDataBuilder } from '../../../../../shared/utils/form-data.util';

interface ApplicantDeclarationData {
  nationality?: string | null;
  mode_of_operation?: string | null;
  modeOfOperation?: string | null;
}

@Component({
  selector: 'app-declaration-payment',
  standalone: true,
  imports: [MaterialModule, RouterModule],
  templateUrl: './declaration-payment.component.html',
  styleUrls: ['./declaration-payment.component.scss']
})
export class DeclarationPaymentComponent implements OnInit, OnDestroy {
  @Output() back = new EventEmitter<void>();

  declarationForm: FormGroup;
  passPhotoUrl: string | null = null;
  private photoSub?: Subscription;
  applicationFee = 500;
  isSubmitting = false;
  applicationId: string | null = null;

  constructor(
    private licenseAppService: LicenseApplicationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this.declarationForm = this.fb.group({
      acceptDeclaration: new FormControl(false, [Validators.requiredTrue])
    });
  }

  ngOnInit(): void {
    this.photoSub = this.licenseAppService.getPassPhotoObservable().subscribe((file: File | null) => {
      if (this.passPhotoUrl) URL.revokeObjectURL(this.passPhotoUrl);
      this.passPhotoUrl = file ? URL.createObjectURL(file) : null;
      setTimeout(() => {
        this.passPhotoUrl = file ? URL.createObjectURL(file) : null;
        this.cdr.detectChanges();
      });
    });
  }

  ngOnDestroy(): void {
    if (this.passPhotoUrl) URL.revokeObjectURL(this.passPhotoUrl);
    this.photoSub?.unsubscribe();
  }

  readonly licenseApplicationLabels: Record<string, string> = {
    licensetype: 'License Type',
    license_type: 'License Type',
    licensecategory: 'License Category',
    license_category: 'License Category',
    licensesubcategory: 'License Sub Category',
    license_sub_category: 'License Sub Category',
    establishment_name: 'Establishment Name',
    establishmentname: 'Establishment Name',
    sitetype: 'Site Type',
    site_type: 'Site Type',
    existing_site_license: 'Old Site License No',
    first_name: 'First Name',
    middle_name: 'Middle Name',
    last_name: 'Last Name',
    applicant_name: 'Applicant Name',
    applicantname: 'Applicant Name',
    father_husband_name: 'Father/Husband Name',
    fatherhusbandname: 'Father/Husband Name',
    dob: 'Date of Birth',
    nationality: 'Nationality',
    coi_rc_ss: 'Certificate Type',
    gender: 'Gender',
    pan: 'PAN',
    applicant_mobile_number: 'Mobile Number',
    mobile_number: 'Mobile Number',
    mobilenumber: 'Mobile Number',
    email: 'Email Id',
    marital_status: 'Marital Status',
    maritalstatus: 'Marital Status',
    status: 'Marital Status',
    residential_status: 'Residential Status',
    residentialstatus: 'Residential Status',
    present_address: 'Present Address',
    presentaddress: 'Present Address',
    permanent_address: 'Permanent Address',
    permanentaddress: 'Permanent Address',
    mode_of_operation: 'Mode of Operation',
    modeofoperation: 'Mode of Operation',
    has_sikkim_certificate: 'Has Sikkim Certificate',
    hassikkimcertificate: 'Has Sikkim Certificate',
    has_excise_license: 'Has Excise License',
    hasexciselicense: 'Has Excise License',
    existing_license_category_id: 'Existing License Category',
    existing_license_no: 'Existing License Number',
    family_excise_license: 'Family Excise License',
    familyexciselicense: 'Family Excise License',
    family_license_category_id: 'Family License Category',
    family_license_no: 'Family License Number',
    criminal_conviction: 'Criminal Conviction',
    criminalconviction: 'Criminal Conviction',
    member_name: 'Member Name',
    member_mobile_number: 'Member Mobile Number',
    member_email: 'Member Email Id',
    aadhaar: 'Aadhaar No.',
    sikkim_subject: 'Member Holds COI / RC / SS',
    sitedistrict: 'Site District',
    site_district: 'Site District',
    district: 'District',
    sitesubdivision: 'Site Sub Division',
    site_subdivision: 'Site Sub Division',
    subdivision: 'Subdivision',
    policestation: 'Police Station',
    police_station: 'Police Station',
    locationcategory: 'Location Category',
    location_category: 'Location Category',
    locationname: 'Location Name',
    location_name: 'Location Name',
    wardname: 'Ward Name',
    ward_name: 'Ward Name',
    businessaddress: 'Business Address',
    business_address: 'Business Address',
    address: 'Business Address',
    roadname: 'Road Name',
    road_name: 'Road Name',
    road: 'Road',
    pincode: 'PIN Code',
    pin_code: 'PIN Code',
    latitude: 'Latitude',
    longitude: 'Longitude',
    constructiontype: 'Construction Type',
    construction_type: 'Construction Type',
    length: 'Length (sq. ft)',
    breadth: 'Breadth (sq. ft)',
    siteowned: 'Site Owned by Applicant',
    site_owned: 'Site Owned by Applicant',
    nocobtained: 'NOC Obtained',
    noc_obtained: 'NOC Obtained',
    parcha: 'Parcha Document',
    tradelicensecovered: 'Trade License Covered',
    trade_license_covered: 'Trade License Covered',
    trade_license: 'Trade License Document',
    company_name: 'Company Name',
    companyname: 'Company Name',
    company_address: 'Company Address',
    companyaddress: 'Company Address',
    company_pan: 'Company PAN',
    companypan: 'Company PAN',
    company_cin: 'Company CIN',
    companycin: 'Company CIN',
    incorporationdate: 'Incorporation Date',
    incorporation_date: 'Incorporation Date',
    company_phone_number: 'Company Phone Number',
    companyphonenumber: 'Company Phone Number',
    company_email: 'Company Email Id',
    companyemail: 'Company Email Id',
    workflow: 'Workflow'
  };

  get licenseType() {
    const data = this.getParsedSession<any>('selectLicenseData');
    return data?.license_type || data?.licenseType;
  }

  get selectedLicenseTypeName(): string {
    const selectedLicenseTypeId = Number(this.licenseType);
    const storedLicenseTypes = this.getParsedSession<Array<{ id?: number; licenseType?: string }>>('licenseTypes') ?? [];
    const matchedType = storedLicenseTypes.find((licenseType) => Number(licenseType.id) === selectedLicenseTypeId);

    return String(matchedType?.licenseType ?? '');
  }

  get isCompanyType(): boolean {
    return this.selectedLicenseTypeName.toLowerCase() === 'company' || Number(this.licenseType) === 2;
  }

  get isIndividualType(): boolean {
    return this.selectedLicenseTypeName.toLowerCase() === 'individual' || Number(this.licenseType) === 1;
  }

  get requiresNationalityDocument(): boolean {
    const applicantData = this.getParsedSession<ApplicantDeclarationData>('applicantDetailsData');
    const nationality = String(applicantData?.nationality ?? '').trim();

    return this.isIndividualType || (this.isCompanyType && nationality === 'Indian');
  }

  get shouldShowMemberDetails(): boolean {
    const applicantData = this.getParsedSession<ApplicantDeclarationData>('applicantDetailsData');
    const modeOfOperation = String(applicantData?.mode_of_operation ?? applicantData?.modeOfOperation ?? '').trim();

    return modeOfOperation === 'Salesman' || modeOfOperation === 'Barman';
  }

  get selectLicenseData() {
    return this.getDataForView('selectLicenseData');
  }

  get keyInfoData() {
    return this.getDataForView('keyInfoData');
  }

  get applicantDetailsData() {
    return this.getDataForView('applicantDetailsData');
  }

  get siteDetailsData() {
    return this.getDataForView('siteDetailsData');
  }

  get memberDetailsData() {
    return this.getDataForView('memberDetailsData');
  }

  get unitDetailsData() {
    return this.getDataForView('unitDetailsData');
  }

  get displaySections() {
    return [
      { title: 'Application Type', data: this.selectLicenseData },
      { title: 'Basic Information', data: this.keyInfoData },
      { title: 'Applicant Details', data: this.applicantDetailsData },
      { title: 'Site Details', data: this.siteDetailsData },
      {
        title: 'Company Details',
        data: this.unitDetailsData,
        condition: () => this.isCompanyType
      }
    ];
  }

  private getParsedSession<T = any>(key: string): T | null {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) as T : null;
    } catch (e) {
      console.error(`❌ Failed to parse session key ${key}:`, e);
      return null;
    }
  }

  private getSafeLabel(key: string): string {
    return this.licenseApplicationLabels[key] || FormDataBuilder.toTitleCase(key);
  }

  private getDataForView(key: string): { key: string; value: any }[] {
    const data = this.getParsedSession<Record<string, any>>(key);
    if (!data) return [];

    const processedFields = new Set<string>();

    return Object.entries(data)
      .filter(([k]) => {
        // Skip code fields and Name suffixed fields (which contain display names)
        if (k.endsWith('_code') || k.endsWith('code') || k.endsWith('Name')) return false;

        const normalized = k.toLowerCase().replace(/_/g, '');
        if (processedFields.has(normalized)) return false;
        processedFields.add(normalized);

        return true;
      })
      .map(([k, v]) => {
        const label = this.getSafeLabel(k);
        const displayValue = this.getDisplayValue(k, v, data);

        return { key: label, value: displayValue };
      })
      .filter(item => item.value !== null && item.value !== undefined && item.value !== '');
  }

  /**
   * ✅ FIXED: Get display value - checks for Name field first, then looks up in master data
   */
  private getDisplayValue(field: string, value: any, allData: Record<string, any>): string {
    if (!value && value !== 0) return '';

    const normalized = field.toLowerCase().replace(/_/g, '');

    console.log(`🔍 getDisplayValue called for field: ${field}, normalized: ${normalized}, value:`, value);

    // ✅ PRIORITY 1: Check if there's a corresponding Name field in the data
    // This handles cases like license_type + license_typeName
    const possibleNameFields = [
      `${field}Name`,           // exact match with Name suffix
      `${field}_name`,          // snake_case with _name
      field.replace(/_/g, '') + 'Name'  // no underscore + Name
    ];

    if (field.endsWith('_id')) {
      possibleNameFields.push(field.replace(/_id$/, '_name'));
    }

    for (const nameField of possibleNameFields) {
      if (allData[nameField]) {
        console.log(`✅ Found name field ${nameField} for ${field}:`, allData[nameField]);
        return allData[nameField];
      }
    }

    // ✅ PRIORITY 2: Look up in master data if it's an ID field
    try {
      let masterData: any[] = [];
      let masterKey = '';
      let displayField = '';

      // Determine which master data to use based on normalized field name
      if (normalized === 'licensetype') {
        masterKey = 'licenseTypes';
        displayField = 'licenseType';
      } else if (normalized === 'licensecategory') {
        masterKey = 'licenseCategories';
        displayField = 'licenseCategory';
      } else if (normalized === 'licensesubcategory') {
        masterKey = 'licenseSubcategories';
        displayField = 'licenseSubcategory';
      } else if (normalized === 'sitedistrict' || normalized === 'district') {
        masterKey = 'districts';
        displayField = 'district';
      } else if (normalized === 'sitesubdivision' || normalized === 'subdivision') {
        masterKey = 'subdivisions';
        displayField = 'subdivision';
      } else if (normalized === 'policestation') {
        masterKey = 'policeStations';
        displayField = 'policeStation';
      } else if (normalized === 'road' || normalized === 'roadname') {
        masterKey = 'roads';
        displayField = 'roadName';
      } else if (normalized === 'locationcategory') {
        masterKey = 'locationCategories';
        displayField = 'locationCategory';
      } else if (normalized === 'sitetype') {
        masterKey = 'siteTypes';
        displayField = 'siteType';
      } else if (normalized === 'constructiontype') {
        masterKey = 'constructionTypes';
        displayField = 'constructionType';
      }

      // If we identified a master data source, look it up
      if (masterKey) {
        const rawData = sessionStorage.getItem(masterKey);
        console.log(`🔍 Looking up ${masterKey} in sessionStorage:`, rawData ? 'Found' : 'Not found');
        
        if (rawData) {
          masterData = JSON.parse(rawData);
          console.log(`📊 ${masterKey} contains ${masterData.length} items`);
          
          // Try matching by id (as number or string)
          let item = masterData.find(d => d.id === Number(value) || d.id === value);
          
          if (item) {
            // Try multiple possible field names
            const name = item[displayField] || item.name || item.title;
            if (name) {
              console.log(`✅ Found ${displayField} in ${masterKey}:`, name);
              return name;
            }
          } else {
            console.warn(`⚠️ No item found in ${masterKey} with id: ${value}`);
            console.log('Available items:', masterData.slice(0, 3));
          }
        } else {
          console.warn(`⚠️ ${masterKey} not found in sessionStorage`);
        }
      }

      // ✅ PRIORITY 3: Return the original value if no lookup found
      console.log(`ℹ️ Returning original value for ${field}:`, value);
      return value.toString();

    } catch (e) {
      console.error(`❌ Failed to get display value for ${field}:`, e);
      return value.toString();
    }
  }

  goBack() {
    this.back.emit();
  }

  goToDashboard(): void {
    this.clearApplicationData();
    this.router.navigate(['/dashboard']);
  }

  private debugSessionStorage(): void {
    console.group('🔍 DEBUG: SessionStorage Contents Before Submission (NEW LICENSE)');

    const keys = [
      'selectLicenseData',
      'keyInfoData',
      'applicantDetailsData',
      'memberDetailsData',
      'siteDetailsData',
      'unitDetailsData'
    ];

    keys.forEach(key => {
      const data = sessionStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.group(`📄 ${key}`);
          console.table(parsed);
          console.groupEnd();
        } catch (e) {
          console.error(`❌ Failed to parse ${key}:`, e);
        }
      } else {
        console.warn(`⚠️ ${key} is empty`);
      }
    });

    const photoFile = this.licenseAppService.getPassPhoto();
    console.log('📷 Pass Photo file:', photoFile ? `${photoFile.name} (${photoFile.size} bytes)` : 'MISSING');

    const siteDocuments = this.licenseAppService.getAllSiteDocuments();
    console.log('📁 Site Documents:', siteDocuments.size, 'files');
    siteDocuments.forEach((file: File, name: string) => {
      console.log(`  - ${name}: ${file.name} (${file.size} bytes)`);
    });

    console.groupEnd();
  }

  private validateRequiredData(): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    console.group('🔍 VALIDATING REQUIRED DATA');

    const selectData = this.getParsedSession('selectLicenseData');
    console.log('📋 Select License Data:', selectData);
    if (!selectData?.licenseType && !selectData?.license_type) {
      console.error('❌ Missing: License Type');
      missingFields.push('License Type');
    } else {
      console.log('✅ License Type OK');
    }

    const keyData = this.getParsedSession('keyInfoData');
    console.log('📋 Key Info Data:', keyData);
    
    if (!keyData?.license_category) {
      console.error('❌ Missing: License Category');
      missingFields.push('License Category');
    } else {
      console.log('✅ License Category OK:', keyData.license_category);
    }
    
    if (!keyData?.license_sub_category) {
      console.error('❌ Missing: License Sub Category');
      missingFields.push('License Sub Category');
    } else {
      console.log('✅ License Sub Category OK:', keyData.license_sub_category);
    }
    
    if (!keyData?.establishment_name) {
      console.error('❌ Missing: Establishment Name');
      missingFields.push('Establishment Name');
    } else {
      console.log('✅ Establishment Name OK');
    }
    
    if (!keyData?.site_type) {
      console.error('❌ Missing: Site Type');
      missingFields.push('Site Type');
    } else {
      console.log('✅ Site Type OK');
    }

    if (keyData?.site_type === 'Existing' && !keyData?.existing_site_license) {
      missingFields.push('Old Site License No');
    }

    const applicantData = this.getParsedSession('applicantDetailsData');
    console.log('📋 Applicant Data:', applicantData);
    
    if (!applicantData?.applicant_name) {
      console.error('❌ Missing: Applicant Name');
      missingFields.push('Applicant Name');
    } else {
      console.log('✅ Applicant Name OK');
    }
    
    if (!applicantData?.father_husband_name) {
      console.error('❌ Missing: Father/Husband Name');
      missingFields.push('Father/Husband Name');
    } else {
      console.log('✅ Father/Husband Name OK');
    }
    
    if (!applicantData?.dob) {
      console.error('❌ Missing: Date of Birth');
      missingFields.push('Date of Birth');
    } else {
      console.log('✅ DOB OK');
    }
    
    if (!applicantData?.gender) {
      console.error('❌ Missing: Gender');
      missingFields.push('Gender');
    } else {
      console.log('✅ Gender OK');
    }
    
    if (!applicantData?.email) {
      console.error('❌ Missing: Email');
      missingFields.push('Email');
    } else {
      console.log('✅ Email OK');
    }
    
    if (!applicantData?.mobile_number) {
      console.error('❌ Missing: Mobile Number');
      missingFields.push('Mobile Number');
    } else {
      console.log('✅ Mobile Number OK');
    }

    if (this.requiresNationalityDocument && !applicantData?.coi_rc_ss) {
      missingFields.push('Certificate Type');
    }

    if (applicantData?.has_excise_license === 'Yes') {
      if (!applicantData?.existing_license_category_id) {
        missingFields.push('Existing License Category');
      }
      if (!applicantData?.existing_license_no) {
        missingFields.push('Existing License Number');
      }
    }

    if (applicantData?.family_excise_license === 'Yes') {
      if (!applicantData?.family_license_category_id) {
        missingFields.push('Family License Category');
      }
      if (!applicantData?.family_license_no) {
        missingFields.push('Family License Number');
      }
    }

    const memberData = this.getParsedSession('memberDetailsData');
    if (this.shouldShowMemberDetails) {
      if (!memberData?.member_name) {
        missingFields.push('Member Name');
      }
      if (!memberData?.father_husband_name) {
        missingFields.push('Member Father/Husband Name');
      }
      if (!memberData?.gender) {
        missingFields.push('Member Gender');
      }
      if (!memberData?.dob) {
        missingFields.push('Member Date of Birth');
      }
      if (!memberData?.pan) {
        missingFields.push('Member PAN');
      }
      if (!memberData?.member_mobile_number) {
        missingFields.push('Member Mobile Number');
      }
    }

    const siteData = this.getParsedSession('siteDetailsData');
    console.log('📋 Site Details Data:', siteData);
    
    if (!siteData?.district) {
      console.error('❌ Missing: Site District');
      missingFields.push('Site District');
    } else {
      console.log('✅ Site District OK:', siteData.district);
    }
    
    if (!siteData?.subdivision) {
      console.error('❌ Missing: Site Subdivision');
      missingFields.push('Site Subdivision');
    } else {
      console.log('✅ Site Subdivision OK:', siteData.subdivision);
    }
    
    if (!siteData?.police_station) {
      console.error('❌ Missing: Police Station');
      missingFields.push('Police Station');
    } else {
      console.log('✅ Police Station OK:', siteData.police_station);
    }
    
    if (!siteData?.road) {
      console.error('❌ Missing: Road Name');
      missingFields.push('Road Name');
    } else {
      console.log('✅ Road OK:', siteData.road);
    }
    
    if (!siteData?.location_category) {
      console.error('❌ Missing: Location Category');
      missingFields.push('Location Category');
    } else {
      console.log('✅ Location Category OK');
    }
    
    if (!siteData?.location) {
      console.error('❌ Missing: Location Name');
      missingFields.push('Location Name');
    } else {
      console.log('✅ Location Name OK');
    }
    
    if (!siteData?.ward) {
      console.error('❌ Missing: Ward Name');
      missingFields.push('Ward Name');
    } else {
      console.log('✅ Ward Name OK');
    }
    
    if (!siteData?.address) {
      console.error('❌ Missing: Business Address');
      missingFields.push('Business Address');
    } else {
      console.log('✅ Business Address OK');
    }
    
    if (!siteData?.pin_code) {
      console.error('❌ Missing: PIN Code');
      missingFields.push('PIN Code');
    } else {
      console.log('✅ PIN Code OK');
    }
    
    if (!siteData?.construction_type) {
      console.error('❌ Missing: Construction Type');
      missingFields.push('Construction Type');
    } else {
      console.log('✅ Construction Type OK');
    }
    
    if (!siteData?.site_owned) {
      console.error('❌ Missing: Site Ownership');
      missingFields.push('Site Ownership');
    } else {
      console.log('✅ Site Ownership OK');
    }
    
    if (!siteData?.trade_license_covered) {
      console.error('❌ Missing: Trade License Covered');
      missingFields.push('Trade License Covered');
    } else {
      console.log('✅ Trade License Covered OK');
    }

    const passPhoto = this.licenseAppService.getPassPhoto();
    if (!passPhoto) {
      console.error('❌ Missing: Passport Photo');
      missingFields.push('Passport Photo');
    } else {
      console.log('✅ Passport Photo OK:', passPhoto.name);
    }

    const docs = this.licenseAppService.getAllSiteDocuments();
    console.log('📋 Documents:', Array.from(docs.keys()));
    
    if (!docs.get('pan_card')) {
      console.error('❌ Missing: PAN Card');
      missingFields.push('PAN Card');
    } else {
      console.log('✅ PAN Card OK');
    }
    
    if (this.requiresNationalityDocument && !docs.get('sikkim_certificate')) {
      console.error('❌ Missing: Sikkim Certificate');
      missingFields.push('COI / RC / SS Document');
    } else {
      console.log('✅ Sikkim Certificate OK');
    }
    
    if (!docs.get('dob_proof')) {
      console.error('❌ Missing: Date of Birth Proof');
      missingFields.push('Date of Birth Proof');
    } else {
      console.log('✅ DOB Proof OK');
    }

    console.log('🔍 Validation Result:', { valid: missingFields.length === 0, missingFields });
    if (siteData?.site_owned === 'Yes' && !docs.get('parcha')) {
      missingFields.push('Parcha');
    }

    if (siteData?.trade_license_covered === 'Yes' && !docs.get('trade_license')) {
      missingFields.push('Trade License');
    }

    if (this.shouldShowMemberDetails) {
      if (!docs.get('member_pass_photo')) {
        missingFields.push('Member Passport Size Photo');
      }
      if (!docs.get('member_aadhaar_card')) {
        missingFields.push('Member Aadhaar Card');
      }
      if (!docs.get('member_residential_certificate')) {
        missingFields.push('Member COI / RC / SS Document');
      }
      if (!docs.get('member_dob_proof')) {
        missingFields.push('Member Date of Birth Proof');
      }
    }

    console.log('Validation result (final):', { valid: missingFields.length === 0, missingFields });
    console.groupEnd();

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  submit(): void {
    console.log('🔵 Submit button clicked!');
    console.log('isSubmitting:', this.isSubmitting);
    console.log('Declaration form valid:', this.declarationForm.valid);

    if (!this.declarationForm.valid) {
      Swal.fire('Warning', 'Please accept the declaration to proceed.', 'warning');
      return;
    }

    if (this.isSubmitting) {
      console.log('⚠️ Already submitting, ignoring click');
      return;
    }

    const validation = this.validateRequiredData();
    if (!validation.valid) {
      Swal.fire({
        title: 'Incomplete Data',
        html: `<div style="text-align: left;">
          <p>The following required fields are missing:</p>
          <ul style="color: #d32f2f;">
            ${validation.missingFields.map(f => `<li>${f}</li>`).join('')}
          </ul>
          <p style="margin-top: 12px; font-size: 14px;">Please go back and complete all required fields.</p>
        </div>`,
        icon: 'error'
      });
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to submit this application?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
    }).then((confirm) => {
      if (!confirm.isConfirmed) {
        console.log('❌ User cancelled submission');
        return;
      }

      console.log('✅ User confirmed, proceeding with submission');
      this.isSubmitting = true;

      try {
        this.debugSessionStorage();

        const formData = this.licenseAppService.prepareNewLicenseFormData();

        console.group("📦 FINAL FORMDATA SENT TO BACKEND (NEW LICENSE)");
        FormDataBuilder.logFormData(formData, 'New License Application');
        console.groupEnd();

        this.licenseAppService.submitNewLicenseApplication(formData).subscribe({
          next: (response: any) => {
            console.log('✅ New License Application submitted successfully:', response);

            this.applicationId = response.application_id || response.applicationId || 'NLA/XXX/XXXX-XX/XXXX';

            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: `Application ID: ${this.applicationId}`,
              confirmButtonText: 'OK'
            });

            this.isSubmitting = false;
          },
          error: (err: any) => {
            console.error('❌ New License submission failed:', err);
            console.log('Full error object:', err);

            const errorMessage = this.formatErrorMessage(err);

            Swal.fire({
              title: 'Submission Failed',
              html: errorMessage,
              icon: 'error',
              confirmButtonText: 'OK',
              allowOutsideClick: false,
              width: 600
            });

            this.isSubmitting = false;
          }
        });

      } catch (error) {
        console.error('❌ Unexpected error during submission:', error);
        this.isSubmitting = false;
        Swal.fire({
          title: 'Error',
          text: 'An unexpected error occurred. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  private clearApplicationData(): void {
    const sections = [
      'selectLicenseData',
      'keyInfoData',
      'applicantDetailsData',
      'memberDetailsData',
      'siteDetailsData',
      'unitDetailsData'
    ];

    sections.forEach(section => {
      sessionStorage.removeItem(section);
    });

    this.licenseAppService.clearAllDocuments();

    console.log('✅ Application data cleared successfully');
  }

  private formatErrorMessage(err: any): string {
    if (!err) return 'An unknown error occurred.';

    if (err?.error && typeof err.error === 'object') {
      const errors = err.error;
      const errorMessages: string[] = [];

      Object.entries(errors).forEach(([field, messages]) => {
        const fieldLabel = this.getSafeLabel(field);

        if (Array.isArray(messages)) {
          errorMessages.push(`<strong>${fieldLabel}:</strong> ${messages.join(', ')}`);
        } else {
          errorMessages.push(`<strong>${fieldLabel}:</strong> ${messages}`);
        }
      });

      if (errorMessages.length > 0) {
        return `
          <div style="text-align: left; max-height: 400px; overflow-y: auto;">
            <p>Please fix the following errors:</p>
            <ul style="color: #d32f2f;">
              ${errorMessages.map(msg => `<li>${msg}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }

    const message = err?.error?.message || err?.message || err?.statusText;
    const status = err?.status ? ` (Status: ${err.status})` : '';
    if (message) return `${message}${status}`;

    try {
      return `<pre style="text-align: left; font-size: 12px;">${JSON.stringify(err, null, 2)}</pre>`;
    } catch {
      return 'An unexpected error occurred.';
    }
  }
}
