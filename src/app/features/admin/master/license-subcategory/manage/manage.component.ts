import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { AdminService } from '../../../admin.service';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  licenseSubcategory: LicenseSubcategory = { description: '', category: 0 }; // Holds form data for subcategory
  isEditMode = false; // Flag to determine add/edit mode
  categories: LicenseCategory[] = []; // List of categories for dropdown

  constructor(
    private adminService: AdminService,
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LicenseSubcategory | null // Injected data for edit mode
  ) {}

  ngOnInit(): void {
    this.loadCategories(); // Load categories for dropdown

    if (this.data) {
      this.licenseSubcategory = { ...this.data }; // Pre-fill form in edit mode

      // Ensure category is a number for mat-select
      if (typeof this.licenseSubcategory.category === 'object') {
        this.licenseSubcategory.category = (this.licenseSubcategory.category as LicenseCategory).id;
      }

      this.isEditMode = true;
    }
  }

  loadCategories(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data) => this.categories = data, // Populate dropdown with categories
      error: () => Swal.fire('Error', 'Failed to load license categories.', 'error') // Handle fetch error
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
          : this.licenseSubcategory.category?.id // Normalize category ID
      };

      const request = this.isEditMode
        ? this.adminService.updateLicenseSubcategory(payload.id!, payload) // API call for update
        : this.adminService.addLicenseSubcategory(payload); // API call for add

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Subcategory updated!' : 'Subcategory added!', 'success');
          this.dialogRef.close(true); // Close dialog on success
        },
        error: () => {
          Swal.fire('Error', 'Failed to save license subcategory.', 'error'); // Handle API error
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close(); // Close dialog on cancel
  }
}
