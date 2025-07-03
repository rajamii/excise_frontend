import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'; // Importing dialog-related classes
import { LicenseCategory } from '../../../../core/models/license-category.model'; // LicenseCategory model for type safety
import Swal from 'sweetalert2'; // For showing alert messages
import { MaterialModule } from '../../../../shared/material.module'; // MaterialModule for using Angular Material components
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { BaseComponent } from '../../../../base/base.components';

@Component({
  selector: 'app-edit', // Component selector for use in HTML
  imports: [MaterialModule], // Import the MaterialModule for using Angular Material components in the template
  templateUrl: './edit.component.html', // Path to the HTML template for the component
  styleUrl: './edit.component.scss' // Path to the component's SCSS for styling
})
export class EditComponent extends BaseComponent{

  // Constructor for injecting necessary dependencies
  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<EditComponent>, // Reference to the dialog window, used to close the dialog
    @Inject(MAT_DIALOG_DATA) public data: LicenseCategory, // Injected data passed from the dialog component (the license category object)
  ) {
    super(deps)
  }

  // Method to handle saving the updated license category
  onSave(): void {
    // Prepare the updated data for the license category
    const updatedData: Partial<LicenseCategory> = {
      licenseCategory: this.data.licenseCategory, // Only the description is updated here
    };
  
    // Call the service to update the license category via an API request
    this.adminService.updateLicenseCategory(this.data.id, updatedData).subscribe(
      () => {
        // If the update is successful, show a success message and close the dialog
        Swal.fire('Updated!', 'License Category updated successfully.', 'success');
        this.dialogRef.close(true); // Close the dialog and pass `true` to indicate success
      },
      error => {
        // If there is an error, show an error message and log the error to the console
        Swal.fire('Error!', 'Failed to update the license category.', 'error');
        console.error('Error updating license category:', error);
      }
    );
  }  

  // Method to handle canceling the dialog without saving
  onCancel(): void {
    this.dialogRef.close(); // Close the dialog without making any changes
  }
}
