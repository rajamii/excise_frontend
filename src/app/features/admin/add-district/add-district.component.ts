import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependency';
import { District } from '../../../core/models/district.model';
import { State } from '../../../core/models/state.model';
import { PatternConstants } from '../../../shared/constants/pattern.constants';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-add-district', // HTML tag for this component
  imports: [MaterialModule, RouterModule], // Modules to be used in this component
  templateUrl: './add-district.component.html', // HTML template
  styleUrl: './add-district.component.scss' // SCSS stylesheet
})
export class AddDistrictComponent extends BaseComponent implements OnInit {

  // Pattern constants used for input validation
  patternConstants = PatternConstants;

  // List of available states (currently mocked)
  states: State[] = [];

  // Current selected state
  state!: State;

  // District model bound to form
  district!: District;

  // Constructor with dependency injection
  constructor(deps: BaseDependency) {
    super(deps); // Calls constructor of BaseComponent
  }

  // Lifecycle hook to initialize data when component loads
  ngOnInit(): void {
    // Set default state - hardcoded for now
    this.state = new State();
    this.state.stateCode = 11;
    this.state.state = 'Sikkim';
    this.states[0] = this.state;

    // Initialize district model and set default value
    this.district = new District();
    this.district.isActive = true;
  }

  // Save function called when user clicks "Save"
  save(): void {
    console.log("Save button clicked!", this.district);

    // Show confirmation dialog using SweetAlert
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to add district with given details?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
    }).then((submit) => {
      if (submit.isConfirmed) {
        // Call service to save district data
        this.adminService.saveDistrict(this.district).subscribe(res => {
          // Show success message
          this.toastrService.success(res.message);

          // Show confirmation dialog after successful save
          Swal.fire({
            title: 'Success!',
            text: 'District has been added successfully.',
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(() => {
            // Redirect to list of districts
            this.router.navigate(['/admin/districts']);
          });

        }, error => {
          // Show error message if save fails
          console.error("Error saving district:", error);
          this.toastrService.error("Failed to save district.");
        });
      }
    });
  }

  // Cancel function navigates back in browser history
  cancel(): void {
    history.back();
  }
}
