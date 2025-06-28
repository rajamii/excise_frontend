import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependency';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { MaterialModule } from '../../../shared/material.module';
import { MatMenuModule } from '@angular/material/menu';
import { Account } from '../../../core/models/accounts';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-licensee-home', // Component selector used in HTML
  imports: [ CommonModule, RouterModule, RouterOutlet, MaterialModule, MatMenuModule], // Modules needed for this component
  templateUrl: './licensee-home.component.html', // Path to the component’s HTML template
  styleUrl: './licensee-home.component.scss' // Path to the component’s SCSS styles
})
export class LicenseeHomeComponent extends BaseComponent{
  account: any; // Raw account object (can be removed if not used)
  user?: Account | null; // Strongly-typed account model
  subscription?: Subscription; // For managing any active subscriptions
  loaded = true; // Flag to track when data has loaded
  userName!: string; // Holds the display name of the user

  constructor(public baseDependancy: BaseDependency, private dialog: MatDialog) {
     // Call parent constructor to initialize services from BaseComponent
     super(baseDependancy);
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

  // Method to toggle the sidebar (sidenav)
  snavToggle(sidenav: any) {
    this.isSidenavOpen = !this.isSidenavOpen;
    sidenav.toggle(); // Toggle open/close of the sidenav
  }

  // Method to handle the "View Profile" button click
  viewProfile(): void {
    console.log('Button Clicked!');

    // Open the UserProfileComponent as a dialog
    const dialogRef = this.dialog.open(UserProfileComponent, {
      width: '500px', // Set dialog width
    });

    // Optional: Log when the dialog is closed
    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog closed', result);
    });
  }

  openLicenseInfo(): void {
    Swal.fire({
      title: 'Apply for License',
      html: `
        <div style="text-align: left; font-size: 14px;">
          <h4>Eligibility Criteria</h4>
          <ul>
            <li>Must be at least 21 years old</li>
            <li>Resident of Sikkim or valid permission</li>
            <li>No criminal record under Excise laws</li>
          </ul>
          <h4>Required Documents</h4>
          <ul>
            <li>Certificate of Identification / Sikkim Subject / RC</li>
            <li>Proof of Age (e.g. Aadhaar)</li>
            <li>Landlord NOC (if rented)</li>
            <li>Trade License</li>
            <li>Photograph of site</li>
          </ul>
          <h4>Fees</h4>
          <p>License Fee: ₹13,500 - 20,000<br>Processing Fee: ₹500</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Start Application',
      cancelButtonText: 'Cancel',
      width: 700,
      padding: '1rem',
      customClass: {
        popup: 'swal-wide'
      }
    }).then(result => {
      if (result.isConfirmed) {
        this.router.navigate(['/licensee/apply-license']);
      }
    });
  }
}
