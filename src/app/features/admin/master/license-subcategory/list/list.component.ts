import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { ManageComponent as ManageSubcategoryComponent } from '../manage/manage.component';
import { ManageComponent as ManageCategoryComponent } from '../../license-category/manage/manage.component';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {

  // ── License Subcategories ─────────────────────────────────────────────────
  displayedColumns: string[] = ['description', 'category', 'actions'];
  licenseSubcategories: LicenseSubcategory[] = [];

  // ── License Categories ────────────────────────────────────────────────────
  categoryColumns: string[] = ['licenseCategory', 'actions'];
  licenseCategories: LicenseCategory[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLicenseSubcategories();
    this.loadLicenseCategories();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LICENSE CATEGORIES
  // ══════════════════════════════════════════════════════════════════════════

  loadLicenseCategories(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data) => this.licenseCategories = data,
      error: () => Swal.fire('Error', 'Failed to load license categories.', 'error')
    });
  }

  onAddCategory(): void {
    this.dialog.open(ManageCategoryComponent, { width: '500px' })
      .afterClosed().subscribe(r => { if (r) this.loadLicenseCategories(); });
  }

  onEditCategory(category: LicenseCategory): void {
    this.dialog.open(ManageCategoryComponent, { width: '500px', data: category })
      .afterClosed().subscribe(r => { if (r) this.loadLicenseCategories(); });
  }

  onDeleteCategory(category: LicenseCategory): void {
    if (category.id === undefined) return;
    Swal.fire({ title: 'Are you sure?', text: `Delete "${category.licenseCategory}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.adminService.deleteLicenseCategory(category.id!).subscribe({
          next: () => { Swal.fire('Deleted!', 'License category deleted.', 'success'); this.loadLicenseCategories(); },
          error: () => Swal.fire('Error', 'Failed to delete license category.', 'error')
        });
      });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LICENSE SUBCATEGORIES
  // ══════════════════════════════════════════════════════════════════════════

  loadLicenseSubcategories(): void {
    this.masterService.getLicenseSubcategories().subscribe({
      next: (data) => this.licenseSubcategories = data,
      error: () => Swal.fire('Error', 'Failed to load license subcategories.', 'error')
    });
  }

  onAdd(): void {
    this.dialog.open(ManageSubcategoryComponent, { width: '500px' })
      .afterClosed().subscribe(r => { if (r) this.loadLicenseSubcategories(); });
  }

  onEdit(subcategory: LicenseSubcategory): void {
    this.dialog.open(ManageSubcategoryComponent, { width: '500px', data: subcategory })
      .afterClosed().subscribe(r => { if (r) this.loadLicenseSubcategories(); });
  }

  onDelete(subcategory: LicenseSubcategory): void {
    if (subcategory.id === undefined) return;
    Swal.fire({ title: 'Are you sure?', text: `Delete "${subcategory.description}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.adminService.deleteLicenseSubcategory(subcategory.id!).subscribe({
          next: () => { Swal.fire('Deleted!', 'License subcategory deleted.', 'success'); this.loadLicenseSubcategories(); },
          error: () => Swal.fire('Error', 'Failed to delete license subcategory.', 'error')
        });
      });
  }
}
