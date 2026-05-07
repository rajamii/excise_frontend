import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { LabelRegistrationUploadDetails, LabelRegistrationUploadedDocument } from '../../../../../../core/models/label-registration.model';
import { LabelRegistrationService } from '../../../../../../core/services/label-registration.service';
import { MaterialModule } from '../../../../../../shared/material.module';

@Component({
  selector: 'app-label-registration-submit-application',
  standalone: true,
  imports: [MaterialModule, FormsModule],
  templateUrl: './submit-application.component.html',
  styleUrl: './submit-application.component.scss'
})
export class LabelRegistrationSubmitApplicationComponent implements OnInit, OnDestroy {
  @Output() readonly back = new EventEmitter<void>();

  licenseeDetails: any = {};
  productDetails: any = {};
  packagingDetails: any = {};
  uploadDetails: LabelRegistrationUploadDetails = { documents: [] };

  acceptTerms = false;
  isSubmitting = false;
  applicationId: string | null = null;
  submissionMode: 'online' | 'local' | null = null;

  constructor(
    private router: Router,
    private labelRegistrationService: LabelRegistrationService
  ) {}

  ngOnInit(): void {
    this.loadApplicationData();
  }

  ngOnDestroy(): void {}

  refreshFromSessionStorage(): void {
    this.loadApplicationData();
  }

  private loadApplicationData(): void {
    this.licenseeDetails = this.getStorageData('labelRegLicenseeDetails');
    this.productDetails = this.getStorageData('labelRegProductDetails');
    this.packagingDetails = this.getStorageData('labelRegPackagingDetails');
    this.uploadDetails = this.getStorageData<LabelRegistrationUploadDetails>('labelRegUploadDocuments', { documents: [] });
  }

  private getStorageData<T = any>(key: string, fallback: T | any = {}): T {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`Unable to parse session data for ${key}:`, error);
      return fallback;
    }
  }

  getPackagingRows(): any[] {
    return Array.isArray(this.packagingDetails?.packagingRows) ? this.packagingDetails.packagingRows : [];
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-GB');
  }

  getAverageMrp(): number {
    const rows = this.getPackagingRows();
    if (!rows.length) {
      return 0;
    }
    const total = rows.reduce((sum, row) => sum + Number(row?.mrpPerBottle ?? row?.mrp ?? 0), 0);
    return total / rows.length;
  }

  getUploadedDocuments(): LabelRegistrationUploadedDocument[] {
    const documents = Array.isArray(this.uploadDetails?.documents) ? this.uploadDetails.documents : [];
    return documents.filter((document) => String(document?.fileName || '').trim());
  }

  getRequiredDocumentCount(): number {
    const documents = Array.isArray(this.uploadDetails?.documents) ? this.uploadDetails.documents : [];
    return documents.filter((document) => document?.required).length;
  }

  getUploadedRequiredDocumentCount(): number {
    const documents = Array.isArray(this.uploadDetails?.documents) ? this.uploadDetails.documents : [];
    return documents.filter((document) => document?.required && String(document?.fileName || '').trim()).length;
  }

  async submitApplication(): Promise<void> {
    if (!this.acceptTerms) {
      Swal.fire('Warning', 'Please accept the declaration to continue.', 'warning');
      return;
    }

    this.loadApplicationData();
    const missing = this.getMissingSubmitRequirements();
    if (missing.length) {
      const html = `
        <div style="text-align:left">
          <p>Please complete the following before submission:</p>
          <ul style="margin:0;padding-left:18px">
            ${missing.map((item) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;

      const result = await Swal.fire({
        title: 'Incomplete application',
        html,
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'Go Back',
        cancelButtonText: 'Stay Here',
        confirmButtonColor: '#1C2B78'
      });

      if (result.isConfirmed) {
        this.goBack();
      }
      return;
    }

    const confirmation = await Swal.fire({
      title: 'Confirm Submission',
      text: 'Do you want to submit this label registration application?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit',
      cancelButtonText: 'Review Again',
      confirmButtonColor: '#1C2B78'
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    this.isSubmitting = true;
    const formData = this.buildFormData();

    this.labelRegistrationService.applyLabelRegistration(formData).subscribe({
      next: (response: any) => {
        this.applicationId = response?.applicationId || response?.application_id || this.generateApplicationId();
        this.submissionMode = 'online';
        this.saveSubmission('Submitted', 'online');
        this.isSubmitting = false;
        Swal.fire('Success', `Application submitted successfully. ID: ${this.applicationId}`, 'success');
      },
      error: (error: HttpErrorResponse) => {
        console.error('Label registration submit failed:', error);
        this.isSubmitting = false;

        if (error.status === 0) {
          this.applicationId = this.generateApplicationId();
          this.submissionMode = 'local';
          this.saveSubmission('Saved Locally', 'local');
          Swal.fire(
            'Saved In Local Mode',
            `Backend endpoint is unreachable. Local reference ID: ${this.applicationId}`,
            'warning'
          );
          return;
        }

        const serverMessage = this.extractServerMessage(error);
        Swal.fire('Submission failed', serverMessage, 'error');
      }
    });
  }

  private buildFormData(): FormData {
    const formData = new FormData();

    formData.append('licensee_details', JSON.stringify(this.licenseeDetails || {}));
    formData.append('product_details', JSON.stringify(this.productDetails || {}));
    formData.append('packaging_details', JSON.stringify(this.packagingDetails || {}));
    formData.append('upload_details', JSON.stringify(this.uploadDetails || { documents: [] }));

    this.labelRegistrationService.getDraftDocuments().forEach(({ key, file }) => {
      formData.append(key, file, file.name);
    });

    const applicationDate = String(this.licenseeDetails?.applicationDate || '').trim();
    formData.append('application_date', applicationDate || new Date().toISOString().split('T')[0]);

    return formData;
  }

  private getMissingSubmitRequirements(): string[] {
    const missing: string[] = [];

    if (!String(this.licenseeDetails?.applicationYear || '').trim()) {
      missing.push('Label Registration Year (Applicant Details)');
    }
    if (!String(this.licenseeDetails?.applicantType || '').trim()) {
      missing.push('Applicant Type (Applicant Details)');
    }
    if (!String(this.licenseeDetails?.liquorCategory || '').trim()) {
      missing.push('Liquor Category (Applicant Details)');
    }
    if (!String(this.licenseeDetails?.applicationDate || '').trim()) {
      missing.push('Application Date (Applicant Details)');
    }
    if (!String(this.licenseeDetails?.registrationValidFrom || '').trim()) {
      missing.push('Registration Valid From (Applicant Details)');
    }
    if (!String(this.licenseeDetails?.registrationValidUpTo || '').trim()) {
      missing.push('Registration Valid Up To (Applicant Details)');
    }

    if (!String(this.productDetails?.bottlerOrigin || '').trim()) {
      missing.push('Bottler Origin (Manufacturer & Brand)');
    }
    if (!String(this.productDetails?.bottlerName || '').trim()) {
      missing.push('Bottler (Manufacturer & Brand)');
    }
    if (!String(this.productDetails?.bottlerAddress || '').trim()) {
      missing.push('Bottler Address (Manufacturer & Brand)');
    }

    if (!String(this.productDetails?.brandOwnerType || '').trim()) {
      missing.push('Brand Owner Type (Manufacturer & Brand)');
    }
    if (!String(this.productDetails?.brandOwnerName || '').trim()) {
      missing.push('Brand Owner (Manufacturer & Brand)');
    }
    if (!String(this.productDetails?.brandOwnerAddress || '').trim()) {
      missing.push('Brand Owner Address (Manufacturer & Brand)');
    }

    if (!String(this.productDetails?.liquorKind || '').trim()) {
      missing.push('Liquor Kind (Manufacturer & Brand)');
    }
    if (!String(this.productDetails?.liquorType || '').trim()) {
      missing.push('Liquor Type (Manufacturer & Brand)');
    }
    if (!String(this.productDetails?.brandName || '').trim()) {
      missing.push('Brand Name (Manufacturer & Brand)');
    }

    const allowedStrengthRaw = this.productDetails?.allowedStrength;
    if (allowedStrengthRaw === null || allowedStrengthRaw === undefined || String(allowedStrengthRaw).trim() === '') {
      missing.push('Allowed Strength (Manufacturer & Brand)');
    }
    const strengthValueRaw = this.productDetails?.strengthValue;
    if (strengthValueRaw === null || strengthValueRaw === undefined || String(strengthValueRaw).trim() === '') {
      missing.push('Liquor Strength Value (Manufacturer & Brand)');
    }
    if (!String(this.productDetails?.strengthUnit || '').trim()) {
      missing.push('Strength Unit (Manufacturer & Brand)');
    }

    const rows = this.getPackagingRows();
    if (!rows.length) {
      missing.push('Package Details (add at least one row)');
    } else if (
      rows.some((row) => {
        const measureValueMl = Number(row?.measureValueMl ?? row?.sizeMl);
        const bottlesPerCase = Number(row?.bottlesPerCase ?? row?.unitsPerCase);
        const edpPerCaseRaw = row?.edpPerCase;
        const edpPerCase = Number(edpPerCaseRaw);
        const mrpPerBottleRaw = row?.mrpPerBottle ?? row?.mrp;
        const mrpPerBottle = Number(mrpPerBottleRaw);
        const packageType = String(row?.packageType ?? row?.packagingType ?? '').trim();
        const purposeSale = String(row?.purposeSale ?? '').trim();

        return !(
          measureValueMl >= 1 &&
          bottlesPerCase >= 1 &&
          edpPerCaseRaw !== null &&
          edpPerCaseRaw !== undefined &&
          String(edpPerCaseRaw).trim() !== '' &&
          edpPerCase >= 0 &&
          mrpPerBottleRaw !== null &&
          mrpPerBottleRaw !== undefined &&
          String(mrpPerBottleRaw).trim() !== '' &&
          mrpPerBottle >= 0 &&
          !!packageType &&
          !!purposeSale
        );
      })
    ) {
      missing.push('Package Details (fill all mandatory columns for each row)');
    }

    const requiredDocuments = Array.isArray(this.uploadDetails?.documents)
      ? this.uploadDetails.documents.filter((document) => document?.required)
      : [];
    if (!requiredDocuments.length || requiredDocuments.some((document) => !String(document?.fileName || '').trim())) {
      missing.push('Required supporting documents');
    }

    return missing;
  }

  private extractServerMessage(error: HttpErrorResponse): string {
    if (error.status === 401) {
      return 'Your session has expired. Please log in again and retry.';
    }
    if (error.status === 403) {
      return 'You do not have permission to submit this application.';
    }

    const payload: any = error.error;
    if (!payload) {
      return 'Submission failed. Please try again.';
    }

    if (typeof payload === 'string') {
      return payload;
    }

    if (payload.detail) {
      return String(payload.detail);
    }

    if (Array.isArray(payload.missing) && payload.missing.length) {
      return `Missing required documents: ${payload.missing.join(', ')}.`;
    }

    return 'Submission failed. Please check your inputs and try again.';
  }

  private saveSubmission(status: string, mode: 'online' | 'local'): void {
    const payload = {
      applicationId: this.applicationId,
      status,
      submittedAt: new Date().toISOString(),
      mode
    };
    sessionStorage.setItem('labelRegSubmission', JSON.stringify(payload));
  }

  private generateApplicationId(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LBL/${year}${month}${day}/${random}`;
  }

  goBack(): void {
    this.back.emit();
  }

  goToDashboard(): void {
    this.clearApplicationData();
    this.router.navigate(['/dashboard']);
  }

  startNewApplication(): void {
    this.clearApplicationData();
    this.acceptTerms = false;
    this.applicationId = null;
    this.submissionMode = null;
    this.loadApplicationData();
  }

  private clearApplicationData(): void {
    sessionStorage.removeItem('labelRegLicenseeDetails');
    sessionStorage.removeItem('labelRegProductDetails');
    sessionStorage.removeItem('labelRegPackagingDetails');
    sessionStorage.removeItem('labelRegUploadDocuments');
    sessionStorage.removeItem('labelRegSubmission');
    this.labelRegistrationService.clearDraftDocuments();
  }
}
