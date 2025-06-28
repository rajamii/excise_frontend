import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { RouterModule, Router } from '@angular/router';
import { BaseComponent } from '../../../base/base.components';
import { BaseDependency } from '../../../base/dependency/base.dependency';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { PoliceStation } from '../../../core/models/policestation.model';
import { Subdivision } from '../../../core/models/subdivision.model';
import { EditPolicestationComponent } from './edit-policestation/edit-policestation.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-list-policestation',
  imports: [MaterialModule, RouterModule], // Import necessary modules
  templateUrl: './list-policestation.component.html', // Component template URL
  styleUrl: './list-policestation.component.scss' // Component styles URL
})
export class ListPolicestationComponent extends BaseComponent implements OnInit{
  // Columns for the police station table
  displayedColumns: string[] = ['id', 'policeStation', 'policeStationCode', 'subdivisionCode', 'actions'];
  
  // Data source for the table, which will hold all the police stations
  policeStationDataSource = new MatTableDataSource<PoliceStation>();
  
  // Holds the list of subdivisions (used for filtering police stations)
  subdivisions: Subdivision[] = [];
  
  // Holds the list of all police stations (used for filtering based on selected subdivision)
  allPoliceStations: PoliceStation[] = [];
  
  // Holds the currently selected subdivision code for filtering
  selectedSubdivisionCode: number | null = null;

  constructor(
    deps: BaseDependency, 
    private dialog: MatDialog // Dialog service for editing police stations
  ) { 
    super(deps); // Call the constructor of the base class
  }

  ngOnInit(): void {
    // Initialize the component by loading subdivisions and police stations
    this.loadSubdivisions();
    this.loadPoliceStations();
  }

  // Load subdivisions from the service to populate the subdivision dropdown
  loadSubdivisions(): void {
    this.masterService.getSubdivision().subscribe(data => {
      this.subdivisions = data;
    });
  }

  // Load all police stations from the service
  loadPoliceStations(): void {
    this.masterService.getPoliceStations().subscribe(data => {
      this.allPoliceStations = data; // Store all police stations in memory
      this.policeStationDataSource.data = this.allPoliceStations; // Set the table data source
    });
  }

  // Handle the event when a subdivision is selected from the dropdown
  onSubdivisionSelect(): void {
    if (this.selectedSubdivisionCode === null) {
      // If no subdivision is selected, show all police stations
      this.policeStationDataSource.data = this.allPoliceStations;
    } else {
      // Filter police stations based on the selected subdivision
      this.policeStationDataSource.data = this.allPoliceStations.filter(ps => ps.subdivisionCode === this.selectedSubdivisionCode);
    }
  }

  // Handle the event when the edit button is clicked for a police station
  onEdit(district: PoliceStation): void {
    const dialogRef = this.dialog.open(EditPolicestationComponent, {
      width: '400px',
      data: { ...district } // Pass the police station data to the edit dialog
    });

    // After the dialog is closed, reload the police stations if any changes were made
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPoliceStations(); // Reload police stations after edit
      }
    });
  }

  // Handle the event when the delete button is clicked for a police station
  onDelete(element: PoliceStation): void {
    // Show a confirmation dialog before deleting the police station
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you really want to delete this police station?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        // Proceed with deleting the police station
        this.adminService.deletePoliceStation(element.id).subscribe(
          () => {
            // Remove the deleted police station from the list and update the table
            this.allPoliceStations = this.allPoliceStations.filter(ps => ps.id !== element.id);
            this.policeStationDataSource.data = this.allPoliceStations;
            Swal.fire('Deleted!', 'The police station has been deleted.', 'success');
          },
          error => {
            console.error('Error deleting police station:', error);
            Swal.fire('Error!', 'An error occurred while deleting.', 'error');
          }
        );
      }
    });
  }
}
