import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { PatternConstants } from '../../../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../../../shared/utils/capitalize.util';
import { Company } from '../../../../../../../core/models/company.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../../../environments/environment';
import { AccountService } from '../../../../../../../core/services/account.service';
import { MasterService } from '../../../../../../../core/services/master.service';
import { LicenseMeService } from '../../../../../../../core/services/license-me.service';

interface LicenseType {
  id: number;
  licenseType: string;
}

// Nationality → Country mapping
const NATIONALITY_COUNTRY_MAP: Record<string, string> = {
  'indian':   'India',
  'nepali':   'Nepal',
  'bhutanese':'Bhutan',
  'chinese':  'China',
};

@Component({
  selector: 'app-company-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './company-details.component.html',
  styleUrl: './company-details.component.scss',
})
export class CompanyDetailsComponent implements OnInit, OnDestroy {
  companyDetailsForm: FormGroup;

  licenses: LicenseType[] = [];
  myActiveLicenses: any[] = [];
  isLoadingLicenses: boolean = true;
  applicationYears: string[] = ['2025-2026'];
  countries: string[] = ['India', 'Nepal', 'Bhutan', 'China'];
  states: string[] = ['Sikkim', 'West Bengal', 'Bihar', 'Assam'];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  errorMessages = {
    brandType:           signal(''),
    license:             signal(''),
    applicationYear:     signal(''),
    companyName:         signal(''),
    country:             signal(''),
    state:               signal(''),
    factoryAddress:      signal(''),
    pinCode:             signal(''),
    companyMobileNumber: signal(''),
    companyEmailId:      signal(''),
  };

  constructor(
    private fb:             FormBuilder,
    private http:           HttpClient,
    private accountService: AccountService,
    private masterService:  MasterService,       // ✅ NEW: for licensee profile
    private licenseMeService: LicenseMeService,   // ✅ NEW: for user active licenses
    private cdr:            ChangeDetectorRef
  ) {
    const storedValues = this.getFromSessionStorage();
    const currentFinYear = this.getCurrentFinancialYear();
    if (!this.applicationYears.includes(currentFinYear)) {
      this.applicationYears.push(currentFinYear);
    }

    this.companyDetailsForm = this.fb.group({
      brandType:           new FormControl(storedValues.brandType,           [Validators.required]),
      license:             new FormControl(storedValues.license,             Validators.required),
      applicationYear:     new FormControl(storedValues.applicationYear || currentFinYear,     Validators.required),
      companyName:         new FormControl(storedValues.companyName,         [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      country:             new FormControl(storedValues.country,             [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      state:               new FormControl(storedValues.state,               [Validators.required]),
      factoryAddress:      new FormControl(storedValues.factoryAddress,      [Validators.required, Validators.maxLength(500)]),
      pinCode:             new FormControl(storedValues.pinCode,             [Validators.required, Validators.pattern(PatternConstants.PINCODE)]),
      companyMobileNumber: new FormControl(storedValues.companyMobileNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      companyEmailId:      new FormControl(storedValues.companyEmailId,      [Validators.pattern(PatternConstants.EMAIL)])
    });

    this.companyDetailsForm.get('license')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        if (val) {
          const matched = this.myActiveLicenses.find(l => {
            const id = l.licenseId || l.license_id;
            return id === val;
          });
          if (matched) {
            const estName = matched.establishmentName || matched.establishment_name;
            if (estName) {
              this.companyDetailsForm.patchValue({ companyName: estName });
            }
          }
        }
      });

    this.companyDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  getCurrentFinancialYear(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    return month >= 4 ? `${year}-${(year + 1) % 100}` : `${year - 1}-${year % 100}`;
  }

  ngOnInit() {
    this.loadLicenseTypes();

    // ✅ Auto-fill after short delay to ensure form is ready
    setTimeout(() => {
      this.autoFillFromProfiles();
    }, 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────
  // ✅ NEW: Fetch both user profile AND licensee profile in parallel
  // ─────────────────────────────────────────────────────────────────
  private autoFillFromProfiles(): void {
    console.log('🔍 Fetching user profile + licensee profile for auto-fill...');

    // ✅ FIXED: Use getMyLicenseeProfile() to get current user's profile
    forkJoin({
      userProfile:     this.fetchUserProfile(),
      licenseeProfile: this.masterService.getMyLicenseeProfile().pipe(catchError(() => of(null)))
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ userProfile, licenseeProfile }) => {
        console.log('✅ User profile:', userProfile);
        console.log('✅ Licensee profile:', licenseeProfile);

        this.fillForm(userProfile, licenseeProfile);
      },
      error: (err) => console.error('❌ Auto-fill error:', err)
    });
  }

  /** Resolves the user profile from memory / localStorage / backend */
  private fetchUserProfile() {
    let cached = this.accountService.getUserProfileSync();
    if (!cached) {
      try {
        const stored = localStorage.getItem('currentUser');
        if (stored) cached = JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return cached
      ? of(cached)
      : this.accountService.identity(true).pipe(catchError(() => of(null)));
  }

  // ─────────────────────────────────────────────────────────────────
  // ✅ NEW: Fill form using data from both profiles
  // ─────────────────────────────────────────────────────────────────
  private fillForm(user: any, licensee: any): void {
    const fillData: any = {};

    // ── From user profile ──────────────────────────────────────────
    if (user) {
      if (!this.companyDetailsForm.get('companyMobileNumber')?.value && (user.phoneNumber || user.phone_number)) {
        fillData.companyMobileNumber = user.phoneNumber || user.phone_number;
      }
      if (!this.companyDetailsForm.get('companyEmailId')?.value && user.email) {
        fillData.companyEmailId = user.email;
      }
    }

    // ── From licensee profile ──────────────────────────────────────
    if (licensee) {
      const nationality: string = (licensee.nationality || '').trim().toLowerCase();

      // Map nationality → country dropdown
      if (!this.companyDetailsForm.get('country')?.value) {
        const mappedCountry = NATIONALITY_COUNTRY_MAP[nationality];
        if (mappedCountry) {
          fillData.country = mappedCountry;
          console.log(`✅ Mapped nationality "${licensee.nationality}" → country "${mappedCountry}"`);
        }
      }

      // Default state to Sikkim for residents (most common case)
      if (!this.companyDetailsForm.get('state')?.value) {
        fillData.state = 'Sikkim';
      }

      // Store licensee profile in sessionStorage so submit step can use it
      // ✅ FIXED: Use camelCase field names from API response
      sessionStorage.setItem('licenseeProfile', JSON.stringify({
        fatherName:                licensee.fatherName,
        dob:                       licensee.dob,
        gender:                    licensee.gender,
        genderDisplay:             licensee.genderDisplay,
        nationality:               licensee.nationality,
        maritalStatus:             licensee.maritalStatus,
        maritalStatusDisplay:      licensee.maritalStatusDisplay,
        residentialStatus:         licensee.residentialStatus,
        residentialStatusDisplay:  licensee.residentialStatusDisplay,
        panNumber:                 licensee.panNumber,
      }));
      console.log('✅ Licensee profile saved to sessionStorage');
    }

    // Default country fallback if still empty
    if (!fillData.country && !this.companyDetailsForm.get('country')?.value) {
      fillData.country = 'India';
    }

    if (Object.keys(fillData).length === 0) {
      console.log('⚠️ No new data to fill in company details');
      return;
    }

    console.log('📝 Auto-filling company details:', fillData);

    this.companyDetailsForm.patchValue(fillData, { emitEvent: false });

    Object.keys(fillData).forEach(key => {
      const ctrl = this.companyDetailsForm.get(key);
      if (ctrl) {
        ctrl.markAsDirty();
        ctrl.markAsTouched();
        ctrl.updateValueAndValidity();
      }
    });

    this.cdr.detectChanges();
    this.saveToSessionStorage();

    setTimeout(() => {
      this.cdr.detectChanges();
      console.log('✅ Company auto-fill complete:', this.companyDetailsForm.value);
    }, 0);
  }

  private loadLicenseTypes() {
    this.isLoadingLicenses = true;
    this.licenseMeService.getMyLicenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Filter approved and active licenses supporting both camelCase and snake_case, excluding salesman/barman
          this.myActiveLicenses = (data || []).filter(l => {
            const approved = l.isApproved !== undefined ? l.isApproved : (l.is_approved !== undefined ? l.is_approved : false);
            const expired = l.isExpired !== undefined ? l.isExpired : l.is_expired;
            const id = l.licenseId || l.license_id || '';
            const isSalesmanBarman = (l.sourceType || l.source_type) === 'salesman_barman' || id.startsWith('SB/');
            return approved && !expired && !isSalesmanBarman;
          });
          console.log('✅ Loaded my active licenses:', this.myActiveLicenses);
          this.isLoadingLicenses = false;

          // Auto-catch if exactly 1 active license exists
          if (this.myActiveLicenses.length === 1) {
            const singleLicense = this.myActiveLicenses[0].licenseId || this.myActiveLicenses[0].license_id;
            this.companyDetailsForm.patchValue({ license: singleLicense });
            console.log('✅ Auto-caught single license:', singleLicense);
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error fetching active licenses:', error);
          this.myActiveLicenses = [];
          this.isLoadingLicenses = false;
          this.cdr.detectChanges();
        }
      });
  }

  private getFromSessionStorage(): Partial<Company> {
    const stored = sessionStorage.getItem('companyDetails');
    return stored ? JSON.parse(stored) as Company : {};
  }

  private saveToSessionStorage() {
    sessionStorage.setItem('companyDetails', JSON.stringify(this.companyDetailsForm.getRawValue()));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const ctrl = this.companyDetailsForm.get(field);
    if      (ctrl?.hasError('required')) this.errorMessages[field].set('This field is required');
    else if (ctrl?.hasError('pattern'))  this.errorMessages[field].set('Invalid format');
    else if (ctrl?.hasError('email'))    this.errorMessages[field].set('Not a valid email');
    else                                  this.errorMessages[field].set('');
  }

  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach(f => this.updateErrorMessage(f as keyof typeof this.errorMessages));
  }

  getErrorMessage(field: keyof typeof this.errorMessages) { return this.errorMessages[field](); }

  proceedToNext() {
    if (this.companyDetailsForm.valid) {
      this.next.emit();
    } else {
      this.companyDetailsForm.markAllAsTouched();
      this.updateAllErrorMessages();
    }
  }

  resetForm() {
    this.companyDetailsForm.reset();
    sessionStorage.removeItem('companyDetails');
    sessionStorage.removeItem('licenseeProfile');
  }

  goBack() { this.back.emit(); }
}