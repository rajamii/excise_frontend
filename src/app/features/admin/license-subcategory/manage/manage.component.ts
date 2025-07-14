import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LicenseSubcategory } from '../../../../core/models/license-subcategory.model';
import { LicenseCategory } from '../../../../core/models/license-category.model';
import { AdminService } from '../../admin.service';
import { MasterService } from '../../../../core/services/master.service';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  licenseSubcategory: LicenseSubcategory = { description: '', category: 0 };
  isEditMode = false;
  categories: LicenseCategory[] = [];

  constructor(
    private adminService: AdminService,
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LicenseSubcategory | null
  ) {}

  ngOnInit(): void {
    this.loadCategories();

    if (this.data) {
      this.licenseSubcategory = { ...this.data };

      // Ensure category is a number for mat-select
      if (typeof this.licenseSubcategory.category === 'object') {
        this.licenseSubcategory.category = (this.licenseSubcategory.category as LicenseCategory).id;
      }

      this.isEditMode = true;
    }
  }

  loadCategories(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data) => this.categories = data,
      error: () => Swal.fire('Error', 'Failed to load license categories.', 'error')
    });
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update License Subcategory?' : 'Add License Subcategory?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then(result => {
      if (!result.isConfirmed) return;

      const payload: LicenseSubcategory = {
        ...this.licenseSubcategory,
        category: typeof this.licenseSubcategory.category === 'number'
          ? this.licenseSubcategory.category
          : this.licenseSubcategory.category.id 
      };

      const request = this.isEditMode
        ? this.adminService.updateLicenseSubcategory(payload.id!, payload)
        : this.adminService.addLicenseSubcategory(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Subcategory updated!' : 'Subcategory added!', 'success');
          this.dialogRef.close(true);
        },
        error: () => {
          Swal.fire('Error', 'Failed to save license subcategory.', 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
