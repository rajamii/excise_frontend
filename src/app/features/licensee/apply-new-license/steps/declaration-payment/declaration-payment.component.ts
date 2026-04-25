import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { FormDataBuilder } from '../../../../../shared/utils/form-data.util';
import { PaymentIntegrationService } from '../../../../../core/services/payment-integration.service';
import { timeout } from 'rxjs';

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
    private paymentIntegrationService: PaymentIntegrationService,
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

  get isCompanyType(): boolean {
    return Number(this.licenseType) === 2;
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
    
    if (!docs.get('sikkim_certificate')) {
      console.error('❌ Missing: Sikkim Certificate');
      missingFields.push('Sikkim Certificate');
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

        Swal.fire({
          title: 'Redirecting to BillDesk',
          text: 'Preparing application fee payment...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.licenseAppService.createNewLicenseApplicationDraft(formData).subscribe({
          next: (response: any) => {
            const applicationId = String(response?.application_id || response?.applicationId || '').trim();
            if (!applicationId) {
              Swal.close();
              this.isSubmitting = false;
              Swal.fire('Error', 'Unable to create application draft (missing Application ID).', 'error');
              return;
            }

            this.applicationId = applicationId;

            this.paymentIntegrationService.initiateBilldeskNewLicenseApplicationFee({
              application_id: applicationId,
              amount: Number(this.applicationFee || 500),
              payment_module_code: '001'
            }).pipe(timeout(30000)).subscribe({
              next: (initRes: any) => {
                Swal.close();
                const billdeskUrl = String(initRes?.billdeskUrl || initRes?.billdesk_url || '').trim();
                const requestMsg = String(initRes?.requestMsg || initRes?.request_msg || '').trim();
                if (!billdeskUrl || !requestMsg) {
                  this.isSubmitting = false;
                  Swal.fire('Error', 'BillDesk initiation failed: missing gateway parameters.', 'error');
                  return;
                }
                this.submitToBillDesk(billdeskUrl, requestMsg);
              },
              error: (err: any) => {
                Swal.close();
                console.error('❌ BillDesk initiation failed:', err);

                const retrySeconds = this.extractRetryAfterSeconds(err);
                if (retrySeconds > 0) {
                  this.isSubmitting = false;
                  this.showBilldeskPendingRetryPopup(retrySeconds);
                  return;
                }

                if (String(err?.name || '').toLowerCase() === 'timeouterror') {
                  this.isSubmitting = false;
                  Swal.fire('Timeout', 'BillDesk initiation timed out. Please try again.', 'error');
                  return;
                }

                const message =
                  err?.error?.detail ||
                  err?.error?.message ||
                  err?.message ||
                  'Unable to initiate BillDesk payment.';

                this.isSubmitting = false;
                Swal.fire('Error', String(message), 'error');
              }
            });
          },
          error: (err: any) => {
            Swal.close();
            console.error('❌ New License draft creation failed:', err);
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

  private submitToBillDesk(url: string, requestMsg: string): void {
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'msg';
      input.value = requestMsg;

      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      console.error('❌ BillDesk redirect failed:', e);
      this.isSubmitting = false;
      Swal.fire('Error', 'Unable to redirect to BillDesk. Please try again.', 'error');
    }
  }

  private extractRetryAfterSeconds(err: any): number {
    const httpStatus = Number(err?.status || 0);
    if (httpStatus !== 409) return 0;
    const raw = err?.error?.retry_after_seconds || err?.error?.retryAfterSeconds || 0;
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  }

  private showBilldeskPendingRetryPopup(retryAfterSeconds: number): void {
    const totalSeconds = Math.max(1, Math.floor(retryAfterSeconds));
    const format = (seconds: number) => {
      const s = Math.max(0, Math.floor(seconds));
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    };

    let interval: any;
    Swal.fire({
      icon: 'info',
      title: 'Payment Pending',
      html:
        `<div style="text-align:left">` +
        `<div>Your last BillDesk application-fee payment is still pending.</div>` +
        `<div>Please try again after <b>${format(totalSeconds)}</b>.</div>` +
        `</div>`,
      confirmButtonText: 'Cancel',
      showConfirmButton: true,
      allowOutsideClick: false,
      timer: totalSeconds * 1000,
      timerProgressBar: true,
      didOpen: () => {
        const container = Swal.getHtmlContainer();
        const countdownEl = container ? (container.querySelector('b') as HTMLElement | null) : null;
        interval = setInterval(() => {
          const left = Swal.getTimerLeft();
          if (left === null || left === undefined) return;
          if (countdownEl) countdownEl.textContent = format(Math.ceil(left / 1000));
        }, 250);
      },
      willClose: () => {
        if (interval) clearInterval(interval);
      }
    });
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
