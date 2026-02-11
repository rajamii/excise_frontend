import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../../shared/material.module';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { District } from '../../../../../core/models/district.model';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AccountService } from '../../../../../core/services/account.service';
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
  private accountService = inject(AccountService);
  private cdr = inject(ChangeDetectorRef);

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
      licensee: [{ value: stored['licensee'], disabled: true }, Validators.required],
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

    // ✅ AUTO-FILL district from user profile
    this.autoFillFromUserProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ Auto-fill district from logged-in user profile
   */
  private autoFillFromUserProfile(): void {
    // Check if form already has data from session storage
    const sessionData = sessionStorage.getItem('licenseDetails');
    if (sessionData) {
      console.log('📋 License details already in session, skipping auto-fill');
      return;
    }

    // Try to get user profile from memory first
    let userProfile = this.accountService.getCurrentUser();

    if (!userProfile) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          userProfile = JSON.parse(storedUser);
          console.log('✅ User profile loaded from localStorage for license selection');
        } catch (e) {
          console.error('❌ Failed to parse stored user profile:', e);
          return;
        }
      }
    }

    if (userProfile) {
      console.log('✅ Auto-filling license selection with profile:', userProfile);

      // Wait for districts to load before trying to auto-fill
      setTimeout(() => {
        this.fillFormWithProfile(userProfile);
      }, 500);
    }
  }

  /**
   * Fill form with user profile data
   */
  private fillFormWithProfile(profile: any): void {
    console.log('🔍 Filling license form with profile data:', profile);

    const fillData: any = {};

    // Map district (handle both object and direct value)
    if (profile.district) {
      if (typeof profile.district === 'object' && profile.district.code) {
        // Find district by code
        const district = this.districts.find(d => d.districtCode === profile.district.code);
        if (district) {
          fillData.district = district.id;
          console.log('✅ Mapped district:', district.district, '(ID:', district.id, ')');
        } else {
          console.warn('⚠️ District not found for code:', profile.district.code);
          console.log('Available districts:', this.districts.map(d => ({ id: d.id, code: d.districtCode, name: d.district })));
        }
      }
    }

    if (Object.keys(fillData).length > 0) {
      console.log('📝 License selection data to be filled:', fillData);
      this.applicationForm.patchValue(fillData, { emitEvent: true });
      console.log('✅ License district auto-filled from user profile');
      this.cdr.detectChanges();
    } else {
      console.log('ℹ️ No district to auto-fill from profile');
    }
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

        // Try auto-fill after districts are loaded
        const storedLicense = sessionStorage.getItem('licenseDetails');
        if (!storedLicense) {
          // Give a moment for component to settle, then try auto-fill
          setTimeout(() => {
            const profile = this.accountService.getCurrentUser();
            if (profile) {
              this.fillFormWithProfile(profile);
            }
          }, 100);
        }
      },
      error: (e) => console.error('Districts error', e)
    });

    this.masterService.getLicenseCategories().subscribe({
      next: (data) => {
        this.licenseCategories = data;
        console.log('📋 Loaded license categories:', data);
      },
      error: (e) => console.error('Categories error', e)
    });
  }

  private setupFormSubscriptions(): void {
    // Filter licensees by district and category
    this.applicationForm.get('district')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchLicensees());

    this.applicationForm.get('licenseCategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchLicensees());
  }

  private fetchLicensees(): void {
    const districtId = this.applicationForm.get('district')?.value;
    const licenseCategory = this.applicationForm.get('licenseCategory')?.value;

    console.log('🔍 Fetching licensees with:', {
      districtId,
      licenseCategory
    });

    if (!districtId) {
      console.log('⚠️ No district selected, clearing licensees');
      this.filteredLicensees = [];
      this.applicationForm.get('licensee')?.setValue('');
      this.applicationForm.get('licensee')?.disable();
      return;
    }

    // Get the district object to extract districtCode
    const selectedDistrict = this.districts.find(d => d.id === districtId);
    const districtCode = selectedDistrict?.districtCode;

    if (!districtCode) {
      console.error('❌ District code not found for district ID:', districtId);
      this.filteredLicensees = [];
      this.applicationForm.get('licensee')?.disable();
      return;
    }

    console.log('🔍 District Code:', districtCode, 'District Name:', selectedDistrict?.district);
    console.log('📋 License Category ID:', licenseCategory);

    this.licenseService
      .getActiveLicensees(districtCode.toString(), licenseCategory)
      .subscribe({
        next: (data) => {
          console.log('✅ Fetched licensees:', data);
          console.log('📊 Total licensees found:', data.length);

          this.filteredLicensees = data;

          if (data.length > 0) {
            this.applicationForm.get('licensee')?.enable();
            console.log('✅ Licensee dropdown enabled');
          } else {
            this.applicationForm.get('licensee')?.disable();
            console.log('⚠️ No licensees found, dropdown disabled');
          }

          const currentLicensee = this.applicationForm.get('licensee')?.value;
          if (currentLicensee && !data.some((l) => (l.licenseeId || l.id) == currentLicensee)) {
            this.applicationForm.get('licensee')?.setValue('');
            console.log('🔄 Cleared previous licensee selection');
          }
        },
        error: (e) => {
          console.error('❌ Licensee fetch error:', e);
          console.error('Error details:', {
            status: e.status,
            message: e.message,
            error: e.error
          });
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

    const selectedDistrict = this.districts.find(d => d.id === form.district);
    const districtCode = selectedDistrict?.districtCode;

    if (!districtCode) {
      console.error('❌ District code not found for district ID:', form.district);
      alert('Error: District code not found. Please select a district again.');
      return;
    }

    const selectedLicensee = this.filteredLicensees.find(l => l.licenseeId == form.licensee);

    if (!selectedLicensee) {
      console.error('❌ Licensee not found:', form.licensee);
      console.error('Available licensees:', this.filteredLicensees.map(l => ({ id: l.licenseeId, name: l.establishmentName })));
      alert('Error: Please select a valid licensee.');
      return;
    }

    const backendFormat = {
      district: districtCode.toString(),
      licenseCategory: form.licenseCategory,
      licensee: selectedLicensee.licenseeId,
      role: form.modeOfOperation === 'salesman' ? 'Salesman' : 'Barman',
      modeOfOperation: form.modeOfOperation,
      financialYear: form.financialYear,
      districtName: this.getDistrictName(form.district),
      categoryName: this.getLicenseCategoryName(form.licenseCategory),
      licenseeName: selectedLicensee.establishmentName,
      licenseeApplicationId: selectedLicensee.id
    };

    sessionStorage.setItem('licenseDetails', JSON.stringify(backendFormat));

    console.log('✅ Stored License Details (Backend Format):', backendFormat);

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

  getDistrictName(id: string | number): string {
    return this.districts.find((d) => d.id?.toString() === id.toString())?.district ?? '';
  }

  getLicenseCategoryName(id: string | number): string {
    return this.licenseCategories.find((c) => c.id?.toString() === id.toString())?.licenseCategory ?? '';
  }

  getLicenseeName(licensee_id: string | number): string {
    return this.filteredLicensees.find((l) => l.licenseeId == licensee_id)?.establishmentName ?? '';
  }

  getLicenseeDetails(licensee_id: string | number): Licensee | null {
    return this.filteredLicensees.find((l) => l.licenseeId == licensee_id) ?? null;
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