import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { BaseComponent } from '../../../../../base/base.components';
import { BaseDependency } from '../../../../../base/dependency/base.dependency';
import { Subdivision } from '../../../../../core/models/subdivision.model';
import { District } from '../../../../../core/models/district.model';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-subdivision-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent extends BaseComponent implements OnInit {
  // Columns for display
  displayedColumns: string[] = ['id', 'subdivision', 'subdivisionCode', 'district', 'districtCode', 'actions'];

  // All subdivision and filtered list
  allSubdivisions: Subdivision[] = [];
  subdivisions: Subdivision[] = [];

  // Districts for filter dropdown
  districts: District[] = [];
  selectedDistrictCode: number | null = null;

  constructor(deps: BaseDependency, private dialog: MatDialog) {
    super(deps);
  }

  ngOnInit(): void {
    this.loadDistricts();
    this.loadSubdivisions();
  }

  loadDistricts(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => (this.districts = data),
      error: () => Swal.fire('Error', 'Failed to load districts', 'error'),
    });
  }

  loadSubdivisions(): void {
    this.masterService.getSubdivision().subscribe({
      next: (data) => {
        this.allSubdivisions = data;
        this.filterSubdivisions();
      },
      error: () => Swal.fire('Error', 'Failed to load subdivisions', 'error'),
    });
  }

  // Filters based on selected district
  filterSubdivisions(): void {
    if (this.selectedDistrictCode === null) {
      this.subdivisions = this.allSubdivisions;
    } else {
      this.subdivisions = this.allSubdivisions.filter(
        (s) => s.districtCode === this.selectedDistrictCode
      );
    }
  }

  onDistrictSelect(): void {
    this.filterSubdivisions();
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadSubdivisions();
    });
  }

  onEdit(subdivision: Subdivision): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: { ...subdivision },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadSubdivisions();
    });
  }

  onDelete(subdivision: Subdivision): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this subdivision!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteSubdivision(subdivision.id!).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Subdivision has been deleted.', 'success');
            this.loadSubdivisions();
          },
          error: () => {
            Swal.fire('Error!', 'Subdivision could not be deleted.', 'error');
          },
        });
      }
    });
  }
}
