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
        <div style="font-family:'Inter','Segoe UI',sans-serif;">

          <!-- Red banner top -->
          <div style="
            background: linear-gradient(135deg, #b91c1c 0%, #dc2626 60%, #f87171 100%);
            padding: 36px 32px 48px;
            position: relative;
            overflow: hidden;
            text-align: center;
          ">
            <!-- Decorative circles -->
            <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>
            <div style="position:absolute;bottom:-40px;left:-20px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>

            <!-- Icon -->
            <div style="
              width: 72px;
              height: 72px;
              border-radius: 50%;
              background: rgba(255,255,255,0.18);
              border: 2px solid rgba(255,255,255,0.35);
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 16px;
              animation: float-icon 2.4s ease-in-out infinite;
              position: relative;
              z-index: 1;
            ">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>

            <div style="
              font-size: 1.5rem;
              font-weight: 800;
              color: #fff;
              letter-spacing: -0.3px;
              position: relative;
              z-index: 1;
            ">Sign Out?</div>
          </div>

          <!-- White curved body -->
          <div style="
            background: #fff;
            border-radius: 24px 24px 0 0;
            margin-top: -22px;
            padding: 28px 32px 8px;
            position: relative;
            text-align: center;
          ">
            <p style="
              font-size: 0.92rem;
              color: #71717a;
              line-height: 1.65;
              margin: 0;
            ">
              You're about to be signed out of your account.<br>
              <span style="color:#dc2626;font-weight:600;">Any unsaved changes will be lost.</span>
            </p>
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
            @keyframes float-icon {
              0%, 100% { transform: translateY(0px); }
              50%       { transform: translateY(-6px); }
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