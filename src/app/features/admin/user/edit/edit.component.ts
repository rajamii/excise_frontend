import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subdivision } from '../../../../core/models/subdivision.model';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { Account } from '../../../../core/models/accounts';
import { District } from '../../../../core/models/district.model';
import { BaseComponent } from '../../../../base/base.components';
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { Role } from '../../../../core/models/role';

@Component({
  selector: 'app-edit',
  imports: [MaterialModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent extends BaseComponent implements OnInit{
  districts: District[] = []; // Array to hold all districts
  subdivisons: Subdivision[] = []; // Array to hold all subdivisions
  filteredSubdivisions: Subdivision[] = []; // Array to hold filtered subdivisions based on district
  roles: Role[] = [];

  // Constructor injection of dependencies
  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<EditComponent>, // Dialog reference to manage the dialog box
    @Inject(MAT_DIALOG_DATA) public data: Account, // Injects the data passed to the dialog (user data)
  ) {
    super(deps)
  }

  ngOnInit(): void {
    this.loadDistricts();
    this.loadRoles();
    this.loadSubdivisions(() => {
      const districtCode = typeof this.data.district === 'object'
        ? this.data.district.districtCode
        : Number(this.data.district);

      if (districtCode) {
        this.onDistrictChange(districtCode);
      }
    });
  }

  // Method to load all districts from the backend
  loadDistricts(): void {
    this.masterService.getDistrict().subscribe((data: District[]) => {
      this.districts = data; // Store the fetched districts
    }, error => {
      this.toastrService.error('Failed to load districts.'); // Show error if districts loading fails
    });
  }

  // Method to load all subdivisions from the backend
  loadSubdivisions(callback?: () => void): void {
    this.masterService.getSubdivision().subscribe(
      (data: Subdivision[]) => {
        this.subdivisons = data;
        callback?.();
      },
      error => {
        this.toastrService.error('Failed to load subdivisions.');
      }
    );
  }

  // Method to get the role
  loadRoles(): void {
    this.userService.getRoles().subscribe((data: Role[]) => {
      this.roles = data;

      
      // Match by name since data.role is a name string like "licensee"
      const matchedRole = this.roles.find(role => {
        if (typeof this.data.role === 'string') {
          return role.name === this.data.role;
        } else if (typeof this.data.role === 'object') {
          return role.id === this.data.role.id;
        }
        return false;
      });

      if (matchedRole) {
        this.data.role = matchedRole;
      } else {
        console.warn("No matched role for:", this.data.role);
      }

    }, error => {
      this.toastrService.error('Failed to load roles.');
    });
  }

  // Method to filter subdivisions based on the selected district
  onDistrictChange(code: number): void {
    this.filteredSubdivisions = this.subdivisons.filter(
      subDiv => subDiv.districtCode === code
    );
  }

  // Method to handle the saving of the updated subdivision data
  onSave(): void {
    // Create an updatedData object with the changes made to the subdivision
    const updatedData = {
      firstName: this.data.firstName,
      middleName: this.data.middleName,
      lastName: this.data.lastName,
      email: this.data.email,
      phoneNumber: this.data.phoneNumber,
      district: this.data.district,
      subdivision: this.data.subdivision,
      address: this.data.address,
      role: this.data.role?.id
    };

    // Make an API call to update the subdivision
    this.userService.updateUser(this.data.username, updatedData).subscribe(
      () => {
        // On success, show a success alert and close the dialog
        Swal.fire('Updated!', 'User Data updated successfully.', 'success');
        this.dialogRef.close(true); // Close the dialog and pass true to indicate success
      },
      error => {
        // On failure, show an error alert and log the error
        Swal.fire('Error!', 'Failed to update the user data.', 'error');
        console.error('Error updating user data:', error);
      }
    );
  }

  // Method to close the dialog without saving any changes
  onCancel(): void {
    this.dialogRef.close(); // Simply close the dialog without making any changes
  }
}
