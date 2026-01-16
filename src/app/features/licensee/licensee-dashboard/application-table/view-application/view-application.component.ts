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
  application: any;
  unifiedApp!: UnifiedApplication;
  tableType: string = '';

  photoUrl: string | null = null;
  isObjectionLoaded = false;
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

  // ✅ NEW: Get display name from master data
  getDisplayName(fieldName: string, value: any): string {
    if (!value) return '-';

    const camelField = this.toCamelCase(fieldName);
    
    switch (camelField) {
      case 'exciseDistrict':
      case 'siteDistrict':
        const district = this.masterData.districts.find((d: any) => 
          d.id === value || d.districtCode === value || d.district_code === value
        );
        return district?.district || district?.name || value;

      case 'licenseCategory':
        const category = this.masterData.licenseCategories.find((c: any) => 
          c.id === value
        );
        return category?.licenseCategory || category?.license_category || category?.name || value;

      case 'exciseSubdivision':
      case 'siteSubdivision':
        const subdivision = this.masterData.subdivisions.find((s: any) => 
          s.id === value || s.subdivisionCode === value || s.subdivision_code === value
        );
        return subdivision?.subdivision || subdivision?.name || value;

      case 'policeStation':
        const station = this.masterData.policeStations.find((p: any) => 
          p.id === value || p.policeStationCode === value || p.police_station_code === value
        );
        return station?.policeStation || station?.police_station || station?.name || value;

      case 'licenseType':
        const type = this.masterData.licenseTypes.find((t: any) => 
          t.id === value
        );
        return type?.licenseType || type?.license_type || type?.name || value;

      case 'licenseSubCategory':
        const subcat = this.masterData.licenseSubCategories.find((sc: any) => 
          sc.id === value
        );
        return subcat?.licenseSubCategory || subcat?.license_sub_category || subcat?.name || value;

      case 'gender':
        return value === 'M' || value === 'Male' ? 'Male' : value === 'F' || value === 'Female' ? 'Female' : value;

      case 'functioningStatus':
      case 'siteOwned':
      case 'nocObtained':
      case 'hasSikkimCertificate':
      case 'hasExciseLicense':
      case 'familyExciseLicense':
      case 'criminalConviction':
      case 'sikkimSubject':
        return value === true || value === 'true' || value === 'Yes' ? 'Yes' : 'No';

      default:
        return value;
    }
  }

  // ✅ Helper: Convert snake_case to camelCase
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

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
        value: item.value && item.value !== '-' ? `${environment.apiBaseUrl}/${item.value}` : null
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
        value: item.value && item.value !== '-' ? `${environment.apiBaseUrl}/${item.value}` : null
      }));
    }
  }

  getFieldDisplayList(fields: string[]): FieldDisplay[] {
    return fields.map(field => {
      const camelField = this.toCamelCase(field);
      const value = this.application[field] || this.application[camelField];

      // ✅ Get display name for dropdown fields
      let displayValue = value;
      const meta = this.fieldMetaMap[camelField];
      
      if (meta?.type === 'dropdown' && value) {
        displayValue = this.getDisplayName(camelField, value);
      } else if (meta?.type === 'date' && value) {
        displayValue = new Date(value).toLocaleDateString();
      } else if (!value) {
        displayValue = '-';
      }

      return {
        key: this.fieldLabelMap[camelField] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        field: field,
        value: displayValue
      };
    });
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

  fetchObjections() {
    if (!this.application || !this.application.application_id) {
      console.warn('Application not loaded yet, skipping objection fetch');
      return;
    }
    
    this.unifiedService.getObjections(this.application.application_id, this.application.type).subscribe({
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
    const group: { [key: string]: FormControl } = {};

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
    if (!this.application || !this.application.application_id) {
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

        this.unifiedService.resolveObjections(this.application.application_id, this.application.type, formData).subscribe({
          next: () => {
            Swal.fire('Success', 'Objections resolved and data updated.', 'success').then(() => {
              this.dialogRef.close(true);
            });
          },
          error: () => Swal.fire('Error', 'Error updating application.', 'error')
        });
      }
    });
  }

  payLicenseFee() {
    if (!this.application || !this.application.application_id) {
      Swal.fire('Error', 'Application not loaded.', 'error');
      return;
    }

    const appId = this.application.application_id;
    const appType = this.application.type;

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
}