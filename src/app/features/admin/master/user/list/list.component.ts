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

  /** 'active' shows is_active=true users; 'deactivated' shows is_active=false */
  activeTab: 'active' | 'deactivated' = 'active';

  displayedColumns: string[] = [
    'firstName', 'middleName', 'lastName',
    'username', 'phoneNumber', 'email',
    'district', 'subdivision',
    'role', 'createdBy',
    'isActive', 'actions'
  ];

  deactivatedColumns: string[] = [
    'firstName', 'middleName', 'lastName',
    'username', 'phoneNumber', 'email',
    'district', 'subdivision',
    'role', 'createdBy',
    'activateAction'
  ];

  allUsers: Account[] = [];

  get activeUsers(): Account[] {
    return this.allUsers.filter(u => u.isActive !== false);
  }

  get deactivatedUsers(): Account[] {
    return this.allUsers.filter(u => u.isActive === false);
  }

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

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.allUsers = Array.isArray(data) ? data : [data];
      },
      error: (err) => console.error('Failed to fetch users:', err)
    });
  }

  switchTab(tab: 'active' | 'deactivated'): void {
    this.activeTab = tab;
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '500px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) this.loadUsers();
    });
  }

  onEdit(user: Account): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: { ...user }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) this.loadUsers();
    });
  }

  /** Deactivate an active user (sets is_active=false, preserves all data) */
  onDelete(user: Account): void {
    Swal.fire({
      title: 'Deactivate User?',
      text: `This will deactivate ${user.username}. They will not be able to log in until reactivated. All data is preserved.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, deactivate',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed && user.id) {
        this.adminService.deleteUser(user.id).subscribe({
          next: () => {
            this._updateUserInList(user.id!, false);
            Swal.fire('Deactivated!', 'User has been deactivated and can no longer log in.', 'success');
          },
          error: (err) => {
            console.error('Deactivate failed:', err);
            Swal.fire('Error', 'Failed to deactivate user.', 'error');
          }
        });
      }
    });
  }

  /** Activate a deactivated user directly from the Deactivated tab */
  onActivate(user: Account): void {
    Swal.fire({
      title: 'Activate User?',
      text: `This will re-enable login for ${user.username}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, activate',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed && user.id) {
        this.userService.toggleUserActive(user.id).subscribe({
          next: (res) => {
            this._updateUserInList(user.id!, res.is_active);
            Swal.fire('Activated!', `${user.username} can now log in again.`, 'success');
          },
          error: (err) => {
            console.error('Activate failed:', err);
            Swal.fire('Error', 'Failed to activate user.', 'error');
          }
        });
      }
    });
  }

  /** Toggle is_active from the Active tab slide-toggle */
  onToggleActive(user: Account): void {
    const action = user.isActive ? 'deactivate' : 'activate';
    const actionPast = user.isActive ? 'deactivated' : 'activated';

    Swal.fire({
      title: `${user.isActive ? 'Deactivate' : 'Activate'} User?`,
      text: `Are you sure you want to ${action} ${user.username}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Yes, ${action}`,
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed && user.id) {
        this.userService.toggleUserActive(user.id).subscribe({
          next: (res) => {
            this._updateUserInList(user.id!, res.is_active);
            Swal.fire('Done!', `User has been ${actionPast}.`, 'success');
          },
          error: (err) => {
            console.error('Toggle failed:', err);
            Swal.fire('Error', `Failed to ${action} user.`, 'error');
          }
        });
      }
    });
  }

  private _updateUserInList(id: number, isActive: boolean): void {
    const idx = this.allUsers.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.allUsers[idx] = { ...this.allUsers[idx], isActive };
      this.allUsers = [...this.allUsers]; // trigger change detection
    }
  }
}
