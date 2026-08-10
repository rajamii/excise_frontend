import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';

export interface SubcategoryDialogData {
  category: LicenseCategory;
}

@Component({
  selector: 'app-subcategory-dialog',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './subcategory-dialog.component.html',
  styleUrl: './subcategory-dialog.component.scss'
})
export class SubcategoryDialogComponent implements OnInit {
  category: LicenseCategory;
  subcategories: LicenseSubcategory[] = [];
  isLoading = false;

  // Inline add/edit form state
  showAddForm = false;
  editingId: number | null = null;
  formDescription = '';
  formDryDayFeeType: string | null = null;
  formRuralFee: number | string = '';
  formUrbanFee: number | string = '';
  formNonFee: number | string = '';
  isSaving = false;

  displayedColumns = ['sno', 'description', 'dryDay', 'fees', 'status', 'actions'];
  fixedFees: any[] = [];

  get isDryDayPermittedCategory(): boolean {
    // Dynamic: use the is_special_permit_allowed flag set by admin on the License Category.
    // This replaces the old hardcoded list of category names.
    return this.category?.isSpecialPermitAllowed === true;
  }

  constructor(
    public dialogRef: MatDialogRef<SubcategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SubcategoryDialogData,
    private masterService: MasterService,
    private adminService: AdminService
  ) {
    this.category = data.category;
  }

  ngOnInit(): void {
    if (this.isDryDayPermittedCategory) {
      this.displayedColumns = ['sno', 'description', 'dryDay', 'fees', 'status', 'actions'];
    } else {
      this.displayedColumns = ['sno', 'description', 'status', 'actions'];
    }
    this.loadSubcategories();
  }

  loadSubcategories(): void {
    this.isLoading = true;
    this.masterService.getFixedFees().subscribe({
      next: (fees: any[]) => {
        this.fixedFees = (fees || []).map((item: any) => ({
          feeCode: item.feeCode || item.fee_code,
          feeDesc: item.feeDesc || item.fee_desc,
          amount: item.amount,
          isActive: item.isActive !== undefined ? item.isActive : item.is_active,
          licenseCategory: item.licenseCategory !== undefined ? item.licenseCategory : item.license_category,
          licenseSubcategory: item.licenseSubcategory !== undefined ? item.licenseSubcategory : item.license_subcategory,
          mode: item.mode,
          feeType: item.feeType || item.fee_type,
          licenseCategoryName: item.licenseCategoryName || item.license_category_name,
          licenseSubcategoryName: item.licenseSubcategoryName || item.license_subcategory_name
        }));
        this.fetchSubcategories();
      },
      error: () => {
        console.error('Failed to load fixed fees.');
        this.fetchSubcategories();
      }
    });
  }

  private fetchSubcategories(): void {
    this.masterService.getLicenseSubcategories().subscribe({
      next: (all: LicenseSubcategory[]) => {
        // Filter subcategories belonging to this category
        this.subcategories = all.filter(s => {
          const catId = typeof s.category === 'object'
            ? (s.category as any)?.id
            : s.category;
          return catId === this.category.id;
        });
        this.isLoading = false;
      },
      error: () => {
        Swal.fire('Error', 'Failed to load subcategories.', 'error');
        this.isLoading = false;
      }
    });
  }

  getFeeForMode(sub: LicenseSubcategory, mode: string): string {
    const feeType = this.getDryDayFeeType(sub);
    if (!feeType) return '-';

    // Find fixed fee matching category, subcategory, mode and feeType
    const match = this.fixedFees.find(f => {
      const catId = typeof f.licenseCategory === 'object' ? (f.licenseCategory as any)?.id : f.licenseCategory;
      const subId = typeof f.licenseSubcategory === 'object' ? (f.licenseSubcategory as any)?.id : f.licenseSubcategory;
      return catId === this.category.id && subId === sub.id && f.mode === mode && f.feeType === feeType;
    });

    if (match) {
      return `₹${Number(match.amount).toFixed(2)}`;
    }

    // Try fallback without specific feeType
    const matchFallback = this.fixedFees.find(f => {
      const catId = typeof f.licenseCategory === 'object' ? (f.licenseCategory as any)?.id : f.licenseCategory;
      const subId = typeof f.licenseSubcategory === 'object' ? (f.licenseSubcategory as any)?.id : f.licenseSubcategory;
      return catId === this.category.id && subId === sub.id && f.mode === mode && !f.feeType;
    });

    if (matchFallback) {
      return `₹${Number(matchFallback.amount).toFixed(2)}`;
    }

    return '-';
  }

  getFeeValueForMode(sub: LicenseSubcategory, mode: string): string {
    const feeType = this.getDryDayFeeType(sub);
    if (!feeType) return '';

    const match = this.fixedFees.find(f => {
      const catId = typeof f.licenseCategory === 'object' ? (f.licenseCategory as any)?.id : f.licenseCategory;
      const subId = typeof f.licenseSubcategory === 'object' ? (f.licenseSubcategory as any)?.id : f.licenseSubcategory;
      return catId === this.category.id && subId === sub.id && f.mode === mode && f.feeType === feeType;
    });

    if (match) return String(match.amount);

    const matchFallback = this.fixedFees.find(f => {
      const catId = typeof f.licenseCategory === 'object' ? (f.licenseCategory as any)?.id : f.licenseCategory;
      const subId = typeof f.licenseSubcategory === 'object' ? (f.licenseSubcategory as any)?.id : f.licenseSubcategory;
      return catId === this.category.id && subId === sub.id && f.mode === mode && !f.feeType;
    });

    if (matchFallback) return String(matchFallback.amount);

    return '';
  }

  // ─── Dry Day Fee Type helper — handles camelCase from API ────────────────

  getDryDayFeeType(sub: LicenseSubcategory): string | null {
    // djangorestframework_camel_case converts dry_day_fee_type → dryDayFeeType
    return sub.dryDayFeeType ?? sub.dry_day_fee_type ?? null;
  }

  // ─── Add ─────────────────────────────────────────────────────────────────

  openAddForm(): void {
    this.showAddForm = true;
    this.editingId = null;
    this.formDescription = '';
    this.formDryDayFeeType = null;
    this.formRuralFee = '';
    this.formUrbanFee = '';
    this.formNonFee = '';
  }

  cancelForm(): void {
    this.showAddForm = false;
    this.editingId = null;
    this.formDescription = '';
    this.formDryDayFeeType = null;
    this.formRuralFee = '';
    this.formUrbanFee = '';
    this.formNonFee = '';
  }

  saveNew(): void {
    if (!this.formDescription.trim()) return;
    this.isSaving = true;
    const payload = {
      description: this.formDescription.trim(),
      category: this.category.id,
      dryDayFeeType: this.formDryDayFeeType
    };
    this.adminService.addLicenseSubcategory(payload as any).subscribe({
      next: (createdSub: any) => {
        if (createdSub && createdSub.id) {
          this.saveFeesForSubcategory(createdSub, this.formDryDayFeeType).then(() => {
            this.isSaving = false;
            this.cancelForm();
            this.loadSubcategories();
          });
        } else {
          this.masterService.getLicenseSubcategories().subscribe({
            next: (all: LicenseSubcategory[]) => {
              const matched = all.find(s => s.description === payload.description);
              if (matched) {
                this.saveFeesForSubcategory(matched, this.formDryDayFeeType).then(() => {
                  this.isSaving = false;
                  this.cancelForm();
                  this.loadSubcategories();
                });
              } else {
                this.isSaving = false;
                this.cancelForm();
                this.loadSubcategories();
              }
            },
            error: () => {
              this.isSaving = false;
              this.cancelForm();
              this.loadSubcategories();
            }
          });
        }
      },
      error: () => {
        this.isSaving = false;
        Swal.fire('Error', 'Failed to add subcategory.', 'error');
      }
    });
  }

  // ─── Inline Edit ──────────────────────────────────────────────────────────

  startEdit(sub: LicenseSubcategory): void {
    this.editingId = sub.id!;
    this.formDescription = sub.description || '';
    this.formDryDayFeeType = this.getDryDayFeeType(sub);
    this.showAddForm = false;
    this.formRuralFee = this.getFeeValueForMode(sub, 'rural');
    this.formUrbanFee = this.getFeeValueForMode(sub, 'urban');
    this.formNonFee = this.getFeeValueForMode(sub, 'non');
  }

  cancelEdit(): void {
    this.editingId = null;
    this.formDescription = '';
    this.formDryDayFeeType = null;
    this.formRuralFee = '';
    this.formUrbanFee = '';
    this.formNonFee = '';
  }

  saveFeesForSubcategory(sub: LicenseSubcategory, feeType: string | null): Promise<void> {
    if (!feeType) {
      return Promise.resolve();
    }

    const catId = this.category.id;
    const subId = sub.id!;
    const modes = ['rural', 'urban', 'non'];
    const promises: Promise<any>[] = [];

    const feeInputs: { [key: string]: any } = {
      rural: this.formRuralFee,
      urban: this.formUrbanFee,
      non: this.formNonFee
    };

    modes.forEach(mode => {
      const inputVal = feeInputs[mode];
      const feeCode = `DRY_DAY_C${catId}_S${subId}_${mode.toUpperCase()}_${feeType.toUpperCase()}`;
      
      const existing = this.fixedFees.find(f => {
        const cId = typeof f.licenseCategory === 'object' ? (f.licenseCategory as any)?.id : f.licenseCategory;
        const sId = typeof f.licenseSubcategory === 'object' ? (f.licenseSubcategory as any)?.id : f.licenseSubcategory;
        return (f.feeCode === feeCode) || 
               (cId === catId && sId === subId && f.mode === mode && f.feeType === feeType);
      });

      const actualCode = existing ? existing.feeCode : feeCode;

      if (inputVal === null || inputVal === undefined || String(inputVal).trim() === '') {
        if (existing) {
          promises.push(new Promise((resolve, reject) => {
            this.masterService.deleteFixedFee(actualCode).subscribe({
              next: resolve,
              error: reject
            });
          }));
        }
      } else {
        const amount = Number(inputVal);
        if (isNaN(amount) || amount < 0) {
          return;
        }

        const payload = {
          fee_code: actualCode,
          fee_desc: `Dry-Day Override for Category: ${this.category.licenseCategory}, Subcategory: ${sub.description} (${mode.toUpperCase()})`,
          amount: amount,
          is_active: true,
          license_category: catId,
          license_subcategory: subId,
          mode: mode,
          fee_type: feeType
        };

        if (existing) {
          promises.push(new Promise((resolve, reject) => {
            this.masterService.updateFixedFee(actualCode, payload).subscribe({
              next: resolve,
              error: reject
            });
          }));
        } else {
          promises.push(new Promise((resolve, reject) => {
            this.masterService.createFixedFee(payload).subscribe({
              next: resolve,
              error: reject
            });
          }));
        }
      }
    });

    return Promise.all(promises).then(() => {
      console.log('All dry day fees updated successfully.');
    }).catch(err => {
      console.error('Error saving subcategory mode fees:', err);
      Swal.fire('Error', 'Failed to save dry day fees. ' + (err?.error?.detail || JSON.stringify(err?.error || err)), 'error');
      throw err;
    });
  }

  saveEdit(sub: LicenseSubcategory): void {
    if (!this.formDescription.trim()) return;
    this.isSaving = true;

    const payload: any = {
      dryDayFeeType: this.formDryDayFeeType ?? null
    };

    const originalDesc = sub.description || '';
    if (this.formDescription.trim() !== originalDesc.trim()) {
      payload['description'] = this.formDescription.trim();
    }

    this.adminService.updateLicenseSubcategory(sub.id!, payload).subscribe({
      next: () => {
        this.saveFeesForSubcategory(sub, this.formDryDayFeeType).then(() => {
          this.isSaving = false;
          this.cancelEdit();
          this.loadSubcategories();
        }).catch(() => {
          this.isSaving = false;
        });
      },
      error: (err) => {
        this.isSaving = false;
        const detail = err?.error ? JSON.stringify(err.error) : 'Unknown error';
        console.error('Update subcategory error:', detail);
        Swal.fire('Error', 'Failed to update subcategory.', 'error');
      }
    });
  }

  // ─── Toggle Active ────────────────────────────────────────────────────────

  onToggleActive(sub: LicenseSubcategory): void {
    const action = sub.isActive !== false ? 'Deactivate' : 'Activate';
    Swal.fire({
      title: `${action}?`,
      text: `${action} "${sub.description}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: action,
      confirmButtonColor: sub.isActive !== false ? '#f59e0b' : '#10b981'
    }).then(result => {
      if (result.isConfirmed) {
        this.adminService.toggleLicenseSubcategoryActive(sub.id!).subscribe({
          next: () => { this.loadSubcategories(); },
          error: () => Swal.fire('Error', `Failed to ${action.toLowerCase()} subcategory.`, 'error')
        });
      }
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  onDelete(sub: LicenseSubcategory): void {
    Swal.fire({
      title: 'Delete?',
      text: `Remove "${sub.description}" from ${this.category.licenseCategory}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444'
    }).then(result => {
      if (result.isConfirmed) {
        this.adminService.deleteLicenseSubcategory(sub.id!).subscribe({
          next: () => { Swal.fire('Deleted!', 'Subcategory removed.', 'success'); this.loadSubcategories(); },
          error: () => Swal.fire('Error', 'Failed to delete subcategory.', 'error')
        });
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
