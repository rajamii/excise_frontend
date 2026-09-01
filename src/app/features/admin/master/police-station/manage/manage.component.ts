import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PoliceStation } from '../../../../../core/models/policestation.model';
import { District } from '../../../../../core/models/district.model';
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
    district: '',
    districtCode: 0,
    isActive: true,
  };

  isEditMode = false;
  districts: District[] = [];

  constructor(
    private adminService: AdminService,
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PoliceStation | null // Injected if editing
  ) {}

  ngOnInit(): void {
    this.loadDistricts(); // Fetch list of districts for dropdown

    if (this.data) {
      this.policeStation = { 
        ...this.data,
        districtCode: this.data.districtCode ?? (this.data as any).district_code ?? 0
      }; // Pre-fill form with existing data
      this.isEditMode = true;
    }
  }

  loadDistricts(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => (this.districts = data),
      error: () => Swal.fire('Error', 'Failed to load districts.', 'error'),
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

      const payload: any = {
        ...this.policeStation,
        district_code: +this.policeStation.districtCode, // Ensure numeric code for backend
        districtCode: +this.policeStation.districtCode,
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
