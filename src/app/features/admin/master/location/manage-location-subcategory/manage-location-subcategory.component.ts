import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LocationSubcategory } from '../../../../../core/models/location-subcategory.model';
import { LocationCategory } from '../../../../../core/models/location-category.model';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-manage-location-subcategory',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage-location-subcategory.component.html',
  styleUrl: './manage-location-subcategory.component.scss'
})
export class ManageLocationSubcategoryComponent implements OnInit {
  subcategoryRecord: LocationSubcategory = {
    id: 0,
    subcategoryName: '',
    categoryId: 0,
    categoryName: '',
    description: '',
    isActive: true
  };

  isEditMode = false;
  categories: LocationCategory[] = [];
  subdivisions: any[] = []; // Using any to avoid importing Subdivision if not strictly needed, or we can use the proper type. Wait, let's just use any.

  constructor(
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageLocationSubcategoryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LocationSubcategory | null
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadSubdivisions();

    if (this.data) {
      this.subcategoryRecord = { ...this.data };
      if (this.data as any && (this.data as any).sub_division) {
         this.subcategoryRecord.subDivision = (this.data as any).sub_division;
      }
      this.isEditMode = true;
    }
  }

  loadCategories(): void {
    this.masterService.getLocationCategories().subscribe({
      next: (data: any) => {
        this.categories = data.map((item: any) => ({
          id: item.id,
          categoryName: item.categoryName || item.category_name,
          isActive: item.isActive !== undefined ? item.isActive : item.is_active
        })).filter((c: any) => c.isActive || (this.isEditMode && c.id === this.subcategoryRecord.categoryId));
      },
      error: () => Swal.fire('Error', 'Failed to load location categories.', 'error')
    });
  }

  loadSubdivisions(): void {
    this.masterService.getSubdivisions().subscribe({
      next: (data: any) => {
        this.subdivisions = data.map((item: any) => ({
          id: item.id,
          subdivision: item.subdivision || item.sub_division,
          isActive: item.isActive !== undefined ? item.isActive : item.is_active
        })).filter((s: any) => s.isActive || (this.isEditMode && s.id === this.subcategoryRecord.subDivision));
      },
      error: () => Swal.fire('Error', 'Failed to load subdivisions.', 'error')
    });
  }

  onSave(): void {
    if (!this.subcategoryRecord.subcategoryName || !this.subcategoryRecord.subcategoryName.trim()) {
      Swal.fire('Warning', 'Subcategory Name is required.', 'warning');
      return;
    }

    if (!this.subcategoryRecord.categoryId) {
      Swal.fire('Warning', 'Location Category is required.', 'warning');
      return;
    }
    
    if (!this.subcategoryRecord.subDivision) {
      Swal.fire('Warning', 'Subdivision is required.', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Location Subcategory?' : 'Save Location Subcategory?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      // Map back to snake_case backend parameters
      const payload = {
        subcategory_name: this.subcategoryRecord.subcategoryName.trim(),
        category: this.subcategoryRecord.categoryId,
        sub_division: this.subcategoryRecord.subDivision,
        description: this.subcategoryRecord.description || '',
        is_active: this.subcategoryRecord.isActive
      };

      const request = this.isEditMode
        ? this.masterService.updateLocationSubcategory(this.subcategoryRecord.id, payload)
        : this.masterService.createLocationSubcategory(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Subcategory updated successfully!' : 'Subcategory added successfully!', 'success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          const detail = err?.error?.detail || err?.error?.subcategory_name?.[0] || 'Failed to save location subcategory.';
          Swal.fire('Error', detail, 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
