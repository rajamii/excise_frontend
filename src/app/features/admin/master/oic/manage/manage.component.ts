import { Component, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import Swal from 'sweetalert2';
import {
  AdminService,
  CreateOICOfficerPayload,
  OICApprovedEstablishment
} from '../../../admin.service';
import { MaterialModule } from '../../../../../shared/material.module';

@Component({
  selector: 'app-oic-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  establishments: OICApprovedEstablishment[] = [];
  isLoading = false;
  isSaving = false;
  submitAttempted = false;

  form: CreateOICOfficerPayload = {
    approvedApplicationId: '',
    name: '',
    email: '',
    phoneNumber: ''
  };

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.loadEstablishments();
  }

  loadEstablishments(): void {
    this.isLoading = true;
    this.adminService.getOICApprovedEstablishments().subscribe({
      next: (rows) => {
        this.establishments = Array.isArray(rows) ? rows : [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load approved establishments:', error);
        this.establishments = [];
        this.isLoading = false;
      }
    });
  }

  onSave(): void {
    this.submitAttempted = true;
    if (!this.form.approvedApplicationId || !this.form.name || !this.form.email || !this.form.phoneNumber) {
      return;
    }

    this.isSaving = true;
    this.adminService.createOICOfficer(this.form).subscribe({
      next: (response) => {
        this.isSaving = false;
        Swal.fire('Success', 'Officer created successfully.', 'success');
        this.dialogRef.close({
          refresh: true,
          credentials: response?.credentials || null
        });
      },
      error: (error) => {
        this.isSaving = false;
        const backendError = error?.error;
        let message = backendError?.detail || 'Failed to create officer.';

        if (!backendError?.detail && backendError && typeof backendError === 'object') {
          const fieldMessages = Object.entries(backendError)
            .map(([field, value]) => {
              const text = Array.isArray(value) ? value.join(', ') : String(value);
              return `${field}: ${text}`;
            })
            .join('\n');
          if (fieldMessages) {
            message = fieldMessages;
          }
        }
        Swal.fire('Error', message, 'error');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
