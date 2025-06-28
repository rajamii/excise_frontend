import { Component, signal, Inject, Output, EventEmitter } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-site-enquiry-form',
  imports: [MaterialModule], 
  templateUrl: './site-enquiry-form.component.html',
  styleUrl: './site-enquiry-form.component.scss'
})
export class SiteEnquiryFormComponent {
  @Output() formStatus = new EventEmitter<boolean>();

  siteEnquiryForm: FormGroup;
  
/*   readonly formControlNames = [
    'hasTraditionalPlace', 'traditionalPlaceDistance', 'traditionalPlaceName', 'traditionalPlaceNature', 'traditionalPlaceConstruction',
    'hasEducationalInstitution', 'educationalInstitutionDistance', 'educationalInstitutionName', 'educationalInstitutionNature',
    'hasHospital', 'hospitalDistance', 'hospitalName',
    'hasTaxiStand', 'taxiStandDistance', 'taxiStandName',
    'isInterconnectedWithShops', 'interconnectivityRemarks',
    'enquiryOfficerComments', 'shopConstructionType', 'hasExciseShopsNearby',
    'nearbyExciseShopCount', 'nearbyExciseShopsRemarks',
    'isOnHighway', 'highwayName', 'shopImageDocument',
    'latitude', 'longitude', 'isShopSizeCorrect', 'shopSizeRemarks',
    'additionalEnquiryOfficerComments',
    'hasIdProof', 'idProofComments',
    'hasAgeProof', 'ageProofComments',
    'hasNocFromLandlord', 'nocComments',
    'hasOwnershipProof', 'ownershipProofComments',
    'hasTradeLicense', 'tradeLicenseComments',
    'proposesBarmanOrSalesman', 'workerProposalComments',
    'workerDocsValid', 'workerDocsComments',
    'licenseRecommendation', 'recommendationComments',
    'specialRemarks', 'reportingPlace'
  ]; */

  constructor(
  private fb: FormBuilder,
  @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    // Initialize reactive form with validation
    this.siteEnquiryForm = this.fb.group({
      
      hasTraditionalPlace: [null, Validators.required],
      traditionalPlaceDistance: [{ value: null, disabled: true }],
      traditionalPlaceName: [{ value: '', disabled: true }, Validators.maxLength(1000)],
      traditionalPlaceNature: [{ value: '', disabled: true }, Validators.maxLength(1000)],
      traditionalPlaceConstruction: [{ value: null, disabled: true }],

      hasEducationalInstitution: [null, Validators.required],
      educationalInstitutionDistance: [{ value: null, disabled: true }],
      educationalInstitutionName: [{ value: '', disabled: true }, Validators.maxLength(1000)],
      educationalInstitutionNature: [{ value: '', disabled: true }, Validators.maxLength(1000)],

      hasHospital: [null, Validators.required],
      hospitalDistance: [{ value: null, disabled: true }],
      hospitalName: [{ value: '', disabled: true }, Validators.maxLength(1000)],

      hasTaxiStand: [null, Validators.required],
      taxiStandName: [{ value: '', disabled: true }, Validators.maxLength(1000)],
      taxiStandDistance: [{ value: null, disabled: true }],

      isInterconnectedWithShops: [null, Validators.required],
      interconnectivityRemarks: ['', Validators.maxLength(1000)],

      enquiryOfficerComments: ['', Validators.maxLength(2000)],

      shopConstructionType: [null, Validators.required],

      hasExciseShopsNearby: [null, Validators.required],
      nearbyExciseShopCount: [{ value: null, disabled: true }],
      nearbyExciseShopsRemarks: ['', Validators.maxLength(2000)],

      isOnHighway: [null, Validators.required],
      highwayName: [{ value: '', disabled: true }, Validators.maxLength(2000)],

      shopImageDocument: [null, Validators.required],

      latitude: [null],
      longitude: [null],

      isShopSizeCorrect: [null, Validators.required],
      shopSizeRemarks: ['', Validators.maxLength(2000)],

      additionalEnquiryOfficerComments: ['', Validators.maxLength(2000)],

      hasIdProof: [null, Validators.required],
      idProofComments: ['', Validators.maxLength(1000)],

      hasAgeProof: [null, Validators.required],
      ageProofComments: ['', Validators.maxLength(1000)],

      hasNocFromLandlord: [null, Validators.required],
      nocComments: ['', Validators.maxLength(1000)],

      hasOwnershipProof: [null, Validators.required],
      ownershipProofComments: ['', Validators.maxLength(1000)],

      hasTradeLicense: [null, Validators.required],
      tradeLicenseComments: ['', Validators.maxLength(1000)],

      proposesBarmanOrSalesman: [null, Validators.required],
      workerProposalComments: ['', Validators.maxLength(1000)],

      workerDocsValid: [null, Validators.required],
      workerDocsComments: ['', Validators.maxLength(1000)],

      licenseRecommendation: [null, Validators.required],
      recommendationComments: ['', Validators.maxLength(1000)],

      specialRemarks: ['', Validators.maxLength(2000)],
      reportingPlace: ['', [Validators.required, Validators.maxLength(250)]],
    });
  }

  ngOnInit() {
    // Emit on form status change
    this.siteEnquiryForm.statusChanges.subscribe(() => {
      this.formStatus.emit(this.siteEnquiryForm.valid);

/*       for (const name of this.formControlNames) {
        const error = this.getErrorMessage(name as keyof typeof this.errorMessages);
        this.errorMessages[name].set(error);
      } */
    });

    this.bindConditionalEnabling('hasTraditionalPlace', [
      'traditionalPlaceDistance',
      'traditionalPlaceName',
      'traditionalPlaceNature',
      'traditionalPlaceConstruction'
    ]);

    this.bindConditionalEnabling('hasEducationalInstitution', [
      'educationalInstitutionDistance',
      'educationalInstitutionName',
      'educationalInstitutionNature'
    ]);

    this.bindConditionalEnabling('hasHospital', [
      'hospitalDistance',
      'hospitalName'
    ]);

    this.bindConditionalEnabling('hasTaxiStand', [
      'taxiStandDistance',
      'taxiStandName'
    ]);

    this.bindConditionalEnabling('hasExciseShopsNearby', [
      'nearbyExciseShopCount'
    ]);

    this.bindConditionalEnabling('isOnHighway', [
      'highwayName'
    ]);
  }

  ngAfterViewInit() {
    this.formStatus.emit(this.siteEnquiryForm.valid);
  }

  private bindConditionalEnabling(
    mainControlName: string,
    dependentControlNames: string[]
  ) {
    const mainControl = this.siteEnquiryForm.get(mainControlName);
    if (!mainControl) return;

    mainControl.valueChanges.subscribe((value: boolean) => {
      dependentControlNames.forEach(controlName => {
        const control = this.siteEnquiryForm.get(controlName);
        if (!control) return;

        if (value === true) {
          control.enable();
        } else {
          control.disable();
          control.reset();
        }
      });
    });
  }

/*   errorMessages = Object.fromEntries(
    this.formControlNames.map(name => [name, signal('')])
  ) as Record<string, ReturnType<typeof signal>>;
 */
  shopImageDocument = {
    file: null as File | null,
    fileUrl: ''
  };

  // Retrieve error message for a specific field
/*   getErrorMessage(field: keyof typeof this.errorMessages): string {
    const control = this.siteEnquiryForm.get(field as string);
    if (!control || control.valid || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) return 'This field is required.';
    if (control.errors['maxlength']) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters.`;
    }
    if (control.errors['minlength']) {
      return `Minimum length is ${control.errors['minlength'].requiredLength} characters.`;
    }
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}.`;
    if (control.errors['max']) return `Maximum value is ${control.errors['max'].max}.`;
    if (control.errors['email']) return 'Please enter a valid email address.';

    return 'Invalid field.';
  } */

  onDocSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && file.type !== 'application/pdf') {
      Swal.fire('Invalid File', 'Only PDF files are allowed.', 'warning');
      return;
    }

    if (file) {
      this.shopImageDocument.file = file;
      this.shopImageDocument.fileUrl = URL.createObjectURL(file);

      // ✅ THIS is what updates the control value to make the validator happy
      this.siteEnquiryForm.get('shopImageDocument')?.setValue(file);
      this.siteEnquiryForm.get('shopImageDocument')?.updateValueAndValidity();
    }
  }

  viewDoc() {
    if (this.shopImageDocument.fileUrl) {
      window.open(this.shopImageDocument.fileUrl, '_blank');
    }
  }

  // Check if required documents are uploaded
  isDocUploaded(): boolean {
    return !!this.shopImageDocument.file;
  }

  clearDocUrl() {
    if (this.shopImageDocument.fileUrl) {
      URL.revokeObjectURL(this.shopImageDocument.fileUrl);
      this.shopImageDocument.fileUrl = '';
    }
  }

  public getSiteEnquiryData(): any | null {
    if (this.siteEnquiryForm.invalid) {
      this.siteEnquiryForm.markAllAsTouched();
      return null;
    }

    const formData = this.siteEnquiryForm.value;

    // Include photo
    if (this.shopImageDocument.file) {
      formData.shopImageDocument = this.shopImageDocument.file; 
    }

    return formData;
  }
}
