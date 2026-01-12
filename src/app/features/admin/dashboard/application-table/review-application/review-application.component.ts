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

// Inline Site Enquiry Form Component
@Component({
  selector: 'app-site-enquiry-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <form [formGroup]="siteForm" class="site-enquiry-form">
      <mat-form-field appearance="outline">
        <mat-label>Site Visit Date</mat-label>
        <input matInput [matDatepicker]="picker" formControlName="visitDate" required>
        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-datepicker #picker></mat-datepicker>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Site Status</mat-label>
        <mat-select formControlName="siteStatus" required>
          <mat-option value="operational">Operational</mat-option>
          <mat-option value="under_construction">Under Construction</mat-option>
          <mat-option value="not_ready">Not Ready</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Inspector Notes</mat-label>
        <textarea matInput formControlName="notes" rows="4" required></textarea>
      </mat-form-field>

      <mat-checkbox formControlName="meetsRequirements">
        Site meets all requirements
      </mat-checkbox>
    </form>
  `,
  styles: [`
    .site-enquiry-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      mat-form-field { width: 100%; }
    }
  `]
})
export class SiteEnquiryFormComponent implements OnInit {
  @Output() formStatus = new EventEmitter<boolean>();
  siteForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.siteForm = this.fb.group({
      visitDate: ['', Validators.required],
      siteStatus: ['', Validators.required],
      notes: ['', [Validators.required, Validators.minLength(20)]],
      meetsRequirements: [false]
    });
  }

  ngOnInit(): void {
    this.siteForm.statusChanges.subscribe(() => {
      this.formStatus.emit(this.siteForm.valid);
    });
    this.formStatus.emit(this.siteForm.valid);
  }

  getSiteData() {
    return this.siteForm.value;
  }
}

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
  raiseObjection: (id: string, objections: any[], remarks?: string) => any;
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
  objectionFields: Array<{key: string, label: string, field: string}> = [];
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

  // ✅ Helper method to determine which service methods to use
  private getApplicationServiceMethods(): ServiceMethods {
    const appId = this.applicationId;
    
    if (appId.startsWith('SBM/')) {
      console.log('🎯 Detected: Salesman/Barman Application');
      return {
        getNextStages: (id: string) => this.salesmanBarmanService.getNextStages(id),
        advanceApplication: (id: string, stageId: number, context: any) => 
          this.salesmanBarmanService.advanceApplication(id, stageId, context),
        raiseObjection: (id: string, objections: any[], remarks?: string) => 
          this.salesmanBarmanService.raiseObjection(id, objections, remarks),
        getLocationFee: () => this.licenseAppService.getLocationFee(), // ✅ Use shared endpoint
        type: 'salesman_barman'
      };
    } else if (appId.startsWith('NLI/') || appId.startsWith('NEW/')) {
      console.log('🎯 Detected: New License Application');
      return {
        getNextStages: (id: string) => this.licenseAppService.getNewLicenseNextStages(id),
        advanceApplication: (id: string, stageId: number, context: any) => 
          this.licenseAppService.advanceNewLicenseApplication(id, stageId, context),
        raiseObjection: (id: string, objections: any[], remarks?: string) => 
          this.licenseAppService.raiseNewLicenseObjection(id, objections, remarks),
        getLocationFee: () => this.licenseAppService.getLocationFee(), // ✅ FIXED: Use shared endpoint
        type: 'new_license'
      };
    } else if (appId.startsWith('LIC/')) {
      console.log('🎯 Detected: License Application');
      return {
        getNextStages: (id: string) => this.licenseAppService.getNextStages(id),
        advanceApplication: (id: string, stageId: number, context: any) => 
          this.licenseAppService.advanceApplication(id, stageId, context),
        raiseObjection: (id: string, objections: any[], remarks?: string) => 
          this.licenseAppService.raiseObjection(id, objections, remarks),
        getLocationFee: () => this.licenseAppService.getLocationFee(),
        type: 'license'
      };
    } else {
      console.warn('⚠️ Unknown application type, defaulting to license');
      return {
        getNextStages: (id: string) => this.licenseAppService.getNextStages(id),
        advanceApplication: (id: string, stageId: number, context: any) => 
          this.licenseAppService.advanceApplication(id, stageId, context),
        raiseObjection: (id: string, objections: any[], remarks?: string) => 
          this.licenseAppService.raiseObjection(id, objections, remarks),
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

  // ✅ FIXED: Corrected logic to identify next stages properly
  private loadNextStages(): void {
    console.log('📋 Loading next stages for:', this.applicationId);
    console.log('🎯 Current stage:', this.application.current_stage || this.application.currentStage);
    
    const serviceMethods = this.getApplicationServiceMethods();
    
    serviceMethods.getNextStages(this.applicationId).subscribe({
      next: (stages: NextStage[]) => {
        console.log('✅ Next stages loaded:', stages);
        this.nextStages = stages;
        
        // ✅ CRITICAL FIX: Find the correct next stage based on stage name patterns
        stages.forEach(stage => {
          const stageName = stage.name.toLowerCase();
          console.log('🔍 Checking stage:', stageName, 'ID:', stage.id);
          
          // ✅ Priority 1: Check for final approval stages first
          if (stageName === 'approved' || stageName === 'awaiting_payment' || stageName === 'payment_pending') {
            this.approveStageId = stage.id;
            console.log('✅ Found FINAL approve stage:', stage.name, stage.id);
          }
          // ✅ Priority 2: Check for next level (only set if not already set by final stage)
          else if (!this.approveStageId && 
                   stageName.match(/^level_\d+$/) && 
                   !stageName.includes('objection') && 
                   !stageName.includes('rejected')) {
            this.approveStageId = stage.id;
            console.log('✅ Found NEXT LEVEL approve stage:', stage.name, stage.id);
          }
          // ✅ Priority 3: Rejection stages
          else if (stageName.includes('rejected')) {
            this.rejectStageId = stage.id;
            console.log('✅ Found reject stage:', stage.name, stage.id);
          }
          // ✅ Priority 4: Objection stages
          else if (stageName.includes('objection')) {
            this.objectionStageId = stage.id;
            console.log('✅ Found objection stage:', stage.name, stage.id);
          }
        });
        
        console.log('✅ Stage IDs identified:', {
          approveStageId: this.approveStageId,
          rejectStageId: this.rejectStageId,
          objectionStageId: this.objectionStageId
        });
        
        // ✅ Validation check
        if (!this.approveStageId && stages.length > 0) {
          console.warn('⚠️ No approve stage found! Available stages:', stages);
        }
      },
      error: (err: any) => {
        console.error('❌ Error loading next stages:', err);
        this.showError('Failed to load available actions');
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

  // ✅ FIXED: Use shared location fee endpoint for all application types
  private loadLocationFees(): void {
    // ✅ FIXED: Always use the shared endpoint since both share the same LocationFee model
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

  // ✅ FIXED: Enhanced approval submission with better debugging
  private submitApproval(): void {
    console.log('🚀 ============ SUBMIT APPROVAL START ============');
    console.log('📋 Application ID:', this.applicationId);
    console.log('🎯 Current Stage:', this.application.current_stage || this.application.currentStage);
    console.log('🎯 Approve Stage ID:', this.approveStageId);
    console.log('📋 All Available Next Stages:', this.nextStages);
    
    // Validation for Level 1
    if (this.accountService.hasAnyRole('level_1')) {
      if (!this.feeForm.valid || !this.selectedLocation) {
        this.showError('Please select a location before approving');
        return;
      }
    }

    // ✅ CRITICAL: Validate that we have a valid approve stage
    if (!this.approveStageId) {
      console.error('❌ CRITICAL ERROR: No approve stage ID found!');
      console.error('Available stages:', this.nextStages);
      this.showError('No valid approval stage found. Please refresh and try again.');
      return;
    }
    
    this.isSubmitting = true;
    
    // ✅ Build context data - DO NOT include is_reverted
    const contextData: any = {
      action: 'approve',
      remarks: this.remarksForm.value.remarks
    };
    
    // Level 1 specific data
    if (this.accountService.hasAnyRole('level_1') && this.selectedLocation) {
      contextData.location_id = this.selectedLocation.id;
      contextData.location_name = this.selectedLocation.locationName;
      contextData.fee_amount = this.selectedLocation.feeAmount;
    }
    
    // Level 2 specific data
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
        const siteData = this.siteEnquiryComponent.getSiteData();
        contextData.site_enquiry = siteData;
      }
    }
    
    console.log('📦 Context Data (should NOT have is_reverted):', contextData);
    console.log('🚀 Making API call to advanceApplication...');
    
    const serviceMethods = this.getApplicationServiceMethods();
    
    serviceMethods.advanceApplication(this.applicationId, this.approveStageId, contextData)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          console.log('🏁 API call finished');
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
    
    const serviceMethods = this.getApplicationServiceMethods();
    
    serviceMethods.raiseObjection(this.applicationId, objections, 'Objections raised')
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