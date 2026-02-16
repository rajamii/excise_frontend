import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

// Import Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Import Services
import { MasterService } from '../../../../core/services/master.service';
import { BaseComponent } from '../../../../base/base.components';
import { BaseDependency } from '../../../../base/dependency/base.dependency';

/**
 * UserProfileComponent
 * 
 * Dialog component for viewing and editing licensee profiles
 * 
 * Features:
 * - View profile details in read-only mode
 * - Create new licensee profile
 * - Edit existing licensee profile
 * - Form validation
 * - Loading states
 */
@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent extends BaseComponent implements OnInit, OnDestroy {
  
  // =========================================================================
  // DEPENDENCY INJECTION
  // =========================================================================
  
  private fb = inject(FormBuilder);
  private mastersService = inject(MasterService);
  public dialogRef = inject(MatDialogRef<UserProfileComponent>);

  // =========================================================================
  // PROPERTIES - STATE MANAGEMENT
  // =========================================================================

  /** Flag indicating component has finished loading initial data */
  loaded = false;

  /** User account data from auth service */
  user: any = null;

  /** Licensee profile data */
  licenseeProfile: any = null;

  /** Form group for editing profile */
  profileForm!: FormGroup;

  /** Flag to toggle between view and edit mode */
  showEditForm = false;

  /** Flag to indicate this is a new profile being created */
  isNewProfile = true;

  /** Loading state when fetching profile */
  profileLoading = false;

  /** Loading state during save operation */
  isSaving = false;

  /** Success message display flag */
  saveSuccess = false;

  /** Error message for display */
  saveError = '';

  /** Subscription management */
  private subscriptions = new Subscription();

  // =========================================================================
  // FORM CONTROL OPTIONS
  // =========================================================================

  /** Options for gender select dropdown */
  genderOptions = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other' }
  ];

  /** Options for marital status select dropdown */
  maritalStatusOptions = [
    { value: 'SINGLE', label: 'Single' },
    { value: 'MARRIED', label: 'Married' },
    { value: 'DIVORCED', label: 'Divorced' },
    { value: 'WIDOWED', label: 'Widowed' }
  ];

  /** Options for residential status select dropdown */
  residentialStatusOptions = [
    { value: 'RESIDENT', label: 'Resident' },
    { value: 'NON_RESIDENT', label: 'Non-Resident' },
    { value: 'OCI', label: 'Overseas Citizen of India' }
  ];

  /** Resolved role name for display */
  resolvedRoleName = 'Licensee';

  // =========================================================================
  // CONSTRUCTOR
  // =========================================================================

  constructor(
    public override baseDependency: BaseDependency
  ) {
    super(baseDependency);
    console.log('🎨 UserProfileComponent initialized');
  }

  // =========================================================================
  // LIFECYCLE HOOKS
  // =========================================================================

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserData();
    this.loadUserProfile();
  }

  override ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // =========================================================================
  // FORM INITIALIZATION
  // =========================================================================

  /**
   * Initialize the edit form with validators
   * Defines all form controls and their validation rules
   */
  private initializeForm(): void {
    this.profileForm = this.fb.group({
      father_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      nationality: ['Indian', [Validators.required, Validators.maxLength(50)]],
      marital_status: ['', Validators.required],
      residential_status: ['', Validators.required]
    });

    console.log('📝 Form initialized');
  }

  // =========================================================================
  // DATA LOADING
  // =========================================================================

  /**
   * Load user account data from auth service
   */
  private loadUserData(): void {
    const authSub: Subscription = this.accountService.getAuthenticationState().subscribe((account) => {
      if (account) {
        this.user = account;
        console.log('👤 User data loaded:', this.user);
        
      if (account.role) {
          this.resolvedRoleName = String(account.role);
        }
      }
    });

    this.subscriptions.add(authSub);
  }

  /**
   * Load licensee profile from backend
   * Sets loading state and handles success/error cases
   */
  private loadUserProfile(): void {
    this.profileLoading = true;
    this.loaded = false;

    console.log('📥 Loading profile...');

    const profileSub: Subscription = this.mastersService.getLicenseeProfiles().subscribe({
      next: (profiles: any[]) => {
        console.log('✅ Profiles loaded:', profiles);
        
        if (profiles && profiles.length > 0) {
          this.licenseeProfile = profiles[0];
          this.isNewProfile = false;
          this.populateForm();
          console.log('📋 Profile loaded:', this.licenseeProfile);
        } else {
          console.log('ℹ️ No profile found - user can create new profile');
          this.isNewProfile = true;
        }
        
        this.profileLoading = false;
        this.loaded = true;
      },
      error: (error: any) => {
        console.error('❌ Error loading profile:', error);
        
        // If 404, it means no profile exists - that's okay
        if (error.status === 404) {
          console.log('ℹ️ No profile exists yet (404) - user can create new profile');
          this.isNewProfile = true;
        }
        
        this.profileLoading = false;
        this.loaded = true;
      }
    });

    this.subscriptions.add(profileSub);
  }

  /**
   * Populate the edit form with licensee profile data
   */
  private populateForm(): void {
    if (this.licenseeProfile && this.profileForm) {
      console.log('📝 Populating form with profile:', this.licenseeProfile);
      
      this.profileForm.patchValue({
        father_name: this.licenseeProfile.fatherName || this.licenseeProfile.father_name || '',
        dob: this.licenseeProfile.dob || '',
        gender: this.licenseeProfile.gender || '',
        nationality: this.licenseeProfile.nationality || 'Indian',
        marital_status: this.licenseeProfile.maritalStatus || this.licenseeProfile.marital_status || '',
        residential_status: this.licenseeProfile.residentialStatus || this.licenseeProfile.residential_status || ''
      });

      // Disable immutable fields if editing
      if (!this.isNewProfile) {
        this.profileForm.get('father_name')?.disable();
        this.profileForm.get('dob')?.disable();
        this.profileForm.get('gender')?.disable();
        this.profileForm.get('nationality')?.disable();
        console.log('🔒 Immutable fields disabled');
      }
    }
  }

  // =========================================================================
  // FORM CONTROL ACCESS
  // =========================================================================

  /**
   * Getter to access form controls easily in template
   * Usage: {{ f.father_name.errors }}
   */
  get f() {
    return this.profileForm.controls;
  }

  // =========================================================================
  // DIALOG ACTIONS
  // =========================================================================

  /**
   * Close the dialog without saving
   */
  closeDialog(): void {
    this.dialogRef.close();
  }

  // =========================================================================
  // EDIT MODE ACTIONS
  // =========================================================================

  /**
   * Open the edit form and allow user to modify profile
   */
  openEditForm(): void {
    this.showEditForm = true;
    this.saveError = '';
    this.saveSuccess = false;
    console.log('✏️ Edit form opened');
  }

  /**
   * Cancel editing and return to view mode
   * Resets form to original values
   */
  cancelEdit(): void {
    this.showEditForm = false;
    this.saveError = '';
    this.saveSuccess = false;
    this.populateForm(); // Reset form to user data
    console.log('❌ Edit cancelled');
  }

  /**
   * Save profile changes to backend
   * Validates form and sends update request
   */
  saveProfile(): void {
    console.log('💾 Saving profile...');

    // Validate form before submission
    if (this.profileForm.invalid) {
      console.warn('⚠️ Form is invalid');
      this.markFormGroupTouched(this.profileForm);
      this.saveError = 'Please fix all errors before saving';
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.saveSuccess = false;

    const profileData = this.formatPayload();

    console.log('🚀 Submitting profile:', profileData);

    // Call appropriate backend method
    const saveObservable = this.isNewProfile
      ? this.mastersService.createLicenseeProfile(profileData)
      : this.mastersService.updateLicenseeProfile(this.licenseeProfile.id, profileData);

    const saveSub: Subscription = saveObservable.subscribe({
      next: (response) => {
        console.log('✅ Profile saved successfully!');
        
        this.isSaving = false;
        this.saveSuccess = true;
        this.licenseeProfile = response;
        this.isNewProfile = false;

        // Disable immutable fields after creation
        this.profileForm.get('father_name')?.disable();
        this.profileForm.get('dob')?.disable();
        this.profileForm.get('gender')?.disable();
        this.profileForm.get('nationality')?.disable();
        
        // Auto-hide success message and close edit form after 2 seconds
        setTimeout(() => {
          this.saveSuccess = false;
          this.showEditForm = false;
        }, 2000);
      },
      error: (error) => {
        console.error('❌ Profile save error:', error);
        
        this.isSaving = false;
        
        if (error.error?.message) {
          this.saveError = error.error.message;
        } else if (error.error?.detail) {
          this.saveError = error.error.detail;
        } else {
          this.saveError = 'Failed to save profile. Please try again.';
        }
      }
    });

    this.subscriptions.add(saveSub);
  }

  // =========================================================================
  // NAVIGATION ACTIONS
  // =========================================================================

  /**
   * Navigate to user's licenses page
   */
  openMyLicenses(): void {
    console.log('📋 Opening my licenses...');
    this.dialogRef.close();
    this.router.navigate(['/licensee/my-licenses']);
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /**
   * Format date to YYYY-MM-DD format for backend
   */
  private formatDate(date: any): string {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Format form data into payload for backend
   * Converts snake_case form controls to snake_case for API
   */
  private formatPayload(): any {
    const formValue = this.profileForm.getRawValue(); // getRawValue() includes disabled fields
    
    const payload = {
      father_name: formValue.father_name,
      dob: this.formatDate(formValue.dob),
      gender: formValue.gender,
      nationality: formValue.nationality,
      marital_status: formValue.marital_status,
      residential_status: formValue.residential_status
    };

    console.log('📦 Formatted payload:', payload);
    return payload;
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Get display text for gender selection
   */
  getGenderDisplay(value: string): string {
    const option = this.genderOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  }

  /**
   * Get display text for marital status selection
   */
  getMaritalStatusDisplay(value: string): string {
    const option = this.maritalStatusOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  }

  /**
   * Get display text for residential status selection
   */
  getResidentialStatusDisplay(value: string): string {
    const option = this.residentialStatusOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  }
}