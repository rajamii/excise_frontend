import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import { Account } from '../../../../../core/models/account.model';
import { ManageComponent } from '../manage/manage.component';
import Swal from 'sweetalert2';
import { StringUtil } from '../../../../../shared/utils/string.util';
import { UserService } from '../../../../../core/services/user.service';
import { AdminService } from '../../../admin.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  // Utility class to format strings (like toTitleCase)
  stringUtil = StringUtil;

  displayedColumns: string[] = [
    'firstName',
    'middleName',
    'lastName',
    'username',
    'phoneNumber',
    'email',
    'district',
    'subdivision',
    'role',
    'createdBy',
    'actions'
  ];

  users: Account[] = [];

  constructor(
    private userService: UserService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // Fetch user list from backend
  loadUsers(): void {
    this.userService.getUsers().subscribe({
      // If single object is returned instead of array, wrap it
      next: (data) => {
        this.users = Array.isArray(data) ? data : [data];
        console.log(data);
      },
      error: (err) => console.error('Failed to fetch users:', err)
    });
  }

  // Open Add User dialog
  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) this.loadUsers(); // Reload if saved
    });
  }

  // Open Edit dialog with existing user data
  onEdit(user: Account): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: { ...user } // Spread to avoid direct mutation
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) this.loadUsers();
    });
  }

  // Confirm and delete user
  onDelete(user: Account): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete user ${user.username}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    }).then(result => {
      // FIXED: Use user.id (number) instead of user.username (string)
      if (result.isConfirmed && user.id) {
        this.adminService.deleteUser(user.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'User has been deleted.', 'success');
            this.loadUsers(); // Refresh after deletion
          },
          error: (err) => {
            console.error('Delete failed:', err);
            Swal.fire('Error', 'Failed to delete user.', 'error');
          }
        });
      }
    });
  }
}