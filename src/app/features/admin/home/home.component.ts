import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependency';
import { Account } from '../../../core/models/accounts';

import { MaterialModule } from '../../../shared/material.module';
import { UserProfileComponent } from './user-profile/user-profile.component';

import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-home',
  standalone: true, // This component is a standalone component (not declared in a module)
  imports: [CommonModule, RouterModule, MaterialModule, MatMenuModule], // Required Angular and custom modules
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent extends BaseComponent implements OnInit {
  // Reference to sidenav element (used for toggling)
  @ViewChild('sidenav', { static: false }) sidenav: any;

  account: any; // Raw account object (can be removed if not used)
  user?: Account | null; // Strongly-typed account model
  subscription?: Subscription; // For managing any active subscriptions
  loaded = false; // Flag to track when data has loaded
  userName!: string; // Holds the display name of the user

  constructor(deps: BaseDependency, private dialog: MatDialog) {
    // Call parent constructor to initialize services from BaseComponent
    super(deps);
  }

  ngOnInit(): void {
    // Subscribe to authentication state from AccountService
    this.accountService.getAuthenticationState().subscribe(acc => {
      if (acc !== null) {
        this.user = acc;

        // Start with first name
        this.userName = this.user.firstName!;

        // Optionally include middle name if needed
        // if (this.user.middleName !== null) {
        //   this.userName = this.userName + ' ' + this.user.middleName;
        // }

        // Append last name if it exists
        if (this.user.lastName !== null) {
          this.userName = this.userName + ' ' + this.user.lastName;
        }
      } else {
        // If user is not authenticated, redirect to login
        this.router.navigate(['/']);
      }

      // Mark component as fully loaded
      this.loaded = true;
    });
  }

  // Flag to track sidenav open/close state
  isSidenavOpen = false;

  // Toggle sidenav open/close
  snavToggle(sidenav: any) {
    this.isSidenavOpen = !this.isSidenavOpen;
    sidenav.toggle();
  }

  // Open user profile dialog
  viewProfile(): void {
    const dialogRef = this.dialog.open(UserProfileComponent, {
      width: '500px', // Set dialog width
    });

    // Optional: handle dialog close event
    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog closed', result);
    });
  }
}
