import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MaterialModule } from '../../../../../../shared/material.module';
import { SalesmanBarmanRegistrationService } from '../../../../../../core/services/salesman-barman-registration.service';
import { SalesmanBarman, SalesmanBarmanDocuments } from '../../../../../../core/models/salesman-barman.model';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-submit-application',
  standalone: true,
  imports: [MaterialModule, FormsModule],
  templateUrl: './submit-application.component.html',
  styleUrl: './submit-application.component.scss'
})
export class SubmitApplicationComponent implements OnInit, OnDestroy {
  fileUrls: string[] = [];
  acceptTerms: boolean = false;
  isSubmitting: boolean = false;
  applicationId: string | null = null;

  // Cache for salesman/barman documents to prevent recreating URLs
  private cachedDocuments: { key: keyof SalesmanBarmanDocuments; file: File; fileUrl: string }[] = [];

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

  // Human-readable labels for personal details
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
    residentialCertificate: 'Sikkim Subject Certificate / Certificate of Identification / Residential Certificate',
    dateofBirthProof: 'Date of Birth Proof',
  };

  @Output() back = new EventEmitter<void>();

  constructor(
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Clear any existing cache to force fresh load
    this.cachedDocuments = [];
    this.fileUrls.forEach(url => URL.revokeObjectURL(url));
    this.fileUrls = [];
    
    // Force refresh of documents on init
    this.refreshDocuments();
  }

  ngOnDestroy(): void {
    this.fileUrls.forEach(url => URL.revokeObjectURL(url));
  }

  private refreshDocuments(): void {
    // Clear cache to force reload
    this.cachedDocuments = [];
    this.fileUrls.forEach(url => URL.revokeObjectURL(url));
    this.fileUrls = [];
    
    // Log what's in the service
    const docs = this.salesmanBarmanService.getSalesmanBarmanDocuments();
    console.log('=== DOCUMENT DEBUG INFO ===');
    console.log('Full documents object:', docs);
    
    // Check each document key
    const documentKeys: (keyof SalesmanBarmanDocuments)[] = ['passPhoto', 'aadhaarCard', 'residentialCertificate', 'dateofBirthProof'];
    documentKeys.forEach(key => {
      const file = docs[key];
      console.log(`Document ${key}:`, {
        exists: !!file,
        isFile: file instanceof File,
        name: file?.name,
        size: file?.size,
        type: file?.type
      });
    });
    
    const validCount = Object.keys(docs).filter(key => docs[key as keyof SalesmanBarmanDocuments]).length;
    console.log('Total valid documents:', validCount);
    console.log('=========================');
  }

  // Get formatted license details from session storage for display
  get licenseDetails() {
    return this.getGroupedEntries<Partial<SalesmanBarman>>('licenseDetails', this.licenseLabels);
  }

  // Get formatted personal details from session storage for display with Yes/No conversion
  get personalDetails() {
    const details = this.getGroupedEntries<Partial<SalesmanBarman>>('personalDetails', this.personLabels);
    
    // Convert boolean sikkimSubject to Yes/No
    return details.map(item => {
      if (item.key === 'Sikkim Subject') {
        const value = item.value;
        if (value === true || value === 'true') {
          return { ...item, value: 'Yes' };
        } else if (value === false || value === 'false') {
          return { ...item, value: 'No' };
        }
      }
      return item;
    });
  }

  // Get uploaded document metadata (filename) for preview display
  get salesmanBarmanDocuments(): { key: keyof SalesmanBarmanDocuments; file: File; fileUrl: string }[] {
    // Get fresh documents from service
    const docs = this.salesmanBarmanService.getSalesmanBarmanDocuments();
    
    // Count how many documents are actually in the service
    const serviceDocCount = Object.keys(docs).filter(key => docs[key as keyof SalesmanBarmanDocuments]).length;
    
    // If cache exists but has different count than service, clear cache and rebuild
    if (this.cachedDocuments.length > 0 && this.cachedDocuments.length !== serviceDocCount) {
      console.log('Cache mismatch detected. Clearing cache and rebuilding...');
      this.fileUrls.forEach(url => URL.revokeObjectURL(url));
      this.fileUrls = [];
      this.cachedDocuments = [];
    }
    
    // If we have valid cached documents matching service count, return them
    if (this.cachedDocuments.length > 0 && this.cachedDocuments.length === serviceDocCount) {
      console.log('Returning cached documents:', this.cachedDocuments.length);
      return this.cachedDocuments;
    }

    // Clear any old URLs
    this.fileUrls.forEach(url => URL.revokeObjectURL(url));
    this.fileUrls = [];
    this.cachedDocuments = [];

    console.log('Creating new document cache...');
    console.log('Raw docs object:', docs);
    console.log('Service has documents:', serviceDocCount);

    // Define all possible document keys
    const documentKeys: (keyof SalesmanBarmanDocuments)[] = [
      'passPhoto',
      'aadhaarCard',
      'residentialCertificate',
      'dateofBirthProof'
    ];

    // Check each key explicitly and create object URLs
    documentKeys.forEach(key => {
      const file = docs[key];
      console.log(`Checking ${key}:`, {
        exists: !!file,
        isFile: file instanceof File,
        fileName: file?.name
      });

      // Check if file exists and is a File instance
      if (file && file instanceof File) {
        try {
          const url = URL.createObjectURL(file);
          this.fileUrls.push(url);
          this.cachedDocuments.push({
            key: key,
            file: file,
            fileUrl: url
          });
          console.log(`✓ Added ${key} to cache`);
        } catch (error) {
          console.error(`✗ Error creating URL for ${key}:`, error);
        }
      } else {
        console.log(`✗ Skipping ${key} - not a valid file`);
      }
    });

    console.log(`Total cached documents: ${this.cachedDocuments.length}`);
    console.log(`Expected documents: ${serviceDocCount}`);
    return this.cachedDocuments;
  }

  get role(): string | null {
    const storedData = sessionStorage.getItem('licenseDetails');
    try {
      const parsed = storedData ? JSON.parse(storedData) : null;
      return parsed?.role || parsed?.modeOfOperation || null;
    } catch {
      return null;
    }
  }

  // Get summary data for the application summary section
  getSummaryData(): { key: string; value: any }[] {
    const summary: { key: string; value: any }[] = [];

    // Add key license details
    const licenseData = sessionStorage.getItem('licenseDetails');
    if (licenseData) {
      try {
        const parsed = JSON.parse(licenseData);
        
        if (parsed.financialYear || parsed.applicationYear) {
          summary.push({ key: 'Financial Year', value: parsed.financialYear || parsed.applicationYear });
        }
        if (parsed.districtName || parsed.district) {
          summary.push({ key: 'District', value: parsed.districtName || parsed.district });
        }
        if (parsed.modeOfOperationLabel || parsed.role) {
          summary.push({ key: 'Mode of Operation', value: parsed.modeOfOperationLabel || parsed.role });
        }
      } catch (e) {
        console.error('Error parsing license details:', e);
      }
    }

    // Add key personal details
    const personalData = sessionStorage.getItem('personalDetails');
    if (personalData) {
      try {
        const parsed = JSON.parse(personalData);
        
        const nameData: string[] = [];
        if (parsed.firstName) nameData.push(parsed.firstName);
        if (parsed.middleName) nameData.push(parsed.middleName);
        if (parsed.lastName) nameData.push(parsed.lastName);
        
        if (nameData.length > 0) {
          summary.push({ key: 'Applicant Name', value: nameData.join(' ') });
        }
        
        if (parsed.mobileNumber) {
          summary.push({ key: 'Mobile Number', value: parsed.mobileNumber });
        }
        
        if (parsed.emailId) {
          summary.push({ key: 'Email', value: parsed.emailId });
        }
      } catch (e) {
        console.error('Error parsing personal details:', e);
      }
    }

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

  viewFile(doc: { key: keyof SalesmanBarmanDocuments; file: File; fileUrl: string }) {
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

  // Submit the full application
  async submit(): Promise<void> {
    if (!this.acceptTerms) {
      Swal.fire('Warning', 'Please accept the terms and conditions to proceed.', 'warning');
      return;
    }

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
      const licenseDetails: Partial<SalesmanBarman> = JSON.parse(sessionStorage.getItem('licenseDetails') || '{}');
      const personalDetails: Partial<SalesmanBarman> = JSON.parse(sessionStorage.getItem('personalDetails') || '{}');
      const salesmanBarmanDocuments = this.salesmanBarmanService.getSalesmanBarmanDocuments();

      if (!licenseDetails || !personalDetails || !salesmanBarmanDocuments) {
        Swal.fire('Error', 'Missing application data. Please complete the form.', 'error');
        this.isSubmitting = false;
        return;
      }

      // Validate required documents
      const requiredDocs = ['passPhoto', 'aadhaarCard', 'residentialCertificate', 'dateofBirthProof'] as (keyof SalesmanBarmanDocuments)[];
      const missing = requiredDocs.filter(key => !salesmanBarmanDocuments[key]);
      if (missing.length > 0) {
        Swal.fire('Error', `Missing required documents: ${missing.map(d => this.documentLabels[d] || d).join(', ')}`, 'error');
        this.isSubmitting = false;
        return;
      }

      const formData = new FormData();
      const combinedDetails = { ...licenseDetails, ...personalDetails };

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

      this.salesmanBarmanService.createSalesmanBarman(formData).subscribe({
        next: () => {
          this.applicationId = this.generateApplicationId();
          
          Swal.fire({
            title: 'Success!',
            text: `Application submitted successfully! Your application ID is ${this.applicationId}`,
            icon: 'success',
            confirmButtonColor: '#1C2B78'
          });
        },
        error: (err) => {
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
    
    const prefix = this.role === 'salesman' ? 'SM' : (this.role === 'barman' ? 'BM' : 'REG');
    return `${prefix}/${year}${month}${day}/${randomNum}`;
  }

  goToDashboard() {
    sessionStorage.clear();
    this.salesmanBarmanService.clearSalesmanBarmanDocuments();
    this.router.navigate(['/site-admin/dashboard']);
  }

  goBack() {
    this.back.emit();
  }
} 