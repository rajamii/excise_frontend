import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { AdminService } from '../../../../admin.service';
import { EnaBulkSpiritType } from '../../../../../../core/models/ena-bulk-spirit.model';
import { ActiveLicense } from '../../../../../../core/models/active-license.model';

@Component({
  selector: 'app-ena-bulk-spirit-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent implements OnInit {
  row: EnaBulkSpiritType = {
    bulkSpiritKindType: '',
    strength: '',
    priceBl: 0,
    licenseId: null,
  };

  licenses: ActiveLicense[] = [];
  selectedLicenseIds: string[] = [];
  isEditMode = false;

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EnaBulkSpiritType | null
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
    if (!this.row.bulkSpiritKindType?.trim() || !this.row.strength?.trim()) {
      Swal.fire('Validation', 'Bulk spirit type and strength are required.', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update bulk spirit type?' : 'Add bulk spirit type?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload: EnaBulkSpiritType = {
        bulkSpiritKindType: this.row.bulkSpiritKindType.trim(),
        strength: this.row.strength.trim(),
        priceBl: Number(this.row.priceBl ?? 0),
        licenseId: this.isEditMode && this.row.licenseId ? String(this.row.licenseId).trim() : null,
        license_ids: !this.isEditMode && this.selectedLicenseIds.length > 0 ? this.selectedLicenseIds : null
      };

      const request = this.isEditMode
        ? this.adminService.updateEnaBulkSpiritType(this.row.spritId!, payload)
        : this.adminService.addEnaBulkSpiritType(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Updated successfully.' : 'Added successfully.', 'success');
          this.dialogRef.close(true);
        },
        error: () => Swal.fire('Error', 'Failed to save bulk spirit type.', 'error'),
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

