import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router, RouterModule } from '@angular/router';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-declaration-payment',
  standalone: true,
  imports: [MaterialModule, RouterModule],
  templateUrl: './declaration-payment.component.html',
  styleUrls: ['./declaration-payment.component.scss']  // <-- fixed property name
})
export class DeclarationPaymentComponent implements OnInit, OnDestroy {
  @Output() back = new EventEmitter<void>();

  declarationForm: FormGroup;
  passPhotoUrl: string | null = null;
  private photoSub?: Subscription;
  applicationFee = 500;
  isSubmitting = false;

  constructor(
    private licenseAppService: LicenseApplicationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this.declarationForm = this.fb.group({
      acceptDeclaration: new FormControl(false, [Validators.requiredTrue])
    });
  }

  ngOnInit(): void {
    this.photoSub = this.licenseAppService.getPassPhotoObservable().subscribe(file => {
      if (this.passPhotoUrl) URL.revokeObjectURL(this.passPhotoUrl);
      this.passPhotoUrl = file ? URL.createObjectURL(file) : null;
      setTimeout(() => {
        this.passPhotoUrl = file ? URL.createObjectURL(file) : null;
        this.cdr.detectChanges();
      });
    });
  }

  ngOnDestroy(): void {
    if (this.passPhotoUrl) URL.revokeObjectURL(this.passPhotoUrl);
    this.photoSub?.unsubscribe();
  }

  readonly licenseApplicationLabels: Partial<Record<keyof LicenseApplication, string>> = {
    licenseType: 'License Type',
    licenseCategory: 'License Category',
    licenseSubCategory: 'License Sub Category',
    establishmentName: 'Establishment Name',
    siteType: 'Site Type',
    applicantName: 'First Name',
    fatherHusbandName: 'Father/Husband Name',
    dob: 'Date of Birth',
    nationality: 'Nationality',
    gender: 'Gender',
    pan: 'PAN',
    applicantMobileNumber: 'Mobile Number',
    applicantEmail: 'Email Id',
    siteDistrict: 'Site District',
    siteSubdivision: 'Site Sub Division',
    policeStation: 'Police Station',
    locationCategory: 'Location Category',
    locationName: 'Location Name',
    wardName: 'Ward Name',
    businessAddress: 'Business Address',
    roadName: 'Road Name',
    pinCode: 'PIN Code',
    latitude: 'Latitude',
    longitude: 'Longitude',
    constructionType: 'Construction Type',
    length: 'Length (sq. ft)',
    breadth: 'Breadth (sq. ft)',
    siteOwned: 'Site Owned by Applicant',
    nocObtained: 'NOC Obtained',
    tradeLicenseCovered: 'Trade License Covered',
    companyName: 'Company Name',
    companyAddress: 'Company Address',
    companyPan: 'Company PAN',
    companyCin: 'Company CIN',
    incorporationDate: 'Incorporation Date',
    companyPhoneNumber: 'Company Phone Number',
    companyEmail: 'Company Email Id'
  };

  get licenseType() {
    return this.getParsedSession<Partial<LicenseApplication>>('selectLicenseData')?.licenseType;
  }

  get selectLicenseData() {
    return this.getDataForView('selectLicenseData');
  }

  get keyInfoData() {
    return this.getDataForView('keyInfoData');
  }

  get applicantDetailsData() {
    return this.getDataForView('applicantDetailsData');
  }

  get siteDetailsData() {
    return this.getDataForView('siteDetailsData');
  }

  get unitDetailsData() {
    return this.getDataForView('unitDetailsData');
  }

  get displaySections() {
    return [
      { title: 'Application Type', data: this.selectLicenseData },
      { title: 'Basic Information', data: this.keyInfoData },
      { title: 'Applicant Details', data: this.applicantDetailsData },
      { title: 'Site Details', data: this.siteDetailsData },
      {
        title: 'Company Details',
        data: this.unitDetailsData,
        condition: () => Number(this.licenseType) === 2
      }
    ];
  }

  private getParsedSession<T>(key: string): T | null {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) as T : null;
    } catch (e) {
      console.error(`Failed to parse session key ${key}:`, e);
      return null;
    }
  }

  private getSafeLabel(key: string): string {
    return (key in this.licenseApplicationLabels)
      ? this.licenseApplicationLabels[key as keyof LicenseApplication]!
      : key;
  }

  private getDataForView(key: string): { key: string; value: any }[] {
    const data = this.getParsedSession<Partial<LicenseApplication>>(key);
    return data
      ? Object.entries(data).map(([k, v]) => {
        const label = this.getSafeLabel(k);
        return { key: label, value: v };
      })
      : [];
  }

  goBack() {
    this.back.emit();
  }

  async submit(): Promise<void> {
    if (!this.declarationForm.valid) {
      Swal.fire('Warning', 'Please accept the declaration to proceed.', 'warning');
      return;
    }

    // Prevent double submission
    if (this.isSubmitting) {
      return;
    }

    // Validate required data from session storage (service method validateFormData doesn't exist)
    const requiredSections = [
      'selectLicenseData',
      'keyInfoData',
      'applicantDetailsData',
      'siteDetailsData'
    ];
    const missingSections = requiredSections.filter(section => !this.getParsedSession(section));
    if (missingSections.length > 0) {
      const sectionNames: Record<string, string> = {
        selectLicenseData: 'Application Type',
        keyInfoData: 'Basic Information',
        applicantDetailsData: 'Applicant Details',
        siteDetailsData: 'Site Details'
      };

      Swal.fire({
        title: 'Incomplete Data',
        html: `<div style="text-align: left;">
          <p>The following sections are missing or incomplete:</p>
          <ul style="color: #d32f2f;">
            ${missingSections.map(s => `<li>${sectionNames[s] || s}</li>`).join('')}
          </ul>
        </div>`,
        icon: 'error'
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to submit this application?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
    });

    if (!confirm.isConfirmed) return;

    this.isSubmitting = true;

    // Show loading indicator
    Swal.fire({
      title: 'Submitting Application...',
      html: 'Please wait while we process your application.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // Use the service method to prepare FormData with proper field mapping
      const formData = this.licenseAppService.prepareNewLicenseFormData();

      // DEBUG: Log FormData contents (remove in production)
      console.log('=== Submitting New License Application ===');
      this.licenseAppService.logFormData(formData, 'New License FormData');

      // Submit to backend
      this.licenseAppService.submitNewLicenseApplication(formData).subscribe({
        next: (response) => {
          console.log(' Application submitted successfully:', response);

          Swal.fire({
            title: 'Success!',
            html: `
              <div style="text-align: center;">
                <p>Your application has been submitted successfully!</p>
                <p><strong>Application ID:</strong> ${response.applicationId || 'Pending'}</p>
                <p style="font-size: 14px; color: #666; margin-top: 12px;">
                  You will receive a confirmation email shortly.
                </p>
              </div>
            `,
            icon: 'success',
            confirmButtonText: 'Go to Dashboard',
            allowOutsideClick: false
          }).then(() => {
            // Clear all session storage and documents
            this.clearApplicationData();

            // Navigate to dashboard
            this.router.navigate(['/licensee/dashboard']);
          });
        },
        error: (err) => {
          console.error(' Submission failed:', err);

          // Format error message locally
          const errorMessage = this.formatErrorMessage(err);

          Swal.fire({
            title: 'Submission Failed',
            html: errorMessage,
            icon: 'error',
            confirmButtonText: 'OK',
            allowOutsideClick: false
          });
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });

    } catch (error) {
      console.error(' Unexpected error during submission:', error);
      this.isSubmitting = false;
      Swal.fire({
        title: 'Error',
        text: 'An unexpected error occurred. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  }

  /**
   * Clear all application data from session storage and service
   */
  private clearApplicationData(): void {
    // Clear session storage
    const sections = [
      'selectLicenseData',
      'keyInfoData',
      'applicantDetailsData',
      'siteDetailsData',
      'unitDetailsData'
    ];

    sections.forEach(section => {
      sessionStorage.removeItem(section);
    });

    // Clear documents from service
    this.licenseAppService.clearAllDocuments();

    console.log('Application data cleared successfully');
  }

  /**
   * Format an error object into a user-friendly message.
   */
  private formatErrorMessage(err: any): string {
    if (!err) return 'An unknown error occurred.';
    const message = err?.error?.message || err?.message || err?.statusText;
    const status = err?.status ? ` (Status: ${err.status})` : '';
    if (message) return `${message}${status}`;
    try {
      return JSON.stringify(err);
    } catch {
      return 'An unexpected error occurred.';
    }
  }
}