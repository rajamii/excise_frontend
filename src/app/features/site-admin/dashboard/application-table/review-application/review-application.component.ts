import { Component, Inject, ViewChild } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { FormControl, Validators, FormGroup, FormBuilder } from '@angular/forms';
import { ApplicationStage } from '../../../../../core/models/dashboard.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { LocationFee } from '../../../../../core/models/location-fee.model';
import { MatStepper } from '@angular/material/stepper';
import Swal from 'sweetalert2';
import { AccountService } from '../../../../../core/services/account.service';
import { SiteEnquiryFormComponent } from "../site-enquiry-form/site-enquiry-form.component";
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LicenseeService } from '../../../../licensee/licensee.services';

type Objection = {
  field_name: string;
  remarks: string;
  resolved: boolean;
};

@Component({
  selector: 'app-review-application',
  imports: [MaterialModule, SiteEnquiryFormComponent],
  templateUrl: './review-application.component.html',
  styleUrl: './review-application.component.scss'
})
export class ReviewApplicationComponent {

  @ViewChild(SiteEnquiryFormComponent)
  siteEnquiryFormComponent!: SiteEnquiryFormComponent;

  remarksForm: FormGroup;
  feeForm: FormGroup;
  licenseCategoryForm: FormGroup;
  objectionForm: FormGroup;

  isObjectionLoaded = false;
  objections: Objection[] = [];
  siteEnquiryFormValid: boolean = false;

  isApproveFlow: boolean = false;
  isRejectFlow: boolean = false;
  isRejected: boolean = false;
  isObjection: boolean = false;

  application: any;
  tableType: string = '';
  photoUrl: string | null = null;
  licenseCategories: LicenseCategory[] = [];
  selectedCategory: LicenseCategory | null = null;
  locationFees: LocationFee[] = [];
  selectedLocation: LocationFee | null = null;

  // Data arrays for display sections
  licenseData: { key: string; field: string; value: string }[] = [];
  keyInfoData: { key: string; field: string; value: string }[] = [];
  addressData: { key: string; field: string; value: string }[] = [];
  unitDetailsData: { key: string; field: string; value: string }[] = [];
  memberDetailsData: { key: string; field: string; value: string }[] = [];

  objectionFields = [
    // Select license
    { key: 'exciseDistrict', label: 'Excise District' },
    { key: 'licenseCategory', label: 'License Category' },
    { key: 'exciseSubDivision', label: 'Excise Sub Division' },
    { key: 'license', label: 'License' },

    // Key info
    { key: 'licenseType', label: 'License Type' },
    { key: 'establishmentName', label: 'Establishment Name' },
    { key: 'mobileNumber', label: 'Mobile Number' },
    { key: 'emailId', label: 'Email ID' },
    { key: 'licenseNo', label: 'License Number' },
    { key: 'initialGrantDate', label: 'Initial Grant Date' },
    { key: 'renewedFrom', label: 'Renewed From' },
    { key: 'validUpTo', label: 'Valid Up To' },
    { key: 'yearlyLicenseFee', label: 'Yearly License Fee' },
    { key: 'licenseNature', label: 'License Nature' },
    { key: 'functioningStatus', label: 'Functioning Status' },
    { key: 'modeofOperation', label: 'Mode of Operation' },

    // Address
    { key: 'siteSubDivision', label: 'Site Sub Division' },
    { key: 'policeStation', label: 'Police Station' },
    { key: 'locationCategory', label: 'Location Category' },
    { key: 'locationName', label: 'Location Name' },
    { key: 'wardName', label: 'Ward Name' },
    { key: 'businessAddress', label: 'Business Address' },
    { key: 'roadName', label: 'Road Name' },
    { key: 'pinCode', label: 'PIN Code' },
    { key: 'latitude', label: 'Latitude' },
    { key: 'longitude', label: 'Longitude' },

    // Unit details (if company)
    { key: 'companyName', label: 'Company Name' },
    { key: 'companyAddress', label: 'Company Address' },
    { key: 'companyPan', label: 'Company PAN' },
    { key: 'companyCin', label: 'Company CIN' },
    { key: 'incorporationDate', label: 'Incorporation Date' },
    { key: 'companyPhoneNumber', label: 'Company Phone Number' },
    { key: 'companyEmailId', label: 'Company Email ID' },

    // Member details
    { key: 'status', label: 'Status' },
    { key: 'memberName', label: 'Member Name' },
    { key: 'fatherHusbandName', label: 'Father/Husband Name' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'gender', label: 'Gender' },
    { key: 'pan', label: 'PAN' },
    { key: 'memberMobileNumber', label: 'Member Mobile Number' },
    { key: 'memberEmailId', label: 'Member Email ID' },

    // Document
    { key: 'photo', label: 'Photograph' },
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<MaterialModule>,
    private fb: FormBuilder,
    private licenseApplicationService: LicenseApplicationService,
    private licenseeService: LicenseeService,
    protected accountService: AccountService
  ) {
    this.application = data.application;
    this.tableType = data.tableType;

    this.remarksForm = this.fb.group({
      remarks: ['', Validators.required]
    });
    this.feeForm = this.fb.group({
      location: [null, Validators.required]
    });
    this.licenseCategoryForm = this.fb.group({
      licenseCategory: [null]  // optional field for level 2
    });

    this.objectionForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.photoUrl = this.application.photo ? `http://127.0.0.1:8000/${this.application.photo}` : null;

    this.fetchObjections();

    this.licenseApplicationService.getLocationFee().subscribe({
      next: (data) => (this.locationFees = data),
      error: (err) => console.error('Error fetching location fees', err)
    });

    this.licenseeService.getLicenseCategories().subscribe({
      next: (data) => {
        this.licenseCategories = data;
        // Preselect existing category
        const currentId = this.application.licenseCategory?.id; 
        this.selectedCategory = data.find(cat => cat.id === currentId) || null;
        this.feeForm.patchValue({ licenseCategory: this.selectedCategory });
      },
      error: (err) => console.error('Error fetching license categories', err)
    });

    this.objectionFields.forEach(field => {
      this.objectionForm.addControl(field.key, new FormControl(false));
      this.objectionForm.addControl(field.key + '_remarks', new FormControl(''));
    });

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

  getCurrentRole(): string | null {
    const levels = ['level_1', 'level_2', 'level_3', 'level_4', 'level_5'];
    for (const level of levels) {
      if (this.accountService.hasAnyRole(level)) {
        return level;
      }
    }
    return null;
  }

  fetchObjections() {
    const appId = this.application.application_id;
    this.licenseApplicationService.getObjections(appId).subscribe({
      next: (data) => {
        this.objections = data;
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

  getObjectionRemarks(field: string): string {
    const match = this.objections.find(obj => obj.field_name === field && !obj.resolved);
    return match ? match.remarks : '';
  }

  onFormValidityChange(valid: boolean) {
    this.siteEnquiryFormValid = valid;
  }

  onLocationChange(selected: LocationFee) {
    this.selectedLocation = selected;
  }

  onApprove(stepper: MatStepper) {
    this.isRejected = false;
    this.isObjection = false;

    this.isApproveFlow = true;
    this.isRejectFlow = false;

    stepper.next(); // Move to next step
  }

  onReject(stepper: MatStepper) {
    this.isRejected = true;
    this.isObjection = false;

    this.isApproveFlow = false;
    this.isRejectFlow = true;

    stepper.next(); // Go to remarks
  }

  onRaiseObjection(stepper: MatStepper) {
    this.isObjection = true;
    this.isRejected = false;

    this.isApproveFlow = false;
    this.isRejectFlow = false;

    stepper.next(); // Go to objection step
  }

  onConfirm() {
    const remarks = this.remarksForm.value.remarks;
    const applicationId = this.application.application_id;

    const reloadWithSuccess = (message: string) => {
      Swal.fire('Success', message, 'success').then(() => location.reload());
      this.dialogRef.close(true);
    };

    const showError = (msg: string) => {
      Swal.fire('Error', msg, 'error');
    };

    // === REJECTION (All levels) ===
    if (this.isRejected) {
      this.licenseApplicationService
        .advanceApplication(applicationId, remarks, undefined, 'reject')
        .subscribe({
          next: () => reloadWithSuccess('Application has been rejected.'),
          error: () => showError('Something went wrong during rejection.'),
        });
      return;
    }

    // === APPROVAL ===

    // LEVEL 1
    if (this.accountService.hasAnyRole('level_1')) {
      const feeAmount = this.selectedLocation?.fee_amount;

      if (!feeAmount) {
        Swal.fire('Missing Fee', 'Please select a location before proceeding.', 'warning');
        return;
      }

      this.licenseApplicationService
        .advanceApplication(applicationId, remarks, feeAmount, 'approve')
        .subscribe({
          next: () => reloadWithSuccess('Application has been approved.'),
          error: () => showError('Something went wrong during approval.'),
        });

      return;
    }

    // LEVEL 2
    if (this.accountService.hasAnyRole('level_2')) {
      const siteEnquiryData = this.siteEnquiryFormComponent.getSiteEnquiryData();

      if (!siteEnquiryData) {
        Swal.fire('Incomplete Form', 'Please complete the Site Enquiry form before proceeding.', 'warning');
        return;
      }

      const formData = new FormData();
      formData.append('application_id', applicationId);
      formData.append('remarks', remarks);

      const selectedCategoryId = this.licenseCategoryForm.value.licenseCategory?.id;

      Object.entries(siteEnquiryData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value instanceof File ? value : value.toString());
        }
      });
      this.licenseApplicationService
        .submitSiteEnquiryData(applicationId, formData)
        .subscribe({
          next: () => {
            this.licenseApplicationService
              .advanceApplication(applicationId, remarks, undefined, 'approve', selectedCategoryId)
              .subscribe({
                next: () => reloadWithSuccess('Application has been approved.'),
                error: () => showError('Failed to update application stage.'),
              });
          },
          error: () => showError('Failed to submit site enquiry form.'),
        });

      return;
    }

    // LEVEL 3–5
    if (
      this.accountService.hasAnyRole('level_3') ||
      this.accountService.hasAnyRole('level_4') ||
      this.accountService.hasAnyRole('level_5')
    ) {
      this.licenseApplicationService
        .advanceApplication(applicationId, remarks, undefined, 'approve')
        .subscribe({
          next: () => reloadWithSuccess('Application has been approved.'),
          error: () => showError('Something went wrong during approval.'),
        });

      return;
    }

    // Unknown role fallback
    Swal.fire('Unauthorized', 'You do not have permission to perform this action.', 'error');
  }

  onSubmitObjection() {
    const selectedFields: any[] = [];

    for (const field of this.objectionFields) {
      const isSelected = this.objectionForm.get(field.key)?.value;
      const remarks = this.objectionForm.get(field.key + '_remarks')?.value;

      if (isSelected && remarks) {
        selectedFields.push({ field: field.key, remarks });
      }
    }

    if (!selectedFields.length) {
      Swal.fire('Required', 'Select at least one field with remarks.', 'warning');
      return;
    }

    const applicationId = this.application.application_id;

    this.licenseApplicationService.advanceApplication(
      applicationId,
      undefined,
      undefined,
      'raise_objection',
      undefined,
      selectedFields  // new argument in API for objection fields
    ).subscribe({
      next: () => {
        Swal.fire('Success', 'Objection raised successfully.', 'success').then(() => location.reload());
      },
      error: () => Swal.fire('Error', 'Failed to raise objection.', 'error')
    });
  }

}
