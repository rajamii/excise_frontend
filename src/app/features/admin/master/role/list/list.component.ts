import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { ManageComponent } from '../manage/manage.component';
import { Role } from '../../../../../core/models/role.model';
import { UserService } from '../../../../../core/services/user.service';
import { AdminService } from '../../../admin.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  // List of roles
  roles: Role[] = [];

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 20, 50];
  pageIndex = 0;

  get pagedRoles(): Role[] {
    const start = this.pageIndex * this.pageSize;
    return this.roles.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.roles.length / this.pageSize));
  }

  pageEnd(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.roles.length);
  }

  onPageSizeChange(): void {
    this.pageIndex = 0;
  }

  // Table columns
  displayedColumns: string[] = [
    'name',
    'roleName',
    'rolePrecedence',
    'canView',
    'canAdd',
    'canUpdate',
    'canDelete',
    'actions'
  ];

  constructor(
    private userService: UserService, 
    private adminService: AdminService,
    private dialog: MatDialog        
  ) {}

  ngOnInit(): void {
    this.loadRoles(); // Fetch roles on init
  }

  // Fetch all roles from API
  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (data) => {
        this.roles = [...data].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
        this.pageIndex = 0;
      },
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
      text: `Delete role id "${role.id}"?`,
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
