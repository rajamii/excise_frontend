import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependency';
import { District } from '../../../core/models/district.model';
import { State } from '../../../core/models/state.model';
import { PatternConstants } from '../../../shared/constants/pattern.constants';
import { Subdivision } from '../../../core/models/subdivision.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-subdivision',
  imports: [MaterialModule, RouterModule],
  templateUrl: './add-subdivision.component.html',
  styleUrl: './add-subdivision.component.scss'
})
export class AddSubdivisionComponent extends BaseComponent implements OnInit {
  // Constants for pattern validation
  patternConstants = PatternConstants;
  // Arrays to store states and districts data
  states: State[] = [];
  districts: District[] = [];
  // Objects to store selected state, district, and subdivision data
  state!: State;
  selectedDistrict!: District;
  subdivision!: Subdivision;

  constructor(deps: BaseDependency) {
    super(deps); // Call to the base constructor
  }

  ngOnInit(): void {
    // Initializing state and subdivision objects
    this.state = new State();
    this.state.stateCode = 11;
    this.state.state = 'Sikkim';
    this.states[0] = this.state; // Adding the state to the states array
    this.subdivision = new Subdivision();
    
    // Fetch active districts from the service
    this.masterService.getDistrict().subscribe(res => {
      // Filter out inactive districts
      this.districts = res.filter((district: District) => district.isActive === true);
    });
    
    // Default value for IsActive in the subdivision
    this.subdivision.isActive = true;
  }

  // Method to save the subdivision
  save(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to add subdivision with given details?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
    }).then((submit) => {
      if (submit.isConfirmed) {
        // Make a service call to save the subdivision
        this.adminService.saveSubDivision(this.subdivision).subscribe(res => {
          // Show success message
          this.toastrService.success(res.message);

          // Success Swal alert
          Swal.fire({
            title: 'Success!',
            text: 'Subdivision has been added successfully.',
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(() => {
            // Redirect to the list of subdivisions after success
            this.router.navigate(['/admin/subdivisions']);
          });

        }, error => {
          console.error("Error saving subdivision:", error);
          this.toastrService.error("Failed to save subdivision.");
        });
      }
    });
  }
  
  // Method to handle cancel action and go back
  cancel(): void {
    history.back();
  }
}
