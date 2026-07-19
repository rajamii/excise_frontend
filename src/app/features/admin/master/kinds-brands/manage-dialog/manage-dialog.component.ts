import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { CompanyCollaborationService } from '../../../../../core/services/company-collaboration.service';

@Component({
  selector: 'app-manage-dialog',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage-dialog.component.html',
  styleUrl: './manage-dialog.component.scss'
})
export class ManageDialogComponent implements OnInit {
  type = 'category'; // category | kind | type | brand
  isEditMode = false;
  sizesOnly = false;

  // Option lists
  categories: any[] = [];
  kinds: any[] = [];
  types: any[] = [];

  // Pack sizes (brand tab only)
  packSizes: any[] = [];
  newSizeInput: number | null = null;
  packSizesLoading = false;

  // Model object
  model: any = {};

  constructor(
    private companyCollabService: CompanyCollaborationService,
    public dialogRef: MatDialogRef<ManageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.type = this.data.type;
    this.categories = this.data.categories || [];
    this.kinds = this.data.kinds || [];
    this.types = this.data.types || [];
    this.sizesOnly = !!this.data.sizesOnly;

    if (this.data.element) {
      this.model = { ...this.data.element };
      this.isEditMode = true;

      // Load pack sizes if editing a brand
      if (this.type === 'brand' && this.model.liquorBrandCode) {
        this.loadPackSizes();
      }
    } else {
      this.initDefaultModel();
    }
  }

  initDefaultModel(): void {
    if (this.type === 'category') {
      this.model = {
        liquorCatCode: null,
        liquorCatDesc: '',
        liquorCatAbbr: '',
        deleteStatus: 'N'
      };
    } else if (this.type === 'kind') {
      this.model = {
        liquorCat: null,
        liquorKindCode: null,
        liquorKindDesc: '',
        liquorKindAbbr: '',
        deleteStatus: 'N'
      };
    } else if (this.type === 'type') {
      this.model = {
        liquorCat: null,
        liquorKind: null,
        liquorTypeCode: null,
        liquorTypeDesc: '',
        liquorTypeCodeOld: '',
        deleteStatus: 'N'
      };
    } else if (this.type === 'brand') {
      this.model = {
        liquorBrandCode: '',
        liquorCat: null,
        liquorKind: null,
        liquorType: null,
        liquorBrandDesc: '',
        brandNameAlias: '',
        liquorTypeCodeOld: '',
        entryFlag: 'Y',
        deleteStatus: 'N'
      };
    }
  }

  // ── Pack Sizes ──────────────────────────────────────────────────────────────

  loadPackSizes(): void {
    this.packSizesLoading = true;
    this.companyCollabService.getBrandPackSizes(this.model.liquorBrandCode).subscribe({
      next: (data) => {
        this.packSizes = Array.isArray(data) ? data : [];
        this.packSizesLoading = false;
      },
      error: () => {
        this.packSizes = [];
        this.packSizesLoading = false;
      }
    });
  }

  onAddSize(): void {
    if (!this.newSizeInput || !this.model.liquorBrandCode) return;
    const val = Number(this.newSizeInput);
    if (isNaN(val) || val <= 0) {
      Swal.fire('Invalid', 'Please enter a valid size in Ml.', 'warning');
      return;
    }

    // If editing, add directly via API
    if (this.isEditMode) {
      this.companyCollabService.addBrandPackSize(this.model.liquorBrandCode, val).subscribe({
        next: (size) => {
          this.packSizes.push(size);
          this.newSizeInput = null;
        },
        error: (err) => {
          Swal.fire('Error', err?.error?.detail || 'Failed to add pack size.', 'error');
        }
      });
    } else {
      // If adding a new brand, store locally — save after brand is created
      const already = this.packSizes.find(s => s.measureValue === val);
      if (already) {
        Swal.fire('Duplicate', 'This size is already in the list.', 'warning');
        return;
      }
      this.packSizes.push({ measureValue: val, label: `${val} Ml`, tempId: Date.now() });
      this.newSizeInput = null;
    }
  }

  onRemoveSize(size: any, index: number): void {
    Swal.fire({
      title: `Remove ${size.label}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remove'
    }).then(result => {
      if (!result.isConfirmed) return;

      if (size.id && this.isEditMode) {
        this.companyCollabService.deleteBrandPackSize(size.id).subscribe({
          next: () => this.packSizes.splice(index, 1),
          error: () => Swal.fire('Error', 'Failed to remove pack size.', 'error')
        });
      } else {
        this.packSizes.splice(index, 1);
      }
    });
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  onSave(): void {
    Swal.fire({
      title: this.isEditMode ? 'Update Record?' : 'Add Record?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      let request: any;

      if (this.type === 'category') {
        const payload = {
          liquor_cat_code: this.model.liquorCatCode,
          liquor_cat_desc: this.model.liquorCatDesc,
          liquor_cat_abbr: this.model.liquorCatAbbr,
          delete_status: this.model.deleteStatus || 'N'
        };
        request = this.isEditMode
          ? this.companyCollabService.updateCategoryCrud(this.model.liquorCatCode, payload)
          : this.companyCollabService.createCategoryCrud(payload);

      } else if (this.type === 'kind') {
        const payload = {
          liquor_cat: this.model.liquorCat,
          liquor_kind_code: this.model.liquorKindCode,
          liquor_kind_desc: this.model.liquorKindDesc,
          liquor_kind_abbr: this.model.liquorKindAbbr,
          delete_status: this.model.deleteStatus || 'N'
        };
        request = this.isEditMode
          ? this.companyCollabService.updateKindCrud(this.model.id, payload)
          : this.companyCollabService.createKindCrud(payload);

      } else if (this.type === 'type') {
        const payload = {
          liquor_cat: this.model.liquorCat,
          liquor_kind: this.model.liquorKind,
          liquor_type_code: this.model.liquorTypeCode,
          liquor_type_desc: this.model.liquorTypeDesc,
          liquor_type_code_old: this.model.liquorTypeCodeOld,
          delete_status: this.model.deleteStatus || 'N'
        };
        request = this.isEditMode
          ? this.companyCollabService.updateTypeCrud(this.model.id, payload)
          : this.companyCollabService.createTypeCrud(payload);

      } else if (this.type === 'brand') {
        const payload = {
          liquor_brand_code: this.model.liquorBrandCode,
          liquor_cat: this.model.liquorCat,
          liquor_kind: this.model.liquorKind,
          liquor_type: this.model.liquorType,
          liquor_brand_desc: this.model.liquorBrandDesc,
          brand_name_alias: this.model.brandNameAlias,
          liquor_type_code_old: this.model.liquorTypeCodeOld,
          entry_flag: this.model.entryFlag || 'Y',
          delete_status: this.model.deleteStatus || 'N'
        };
        request = this.isEditMode
          ? this.companyCollabService.updateBrandCrud(this.model.id, payload)
          : this.companyCollabService.createBrandCrud(payload);
      }

      if (request) {
        request.subscribe({
          next: (saved: any) => {
            // If new brand and we have local pack sizes to add, save them now
            if (!this.isEditMode && this.type === 'brand' && this.packSizes.length > 0) {
              const brandCode = this.model.liquorBrandCode;
              const addCalls = this.packSizes.map((s: any) =>
                this.companyCollabService.addBrandPackSize(brandCode, s.measureValue).toPromise().catch(() => null)
              );
              Promise.all(addCalls).then(() => {
                Swal.fire('Success', 'Brand & pack sizes saved!', 'success');
                this.dialogRef.close(true);
              });
            } else {
              Swal.fire('Success', this.isEditMode ? 'Record updated!' : 'Record added!', 'success');
              this.dialogRef.close(true);
            }
          },
          error: (err: any) => {
            Swal.fire('Error', err?.error?.detail || 'Failed to save record.', 'error');
          }
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
