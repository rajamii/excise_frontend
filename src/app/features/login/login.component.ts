import { Component } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  FormControl,
  Validators,
} from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialModule } from '../../shared/material.module';
import { CaptchaComponent } from '../../shared/components/captcha/captcha.component';
import { BaseComponent } from '../../base/base.components';
import { BaseDependency } from '../../base/dependency/base.dependency';
import { NgOtpInputModule } from 'ng-otp-input';
import { AuthService } from '../../core/services/auth.service';
import { FormDataUtil } from '../../shared/utils/form-data.util';
import Swal from 'sweetalert2';
import { ADMIN_ROLES } from '../../shared/constants/role.constants';
import { Authority } from '../../shared/constants/authority.enum';
import { PatternConstants } from '../../shared/constants/pattern.constants';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MaterialModule, CaptchaComponent, NgOtpInputModule, MatProgressSpinnerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent extends BaseComponent {
  loginForm: FormGroup;
  registrationForm: FormGroup;
  isPasswordMode = true;
  hidePassword = true;
  hideRegPassword = true;
  hideConfirmPassword = true;
  otpSent = false;
  otpIndex: string | null = null;
  otpAutoSubmitted = false;
  isSendingOtp = false;

  // Registration related properties
  registrationOtpSent = false;
  registrationOtpAutoSubmitted = false;
  registrationError = false;
  registrationErrorMessages: string[] = [];
  registrationOtpControl = new FormControl('', [Validators.required, Validators.minLength(4)]);
  registrationComplete = false;
  registrationOtpId: string | null = null; // ← Renamed from otpId
  otpVerified = false;
  isRegistering = false; // ← New: loading state for final registration

  loginError = false;
  loginErrorMessages: string[] = [];

  isRightPanelActive = false;

  constructor(
    protected override baseDependency: BaseDependency,
    protected override authService: AuthService,
    private fb: FormBuilder
  ) {
    super(baseDependency);

    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: [''],
      phoneNumber: ['', Validators.pattern(PatternConstants.MOBILE)],
      otp: [''],
      response: ['', Validators.required],
      hashkey: ['', Validators.required],
    });

    this.registrationForm = this.fb.group(
      {
        firstName: ['', Validators.required],
        middleName: [''],
        lastName: ['', Validators.required],
        phoneNumber: ['', [Validators.required, Validators.pattern(PatternConstants.MOBILE)]],
        email: ['', [Validators.required, Validators.email]],
        panNumber: ['', Validators.required],
        address: ['', Validators.required],
        district: ['', Validators.required],
        subdivision: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
        hashkey: ['', Validators.required],    // From CaptchaComponent
        response: ['', Validators.required],
      },
      { validator: this.passwordMatchValidator }
    );

    this.setValidators();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['sessionExpired']) {
        setTimeout(() => {
          Swal.fire({
            icon: 'warning',
            title: 'Session Expired',
            text: 'Your session has expired. Please log in again.',
            confirmButtonText: 'OK',
          });

          this.router.navigate([], {
            queryParams: { sessionExpired: null },
            queryParamsHandling: 'merge',
          });
        }, 100);
      }
    });
  }

  switchToSignUp() {
    this.isRightPanelActive = true;
  }

  switchToSignIn() {
    this.isRightPanelActive = false;
  }

  private passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      formGroup.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      formGroup.get('confirmPassword')?.setErrors(null);
      return null;
    }
  }

  toggleMode(isPassword: boolean): void {
    this.isPasswordMode = isPassword;
    this.otpSent = false;
    this.otpIndex = null;
    this.otpAutoSubmitted = false;
    this.loginForm.reset();
    this.setValidators();
  }

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

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  sendOtp(): void {
    if (this.loginForm.controls['phoneNumber'].invalid || this.isSendingOtp) {
      return;
    }

    this.isSendingOtp = true;
    const phoneNumber = this.loginForm.value.phoneNumber;
    const formData = FormDataUtil.buildFormData({ phoneNumber });

    this.authService.sendOtp(formData).subscribe({
      next: (response) => {
        this.otpSent = true;
        this.otpIndex = response.otpId;
        console.log('OTP:', response.otp);
        this.isSendingOtp = false;
      },
      error: (err) => {
        console.error('Error sending OTP:', err);
        alert('Failed to send OTP. Please try again.');
        this.isSendingOtp = false;
      },
    });
  }

  get otpControl(): FormControl {
    return this.loginForm.get('otp') as FormControl;
  }

  sendRegistrationOtp() {
    this.isSendingOtp = true;
    this.registrationError = false;
    this.registrationErrorMessages = [];

    const data = {
      phoneNumber: this.registrationForm.controls['phoneNumber'].value,
      purpose: 'register'
    };

    this.authService.sendRegOtp(data).subscribe({
      next: (res: any) => {
        this.registrationOtpSent = true;
        this.registrationOtpId = res.otpId;
        this.isSendingOtp = false;
        console.log('Registration OTP:', res.otp); // For testing purposes
      },
      error: (err) => {
        this.isSendingOtp = false;
        this.registrationError = true;
        this.registrationErrorMessages = this.extractErrorMessages(err.error);
      }
    });
  }

  verifyRegistrationOtp() {
    const otp = this.registrationOtpControl.value;
    const data = {
      phoneNumber: this.registrationForm.controls['phoneNumber'].value,
      otp: otp,
      otpId: this.registrationOtpId
    };

    this.authService.verifyRegOtp(data).subscribe({
      next: () => {
        this.otpVerified = true;
        this.registrationError = false;
      },
      error: (err) => {
        this.registrationError = true;
        this.registrationErrorMessages = this.extractErrorMessages(err.error);
      }
    });
  }

  onRegistrationOtpChange(otp: string) {

    this.registrationOtpControl.setValue(otp);

    if (otp && otp.length === 4 && this.registrationOtpId && !this.otpVerified) {
      setTimeout(() => this.verifyRegistrationOtp(), 300);
    }
  }

  onRegister() {

    if (this.isRegistering || !this.otpVerified || !this.registrationOtpId) {
      return;
    }

    this.isRegistering = true;
    this.registrationError = false;
    this.registrationErrorMessages = [];

    const form = this.registrationForm.value;

    const payload = {
      phone_number: form.phoneNumber?.trim(),
      otp_id: this.registrationOtpId,
      first_name: form.firstName?.trim(),
      last_name: form.lastName?.trim(),
      email: form.email?.trim(),
      pan_number: form.panNumber?.trim(),
      address: form.address?.trim(),
      district: form.district,
      subdivision: form.subdivision,
      password: form.password,
      hashkey: form.hashkey,
      response: form.response
    };

    console.log('Registration payload:', payload); // ← Check this in browser console!

    console.log('Full form value:', this.registrationForm.value);
    console.log('Hashkey:', this.registrationForm.get('hashkey')?.value);
    console.log('Response:', this.registrationForm.get('response')?.value);

    this.authService.licenseeRegisterWithOtp(payload).subscribe({
      next: (res: any) => {
        console.log('Registration success:', res);
        this.registrationComplete = true;
        this.isRegistering = false;

        // Auto-login with returned tokens
        let access = res.tokens?.access || res.access || res.authenticatedUser?.access;
        let refresh = res.tokens?.refresh || res.refresh || res.authenticatedUser?.refresh;

        if (access && refresh) {
          localStorage.setItem('access', access);
          localStorage.setItem('refresh', refresh);
          this.accountService.identity(true).subscribe(user => {
            if (user) {
              this.redirectBasedOnRole(user.role!.name);
            }
          });
        } else {
          this.handleAuthResponse(res); // fallback
        }
      },
      error: (err) => {
        this.isRegistering = false;
        this.registrationError = true;
        console.error('Registration error response:', err);

        const errors = err.error?.errors || err.error || { non_field_errors: ['Registration failed'] };
        this.registrationErrorMessages = this.extractErrorMessages(errors);
      }
    });
  }

  // Resets the registration process
  resetRegistration() {
    this.registrationOtpSent = false;
    this.otpVerified = false;
    this.registrationOtpId = null;
    this.registrationOtpControl.reset();
    this.registrationForm.patchValue({
      phoneNumber: '',
      firstName: '',
      middleName: '',
      lastName: ''
    });
  }
  // Handles login submission
  onLogin(): void {
    if (this.isPasswordMode) {
      this.loginWithPassword();
    } else {
      if (!this.otpSent) {
        this.sendOtp();
      } else {
        this.verifyOtp();
      }
    }
  }

  private loginWithPassword(): void {
    if (this.loginForm.invalid) {
      alert('Please fill in all fields correctly.');
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
        this.loginErrorMessages = this.extractErrorMessages(err.error);
      },
    });
  }

  private extractErrorMessages(errorObj: any): string[] {
    if (!errorObj || typeof errorObj !== 'object') return ['Unknown error'];

    return Object.values(errorObj).flatMap((val) => {
      if (Array.isArray(val)) {
        return val.map((v) => String(v));
      }
      return [String(val)];
    });
  }

  onOtpChange(otp: string): void {
    this.loginForm.controls['otp'].setValue(otp);

    if (otp.length === 4 && !this.otpAutoSubmitted) {
      this.otpAutoSubmitted = true;
      this.verifyOtp();
    }
  }

  private verifyOtp(): void {
    if (!this.loginForm.value.otp || !this.otpIndex) {
      alert('Please enter a valid OTP.');
      this.otpAutoSubmitted = false;
      return;
    }

    const requestData = {
      phoneNumber: this.loginForm.value.phoneNumber,
      otp: this.loginForm.value.otp,
      otpId: this.otpIndex,
    };

    this.authService.verifyOtp(requestData).subscribe({
      next: (res: any) => {
        this.handleAuthResponse(res);
      },
      error: (err) => {
        console.error('OTP verification error:', err);
        alert('Invalid OTP. Please try again.');
        this.otpAutoSubmitted = false;
      },
    });
  }

  private handleAuthResponse(res: any): void {
    console.log('Login response:', res);

    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (res.authenticatedUser?.access && res.authenticatedUser?.refresh) {
      accessToken = res.authenticatedUser.access;
      refreshToken = res.authenticatedUser.refresh;
    } else if (res.access && res.refresh) {
      accessToken = res.access;
      refreshToken = res.refresh;
    } else if (res.token && res.refresh_token) {
      accessToken = res.token;
      refreshToken = res.refresh_token;
    }

    if (accessToken && refreshToken) {
      localStorage.setItem('access', accessToken);
      localStorage.setItem('refresh', refreshToken);

      this.accountService.identity(true).subscribe({
        next: (user) => {
          if (user) {
            this.redirectBasedOnRole(user.role!.name);
          } else {
            alert('Failed to fetch user details. Please log in again.');
          }
        },
        error: (err) => {
          console.error('Error fetching user details:', err);
          alert('Failed to fetch user details. Please log in again.');
        }
      });
    } else {
      console.error('Invalid login response structure:', res);
      alert('Authentication failed. Invalid response from server.');
    }
  }

  private redirectBasedOnRole(role: string): void {
    if (ADMIN_ROLES.includes(role)) {
      this.router.navigate(['admin/dashboard']);
    } else if (role === 'licensee') {
      this.router.navigate(['licensee/dashboard']);
    } else if (role === 'Supply_Chain') {
      this.router.navigate(['supply-chain/dashboard']);
    } else if (role === Authority.PERMIT_SECTION) {
      this.router.navigate(['/app-permit-section']);
    } else if (role === Authority.COMMISSIONER) {
      this.router.navigate(['/dev-commissioner-dashboard']);
    } else {
      console.warn('Unknown role:', role);
    }
  }

  resetPhoneNumber(): void {
    this.otpSent = false;
    this.otpIndex = null;
    this.otpAutoSubmitted = false;
    this.loginForm.reset();
    this.setValidators();
  }
}