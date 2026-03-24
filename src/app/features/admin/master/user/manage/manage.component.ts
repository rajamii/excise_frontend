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
import { UserPayload } from '../../../admin.service';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent extends BaseComponent implements OnInit {
  // Import pattern constants for form validation
  patternConstants = PatternConstants;

  // Initialize empty user object with default values
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

  // Flag to determine if we're in edit mode
  isEditMode = false;
  // Arrays to store dropdown options
  districts: District[] = [];
  subdivisions: Subdivision[] = [];
  // Filtered subdivisions based on selected district
  filteredSubdivisions: Subdivision[] = [];
  roles: Role[] = [];

  constructor(
    deps: BaseDependency,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Account | null // Injected data when editing existing user
  ) {
    super(deps);
  }

  ngOnInit(): void {
    // Check if we're editing an existing user
    if (this.data) {
      // Clone the user data to avoid direct mutation
      this.user = { ...this.data };
      this.normalizeEditData();
      this.isEditMode = true;
    }
    this.loadDistricts();
    this.loadRoles();
  }

  /**
   * Normalizes list API response shape for edit form models.
   * Backend list returns district/subdivision as { code, name },
   * while form expects { districtCode/subdivisionCode, district/subdivision }.
   */
  private normalizeEditData(): void {
    const districtAny = this.user.district as any;
    if (districtAny && districtAny.code !== undefined && districtAny.districtCode === undefined) {
      this.user.district = {
        ...districtAny,
        districtCode: Number(districtAny.code),
        district: districtAny.name ?? districtAny.district,
      } as District;
    }

    const subdivisionAny = this.user.subdivision as any;
    if (
      subdivisionAny &&
      subdivisionAny.code !== undefined &&
      subdivisionAny.subdivisionCode === undefined
    ) {
      this.user.subdivision = {
        ...subdivisionAny,
        subdivisionCode: Number(subdivisionAny.code),
        subdivision: subdivisionAny.name ?? subdivisionAny.subdivision,
      } as Subdivision;
    }
  }

  private getDistrictCode(): number | undefined {
    const districtAny = this.user.district as any;
    return districtAny?.districtCode ?? districtAny?.code;
  }

  private getSubdivisionCode(): number | undefined {
    const subdivisionAny = this.user.subdivision as any;
    return subdivisionAny?.subdivisionCode ?? subdivisionAny?.code;
  }

  /**
   * Load all districts for the dropdown
   */
  loadDistricts(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => {
        this.districts = data;
        // If editing, find and set the exact district object from the loaded list
        if (this.isEditMode && this.user.district?.districtCode) {
          this.user.district = this.districts.find(
            d => d.districtCode === this.user.district?.districtCode
          );
          if (this.user.district) {
            this.loadSubdivisions(this.user.district.districtCode, true);
          }
        }
      },
      error: () => Swal.fire('Error', 'Failed to load districts.', 'error'),
    });
  }

  /**
   * Load subdivisions for a specific district
   * @param districtCode - The district code to filter subdivisions
   * @param isInit - Flag to indicate if this is initial load during edit
   */
  loadSubdivisions(districtCode: number, isInit = false): void {
    this.masterService.getSubdivision().subscribe({
      next: (data) => {
        this.subdivisions = data;
        // Filter subdivisions based on selected district
        this.filteredSubdivisions = data.filter(
  (sub: Subdivision) => sub.districtCode === districtCode
);

        // If initial load during edit, find and set the exact subdivision
        if (isInit && this.user.subdivision?.subdivisionCode) {
          this.user.subdivision = this.filteredSubdivisions.find(
            s => s.subdivisionCode === this.user.subdivision?.subdivisionCode
          )!;
        }
      },
      error: () => Swal.fire('Error', 'Failed to load subdivisions.', 'error'),
    });
  }

  /**
   * Load all available roles for the dropdown
   */
  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (data) => {
        this.roles = data;
        // If editing, find and set the exact role object
        if (this.isEditMode && this.user.role?.id) {
          this.user.role = this.roles.find(r => r.id === this.user.role!.id)!;
        }
      },
      error: () => Swal.fire('Error', 'Failed to load roles.', 'error'),
    });
  }

  /**
   * Handler for district dropdown change
   * Loads subdivisions for the selected district and resets subdivision selection
   */
  onDistrictChange(): void {
    if (this.user.district?.districtCode) {
      this.loadSubdivisions(this.user.district.districtCode);
      this.user.subdivision = {} as Subdivision; // Reset subdivision selection
    }
  }

  /**
   * Validates if password and confirm password match
   * @returns boolean indicating if passwords match
   */
  passwordsMatch(): boolean {
    return this.user.password === this.user.confirmPassword;
  }

  /**
   * Save handler for both create and update operations
   * Shows confirmation dialog before proceeding
   */
  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update User?' : 'Add User?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
    }).then((result) => {
      if (!result.isConfirmed) return;

      // Build base payload for both create and update
      const payload: UserPayload = {
        email: this.user.email,
        role: this.user.role?.id,
        firstName: this.user.firstName,
        middleName: this.user.middleName || '',
        lastName: this.user.lastName,
        phoneNumber: this.user.phoneNumber,
        district: this.getDistrictCode(),
        subdivision: this.getSubdivisionCode(),
        address: this.user.address,
        isActive: this.user.isActive,
      };

      // Password fields are required only while creating a new user
      if (!this.isEditMode) {
        payload.password = this.user.password;
        payload.confirmPassword = this.user.confirmPassword;
      }

      console.log('payload being sent:', payload);

      // Determine which API call to make based on edit mode
      // FIXED: Use this.user.id (number) instead of this.user.username (string)
      const request = this.isEditMode
        ? this.adminService.updateUser(this.user.id!, payload)
        : this.adminService.addUser(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated!' : 'Added!', 'success');
          // Close dialog with success flag
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          let message = err?.error?.message || err?.error?.detail || '';
          const backendError = err?.error;

          if (!message && backendError) {
            if (typeof backendError === 'string') {
              message = backendError;
            } else if (typeof backendError === 'object') {
              const fieldMessages = Object.entries(backendError)
                .map(([field, value]) => {
                  const text = Array.isArray(value) ? value.join(', ') : String(value);
                  return `${field}: ${text}`;
                })
                .join('\n');
              message = fieldMessages;
            }
          }

          if (!message) {
            message = 'Failed to save user.';
          }

          Swal.fire('Error', message, 'error');
        },
      });
    });
  }

  /**
   * Cancel handler - closes the dialog without saving
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}
