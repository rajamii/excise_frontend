import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { FormDataBuilder } from '../../../../../shared/utils/form-data.util';
import { PaymentIntegrationService } from '../../../../../core/services/payment-integration.service';
import { environment } from '../../../../../../environments/environment';
import { MasterService } from '../../../../../core/services/master.service';

interface ApplicantDeclarationData {
  mode_of_operation?: string | null;
  modeOfOperation?: string | null;
}

interface UploadedDocumentView {
  key: string;
  label: string;
  fileName: string;
}

// Declare the global BillDesk function so TypeScript doesn't throw errors
declare global {
  interface Window {
    loadBillDeskSdk: (config: any) => void;
  }
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
  feeAmount = 0;
  isSubmitting = false;
  readonly canForceSubmit =
    !environment.production ||
    (typeof window !== 'undefined' &&
      ['localhost', '127.0.0.1', '::1'].includes(String(window.location?.hostname || '').toLowerCase()));
  draftApplicationId: string | null = null;
  submittedApplicationId: string | null = null;
  sbmApplicationId: string | null = null;
  sbmSubmitted: boolean = false;
  private readonly documentObjectUrls = new Map<string, string>();

  private readonly uploadedDocumentLabels: Record<string, string> = {
    pan_card: 'PAN Card',
    sikkim_certificate: 'COI / RC / SS Document',
    dob_proof: 'Date of Birth Proof',
    parcha: 'Parcha Document',
    noc: 'NOC Document',
    trade_license: 'Trade License Document',
    member_pass_photo: 'Member Passport Size Photo',
    member_aadhaar_card: 'Member Aadhaar Card',
    member_residential_certificate: 'Member COI / RC / SS Document',
    member_dob_proof: 'Member Date of Birth Proof'
  };
  private readonly documentFieldKeys = new Set([
    'parcha',
    'noc',
    'trade_license',
    'pan_card',
    'sikkim_certificate',
    'dob_proof',
    'member_pass_photo',
    'member_aadhaar_card',
    'member_residential_certificate',
    'member_dob_proof'
  ]);
  isProcessing = false;

  constructor(
    private licenseAppService: LicenseApplicationService,
    private paymentService: PaymentIntegrationService,
    private masterService: MasterService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this.declarationForm = this.fb.group({
      acceptDeclaration: new FormControl(false, [Validators.requiredTrue])
    });
  }

  ngOnInit(): void {
    this.ensureReviewMasterData();

    this.paymentService.paymentStatus$.subscribe(result => {
      if (result.status === 'success' || result.status === '0300') {
        // Handle success (e.g., show success screen or refresh list)
        this.submittedApplicationId = result.applicationId;
      } else {
        // Handle failure
        Swal.fire('Error', 'Payment failed or cancelled', 'error');
      }
    });
    // Load application fee from master payment module (module_code=001)
    try {
      this.paymentService.getPaymentModule('001').subscribe({
        next: (res: any) => {
          const fee = Number(res?.license_fee ?? res?.licenseFee ?? 0);
          if (isFinite(fee) && fee > 0) {
            this.feeAmount = fee;
            this.cdr.detectChanges();
          }
        },
        error: (err: any) => {
          console.error('Failed to load payment module fee (001):', err);
          // Keep feeAmount=0; backend will still resolve amount from DB during payment initiation.
        }
      });
    } catch {
      // no-op
    }

    // If user comes back from BillDesk receipt page and chooses "Go to Dashboard",
    // we show the "Application Submitted" view in this step.
    try {
      const submitted = String(sessionStorage.getItem('new_license_submitted_application_id') || '').trim();
      if (submitted) {
        this.submittedApplicationId = submitted;
      }

      const sbmId = String(sessionStorage.getItem('new_license_sbm_application_id') || '').trim();
      if (sbmId) {
        this.sbmApplicationId = sbmId;
      }

      const sbmSubmitted = String(sessionStorage.getItem('new_license_sbm_submitted') || '').trim();
      if (sbmSubmitted) {
        this.sbmSubmitted = sbmSubmitted === '1';
      }
    } catch {
      // no-op
    }

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
    this.documentObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.documentObjectUrls.clear();
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
    noc: 'NOC Document',
    parcha: 'Parcha Document',
    tradelicensecovered: 'Trade License Covered',
    trade_license_covered: 'Trade License Covered',
    trade_license: 'Trade License Document',
    company_name: 'Company Name',
    companyname: 'Company Name',
    company_address: 'Company Address',
    companyaddress: 'Company Address',
    company_gst: 'Company GST Number',
    companygst: 'Company GST Number',
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
    return this.isIndividualType;
  }

  get shouldShowMemberDetails(): boolean {
    const modeOfOperation = this.selectedModeOfOperation;

    return modeOfOperation === 'Salesman' || modeOfOperation === 'Barman';
  }

  get memberDetailsSectionTitle(): string {
    const modeOfOperation = this.selectedModeOfOperation;
    return modeOfOperation === 'Salesman' || modeOfOperation === 'Barman'
      ? `${modeOfOperation} Details`
      : 'Member Details';
  }

  private get selectedModeOfOperation(): string {
    if (this.isCompanyType) {
      const unitData = this.getParsedSession<any>('unitDetailsData');
      return String(unitData?.mode_of_operation ?? unitData?.modeOfOperation ?? '').trim();
    }
    const applicantData = this.getParsedSession<ApplicantDeclarationData>('applicantDetailsData');
    return String(applicantData?.mode_of_operation ?? applicantData?.modeOfOperation ?? '').trim();
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

  get uploadedDocuments(): UploadedDocumentView[] {
    const docs = this.licenseAppService.getAllSiteDocuments();
    return Array.from(docs.entries()).map(([key, file]) => ({
      key,
      label: this.getUploadedDocumentLabel(key),
      fileName: file.name
    }));
  }

  private getUploadedDocumentLabel(key: string): string {
    const label = this.uploadedDocumentLabels[key] ?? FormDataBuilder.toTitleCase(key);
    const role = this.selectedModeOfOperation;

    return key.startsWith('member_') && (role === 'Salesman' || role === 'Barman')
      ? label.replace(/^Member/, role)
      : label;
  }

  get displaySections() {
    return [
      { title: 'Application Type', data: this.selectLicenseData },
      { title: 'Basic Information', data: this.keyInfoData },
      { title: 'Applicant Details', data: this.applicantDetailsData },
      {
        title: 'Company Details',
        data: this.unitDetailsData,
        condition: () => this.isCompanyType
      },
      { title: 'Site Details', data: this.siteDetailsData }
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

  /**
   * Subcategory IDs exempt from Trade License requirement:
   * Foreign Liquor Retail Shop (10), Retail Sale of Denatured Spirit (11),
   * Brewing/Sale of Pachwai by Retail (23), Brewing of Pachwai (24),
   * Departmental Store (30)
   */
  private readonly TRADE_LICENSE_EXEMPT_SUBCATEGORY_IDS = new Set([10, 11, 23, 24, 30]);

  private isTradeLicenseExempt(): boolean {
    try {
      const keyInfo = this.getParsedSession<any>('keyInfoData');
      const subCatId = Number(keyInfo?.licenseSubCategory ?? keyInfo?.license_sub_category ?? 0);
      return subCatId > 0 && this.TRADE_LICENSE_EXEMPT_SUBCATEGORY_IDS.has(subCatId);
    } catch {
      return false;
    }
  }

  private ensureReviewMasterData(): void {
    this.cacheMasterDataIfMissing('licenseCategories', () => this.masterService.getLicenseCategories());
    this.cacheMasterDataIfMissing('licenseSubcategories', () => this.masterService.getLicenseSubcategories());
    this.cacheMasterDataIfMissing('locationCategories', () => this.masterService.getLocationCategories());
    this.cacheMasterDataIfMissing('locationSubcategories', () => this.masterService.getLocationSubcategories());
    this.cacheMasterDataIfMissing('locations', () => this.masterService.getLocations());
    this.cacheMasterDataIfMissing('wards', () => this.masterService.getWards());
  }

  private cacheMasterDataIfMissing(key: string, loader: () => any): void {
    if (sessionStorage.getItem(key)) {
      return;
    }

    loader().subscribe({
      next: (data: any[]) => {
        sessionStorage.setItem(key, JSON.stringify(data));
        this.cdr.detectChanges();
      },
      error: (error: any) => console.error(`Failed to load ${key} for declaration review`, error)
    });
  }

  private getSafeLabel(key: string): string {
    const normalized = key.toLowerCase().replace(/_/g, '');
    return this.licenseApplicationLabels[key]
      || this.licenseApplicationLabels[normalized]
      || this.licenseApplicationLabels[this.toSnakeCase(key)]
      || FormDataBuilder.toTitleCase(key);
  }

  private getDataForView(key: string): { key: string; value: any }[] {
    const data = this.getParsedSession<Record<string, any>>(key);
    if (!data) return [];

    const processedFields = new Set<string>();

    return Object.entries(data)
      .filter(([k]) => {
        // Skip code fields and companion display-name fields. The base field
        // uses those names through getDisplayValue().
        if (k.endsWith('_code') || k.endsWith('code') || k.endsWith('Name')) return false;
        if (this.isCompanionDisplayNameField(k, data)) return false;
        if (this.documentFieldKeys.has(k)) return false;

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

  private isCompanionDisplayNameField(field: string, data: Record<string, any>): boolean {
    if (!field.endsWith('_name')) {
      return false;
    }

    const baseField = field.replace(/_name$/, '');
    const idField = `${baseField}_id`;
    return Object.prototype.hasOwnProperty.call(data, baseField) || Object.prototype.hasOwnProperty.call(data, idField);
  }

  /**
   * ✅ FIXED: Get display value - checks for Name field first, then looks up in master data
   */
  private getDisplayValue(field: string, value: any, allData: Record<string, any>): string {
    if (!value && value !== 0) return '';

    const normalized = field.toLowerCase().replace(/_/g, '');

    console.log(`🔍 getDisplayValue called for field: ${field}, normalized: ${normalized}, value:`, value);

    // PRIORITY 1: Check if there's a corresponding Name field in the data

    const possibleNameFields = [
      `${field}Name`,           // exact match with Name suffix
      `${field}_name`,          // snake_case with _name
      field.replace(/_/g, '') + 'Name',  // no underscore + Name
      `${this.toSnakeCase(field)}_name`
    ];

    if (field.endsWith('_id')) {
      possibleNameFields.push(field.replace(/_id$/, '_name'));
    }
    if (field.endsWith('Id')) {
      possibleNameFields.push(this.toSnakeCase(field).replace(/_id$/, '_name'));
    }

    for (const nameField of possibleNameFields) {
      if (allData[nameField]) {
        console.log(`Found name field ${nameField} for ${field}:`, allData[nameField]);
        return allData[nameField];
      }
    }

    // PRIORITY 2: Look up in master data if it's an ID field
    try {
      let masterData: any[] = [];
      let masterKey = '';
      let displayField = '';

      // Determine which master data to use based on normalized field name
      if (normalized === 'licensetype') {
        masterKey = 'licenseTypes';
        displayField = 'licenseType';
      } else if (
        normalized === 'licensecategory' ||
        normalized === 'existinglicensecategoryid' ||
        normalized === 'familylicensecategoryid'
      ) {
        masterKey = 'licenseCategories';
        displayField = 'licenseCategory';
      } else if (normalized === 'licensesubcategory') {
        masterKey = 'licenseSubcategories';
        displayField = 'description';
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
        displayField = 'categoryName';
      } else if (normalized === 'locationsubcategory') {
        masterKey = 'locationSubcategories';
        displayField = 'subcategoryName';
      } else if (normalized === 'location') {
        masterKey = 'locations';
        displayField = 'locationDescription';
      } else if (normalized === 'ward') {
        masterKey = 'wards';
        displayField = 'wardName';
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
        console.log(`Looking up ${masterKey} in sessionStorage:`, rawData ? 'Found' : 'Not found');

        if (rawData) {
          masterData = JSON.parse(rawData);
          console.log(`${masterKey} contains ${masterData.length} items`);

          // Try matching by id (as number or string)
          let item = masterData.find(d => d.id === Number(value) || d.id === value);

          if (item) {
            // Try multiple possible field names
            const name = this.getItemDisplayName(item, displayField);
            if (name) {
              console.log(`Found ${displayField} in ${masterKey}:`, name);
              return name;
            }
          } else {
            console.warn(`No item found in ${masterKey} with id: ${value}`);
            console.log('Available items:', masterData.slice(0, 3));
          }
        } else {
          console.warn(`${masterKey} not found in sessionStorage`);
        }
      }

      // PRIORITY 3: Return the original value if no lookup found
      console.log(`ℹReturning original value for ${field}:`, value);
      return value.toString();

    } catch (e) {
      console.error(`Failed to get display value for ${field}:`, e);
      return value.toString();
    }
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`).replace(/^_/, '');
  }

  private getItemDisplayName(item: Record<string, any>, displayField: string): string | null {
    const candidates = [
      displayField,
      this.toSnakeCase(displayField),
      'description',
      'name',
      'title'
    ];

    for (const candidate of candidates) {
      const value = item[candidate];
      if (value !== null && value !== undefined && value !== '') {
        return String(value);
      }
    }

    return null;
  }

  goBack() {
    this.back.emit();
  }

  viewUploadedDocument(documentKey: string): void {
    const file = this.licenseAppService.getSiteDocument(documentKey);
    if (!file) {
      Swal.fire('Document Missing', 'This uploaded document is not available for preview.', 'warning');
      return;
    }

    const existingUrl = this.documentObjectUrls.get(documentKey);
    if (existingUrl) {
      window.open(existingUrl, '_blank');
      return;
    }

    const url = URL.createObjectURL(file);
    this.documentObjectUrls.set(documentKey, url);
    window.open(url, '_blank');
  }

  goToDashboard(): void {
    this.clearApplicationData();
    this.router.navigate(['/dashboard']);
  }

  private debugSessionStorage(): void {
    console.group('DEBUG: SessionStorage Contents Before Submission (NEW LICENSE)');

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
          console.group(`${key}`);
          console.table(parsed);
          console.groupEnd();
        } catch (e) {
          console.error(`Failed to parse ${key}:`, e);
        }
      } else {
        console.warn(`${key} is empty`);
      }
    });

    const photoFile = this.licenseAppService.getPassPhoto();
    console.log('Pass Photo file:', photoFile ? `${photoFile.name} (${photoFile.size} bytes)` : 'MISSING');

    const siteDocuments = this.licenseAppService.getAllSiteDocuments();
    console.log('Site Documents:', siteDocuments.size, 'files');
    siteDocuments.forEach((file: File, name: string) => {
      console.log(`  - ${name}: ${file.name} (${file.size} bytes)`);
    });

    console.groupEnd();
  }

  private validateRequiredData(): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    console.group('VALIDATING REQUIRED DATA');

    const selectData = this.getParsedSession('selectLicenseData');
    console.log('Select License Data:', selectData);
    if (!selectData?.licenseType && !selectData?.license_type) {
      console.error('Missing: License Type');
      missingFields.push('License Type');
    } else {
      console.log('License Type OK');
    }

    const keyData = this.getParsedSession('keyInfoData');
    console.log('Key Info Data:', keyData);

    if (!keyData?.license_category) {
      console.error('Missing: License Category');
      missingFields.push('License Category');
    } else {
      console.log('License Category OK:', keyData.license_category);
    }

    if (!keyData?.license_sub_category) {
      console.error('Missing: License Sub Category');
      missingFields.push('License Sub Category');
    } else {
      console.log('License Sub Category OK:', keyData.license_sub_category);
    }

    if (!keyData?.establishment_name) {
      console.error('Missing: Establishment Name');
      missingFields.push('Establishment Name');
    } else {
      console.log('Establishment Name OK');
    }

    if (!keyData?.site_type) {
      console.error('Missing: Site Type');
      missingFields.push('Site Type');
    } else {
      console.log('Site Type OK');
    }

    if (keyData?.site_type === 'Existing' && !keyData?.existing_site_license) {
      missingFields.push('Old Site License No');
    }

    const applicantData = this.getParsedSession('applicantDetailsData');
    console.log('Applicant Data:', applicantData);

    if (!this.isCompanyType) {
      if (!applicantData?.applicant_name) {
        console.error('Missing: Applicant Name');
        missingFields.push('Applicant Name');
      } else {
        console.log('Applicant Name OK');
      }

      if (!applicantData?.father_husband_name) {
        console.error('Missing: Father/Husband Name');
        missingFields.push('Father/Husband Name');
      } else {
        console.log('Father/Husband Name OK');
      }

      if (!applicantData?.dob) {
        console.error('Missing: Date of Birth');
        missingFields.push('Date of Birth');
      } else {
        console.log('DOB OK');
      }

      if (!applicantData?.gender) {
        console.error('Missing: Gender');
        missingFields.push('Gender');
      } else {
        console.log('Gender OK');
      }

      if (!applicantData?.email) {
        console.error('Missing: Email');
        missingFields.push('Email');
      } else {
        console.log('Email OK');
      }

      if (!applicantData?.mobile_number) {
        console.error('Missing: Mobile Number');
        missingFields.push('Mobile Number');
      } else {
        console.log('Mobile Number OK');
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
    console.log('Site Details Data:', siteData);

    if (!siteData?.district) {
      console.error('Missing: Site District');
      missingFields.push('Site District');
    } else {
      console.log('Site District OK:', siteData.district);
    }

    if (!siteData?.subdivision) {
      console.error('Missing: Site Subdivision');
      missingFields.push('Site Subdivision');
    } else {
      console.log('Site Subdivision OK:', siteData.subdivision);
    }

    if (!siteData?.police_station) {
      console.error('Missing: Police Station');
      missingFields.push('Police Station');
    } else {
      console.log('Police Station OK:', siteData.police_station);
    }

    if (!siteData?.location_subcategory) {
      console.error('Missing: Location Subcategory');
      missingFields.push('Location Subcategory');
    } else {
      console.log('Location Subcategory OK');
    }

    const categoryId = siteData?.location_category;
    let isRural = false;
    if (categoryId) {
      const categoriesRaw = sessionStorage.getItem('locationCategories');
      const categories = categoriesRaw ? JSON.parse(categoriesRaw) : [];
      const category = categories.find((c: any) => c.id === Number(categoryId));
      isRural = category ? (category.isRural ?? category.is_rural ?? false) : false;
    }

    if (isRural) {
      if (!siteData?.block) {
        console.error('Missing: Block');
        missingFields.push('Block');
      } else {
        console.log('Block OK');
      }
    }

    if (!siteData?.ward) {
      console.error('Missing: Ward Name');
      missingFields.push('Ward Name');
    } else {
      console.log('Ward Name OK');
    }

    if (!siteData?.address) {
      console.error('Missing: Business Address');
      missingFields.push('Business Address');
    } else {
      console.log('Business Address OK');
    }

    if (!siteData?.pin_code) {
      console.error('Missing: PIN Code');
      missingFields.push('PIN Code');
    } else {
      console.log('PIN Code OK');
    }

    if (!siteData?.construction_type) {
      console.error('Missing: Construction Type');
      missingFields.push('Construction Type');
    } else {
      console.log('Construction Type OK');
    }

    if (!siteData?.site_owned) {
      console.error('Missing: Site Ownership');
      missingFields.push('Site Ownership');
    } else {
      console.log('Site Ownership OK');
    }

    if (!this.isTradeLicenseExempt()) {
      if (!siteData?.trade_license_covered) {
        console.error('Missing: Trade License Covered');
        missingFields.push('Trade License Covered');
      } else {
        console.log('Trade License Covered OK');
      }
      if (siteData?.trade_license_covered === 'No') {
        missingFields.push('Trade License Covered');
      }
    } else {
      console.log('Trade License Covered — skipped (exempt category)');
    }

    const docs = this.licenseAppService.getAllSiteDocuments();
    console.log('Documents:', Array.from(docs.keys()));

    if (!this.isCompanyType) {
      const passPhoto = this.licenseAppService.getPassPhoto();
      if (!passPhoto) {
        console.error('Missing: Passport Photo');
        missingFields.push('Passport Photo');
      } else {
        console.log('Passport Photo OK:', passPhoto.name);
      }

      if (!docs.get('pan_card')) {
        console.error('Missing: PAN Card');
        missingFields.push('PAN Card');
      } else {
        console.log('PAN Card OK');
      }

      if (this.requiresNationalityDocument && !docs.get('sikkim_certificate')) {
        console.error('❌ Missing: Sikkim Certificate');
        missingFields.push('COI / RC / SS Document');
      } else {
        console.log('Sikkim Certificate OK');
      }

      if (!docs.get('dob_proof')) {
        console.error('❌ Missing: Date of Birth Proof');
        missingFields.push('Date of Birth Proof');
      } else {
        console.log('✅ DOB Proof OK');
      }
    } else {
      if (!docs.get('pan_card')) {
        console.error('Missing: PAN Card');
        missingFields.push('PAN Card');
      } else {
        console.log('PAN Card OK');
      }
    }

    console.log('🔍 Validation Result:', { valid: missingFields.length === 0, missingFields });
    if (siteData?.site_owned === 'Yes' && !docs.get('parcha')) {
      missingFields.push('Parcha');
    }

    if (siteData?.site_owned === 'No') {
      if (siteData?.noc_obtained !== 'Yes') {
        missingFields.push('NOC Obtained');
      }
      if (!docs.get('noc')) {
        missingFields.push('NOC Document');
      }
    }

    if (!this.isTradeLicenseExempt() && siteData?.trade_license_covered === 'Yes' && !docs.get('trade_license')) {
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

    if (!this.declarationForm.valid) {
      Swal.fire('Warning', 'Please accept the declaration to proceed.', 'warning');
      return;
    }

    if (this.isSubmitting) {
      console.log('Already submitting, ignoring click');
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
        console.log('User cancelled submission');
        return;
      }

      console.log('User confirmed, proceeding with submission');
      this.isSubmitting = true;

      try {
        this.debugSessionStorage();

        const formData = this.licenseAppService.prepareNewLicenseFormData();

        console.group("FINAL FORMDATA SENT TO BACKEND (NEW LICENSE)");
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

            this.draftApplicationId = applicationId;
            try {
              sessionStorage.setItem('new_license_draft_application_id', applicationId);
            } catch {
              // no-op
            }

            // this.paymentService.initiateBilldeskNewLicenseApplicationFee({
            //   application_id: applicationId,
            //   amount: Number(this.feeAmount || 500),
            //   payment_module_code: '001'
            // }).pipe(timeout(30000)).subscribe({
            //   next: (initRes: any) => {
            //     Swal.close();
            //     const billdeskUrl = String(initRes?.billdeskUrl || initRes?.billdesk_url || '').trim();
            //     const requestMsg = String(initRes?.requestMsg || initRes?.request_msg || '').trim();
            //     if (!billdeskUrl || !requestMsg) {
            //       this.isSubmitting = false;
            //       Swal.fire('Error', 'BillDesk initiation failed: missing gateway parameters.', 'error');
            //       return;
            //     }
            //     this.submitToBillDesk(billdeskUrl, requestMsg);
            //   },
            //   error: (err: any) => {
            //     Swal.close();
            //     console.error('BillDesk initiation failed:', err);

            //     const retrySeconds = this.extractRetryAfterSeconds(err);
            //     if (retrySeconds > 0) {
            //       this.isSubmitting = false;
            //       this.showBilldeskPendingRetryPopup(retrySeconds);
            //       return;
            //     }

            //     if (String(err?.name || '').toLowerCase() === 'timeouterror') {
            //       this.isSubmitting = false;
            //       Swal.fire('Timeout', 'BillDesk initiation timed out. Please try again.', 'error');
            //       return;
            //     }

            //     const message =
            //       err?.error?.detail ||
            //       err?.error?.message ||
            //       err?.message ||
            //       'Unable to initiate BillDesk payment.';

            //     this.isSubmitting = false;
            //     Swal.fire('Error', String(message), 'error');
            //   }
            // });

            this.onPayClick();
          },
          error: (err: any) => {
            Swal.close();
            console.error('New License draft creation failed:', err);
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
        console.error('Unexpected error during submission:', error);
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

  forceSubmit(): void {
    if (!this.canForceSubmit) {
      Swal.fire('Disabled', 'Force submit is only available in non-production builds.', 'info');
      return;
    }

    const validation = this.validateRequiredData();
    if (!validation.valid) {
      Swal.fire({
        title: 'Missing Required Fields',
        html: `<div style="text-align: left;">
          <p>The following required fields are missing:</p>
          <ul style="color: #d32f2f;">
            ${validation.missingFields.map((f: string) => `<li>${f}</li>`).join('')}
          </ul>
          <p style="margin-top: 12px; font-size: 14px;">Please go back and complete all required fields.</p>
        </div>`,
        icon: 'error'
      });
      return;
    }

    Swal.fire({
      title: 'Force submit?',
      text: 'This will bypass BillDesk and mark the application fee as paid (localhost testing only).',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Force Submit',
      cancelButtonText: 'Cancel',
    }).then((confirm) => {
      if (!confirm.isConfirmed) return;

      this.isSubmitting = true;

      const doForce = (applicationId: string) => {
        this.licenseAppService.forceSubmitNewLicenseApplication(applicationId).subscribe({
          next: (res: any) => {
            const submittedId = String(res?.application_id || res?.applicationId || applicationId || '').trim();
            this.submittedApplicationId = submittedId || applicationId;
            try {
              if (this.submittedApplicationId) {
                sessionStorage.setItem('new_license_submitted_application_id', this.submittedApplicationId);
              }
              const sbmId = String(res?.sbm_application_id || '').trim();
              if (sbmId) sessionStorage.setItem('new_license_sbm_application_id', sbmId);
              if (res?.sbm_submitted) sessionStorage.setItem('new_license_sbm_submitted', '1');
            } catch {
              // no-op
            }
            this.isSubmitting = false;
            Swal.fire('Submitted', 'Application force submitted successfully.', 'success');
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            this.isSubmitting = false;
            const message =
              err?.error?.detail ||
              err?.error?.message ||
              err?.message ||
              'Force submit failed.';
            Swal.fire('Error', String(message), 'error');
          }
        });
      };

      const existingDraft = String(this.draftApplicationId || '').trim();
      if (existingDraft) {
        doForce(existingDraft);
        return;
      }

      const formData = this.licenseAppService.prepareNewLicenseFormData();
      this.licenseAppService.createNewLicenseApplicationDraft(formData).subscribe({
        next: (response: any) => {
          const applicationId = String(response?.application_id || response?.applicationId || '').trim();
          if (!applicationId) {
            this.isSubmitting = false;
            Swal.fire('Error', 'Unable to create application draft (missing Application ID).', 'error');
            return;
          }
          this.draftApplicationId = applicationId;
          try {
            sessionStorage.setItem('new_license_draft_application_id', applicationId);
          } catch {
            // no-op
          }
          doForce(applicationId);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          const message =
            err?.error?.detail ||
            err?.error?.message ||
            err?.message ||
            'Unable to create application draft.';
          Swal.fire('Error', String(message), 'error');
        }
      });
    });
  }

  onPayClick() {
    if (!this.draftApplicationId) return;

  this.isProcessing = true;
   
    const amountToSend = this.feeAmount && this.feeAmount > 0 ? this.feeAmount : undefined;

    this.paymentService.initiateNewLicenseFee(this.draftApplicationId, amountToSend).subscribe({
      next: (response) => {
        this.isProcessing = false;
        this.isSubmitting = false;
        Swal.close();

      // Check for SDK Parameters
      const hasSDKParams = (response?.bd_order_id || response?.bdOrderId) && 
                           (response?.auth_token || response?.authToken);

      if (hasSDKParams) {
        try {
          // Use the shared service method
          this.paymentService.launchBillDeskSDK(response, (txn) => {
            if (txn.status === 'success' || txn.status === '0300') {
              this.submittedApplicationId = this.draftApplicationId;
              this.cdr.detectChanges();
            } else {
              Swal.fire('Payment Incomplete', 'The payment was cancelled or declined.', 'error');
            }
          });
        } catch (err) {
          Swal.fire('Error', 'Payment SDK failed to load.', 'error');
        }
        return;
      }

      const billdeskUrl = String(response?.billdesk_url || response?.billdeskUrl || '').trim();
      const requestMsg = String(response?.request_msg || response?.requestMsg || '').trim();

      if (billdeskUrl && requestMsg) {
        this.submitToBillDesk(billdeskUrl, requestMsg);
      } else {
        Swal.fire('Error', 'Missing gateway parameters.', 'error');
      }
    },
    error: (err) => {
      this.handlePaymentCallback(err);
    }
  });
}

  private handlePaymentCallback(txn: any) {
    console.log("BillDesk Callback received. Status:", txn.status);
    if (txn.status === 'success' || txn.status === '0300') {
      this.submittedApplicationId = this.draftApplicationId;
      this.cdr.detectChanges();
    } else {
      Swal.fire('Payment Incomplete', 'Your payment was cancelled or declined. Please try again.', 'error');
    }
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

  // private extractRetryAfterSeconds(err: any): number {
  //   const httpStatus = Number(err?.status || 0);
  //   if (httpStatus !== 409) return 0;
  //   const raw = err?.error?.retry_after_seconds || err?.error?.retryAfterSeconds || 0;
  //   const seconds = Number(raw);
  //   return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  // }

  // private showBilldeskPendingRetryPopup(retryAfterSeconds: number): void {
  //   const totalSeconds = Math.max(1, Math.floor(retryAfterSeconds));
  //   const format = (seconds: number) => {
  //     const s = Math.max(0, Math.floor(seconds));
  //     const mm = String(Math.floor(s / 60)).padStart(2, '0');
  //     const ss = String(s % 60).padStart(2, '0');
  //     return `${mm}:${ss}`;
  //   };

  //   let interval: any;
  //   Swal.fire({
  //     icon: 'info',
  //     title: 'Payment Pending',
  //     html:
  //       `<div style="text-align:left">` +
  //       `<div>Your last BillDesk application-fee payment is still pending.</div>` +
  //       `<div>Please try again after <b>${format(totalSeconds)}</b>.</div>` +
  //       `</div>`,
  //     confirmButtonText: 'Cancel',
  //     showConfirmButton: true,
  //     allowOutsideClick: false,
  //     timer: totalSeconds * 1000,
  //     timerProgressBar: true,
  //     didOpen: () => {
  //       const container = Swal.getHtmlContainer();
  //       const countdownEl = container ? (container.querySelector('b') as HTMLElement | null) : null;
  //       interval = setInterval(() => {
  //         const left = Swal.getTimerLeft();
  //         if (left === null || left === undefined) return;
  //         if (countdownEl) countdownEl.textContent = format(Math.ceil(left / 1000));
  //       }, 250);
  //     },
  //     willClose: () => {
  //       if (interval) clearInterval(interval);
  //     }
  //   });
  // }

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

    console.log('Application data cleared successfully');
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
