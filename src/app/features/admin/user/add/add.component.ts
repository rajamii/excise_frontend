import { Component, OnInit } from '@angular/core';
import { Account } from '../../../../core/models/accounts';
import { District } from '../../../../core/models/district.model';
import { Subdivision } from '../../../../core/models/subdivision.model';
import { Role } from '../../../../core/models/role';
import { BaseComponent } from '../../../../base/base.components';
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { MaterialModule } from '../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add',
  imports: [MaterialModule],
  templateUrl: './add.component.html',
  styleUrl: './add.component.scss'
})
export class AddComponent extends BaseComponent implements OnInit {
  user: Account = new Account(); // User object to hold user data
  districts: District[] = []; // Array to hold all districts
  subdivisons: Subdivision[] = []; // Array to hold all subdivisions
  filteredSubdivisions: Subdivision[] = []; // Array to hold filtered subdivisions based on district
  roles: Role[] = [];

  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<AddComponent>
  ) {
    super(deps); // Call parent constructor
  }

  ngOnInit(): void {
    this.user.isActive = true; // Set default active status for user
    this.loadDistricts(); // Load the list of districts
    this.loadSubdivisions(); // Load all subdivisions initially
    this.loadRoles(); // Load all roles initially
  }

  // Method to load all districts from the backend
  loadDistricts(): void {
    this.masterService.getDistrict().subscribe((data: District[]) => {
      this.districts = data; // Store the fetched districts
    }, error => {
      this.toastrService.error('Failed to load districts.'); // Show error if districts loading fails
    });
  }

  // Method to load all subdivisions from the backend
  loadSubdivisions(): void {
    this.masterService.getSubdivision().subscribe(
      (data: Subdivision[]) => {
        this.subdivisons = data; // Store the fetched subdivisions
      },
      (error) => {
        this.toastrService.error('Failed to load subdivisions.'); // Show error if subdivisions loading fails
      }
    );
  }

  //Method to get the role label based on the role key
  loadRoles(): void {
    this.userService.getRoles().subscribe(
      (data: Role[]) => {
        this.roles = data; // Store the fetched roles
      },
      (error) => {
        this.toastrService.error('Failed to load roles.'); // Show error if roles loading fails
      }
    );
  }

  // Method to filter subdivisions based on the selected district
  onDistrictChange(id: number): void {
    this.filteredSubdivisions = this.subdivisons.filter(subDiv => subDiv.districtCode === id); // Filter subdivisions based on district
  }

  // Method to handle form submission
  onSave(): void {
    // Check if password and confirm password match
    if (this.user.password !== this.user.confirmPassword) {
      this.toastrService.error('Passwords do not match!'); // Show error if passwords do not match
      return;
    }

    // Show confirmation popup before saving the user data
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to add this user?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const { username, createdBy, ...rest } = this.user;

      // Create a shallow copy with correct keys
      const payload: any = {
        ...rest,
      };

      this.adminService.registerUser(payload).subscribe({
        next: (response) => {
          const username = response?.username || 'N/A'; // get username from response
          // On success, show success dialog and navigate to list page
          Swal.fire({
            title: 'Success',
            html: `User registered successfully!<br><strong>Username:</strong> ${username}`,
            icon: 'success',
          });
          this.dialogRef.close(true);     
        },   
        error: (error) => {
          // Show error message if save fails
          Swal.fire('Error', 'Failed to add User', 'error');
          console.error("Error saving user:", error);
        }
      });
    });
  }

  // Method to handle cancel action
  onCancel(): void {
    this.dialogRef.close();
  }
}