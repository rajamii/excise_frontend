import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { AdminService } from '../../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

export interface EnaPurposeDetail {
  purposeId?: number;
  purposeName: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-ena-purpose-details-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['purposeName', 'isActive', 'actions'];
  rows: EnaPurposeDetail[] = [];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadRows();
  }

  loadRows(): void {
    this.adminService.getEnaPurposeDetails().subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : response?.data || [];
        this.rows = data.map((item: any) => ({
          purposeId: item?.purpose_id ?? item?.purposeId,
          purposeName: String(item?.purpose_name ?? item?.purposeName ?? '').trim(),
          isActive: item?.is_active ?? item?.isActive ?? true,
          createdAt: item?.created_at ?? item?.createdAt,
          updatedAt: item?.updated_at ?? item?.updatedAt,
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load ENA purpose details.', 'error'),
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '500px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRows();
    });
  }

  onEdit(row: EnaPurposeDetail): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: { ...row },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRows();
    });
  }

  onToggleActive(row: EnaPurposeDetail): void {
    if (!row?.purposeId) return;
    const action = row.isActive ? 'deactivate' : 'activate';
    Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} purpose?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: action.charAt(0).toUpperCase() + action.slice(1),
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.adminService.toggleEnaPurposeActive(row.purposeId!).subscribe({
        next: () => this.loadRows(),
        error: () => Swal.fire('Error', 'Failed to update status.', 'error'),
      });
    });
  }

  onDelete(row: EnaPurposeDetail): void {
    if (!row?.purposeId) {
      Swal.fire('Error', 'Invalid purpose record.', 'error');
      return;
    }
    Swal.fire({
      title: 'Delete this purpose?',
      text: `"${row.purposeName}" will be permanently removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.adminService.deleteEnaPurposeDetail(row.purposeId!).subscribe({
        next: () => {
          Swal.fire('Deleted', 'Purpose deleted successfully.', 'success');
          this.loadRows();
        },
        error: () => Swal.fire('Error', 'Failed to delete purpose.', 'error'),
      });
    });
  }
}
