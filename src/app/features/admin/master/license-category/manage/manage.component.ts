import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { AdminService } from '../../../admin.service';

@Component({
  selector: 'app-manage-license-category',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  licenseCategory: LicenseCategory = { 
    licenseCategory: '', 
    description: '' 
  };
  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LicenseCategory | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.licenseCategory = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update License Category?' : 'Add License Category?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.adminService.updateLicenseCategory(this.licenseCategory.id!, this.licenseCategory)
        : this.adminService.addLicenseCategory(this.licenseCategory);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Category updated!' : 'Category added!', 'success');
          this.dialogRef.close(true);
        },
        error: () => Swal.fire('Error', 'Failed to save license category.', 'error')
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}