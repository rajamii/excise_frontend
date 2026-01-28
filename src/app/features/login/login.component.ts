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
import { District } from '../../core/models/district.model';
import { Subdivision } from '../../core/models/subdivision.model';
import { MasterService } from '../../core/services/master.service';

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
          });

          this.router.navigate([], {
            queryParams: { sessionExpired: null },
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
    if (this.registrationForm.invalid) { console.log('Invalid registration form'); return }
    const phoneNumber = this.registrationForm.get('phoneNumber')?.value;
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
        this.registrationErrorMessages = this.extractErrorMessages(err.error);
      }
    });
  }

  onRegistrationOtpChange(otp: string) {
    this.registrationOtpControl.setValue(otp);
  }

  verifyRegistrationOtp() {
    const otp = this.registrationOtpControl.value;
    const phoneNumber = this.registrationForm.get('phoneNumber')?.value;

    if (!otp || otp.length !== 4 || !this.registrationOtpId) return;

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
        this.registrationErrorMessages = this.extractErrorMessages(err.error || { detail: ['Invalid OTP'] });
      }
    });
  }

  onRegister() {
    if (this.registrationForm.invalid || !this.otpVerified) return;

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

          // Auto redirect to licensee dashboard
          setTimeout(() => {
            this.router.navigate(['/licensee/dashboard']);
          }, 2000);
        }
      },
      error: (err) => {
        this.isRegistering = false;
        this.registrationError = true;
        this.registrationErrorMessages = this.extractErrorMessages(err.error);
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
    } else if (role === 'officer-incharge') {
      this.router.navigate(['/dev-officer-in-charge']);
    } else if (role === 'it-cell') {
      this.router.navigate(['/dev-itcell']);
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