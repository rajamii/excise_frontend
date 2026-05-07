import { Component, Inject, Input, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ApplyLicenseComponent } from '../../../apply-license/apply-license.component';
import Swal from 'sweetalert2';
import { Objection } from '../../../../../core/models/license-application.model';
import { BaseComponent } from '../../../../../base/base.components';
import { BaseDependency } from '../../../../../base/dependency/base.dependency';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { forkJoin, Observable } from 'rxjs';
import { FormDataUtil } from '../../../../../shared/utils/form-data.util';
import { environment } from '../../../../../../environments/environment';
import { UnifiedDashboardService } from '../../../../../core/services/unified-dashboard.service';
import { UnifiedApplication } from '../../../../../core/models/unified-application.model';
import { MatProgressSpinner } from "@angular/material/progress-spinner";
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { SalesmanBarmanRegistrationService } from '../../../../../core/services/salesman-barman-registration.service';

export interface FieldDisplay {
  key: string;
  field: string;
  value: string | null;
}

@Component({
  selector: 'app-view-application',
  imports: [MaterialModule, MatProgressSpinner],
  templateUrl: './view-application.component.html',
  styleUrl: './view-application.component.scss'
})
export class ViewApplicationComponent extends BaseComponent implements OnInit {
  resolveObjectionForm!: FormGroup;
  application: any = null;
  unifiedApp!: UnifiedApplication;
  tableType: string = '';

  photoUrl: string | null = null;
  isObjectionLoaded = false;
  protected environment = environment;

  objections: Objection[] = [];

  // Data arrays for display sections
  licenseData: FieldDisplay[] = [];
  keyInfoData: FieldDisplay[] = [];
  addressData: FieldDisplay[] = [];
  unitDetailsData: FieldDisplay[] = [];
  memberDetailsData: FieldDisplay[] = [];
  basicInfoData: FieldDisplay[] = [];
  applicantDetailsData: FieldDisplay[] = [];
  siteDetailsData: FieldDisplay[] = [];
  companyDetailsData: FieldDisplay[] = [];
  licenseDetailsData: FieldDisplay[] = [];
  personalDetailsData: FieldDisplay[] = [];
  documentsData: FieldDisplay[] = [];

  // Master data storage
  masterData: any = {
    districts: [],
    licenseCategories: [],
    subdivisions: [],
    policeStations: [],
    licenseTypes: [],
    licenseSubCategories: []
  };

  fieldMetaMap: { [key: string]: any } = {
    exciseDistrict: { type: 'dropdown', source: 'exciseDistrict', submitKey: 'districtCode' },
    licenseCategory: { type: 'dropdown', source: 'licenseCategory', submitKey: 'id' },
    exciseSubdivision: { type: 'dropdown', source: 'exciseSubdivision', submitKey: 'subdivisionCode' },
    siteSubdivision: { type: 'dropdown', source: 'siteSubdivision', submitKey: 'subdivisionCode' },
    policeStation: { type: 'dropdown', source: 'policeStation', submitKey: 'policeStationCode' },
    licenseType: { type: 'dropdown', source: 'licenseType', submitKey: 'id' },
    license: { type: 'dropdown', source: 'license' },
    licenseNature: { type: 'dropdown', source: 'licenseNature' },
    functioningStatus: { type: 'dropdown', source: 'functioningStatus' },
    modeOfOperation: { type: 'dropdown', source: 'modeofOperation' },
    locationCategory: { type: 'dropdown', source: 'locationCategory' },
    locationName: { type: 'dropdown', source: 'locationName' },
    wardName: { type: 'dropdown', source: 'wardName' },
    roadName: { type: 'dropdown', source: 'roadName' },
    status: { type: 'dropdown', source: 'status' },
    nationality: { type: 'dropdown', source: 'nationality' },
    gender: { type: 'dropdown', source: 'gender' },
    establishmentName: { type: 'textarea' },
    businessAddress: { type: 'textarea' },
    companyAddress: { type: 'textarea' },
    licenseNo: { type: 'number' },
    latitude: { type: 'number' },
    longitude: { type: 'number' },
    initialGrantDate: { type: 'date' },
    renewedFrom: { type: 'date' },
    validUpTo: { type: 'date' },
    incorporationDate: { type: 'date' },
    mobileNumber: { type: 'text', pattern: PatternConstants.MOBILE },
    pinCode: { type: 'text', pattern: PatternConstants.PINCODE },
    companyPan: { type: 'text', pattern: PatternConstants.PAN },
    pan: { type: 'text', pattern: PatternConstants.PAN },
    companyCin: { type: 'text', pattern: PatternConstants.CIN },
    companyPhoneNumber: { type: 'text', pattern: PatternConstants.MOBILE },
    companyEmail: { type: 'text', pattern: PatternConstants.EMAIL },
    email: { type: 'text', pattern: PatternConstants.EMAIL },
    memberMobileNumber: { type: 'text', pattern: PatternConstants.MOBILE },
    memberEmail: { type: 'text', pattern: PatternConstants.EMAIL },
    photo: { type: 'file' },
    companyName: { type: 'text' },
    memberName: { type: 'text' },
    fatherHusbandName: { type: 'text' },
    licenseSubCategory: { type: 'dropdown', source: 'licenseSubCategory', submitKey: 'id' },
    siteType: { type: 'dropdown', source: 'siteType' },
    applicantName: { type: 'text' },
    dob: { type: 'date' },
    residentialStatus: { type: 'dropdown', source: 'residentialStatus' },
    presentAddress: { type: 'textarea' },
    permanentAddress: { type: 'textarea' },
    hasSikkimCertificate: { type: 'dropdown', source: 'booleanOptions' },
    hasExciseLicense: { type: 'dropdown', source: 'booleanOptions' },
    familyExciseLicense: { type: 'dropdown', source: 'booleanOptions' },
    criminalConviction: { type: 'dropdown', source: 'booleanOptions' },
    siteDistrict: { type: 'dropdown', source: 'siteDistrict', submitKey: 'districtCode' },
    ConstructionType: { type: 'dropdown', source: 'constructionType' },
    length: { type: 'number' },
    breadth: { type: 'number' },
    siteOwned: { type: 'dropdown', source: 'booleanOptions' },
    nocObtained: { type: 'dropdown', source: 'booleanOptions' },
    passPhoto: { type: 'file' },
    panCard: { type: 'file' },
    sikkimCertificate: { type: 'file' },
    dobProof: { type: 'file' },
    nocLandlord: { type: 'file' },
    role: { type: 'dropdown', source: 'role' },
    firstName: { type: 'text' },
    middleName: { type: 'text' },
    lastName: { type: 'text' },
    aadhaar: { type: 'text', pattern: PatternConstants.AADHAR },
    emailId: { type: 'text', pattern: PatternConstants.EMAIL },
    sikkimSubject: { type: 'dropdown', source: 'booleanOptions' },
    address: { type: 'textarea' },
    applicationYear: { type: 'text' },
    applicationDate: { type: 'date' },
    district: { type: 'dropdown', source: 'district' },
    aadhaarCard: { type: 'file' },
    residentialCertificate: { type: 'file' },
    dateofBirthProof: { type: 'file' }
  };

  fieldLabelMap: { [key: string]: string } = {
    exciseDistrict: 'Excise District',
    licenseCategory: 'License Category',
    exciseSubdivision: 'Excise Sub-Division',
    license: 'License',
    licenseType: 'License Type',
    establishmentName: 'Establishment Name',
    mobileNumber: 'Mobile Number',
    email: 'Email ID',
    licenseNo: 'License Number',
    initialGrantDate: 'Initial Grant Date',
    renewedFrom: 'Renewed From',
    validUpTo: 'Valid Up To',
    yearlyLicenseFee: 'Yearly License Fee',
    licenseNature: 'License Nature',
    functioningStatus: 'Functioning Status',
    modeOfOperation: 'Mode of Operation',
    siteSubdivision: 'Site Sub-Division',
    policeStation: 'Police Station',
    locationCategory: 'Location Category',
    locationName: 'Location Name',
    wardName: 'Ward Name',
    businessAddress: 'Business Address',
    roadName: 'Road Name',
    pinCode: 'PIN Code',
    latitude: 'Latitude',
    longitude: 'Longitude',
    companyName: 'Company Name',
    companyAddress: 'Company Address',
    companyPan: 'Company PAN',
    companyCin: 'Company CIN',
    incorporationDate: 'Incorporation Date',
    companyPhoneNumber: 'Company Phone Number',
    companyEmail: 'Company Email ID',
    status: 'Status',
    memberName: 'Member Name',
    fatherHusbandName: 'Father/Husband Name',
    nationality: 'Nationality',
    gender: 'Gender',
    pan: 'PAN',
    memberMobileNumber: 'Member Mobile Number',
    memberEmail: 'Member Email ID',
    photo: 'Photo',
    licenseSubCategory: 'License Sub-Category',
    siteType: 'Site Type',
    applicantName: 'Applicant Name',
    dob: 'Date of Birth',
    residentialStatus: 'Residential Status',
    presentAddress: 'Present Address',
    permanentAddress: 'Permanent Address',
    hasSikkimCertificate: 'Has Sikkim Certificate',
    hasExciseLicense: 'Has Excise License',
    familyExciseLicense: 'Family Has Excise License',
    criminalConviction: 'Criminal Conviction',
    siteDistrict: 'Site District',
    ConstructionType: 'Construction Type',
    length: 'Length',
    breadth: 'Breadth',
    siteOwned: 'Site Owned',
    nocObtained: 'NOC Obtained',
    passPhoto: 'Passport Photo',
    panCard: 'PAN Card',
    sikkimCertificate: 'Sikkim Certificate',
    dobProof: 'DOB Proof',
    nocLandlord: 'NOC from Landlord',
    role: 'Role',
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    aadhaar: 'Aadhaar',
    emailId: 'Email ID',
    sikkimSubject: 'Sikkim Subject',
    address: 'Address',
    applicationYear: 'Application Year',
    applicationDate: 'Application Date',
    district: 'District',
    aadhaarCard: 'Aadhaar Card',
    residentialCertificate: 'Residential Certificate',
    dateofBirthProof: 'Date of Birth Proof'
  };

  dropdownFields: { [key: string]: any[] } = {
    exciseDistrict: [],
    licenseCategory: [],
    exciseSubdivision: [],
    license: ['New', 'License A', 'License B', 'License C'],
    licenseType: [],
    licenseNature: ['Regular', 'Temporary', 'Seasonal', 'Special Event'],
    functioningStatus: ['Yes', 'No'],
    modeOfOperation: ['Self', 'Salesman', 'Barman'],
    siteSubdivision: [],
    policeStation: [],
    locationCategory: ['Gyalshing', 'Namchi', 'Gangtok', 'Mangan', 'Rangpo', 'Jorethang', 'Singtam', 'Pakyong', 'Soreng', 'Chungthang'],
    locationName: ['Location 1', 'Location 2', 'Location 3', 'Location 4'],
    wardName: ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'],
    roadName: ['Road 1', 'Road 2', 'Road 3', 'Road 4'],
    status: ['Single', 'Married', 'Divorced'],
    nationality: ['Indian', 'Foreign'],
    gender: ['Male', 'Female'],
    booleanOptions: [true, false],
    licenseSubCategory: [],
    siteType: ['New', 'Existing'],
    residentialStatus: ['Resident', 'Non-Resident'],
    constructionType: ['Permanent', 'Temporary', 'Semi-Permanent'],
    role: ['Salesman', 'Barman']
  };

  isLoading = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { unifiedApp: UnifiedApplication, tableType: string },
    protected override baseDependency: BaseDependency,
    private dialogRef: MatDialogRef<MaterialModule>,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private unifiedService: UnifiedDashboardService,
    protected override licenseAppService: LicenseApplicationService,
    protected override salesmanBarmanService: SalesmanBarmanRegistrationService
  ) {
    super(baseDependency);
    this.unifiedApp = data.unifiedApp;
    this.tableType = data.tableType;
  }

  ngOnInit(): void {
    this.isLoading = true;

    // Load master data first
    this.loadDropdownOptions().subscribe(dropdowns => {
      this.masterData.districts = dropdowns.exciseDistrict;
      this.masterData.licenseCategories = dropdowns.licenseCategory;
      this.masterData.subdivisions = dropdowns.subdivision;
      this.masterData.policeStations = dropdowns.policeStation;
      this.masterData.licenseTypes = dropdowns.licenseType;

      this.dropdownFields['exciseDistrict'] = dropdowns.exciseDistrict;
      this.dropdownFields['licenseCategory'] = dropdowns.licenseCategory;
      this.dropdownFields['exciseSubdivision'] = dropdowns.subdivision;
      this.dropdownFields['siteSubdivision'] = dropdowns.subdivision;
      this.dropdownFields['policeStation'] = dropdowns.policeStation;
      this.dropdownFields['licenseType'] = dropdowns.licenseType;
      this.dropdownFields['siteDistrict'] = dropdowns.exciseDistrict;

      // Load application details
      this.unifiedService.getApplicationDetail(this.unifiedApp.applicationId, this.unifiedApp.type).subscribe({
        next: (fullApp) => {
          this.application = fullApp;
          this.application.type = this.unifiedApp.type;

          this.photoUrl = this.application.photo || this.application.passPhoto || this.application.pass_photo
            ? `${environment.apiBaseUrl}/${this.application.photo || this.application.passPhoto || this.application.pass_photo}`
            : null;

          if (this.application.type === 'new-license') {
            this.masterService.getLicenseSubcategories().subscribe(subcats => {
              this.masterData.licenseSubCategories = subcats;
              this.dropdownFields['licenseSubCategory'] = subcats;
              this.buildDisplaySections();
              this.fetchObjections();
            });
          } else {
            this.buildDisplaySections();
            this.fetchObjections();
          }

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to fetch application details', err);
          Swal.fire('Error', 'Failed to load application details.', 'error');
          this.isLoading = false;
          this.dialogRef.close();
        }
      });
    });
  }

  // Dynamic data array to replace specific sections
  dynamicDisplayData: FieldDisplay[] = [];

  private buildDisplaySections(): void {
    // Generate dynamic data from the application object
    this.dynamicDisplayData = this.generateDynamicDisplayData();
  }

  private generateDynamicDisplayData(): FieldDisplay[] {
    if (!this.application) return [];

    const excludedKeys = [
      'id', 'application_id', 'applicationId', 'created_at', 'updated_at',
      'is_approved', 'print_count', 'is_print_fee_paid', 'workflow',
      'current_stage', 'applicant', 'transactions', 'objections', 'type'
    ];

    const displayList: FieldDisplay[] = [];
    const keys = Object.keys(this.application);

    keys.forEach(key => {
      // Skip excluded keys, internal keys (_), or empty values if desired
      if (excludedKeys.includes(key) || key.startsWith('_')) return;

      // Skip keys that are foreign key IDs if a corresponding _name or object exists
      // (Simple heuristic: if 'foo_id' exists, maybe skip it? keeping it simple for now)

      let value = this.application[key];

      // Handle nested objects by converting to string or skipping
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) return; // Skip arrays (transactions, etc)
        // For objects, maybe try to show 'name' or 'district' property?
        // Or just skip for flat display
        return;
      }

      // Use robust lookup logic (reusing getFieldDisplayList logic implicitly or explicitly)
      // Actually, since we are iterating keys, 'value' is already here.
      // But we might want the 'Display Name' if this is a code field.
      // E.g. key='license_category' value=1. We want 'license_category_name'.

      // Check if there is a corresponding 'Name' field for this key
      if (keys.includes(key + '_name') || keys.includes(key.replace(/_id$/, '') + '_name') || keys.includes(key + 'Name')) {
        return; // Skip the ID field, let the Name field show instead
      }

      // Use the existing label map or beautify the key
      const label = this.fieldLabelMap[key] ||
        this.fieldLabelMap[key.replace(/Name$/, '')] ||
        this.fieldLabelMap[this.toCamelCase(key)] ||
        key.replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim();

      displayList.push({
        key: label,
        field: key,
        value: (value !== undefined && value !== null && value !== '') ? value : '-'
      });
    });

    return displayList;
  }

  private toCamelCase(s: string) {
    return s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }



  getOptionLabel(field: string, option: any): string {
    if (typeof option === 'string') return option;

    switch (field) {
      case 'licenseCategory':
        return option.licenseCategory || option.license_category || option.name;
      case 'licenseType':
        return option.licenseType || option.license_type || option.name;
      case 'exciseDistrict':
      case 'siteDistrict':
        return option.district || option.site_district || option.name;
      case 'exciseSubdivision':
      case 'siteSubdivision':
        return option.subdivision || option.site_subdivision || option.name;
      case 'policeStation':
        return option.policeStation || option.police_station || option.name;
      case 'licenseSubCategory':
        return option.licenseSubCategory || option.license_sub_category || option.name;
      default:
        return option.name || option.toString();
    }
  }

  getOptionValue(field: string, option: any): any {
    const meta = this.fieldMetaMap[field];
    if (typeof option === 'string') return option;
    return option?.[meta?.submitKey] ?? option?.id;
  }

  getFieldDisplayList(fields: string[]) {
    return fields.map(field => {
      // Helper to convert snake_case to camelCase
      const toCamel = (s: string) => s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

      const snakeName = field + '_name';
      const camelKey = toCamel(field);
      const camelName = camelKey + 'Name';
      const camelNameLower = camelKey + 'name'; // Edge case licensecategoryname vs licenseCategoryName
      const camelFullName = camelKey.replace('Name', '') + 'FullName'; // fallback for applicantName -> applicantFullName

      // Lookup strategy:
      const value =
        this.application[snakeName] ??
        this.application[camelName] ??
        this.application[camelKey] ??
        this.application[camelFullName] ??
        this.application[camelNameLower] ??
        this.application[field.replace(/([A-Z])/g, '_$1').toLowerCase()] ??
        this.application[field];

      return {
        key: this.fieldLabelMap[camelKey] || this.fieldLabelMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        field, // Keep original field for objection matching
        value: (value !== undefined && value !== null && value !== '') ? value : '-'
      };
    });
  }

  fetchObjections() {
    const appId = this.getApplicationId();
    if (!this.application || !appId) {
      console.warn('Application not loaded yet, skipping objection fetch');
      return;
    }

    this.unifiedService.getObjections(appId).subscribe({
      next: (data) => {
        this.objections = data;
        this.initializeResolveForm();
        this.isObjectionLoaded = true;
      },
      error: (err) => {
        console.error('Failed to fetch objections', err);
        this.isObjectionLoaded = true;
      }
    });
  }

  initializeResolveForm(): void {
    const group: any = {};

    for (const obj of this.objections.filter(o => !o.isResolved)) {
      const meta = this.fieldMetaMap[obj.fieldName] || {};
      const validators = [Validators.required];

      if (meta.pattern) {
        validators.push(Validators.pattern(meta.pattern));
      }

      let initialValue = this.application[obj.fieldName] || this.application[obj.fieldName.toLowerCase().replace(/_/g, '')];

      if (meta.type === 'dropdown' && meta.source) {
        const dropdownList = this.dropdownFields[meta.source] || [];

        if (meta.submitKey) {
          const match = dropdownList.find((item: any) =>
            item[meta.submitKey] === initialValue || item.id === initialValue
          );
          initialValue = match || null;
        }
      }

      group[obj.fieldName] = new FormControl(initialValue, validators);
    }

    this.resolveObjectionForm = new FormGroup(group);
  }

  hasObjection(field: string): boolean {
    return this.objections.some(obj => obj.fieldName === field && !obj.isResolved);
  }

  hasAnyObjections(): boolean {
    return this.objections.some(obj => this.hasObjection(obj.fieldName));
  }

  getObjectionRemarks(field: string): string {
    return this.objections.find(obj => obj.fieldName === field && !obj.isResolved)?.remarks || '';
  }

  get unresolvedObjections(): Objection[] {
    return this.objections.filter(obj => !obj.isResolved);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.resolveObjectionForm.get('photo')?.setValue(file);
    }
  }

  loadDropdownOptions(): Observable<any> {
    return forkJoin({
      exciseDistrict: this.masterService.getDistrict(),
      licenseCategory: this.masterService.getLicenseCategories(),
      subdivision: this.masterService.getSubdivision(),
      policeStation: this.masterService.getPoliceStations(),
      licenseType: this.masterService.getLicenseTypes()
    });
  }

  submitResolvedData() {
    const appId = this.getApplicationId();
    if (!this.application || !appId) {
      Swal.fire('Error', 'Application data not loaded yet.', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: 'You are about to submit corrected information to resolve objections.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, submit',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        const formValue = this.resolveObjectionForm.value;
        const transformed: any = {};

        for (const key in formValue) {
          if (formValue.hasOwnProperty(key)) {
            const meta = this.fieldMetaMap[key];
            const selected = formValue[key];

            if (meta?.type === 'file') {
              transformed[key] = selected;
            }
            else if (meta?.type === 'dropdown') {
              if (meta.submitKey && typeof selected === 'object') {
                transformed[key] = selected[meta.submitKey];
              } else {
                transformed[key] = selected;
              }
            }
            else {
              transformed[key] = selected;
            }
          }
        }

        const formData = FormDataUtil.buildFormData(transformed);

        this.unifiedService.resolveObjections(appId, this.application.type, formData).subscribe({
          next: () => {
            Swal.fire('Success', 'Objections resolved and data updated.', 'success').then(() => {
              this.dialogRef.close(true);
            });
          },
          error: (err) => {
            const status = Number(err?.status || 0);
            const raw = err?.error;
            const message = String(err?.message || '');

            if (status === 0 || message.toLowerCase().includes('failed to fetch')) {
              // Usually CORS / network / DNS / server down / blocked request.
              Swal.fire('Error', 'Network error while submitting corrections (Failed to fetch). Please check API connectivity / CORS and login session, then retry.', 'error');
              return;
            }

            if (typeof raw === 'string' && raw.trim().startsWith('<')) {
              // Backend returned an HTML error page (403/CSRF/login/proxy).
              const hint = status === 403
                ? 'Not authorized (403). Please login again, then retry.'
                : 'Request blocked. Please login again, then retry.';
              Swal.fire('Error', hint, 'error');
              return;
            }

            const msg =
              raw?.detail ||
              raw?.message ||
              (typeof raw === 'string' ? raw : '') ||
              err?.message ||
              'Failed to submit corrections.';
            Swal.fire('Error', String(msg), 'error');
          }
        });
      }
    });
  }

  payLicenseFee() {
    const appId = this.getApplicationId();
    if (!this.application || !appId) {
      Swal.fire('Error', 'Application not loaded.', 'error');
      return;
    }

    const appType = this.application.type;

    if (appType === 'new-license') {
      const licenseFee = Number(
        this.application.license_fee_amount ??
          this.application.licenseFeeAmount ??
          this.application.yearly_license_fee ??
          this.application.yearlyLicenseFee ??
          0
      );
      const securityFee = Number(this.application.security_fee_amount ?? this.application.securityFeeAmount ?? 0);
      const total = licenseFee + securityFee;

      Swal.fire({
        title: 'Confirm Payment',
        html: `License Fee: â‚¹${licenseFee || 0}<br>Security Fee: â‚¹${securityFee || 0}<br><b>Total: â‚¹${total || 0}</b>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Pay from Wallet',
        cancelButtonText: 'Cancel'
      }).then(result => {
        if (!result.isConfirmed) return;

        Swal.fire({
          title: 'Processing Payment...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        forkJoin([
          this.licenseAppService.payNewLicenseFee(appId, new FormData()),
          this.licenseAppService.payNewLicenseSecurityFee(appId),
        ]).subscribe({
          next: () => {
            Swal.fire({
              title: 'Success!',
              text: 'Fees paid successfully.',
              icon: 'success',
              confirmButtonText: 'OK'
            }).then(() => {
              this.dialogRef.close(true);
            });
          },
          error: (err) => {
            console.error('Error paying fees:', err);
            Swal.fire({
              title: 'Error',
              text: err?.error?.detail || 'Failed to pay fees. Please check wallet balance and try again.',
              icon: 'error'
            });
          }
        });
      });

      return;
    }

    Swal.fire({
      title: 'Confirm Payment',
      text: `Fee Amount: ₹${this.application.yearly_license_fee || this.application.yearlyLicenseFee || 0}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, I have received payment',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Processing Payment...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        let getNextStages$: Observable<any[]>;

        if (appType === 'salesman-barman') {
          getNextStages$ = this.salesmanBarmanService.getNextStages(appId);
        } else if (appType === 'new-license') {
          getNextStages$ = this.licenseAppService.getNewLicenseNextStages(appId);
        } else {
          getNextStages$ = this.licenseAppService.getNextStages(appId);
        }

        getNextStages$.subscribe({
          next: (stages: any[]) => {
            console.log('✅ Next stages:', stages);

            // Find the "approved" stage
            const approvalStage = stages.find(s =>
              s.name === 'approved' ||
              s.stage_name === 'approved' ||
              s.id === 'approved' ||
              String(s.id).toLowerCase() === 'approved'
            ) || stages[0];

            if (!approvalStage) {
              Swal.fire('Error', 'No approval stage found.', 'error');
              return;
            }

            const stageId = approvalStage.id || approvalStage.stage_id;

            // ✅ Select the correct advance method based on application type
            let advance$: Observable<any>;

            if (appType === 'salesman-barman') {
              advance$ = this.salesmanBarmanService.advanceStage(appId, stageId, {
                payment_confirmed: true,
                remarks: 'Payment received and confirmed by licensee'
              });
            } else if (appType === 'new-license') {
              advance$ = this.licenseAppService.advanceNewLicenseApplication(appId, stageId, {
                payment_confirmed: true,
                remarks: 'Payment received and confirmed by licensee'
              });
            } else {
              advance$ = this.licenseAppService.advanceApplication(appId, stageId, {
                payment_confirmed: true,
                remarks: 'Payment received and confirmed by licensee'
              });
            }

            advance$.subscribe({
              next: () => {
                Swal.fire({
                  title: 'Success!',
                  text: 'Payment confirmed and application approved successfully.',
                  icon: 'success',
                  confirmButtonText: 'OK'
                }).then(() => {
                  this.dialogRef.close(true);
                });
              },
              error: (err) => {
                console.error('Error advancing application:', err);
                Swal.fire({
                  title: 'Error',
                  text: err?.error?.detail || 'Failed to process payment. Please try again.',
                  icon: 'error'
                });
              }
            });
          },
          error: (err) => {
            console.error('Error fetching next stages:', err);
            Swal.fire('Error', 'Failed to fetch approval stages.', 'error');
          }
        });
      }
    });
  }

  onEdit(stepper: any): void {
    if (this.application.type === 'license-renewal' || this.application.type === 'new-license') {
      this.dialog.open(ApplyLicenseComponent, {
        data: { applicationData: this.application }
      });
    } else if (this.application.type === 'salesman-barman') {
      Swal.fire('Info', 'Edit functionality for Salesman/Barman is coming soon.', 'info');
    }
  
}
  /**
   * Check if the field is a document/file field
   */
  /**
   * Get application ID handling both snake_case and camelCase
   */
  getApplicationId(): string | null {
    if (!this.application) return null;
    return this.application.application_id || 
           this.application.applicationId || 
           null;
  }

    isDocumentField(fieldName: string, value: any): boolean {
    if (!value) return false;
    
    const valueStr = value.toString().toLowerCase();
    const fieldNameLower = fieldName.toLowerCase();
    
    // List of document-related keywords
    const documentKeywords = [
      'card', 'certificate', 'proof', 'noc', 'pan', 'aadhaar', 
      'aadhar', 'cin', 'document', 'pdf', 'residential', 'passphoto', 'passport', 'photo'
    ];
    
    // Check if field name contains document keywords
    const isDocumentFieldName = documentKeywords.some(keyword => 
      fieldNameLower.includes(keyword)
    );
    
    // Check if value is a file path (contains /media/ or ends with common document extensions)
    const isFilePath = valueStr.includes('/media/') || 
                       valueStr.endsWith('.pdf') || 
                       valueStr.endsWith('.jpg') || 
                       valueStr.endsWith('.jpeg') || 
                       valueStr.endsWith('.png') ||
                       valueStr.endsWith('.doc') ||
                       valueStr.endsWith('.docx');
    
    return isDocumentFieldName && isFilePath;
  }

  /**
   * Get full URL for document
   */
  getDocumentUrl(value: any): string {
    if (!value) return '#';
    
    const valueStr = value.toString();
    
    // If already a full URL, return as is
    if (valueStr.startsWith('http://') || valueStr.startsWith('https://')) {
      return valueStr;
    }
    
    // Otherwise, prepend API base URL
    return `${environment.apiBaseUrl}/${valueStr}`;
  }
}
