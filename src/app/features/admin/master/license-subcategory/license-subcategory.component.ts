import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { LicenseCategory } from '../../../../core/models/license-category.model';
import { LicenseSubcategory } from '../../../../core/models/license-subcategory.model';
import { MasterService } from '../../../../core/services/master.service';
import { AdminService } from '../../admin.service';

import { ManageComponent as ManageCategoryComponent } from './manage-category/manage.component';
import { SubcategoryDialogComponent } from './subcategory-dialog/subcategory-dialog.component';

@Component({
  selector: 'app-license-subcategory',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './license-subcategory.component.html',
  styleUrl: './license-subcategory.component.scss'
})
export class LicenseSubcategoryComponent implements OnInit {
  // Tab 1 — License Category columns
  categoryColumns: string[] = ['sno', 'licenseCategory', 'specialPermit', 'status', 'actions'];

  // Tab 2 — Sub Category overview columns
  subTabColumns: string[] = ['sub_sno', 'sub_categoryName', 'subActions'];

  licenseCategories: LicenseCategory[] = [];
  licenseSubcategories: LicenseSubcategory[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadSubcategories();
  }

  // ─── Load ─────────────────────────────────────────────────────────────────

  loadCategories(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data) => this.licenseCategories = data,
      error: () => Swal.fire('Error', 'Failed to load license categories.', 'error')
    });
  }

  loadSubcategories(): void {
    this.masterService.getLicenseSubcategories().subscribe({
      next: (data) => this.licenseSubcategories = data,
      error: () => { /* silent — used for count badges only */ }
    });
  }

  // ─── Tab 1: Category CRUD ─────────────────────────────────────────────────

  onAddCategory(): void {
    const ref = this.dialog.open(ManageCategoryComponent, { width: '500px' });
    ref.afterClosed().subscribe(result => { if (result) this.loadCategories(); });
  }

  onEditCategory(category: LicenseCategory): void {
    const ref = this.dialog.open(ManageCategoryComponent, { width: '500px', data: category });
    ref.afterClosed().subscribe(result => { if (result) this.loadCategories(); });
  }

  onDeleteCategory(category: LicenseCategory): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${category.licenseCategory}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444'
    }).then(result => {
      if (result.isConfirmed && category.id !== undefined) {
        this.adminService.deleteLicenseCategory(category.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'License category deleted.', 'success');
            this.loadCategories();
            this.loadSubcategories();
          },
          error: () => Swal.fire('Error', 'Failed to delete license category.', 'error')
        });
      }
    });
  }

  onToggleCategoryActive(category: LicenseCategory): void {
    const action = category.isActive ? 'Deactivate' : 'Activate';
    Swal.fire({
      title: `${action} Category?`,
      text: `${action} "${category.licenseCategory}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: action,
      confirmButtonColor: category.isActive ? '#f59e0b' : '#10b981'
    }).then(result => {
      if (result.isConfirmed && category.id !== undefined) {
        this.adminService.toggleLicenseCategoryActive(category.id).subscribe({
          next: () => {
            Swal.fire('Done!', `Category ${action.toLowerCase()}d.`, 'success');
            this.loadCategories();
          },
          error: () => Swal.fire('Error', `Failed to ${action.toLowerCase()} category.`, 'error')
        });
      }
    });
  }

  // ─── Tab 2: Open sub category popup ──────────────────────────────────────

  onViewSubcategories(category: LicenseCategory): void {
    const ref = this.dialog.open(SubcategoryDialogComponent, {
      width: '780px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { category },
      panelClass: 'scd-panel'
    });
    // Refresh counts when popup closes
    ref.afterClosed().subscribe(() => this.loadSubcategories());
  }

  // ─── Helper: sub count per category ──────────────────────────────────────

  getSubCount(categoryId: number | undefined): number {
    if (!categoryId) return 0;
    return this.licenseSubcategories.filter(s => {
      const catId = typeof s.category === 'object'
        ? (s.category as any)?.id
        : s.category;
      return catId === categoryId;
    }).length;
  }
}
