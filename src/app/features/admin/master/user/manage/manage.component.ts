// manage-user.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Account } from '../../../../../core/models/account.model';
import { District } from '../../../../../core/models/district.model';
import { Subdivision } from '../../../../../core/models/subdivision.model';
import { Role } from '../../../../../core/models/role.model';
import { BaseDependency } from '../../../../../base/dependency/base.dependency';
import { BaseComponent } from '../../../../../base/base.components';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent extends BaseComponent implements OnInit {
  patternConstants = PatternConstants;

  user: Account = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    district: {} as District,
    subdivision: {} as Subdivision,
    address: '',
    role: {} as Role,
    isActive: true,
  };

  isEditMode = false;
  districts: District[] = [];
  subdivisions: Subdivision[] = [];
  filteredSubdivisions: Subdivision[] = [];
  roles: Role[] = [];

  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Account | null // Injected if editing
  ) {
    super(deps);
  }

  ngOnInit(): void {
    this.loadDistricts();
    this.loadRoles();

    if (this.data) {
      this.user = { ...this.data };
      this.isEditMode = true;

      // Load subdivisions and then map values properly
      if (this.user.district?.districtCode) {
        this.loadSubdivisions(this.user.district.districtCode, true);
      }
    }
  }

  loadDistricts(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => {
        this.districts = data;
        if (this.isEditMode && this.user.district?.districtCode) {
          this.user.district = this.districts.find(
            d => d.districtCode === this.user.district?.districtCode
          )!;
        }
      },
      error: () => Swal.fire('Error', 'Failed to load districts.', 'error'),
    });
  }

  loadSubdivisions(districtCode: number, isInit = false): void {
    this.masterService.getSubdivision().subscribe({
      next: (data) => {
        this.subdivisions = data;
        this.filteredSubdivisions = data.filter(
          sub => sub.districtCode === districtCode
        );

        if (isInit && this.user.subdivision?.subdivisionCode) {
          this.user.subdivision = this.filteredSubdivisions.find(
            s => s.subdivisionCode === this.user.subdivision?.subdivisionCode
          )!;
        }
      },
      error: () => Swal.fire('Error', 'Failed to load subdivisions.', 'error'),
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (data) => {
        this.roles = data;
        if (this.isEditMode && this.user.role?.id) {
          this.user.role = this.roles.find(r => r.id === this.user.role!.id)!;
        }
      },
      error: () => Swal.fire('Error', 'Failed to load roles.', 'error'),
    });
  }

  onDistrictChange(): void {
    if (this.user.district?.districtCode) {
      this.loadSubdivisions(this.user.district.districtCode);
      this.user.subdivision = {} as Subdivision; // Reset subdivision when district changes
    }
  }

  passwordsMatch(): boolean {
    return this.user.password === this.user.confirmPassword;
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update User?' : 'Add User?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload = { ...this.user };

      const request = this.isEditMode
        ? this.adminService.updateUser(payload.id!, payload)
        : this.adminService.addUser(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated!' : 'Added!', 'success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          Swal.fire('Error', err.error?.message || 'Failed to save user.', 'error');
        },
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}