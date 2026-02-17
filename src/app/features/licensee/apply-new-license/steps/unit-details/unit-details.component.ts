import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../shared/utils/capitalize.util';
import { AccountService } from '../../../../../core/services/account.service';
import { MasterService } from '../../../../../core/services/master.service'; // ✅ NEW
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-unit-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './unit-details.component.html',
  styleUrl: './unit-details.component.scss',
  providers: [DatePipe]
})
export class UnitDetailsComponent implements OnInit, OnDestroy {

  unitDetailsForm: FormGroup;

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  errorMessages = {
    companyName:        signal(''),
    companyAddress:     signal(''),
    companyPan:         signal(''),
    companyCin:         signal(''),
    incorporationDate:  signal(''),
    companyPhoneNumber: signal(''),
    companyEmail:       signal(''),
  };

  constructor(
    private fb:             FormBuilder,
    private datePipe:       DatePipe,
    private accountService: AccountService,
    private masterService:  MasterService   // ✅ NEW
  ) {
    const storedValues: any = this.getFromSessionStorage();

    this.unitDetailsForm = this.fb.group({
      companyName:        new FormControl(storedValues.companyName,        [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      companyAddress:     new FormControl(storedValues.companyAddress,     [Validators.required]),
      companyPan:         new FormControl(storedValues.companyPan,         [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      companyCin:         new FormControl(storedValues.companyCin,         [Validators.required, Validators.pattern(PatternConstants.CIN)]),
      incorporationDate:  new FormControl(storedValues.incorporationDate ?? null, [Validators.required]),
      companyPhoneNumber: new FormControl(storedValues.companyPhoneNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      companyEmail:       new FormControl(storedValues.companyEmail,       [Validators.required, Validators.pattern(PatternConstants.EMAIL)])
    });

    this.unitDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateAllErrorMessages());
  }

  ngOnInit() {
    FormUtils.capitalize(this.unitDetailsForm.get('companyPan')!, this.destroy$);
    FormUtils.capitalize(this.unitDetailsForm.get('companyCin')!, this.destroy$);
    this.autoFillFromProfiles(); // ✅ UPDATED
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────
  // ✅ NEW: Fetch user profile + licensee profile in parallel
  // ─────────────────────────────────────────────────────────────────
  private autoFillFromProfiles(): void {
    const sessionData = sessionStorage.getItem('unitDetailsData');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        if (parsed.companyEmail && parsed.companyPhoneNumber && parsed.companyAddress) {
          console.log('📋 Unit details already in session, skipping auto-fill');
          return;
        }
      } catch { /* proceed */ }
    }

    console.log('🔍 Fetching profiles for unit-details auto-fill...');

    // ✅ FIXED: Use getMyLicenseeProfile() to get current user's profile
    forkJoin({
      userProfile:     this.fetchUserProfile(),
      licenseeProfile: this.masterService.getMyLicenseeProfile().pipe(catchError(() => of(null)))
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ userProfile, licenseeProfile }) => {
        console.log('✅ User profile for unit-details:', userProfile);
        console.log('✅ Licensee profile for unit-details:', licenseeProfile);
        
        this.fillForm(userProfile, licenseeProfile);
      },
      error: (err) => console.error('❌ Unit details auto-fill error:', err)
    });
  }

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
  // ✅ NEW: Fill contact fields from user + licensee profile
  //   Note: companyName, PAN, CIN, incorporationDate are company-specific
  //   and CANNOT be derived from the user/licensee profile — user fills these manually.
  // ─────────────────────────────────────────────────────────────────
  private fillForm(user: any, licensee: any): void {
    const fillData: any = {};

    // ── From user profile ──────────────────────────────────────────
    if (user) {
      if (!this.unitDetailsForm.get('companyPhoneNumber')?.value && (user.phoneNumber || user.phone_number)) {
        fillData.companyPhoneNumber = user.phoneNumber || user.phone_number;
        console.log('✅ companyPhoneNumber ←', fillData.companyPhoneNumber);
      }
      if (!this.unitDetailsForm.get('companyEmail')?.value && user.email) {
        fillData.companyEmail = user.email;
        console.log('✅ companyEmail ←', user.email);
      }
      if (!this.unitDetailsForm.get('companyAddress')?.value && user.address) {
        fillData.companyAddress = user.address;
        console.log('✅ companyAddress ←', user.address);
      }
    }

    // ── From licensee profile ──────────────────────────────────────
    // The licensee profile has: father_name, dob, gender, nationality,
    // marital_status, residential_status — none of these map to company fields.
    // We log it for completeness but don't fill anything new.
    if (licensee) {
      console.log('ℹ️ Licensee profile available but no additional company fields to fill:', licensee);
    }

    if (Object.keys(fillData).length === 0) {
      console.log('⚠️ No new data to fill in unit details');
      return;
    }

    console.log('📝 Auto-filling unit details:', fillData);

    this.unitDetailsForm.patchValue(fillData, { emitEvent: false });

    Object.keys(fillData).forEach(key => {
      const ctrl = this.unitDetailsForm.get(key);
      ctrl?.markAsDirty();
      ctrl?.markAsTouched();
      ctrl?.updateValueAndValidity();
    });

    console.log('✅ Unit details auto-fill complete:', this.unitDetailsForm.value);
  }

  // ─────────────────────────────────────────────────────────────────
  // Session storage
  // ─────────────────────────────────────────────────────────────────
  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('unitDetailsData');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage() {
    const formData: any = this.unitDetailsForm.getRawValue();

    formData.company_name    = formData.companyName;
    formData.company_address = formData.companyAddress;
    formData.company_pan     = formData.companyPan?.toUpperCase();
    formData.company_cin     = formData.companyCin?.toUpperCase();
    formData.company_email   = formData.companyEmail;

    if (formData.companyPhoneNumber) {
      formData.company_phone_number = String(formData.companyPhoneNumber).replace(/\D/g, '');
    }
    if (formData.incorporationDate) {
      const date = new Date(formData.incorporationDate);
      if (!isNaN(date.getTime())) {
        formData.incorporation_date = date.toISOString().split('T')[0];
      }
    }

    console.log('💾 Saving Unit Details:', formData);
    sessionStorage.setItem('unitDetailsData', JSON.stringify(formData));
  }

  // ─────────────────────────────────────────────────────────────────
  // Error messages (unchanged)
  // ─────────────────────────────────────────────────────────────────
  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.unitDetailsForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      if      (field === 'companyPan')         this.errorMessages[field].set('Invalid PAN format (e.g., ABCDE1234F)');
      else if (field === 'companyCin')         this.errorMessages[field].set('Invalid CIN format');
      else if (field === 'companyPhoneNumber') this.errorMessages[field].set('Invalid phone number format');
      else if (field === 'companyEmail')       this.errorMessages[field].set('Invalid email format');
      else                                      this.errorMessages[field].set('Invalid format');
    } else {
      this.errorMessages[field].set('');
    }
  }

  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach(field =>
      this.updateErrorMessage(field as keyof typeof this.errorMessages));
  }

  getErrorMessage(field: keyof typeof this.errorMessages) { return this.errorMessages[field](); }

  proceedToNext() {
    if (this.unitDetailsForm.valid) {
      this.saveToSessionStorage();
      this.next.emit();
    } else {
      Object.keys(this.unitDetailsForm.controls)
        .forEach(key => this.unitDetailsForm.get(key)?.markAsTouched());
    }
  }

  resetForm() {
    this.unitDetailsForm.reset();
    sessionStorage.removeItem('unitDetailsData');
  }

  goBack() { this.back.emit(); }
}