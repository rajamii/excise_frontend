import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { AdminService } from '../../../../admin.service';
import { MasterLiquorType } from '../../../../../../core/models/master-liquor-type.model';

@Component({
  selector: 'app-master-liquor-type-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent implements OnInit {
  row: MasterLiquorType = { liquorType: '' };
  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MasterLiquorType | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.row = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update liquor type?' : 'Add liquor type?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload = { liquor_type: (this.row.liquorType || '').trim() };

      const request = this.isEditMode
        ? this.adminService.updateMasterLiquorType(this.row.id as number, payload)
        : this.adminService.addMasterLiquorType(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated successfully.' : 'Added successfully.', 'success');
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          const msg = err?.error?.liquor_type?.[0] || err?.error?.detail || 'Failed to save liquor type.';
          Swal.fire('Error', msg, 'error');
        },
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
