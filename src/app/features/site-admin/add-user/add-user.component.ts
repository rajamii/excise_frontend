import { Component, OnInit } from '@angular/core';
import { Account } from '../../../core/models/accounts';
import { District } from '../../../core/models/district.model';
import { SubDivision } from '../../../core/models/subdivision.model';
import { Role } from '../../../core/models/role';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependendency';
import { SiteAdminService } from '../site-admin-service';
import { MaterialModule } from '../../../shared/material.module';
import { error } from 'console';

@Component({
  selector: 'app-add-user',
  imports: [MaterialModule],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.scss'
})
export class AddUserComponent extends BaseComponent implements OnInit {
  user: Account = new Account(); // User object to hold user data
  districts: District[] = []; // Array to hold all districts
  subdivisons: SubDivision[] = []; // Array to hold all subdivisions
  filteredSubdivisions: SubDivision[] = []; // Array to hold filtered subdivisions based on district
  roles: Role[] = [];

  constructor(base: BaseDependency, private siteAdminService: SiteAdminService) {
    super(base); // Call parent constructor
  }

  ngOnInit(): void {
    this.user.is_active = true; // Set default active status for user
    this.loadDistricts(); // Load the list of districts
    this.loadSubdivisions(); // Load all subdivisions initially
    this.loadRoles(); // Load all roles initially
  }

  // Method to load all districts from the backend
  loadDistricts(): void {
    this.siteAdminService.getDistrict().subscribe((data: District[]) => {
      this.districts = data; // Store the fetched districts
    }, error => {
      this.toastrService.error('Failed to load districts.'); // Show error if districts loading fails
    });
  }

  // Method to load all subdivisions from the backend
  loadSubdivisions(): void {
    this.siteAdminService.getSubDivision().subscribe(
      (data: SubDivision[]) => {
        this.subdivisons = data; // Store the fetched subdivisions
      },
      (error) => {
        this.toastrService.error('Failed to load subdivisions.'); // Show error if subdivisions loading fails
      }
    );
  }

  //Method to get the role label based on the role key
  loadRoles(): void {
    this.siteAdminService.getRoles().subscribe(
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
    console.log('Selected District ID:', id); // Log selected district ID for debugging
    this.filteredSubdivisions = this.subdivisons.filter(subDiv => subDiv.DistrictCode === id); // Filter subdivisions based on district
    console.log('Filtered Subdivisions:', this.filteredSubdivisions); // Log filtered subdivisions
  }

  // Method to handle form submission
  submit(): void {
    // Check if password and confirm password match
    if (this.user.password !== this.user.confirm_password) {
      this.toastrService.error('Passwords do not match!'); // Show error if passwords do not match
      return;
    }

    // Show confirmation popup before saving the user data
    this.myswal
      .fire({
        title: 'Are you sure?',
        text: 'You want to add this user?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
      })
      .then((submit: { isConfirmed: any }) => {
        // If user confirms, save the user data
        if (submit.isConfirmed) {
          this.siteAdminService.registerUser(this.user).subscribe(res => {
            this.toastrService.success(res.message); // Show success message
            this.router.navigate(['/site-admin/list-user']); // Redirect to user list page
          });
        }
      });
  }

  // Method to cancel the form and navigate back to the previous page
  cancel(): void {
    history.back(); // Go back to the previous page
  }
}
