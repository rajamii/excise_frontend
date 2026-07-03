import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subdivision } from '../../../../../core/models/subdivision.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { District } from '../../../../../core/models/district.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-manage-subdivision',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  subdivision: Subdivision = {
    subdivision: '',
    subdivisionCode: 0,
    district: '',
    districtCode: 0,
    isActive: true,
    isRural: false
  };
  isEditMode = false;
  districts: District[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Subdivision | null // Injected data for edit mode
  ) {}

  ngOnInit(): void {
    this.loadDistricts();

    if (this.data) {
      this.subdivision = { ...this.data }; // Pre-fill form in edit mode
      this.isEditMode = true;
    }
  }

  loadDistricts(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => this.districts = data, // Load districts for dropdown
      error: () => Swal.fire('Error', 'Failed to load districts.', 'error')
    });
  }

  onSave(): void {
    // Validate required fields
    if (!this.subdivision.subdivision || !this.subdivision.subdivisionCode || !this.subdivision.districtCode) {
      Swal.fire('Warning', 'All fields are required', 'warning');
      return;
    }

    // Confirmation dialog before saving
    Swal.fire({
      title: this.isEditMode ? 'Update Subdivision?' : 'Add Subdivision?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save'
    }).then(result => {
      if (!result.isConfirmed) return;

      // Choose API call based on mode
      const request = this.isEditMode
        ? this.adminService.updateSubdivision(this.subdivision.id!, this.subdivision)
        : this.adminService.addSubdivision(this.subdivision);

      // Execute save request
      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Subdivision updated!' : 'Subdivision added!', 'success');
          this.dialogRef.close(true); // Close dialog and notify parent to refresh
        },
        error: () => {
          Swal.fire('Error', 'Failed to save subdivision.', 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close(); // Close dialog without saving
  }
}
