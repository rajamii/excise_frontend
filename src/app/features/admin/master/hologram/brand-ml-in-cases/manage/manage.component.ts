import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { AdminService } from '../../../../admin.service';
import { BrandMlInCases } from '../../../../../../core/models/brand-ml-in-cases.model';

@Component({
  selector: 'app-brand-ml-in-cases-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent implements OnInit {
  row: BrandMlInCases = { ml: 0, piecesInCase: 0 };
  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BrandMlInCases | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.row = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update row?' : 'Add row?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload: BrandMlInCases = {
        ml: Number(this.row.ml),
        piecesInCase: Number(this.row.piecesInCase),
      };

      const request = this.isEditMode
        ? this.adminService.updateBrandMlInCases(this.row.id as number, payload)
        : this.adminService.addBrandMlInCases(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated successfully.' : 'Added successfully.', 'success');
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          const msg = err?.error?.detail || 'Failed to save row.';
          Swal.fire('Error', msg, 'error');
        },
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

