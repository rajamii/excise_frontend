import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { AdminService } from '../../../admin.service';
import { HologramSupplier } from '../../../../../core/models/hologram-supplier.model';

@Component({
  selector: 'app-hologram-supplier-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  supplier: HologramSupplier = {
    companyName: '',
    post: '',
    address: '',
    state: '',
    isActive: true
  };

  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HologramSupplier | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.supplier = { ...this.data };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update Hologram Supplier?' : 'Add Hologram Supplier?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      // Send camelCase — djangorestframework_camel_case parser converts to snake_case for Django
      const payload: HologramSupplier = {
        companyName: this.supplier.companyName,
        post: this.supplier.post || '',
        address: this.supplier.address || '',
        state: this.supplier.state || '',
        isActive: this.supplier.isActive ?? true
      };

      const request = this.isEditMode
        ? this.adminService.updateHologramSupplier(this.supplier.id!, payload)
        : this.adminService.addHologramSupplier(payload);

      request.subscribe({
        next: () => {
          Swal.fire(
            'Success',
            this.isEditMode ? 'Hologram supplier updated!' : 'Hologram supplier added!',
            'success'
          );
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          const msg = err?.error?.companyName?.[0] || err?.error?.company_name?.[0] || 'Failed to save hologram supplier.';
          Swal.fire('Error', msg, 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
