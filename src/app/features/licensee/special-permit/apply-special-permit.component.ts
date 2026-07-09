import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { SpecialPermitService } from '../../../core/services/special-permit.service';
import { MaterialModule } from '../../../shared/material.module';

type PermissionDuration = 'per_annum' | 'per_day';

interface LicenseeCalendarDay {
  date: Date | null;
  dateStr: string;
  dayNumber: number | null;
  isAllowed: boolean;
  isSelected: boolean;
}

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
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.fb.group({
    district: [{ value: '', disabled: true }, Validators.required],
    licenseCategory: [{ value: '', disabled: true }, Validators.required],
    licenseSubCategory: [{ value: '', disabled: true }, Validators.required],
    licensee: ['', Validators.required],
    financialYear: ['', Validators.required],
    permissionDate: [''],
    selectedDates: [[] as string[]]
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

  allowedDryDayDates: string[] = [];
  isLoadingAllowedDates = false;

  weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  activeMonths: { name: string; index: number; year: number; label: string }[] = [];
  selectedMonthLabel = '';
  currentMonthDays: LicenseeCalendarDay[] = [];

  ngOnInit(): void {
    this.loadLicenses();
    this.form.patchValue({ financialYear: this.financialYears[0] });
    this.loadAllowedDates();

    this.form.controls.financialYear.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadAllowedDates();
      });
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
      permission_date: this.isPerDayCategory && raw.selectedDates?.length ? raw.selectedDates[0] : null,
      selected_dates: this.isPerDayCategory ? raw.selectedDates : null
    };

    this.specialPermitService
      .applySpecialPermit(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.applicationId = response?.application_id || '';
          this.isSavedForPayment = true;
          this.isSubmitting = false;

          Swal.fire({
            title: 'Application Submitted!',
            html: `Your Special Permit application (ID: <b>${this.applicationId}</b>) has been submitted successfully.<br>Permit fee will be payable once the application is approved.`,
            icon: 'success',
            showCancelButton: false,
            confirmButtonText: 'Go to Dashboard',
            confirmButtonColor: '#3085d6',
            allowOutsideClick: false
          }).then((result) => {
            if (result.isConfirmed) {
              this.goBackToDashboard();
            }
          });
        },
        error: (error) => {
          this.submitError = error?.error?.detail || 'Unable to submit Special Permit application. Please try again.';
          this.isSubmitting = false;
        }
      });
  }

  proceedToPayment(): void {
    if (!this.applicationId || !this.selectedLicense) return;
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'wallet',
        tab: 'license_fee',
        id: this.applicationId,
        type: 'special-permit',
        ref: this.applicationId,
        referenceNo: this.applicationId,
        amount: this.calculatedTotalFee > 0 ? this.calculatedTotalFee : undefined,
        action: 'pay',
        source: 'special-permit'
      }
    });
  }

  goBackToDashboard(): void {
    this.router.navigate(['/dashboard'], { queryParams: { section: 'special-permit' } });
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
        permissionDate: '',
        selectedDates: []
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
    this.loadAllowedDates();
  }

  get calculatedTotalFee(): number {
    const base = this.selectedLicense?.dryDayFee || this.selectedLicense?.dry_day_fee || 0;
    if (this.isPerDayCategory) {
      const count = this.form.controls.selectedDates.value?.length || 0;
      return Number(base) * count;
    }
    return Number(base);
  }

  loadAllowedDates(): void {
    const fy = this.form.controls.financialYear.value;
    if (!fy) return;

    this.isLoadingAllowedDates = true;
    this.specialPermitService.getDryDayCalendar(fy).subscribe({
      next: (res) => {
        this.allowedDryDayDates = res?.allowedDates || res?.allowed_dates || [];
        this.isLoadingAllowedDates = false;
        this.buildActiveMonths();
      },
      error: () => {
        this.allowedDryDayDates = [];
        this.isLoadingAllowedDates = false;
        this.buildActiveMonths();
      }
    });
  }

  buildActiveMonths(): void {
    this.activeMonths = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const sortedAllowed = [...this.allowedDryDayDates].sort();
    const uniqueMonths = new Set<string>();

    sortedAllowed.forEach((dateStr) => {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return;

      const y = dateObj.getFullYear();
      const m = dateObj.getMonth();
      const key = `${m}-${y}`;

      if (!uniqueMonths.has(key)) {
        uniqueMonths.add(key);
        this.activeMonths.push({
          name: monthNames[m],
          index: m,
          year: y,
          label: key
        });
      }
    });

    if (this.activeMonths.length > 0) {
      this.selectedMonthLabel = this.activeMonths[0].label;
      this.generateCurrentMonthCalendar();
    } else {
      this.selectedMonthLabel = '';
      this.currentMonthDays = [];
    }
  }

  generateCurrentMonthCalendar(): void {
    if (!this.selectedMonthLabel) {
      this.currentMonthDays = [];
      return;
    }
    const parts = this.selectedMonthLabel.split('-');
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);

    const startDate = new Date(year, month, 1);
    const startDayOfWeek = startDate.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: LicenseeCalendarDay[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        date: null,
        dateStr: '',
        dayNumber: null,
        isAllowed: false,
        isSelected: false
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = this.formatLocalDate(d);
      const isAllowed = this.allowedDryDayDates.includes(dateStr);
      const isSelected = (this.form.controls.selectedDates.value || []).includes(dateStr);

      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isAllowed,
        isSelected
      });
    }

    this.currentMonthDays = days;
  }

  formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  toggleFormDate(dateStr: string): void {
    const current = this.form.controls.selectedDates.value || [];
    let updated: string[];
    if (current.includes(dateStr)) {
      updated = current.filter((d) => d !== dateStr);
    } else {
      updated = [...current, dateStr];
    }
    this.form.controls.selectedDates.setValue(updated);
    this.form.controls.selectedDates.markAsTouched();

    this.currentMonthDays = this.currentMonthDays.map((day) => {
      if (day.dateStr === dateStr) {
        return { ...day, isSelected: !day.isSelected };
      }
      return day;
    });
  }

  isFormDateSelected(dateStr: string): boolean {
    return (this.form.controls.selectedDates.value || []).includes(dateStr);
  }

  private syncDateValidator(): void {
    const dateControl = this.form.controls.permissionDate;
    const datesControl = this.form.controls.selectedDates;

    if (this.isPerDayCategory) {
      datesControl.addValidators(Validators.required);
      dateControl.clearValidators();
    } else {
      datesControl.clearValidators();
      datesControl.setValue([], { emitEvent: false });
      dateControl.clearValidators();
      dateControl.setValue('', { emitEvent: false });
    }
    datesControl.updateValueAndValidity({ emitEvent: false });
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
    if (row?.dry_day_fee_type) {
      return row.dry_day_fee_type as PermissionDuration;
    }
    if (row?.dryDayFeeType) {
      return row.dryDayFeeType as PermissionDuration;
    }
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
