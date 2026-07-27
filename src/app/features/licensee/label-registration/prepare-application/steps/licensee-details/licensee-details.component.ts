import { Component, EventEmitter, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MasterService } from '../../../../../../core/services/master.service';
import { BrandWarehouseService } from '../../../../supplyChain/services/brand-warehouse.service';
import { MaterialModule } from '../../../../../../shared/material.module';

type ApplicantTypeOption = { value: string; label: string };

@Component({
  selector: 'app-label-registration-licensee-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './licensee-details.component.html',
  styleUrl: './licensee-details.component.scss'
})
export class LabelRegistrationLicenseeDetailsComponent implements OnInit, OnDestroy {
  @Output() readonly next = new EventEmitter<void>();

  applicantForm: FormGroup;
  private destroy$ = new Subject<void>();

  applicationYears: string[] = [];
  private readonly fallbackApplicantTypes: ApplicantTypeOption[] = [
    { value: 'Distillery', label: 'Distillery' },
    { value: 'Brewery', label: 'Brewery' },
    { value: 'Winery', label: 'Winery' },
    { value: 'Importer', label: 'Importer' },
    { value: 'Bottler', label: 'Bottler' }
  ];
  private readonly fallbackLiquorCategories: string[] = ['IMFL', 'Beer', 'Wine', 'RTD', 'Spirit', 'Country Liquor'];

  applicantTypes: ApplicantTypeOption[] = [...this.fallbackApplicantTypes];
  liquorCategories: string[] = [...this.fallbackLiquorCategories];

  isLoadingApplicantTypes = false;
  isLoadingLiquorCategories = false;
  applicantTypesError = '';
  liquorCategoriesError = '';

  errorMessages = {
    applicationYear: signal(''),
    applicantType: signal(''),
    liquorCategory: signal(''),
    applicationDate: signal(''),
    registrationValidFrom: signal(''),
    registrationValidUpTo: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    private brandWarehouseService: BrandWarehouseService
  ) {
    const storedValues = this.getFromSessionStorage();
    const defaultYearRaw = String(storedValues.applicationYear || this.getCurrentFinancialYearRange()).trim();
    const startYear = this.parseStartYear(defaultYearRaw);
    const defaultYear = startYear !== null ? `${startYear}-${startYear + 1}` : defaultYearRaw;
    this.applicationYears = this.buildApplicationYears(defaultYear);
    const validityDefaults = this.getValidityDefaults(defaultYear);

    this.applicantForm = this.fb.group({
      applicationYear: new FormControl(defaultYear, [Validators.required]),
      applicantType: new FormControl(storedValues.applicantType || '', [Validators.required]),
      liquorCategory: new FormControl(storedValues.liquorCategory || '', [Validators.required]),
      applicationDate: new FormControl(this.toDate(storedValues.applicationDate) || new Date(), [Validators.required]),
      registrationValidFrom: new FormControl(
        this.toDate(storedValues.registrationValidFrom) || validityDefaults.validFrom,
        [Validators.required]
      ),
      registrationValidUpTo: new FormControl(
        this.toDate(storedValues.registrationValidUpTo) || validityDefaults.validUpTo,
        [Validators.required]
      )
    });

    this.applicantForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit(): void {
    this.loadApplicantTypes();
    this.loadLiquorCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('labelRegLicenseeDetails');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage(): void {
    const raw = this.applicantForm.getRawValue();
    const payload = {
      ...raw,
      applicationDate: this.normalizeDate(raw.applicationDate),
      registrationValidFrom: this.normalizeDate(raw.registrationValidFrom),
      registrationValidUpTo: this.normalizeDate(raw.registrationValidUpTo)
    };
    sessionStorage.setItem('labelRegLicenseeDetails', JSON.stringify(payload));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const control = this.applicantForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else {
      this.errorMessages[field].set('');
    }
  }

  private updateAllErrorMessages(): void {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  getErrorMessage(field: keyof typeof this.errorMessages): string {
    return this.errorMessages[field]();
  }

  onApplicationYearChange(year: string): void {
    const selected = String(year || '').trim();
    if (!selected) {
      return;
    }

    const defaults = this.getValidityDefaults(selected);
    const fromCtrl = this.applicantForm.get('registrationValidFrom');
    const toCtrl = this.applicantForm.get('registrationValidUpTo');

    if (fromCtrl && (!fromCtrl.value || !fromCtrl.dirty)) {
      fromCtrl.setValue(defaults.validFrom);
    }
    if (toCtrl && (!toCtrl.value || !toCtrl.dirty)) {
      toCtrl.setValue(defaults.validUpTo);
    }
  }

  resetForm(): void {
    sessionStorage.removeItem('labelRegLicenseeDetails');

    const defaultYear = this.getCurrentFinancialYearRange();
    this.applicationYears = this.buildApplicationYears(defaultYear);
    const defaults = this.getValidityDefaults(defaultYear);

    this.applicantForm.reset({
      applicationYear: defaultYear,
      applicantType: '',
      liquorCategory: '',
      applicationDate: new Date(),
      registrationValidFrom: defaults.validFrom,
      registrationValidUpTo: defaults.validUpTo
    });
  }

  proceedToNext(): void {
    if (this.applicantForm.valid) {
      this.next.emit();
      return;
    }
    this.applicantForm.markAllAsTouched();
    this.updateAllErrorMessages();
  }

  private getCurrentFinancialYearRange(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    return `${startYear}-${startYear + 1}`;
  }

  private buildApplicationYears(defaultYear: string): string[] {
    const years: string[] = [];

    const parsedStart = this.parseStartYear(defaultYear);
    if (parsedStart !== null) {
      for (let offset = -1; offset <= 1; offset += 1) {
        const startYear = parsedStart + offset;
        years.push(`${startYear}-${startYear + 1}`);
      }
    } else {
      years.push(this.getCurrentFinancialYearRange());
    }

    const normalizedDefault = String(defaultYear || '').trim();
    if (normalizedDefault && !years.includes(normalizedDefault)) {
      years.unshift(normalizedDefault);
    }

    return years;
  }

  private getValidityDefaults(applicationYear: string): { validFrom: Date; validUpTo: Date } {
    const startYear = this.parseStartYear(applicationYear);
    if (startYear === null) {
      const now = new Date();
      return { validFrom: now, validUpTo: now };
    }

    const validFrom = new Date(startYear, 3, 1); // 1 Apr (FY start)
    const validUpTo = new Date(startYear + 1, 2, 31); // 31 Mar (FY end)
    return { validFrom, validUpTo };
  }

  private parseStartYear(value: string): number | null {
    const normalized = String(value || '').trim();

    const fullMatch = normalized.match(/^(\d{4})\s*-\s*(\d{4})$/);
    if (fullMatch) {
      const startYear = Number(fullMatch[1]);
      const endYear = Number(fullMatch[2]);
      if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear !== startYear + 1) {
        return null;
      }
      return startYear;
    }

    const shortMatch = normalized.match(/^(\d{4})\s*-\s*(\d{2})$/);
    if (shortMatch) {
      const startYear = Number(shortMatch[1]);
      const endTwoDigits = Number(shortMatch[2]);
      if (!Number.isFinite(startYear) || !Number.isFinite(endTwoDigits)) {
        return null;
      }

      let endYear = Math.floor(startYear / 100) * 100 + endTwoDigits;
      if (endYear <= startYear) {
        endYear += 100;
      }

      return endYear === startYear + 1 ? startYear : null;
    }

    return null;
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizeDate(value: unknown): string {
    const date = this.toDate(value);
    if (!date) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadApplicantTypes(): void {
    this.isLoadingApplicantTypes = true;
    this.applicantTypesError = '';

    this.masterService
      .getLicenseCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const categories = Array.isArray(data) ? data : [];
          const seen = new Set<string>();
          const mapped: string[] = [];

          categories
            .filter((item: any) => item?.isActive !== false && item?.is_active !== false)
            .map((item: any) => String(item?.licenseCategory ?? item?.license_category ?? '').trim())
            .forEach((value) => {
              if (!value || seen.has(value)) {
                return;
              }
              seen.add(value);
              mapped.push(value);
            });

          this.applicantTypes = mapped.length
            ? mapped.map((value) => ({ value, label: value }))
            : [...this.fallbackApplicantTypes];
          this.isLoadingApplicantTypes = false;
        },
        error: (error) => {
          console.error('Failed to load applicant types:', error);
          this.applicantTypes = [...this.fallbackApplicantTypes];
          this.isLoadingApplicantTypes = false;
          this.applicantTypesError = 'Unable to load applicant types. Using default options.';
        }
      });
  }

  private loadLiquorCategories(): void {
    this.isLoadingLiquorCategories = true;
    this.liquorCategoriesError = '';

    this.brandWarehouseService
      .getBrandWarehouses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: any) => {
          const items = Array.isArray(rows) ? rows : [];
          const values = items
            .map((item: any) => this.getBrandType(item))
            .filter(Boolean);
          const unique = this.uniqueValues(values);
          this.liquorCategories = unique.length ? unique : [...this.fallbackLiquorCategories];
          this.isLoadingLiquorCategories = false;
        },
        error: (error: any) => {
          console.error('Failed to load liquor categories:', error);
          this.liquorCategories = [...this.fallbackLiquorCategories];
          this.isLoadingLiquorCategories = false;
          this.liquorCategoriesError = 'Unable to load liquor categories. Using default options.';
        }
      });
  }

  private getBrandType(item: any): string {
    return this.coalesceText(
      item?.brand_type,
      item?.brandType
    );
  }

  private coalesceText(...values: unknown[]): string {
    for (const value of values) {
      const text = String(value ?? '').trim();
      if (text) {
        return text;
      }
    }
    return '';
  }

  private uniqueValues(values: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    values.forEach((value) => {
      const text = String(value ?? '').trim();
      if (!text || seen.has(text)) {
        return;
      }
      seen.add(text);
      unique.push(text);
    });
    return unique;
  }
}
