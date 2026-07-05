import { Component, OnInit, inject } from '@angular/core';
import { MaterialModule } from '../../shared/material.module';
import { Router, RouterModule } from '@angular/router';
import { AccountService } from '../../core/services/account.service';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [
    MaterialModule,
    RouterModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  isLoggedIn = false;

  constructor(
    private router: Router, 
    private accountService: AccountService,
    private authService: AuthService,
  ){
    console.log('🎨 HeaderComponent constructor called');
  }

  ngOnInit(): void {
    console.log('🎨 HeaderComponent ngOnInit called');
    console.log('🎨 Initial isLoggedIn:', this.isLoggedIn);
    
    this.accountService.getAuthenticationState().subscribe((user) => {
      console.log('🎨 HeaderComponent received auth state:', user);
      this.isLoggedIn = !!user;
      console.log('🎨 Updated isLoggedIn to:', this.isLoggedIn);
    });
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    Swal.fire({
      html: `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 0 8px;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        ">
          <!-- Animated icon -->
          <div style="
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            box-shadow: 0 8px 28px rgba(220, 38, 38, 0.4);
            animation: pulse-red 1.8s ease-in-out infinite;
          ">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>

          <!-- Title -->
          <div style="
            font-size: 1.5rem;
            font-weight: 800;
            color: #111827;
            margin-bottom: 8px;
            letter-spacing: -0.3px;
          ">Sign Out?</div>

          <!-- Subtitle -->
          <div style="
            font-size: 0.9rem;
            color: #6b7280;
            line-height: 1.6;
            max-width: 270px;
            text-align: center;
          ">
            You'll be securely signed out of your session. Any unsaved changes may be lost.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Sign Out',
      cancelButtonText: 'Stay Logged In',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup:         'logout-swal-popup',
        confirmButton: 'logout-swal-confirm',
        cancelButton:  'logout-swal-cancel',
        actions:       'logout-swal-actions',
      },
      didOpen: () => {
        const styleId = 'logout-swal-styles';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @keyframes pulse-red {
              0%, 100% { box-shadow: 0 8px 28px rgba(220,38,38,0.4); transform: scale(1); }
              50%       { box-shadow: 0 8px 40px rgba(220,38,38,0.65); transform: scale(1.05); }
            }
          `;
          document.head.appendChild(style);
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout().subscribe({
          next: () => {
            this.router.navigate(['/login']);
          },
          error: (error) => {
            console.error('Logout failed:', error);
            alert('Logout failed. Please try again.');
          }
        });
      }
    });
  }

  home(): void {
    this.router.navigate(['/']);
  }
}