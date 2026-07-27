import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  signal
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { AccountService } from '../../../../../core/services/account.service';
import { MasterService } from '../../../../../core/services/master.service';

interface MemberDocumentUpload {
  key: string;
  name: string;
  accept: string;
  format: string;
  required: boolean;
  file: File | null;
  fileUrl: string;
}

interface MemberDetailsSessionData {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  fatherHusbandName?: string | null;
  father_husband_name?: string | null;
  gender?: string | null;
  dob?: string | Date | null;
  nationality?: string | null;
  address?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  mobileNumber?: string | null;
  member_mobile_number?: string | null;
  emailId?: string | null;
  member_email?: string | null;
  sikkimSubject?: boolean | null;
  sikkim_subject?: boolean | null;
}

interface MemberDetailsFormPatch {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  mobileNumber?: string;
  emailId?: string;
  address?: string;
  fatherHusbandName?: string;
  dob?: Date;
  gender?: string;
  pan?: string;
}

const GENDER_MAP: Record<string, string> = {
  M: 'Male',
  F: 'Female',
  O: 'Female'
};

@Component({
  selector: 'app-member-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './member-details.component.html',
  styleUrl: './member-details.component.scss',
})
export class MemberDetailsComponent implements OnInit, OnDestroy {
  memberDetailsForm: FormGroup;
  nationalities = ['Indian', 'Foreign'];

  documents: MemberDocumentUpload[] = [
    { key: 'member_pass_photo', name: 'Passport Size Photo', accept: '.png,.jpg,.jpeg', format: '.png, .jpg, .jpeg', required: true, file: null, fileUrl: '' },
    { key: 'member_aadhaar_card', name: 'Aadhaar Card', accept: '.pdf,.png,.jpg,.jpeg', format: '.pdf, .png, .jpg, .jpeg', required: true, file: null, fileUrl: '' },
    { key: 'member_residential_certificate', name: 'Sikkim Subject Certificate / Certificate of Identification / Residential Certificate', accept: '.pdf,.png,.jpg,.jpeg', format: '.pdf, .png, .jpg, .jpeg', required: true, file: null, fileUrl: '' },
    { key: 'member_dob_proof', name: 'Date of Birth Proof', accept: '.pdf,.png,.jpg,.jpeg', format: '.pdf, .png, .jpg, .jpeg', required: true, file: null, fileUrl: '' }
  ];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private readonly destroy$ = new Subject<void>();

  errorMessages = {
    firstName: signal(''),
    lastName: signal(''),
    fatherHusbandName: signal(''),
    gender: signal(''),
    dob: signal(''),
    nationality: signal(''),
    address: signal(''),
    pan: signal(''),
    aadhaar: signal(''),
    mobileNumber: signal(''),
    emailId: signal(''),
    sikkimSubject: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private licenseApplicationService: LicenseApplicationService,
    private accountService: AccountService,
    private masterService: MasterService,
    private cdr: ChangeDetectorRef
  ) {
    const storedValues = this.getFromSessionStorage();

    this.memberDetailsForm = this.fb.group({
      firstName: new FormControl(storedValues.firstName ?? '', [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      middleName: new FormControl(storedValues.middleName ?? '', [Validators.pattern(PatternConstants.NAME)]),
      lastName: new FormControl(storedValues.lastName ?? '', [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      fatherHusbandName: new FormControl(storedValues.fatherHusbandName ?? storedValues.father_husband_name ?? '', [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      gender: new FormControl(storedValues.gender ?? null, [Validators.required]),
      dob: new FormControl(storedValues.dob ?? '', [Validators.required]),
      nationality: new FormControl(storedValues.nationality ?? 'Indian', [Validators.required]),
      address: new FormControl(storedValues.address ?? '', [Validators.required]),
      pan: new FormControl(storedValues.pan ?? '', [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      aadhaar: new FormControl(storedValues.aadhaar ?? '', [Validators.required, Validators.pattern(PatternConstants.AADHAAR_NUMBER)]),
      mobileNumber: new FormControl(storedValues.mobileNumber ?? storedValues.member_mobile_number ?? '', [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      emailId: new FormControl(storedValues.emailId ?? storedValues.member_email ?? '', [Validators.pattern(PatternConstants.EMAIL)]),
      sikkimSubject: new FormControl(Boolean(storedValues.sikkimSubject ?? storedValues.sikkim_subject))
    });

    this.memberDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit(): void {
    this.restoreDocuments();
  }

  ngOnDestroy(): void {
    this.clearFileUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get memberRoleLabel(): string {
    try {
      let mode = '';
      const unitDetailsData = sessionStorage.getItem('unitDetailsData');
      if (unitDetailsData) {
        const parsed = JSON.parse(unitDetailsData);
        mode = String(parsed.mode_of_operation ?? parsed.modeOfOperation ?? '').trim();
      }
      if (!mode) {
        const applicantDetailsData = sessionStorage.getItem('applicantDetailsData');
        if (applicantDetailsData) {
          const parsed = JSON.parse(applicantDetailsData);
          mode = String(parsed.mode_of_operation ?? parsed.modeOfOperation ?? '').trim();
        }
      }
      return mode || 'Member';
    } catch {
      return 'Member';
    }
  }

  private autoFillFromProfiles(): void {
    forkJoin({
      userProfile: this.fetchUserProfile(),
      licenseeProfile: this.masterService.getMyLicenseeProfile().pipe(catchError(() => of(null)))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ userProfile, licenseeProfile }) => this.fillFormWithProfiles(userProfile, licenseeProfile),
        error: (error) => console.error('Failed to auto-fill member details:', error)
      });
  }

  private fetchUserProfile() {
    let cached = this.accountService.getUserProfileSync() || this.accountService.getCurrentUser();

    if (!cached) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          cached = JSON.parse(storedUser);
        } catch (error) {
          console.error('Failed to parse stored user profile:', error);
        }
      }
    }

    return cached
      ? of(cached)
      : this.accountService.identity(true).pipe(catchError(() => of(null)));
  }

  private fillFormWithProfiles(userProfile: any, licenseeProfile: any): void {
    const fillData: MemberDetailsFormPatch = {};

    if (userProfile) {
      if (!this.memberDetailsForm.get('firstName')?.value && (userProfile.firstName || userProfile.first_name)) {
        fillData.firstName = userProfile.firstName || userProfile.first_name;
      }
      if (!this.memberDetailsForm.get('middleName')?.value && (userProfile.middleName || userProfile.middle_name)) {
        fillData.middleName = userProfile.middleName || userProfile.middle_name;
      }
      if (!this.memberDetailsForm.get('lastName')?.value && (userProfile.lastName || userProfile.last_name)) {
        fillData.lastName = userProfile.lastName || userProfile.last_name;
      }
      if (!this.memberDetailsForm.get('mobileNumber')?.value && (userProfile.phoneNumber || userProfile.phone_number)) {
        fillData.mobileNumber = userProfile.phoneNumber || userProfile.phone_number;
      }
      if (!this.memberDetailsForm.get('emailId')?.value && userProfile.email) {
        fillData.emailId = userProfile.email;
      }
      if (!this.memberDetailsForm.get('address')?.value && userProfile.address) {
        fillData.address = userProfile.address;
      }
    }

    if (licenseeProfile) {
      if (!this.memberDetailsForm.get('fatherHusbandName')?.value && licenseeProfile.fatherName) {
        fillData.fatherHusbandName = licenseeProfile.fatherName;
      }
      if (!this.memberDetailsForm.get('dob')?.value && licenseeProfile.dob) {
        fillData.dob = new Date(licenseeProfile.dob);
      }
      if (!this.memberDetailsForm.get('gender')?.value && licenseeProfile.gender) {
        const mappedGender = GENDER_MAP[licenseeProfile.gender];
        if (mappedGender) {
          fillData.gender = mappedGender;
        }
      }
      if (!this.memberDetailsForm.get('pan')?.value && licenseeProfile.panNumber) {
        fillData.pan = String(licenseeProfile.panNumber).toUpperCase();
      }
    }

    if (Object.keys(fillData).length === 0) {
      return;
    }

    this.memberDetailsForm.patchValue(fillData, { emitEvent: true });

    Object.keys(fillData).forEach((key) => {
      const control = this.memberDetailsForm.get(key);
      control?.markAsDirty();
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });

    this.cdr.detectChanges();
  }

  private getFromSessionStorage(): MemberDetailsSessionData {
    const storedData = sessionStorage.getItem('memberDetailsData');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage(): void {
    const formData = this.memberDetailsForm.getRawValue();
    const memberName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ');

    const enrichedData = {
      ...formData,
      dob: formData.dob ? new Date(formData.dob).toISOString().split('T')[0] : null,
      member_name: memberName,
      father_husband_name: formData.fatherHusbandName,
      member_mobile_number: formData.mobileNumber ? String(formData.mobileNumber).replace(/\D/g, '') : null,
      member_email: formData.emailId || null,
      sikkim_subject: Boolean(formData.sikkimSubject)
    };

    sessionStorage.setItem('memberDetailsData', JSON.stringify(enrichedData));
  }

  private restoreDocuments(): void {
    this.documents.forEach((document) => {
      const storedDocument = this.licenseApplicationService.getSiteDocument(document.key);
      if (storedDocument) {
        document.file = storedDocument;
        document.fileUrl = URL.createObjectURL(storedDocument);
      }
    });
  }

  onFileSelect(event: Event, document: MemberDocumentUpload): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5 MB.');
      input.value = '';
      return;
    }

    const allowedExtensions = document.accept.split(',').map((value) => value.trim());
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);
    const fileType = (file.type || '').toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      alert(`Allowed formats: ${document.format}`);
      input.value = '';
      return;
    }

    if (fileType && !allowedMimeTypes.has(fileType)) {
      alert(`Allowed formats: ${document.format}`);
      input.value = '';
      return;
    }

    if (document.fileUrl) {
      URL.revokeObjectURL(document.fileUrl);
    }

    document.file = file;
    document.fileUrl = URL.createObjectURL(file);
    this.licenseApplicationService.setSiteDocument(document.key, file);
    this.cdr.detectChanges();
  }

  viewFile(document: MemberDocumentUpload): void {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  }

  areDocumentsUploaded(): boolean {
    return this.documents.every((document) => !document.required || !!document.file);
  }

  clearFileUrls(): void {
    this.documents.forEach((document) => {
      if (document.fileUrl) {
        URL.revokeObjectURL(document.fileUrl);
        document.fileUrl = '';
      }
    });
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const control = this.memberDetailsForm.get(field);
    if (control?.hasError('required') || control?.hasError('requiredTrue')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      this.errorMessages[field].set('Invalid format');
    } else {
      this.errorMessages[field].set('');
    }
  }

  private updateAllErrorMessages(): void {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  getErrorMessage(field: keyof typeof this.errorMessages): string {
    return this.errorMessages[field]();
  }

  proceedToNext(): void {
    if (this.memberDetailsForm.valid && this.areDocumentsUploaded()) {
      this.saveToSessionStorage();
      this.next.emit();
      return;
    }

    this.memberDetailsForm.markAllAsTouched();
    if (!this.areDocumentsUploaded()) {
      alert('Please upload all required documents before proceeding.');
    } else {
      alert('Please complete all required fields before proceeding.');
    }
  }

  resetForm(): void {
    this.memberDetailsForm.reset({ nationality: 'Indian', sikkimSubject: false });
    this.clearFileUrls();
    this.documents.forEach((document) => {
      document.file = null;
      document.fileUrl = '';
      this.licenseApplicationService.removeSiteDocument(document.key);
    });
    sessionStorage.removeItem('memberDetailsData');
  }

  goBack(): void {
    this.back.emit();
  }
}
