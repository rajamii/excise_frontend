import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminService } from '../../../admin.service';
import { LicenseTitle } from '../../../../../core/models/license-title.model';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  licenseTitle: LicenseTitle = { 
    id: undefined,
    name: '',
    description: '' 
  };
  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LicenseTitle | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.licenseTitle = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update License Title?' : 'Add License Title?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.adminService.updateLicenseTitle(this.licenseTitle.id!, this.licenseTitle)
        : this.adminService.addLicenseTitle(this.licenseTitle);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'License title updated!' : 'License title added!', 'success');
          this.dialogRef.close(true);
        },
        error: () => {
          Swal.fire('Error', 'Failed to save license title.', 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}