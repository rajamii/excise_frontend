import { Component, OnInit } from '@angular/core';
import { LicenseCategory } from '../../../../core/models/license-category.model';
import Swal from 'sweetalert2';  // For confirmation and alert dialogs
import { MaterialModule } from '../../../../shared/material.module';
import { MatDialogRef } from '@angular/material/dialog';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-add',
  imports: [MaterialModule],
  templateUrl: './add.component.html',
  styleUrl: './add.component.scss'
})
export class AddComponent implements OnInit {

  // Model object to bind form data
  licenseCategory: LicenseCategory = new LicenseCategory();

  // Injecting necessary services like SiteAdminService and Router
  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<AddComponent>
  ) { }

  // Lifecycle hook - currently unused but required by interface
  ngOnInit(): void {}

  // Method to handle form submission
  onSave(): void {
    // Show confirmation dialog before proceeding
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to add this License Type?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.adminService.addLicenseCategory(this.licenseCategory).subscribe({
        next: () => {
          // On success, show success dialog and navigate to list page
          Swal.fire('Success', 'License Category Added Successfully!', 'success');
          this.dialogRef.close(true);
        },
        error: (error) => {
          // On error, log and show error message
          Swal.fire('Error', 'Failed to add License Category', 'error');
          console.error('Error adding license category:', error);
        }
      });
    });
  }


  // Cancel dialog
  onCancel(): void {
    this.dialogRef.close();
  }
}
