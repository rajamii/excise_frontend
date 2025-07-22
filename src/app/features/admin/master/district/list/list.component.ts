import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { District } from '../../../../../core/models/district.model';
import Swal from 'sweetalert2';
import { ManageComponent } from '../manage/manage.component';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { MaterialModule } from '../../../../../shared/material.module';

@Component({
  selector: 'app-district-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {

  // Columns to be displayed in the table
  displayedColumns: string[] = ['district', 'districtCode', 'state', 'actions'];

  // DataSource for MatTable
  districtDataSource = new MatTableDataSource<District>();

  constructor(
    private dialog: MatDialog,
    private masterService: MasterService,
    private adminService: AdminService
  ){ }

  ngOnInit(): void {
    this.loadDistricts(); // Fetch districts on init
  }

  // Fetch all districts
  loadDistricts(): void {
    this.masterService.getDistrict().subscribe({
      next: data => this.districtDataSource.data = data,
      error: err => console.error('Failed to load districts:', err)
    });
  }

  // Open add dialog
  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) this.loadDistricts(); // Refresh if added
    });
  }

  // Open edit dialog
  onEdit(district: District): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: { ...district }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) this.loadDistricts(); // Refresh if edited
    });
  }

  // Confirm and delete district
  onDelete(district: District): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete "${district.district}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed && district.id) {
        this.adminService.deleteDistrict(district.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'District has been deleted.', 'success');
            this.loadDistricts();
          },
          error: err => {
            console.error('Delete failed:', err);
            Swal.fire('Error!', 'Could not delete district.', 'error');
          }
        });
      }
    });
  }
}
