import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module'; 
import { BaseComponent } from '../../../../base/base.components';  // Import base component for common functionality
import { BaseDependency } from '../../../../base/dependency/base.dependency'; // Import base dependency class
import { Subdivision } from '../../../../core/models/subdivision.model';  // Import SubDivision model
import { PatternConstants } from '../../../../shared/constants/pattern.constants'; // Import constant patterns
import { PoliceStation } from '../../../../core/models/policestation.model';  // Import PoliceStation model
import Swal from 'sweetalert2';  // Import Swal for sweetalert2 dialog
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add',  // Define component selector
  imports: [MaterialModule],  // Import necessary modules for the component
  templateUrl: './add.component.html',  // Define the HTML template for the component
  styleUrl: './add.component.scss'  // Define the SCSS style for the component
})
export class AddComponent extends BaseComponent implements OnInit {
  patternConstants = PatternConstants;  // Initialize pattern constants
  subdivisions: Subdivision[] = [];  // Array to hold subdivision data
  policeStation!: PoliceStation;  // Initialize police station object

  // Constructor for the component, injecting dependencies
  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<AddComponent>
  ) { 
    super(deps)
  }

  // OnInit lifecycle hook
  ngOnInit(): void {
    this.policeStation = new PoliceStation();  // Initialize a new PoliceStation object

    // Fetch subdivisions from the SiteAdminService and assign to subdivisions array
    this.masterService.getSubdivision().subscribe(res => {
      this.subdivisions = res;
    });
  }

  // Method to save police station details
  onSave(): void {
    // Show confirmation dialog before saving
    Swal.fire({
        title: 'Are you sure?',  // Confirmation dialog title
        text: 'You want to add a police station with given details?',  // Dialog text
        icon: 'warning',  // Warning icon
        showCancelButton: true,  // Show cancel button
        confirmButtonText: 'Save',  // Text for confirm button
        cancelButtonText: 'Cancel',  // Text for cancel button
      }).then((result) => {  // Check if the user confirmed the action
        if (!result.isConfirmed) return;

        // If confirmed, make the API call to add the police station
        this.adminService.addPoliceStation(this.policeStation).subscribe({
          next: () => {
            // On success, show success dialog and navigate to list page
            Swal.fire('Success', 'Police Station Added Successfully!', 'success');
            this.dialogRef.close(true);
          },
          error: (error) => {
          // Log error and show error toast if the API call fails
          Swal.fire('Error', 'Failed to add Police Station', 'error');
          console.error("Error adding police station:", error);
        }
      });
    });
  }

  // Method to handle cancel action
  onCancel(): void {
    this.dialogRef.close();
  }
}