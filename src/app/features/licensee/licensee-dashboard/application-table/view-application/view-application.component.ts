import { Component, inject, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { AccountService } from '../../../../../core/services/account.service';
import { ApplyLicenseComponent } from '../../../apply-license/apply-license.component';
import { LicenseeService } from '../../../licensee.services';
import Swal from 'sweetalert2';
import { Objection } from '../../../../../core/models/license-application.model';

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
export class ViewApplicationComponent {
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
    private dialogRef: MatDialogRef<MaterialModule>,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private licenseApplicationService: LicenseApplicationService,
    private licenseeService: LicenseeService,
    protected accountService: AccountService
  ) {
    this.application = data.application;
    this.tableType = data.tableType;
  }

  ngOnInit(): void {
    // Set photo URL if photo exists
    this.photoUrl = this.application.photo ? `http://127.0.0.1:8000/${this.application.photo}` : null;

    // Load dropdown options
    this.loadDropdownOptions()

    // Load existing objections if any
    this.fetchObjections();

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

  getFieldDisplayList(fields: string[]): FieldDisplay[] {
    return fields.map(field => ({
      key: this.fieldLabelMap[field] || field, // Friendly label
      field, // Raw field name
      value: this.application[field] || 'N/A'
    }));
  }

  fetchObjections() {
    // Fetch objections related to the application from backend
    this.licenseApplicationService.getObjections(this.application.applicationId).subscribe({
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
    for (const obj of this.objections) {
      group[obj.fieldName] = obj.fieldName === 'photo'
        // Photo requires file input
        ? new FormControl(null, Validators.required)
        // For other fields, pre-fill existing value from application
        : new FormControl(this.application[obj.fieldName] || '', Validators.required);
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
  loadDropdownOptions(): void {
    this.licenseeService.getDistrict().subscribe(data => {
      this.dropdownFields['exciseDistrict'] = data;
    });

    this.licenseeService.getLicenseCategories().subscribe(data => {
      this.dropdownFields['licenseCategory'] = data;
    });

    this.licenseeService.getSubdivision().subscribe(data => {
      this.dropdownFields['exciseSubdivision'] = data;
      this.dropdownFields['siteSubdivision'] = data;
    });

    this.licenseeService.getPoliceStations().subscribe(data => {
      this.dropdownFields['policeStation'] = data;
    });

    this.licenseeService.getLicenseTypes().subscribe(data => {
      this.dropdownFields['licenseType'] = data;
    });
  }

  // Submits corrected data to resolve objections
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
        const formData = new FormData();

        // Append each form value to FormData object
        for (const key in formValue) {
          if (formValue.hasOwnProperty(key)) {
            formData.append(key, formValue[key]);
          }
        }

        // Send resolved data to backend
        this.licenseApplicationService.resolveObjections(this.application.applicationId, formData).subscribe({
          next: () => {
            Swal.fire('Success', 'Objections resolved and data updated.', 'success').then(() => location.reload());
          },
          error: () => Swal.fire('Error', 'Error updating application.', 'error')
        });
      }
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
        this.licenseApplicationService.deleteApplication(this.application.applicationId).subscribe({
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
