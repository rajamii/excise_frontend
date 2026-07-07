import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { AdminService } from '../../../../admin.service';
import { EnaDistilleryDetail } from '../../../../../../core/models/ena-distillery.model';
import { ActiveLicense } from '../../../../../../core/models/active-license.model';

@Component({
  selector: 'app-ena-distillery-details-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent implements OnInit {
  row: EnaDistilleryDetail = {
    distilleryName: '',
    distilleryAddress: '',
    distilleryState: '',
    viaRoute: '',
    licenseeId: null,
  };

  licenses: ActiveLicense[] = [];
  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EnaDistilleryDetail | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.row = { ...this.data };
      this.isEditMode = true;
    }
    this.loadLicenses();
  }

  private loadLicenses(): void {
    this.adminService.getActiveLicenses().subscribe({
      next: (rows) => {
        const all: ActiveLicense[] = Array.isArray(rows) ? rows : [];
        // Only show NA licenses with category "Manufacturing" and subcategory "Distillery"
        this.licenses = all.filter(l => {
          const id = String(l.id || '').toUpperCase();
          const category = String(l.license_category || '').toLowerCase();
          const subcategory = String(l.license_subcategory || '').toLowerCase();
          return id.startsWith('NA')
            && category.includes('manufactur')
            && subcategory.includes('distiller');
        });
      },
      error: () => {
        this.licenses = [];
      },
    });
  }

  onSave(): void {
    if (!this.row.distilleryName?.trim() || !this.row.distilleryState?.trim()) {
      Swal.fire('Validation', 'Lifted From name and state are required.', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update lifted from details?' : 'Add lifted from details?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload: EnaDistilleryDetail = {
        distilleryName: this.row.distilleryName.trim(),
        distilleryAddress: String(this.row.distilleryAddress || '').trim(),
        distilleryState: this.row.distilleryState.trim(),
        viaRoute: String(this.row.viaRoute || '').trim(),
        licenseeId: this.row.licenseeId ? String(this.row.licenseeId).trim() : null,
      };

      const request = this.isEditMode
        ? this.adminService.updateEnaDistilleryDetail(this.row.id!, payload)
        : this.adminService.addEnaDistilleryDetail(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated successfully.' : 'Added successfully.', 'success');
          this.dialogRef.close(true);
        },
        error: () => Swal.fire('Error', 'Failed to save lifted from details.', 'error'),
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

