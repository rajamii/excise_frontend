import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { AdminService } from '../../../../admin.service';
import { CheckPostDetail } from '../list/list.component';

@Component({
  selector: 'app-check-post-details-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent implements OnInit {
  row: CheckPostDetail = {
    checkPostName: '',
    isActive: true,
  };

  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CheckPostDetail | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.row = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    if (!this.row.checkPostName?.trim()) {
      Swal.fire('Validation', 'Check post name is required.', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update check post?' : 'Add check post?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload = { check_post_name: this.row.checkPostName.trim() };

      const request = this.isEditMode
        ? this.adminService.updateCheckPostDetail(this.row.checkPostId!, payload)
        : this.adminService.addCheckPostDetail(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated successfully.' : 'Added successfully.', 'success');
          this.dialogRef.close(true);
        },
        error: () => Swal.fire('Error', 'Failed to save check post details.', 'error'),
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
