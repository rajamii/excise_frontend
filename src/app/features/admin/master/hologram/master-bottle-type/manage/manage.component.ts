import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { AdminService } from '../../../../admin.service';
import { MasterBottleType } from '../../../../../../core/models/master-bottle-type.model';

@Component({
  selector: 'app-master-bottle-type-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent implements OnInit {
  row: MasterBottleType = { bottleType: '', isActive: true };
  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MasterBottleType | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.row = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update bottle type?' : 'Add bottle type?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload: MasterBottleType = {
        bottleType: this.row.bottleType || '',
        isActive: this.row.isActive ?? true,
      };

      const request = this.isEditMode
        ? this.adminService.updateMasterBottleType(this.row.id as number, payload)
        : this.adminService.addMasterBottleType(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated successfully.' : 'Added successfully.', 'success');
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          const msg = err?.error?.detail || 'Failed to save bottle type.';
          Swal.fire('Error', msg, 'error');
        },
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

