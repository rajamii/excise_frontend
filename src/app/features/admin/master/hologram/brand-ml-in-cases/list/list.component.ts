import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { BrandMlInCases } from '../../../../../../core/models/brand-ml-in-cases.model';
import { MasterService } from '../../../../../../core/services/master.service';
import { AdminService } from '../../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-brand-ml-in-cases-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['ml', 'piecesInCase', 'actions'];
  rows: BrandMlInCases[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.masterService.getBrandMlInCases().subscribe({
      next: (data: any) => {
        this.rows = Array.isArray(data) ? data : [];
      },
      error: () => Swal.fire('Error', 'Failed to load brand ML in cases.', 'error'),
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '450px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.load();
    });
  }

  onEdit(row: BrandMlInCases): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '450px', data: { ...row } });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.load();
    });
  }

  onDelete(row: BrandMlInCases): void {
    if (row?.id === undefined) {
      Swal.fire('Error', 'Invalid record.', 'error');
      return;
    }
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete ${row.ml} ml row?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.adminService.deleteBrandMlInCases(row.id as number).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Row deleted successfully.', 'success');
          this.load();
        },
        error: () => Swal.fire('Error', 'Failed to delete row.', 'error'),
      });
    });
  }
}

