import { Component, EventEmitter, Output, OnInit, DoCheck } from '@angular/core';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

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

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadApplicationData();
  }

  ngDoCheck() {
    // Create a hash of current sessionStorage data to detect changes
    const currentData = JSON.stringify({
      bottler: sessionStorage.getItem('bottlerDetails'),
      company: sessionStorage.getItem('companyDetails'),
      brands: sessionStorage.getItem('selectedBrandsDetails'),
      fees: sessionStorage.getItem('feeStructure')
    });

    // If data has changed, reload it
    if (currentData !== this.lastDataCheck) {
      this.loadApplicationData();
      this.lastDataCheck = currentData;
    }
  }

  private loadApplicationData() {
    // Load all saved data from sessionStorage
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

    // Show confirmation dialog
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
      // Simulate API call
      await this.simulateAPISubmission();
      
      // Generate application ID
      this.applicationId = this.generateApplicationId();
      
      // Save submission details
      const submissionData = {
        applicationId: this.applicationId,
        submissionDate: new Date().toISOString(),
        status: 'Submitted',
        totalAmount: this.getTotalAmount()
      };
      
      sessionStorage.setItem('submissionData', JSON.stringify(submissionData));

      // Show success message
      await Swal.fire({
        title: 'Success!',
        text: `Application submitted successfully! Your application ID is ${this.applicationId}`,
        icon: 'success',
        confirmButtonColor: '#1C2B78'
      });

    } catch (error) {
      console.error('Submission failed:', error);
      await Swal.fire({
        title: 'Error',
        text: 'Failed to submit application. Please try again.',
        icon: 'error',
        confirmButtonColor: '#1C2B78'
      });
    } finally {
      this.isSubmitting = false;
    }
  }

  private async simulateAPISubmission(): Promise<void> {
    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 3000);
    });
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
    // In a real application, this would generate and download a PDF receipt
    Swal.fire({
      title: 'Receipt Download',
      text: 'Receipt will be sent to your registered email address within 24 hours.',
      icon: 'info',
      confirmButtonColor: '#1C2B78'
    });
  }

  goToDashboard() {
    // Clear all session data
    sessionStorage.clear();
    
    // Navigate to dashboard
    this.router.navigate(['/licensee/dashboard']);
  }

  goBack() {
    this.back.emit();
  }
}