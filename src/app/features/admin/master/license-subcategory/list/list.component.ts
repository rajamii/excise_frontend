import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-license-subcategory-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['description', 'categoryName', 'actions'];
  licenseSubcategories: LicenseSubcategory[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSubcategories();
  }

  loadSubcategories(): void {
    this.masterService.getLicenseSubcategories().subscribe({
      next: (data) => this.licenseSubcategories = data,
      error: () => Swal.fire('Error', 'Failed to load license subcategories.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadSubcategories();
    });
  }

  onEdit(subcategory: LicenseSubcategory): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: subcategory
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadSubcategories();
    });
  }

  onDelete(subcategory: LicenseSubcategory): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete subcategory "${subcategory.description}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed && subcategory.id !== undefined) {
        this.adminService.deleteLicenseSubcategory(subcategory.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'License subcategory deleted.', 'success');
            this.loadSubcategories();
          },
          error: () => Swal.fire('Error', 'Failed to delete license subcategory.', 'error')
        });
      }
    });
  }
}
