import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../shared/utils/capitalize.util';
import { AccountService } from '../../../../../core/services/account.service';
import { MasterService } from '../../../../../core/services/master.service';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { DatePipe } from '@angular/common';
import { MatStepper } from '@angular/material/stepper';

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
  private stepper = inject(MatStepper, { optional: true });

  nationalities = ['Indian', 'Foreign'];
  allModesOfOperation = [
    { value: 'Self', label: 'Self' },
    { value: 'Salesman', label: 'Salesman' },
    { value: 'Barman', label: 'Barman' }
  ];
  modesOfOperation = [...this.allModesOfOperation];

  panCardDoc = {
    name: 'pan_card',
    label: 'PAN Card',
    file: null as File | null,
    fileUrl: '',
    required: true,
    formats: '.jpg,.jpeg,.png,.pdf'
  };

  errorMessages = {
    companyName:        signal(''),
    companyAddress:     signal(''),
    companyGst:         signal(''),
    companyPhoneNumber: signal(''),
    companyEmail:       signal(''),
    pan:                signal(''),
    nationality:        signal(''),
    presentAddress:     signal(''),
    permanentAddress:   signal(''),
  };

  constructor(
    private fb:             FormBuilder,
    private datePipe:       DatePipe,
    private accountService: AccountService,
    private masterService:  MasterService,
    private licenseSrv:     LicenseApplicationService,
    private cdr:            ChangeDetectorRef
  ) {
    const storedValues: any = this.getFromSessionStorage();

    this.unitDetailsForm = this.fb.group({
      companyName:        new FormControl(storedValues.companyName,        [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      companyAddress:     new FormControl(storedValues.companyAddress,     [Validators.required]),
      companyGst:         new FormControl(storedValues.companyGst,         [Validators.required, Validators.pattern(PatternConstants.GST)]),
      companyPhoneNumber: new FormControl(storedValues.companyPhoneNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      companyEmail:       new FormControl(storedValues.companyEmail,       [Validators.required, Validators.pattern(PatternConstants.EMAIL)]),
      modeOfOperation:    new FormControl(storedValues.modeOfOperation || null),
      pan:                new FormControl(storedValues.pan || '',          [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      nationality:        new FormControl(storedValues.nationality || 'Indian', [Validators.required]),
      presentAddress:     new FormControl(storedValues.presentAddress || '', [Validators.required]),
      permanentAddress:   new FormControl(storedValues.permanentAddress || '', [Validators.required])
    });

    this.unitDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateAllErrorMessages());
  }

  ngOnInit() {
    FormUtils.capitalize(this.unitDetailsForm.get('companyGst')!, this.destroy$);
    FormUtils.capitalize(this.unitDetailsForm.get('pan')!, this.destroy$);
    
    // Restore documents
    const storedDoc = this.licenseSrv.getSiteDocument('pan_card');
    if (storedDoc) {
      this.panCardDoc.file = storedDoc;
      this.panCardDoc.fileUrl = URL.createObjectURL(storedDoc);
    }

    this.updateModesOfOperation();
    this.autoFillFromProfiles();

    if (this.stepper) {
      this.stepper.selectionChange
        .pipe(takeUntil(this.destroy$))
        .subscribe((event) => {
          if (event.selectedStep.label === 'Company Details') {
            this.updateModesOfOperation();
          }
        });
    }
  }

  ngOnDestroy() {
    if (this.panCardDoc.fileUrl) {
      URL.revokeObjectURL(this.panCardDoc.fileUrl);
    }
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
  // ✅ Fill contact fields from user + licensee profile
  //   PAN is pre-filled from licensee.panNumber (same as applicant-details).
  //   companyName, CIN, incorporationDate are company-specific and must be entered manually.
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
    // (No pre-filling required for GST number as it is company-specific)

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
    formData.company_gst     = formData.companyGst?.toUpperCase();
    formData.company_email   = formData.companyEmail;

    if (formData.companyPhoneNumber) {
      formData.company_phone_number = String(formData.companyPhoneNumber).replace(/\D/g, '');
    }

    // Shifted fields
    formData.pan = formData.pan?.toUpperCase() || null;
    formData.nationality = formData.nationality || null;
    formData.present_address = formData.presentAddress || null;
    formData.permanent_address = formData.permanentAddress || null;
    formData.mode_of_operation = formData.modeOfOperation || null;

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
      if      (field === 'companyGst')         this.errorMessages[field].set('Invalid GST format (e.g., 22AAAAA1111A1Z1)');
      else if (field === 'companyPhoneNumber') this.errorMessages[field].set('Invalid phone number format');
      else if (field === 'companyEmail')       this.errorMessages[field].set('Invalid email format');
      else if (field === 'pan')                this.errorMessages[field].set('Invalid PAN format');
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
    if (this.unitDetailsForm.valid && this.isPanCardUploaded()) {
      this.saveToSessionStorage();
      this.next.emit();
    } else {
      Object.keys(this.unitDetailsForm.controls)
        .forEach(key => this.unitDetailsForm.get(key)?.markAsTouched());
      if (!this.isPanCardUploaded()) {
        alert('Please upload the PAN Card document before proceeding.');
      }
    }
  }

  resetForm() {
    this.unitDetailsForm.reset({
      nationality: 'Indian'
    });
    if (this.panCardDoc.fileUrl) {
      URL.revokeObjectURL(this.panCardDoc.fileUrl);
    }
    this.panCardDoc.file = null;
    this.panCardDoc.fileUrl = '';
    this.licenseSrv.removeSiteDocument('pan_card');
    sessionStorage.removeItem('unitDetailsData');
  }

  goBack() { this.back.emit(); }

  shouldShowModeOfOperationDropdown(): boolean {
    return this.modesOfOperation.length > 1;
  }

  updateModesOfOperation(): void {
    const keyInfoStr = sessionStorage.getItem('keyInfoData');
    if (!keyInfoStr) {
      this.modesOfOperation = [...this.allModesOfOperation];
      return;
    }

    try {
      const keyInfo = JSON.parse(keyInfoStr);
      const catId = Number(keyInfo.licenseCategory || keyInfo.license_category);
      const categoryName = (keyInfo.license_category_name || '').toLowerCase();

      const isSalesmanOnly = [14, 10, 6, 12].includes(catId) || 
        categoryName.includes('foreign liquor retail shop') ||
        categoryName.includes('pachwai') ||
        categoryName.includes('departmental store') ||
        categoryName.includes('denatured spirit');

      const isBarmanOnly = [13, 3, 4, 5, 7, 8, 11].includes(catId) ||
        categoryName.includes('special category hotel') ||
        categoryName.includes('homemade wine') ||
        categoryName.includes('hotel & lodge') ||
        categoryName.includes('hotel and lodge') ||
        categoryName.includes('casino') ||
        categoryName.includes('discotheque') ||
        categoryName.includes('grade category hotel') ||
        categoryName.includes('restaurant - cum - bar shop') ||
        categoryName.includes('restaurant cum bar shop');

      const isNeither = [9, 1].includes(catId) ||
        categoryName.includes('homestay') ||
        categoryName.includes('manufacturing');

      if (isNeither) {
        this.modesOfOperation = this.allModesOfOperation.filter(m => m.value === 'Self');
        this.unitDetailsForm.get('modeOfOperation')?.setValue('Self');
        this.unitDetailsForm.get('modeOfOperation')?.disable();
      } else if (isSalesmanOnly) {
        this.modesOfOperation = this.allModesOfOperation.filter(m => m.value === 'Self' || m.value === 'Salesman');
        this.unitDetailsForm.get('modeOfOperation')?.enable();
        const currentMode = this.unitDetailsForm.get('modeOfOperation')?.value;
        if (currentMode && currentMode !== 'Self' && currentMode !== 'Salesman') {
          this.unitDetailsForm.get('modeOfOperation')?.setValue('Self');
        }
      } else if (isBarmanOnly) {
        this.modesOfOperation = this.allModesOfOperation.filter(m => m.value === 'Self' || m.value === 'Barman');
        this.unitDetailsForm.get('modeOfOperation')?.enable();
        const currentMode = this.unitDetailsForm.get('modeOfOperation')?.value;
        if (currentMode && currentMode !== 'Self' && currentMode !== 'Barman') {
          this.unitDetailsForm.get('modeOfOperation')?.setValue('Self');
        }
      } else {
        this.modesOfOperation = [...this.allModesOfOperation];
        this.unitDetailsForm.get('modeOfOperation')?.enable();
      }
    } catch (e) {
      console.error('Failed to parse keyInfoData or filter modes of operation:', e);
      this.modesOfOperation = [...this.allModesOfOperation];
      this.unitDetailsForm.get('modeOfOperation')?.enable();
    }
  }

  copyPresentToPermanent(checked: boolean): void {
    if (checked) {
      const presentAddress = this.unitDetailsForm.get('presentAddress')?.value ?? '';
      this.unitDetailsForm.patchValue({ permanentAddress: presentAddress });
    }
  }

  onPanCardSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5 MB.');
      input.value = '';
      return;
    }

    const allowedExtensions = this.panCardDoc.formats.split(',').map(f => f.trim());
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!allowedExtensions.includes(extension)) {
      alert(`Allowed formats: ${this.panCardDoc.formats}`);
      input.value = '';
      return;
    }

    if (this.panCardDoc.fileUrl) {
      URL.revokeObjectURL(this.panCardDoc.fileUrl);
    }

    this.panCardDoc.file = file;
    this.panCardDoc.fileUrl = URL.createObjectURL(file);
    this.licenseSrv.setSiteDocument('pan_card', file);
    this.cdr.detectChanges();
  }

  viewPanCard(): void {
    if (this.panCardDoc.fileUrl) {
      window.open(this.panCardDoc.fileUrl, '_blank');
    }
  }

  isPanCardUploaded(): boolean {
    return this.panCardDoc.file !== null;
  }
}