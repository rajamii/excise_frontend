import {
  Component, EventEmitter, Output, OnInit, OnDestroy,
  ChangeDetectorRef, signal
} from '@angular/core';
import {
  FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { AccountService } from '../../../../../core/services/account.service';
import { MasterService } from '../../../../../core/services/master.service'; // ✅ NEW

interface DocumentUpload {
  name: string;
  label: string;
  file: File | null;
  fileUrl: string;
  required: boolean;
  formats: string;
}
interface ModeOfOperation { value: string; label: string; }

// ✅ Map licensee profile gender code → form label
const GENDER_MAP: Record<string, string> = {
  'M': 'Male',
  'F': 'Female',
  'O': 'Female',   // fallback; form only has Male/Female
};

// ✅ Map licensee marital_status → form label
const MARITAL_MAP: Record<string, string> = {
  'SINGLE':   'Single',
  'MARRIED':  'Married',
  'DIVORCED': 'Divorced',
  'WIDOWED':  'Married',   // closest fallback
};

// ✅ Map licensee residential_status → form label
const RESIDENTIAL_MAP: Record<string, string> = {
  'RESIDENT':     'Resident',
  'NON_RESIDENT': 'Non-Resident',
  'OCI':          'Non-Resident',  // closest fallback
};

@Component({
  selector: 'app-applicant-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './applicant-details.component.html',
  styleUrl: './applicant-details.component.scss',
})
export class ApplicantDetailsComponent implements OnInit, OnDestroy {
  applicantDetailsForm!: FormGroup;
  f!: any;

  nationalities      = ['Indian', 'Foreign'];
  residentialStatuses = ['Resident', 'Non-Resident'];
  maritalStatuses     = ['Single', 'Married', 'Divorced'];
  modesOfOperation: ModeOfOperation[] = [
    { value: 'Self',     label: 'Self' },
    { value: 'Salesman', label: 'Salesman' },
    { value: 'Barman',   label: 'Barman' }
  ];

  documents: DocumentUpload[] = [
    { name: 'passportPhoto',     label: 'Passport Size Photo',                                                                       file: null, fileUrl: '', required: true,  formats: '.jpg,.jpeg,.png' },
    { name: 'pan_card',          label: 'PAN Card',                                                                                  file: null, fileUrl: '', required: true,  formats: '.jpg,.jpeg,.png,.pdf' },
    { name: 'sikkim_certificate',label: 'Sikkim Subject Certificate / Certificate of Identification / Residential Certificate',       file: null, fileUrl: '', required: true,  formats: '.jpg,.jpeg,.png,.pdf' },
    { name: 'dob_proof',         label: 'Date of Birth Proof',                                                                       file: null, fileUrl: '', required: true,  formats: '.jpg,.jpeg,.png,.pdf' },
    { name: 'noc_landlord',      label: 'NOC from Landlord (if applicable)',                                                         file: null, fileUrl: '', required: false, formats: '.jpg,.jpeg,.png,.pdf' }
  ];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  private errorMessages = {
    firstName:            signal(''),
    lastName:             signal(''),
    fatherHusbandName:    signal(''),
    dob:                  signal(''),
    gender:               signal(''),
    nationality:          signal(''),
    maritalStatus:        signal(''),
    residentialStatus:    signal(''),
    presentAddress:       signal(''),
    permanentAddress:     signal(''),
    pan:                  signal(''),
    email:                signal(''),
    applicantMobileNumber:signal(''),
    hasSikkimCertificate: signal(''),
    hasExciseLicense:     signal(''),
    familyExciseLicense:  signal(''),
    criminalConviction:   signal('')
  };

  constructor(
    private fb:            FormBuilder,
    private licenseSrv:    LicenseApplicationService,
    private accountService:AccountService,
    private masterService: MasterService,        // ✅ NEW
    private cdr:           ChangeDetectorRef
  ) {
    const stored = this.getFromSessionStorage();

    this.applicantDetailsForm = this.fb.group({
      firstName:            [stored.firstName,            [Validators.required, Validators.pattern(PatternConstants.NAME)]],
      middleName:           [stored.middleName],
      lastName:             [stored.lastName,             [Validators.required, Validators.pattern(PatternConstants.NAME)]],
      fatherHusbandName:    [stored.fatherHusbandName,    [Validators.required, Validators.pattern(PatternConstants.NAME)]],
      dob:                  [stored.dob,                  [Validators.required]],
      gender:               [stored.gender,               Validators.required],
      nationality:          [stored.nationality    ?? 'Indian',    Validators.required],
      maritalStatus:        [stored.maritalStatus  ?? 'Single',    Validators.required],
      residentialStatus:    [stored.residentialStatus ?? 'Resident', Validators.required],
      email:                [stored.email,                [Validators.required, Validators.pattern(PatternConstants.EMAIL)]],
      applicantMobileNumber:[stored.applicantMobileNumber,[Validators.required, Validators.pattern(PatternConstants.MOBILE)]],
      presentAddress:       [stored.presentAddress,       Validators.required],
      permanentAddress:     [stored.permanentAddress,     Validators.required],
      pan:                  [stored.pan,                  [Validators.required, Validators.pattern(PatternConstants.PAN)]],
      modeOfOperation:      [stored.modeOfOperation],
      hasSikkimCertificate: [stored.hasSikkimCertificate, Validators.required],
      hasExciseLicense:     [stored.hasExciseLicense,     Validators.required],
      familyExciseLicense:  [stored.familyExciseLicense,  Validators.required],
      criminalConviction:   [stored.criminalConviction,   Validators.required]
    });

    this.f = this.applicantDetailsForm.controls;

    this.applicantDetailsForm.get('dob')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.validateAge());

    this.applicantDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateAllErrorMessages());
  }

  ngOnInit(): void {
    this.restoreDocuments();
    this.validateAge();
    this.autoFillFromProfiles();    // ✅ NEW unified auto-fill
  }

  ngOnDestroy(): void {
    this.clearAllDocumentUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────
  // ✅ NEW: Fetch user profile + licensee profile in parallel
  // ─────────────────────────────────────────────────────────────────
  private autoFillFromProfiles(): void {
    // Skip if session already has full data
    const sessionData = sessionStorage.getItem('applicantDetailsData');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        // Only skip if we have first name AND father name (licensee profile fields)
        if (parsed.firstName && parsed.fatherHusbandName) {
          console.log('📋 Applicant details already in session, skipping auto-fill');
          return;
        }
      } catch { /* parse failed, proceed with auto-fill */ }
    }

    console.log('🔍 Fetching profiles for applicant-details auto-fill...');

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
  // ✅ NEW: Fill form with data from BOTH profiles
  // ─────────────────────────────────────────────────────────────────
  private fillForm(user: any, licensee: any): void {
    const fillData: any = {};

    // ── From user profile ──────────────────────────────────────────
    if (user) {
      if (!this.applicantDetailsForm.get('firstName')?.value && (user.firstName || user.first_name)) {
        fillData.firstName = user.firstName || user.first_name;
      }
      if (!this.applicantDetailsForm.get('middleName')?.value && (user.middleName || user.middle_name)) {
        fillData.middleName = user.middleName || user.middle_name;
      }
      if (!this.applicantDetailsForm.get('lastName')?.value && (user.lastName || user.last_name)) {
        fillData.lastName = user.lastName || user.last_name;
      }
      if (!this.applicantDetailsForm.get('applicantMobileNumber')?.value && (user.phoneNumber || user.phone_number)) {
        fillData.applicantMobileNumber = user.phoneNumber || user.phone_number;
      }
      if (!this.applicantDetailsForm.get('email')?.value && user.email) {
        fillData.email = user.email;
      }
      if (!this.applicantDetailsForm.get('presentAddress')?.value && user.address) {
        fillData.presentAddress  = user.address;
        fillData.permanentAddress = user.address;   // pre-fill both; user can uncheck same-address
      }
    }

    // ── From licensee profile ──────────────────────────────────────
    if (licensee) {
      // Father's / Husband's name
      if (!this.applicantDetailsForm.get('fatherHusbandName')?.value && licensee.father_name) {
        fillData.fatherHusbandName = licensee.father_name;
        console.log('✅ fatherHusbandName ←', licensee.father_name);
      }

      // Date of birth (already a string like "1994-03-01")
      if (!this.applicantDetailsForm.get('dob')?.value && licensee.dob) {
        fillData.dob = new Date(licensee.dob);   // mat-datepicker needs a Date object
        console.log('✅ dob ←', licensee.dob);
      }

      // Gender: licensee stores 'M'/'F'/'O', form uses 'Male'/'Female'
      if (!this.applicantDetailsForm.get('gender')?.value && licensee.gender) {
        const mapped = GENDER_MAP[licensee.gender];
        if (mapped) {
          fillData.gender = mapped;
          console.log(`✅ gender ← "${licensee.gender}" → "${mapped}"`);
        }
      }

      // Nationality: licensee stores e.g. "Indian", form has "Indian"/"Foreign"
      if (!this.applicantDetailsForm.get('nationality')?.value && licensee.nationality) {
        const nat = licensee.nationality.trim();
        // map to dropdown option
        fillData.nationality = this.nationalities.includes(nat) ? nat : 'Indian';
        console.log('✅ nationality ←', fillData.nationality);
      }

      // Marital status: licensee stores 'SINGLE'/'MARRIED'/... form uses 'Single'/'Married'/...
      if (!this.applicantDetailsForm.get('maritalStatus')?.value && licensee.marital_status) {
        const mapped = MARITAL_MAP[licensee.marital_status];
        if (mapped && this.maritalStatuses.includes(mapped)) {
          fillData.maritalStatus = mapped;
          console.log(`✅ maritalStatus ← "${licensee.marital_status}" → "${mapped}"`);
        }
      }

      // Residential status: licensee stores 'RESIDENT'/'NON_RESIDENT'/'OCI'
      if (!this.applicantDetailsForm.get('residentialStatus')?.value && licensee.residential_status) {
        const mapped = RESIDENTIAL_MAP[licensee.residential_status];
        if (mapped && this.residentialStatuses.includes(mapped)) {
          fillData.residentialStatus = mapped;
          console.log(`✅ residentialStatus ← "${licensee.residential_status}" → "${mapped}"`);
        }
      }
    } else {
      console.warn('⚠️ No licensee profile found — father name, DOB, gender, etc. will not be auto-filled');
    }

    if (Object.keys(fillData).length === 0) {
      console.log('⚠️ No new data to fill in applicant details');
      return;
    }

    console.log('📝 Auto-filling applicant details:', fillData);

    this.applicantDetailsForm.patchValue(fillData, { emitEvent: true });

    // Mark filled fields dirty/touched so validation shows immediately
    Object.keys(fillData).forEach(key => {
      const ctrl = this.applicantDetailsForm.get(key);
      ctrl?.markAsDirty();
      ctrl?.markAsTouched();
      ctrl?.updateValueAndValidity();
    });

    this.cdr.detectChanges();

    setTimeout(() => {
      this.validateAge();      // re-run age check after DOB is filled
      this.cdr.detectChanges();
      console.log('✅ Applicant details auto-fill complete:', this.applicantDetailsForm.value);
    }, 0);
  }

  // ─────────────────────────────────────────────────────────────────
  // Session storage
  // ─────────────────────────────────────────────────────────────────
  private getFromSessionStorage(): any {
    const raw = sessionStorage.getItem('applicantDetailsData');
    return raw ? JSON.parse(raw) : {};
  }

  private saveToSessionStorage(): void {
    const raw = this.applicantDetailsForm.getRawValue();

    const parts = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean);
    raw.applicant_name        = parts.join(' ');
    raw.father_husband_name   = raw.fatherHusbandName;

    if (raw.applicantMobileNumber) {
      raw.mobile_number = String(raw.applicantMobileNumber).replace(/\D/g, '');
    }
    if (raw.dob) {
      const dobDate = new Date(raw.dob);
      raw.dob = dobDate.toISOString().split('T')[0];
    }
    if (raw.maritalStatus)     raw.marital_status     = raw.maritalStatus;
    if (raw.residentialStatus) raw.residential_status = raw.residentialStatus;

    raw.present_address   = raw.presentAddress;
    raw.permanent_address = raw.permanentAddress;

    if (raw.modeOfOperation)      raw.mode_of_operation    = raw.modeOfOperation;
    raw.has_sikkim_certificate = raw.hasSikkimCertificate;
    raw.has_excise_license     = raw.hasExciseLicense;
    raw.family_excise_license  = raw.familyExciseLicense;
    raw.criminal_conviction    = raw.criminalConviction;

    console.log('💾 Saving Applicant Details:', raw);
    sessionStorage.setItem('applicantDetailsData', JSON.stringify(raw));
  }

  // ─────────────────────────────────────────────────────────────────
  // Document helpers (unchanged)
  // ─────────────────────────────────────────────────────────────────
  private restoreDocuments(): void {
    this.documents.forEach(d => {
      if (d.name === 'passportPhoto') {
        const stored = this.licenseSrv.getPassPhoto();
        if (stored) { d.file = stored; d.fileUrl = URL.createObjectURL(stored); }
      } else {
        const stored = this.licenseSrv.getSiteDocument(d.name);
        if (stored) { d.file = stored; d.fileUrl = URL.createObjectURL(stored); }
      }
    });
  }

  private clearAllDocumentUrls(): void {
    this.documents.forEach(d => { if (d.fileUrl) URL.revokeObjectURL(d.fileUrl); d.fileUrl = ''; });
  }

  onDocumentSelect(ev: Event, docName: string): void {
    const input = ev.target as HTMLInputElement;
    const file  = input.files?.[0];
    const doc   = this.documents.find(d => d.name === docName);
    if (!file || !doc) return;

    if (file.size > 5 * 1024 * 1024) { alert('File size must be < 5 MB'); input.value = ''; return; }
    const allowed = doc.formats.split(',').map(f => f.trim());
    const ext     = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) { alert(`Allowed: ${doc.formats}`); input.value = ''; return; }

    doc.file    = file;
    doc.fileUrl = URL.createObjectURL(file);
    if (docName === 'passportPhoto') this.licenseSrv.setPassPhoto(file);
    else                              this.licenseSrv.setSiteDocument(docName, file);
    this.cdr.detectChanges();
  }

  viewDocument(doc: DocumentUpload): void { if (doc.fileUrl) window.open(doc.fileUrl, '_blank'); }

  areRequiredDocumentsUploaded(): boolean {
    return this.documents.filter(d => d.required).every(d => d.file !== null);
  }

  copyPresentToPermanent(checked: boolean): void {
    if (checked) {
      const present = this.applicantDetailsForm.get('presentAddress')?.value ?? '';
      this.applicantDetailsForm.patchValue({ permanentAddress: present });
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Validation helpers (unchanged)
  // ─────────────────────────────────────────────────────────────────
  private validateAge(): void {
    const dobCtrl = this.applicantDetailsForm.get('dob');
    if (!dobCtrl?.value) return;
    const dob   = new Date(dobCtrl.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age < 21) {
      dobCtrl.setErrors({ minAge: true });
      this.errorMessages.dob.set('Applicant must be at least 21 years old');
    } else {
      const { minAge, ...others } = dobCtrl.errors ?? {};
      dobCtrl.setErrors(Object.keys(others).length ? others : null);
      this.errorMessages.dob.set(dobCtrl.hasError('required') ? 'This field is required' : '');
    }
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const ctrl = this.applicantDetailsForm.get(field);
    if (!ctrl) return;
    if (ctrl.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (ctrl.hasError('pattern')) {
      const msg = field === 'pan'                  ? 'Invalid PAN format'        :
                  field === 'email'                ? 'Invalid email address'      :
                  field === 'applicantMobileNumber'? 'Invalid mobile number format': 'Invalid format';
      this.errorMessages[field].set(msg);
    } else if (ctrl.hasError('minAge')) {
      this.errorMessages[field].set('Applicant must be at least 21 years old');
    } else {
      this.errorMessages[field].set('');
    }
  }

  private updateAllErrorMessages(): void {
    (Object.keys(this.errorMessages) as (keyof typeof this.errorMessages)[])
      .forEach(f => this.updateErrorMessage(f));
  }

  getErrorMessage(field: keyof typeof this.errorMessages): string { return this.errorMessages[field](); }

  proceedToNext(): void {
    if (this.applicantDetailsForm.valid && this.areRequiredDocumentsUploaded()) {
      this.saveToSessionStorage();
      this.next.emit();
    } else {
      Object.keys(this.applicantDetailsForm.controls)
        .forEach(k => this.applicantDetailsForm.get(k)?.markAsTouched());
      if (!this.areRequiredDocumentsUploaded()) alert('Please upload all required documents before proceeding.');
    }
  }

  resetForm(): void {
    this.applicantDetailsForm.reset();
    this.documents.forEach(d => {
      d.file = null;
      if (d.fileUrl) URL.revokeObjectURL(d.fileUrl);
      d.fileUrl = '';
      if (d.name === 'passportPhoto') this.licenseSrv.clearPassPhoto();
      else                             this.licenseSrv.removeSiteDocument(d.name);
    });
    sessionStorage.removeItem('applicantDetailsData');
  }

  goBack(): void { this.back.emit(); }
}