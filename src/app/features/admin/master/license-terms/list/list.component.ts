import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { MaterialModule } from '../../../../../shared/material.module';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { LicenseFormTermRow } from '../license-terms.model';

type LicenseCategoryRow = {
  id: number;
  license_category?: string;
  licenseCategory?: string;
  old_license_cat_code?: number | null;
  oldLicenseCatCode?: number | null;
};

type LicenseSubcategoryRow = {
  id: number;
  description: string;
  category: any;
  categoryId?: number | null;
  old_license_cat_code?: number | null;
  old_license_scat_code?: number | null;
  oldLicenseCatCode?: number | null;
  oldLicenseScatCode?: number | null;
};

@Component({
  selector: 'app-license-terms-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  categories: LicenseCategoryRow[] = [];
  subcategories: LicenseSubcategoryRow[] = [];
  filteredSubcategories: LicenseSubcategoryRow[] = [];

  selectedCategoryId: number | null = null;
  selectedSubcategoryId: number | null = null;

  resolvedLegacyCatCode: number | null = null;
  resolvedLegacyScatCode: number | null = null;

  loading = false;
  saving = false;

  termRows: Array<{ sl_no: number; text: string }> = [];

  get canManageTerms(): boolean {
    return this.resolvedLegacyCatCode !== null && this.resolvedLegacyScatCode !== null;
  }

  constructor(
    private masterService: MasterService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.loadMasters();
  }

  private loadMasters(): void {
    this.loading = true;

    this.masterService.getLicenseCategories().subscribe({
      next: (cats: any[]) => {
        this.categories = (Array.isArray(cats) ? cats : []) as LicenseCategoryRow[];
        this.masterService.getLicenseSubcategories().subscribe({
          next: (subs: any[]) => {
            this.subcategories = (Array.isArray(subs) ? subs : []) as LicenseSubcategoryRow[];
            this.filteredSubcategories = [...this.subcategories];
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            Swal.fire('Error', 'Failed to load license subcategories.', 'error');
          },
        });
      },
      error: () => {
        this.loading = false;
        Swal.fire('Error', 'Failed to load license categories.', 'error');
      },
    });
  }

  onCategoryChange(): void {
    this.selectedSubcategoryId = null;
    this.resolvedLegacyCatCode = null;
    this.resolvedLegacyScatCode = null;
    this.termRows = [];

    if (!this.selectedCategoryId) {
      this.filteredSubcategories = [...this.subcategories];
      return;
    }

    this.filteredSubcategories = this.subcategories.filter((s) => {
      const catId =
        typeof s?.category === 'number'
          ? s.category
          : Number(s?.category?.id || s?.category?.pk || s?.categoryId || 0);
      return catId === this.selectedCategoryId;
    });
  }

  onSubcategoryChange(): void {
    this.resolvedLegacyCatCode = null;
    this.resolvedLegacyScatCode = null;
    this.termRows = [];

    if (!this.selectedSubcategoryId) {
      return;
    }

    const sub = this.subcategories.find((s) => s.id === this.selectedSubcategoryId);
    if (!sub) {
      return;
    }

    const legacyCat =
      sub.old_license_cat_code ??
      sub.oldLicenseCatCode ??
      (typeof sub?.category === 'object'
        ? (sub?.category?.old_license_cat_code ?? sub?.category?.oldLicenseCatCode)
        : null);
    const legacyScat = sub.old_license_scat_code ?? sub.oldLicenseScatCode ?? null;

    if (legacyCat === null || legacyCat === undefined || legacyScat === null || legacyScat === undefined) {
      Swal.fire(
        'Missing Old Codes',
        'This subcategory does not have old_license_cat_code / old_license_scat_code. Please set them first in masters.',
        'warning'
      );
      return;
    }

    this.resolvedLegacyCatCode = Number(legacyCat);
    this.resolvedLegacyScatCode = Number(legacyScat);

    this.fetchTerms();
  }

  private fetchTerms(): void {
    if (this.resolvedLegacyCatCode === null || this.resolvedLegacyScatCode === null) {
      return;
    }

    this.loading = true;
    this.adminService.getLicenseFormTerms(this.resolvedLegacyCatCode, this.resolvedLegacyScatCode).subscribe({
      next: (resp) => {
        const raw = (resp as any)?.terms;
        const rows: Array<{ sl_no: number; text: string }> = [];

        if (Array.isArray(raw)) {
          raw.forEach((item: any, index: number) => {
            if (typeof item === 'string') {
              rows.push({ sl_no: index + 1, text: item.trim() });
              return;
            }

            const slCandidate = item?.sl_no ?? item?.slNo ?? index + 1;
            const slParsed = Number(slCandidate);
            const slNo = Number.isFinite(slParsed) && slParsed > 0 ? slParsed : index + 1;

            const text =
              String(item?.license_terms ?? item?.licenseTerms ?? item?.licenseTermsText ?? item?.text ?? '').trim();

            rows.push({ sl_no: slNo, text });
          });
        }

        rows.sort((a, b) => a.sl_no - b.sl_no);
        this.termRows = rows.map((t, i) => ({ ...t, sl_no: i + 1 }));
        if (this.termRows.length === 0) {
          this.termRows = [{ sl_no: 1, text: '' }];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Error', 'Failed to load terms & conditions.', 'error');
      },
    });
  }

  addTerm(): void {
    if (!this.canManageTerms) {
      return;
    }
    const next = this.termRows.length + 1;
    this.termRows.push({ sl_no: next, text: '' });
  }

  removeTerm(index: number): void {
    this.termRows.splice(index, 1);
    this.resequence();
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    const tmp = this.termRows[index - 1];
    this.termRows[index - 1] = this.termRows[index];
    this.termRows[index] = tmp;
    this.resequence();
  }

  moveDown(index: number): void {
    if (index >= this.termRows.length - 1) return;
    const tmp = this.termRows[index + 1];
    this.termRows[index + 1] = this.termRows[index];
    this.termRows[index] = tmp;
    this.resequence();
  }

  private resequence(): void {
    this.termRows = this.termRows.map((t, i) => ({ ...t, sl_no: i + 1 }));
    if (this.termRows.length === 0) {
      this.termRows = [{ sl_no: 1, text: '' }];
    }
  }

  save(): void {
    if (this.resolvedLegacyCatCode === null || this.resolvedLegacyScatCode === null) {
      Swal.fire('Select License', 'Please select a license category + subcategory.', 'info');
      return;
    }

    const terms = this.termRows.map((t) => String(t.text || '').trim()).filter((t) => !!t);
    this.saving = true;
    this.adminService.updateLicenseFormTerms(this.resolvedLegacyCatCode, this.resolvedLegacyScatCode, terms).subscribe({
      next: () => {
        this.saving = false;
        Swal.fire('Saved', 'Terms & conditions updated successfully.', 'success');
        this.fetchTerms();
      },
      error: () => {
        this.saving = false;
        Swal.fire('Error', 'Failed to update terms & conditions.', 'error');
      },
    });
  }

  getCategoryLabel(cat: LicenseCategoryRow): string {
    const name = (cat.licenseCategory || cat.license_category || '').toString().trim();
    const old = cat.old_license_cat_code ?? cat.oldLicenseCatCode;
    return old !== null && old !== undefined ? `${name} (Old: ${old})` : name;
  }
}
