import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { District } from '../../../../../core/models/district.model';
import { AdminService } from '../../../admin.service';

@Component({
  selector: 'app-manage-district',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  // Default district object for add mode
  district: District = {
    district: '',
    districtCode: 0,
    stateCode: 11,
    state: 'Sikkim',
    isActive: true
  };

  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: District | null // Inject dialog data for edit mode
  ) {}

  ngOnInit(): void {
    // If data is passed, switch to edit mode and populate district
    if (this.data) {
      this.district = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    // Show confirmation dialog before saving
    Swal.fire({
      title: this.isEditMode ? 'Update District?' : 'Add District?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      // Call appropriate service method based on mode
      const request = this.isEditMode
        ? this.adminService.updateDistrict(this.district.id!, this.district)
        : this.adminService.addDistrict(this.district);

      request.subscribe({
        next: () => {
          // Show success message and close dialog
          Swal.fire('Success', this.isEditMode ? 'District updated!' : 'District added!', 'success');
          this.dialogRef.close(true);
        },
        error: () => {
          // Show error message on failure
          Swal.fire('Error', 'Failed to save district.', 'error');
        }
      });
    });
  }

  onCancel(): void {
    // Close dialog without saving
    this.dialogRef.close();
  }
}
