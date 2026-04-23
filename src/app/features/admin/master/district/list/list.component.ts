import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { District } from '../../../../../core/models/district.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-district-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['district', 'districtCode', 'state', 'actions'];
  districtDataSource: District[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDistricts();
  }

  loadDistricts(): void {
    this.masterService.getDistricts().subscribe({
      next: (data: District[]) => {
        const list = Array.isArray(data) ? data : [];
        this.districtDataSource = [...list].sort(
          (a, b) => (a.districtCode ?? 0) - (b.districtCode ?? 0)
        );
      },
      error: () => Swal.fire('Error', 'Failed to load districts.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '500px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadDistricts();
    });
  }

  onEdit(district: District): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: { ...district }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadDistricts();
    });
  }

  onDelete(district: District): void {
    if (district?.id === undefined) {
      Swal.fire('Error', 'Invalid district record.', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete district \"${district.district}\"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.adminService.deleteDistrict(district.id as number).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'District deleted successfully.', 'success');
          this.loadDistricts();
        },
        error: () => Swal.fire('Error', 'Failed to delete district.', 'error')
      });
    });
  }
}
