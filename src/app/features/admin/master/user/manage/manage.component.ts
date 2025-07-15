import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Account } from '../../../../../core/models/account.model';
import { District } from '../../../../../core/models/district.model';
import { Subdivision } from '../../../../../core/models/subdivision.model';
import { Role } from '../../../../../core/models/role.model';
import Swal from 'sweetalert2';
import { BaseDependency } from '../../../../../base/dependency/base.dependency';
import { BaseComponent } from '../../../../../base/base.components';

@Component({
  selector: 'app-manage-user',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent extends BaseComponent implements OnInit {
  user: Account = {
    id: 0,
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phoneNumber: '',
    district: {} as District,
    subdivision: {} as Subdivision,
    address: '',
    role: {} as Role,
    isActive: true,
    password: '',
    confirmPassword: ''
  };

  isEditMode = false;
  districts: District[] = [];
  subdivisions: Subdivision[] = [];
  filteredSubdivisions: Subdivision[] = [];
  roles: Role[] = [];

  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Account | null
  ) {
    super(deps)
  }

  ngOnInit(): void {
    this.loadDistricts();
    this.loadRoles();
    this.loadSubdivisions(() => {
      if (this.data) {
        this.user = { ...this.data };
        this.isEditMode = true;
        
        // Handle case where backend might send numbers instead of objects
        if (this.user.district && typeof this.user.district === 'object') {
          // Already in correct format
        } else if (typeof this.user.district === 'number') {
          const districtCode = this.user.district;
          const district = this.districts.find(d => d.districtCode === districtCode);
          this.user.district = district || {} as District;
        }

        if (this.user.subdivision && typeof this.user.subdivision === 'object') {
          // Already in correct format
        } else if (typeof this.user.subdivision === 'number') {
          const subdivisionCode = this.user.subdivision;
          const subdivision = this.subdivisions.find(s => s.subdivisionCode === subdivisionCode);
          this.user.subdivision = subdivision || {} as Subdivision;
        }

        // Initialize filtered subdivisions
        if (this.user.district?.districtCode) {
          this.onDistrictChange(this.user.district.districtCode);
          
          // Ensure subdivision belongs to selected district
          if (this.user.subdivision?.subdivisionCode && 
              this.user.subdivision.districtCode !== this.user.district.districtCode) {
            this.user.subdivision = {} as Subdivision;
          }
        }
      }
    });
  }

  loadDistricts(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => this.districts = data,
      error: () => Swal.fire('Error', 'Failed to load districts.', 'error')
    });
  }

  loadSubdivisions(callback?: () => void): void {
    this.masterService.getSubdivision().subscribe({
      next: (data) => {
        this.subdivisions = data;
        callback?.();
      },
      error: () => Swal.fire('Error', 'Failed to load subdivisions.', 'error')
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (data) => this.roles = data,
      error: () => Swal.fire('Error', 'Failed to load roles.', 'error')
    });
  }

  onDistrictChange(districtCode: number): void {
    this.user.subdivision = {} as Subdivision; // Reset subdivision when district changes
    this.filteredSubdivisions = this.subdivisions.filter(
      s => s.districtCode === districtCode
    );
  }

  onSave(): void {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phoneNumber',
      'district', 'subdivision', 'address', 'role'
    ];    
    const userObj = this.user as any;

    for (const field of requiredFields) {
      if (!userObj[field]) {
        Swal.fire('Warning', 'Please fill all required fields.', 'warning');
        return;
      }
    }

    if (!this.isEditMode && this.user.password !== this.user.confirmPassword) {
      Swal.fire('Warning', 'Passwords do not match.', 'warning');
      return;
    }

    const userPayload: any = {
      ...this.user,
      district: this.user.district.districtCode,
      subdivision: this.user.subdivision.subdivisionCode,
      role: this.user.role.id
    };

    if (this.isEditMode) {
      userPayload.id = this.user.id;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update User?' : 'Add User?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.adminService.updateUser(this.user.id, userPayload)
        : this.adminService.addUser(userPayload);

      request.subscribe({
        next: (res: any) => {
          if (this.isEditMode) {
            Swal.fire('Success', 'User updated!', 'success');
          } else {
            Swal.fire({
              icon: 'success',
              title: 'User added!',
              html: `Generated username: <strong>${res.userId}</strong>
              `
            });
          }
          this.dialogRef.close(true);
        },
        error: () => {
          Swal.fire('Error', 'Failed to save user.', 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}