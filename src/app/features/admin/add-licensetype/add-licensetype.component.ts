import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LicenseType } from '../../../core/models/license-type.model'; // LicenseType model
import Swal from 'sweetalert2';                                        // SweetAlert for confirmation dialogs
import { MaterialModule } from '../../../shared/material.module';      // Angular Material module
import { BaseDependency } from '../../../base/dependency/base.dependency';
import { BaseComponent } from '../../../base/base.components';

@Component({
  selector: 'app-add-licensetype',              // Component selector
  imports: [MaterialModule],                    // Import Material module for Angular Material UI components
  templateUrl: './add-licensetype.component.html', // HTML template for the component
  styleUrl: './add-licensetype.component.scss'     // Styles specific to this component
})
export class AddLicensetypeComponent extends BaseComponent implements OnInit {
  // Create an instance of LicenseType model
  licenseType: LicenseType = new LicenseType();

  // Inject SiteAdminService and Router via constructor
  constructor(deps: BaseDependency) {
    super(deps)
  }

  // Lifecycle hook - currently not used
  ngOnInit(): void {}

  // Method to handle saving of license type
  save(): void {
    // Show confirmation dialog before saving
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to add this License Type?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        // Call service to save license type
        this.adminService.addLicenseType(this.licenseType).subscribe(
          (res) => {
            // Show success message on successful save
            Swal.fire('Success', 'License Type added successfully!', 'success');
            // Redirect to license type list page
            this.router.navigate(['/admin/license-type']);
          },
          (error) => {
            // Log and show error if save fails
            console.error('Error adding license type:', error);
            Swal.fire('Error', 'Failed to add License Type', 'error');
          }
        );
      }
    });
  }

  // Method to go back to the previous page
  cancel(): void {
    history.back();
  }
}
