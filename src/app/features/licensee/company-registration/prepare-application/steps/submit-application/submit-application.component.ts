import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { MaterialModule } from '../../../../../../shared/material.module';
import { Company, CompanyDocuments } from '../../../../../../core/models/company.model';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { CompanyRegistrationService } from '../../../../../../core/services/company-registration.service';

@Component({
  selector: 'app-submit-application',
  imports: [MaterialModule],
  templateUrl: './submit-application.component.html',
  styleUrl: './submit-application.component.scss'
})
export class SubmitApplicationComponent implements OnDestroy{
  fileUrls: string[] = []

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

  constructor(private companyRegistrationService: CompanyRegistrationService, private router: Router) {}

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
    const docs = this.companyRegistrationService.getCompanyDocuments();
    this.fileUrls = [];
  
    return Object.entries(docs).map(([key, file]) => {
      const url = URL.createObjectURL(file!);
      this.fileUrls.push(url);
      return {
        key: key as keyof CompanyDocuments,
        file: file!,
        fileUrl: url
      };
    });
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
      const companyDetails: Partial<Company> = JSON.parse(sessionStorage.getItem('companyDetails') || '{}');
      const memberDetails: Partial<Company> = JSON.parse(sessionStorage.getItem('memberDetails') || '{}');
      const paymentDetails: Partial<Company> = JSON.parse(sessionStorage.getItem('paymentDetails') || '{}');

      // Get uploaded files from service
      const companyRegistrationDocuments = this.companyRegistrationService.getCompanyDocuments();

      // Ensure nothing is missing
      if (!companyDetails || !memberDetails || !paymentDetails || !companyRegistrationDocuments) {
        alert('Missing application data. Please complete the form.');
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
          // On success: notify user, clear data, redirect
          Swal.fire('Submitted!', 'Application submitted successfully!', 'success').then(() => {
            sessionStorage.clear();
            this.router.navigate(['/site-admin/dashboard']);
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

  // Emit "back" event to previous step
  goBack() {
    this.back.emit();
  }
}
