import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseType } from '../../../../../core/models/license-type.model';
import { AdminService } from '../../../admin.service';
import { MasterService } from '../../../../../core/services/master.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['licenseType', 'actions']; // Columns to show in the table
  licenseTypes: LicenseType[] = []; // Stores fetched license types

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLicenseTypes(); // Fetch data on component load
  }

  loadLicenseTypes(): void {
    this.masterService.getLicenseTypes().subscribe({
      next: data => this.licenseTypes = data, // Populate table with data
      error: () => Swal.fire('Error', 'Failed to load license types.', 'error') // Handle load error
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px' // Open add dialog
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLicenseTypes(); // Refresh table if saved
    });
  }

  onEdit(licenseType: LicenseType): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: licenseType // Open edit dialog with existing data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLicenseTypes(); // Refresh table if updated
    });
  }

  onDelete(licenseType: LicenseType): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete license type "${licenseType.licenseType}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (result.isConfirmed && licenseType.id !== undefined) {
        this.adminService.deleteLicenseType(licenseType.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'License type deleted successfully.', 'success'); // Show success message
            this.loadLicenseTypes(); // Refresh table after deletion
          },
          error: () => Swal.fire('Error', 'Failed to delete license type.', 'error') // Show error on failure
        });
      }
    });
  }
}
