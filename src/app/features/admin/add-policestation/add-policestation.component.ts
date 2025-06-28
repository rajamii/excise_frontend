import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';  
import { RouterModule } from '@angular/router'; 
import { BaseComponent } from '../../../base/base.components';  // Import base component for common functionality
import { BaseDependency } from '../../../base/dependency/base.dependency';  // Import base dependency class
import { Subdivision } from '../../../core/models/subdivision.model';  // Import SubDivision model
import { PatternConstants } from '../../../shared/constants/pattern.constants';  // Import constant patterns
import { PoliceStation } from '../../../core/models/policestation.model';  // Import PoliceStation model
import Swal from 'sweetalert2';  // Import Swal for sweetalert2 dialog

@Component({
  selector: 'app-add-policestation',  // Define component selector
  imports: [MaterialModule, RouterModule],  // Import necessary modules for the component
  templateUrl: './add-policestation.component.html',  // Define the HTML template for the component
  styleUrl: './add-policestation.component.scss'  // Define the SCSS style for the component
})
export class AddPolicestationComponent extends BaseComponent implements OnInit {
  patternConstants = PatternConstants;  // Initialize pattern constants
  subdivisions: Subdivision[] = [];  // Array to hold subdivision data
  policeStation!: PoliceStation;  // Initialize police station object

  // Constructor for the component, injecting dependencies
  constructor(deps: BaseDependency) {
    super(deps);  // Call the constructor of the base class
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
  save(): void {
    // Show confirmation dialog before saving
    this.myswal
      .fire({
        title: 'Are you sure?',  // Confirmation dialog title
        text: 'You want to add a police station with given details?',  // Dialog text
        icon: 'warning',  // Warning icon
        showCancelButton: true,  // Show cancel button
        confirmButtonText: 'Save',  // Text for confirm button
        cancelButtonText: 'Cancel',  // Text for cancel button
      })
      .then((submit: { isConfirmed: boolean }) => {  // Check if the user confirmed the action
        if (submit.isConfirmed) {
          // If confirmed, make the API call to add the police station
          this.adminService.addPoliceStation(this.policeStation).subscribe((res: any) => {
            this.toastrService.success(res.message);  // Show success toast

            // Show success dialog after successful addition
            Swal.fire({
              title: 'Success!',  // Dialog title
              text: 'Police Station has been added successfully.',  // Success message
              icon: 'success',  // Success icon
              confirmButtonText: 'OK'  // Confirm button text
            }).then(() => {
              // Navigate to the police station list page after success
              this.router.navigate(['/admin/police-stations']);
            });
    
          }, error => {
            // Log error and show error toast if the API call fails
            console.error("Error saving police station:", error);
            this.toastrService.error("Failed to save police station.");
          });
        }
      });
  }

  // Method to handle cancel action
  cancel(): void {
    history.back();  // Navigate back in the browser history
    
    // Alternatively, navigate to the police station list page
    this.router.navigate(['/site-admin/list-policestation']);
  }
}
