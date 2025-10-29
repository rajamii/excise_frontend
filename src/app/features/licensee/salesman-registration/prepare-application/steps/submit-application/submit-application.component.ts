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
  async submit() {
  const confirm = await Swal.fire({
    title: 'Submit Application?',
    text: 'Are you sure you want to submit this application?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Submit',
    cancelButtonText: 'Cancel',
  });

  if (!confirm.isConfirmed) return;

  try {
    const licenseDetails: Partial<SalesmanBarman> = JSON.parse(sessionStorage.getItem('licenseDetails') || '{}');
    const personalDetails: Partial<SalesmanBarman> = JSON.parse(sessionStorage.getItem('personalDetails') || '{}');
    const documents = this.salesmanBarmanService.getSalesmanBarmanDocuments();

    if (!licenseDetails.role || !personalDetails.firstName || Object.keys(documents).length < 4) {
      Swal.fire('Incomplete', 'Please fill all steps.', 'warning');
      return;
    }

    const formData = new FormData();
    const combined = { ...licenseDetails, ...personalDetails };

    Object.entries(combined).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    Object.keys(documents).forEach(key => {
      const file = documents[key as keyof SalesmanBarmanDocuments];
      if (file) formData.append(key, file, file.name);
    });

    this.salesmanBarmanService.createSalesmanBarman(formData).subscribe({
      next: (response) => {
        Swal.fire({
          title: 'Success!',
          text: `Application submitted! ID: ${response.applicationId}`,
          icon: 'success'
        }).then(() => {
          sessionStorage.clear();
          this.salesmanBarmanService.clearSalesmanBarmanDocuments();
          this.router.navigate(['/site-admin/dashboard']);
        });
      },
      error: (err) => {
        const msg = err.error?.detail || err.error?.non_field_errors?.[0] || 'Submission failed';
        Swal.fire('Error', msg, 'error');
      }
    });

  } catch (error) {
    console.error(error);
    Swal.fire('Error', 'Unexpected error.', 'error');
  }
}

  // Emit "back" event to previous step
  goBack() {
    this.back.emit();
  }
}
