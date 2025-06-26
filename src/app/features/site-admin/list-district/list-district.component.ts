// Angular and project-specific imports
import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependendency';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { District } from '../../../core/models/district.model';
import { SiteAdminService } from '../site-admin-service';
import { EditDistrictComponent } from './edit-district/edit-district.component';
import Swal from 'sweetalert2';

// Component metadata
@Component({
  selector: 'app-list-district', // Component selector
  imports: [MaterialModule, RouterModule], // Standalone imports
  templateUrl: './list-district.component.html', // HTML template path
  styleUrl: './list-district.component.scss' // SCSS style path
})
export class ListDistrictComponent extends BaseComponent implements OnInit {

  // Define columns for Angular Material table
  displayedColumns: string[] = ['id', 'district', 'districtCode', 'state', 'stateCode', 'actions'];

  // DataSource for the Material table, bound to list of districts
  districtDataSource = new MatTableDataSource<District>();

  // Injecting dependencies including SiteAdminService and MatDialog
  constructor(base: BaseDependency, private siteAdminService: SiteAdminService, private dialog: MatDialog) { 
    super(base); // Inherit from BaseComponent
  }

  // Lifecycle hook to load districts when component is initialized
  ngOnInit(): void {
    this.loadDistricts();
  }

  // Method to load district data from API
  loadDistricts(): void {
    this.siteAdminService.getDistrict().subscribe(data => {
      this.districtDataSource.data = data; // Bind API data to table dataSource
    });
  }

  // Method triggered when Edit button is clicked
  onEdit(district: District): void {
    // Open the EditDistrictComponent in a dialog, passing selected district data
    const dialogRef = this.dialog.open(EditDistrictComponent, {
      width: '400px',
      data: { ...district }
    });

    // After the dialog is closed, refresh data if update was made
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDistricts(); // Reload updated district list
      }
    });
  }

  // Method triggered when Delete button is clicked
  onDelete(district: District): void {
    // Show SweetAlert confirmation dialog before deletion
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you really want to delete ${district.district}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      // If user confirms, proceed with deletion
      if (result.isConfirmed) {
        this.siteAdminService.deleteDistrict(district.id).subscribe(
          () => {
            // On success, show confirmation alert and refresh list
            Swal.fire('Deleted!', 'The district has been deleted.', 'success');
            this.loadDistricts();
          },
          error => {
            // On error, show error alert and log it
            Swal.fire('Error!', 'Failed to delete the district.', 'error');
            console.error('Error deleting district:', error);
          }
        );
      }
    });
  }
}
