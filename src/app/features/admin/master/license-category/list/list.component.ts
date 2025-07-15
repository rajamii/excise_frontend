import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-license-category-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['id', 'licenseCategory', 'actions'];
  licenseCategories: LicenseCategory[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCategories(); // Load categories on component initialization
  }

  loadCategories(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data) => this.licenseCategories = data, // Update list on success
      error: () => Swal.fire('Error', 'Failed to load license categories.', 'error') // Show error alert
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
    }); // Open dialog for adding category

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCategories(); // Reload list if a category was added
    });
  }

  onEdit(category: LicenseCategory): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: category
    }); // Open dialog for editing category

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCategories(); // Reload list if a category was edited
    });
  }

  onDelete(category: LicenseCategory): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete license category "${category.licenseCategory}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed && category.id !== undefined) {
        this.adminService.deleteLicenseCategory(category.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'License category deleted.', 'success'); // Show success alert
            this.loadCategories(); // Reload list after deletion
          },
          error: () => Swal.fire('Error', 'Failed to delete license category.', 'error') // Show error alert
        });
      }
    });
  }
}
