import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { FixedFee } from '../../../../../core/models/fixed-fee.model';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-manage-fixed-fee',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage-fixed-fee.component.html',
  styleUrl: './manage-fixed-fee.component.scss'
})
export class ManageComponent implements OnInit {
  feeRecord: FixedFee = {
    feeCode: '',
    feeDesc: '',
    amount: 0,
    isActive: true
  };

  constructor(
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FixedFee
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.feeRecord = { ...this.data };
    }
  }

  onSave(): void {
    const amtVal = Number(this.feeRecord.amount);
    if (isNaN(amtVal) || amtVal < 0) {
      Swal.fire('Warning', 'Please enter a valid non-negative amount.', 'warning');
      return;
    }

    this.feeRecord.amount = amtVal;

    Swal.fire({
      title: 'Update Service Fee?',
      text: `Update amount for "${this.feeRecord.feeDesc}" to ₹${amtVal.toFixed(2)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      // Map back to snake_case backend parameters
      const payload = {
        amount: this.feeRecord.amount,
        is_active: this.feeRecord.isActive
      };

      this.masterService.updateFixedFee(this.feeRecord.feeCode, payload).subscribe({
        next: () => {
          Swal.fire('Success', 'Service fee updated successfully!', 'success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          const detail = err?.error?.detail || 'Failed to update service fee amount.';
          Swal.fire('Error', detail, 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
