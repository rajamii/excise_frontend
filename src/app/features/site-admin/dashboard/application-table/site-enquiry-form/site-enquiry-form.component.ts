import { Component, signal, Inject } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SiteAdminService } from '../../../site-admin-service';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';

@Component({
  selector: 'app-site-enquiry-form',
  imports: [MaterialModule],  // ✅ contains MatInputModule, MatFormFieldModule, etc.
  templateUrl: './site-enquiry-form.component.html',
  styleUrl: './site-enquiry-form.component.scss'
})
export class SiteEnquiryFormComponent {
  siteEnquiryForm: FormGroup;
  
  // Signal-based error messages for reactive display
  errorMessages = {
    // Location Restrictions
    hasTraditionalPlace: signal(''),
    traditionalPlaceDistance: signal(''),
    traditionalPlaceName: signal(''),
    traditionalPlaceNature: signal(''),
    traditionalPlaceConstruction: signal(''),

    hasEducationalInstitution: signal(''),
    educationalInstitutionDistance: signal(''),
    educationalInstitutionName: signal(''),
    educationalInstitutionNature: signal(''),

    hasHospitalNearby: signal(''),
    hospitalDistance: signal(''),
    hospitalName: signal(''),

    hasTaxiStandNearby: signal(''),
    taxiStandDistance: signal(''),
    taxiStandName: signal(''),

    isInterconnectedWithShops: signal(''),
    interconnectedRemarks: signal(''),

    enquiryOfficerComments: signal(''),

    // Other Enquiry Points
    shopConstructionType: signal(''),
    hasNearbyExciseShops: signal(''),
    numberOfNearbyExciseShops: signal(''),
    nearbyExciseShopsRemarks: signal(''),

    isOnHighway: signal(''),
    highwayName: signal(''),

    shopImage: signal(''),

    latitude: signal(''),
    longitude: signal(''),

    isShopSizeCorrect: signal(''),
    shopSizeRemarks: signal(''),
    additionalOfficerComments: signal(''),

    // Document Verification
    hasIdentityProof: signal(''),
    identityProofComments: signal(''),

    hasAgeProof: signal(''),
    ageProofComments: signal(''),

    hasNOCFromLandlord: signal(''),
    nocComments: signal(''),

    hasOwnershipProof: signal(''),
    ownershipProofComments: signal(''),

    hasTradeLicense: signal(''),
    tradeLicenseComments: signal(''),

    proposesBarmanOrSalesman: signal(''),
    barmanProposalComments: signal(''),

    barmanDocumentsValid: signal(''),
    barmanDocsComments: signal(''),

    licenseRecommendation: signal(''),
    recommendationComments: signal(''),

    // Meta Info
    specialRemarks: signal(''),
    reportingPlace: signal('')
  };

  photo = {
    file: null as File | null,
    fileUrl: ''
  };

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    protected licenseAppplicationService: LicenseApplicationService
  ) {
    // Initialize reactive form with validation
    this.siteEnquiryForm = this.fb.group({
        hasTraditionalPlace: [null, Validators.required],
        traditionalPlaceDistance: [null],
        traditionalPlaceName: ['', [Validators.required, Validators.maxLength(1000)]],
        traditionalPlaceNature: [''],
        traditionalPlaceConstruction: [null, Validators.required],

        hasEducationalInstitution: [null, Validators.required],
        educationalInstitutionDistance: [null],
        educationalInstitutionName: [''],
        educationalInstitutionNature: [''],

        hasHospitalNearby: [null, Validators.required],
        hospitalDistance: [null],
        hospitalName: [''],

        hasTaxiStandNearby: [null, Validators.required],
        taxiStandName: [''],
        taxiStandDistance: [null],

        isInterconnectedWithShops: [null, Validators.required],
        interconnectedRemarks: [''],

        enquiryOfficerComments: [''],

        shopConstructionType: [null, Validators.required],

        hasNearbyExciseShops: [null, Validators.required],
        numberOfNearbyExciseShops: [0],
        nearbyExciseShopsRemarks: [''],

        isOnHighway: [null, Validators.required],
        highwayName: [''],

        shopImage: [null],

        latitude: [''],
        longitude: [''],

        isShopSizeCorrect: [null, Validators.required],
        shopSizeRemarks: [''],

        additionalOfficerComments: [''],

        hasIdentityProof: [null, Validators.required],
        identityProofComments: [''],

        hasAgeProof: [null, Validators.required],
        ageProofComments: [''],

        hasNOCFromLandlord: [null, Validators.required],
        nocComments: [''],

        hasOwnershipProof: [null, Validators.required],
        ownershipProofComments: [''],

        hasTradeLicense: [null, Validators.required],
        tradeLicenseComments: [''],

        proposesBarmanOrSalesman: [null, Validators.required],
        barmanProposalComments: [''],

        barmanDocumentsValid: [null, Validators.required],
        barmanDocsComments: [''],

        licenseRecommendation: [null, Validators.required],
        recommendationComments: [''],

        specialRemarks: [''],
        reportingPlace: [''],
    });
  }

    // Retrieve error message for a specific field
  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  onPhotoSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
  
    if (file) {
      this.photo.file = file;
      this.photo.fileUrl = URL.createObjectURL(file);
  
      // Store the file in the service
      this.licenseAppplicationService.setShopImage({
        shopImage: file
      });
    }
  }

  viewPhoto() {
    if (this.photo.fileUrl) {
      window.open(this.photo.fileUrl, '_blank');
    }
  }

  // Check if required documents are uploaded
  isPhotoUploaded(): boolean {
    return !!this.photo.file;
  }

  clearPhotoUrl() {
    if (this.photo.fileUrl) {
      URL.revokeObjectURL(this.photo.fileUrl);
      this.photo.fileUrl = '';
    }
  }
}
