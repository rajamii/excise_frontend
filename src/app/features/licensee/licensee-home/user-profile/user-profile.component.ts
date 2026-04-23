import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Subscription, catchError, throwError } from 'rxjs';
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
import { MyLicensesComponent } from '../../my-licenses/my-licenses.component';

/**
 * UserProfileComponent
 *
 * Dialog component for viewing and editing licensee profiles.
 *
 * Backend endpoints used:
 *   GET    /user/licensee-profiles/me/          → load current user's profile
 *   POST   /user/licensee-profiles/             → create new profile
 *   PATCH  /user/licensee-profiles/<pk>/update/ → update existing profile
 *
 * Immutable fields (locked after first save): pan_number, father_name, dob, gender, nationality
 * Mutable fields (editable anytime):          marital_status, residential_status
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
  private dialog = inject(MatDialog);

  // =========================================================================
  // STATE
  // =========================================================================

  loaded = false;
  user: any = null;
  licenseeProfile: any = null;

  profileForm!: FormGroup;
  showEditForm = false;
  isNewProfile = true;
  profileLoading = false;
  isSaving = false;
  saveSuccess = false;
  saveError = '';

  resolvedRoleName = 'Licensee';

  private subscriptions = new Subscription();

  // =========================================================================
  // DROPDOWN OPTIONS  (mirror backend choices)
  // =========================================================================

  genderOptions = [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other' }
  ];

  maritalStatusOptions = [
    { value: 'SINGLE', label: 'Single' },
    { value: 'MARRIED', label: 'Married' },
    { value: 'DIVORCED', label: 'Divorced' },
    { value: 'WIDOWED', label: 'Widowed' }
  ];

  residentialStatusOptions = [
    { value: 'RESIDENT', label: 'Resident' },
    { value: 'NON_RESIDENT', label: 'Non-Resident' },
    { value: 'OCI', label: 'Overseas Citizen of India' }
  ];

  // =========================================================================
  // CONSTRUCTOR
  // =========================================================================

  constructor(public override baseDependency: BaseDependency) {
    super(baseDependency);
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

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      // ── Immutable after creation ──────────────────────────────────────────
      // pan_number is collected at signup and cannot be changed — not in this form
      father_name: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z\s]+$/)]
      ],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      nationality: ['Indian', [Validators.required, Validators.maxLength(50)]],

      // ── Mutable anytime ───────────────────────────────────────────────────
      marital_status: ['', Validators.required],
      residential_status: ['', Validators.required]
    });
  }

  // =========================================================================
  // DATA LOADING
  // =========================================================================

  private loadUserData(): void {
    const sub = this.accountService.getAuthenticationState().subscribe(account => {
      if (account) {
        this.user = account;
        this.resolvedRoleName = this.resolveRoleName(account);
      }
    });
    this.subscriptions.add(sub);
  }

  private resolveRoleName(account: any): string {
    const role = account?.role;

    if (!role) {
      return 'Licensee';
    }

    if (typeof role === 'string') {
      const name = role.trim();
      return name ? name : 'Licensee';
    }

    if (typeof role === 'number') {
      return role === 2 ? 'Licensee' : `Role ${role}`;
    }

    if (typeof role === 'object') {
      const candidate =
        String(role?.displayName || '').trim() ||
        String(role?.name || '').trim() ||
        String(role?.roleName || '').trim() ||
        String(role?.label || '').trim();

      if (candidate) {
        return candidate;
      }

      const id = Number(role?.id);
      if (Number.isFinite(id) && id > 0) {
        return id === 2 ? 'Licensee' : `Role ${id}`;
      }
    }

    return 'Licensee';
  }

  /**
   * Fetch the current user's licensee profile using the /me/ endpoint.
   * Falls back gracefully when no profile exists yet (404).
   */
  private loadUserProfile(): void {
    this.profileLoading = true;
    this.loaded = false;

    // Use getMyLicenseeProfile() → GET /user/licensee-profiles/me/
    const sub = this.mastersService.getMyLicenseeProfile().subscribe({
      next: (profile: any) => {
        console.log('🔍 RAW API RESPONSE:', profile);
        console.log('📋 Profile fields:', Object.keys(profile || {}));

        if (profile) {
          this.licenseeProfile = this.enrichProfileWithDisplayValues(profile);
          console.log('✨ ENRICHED PROFILE:', this.licenseeProfile);
          this.isNewProfile = false;
          this.populateForm();
        } else {
          this.isNewProfile = true;
        }
        this.profileLoading = false;
        this.loaded = true;
      },
      error: (error: any) => {
        console.error('❌ Error loading profile:', error);
        // 404 = no profile yet; anything else is a real error
        if (error.status === 404) {
          this.isNewProfile = true;
        }
        this.profileLoading = false;
        this.loaded = true;
      }
    });
    this.subscriptions.add(sub);
  }

  /**
   * Add display values for gender, marital_status, and residential_status
   * so the template can show human-readable labels.
   */
  private enrichProfileWithDisplayValues(profile: any): any {
    console.log('🔄 Enriching profile with display values...');
    console.log('  gender:', profile.gender);
    console.log('  maritalStatus:', profile.maritalStatus);
    console.log('  residentialStatus:', profile.residentialStatus);
    console.log('  fatherName:', profile.fatherName);
    console.log('  panNumber:', profile.panNumber);

    const enriched = {
      ...profile,
      // Use backend field names (camelCase) but also add snake_case aliases for template
      gender_display: this.getGenderDisplay(profile.gender),
      marital_status_display: this.getMaritalStatusDisplay(profile.maritalStatus),
      residential_status_display: this.getResidentialStatusDisplay(profile.residentialStatus),
      // Add snake_case aliases for other fields
      father_name: profile.fatherName,
      pan_number: profile.panNumber,
      marital_status: profile.maritalStatus,
      residential_status: profile.residentialStatus
    };

    console.log('  → gender_display:', enriched.gender_display);
    console.log('  → marital_status_display:', enriched.marital_status_display);
    console.log('  → residential_status_display:', enriched.residential_status_display);
    console.log('  → father_name:', enriched.father_name);
    console.log('  → pan_number:', enriched.pan_number);

    return enriched;
  }

  private getGenderDisplay(value: string): string {
    const option = this.genderOptions.find(opt => opt.value === value);
    return option ? option.label : value || '';
  }

  private getMaritalStatusDisplay(value: string): string {
    const option = this.maritalStatusOptions.find(opt => opt.value === value);
    return option ? option.label : value || '';
  }

  private getResidentialStatusDisplay(value: string): string {
    const option = this.residentialStatusOptions.find(opt => opt.value === value);
    return option ? option.label : value || '';
  }

  /**
   * Populate edit form with existing profile data from the backend.
   * Backend uses camelCase field names (panNumber, fatherName, etc.).
   */
  private populateForm(): void {
    if (!this.licenseeProfile || !this.profileForm) return;

    this.profileForm.patchValue({
      father_name: this.licenseeProfile.fatherName ?? '',
      dob: this.licenseeProfile.dob ?? '',
      gender: this.licenseeProfile.gender ?? '',
      nationality: this.licenseeProfile.nationality ?? 'Indian',
      marital_status: this.licenseeProfile.maritalStatus ?? '',
      residential_status: this.licenseeProfile.residentialStatus ?? ''
    });

    // Lock immutable fields when editing an existing profile
    // if (!this.isNewProfile) {
    //   ['father_name', 'dob', 'gender', 'nationality'].forEach(field => {
    //     this.profileForm.get(field)?.disable();
    //   });
    // }
  }

  // =========================================================================
  // FORM CONTROL ACCESS
  // =========================================================================

  get f() {
    return this.profileForm.controls;
  }

  // =========================================================================
  // DIALOG ACTIONS
  // =========================================================================

  closeDialog(): void {
    this.dialogRef.close();
  }

  // =========================================================================
  // EDIT MODE ACTIONS
  // =========================================================================

  openEditForm(): void {
    this.showEditForm = true;
    this.saveError = '';
    this.saveSuccess = false;
  }

  cancelEdit(): void {
    this.showEditForm = false;
    this.saveError = '';
    this.saveSuccess = false;
    this.populateForm();
  }

  /**
   * Save profile.
   *   Create → POST   /user/licensee-profiles/
   *   Update → PATCH  /user/licensee-profiles/<pk>/update/
   */
  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      this.saveError = 'Please fix all errors before saving.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.saveSuccess = false;

    const payload = this.isNewProfile
      ? this.formatCreatePayload()
      : this.formatUpdatePayload();

    const save$ = this.isNewProfile
      ? this.mastersService.createLicenseeProfile(payload)
      : this.mastersService
        .patchLicenseeProfile(this.licenseeProfile.id, payload)
        .pipe(
          // Some backends only allow self-updates at /me/ and reject id-based update with 403.
          catchError((error: any) => {
            if ([403, 404, 405].includes(error?.status)) {
              return this.mastersService.patchMyLicenseeProfile(payload);
            }
            return throwError(() => error);
          })
        );

    const sub = save$.subscribe({
      next: (response: any) => {
        this.isSaving = false;
        this.saveSuccess = true;
        this.licenseeProfile = this.enrichProfileWithDisplayValues(response);
        this.isNewProfile = false;

        // Lock immutable fields after successful creation
        ['father_name', 'dob', 'gender', 'nationality'].forEach(field => {
          this.profileForm.get(field)?.disable();
        });

        setTimeout(() => {
          this.saveSuccess = false;
          this.showEditForm = false;
        }, 2000);
      },
      error: (error: any) => {
        this.isSaving = false;

        // Try to surface the most useful error message from the backend
        if (error.error && typeof error.error === 'object') {
          const messages = Object.entries(error.error)
            .map(([field, msgs]) => {
              const msgStr = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
              return `${field}: ${msgStr}`;
            })
            .join('\n');
          this.saveError = messages || 'Failed to save profile. Please try again.';
        } else if (error.error?.detail) {
          this.saveError = error.error.detail;
        } else {
          this.saveError = 'Failed to save profile. Please try again.';
        }
      }
    });

    this.subscriptions.add(sub);
  }

  // =========================================================================
  // NAVIGATION
  // =========================================================================

  openMyLicenses(): void {
    this.dialogRef.close();
    this.dialog.open(MyLicensesComponent, {
      width: '900px',
      maxHeight: '90vh'
    });
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  /**
   * Format Date object to YYYY-MM-DD string for the backend.
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
   * Build create payload using camelCase to match backend API convention.
   */
  private formatCreatePayload(): any {
    const v = this.profileForm.getRawValue();
    return {
      fatherName: v.father_name,
      dob: this.formatDate(v.dob),
      gender: v.gender,
      nationality: v.nationality,
      maritalStatus: v.marital_status,
      residentialStatus: v.residential_status
    };
  }

  /**
   * Build update payload with mutable fields only.
   */
  private formatUpdatePayload(): any {
    const v = this.profileForm.getRawValue();
    return {
      fatherName: v.father_name,
      dob: this.formatDate(v.dob),
      gender: v.gender,
      nationality: v.nationality,
      maritalStatus: v.marital_status,
      residentialStatus: v.residential_status
    };
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
