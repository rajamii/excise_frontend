import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { PatternConstants } from '../../../../../../../shared/constants/pattern.constants';
import { Company } from '../../../../../../../core/models/company.model';
import { AccountService } from '../../../../../../../core/services/account.service';
import { MasterService } from '../../../../../../../core/services/master.service';

@Component({
  selector: 'app-member-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './member-details.component.html',
  styleUrl: './member-details.component.scss'
})
export class MemberDetailsComponent implements OnInit, OnDestroy {

  memberDetailsForm: FormGroup;

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // ✅ Track whether we found a licensee profile
  hasLicenseeProfile = false;

  errorMessages = {
    memberName:        signal(''),
    memberDesignation: signal(''),
    memberMobileNumber:signal(''),
    memberEmailId:     signal(''),
    memberAddress:     signal(''),
    // Licensee profile fields (read-only, no validation errors needed)
    fatherName:        signal(''),
    dob:               signal(''),
    gender:            signal(''),
    nationality:       signal(''),
  };

  constructor(
    private fb:             FormBuilder,
    private accountService: AccountService,
    private masterService:  MasterService,   // ✅ NEW
    private cdr:            ChangeDetectorRef
  ) {
    const storedValues = this.getFromSessionStorage();

    this.memberDetailsForm = this.fb.group({
      // ── Editable fields ──────────────────────────────────────────
      memberName:         new FormControl(storedValues.memberName,         [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      memberDesignation:  new FormControl(storedValues.memberDesignation,  [Validators.required, Validators.maxLength(100)]),
      memberMobileNumber: new FormControl(storedValues.memberMobileNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      memberEmailId:      new FormControl(storedValues.memberEmailId,      [Validators.pattern(PatternConstants.EMAIL)]),
      memberAddress:      new FormControl(storedValues.memberAddress,      [Validators.required, Validators.maxLength(500)]),

      // ── Licensee profile fields (pre-filled, disabled) ───────────
      fatherName:         new FormControl({ value: storedValues.fatherName   || '', disabled: true }),
      dob:                new FormControl({ value: storedValues.dob          || '', disabled: true }),
      gender:             new FormControl({ value: storedValues.gender       || '', disabled: true }),
      nationality:        new FormControl({ value: storedValues.nationality  || '', disabled: true }),
    });

    this.memberDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {
    setTimeout(() => {
      this.autoFillFromProfiles();
    }, 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────
  // ✅ NEW: Fetch user profile + licensee profile in parallel
  // ─────────────────────────────────────────────────────────────────
  private autoFillFromProfiles(): void {
    console.log('🔍 Fetching profiles for member-details auto-fill...');

    // ✅ FIXED: Use getMyLicenseeProfile() to get current user's profile
    forkJoin({
      userProfile:     this.fetchUserProfile(),
      licenseeProfile: this.masterService.getMyLicenseeProfile().pipe(catchError(() => of(null)))
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ userProfile, licenseeProfile }) => {
        console.log('✅ User profile for member fill:', userProfile);
        console.log('✅ Licensee profile for member fill:', licenseeProfile);

        this.fillForm(userProfile, licenseeProfile);
      },
      error: (err) => console.error('❌ Member auto-fill error:', err)
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
  // ✅ NEW: Fill form using both profiles
  // ─────────────────────────────────────────────────────────────────
  private fillForm(user: any, licensee: any): void {
    const fillData: any = {};

    // ── From user profile ──────────────────────────────────────────
    if (user) {
      if (!this.memberDetailsForm.get('memberName')?.value) {
        const parts = [
          user.firstName  || user.first_name  || '',
          user.middleName || user.middle_name || '',
          user.lastName   || user.last_name   || '',
        ].filter(Boolean);
        if (parts.length) fillData.memberName = parts.join(' ');
      }
      if (!this.memberDetailsForm.get('memberMobileNumber')?.value && (user.phoneNumber || user.phone_number)) {
        fillData.memberMobileNumber = user.phoneNumber || user.phone_number;
      }
      if (!this.memberDetailsForm.get('memberEmailId')?.value && user.email) {
        fillData.memberEmailId = user.email;
      }
      if (!this.memberDetailsForm.get('memberAddress')?.value && user.address) {
        fillData.memberAddress = user.address;
      }
      if (!this.memberDetailsForm.get('memberDesignation')?.value) {
        fillData.memberDesignation = 'Director';
      }
    }

    // ── From licensee profile ──────────────────────────────────────
    if (licensee) {
      this.hasLicenseeProfile = true;

      // These are disabled controls – we need to use enable/patchValue/disable cycle
      // OR use getRawValue() which includes disabled fields

      // ✅ FIXED: Use camelCase field names from API response
      // Father's name
      if (!this.memberDetailsForm.get('fatherName')?.value && licensee.fatherName) {
        fillData.fatherName = licensee.fatherName;
      }
      // Date of birth
      if (!this.memberDetailsForm.get('dob')?.value && licensee.dob) {
        fillData.dob = licensee.dob;
      }
      // Gender (use display label for readability)
      if (!this.memberDetailsForm.get('gender')?.value && licensee.genderDisplay) {
        fillData.gender = licensee.genderDisplay;
      }
      // Nationality
      if (!this.memberDetailsForm.get('nationality')?.value && licensee.nationality) {
        fillData.nationality = licensee.nationality;
      }
    } else {
      this.hasLicenseeProfile = false;
    }

    if (Object.keys(fillData).length === 0) {
      console.log('⚠️ No new data to fill in member details');
      return;
    }

    console.log('📝 Auto-filling member details:', fillData);

    // For disabled controls we must enable → patch → disable
    const disabledFields = ['fatherName', 'dob', 'gender', 'nationality'];
    disabledFields.forEach(f => this.memberDetailsForm.get(f)?.enable({ emitEvent: false }));

    this.memberDetailsForm.patchValue(fillData, { emitEvent: false });

    // Re-disable the licensee profile fields
    disabledFields.forEach(f => this.memberDetailsForm.get(f)?.disable({ emitEvent: false }));

    // Mark editable fields as dirty/touched
    const editableFields = ['memberName', 'memberDesignation', 'memberMobileNumber', 'memberEmailId', 'memberAddress'];
    editableFields.forEach(key => {
      if (fillData[key] !== undefined) {
        const ctrl = this.memberDetailsForm.get(key);
        ctrl?.markAsDirty();
        ctrl?.markAsTouched();
        ctrl?.updateValueAndValidity();
      }
    });

    this.cdr.detectChanges();
    this.saveToSessionStorage();

    setTimeout(() => {
      this.cdr.detectChanges();
      console.log('✅ Member details auto-fill complete:', this.memberDetailsForm.getRawValue());
    }, 0);
  }

  // ─────────────────────────────────────────────────────────────────
  // Session storage – use getRawValue() to include disabled fields
  // ─────────────────────────────────────────────────────────────────
  private getFromSessionStorage(): any {
    const stored = sessionStorage.getItem('memberDetails');
    return stored ? JSON.parse(stored) : {};
  }

  private saveToSessionStorage() {
    // getRawValue() captures disabled fields (fatherName, dob, gender, nationality) too
    sessionStorage.setItem('memberDetails', JSON.stringify(this.memberDetailsForm.getRawValue()));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const ctrl = this.memberDetailsForm.get(field);
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
    if (this.memberDetailsForm.valid) {
      this.next.emit();
    } else {
      this.memberDetailsForm.markAllAsTouched();
      this.updateAllErrorMessages();
    }
  }

  resetForm() {
    this.memberDetailsForm.reset();
    sessionStorage.removeItem('memberDetails');
  }

  goBack() { this.back.emit(); }
}