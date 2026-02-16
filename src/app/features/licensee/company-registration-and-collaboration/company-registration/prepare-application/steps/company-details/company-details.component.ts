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
    pan:                 signal(''),
    officeAddress:       signal(''),
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
    private cdr:            ChangeDetectorRef
  ) {
    const storedValues = this.getFromSessionStorage();

    this.companyDetailsForm = this.fb.group({
      brandType:           new FormControl(storedValues.brandType,           [Validators.required]),
      license:             new FormControl(storedValues.license,             Validators.required),
      applicationYear:     new FormControl(storedValues.applicationYear,     Validators.required),
      companyName:         new FormControl(storedValues.companyName,         [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      pan:                 new FormControl(storedValues.pan,                 [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      officeAddress:       new FormControl(storedValues.officeAddress,       [Validators.required, Validators.maxLength(1000)]),
      country:             new FormControl(storedValues.country,             [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      state:               new FormControl(storedValues.state,               [Validators.required]),
      factoryAddress:      new FormControl(storedValues.factoryAddress,      [Validators.required, Validators.maxLength(500)]),
      pinCode:             new FormControl(storedValues.pinCode,             [Validators.required, Validators.pattern(PatternConstants.PINCODE)]),
      companyMobileNumber: new FormControl(storedValues.companyMobileNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      companyEmailId:      new FormControl(storedValues.companyEmailId,      [Validators.pattern(PatternConstants.EMAIL)])
    });

    this.companyDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {
    FormUtils.capitalize(this.companyDetailsForm.get('pan')!, this.destroy$);
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
    const alreadyFilled =
      this.companyDetailsForm.get('companyEmailId')?.value &&
      this.companyDetailsForm.get('companyMobileNumber')?.value &&
      this.companyDetailsForm.get('officeAddress')?.value;

    if (alreadyFilled) {
      console.log('📋 Company details already filled, skipping auto-fill');
      return;
    }

    console.log('🔍 Fetching user profile + licensee profile for auto-fill...');

    // Fetch both in parallel; treat errors as null so one failure doesn't block the other
    forkJoin({
      userProfile:     this.fetchUserProfile(),
      licenseeProfile: this.masterService.getLicenseeProfiles().pipe(catchError(() => of([])))
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ userProfile, licenseeProfile }) => {
        const lp = Array.isArray(licenseeProfile) && licenseeProfile.length > 0
          ? licenseeProfile[0]
          : null;

        console.log('✅ User profile:', userProfile);
        console.log('✅ Licensee profile:', lp);

        this.fillForm(userProfile, lp);
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
      if (!this.companyDetailsForm.get('officeAddress')?.value && user.address) {
        fillData.officeAddress = user.address;
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
      sessionStorage.setItem('licenseeProfile', JSON.stringify({
        father_name:         licensee.father_name,
        dob:                 licensee.dob,
        gender:              licensee.gender,
        gender_display:      licensee.gender_display,
        nationality:         licensee.nationality,
        marital_status:      licensee.marital_status,
        marital_status_display:      licensee.marital_status_display,
        residential_status:          licensee.residential_status,
        residential_status_display:  licensee.residential_status_display,
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
    const apiUrl = `${environment.apiBaseUrl}/masters/core/license-types/`;
    this.http.get<LicenseType[]>(apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (data)  => { this.licenses = data; this.isLoadingLicenses = false; },
        error: (error) => { console.error('❌ Error fetching license types:', error); this.isLoadingLicenses = false; }
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