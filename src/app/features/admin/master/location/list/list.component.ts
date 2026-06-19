import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { MasterLocation } from '../../../../../core/models/master-location.model';
import { MasterService } from '../../../../../core/services/master.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['locationCode', 'locationDescription', 'district', 'status', 'actions'];
  locations: MasterLocation[] = [];

  constructor(
    private masterService: MasterService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLocations();
  }

  loadLocations(): void {
    this.masterService.getLocations().subscribe({
      next: (data: any) => (this.locations = data),
      error: () => Swal.fire('Error', 'Failed to load locations.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLocations();
    });
  }

  onEdit(loc: MasterLocation): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: loc
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLocations();
    });
  }

  onDelete(loc: MasterLocation): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Deactivate location "${loc.locationDescription}" (${loc.locationCode})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate',
    }).then(result => {
      if (result.isConfirmed) {
        this.masterService.deleteLocation(loc.id!).subscribe({
          next: () => {
            Swal.fire('Deactivated!', 'Location deactivated.', 'success');
            this.loadLocations();
          },
          error: () => Swal.fire('Error', 'Failed to deactivate location.', 'error')
        });
      }
    });
  }
}
