import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { LabelRegistrationDocuments } from '../../../../../../core/models/label-registration.model';
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
  documentMeta: Array<{ key: string; name: string; required: boolean; fileName: string }> = [];

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

  private loadApplicationData(): void {
    this.licenseeDetails = this.getStorageData('labelRegLicenseeDetails');
    this.productDetails = this.getStorageData('labelRegProductDetails');
    this.packagingDetails = this.getStorageData('labelRegPackagingDetails');
    this.documentMeta = this.getStorageData('labelRegDocumentMeta', []);
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

  getUploadedDocuments(): Array<{ key: keyof LabelRegistrationDocuments; file: File }> {
    const docs = this.labelRegistrationService.getLabelDocuments();
    return Object.entries(docs)
      .filter(([_, file]) => !!file)
      .map(([key, file]) => ({ key: key as keyof LabelRegistrationDocuments, file: file as File }));
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-GB');
  }

  getAverageMrp(): number {
    const rows = this.getPackagingRows();
    if (!rows.length) {
      return 0;
    }
    const total = rows.reduce((sum, row) => sum + Number(row.mrp || 0), 0);
    return total / rows.length;
  }

  async submitApplication(): Promise<void> {
    if (!this.acceptTerms) {
      Swal.fire('Warning', 'Please accept the declaration to continue.', 'warning');
      return;
    }

    if (!this.isDataReadyForSubmit()) {
      Swal.fire('Incomplete application', 'Please complete all steps before submission.', 'error');
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
        this.applicationId = this.generateApplicationId();
        this.submissionMode = 'local';
        this.saveSubmission('Saved Locally', 'local');
        this.isSubmitting = false;
        Swal.fire(
          'Saved In Local Mode',
          `Backend endpoint is unavailable. Local reference ID: ${this.applicationId}`,
          'warning'
        );
      }
    });
  }

  private buildFormData(): FormData {
    const formData = new FormData();

    formData.append('licensee_details', JSON.stringify(this.licenseeDetails || {}));
    formData.append('product_details', JSON.stringify(this.productDetails || {}));
    formData.append('packaging_details', JSON.stringify(this.packagingDetails || {}));
    formData.append('application_date', new Date().toISOString().split('T')[0]);

    const documents = this.labelRegistrationService.getLabelDocuments();
    Object.entries(documents).forEach(([key, file]) => {
      if (file) {
        formData.append(key, file);
      }
    });

    return formData;
  }

  private isDataReadyForSubmit(): boolean {
    const hasLicensee = !!this.licenseeDetails?.licenseNumber;
    const hasProduct = !!this.productDetails?.labelName;
    const hasPackaging = this.getPackagingRows().length > 0;
    const docs = this.labelRegistrationService.getLabelDocuments();
    const hasRequiredDocs = !!docs.undertaking && !!docs.brandAuthorization && !!docs.labelArtworkFront && !!docs.labAnalysisReport;

    return hasLicensee && hasProduct && hasPackaging && hasRequiredDocs;
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
    sessionStorage.removeItem('labelRegDocumentMeta');
    sessionStorage.removeItem('labelRegSubmission');
    this.labelRegistrationService.clearLabelDocuments();
  }
}
