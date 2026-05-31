import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { MasterLiquorType } from '../../../../../../core/models/master-liquor-type.model';
import { MasterService } from '../../../../../../core/services/master.service';
import { AdminService } from '../../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-master-liquor-type-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['sno', 'liquorType', 'actions'];
  dataSource = new MatTableDataSource<MasterLiquorType>([]);

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.masterService.getLiquorTypes().subscribe({
      next: (resp: any) => {
        const raw = resp?.data ?? resp ?? [];
        this.dataSource.data = (Array.isArray(raw) ? raw : []).map((item: any) => ({
          id: item.id,
          liquorType: item.liquor_type ?? item.liquorType ?? '',
        }));
        this.cdr.detectChanges();
      },
      error: () => Swal.fire('Error', 'Failed to load liquor types.', 'error'),
    });
  }

  get rows(): MasterLiquorType[] {
    return this.dataSource.data;
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '450px' });
    dialogRef.afterClosed().subscribe((result) => { if (result) this.load(); });
  }

  onEdit(row: MasterLiquorType): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '450px', data: { ...row } });
    dialogRef.afterClosed().subscribe((result) => { if (result) this.load(); });
  }

  onDelete(row: MasterLiquorType): void {
    if (row?.id === undefined) { Swal.fire('Error', 'Invalid record.', 'error'); return; }
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete liquor type "${row.liquorType}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.adminService.deleteMasterLiquorType(row.id as number).subscribe({
        next: () => { Swal.fire('Deleted!', 'Liquor type deleted.', 'success'); this.load(); },
        error: () => Swal.fire('Error', 'Failed to delete liquor type.', 'error'),
      });
    });
  }
}
