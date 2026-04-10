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
    <div class="auth-container">
      <h2>Create New Password</h2>
      
      <form *ngIf="!invalidLink" [formGroup]="resetForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="new_password">New Password</label>
          <input 
            type="password" 
            id="new_password" 
            formControlName="new_password" 
            placeholder="Minimum 8 characters"
            [ngClass]="{'is-invalid': resetForm.get('new_password')?.invalid && resetForm.get('new_password')?.touched}"
          >
          <div class="error-msg" *ngIf="resetForm.get('new_password')?.invalid && resetForm.get('new_password')?.touched">
            Password must be at least 8 characters long.
          </div>
        </div>

        <button type="submit" [disabled]="resetForm.invalid || isLoading">
          {{ isLoading ? 'Resetting...' : 'Save New Password' }}
        </button>
      </form>

      <div class="alert" [ngClass]="isError ? 'alert-error' : 'alert-success'" *ngIf="message">
        {{ message }}
      </div>
      
      <div class="back-link" *ngIf="invalidLink || (!isError && message)">
        <a routerLink="/login">Go to Login</a>
      </div>
    </div>
  `,
  styles: [`
    .auth-container { max-width: 400px; margin: 2rem auto; padding: 2rem; border: 1px solid #ddd; border-radius: 8px; }
    .form-group { margin-bottom: 1rem; }
    input { width: 100%; padding: 0.5rem; margin-top: 0.5rem; box-sizing: border-box; }
    .is-invalid { border-color: red; }
    .error-msg { color: red; font-size: 0.8rem; margin-top: 0.25rem; }
    button { width: 100%; padding: 0.75rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;}
    button:disabled { background: #ccc; cursor: not-allowed; }
    .alert { padding: 1rem; margin-top: 1rem; border-radius: 4px; }
    .alert-success { background-color: #d4edda; color: #155724; }
    .alert-error { background-color: #f8d7da; color: #721c24; }
    .back-link { margin-top: 1rem; text-align: center; display: block; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  uid: string = '';
  token: string = '';
  
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
    // Extract the UID and Token from the route parameters
    this.uid = this.route.snapshot.paramMap.get('uid') || '';
    this.token = this.route.snapshot.paramMap.get('token') || '';

    // If either is missing, the user navigated here without a valid email link
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
          
          // Optional: Auto-redirect to login after 3 seconds
          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: (err) => {
          this.isLoading = false;
          this.isError = true;
          // Django usually returns specific errors for expired tokens
          this.message = err.error?.error || 'Failed to reset password. The link may have expired.';
        }
      });
    }
  }
}