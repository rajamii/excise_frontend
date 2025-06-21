import { Component, inject, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { AccountService } from '../../../../../core/services/account.service';
import { ApplyLicenseComponent } from '../../../apply-license/apply-license.component';
import { LicenseeService } from '../../../licensee.services';
import Swal from 'sweetalert2';

type Objection = {
  field_name: string;
  remarks: string;
  resolved: boolean;
};

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

  // Data arrays for display sections
  licenseData: { key: string; field: string; value: string }[] = [];
  keyInfoData: { key: string; field: string; value: string }[] = [];
  addressData: { key: string; field: string; value: string }[] = [];
  unitDetailsData: { key: string; field: string; value: string }[] = [];
  memberDetailsData: { key: string; field: string; value: string }[] = [];

  objections: Objection[] = [];

  dropdownFields: { [key: string]: any[] } = {
    exciseDistrict: [],
    licenseCategory: [],
    exciseSubDivision: [],
    license: ['New', 'License A', 'License B', 'License C'],
    licenseType: [],
    licenseNature: ['Regular', 'Temporary', 'Seasonal', 'Special Event'],
    functioningStatus: ['Yes', 'No'],
    modeofOperation: ['Self', 'Salesman', 'Barman'],
    siteSubDivision: [],
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
    this.photoUrl = this.application.photo ? `http://127.0.0.1:8000/${this.application.photo}` : null;

    this.fetchObjections();

    this.loadDropdownOptions()

    // Initialize display arrays
    this.licenseData = [
      { key: 'Excise District', field: 'exciseDistrict', value: this.application.exciseDistrict || 'N/A' },
      { key: 'License Category', field: 'licenseCategory', value: this.application.licenseCategory || 'N/A' },
      { key: 'Excise Sub-Division', field: 'exciseSubDivision', value: this.application.exciseSubDivision || 'N/A' },
      { key: 'License', field: 'license', value: this.application.license || 'N/A' }
    ];

    this.keyInfoData = [
      { key: 'License Type', field: 'licenseType', value: this.application.licenseType || 'N/A' },
      { key: 'Establishment Name', field: 'establishmentName', value: this.application.establishmentName || 'N/A' },
      { key: 'Mobile Number', field: 'mobileNumber', value: this.application.mobileNumber || 'N/A' },
      { key: 'Email ID', field: 'emailId', value: this.application.emailId || 'N/A' },
      { key: 'License No', field: 'licenseNo', value: this.application.licenseNo || 'N/A' },
      { key: 'Initial Grant Date', field: 'initialGrantDate', value: this.application.initialGrantDate || 'N/A' },
      { key: 'Renewed From', field: 'renewedFrom', value: this.application.renewedFrom || 'N/A' },
      { key: 'Valid Up To', field: 'validUpTo', value: this.application.validUpTo || 'N/A' },
      { key: 'Yearly License Fee', field: 'yearlyLicenseFee', value: this.application.yearlyLicenseFee || 'N/A' },
      { key: 'License Nature', field: 'licenseNature', value: this.application.licenseNature || 'N/A' },
      { key: 'Functioning Status', field: 'functioningStatus', value: this.application.functioningStatus || 'N/A' },
      { key: 'Mode of Operation', field: 'modeofOperation', value: this.application.modeofOperation || 'N/A' }
    ];

    this.addressData = [
      { key: 'Site Sub-Division', field: 'siteSubDivision', value: this.application.siteSubDivision || 'N/A' },
      { key: 'Police Station', field: 'policeStation', value: this.application.policeStation || 'N/A' },
      { key: 'Location Category', field: 'locationCategory', value: this.application.locationCategory || 'N/A' },
      { key: 'Location Name', field: 'locationName', value: this.application.locationName || 'N/A' },
      { key: 'Ward Name', field: 'wardName', value: this.application.wardName || 'N/A' },
      { key: 'Business Address', field: 'businessAddress', value: this.application.businessAddress || 'N/A' },
      { key: 'Road Name', field: 'roadName', value: this.application.roadName || 'N/A' },
      { key: 'Pin Code', field: 'pinCode', value: this.application.pinCode || 'N/A' },
      { key: 'Latitude', field: 'latitude', value: this.application.latitude || 'N/A' },
      { key: 'Longitude', field: 'longitude', value: this.application.longitude || 'N/A' }
    ];

    this.unitDetailsData = [
      { key: 'Company Name', field: 'companyName', value: this.application.companyName || 'N/A' },
      { key: 'Company Address', field: 'companyAddress', value: this.application.companyAddress || 'N/A' },
      { key: 'Company PAN', field: 'companyPan', value: this.application.companyPan || 'N/A' },
      { key: 'Company CIN', field: 'companyCin', value: this.application.companyCin || 'N/A' },
      { key: 'Incorporation Date', field: 'incorporationDate', value: this.application.incorporationDate || 'N/A' },
      { key: 'Company Phone Number', field: 'companyPhoneNumber', value: this.application.companyPhoneNumber || 'N/A' },
      { key: 'Company Email ID', field: 'companyEmailId', value: this.application.companyEmailId || 'N/A' }
    ];

    this.memberDetailsData = [
      { key: 'Status', field: 'status', value: this.application.status || 'N/A' },
      { key: 'Member Name', field: 'memberName', value: this.application.memberName || 'N/A' },
      { key: 'Father/Husband Name', field: 'fatherHusbandName', value: this.application.fatherHusbandName || 'N/A' },
      { key: 'Nationality', field: 'nationality', value: this.application.nationality || 'N/A' },
      { key: 'Gender', field: 'gender', value: this.application.gender || 'N/A' },
      { key: 'PAN', field: 'pan', value: this.application.pan || 'N/A' },
      { key: 'Member Mobile Number', field: 'memberMobileNumber', value: this.application.memberMobileNumber || 'N/A' },
      { key: 'Member Email ID', field: 'memberEmailId', value: this.application.memberEmailId || 'N/A' }
    ];

    this.memberDetailsData.push({
      key: 'Photo',
      field: 'photo',
      value: this.photoUrl || 'N/A'
    });

  }

  fieldLabelMap: { [key: string]: string } = {
    // License details
    exciseDistrict: 'Excise District',
    licenseCategory: 'License Category',
    exciseSubDivision: 'Excise Sub-Division',
    license: 'License',

    // Key Info
    licenseType: 'License Type',
    establishmentName: 'Establishment Name',
    mobileNumber: 'Mobile Number',
    emailId: 'Email ID',
    licenseNo: 'License Number',
    initialGrantDate: 'Initial Grant Date',
    renewedFrom: 'Renewed From',
    validUpTo: 'Valid Up To',
    yearlyLicenseFee: 'Yearly License Fee',
    licenseNature: 'License Nature',
    functioningStatus: 'Functioning Status',
    modeofOperation: 'Mode of Operation',

    // Address
    siteSubDivision: 'Site Sub-Division',
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
    companyEmailId: 'Company Email ID',

    // Member Details
    status: 'Status',
    memberName: 'Member Name',
    fatherHusbandName: 'Father/Husband Name',
    nationality: 'Nationality',
    gender: 'Gender',
    pan: 'PAN',
    memberMobileNumber: 'Member Mobile Number',
    memberEmailId: 'Member Email ID',

    photo: 'Upload Photo'
  };

  fetchObjections() {
    const appId = this.application.application_id;
    this.licenseApplicationService.getObjections(appId).subscribe({
      next: (data) => {
        this.objections = data;
        this.initializeResolveForm();
        this.isObjectionLoaded = true;  // ✅ mark as loaded
      },
      error: (err) => {
        console.error('Failed to fetch objections', err);
        this.isObjectionLoaded = true;
      }
    });
  }

  hasObjection(field: string): boolean {
    return this.objections.some(obj => obj.field_name === field && !obj.resolved);
  }

  hasAnyObjections(): boolean {
    return this.objections.some(obj => this.hasObjection(obj.field_name));
  } 
  
  getObjectionRemarks(field: string): string {
    const match = this.objections.find(obj => obj.field_name === field && !obj.resolved);
    return match ? match.remarks : '';
  }

  get unresolvedObjections() {
    return this.objections.filter(obj => obj.resolved === false);
  }

  loadDropdownOptions(): void {
    this.licenseeService.getDistrict().subscribe(data => {
      this.dropdownFields['exciseDistrict'] = data;
    });

    this.licenseeService.getLicenseCategories().subscribe(data => {
      this.dropdownFields['licenseCategory'] = data;
    });

    this.licenseeService.getSubDivision().subscribe(data => {
      this.dropdownFields['exciseSubDivision'] = data;
      this.dropdownFields['siteSubDivision'] = data;
    });

    this.licenseeService.getPoliceStations().subscribe(data => {
      this.dropdownFields['policeStation'] = data;
    });

    this.licenseeService.getLicenseTypes().subscribe(data => {
      this.dropdownFields['licenseType'] = data;
    });
  }

  initializeResolveForm() {
    const group: { [key: string]: FormControl } = {};
    this.objections.forEach(obj => {
      if (obj.field_name === 'photo') {
        group['photo'] = new FormControl(null, Validators.required); // initially null
      } else {
        group[obj.field_name] = new FormControl(this.application[obj.field_name] || '', Validators.required);
      }
    });
    this.resolveObjectionForm = new FormGroup(group);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.resolveObjectionForm.get('photo')?.setValue(file);
    }
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
        const formData = new FormData();

        for (const key in formValue) {
          if (formValue.hasOwnProperty(key)) {
            formData.append(key, formValue[key]);
          }
        }

        this.licenseApplicationService.resolveObjections(this.application.application_id, formData).subscribe({
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

  onDelete(application: any): void {}
}
