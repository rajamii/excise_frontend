import { Component, EventEmitter, Output } from '@angular/core';
import { MaterialModule } from '../../../../../../shared/material.module';
import { SalesmanBarmanRegistrationService } from '../../../../../../core/services/salesman-barman-registration.service';
import { SalesmanBarman, SalesmanBarmanDocuments } from '../../../../../../core/models/salesman-barman.model';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-submit-application',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './submit-application.component.html',
  styleUrl: './submit-application.component.scss'
})
export class SubmitApplicationComponent {
  fileUrls: string[] = [];

  // Human-readable labels for license details
  readonly licenseLabels: Partial<Record<keyof SalesmanBarman, string>> = {
    applicationYear: 'Application Year',
    applicationId: 'Application ID',
    applicationDate: 'Application Date',
    district: 'District',
    licenseCategory: 'License Category',
    license: 'License',
    role: 'Mode of Operation',
  };

  // Human-readable labels for peronsal details
  readonly personLabels: Partial<Record<keyof SalesmanBarman, string>> = {
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    fatherHusbandName: 'Father/Husband Name',
    gender: 'Gender',
    dob: 'Date of Birth',
    nationality: 'Nationality',
    address: 'Address',
    pan: 'PAN',
    aadhaar: 'Aadhaar Number',
    mobileNumber: 'Mobile Number',
    emailId: 'Email',
    sikkimSubject: 'Sikkim Subject',
  };

  // Human-readable labels for uploaded documents
  readonly documentLabels: Partial<Record<keyof SalesmanBarmanDocuments, string>> = {
    passPhoto: 'Passport Size Photo',
    aadhaarCard: 'Aadhaar Card',
    residentialCertificate: 'Residential Certificate',
    dateofBirthProof: 'Date of Birth Proof',
  };

  // Output event emitter to notify parent about "back" action
  @Output() back = new EventEmitter<void>();

  constructor(private salesmanBarmanService: SalesmanBarmanRegistrationService, private router: Router) {}

  ngOnDestroy(): void {
    this.fileUrls.forEach(url => URL.revokeObjectURL(url));
  }

  // Get formatted license details from session storage for display
  get licenseDetails() {
    return this.getGroupedEntries<Partial<SalesmanBarman>>('licenseDetails', this.licenseLabels);
  }

  // Get formatted personal details from session storage for display
  get personalDetails() {
    return this.getGroupedEntries<Partial<SalesmanBarman>>('personalDetails', this.personLabels);
  }

  // Get uploaded document metadata (filename) for preview display
  get salesmanBarmanDocuments(): { key: keyof SalesmanBarmanDocuments; file: File; fileUrl: string }[] {
    const docs = this.salesmanBarmanService.getSalesmanBarmanDocuments();
    this.fileUrls = [];
  
    return Object.entries(docs).map(([key, file]) => {
      const url = URL.createObjectURL(file!);
      this.fileUrls.push(url);
      return {
        key: key as keyof SalesmanBarmanDocuments,
        file: file!,
        fileUrl: url
      };
    });
  }  

  get role(): SalesmanBarman['role'] | null {
    const storedData = sessionStorage.getItem('licenseDetails');
    try {
      return storedData ? (JSON.parse(storedData) as SalesmanBarman).role : null;
    } catch {
      return null;
    }
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
    const confirm = await Swal.fire({
      // Show confirmation dialog
      title: 'Are you sure?',
      text: 'Do you want to submit this application?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      // Parse all stored data from sessionStorage
      const licenseDetails: Partial<SalesmanBarman> = JSON.parse(sessionStorage.getItem('licenseDetails') || '{}');
      const personalDetails: Partial<SalesmanBarman> = JSON.parse(sessionStorage.getItem('personalDetails') || '{}');

      // Get uploaded files from service
      const salesmanBarmanDocuments = this.salesmanBarmanService.getSalesmanBarmanDocuments();

      if (!licenseDetails || !personalDetails || !salesmanBarmanDocuments) {
        alert('Missing application data. Please complete the form.');
        return;
      }

      // Build the FormData object for the API
      const formData = new FormData();
      const combinedDetails = { ...licenseDetails, ...personalDetails };

      // Append form fields to FormData
      Object.entries(combinedDetails).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      for (const [key, file] of Object.entries(salesmanBarmanDocuments)) {
        if (file) {
          formData.append(key, file);
        }
      }

      // Make API call to submit form
      this.salesmanBarmanService.createSalesmanBarman(formData).subscribe({
        next: () => {
          // On success: notify user, clear data, redirect
          Swal.fire('Submitted!', 'Application submitted successfully!', 'success').then(() => {
            sessionStorage.clear();
            this.salesmanBarmanService.clearSalesmanBarmanDocuments();
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
