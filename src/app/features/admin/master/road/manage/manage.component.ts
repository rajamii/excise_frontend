import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Road } from '../../../../../core/models/road.model';
import { District } from '../../../../../core/models/district.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  road: Road = { 
    roadName: '', 
    roadType: 'NH', // Default to valid value instead of empty string
    district: 0 
  };
  isEditMode = false;
  districts: District[] = [];
  selectedDistrictId: number = 0; // Track selected district ID separately

  // Predefined road type choices for dropdown
  roadTypes: { value: 'NH' | 'SH' | 'LINK ROAD', label: string }[] = [
    { value: 'NH', label: 'National Highway' },
    { value: 'SH', label: 'State Highway' },
    { value: 'LINK ROAD', label: 'Link Road' }
  ];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Road | null
  ) {}

  ngOnInit(): void {
    this.loadDistricts();

    if (this.data) {
      this.road = { ...this.data };

      // Extract district ID whether it's a number or District object
      if (typeof this.road.district === 'object' && this.road.district !== null) {
        this.selectedDistrictId = (this.road.district as District).id ?? 0;
      } else {
        this.selectedDistrictId = (this.road.district as number) ?? 0;
      }

      this.isEditMode = true;
    }
  }

  // Fetch list of districts from backend
  loadDistricts(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => this.districts = data,
      error: () => Swal.fire('Error', 'Failed to load districts.', 'error')
    });
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update Road?' : 'Add Road?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then(result => {
      if (!result.isConfirmed) return;

      // Create payload with numeric district ID
      const payload: Road = {
        ...this.road,
        district: this.selectedDistrictId
      };

      const request = this.isEditMode
        ? this.adminService.updateRoad(payload.id!, payload)
        : this.adminService.addRoad(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Road updated!' : 'Road added!', 'success');
          this.dialogRef.close(true); // Indicate success to parent
        },
        error: () => Swal.fire('Error', 'Failed to save road.', 'error')
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close(); // Close without saving
  }
}