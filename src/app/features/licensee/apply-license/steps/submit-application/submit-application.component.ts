import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router, RouterModule } from '@angular/router';
import { LicenseApplication, LicenseApplicationDocuments } from '../../../../../core/models/license-application.model';
import { LicenseeService } from '../../../licensee.services';
import Swal from 'sweetalert2'; 

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
  fileUrls: string[] = []
  licenseApplicationDocs: { key: keyof LicenseApplicationDocuments; file: File; fileUrl: string }[] = [];

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
    memberEmailId: 'Member Email Id'
  };

  // Human-readable labels for uploaded documents
  readonly documentLabels: Partial<Record<keyof LicenseApplicationDocuments, string>> = {
    photo: 'Photo'
  };

  // Event emitter to go back to the previous step
  @Output() back = new EventEmitter<void>();

  constructor(private licenseeService: LicenseeService, private router: Router) {}
  

  ngOnInit(): void {
    // Get uploaded document metadata (filename) for preview display
    const docs = this.licenseeService.getLicenseApplicationDocuments();
    this.fileUrls = [];

    this.licenseApplicationDocs = Object.entries(docs).map(([key, file]) => {
      const url = URL.createObjectURL(file!);
      this.fileUrls.push(url);
      return {
        key: key as keyof LicenseApplicationDocuments,
        file: file!,
        fileUrl: url
      };
    });
  }

  ngOnDestroy(): void {
    this.fileUrls.forEach(url => URL.revokeObjectURL(url));
  }

  // Getter for LICENSE DETAILS data from sessionStorage
  get selectLicenseData() {
    return this.getGroupedEntries<Partial<LicenseApplication>>('selectLicenseData', this.licenseApplicationLabels);
  }

  // Getter for KEY INFO data from sessionStorage
  get keyInfoData() {
    return this.getGroupedEntries<Partial<LicenseApplication>>('keyInfoData', this.licenseApplicationLabels);
  }

  // Getter for ADDRESS data from sessionStorage
  get addressData() {
    return this.getGroupedEntries<Partial<LicenseApplication>>('addressData', this.licenseApplicationLabels);
  }

  // Getter for UNIT DETAILS data from sessionStorage
  get unitDetailsData() {
    return this.getGroupedEntries<Partial<LicenseApplication>>('unitDetailsData', this.licenseApplicationLabels);
  }

  // Getter for MEMBER DETAILS data from sessionStorage
  get memberDetailsData() {
    return this.getGroupedEntries<Partial<LicenseApplication>>('memberDetailsData', this.licenseApplicationLabels);
  }

  // Retrieves the licenseType (e.g., "Company") to conditionally display unit details
  get licenseType() {
    const storedData = sessionStorage.getItem('keyInfoData');
    return storedData ? JSON.parse(storedData).licenseType : null;
  }

  // Utility to convert sessionStorage data into label-value pairs for display
  private getGroupedEntries<T extends Record<string, any>>(
    groupKey: string,
    labels: Record<string, string>
  ): { key: string; value: any }[] {
    const storedData = sessionStorage.getItem(groupKey);
    if (!storedData) return [];

    try {
      const parsedData: T = JSON.parse(storedData);
      return Object.keys(parsedData).map(key => ({
        key: labels[key] || key,
        value: parsedData[key]
      }));
    } catch (error) {
      console.error(`Error parsing sessionStorage key "${groupKey}":`, error);
      return [];
    }
  }

  // Submit the full application: company, member, payment, and documents
  async submit(): Promise<void> {
    // Show confirmation dialog
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
      // Parse all stored data from sessionStorage
      const selectLicenseData: Partial<LicenseApplication> = JSON.parse(sessionStorage.getItem('selectLicenseData') || '{}');
      const keyInfoData: Partial<LicenseApplication> = JSON.parse(sessionStorage.getItem('keyInfoData') || '{}');
      const addressData: Partial<LicenseApplication> = JSON.parse(sessionStorage.getItem('addressData') || '{}');
      const unitDetailsData: Partial<LicenseApplication> = JSON.parse(sessionStorage.getItem('unitDetailsData') || '{}');
      const memberDetailsData: Partial<LicenseApplication> = JSON.parse(sessionStorage.getItem('memberDetailsData') || '{}');

      // Get uploaded files from service
      const licenseApplicationDocuments = this.licenseeService.getLicenseApplicationDocuments();

      // Ensure nothing is missing
      if (!selectLicenseData || !keyInfoData || !addressData || !unitDetailsData || !memberDetailsData || !licenseApplicationDocuments) {
        alert('Missing application data. Please complete the form.');
        return;
      }

      // Build the FormData object for the API
      const formData = new FormData();
      const combinedDetails = { ...selectLicenseData, ...keyInfoData, ...addressData, ...unitDetailsData, ...memberDetailsData };

      // Append form fields to FormData
      Object.entries(combinedDetails).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Append the photo file to FormData
      if (licenseApplicationDocuments && licenseApplicationDocuments.photo) {
        formData.append('photo', licenseApplicationDocuments.photo);
      }

      // Make API call to submit form
      this.licenseeService.submitLicenseApplication(formData).subscribe({
        next: () => {
          // On success: notify user, clear data, redirect
          Swal.fire('Submitted!', 'Application submitted successfully!', 'success').then(() => {
            sessionStorage.clear();
            this.router.navigate(['/licensee/dashboard']);
          });
        },
        error: (err) => {
          // On failure: show error message
          console.error('❌ Submission failed:', err.error);
          const message = err?.error?.detail || 'Failed to submit application.';
          Swal.fire('Error', message, 'error');
        }
      });

    } catch (error) {
      console.error('Unexpected error during submission:', error);
      Swal.fire('Error', 'An unexpected error occurred.', 'error');
    }
  }

  // Emits the back event to navigate to the previous screen
  goBack() {
    this.back.emit();
  }
}
