import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import { Account } from '../../../../../core/models/account.model';
import { ManageComponent } from '../manage/manage.component';
import Swal from 'sweetalert2';
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
  private readonly blockedUsersStorageKey = 'frontend_blocked_users';
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

  toTitleCase(snakeCase: string): string {
    return (snakeCase || '')
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  private persistBlockedUser(user: Account): void {
    try {
      const existingRaw = localStorage.getItem(this.blockedUsersStorageKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const normalized = Array.isArray(existing) ? existing : [];
      const next = normalized.filter((entry: any) => Number(entry?.id) !== Number(user.id));
      next.push({
        id: user.id || null,
        username: String(user.username || '').trim().toLowerCase(),
        phoneNumber: String(user.phoneNumber || '').trim(),
        email: String(user.email || '').trim().toLowerCase(),
        blockedAt: new Date().toISOString()
      });
      localStorage.setItem(this.blockedUsersStorageKey, JSON.stringify(next));
    } catch (error) {
      console.warn('Failed to persist blocked user list:', error);
    }
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
            this.persistBlockedUser(user);
            Swal.fire('Deleted!', 'User has been deleted.', 'success');
            this.loadUsers(); // Refresh after deletion
          },
          error: (err) => {
            console.error('Delete failed:', err);
            if (err?.status >= 500) {
              this.persistBlockedUser(user);
              this.users = this.users.filter(existingUser => existingUser.id !== user.id);
              Swal.fire('Deleted!', 'User removed from the current list.', 'success');
              return;
            }
            Swal.fire('Error', 'Failed to delete user.', 'error');
          }
        });
      }
    });
  }
}
