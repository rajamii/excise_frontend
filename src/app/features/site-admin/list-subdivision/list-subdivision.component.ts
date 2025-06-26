import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependendency';
import { MatTableDataSource } from '@angular/material/table';
import { District } from '../../../core/models/district.model';
import { SiteAdminService } from '../site-admin-service';
import { Subdivision } from '../../../core/models/subdivision.model';
import Swal from 'sweetalert2';
import { EditSubdivisionComponent } from './edit-subdivision/edit-subdivision.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-list-subdivision',
  imports: [MaterialModule, RouterModule],
  templateUrl: './list-subdivision.component.html',
  styleUrls: ['./list-subdivision.component.scss']
})
export class ListSubdivisionComponent extends BaseComponent implements OnInit {
  // Define the columns for the MatTable (for displaying subdivisions)
  displayedColumns: string[] = ['id', 'subdivision', 'subdivisionNameLl', 'subdivisionCode', 'district', 'districtCode', 'actions'];

  // Create MatTableDataSource to manage the subdivision data
  subdivisionDataSource = new MatTableDataSource<Subdivision>();

  // Arrays to hold district and subdivision data
  districts: District[] = [];
  allSubdivisions: Subdivision[] = [];

  // Variable to hold the selected district code (used for filtering subdivisions)
  selectedDistrictCode: number | null = null;

  constructor(base: BaseDependency, private siteAdminService: SiteAdminService, private dialog: MatDialog) { 
    super(base); // Initialize base class (for shared logic)
  }

  ngOnInit(): void {
    this.loadDistricts(); // Load the districts data from the service
    this.loadSubdivision(); // Load all subdivisions initially
  }

  // Load all districts from the service and store them in the districts array
  loadDistricts(): void {
    this.siteAdminService.getDistrict().subscribe(data => {
      this.districts = data; // Store the district data
    });
  }

  // Load all subdivisions from the service and store them in the allSubdivisions array
  loadSubdivision(): void {
    this.siteAdminService.getSubdivision().subscribe(data => {
      this.allSubdivisions = data; // Store all subdivisions
      this.subdivisionDataSource.data = this.allSubdivisions; // Initially show all subdivisions
    });
  }

  // Filter the subdivisions based on the selected district
  onDistrictSelect(): void {
    if (this.selectedDistrictCode === null) { // Check if "All Districts" is selected
      this.subdivisionDataSource.data = this.allSubdivisions; // Show all subdivisions if no district is selected
    } else {
      // Filter subdivisions based on the selected district code
      this.subdivisionDataSource.data = this.allSubdivisions.filter(sub => sub.districtCode === this.selectedDistrictCode);
    }
  }

  // Open the EditSubdivision dialog to edit the selected subdivision's details
  onEdit(district: District): void {
    const dialogRef = this.dialog.open(EditSubdivisionComponent, {
      width: '400px', // Dialog width
      data: { ...district } // Pass the selected district data to the dialog
    });

    // Reload subdivisions data when dialog is closed and changes were made
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadSubdivision(); // Reload subdivisions after successful edit
      }
    });
  }

  // Prompt the user for confirmation to delete the selected subdivision
  onDelete(element: Subdivision): void {
      Swal.fire({
          title: 'Are you sure?',
          text: 'You will not be able to recover this subdivision!',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, delete it!',
          cancelButtonText: 'Cancel'
      }).then((result) => {
          if (result.isConfirmed) {
              // If user confirms, delete the subdivision via the service
              this.siteAdminService.deleteSubdivision(element.id).subscribe(
                  () => {
                      Swal.fire('Deleted!', 'Subdivision has been deleted.', 'success');
                      this.loadSubdivision(); // Reload subdivisions after deletion
                  },
                  error => {
                      console.error('Error deleting subdivision:', error);
                      Swal.fire('Error!', 'Subdivision could not be deleted.', 'error');
                  }
              );
          }
      });
  }

}
