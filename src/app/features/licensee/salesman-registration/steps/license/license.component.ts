import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
  styleUrls: ['./license.component.scss']
})
export class LicenseComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private masterService = inject(MasterService);
  private licenseService = inject(LicenseService);

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

  errorMessages = {
    district: signal(''),
    licenseCategory: signal(''),
    licensee: signal(''),
    modeOfOperation: signal('')
  };

  constructor() {
    const stored = this.getFromSessionStorage();

    this.applicationForm = this.fb.group({
      financialYear: [this.getCurrentFinancialYear(), Validators.required],
      district: [stored['district'], Validators.required],
      licenseCategory: [stored['licenseCategory'], Validators.required],
      licensee: [{value: stored['license'], disabled: true}, Validators.required],
      modeOfOperation: [stored['modeOfOperation'] || '', Validators.required]
    });

    this.applicationForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit(): void {
    this.loadDropdownData();
    this.setupFormSubscriptions();
    this.loadSavedData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentFinancialYear(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    return month >= 4 ? `${year}-${(year + 1) % 100}` : `${year - 1}-${year % 100}`;
  }

  private loadDropdownData(): void {
    this.masterService.getDistrict().subscribe({
      next: (data) => {
        this.districts = data;
        console.log('🏛️ Loaded districts:', data);
        if (data.length > 0) {
          console.log('First district sample:', data[0]);
        }
      },
      error: (e) => console.error('Districts error', e)
    });

    this.masterService.getLicenseCategories().subscribe({
      next: (data) => (this.licenseCategories = data),
      error: (e) => console.error('Categories error', e)
    });
  }

  private setupFormSubscriptions(): void {
    this.applicationForm.get('district')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchLicensees());

    this.applicationForm.get('licenseCategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchLicensees());

    this.applicationForm.get('modeOfOperation')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchLicensees());
  }

  private fetchLicensees(): void {
    const districtCode = this.applicationForm.get('district')?.value;
    const licenseCategory = this.applicationForm.get('licenseCategory')?.value;
    const modeOfOperation = this.applicationForm.get('modeOfOperation')?.value;

    if (!districtCode) {
      this.filteredLicensees = [];
      this.applicationForm.get('licensee')?.setValue('');
      this.applicationForm.get('licensee')?.disable();
      return;
    }

    this.licenseService
      .getActiveLicensees(districtCode, licenseCategory, modeOfOperation)
      .subscribe({
        next: (data) => {
          console.log('Fetched licensees:', data);
          this.filteredLicensees = data;
          
          if (data.length > 0) {
            this.applicationForm.get('licensee')?.enable();
          } else {
            this.applicationForm.get('licensee')?.disable();
          }
          
          const currentLicensee = this.applicationForm.get('licensee')?.value;
          if (currentLicensee && !data.some((l) => l.id === currentLicensee)) {
            this.applicationForm.get('licensee')?.setValue('');
          }
        },
        error: (e) => {
          console.error('Licensee fetch error', e);
          this.filteredLicensees = [];
          this.applicationForm.get('licensee')?.disable();
        }
      });
  }

  private getFromSessionStorage(): Partial<SalesmanBarman> & Record<string, any> {
    const raw = sessionStorage.getItem('licenseDetails');
    return raw ? JSON.parse(raw) : {};
  }

  private saveToSessionStorage(): void {
    const data = this.applicationForm.getRawValue();
    sessionStorage.setItem('licenseDetails', JSON.stringify(data));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const ctrl = this.applicationForm.get(field);
    this.errorMessages[field].set(ctrl?.hasError('required') ? 'This field is required' : '');
  }

  private updateAllErrorMessages(): void {
    (Object.keys(this.errorMessages) as (keyof typeof this.errorMessages)[]).forEach((f) =>
      this.updateErrorMessage(f)
    );
  }

  loadSavedData(): void {
    const saved = sessionStorage.getItem('licenseDetails');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.applicationForm.patchValue(parsed);
        setTimeout(() => this.fetchLicensees(), 100);
      } catch (e) {
        console.error('Saved data parse error', e);
      }
    }
  }

  onSubmit(): void {
    if (this.applicationForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const form = this.applicationForm.value;
    
    // 🔴 FIX: Get districtCode from selected district
    const selectedDistrict = this.districts.find(d => d.id === form.district);
    const districtCode = selectedDistrict?.districtCode;

    if (!districtCode) {
      console.error('❌ District code not found for district ID:', form.district);
      console.error('Available districts:', this.districts);
      console.error('Selected district:', selectedDistrict);
      alert('Error: District code not found. Please select a district again.');
      return;
    }

    // 🔴 CRITICAL: Store in EXACT format backend expects
    const backendFormat = {
      // Backend CodeRelatedField expects districtCode as string (e.g., "101")
      district: districtCode.toString(),
      
      // Backend expects license_category as Category ID (integer)
      licenseCategory: form.licenseCategory,
      
      // Backend expects license as License ID (string like "LIC/101/2025-26/0001")
      licensee: form.licensee,
      
      // Role: "Salesman" or "Barman" (exact capitalization)
      role: form.modeOfOperation === 'salesman' ? 'Salesman' : 'Barman',
      
      // Keep for display purposes
      modeOfOperation: form.modeOfOperation,
      financialYear: form.financialYear,
      
      // Store names for display
      districtName: this.getDistrictName(form.district),
      categoryName: this.getLicenseCategoryName(form.licenseCategory),
      licenseeName: this.getLicenseeName(form.licensee)
    };

    sessionStorage.setItem('licenseDetails', JSON.stringify(backendFormat));
    
    console.log('✅ Stored License Details (Backend Format):', backendFormat);
    console.log('🔑 District Code (for backend):', districtCode.toString());
    console.log('📋 Category ID:', form.licenseCategory);
    console.log('📄 License Application ID:', form.licensee);
    console.log('👤 Role:', backendFormat.role);
    
    this.next.emit();
  }

  generateApplicationId(): string {
    const dist = this.districts.find((d) => d.id?.toString() === this.applicationForm.value.district);
    const districtCode = dist?.districtCode ?? 'XX';
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const mode = this.modesOfOperation.find((m) => m.value === this.applicationForm.value.modeOfOperation)?.code ?? 'XX';
    return `${districtCode}/${mode}/${year}/${rand}`;
  }

  calculateApplicationFee(mode: string): number {
    return mode === 'salesman' || mode === 'barman' ? 500 : 500;
  }

  getDistrictName(id: string): string {
    return this.districts.find((d) => d.id?.toString() === id)?.district ?? '';
  }

  getLicenseCategoryName(id: string): string {
    return this.licenseCategories.find((c) => c.id?.toString() === id)?.licenseCategory ?? '';
  }

  getLicenseeName(id: string): string {
    return this.filteredLicensees.find((l) => l.id === id)?.establishment_name ?? '';
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
}