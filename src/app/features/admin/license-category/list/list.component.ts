import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { BaseComponent } from '../../../../base/base.components';
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import Swal from 'sweetalert2';
import { MatTableDataSource } from '@angular/material/table';
import { LicenseCategory } from '../../../../core/models/license-category.model';
import { EditComponent } from '../edit/edit.component';
import { MatDialog } from '@angular/material/dialog';
import { AddComponent } from '../add/add.component';

@Component({
  selector: 'app-list', // The selector for this component
  imports: [MaterialModule], // Import necessary modules
  templateUrl: './list.component.html', // HTML template for the component
  styleUrl: './list.component.scss' // Styles for the component
})
export class ListComponent extends BaseComponent implements OnInit {
  
  // Columns to display in the table
  displayedColumns: string[] = ['id', 'licenseCategory', 'actions'];

  // Data source for the MatTable, initialized with LicenseCategory type
  licenseCategoryDataSource = new MatTableDataSource<LicenseCategory>();

  constructor(
    deps: BaseDependency, // BaseDependency instance for inherited functionality
    private dialog: MatDialog // Dialog service to open modals
  ) { 
    super(deps); // Call the parent constructor
  }

  // OnInit lifecycle hook to load license categories on component initialization
  ngOnInit(): void {
    this.loadLicenseCategories(); // Load license categories when component initializes
  }

  // Method to load all license categories from the backend
  loadLicenseCategories(): void {
    this.masterService.getLicenseCategories().subscribe(data => {
      // Populate the dataSource with the received data
      this.licenseCategoryDataSource.data = data;
    });
  }

  // Dialog form to add a new license category
  onAdd(): void {
    const dialogRef = this.dialog.open(AddComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loadLicenseCategories();  // Reload after adding
      }
    });
  }

  // Method to open the edit modal for a specific license category
  onEdit(element: LicenseCategory): void {
    const dialogRef = this.dialog.open(EditComponent, {
      width: '400px', // Set the dialog width
      data: { ...element } // Pass the selected license category data to the dialog component
    });

    // After the dialog is closed, reload the license categories to reflect any updates
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadLicenseCategories(); // Reload license categories after an update
      }
    });
  }

  // Method to delete a license category
  onDelete(element: LicenseCategory): void {
    // Show confirmation dialog before deletion
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the license type.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      // If the user confirms, delete the license category
      if (result.isConfirmed) {
        this.adminService.deleteLicenseCategory(element.id).subscribe(
          () => {
            Swal.fire('Deleted!', 'The license category has been deleted.', 'success'); // Show success message
            this.loadLicenseCategories(); // Refresh the table after deletion
          },
          (error) => {
            // Handle error in case of failure
            console.error('Error deleting license category:', error);
            Swal.fire('Error!', 'There was a problem deleting the license category.', 'error');
          }
        );
      }
    });
  }
}
