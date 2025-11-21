import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { Road } from '../../../../../core/models/road.model';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  roads: Road[] = [];

  displayedColumns: string[] = ['roadName', 'roadType', 'district', 'actions'];

  // Mapping road type codes to readable labels
  roadTypeLabels: { [key: string]: string } = {
    NH: 'National Highway',
    SH: 'State Highway',
    'LINK ROAD': 'Link Road',
  };

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadRoads();
  }

  // Load list of roads from API
  loadRoads(): void {
    this.masterService.getRoads().subscribe({
      next: (data) => (this.roads = data),
      error: () => Swal.fire('Error', 'Failed to load roads.', 'error'),
    });
  }

  // Open dialog to add a new road
  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
    });

    // Reload roads if dialog returns success
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRoads();
    });
  }

  // Open dialog to edit an existing road
  onEdit(road: Road): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: road,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRoads();
    });
  }

  // Show confirmation and delete the selected road
  onDelete(road: Road): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete road "${road.roadName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (result.isConfirmed && road.id !== undefined) {
        this.adminService.deleteRoad(road.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Road deleted successfully.', 'success');
            this.loadRoads();
          },
          error: () => Swal.fire('Error', 'Failed to delete road.', 'error'),
        });
      }
    });
  }
}
