import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../../shared/material.module';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { District } from '../../../../../core/models/district.model';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { MasterService } from '../../../../../core/services/master.service';
import { SalesmanBarman } from '../../../../../core/models/salesman-barman.model';
import { Licensee } from '../../../../../core/models/license.model';
import { LicenseService } from '../../../../../core/services/license.service';

interface ModeOfOperation {
  value: string;
  label: string;
  code: string;
}

@Component({
  selector: 'app-license',
  standalone: true,
  imports: [MaterialModule, ReactiveFormsModule, CommonModule],
  templateUrl: './license.component.html',
  styleUrl: './license.component.scss'
})
export class LicenseComponent implements OnInit, OnDestroy {
  applicationForm: FormGroup;

  districts: District[] = [];
  licenseCategories: LicenseCategory[] = [];
  filteredLicensees: Licensee[] = [];

  modesOfOperation: ModeOfOperation[] = [
    { value: 'salesman', label: 'Salesman', code: 'SM' },
    { value: 'barman', label: 'Barman', code: 'BM' }
  ];

  @Output() readonly next = new EventEmitter<void>();
  private destroy$ = new Subject<void>();

  // -----------------------------------------------------------------
  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    private licenseService: LicenseService
  ) {
    const stored = this.getFromSessionStorage();

    this.applicationForm = this.fb.group({
      financialYear: [this.getCurrentFinancialYear(), Validators.required],
      district: [stored.district, Validators.required],
      licenseCategory: [stored.licenseCategory, Validators.required],
      licensee: [stored.license, Validators.required],
      modeOfOperation: ['', Validators.required]
    });

    this.applicationForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  // -----------------------------------------------------------------
  ngOnInit(): void {
    this.loadDropdownData();
    this.setupFormSubscriptions();
    this.loadSavedData();          // will trigger fetch if district already saved
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -----------------------------------------------------------------
  private getCurrentFinancialYear(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 1-12
    if (month >= 4) {
      return `${year}-${(year + 1) % 100}`;
    } else {
      return `${year - 1}-${year % 100}`;
    }
  }

  // -----------------------------------------------------------------
  private loadDropdownData(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => (this.districts = data),
      error: (e) => console.error('Districts error', e)
    });

    this.masterService.getLicenseCategories().subscribe({
      next: (data) => (this.licenseCategories = data),
      error: (e) => console.error('Categories error', e)
    });
  }

  // -----------------------------------------------------------------
  /** Watch district & category → refetch licensees */
  private setupFormSubscriptions(): void {
    this.applicationForm.get('district')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchLicensees());

    this.applicationForm.get('licenseCategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchLicensees());
  }

  // -----------------------------------------------------------------
  /** Core server-side fetch */
  private fetchLicensees(): void {
    const districtCode = this.applicationForm.get('district')?.value;
    const licenseCategory = this.applicationForm.get('licenseCategory')?.value;

    if (!districtCode) {
      this.filteredLicensees = [];
      this.applicationForm.get('licensee')?.setValue('');
      return;
    }

    this.licenseService
      .getActiveLicensees(districtCode, licenseCategory)
      .subscribe({
        next: (data) => {
          this.filteredLicensees = data;

          // Reset licensee if it disappeared
          const cur = this.applicationForm.get('licensee')?.value;
          if (cur && !data.some((l) => l.id === cur)) {
            this.applicationForm.get('licensee')?.setValue('');
          }
        },
        error: (e) => {
          console.error('Licensee fetch error', e);
          this.filteredLicensees = [];
        }
      });
  }

  // -----------------------------------------------------------------
  private getFromSessionStorage(): Partial<SalesmanBarman> {
    const raw = sessionStorage.getItem('licenseDetails');
    return raw ? JSON.parse(raw) : {};
  }

  private saveToSessionStorage(): void {
    const data = this.applicationForm.getRawValue();
    sessionStorage.setItem('licenseDetails', JSON.stringify(data));
  }

  // -----------------------------------------------------------------
  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const ctrl = this.applicationForm.get(field);
    this.errorMessages[field].set(ctrl?.hasError('required') ? 'This field is required' : '');
  }

  private updateAllErrorMessages(): void {
    (Object.keys(this.errorMessages) as (keyof typeof this.errorMessages)[]).forEach((f) =>
      this.updateErrorMessage(f)
    );
  }

  // -----------------------------------------------------------------
  loadSavedData(): void {
    const saved = sessionStorage.getItem('licenseDetails');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.applicationForm.patchValue(parsed);
        setTimeout(() => this.fetchLicensees(), 0);
      } catch (e) {
        console.error('Saved data parse error', e);
      }
    }
  }

  // -----------------------------------------------------------------
  onSubmit(): void {
    if (this.applicationForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const form = this.applicationForm.value;
    const enhanced = {
      ...form,
      role: form.modeOfOperation === 'salesman' ? 'Salesman' : 'Barman',
      excise_district: form.district,
      license_category: form.licenseCategory,
      licensee: form.licensee,
    };

    sessionStorage.setItem('licenseDetails', JSON.stringify(enhanced));
    // console.log('Saved', enhanced);
    this.next.emit();
    console.log('licenseDetails:', enhanced);
  }

  // -----------------------------------------------------------------
  generateApplicationId(): string {
    const dist = this.districts.find((d) => d.id?.toString() === this.applicationForm.value.district);
    const districtCode = dist?.districtCode ?? 'XX';
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const mode = this.modesOfOperation.find((m) => m.value === this.applicationForm.value.modeOfOperation)
      ?.code ?? 'XX';
    return `${districtCode}/${mode}/${year}/${rand}`;
  }

  calculateApplicationFee(mode: string): number {
    return mode === 'salesman' || mode === 'barman' ? 500 : 500;
  }

  getDistrictName(id: string): string {
    return this.districts.find((d) => d.id?.toString() === id)?.district ?? '';
  }

  getLicenseCategoryName(id: string): string {
    const cat = this.licenseCategories.find((c) => c.id?.toString() === id);
    return cat?.licenseCategory ?? '';
  }

  getLicenseeDetails(id: string): Licensee | null {
    return this.filteredLicensees.find((l) => l.id === id) ?? null;
  }

  getModeOfOperationLabel(val: string): string {
    return this.modesOfOperation.find((m) => m.value === val)?.label ?? '';
  }

  markFormGroupTouched(): void {
    Object.values(this.applicationForm.controls).forEach((c) => c.markAsTouched());
  }

  // -----------------------------------------------------------------
  // Template helpers
  isFieldInvalid(name: string): boolean {
    const c = this.applicationForm.get(name);
    return !!(c && c.invalid && c.touched);
  }

  getFieldError(name: string): string {
    const c = this.applicationForm.get(name);
    return c?.errors?.['required'] && c.touched ? `${this.getFieldLabel(name)} is required` : '';
  }

  getFieldLabel(name: string): string {
    const map: Record<string, string> = {
      financialYear: 'Financial Year',
      district: 'District',
      licenseCategory: 'License Category',
      licensee: 'Licensee',
      modeOfOperation: 'Mode of Operation'
    };
    return map[name] ?? name;
  }

  // -----------------------------------------------------------------
  // Signal-based error messages (kept for your existing UI)
  errorMessages = {
    district: signal(''),
    licenseCategory: signal(''),
    licensee: signal(''),
    modeOfOperation: signal('')
  };
}