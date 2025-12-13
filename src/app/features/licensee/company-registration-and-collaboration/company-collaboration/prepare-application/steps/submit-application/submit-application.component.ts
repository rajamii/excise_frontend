import { Component, EventEmitter, Output, OnInit, DoCheck } from '@angular/core';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';

@Component({
  selector: 'app-submit-application',
  standalone: true,
  imports: [MaterialModule, FormsModule],
  templateUrl: './submit-application.component.html',
  styleUrl: './submit-application.component.scss'
})
export class SubmitApplicationComponent implements OnInit, DoCheck {
  @Output() readonly back = new EventEmitter<void>();

  bottlerDetails: any = null;
  companyDetails: any = null;
  selectedBrands: any[] = [];
  feeStructure: any = null;

  acceptTerms: boolean = false;
  isSubmitting: boolean = false;
  applicationId: string | null = null;

  private lastDataCheck: string = '';

  constructor(
    private router: Router,
    private collaborationService: CompanyCollaborationService
  ) { }

  ngOnInit() {
    this.loadApplicationData();
  }

  ngDoCheck() {
    const currentData = JSON.stringify({
      bottler: sessionStorage.getItem('bottlerDetails'),
      company: sessionStorage.getItem('companyDetails'),
      brands: sessionStorage.getItem('selectedBrandsDetails'),
      fees: sessionStorage.getItem('feeStructure')
    });

    if (currentData !== this.lastDataCheck) {
      this.loadApplicationData();
      this.lastDataCheck = currentData;
    }
  }

  private loadApplicationData() {
    const bottlerData = sessionStorage.getItem('bottlerDetails');
    if (bottlerData) {
      this.bottlerDetails = JSON.parse(bottlerData);
    }

    const companyData = sessionStorage.getItem('companyDetails');
    if (companyData) {
      this.companyDetails = JSON.parse(companyData);
    }

    const brandsData = sessionStorage.getItem('selectedBrandsDetails');
    if (brandsData) {
      this.selectedBrands = JSON.parse(brandsData);
    }

    const feeData = sessionStorage.getItem('feeStructure');
    if (feeData) {
      this.feeStructure = JSON.parse(feeData);
    }
  }

  getTotalAmount(): number {
    if (!this.feeStructure) return 0;
    return this.feeStructure.applicationFee + this.feeStructure.collaborationFee + this.feeStructure.securityDeposit;
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-GB');
  }

  viewTerms(event: Event) {
    event.preventDefault();

    Swal.fire({
      title: 'Terms and Conditions',
      html: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto;">
          <h4>Brand Collaboration Agreement</h4>
          <ol>
            <li><strong>Application Processing:</strong> Applications will be processed within 7-15 working days from submission.</li>
            <li><strong>Fee Structure:</strong> All fees mentioned are non-refundable except security deposit.</li>
            <li><strong>Security Deposit:</strong> Refundable subject to compliance with terms and conditions.</li>
            <li><strong>Brand Usage:</strong> Collaboration permits usage only for specified brands and sizes.</li>
            <li><strong>Compliance:</strong> Licensee must comply with all excise laws and regulations.</li>
            <li><strong>Renewal:</strong> Collaboration agreements are subject to annual renewal.</li>
            <li><strong>Termination:</strong> Either party may terminate with 30 days notice.</li>
            <li><strong>Documentation:</strong> All required documents must be submitted as per checklist.</li>
          </ol>
          <p><strong>Note:</strong> By accepting these terms, you agree to abide by all applicable laws and regulations.</p>
        </div>
      `,
      confirmButtonText: 'I Understand',
      width: 600,
      customClass: {
        popup: 'terms-popup'
      }
    });
  }

  async submitApplication() {
    if (!this.acceptTerms) {
      Swal.fire('Warning', 'Please accept the terms and conditions to proceed.', 'warning');
      return;
    }

    // Validate required data
    if (!this.bottlerDetails || !this.bottlerDetails.brandOwner) {
      Swal.fire('Error', 'Please complete the bottler details section.', 'error');
      return;
    }

    if (!this.companyDetails) {
      Swal.fire('Error', 'Please complete the company details section.', 'error');
      return;
    }

    if (!this.selectedBrands || this.selectedBrands.length === 0) {
      Swal.fire('Error', 'Please select at least one brand.', 'error');
      return;
    }

    if (!this.feeStructure) {
      Swal.fire('Error', 'Fee structure information is missing.', 'error');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Confirm Submission',
      text: 'Are you sure you want to submit this collaboration application?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit',
      cancelButtonText: 'Review Again',
      confirmButtonColor: '#1C2B78'
    });

    if (!confirm.isConfirmed) {
      return;
    }

    this.isSubmitting = true;

    try {
      // Build collaboration FormData directly and submit to collaboration API
      // Clean and validate mobile number
      let mobileNumber = '';
      if (this.companyDetails.contactNumber) {
        mobileNumber = String(this.companyDetails.contactNumber).replace(/\D/g, '');
      }

      if (!mobileNumber || mobileNumber.length !== 10 || !/^[6-9]/.test(mobileNumber)) {
        throw new Error('Invalid mobile number. Must be 10 digits starting with 6-9.');
      }

      // Clean names and address
      const companyName = String(this.companyDetails.licenseeName || '').replace(/[^A-Za-z\s]/g, '').trim();
      const contactPerson = String(this.companyDetails.contactPerson || '').replace(/[^A-Za-z\s]/g, '').trim();
      const address = String(this.companyDetails.licenseeAddress || '').trim();
      const email = String(this.companyDetails.emailAddress || '').trim();

      if (!companyName) throw new Error('Company name is required and must contain only alphabets and spaces.');
      if (!contactPerson) throw new Error('Contact person name is required and must contain only alphabets and spaces.');
      if (!address) throw new Error('Address is required.');
      if (!email) throw new Error('Email address is required.');

      const fd = new FormData();

      // Company details
      fd.append('licenseeName', companyName);
      fd.append('licenseeAddress', address);
      fd.append('contactPerson', contactPerson);
      fd.append('contactNumber', mobileNumber);
      fd.append('emailAddress', email);
      if (this.companyDetails.licenseNumber) fd.append('licenseNumber', String(this.companyDetails.licenseNumber));
      if (this.companyDetails.licenseType) fd.append('licenseType', String(this.companyDetails.licenseType));
      if (this.companyDetails.establishmentType) fd.append('establishmentType', String(this.companyDetails.establishmentType));
      if (this.companyDetails.businessRegNumber) fd.append('businessRegNumber', String(this.companyDetails.businessRegNumber));

      // Bottler / brand owner and year
      fd.append('financialYear', String(this.bottlerDetails.financialYear || this.getCurrentFinancialYear()));
      fd.append('applicationYear', String(this.bottlerDetails.financialYear || this.getCurrentFinancialYear()));
      fd.append('brandOwner', String(this.bottlerDetails.brandOwner));
      if (this.bottlerDetails.brandOwnerCode) fd.append('brandOwnerCode', String(this.bottlerDetails.brandOwnerCode));
      if (this.bottlerDetails.brandOwnerName) fd.append('brandOwnerName', String(this.bottlerDetails.brandOwnerName));
      if (this.bottlerDetails.brandOwnerAddress) fd.append('brandOwnerAddress', String(this.bottlerDetails.brandOwnerAddress));

      // Selected brands and fees
      const selectedBrandIds = (this.selectedBrands || []).map((b: any) => b.id);
      fd.append('selectedBrands', JSON.stringify(selectedBrandIds));
      fd.append('feeStructure', JSON.stringify(this.feeStructure || {}));

      // Overview summary
      const overviewSummary = {
        totalBrands: selectedBrandIds.length,
        totalAmount: this.getTotalAmount(),
        applicationDate: new Date().toISOString().split('T')[0],
        selectedBrands: this.selectedBrands || []
      };
      fd.append('overviewSummary', JSON.stringify(overviewSummary));

      // Undertaking file
      const undertakingBlob = new Blob(['Company Collaboration Undertaking'], { type: 'text/plain' });
      const undertakingFile = new File([undertakingBlob], 'undertaking.txt', { type: 'text/plain' });
      fd.append('undertaking', undertakingFile);

      console.log('Submitting collaboration FormData');
      const response = await this.collaborationService.createCollaboration(fd).toPromise();

      this.applicationId = response.id ? `COLLAB-${response.id}` : this.generateApplicationId();

      const submissionData = {
        applicationId: this.applicationId,
        collaborationId: response.id,
        submissionDate: new Date().toISOString(),
        status: response.status || 'Submitted',
        totalAmount: this.getTotalAmount()
      };

      sessionStorage.setItem('submissionData', JSON.stringify(submissionData));

      await Swal.fire({
        title: 'Success!',
        text: `Application submitted successfully! Your application ID is ${this.applicationId}`,
        icon: 'success',
        confirmButtonColor: '#1C2B78'
      });

      this.goToDashboard();

    } catch (error: any) {
      console.error('=== Submission Failed ===');
      console.error('Full error:', error);
      console.error('Error status:', error?.status);
      console.error('Error body:', error?.error);

      let errorMessage = 'Failed to submit application. Please try again.';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        if (typeof error.error === 'string') {
          if (error.error.trim().startsWith('<!DOCTYPE')) {
            errorMessage = 'Server error (500). Check backend logs.';
          } else {
            errorMessage = error.error;
          }
        } else if (typeof error.error === 'object') {
          const errorMessages: string[] = [];
          for (const [field, messages] of Object.entries(error.error)) {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              errorMessages.push(`${field}: ${messages}`);
            }
          }
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join('<br>');
          }
        }
      } else if (error.status === 500) {
        errorMessage = 'Internal server error. Check backend logs.';
      }

      await Swal.fire({
        title: 'Error',
        html: `<div style="text-align: left; max-height: 400px; overflow-y: auto;">${errorMessage}</div>`,
        icon: 'error',
        confirmButtonColor: '#1C2B78',
        width: 600
      });
    } finally {
      this.isSubmitting = false;
    }
  }

  private getCurrentFinancialYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (currentMonth >= 4) {
      return `${currentYear}-${(currentYear + 1).toString().substring(2)}`;
    } else {
      return `${currentYear - 1}-${currentYear.toString().substring(2)}`;
    }
  }

  private generatePaymentId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `PAY-${timestamp}-${random}`;
  }

  private generatePAN(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    let pan = '';
    for (let i = 0; i < 5; i++) {
      pan += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 4; i++) {
      pan += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    pan += letters.charAt(Math.floor(Math.random() * letters.length));

    return pan;
  }

  private generateApplicationId(): string {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    return `COLLAB/${year}${month}${day}/${randomNum}`;
  }

  downloadReceipt() {
    Swal.fire({
      title: 'Receipt Download',
      text: 'Receipt will be sent to your registered email address within 24 hours.',
      icon: 'info',
      confirmButtonColor: '#1C2B78'
    });
  }

  goToDashboard() {
    sessionStorage.clear();
    this.router.navigate(['/licensee/dashboard']);
  }

  goBack() {
    this.back.emit();
  }
}