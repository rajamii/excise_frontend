import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { BrandWarehouse, BrandWarehouseService } from '../../../../../licensee/supplyChain/services/brand-warehouse.service';
import { AdminService } from '../../../../admin.service';
import { ActiveLicense } from '../../../../../../core/models/active-license.model';
import { MasterService } from '../../../../../../core/services/master.service';

type MasterBrandRow = { id: number; brandName: string };
type LiquorCategoryRow = { id: number; sizeMl: number };

@Component({
  selector: 'app-brand-warehouse-stock-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './stock-manage.component.html',
  styleUrl: './stock-manage.component.scss',
})
export class StockManageComponent implements OnInit {
  row: Partial<BrandWarehouse> & {
    ex_factory_price_rs_per_case?: number;
    excise_duty_rs_per_case?: number;
    education_cess_rs_per_case?: number;
    additional_excise_duty_rs_per_case?: number;
    additional_excise_duty_12_5_percent_rs_per_case?: number;
    mrp_rs_per_bottle?: number;
  } = {
    license_id: '',
    brand_id: null,
    liquor_type: null,
    capacity_size: 0,
    current_stock: 0,
    ex_factory_price_rs_per_case: 0,
    excise_duty_rs_per_case: 0,
    education_cess_rs_per_case: 0,
    additional_excise_duty_rs_per_case: 0,
    additional_excise_duty_12_5_percent_rs_per_case: 0,
    mrp_rs_per_bottle: 0,
  };

  licenses: ActiveLicense[] = [];
  manufacturingLicenses: ActiveLicense[] = [];
  brands: MasterBrandRow[] = [];
  sizes: LiquorCategoryRow[] = [];
  isEditMode = false;
  brandMlInCasesList: any[] = [];
  liquorTypes: any[] = [];

  // Brand/size are free-text / numeric inputs (no dropdowns)
  brandName = '';
  sizeMl: number | null = null;
  piecesInCase: number | null = null;

  constructor(
    private brandWarehouseService: BrandWarehouseService,
    private adminService: AdminService,
    private masterService: MasterService,
    public dialogRef: MatDialogRef<StockManageComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: { row?: Partial<BrandWarehouse>; brands: MasterBrandRow[]; sizes: LiquorCategoryRow[] }
  ) {}

  ngOnInit(): void {
    if (this.data?.row?.id) {
      this.row = {
        ...this.data.row,
        ex_factory_price_rs_per_case: Number((this.data.row as any).ex_factory_price_rs_per_case ?? 0),
        excise_duty_rs_per_case: Number((this.data.row as any).excise_duty_rs_per_case ?? 0),
        education_cess_rs_per_case: Number((this.data.row as any).education_cess_rs_per_case ?? 0),
        additional_excise_duty_rs_per_case: Number((this.data.row as any).additional_excise_duty_rs_per_case ?? 0),
        additional_excise_duty_12_5_percent_rs_per_case: Number((this.data.row as any).additional_excise_duty_12_5_percent_rs_per_case ?? 0),
        mrp_rs_per_bottle: Number((this.data.row as any).mrp_rs_per_bottle ?? 0),
      };
      this.isEditMode = true;
      this.brandName = String((this.data.row as any).brand_name ?? (this.data.row as any).brandName ?? '').trim();
      this.sizeMl = Number((this.data.row as any).capacity_size ?? (this.data.row as any).capacitySize ?? 0) || null;
    }

    this.brands = this.data?.brands || [];
    this.sizes = this.data?.sizes || [];

    this.masterService.getLiquorTypes().subscribe({
      next: (data: any) => {
        this.liquorTypes = Array.isArray(data) ? data : (data?.data || data?.results || []);
      },
      error: () => {
        this.liquorTypes = [];
      },
    });

    this.adminService.getActiveLicenses().subscribe({
      next: (data) => {
        this.licenses = Array.isArray(data) ? data : [];
        const manufacturingOnly = this.licenses.filter((lic) => {
          const cat = String((lic as any).license_category ?? (lic as any).licenseCategory ?? '').trim().toLowerCase();
          return cat.includes('manufactur');
        });
        this.manufacturingLicenses = manufacturingOnly.length > 0 ? manufacturingOnly : this.licenses;
      },
      error: () => {
        this.licenses = [];
        this.manufacturingLicenses = [];
      },
    });

    // Load brand-ml-in-cases list for dropdown and lookup piecesInCase
    this.masterService.getBrandMlInCases().subscribe({
      next: (data: any) => {
        this.brandMlInCasesList = Array.isArray(data) ? data : [];
        const ml = Number(this.sizeMl || 0);
        if (ml > 0 && this.piecesInCase == null) {
          const found = this.brandMlInCasesList.find((x: any) => Number(x.ml) === ml);
          if (found) {
            this.piecesInCase = Number(found.piecesInCase ?? found.pieces_in_case ?? 0) || null;
          }
        }
      },
      error: () => {},
    });
  }

  onSizeMlChange(value: number): void {
    this.sizeMl = value;
    const found = this.brandMlInCasesList.find((x: any) => Number(x.ml) === Number(value));
    if (found) {
      this.piecesInCase = Number(found.piecesInCase ?? found.pieces_in_case ?? 0) || null;
    } else {
      this.piecesInCase = null;
    }
  }

  onSave(): void {
    const resolvedBrandName = String(this.brandName || '').trim();
    if (!resolvedBrandName) {
      Swal.fire('Validation', 'Please enter a brand name.', 'warning');
      return;
    }

    const resolvedSize = Number(this.sizeMl || 0);
    if (!resolvedSize || resolvedSize <= 0) {
      Swal.fire('Validation', 'Please enter a valid size in ml.', 'warning');
      return;
    }

    const resolvedPieces = Number(this.piecesInCase || 0);
    if (!resolvedPieces || resolvedPieces <= 0) {
      Swal.fire('Validation', 'Please enter pieces in case.', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update stock row?' : 'Add stock row?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload: any = {
        license_id: String(this.row.license_id || '').trim(),
        brand_id: null,
        liquor_type: this.row.liquor_type || null,
        capacity_size: resolvedSize,
        current_stock: Number(this.row.current_stock || 0),
        ex_factory_price_rs_per_case: Number(this.row.ex_factory_price_rs_per_case ?? 0),
        excise_duty_rs_per_case: Number(this.row.excise_duty_rs_per_case ?? 0),
        education_cess_rs_per_case: Number(this.row.education_cess_rs_per_case ?? 0),
        additional_excise_duty_rs_per_case: Number(this.row.additional_excise_duty_rs_per_case ?? 0),
        additional_excise_duty_12_5_percent_rs_per_case: Number(this.row.additional_excise_duty_12_5_percent_rs_per_case ?? 0),
        mrp_rs_per_bottle: Number(this.row.mrp_rs_per_bottle ?? 0),
      };

      const save = (finalPayload: any) => {
        const request = this.isEditMode && this.row.id
          ? this.brandWarehouseService.patchBrandWarehouse(this.row.id as number, finalPayload)
          : this.brandWarehouseService.createBrandWarehouse(finalPayload);

        request.subscribe({
          next: () => {
            Swal.fire('Success', this.isEditMode ? 'Updated successfully.' : 'Added successfully.', 'success');
            this.dialogRef.close(true);
          },
          error: (err: any) => {
            const msg = err?.error?.detail || err?.error?.message || 'Failed to save row.';
            Swal.fire('Error', msg, 'error');
          },
        });
      };

      // Ensure brand_ml_in_cases is updated for this ml (required by transit permit flows)
      const upsertBrandMlInCases = (onDone: () => void) => {
        this.masterService.getBrandMlInCases().subscribe({
          next: (data: any) => {
            const rows = Array.isArray(data) ? data : [];
            const existing = rows.find((x: any) => Number(x.ml) === resolvedSize);
            if (existing?.id) {
              this.adminService.updateBrandMlInCases(Number(existing.id), {
                ml: resolvedSize,
                piecesInCase: resolvedPieces,
              } as any).subscribe({
                next: () => onDone(),
                error: () => Swal.fire('Error', 'Failed to update Brand ML in Cases.', 'error'),
              });
              return;
            }

            this.adminService.addBrandMlInCases({
              ml: resolvedSize,
              piecesInCase: resolvedPieces,
            } as any).subscribe({
              next: () => onDone(),
              error: () => Swal.fire('Error', 'Failed to create Brand ML in Cases.', 'error'),
            });
          },
          error: () => Swal.fire('Error', 'Failed to load Brand ML in Cases.', 'error'),
        });
      };

      // Find existing master brand by exact name (case-insensitive). If not found, create it.
      this.masterService.getMasterBrands(resolvedBrandName).subscribe({
        next: (resp: any) => {
          const data = resp?.data || resp?.results || resp || [];
          const list: MasterBrandRow[] = Array.isArray(data)
            ? data.map((x: any) => ({ id: Number(x.id), brandName: String(x.brandName ?? x.brand_name ?? '').trim() }))
            : [];

          const match = list.find((x) => x.brandName.toLowerCase() === resolvedBrandName.toLowerCase());
          if (match?.id) {
            upsertBrandMlInCases(() => save({ ...payload, brand_id: match.id }));
            return;
          }

          this.masterService.createMasterBrand({ brandName: resolvedBrandName, liquorTypeId: this.row.liquor_type || null }).subscribe({
            next: (createdResp: any) => {
              const created = createdResp?.data || createdResp;
              const newId = Number(created?.id);
              if (!newId) {
                Swal.fire('Error', 'Brand created but id not returned.', 'error');
                return;
              }
              upsertBrandMlInCases(() => save({ ...payload, brand_id: newId }));
            },
            error: (err: any) => {
              const msg =
                err?.error?.brandName?.[0] ||
                err?.error?.brand_name?.[0] ||
                err?.error?.detail ||
                'Failed to create brand.';
              Swal.fire('Error', msg, 'error');
            },
          });
        },
        error: () => {
          // If search fails, fall back to create.
          this.masterService.createMasterBrand({ brandName: resolvedBrandName, liquorTypeId: this.row.liquor_type || null }).subscribe({
            next: (createdResp: any) => {
              const created = createdResp?.data || createdResp;
              const newId = Number(created?.id);
              if (!newId) {
                Swal.fire('Error', 'Brand created but id not returned.', 'error');
                return;
              }
              upsertBrandMlInCases(() => save({ ...payload, brand_id: newId }));
            },
            error: (err: any) => {
              const msg =
                err?.error?.brandName?.[0] ||
                err?.error?.brand_name?.[0] ||
                err?.error?.detail ||
                'Failed to create brand.';
              Swal.fire('Error', msg, 'error');
            },
          });
        },
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
