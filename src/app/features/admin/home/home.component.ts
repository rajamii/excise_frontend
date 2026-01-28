import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependency';
import { Account } from '../../../core/models/account.model';
import { MaterialModule } from '../../../shared/material.module';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MaterialModule, MatMenuModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent extends BaseComponent implements OnInit, OnDestroy {
  // Reference to sidenav element (used for toggling)
  @ViewChild('sidenav', { static: false }) sidenav: any;

  account: any; // Raw account object (can be removed if not used)
  user?: Account | null; // Strongly-typed account model
  subscription?: Subscription; // For managing any active subscriptions
  loaded = false; // Flag to track when data has loaded
  userName: string = ''; // Holds the display name of the user

  constructor(deps: BaseDependency, private dialog: MatDialog) {
    // Call parent constructor to initialize services from BaseComponent
    super(deps);
  }

  ngOnInit(): void {
    // Subscribe to authentication state from AccountService
    this.subscription = this.accountService.getAuthenticationState().subscribe(acc => {
      if (acc !== null) {
        this.user = acc;
        this.buildUserName();
      } else {
        // If user is not authenticated, redirect to login
        this.router.navigate(['/']);
      }

      // Mark component as fully loaded
      this.loaded = true;
    });
  }

  // Build user's display name
  private buildUserName(): void {
    if (!this.user) {
      this.userName = '';
      return;
    }

    // Start with first name
    this.userName = this.user.firstName || '';

    // Optionally include middle name if needed
    // if (this.user.middleName) {
    //   this.userName = this.userName + ' ' + this.user.middleName;
    // }

    // Append last name if it exists
    if (this.user.lastName) {
      this.userName = this.userName + ' ' + this.user.lastName;
    }

    // Trim any extra whitespace
    this.userName = this.userName.trim();
  }

  // Flag to track sidenav open/close state
  isSidenavOpen = false;

  // Toggle sidenav open/close
  snavToggle(sidenav: any): void {
    if (sidenav) {
      this.isSidenavOpen = !this.isSidenavOpen;
      sidenav.toggle();
    }
  }

  // Open user profile dialog
  viewProfile(): void {
    if (!this.user) {
      console.warn('Cannot open profile: user not loaded');
      return;
    }

    const dialogRef = this.dialog.open(UserProfileComponent, {
      width: '500px',
      data: { user: this.user } // Pass user data to dialog
    });

    // Optional: handle dialog close event
    dialogRef.afterClosed().subscribe(result => {
      // Refresh user data if needed
      if (result === true) {
        // Reload user data
        this.accountService.identity(true);
      }
    });
  }

  // Cleanup on component destroy
  override ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}