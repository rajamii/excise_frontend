import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { PaymentModule } from '../../../../../core/models/payment-module.model';
import { AdminService } from '../../../admin.service';

@Component({
  selector: 'app-manage-payment-module',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage-payment-module.component.html',
  styleUrl: './manage-payment-module.component.scss'
})
export class ManagePaymentModuleComponent implements OnInit {
  module: PaymentModule = {
    moduleCode: '',
    moduleDesc: '',
    licenseFee: null,
    visibilityStatus: true
  };
  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManagePaymentModuleComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentModule | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.module = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    if (!this.module.moduleCode || !this.module.moduleDesc) {
      Swal.fire('Warning', 'Please fill in all required fields.', 'warning');
      return;
    }

    if (this.module.licenseFee !== null && this.module.licenseFee < 0) {
      Swal.fire('Warning', 'Amount cannot be negative.', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Payment Module?' : 'Save Payment Module?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.adminService.updatePaymentModule(this.module.moduleCode, this.module)
        : this.adminService.addPaymentModule(this.module);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Payment module updated!' : 'Payment module added!', 'success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          const detail = err?.error?.detail || 'Failed to save payment module. Check if code already exists.';
          Swal.fire('Error', detail, 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
