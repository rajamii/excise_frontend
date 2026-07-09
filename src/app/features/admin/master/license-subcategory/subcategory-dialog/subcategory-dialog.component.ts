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

  displayedColumns = ['sno', 'description', 'dryDay', 'status', 'actions'];

  get isDryDayPermittedCategory(): boolean {
    // Dynamic: use the is_special_permit_allowed flag set by admin on the License Category.
    // This replaces the old hardcoded list of category names.
    return this.category?.isSpecialPermitAllowed === true;
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
      this.displayedColumns = ['sno', 'description', 'dryDay', 'status', 'actions'];
    } else {
      this.displayedColumns = ['sno', 'description', 'status', 'actions'];
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
    const payload = {
      description: this.formDescription.trim(),
      category: this.category.id,
      dryDayFeeType: this.formDryDayFeeType   // camelCase for DRF camel_case parser
    };
    this.adminService.addLicenseSubcategory(payload as any).subscribe({
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

    // Build minimal PATCH payload — only send what we need to update
    // Using camelCase keys so djangorestframework_camel_case parser converts them correctly
    const payload: any = {
      dryDayFeeType: this.formDryDayFeeType ?? null
    };

    // Only include description if it actually changed
    const originalDesc = sub.description || '';
    if (this.formDescription.trim() !== originalDesc.trim()) {
      payload['description'] = this.formDescription.trim();
    }

    this.adminService.updateLicenseSubcategory(sub.id!, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.cancelEdit();
        this.loadSubcategories();
      },
      error: (err) => {
        this.isSaving = false;
        const detail = err?.error ? JSON.stringify(err.error) : 'Unknown error';
        console.error('Update subcategory error:', detail);
        Swal.fire('Error', 'Failed to update subcategory.', 'error');
      }
    });
  }

  // ─── Toggle Active ────────────────────────────────────────────────────────

  onToggleActive(sub: LicenseSubcategory): void {
    const action = sub.isActive !== false ? 'Deactivate' : 'Activate';
    Swal.fire({
      title: `${action}?`,
      text: `${action} "${sub.description}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: action,
      confirmButtonColor: sub.isActive !== false ? '#f59e0b' : '#10b981'
    }).then(result => {
      if (result.isConfirmed) {
        this.adminService.toggleLicenseSubcategoryActive(sub.id!).subscribe({
          next: () => { this.loadSubcategories(); },
          error: () => Swal.fire('Error', `Failed to ${action.toLowerCase()} subcategory.`, 'error')
        });
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
