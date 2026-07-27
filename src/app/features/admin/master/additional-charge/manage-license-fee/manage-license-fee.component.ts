import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseFee } from '../../../../../core/models/license-fee.model';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';
import { MasterLocation } from '../../../../../core/models/master-location.model';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-manage-license-fee',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage-license-fee.component.html',
  styleUrl: './manage-license-fee.component.scss'
})
export class ManageLicenseFeeComponent implements OnInit {
  feeRecord: LicenseFee = {
    id: 0,
    licenseCategory: undefined,
    licenseSubcategory: undefined,
    locationCode: undefined,
    licenseFee: 0,
    securityAmount: 0,
    renewalAmount: 0,
    lateFee: 0,
    isActive: true
  };

  isEditMode = false;
  categories: LicenseCategory[] = [];
  allSubcategories: LicenseSubcategory[] = [];
  filteredSubcategories: LicenseSubcategory[] = [];
  locations: MasterLocation[] = [];

  constructor(
    private masterService: MasterService,
    public dialogRef: MatDialogRef<ManageLicenseFeeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LicenseFee | null
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadSubcategories();
    this.loadLocations();

    if (this.data) {
      this.feeRecord = { ...this.data };
      this.isEditMode = true;
    }
  }

  loadCategories(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data) => (this.categories = data),
      error: () => Swal.fire('Error', 'Failed to load categories.', 'error')
    });
  }

  loadSubcategories(): void {
    this.masterService.getLicenseSubcategories().subscribe({
      next: (data) => {
        this.allSubcategories = data;
        if (this.isEditMode) {
          this.filterSubcategories();
        }
      },
      error: () => Swal.fire('Error', 'Failed to load subcategories.', 'error')
    });
  }

  loadLocations(): void {
    this.masterService.getLocations().subscribe({
      next: (data) => (this.locations = data),
      error: () => Swal.fire('Error', 'Failed to load locations.', 'error')
    });
  }

  onCategoryChange(): void {
    this.feeRecord.licenseSubcategory = undefined; // reset subcategory on category change
    this.filterSubcategories();
  }

  filterSubcategories(): void {
    if (this.feeRecord.licenseCategory) {
      const selectedCatId = Number(this.feeRecord.licenseCategory);
      this.filteredSubcategories = this.allSubcategories.filter((sub: any) => {
        let catId: number | undefined;
        if (sub.category !== undefined && sub.category !== null) {
          if (typeof sub.category === 'object') {
            catId = sub.category.id;
          } else {
            catId = Number(sub.category);
          }
        }
        return catId === selectedCatId;
      });
    } else {
      this.filteredSubcategories = [];
    }
  }

  onSave(): void {
    if (!this.feeRecord.licenseCategory || !this.feeRecord.licenseSubcategory) {
      Swal.fire('Warning', 'Category and Subcategory are required.', 'warning');
      return;
    }

    const feeVal = Number(this.feeRecord.licenseFee || 0);
    const secVal = Number(this.feeRecord.securityAmount || 0);
    const renVal = Number(this.feeRecord.renewalAmount || 0);
    const lateVal = Number(this.feeRecord.lateFee || 0);

    if (feeVal < 0 || secVal < 0 || renVal < 0 || lateVal < 0) {
      Swal.fire('Warning', 'Amounts cannot be negative.', 'warning');
      return;
    }

    // Assign parsed numeric values to model
    this.feeRecord.licenseFee = feeVal;
    this.feeRecord.securityAmount = secVal;
    this.feeRecord.renewalAmount = renVal;
    this.feeRecord.lateFee = lateVal;

    Swal.fire({
      title: this.isEditMode ? 'Update License Fee?' : 'Save License Fee?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.masterService.updateLicenseFee(this.feeRecord.id!, this.feeRecord)
        : this.masterService.createLicenseFee(this.feeRecord);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'License fee updated!' : 'License fee added!', 'success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          const detail = err?.error?.detail || err?.error?.nonFieldErrors?.[0] || 'Failed to save license fee configuration.';
          Swal.fire('Error', detail, 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
