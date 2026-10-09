// Importing core Angular, Forms, and Material dependencies
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AccountService } from '../../../../core/services/account.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MaterialModule } from '../../../../shared/material.module';
import { MatDialogRef } from '@angular/material/dialog';
import { UserService } from '../../../../core/services/user.service';

// Component metadata definition
@Component({
  selector: 'app-user-profile', // Selector used in templates to include this component
  standalone: true,
  imports: [MaterialModule, CommonModule, ReactiveFormsModule], // Added Forms and Common modules
  templateUrl: './user-profile.component.html', // HTML template for this component
  styleUrl: './user-profile.component.scss'     // SCSS stylesheet for styling
})
export class UserProfileComponent implements OnInit {
  user: any;        // Stores the currently authenticated user's data
  loaded = false;   // Flag to track if user data is loaded
  resolvedRoleName = '';

  // --- Password Edit State ---
  passwordForm!: FormGroup;
  showPasswordForm = false;
  isSavingPassword = false;
  passwordSuccess = false;
  passwordError = '';
  hideOld = true;
  hideNew = true;
  hideConfirm = true;

  // Injecting required services:
  // - MatDialogRef to control the dialog box
  // - AccountService to fetch user authentication details
  // - FormBuilder to construct the reactive form
  constructor(
    public dialogRef: MatDialogRef<UserProfileComponent>,
    private accountService: AccountService,
    private authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder
  ) {}

  // Angular lifecycle hook, runs after component initializes
  ngOnInit(): void {
    // Initialize the change password form
    this.initializeForm();

    // Subscribing to the authentication state to get user info
    this.accountService.getAuthenticationState().subscribe(acc => {
      if (acc !== null) {
        this.user = acc; // Assign user data if account is authenticated
        this.resolveRoleName();
      }
      this.loaded = true; // Mark the loading complete whether user is null or not
    });
  }

  // Set up the reactive form and validators
  private initializeForm(): void {
    this.passwordForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator to ensure passwords match
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPwd = control.get('newPassword')?.value;
    const confirmPwd = control.get('confirmPassword')?.value;
    if (newPwd && confirmPwd && newPwd !== confirmPwd) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  private resolveRoleName(): void {
    const directRoleName = this.user?.role?.name || this.user?.role?.displayName;
    if (directRoleName) {
      this.resolvedRoleName = directRoleName;
      return;
    }

    const roleId = this.user?.role?.id;
    if (!roleId) {
      this.resolvedRoleName = '-';
      return;
    }

    this.userService.getRoleById(roleId).subscribe({
      next: (role) => {
        this.resolvedRoleName = role?.name || '-';
      },
      error: () => {
        this.resolvedRoleName = '-';
      }
    });
  }

  // Method to close the user profile dialog
  closeDialog(): void {
    this.dialogRef.close();
  }

  // --- Password Form Action Handlers ---

  openPasswordForm(): void {
    this.showPasswordForm = true;
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
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSavingPassword = true;
    this.passwordError = '';
    this.passwordSuccess = false;

    const payload = {
      old_password: this.passwordForm.value.oldPassword,
      new_password: this.passwordForm.value.newPassword
    };

    this.authService.changePassword(payload).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.passwordSuccess = true;
        // Close the form automatically after 2 seconds on success
        setTimeout(() => this.cancelPasswordEdit(), 2000);
      },
      error: (err: any) => {
        this.isSavingPassword = false;
        // Extract errors from DRF backend
        this.passwordError = err.error?.old_password?.[0] 
          || err.error?.new_password?.[0] 
          || 'Failed to update password. Please check your current password.';
      }
    });
  }
}