import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';  // Import Angular Material Dialog modules
import { LicenseType } from '../../../../core/models/license-type.model';  // Import the LicenseType model
import Swal from 'sweetalert2';  // Import SweetAlert2 for user-friendly alerts
import { MaterialModule } from '../../../../shared/material.module';  // Import Material Design modules
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { BaseComponent } from '../../../../base/base.components';

@Component({
  selector: 'app-edit-licensetype',  // The component's selector
  imports: [MaterialModule],  // Material modules needed for the component
  templateUrl: './edit-licensetype.component.html',  // Template for the component
  styleUrl: './edit-licensetype.component.scss'  // Styling for the component
})
export class EditLicensetypeComponent extends BaseComponent{
  
  // The constructor for initializing the component with the dialog reference and data passed from the parent component
  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<EditLicensetypeComponent>,  // Reference to the dialog for closing it
    @Inject(MAT_DIALOG_DATA) public data: LicenseType,  // Inject data from the parent component (license type details)
  ) {
    super(deps)
  }

  // Method to handle saving the updated license type
  onSave(): void {
    // Prepare the updated data object with the license type details
    const updatedData: Partial<LicenseType> = {
      id: this.data.id,  // Preserve the ID of the license type for updating
      licenseType: this.data.licenseType,  // Use the updated license type name from the input
    };
    
    // Call the service to update the license type via the API
    this.adminService.updateLicenseType(this.data.id, updatedData).subscribe(
      () => {
        // If the update is successful, show a success alert and close the dialog
        Swal.fire('Updated!', 'License Type updated successfully.', 'success');
        this.dialogRef.close(true);  // Pass 'true' to indicate the update was successful
      },
      error => {
        // If an error occurs, show an error alert and log the error
        Swal.fire('Error!', 'Failed to update the license type.', 'error');
        console.error('Error updating license type:', error);
      }
    );
  }

  // Method to handle closing the dialog without saving
  onCancel(): void {
    this.dialogRef.close();  // Simply close the dialog without making changes
  }
}
