import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';

export interface SubcategoryDialogData {
  category: LicenseCategory;
}

@Component({
  selector: 'app-subcategory-dialog',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './subcategory-dialog.component.html',
  styleUrl: './subcategory-dialog.component.scss'
})
export class SubcategoryDialogComponent implements OnInit {
  category: LicenseCategory;
  subcategories: LicenseSubcategory[] = [];
  isLoading = false;

  // Inline add/edit form state
  showAddForm = false;
  editingId: number | null = null;
  formDescription = '';
  formDryDayFeeType: string | null = null;
  isSaving = false;

  displayedColumns = ['sno', 'description', 'dryDay', 'actions'];

  get isDryDayPermittedCategory(): boolean {
    const name = this.category?.licenseCategory;
    if (!name) return false;
    const permitted = [
      'Restaurant - cum - Bar Shop',
      'Foreign Liquor Retail Shop',
      'Special Category Hotel',
      'Discotheque & Night Club',
      'Casino with Bar'
    ];
    return permitted.includes(name);
  }

  constructor(
    public dialogRef: MatDialogRef<SubcategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SubcategoryDialogData,
    private masterService: MasterService,
    private adminService: AdminService
  ) {
    this.category = data.category;
  }

  ngOnInit(): void {
    if (this.isDryDayPermittedCategory) {
      this.displayedColumns = ['sno', 'description', 'dryDay', 'actions'];
    } else {
      this.displayedColumns = ['sno', 'description', 'actions'];
    }
    this.loadSubcategories();
  }

  loadSubcategories(): void {
    this.isLoading = true;
    this.masterService.getLicenseSubcategories().subscribe({
      next: (all: LicenseSubcategory[]) => {
        // Filter subcategories belonging to this category
        this.subcategories = all.filter(s => {
          const catId = typeof s.category === 'object'
            ? (s.category as any)?.id
            : s.category;
          return catId === this.category.id;
        });
        this.isLoading = false;
      },
      error: () => {
        Swal.fire('Error', 'Failed to load subcategories.', 'error');
        this.isLoading = false;
      }
    });
  }

  // ─── Dry Day Fee Type helper — handles camelCase from API ────────────────

  getDryDayFeeType(sub: LicenseSubcategory): string | null {
    // djangorestframework_camel_case converts dry_day_fee_type → dryDayFeeType
    return sub.dryDayFeeType ?? sub.dry_day_fee_type ?? null;
  }

  // ─── Add ─────────────────────────────────────────────────────────────────

  openAddForm(): void {
    this.showAddForm = true;
    this.editingId = null;
    this.formDescription = '';
    this.formDryDayFeeType = null;
  }

  cancelForm(): void {
    this.showAddForm = false;
    this.editingId = null;
    this.formDescription = '';
    this.formDryDayFeeType = null;
  }

  saveNew(): void {
    if (!this.formDescription.trim()) return;
    this.isSaving = true;
    const payload: LicenseSubcategory = {
      description: this.formDescription.trim(),
      category: this.category.id as any,
      dry_day_fee_type: this.formDryDayFeeType
    };
    this.adminService.addLicenseSubcategory(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.cancelForm();
        this.loadSubcategories();
      },
      error: () => {
        this.isSaving = false;
        Swal.fire('Error', 'Failed to add subcategory.', 'error');
      }
    });
  }

  // ─── Inline Edit ──────────────────────────────────────────────────────────

  startEdit(sub: LicenseSubcategory): void {
    this.editingId = sub.id!;
    this.formDescription = sub.description || '';
    this.formDryDayFeeType = this.getDryDayFeeType(sub);
    this.showAddForm = false;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.formDescription = '';
    this.formDryDayFeeType = null;
  }

  saveEdit(sub: LicenseSubcategory): void {
    if (!this.formDescription.trim()) return;
    this.isSaving = true;
    const payload = {
      description: this.formDescription.trim(),
      category: this.category.id,
      dry_day_fee_type: this.formDryDayFeeType
    };
    this.adminService.updateLicenseSubcategory(sub.id!, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.cancelEdit();
        this.loadSubcategories();
      },
      error: () => {
        this.isSaving = false;
        Swal.fire('Error', 'Failed to update subcategory.', 'error');
      }
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  onDelete(sub: LicenseSubcategory): void {
    Swal.fire({
      title: 'Delete?',
      text: `Remove "${sub.description}" from ${this.category.licenseCategory}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444'
    }).then(result => {
      if (result.isConfirmed) {
        this.adminService.deleteLicenseSubcategory(sub.id!).subscribe({
          next: () => { Swal.fire('Deleted!', 'Subcategory removed.', 'success'); this.loadSubcategories(); },
          error: () => Swal.fire('Error', 'Failed to delete subcategory.', 'error')
        });
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
