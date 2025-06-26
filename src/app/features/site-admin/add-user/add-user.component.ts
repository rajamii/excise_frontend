import { Component, OnInit } from '@angular/core';
import { Account } from '../../../core/models/accounts';
import { District } from '../../../core/models/district.model';
import { Subdivision } from '../../../core/models/subdivision.model';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependendency';
import { SiteAdminService } from '../site-admin-service';
import { MaterialModule } from '../../../shared/material.module';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-user',
  imports: [MaterialModule],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.scss'
})
export class AddUserComponent extends BaseComponent implements OnInit {
  user: Account = new Account(); // User object to hold user data
  districts: District[] = []; // Array to hold all districts
  subdivisons: Subdivision[] = []; // Array to hold all subdivisions
  filteredSubdivisions: Subdivision[] = []; // Array to hold filtered subdivisions based on district
  roles = [
    { key: 'site_admin', label: 'Site Admin' },
    { key: 'licensee', label: 'Licensee' },
    { key: 'level_1', label: 'Level 1' },
    { key: 'level_2', label: 'Level 2' },
    { key: 'level_3', label: 'Level 3' },
    { key: 'level_4', label: 'Level 4' },
    { key: 'level_5', label: 'Level 5' },
  ];

  constructor(base: BaseDependency, private siteAdminService: SiteAdminService) {
    super(base); // Call parent constructor
  }

  ngOnInit(): void {
    this.user.isActive = true; // Set default active status for user
    this.loadDistricts(); // Load the list of districts
    this.loadSubdivisions(); // Load all subdivisions initially
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
    this.siteAdminService.getSubdivision().subscribe(
      (data: Subdivision[]) => {
        this.subdivisons = data; // Store the fetched subdivisions
      },
      (error) => {
        this.toastrService.error('Failed to load subdivisions.'); // Show error if subdivisions loading fails
      }
    );
  }

  // Method to filter subdivisions based on the selected district
  onDistrictChange(id: number): void {
    console.log('Selected District ID:', id); // Log selected district ID for debugging
    this.filteredSubdivisions = this.subdivisons.filter(subDiv => subDiv.districtCode === id); // Filter subdivisions based on district
    console.log('Filtered Subdivisions:', this.filteredSubdivisions); // Log filtered subdivisions
  }

  // Method to handle form submission
  submit(): void {
    // Check if password and confirm password match
    if (this.user.password !== this.user.confirmPassword) {
      this.toastrService.error('Passwords do not match!');
      return;
    }

    // Show confirmation dialog before saving
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to add this user?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
    }).then((submit) => {
      if (submit.isConfirmed) {
        this.siteAdminService.registerUser(this.user).subscribe({
          next: res => {
            this.toastrService.success(res.message);

            // Show success SweetAlert popup with generated username
            Swal.fire({
              title: 'Success!',
              html: `User has been registered successfully.<br><strong>Username: ${res.username}</strong>`,
              icon: 'success',
              confirmButtonText: 'OK',
            }).then(() => {
              // Redirect to user list after confirmation
              this.router.navigate(['/admin/users']);
            });
          },
          error: err => {
            console.error("Error registering user:", err);
            this.toastrService.error(err.error?.message || 'Failed to register user.');
          }
        });
      }
    });
  }

  // Method to cancel the form and navigate back to the previous page
  cancel(): void {
    history.back(); // Go back to the previous page
  }
}
