import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { SalesmanBarmanRegistrationService } from '../../../../../core/services/salesman-barman-registration.service';
import { SalesmanBarman, SalesmanBarmanDocuments } from '../../../../../core/models/salesman-barman.model';
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

  acceptTerms: boolean = false;
  isSubmitting: boolean = false;
  applicationId: string | null = null;

  salesmanBarmanDocuments: Array<{ key: keyof SalesmanBarmanDocuments; file: File; fileUrl: string }> = [];

  readonly licenseLabels: Partial<Record<keyof SalesmanBarman, string>> = {
    applicationYear: 'Application Year',
    applicationId: 'Application ID',
    applicationDate: 'Application Date',
    district: 'District',
    licenseCategory: 'License Category',
    license: 'License',
    role: 'Mode of Operation',
  };

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

  readonly documentLabels: Partial<Record<keyof SalesmanBarmanDocuments, string>> = {
    passPhoto: 'Passport Size Photo',
    aadhaarCard: 'Aadhaar Card',
    residentialCertificate: 'Sikkim Subject Certificate / Certificate of Identification / Residential Certificate',
    dateofBirthProof: 'Date of Birth Proof',
  };

  @Output() back = new EventEmitter<void>();

  private fileUrlMap = new Map<String, string>();

  constructor(
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.refreshDocuments();
  }

  ngOnDestroy(): void {
    this.revokeFileUrls();
  }

  private refreshDocuments(): void {
    this.revokeFileUrls();
    this.salesmanBarmanDocuments = [];
    const docs = this.salesmanBarmanService.getSalesmanBarmanDocuments();

    (Object.entries(docs) as [keyof SalesmanBarmanDocuments, File][]).forEach(([key, file]) => {
      if (file) {
        const fileUrl = URL.createObjectURL(file);
        this.fileUrlMap.set(key, fileUrl);
        this.salesmanBarmanDocuments.push({ key, file, fileUrl });
      }
    });
  }

  private revokeFileUrls(): void {
    this.fileUrlMap.forEach(url => URL.revokeObjectURL(url));
    this.fileUrlMap.clear();
  }

  get licenseDetails(): Array<{ key: string; value: any }> {
    const data = JSON.parse(sessionStorage.getItem('licenseDetails') || '{}');
    return Object.entries(data)
      .filter(([_, v]) => v != null)
      .map(([k, v]) => ({ key: this.licenseLabels[k as keyof SalesmanBarman] || k, value: v }));
  }

  get personalDetails(): Array<{ key: string; value: any }> {
    const data = JSON.parse(sessionStorage.getItem('personalDetails') || '{}');
    return Object.entries(data)
      .filter(([_, v]) => v != null)
      .map(([k, v]) => ({
        key: this.personLabels[k as keyof SalesmanBarman] || k,
        value: k === 'sikkimSubject' ? (v ? 'Yes' : 'No') : v
      }));
  }

  getSummaryData(): Array<{ key: string; value: any }> {
    return [
      ...this.licenseDetails,
      ...this.personalDetails
    ];
  }

  viewFile(doc: { key: keyof SalesmanBarmanDocuments; fileUrl: string }): void {
    window.open(doc.fileUrl, '_blank');
  }

  get role(): string {
    const license = JSON.parse(sessionStorage.getItem('licenseDetails') || '{}');
    return license.role?.toLowerCase() || 'applicant';
  }

  submit(): void {
    if (!this.acceptTerms || this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const licenseDetails = JSON.parse(sessionStorage.getItem('licenseDetails') || '{}');
      const personalDetails = JSON.parse(sessionStorage.getItem('personalDetails') || '{}');
      const documents = this.salesmanBarmanService.getSalesmanBarmanDocuments();

      // === VALIDATION ===
      if (!licenseDetails.role || !personalDetails.firstName) {
        Swal.fire('Error', 'Please complete all steps.', 'error');
        this.isSubmitting = false;
        return;
      }

      const requiredDocs: (keyof SalesmanBarmanDocuments)[] = ['passPhoto', 'aadhaarCard', 'residentialCertificate', 'dateofBirthProof'];
      const missing = requiredDocs.filter(key => !documents[key]);
      if (missing.length > 0) {
        Swal.fire('Error', `Missing: ${missing.map(d => this.documentLabels[d]).join(', ')}`, 'error');
        this.isSubmitting = false;
        return;
      }

      // === BUILD FormData - MATCHING BACKEND EXACTLY ===
      const formData = new FormData();

      // 🔴 MASTER / REFERENCE FIELDS (Backend expects specific format)
      // excise_district: Backend expects DISTRICT CODE as string "101"
      formData.append('excise_district', String(licenseDetails.district || ''));
      
      // license_category: Backend expects Category ID as integer
      formData.append('license_category', String(licenseDetails.licenseCategory || ''));
      
      // license: Backend expects License ID as integer
      formData.append('license', String(licenseDetails.licensee || licenseDetails.license || ''));

      // 🔴 ROLE & BASIC DETAILS
      formData.append('role', licenseDetails.role); // "Salesman" or "Barman"
      formData.append('firstName', personalDetails.firstName);
      if (personalDetails.middleName) formData.append('middleName', personalDetails.middleName);
      formData.append('lastName', personalDetails.lastName);
      formData.append('fatherHusbandName', personalDetails.fatherHusbandName);
      formData.append('gender', personalDetails.gender); // "Male", "Female", "Other"
      formData.append('dob', this.formatDate(personalDetails.dob)); // YYYY-MM-DD
      if (personalDetails.nationality) formData.append('nationality', personalDetails.nationality);

      // 🔴 CONTACT & IDENTITY DETAILS
      formData.append('address', personalDetails.address);
      formData.append('pan', personalDetails.pan.toString());
      formData.append('aadhaar', personalDetails.aadhaar.toString()); // String to preserve leading zeros
      formData.append('mobileNumber', personalDetails.mobileNumber.toString()); // String
      if (personalDetails.emailId) formData.append('emailId', personalDetails.emailId);
      formData.append('sikkimSubject', personalDetails.sikkimSubject ? 'true' : 'false');

      // 🔴 FILE UPLOADS (multipart/form-data)
      formData.append('passPhoto', documents.passPhoto!, documents.passPhoto!.name);
      formData.append('aadhaarCard', documents.aadhaarCard!, documents.aadhaarCard!.name);
      formData.append('residentialCertificate', documents.residentialCertificate!, documents.residentialCertificate!.name);
      formData.append('dateofBirthProof', documents.dateofBirthProof!, documents.dateofBirthProof!.name);

      // === DEBUG LOG ===
      console.log('=== FINAL PAYLOAD (Backend Format) ===');
      for (const [k, v] of formData.entries()) {
        console.log(k, v instanceof File ? `FILE: ${v.name} (${v.size} bytes)` : v);
      }

      // === SUBMIT ===
      this.salesmanBarmanService.createSalesmanBarman(formData).subscribe({
        next: (res) => {
          this.applicationId = res.applicationId;
          sessionStorage.clear();
          this.salesmanBarmanService.clearSalesmanBarmanDocuments();
          this.revokeFileUrls();
          Swal.fire('Success!', `Application ID: ${this.applicationId}`, 'success');
          this.isSubmitting = false;
        },
        error: (err) => {
          console.error('❌ Backend Error:', err);
          const errors = Object.entries(err.error || {})
            .map(([k, v]) => `<strong>${k}:</strong> ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('<br>');
          Swal.fire({
            title: 'Validation Failed',
            html: errors || 'Please check your inputs and ensure all required fields match backend expectations.',
            icon: 'error'
          });
          this.isSubmitting = false;
        }
      });

    } catch (error) {
      console.error('Unexpected:', error);
      Swal.fire('Error', 'Something went wrong.', 'error');
      this.isSubmitting = false;
    }
  }

  private formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  goToDashboard() {
    sessionStorage.clear();
    this.salesmanBarmanService.clearSalesmanBarmanDocuments();
    this.revokeFileUrls();
    this.router.navigate(['/site-admin/dashboard']);
  }

  goBack() {
    this.back.emit();
  }
}