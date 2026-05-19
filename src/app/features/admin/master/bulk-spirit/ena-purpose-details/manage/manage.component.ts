import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { AdminService } from '../../../../admin.service';
import { EnaPurposeDetail } from '../list/list.component';

@Component({
  selector: 'app-ena-purpose-details-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent implements OnInit {
  row: EnaPurposeDetail = {
    purposeName: '',
    isActive: true,
  };

  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EnaPurposeDetail | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.row = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    if (!this.row.purposeName?.trim()) {
      Swal.fire('Validation', 'Purpose name is required.', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update purpose?' : 'Add purpose?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload = { purpose_name: this.row.purposeName.trim() };

      const request = this.isEditMode
        ? this.adminService.updateEnaPurposeDetail(this.row.purposeId!, payload)
        : this.adminService.addEnaPurposeDetail(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated successfully.' : 'Added successfully.', 'success');
          this.dialogRef.close(true);
        },
        error: () => Swal.fire('Error', 'Failed to save purpose details.', 'error'),
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
