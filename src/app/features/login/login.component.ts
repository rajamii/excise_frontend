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
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MaterialModule, CaptchaComponent, NgOtpInputModule, MatProgressSpinnerModule, RouterLink, CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent extends BaseComponent {
  private readonly blockedUsersStorageKey = 'frontend_blocked_users';
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
  otpShakeActive = false;
  regOtpShakeActive = false;

  // Username check state (password flow)
  usernameChecked = false;
  isCheckingUsername = false;
  usernameNotFound = false;

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
            title: 'Session timed out',
            html: `
              <div class="inactive-logout-content">
                <div class="inactive-logout-illustration" aria-hidden="true">
                  <svg class="inactive-logout-icon" viewBox="0 0 96 96" role="presentation" focusable="false">
                    <defs>
                      <linearGradient id="inactiveAmber" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#ffcf5e" />
                        <stop offset="1" stop-color="#f59e0b" />
                      </linearGradient>
                      <linearGradient id="inactiveGlassStroke" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#1f2e53" />
                        <stop offset="1" stop-color="#142243" />
                      </linearGradient>
                      <linearGradient id="inactiveGlassFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#f4f8ff" />
                        <stop offset="1" stop-color="#d7e5ff" />
                      </linearGradient>
                      <linearGradient id="inactiveFoam" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stop-color="#ffffff" />
                        <stop offset="1" stop-color="#f0f4ff" />
                      </linearGradient>
                      <clipPath id="inactiveBeerClip">
                        <path d="M30 22h28l-4 56H34l-4-56z" />
                      </clipPath>
                    </defs>

                    <!-- Beer glass (broken + spill) -->
                    <g class="inactive-logout-glass" transform="translate(0,0)">
                      <!-- Ground shadow (stays on ground while glass falls) -->
                      <ellipse class="inactive-logout-shadow" cx="46" cy="90" rx="22" ry="6" fill="#0b1b3a" opacity="0.12" />

                      <!-- Glass body -->
                      <path
                        d="M28 20h32l-4.6 60.5c-0.2 2.8-2.5 5-5.3 5H37.9c-2.8 0-5.1-2.2-5.3-5L28 20z"
                        fill="url(#inactiveGlassFill)"
                        opacity="0.9"
                      />
                      <path
                        d="M28 20h32l-4.6 60.5c-0.2 2.8-2.5 5-5.3 5H37.9c-2.8 0-5.1-2.2-5.3-5L28 20z"
                        fill="none"
                        stroke="url(#inactiveGlassStroke)"
                        stroke-width="2.6"
                        stroke-linejoin="round"
                        opacity="0.92"
                      />

                      <!-- Handle -->
                      <path
                        d="M60 34c9 0 14 7 14 14s-5 14-14 14"
                        fill="none"
                        stroke="url(#inactiveGlassStroke)"
                        stroke-width="3.6"
                        stroke-linecap="round"
                        opacity="0.9"
                      />
                      <path
                        d="M60 40c5 0 8 4 8 8s-3 8-8 8"
                        fill="none"
                        stroke="url(#inactiveGlassFill)"
                        stroke-width="5.2"
                        stroke-linecap="round"
                        opacity="0.88"
                      />

                      <!-- Beer inside (clipped) -->
                      <g clip-path="url(#inactiveBeerClip)">
                        <path
                          class="inactive-logout-beer"
                          d="M28 48c6-4 11 2 16-1s11-8 16-3v44H28V48z"
                          fill="url(#inactiveAmber)"
                          opacity="0.96"
                        />
                      </g>

                      <!-- Crack + broken rim -->
                      <path
                        class="inactive-logout-crack"
                        d="M46 30l-6 10 8 7-9 10 10 10-4 10"
                        fill="none"
                        stroke="#1f2e53"
                        stroke-width="3.2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        opacity="0.72"
                      />
                      <path
                        d="M46 18l7 2-6 6-8-2z"
                        fill="url(#inactiveGlassFill)"
                        stroke="url(#inactiveGlassStroke)"
                        stroke-width="2"
                        opacity="0.9"
                      />

                      <!-- Spill drops -->
                      <g class="inactive-logout-spill" opacity="0.98">
                        <path class="inactive-logout-drop inactive-logout-drop-1" d="M52 56c4 6 2 10-2 12-4-2-6-6-2-12 1-2 2-3 2-3s1 1 2 3z" fill="url(#inactiveAmber)" />
                        <path class="inactive-logout-drop inactive-logout-drop-2" d="M58 60c3 5 1 9-2 10-3-2-5-5-2-10 1-2 2-3 2-3s1 1 2 3z" fill="url(#inactiveAmber)" opacity="0.92" />
                        <path class="inactive-logout-drop inactive-logout-drop-3" d="M48 62c3 5 1 9-2 10-3-2-5-5-2-10 1-2 2-3 2-3s1 1 2 3z" fill="url(#inactiveAmber)" opacity="0.88" />
                      </g>

                      <!-- Shards -->
                      <path class="inactive-logout-shard inactive-logout-shard-1" d="M72 26l10 4-8 10-10-4z" fill="url(#inactiveGlassFill)" stroke="url(#inactiveGlassStroke)" stroke-width="1.4" opacity="0.85" />
                      <path class="inactive-logout-shard inactive-logout-shard-2" d="M18 48l10-3 3 10-10 3z" fill="url(#inactiveGlassFill)" stroke="url(#inactiveGlassStroke)" stroke-width="1.4" opacity="0.82" />

                      <!-- Impact marks near ground -->
                      <g class="inactive-logout-impact" opacity="0">
                        <path d="M30 86l-6 3" stroke="#1f2e53" stroke-width="2.2" stroke-linecap="round" opacity="0.7" />
                        <path d="M62 86l6 3" stroke="#1f2e53" stroke-width="2.2" stroke-linecap="round" opacity="0.7" />
                        <path d="M46 84v6" stroke="#1f2e53" stroke-width="2.2" stroke-linecap="round" opacity="0.55" />
                      </g>
                    </g>
                  </svg>
                </div>
                <p class="inactive-logout-message">
                  Your session ended due to inactivity. Please sign in again to continue.
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
    this.usernameChecked = false;
    this.isCheckingUsername = false;
    this.usernameNotFound = false;
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
    targetForm.get('phoneNumber')?.setValue(sanitizedValue, { emitEvent: true });
    targetForm.get('phoneNumber')?.markAsDirty();
    targetForm.get('phoneNumber')?.updateValueAndValidity();

    // Clear stale login errors as the user types a new number
    if (form === 'login') {
      this.clearLoginErrors();
    }
  }

  onOtpPhoneEnter(event: Event): void {
    event.preventDefault();
    if (!this.isPasswordMode && !this.otpSent) {
      this.sendOtp();
    }
  }

  private getBlockedUsers(): Array<{ id?: number; username?: string; phoneNumber?: string; email?: string }> {
    try {
      const raw = localStorage.getItem(this.blockedUsersStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private isLocallyBlockedByUsername(username: string): boolean {
    const normalized = String(username || '').trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return this.getBlockedUsers().some(entry => String(entry?.username || '').trim().toLowerCase() === normalized);
  }

  private isLocallyBlockedByPhone(phoneNumber: string): boolean {
    const normalized = String(phoneNumber || '').replace(/\D/g, '').slice(0, 10);
    if (!normalized) {
      return false;
    }
    return this.getBlockedUsers().some(entry => String(entry?.phoneNumber || '').replace(/\D/g, '').slice(0, 10) === normalized);
  }

  private isLocallyBlockedUser(user: any): boolean {
    const username = String(user?.username || user?.login || '').trim().toLowerCase();
    const phone = String(user?.phoneNumber || user?.phone_number || '').replace(/\D/g, '').slice(0, 10);
    return this.getBlockedUsers().some(entry => {
      const blockedUsername = String(entry?.username || '').trim().toLowerCase();
      const blockedPhone = String(entry?.phoneNumber || '').replace(/\D/g, '').slice(0, 10);
      return (!!username && blockedUsername === username) || (!!phone && blockedPhone === phone);
    });
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

  checkUsername(): void {
    const username = String(this.loginForm.value.username || '').trim();
    if (!username) {
      this.usernameNotFound = true;
      return;
    }
    if (this.isLocallyBlockedByUsername(username)) {
      this.usernameNotFound = true;
      this.usernameChecked = false;
      return;
    }
    this.isCheckingUsername = true;
    this.usernameNotFound = false;
    this.clearLoginErrors();

    this.authService.checkUserExists(username).subscribe({
      next: (res: any) => {
        this.isCheckingUsername = false;
        if (res?.active === false) {
          // Account exists but inactive
          this.usernameChecked = false;
          this.usernameNotFound = false;
          this.setLoginErrors(['Your account is inactive. Please contact the administrator.']);
        } else {
          // User exists and is active — show password field
          this.usernameChecked = true;
          this.usernameNotFound = false;
        }
      },
      error: (err) => {
        this.isCheckingUsername = false;
        if (err?.status === 404) {
          this.usernameNotFound = true;
          this.usernameChecked = false;
        } else if (err?.status === 403) {
          this.usernameNotFound = false;
          this.usernameChecked = false;
          this.setLoginErrors(['Your account is inactive. Please contact the administrator.']);
        } else {
          this.usernameNotFound = false;
          this.usernameChecked = false;
          this.setLoginErrors(['Could not verify User ID. Please try again.']);
        }
      }
    });
  }

  resetUsername(): void {
    this.usernameChecked = false;
    this.usernameNotFound = false;
    this.isCheckingUsername = false;
    this.loginForm.patchValue({ username: '', password: '' });
    this.clearLoginErrors();
  }

  sendOtp(): void {
    if (this.isSendingOtp) {
      return;
    }

    const phoneControl = this.loginForm.controls['phoneNumber'];
    const sanitizedPhoneNumber = String(phoneControl.value || '').replace(/\D/g, '').slice(0, 10);

    // Only block if obviously invalid (less than 10 digits or doesn't start with 6-9)
    if (sanitizedPhoneNumber.length < 10 || !/^[6-9]/.test(sanitizedPhoneNumber)) {
      this.loginError = true;
      this.loginErrorMessages = ['Enter a valid mobile number: 10 digits, starting with 6, 7, 8, or 9.'];
      return;
    }

    if (this.isLocallyBlockedByPhone(sanitizedPhoneNumber)) {
      this.loginError = true;
      this.loginErrorMessages = ['This user has been deleted and is not allowed to log in from this system.'];
      return;
    }

    // Valid format — clear errors and call backend
    this.isSendingOtp = true;
    this.clearLoginErrors();
    const phoneNumber = sanitizedPhoneNumber;
    const formData = FormDataUtil.buildFormData({ phoneNumber });

    this.authService.sendOtp(formData).subscribe({
      next: (response) => {
        this.otpSent = true;
        this.otpIndex = response.otpId ?? response.otp_id ?? null;
        this.loginOtpPreview = response.otp ? String(response.otp) : null;
        this.isSendingOtp = false;
      },
      error: (err) => {
        console.error('Error sending OTP:', err);
        const messages = this.mapLoginErrors(err, 'sendOtp');
        // Always inline for OTP flow — no Swal popup
        this.loginError = true;
        this.loginErrorMessages = messages;
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
        const msgs = this.mapRegistrationErrors(err, 'verifyOtp');
        this.registrationErrorMessages = msgs;
        this.registrationOtpControl.setValue('');
        // Shake OTP input and show popup for wrong OTP
        this.regOtpShakeActive = true;
        setTimeout(() => { this.regOtpShakeActive = false; }, 700);
        Swal.fire({
          icon: 'error',
          title: 'Wrong OTP',
          text: msgs.join('\n'),
          confirmButtonText: 'Retry',
          allowOutsideClick: true,
          allowEscapeKey: true
        });
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

    if (this.isLocallyBlockedByUsername(String(this.loginForm.value.username || ''))) {
      this.setLoginErrors(['This user has been deleted and is not allowed to log in from this system.']);
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
      if (key === 'detail' || key === 'message' || key === 'error' || key === 'non_field_errors') {
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

    this.authService.verifyOtp(requestData, { loadProfile: false }).subscribe({
      next: (res: any) => {
        this.clearLoginErrors();
        this.handleAuthResponse(res);
      },
      error: (err) => {
        console.error('OTP verification error:', err);
        const msgs = this.mapLoginErrors(err, 'verifyOtp');
        this.setLoginErrors(msgs);
        this.otpAutoSubmitted = false;
        this.otpControl.setValue('');
        // Shake the OTP input to give visual feedback
        this.otpShakeActive = true;
        setTimeout(() => { this.otpShakeActive = false; }, 700);
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

      const currentUser = this.accountService.getUserProfileSync();
      if (currentUser) {
        const previousUrl = this.stateStorgeService.getUrl();
        const safePreviousUrl = typeof previousUrl === 'string' ? previousUrl.trim() : '';
        if (safePreviousUrl && safePreviousUrl !== '/login' && safePreviousUrl.startsWith('/dashboard')) {
          this.stateStorgeService.clearUrl();
          this.router.navigateByUrl(safePreviousUrl);
          return;
        }
        if (safePreviousUrl) {
          // Prevent cross-dashboard redirects (e.g. officer dashboard URL from a prior session)
          this.stateStorgeService.clearUrl();
        }
        this.redirectBasedOnRole(currentUser.role?.id);
        return;
      }

      this.accountService.identity().subscribe({
        next: (user) => {
          if (user) {
            if (this.isLocallyBlockedUser(user)) {
              this.accountService.clearAppData();
              this.setLoginErrors(['This user has been deleted and is not allowed to log in from this system.']);
              return;
            }
            const previousUrl = this.stateStorgeService.getUrl();
            const safePreviousUrl = typeof previousUrl === 'string' ? previousUrl.trim() : '';
            if (safePreviousUrl && safePreviousUrl !== '/login' && safePreviousUrl.startsWith('/dashboard')) {
              this.stateStorgeService.clearUrl();
              this.router.navigateByUrl(safePreviousUrl);
              return;
            }
            if (safePreviousUrl) {
              this.stateStorgeService.clearUrl();
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
    const text = messages.join('\n').toLowerCase();
    // Show inline only for "not registered" — no popup needed, message is clear
    if (text.includes('not registered') || text.includes('sign up first')) {
      return;
    }
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
      if (status === 403 || hasAny(['inactive', 'contact administrator'])) {
        return ['Your account is inactive. Contact administrator for login.'];
      }
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
      if (status === 403 || hasAny(['inactive', 'contact administrator'])) {
        return ['Your account is inactive. Contact administrator for login.'];
      }
      if (status === 404 || hasAny(['user not found', 'not registered', 'does not exist', 'no user', 'not found'])) {
        return ['This mobile number is not registered. Please sign up first.'];
      }
      if (hasAny(['invalid phone', 'invalid mobile', 'phone number', 'mobile number', 'format'])) {
        return ['Enter a valid mobile number: 10 digits, starting with 6, 7, 8, or 9.'];
      }
      if (status === 429 || hasAny(['too many', 'rate limit'])) {
        return ['Too many OTP requests. Please wait and try again.'];
      }
    }

    if (flow === 'verifyOtp') {
      if (status === 403 || hasAny(['inactive', 'contact administrator'])) {
        return ['Your account is inactive. Contact administrator for login.'];
      }
      if (hasAny(['expired otp', 'otp expired', 'expired'])) {
        return ['OTP has expired. Please request a new OTP.'];
      }
      if (status === 401 || status === 400 || hasAny(['invalid otp', 'otp is invalid', 'incorrect otp', 'wrong otp', 'does not match', 'mismatch', 'invalid'])) {
        return ['Wrong OTP entered or OTP doesn\'t match. Please retry.'];
      }
      if (status === 404 || hasAny(['not registered', 'user not found'])) {
        return ['This mobile number is not registered. Please sign up first.'];
      }
      return ['Wrong OTP entered or OTP doesn\'t match. Please retry.'];
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
      if (hasAny(['expired otp', 'otp expired', 'expired'])) {
        return ['OTP has expired. Please request a new OTP.'];
      }
      if (status === 400 || status === 401 || hasAny(['invalid otp', 'incorrect otp', 'otp is invalid', 'wrong otp', 'does not match', 'mismatch', 'invalid'])) {
        return ['Wrong OTP entered or OTP doesn\'t match. Please retry.'];
      }
      return ['Wrong OTP entered or OTP doesn\'t match. Please retry.'];
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
