import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { LicenseSubcategory } from '../../../../core/models/license-subcategory.model';
import { MasterService } from '../../../../core/services/master.service';
import { ManageComponent } from '../manage/manage.component';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  licenseSubcategories: LicenseSubcategory[] = [];

  displayedColumns: string[] = ['id', 'description', 'category', 'actions'];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLicenseSubcategories();
  }

  loadLicenseSubcategories(): void {
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
      if (result) this.loadLicenseSubcategories();
    });
  }

  onEdit(subcategory: LicenseSubcategory): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: subcategory,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLicenseSubcategories();
    });
  }

  onDelete(subcategory: LicenseSubcategory): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${subcategory.description}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed && subcategory.id !== undefined) {
        this.adminService.deleteLicenseSubcategory(subcategory.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'License subcategory deleted.', 'success');
            this.loadLicenseSubcategories();
          },
          error: () => Swal.fire('Error', 'Failed to delete license subcategory.', 'error')
        });
      }
    });
  }
}
