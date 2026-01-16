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

  nationalities = ['Indian', 'Foreign'];
  residentialStatuses = ['Resident', 'Non-Resident'];
  maritalStatuses = ['Single', 'Married', 'Divorced'];
  modesOfOperation: ModeOfOperation[] = [
    { value: 'Self', label: 'Self' },
    { value: 'Salesman', label: 'Salesman' },
    { value: 'Barman', label: 'Barman' }
  ];

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
      applicantMobileNumber: [stored.applicantMobileNumber, [
        Validators.required,
        Validators.pattern(PatternConstants.MOBILE)
      ]],
      presentAddress: [stored.presentAddress, Validators.required],
      permanentAddress: [stored.permanentAddress, Validators.required],
      pan: [stored.pan, [Validators.required, Validators.pattern(PatternConstants.PAN)]],
      modeOfOperation: [stored.modeOfOperation],
      hasSikkimCertificate: [stored.hasSikkimCertificate, Validators.required],
      hasExciseLicense: [stored.hasExciseLicense, Validators.required],
      familyExciseLicense: [stored.familyExciseLicense, Validators.required],
      criminalConviction: [stored.criminalConviction, Validators.required]
    });

    this.f = this.applicantDetailsForm.controls;

    this.applicantDetailsForm.get('dob')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.validateAge());

    this.applicantDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateAllErrorMessages();
      });
  }

  ngOnInit(): void {
    this.restoreDocuments();
    this.validateAge();
    
    // ✅ AUTO-FILL from user profile
    this.autoFillFromUserProfile();
  }

  ngOnDestroy(): void {
    this.clearAllDocumentUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ Auto-fill applicant details from logged-in user profile
   */
  private autoFillFromUserProfile(): void {
    // Check if form already has data from session storage
    const sessionData = sessionStorage.getItem('applicantDetailsData');
    if (sessionData) {
      console.log('📋 Applicant details already in session, skipping auto-fill');
      return;
    }

    // Try to get user profile from memory first (synchronous)
    let userProfile = this.accountService.getUserProfileSync();
    
    if (!userProfile) {
      // Try to get from localStorage as backup
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          userProfile = JSON.parse(storedUser);
          console.log('✅ User profile loaded from localStorage');
        } catch (e) {
          console.error('❌ Failed to parse stored user profile:', e);
        }
      }
    }

    if (userProfile) {
      console.log('✅ Auto-filling applicant details with profile:', userProfile);
      this.fillFormWithProfile(userProfile);
    } else {
      // Fetch from backend as last resort
      console.log('⚠️ No user profile in memory or localStorage, fetching from backend...');
      this.accountService.identity(true).subscribe({
        next: (profile) => {
          if (profile) {
            console.log('✅ User profile fetched from backend');
            this.fillFormWithProfile(profile);
          }
        },
        error: (err) => {
          console.error('❌ Failed to fetch user profile:', err);
        }
      });
    }
  }

  /**
   * Fill form with user profile data
   */
  private fillFormWithProfile(profile: any): void {
    console.log('🔍 Filling form with profile data:', profile);
    
    // Prepare the data to fill
    const fillData: any = {};

    // Map firstName (handle both camelCase and snake_case)
    if (profile.firstName || profile.first_name) {
      fillData.firstName = profile.firstName || profile.first_name;
    }

    // Map middleName
    if (profile.middleName || profile.middle_name) {
      fillData.middleName = profile.middleName || profile.middle_name;
    }

    // Map lastName
    if (profile.lastName || profile.last_name) {
      fillData.lastName = profile.lastName || profile.last_name;
    }

    // Map phone number
    if (profile.phoneNumber || profile.phone_number) {
      fillData.applicantMobileNumber = profile.phoneNumber || profile.phone_number;
    }

    // Map email
    if (profile.email) {
      fillData.email = profile.email;
    }

    // Map address
    if (profile.address) {
      fillData.presentAddress = profile.address;
    }

    // Default nationality to Indian
    fillData.nationality = 'Indian';

    console.log('📝 Data to be filled:', fillData);

    // Patch the form with the data
    this.applicantDetailsForm.patchValue(fillData, { emitEvent: true });

    console.log('✅ Applicant details auto-filled from user profile');
    
    // Trigger change detection
    this.cdr.detectChanges();
  }

  private getFromSessionStorage(): any {
    const raw = sessionStorage.getItem('applicantDetailsData');
    return raw ? JSON.parse(raw) : {};
  }

  private saveToSessionStorage(): void {
    const raw = this.applicantDetailsForm.getRawValue();

    const parts = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean);
    raw.applicant_name = parts.join(' ');
    raw.father_husband_name = raw.fatherHusbandName;

    if (raw.applicantMobileNumber) {
      raw.mobile_number = String(raw.applicantMobileNumber).replace(/\D/g, '');
    }

    if (raw.email) {
      raw.email = raw.email;
    }

    if (raw.dob) {
      const dobDate = new Date(raw.dob);
      raw.dob = dobDate.toISOString().split('T')[0];
    }

    if (raw.maritalStatus) {
      raw.marital_status = raw.maritalStatus;
    }

    if (raw.residentialStatus) {
      raw.residential_status = raw.residentialStatus;
    }

    raw.present_address = raw.presentAddress;
    raw.permanent_address = raw.permanentAddress;

    if (raw.modeOfOperation) {
      raw.mode_of_operation = raw.modeOfOperation;
    }

    raw.has_sikkim_certificate = raw.hasSikkimCertificate;
    raw.has_excise_license = raw.hasExciseLicense;
    raw.family_excise_license = raw.familyExciseLicense;
    raw.criminal_conviction = raw.criminalConviction;

    console.log('💾 Saving Applicant Details:', raw);
    sessionStorage.setItem('applicantDetailsData', JSON.stringify(raw));
  }

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

  proceedToNext(): void {
    if (this.applicantDetailsForm.valid && this.areRequiredDocumentsUploaded()) {
      this.saveToSessionStorage();
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