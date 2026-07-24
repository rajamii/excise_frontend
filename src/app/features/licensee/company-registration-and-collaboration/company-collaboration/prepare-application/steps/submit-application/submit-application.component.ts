import { HttpErrorResponse } from '@angular/common/http';
import { Component, DoCheck, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationBottlerDetails,
  CompanyCollaborationBrand,
  CompanyCollaborationCompanyDetails,
  CompanyCollaborationFeeStructure,
  CompanyCollaborationSubmission
} from '../../../../../../../core/models/company-collaboration.model';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';
import { MaterialModule } from '../../../../../../../shared/material.module';

@Component({
  selector: 'app-submit-application',
  standalone: true,
  imports: [MaterialModule, FormsModule],
  templateUrl: './submit-application.component.html',
  styleUrl: './submit-application.component.scss'
})
export class SubmitApplicationComponent implements OnInit, DoCheck {
  @Output() readonly back = new EventEmitter<void>();

  bottlerDetails: Partial<CompanyCollaborationBottlerDetails> = {};
  companyDetails: Partial<CompanyCollaborationCompanyDetails> = {};
  selectedBrands: CompanyCollaborationBrand[] = [];
  feeStructure: CompanyCollaborationFeeStructure | null = null;

  acceptTerms = false;
  isSubmitting = false;
  applicationId: string | null = null;
  submissionMode: 'online' | null = null;

  private lastDataCheck = '';

  constructor(
    private router: Router,
    private collaborationService: CompanyCollaborationService
  ) {}

  ngOnInit(): void {
    this.loadApplicationData();
  }

  ngDoCheck(): void {
    const currentData = JSON.stringify({
      bottler: sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails),
      company: sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.companyDetails),
      brands: sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands),
      fees: sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure)
    });

    if (currentData !== this.lastDataCheck) {
      this.loadApplicationData();
      this.lastDataCheck = currentData;
    }
  }

  private loadApplicationData(): void {
    this.bottlerDetails = this.getStorageData(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails, {});
    this.companyDetails = this.getStorageData(COMPANY_COLLAB_STORAGE_KEYS.companyDetails, {});
    this.selectedBrands = this.getStorageData<CompanyCollaborationBrand[]>(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands, []);
    this.feeStructure = this.getStorageData<CompanyCollaborationFeeStructure | null>(
      COMPANY_COLLAB_STORAGE_KEYS.feeStructure,
      null
    );
  }

  private getStorageData<T>(key: string, fallback: T): T {
    const stored = sessionStorage.getItem(key);
    if (!stored) {
      return fallback;
    }
    try {
      return JSON.parse(stored) as T;
    } catch (error) {
      console.error(`Unable to parse session data for key "${key}"`, error);
      return fallback;
    }
  }

  getTotalAmount(): number {
    if (!this.feeStructure) {
      return 0;
    }
    return Number(this.feeStructure.collaborationFee || 0) + 25000;
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-GB');
  }

  viewTerms(event: Event): void {
    event.preventDefault();
    Swal.fire({
      title: 'Terms and Conditions',
      html: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto;">
          <h4>Brand Collaboration Agreement</h4>
          <ol>
            <li><strong>Application Processing:</strong> Applications are processed in 7-15 working days.</li>
            <li><strong>Fee Structure:</strong> All charges are non-refundable except eligible security deposits.</li>
            <li><strong>Compliance:</strong> Applicant must comply with all excise laws and conditions.</li>
            <li><strong>Renewal:</strong> Collaboration approvals are subject to periodic renewal.</li>
          </ol>
        </div>
      `,
      confirmButtonText: 'I Understand',
      width: 600
    });
  }

  async submitApplication(): Promise<void> {
    if (!this.acceptTerms) {
      Swal.fire('Warning', 'Please accept the terms and conditions to proceed.', 'warning');
      return;
    }

    if (!this.isDataReadyForSubmit()) {
      Swal.fire('Incomplete application', 'Please complete all steps before submission.', 'error');
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
      const formData = this.buildFormData();
      const response = await firstValueFrom(this.collaborationService.applyCompanyCollaboration(formData));

      this.applicationId =
        response?.application_id ||
        response?.applicationId ||
        response?.data?.application_id ||
        response?.data?.applicationId ||
        null;
      this.submissionMode = 'online';
      this.saveSubmission('Submitted', 'online');

      // FIX: Clear session data and show the in-page success screen.
      // Do NOT navigate away here — let the user use the action buttons below.
      this.clearApplicationData();

      await Swal.fire(
        'Success',
        `Application submitted successfully. ID: ${this.applicationId}`,
        'success'
      );
    } catch (error) {
      const httpError = error as HttpErrorResponse;
      console.error('Company collaboration submit failed:', httpError);

      await Swal.fire(
        'Submission Failed',
        this.getErrorMessage(httpError),
        'error'
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  private isDataReadyForSubmit(): boolean {
    const b = this.bottlerDetails;
    const hasBottler = !!b?.brandOwnerName && !!b?.brandOwnerPan && !!b?.brandOwnerOfficeAddress && !!b?.brandOwnerFactoryAddress && !!b?.brandOwnerMobile && !!b?.brandOwnerEmail && !!b?.brandType && !!b?.license && !!b?.country && !!b?.state && !!b?.pinCode;
    const hasCompany = !!this.companyDetails?.bottlerName && !!this.companyDetails?.bottlerId;
    const hasBrands = Array.isArray(this.selectedBrands) && this.selectedBrands.length > 0;
    const hasFee = !!this.feeStructure;

    const membersRaw = sessionStorage.getItem('companyCollabMembersList');
    const hasMembers = !!membersRaw && JSON.parse(membersRaw).length > 0;

    const docs = this.collaborationService.getCollabDocuments();
    const hasRequiredDocs = !!docs['exciseLicense'] && !!docs['memorandumOfAssociation'] && !!docs['undertaking'];

    return hasBottler && hasCompany && hasBrands && hasFee && hasMembers && hasRequiredDocs;
  }

  private buildFormData(): FormData {
    const formData = new FormData();
    const selectedBrandIds = this.selectedBrands.map((brand) => brand.id);

    formData.append('financial_year', String(this.bottlerDetails.financialYear || this.getCurrentFinancialYear()));
    formData.append('application_year', String(this.bottlerDetails.financialYear || this.getCurrentFinancialYear()));
    formData.append('brand_owner', String(this.bottlerDetails.brandOwnerName || ''));
    formData.append('brand_owner_code', String(this.bottlerDetails.brandOwnerCode || ''));
    formData.append('brand_owner_name', String(this.bottlerDetails.brandOwnerName || ''));
    formData.append('brand_owner_office_address', String(this.bottlerDetails.brandOwnerOfficeAddress || ''));
    formData.append('brand_owner_factory_address', String(this.bottlerDetails.brandOwnerFactoryAddress || ''));
    formData.append('brand_owner_pan', String(this.bottlerDetails.brandOwnerPan || ''));
    formData.append('brand_owner_mobile', String(this.bottlerDetails.brandOwnerMobile || ''));
    formData.append('brand_owner_email', String(this.bottlerDetails.brandOwnerEmail || ''));

    // Registration specific fields
    formData.append('brand_type', String(this.bottlerDetails.brandType || ''));
    formData.append('brandType', String(this.bottlerDetails.brandType || ''));
    formData.append('license', String(this.bottlerDetails.license || ''));
    formData.append('country', String(this.bottlerDetails.country || ''));
    formData.append('state', String(this.bottlerDetails.state || ''));
    formData.append('pinCode', String(this.bottlerDetails.pinCode || ''));
    formData.append('pin_code', String(this.bottlerDetails.pinCode || ''));

    formData.append('licensee_name', String(this.companyDetails.bottlerName || ''));
    formData.append('licensee_address', String(this.companyDetails.bottlerAddress || ''));
    formData.append('license_number', String(this.companyDetails.bottlerId || ''));

    const enrichedFee = {
      ...(this.feeStructure || {}),
      companyRegistrationFee: 25000
    };
    formData.append('selected_brand_ids', JSON.stringify(selectedBrandIds));
    formData.append('selected_brands', JSON.stringify(this.selectedBrands));
    formData.append('fee_structure', JSON.stringify(enrichedFee));
    formData.append(
      'overview_summary',
      JSON.stringify({
        totalBrands: selectedBrandIds.length,
        totalAmount: this.getTotalAmount(),
        applicationDate: new Date().toISOString().split('T')[0],
        selectedBrands: this.selectedBrands,
        feeStructure: enrichedFee
      })
    );

    // Append members list
    const membersRaw = sessionStorage.getItem('companyCollabMembersList') || '[]';
    formData.append('members', membersRaw);

    // Append documents from company collaboration service
    const docs = this.collaborationService.getCollabDocuments();
    for (const [k, file] of Object.entries(docs)) {
      if (file instanceof File) {
        formData.append(k, file);
      }
    }

    // fallback undertaking if not uploaded
    if (!docs['undertaking']) {
      formData.append('undertaking', this.createUndertakingFile());
    }

    return formData;
  }

  private createUndertakingFile(): File {
    const undertakingBlob = new Blob(['Company Collaboration Undertaking'], { type: 'text/plain' });
    return new File([undertakingBlob], 'undertaking.txt', { type: 'text/plain' });
  }

  private saveSubmission(status: string, mode: 'online' | 'local'): void {
    const payload: CompanyCollaborationSubmission = {
      applicationId: this.applicationId || '',
      status,
      submittedAt: new Date().toISOString(),
      mode,
      totalAmount: this.getTotalAmount(),
    };
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.submission, JSON.stringify(payload));
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    const detail = error?.error?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    if (detail && typeof detail === 'object') {
      const firstEntry = Object.entries(detail)[0];
      if (firstEntry) {
        const [, value] = firstEntry;
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value);
      }
    }

    if (error?.error && typeof error.error === 'object') {
      const firstEntry = Object.entries(error.error)[0];
      if (firstEntry) {
        const [, value] = firstEntry;
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value);
      }
    }

    return error?.message || 'Unable to submit company collaboration application.';
  }

  private getCurrentFinancialYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    return now.getMonth() + 1 >= 4
      ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}`
      : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
  }

  downloadReceipt(): void {
    Swal.fire({
      title: 'Receipt Download',
      text: 'Receipt will be sent to your registered email address within 24 hours.',
      icon: 'info',
      confirmButtonColor: '#1C2B78'
    });
  }

  // FIX: Navigate to dashboard instead of the non-existent list route.
  openApplicationSummary(): void {
    this.router.navigate(['/dashboard']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    this.back.emit();
  }

  removeBrand(brandId: string | number): void {
    // Filter out the brand from selectedBrands
    this.selectedBrands = this.selectedBrands.filter((b) => String(b.id) !== String(brandId));
    
    // Update selected brand IDs in session storage
    const selectedBrandIds = this.selectedBrands.map((b) => String(b.id));
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands, JSON.stringify(this.selectedBrands));
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds, JSON.stringify(selectedBrandIds));
    this.collaborationService.setSelectedBrands(this.selectedBrands);

    // Refresh the fee structure
    this.refreshFeeStructure();
  }

  removeBrandSize(brandId: string | number, sizeLabel: string): void {
    // Remove the specific size from selected brand
    this.selectedBrands = this.selectedBrands.map((b) => {
      if (String(b.id) === String(brandId)) {
        if (b.selected_sizes) {
          b.selected_sizes = b.selected_sizes.filter(s => s !== sizeLabel);
        }
      }
      return b;
    }).filter((b) => b.selected_sizes && b.selected_sizes.length > 0);

    // Update session storage
    const selectedBrandIds = this.selectedBrands.map((b) => String(b.id));
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands, JSON.stringify(this.selectedBrands));
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds, JSON.stringify(selectedBrandIds));
    this.collaborationService.setSelectedBrands(this.selectedBrands);

    // Refresh the fee structure
    this.refreshFeeStructure();
  }

  private refreshFeeStructure(): void {
    if (this.selectedBrands.length === 0) {
      this.feeStructure = null;
      sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
      sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary);
      return;
    }

    this.collaborationService.getFeeStructure().subscribe({
      next: (fee) => {
        this.feeStructure = fee;
        sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure, JSON.stringify(fee));
        
        // Update overview summary in session storage
        sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary, JSON.stringify({
          totalBrands:     this.selectedBrands.length,
          totalAmount:     this.getTotalAmount(),
          applicationDate: this.getCurrentDate(),
          selectedBrands:  this.selectedBrands
        }));
      },
      error: (err) => {
        console.error('Failed to load fee structure:', err);
        this.feeStructure = null;
        sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
      }
    });
  }


  private clearApplicationData(): void {
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.companyDetails);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary);
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.submission);
    sessionStorage.removeItem('companyCollabMembersList');
    this.collaborationService.clearSelectedBrands();
    this.collaborationService.clearCollabDocuments();
  }
}