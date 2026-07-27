import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { MasterLocation } from '../../../../../core/models/master-location.model';
import { District } from '../../../../../core/models/district.model';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-manage-location',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  location: MasterLocation = {
    locationCode: 0,
    locationDescription: '',
    districtCode: 0,
    isActive: true
  };
  districts: District[] = [];
  isEditMode = false;

  constructor(
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MasterLocation | null
  ) {}

  ngOnInit(): void {
    this.loadDistricts();
    if (this.data) {
      this.location = { ...this.data };
      this.isEditMode = true;
    }
  }

  loadDistricts(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => (this.districts = data),
      error: () => Swal.fire('Error', 'Failed to load districts.', 'error')
    });
  }

  onSave(): void {
    if (!this.location.locationCode || !this.location.locationDescription || !this.location.districtCode) {
      Swal.fire('Warning', 'Please fill in all required fields.', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Location?' : 'Save Location?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.masterService.updateLocation(this.location.id!, this.location)
        : this.masterService.createLocation(this.location);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Location updated!' : 'Location added!', 'success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          const detail = err?.error?.detail || err?.error?.location_code?.[0] || 'Failed to save location.';
          Swal.fire('Error', detail, 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
