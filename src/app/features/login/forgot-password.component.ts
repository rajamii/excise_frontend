import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service'; // Adjust path

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <h2>Forgot Password</h2>
      <p>Enter your email address and we'll send you a link to reset your password.</p>

      <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="email">Email Address</label>
          <input 
            type="email" 
            id="email" 
            formControlName="email" 
            placeholder="Enter your email"
            [ngClass]="{'is-invalid': forgotForm.get('email')?.invalid && forgotForm.get('email')?.touched}"
          >
          <div class="error-msg" *ngIf="forgotForm.get('email')?.invalid && forgotForm.get('email')?.touched">
            Please enter a valid email address.
          </div>
        </div>

        <button type="submit" [disabled]="forgotForm.invalid || isLoading">
          {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
        </button>
      </form>

      <div class="alert" [ngClass]="isError ? 'alert-error' : 'alert-success'" *ngIf="message">
        {{ message }}
      </div>

      <div class="back-link">
        <a routerLink="/login">Back to Login</a>
      </div>
    </div>
  `,
  styles: [`
    .auth-container { max-width: 400px; margin: 2rem auto; padding: 2rem; border: 1px solid #ddd; border-radius: 8px; }
    .form-group { margin-bottom: 1rem; }
    input { width: 100%; padding: 0.5rem; margin-top: 0.5rem; box-sizing: border-box; }
    .is-invalid { border-color: red; }
    .error-msg { color: red; font-size: 0.8rem; margin-top: 0.25rem; }
    button { width: 100%; padding: 0.75rem; background: #0056b3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;}
    button:disabled { background: #ccc; cursor: not-allowed; }
    .alert { padding: 1rem; margin-top: 1rem; border-radius: 4px; }
    .alert-success { background-color: #d4edda; color: #155724; }
    .alert-error { background-color: #f8d7da; color: #721c24; }
    .back-link { margin-top: 1rem; text-align: center; display: block; }
  `]
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  isLoading = false;
  message = '';
  isError = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotForm.valid) {
      this.isLoading = true;
      this.message = '';
      this.isError = false;

      const email = this.forgotForm.value.email;

      this.authService.requestPasswordReset(email).subscribe({
        next: (res) => {
          this.isLoading = false;
          // Show the generic success message to prevent email enumeration
          this.message = res.message || 'If an account exists, a reset link has been sent.';
          this.isError = false;
          this.forgotForm.reset();
        },
        error: (err) => {
          this.isLoading = false;
          this.isError = true;
          this.message = 'An error occurred while attempting to send the email. Please try again.';
        }
      });
    }
  }
}