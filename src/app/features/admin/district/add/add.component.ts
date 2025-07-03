import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { BaseComponent } from '../../../../base/base.components';
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { District } from '../../../../core/models/district.model';
import { State } from '../../../../core/models/state.model';
import { PatternConstants } from '../../../../shared/constants/pattern.constants';
import Swal from 'sweetalert2';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add', // HTML tag for this component
  imports: [MaterialModule], // Modules to be used in this component
  templateUrl: './add.component.html', // HTML template
  styleUrl: './add.component.scss' // SCSS stylesheet
})
export class AddComponent extends BaseComponent implements OnInit {

  // Pattern constants used for input validation
  patternConstants = PatternConstants;

  // List of available states (currently mocked)
  states: State[] = [];

  // Current selected state
  state!: State;

  // District model bound to form
  district!: District;

  // Constructor with dependency injection
  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<AddComponent>
  ) {
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
    this.district.stateCode = this.state.stateCode;
  }

  // Save function called when user clicks "Save"
  onSave(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to add district with given details?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.adminService.saveDistrict(this.district).subscribe({
        next: () => {
          // On success, show success dialog and navigate to list page
          Swal.fire('Success', 'District Added Successfully!', 'success');
          this.dialogRef.close(true);
        }, 
        error: (error) => {
          // Show error message if save fails
          Swal.fire('Error', 'Failed to add District', 'error');
          console.error("Error saving district:", error);
        }
      });
    });
  }

  // Method to handle cancel action
  onCancel(): void {
    this.dialogRef.close();
  }
}
