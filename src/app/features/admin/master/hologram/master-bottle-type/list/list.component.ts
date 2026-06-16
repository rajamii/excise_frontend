import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { MasterBottleType } from '../../../../../../core/models/master-bottle-type.model';
import { MasterService } from '../../../../../../core/services/master.service';
import { AdminService } from '../../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-master-bottle-type-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['bottleType', 'isActive', 'actions'];
  rows: MasterBottleType[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.masterService.getMasterBottleTypes(false).subscribe({
      next: (resp: any) => {
        const data = resp?.data;
        this.rows = Array.isArray(data) ? data : Array.isArray(resp) ? resp : [];
      },
      error: () => Swal.fire('Error', 'Failed to load bottle types.', 'error'),
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '450px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.load();
    });
  }

  onEdit(row: MasterBottleType): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '450px', data: { ...row } });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.load();
    });
  }

  onDelete(row: MasterBottleType): void {
    if (row?.id === undefined) {
      Swal.fire('Error', 'Invalid record.', 'error');
      return;
    }
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete bottle type "${row.bottleType}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.adminService.deleteMasterBottleType(row.id as number).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Bottle type deleted successfully.', 'success');
          this.load();
        },
        error: () => Swal.fire('Error', 'Failed to delete bottle type.', 'error'),
      });
    });
  }
}

