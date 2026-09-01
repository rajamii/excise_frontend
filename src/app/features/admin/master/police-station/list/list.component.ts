import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { BaseComponent } from '../../../../../base/base.components';
import { BaseDependency } from '../../../../../base/dependency/base.dependency';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { PoliceStation } from '../../../../../core/models/policestation.model';
import { District } from '../../../../../core/models/district.model';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent extends BaseComponent implements OnInit {
  displayedColumns: string[] = ['policeStation', 'policeStationCode', 'district', 'actions']; // Table columns

  policeStations: PoliceStation[] = [];
  allPoliceStations: PoliceStation[] = []; 
  districts: District[] = []; 
  selectedDistrictCode: number | null = null; 

  // Pagination
  pageSize = 10;
  pageSizeOptions = [5, 10, 20, 50];
  pageIndex = 0;

  get pagedPoliceStations(): PoliceStation[] {
    const start = this.pageIndex * this.pageSize;
    return this.policeStations.slice(start, start + this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.policeStations.length / this.pageSize)); }
  pageEnd(): number { return Math.min((this.pageIndex + 1) * this.pageSize, this.policeStations.length); }

  onPageSizeChange(): void {
    this.pageIndex = 0;
  }

  constructor(deps: BaseDependency, private dialog: MatDialog) {
    super(deps);
  }

  ngOnInit(): void {
    this.loadDistricts(); 
    this.loadPoliceStations();
  }

  loadDistricts(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => this.districts = data, // Populate dropdown
      error: () => Swal.fire('Error', 'Failed to load districts.', 'error') // Show error on fail
    });
  }

  loadPoliceStations(): void {
    this.masterService.getPoliceStations().subscribe({
      next: (data) => {
        this.allPoliceStations = data; // Store unfiltered data
        this.applyFilter(); // Filter based on selected district
      },
      error: () => Swal.fire('Error', 'Failed to load police stations.', 'error') // Show load error
    });
  }

  onDistrictSelect(): void {
    this.pageIndex = 0;
    this.applyFilter(); // Re-filter when user changes district
  }

  // Apply district filter to policeStations
  applyFilter(): void {
    if (this.selectedDistrictCode === null) {
      this.policeStations = this.allPoliceStations; // No filter, show all
    } else {
      this.policeStations = this.allPoliceStations.filter(
        ps => (ps.districtCode ?? (ps as any).district_code) === this.selectedDistrictCode // Filter match
      );
    }
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px' // Open add dialog
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadPoliceStations(); // Reload data after add
    });
  }

  onEdit(policeStation: PoliceStation): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: { ...policeStation } // Open edit dialog with data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadPoliceStations(); // Reload data after edit
    });
  }

  onDelete(policeStation: PoliceStation): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `This will deactivate "${policeStation.policeStation}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.adminService.deletePoliceStation(policeStation.id!).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Police station deleted.', 'success'); // Show success alert
            this.loadPoliceStations(); // Refresh data
          },
          error: () => {
            Swal.fire('Error', 'Failed to delete police station.', 'error'); // Handle delete failure
          }
        });
      }
    });
  }
}
