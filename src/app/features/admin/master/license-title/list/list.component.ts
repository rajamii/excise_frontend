import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseTitle } from '../../../../../core/models/license-title.model';
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
  // List of license titles
  licenseTitles: LicenseTitle[] = [];

  // Table columns
  displayedColumns: string[] = [
    'description',
    'actions'
  ];

  constructor(
    private masterService: MasterService,   // For fetching license titles
    private adminService: AdminService, // For delete API
    private dialog: MatDialog           // To open dialog
  ) {}

  ngOnInit(): void {
    this.loadLicenseTitles(); // Fetch license titles on init
  }

  // Fetch all license titles from API
  loadLicenseTitles(): void {
    this.masterService.getLicenseTitles().subscribe({
      next: (data) => this.licenseTitles = data, 
      error: () => Swal.fire('Error', 'Failed to load license titles.', 'error')
    });
  }

  // Open add license titles dialog
  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLicenseTitles(); // Reload license titles if added
    });
  }

  // Open edit license titles dialog (same component)
  onEdit(licenseTitles: LicenseTitle): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: licenseTitles // Pass license titles to be edited
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLicenseTitles(); // Reload license titles if edited
    });
  }

  // Confirm and delete role
  onDelete(licenseTitle: LicenseTitle): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete role "${licenseTitle.description}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed && licenseTitle.id !== undefined) {
        this.adminService.deleteLicenseTitle(licenseTitle.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'License title deleted successfully.', 'success');
            this.loadLicenseTitles();
          },
          error: () => Swal.fire('Error', 'Failed to delete license title.', 'error')
        });
      }
    });
  }
}
