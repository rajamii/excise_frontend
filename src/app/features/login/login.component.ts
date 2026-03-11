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
import { PatternConstants } from '../../shared/constants/pattern.constants';
import { District } from '../../core/models/district.model';
import { Subdivision } from '../../core/models/subdivision.model';
import { MasterService } from '../../core/services/master.service';
import { HttpErrorResponse } from '@angular/common/http';

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
  loginOtpPreview: string | null = null;
  otpAutoSubmitted = false;
  isSendingOtp = false;

  // Registration related properties
  registrationOtpSent = false;
  registrationOtpAutoSubmitted = false;
  registrationError = false;
  registrationErrorMessages: string[] = [];
  registrationOtpControl = new FormControl('', [Validators.required, Validators.minLength(4)]);
  registrationComplete = false;
  registrationOtpId: string | null = null;
  otpVerified = false;
  isRegistering = false;

  loginError = false;
  loginErrorMessages: string[] = [];

  isRightPanelActive = false;

  districts: District[] = [];
  subdivisions: Subdivision[] = [];
  loadingDistricts = false;
  loadingSubdivisions = false;


  constructor(
    protected override baseDependency: BaseDependency,
    protected override authService: AuthService,
    protected override masterService: MasterService,
    private fb: FormBuilder,
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
        email: [''],
        panNumber: [''],
        address: [''],
        district: [''],
        subdivision: [''],
        password: [''],
        confirmPassword: [''],
        hashkey: [''],
        response: [''],
      }, { validator: this.passwordMatchValidator });

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
            allowOutsideClick: false,
            allowEscapeKey: false,
          });

          this.router.navigate([], {
            queryParams: { sessionExpired: null },
            queryParamsHandling: 'merge',
          });
        }, 100);
      }

      if (params['inactive']) {
        setTimeout(() => {
          Swal.fire({
            title: 'We Miss You',
            html: `
              <div class="inactive-logout-content">
                <div class="inactive-alien-wrap" aria-hidden="true">
                  <span class="inactive-alien-head"></span>
                  <span class="inactive-alien-eye inactive-alien-eye-left"></span>
                  <span class="inactive-alien-eye inactive-alien-eye-right"></span>
                  <span class="inactive-alien-mouth"></span>
                  <span class="inactive-alien-antenna"></span>
                  <span class="inactive-alien-tear"></span>
                </div>
                <p class="inactive-logout-message">
                  Your session timed out due to inactivity. Please log in again.
                </p>
              </div>
            `,
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            allowEscapeKey: false,
            buttonsStyling: false,
            customClass: {
              popup: 'inactive-logout-popup',
              title: 'inactive-logout-title',
              confirmButton: 'inactive-logout-confirm'
            }
          });

          this.router.navigate([], {
            queryParams: { inactive: null },
            queryParamsHandling: 'merge',
          });
        }, 100);
      }
    });
    this.fetchDistricts();
  }

  switchToSignUp() {
    this.isRightPanelActive = true;
  }

  switchToSignIn() {
    this.isRightPanelActive = false;
  }

  goToHome(): void {
    this.router.navigate(['/']);
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
    this.loginOtpPreview = null;
    this.otpAutoSubmitted = false;
    this.loginForm.reset();
    this.clearLoginErrors();
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

  private enableRemainingFields() {
    const fields = ['email', 'panNumber', 'address', 'district', 'subdivision', 'password', 'confirmPassword'];
    fields.forEach(field => {
      this.registrationForm.get(field)?.setValidators(Validators.required);
      this.registrationForm.get(field)?.updateValueAndValidity();
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  sanitizePhoneNumberInput(form: 'login' | 'registration', event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const sanitizedValue = input.value.replace(/\D/g, '').slice(0, 10);
    if (input.value !== sanitizedValue) {
      input.value = sanitizedValue;
    }

    const targetForm = form === 'registration' ? this.registrationForm : this.loginForm;
    targetForm.get('phoneNumber')?.setValue(sanitizedValue, { emitEvent: false });
    targetForm.get('phoneNumber')?.markAsDirty();
    targetForm.get('phoneNumber')?.updateValueAndValidity();
  }

  onOtpPhoneEnter(event: Event): void {
    event.preventDefault();
    if (!this.isPasswordMode && !this.otpSent) {
      this.sendOtp();
    }
  }

  // Fetch districts
  fetchDistricts(): void {
    this.loadingDistricts = true;
    this.masterService.getDistrict().subscribe({
      next: (districts) => {
        this.districts = districts;
        this.loadingDistricts = false;
      },
      error: (err) => {
        console.error('Failed to load districts', err);
        this.loadingDistricts = false;
      }
    });
  }

  // Fetch subdivisions based on selected district
  onDistrictChange(districtCode: number): void {
    if (!districtCode) {
      this.subdivisions = [];
      this.registrationForm.get('subdivision')?.reset();
      return;
    }

    this.loadingSubdivisions = true;
    this.masterService.getSubdivisionsByDistrict(districtCode).subscribe({
      next: (subdivisions) => {
        this.subdivisions = subdivisions;
        this.loadingSubdivisions = false;
        this.registrationForm.get('subdivision')?.reset();
      },
      error: (err) => {
        console.error('Failed to load subdivisions', err);
        this.subdivisions = [];
        this.loadingSubdivisions = false;
      }
    });
  }

  sendOtp(): void {
    if (this.isSendingOtp) {
      return;
    }

    const phoneControl = this.loginForm.controls['phoneNumber'];
    const sanitizedPhoneNumber = String(phoneControl.value || '').replace(/\D/g, '').slice(0, 10);
    if (phoneControl.value !== sanitizedPhoneNumber) {
      phoneControl.setValue(sanitizedPhoneNumber);
    }

    if (phoneControl.invalid) {
      this.setLoginErrors(['Enter a valid mobile number: 10 digits, starting with 6, 7, 8, or 9.']);
      return;
    }

    this.isSendingOtp = true;
    this.clearLoginErrors();
    const phoneNumber = sanitizedPhoneNumber;
    const formData = FormDataUtil.buildFormData({ phoneNumber });

    this.authService.sendOtp(formData).subscribe({
      next: (response) => {
        this.otpSent = true;
        this.otpIndex = response.otpId;
        this.loginOtpPreview = response.otp ? String(response.otp) : null;
        console.log('OTP:', response.otp);
        this.isSendingOtp = false;
      },
      error: (err) => {
        console.error('Error sending OTP:', err);
        this.setLoginErrors(this.mapLoginErrors(err, 'sendOtp'));
        this.loginOtpPreview = null;
        this.isSendingOtp = false;
      },
    });
  }

  get otpControl(): FormControl {
    return this.loginForm.get('otp') as FormControl;
  }

  sendRegistrationOtp() {
    const phoneControl = this.registrationForm.get('phoneNumber');
    const sanitizedPhoneNumber = String(phoneControl?.value || '').replace(/\D/g, '').slice(0, 10);
    if (phoneControl?.value !== sanitizedPhoneNumber) {
      phoneControl?.setValue(sanitizedPhoneNumber);
    }

    if (this.registrationForm.invalid) {
      this.registrationError = true;
      this.registrationErrorMessages = this.getRegistrationValidationErrors();
      return;
    }
    const phoneNumber = sanitizedPhoneNumber;
    this.isSendingOtp = true;
    this.registrationError = false;
    this.authService.sendRegistrationOtp({
      phoneNumber: phoneNumber,
      purpose: 'register'
    }).subscribe({
      next: (res: any) => {
        this.registrationOtpId = res.otpId;
        this.registrationOtpSent = true;
        this.isSendingOtp = false;
        //debug log
        console.log('Registration OTP sent. OTP:', res.otp);
      },
      error: (err) => {
        this.isSendingOtp = false;
        this.registrationError = true;
        this.registrationErrorMessages = this.mapRegistrationErrors(err, 'sendOtp');
      }
    });
  }

  onRegistrationOtpChange(otp: string) {
    this.registrationOtpControl.setValue(otp);
  }

  verifyRegistrationOtp() {
    const otp = this.registrationOtpControl.value;
    const phoneNumber = this.registrationForm.get('phoneNumber')?.value;

    if (!otp || otp.length !== 4 || !this.registrationOtpId) {
      this.registrationError = true;
      this.registrationErrorMessages = ['Enter a valid 4-digit OTP.'];
      return;
    }

    this.authService.verifyRegistrationOtp({
      phoneNumber: phoneNumber,
      otp: otp,
      otpId: this.registrationOtpId
    }).subscribe({
      next: () => {
        this.otpVerified = true;
        this.registrationError = false;
        this.enableRemainingFields();

        // Validators for the remaining fields
        this.registrationForm.get('email')?.setValidators([Validators.required, Validators.email]);
        this.registrationForm.get('panNumber')?.setValidators(Validators.required);
        this.registrationForm.get('address')?.setValidators(Validators.required);
        this.registrationForm.get('district')?.setValidators(Validators.required);
        this.registrationForm.get('subdivision')?.setValidators(Validators.required);
        this.registrationForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
        this.registrationForm.get('confirmPassword')?.setValidators(Validators.required);
        this.registrationForm.get('hashkey')?.setValidators(Validators.required);
        this.registrationForm.get('response')?.setValidators(Validators.required);

        // Update validity of all controls
        Object.keys(this.registrationForm.controls).forEach(key => {
          this.registrationForm.get(key)?.updateValueAndValidity();
        });
      },
      error: (err) => {
        this.registrationError = true;
        this.registrationErrorMessages = this.mapRegistrationErrors(err, 'verifyOtp');
      }
    });
  }

  onRegister() {
    if (!this.otpVerified) {
      this.registrationError = true;
      this.registrationErrorMessages = ['Verify OTP before completing registration.'];
      return;
    }

    if (this.registrationForm.invalid) {
      this.registrationError = true;
      this.registrationErrorMessages = this.getRegistrationValidationErrors();
      return;
    }

    this.isRegistering = true;
    this.registrationError = false;

    const formValue = this.registrationForm.value;

    const requestPayload = {
      phoneNumber: formValue.phoneNumber,
      firstName: formValue.firstName,
      middleName: formValue.middleName || '',
      lastName: formValue.lastName,
      email: formValue.email,
      panNumber: formValue.panNumber,
      address: formValue.address,
      district: formValue.district,
      subdivision: formValue.subdivision,
      password: formValue.password,
      hashkey: formValue.hashkey,
      response: formValue.response
    };

    this.authService.licenseeRegister(requestPayload).subscribe({
      next: (res: any) => {
        this.isRegistering = false;
        if (res.success) {
          this.registrationComplete = true;

          // Auto redirect to unified dashboard
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        }
      },
      error: (err) => {
        this.isRegistering = false;
        this.registrationError = true;
        this.registrationErrorMessages = this.mapRegistrationErrors(err, 'register');
        console.error('Registration error response:', err.error); // ← Check this in console
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
    // Clear validators for later fields
    ['email', 'panNumber', 'address', 'district', 'subdivision', 'password', 'confirmPassword', 'hashkey', 'response'].forEach(field => {
      this.registrationForm.get(field)?.clearValidators();
      this.registrationForm.get(field)?.updateValueAndValidity();
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
      this.setLoginErrors(['Enter valid user ID, password, and captcha to continue.']);
      return;
    }

    this.clearLoginErrors();
    this.authService.login(this.loginForm.value).subscribe({
      next: (res: any) => {
        this.clearLoginErrors();
        this.handleAuthResponse(res);
      },
      error: (err) => {
        console.error('Login error:', err);
        this.setLoginErrors(this.mapLoginErrors(err, 'password'));
      },
    });
  }

  private extractErrorMessages(errorObj: any): string[] {
    if (!errorObj) return [];

    if (typeof errorObj === 'string') {
      return [errorObj];
    }

    if (Array.isArray(errorObj)) {
      return errorObj.map((entry) => String(entry));
    }

    if (typeof errorObj !== 'object') return [];

    return Object.entries(errorObj).flatMap(([key, val]) => {
      if (key === 'detail' || key === 'message' || key === 'non_field_errors') {
        if (Array.isArray(val)) {
          return val.map((v) => String(v));
        }
        return [String(val)];
      }

      if (Array.isArray(val)) {
        return val.map((v) => `${this.prettyFieldName(key)}: ${String(v)}`);
      }
      return [`${this.prettyFieldName(key)}: ${String(val)}`];
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
      this.setLoginErrors(['Enter a valid 4-digit OTP.']);
      this.otpAutoSubmitted = false;
      return;
    }

    this.clearLoginErrors();
    const requestData = {
      phoneNumber: this.loginForm.value.phoneNumber,
      otp: this.loginForm.value.otp,
      otpId: this.otpIndex,
    };

    this.authService.verifyOtp(requestData).subscribe({
      next: (res: any) => {
        this.clearLoginErrors();
        this.handleAuthResponse(res);
      },
      error: (err) => {
        console.error('OTP verification error:', err);
        this.setLoginErrors(this.mapLoginErrors(err, 'verifyOtp'));
        this.otpAutoSubmitted = false;
      },
    });
  }

  private handleAuthResponse(res: any): void {

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
            const previousUrl = this.stateStorgeService.getUrl();
            if (previousUrl && previousUrl !== '/login') {
              this.stateStorgeService.clearUrl();
              this.router.navigateByUrl(previousUrl);
              return;
            }
            this.redirectBasedOnRole(user.role?.id);
          } else {
            this.setLoginErrors(['Login succeeded, but profile loading failed. Please sign in again.']);
          }
        },
        error: (err) => {
          console.error('Error fetching user details:', err);
          this.setLoginErrors(['Failed to load user details after login. Please sign in again.']);
        }
      });
    } else {
      console.error('Invalid login response structure:', res);
      this.setLoginErrors(['Authentication failed due to an invalid server response.']);
    }
  }

  private redirectBasedOnRole(roleId?: number): void {
    // DB-driven route access is enforced by guards/permissions.
    // Post-login always enter unified dashboard and let permission checks handle access.
    this.router.navigate(['/dashboard']);
  }

  resetPhoneNumber(): void {
    this.otpSent = false;
    this.otpIndex = null;
    this.loginOtpPreview = null;
    this.otpAutoSubmitted = false;
    this.loginForm.reset();
    this.clearLoginErrors();
    this.setValidators();
  }

  private clearLoginErrors(): void {
    this.loginError = false;
    this.loginErrorMessages = [];
  }

  private setLoginErrors(messages: string[]): void {
    const normalized = messages?.length ? messages : ['Something went wrong. Please try again.'];
    this.loginError = true;
    this.loginErrorMessages = normalized;
    this.showErrorPopup(normalized);
  }

  private showErrorPopup(messages: string[]): void {
    Swal.fire({
      icon: 'error',
      title: 'Login Error',
      text: messages.join('\n'),
      confirmButtonText: 'OK',
      allowOutsideClick: true,
      allowEscapeKey: true
    });
  }

  private mapLoginErrors(err: HttpErrorResponse | any, flow: 'password' | 'sendOtp' | 'verifyOtp'): string[] {
    const backendMessages = this.extractErrorMessages(err?.error);
    const status = err?.status;
    const normalizedText = backendMessages.join(' ').toLowerCase();

    const hasAny = (terms: string[]) => terms.some((term) => normalizedText.includes(term));

    if (flow === 'password') {
      if (status === 401 || hasAny(['invalid credentials', 'incorrect password', 'invalid password', 'wrong password'])) {
        return ['Incorrect user ID or password. Please try again.'];
      }
      if (status === 404 || hasAny(['user not found', 'does not exist', 'not registered', 'unregistered'])) {
        return ['User ID is not registered. Please sign up first.'];
      }
      if (hasAny(['captcha', 'invalid response'])) {
        return ['Captcha verification failed. Please solve captcha again.'];
      }
    }

    if (flow === 'sendOtp') {
      if (hasAny(['invalid phone', 'invalid mobile', 'phone number', 'mobile number', 'format'])) {
        return ['Enter a valid mobile number: 10 digits, starting with 6, 7, 8, or 9.'];
      }
      if (status === 404 || hasAny(['user not found', 'not registered', 'does not exist'])) {
        return ['This mobile number is not registered. Please sign up first.'];
      }
      if (status === 429 || hasAny(['too many', 'rate limit'])) {
        return ['Too many OTP requests. Please wait and try again.'];
      }
    }

    if (flow === 'verifyOtp') {
      if (status === 401 || status === 400 || hasAny(['invalid otp', 'otp is invalid', 'incorrect otp'])) {
        return ['Invalid OTP. Enter the correct OTP and try again.'];
      }
      if (hasAny(['expired otp', 'otp expired', 'expired'])) {
        return ['OTP has expired. Please request a new OTP.'];
      }
      if (status === 404 || hasAny(['not registered', 'user not found'])) {
        return ['This mobile number is not registered. Please sign up first.'];
      }
    }

    if (backendMessages.length > 0) {
      return backendMessages;
    }

    return ['Something went wrong. Please try again.'];
  }

  private prettyFieldName(field: string): string {
    switch (field) {
      case 'phoneNumber': return 'Phone number';
      case 'firstName': return 'First name';
      case 'lastName': return 'Last name';
      case 'middleName': return 'Middle name';
      case 'panNumber': return 'PAN number';
      case 'hashkey': return 'Captcha';
      case 'response': return 'Captcha';
      case 'non_field_errors': return 'Error';
      default:
        return field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
    }
  }

  private getRegistrationValidationErrors(): string[] {
    const messages: string[] = [];
    const firstName = this.registrationForm.get('firstName');
    const lastName = this.registrationForm.get('lastName');
    const phoneNumber = this.registrationForm.get('phoneNumber');
    const email = this.registrationForm.get('email');
    const password = this.registrationForm.get('password');
    const confirmPassword = this.registrationForm.get('confirmPassword');
    const hashkey = this.registrationForm.get('hashkey');
    const response = this.registrationForm.get('response');

    if (firstName?.invalid) messages.push('First name is required.');
    if (lastName?.invalid) messages.push('Last name is required.');
    if (phoneNumber?.hasError('required')) messages.push('Mobile number is required.');
    if (phoneNumber?.hasError('pattern')) messages.push('Enter a valid mobile number: 10 digits, starting with 6, 7, 8, or 9.');
    if (email?.hasError('required')) messages.push('Email address is required.');
    if (email?.hasError('email')) messages.push('Enter a valid email address.');
    if (password?.hasError('required')) messages.push('Password is required.');
    if (password?.hasError('minlength')) messages.push('Password must be at least 8 characters long.');
    if (confirmPassword?.hasError('required')) messages.push('Confirm password is required.');
    if (confirmPassword?.hasError('mismatch') || this.registrationForm.hasError('mismatch')) {
      messages.push('Password and confirm password must match.');
    }
    if (this.registrationForm.get('district')?.invalid) messages.push('District is required.');
    if (this.registrationForm.get('subdivision')?.invalid) messages.push('Subdivision is required.');
    if (this.registrationForm.get('panNumber')?.invalid) messages.push('PAN number is required.');
    if (this.registrationForm.get('address')?.invalid) messages.push('Address is required.');
    if (hashkey?.invalid || response?.invalid) messages.push('Captcha is required.');

    return messages.length > 0 ? Array.from(new Set(messages)) : ['Please check the form and try again.'];
  }

  private mapRegistrationErrors(err: HttpErrorResponse | any, flow: 'sendOtp' | 'verifyOtp' | 'register'): string[] {
    const backendMessages = this.extractErrorMessages(err?.error);
    const status = err?.status;
    const normalizedText = backendMessages.join(' ').toLowerCase();

    const hasAny = (terms: string[]) => terms.some((term) => normalizedText.includes(term));

    if (flow === 'sendOtp') {
      if (status === 409 || hasAny(['already registered', 'already exists'])) {
        return ['This mobile number is already registered. Please sign in instead.'];
      }
      if (status === 429 || hasAny(['too many', 'rate limit'])) {
        return ['Too many OTP requests. Please wait and try again.'];
      }
    }

    if (flow === 'verifyOtp') {
      if (status === 400 || status === 401 || hasAny(['invalid otp', 'incorrect otp', 'otp is invalid'])) {
        return ['Invalid OTP. Enter the correct OTP and try again.'];
      }
      if (hasAny(['expired otp', 'otp expired', 'expired'])) {
        return ['OTP has expired. Please request a new OTP.'];
      }
    }

    if (flow === 'register') {
      if (status === 409 || hasAny(['already registered', 'already exists', 'duplicate'])) {
        return ['User already exists with this mobile/email/PAN. Please sign in or use different details.'];
      }
      if (hasAny(['password', 'match'])) {
        return ['Password and confirm password must match.'];
      }
      if (hasAny(['captcha', 'invalid response'])) {
        return ['Captcha verification failed. Please solve captcha again.'];
      }
    }

    if (backendMessages.length > 0) {
      return backendMessages;
    }

    return ['Something went wrong during signup. Please try again.'];
  }
}
