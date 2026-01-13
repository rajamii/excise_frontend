import { Component, Inject, OnInit } from '@angular/core';
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
import { environment } from '../../../../../../environments/environment';
import { UnifiedDashboardService } from '../../../../../core/services/unified-dashboard.service';
import { UnifiedApplication } from '../../../../../core/models/unified-application.model';
import { MatProgressSpinner } from "@angular/material/progress-spinner";


export interface FieldDisplay {
  key: string;
  field: string;
  value: string;
}

@Component({
  selector: 'app-view-application',
  imports: [MaterialModule, MatProgressSpinner],
  templateUrl: './view-application.component.html',
  styleUrl: './view-application.component.scss'
})
export class ViewApplicationComponent extends BaseComponent implements OnInit {
  resolveObjectionForm!: FormGroup;
  application: UnifiedApplication | any;
  unifiedApp!: UnifiedApplication;
  tableType: string = '';
  isLoading = true;

  photoUrl: string | null = null;

  isObjectionLoaded = false;

  objections: Objection[] = [];

  // Data arrays for display sections (common + type-specific)
  licenseData: FieldDisplay[] = [];
  keyInfoData: FieldDisplay[] = [];
  addressData: FieldDisplay[] = [];
  unitDetailsData: FieldDisplay[] = [];
  memberDetailsData: FieldDisplay[] = [];

  // NEW: For new-license
  basicInfoData: FieldDisplay[] = [];
  applicantDetailsData: FieldDisplay[] = [];
  siteDetailsData: FieldDisplay[] = [];
  companyDetailsData: FieldDisplay[] = [];

  // NEW: For salesman-barman
  licenseDetailsData: FieldDisplay[] = [];
  personalDetailsData: FieldDisplay[] = [];

  // NEW: General documents for all types
  documentsData: FieldDisplay[] = [];

  fieldMetaMap: { [key: string]: any } = {
    // Existing (license-renewal)
    // API-based dropdowns (send id or code)
    exciseDistrict: { type: 'dropdown', source: 'exciseDistrict', submitKey: 'districtCode' },
    licenseCategory: { type: 'dropdown', source: 'licenseCategory', submitKey: 'id' },
    exciseSubdivision: { type: 'dropdown', source: 'exciseSubdivision', submitKey: 'subdivisionCode' },
    siteSubdivision: { type: 'dropdown', source: 'siteSubdivision', submitKey: 'subdivisionCode' },
    policeStation: { type: 'dropdown', source: 'policeStation', submitKey: 'policeStationCode' },
    licenseType: { type: 'dropdown', source: 'licenseType', submitKey: 'id' },

    // Hardcoded dropdowns
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

    // Textareas
    establishmentName: { type: 'textarea' },
    businessAddress: { type: 'textarea' },
    companyAddress: { type: 'textarea' },

    // Numbers
    licenseNo: { type: 'number' },
    latitude: { type: 'number' },
    longitude: { type: 'number' },

    // Dates
    initialGrantDate: { type: 'date' },
    renewedFrom: { type: 'date' },
    validUpTo: { type: 'date' },
    incorporationDate: { type: 'date' },

    // Patterns
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

    // File
    photo: { type: 'file' },

    // Strings
    companyName: { type: 'text' },
    memberName: { type: 'text' },
    fatherHusbandName: { type: 'text' },

    // NEW: For new-license
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

    // NEW: For salesman-barman
    role: { type: 'dropdown', source: 'role' },
    firstName: { type: 'text' },
    middleName: { type: 'text' },
    lastName: { type: 'text' },
    aadhaar: { type: 'text', pattern: PatternConstants.AADHAR }, // Assume pattern exists or add
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

  // Field label mapping for display and objections
  fieldLabelMap: { [key: string]: string } = {
    // Existing (license-renewal)
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

    // NEW: For new-license
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

    // NEW: For salesman-barman
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

    // NEW: For all types
    booleanOptions: [true, false], // For yes/no fields

    // NEW: For new-license
    licenseSubCategory: [], // Load dynamically if needed
    siteType: ['New', 'Existing'],
    residentialStatus: ['Resident', 'Non-Resident'],
    constructionType: ['Permanent', 'Temporary', 'Semi-Permanent'], // Assume options

    // NEW: For salesman-barman
    role: ['Salesman', 'Barman']
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      application: any; unifiedApp: UnifiedApplication, tableType: string 
},
    deps: BaseDependency,
    private dialogRef: MatDialogRef<MaterialModule>,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private unifiedService: UnifiedDashboardService  // NEW: Inject for unified fetch
  ) {
    super(deps);
    this.application = data?.application;
    this.unifiedApp = data.unifiedApp;
    this.tableType = data.tableType;
  }

  ngOnInit(): void {
    this.isLoading = true;

    if(!this.application?.applicationId && !this.application?.application_id) {
      console.error('No application ID found', this.application);
      return;
    }

    this.unifiedService.getApplicationDetail(this.unifiedApp.applicationId, this.unifiedApp.type).subscribe({
      next: (fullApp) => {
        this.application = fullApp;
        this.application.type = this.unifiedApp.type; // Set type for conditioning

        // Set photo/document URLs if exist (generalized)
        this.photoUrl = this.application.photo || this.application.passPhoto || this.application.pass_photo
          ? `${environment.apiBaseUrl}/${this.application.photo || this.application.passPhoto || this.application.pass_photo}`
          : null;

        // Load dropdowns (existing)
        this.loadDropdownOptions().subscribe(dropdowns => {
          this.dropdownFields['exciseDistrict'] = dropdowns.exciseDistrict;
          this.dropdownFields['licenseCategory'] = dropdowns.licenseCategory;
          this.dropdownFields['exciseSubdivision'] = dropdowns.subdivision;
          this.dropdownFields['siteSubdivision'] = dropdowns.subdivision;
          this.dropdownFields['policeStation'] = dropdowns.policeStation;
          this.dropdownFields['licenseType'] = dropdowns.licenseType;

          // NEW: Load additional if needed for other types (e.g., licenseSubCategory)
          if (this.application.type === 'new-license') {
            this.masterService.getLicenseSubcategories().subscribe(subcats => {
              this.dropdownFields['licenseSubCategory'] = subcats;
            });
          }
          // Build display sections based on type
          this.buildDisplaySections();
          // Then fetch objections and initialize form
          this.fetchObjections();
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch application details', err);
        Swal.fire('Error', 'Failed to load application details.', 'error');
        this.isLoading = false;
        this.dialogRef.close(); // Close dialog on error
      }
    });
  }

  // NEW: Build display sections based on application type
  private buildDisplaySections(): void {
    if (this.application.type === 'license-renewal') {
      this.licenseData = this.getFieldDisplayList([
        'excise_district', 'license_category', 'excise_subdivision', 'license'
      ]);
      this.keyInfoData = this.getFieldDisplayList([
        'license_type', 'establishment_name', 'mobile_number', 'email', 'license_no',
        'initial_grant_date', 'renewed_from', 'valid_up_to', 'yearly_license_fee',
        'license_nature', 'functioning_status', 'mode_of_operation'
      ]);
      this.addressData = this.getFieldDisplayList([
        'site_subdivision', 'police_station', 'location_category', 'location_name',
        'ward_name', 'business_address', 'road_name', 'pin_code', 'latitude', 'longitude'
      ]);
      this.unitDetailsData = this.getFieldDisplayList([
        'company_name', 'company_address', 'company_pan', 'company_cin',
        'incorporation_date', 'company_phone_number', 'company_email'
      ]);
      this.memberDetailsData = this.getFieldDisplayList([
        'status', 'member_name', 'father_husband_name', 'nationality',
        'gender', 'pan', 'member_mobile_number', 'member_email'
      ]);
      this.memberDetailsData.push({
        key: 'Photo',
        field: 'photo',
        value: this.photoUrl || 'N/A'
      });
    } else if (this.application.type === 'new-license') {
      this.basicInfoData = this.getFieldDisplayList([
        'license_type', 'license_category', 'license_sub_category', 'establishment_name', 'site_type'
      ]);
      this.applicantDetailsData = this.getFieldDisplayList([
        'applicant_name', 'father_husband_name', 'dob', 'gender', 'nationality', 'residential_status',
        'present_address', 'permanent_address', 'pan', 'email', 'mobile_number', 'mode_of_operation',
        'has_sikkim_certificate', 'has_excise_license', 'family_excise_license', 'criminal_conviction'
      ]);
      this.siteDetailsData = this.getFieldDisplayList([
        'site_district', 'site_subdivision', 'police_station', 'location_category', 'location_name',
        'ward_name', 'business_address', 'road_name', 'pin_code', 'construction_type', 'length',
        'breadth', 'site_owned', 'noc_obtained'
      ]);
      this.companyDetailsData = this.getFieldDisplayList([
        'company_name', 'company_address', 'company_pan', 'company_cin',
        'incorporation_date', 'company_phone_number', 'company_email'
      ]);
      this.documentsData = this.getFieldDisplayList([
        'pass_photo', 'pan_card', 'sikkim_certificate', 'dob_proof', 'noc_landlord'
      ]).map(item => ({
        ...item,
        value: item.value ? `${environment.apiBaseUrl}/${item.value}` : 'N/A'
      }));
    } else if (this.application.type === 'salesman-barman') {
      this.licenseDetailsData = this.getFieldDisplayList([
        'excise_district', 'license_category', 'license'
      ]);
      this.personalDetailsData = this.getFieldDisplayList([
        'role', 'first_name', 'middle_name', 'last_name', 'father_husband_name', 'gender', 'dob',
        'nationality', 'address', 'pan', 'aadhaar', 'mobile_number', 'email_id', 'sikkim_subject'
      ]);
      this.documentsData = this.getFieldDisplayList([
        'pass_photo', 'aadhaar_card', 'residential_certificate', 'dateof_birth_proof'
      ]).map(item => ({
        ...item,
        value: item.value ? `${environment.apiBaseUrl}/${item.value}` : 'N/A'
      }));
    }
  }

  getOptionLabel(field: string, option: any): string {
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
        return typeof option === 'object' ? option.name || option.toString() : option.toString();
    }
  }

  getOptionValue(field: string, option: any): any {
    const meta = this.fieldMetaMap[field];
    // If it's a plain string (hardcoded dropdown), return it directly
    if (typeof option === 'string') return option;

    // Else, for API dropdowns, use submitKey or id
    return option?.[meta?.submitKey] ?? option?.id;
  }

  getFieldDisplayList(fields: string[]): FieldDisplay[] {
    return fields.map(field => {
      const displayValueKey = field.replace(/_/g, '') + 'Name'; // Handle snake_case
      const value =
        this.application[displayValueKey] !== undefined
          ? this.application[displayValueKey]
          : this.application[field.replace(/([A-Z])/g, '_$1').toLowerCase()] || this.application[field]; // Handle camel/snake

      return {
        key: this.fieldLabelMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        field, // retain original for objection tracking
        value: value || '-'
      };
    });
  }

  fetchObjections() {
    if (!this.application || !this.application.application_id) {
      console.warn('Application not loaded yet, skipping objection fetch');
      return;
    }
    // Unified fetch based on type
    this.unifiedService.getObjections(this.application.applicationId).subscribe({
      next: (data) => {
        this.objections = data;
        // Initialize the form for resolving objections
        this.initializeResolveForm();
        this.isObjectionLoaded = true; // Mark objections as loaded
      },
      error: (err) => {
        console.error('Failed to fetch objections', err);
        this.isObjectionLoaded = true; // Still mark as loaded to avoid blocking UI
      }
    });
  }

  // Initializes the form used to resolve objections
  initializeResolveForm(): void {
    const group: { [key: string]: FormControl } = {};

    for (const obj of this.objections.filter(o => !o.isResolved)) {
      const meta = this.fieldMetaMap[obj.fieldName] || {};
      const validators = [Validators.required];

      if (meta.pattern) {
        validators.push(Validators.pattern(meta.pattern));
      }

      let initialValue = this.application[obj.fieldName] || this.application[obj.fieldName.toLowerCase().replace(/_/g, '')];

      // If dropdown
      if (meta.type === 'dropdown' && meta.source) {
        const dropdownList = this.dropdownFields[meta.source] || [];

        // For API-driven dropdowns, store the matched object
        if (meta.submitKey) {
          const match = dropdownList.find((item: any) =>
            item[meta.submitKey] === initialValue || item.id === initialValue
          );
          initialValue = match || null;
        }

        // For hardcoded (strings), leave as-is
      }

      group[obj.fieldName] = new FormControl(initialValue, validators);
    }

    this.resolveObjectionForm = new FormGroup(group);
  }

  // Checks if a specific field has an unresolved objection
  hasObjection(field: string): boolean {
    return this.objections.some(obj => obj.fieldName === field && !obj.isResolved);
  }

  // Determines if there is at least one unresolved objection
  hasAnyObjections(): boolean {
    return this.objections.some(obj => this.hasObjection(obj.fieldName));
  }

  // Returns remarks for the unresolved objection for a given field, if any
  getObjectionRemarks(field: string): string {
    return this.objections.find(obj => obj.fieldName === field && !obj.isResolved)?.remarks || '';
  }

  // Returns only unresolved objections for iteration in the template
  get unresolvedObjections(): Objection[] {
    return this.objections.filter(obj => !obj.isResolved);
  }

  // Handles photo file selection and sets it into the form
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.resolveObjectionForm.get('photo')?.setValue(file); // Or 'passPhoto' etc., but kept as is
    }
  }

  // Loads all dropdown values needed to populate dynamic form fields
  loadDropdownOptions(): Observable<any> {
    return forkJoin({
      exciseDistrict: this.masterService.getDistrict(),
      licenseCategory: this.masterService.getLicenseCategories(),
      subdivision: this.masterService.getSubdivision(),
      policeStation: this.masterService.getPoliceStations(),
      licenseType: this.masterService.getLicenseTypes()
    });
  }

  // Submits the resolved objection data along with updated fields
  submitResolvedData() {
    if (this.resolveObjectionForm.invalid) return;

    Swal.fire({
      title: 'Confirm Submission',
      text: 'Submit corrections for objections?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
    }).then(result => {
      if (result.isConfirmed) {
        const formValue = this.resolveObjectionForm.value;
        const remarks = formValue.remarks;
        const objection_ids = this.unresolvedObjections.map(obj => obj.id); // All unresolved

        const updated_fields: any = {};
        const formData = new FormData();

        for (const key in formValue) {
          if (key === 'remarks') continue;

          let selected = formValue[key];
          const meta = this.fieldMetaMap[key];

          if (selected instanceof File) {
            formData.append(key, selected); // Append file directly
            continue; // Skip from updated_fields
          }

          // Transform value based on meta (e.g., dropdown to ID)
          if (meta?.type === 'dropdown') {
            if (meta.submitKey && typeof selected === 'object' && selected !== null) {
              selected = selected[meta.submitKey];
            }
          } else if (meta?.type === 'date') {
            selected = selected ? new Date(selected).toISOString().split('T')[0] : null;
          } // Add other transforms if needed

          updated_fields[key] = selected;
        }

        // Append JSON-structured data
        formData.append('updated_fields', JSON.stringify(updated_fields));
        formData.append('remarks', remarks);
        if (objection_ids.length > 0) {
          formData.append('objection_ids', JSON.stringify(objection_ids));
        }

        this.unifiedService.resolveObjections(this.application.applicationId, this.application.type, formData).subscribe({
          next: () => {
            Swal.fire('Success', 'Objections resolved and data updated.', 'success').then(() => location.reload());
          },
          error: () => Swal.fire('Error', 'Error updating application.', 'error')
        });
      }
    });
  }

  // Method to handle license fee payment
  payLicenseFee() {
    if (!this.application?.applicationId) {
      Swal.fire('Error', 'Application not loaded.', 'error');
      return;
    }

    Swal.fire({
      title: 'Confirm Payment',
      text: `Pay ₹${this.application.yearlyLicenseFee || this.application.yearly_license_fee}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Pay Now'
    }).then(result => {
      if (result.isConfirmed) {
        this.unifiedService.payLicenseFee(this.application.applicationId).subscribe({
          next: (response) => {
            Swal.fire('Success', response.message || 'Payment successful. License issued.', 'success').then(() => location.reload());
          },
          error: (err) => {
            Swal.fire('Error', err?.error?.error || 'Payment failed.', 'error');
          }
        });
      }
    });
  }

  // Method to handle application updation
  onEdit(application: any): void {
    if (this.application.type === 'license-renewal' || this.application.type === 'new-license') {
      this.dialog.open(ApplyLicenseComponent, {
        data: { applicationData: application }
      });
    } else if (this.application.type === 'salesman-barman') {
      // TODO: Open Salesman/Barman edit component if available
      console.log('Edit for salesman-barman not implemented yet.');
      Swal.fire('Info', 'Edit functionality for Salesman/Barman is coming soon.', 'info');
    }
  }

}