// Importing core Angular and Material dependencies
import { Component } from '@angular/core';
import { AccountService } from '../../../../core/services/account.service';
import { MaterialModule } from '../../../../shared/material.module';
import { MatDialogRef } from '@angular/material/dialog';
import { UserService } from '../../../../core/services/user.service';

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
  resolvedRoleName = '';

  // Injecting required services:
  // - MatDialogRef to control the dialog box
  // - AccountService to fetch user authentication details
  constructor(
    public dialogRef: MatDialogRef<UserProfileComponent>,
    private accountService: AccountService,
    private userService: UserService
  ) {}

  // Angular lifecycle hook, runs after component initializes
  ngOnInit(): void {
    // Subscribing to the authentication state to get user info
    this.accountService.getAuthenticationState().subscribe(acc => {
      if (acc !== null) {
        this.user = acc; // Assign user data if account is authenticated
        this.resolveRoleName();
      }
      this.loaded = true; // Mark the loading complete whether user is null or not
    });
  }

  private resolveRoleName(): void {
    const directRoleName = this.user?.role?.name || this.user?.role?.displayName;
    if (directRoleName) {
      this.resolvedRoleName = directRoleName;
      return;
    }

    const roleId = this.user?.role?.id;
    if (!roleId) {
      this.resolvedRoleName = '-';
      return;
    }

    this.userService.getRoleById(roleId).subscribe({
      next: (role) => {
        this.resolvedRoleName = role?.name || '-';
      },
      error: () => {
        this.resolvedRoleName = '-';
      }
    });
  }

  // Method to close the user profile dialog
  closeDialog(): void {
    this.dialogRef.close();
  }
}
