import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import Swal from 'sweetalert2';

import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { LicenseeService } from '../../../../licensee/licensee.services';
import { AccountService } from '../../../../../core/services/account.service';
import { SiteEnquiryFormComponent } from '../site-enquiry-form/site-enquiry-form.component';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LocationFee } from '../../../../../core/models/location-fee.model';
import { MaterialModule } from '../../../../../shared/material.module';

interface Objection {
  field_name: string;
  remarks: string;
  resolved: boolean;
}

export interface FieldDisplay {
  key: string;
  field: string;
  value: string;
}

@Component({
  selector: 'app-review-application',
  imports: [MaterialModule, SiteEnquiryFormComponent],
  templateUrl: './review-application.component.html',
  styleUrls: ['./review-application.component.scss']
})
export class ReviewApplicationComponent implements OnInit {
  @ViewChild(SiteEnquiryFormComponent) siteEnquiryFormComponent!: SiteEnquiryFormComponent;

  remarksForm!: FormGroup;
  feeForm!: FormGroup;
  licenseCategoryForm!: FormGroup;
  objectionForm!: FormGroup;

  application: any;
  tableType: string = '';

  objections: Objection[] = [];
  isObjectionLoaded = false;
  isApproveFlow = false;
  isRejectFlow = false;
  isRejected = false;
  isObjection = false;
  siteEnquiryFormValid = false;

  photoUrl: string | null = null;
  licenseCategories: LicenseCategory[] = [];
  selectedCategory: LicenseCategory | null = null;
  locationFees: LocationFee[] = [];
  selectedLocation: LocationFee | null = null;

  licenseData: any[] = [];
  keyInfoData: any[] = [];
  addressData: any[] = [];
  unitDetailsData: any[] = [];
  memberDetailsData: any[] = [];

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

    photo: 'Photo'
  };

  objectionFields = Object.entries(this.fieldLabelMap).map(([key, label]) => ({
    key,
    label
  }));

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ReviewApplicationComponent>,
    private fb: FormBuilder,
    private licenseAppService: LicenseApplicationService,
    private licenseeService: LicenseeService,
    public accountService: AccountService
  ) {
    this.application = data.application;
    this.tableType = data.tableType;
  }

  ngOnInit(): void {
    this.photoUrl = this.application.photo ? `http://127.0.0.1:8000/${this.application.photo}` : null;

    this.remarksForm = this.fb.group({ remarks: ['', Validators.required] });
    this.feeForm = this.fb.group({ location: [null, Validators.required] });
    this.licenseCategoryForm = this.fb.group({ licenseCategory: [null] });

    this.objectionForm = this.fb.group({});
    this.objectionFields.forEach(field => {
      this.objectionForm.addControl(field.key, new FormControl(false));
      this.objectionForm.addControl(field.key + '_remarks', new FormControl(''));
    });

    this.loadDropdownData();
    this.fetchObjections();
    
    this.licenseData = this.getFieldDisplayList([
      'exciseDistrict', 'licenseCategory', 'exciseSubDivision', 'license'
    ]);

    this.keyInfoData = this.getFieldDisplayList([
      'licenseType', 'establishmentName', 'mobileNumber', 'emailId', 'licenseNo',
      'initialGrantDate', 'renewedFrom', 'validUpTo', 'yearlyLicenseFee',
      'licenseNature', 'functioningStatus', 'modeofOperation'
    ]);

    this.addressData = this.getFieldDisplayList([
      'siteSubDivision', 'policeStation', 'locationCategory', 'locationName',
      'wardName', 'businessAddress', 'roadName', 'pinCode', 'latitude', 'longitude'
    ]);

    this.unitDetailsData = this.getFieldDisplayList([
      'companyName', 'companyAddress', 'companyPan', 'companyCin',
      'incorporationDate', 'companyPhoneNumber', 'companyEmailId'
    ]);

    this.memberDetailsData = this.getFieldDisplayList([
      'status', 'memberName', 'fatherHusbandName', 'nationality',
      'gender', 'pan', 'memberMobileNumber', 'memberEmailId'
    ]);

    this.memberDetailsData.push({
      key: 'Photo',
      field: 'photo',
      value: this.photoUrl || 'N/A'
    });
  }

  getFieldDisplayList(fields: string[]): FieldDisplay[] {
  return fields.map(field => ({
      key: this.fieldLabelMap[field] || field,
      field,
      value: this.application[field] || 'N/A'
    }));
  }

  loadDropdownData() {
    this.licenseAppService.getLocationFee().subscribe({
      next: data => this.locationFees = data,
      error: err => console.error('Location fee error', err)
    });

    this.licenseeService.getLicenseCategories().subscribe({
      next: data => {
        this.licenseCategories = data;
        const currentId = this.application.licenseCategory?.id;
        this.selectedCategory = data.find(cat => cat.id === currentId) || null;
        this.licenseCategoryForm.patchValue({ licenseCategory: this.selectedCategory });
      },
      error: err => console.error('Category fetch error', err)
    });
  }

  fetchObjections() {
    this.licenseAppService.getObjections(this.application.application_id).subscribe({
      next: data => {
        this.objections = data;
        this.isObjectionLoaded = true;
      },
      error: err => {
        console.error('Objection fetch error', err);
        this.isObjectionLoaded = true;
      }
    });
  }

  hasObjection(field: string): boolean {
    return this.objections.some(obj => obj.field_name === field && !obj.resolved);
  }

  getObjectionRemarks(field: string): string {
    const match = this.objections.find(obj => obj.field_name === field && !obj.resolved);
    return match?.remarks || '';
  }

  onFormValidityChange(valid: boolean) {
    this.siteEnquiryFormValid = valid;
  }

  onLocationChange(selected: LocationFee) {
    this.selectedLocation = selected;
  }

  onApprove(stepper: MatStepper) {
    this.isApproveFlow = true;
    this.isRejectFlow = this.isObjection = this.isRejected = false;
    stepper.next();
  }

  onReject(stepper: MatStepper) {
    this.isRejectFlow = true;
    this.isApproveFlow = this.isObjection = false;
    this.isRejected = true;
    stepper.next();
  }

  onRaiseObjection(stepper: MatStepper) {
    this.isObjection = true;
    this.isRejected = this.isApproveFlow = this.isRejectFlow = false;
    stepper.next();
  }

  onConfirm() {
    const applicationId = this.application.application_id;
    const remarks = this.remarksForm.value.remarks;

    const showError = (msg: string) => Swal.fire('Error', msg, 'error');
    const reload = (msg: string) => {
      Swal.fire('Success', msg, 'success').then(() => location.reload());
      this.dialogRef.close(true);
    };

    if (this.isRejected) {
      this.licenseAppService.advanceApplication(
        applicationId, 
        remarks, 
        undefined, 
        'reject'
      ).subscribe({
        next: () => reload('Application rejected.'),
        error: () => showError('Rejection failed.')
      });
      return;
    }

    if (this.accountService.hasAnyRole('level_1')) {
      const fee = this.selectedLocation?.fee_amount;
      if (!fee) {
        Swal.fire('Missing Fee', 'Select a location before proceeding.', 'warning');
        return;
      }
      this.licenseAppService.advanceApplication(
        applicationId, 
        remarks, 
        fee, 
        'approve'
      ).subscribe({
        next: () => reload('Application approved.'),
        error: () => showError('Approval failed.')
      });
      return;
    }

    if (this.accountService.hasAnyRole('level_2')) {
      const siteData = this.siteEnquiryFormComponent.getSiteEnquiryData();
      if (!siteData) {
        Swal.fire('Incomplete', 'Complete site enquiry.', 'warning');
        return;
      }

      const formData = new FormData();
      formData.append('application_id', applicationId);
      formData.append('remarks', remarks);

      Object.entries(siteData).forEach(([k, v]) => {
        if (v != null) formData.append(k, v instanceof File ? v : v.toString());
      });

      const catId = this.licenseCategoryForm.value.licenseCategory?.id;
      this.licenseAppService.submitSiteEnquiryData(
        applicationId, 
        formData
      ).subscribe({
        next: () => this.licenseAppService.advanceApplication(
          applicationId, 
          remarks, 
          undefined, 
          'approve', 
          catId).subscribe({
          next: () => reload('Application approved.'),
          error: () => showError('Advancing failed.')
        }),
        error: () => showError('Site enquiry failed.')
      });
      return;
    }

    this.licenseAppService.advanceApplication(applicationId, 
      remarks, 
      undefined, 
      'approve'
    ).subscribe({
      next: () => reload('Application approved.'),
      error: () => showError('Approval failed.')
    });
  }

  onSubmitObjection() {
    const applicationId = this.application.application_id;
    const selectedFields = this.objectionFields
      .filter(f => this.objectionForm.get(f.key)?.value && this.objectionForm.get(f.key + '_remarks')?.value)
      .map(f => ({
        field: f.key,
        remarks: this.objectionForm.get(f.key + '_remarks')?.value
      }));

    if (!selectedFields.length) {
      Swal.fire('Required', 'Select at least one field with remarks.', 'warning');
      return;
    }
    
    Swal.fire({
      title: 'Raise Objection?',
      text: 'Are you sure you want to raise an objection on selected fields?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.licenseAppService.advanceApplication(
          applicationId,
          undefined,
          undefined,
          'raise_objection',
          undefined,
          selectedFields
        ).subscribe({
          next: () => Swal.fire('Success', 'Objection raised.', 'success').then(() => location.reload()),
          error: () => Swal.fire('Error', 'Objection failed.', 'error')
        });
      }
    });
  }
}
