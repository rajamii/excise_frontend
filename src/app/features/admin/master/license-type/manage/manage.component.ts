import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseType } from '../../../../../core/models/license-type.model';
import { AdminService } from '../../../admin.service';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  licenseType: LicenseType = { licenseType: '' }; // Form model for license type
  isEditMode = false; // Flag to determine add or edit mode

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LicenseType | null // Inject data if editing
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.licenseType = { ...this.data }; // Pre-fill form for edit
      this.isEditMode = true;
    }
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update License Type?' : 'Add License Type?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.adminService.updateLicenseType(this.licenseType.id!, this.licenseType) // API call to update
        : this.adminService.addLicenseType(this.licenseType); // API call to add

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'License type updated!' : 'License type added!', 'success');
          this.dialogRef.close(true); // Close dialog after success
        },
        error: () => Swal.fire('Error', 'Failed to save license type.', 'error') // Show error alert
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close(); // Close dialog without saving
  }
}
