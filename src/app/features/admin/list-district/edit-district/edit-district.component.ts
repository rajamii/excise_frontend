// Import required Angular core and Material components
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { District } from '../../../../core/models/district.model';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { BaseComponent } from '../../../../base/base.components';

@Component({
  selector: 'app-edit-district', // Component selector
  imports: [MaterialModule],     // Standalone imports
  templateUrl: './edit-district.component.html', // Template file
  styleUrl: './edit-district.component.scss'     // Styling file
})
export class EditDistrictComponent extends BaseComponent{

  // Inject dialog reference to control the dialog and pass data into it
  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<EditDistrictComponent>, // Used to close the dialog and return data
    @Inject(MAT_DIALOG_DATA) public data: District,        // Injected data from the parent component
  ) {
    super(deps)
  }

  // Method to save updated district details
  onSave(): void {
    // Prepare updated object with only required fields
    const updatedData: Partial<District> = {
      district: this.data.district,
      districtNameLl: this.data.districtNameLl,
      districtCode: this.data.districtCode,
    };

    // Call the update API and handle success or error
    this.adminService.updateDistrict(this.data.id, updatedData).subscribe(
      () => {
        Swal.fire('Updated!', 'District updated successfully.', 'success'); // Success alert
        this.dialogRef.close(true); // Close the dialog and pass success flag
      },
      error => {
        Swal.fire('Error!', 'Failed to update the district.', 'error'); // Error alert
        console.error('Error updating district:', error); // Log error
      }
    );
  }

  // Method to cancel editing and close the dialog without saving
  onCancel(): void {
    this.dialogRef.close(); // Close the dialog without passing data
  }
}
