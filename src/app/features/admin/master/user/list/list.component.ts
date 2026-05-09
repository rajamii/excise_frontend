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

  activeTab: 'active' | 'deactivated' = 'active';

  /** Sub-filter: 'all' | 'licensee' | 'admin' */
  roleFilter: 'all' | 'licensee' | 'admin' = 'all';

  displayedColumns: string[] = [
    'fullName',
    'username', 'phoneNumber', 'email',
    'district', 'subdivision',
    'role', 'createdBy',
    'isActive', 'actions'
  ];

  deactivatedColumns: string[] = [
    'fullName',
    'username', 'phoneNumber', 'email',
    'district', 'subdivision',
    'role', 'createdBy',
    'activateAction'
  ];

  allUsers: Account[] = [];

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 20, 50];
  activePageIndex = 0;
  deactivatedPageIndex = 0;

  get activeUsers(): Account[] {
    return this._applyRoleFilter(this.allUsers.filter(u => u.isActive !== false));
  }

  get deactivatedUsers(): Account[] {
    return this._applyRoleFilter(this.allUsers.filter(u => u.isActive === false));
  }

  private _applyRoleFilter(users: Account[]): Account[] {
    if (this.roleFilter === 'all') return users;
    if (this.roleFilter === 'licensee') {
      return users.filter(u => String(u.role?.name || '').trim().toLowerCase() === 'licensee');
    }
    // 'admin' = everyone who is NOT a licensee
    return users.filter(u => String(u.role?.name || '').trim().toLowerCase() !== 'licensee');
  }

  get licenseeCount(): number {
    return this.allUsers.filter(u => String(u.role?.name || '').trim().toLowerCase() === 'licensee').length;
  }

  get adminCount(): number {
    return this.allUsers.filter(u => String(u.role?.name || '').trim().toLowerCase() !== 'licensee').length;
  }

  setRoleFilter(filter: 'all' | 'licensee' | 'admin'): void {
    this.roleFilter = filter;
    this.activePageIndex = 0;
    this.deactivatedPageIndex = 0;
  }

  get pagedActiveUsers(): Account[] {
    const start = this.activePageIndex * this.pageSize;
    return this.activeUsers.slice(start, start + this.pageSize);
  }

  get pagedDeactivatedUsers(): Account[] {
    const start = this.deactivatedPageIndex * this.pageSize;
    return this.deactivatedUsers.slice(start, start + this.pageSize);
  }

  get activeTotalPages(): number {
    return Math.max(1, Math.ceil(this.activeUsers.length / this.pageSize));
  }

  get deactivatedTotalPages(): number {
    return Math.max(1, Math.ceil(this.deactivatedUsers.length / this.pageSize));
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

  getFullName(u: Account): string {
    return [u.firstName, u.middleName, u.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || '-';
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.allUsers = Array.isArray(data) ? data : [data];
        this.activePageIndex = 0;
        this.deactivatedPageIndex = 0;
      },
      error: (err) => console.error('Failed to fetch users:', err)
    });
  }

  switchTab(tab: 'active' | 'deactivated'): void {
    this.activeTab = tab;
    this.activePageIndex = 0;
    this.deactivatedPageIndex = 0;
  }

  onPageSizeChange(): void {
    this.activePageIndex = 0;
    this.deactivatedPageIndex = 0;
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
      this.allUsers = [...this.allUsers];
      this.activePageIndex = 0;
      this.deactivatedPageIndex = 0;
    }
  }

  activePageEnd(): number {
    return Math.min((this.activePageIndex + 1) * this.pageSize, this.activeUsers.length);
  }

  deactivatedPageEnd(): number {
    return Math.min((this.deactivatedPageIndex + 1) * this.pageSize, this.deactivatedUsers.length);
  }
}
