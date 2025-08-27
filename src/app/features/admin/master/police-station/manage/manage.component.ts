import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PoliceStation } from '../../../../../core/models/policestation.model';
import { Subdivision } from '../../../../../core/models/subdivision.model';
import { AdminService } from '../../../admin.service';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-manage-police-station',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent implements OnInit {
  policeStation: PoliceStation = {
    policeStation: '',
    policeStationCode: 0,
    subdivision: '',
    subdivisionCode: 0,
    isActive: true,
  };

  isEditMode = false;
  subdivisions: Subdivision[] = [];

  constructor(
    private adminService: AdminService,
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PoliceStation | null // Injected if editing
  ) {}

  ngOnInit(): void {
    this.loadSubdivisions(); // Fetch list of subdivisions for dropdown

    if (this.data) {
      this.policeStation = { ...this.data }; // Pre-fill form with existing data
      this.isEditMode = true;
    }
  }

  loadSubdivisions(): void {
    this.masterService.getSubdivision().subscribe({
      next: (data) => (this.subdivisions = data),
      error: () => Swal.fire('Error', 'Failed to load subdivisions.', 'error'),
    });
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update Police Station?' : 'Add Police Station?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload: PoliceStation = {
        ...this.policeStation,
        subdivisionCode: +this.policeStation.subdivisionCode, // Ensure numeric code for backend
      };

      const request = this.isEditMode
        ? this.adminService.updatePoliceStation(payload.id!, payload) // Update call if editing
        : this.adminService.addPoliceStation(payload); // Create call if adding

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated!' : 'Added!', 'success');
          this.dialogRef.close(true); // Close dialog on success
        },
        error: () => {
          Swal.fire('Error', 'Failed to save police station.', 'error'); // Show error if save fails
        },
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close(); // Cancel and close the dialog
  }
}
