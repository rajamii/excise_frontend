// Importing core Angular and Material dependencies
import { Component } from '@angular/core';
import { AccountService } from '../../../../core/services/account.service';
import { MaterialModule } from '../../../../shared/material.module';
import { MatDialogRef } from '@angular/material/dialog';

// Component metadata definition
@Component({
  selector: 'app-user-profile', // Selector used in templates to include this component
  imports: [MaterialModule],    // Importing shared material components for UI
  templateUrl: './user-profile.component.html', // HTML template for this component
  styleUrl: './user-profile.component.scss'     // SCSS stylesheet for styling
})
export class UserProfileComponent {
  user: any;        // Stores the currently authenticated user's data
  loaded = false;   // Flag to track if user data is loaded

  // Injecting required services:
  // - MatDialogRef to control the dialog box
  // - AccountService to fetch user authentication details
  constructor(
    public dialogRef: MatDialogRef<UserProfileComponent>,
    private accountService: AccountService
  ) {}

  // Angular lifecycle hook, runs after component initializes
  ngOnInit(): void {
    // Subscribing to the authentication state to get user info
    this.accountService.getAuthenticationState().subscribe(acc => {
      if (acc !== null) {
        this.user = acc; // Assign user data if account is authenticated
      }
      this.loaded = true; // Mark the loading complete whether user is null or not
    });
  }

  // Method to close the user profile dialog
  closeDialog(): void {
    this.dialogRef.close();
  }
}
