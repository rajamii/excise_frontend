import { Component, Output, EventEmitter, OnInit, AfterViewInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-site-enquiry-form',
  imports: [MaterialModule], 
  templateUrl: './site-enquiry-form.component.html',
  styleUrl: './site-enquiry-form.component.scss'
})
export class SiteEnquiryFormComponent implements OnInit, AfterViewInit {
  @Output() formStatus = new EventEmitter<boolean>();

  siteEnquiryForm: FormGroup;
  shopImageDocument = {
    file: null as File | null,
    fileUrl: ''
  };

  constructor(private fb: FormBuilder) {
    // Initialize reactive form with proper validation
    this.siteEnquiryForm = this.fb.group({
      // Location Restrictions
      hasTraditionalPlace: [null, Validators.required],
      traditionalPlaceDistance: [null],
      traditionalPlaceName: ['', Validators.maxLength(1000)],
      traditionalPlaceNature: ['', Validators.maxLength(1000)],
      traditionalPlaceConstruction: [null],

      hasEducationalInstitution: [null, Validators.required],
      educationalInstitutionDistance: [null],
      educationalInstitutionName: ['', Validators.maxLength(1000)],
      educationalInstitutionNature: ['', Validators.maxLength(1000)],

      hasHospital: [null, Validators.required],
      hospitalDistance: [null],
      hospitalName: ['', Validators.maxLength(1000)],

      hasTaxiStand: [null, Validators.required],
      taxiStandName: ['', Validators.maxLength(1000)],
      taxiStandDistance: [null],

      isInterconnectedWithShops: [null, Validators.required],
      interconnectivityRemarks: ['', Validators.maxLength(1000)],

      enquiryOfficerComments: ['', Validators.maxLength(2000)],

      // Other Enquiry Points
      shopConstructionType: [null, Validators.required],

      hasExciseShopsNearby: [null, Validators.required],
      nearbyExciseShopCount: [null],
      nearbyExciseShopsRemarks: ['', Validators.maxLength(2000)],

      isOnHighway: [null, Validators.required],
      highwayName: ['', Validators.maxLength(2000)],

      shopImageDocument: [null, Validators.required],

      latitude: [null],
      longitude: [null],

      isShopSizeCorrect: [null, Validators.required],
      shopSizeRemarks: ['', Validators.maxLength(2000)],

      additionalEnquiryOfficerComments: ['', Validators.maxLength(2000)],

      // Document Verification
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

      // Special Remarks
      specialRemarks: ['', Validators.maxLength(2000)],
      reportingPlace: ['', [Validators.required, Validators.maxLength(250)]],
    });
  }

  ngOnInit() {
    console.log('🔧 Site Enquiry Form Initialized');
    
    // Set up conditional field enabling/disabling
    this.setupConditionalFields();
    
    // Emit form status on changes
    this.siteEnquiryForm.statusChanges.subscribe(() => {
      const isValid = this.siteEnquiryForm.valid;
      console.log('📋 Form status changed. Valid:', isValid);
      this.formStatus.emit(isValid);
    });
  }

  ngAfterViewInit() {
    // Initial status emission after view init
    setTimeout(() => {
      const isValid = this.siteEnquiryForm.valid;
      console.log('✅ Initial form status (AfterViewInit):', isValid);
      this.formStatus.emit(isValid);
    }, 0);
  }

  private setupConditionalFields() {
    // Traditional Place
    this.bindConditionalEnabling('hasTraditionalPlace', [
      'traditionalPlaceDistance',
      'traditionalPlaceName',
      'traditionalPlaceNature',
      'traditionalPlaceConstruction'
    ]);

    // Educational Institution
    this.bindConditionalEnabling('hasEducationalInstitution', [
      'educationalInstitutionDistance',
      'educationalInstitutionName',
      'educationalInstitutionNature'
    ]);

    // Hospital
    this.bindConditionalEnabling('hasHospital', [
      'hospitalDistance',
      'hospitalName'
    ]);

    // Taxi Stand
    this.bindConditionalEnabling('hasTaxiStand', [
      'taxiStandDistance',
      'taxiStandName'
    ]);

    // Excise Shops Nearby
    this.bindConditionalEnabling('hasExciseShopsNearby', [
      'nearbyExciseShopCount'
    ]);

    // Highway
    this.bindConditionalEnabling('isOnHighway', [
      'highwayName'
    ]);
  }

  private bindConditionalEnabling(
    mainControlName: string,
    dependentControlNames: string[]
  ) {
    const mainControl = this.siteEnquiryForm.get(mainControlName);
    if (!mainControl) {
      console.warn(`⚠️ Control not found: ${mainControlName}`);
      return;
    }

    mainControl.valueChanges.subscribe((value: boolean | null) => {
      console.log(`🔄 ${mainControlName} changed to:`, value);
      
      dependentControlNames.forEach(controlName => {
        const control = this.siteEnquiryForm.get(controlName);
        if (!control) {
          console.warn(`⚠️ Dependent control not found: ${controlName}`);
          return;
        }

        if (value === true) {
          control.enable();
          console.log(`✅ Enabled: ${controlName}`);
        } else {
          control.disable();
          control.reset();
          console.log(`❌ Disabled: ${controlName}`);
        }
      });
      
      // Re-emit form status after enabling/disabling fields
      setTimeout(() => {
        this.formStatus.emit(this.siteEnquiryForm.valid);
      }, 0);
    });
  }

  onDocSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    if (file.type !== 'application/pdf') {
      Swal.fire('Invalid File', 'Only PDF files are allowed.', 'warning');
      input.value = ''; // Clear the input
      return;
    }

    console.log('✅ File selected:', file.name, 'Size:', file.size);

    // Store file and create URL
    this.shopImageDocument.file = file;
    this.shopImageDocument.fileUrl = URL.createObjectURL(file);

    // Update form control
    this.siteEnquiryForm.get('shopImageDocument')?.setValue(file);
    this.siteEnquiryForm.get('shopImageDocument')?.markAsTouched();
    this.siteEnquiryForm.get('shopImageDocument')?.updateValueAndValidity();

    console.log('📄 Form control updated. Valid:', this.siteEnquiryForm.get('shopImageDocument')?.valid);
    
    // Emit status after file upload
    setTimeout(() => {
      this.formStatus.emit(this.siteEnquiryForm.valid);
    }, 0);
  }

  viewDoc() {
    if (this.shopImageDocument.fileUrl) {
      window.open(this.shopImageDocument.fileUrl, '_blank');
    } else {
      console.warn('⚠️ No document URL available');
    }
  }

  isDocUploaded(): boolean {
    return !!this.shopImageDocument.file;
  }

  clearDocUrl() {
    if (this.shopImageDocument.fileUrl) {
      URL.revokeObjectURL(this.shopImageDocument.fileUrl);
      this.shopImageDocument.fileUrl = '';
    }
  }

  // ✅ CRITICAL: Get complete site enquiry data including disabled fields
  public getSiteEnquiryData(): any | null {
    console.log('📊 Getting site enquiry data...');
    console.log('Form valid:', this.siteEnquiryForm.valid);
    console.log('Form status:', this.siteEnquiryForm.status);

    if (this.siteEnquiryForm.invalid) {
      this.siteEnquiryForm.markAllAsTouched();
      console.error('❌ Site Enquiry Form is invalid');
      
      // Log all validation errors
      const errors: any = {};
      Object.keys(this.siteEnquiryForm.controls).forEach(key => {
        const control = this.siteEnquiryForm.get(key);
        if (control && control.invalid) {
          errors[key] = {
            enabled: control.enabled,
            errors: control.errors,
            value: control.value
          };
        }
      });
      
      console.error('❌ Form validation errors:', errors);
      return null;
    }

    // ✅ Use getRawValue() to include disabled fields
    const formData = this.siteEnquiryForm.getRawValue();

    // Include the uploaded file
    if (this.shopImageDocument.file) {
      formData.shopImageDocument = this.shopImageDocument.file; 
      console.log('✅ File included:', this.shopImageDocument.file.name);
    }

    console.log('✅ Site Enquiry Data collected successfully');
    console.log('📦 Data summary:', {
      hasTraditionalPlace: formData.hasTraditionalPlace,
      hasEducationalInstitution: formData.hasEducationalInstitution,
      hasHospital: formData.hasHospital,
      shopConstructionType: formData.shopConstructionType,
      licenseRecommendation: formData.licenseRecommendation,
      reportingPlace: formData.reportingPlace,
      fileUploaded: !!formData.shopImageDocument
    });

    return formData;
  }

  ngOnDestroy() {
    // Clean up file URL
    this.clearDocUrl();
  }
}