import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { AdditionalChargeConfig } from '../../../../../core/models/additional-charge-config.model';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { AdminService } from '../../../admin.service';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-manage-additional-charge',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  config: AdditionalChargeConfig = {
    category: 0,
    chargeType: 'pachwai',
    isActive: true
  };
  licenseCategories: LicenseCategory[] = [];
  isEditMode = false;

  constructor(
    private adminService: AdminService,
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AdditionalChargeConfig | null
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    if (this.data) {
      this.config = { ...this.data };
      this.isEditMode = true;
    }
  }

  loadCategories(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data) => this.licenseCategories = data,
      error: () => Swal.fire('Error', 'Failed to load license categories.', 'error')
    });
  }

  onSave(): void {
    if (!this.config.category || !this.config.chargeType) {
      Swal.fire('Warning', 'Please fill in all required fields.', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Configuration?' : 'Save Configuration?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.adminService.updateAdditionalChargeConfig(this.config.id!, this.config)
        : this.adminService.addAdditionalChargeConfig(this.config);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Configuration updated!' : 'Configuration added!', 'success');
          this.dialogRef.close(true);
        },
        error: () => Swal.fire('Error', 'Failed to save configuration. Ensure category does not already have this charge type configured.', 'error')
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
