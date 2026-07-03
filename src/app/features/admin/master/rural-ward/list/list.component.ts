import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { RuralWard } from '../../../../../core/models/rural-ward.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-rural-ward-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['wardName', 'wardNumber', 'block', 'actions'];
  wardDataSource: RuralWard[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadWards();
  }

  loadWards(): void {
    this.masterService.getRuralWards().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : [];
        this.wardDataSource = [...list].sort(
          (a, b) => (a.wardNumber ?? 0) - (b.wardNumber ?? 0)
        );
      },
      error: () => Swal.fire('Error', 'Failed to load rural wards.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '500px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadWards();
    });
  }

  onEdit(ward: RuralWard): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: { ...ward }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadWards();
    });
  }

  onDelete(ward: RuralWard): void {
    if (ward?.id === undefined) {
      Swal.fire('Error', 'Invalid rural ward record.', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete rural ward "${ward.wardName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.adminService.deleteRuralWard(ward.id as number).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Rural ward deleted successfully.', 'success');
          this.loadWards();
        },
        error: () => Swal.fire('Error', 'Failed to delete rural ward.', 'error')
      });
    });
  }
}
