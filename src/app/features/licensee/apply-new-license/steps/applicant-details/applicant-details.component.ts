import {
  Component, EventEmitter, Output, OnInit, OnDestroy,
  ChangeDetectorRef, signal
} from '@angular/core';
import {
  FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { AccountService } from '../../../../../core/services/account.service';

interface DocumentUpload {
  name: string;
  label: string;
  file: File | null;
  fileUrl: string;
  required: boolean;
  formats: string;
}
interface ModeOfOperation { value: string; label: string; }

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

  // ---------- Dropdowns ----------
  nationalities = ['Indian', 'Foreign'];
  residentialStatuses = ['Resident', 'Non-Resident'];
  maritalStatuses = ['Single', 'Married', 'Divorced'];
  modesOfOperation: ModeOfOperation[] = [
    { value: 'Self', label: 'Self' },
    { value: 'Salesman', label: 'Salesman' },
    { value: 'Barman', label: 'Barman' }
  ];

  // ---------- Documents (matching backend field names) ----------
  documents: DocumentUpload[] = [
    { name: 'passportPhoto', label: 'Passport Size Photo', file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png' },
    { name: 'pan_card', label: 'PAN Card', file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png,.pdf' },
    { name: 'sikkim_certificate', label: 'Sikkim Subject Certificate / Certificate of Identification / Residential Certificate',
      file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png,.pdf' },
    { name: 'dob_proof', label: 'Date of Birth Proof', file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png,.pdf' },
    { name: 'noc_landlord', label: 'NOC from Landlord (if applicable)', file: null, fileUrl: '', required: false, formats: '.jpg,.jpeg,.png,.pdf' }
  ];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // ---------- Error messages (signal based) ----------
  private errorMessages = {
    firstName: signal(''), lastName: signal(''), fatherHusbandName: signal(''),
    dob: signal(''), gender: signal(''), nationality: signal(''), 
    maritalStatus: signal(''),
    residentialStatus: signal(''),
    presentAddress: signal(''), permanentAddress: signal(''), pan: signal(''),
    email: signal(''), 
    applicantMobileNumber: signal(''),
    hasSikkimCertificate: signal(''),
    hasExciseLicense: signal(''), familyExciseLicense: signal(''), criminalConviction: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private licenseSrv: LicenseApplicationService,
    private accountService: AccountService,
    private cdr: ChangeDetectorRef
  ) {
    const stored = this.getFromSessionStorage();

    this.applicantDetailsForm = this.fb.group({
      // Personal
      firstName: [stored.firstName, [Validators.required, Validators.pattern(PatternConstants.NAME)]],
      middleName: [stored.middleName],
      lastName: [stored.lastName, [Validators.required, Validators.pattern(PatternConstants.NAME)]],
      fatherHusbandName: [stored.fatherHusbandName, [Validators.required, Validators.pattern(PatternConstants.NAME)]],
      dob: [stored.dob, [Validators.required]],
      gender: [stored.gender, Validators.required],
      nationality: [stored.nationality ?? 'Indian', Validators.required],
      maritalStatus: [stored.maritalStatus ?? 'Single', Validators.required],
      residentialStatus: [stored.residentialStatus ?? 'Resident', Validators.required],
      email: [stored.email, [Validators.required, Validators.pattern(PatternConstants.EMAIL)]],
      
      // Mobile number (backend expects CharField with numeric validation)
      applicantMobileNumber: [stored.applicantMobileNumber, [
        Validators.required,
        Validators.pattern(PatternConstants.MOBILE)
      ]],

      // Address
      presentAddress: [stored.presentAddress, Validators.required],
      permanentAddress: [stored.permanentAddress, Validators.required],

      // ID
      pan: [stored.pan, [Validators.required, Validators.pattern(PatternConstants.PAN)]],

      // Mode
      modeOfOperation: [stored.modeOfOperation],

      // Radio questions (backend expects "Yes"/"No" strings)
      hasSikkimCertificate: [stored.hasSikkimCertificate, Validators.required],
      hasExciseLicense: [stored.hasExciseLicense, Validators.required],
      familyExciseLicense: [stored.familyExciseLicense, Validators.required],
      criminalConviction: [stored.criminalConviction, Validators.required]
    });

    this.f = this.applicantDetailsForm.controls;

    // ---- AGE VALIDATION (≥21) ----
    this.applicantDetailsForm.get('dob')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.validateAge());

    // ---- SAVE ON EVERY CHANGE ----
    this.applicantDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateAllErrorMessages();
      });
  }

  ngOnInit(): void {
    this.restoreDocuments();
    this.validateAge();
    this.autoFillFromUserProfile();
  }

  ngOnDestroy(): void {
    this.clearAllDocumentUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* --------------------------------------------------------------- */
  /* -------------------------- STORAGE ---------------------------- */
  /* --------------------------------------------------------------- */
  private getFromSessionStorage(): any {
    const raw = sessionStorage.getItem('applicantDetailsData');
    return raw ? JSON.parse(raw) : {};
  }

  private saveToSessionStorage(): void {
    const raw = this.applicantDetailsForm.getRawValue();

    // Build applicant_name (required by backend)
    const parts = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean);
    raw.applicant_name = parts.join(' ');

    // father_husband_name (backend field name)
    raw.father_husband_name = raw.fatherHusbandName;

    // Clean mobile number (CharField but numeric)
    if (raw.applicantMobileNumber) {
      raw.mobile_number = String(raw.applicantMobileNumber).replace(/\D/g, '');
    }

    // Email field
    if (raw.email) {
      raw.email = raw.email;
    }

    if (raw.dob) {
    const dobDate = new Date(raw.dob);
    raw.dob = dobDate.toISOString().split('T')[0];
  }

    // Marital status
    if (raw.maritalStatus) {
      raw.marital_status = raw.maritalStatus;
    }

    // Residential status
    if (raw.residentialStatus) {
      raw.residential_status = raw.residentialStatus;
    }

    // Present and permanent addresses
    raw.present_address = raw.presentAddress;
    raw.permanent_address = raw.permanentAddress;

    // Mode of operation
    if (raw.modeOfOperation) {
      raw.mode_of_operation = raw.modeOfOperation;
    }

    // Yes/No fields (backend ChoiceFields expect "Yes"/"No" strings)
    raw.has_sikkim_certificate = raw.hasSikkimCertificate;
    raw.has_excise_license = raw.hasExciseLicense;
    raw.family_excise_license = raw.familyExciseLicense;
    raw.criminal_conviction = raw.criminalConviction;

    console.log('Saving Applicant Details:', raw);
    sessionStorage.setItem('applicantDetailsData', JSON.stringify(raw));
  }

  private autoFillFromUserProfile(): void {
    // If everything important is already filled, do not override user-entered values.
    if (this.hasPrimaryApplicantFields()) {
      return;
    }

    let userProfile: any = this.accountService.getCurrentUser();

    if (!userProfile) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          userProfile = JSON.parse(storedUser);
        } catch (_e) {
          userProfile = null;
        }
      }
    }

    if (userProfile) {
      this.fillMissingFieldsFromProfile(userProfile);
      return;
    }

    // Last fallback: fetch current user profile from backend.
    this.accountService.identity(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (profile) => {
        if (profile) {
          this.fillMissingFieldsFromProfile(profile);
        }
      },
      error: (err) => {
        console.error('Failed to fetch current user profile for applicant auto-fill:', err);
      }
    });
  }

  private hasPrimaryApplicantFields(): boolean {
    const raw = this.applicantDetailsForm.getRawValue();
    return !!(
      raw.firstName &&
      raw.lastName &&
      raw.applicantMobileNumber &&
      raw.email &&
      raw.presentAddress
    );
  }

  private fillMissingFieldsFromProfile(profile: any): void {
    const raw = this.applicantDetailsForm.getRawValue();
    const patch: any = {};

    const firstName = profile?.firstName || profile?.first_name || '';
    const middleName = profile?.middleName || profile?.middle_name || '';
    const lastName = profile?.lastName || profile?.last_name || '';
    const phone = profile?.phoneNumber || profile?.phone_number || '';
    const email = profile?.email || '';
    const address = profile?.address || '';
    const pan = profile?.panNumber || profile?.pan_number || profile?.pan || '';

    if (!raw.firstName && firstName) patch.firstName = firstName;
    if (!raw.middleName && middleName) patch.middleName = middleName;
    if (!raw.lastName && lastName) patch.lastName = lastName;
    if (!raw.applicantMobileNumber && phone) patch.applicantMobileNumber = String(phone);
    if (!raw.email && email) patch.email = email;
    if (!raw.presentAddress && address) patch.presentAddress = address;
    if (!raw.permanentAddress && address) patch.permanentAddress = address;
    if (!raw.pan && pan) patch.pan = String(pan).toUpperCase();

    // Default values that help user proceed faster if blank.
    if (!raw.nationality) patch.nationality = 'Indian';
    if (!raw.maritalStatus) patch.maritalStatus = 'Single';
    if (!raw.residentialStatus) patch.residentialStatus = 'Resident';

    if (Object.keys(patch).length === 0) {
      return;
    }

    this.applicantDetailsForm.patchValue(patch, { emitEvent: true });
    this.updateAllErrorMessages();
    this.cdr.detectChanges();
  }

  /* --------------------------------------------------------------- */
  /* -------------------------- DOCUMENTS -------------------------- */
  /* --------------------------------------------------------------- */
  private restoreDocuments(): void {
    this.documents.forEach(d => {
      if (d.name === 'passportPhoto') {
        const stored = this.licenseSrv.getPassPhoto();
        if (stored) {
          d.file = stored;
          d.fileUrl = URL.createObjectURL(stored);
        }
      } else {
        const stored = this.licenseSrv.getSiteDocument(d.name);
        if (stored) {
          d.file = stored;
          d.fileUrl = URL.createObjectURL(stored);
        }
      }
    });
  }

  private clearAllDocumentUrls(): void {
    this.documents.forEach(d => {
      if (d.fileUrl) URL.revokeObjectURL(d.fileUrl);
      d.fileUrl = '';
    });
  }

  onDocumentSelect(ev: Event, docName: string): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    const doc = this.documents.find(d => d.name === docName);
    if (!file || !doc) return;

    // Size < 5 MB
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be < 5 MB');
      input.value = '';
      return;
    }

    const allowed = doc.formats.split(',').map(f => f.trim());
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      alert(`Allowed: ${doc.formats}`);
      input.value = '';
      return;
    }

    doc.file = file;
    doc.fileUrl = URL.createObjectURL(file);
    
    if (docName === 'passportPhoto') {
      this.licenseSrv.setPassPhoto(file);
    } else {
      this.licenseSrv.setSiteDocument(docName, file);
    }
    
    this.cdr.detectChanges();
  }

  viewDocument(doc: DocumentUpload): void {
    if (doc.fileUrl) window.open(doc.fileUrl, '_blank');
  }

  areRequiredDocumentsUploaded(): boolean {
    return this.documents.filter(d => d.required).every(d => d.file !== null);
  }

  getMissingRequiredDocuments(): string[] {
    return this.documents
      .filter(d => d.required && !d.file)
      .map(d => d.label);
  }

  /* --------------------------------------------------------------- */
  /* -------------------------- HELPERS ---------------------------- */
  /* --------------------------------------------------------------- */
  copyPresentToPermanent(checked: boolean): void {
    if (checked) {
      const present = this.applicantDetailsForm.get('presentAddress')?.value ?? '';
      this.applicantDetailsForm.patchValue({ permanentAddress: present });
    }
  }

  private validateAge(): void {
    const dobCtrl = this.applicantDetailsForm.get('dob');
    if (!dobCtrl?.value) return;

    const dob = new Date(dobCtrl.value);
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

  /* --------------------------------------------------------------- */
  /* -------------------------- VALIDATION ------------------------- */
  /* --------------------------------------------------------------- */
  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const ctrl = this.applicantDetailsForm.get(field);
    if (!ctrl) return;

    if (ctrl.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (ctrl.hasError('pattern')) {
      const msg = field === 'pan' ? 'Invalid PAN format' :
                  field === 'email' ? 'Invalid email address' :
                  field === 'applicantMobileNumber' ? 'Invalid mobile number format' : 'Invalid format';
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

  getErrorMessage(field: keyof typeof this.errorMessages): string {
    return this.errorMessages[field]();
  }

  /* --------------------------------------------------------------- */
  /* -------------------------- NAVIGATION ------------------------- */
  /* --------------------------------------------------------------- */
  proceedToNext(): void {
    if (this.applicantDetailsForm.valid && this.areRequiredDocumentsUploaded()) {
      this.saveToSessionStorage();
      this.next.emit();
    } else {
      Object.keys(this.applicantDetailsForm.controls)
        .forEach(k => this.applicantDetailsForm.get(k)?.markAsTouched());

      if (!this.areRequiredDocumentsUploaded()) {
        const missingDocs = this.getMissingRequiredDocuments();
        const docMsg = missingDocs.length
          ? `\nMissing documents:\n- ${missingDocs.join('\n- ')}`
          : '';
        alert(`Please upload all required documents before proceeding.${docMsg}`);
      }
    }
  }

  resetForm(): void {
    this.applicantDetailsForm.reset();
    this.documents.forEach(d => {
      d.file = null;
      if (d.fileUrl) URL.revokeObjectURL(d.fileUrl);
      d.fileUrl = '';
      
      if (d.name === 'passportPhoto') {
        this.licenseSrv.clearPassPhoto();
      } else {
        this.licenseSrv.removeSiteDocument(d.name);
      }
    });
    sessionStorage.removeItem('applicantDetailsData');
  }

  goBack(): void {
    this.back.emit();
  }
}
