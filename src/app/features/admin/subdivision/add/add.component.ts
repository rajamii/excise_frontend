import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { BaseComponent } from '../../../../base/base.components';
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { District } from '../../../../core/models/district.model';
import { PatternConstants } from '../../../../shared/constants/pattern.constants';
import { Subdivision } from '../../../../core/models/subdivision.model';
import Swal from 'sweetalert2';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add',
  imports: [MaterialModule],
  templateUrl: './add.component.html',
  styleUrl: './add.component.scss'
})
export class AddComponent extends BaseComponent implements OnInit {
  // Constants for pattern validation
  patternConstants = PatternConstants;
  // Array to save district data
  districts: District[] = [];
  // Objects to store selected district, and subdivision data
  selectedDistrict!: District;
  subdivision!: Subdivision;

  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<AddComponent>
  ) {
    super(deps); // Call to the base constructor
  }

  ngOnInit(): void {
    // Initializing state and subdivision objects
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
  onSave(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to add subdivision with given details?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      // Make a service call to save the subdivision
      this.adminService.saveSubDivision(this.subdivision).subscribe({
        next: () => {
          // On success, show success dialog and navigate to list page
          Swal.fire('Success', 'Subdivision Added Successfully!', 'success');
          this.dialogRef.close(true);
        }, 
        error: (error) => {
          Swal.fire('Error', 'Failed to Subdivision', 'error');
          console.error("Error saving subdivision:", error);
        }
      });
    });
  }
  
  // Method to handle cancel action
  onCancel(): void {
    this.dialogRef.close();
  }
}
