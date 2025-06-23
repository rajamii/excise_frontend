import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router, RouterModule } from '@angular/router';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { LicenseeService } from '../../../licensee.services';
import Swal from 'sweetalert2'; 
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-submit-application',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule
  ],
  templateUrl: './submit-application.component.html',
  styleUrl: './submit-application.component.scss'
})
export class SubmitApplicationComponent {
  // Emits event to move to the previous screen
  @Output() back = new EventEmitter<void>();

  // Stores the URL for previewing the uploaded photo
  passPhotoUrl: string | null = null;

  // Holds the subscription to the photo observable for cleanup
  private photoSub?: Subscription;

  constructor(
    private licenseeService: LicenseeService,
    private router: Router
  ) {}

  // On component init, subscribe to the photo observable
  ngOnInit(): void {
    this.photoSub = this.licenseeService.getPassPhotoObservable().subscribe(file => {
      // Release previous object URL if exists
      if (this.passPhotoUrl) URL.revokeObjectURL(this.passPhotoUrl);

      // Create a new preview URL if file exists
      this.passPhotoUrl = file ? URL.createObjectURL(file) : null;
    });
  }

  // Cleanup: revoke object URL and unsubscribe
  ngOnDestroy(): void {
    if (this.passPhotoUrl) URL.revokeObjectURL(this.passPhotoUrl);
    this.photoSub?.unsubscribe();
  }

  /**
   * Labels for displaying field names instead of raw keys
   * This ensures readable display of keys from session storage
   */
  readonly licenseApplicationLabels: Partial<Record<keyof LicenseApplication, string>> = {
    exciseDistrict: 'Excise District',
    licenseCategory: 'License Category',
    exciseSubDivision: 'Excise Sub Division',
    license: 'License',
    licenseType: 'License Type',
    establishmentName: 'Establishment Name',
    mobileNumber: 'Mobile Number',
    emailId: 'Email Id',
    licenseNo: 'License No.',
    initialGrantDate: 'Initial Grant Date',
    renewedFrom: 'Renewed From',
    validUpTo: 'Valid Up To',
    yearlyLicenseFee: 'Yearly License Fee',
    licenseNature: 'License Nature',
    functioningStatus: 'Functioning Status',
    modeofOperation: 'Mode of Operation',
    siteSubDivision: 'Site Sub Division',
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
    companyPan: 'Company PIN',
    companyCin: 'Company CIN',
    incorporationDate: 'Incorporation Date',
    companyPhoneNumber: 'Company Phone Number',
    companyEmailId: 'Company Email Id',
    status: 'Status',
    memberName: 'Member Name',
    fatherHusbandName: 'Father/Husband Name',
    nationality: 'Nationality',
    gender: 'Gender',
    pan: 'PAN',
    memberMobileNumber: 'Member Mobile Number',
    memberEmailId: 'Member Email Id',
    photo: 'Photo'
  };

  // Returns license type to conditionally show unit details
  get licenseType() {
    return this.getParsedSession<Partial<LicenseApplication>>('keyInfoData')?.licenseType;
  }

  // Convert each group into label-value array for template rendering
  get selectLicenseData() {
    return this.getDataForView('selectLicenseData');
  }

  get keyInfoData() {
    return this.getDataForView('keyInfoData');
  }

  get addressData() {
    return this.getDataForView('addressData');
  }

  get unitDetailsData() {
    return this.getDataForView('unitDetailsData');
  }

  get memberDetailsData() {
    return this.getDataForView('memberDetailsData');
  }

  /**
   * Sections to display dynamically in the HTML template.
   * Each section includes a title, data, and optional display condition.
   */
  get displaySections() {
    return [
      { title: 'License Details', data: this.selectLicenseData },
      { title: 'Key Info', data: this.keyInfoData },
      {
        title: 'Unit Details',
        data: this.unitDetailsData,
        condition: () => this.licenseType === 'Company',
      },
      { title: 'Address Details', data: this.addressData }
    ];
  }

  /**
   * Parses JSON from sessionStorage and returns it as typed object.
   */
  private getParsedSession<T>(key: string): T | null {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) as T : null;
    } catch (e) {
      console.error(`❌ Failed to parse session key ${key}:`, e);
      return null;
    }
  }

  /**
   * Safely fetches the label for a given key.
   * Ensures type safety using 'key in object' check.
   */
  private getSafeLabel(key: string): string {
    return (key in this.licenseApplicationLabels)
      ? this.licenseApplicationLabels[key as keyof LicenseApplication]!
      : key;
  }

  /**
   * Converts parsed object to a label-value array for display.
   */
  private getDataForView(key: string): { key: string; value: any }[] {
    const data = this.getParsedSession<Partial<LicenseApplication>>(key);

    return data
      ? Object.entries(data).map(([k, v]) => {
          const label = this.getSafeLabel(k);
          return { key: label, value: v };
        })
      : [];
  }

  /**
   * Emits the back event to navigate to the previous step
   */
  goBack() {
    this.back.emit();
  }

  /**
   * Final submission of the license application.
   * Combines data from session storage, photo, and submits via API.
   */
  async submit(): Promise<void> {
    // Confirmation popup before submission
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to submit this application?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
    });

    if (!confirm.isConfirmed) return;

    try {
      // Gather all relevant stored session data
      const keys = [
        'selectLicenseData',
        'keyInfoData',
        'addressData',
        'unitDetailsData',
        'memberDetailsData',
      ];

      const formValues = keys.reduce((acc, key) => {
        const data = this.getParsedSession<Partial<LicenseApplication>>(key);
        return { ...acc, ...data };
      }, {});

      const photoFile = this.licenseeService.getPassPhoto();

      // Ensure all required data is present
      if (!photoFile || Object.keys(formValues).length === 0) {
        alert('Missing application data. Please complete the form.');
        return;
      }

      // Build multipart form data
      const formData = new FormData();
      Object.entries(formValues).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          formData.append(key, val.toString());
        }
      });
      formData.append('photo', photoFile);

      // Make API call
      this.licenseeService.submitLicenseApplication(formData).subscribe({
        next: () => {
          Swal.fire('Submitted!', 'Application submitted successfully!', 'success').then(() => {
            sessionStorage.clear();
            this.router.navigate(['/licensee/dashboard']);
          });
        },
        error: (err) => {
          const message = err?.error?.detail || 'Failed to submit application.';
          console.error('❌ Submission failed:', err);
          Swal.fire('Error', message, 'error');
        }
      });

    } catch (error) {
      console.error('Unexpected error during submission:', error);
      Swal.fire('Error', 'An unexpected error occurred.', 'error');
    }
  }
}
