import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { AdminService } from '../../../../admin.service';
import { TransitPermitDistributorData } from '../../../../../../core/models/transit-permit-distributor-data.model';
import { ActiveLicense } from '../../../../../../core/models/active-license.model';

@Component({
  selector: 'app-transit-permit-distributor-data-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent implements OnInit {
  row: TransitPermitDistributorData = {
    licenseId: null,
    manufacturingUnit: '',
    distributorName: '',
    depoAddress: '',
  };

  licenses: ActiveLicense[] = [];
  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TransitPermitDistributorData | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.row = { ...this.data };
      this.isEditMode = true;
    }

    this.adminService.getActiveLicenses().subscribe({
      next: (data: ActiveLicense[]) => (this.licenses = Array.isArray(data) ? data : []),
      error: () => (this.licenses = []),
    });
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update record?' : 'Add record?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload: TransitPermitDistributorData = {
        licenseId: this.row.licenseId ?? null,
        manufacturingUnit: this.row.manufacturingUnit || '',
        distributorName: this.row.distributorName || '',
        depoAddress: this.row.depoAddress || '',
      };

      const request = this.isEditMode
        ? this.adminService.updateTransitPermitDistributorData(this.row.id as number, payload)
        : this.adminService.addTransitPermitDistributorData(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated successfully.' : 'Added successfully.', 'success');
          this.dialogRef.close(true);
        },
        error: () => Swal.fire('Error', 'Failed to save record.', 'error'),
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

