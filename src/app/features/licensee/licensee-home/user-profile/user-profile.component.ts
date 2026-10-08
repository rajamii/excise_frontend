import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
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

  private fb = inject(FormBuilder);
  private mastersService = inject(MasterService);
  public dialogRef = inject(MatDialogRef<UserProfileComponent>);
  private dialog = inject(MatDialog);

  loaded = false;
  user: any = null;
  licenseeProfile: any = null;

  // Profile Edit State
  profileForm!: FormGroup;
  showEditForm = false;
  isNewProfile = true;
  profileLoading = false;
  isSaving = false;
  saveSuccess = false;
  saveError = '';

  // Password Edit State
  passwordForm!: FormGroup;
  showPasswordForm = false;
  isSavingPassword = false;
  passwordSuccess = false;
  passwordError = '';
  hideOld = true;
  hideNew = true;
  hideConfirm = true;

  resolvedRoleName = 'Licensee';
  private subscriptions = new Subscription();

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

  constructor(public override baseDependency: BaseDependency) {
    super(baseDependency);
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserData();
    this.loadUserProfile();
  }

  override ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForm(): void {
    // 1. Profile Form
    this.profileForm = this.fb.group({
      father_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s]+$/)]],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      nationality: ['Indian', [Validators.required, Validators.maxLength(50)]],
      marital_status: ['', Validators.required],
      residential_status: ['', Validators.required]
    });

    // 2. Password Form
    this.passwordForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPwd = control.get('newPassword')?.value;
    const confirmPwd = control.get('confirmPassword')?.value;
    if (newPwd && confirmPwd && newPwd !== confirmPwd) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

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
    if (!role) return 'Licensee';
    if (typeof role === 'string') return role.trim() || 'Licensee';
    if (typeof role === 'number') return role === 2 ? 'Licensee' : `Role ${role}`;
    if (typeof role === 'object') {
      const candidate = String(role?.displayName || '').trim() || String(role?.name || '').trim() || String(role?.roleName || '').trim() || String(role?.label || '').trim();
      if (candidate) return candidate;
      const id = Number(role?.id);
      if (Number.isFinite(id) && id > 0) return id === 2 ? 'Licensee' : `Role ${id}`;
    }
    return 'Licensee';
  }

  private loadUserProfile(): void {
    this.profileLoading = true;
    this.loaded = false;

    const sub = this.mastersService.getMyLicenseeProfile().subscribe({
      next: (profile: any) => {
        if (profile) {
          this.licenseeProfile = this.enrichProfileWithDisplayValues(profile);
          this.isNewProfile = false;
          this.populateForm();
        } else {
          this.isNewProfile = true;
        }
        this.profileLoading = false;
        this.loaded = true;
      },
      error: (error: any) => {
        if (error.status === 404) {
          this.isNewProfile = true;
        }
        this.profileLoading = false;
        this.loaded = true;
      }
    });
    this.subscriptions.add(sub);
  }

  private enrichProfileWithDisplayValues(profile: any): any {
    return {
      ...profile,
      gender_display: this.getGenderDisplay(profile.gender),
      marital_status_display: this.getMaritalStatusDisplay(profile.maritalStatus),
      residential_status_display: this.getResidentialStatusDisplay(profile.residentialStatus),
      father_name: profile.fatherName,
      pan_number: profile.panNumber,
      marital_status: profile.maritalStatus,
      residential_status: profile.residentialStatus
    };
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
  }

  get f() { return this.profileForm.controls; }

  closeDialog(): void {
    this.dialogRef.close();
  }

  // --- Profile Edit Actions ---

  openEditForm(): void {
    this.showEditForm = true;
    this.showPasswordForm = false;
    this.saveError = '';
    this.saveSuccess = false;
  }

  cancelEdit(): void {
    this.showEditForm = false;
    this.saveError = '';
    this.saveSuccess = false;
    this.populateForm();
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      this.saveError = 'Please fix all errors before saving.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    this.saveSuccess = false;

    const payload = this.isNewProfile ? this.formatCreatePayload() : this.formatUpdatePayload();

    const save$ = this.isNewProfile
      ? this.mastersService.createLicenseeProfile(payload)
      : this.mastersService.patchLicenseeProfile(this.licenseeProfile.id, payload).pipe(
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
        if (error.error && typeof error.error === 'object') {
          const messages = Object.entries(error.error)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : String(msgs)}`)
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

  // --- Password Edit Actions ---

  openPasswordForm(): void {
    this.showPasswordForm = true;
    this.showEditForm = false; 
    this.passwordForm.reset();
    this.passwordSuccess = false;
    this.passwordError = '';
  }

  cancelPasswordEdit(): void {
    this.showPasswordForm = false;
    this.passwordSuccess = false;
    this.passwordError = '';
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }

    this.isSavingPassword = true;
    this.passwordError = '';
    this.passwordSuccess = false;

    const payload = {
      old_password: this.passwordForm.value.oldPassword,
      new_password: this.passwordForm.value.newPassword
    };

    const sub = this.authService.changePassword(payload).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.passwordSuccess = true;
        setTimeout(() => this.cancelPasswordEdit(), 2000);
      },
      error: (err: any) => {
        this.isSavingPassword = false;
        this.passwordError = err.error?.old_password?.[0] 
          || err.error?.new_password?.[0] 
          || 'Failed to update password. Please check your current password.';
      }
    });

    this.subscriptions.add(sub);
  }

  // --- Utilities ---

  openMyLicenses(): void {
    this.dialogRef.close();
    this.dialog.open(MyLicensesComponent, {
      width: '1150px',
      maxWidth: '95vw',
      maxHeight: '90vh'
    });
  }

  private formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatCreatePayload(): any {
    const v = this.profileForm.getRawValue();
    return {
      fatherName: v.father_name, dob: this.formatDate(v.dob), gender: v.gender,
      nationality: v.nationality, maritalStatus: v.marital_status, residentialStatus: v.residential_status
    };
  }

  private formatUpdatePayload(): any {
    const v = this.profileForm.getRawValue();
    return {
      fatherName: v.father_name, dob: this.formatDate(v.dob), gender: v.gender,
      nationality: v.nationality, maritalStatus: v.marital_status, residentialStatus: v.residential_status
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