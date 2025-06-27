import { Component, OnInit, inject } from '@angular/core';
import { MaterialModule } from '../../shared/material.module';
import { Router, RouterModule } from '@angular/router';
import { NavbarModule, NavModule } from '@coreui/angular';
import { AccountService } from '../../core/services/account.service';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [
    MaterialModule,
    RouterModule,
    NavbarModule,
    NavModule
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
  ){}

  ngOnInit(): void {
    this.accountService.getAuthenticationState().subscribe((user) => {
      this.isLoggedIn = !!user;
    });
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, log me out!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout().subscribe({
          next: () => {
            console.log('Logout successful');
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
