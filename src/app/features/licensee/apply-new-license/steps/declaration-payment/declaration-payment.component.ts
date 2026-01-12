import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { FormDataBuilder } from '../../../../../shared/utils/form-data.util';

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

  // Field labels for display
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
    first_name: 'First Name',
    middle_name: 'Middle Name',
    last_name: 'Last Name',
    applicant_name: 'Applicant Name',
    applicantname: 'Applicant Name',
    father_husband_name: 'Father/Husband Name',
    fatherhusbandname: 'Father/Husband Name',
    dob: 'Date of Birth',
    nationality: 'Nationality',
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
    family_excise_license: 'Family Excise License',
    familyexciselicense: 'Family Excise License',
    criminal_conviction: 'Criminal Conviction',
    criminalconviction: 'Criminal Conviction',
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
    tradelicensecovered: 'Trade License Covered',
    trade_license_covered: 'Trade License Covered',
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
        condition: () => Number(this.licenseType) === 2
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
        if (k.endsWith('_code') || k.endsWith('code') || k.endsWith('Name')) return false;

        const normalized = k.toLowerCase().replace(/_/g, '');
        if (processedFields.has(normalized)) return false;
        processedFields.add(normalized);

        return true;
      })
      .map(([k, v]) => {
        const label = this.getSafeLabel(k);
        const displayValue = this.getDisplayName(k, v);

        return { key: label, value: displayValue };
      })
      .filter(item => item.value !== null && item.value !== undefined && item.value !== '');
  }

  private getDisplayName(field: string, value: any): string {
    if (!value) return '';

    const normalized = field.toLowerCase().replace(/_/g, '');

    try {
      let masterData: any[] = [];

      if (normalized === 'licensetype') {
        masterData = JSON.parse(sessionStorage.getItem('licenseTypes') || '[]');
        const licenseType = masterData.find(d => d.id === Number(value));
        return licenseType?.licenseType || value.toString();
      }

      if (normalized === 'licensecategory') {
        masterData = JSON.parse(sessionStorage.getItem('licenseCategories') || '[]');
        const category = masterData.find(d => d.id === Number(value));
        return category?.licenseCategory || value.toString();
      }

      if (normalized === 'licensesubcategory') {
        masterData = JSON.parse(sessionStorage.getItem('licenseSubcategories') || '[]');
        const subCategory = masterData.find(d => d.id === Number(value));
        return subCategory?.licenseSubcategory || subCategory?.name || value.toString();
      }

      if (normalized === 'sitedistrict' || normalized === 'district') {
        masterData = JSON.parse(sessionStorage.getItem('districts') || '[]');
        const district = masterData.find(d => d.id === Number(value));
        return district?.district || value.toString();
      }

      if (normalized === 'sitesubdivision' || normalized === 'subdivision') {
        masterData = JSON.parse(sessionStorage.getItem('subdivisions') || '[]');
        const subdivision = masterData.find(d => d.id === Number(value));
        return subdivision?.subdivision || value.toString();
      }

      if (normalized === 'policestation') {
        masterData = JSON.parse(sessionStorage.getItem('policeStations') || '[]');
        const station = masterData.find(d => d.id === Number(value));
        return station?.policeStation || value.toString();
      }

      if (normalized === 'road' || normalized === 'roadname') {
        masterData = JSON.parse(sessionStorage.getItem('roads') || '[]');
        const road = masterData.find(d => d.id === Number(value));
        return road?.roadName || value.toString();
      }

      return value.toString();

    } catch (e) {
      console.error(`Failed to get display name for ${field}:`, e);
      return value.toString();
    }
  }

  goBack() {
    this.back.emit();
  }

  private debugSessionStorage(): void {
    console.group('🔍 DEBUG: SessionStorage Contents Before Submission (NEW LICENSE)');

    const keys = [
      'selectLicenseData',
      'keyInfoData',
      'applicantDetailsData',
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

  /**
   * ✅ CRITICAL FIX: Match validation field names with what's actually saved in sessionStorage
   */
  private validateRequiredData(): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    console.group('🔍 VALIDATING REQUIRED DATA');

    // Check license type
    const selectData = this.getParsedSession('selectLicenseData');
    console.log('📋 Select License Data:', selectData);
    if (!selectData?.licenseType && !selectData?.license_type) {
      console.error('❌ Missing: License Type');
      missingFields.push('License Type');
    }

    // Check key info
    const keyData = this.getParsedSession('keyInfoData');
    console.log('📋 Key Info Data:', keyData);
    if (!keyData?.license_category) {
      console.error('❌ Missing: License Category');
      missingFields.push('License Category');
    }
    if (!keyData?.license_sub_category) {
      console.error('❌ Missing: License Sub Category');
      missingFields.push('License Sub Category');
    }
    if (!keyData?.establishment_name) {
      console.error('❌ Missing: Establishment Name');
      missingFields.push('Establishment Name');
    }
    if (!keyData?.site_type) {
      console.error('❌ Missing: Site Type');
      missingFields.push('Site Type');
    }

    // Check applicant details
    const applicantData = this.getParsedSession('applicantDetailsData');
    console.log('📋 Applicant Data:', applicantData);
    if (!applicantData?.applicant_name) {
      console.error('❌ Missing: Applicant Name');
      missingFields.push('Applicant Name');
    }
    if (!applicantData?.father_husband_name) {
      console.error('❌ Missing: Father/Husband Name');
      missingFields.push('Father/Husband Name');
    }
    if (!applicantData?.dob) {
      console.error('❌ Missing: Date of Birth');
      missingFields.push('Date of Birth');
    }
    if (!applicantData?.gender) {
      console.error('❌ Missing: Gender');
      missingFields.push('Gender');
    }
    if (!applicantData?.email) {
      console.error('❌ Missing: Email');
      missingFields.push('Email');
    }
    if (!applicantData?.mobile_number) {
      console.error('❌ Missing: Mobile Number');
      missingFields.push('Mobile Number');
    }

    // ✅ CRITICAL FIX: Check exact field names saved in sessionStorage
    const siteData = this.getParsedSession('siteDetailsData');
    console.log('📋 Site Details Data:', siteData);
    
    // District - saved as 'district'
    if (!siteData?.district) {
      console.error('❌ Missing: Site District');
      missingFields.push('Site District');
    } else {
      console.log('✅ Site District OK:', siteData.district);
    }
    
    // Subdivision - saved as 'subdivision'
    if (!siteData?.subdivision) {
      console.error('❌ Missing: Site Subdivision');
      missingFields.push('Site Subdivision');
    } else {
      console.log('✅ Site Subdivision OK:', siteData.subdivision);
    }
    
    // Police Station - saved as 'police_station'
    if (!siteData?.police_station) {
      console.error('❌ Missing: Police Station');
      missingFields.push('Police Station');
    } else {
      console.log('✅ Police Station OK:', siteData.police_station);
    }
    
    // Road - saved as 'road'
    if (!siteData?.road) {
      console.error('❌ Missing: Road Name');
      missingFields.push('Road Name');
    } else {
      console.log('✅ Road OK:', siteData.road);
    }
    
    if (!siteData?.location_category) {
      console.error('❌ Missing: Location Category');
      missingFields.push('Location Category');
    }
    if (!siteData?.location_name) {
      console.error('❌ Missing: Location Name');
      missingFields.push('Location Name');
    }
    if (!siteData?.ward_name) {
      console.error('❌ Missing: Ward Name');
      missingFields.push('Ward Name');
    }
    
    // Business Address - saved as 'address'
    if (!siteData?.address) {
      console.error('❌ Missing: Business Address');
      missingFields.push('Business Address');
    }
    
    if (!siteData?.pin_code) {
      console.error('❌ Missing: PIN Code');
      missingFields.push('PIN Code');
    }
    
    if (!siteData?.construction_type) {
      console.error('❌ Missing: Construction Type');
      missingFields.push('Construction Type');
    }
    
    if (!siteData?.site_owned) {
      console.error('❌ Missing: Site Ownership');
      missingFields.push('Site Ownership');
    }
    
    if (!siteData?.trade_license_covered) {
      console.error('❌ Missing: Trade License Covered');
      missingFields.push('Trade License Covered');
    }

    // Check documents
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
    }
    if (!docs.get('sikkim_certificate')) {
      console.error('❌ Missing: Sikkim Certificate');
      missingFields.push('Sikkim Certificate');
    }
    if (!docs.get('dob_proof')) {
      console.error('❌ Missing: Date of Birth Proof');
      missingFields.push('Date of Birth Proof');
    }

    console.log('🔍 Validation Result:', { valid: missingFields.length === 0, missingFields });
    console.groupEnd();

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  async submit(): Promise<void> {
    if (!this.declarationForm.valid) {
      Swal.fire('Warning', 'Please accept the declaration to proceed.', 'warning');
      return;
    }

    if (this.isSubmitting) {
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

    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to submit this application?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
    });

    if (!confirm.isConfirmed) return;

    this.isSubmitting = true;

    Swal.fire({
      title: 'Submitting Application...',
      html: 'Please wait while we process your application.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      this.debugSessionStorage();

      const formData = this.licenseAppService.prepareNewLicenseFormData();

      console.group("📦 FINAL FORMDATA SENT TO BACKEND (NEW LICENSE)");
      FormDataBuilder.logFormData(formData, 'New License Application');
      console.groupEnd();

      this.licenseAppService.submitNewLicenseApplication(formData).subscribe({
        next: (response: any) => {
          console.log('✅ New License Application submitted successfully:', response);

          Swal.fire({
            title: 'Success!',
            html: `
              <div style="text-align: center;">
                <p>Your application has been submitted successfully!</p>
                <p><strong>Application ID:</strong> ${response.application_id || response.applicationId || 'Pending'}</p>
                <p style="font-size: 14px; color: #666; margin-top: 12px;">
                  You will receive a confirmation email shortly.
                </p>
              </div>
            `,
            icon: 'success',
            confirmButtonText: 'Go to Dashboard',
            allowOutsideClick: false
          }).then(() => {
            this.clearApplicationData();
            this.router.navigate(['/licensee/dashboard']);
          });
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
        },
        complete: () => {
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
  }

  private clearApplicationData(): void {
    const sections = [
      'selectLicenseData',
      'keyInfoData',
      'applicantDetailsData',
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