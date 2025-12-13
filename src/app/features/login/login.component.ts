import { Component } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MaterialModule } from '../../shared/material.module';
import { CaptchaComponent } from '../../shared/components/captcha/captcha.component';
import { BaseComponent } from '../../base/base.components';
import { BaseDependency } from '../../base/dependency/base.dependency';
import { NgOtpInputModule } from 'ng-otp-input';
import { AuthService } from '../../core/services/auth.service';
import { FormDataUtil } from '../../shared/utils/form-data.util';
import Swal from 'sweetalert2';
import { ADMIN_ROLES } from '../../shared/constants/role.constants';
import { PatternConstants } from '../../shared/constants/pattern.constants';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MaterialModule, CaptchaComponent, NgOtpInputModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent extends BaseComponent {
  loginForm: FormGroup;
  isPasswordMode = true;
  hidePassword = true;
  otpSent = false;
  otpIndex: string | null = null;
  otpAutoSubmitted = false;
  isSendingOtp = false; // To prevent multiple OTP requests

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

    this.setValidators();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired']) {
        setTimeout(() => {
          Swal.fire({
            icon: 'warning',
            title: 'Session Expired',
            text: 'Your session has expired. Please log in again.',
            confirmButtonText: 'OK'
          });

          // Remove the query param after showing
          this.router.navigate([], {
            queryParams: { sessionExpired: null },
            queryParamsHandling: 'merge'
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
        console.log('OTP:', response.otp); // Log for dev only
        this.isSendingOtp = false;
      },
      error: (err) => {
        console.error('Error sending OTP:', err);
        alert('Failed to send OTP. Please try again.');
        this.isSendingOtp = false;
      }
    });
  }

  get otpControl(): FormControl {
    return this.loginForm.get('otp') as FormControl;
  }

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

  goToApplyLicense(): void {
    this.router.navigate(['/licensee/apply-license']);
  }

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

  onOtpChange(otp: string): void {
    this.loginForm.controls['otp'].setValue(otp);

    if (otp.length === 4 && !this.otpAutoSubmitted) {
      this.otpAutoSubmitted = true;
      this.verifyOtp();
    }
  } 

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
      otpId: this.otpIndex
    };

    this.authService.verifyOtp(requestData).subscribe({
      next: (res: any) => {
        this.handleAuthResponse(res);
      },
      error: (err) => {
        console.error('OTP verification error:', err);
        alert('Invalid OTP. Please try again.');
        this.otpAutoSubmitted = false; // Allow retry
      }
    });
  }

  private handleAuthResponse(res: any): void {
    console.log('Login response:', res);
    
    // Handle different response structures
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
      console.log('Tokens stored successfully');

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
