import { Component, OnInit } from '@angular/core';
import { LicenseType } from '../../../../core/models/license-type.model'; // LicenseType model
import Swal from 'sweetalert2';                                        // SweetAlert for confirmation dialogs
import { MaterialModule } from '../../../../shared/material.module';     // Angular Material module
import { MatDialogRef } from '@angular/material/dialog';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-add',              // Component selector
  standalone: true, 
  imports: [MaterialModule],                    // Import Material module for Angular Material UI components
  templateUrl: './add.component.html', // HTML template for the component
  styleUrl: './add.component.scss'     // Styles specific to this component
})
export class AddComponent implements OnInit {
  // Create an instance of LicenseType model
  licenseType: LicenseType = new LicenseType();

  // Inject SiteAdminService and Router via constructor
  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<AddComponent>
  ) { }

  // Lifecycle hook - currently not used
  ngOnInit(): void {}

  // Method to handle saving of license type
  onSave(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to add this License Type?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
    }).then(result => {
      if (!result.isConfirmed) return;

      this.adminService.addLicenseType(this.licenseType).subscribe({
        next: () => {
          Swal.fire('Success', 'License Type added successfully!', 'success');
          this.dialogRef.close(true);
        },
        error: (error) => {
          Swal.fire('Error', 'Failed to add License Type', 'error');
          console.error('Error adding license type:', error);
        }
      });
    });
  }

  // Cancel dialog
  onCancel(): void {
    this.dialogRef.close();
  }

}
