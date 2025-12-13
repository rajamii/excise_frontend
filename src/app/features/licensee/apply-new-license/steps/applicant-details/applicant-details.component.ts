import {
  Component, EventEmitter, Output, OnInit, OnDestroy,
  ChangeDetectorRef, signal
} from '@angular/core';
import {
  FormBuilder, FormGroup, Validators, AbstractControl
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';

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
  f!: any;                     // shortcut for form controls

  // ---------- Dropdowns ----------
  nationalities = ['Indian', 'Foreign'];
  residentialStatuses = ['Resident', 'Non-Resident'];
  modesOfOperation: ModeOfOperation[] = [
    { value: 'Self', label: 'Self' },
    { value: 'Salesman', label: 'Salesman' },
    { value: 'Barman', label: 'Barman' }
  ];

  // ---------- Documents (same style as site-details) ----------
  documents: DocumentUpload[] = [
    { name: 'passportPhoto', label: 'Passport Size Photo', file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png' },
    { name: 'panCard',   label: 'Pan card',      file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png,.pdf' },
    { name: 'sikkimCertificate', label: 'Sikkim Subject Certificate / Certificate of Identification / Residential Certificate',
      file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png,.pdf' },
    {name: 'dobProof', label: 'Date of Birth Proof', file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png,.pdf' }
  ];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // ---------- Error messages (signal based) ----------
  private errorMessages = {
    firstName: signal(''), lastName: signal(''), fatherHusbandName: signal(''),
    dob: signal(''), gender: signal(''), nationality: signal(''), residentialStatus: signal(''),
    presentAddress: signal(''), permanentAddress: signal(''), pan: signal(''),
    aadhaarNo: signal(''), email: signal(''), hasSikkimCertificate: signal(''),
    hasExciseLicense: signal(''), familyExciseLicense: signal(''), criminalConviction: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private licenseSrv: LicenseApplicationService,
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
      residentialStatus: [stored.residentialStatus ?? 'Resident', Validators.required],
      email: [stored.email, [Validators.pattern(PatternConstants.EMAIL)]],

      // Address
      presentAddress: [stored.presentAddress, Validators.required],
      permanentAddress: [stored.permanentAddress, Validators.required],

      // Occupation
      pastOccupation: [stored.pastOccupation],
      presentOccupation: [stored.presentOccupation],

      // ID
      // aadhaarNo: [stored.aadhaarNo, [Validators.pattern(PatternConstants.AADHAAR)]],
      pan: [stored.pan, [Validators.required, Validators.pattern(PatternConstants.PAN)]],

      // Mode
      modeOfOperation: [stored.modeOfOperation],

      // Radio questions
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
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  /* --------------------------------------------------------------- */
  /* -------------------------- LIFECYCLE -------------------------- */
  /* --------------------------------------------------------------- */
  ngOnInit(): void {
    this.restoreDocuments();
    this.validateAge();               // initial check
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

    // Build the single applicantName required by the backend
    const parts = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean);
    raw.applicantName = parts.join(' ');

    sessionStorage.setItem('applicantDetailsData', JSON.stringify(raw));
  }

  /* --------------------------------------------------------------- */
  /* -------------------------- DOCUMENTS -------------------------- */
  /* --------------------------------------------------------------- */
  private restoreDocuments(): void {
    this.documents.forEach(d => {
      const stored = this.licenseSrv.getSiteDocument(d.name);
      if (stored) {
        d.file = stored;
        d.fileUrl = URL.createObjectURL(stored);
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

    // size < 5 MB
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
    this.licenseSrv.setSiteDocument(docName, file);
    this.cdr.detectChanges();
  }

  viewDocument(doc: DocumentUpload): void {
    if (doc.fileUrl) window.open(doc.fileUrl, '_blank');
  }

  areRequiredDocumentsUploaded(): boolean {
    return this.documents.filter(d => d.required).every(d => d.file !== null);
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
                  field === 'aadhaarNo' ? 'Invalid Aadhaar format' :
                  field === 'email' ? 'Invalid email address' : 'Invalid format';
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
      this.next.emit();
    } else {
      Object.keys(this.applicantDetailsForm.controls)
        .forEach(k => this.applicantDetailsForm.get(k)?.markAsTouched());

      if (!this.areRequiredDocumentsUploaded()) {
        alert('Please upload all required documents before proceeding.');
      }
    }
  }

  resetForm(): void {
    this.applicantDetailsForm.reset();
    this.documents.forEach(d => {
      d.file = null;
      if (d.fileUrl) URL.revokeObjectURL(d.fileUrl);
      d.fileUrl = '';
      this.licenseSrv.removeSiteDocument(d.name);
    });
    sessionStorage.removeItem('applicantDetailsData');
  }

  goBack(): void {
    this.back.emit();
  }
}