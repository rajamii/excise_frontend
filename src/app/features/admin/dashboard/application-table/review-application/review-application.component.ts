import { Component, Inject, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import { BaseDependency } from '../../../../../base/dependency/base.dependency';
import { BaseComponent } from '../../../../../base/base.components';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepper } from '@angular/material/stepper';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { SiteEnquiryFormComponent } from '../site-enquiry-form/site-enquiry-form.component';

interface DataRow {
  key: string;
  value: any;
  field: string;
}

interface Objection {
  field: string;
  remarks: string;
}

interface NextStage {
  id: number;
  name: string;
  description: string;
}

interface ServiceMethods {
  getNextStages: (id: string) => any;
  advanceApplication: (id: string, stageId: number, context: any) => any;
  raiseObjection: (id: string, targetStageId: number, objections: any[], remarks?: string) => any;
  getLocationFee: () => any;
  type: string;
}

@Component({
  selector: 'app-review-application',
  standalone: true,
  imports: [
    MaterialModule,
    CommonModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    SiteEnquiryFormComponent
  ],
  templateUrl: './review-application.component.html',
  styleUrls: ['./review-application.component.scss']
})
export class ReviewApplicationComponent extends BaseComponent implements OnInit {
  @ViewChild(SiteEnquiryFormComponent) siteEnquiryComponent?: SiteEnquiryFormComponent;

  application: any;
  applicationId: string = '';
  tableType: string = '';

  // Data arrays for display
  licenseData: DataRow[] = [];
  keyInfoData: DataRow[] = [];
  addressData: DataRow[] = [];
  unitDetailsData: DataRow[] = [];
  memberDetailsData: DataRow[] = [];
  siteDetailData: DataRow[] = [];

  // URLs
  photoUrl: string = '';
  sitePdfUrl: string = '';

  // Site detail flag
  siteDetail: any = null;

  // Flow flags
  isApproveFlow = false;
  isRejectFlow = false;
  isObjection = false;
  isRejected = false;

  // Forms
  remarksForm: FormGroup;
  objectionForm: FormGroup;
  feeForm: FormGroup;
  licenseCategoryForm: FormGroup;

  // Objection data
  objectionFields: Array<{ key: string, label: string, field: string }> = [];
  selectedObjections: Objection[] = [];
  existingObjections: any[] = [];

  // Fee data
  locationFees: any[] = [];
  selectedLocation: any = null;

  // License category data
  licenseCategories: any[] = [];
  selectedCategory: any = null;

  // Site enquiry
  siteEnquiryFormValid = false;

  // Loading states
  isLoading = false;
  isSubmitting = false;

  // Store next stages from backend
  nextStages: NextStage[] = [];
  approveStageId: number | null = null;
  rejectStageId: number | null = null;
  objectionStageId: number | null = null;

  constructor(
    public baseDeps: BaseDependency,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    public dialogRef: MatDialogRef<ReviewApplicationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    super(baseDeps);

    this.application = data.application;
    this.tableType = data.tableType;

    // Initialize forms
    this.remarksForm = this.fb.group({
      remarks: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.objectionForm = this.fb.group({});

    this.feeForm = this.fb.group({
      location: ['', Validators.required]
    });

    this.licenseCategoryForm = this.fb.group({
      licenseCategory: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('=== REVIEW APPLICATION COMPONENT INIT ===');
    console.log('Full application object:', this.application);
    console.log('Table type:', this.tableType);

    this.applicationId = this.getAppId(this.application);
    console.log('Application ID:', this.applicationId);

    this.loadApplicationData();
    this.loadObjections();
    this.buildObjectionFields();
    this.loadNextStages();

    // Load additional data if needed
    if (this.accountService.hasAnyRole('level_1')) {
      this.loadLocationFees();
    }
    if (this.accountService.hasAnyRole('level_2')) {
      this.loadLicenseCategories();
    }
  }

  // ✅ CRITICAL FIX: All workflow endpoints are now under /auth/ for ALL application types
  private getApplicationServiceMethods(): ServiceMethods {
    const appId = this.applicationId;

    if (appId.startsWith('SBM/')) {
      console.log('🎯 Detected: Salesman/Barman Application - Using Workflow Service');
      return {
        // ✅ Workflow endpoints under /auth/
        getNextStages: (id: string) => this.http.get<NextStage[]>(
          `http://localhost:8000/auth/${id}/next-stages/`
        ),
        advanceApplication: (id: string, stageId: number, context: any) =>
          this.http.post(
            `http://localhost:8000/auth/${id}/advance/${stageId}/`,
            { context_data: context }
          ),
        raiseObjection: (id: string, targetStageId: number, objections: any[], remarks?: string) =>
          this.http.post(
            `http://localhost:8000/auth/${id}/raise-objection/`,
            { objections, remarks: remarks || 'Objections raised' }
          ),
        getLocationFee: () => this.licenseAppService.getLocationFee(),
        type: 'salesman_barman'
      };
    } else if (appId.startsWith('NLI/') || appId.startsWith('NEW/')) {
      console.log('🎯 Detected: New License Application');
      return {
        // ✅ FIXED: New License workflow endpoints are under /auth/
        getNextStages: (id: string) => this.http.get<NextStage[]>(
          `http://localhost:8000/auth/${id}/next-stages/`
        ),
        advanceApplication: (id: string, stageId: number, context: any) =>
          this.http.post(
            `http://localhost:8000/auth/${id}/advance/${stageId}/`,
            { context_data: context }
          ),
        raiseObjection: (id: string, targetStageId: number, objections: any[], remarks?: string) =>
          this.http.post(
            `http://localhost:8000/auth/${id}/raise-objection/`,
            { objections, remarks: remarks || 'Objections raised' }
          ),
        getLocationFee: () => this.licenseAppService.getLocationFee(),
        type: 'new_license'
      };
    } else if (appId.startsWith('LIC/')) {
      console.log('🎯 Detected: License Application');
      return {
        // ✅ CRITICAL FIX: License Application workflow endpoints are ALSO under /auth/
        getNextStages: (id: string) => this.http.get<NextStage[]>(
          `http://localhost:8000/auth/${id}/next-stages/`
        ),
        advanceApplication: (id: string, stageId: number, context: any) =>
          this.http.post(
            `http://localhost:8000/auth/${id}/advance/${stageId}/`,
            { context_data: context }
          ),
        raiseObjection: (id: string, targetStageId: number, objections: any[], remarks?: string) =>
          this.http.post(
            `http://localhost:8000/auth/${id}/raise-objection/`,
            { objections, remarks: remarks || 'Objections raised' }
          ),
        getLocationFee: () => this.licenseAppService.getLocationFee(),
        type: 'license'
      };
    } else {
      console.warn('⚠️ Unknown application type, defaulting to license');
      return {
        // ✅ Default: Use /auth/ endpoints
        getNextStages: (id: string) => this.http.get<NextStage[]>(
          `http://localhost:8000/auth/${id}/next-stages/`
        ),
        advanceApplication: (id: string, stageId: number, context: any) =>
          this.http.post(
            `http://localhost:8000/auth/${id}/advance/${stageId}/`,
            { context_data: context }
          ),
        raiseObjection: (id: string, targetStageId: number, objections: any[], remarks?: string) =>
          this.http.post(
            `http://localhost:8000/auth/${id}/raise-objection/`,
            { objections, remarks: remarks || 'Objections raised' }
          ),
        getLocationFee: () => this.licenseAppService.getLocationFee(),
        type: 'license'
      };
    }
  }

  private getAppId(app: any): string {
    return app?.application_id || app?.applicationId || app?.id || app?.app_id || '';
  }

  private getPhotoUrl(photoPath: string): string {
    if (!photoPath) return '';

    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }

    if (photoPath.startsWith('/media/')) {
      const apiBase = 'http://localhost:8000';
      return `${apiBase}${photoPath}`;
    }

    return photoPath;
  }

  private loadNextStages(): void {
    console.log('📋 Loading next stages for:', this.applicationId);
    const currentStageId = this.application.current_stage || this.application.currentStage;
    console.log('🎯 Current stage ID:', currentStageId);

    const serviceMethods = this.getApplicationServiceMethods();
    const nextStagesObservable = serviceMethods.getNextStages(this.applicationId);

    nextStagesObservable.subscribe({
      next: (stages: NextStage[]) => {
        console.log('✅ Next stages loaded:', stages);
        this.nextStages = stages;

        if (serviceMethods.type === 'salesman_barman') {
          stages.forEach(stage => {
            const stageName = stage.name.toLowerCase();
            console.log('🔍 Checking Salesman/Barman stage:', stageName, 'ID:', stage.id);

            if (stageName === 'approved' || stageName === 'awaiting_payment') {
              this.approveStageId = stage.id;
              console.log('✅ Found FINAL approve stage:', stage.name, stage.id);
            }
            else if (!this.approveStageId && stageName.match(/^level_\d+$/)) {
              this.approveStageId = stage.id;
              console.log('✅ Found NEXT LEVEL approve stage:', stage.name, stage.id);
            }
            else if (stageName === 'rejected' || stageName.includes('reject')) {
              this.rejectStageId = stage.id;
              console.log('✅ Found reject stage:', stage.name, stage.id);
            }
            else if (stageName === 'objection_raised' || stageName.includes('objection')) {
              this.objectionStageId = stage.id;
              console.log('✅ Found objection stage:', stage.name, stage.id);
            }
          });
        } else {
          stages.forEach(stage => {
            const stageName = stage.name.toLowerCase();
            console.log('🔍 Checking stage:', stageName, 'ID:', stage.id);

            if (stageName === 'approved' || stageName === 'awaiting_payment' || stageName === 'payment_pending') {
              this.approveStageId = stage.id;
              console.log('✅ Found FINAL approve stage:', stage.name, stage.id);
            }
            else if (!this.approveStageId &&
              stageName.match(/^level_\d+$/) &&
              !stageName.includes('objection') &&
              !stageName.includes('rejected')) {
              this.approveStageId = stage.id;
              console.log('✅ Found NEXT LEVEL approve stage:', stage.name, stage.id);
            }
            else if (stageName.includes('rejected')) {
              this.rejectStageId = stage.id;
              console.log('✅ Found reject stage:', stage.name, stage.id);
            }
            else if (stageName.includes('objection')) {
              this.objectionStageId = stage.id;
              console.log('✅ Found objection stage:', stage.name, stage.id);
            }
          });
        }

        console.log('✅ Stage IDs identified:', {
          approveStageId: this.approveStageId,
          rejectStageId: this.rejectStageId,
          objectionStageId: this.objectionStageId
        });

        if (!this.approveStageId && stages.length > 0) {
          console.warn('⚠️ No approve stage found! Available stages:', stages);
          this.approveStageId = stages[0].id;
          console.log('⚠️ Using fallback stage:', stages[0].name, stages[0].id);
        }
      },
      error: (err: any) => {
        console.error('❌ Error loading next stages:', err);
        console.error('Error details:', {
          status: err.status,
          statusText: err.statusText,
          url: err.url,
          message: err.message
        });
        this.showError('Failed to load available actions. Please refresh and try again.');
      }
    });
  }

  private loadApplicationData(): void {
    this.licenseData = [
      { key: 'License Type', value: this.application.licenseTypeName || this.application.licenseType || '-', field: 'licenseType' },
      { key: 'Application Type', value: this.application.license || '-', field: 'applicationType' },
      { key: 'License Category', value: this.application.licenseCategoryName || this.application.licenseCategory || '-', field: 'licenseCategory' }
    ];

    this.keyInfoData = [
      { key: 'Applicant Name', value: this.application.memberName || this.application.establishmentName || this.application.applicantName || this.application.firstName || '-', field: 'applicantName' },
      { key: 'Father/Husband Name', value: this.application.fatherHusbandName || '-', field: 'fatherName' },
      { key: 'Gender', value: this.application.gender || '-', field: 'gender' },
      { key: 'Mobile', value: this.application.mobileNumber || this.application.memberMobileNumber || '-', field: 'mobile' },
      { key: 'Email', value: this.application.email || this.application.emailId || this.application.memberEmail || '-', field: 'email' }
    ];

    this.addressData = [
      { key: 'Address', value: this.application.address || this.application.businessAddress || '-', field: 'address' },
      { key: 'Road Name', value: this.application.roadName || '-', field: 'roadName' },
      { key: 'District', value: this.application.exciseDistrictName || this.application.siteDistrictName || '-', field: 'district' },
      { key: 'State', value: 'Sikkim', field: 'state' },
      { key: 'Pincode', value: this.application.pinCode || '-', field: 'pincode' }
    ];

    if (this.application.companyName) {
      this.unitDetailsData = [
        { key: 'Company Name', value: this.application.companyName || '-', field: 'companyName' },
        { key: 'Registration Number', value: this.application.companyCin || '-', field: 'registrationNumber' },
        { key: 'GST Number', value: '-', field: 'gstNumber' }
      ];
    }

    this.memberDetailsData = [
      { key: 'PAN Number', value: this.application.pan || this.application.companyPan || '-', field: 'panNumber' },
      { key: 'Aadhaar', value: this.application.aadhaar || '-', field: 'aadhaar' },
      { key: 'Nationality', value: this.application.nationality || '-', field: 'nationality' },
      { key: 'Sikkim Subject', value: this.application.sikkimSubject ? 'Yes' : 'No', field: 'sikkimSubject' }
    ];

    const photoPath = this.application.passPhoto ||
      this.application.photo ||
      this.application.photoUrl ||
      this.application.photo_url ||
      this.application.memberPhoto ||
      this.application.applicantPhoto;

    if (photoPath) {
      this.photoUrl = this.getPhotoUrl(photoPath);
    }

    if (this.application.siteDetail || this.application.site_detail) {
      const siteDetailObj = this.application.siteDetail || this.application.site_detail;
      this.siteDetail = siteDetailObj;
      this.siteDetailData = [
        { key: 'Establishment Name', value: this.application.establishmentName || '-', field: 'establishmentName' },
        { key: 'Location', value: this.application.locationName || '-', field: 'locationName' },
        { key: 'Ward', value: this.application.wardName || '-', field: 'wardName' },
        { key: 'Functioning Status', value: this.application.functioningStatus || '-', field: 'functioningStatus' }
      ];

      this.sitePdfUrl = siteDetailObj.image_url || siteDetailObj.imageUrl || '';
    }
  }

  private loadObjections(): void {
    if (this.application.objections) {
      this.existingObjections = Array.isArray(this.application.objections)
        ? this.application.objections
        : [];
    }
  }

  private buildObjectionFields(): void {
    const allFields = [
      ...this.licenseData,
      ...this.keyInfoData,
      ...this.addressData,
      ...this.unitDetailsData,
      ...this.memberDetailsData
    ];

    this.objectionFields = allFields.map(item => ({
      key: item.field,
      label: item.key,
      field: item.field
    }));

    const controls: any = {};
    this.objectionFields.forEach(field => {
      controls[field.key] = [false];
      controls[field.key + '_remarks'] = [''];
    });
    this.objectionForm = this.fb.group(controls);
  }

  hasObjection(field: string): boolean {
    return this.existingObjections.some(obj => obj.field === field);
  }

  getObjectionRemarks(field: string): string {
    const objection = this.existingObjections.find(obj => obj.field === field);
    return objection ? objection.remarks : '';
  }

  onApprove(stepper: MatStepper): void {
    this.isApproveFlow = true;
    this.isRejectFlow = false;
    this.isObjection = false;
    stepper.next();
  }

  onRaiseObjection(stepper: MatStepper): void {
    this.isObjection = true;
    this.isApproveFlow = false;
    this.isRejectFlow = false;
    stepper.next();
  }

  prepareObjections(stepper: MatStepper): void {
    this.selectedObjections = [];

    this.objectionFields.forEach(field => {
      const isChecked = this.objectionForm.get(field.key)?.value;
      if (isChecked) {
        const remarks = this.objectionForm.get(field.key + '_remarks')?.value || '';
        if (remarks.trim()) {
          this.selectedObjections.push({
            field: field.label,
            remarks: remarks
          });
        }
      }
    });

    if (this.selectedObjections.length === 0) {
      this.showError('Please select at least one objection with remarks');
      return;
    }

    stepper.next();
  }

  onReject(stepper: MatStepper): void {
    this.isRejectFlow = true;
    this.isApproveFlow = false;
    this.isObjection = false;
    stepper.next();
  }

  private loadLocationFees(): void {
    this.licenseAppService.getLocationFee()
      .subscribe({
        next: (fees: any) => {
          this.locationFees = fees;
          console.log('📍 Location fees loaded:', fees);
        },
        error: (err: any) => {
          console.error('❌ Error loading fees:', err);
          this.showError('Failed to load location fees. Please try again or contact support.');
          this.locationFees = [];
        }
      });
  }

  onLocationChange(location: any): void {
    this.selectedLocation = location;
    console.log('📍 Location selected:', location);
  }

  private loadLicenseCategories(): void {
    this.licenseCategories = [
      { id: 1, licenseCategory: 'FL-1A' },
      { id: 2, licenseCategory: 'FL-2' },
      { id: 3, licenseCategory: 'FL-3' }
    ];
  }

  onFormValidityChange(isValid: boolean | Event): void {
    if (typeof isValid === 'boolean') {
      this.siteEnquiryFormValid = isValid;
    } else {
      this.siteEnquiryFormValid = true;
    }
  }

  onConfirmClick(): void {
    if (this.isApproveFlow) {
      this.submitApproval();
    } else if (this.isRejectFlow) {
      this.submitRejection();
    } else if (this.isObjection) {
      this.submitObjection();
    }
  }

  private submitApproval(): void {
    console.log('🚀 ============ SUBMIT APPROVAL START ============');
    console.log('📋 Application ID:', this.applicationId);
    console.log('🎯 Current Stage:', this.application.current_stage || this.application.currentStage);
    console.log('🎯 Approve Stage ID:', this.approveStageId);
    console.log('📋 All Available Next Stages:', this.nextStages);

    if (this.accountService.hasAnyRole('level_1')) {
      if (!this.feeForm.valid || !this.selectedLocation) {
        this.showError('Please select a location before approving');
        return;
      }
    }

    if (!this.approveStageId) {
      console.error('❌ CRITICAL ERROR: No approve stage ID found!');
      console.error('Available stages:', this.nextStages);
      this.showError('No valid approval stage found. Please refresh and try again.');
      return;
    }

    this.isSubmitting = true;

    const contextData: any = {
      action: 'approve',
      remarks: this.remarksForm.value.remarks
    };

    if (this.accountService.hasAnyRole('level_1') && this.selectedLocation) {
      contextData.location_id = this.selectedLocation.id;
      contextData.location_name = this.selectedLocation.locationName;
      contextData.fee_amount = this.selectedLocation.feeAmount;
    }

    if (this.accountService.hasAnyRole('level_2')) {
      if (this.licenseCategoryForm.value.licenseCategory) {
        contextData.license_category_id = this.licenseCategoryForm.value.licenseCategory;
        const category = this.licenseCategories.find(c => c.id === contextData.license_category_id);
        if (category) {
          this.selectedCategory = category;
          contextData.license_category_name = category.licenseCategory;
        }
      }

      if (this.siteEnquiryComponent) {
        const siteData = this.siteEnquiryComponent.getSiteEnquiryData();
        if (siteData) {
          contextData.site_enquiry = siteData;
          console.log('✅ Site enquiry data captured:', siteData);
        } else {
          console.warn('⚠️ Site enquiry form is invalid');
        }
      }
    }

    console.log('📦 Context Data:', contextData);
    console.log('🚀 Making API call to advanceApplication...');

    const serviceMethods = this.getApplicationServiceMethods();

    serviceMethods.advanceApplication(this.applicationId, this.approveStageId, contextData)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          console.log('✔ API call finished');
        })
      )
      .subscribe({
        next: (response: any) => {
          console.log('✅ ============ APPROVAL SUCCESS ============');
          console.log('Response:', response);
          this.showSuccess('Application approved successfully');
          this.dialogRef.close({ success: true, action: 'approved' });
        },
        error: (error: any) => {
          console.error('❌ ============ APPROVAL FAILED ============');
          console.error('Full error object:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          console.error('Error detail:', error?.error?.detail);

          const errorMessage = error?.error?.detail ||
            error?.error?.message ||
            error?.message ||
            'Failed to approve application';
          this.showError(errorMessage);
        }
      });
  }

  private submitRejection(): void {
    if (!this.rejectStageId) {
      this.showError('No valid rejection stage found. Please refresh and try again.');
      return;
    }

    this.isSubmitting = true;

    const contextData = {
      action: 'reject',
      remarks: this.remarksForm.value.remarks
    };

    console.log('🚀 Submitting rejection with contextData:', contextData);

    const serviceMethods = this.getApplicationServiceMethods();

    serviceMethods.advanceApplication(this.applicationId, this.rejectStageId, contextData)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          console.log('✅ Rejection Success:', response);
          this.showSuccess('Application rejected successfully');
          this.dialogRef.close({ success: true, action: 'rejected' });
        },
        error: (error: any) => {
          console.error('❌ Rejection Error:', error);
          const errorMessage = error?.error?.detail ||
            error?.error?.message ||
            'Failed to reject application';
          this.showError(errorMessage);
        }
      });
  }

  private submitObjection(): void {
    if (this.selectedObjections.length === 0) {
      this.showError('No objections selected');
      return;
    }

    if (!this.objectionStageId) {
      this.showError('No valid objection stage found. Please refresh and try again.');
      return;
    }

    this.isSubmitting = true;

    const objections = this.selectedObjections.map(obj => {
      const field = this.objectionFields.find(f => f.label === obj.field);
      return {
        field: field?.field || obj.field,
        remarks: obj.remarks
      };
    });

    console.log('🚀 Submitting objections:', objections);
    console.log('🎯 Target objection stage ID:', this.objectionStageId);

    const serviceMethods = this.getApplicationServiceMethods();

    serviceMethods.raiseObjection(
      this.applicationId,
      this.objectionStageId,
      objections,
      'Objections raised'
    )
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          console.log('✅ Objection Success:', response);
          this.showSuccess('Objection raised successfully');
          this.dialogRef.close({ success: true, action: 'objection' });
        },
        error: (error: any) => {
          console.error('❌ Objection Error:', error);
          const errorMessage = error?.error?.detail ||
            error?.error?.message ||
            'Failed to raise objection';
          this.showError(errorMessage);
        }
      });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}