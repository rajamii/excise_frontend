import { Component, inject, Inject, OnInit } from '@angular/core';
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

// Interface to describe how a field will be displayed in the UI
export interface FieldDisplay {
  key: string;
  field: string;
  value: string;
}

@Component({
  selector: 'app-view-application',
  imports: [MaterialModule],
  templateUrl: './view-application.component.html',
  styleUrl: './view-application.component.scss'
})
export class ViewApplicationComponent extends BaseComponent implements OnInit{
  resolveObjectionForm!: FormGroup;
  application: any;
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

  fieldMetaMap: { [key: string]: any } = {
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
    fatherHusbandName: { type: 'text' }
  };

  // Field label mapping for display and objections
  fieldLabelMap: { [key: string]: string } = {
    // License details
    exciseDistrict: 'Excise District',
    licenseCategory: 'License Category',
    exciseSubdivision: 'Excise Sub-Division',
    license: 'License',

    // Key Info
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

    // Address
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

    // Unit Details
    companyName: 'Company Name',
    companyAddress: 'Company Address',
    companyPan: 'Company PAN',
    companyCin: 'Company CIN',
    incorporationDate: 'Incorporation Date',
    companyPhoneNumber: 'Company Phone Number',
    companyEmail: 'Company Email ID',

    // Member Details
    status: 'Status',
    memberName: 'Member Name',
    fatherHusbandName: 'Father/Husband Name',
    nationality: 'Nationality',
    gender: 'Gender',
    pan: 'PAN',
    memberMobileNumber: 'Member Mobile Number',
    memberEmail: 'Member Email ID',

    photo: 'Photo'
  };

  dropdownFields: { [key: string]: any[] } = {
    exciseDistrict: [],
    licenseCategory: [],
    exciseSubdivision: [],
    license: ['New', 'License A', 'License B', 'License C'],
    licenseType: [],
    licenseNature: ['Regular', 'Temporary', 'Seasonal', 'Special Event'],
    functioningStatus: ['Yes', 'No'],
    modeofOperation: ['Self', 'Salesman', 'Barman'],
    siteSubdivision: [],
    policeStation: [],
    locationCategory: ['Gyalshing', 'Namchi', 'Gangtok', 'Mangan', 'Rangpo', 'Jorethang', 'Singtam', 'Pakyong', 'Soreng', 'Chungthang'],
    locationName: ['Location 1', 'Location 2', 'Location 3', 'Location 4'],
    wardName: ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'],
    roadName: ['Road 1', 'Road 2', 'Road 3', 'Road 4'],
    status: ['Single', 'Married', 'Divorced'],
    nationality: ['Indian', 'Foreign'],
    gender: ['Male', 'Female'],
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    deps: BaseDependency,
    private dialogRef: MatDialogRef<MaterialModule>,
    private fb: FormBuilder,
    private dialog: MatDialog,
  ) {
    super(deps)
    this.application = data.application;
    this.tableType = data.tableType;
  }

  ngOnInit(): void {
    // Set photo URL if photo exists
    this.photoUrl = this.application.photo ? `http://127.0.0.1:8000/${this.application.photo}` : null;

      // First load dropdowns
  this.loadDropdownOptions().subscribe(dropdowns => {
    this.dropdownFields['exciseDistrict'] = dropdowns.exciseDistrict;
    this.dropdownFields['licenseCategory'] = dropdowns.licenseCategory;
    this.dropdownFields['exciseSubdivision'] = dropdowns.subdivision;
    this.dropdownFields['siteSubdivision'] = dropdowns.subdivision;
    this.dropdownFields['policeStation'] = dropdowns.policeStation;
    this.dropdownFields['licenseType'] = dropdowns.licenseType;

    // Then fetch objections and initialize form
    this.fetchObjections();
  });

    // Group application data into sections for display
    this.licenseData = this.getFieldDisplayList([
      'exciseDistrict', 'licenseCategory', 'exciseSubdivision', 'license'
    ]);
    this.keyInfoData = this.getFieldDisplayList([
      'licenseType', 'establishmentName', 'mobileNumber', 'email', 'licenseNo',
      'initialGrantDate', 'renewedFrom', 'validUpTo', 'yearlyLicenseFee',
      'licenseNature', 'functioningStatus', 'modeOfOperation'
    ]);
    this.addressData = this.getFieldDisplayList([
      'siteSubdivision', 'policeStation', 'locationCategory', 'locationName',
      'wardName', 'businessAddress', 'roadName', 'pinCode', 'latitude', 'longitude'
    ]);
    this.unitDetailsData = this.getFieldDisplayList([
      'companyName', 'companyAddress', 'companyPan', 'companyCin',
      'incorporationDate', 'companyPhoneNumber', 'companyEmail'
    ]);
    this.memberDetailsData = this.getFieldDisplayList([
      'status', 'memberName', 'fatherHusbandName', 'nationality',
      'gender', 'pan', 'memberMobileNumber', 'memberEmail'
    ]);
    this.memberDetailsData.push({
      key: 'Photo',
      field: 'photo',
      value: this.photoUrl || 'N/A'
    });
  }

  getOptionLabel(field: string, option: any): string {
    switch (field) {
      case 'licenseCategory':
        return option.licenseCategory;
      case 'licenseType':
        return option.licenseType;
      case 'exciseDistrict':
        return option.district;
      case 'exciseSubdivision':
      case 'siteSubdivision':
        return option.subdivision;
      case 'policeStation':
        return option.policeStation;
      default:
        return option.toString(); // for hardcoded strings
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
      const displayValueKey = field + 'Name';
      const value =
        this.application[displayValueKey] !== undefined
          ? this.application[displayValueKey]
          : this.application[field];

      return {
        key: this.fieldLabelMap[field] || field,
        field, // retain original field for objection tracking
        value: value || '-'
      };
    });
  }

  fetchObjections() {
    // Fetch objections related to the application from backend
    this.licenseAppService.getObjections(this.application.applicationId).subscribe({
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

      let initialValue = this.application[obj.fieldName];

      // ✅ If dropdown
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
      this.resolveObjectionForm.get('photo')?.setValue(file);
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


  submitResolvedData() {
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
        console.log('Submitting resolved form:', formValue);

        this.licenseAppService.resolveObjections(this.application.applicationId, formData).subscribe({
          next: () => {
            Swal.fire('Success', 'Objections resolved and data updated.', 'success').then(() => location.reload());
          },
          error: () => Swal.fire('Error', 'Error updating application.', 'error')
        });
      }
    });
  }

  payLicenseFee() {
    this.licenseAppService.payLicenseFee(this.application.applicationId).subscribe({
      next: () => {
        Swal.fire('Success', 'License Fee Paid.', 'success').then(() => location.reload());
      },
      error: () => Swal.fire('Error', 'Payment error.', 'error')
    });
  }

  // Method to handle application updation
  onEdit(application: any): void {
    this.dialog.open(ApplyLicenseComponent, {
      data: { applicationData: application }
    });
  }

  // Deletes the current application
  onDelete(application: any): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    }).then(result => {
      if (result.isConfirmed) {
        this.licenseAppService.deleteApplication(this.application.applicationId).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Application has been deleted.', 'success').then(() => location.reload());
          },
          error: (err) => {
            Swal.fire('Error', err?.error?.detail, 'error');
          }
        });
      }
    });
  }

}
