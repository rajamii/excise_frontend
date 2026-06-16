import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { AdminService } from '../../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

export interface CheckPostDetail {
  checkPostId?: number;
  checkPostName: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-check-post-details-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['checkPostName', 'isActive', 'actions'];
  rows: CheckPostDetail[] = [];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadRows();
  }

  loadRows(): void {
    this.adminService.getCheckPostDetails().subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : response?.data || [];
        this.rows = data.map((item: any) => ({
          checkPostId: item?.check_post_id ?? item?.checkPostId,
          checkPostName: String(item?.check_post_name ?? item?.checkPostName ?? '').trim(),
          isActive: item?.is_active ?? item?.isActive ?? true,
          createdAt: item?.created_at ?? item?.createdAt,
          updatedAt: item?.updated_at ?? item?.updatedAt,
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load check post details.', 'error'),
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '500px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRows();
    });
  }

  onEdit(row: CheckPostDetail): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: { ...row },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRows();
    });
  }

  onToggleActive(row: CheckPostDetail): void {
    if (!row?.checkPostId) return;
    const action = row.isActive ? 'deactivate' : 'activate';
    Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} check post?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: action.charAt(0).toUpperCase() + action.slice(1),
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.adminService.toggleCheckPostActive(row.checkPostId!).subscribe({
        next: () => this.loadRows(),
        error: () => Swal.fire('Error', 'Failed to update status.', 'error'),
      });
    });
  }

  onDelete(row: CheckPostDetail): void {
    if (!row?.checkPostId) {
      Swal.fire('Error', 'Invalid check post record.', 'error');
      return;
    }
    Swal.fire({
      title: 'Delete this check post?',
      text: `"${row.checkPostName}" will be permanently removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.adminService.deleteCheckPostDetail(row.checkPostId!).subscribe({
        next: () => {
          Swal.fire('Deleted', 'Check post deleted successfully.', 'success');
          this.loadRows();
        },
        error: () => Swal.fire('Error', 'Failed to delete check post.', 'error'),
      });
    });
  }
}
