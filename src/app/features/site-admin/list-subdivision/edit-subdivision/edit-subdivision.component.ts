import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'; // For dialog handling
import { SiteAdminService } from '../../site-admin-service'; // Service for API calls
import { District } from '../../../../core/models/district.model'; // District model
import { Subdivision } from '../../../../core/models/subdivision.model'; // Subdivision model
import Swal from 'sweetalert2'; // For displaying alerts
import { MaterialModule } from '../../../../shared/material.module'; // Material module import

@Component({
  selector: 'app-edit-subdivision', // Component selector
  imports: [MaterialModule], // Import necessary Material module
  templateUrl: './edit-subdivision.component.html', // HTML template for the component
  styleUrl: './edit-subdivision.component.scss' // Styles for the component
})
export class EditSubdivisionComponent {
  districts: District[] = []; // Array to hold all districts

  // Constructor injection of dependencies
  constructor(
    public dialogRef: MatDialogRef<EditSubdivisionComponent>, // Dialog reference to manage the dialog box
    @Inject(MAT_DIALOG_DATA) public data: Subdivision, // Injects the data passed to the dialog (subdivision data)
    private siteAdminService: SiteAdminService // Service to interact with the backend API
  ) {}

  // Lifecycle hook called on component initialization
  ngOnInit(): void {
    this.loadDistricts(); // Load all districts when the component initializes
  }

  // Method to load all districts from the backend
  loadDistricts(): void {
    this.siteAdminService.getDistrict().subscribe(
      (districts) => {
        this.districts = districts; // Assign fetched districts to the districts array
      },
      (error) => {
        console.error('Error fetching districts:', error); // Log any error fetching districts
      }
    );
  }

  // Method triggered when the user selects a district from the dropdown
  onDistrictChange(selectedDistrict: District): void {
    if (selectedDistrict) {
      // If a district is selected, update the data with the selected district's details
      this.data.district = selectedDistrict.district;
      this.data.districtCode = selectedDistrict.districtCode;
    }
  }

  // Method to handle the saving of the updated subdivision data
  onSave(): void {
    // Create an updatedData object with the changes made to the subdivision
    const updatedData = { 
      subdivision: this.data.subdivision,
      subdivisionNameLl: this.data.subdivisionNameLl,
      subdivisionCode: this.data.subdivisionCode,
      district: this.data.district,
      districtCode: this.data.districtCode
    };

    // Make an API call to update the subdivision
    this.siteAdminService.updateSubDivision(this.data.id, updatedData).subscribe(
      () => {
        // On success, show a success alert and close the dialog
        Swal.fire('Updated!', 'District updated successfully.', 'success');
        this.dialogRef.close(true); // Close the dialog and pass true to indicate success
      },
      error => {
        // On failure, show an error alert and log the error
        Swal.fire('Error!', 'Failed to update the district.', 'error');
        console.error('Error updating district:', error);
      }
    );
  }

  // Method to close the dialog without saving any changes
  onCancel(): void {
    this.dialogRef.close(); // Simply close the dialog without making any changes
  }
}
