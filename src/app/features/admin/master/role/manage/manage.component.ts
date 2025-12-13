import { Component, Inject, OnInit } from '@angular/core';
import { Role } from '../../../../../core/models/role.model';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminService } from '../../../admin.service';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrls: ['./manage.component.scss']
})
export class ManageComponent implements OnInit {
  role: Role = new Role();
  isEditMode = false;

  // Checkbox maps
  canViewMap: { [key: string]: boolean } = {};
  canAddMap: { [key: string]: boolean } = {};
  canUpdateMap: { [key: string]: boolean } = {};
  canDeleteMap: { [key: string]: boolean } = {};

  // App keys
  appLabels: string[] = [
    'user',
    'roles',
    '/masters//',
    '/license_application/',
    'salesman_barman_registration',
    '/company_registration/',
    '/contact_us//'
  ];

  // Display map for UI
  appDisplayMap: { [key: string]: string } = {
    'salesman_barman_registration': 'Salesman/Barman Registration',
    '/company_registration/': 'Company Registration',
    '/license_application/': 'License Application',
    '/contact_us//': 'Contact Us',
    '/masters//': 'Masters',
    'roles': 'Roles',
    'user': 'User'
  };

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Role | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.role = new Role(this.data);
      this.isEditMode = true;

      // Pre-fill checkbox maps
      this.populatePermissionMap(this.canViewMap, this.role.canView);
      this.populatePermissionMap(this.canAddMap, this.role.canAdd);
      this.populatePermissionMap(this.canUpdateMap, this.role.canUpdate);
      this.populatePermissionMap(this.canDeleteMap, this.role.canDelete);
    }
  }

  // Fill permission map based on existing permissions
  populatePermissionMap(map: { [key: string]: boolean }, permissions: string[]): void {
    this.appLabels.forEach(app => {
      map[app] = permissions.includes(app);
    });
  }

  // Convert checkbox state to list
  getSelectedPermissions(map: { [key: string]: boolean }): string[] {
    return Object.keys(map).filter(key => map[key]);
  }

  // Save role (add or edit)
  onSave(): void {
    Swal.fire({
      title: 'Are you sure?',
      text: this.isEditMode ? 'You want to update this Role?' : 'You want to add this Role?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then(result => {
      if (!result.isConfirmed) return;

      // Set permissions from checkbox states
      this.role.canView = this.getSelectedPermissions(this.canViewMap);
      this.role.canAdd = this.getSelectedPermissions(this.canAddMap);
      this.role.canUpdate = this.getSelectedPermissions(this.canUpdateMap);
      this.role.canDelete = this.getSelectedPermissions(this.canDeleteMap);

      const request = this.isEditMode
        ? this.adminService.updateRole(this.role.id!, this.role)
        : this.adminService.addRole(this.role);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Role updated successfully!' : 'Role added successfully!', 'success');
          this.dialogRef.close(true);
        },
        error: (error: any) => {
          Swal.fire('Error', this.isEditMode ? 'Failed to update Role' : 'Failed to add Role', 'error');
          console.error('Error:', error);
        }
      });
    });
  }

  // Close dialog
  onCancel(): void {
    this.dialogRef.close();
  }
}