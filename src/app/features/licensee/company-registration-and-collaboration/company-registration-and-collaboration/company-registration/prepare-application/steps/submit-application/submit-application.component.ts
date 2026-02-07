import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { MaterialModule } from '../../../../../../../../shared/material.module';
import { Company, CompanyDocuments } from '../../../../../../../../core/models/company.model';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { CompanyRegistrationService } from '../../../../../../../../core/services/company-registration.service';

@Component({
  selector: 'app-submit-application',
  standalone: true,
  imports: [MaterialModule, FormsModule],
  templateUrl: './submit-application.component.html',
  styleUrl: './submit-application.component.scss'
})
export class SubmitApplicationComponent implements OnDestroy {
  fileUrls: string[] = [];
  acceptTerms: boolean = false;
  isSubmitting: boolean = false;
  applicationId: string | null = null;

  // Cache for company documents to prevent recreating URLs
  private cachedDocuments: { key: keyof CompanyDocuments; file: File; fileUrl: string }[] = [];

  // Human-readable labels for company fields
  readonly companyRegistrationLabels: Partial<Record<keyof Company, string>> = {
    brandType: 'Brand Type',
    license: 'License',
    applicationYear: 'Application Year',
    companyName: 'Company Name',
    pan: 'PAN',
    officeAddress: 'Office Address',
    country: 'Country',
    state: 'State',
    factoryAddress: 'Factory Address',
    pinCode: 'PIN Code',
    companyMobileNumber: 'Company Mobile Number',
    companyEmailId: 'Company Email Id',
    memberName: 'Member Name',
    memberDesignation: 'Member Designation',
    memberMobileNumber: 'Member Mobile Number',
    memberEmailId: 'Member Email Id',
    memberAddress: 'Member Address',
    paymentId: 'Payment Id',
    paymentDate: 'Payment Date',
    paymentAmount: 'Payment Amount',
    paymentRemarks: 'Payment Remarks'
  };

  // Human-readable labels for uploaded documents
  readonly documentLabels: Partial<Record<keyof CompanyDocuments, string>> = {
    undertaking: 'Undertaking'
  };

  // Output event emitter to notify parent about "back" action
  @Output() back = new EventEmitter<void>();

  constructor(
    private companyRegistrationService: CompanyRegistrationService,
    private router: Router
  ) { }

  ngOnDestroy(): void {
    this.fileUrls.forEach(url => URL.revokeObjectURL(url));
  }

  // Get formatted company details from session storage for display
  get companyDetails() {
    return this.getGroupedEntries<Partial<Company>>('companyDetails', this.companyRegistrationLabels);
  }

  // Get formatted member details from session storage for display
  get memberDetails() {
    return this.getGroupedEntries<Partial<Company>>('memberDetails', this.companyRegistrationLabels);
  }

  // Get formatted payment details from session storage for display
  get paymentDetails() {
    return this.getGroupedEntries<Partial<Company>>('paymentDetails', this.companyRegistrationLabels);
  }

  // Get uploaded document metadata (filename) for preview display
  get companyDocuments(): { key: keyof CompanyDocuments; file: File; fileUrl: string }[] {
    // Return cached documents if already created
    if (this.cachedDocuments.length > 0) {
      return this.cachedDocuments;
    }

    const docs = this.companyRegistrationService.getCompanyDocuments();
    this.fileUrls = [];

    this.cachedDocuments = Object.entries(docs).map(([key, file]) => {
      const url = URL.createObjectURL(file!);
      this.fileUrls.push(url);
      return {
        key: key as keyof CompanyDocuments,
        file: file!,
        fileUrl: url
      };
    });

    return this.cachedDocuments;
  }

  // Get summary data for the application summary section
  getSummaryData(): { key: string; value: any }[] {
    const summary: { key: string; value: any }[] = [];

    // Add key company details
    const appYearData = this.companyDetails.find(item => item.key === 'Application Year');
    if (appYearData) summary.push({ key: 'Application Year', value: appYearData.value });

    const brandTypeData = this.companyDetails.find(item => item.key === 'Brand Type');
    if (brandTypeData) summary.push({ key: 'Brand Type', value: brandTypeData.value });

    const companyNameData = this.companyDetails.find(item => item.key === 'Company Name');
    if (companyNameData) summary.push({ key: 'Company Name', value: companyNameData.value });

    const panData = this.companyDetails.find(item => item.key === 'PAN');
    if (panData) summary.push({ key: 'PAN', value: panData.value });

    // Add key member details
    const memberNameData = this.memberDetails.find(item => item.key === 'Member Name');
    if (memberNameData) summary.push({ key: 'Member Name', value: memberNameData.value });

    const memberMobileData = this.memberDetails.find(item => item.key === 'Member Mobile Number');
    if (memberMobileData) summary.push({ key: 'Contact Number', value: memberMobileData.value });

    // Add payment amount
    const paymentAmountData = this.paymentDetails.find(item => item.key === 'Payment Amount');
    if (paymentAmountData) summary.push({ key: 'Payment Amount', value: `₹${paymentAmountData.value}` });

    // Add application date
    summary.push({ key: 'Application Date', value: new Date().toLocaleDateString('en-GB') });

    return summary;
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

  // View file in new tab - FIXED VERSION
  viewFile(doc: { key: keyof CompanyDocuments; file: File; fileUrl: string }) {
    console.log('Attempting to view file:', doc);

    if (!doc) {
      console.error('No document provided');
      Swal.fire('Error', 'Document not found.', 'error');
      return;
    }

    // Use existing fileUrl from cached documents
    if (doc.fileUrl) {
      console.log('Opening fileUrl:', doc.fileUrl);
      const newWindow = window.open(doc.fileUrl, '_blank');

      if (!newWindow) {
        Swal.fire('Error', 'Pop-up blocked. Please allow pop-ups for this site.', 'warning');
      }
      return;
    }

    // Fallback: create new URL from file if fileUrl is missing
    if (doc.file) {
      console.log('Creating new URL from file');
      try {
        const url = URL.createObjectURL(doc.file);
        const newWindow = window.open(url, '_blank');

        if (!newWindow) {
          Swal.fire('Error', 'Pop-up blocked. Please allow pop-ups for this site.', 'warning');
        }

        // Clean up after a delay
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (error) {
        console.error('Error creating object URL:', error);
        Swal.fire('Error', 'Unable to open the file. Please try again.', 'error');
      }
      return;
    }

    console.error('No file or fileUrl available');
    Swal.fire('Error', 'File not found. Please try uploading again.', 'error');
  }

  // Submit the full application: company, member, payment, and documents
  async submit(): Promise<void> {
    if (!this.acceptTerms) {
      Swal.fire('Warning', 'Please accept the terms and conditions to proceed.', 'warning');
      return;
    }

    // Show confirmation dialog
    const confirm = await Swal.fire({
      title: 'Confirm Submission',
      text: 'Are you sure you want to submit this application?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit',
      cancelButtonText: 'Review Again',
      confirmButtonColor: '#1C2B78'
    });

    if (!confirm.isConfirmed) return;

    this.isSubmitting = true;

    try {
      // Parse all stored data from sessionStorage
      const companyDetails: Partial<Company> = JSON.parse(sessionStorage.getItem('companyDetails') || '{}');
      const memberDetails: Partial<Company> = JSON.parse(sessionStorage.getItem('memberDetails') || '{}');
      const paymentDetails: Partial<Company> = JSON.parse(sessionStorage.getItem('paymentDetails') || '{}');

      // Get uploaded files from service
      const companyRegistrationDocuments = this.companyRegistrationService.getCompanyDocuments();

      // Ensure nothing is missing
      if (!companyDetails || !memberDetails || !paymentDetails || !companyRegistrationDocuments) {
        Swal.fire('Error', 'Missing application data. Please complete the form.', 'error');
        this.isSubmitting = false;
        return;
      }

      // Build the FormData object for the API
      const formData = new FormData();
      const combinedDetails = { ...companyDetails, ...memberDetails, ...paymentDetails };

      // Append form fields to FormData
      Object.entries(combinedDetails).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      for (const [key, file] of Object.entries(companyRegistrationDocuments)) {
        if (file instanceof File) {
          formData.append(key, file);
        }
      }

      // Make API call to submit form
      this.companyRegistrationService.createCompany(formData).subscribe({
        next: () => {
          // Generate application ID
          this.applicationId = this.generateApplicationId();

          Swal.fire({
            title: 'Success!',
            text: `Application submitted successfully! Your application ID is ${this.applicationId}`,
            icon: 'success',
            confirmButtonColor: '#1C2B78'
          });
        },
        error: (err) => {
          // On failure: show error message
          console.error('Submission failed:', err.error);
          const message = err?.error?.detail || 'Failed to submit application.';
          Swal.fire('Error', message, 'error');
          this.isSubmitting = false;
        }
      });

    } catch (error) {
      console.error('Unexpected error during submission:', error);
      Swal.fire('Error', 'An unexpected error occurred.', 'error');
      this.isSubmitting = false;
    }
  }

  private generateApplicationId(): string {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    return `COMP/${year}${month}${day}/${randomNum}`;
  }

  goToDashboard() {
    // Clear all session data
    sessionStorage.clear();

    // Navigate to dashboard
    this.router.navigate(['/site-admin/dashboard']);
  }

  // Emit "back" event to previous step
  goBack() {
    this.back.emit();
  }
}