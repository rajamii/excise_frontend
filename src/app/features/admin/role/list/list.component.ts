import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { ManageComponent } from '../manage/manage.component';
import { Role } from '../../../../core/models/role';
import { UserService } from '../../../../core/services/user.service';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-list',
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  // List of roles
  roles: Role[] = [];

  // Table columns
  displayedColumns: string[] = [
    'id',
    'name',
    'rolePrecedence',
    'canView',
    'canAdd',
    'canUpdate',
    'canDelete',
    'actions'
  ];

  constructor(
    private userService: UserService,   // For fetching roles
    private adminService: AdminService, // For delete API
    private dialog: MatDialog           // To open dialog
  ) {}

  ngOnInit(): void {
    this.loadRoles(); // Fetch roles on init
  }

  // Fetch all roles from API
  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (data) => this.roles = data,
      error: () => Swal.fire('Error', 'Failed to load roles.', 'error')
    });
  }

  // Convert snake_case to Title Case
  toTitleCase(snakeCase: string): string {
    return snakeCase
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Open add role dialog
  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRoles(); // Reload roles if added
    });
  }

  // Open edit role dialog (same component)
  onEdit(role: Role): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: role // Pass role to be edited
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRoles(); // Reload roles if edited
    });
  }

  // Confirm and delete role
  onDelete(role: Role): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete role "${role.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed && role.id !== undefined) {
        this.adminService.deleteRole(role.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Role deleted successfully.', 'success');
            this.loadRoles();
          },
          error: () => Swal.fire('Error', 'Failed to delete role.', 'error')
        });
      }
    });
  }
}
