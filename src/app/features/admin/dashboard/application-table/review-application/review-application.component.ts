import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import Swal from 'sweetalert2';
import { SiteEnquiryFormComponent } from '../site-enquiry-form/site-enquiry-form.component';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LocationFee } from '../../../../../core/models/location-fee.model';
import { MaterialModule } from '../../../../../shared/material.module';
import { Objection } from '../../../../../core/models/license-application.model';
import { FormDataUtil } from '../../../../../shared/utils/form-data.util';
import { SiteEnquiryFormModel } from '../../../../../core/models/site-enquiry.model';
import { BaseDependency } from '../../../../../base/dependency/base.dependency';
import { BaseComponent } from '../../../../../base/base.components';

// Interface to describe how a field will be displayed in the UI
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
export class ReviewApplicationComponent extends BaseComponent implements OnInit {
  @ViewChild(SiteEnquiryFormComponent) siteEnquiryFormComponent!: SiteEnquiryFormComponent;

  remarksForm!: FormGroup;
  feeForm!: FormGroup;
  licenseCategoryForm!: FormGroup;
  objectionForm!: FormGroup;

  application: any;
  tableType: string = '';

  objections: Objection[] = [];
  isObjectionLoaded = false;

  siteDetail: SiteEnquiryFormModel | null = null;
  siteDetailData: { key: string; value: any; field: string }[] = [];
  sitePdfUrl: string | null = null;

  // UI state flags to control which workflow is active
  isApproveFlow = false;
  isRejectFlow = false;
  isRejected = false;
  isObjection = false;

  siteEnquiryFormValid = false;

  photoUrl: string | null = null;

  // Dropdown and selection data
  licenseCategories: LicenseCategory[] = [];
  selectedCategory: LicenseCategory | null = null;
  locationFees: LocationFee[] = [];
  selectedLocation: LocationFee | null = null;

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

  // Transformed field-label pairs used for objection checkboxes
  objectionFields = Object.entries(this.fieldLabelMap).map(([key, label]) => ({
    key,
    label
  }));

  constructor(
    deps: BaseDependency,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<ReviewApplicationComponent>,
    private fb: FormBuilder,
  ) {
    super(deps);
    this.application = data.application;
    this.tableType = data.tableType;
  }

  ngOnInit(): void {
    // Set photo URL if photo exists
    this.photoUrl = this.application.photo ? `http://127.0.0.1:8000/${this.application.photo}` : null;

    // Initialize all forms
    this.remarksForm = this.fb.group({ remarks: ['', Validators.required] });
    this.feeForm = this.fb.group({ location: [null, Validators.required] });
    this.licenseCategoryForm = this.fb.group({ licenseCategory: [null] });

    this.objectionForm = this.fb.group({});
    // Dynamically add a checkbox and remark control for each objectionable field
    this.objectionFields.forEach(field => {
      this.objectionForm.addControl(field.key, new FormControl(false));
      this.objectionForm.addControl(field.key + '_remarks', new FormControl(''));
    });

    // Load dropdown options
    this.loadDropdownData();

    // Load existing objections if any
    this.fetchObjections();

    this.fetchSiteDetails();
    
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

    // Manually append photo field to member details
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

  loadDropdownData() {
    // Fetch location-based fee options (for Level 1)
    this.licenseAppService.getLocationFee().subscribe({
      next: data => this.locationFees = data, 
      error: err => console.error('Location fee error', err)
    });

    // Fetch license categories (for Level 2)
    this.masterService.getLicenseCategories().subscribe({
      next: data => {
        this.licenseCategories = data;

        // Try to pre-select the category already associated with the application
        const currentId = this.application.licenseCategory?.id;
        this.selectedCategory = data.find(cat => cat.id === currentId) || null;

        // Pre-fill the form control
        this.licenseCategoryForm.patchValue({ licenseCategory: this.selectedCategory });
      },
      error: err => console.error('Category fetch error', err)
    });
  }

  fetchObjections() {
    // Fetch objections related to the application from backend
    this.licenseAppService.getObjections(this.application.applicationId).subscribe({
      next: data => {
        this.objections = data;
        this.isObjectionLoaded = true; // Mark objections as loaded
      },
      error: err => {
        console.error('Objection fetch error', err);
        this.isObjectionLoaded = true; // Still mark as loaded to avoid blocking UI
      }
    });
  }

  fetchSiteDetails() {
    // Fetch objections related to the application from backend
    this.licenseAppService.getSiteDetails(this.application.applicationId).subscribe((data: SiteEnquiryFormModel) => {
      this.siteDetail = data;

      // Prepare data for display
      this.siteDetailData = [
        { key: 'Has Traditional Place', value: data.hasTraditionalPlace, field: 'hasTraditionalPlace' },
        { key: 'Traditional Place Distance', value: data.traditionalPlaceDistance, field: 'traditionalPlaceDistance' },
        { key: 'Traditional Place Name', value: data.traditionalPlaceName, field: 'traditionalPlaceName' },
        { key: 'Traditional Place Nature', value: data.traditionalPlaceNature, field: 'traditionalPlaceNature' },
        { key: 'Traditional Place Construction', value: data.traditionalPlaceConstruction, field: 'traditionalPlaceConstruction' },

        { key: 'Has Educational Institution', value: data.hasEducationalInstitution, field: 'hasEducationalInstitution' },
        { key: 'Educational Institution Distance', value: data.educationalInstitutionDistance, field: 'educationalInstitutionDistance' },
        { key: 'Educational Institution Name', value: data.educationalInstitutionName, field: 'educationalInstitutionName' },
        { key: 'Educational Institution Nature', value: data.educationalInstitutionNature, field: 'educationalInstitutionNature' },

        { key: 'Has Hospital', value: data.hasHospital, field: 'hasHospital' },
        { key: 'Hospital Distance', value: data.hospitalDistance, field: 'hospitalDistance' },
        { key: 'Hospital Name', value: data.hospitalName, field: 'hospitalName' },

        { key: 'Has Taxi Stand', value: data.hasTaxiStand, field: 'hasTaxiStand' },
        { key: 'Taxi Stand Name', value: data.taxiStandName, field: 'taxiStandName' },
        { key: 'Taxi Stand Distance', value: data.taxiStandDistance, field: 'taxiStandDistance' },

        { key: 'Is Interconnected With Shops', value: data.isInterconnectedWithShops, field: 'isInterconnectedWithShops' },
        { key: 'Interconnectivity Remarks', value: data.interconnectivityRemarks, field: 'interconnectivityRemarks' },

        { key: 'Enquiry Officer Comments', value: data.enquiryOfficerComments, field: 'enquiryOfficerComments' },
        { key: 'Shop Construction Type', value: data.shopConstructionType, field: 'shopConstructionType' },

        { key: 'Has Excise Shops Nearby', value: data.hasExciseShopsNearby, field: 'hasExciseShopsNearby' },
        { key: 'Nearby Excise Shop Count', value: data.nearbyExciseShopCount, field: 'nearbyExciseShopCount' },
        { key: 'Nearby Excise Shops Remarks', value: data.nearbyExciseShopsRemarks, field: 'nearbyExciseShopsRemarks' },

        { key: 'Is On Highway', value: data.isOnHighway, field: 'isOnHighway' },
        { key: 'Highway Name', value: data.highwayName, field: 'highwayName' },

        { key: 'Latitude', value: data.latitude, field: 'latitude' },
        { key: 'Longitude', value: data.longitude, field: 'longitude' },

        { key: 'Is Shop Size Correct', value: data.isShopSizeCorrect, field: 'isShopSizeCorrect' },
        { key: 'Shop Size Remarks', value: data.shopSizeRemarks, field: 'shopSizeRemarks' },

        { key: 'Additional Enquiry Officer Comments', value: data.additionalEnquiryOfficerComments, field: 'additionalEnquiryOfficerComments' },

        { key: 'Has ID Proof', value: data.hasIdProof, field: 'hasIdProof' },
        { key: 'ID Proof Comments', value: data.idProofComments, field: 'idProofComments' },

        { key: 'Has Age Proof', value: data.hasAgeProof, field: 'hasAgeProof' },
        { key: 'Age Proof Comments', value: data.ageProofComments, field: 'ageProofComments' },

        { key: 'Has NOC From Landlord', value: data.hasNocFromLandlord, field: 'hasNocFromLandlord' },
        { key: 'NOC Comments', value: data.nocComments, field: 'nocComments' },

        { key: 'Has Ownership Proof', value: data.hasOwnershipProof, field: 'hasOwnershipProof' },
        { key: 'Ownership Proof Comments', value: data.ownershipProofComments, field: 'ownershipProofComments' },

        { key: 'Has Trade License', value: data.hasTradeLicense, field: 'hasTradeLicense' },
        { key: 'Trade License Comments', value: data.tradeLicenseComments, field: 'tradeLicenseComments' },

        { key: 'Proposes Barman Or Salesman', value: data.proposesBarmanOrSalesman, field: 'proposesBarmanOrSalesman' },
        { key: 'Worker Proposal Comments', value: data.workerProposalComments, field: 'workerProposalComments' },

        { key: 'Worker Docs Valid', value: data.workerDocsValid, field: 'workerDocsValid' },
        { key: 'Worker Docs Comments', value: data.workerDocsComments, field: 'workerDocsComments' },

        { key: 'License Recommendation', value: data.licenseRecommendation, field: 'licenseRecommendation' },
        { key: 'Recommendation Comments', value: data.recommendationComments, field: 'recommendationComments' },

        { key: 'Special Remarks', value: data.specialRemarks, field: 'specialRemarks' },
        { key: 'Reporting Place', value: data.reportingPlace, field: 'reportingPlace' },
      ];  

      // PDF URL (safe handling)
      this.sitePdfUrl = data.shopImageDocument
        ? `http://127.0.0.1:8000/${data.shopImageDocument}`
        : '';    });
  }

  // Checks if a specific field has an unresolved objection
  hasObjection(field: string): boolean {
    return this.objections.some(obj => obj.fieldName === field && !obj.isResolved);
  }

  // Returns remarks for the unresolved objection for a given field, if any
  getObjectionRemarks(field: string): string {
    const match = this.objections.find(obj => obj.fieldName === field && !obj.isResolved);
    return match?.remarks || '';
  }

  // Track whether the embedded form (site enquiry) is valid
  onFormValidityChange(valid: boolean) {
    this.siteEnquiryFormValid = valid;
  }

  // Capture the selected location and its associated fee
  onLocationChange(selected: LocationFee) {
    this.selectedLocation = selected;
  }

  // Begin approve flow — navigate to next step and update flags
  onApprove(stepper: MatStepper) {
    this.isApproveFlow = true;
    this.isRejectFlow = this.isObjection = this.isRejected = false;
    stepper.next();
  }

  // Begin reject flow — navigate to next step and update flags
  onReject(stepper: MatStepper) {
    this.isRejectFlow = true;
    this.isApproveFlow = this.isObjection = false;
    this.isRejected = true;
    stepper.next();
  }

  // Begin objection-raising flow — navigate to next step and update flags
  onRaiseObjection(stepper: MatStepper) {
    this.isObjection = true;
    this.isRejected = this.isApproveFlow = this.isRejectFlow = false;
    stepper.next();
  }

  onConfirm() {
    const applicationId = this.application.applicationId;
    const remarks = this.remarksForm.value.remarks;

    // Utility to show error alert
    const showError = (msg: string) => Swal.fire('Error', msg, 'error');

    // Utility to show success alert and reload UI
    const reload = (msg: string) => {
      Swal.fire('Success', msg, 'success').then(() => location.reload());
      this.dialogRef.close(true);
    };

    if (this.isRejected) {
      // Reject application flow
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
      // Level 1 approval requires fee amount from selected location
      const fee = this.selectedLocation?.feeAmount;
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
      // Level 2 approval requires complete site enquiry data
      const siteData = this.siteEnquiryFormComponent.getSiteEnquiryData();
      if (!siteData) {
        Swal.fire('Incomplete', 'Complete site enquiry.', 'warning');
        return;
      }

      // Prepare combined data object
      const data: any = {
        applicationId,
        remarks,
        ...siteData
      };

      // Convert to FormData using utility (handles snake_case conversion)
      const formData = FormDataUtil.buildFormData(data);

      // Add license category ID if selected
      const catId = this.licenseCategoryForm.value.licenseCategory?.id;

      // First submit site enquiry data, then advance application
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

    // Default approve flow (for other roles or fallback)
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
    const applicationId = this.application.applicationId;

    // Collect selected objection fields with remarks
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
    
    // Confirm with user before raising objection
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
