import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { AdminService } from '../../../admin.service';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-manage-license-subcategory',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  licenseSubcategory: LicenseSubcategory = { 
    description: '',
    category: undefined
  };
  licenseCategories: LicenseCategory[] = [];
  isEditMode = false;

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
      // Handle both nested object and plain ID
      if (this.data.category && typeof this.data.category === 'object') {
        this.licenseSubcategory.category = (this.data.category as any).id;
      }
      this.isEditMode = true;
    }
  }

  loadCategories(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data) => this.licenseCategories = data,
      error: () => Swal.fire('Error', 'Failed to load license categories.', 'error')
    });
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update Subcategory?' : 'Add Subcategory?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.adminService.updateLicenseSubcategory(this.licenseSubcategory.id!, this.licenseSubcategory)
        : this.adminService.addLicenseSubcategory(this.licenseSubcategory);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Subcategory updated!' : 'Subcategory added!', 'success');
          this.dialogRef.close(true);
        },
        error: () => Swal.fire('Error', 'Failed to save license subcategory.', 'error')
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
