import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Ward } from '../../../../../core/models/ward.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { MasterLocation } from '../../../../../core/models/master-location.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-manage-ward',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  ward: Ward = {
    id: 0,
    wardName: '',
    wardNumber: 0,
    locationCode: 0,
    isActive: true
  };
  isEditMode = false;
  locations: MasterLocation[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Ward | null
  ) {}

  ngOnInit(): void {
    this.loadLocations();

    if (this.data) {
      this.ward = { ...this.data };
      this.isEditMode = true;
    }
  }

  loadLocations(): void {
    this.masterService.getLocations().subscribe({
      next: (data: any) => this.locations = data,
      error: () => Swal.fire('Error', 'Failed to load locations.', 'error')
    });
  }

  onSave(): void {
    if (!this.ward.wardName || !this.ward.wardNumber || !this.ward.locationCode) {
      Swal.fire('Warning', 'All fields are required', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Ward?' : 'Add Ward?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.adminService.updateWard(this.ward.id!, this.ward)
        : this.adminService.addWard(this.ward);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Ward updated!' : 'Ward added!', 'success');
          this.dialogRef.close(true);
        },
        error: () => {
          Swal.fire('Error', 'Failed to save ward.', 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
