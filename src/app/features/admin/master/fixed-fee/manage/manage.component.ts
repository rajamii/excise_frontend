import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { FixedFee } from '../../../../../core/models/fixed-fee.model';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-manage-fixed-fee',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './manage-fixed-fee.component.html',
  styleUrl: './manage-fixed-fee.component.scss'
})
export class ManageComponent implements OnInit {
  feeRecord: FixedFee = {
    feeCode: '',
    feeDesc: '',
    amount: '',
    isActive: true,
    licenseCategory: null,
    licenseSubcategory: null,
    mode: null,
    feeType: null
  };
  isEdit = false;
  categories: any[] = [];
  subcategories: any[] = [];

  constructor(
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FixedFee
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadSubcategories();
    if (this.data) {
      this.feeRecord = { ...this.data };
      if (this.data.fee_type && !this.data.feeType) {
        this.feeRecord.feeType = this.data.fee_type;
      }
      this.isEdit = true;
    } else {
      this.isEdit = false;
    }
  }

  loadCategories(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data) => this.categories = data,
      error: () => console.error('Failed to load categories')
    });
  }

  loadSubcategories(): void {
    this.masterService.getLicenseSubcategories().subscribe({
      next: (data) => this.subcategories = data,
      error: () => console.error('Failed to load subcategories')
    });
  }

  onSave(): void {
    const amtVal = Number(this.feeRecord.amount);
    if (isNaN(amtVal) || amtVal < 0) {
      Swal.fire('Warning', 'Please enter a valid non-negative amount.', 'warning');
      return;
    }

    if (!this.feeRecord.feeCode || !this.feeRecord.feeCode.trim()) {
      Swal.fire('Warning', 'Please enter a valid Fee Code.', 'warning');
      return;
    }

    if (!this.feeRecord.feeDesc || !this.feeRecord.feeDesc.trim()) {
      Swal.fire('Warning', 'Please enter a valid Description.', 'warning');
      return;
    }

    this.feeRecord.amount = amtVal;

    Swal.fire({
      title: this.isEdit ? 'Update Config?' : 'Create Config?',
      text: this.isEdit
        ? `Update amount for "${this.feeRecord.feeDesc}" to ₹${amtVal.toFixed(2)}?`
        : `Create new configuration "${this.feeRecord.feeDesc}" with amount ₹${amtVal.toFixed(2)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEdit ? 'Update' : 'Create',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      // Map back to snake_case backend parameters
      const payload = {
        fee_code: this.feeRecord.feeCode,
        fee_desc: this.feeRecord.feeDesc,
        amount: this.feeRecord.amount,
        is_active: this.feeRecord.isActive,
        license_category: this.feeRecord.licenseCategory,
        license_subcategory: this.feeRecord.licenseSubcategory,
        mode: this.feeRecord.mode,
        fee_type: this.feeRecord.feeType
      };

      if (this.isEdit) {
        this.masterService.updateFixedFee(this.feeRecord.feeCode, payload).subscribe({
          next: () => {
            Swal.fire('Success', 'Service fee updated successfully!', 'success');
            this.dialogRef.close(true);
          },
          error: (err) => {
            const detail = err?.error?.detail || 'Failed to update service fee.';
            Swal.fire('Error', detail, 'error');
          }
        });
      } else {
        this.masterService.createFixedFee(payload).subscribe({
          next: () => {
            Swal.fire('Success', 'Fixed fee configuration created successfully!', 'success');
            this.dialogRef.close(true);
          },
          error: (err) => {
            const detail = err?.error?.detail || 'Failed to create fixed fee configuration.';
            Swal.fire('Error', detail, 'error');
          }
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
