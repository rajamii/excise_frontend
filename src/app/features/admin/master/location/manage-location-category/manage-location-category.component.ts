import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LocationCategory } from '../../../../../core/models/location-category.model';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-manage-location-category',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage-location-category.component.html',
  styleUrl: './manage-location-category.component.scss'
})
export class ManageLocationCategoryComponent implements OnInit {
  categoryRecord: LocationCategory = {
    id: 0,
    categoryName: '',
    description: '',
    isActive: true
  };

  isEditMode = false;

  constructor(
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageLocationCategoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LocationCategory | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.categoryRecord = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    if (!this.categoryRecord.categoryName || !this.categoryRecord.categoryName.trim()) {
      Swal.fire('Warning', 'Category Name is required.', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Location Category?' : 'Save Location Category?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      // Map back to snake_case backend parameters
      const payload = {
        category_name: this.categoryRecord.categoryName.trim(),
        description: this.categoryRecord.description || '',
        is_active: this.categoryRecord.isActive
      };

      const request = this.isEditMode
        ? this.masterService.updateLocationCategory(this.categoryRecord.id, payload)
        : this.masterService.createLocationCategory(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Category updated successfully!' : 'Category added successfully!', 'success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          const detail = err?.error?.detail || err?.error?.category_name?.[0] || 'Failed to save location category.';
          Swal.fire('Error', detail, 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
