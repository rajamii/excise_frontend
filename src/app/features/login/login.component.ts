import { Component } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MaterialModule } from '../../shared/material.module';
import { CaptchaComponent } from '../../shared/captcha/captcha.component';
import { BaseComponent } from '../../base/base.components';
import { BaseDependency } from '../../base/dependency/base.dependency';
import { NgOtpInputModule } from 'ng-otp-input';
import { AuthService } from '../../core/services/auth.service';
import { FormDataUtil } from '../../shared/utils/form-data.util';

@Component({
  selector: 'app-login',
  imports: [MaterialModule, CaptchaComponent, NgOtpInputModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent extends BaseComponent {
  loginForm: FormGroup;              // Reactive form group for login
  isPasswordMode: boolean = true;    // Toggle between password and OTP login modes
  hidePassword = true;               // Toggles password visibility
  otpSent: boolean = false;          // Tracks whether OTP has been sent
  otpIndex: string | null = null;    // Placeholder for OTP index if backend returns it
  otpAutoSubmitted = false;

  loginError = false;
  loginErrorMessages: string[] = [];

  constructor(
    protected override baseDependency: BaseDependency,
    protected override authService: AuthService,
    private fb: FormBuilder
  ) {
    super(baseDependency);

    // Initialize form controls with default validators
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: [''],
      phoneNumber: [''], 
      otp: [''],
      response: ['', Validators.required],   // Captcha response value
      hashkey: ['', Validators.required],    // Captcha hashkey
    });

    this.setValidators(); // Apply initial validation rules
  }

  /** Toggle between password and OTP-based login modes */
  toggleMode(isPassword: boolean): void {
    this.isPasswordMode = isPassword;
    this.otpSent = false;
    this.otpIndex = null;
    this.loginForm.reset(); // Clear form fields
    this.setValidators();   // Adjust validators depending on mode
  }

  /** Apply validators based on current login mode */
  private setValidators(): void {
    if (this.isPasswordMode) {
      this.loginForm.controls['password'].setValidators(Validators.required);
      this.loginForm.controls['otp'].clearValidators();
    } else {
      this.loginForm.controls['password'].clearValidators();
      this.loginForm.controls['otp'].setValidators(Validators.required);
    }

    this.loginForm.controls['password'].updateValueAndValidity();
    this.loginForm.controls['otp'].updateValueAndValidity();
  }

  /** Toggle password field visibility */
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  /** Sends OTP to the user's phone number */
  sendOtp(): void {
    if (this.loginForm.controls['phoneNumber'].invalid) {
      alert('Please enter a valid phone number.');
      return;
    }

    const phoneNumber = this.loginForm.value.phoneNumber;
    console.log('🔹 Sending OTP request for:', phoneNumber);

    const formData = FormDataUtil.buildFormData({ phoneNumber });

    this.authService.sendOtp(formData).subscribe({
      next: (response) => {
        this.otpSent = true;
        this.otpIndex = response.otpId; // Capture OTP index

        console.log('OTP:', response.otp); // only if backend includes it
      },
      error: (err) => {
        console.error('❌ Error sending OTP:', err);
        alert('Failed to send OTP. Please try again.');
      }
    });
  }

  /** Getter for OTP form control (used with OTP input component) */
  get otpControl(): FormControl {
    return this.loginForm.get('otp') as FormControl;
  }

  /** Handles login form submission */
  onLogin(): void {
    if (this.isPasswordMode) {
      this.loginWithPassword();
    } else {
      if (!this.otpSent) {
        this.sendOtp(); // Trigger OTP if not already sent
      } else {
        this.verifyOtp(); // Attempt OTP verification
      }
    }
  }

  /** Navigate to license registration page */
  goToApplyLicense(): void {
    this.router.navigate(['/licensee/apply-license']);
  }

  /** Handles password-based login logic */
  private loginWithPassword(): void {
    if (this.loginForm.invalid) {
      alert("Please fill in all fields correctly.");
      return;
    }

    this.authService.login(this.loginForm.value).subscribe({
      next: (res: any) => {
        this.loginError = false;
        this.loginErrorMessages = [];
        this.handleAuthResponse(res);
      },
      error: (err) => {
        console.error('Login error:', err);
        this.loginError = true;

        // Flatten and capture API errors for display
        this.loginErrorMessages = this.extractErrorMessages(err.error);
      }
    });
  }

  private extractErrorMessages(errorObj: any): string[] {
    if (!errorObj || typeof errorObj !== 'object') return ['Unknown error'];

    return Object.values(errorObj).flatMap((val) => {
      if (Array.isArray(val)) {
        return val.map(v => String(v));
      }
      return [String(val)];
    });
  }

  /** Updates OTP value as user types into the OTP input */
  onOtpChange(otp: string): void {
    this.loginForm.controls['otp'].setValue(otp);

    if (otp.length === 4 && !this.otpAutoSubmitted) {
      this.otpAutoSubmitted = true;
      this.verifyOtp();
    }
  }

  /** Verifies the entered OTP with the backend */
  private verifyOtp(): void {
    if (!this.loginForm.value.otp) {
      alert('Please enter the OTP.');
      return;
    }

    if (!this.otpIndex) {
      alert('OTP index missing. Please request OTP again.');
      return;
    }

    const requestData = {
      phoneNumber: this.loginForm.value.phoneNumber,
      otp: this.loginForm.value.otp,
      otpId: this.otpIndex ?? ''
    };

    console.log('🔹 Verifying OTP:', requestData);

    this.authService.verifyOtp(requestData).subscribe({
      next: (res: any) => {
        console.log('🔹 OTP verification response:', res);
        this.handleAuthResponse(res);
      },
      error: (err) => {
        console.error('OTP verification error:', err);
        alert('Invalid OTP. Please try again.');
      }
    });
  }

  /** Stores tokens and navigates to the appropriate dashboard after successful login */
  private handleAuthResponse(res: any): void {
    if (res.authenticatedUser?.access && res.authenticatedUser?.refresh) {
      localStorage.setItem('access', res.authenticatedUser.access);
      localStorage.setItem('refresh', res.authenticatedUser.refresh);

      console.log('Access Token:', res.authenticatedUser.access);
      
      // Fetch user identity (which includes the role) and redirect based on role
      this.accountService.identity(true).subscribe({
        next: (user) => {
          if (user) {
            this.redirectBasedOnRole(user.role); // Redirect to role-based dashboard
          } else {
            alert('Failed to fetch user details. Please log in again.');
          }
        },
      });
    } else {
      alert('Authentication failed.');
    }
  }

  /** Redirects user to appropriate dashboard based on their role */
  private redirectBasedOnRole(role: string): void {
    const adminRoles = [
      'level_1',
      'level_2',
      'level_3',
      'level_4',
      'level_5',
      'site_admin',
      'dev'
    ];

    if (adminRoles.includes(role)) {
      this.router.navigate(['admin/dashboard']);
    } else if (role === 'licensee') {
      this.router.navigate(['licensee/dashboard']);
    } else {
      console.warn('Unknown role:', role);
    }
  }

  /** Resets phone number and form state (used when switching numbers) */
  resetPhoneNumber(): void {
    this.otpSent = false;
    this.loginForm.reset();
    this.setValidators(); // Re-apply validators after reset
  }
}