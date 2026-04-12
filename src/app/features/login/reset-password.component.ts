import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="reset-password-page">
      <div class="reset-password-card">
        <!-- Icon/Logo Section -->
        <div class="icon-section">
          <div class="icon-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5.5 8h5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-5a.5.5 0 0 1 .5-.5z"/>
            </svg>
          </div>
        </div>

        <!-- Header -->
        <div class="header-section">
          <h1>Create New Password</h1>
          <p class="subtitle">Your new password must be different from previously used passwords.</p>
        </div>

        <!-- Alert Messages -->
        @if (message) {
          <div class="alert" [class.alert-success]="!isError" [class.alert-error]="isError">
            <svg *ngIf="!isError" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
            </svg>
            <svg *ngIf="isError" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
            </svg>
            <span>{{ message }}</span>
          </div>
        }

        <!-- Form -->
        @if (!invalidLink) {
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="new_password">New Password</label>
              <div class="input-wrapper">
                <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                </svg>
                <input 
                  [type]="showPassword ? 'text' : 'password'"
                  id="new_password" 
                  formControlName="new_password" 
                  placeholder="Minimum 8 characters"
                  [class.is-invalid]="resetForm.get('new_password')?.invalid && resetForm.get('new_password')?.touched"
                >
                <button type="button" class="toggle-password" (click)="showPassword = !showPassword">
                  <svg *ngIf="!showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                  </svg>
                  <svg *ngIf="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                    <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                  </svg>
                </button>
              </div>
              @if (resetForm.get('new_password')?.invalid && resetForm.get('new_password')?.touched) {
                <div class="error-msg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                  </svg>
                  Password must be at least 8 characters long
                </div>
              }
            </div>

            <!-- Password Requirements -->
            <div class="password-requirements">
              <p class="requirements-title">Password must contain:</p>
              <ul>
                <li [class.valid]="resetForm.get('new_password')?.value?.length >= 8">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                  At least 8 characters
                </li>
              </ul>
            </div>

            <button type="submit" class="submit-btn" [disabled]="resetForm.invalid || isLoading">
              @if (isLoading) {
                <span class="spinner"></span>
                <span>Resetting...</span>
              } @else {
                <span>Save New Password</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                </svg>
              }
            </button>
          </form>
        }

        <!-- Back to Login -->
        @if (invalidLink || (!isError && message)) {
          <div class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
            </svg>
            <a routerLink="/login">Go to Login</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .reset-password-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #EDF7FE;
      padding: 2rem 1rem;
    }

    .reset-password-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 3rem 2.5rem;
      max-width: 480px;
      width: 100%;
      animation: slideUp 0.4s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .icon-section {
      display: flex;
      justify-content: center;
      margin-bottom: 1.5rem;
    }

    .icon-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
    }

    .header-section {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header-section h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 0.5rem 0;
    }

    .subtitle {
      color: #718096;
      font-size: 0.9rem;
      margin: 0;
      line-height: 1.5;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .alert svg {
      flex-shrink: 0;
    }

    .alert-success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .alert-error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .input-wrapper {
      position: relative;
    }

    .input-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #a0aec0;
      pointer-events: none;
    }

    .toggle-password {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #a0aec0;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      transition: color 0.2s ease;
    }

    .toggle-password:hover {
      color: #667eea;
    }

    input {
      width: 100%;
      padding: 0.875rem 3rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      box-sizing: border-box;
      font-family: 'Poppins', sans-serif;
    }

    input:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }

    input.is-invalid {
      border-color: #fc8181;
    }

    input.is-invalid:focus {
      box-shadow: 0 0 0 3px rgba(252, 129, 129, 0.1);
    }

    .error-msg {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: #e53e3e;
      font-size: 0.8rem;
      margin-top: 0.5rem;
    }

    .error-msg svg {
      flex-shrink: 0;
    }

    .password-requirements {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .requirements-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #4a5568;
      margin: 0 0 0.5rem 0;
    }

    .password-requirements ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .password-requirements li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #718096;
      padding: 0.25rem 0;
    }

    .password-requirements li svg {
      color: #cbd5e0;
      flex-shrink: 0;
    }

    .password-requirements li.valid {
      color: #10b981;
    }

    .password-requirements li.valid svg {
      color: #10b981;
    }

    .submit-btn {
      width: 100%;
      padding: 0.875rem 1.5rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-family: 'Poppins', sans-serif;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
    }

    .submit-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .submit-btn:disabled {
      background: #cbd5e0;
      cursor: not-allowed;
      transform: none;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .back-link {
      margin-top: 1.5rem;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .back-link svg {
      color: #10b981;
    }

    .back-link a {
      color: #10b981;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s ease;
    }

    .back-link a:hover {
      color: #059669;
      text-decoration: underline;
    }

    @media (max-width: 480px) {
      .reset-password-card {
        padding: 2rem 1.5rem;
      }

      .header-section h1 {
        font-size: 1.5rem;
      }

      .icon-circle {
        width: 70px;
        height: 70px;
      }

      .icon-circle svg {
        width: 40px;
        height: 40px;
      }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  uid: string = '';
  token: string = '';
  showPassword = false;

  isLoading = false;
  message = '';
  isError = false;
  invalidLink = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetForm = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
    this.uid = this.route.snapshot.paramMap.get('uid') || '';
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.uid || !this.token) {
      this.invalidLink = true;
      this.isError = true;
      this.message = 'Invalid or missing password reset link.';
    }
  }

  onSubmit(): void {
    if (this.resetForm.valid && !this.invalidLink) {
      this.isLoading = true;
      this.message = '';

      const payload = {
        uidb64: this.uid,
        token: this.token,
        new_password: this.resetForm.value.new_password
      };

      this.authService.confirmPasswordReset(payload).subscribe({
        next: () => {
          this.isLoading = false;
          this.isError = false;
          this.message = 'Password successfully reset! You can now log in.';
          this.resetForm.reset();

          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: (err) => {
          this.isLoading = false;
          this.isError = true;
          if (err.error?.error) {
            this.message = err.error.error;
          } else if (err.error?.new_password) {
            this.message = err.error.new_password[0];
          } else if (err.error?.non_field_errors) {
            this.message = err.error.non_field_errors[0];
          } else if (err.error?.detail) {
            this.message = err.error.detail;
          } else {
            this.message = 'Failed to reset password. Please check your password strength or request a new link.';
          }

          console.error('Password reset failed:', err.error);
        }
      });
    }
  }
}