import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { BaseComponent } from '../../../../../base/base.components';
import { BaseDependency } from '../../../../../base/dependency/base.dependency';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';

import { PoliceStation } from '../../../../../core/models/policestation.model';
import { Subdivision } from '../../../../../core/models/subdivision.model';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent extends BaseComponent implements OnInit {
  displayedColumns: string[] = ['policeStation', 'policeStationCode', 'subdivision', 'actions']; // Table columns

  policeStations: PoliceStation[] = [];
  allPoliceStations: PoliceStation[] = []; 
  subdivisions: Subdivision[] = []; 
  selectedSubdivisionCode: number | null = null; 

  constructor(deps: BaseDependency, private dialog: MatDialog) {
    super(deps);
  }

  ngOnInit(): void {
    this.loadSubdivisions(); 
    this.loadPoliceStations();
  }

  loadSubdivisions(): void {
    this.masterService.getSubdivision().subscribe({
      next: (data) => this.subdivisions = data, // Populate dropdown
      error: () => Swal.fire('Error', 'Failed to load subdivisions.', 'error') // Show error on fail
    });
  }

  loadPoliceStations(): void {
    this.masterService.getPoliceStations().subscribe({
      next: (data) => {
        this.allPoliceStations = data; // Store unfiltered data
        this.applyFilter(); // Filter based on selected subdivision
      },
      error: () => Swal.fire('Error', 'Failed to load police stations.', 'error') // Show load error
    });
  }

  onSubdivisionSelect(): void {
    this.applyFilter(); // Re-filter when user changes subdivision
  }

  // Apply subdivision filter to policeStations
  applyFilter(): void {
    if (this.selectedSubdivisionCode === null) {
      this.policeStations = this.allPoliceStations; // No filter, show all
    } else {
      this.policeStations = this.allPoliceStations.filter(
        ps => ps.subdivisionCode === this.selectedSubdivisionCode // Filter match
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
