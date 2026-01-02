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
    this.photoSub = this.licenseAppService.getPassPhotoObservable().subscribe(file => {
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
    sitesubdivision: 'Site Sub Division',
    site_subdivision: 'Site Sub Division',
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
    roadname: 'Road Name',
    road_name: 'Road Name',
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
        // Skip code fields
        if (k.endsWith('_code') || k.endsWith('code')) return false;
        
        // Skip duplicates (normalize field names)
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

  /**
   * Get display name for an ID field from master data stored in sessionStorage
   */
  private getDisplayName(field: string, value: any): string {
    if (!value) return '';
    
    // Normalize field name (handle both snake_case and camelCase)
    const normalized = field.toLowerCase().replace(/_/g, '');
    
    try {
      let masterData: any[] = [];
      
      // License Type
      if (normalized === 'licensetype') {
        masterData = JSON.parse(sessionStorage.getItem('licenseTypes') || '[]');
        const licenseType = masterData.find(d => d.id === Number(value));
        return licenseType?.licenseType || value.toString();
      }
      
      // License Category
      if (normalized === 'licensecategory') {
        masterData = JSON.parse(sessionStorage.getItem('licenseCategories') || '[]');
        const category = masterData.find(d => d.id === Number(value));
        return category?.licenseCategory || value.toString();
      }
      
      // License Sub Category
      if (normalized === 'licensesubcategory') {
        masterData = JSON.parse(sessionStorage.getItem('licenseSubcategories') || '[]');
        const subCategory = masterData.find(d => d.id === Number(value));
        return subCategory?.licenseSubcategory || subCategory?.name || value.toString();
      }
      
      // Site District
      if (normalized === 'sitedistrict') {
        masterData = JSON.parse(sessionStorage.getItem('districts') || '[]');
        const district = masterData.find(d => d.id === Number(value));
        return district?.district || value.toString();
      }
      
      // Site Subdivision
      if (normalized === 'sitesubdivision') {
        masterData = JSON.parse(sessionStorage.getItem('subdivisions') || '[]');
        const subdivision = masterData.find(d => d.id === Number(value));
        return subdivision?.subdivision || value.toString();
      }
      
      // Police Station
      if (normalized === 'policestation') {
        masterData = JSON.parse(sessionStorage.getItem('policeStations') || '[]');
        const station = masterData.find(d => d.id === Number(value));
        return station?.policeStation || value.toString();
      }
      
      // Default: return value as-is
      return value.toString();
      
    } catch (e) {
      console.error(`Failed to get display name for ${field}:`, e);
      return value.toString();
    }
  }

  goBack() {
    this.back.emit();
  }

  /**
   * 🔍 DEBUG: Check sessionStorage before submission
   */
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
    console.log('📁 Site Documents:', Object.keys(siteDocuments).length, 'files');
    Object.entries(siteDocuments).forEach(([name, file]) => {
      console.log(`  - ${name}: ${file.name} (${file.size} bytes)`);
    });
    
    console.groupEnd();
  }

  /**
   * ✅ Validate all required data before submission
   */
  private validateRequiredData(): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    
    // Check license type
    const selectData = this.getParsedSession('selectLicenseData');
    if (!selectData?.licenseType && !selectData?.license_type) {
      missingFields.push('License Type');
    }
    
    // Check key info
    const keyData = this.getParsedSession('keyInfoData');
    if (!keyData?.license_category) missingFields.push('License Category');
    if (!keyData?.license_sub_category) missingFields.push('License Sub Category');
    if (!keyData?.establishment_name) missingFields.push('Establishment Name');
    if (!keyData?.site_type) missingFields.push('Site Type');
    
    // Check applicant details
    const applicantData = this.getParsedSession('applicantDetailsData');
    if (!applicantData?.applicant_name) missingFields.push('Applicant Name');
    if (!applicantData?.father_husband_name) missingFields.push('Father/Husband Name');
    if (!applicantData?.dob) missingFields.push('Date of Birth');
    if (!applicantData?.gender) missingFields.push('Gender');
    if (!applicantData?.email) missingFields.push('Email');
    if (!applicantData?.mobile_number) missingFields.push('Mobile Number');
    
    // Check site details
    const siteData = this.getParsedSession('siteDetailsData');
    if (!siteData?.site_district_code) missingFields.push('Site District');
    if (!siteData?.site_subdivision_code) missingFields.push('Site Subdivision');
    if (!siteData?.police_station_code) missingFields.push('Police Station');
    if (!siteData?.site_owned) missingFields.push('Site Ownership');
    
    // Check documents
    const passPhoto = this.licenseAppService.getPassPhoto();
    if (!passPhoto) missingFields.push('Passport Photo');
    
    const docs = this.licenseAppService.getAllSiteDocuments();
    if (!docs['pan_card']) missingFields.push('PAN Card');
    if (!docs['sikkim_certificate']) missingFields.push('Sikkim Certificate');
    if (!docs['dob_proof']) missingFields.push('Date of Birth Proof');
    
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

    // Prevent double submission
    if (this.isSubmitting) {
      return;
    }

    // ✅ Validate all required data
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

    // Show loading indicator
    Swal.fire({
      title: 'Submitting Application...',
      html: 'Please wait while we process your application.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // 🔍 DEBUG: Show what we have in sessionStorage
      this.debugSessionStorage();

      // ✅ Use the service method to prepare FormData
      const formData = this.licenseAppService.prepareNewLicenseFormData();

      // DEBUG: Log FormData contents
      console.group("📦 FINAL FORMDATA SENT TO BACKEND (NEW LICENSE)");
      FormDataBuilder.logFormData(formData, 'New License Application');
      console.groupEnd();

      // Submit to backend
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
            // Clear all session storage and documents
            this.clearApplicationData();

            // Navigate to dashboard
            this.router.navigate(['/licensee/dashboard']);
          });
        },
        error: (err: any) => {
          console.error('❌ New License submission failed:', err);
          console.log('Full error object:', err);

          // Format error message
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

  /**
   * Clear all application data from session storage and service
   */
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

    // Clear documents from service
    this.licenseAppService.clearAllDocuments();

    console.log('✅ Application data cleared successfully');
  }

  /**
   * Format an error object into a user-friendly message
   */
  private formatErrorMessage(err: any): string {
    if (!err) return 'An unknown error occurred.';
    
    // Check for validation errors from Django
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