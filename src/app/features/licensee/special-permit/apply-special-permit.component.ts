import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SpecialPermitService } from '../../../core/services/special-permit.service';
import { MaterialModule } from '../../../shared/material.module';

type PermissionDuration = 'per_annum' | 'per_day';

@Component({
  selector: 'app-apply-special-permit',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './apply-special-permit.component.html',
  styleUrl: './apply-special-permit.component.scss'
})
export class ApplySpecialPermitComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly specialPermitService = inject(SpecialPermitService);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.fb.group({
    district: [{ value: '', disabled: true }, Validators.required],
    licenseCategory: [{ value: '', disabled: true }, Validators.required],
    licenseSubCategory: [{ value: '', disabled: true }, Validators.required],
    licensee: ['', Validators.required],
    financialYear: ['', Validators.required],
    permissionDate: ['']
  });

  readonly financialYears = this.buildFinancialYears();
  licenses: any[] = [];
  selectedLicense: any | null = null;
  isLoadingLicenses = false;
  isSubmitting = false;
  loadError = '';
  submitError = '';
  applicationId = '';
  isSavedForPayment = false;
  permissionDuration: PermissionDuration = 'per_annum';

  ngOnInit(): void {
    this.loadLicenses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isPerDayCategory(): boolean {
    return this.permissionDuration === 'per_day';
  }

  onLicenseChange(licenseKey: string): void {
    const license = this.licenses.find((item) => this.getLicenseKey(item) === licenseKey) || null;
    this.selectedLicense = license;
    this.isSavedForPayment = false;
    this.applySelectedLicense(license);
  }

  saveAndProceedToPayment(): void {
    this.syncDateValidator();
    this.form.markAllAsTouched();

    if (this.form.invalid || !this.selectedLicense) {
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';
    this.isSavedForPayment = false;

    const raw = this.form.getRawValue();
    const payload = {
      license_id: this.getLicenseId(this.selectedLicense),
      financial_year: raw.financialYear,
      permission_duration: this.permissionDuration,
      permission_date: this.isPerDayCategory ? raw.permissionDate : null
    };

    this.specialPermitService
      .applySpecialPermit(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.applicationId = response?.application_id || '';
          this.isSavedForPayment = true;
          this.isSubmitting = false;
        },
        error: (error) => {
          this.submitError = error?.error?.detail || 'Unable to submit Special Permit application. Please try again.';
          this.isSubmitting = false;
        }
      });
  }

  getLicenseOptionLabel(license: any): string {
    const id = this.getLicenseId(license);
    const name = this.extractText(license, [
      'establishmentName',
      'establishment_name',
      'business_premises_name',
      'licensee_name',
      'applicant_name'
    ]);
    return [id, name].filter(Boolean).join(' - ') || 'License';
  }

  getErrorMessage(field: 'licensee' | 'financialYear' | 'permissionDate'): string {
    const control = this.form.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    return '';
  }

  getLicenseKey(row: any): string {
    return String(row?.id ?? row?.license_id ?? row?.licenseId ?? this.licenses.indexOf(row)).trim();
  }

  private loadLicenses(): void {
    this.isLoadingLicenses = true;
    this.loadError = '';

    this.specialPermitService
      .getEligibleLicenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.licenses = (Array.isArray(rows) ? rows : []).filter((row) => this.isUsableLicense(row));
          this.isLoadingLicenses = false;

          if (this.licenses.length > 0) {
            const active = this.licenses.find((row) => Boolean(row?.is_active ?? row?.isActive)) || this.licenses[0];
            this.selectedLicense = active;
            this.form.patchValue({ licensee: this.getLicenseKey(active) });
            this.applySelectedLicense(active);
          }
        },
        error: () => {
          this.licenses = [];
          this.isLoadingLicenses = false;
          this.loadError = 'Unable to load license details. Please try again.';
        }
      });
  }

  private applySelectedLicense(license: any | null): void {
    if (!license) {
      this.form.patchValue({
        district: '',
        licenseCategory: '',
        licenseSubCategory: '',
        permissionDate: ''
      });
      this.permissionDuration = 'per_annum';
      this.syncDateValidator();
      return;
    }

    this.permissionDuration = this.resolvePermissionDuration(license);
    this.form.patchValue({
      district: this.getDistrictName(license),
      licenseCategory: this.getLicenseCategoryName(license),
      licenseSubCategory: this.getLicenseSubCategoryName(license),
      permissionDate: this.permissionDuration === 'per_day' ? this.form.controls.permissionDate.value || '' : ''
    });
    this.syncDateValidator();
  }

  private syncDateValidator(): void {
    const dateControl = this.form.controls.permissionDate;
    if (this.isPerDayCategory) {
      dateControl.addValidators(Validators.required);
    } else {
      dateControl.clearValidators();
      dateControl.setValue('', { emitEvent: false });
    }
    dateControl.updateValueAndValidity({ emitEvent: false });
  }

  private isUsableLicense(row: any): boolean {
    const licenseId = this.getLicenseId(row);
    const isExpired = Boolean(row?.is_expired ?? row?.isExpired);
    const inactive = (row?.is_active ?? row?.isActive) === false;
    return !!licenseId && !isExpired && !inactive;
  }

  private getLicenseId(row: any): string {
    return this.extractText(row, ['license_id', 'licenseId', 'licensee_id', 'licenseeId', 'id']);
  }

  private getDistrictName(row: any): string {
    return this.extractText(row, [
      'site_district_name',
      'siteDistrictName',
      'excise_district_name',
      'exciseDistrictName',
      'district_name',
      'districtName',
      'district'
    ]);
  }

  private getLicenseCategoryName(row: any): string {
    return this.extractText(row, [
      'license_category_name',
      'licenseCategoryName',
      'license_category',
      'licenseCategory',
      'category_name',
      'categoryName'
    ]);
  }

  private getLicenseSubCategoryName(row: any): string {
    return this.extractText(row, [
      'license_sub_category_name',
      'licenseSubCategoryName',
      'license_sub_category',
      'licenseSubCategory',
      'sub_category_name',
      'subCategoryName',
      'subcategory_name',
      'subcategoryName'
    ]);
  }

  private resolvePermissionDuration(row: any): PermissionDuration {
    const raw = this.extractText(row, [
      'special_permission_type',
      'specialPermissionType',
      'permission_type',
      'permissionType',
      'fee_type',
      'feeType',
      'license_fee_type',
      'licenseFeeType',
      'duration_type',
      'durationType',
      'validity_type',
      'validityType'
    ]).toLowerCase();

    const searchable = [
      raw,
      this.getLicenseCategoryName(row).toLowerCase(),
      this.getLicenseSubCategoryName(row).toLowerCase()
    ].join(' ');

    return /\bper\s*day\b|daily|day[-_\s]?wise/.test(searchable) ? 'per_day' : 'per_annum';
  }

  private extractText(row: any, keys: string[]): string {
    for (const key of keys) {
      const value = row?.[key];
      const text = this.valueToText(value);
      if (text) {
        return text;
      }
    }
    return '';
  }

  private valueToText(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return String(
        value.name ??
          value.district ??
          value.licenseCategory ??
          value.license_category ??
          value.description ??
          value.label ??
          value.id ??
          ''
      ).trim();
    }
    return String(value).trim();
  }

  private buildFinancialYears(): string[] {
    const today = new Date();
    const currentYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return Array.from({ length: 5 }, (_, index) => {
      const start = currentYear - index;
      const end = String(start + 1).slice(-2);
      return `${start}-${end}`;
    });
  }
}
