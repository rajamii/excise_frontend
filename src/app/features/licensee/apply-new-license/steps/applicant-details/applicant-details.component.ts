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
  FormGroup,
  Validators
} from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { AccountService } from '../../../../../core/services/account.service';
import { MasterService } from '../../../../../core/services/master.service';
import { LicenseCategory } from '../../../../../core/models/license-category.model';

interface DocumentUpload {
  name: string;
  label: string;
  file: File | null;
  fileUrl: string;
  required: boolean;
  formats: string;
}

interface ModeOfOperation {
  value: string;
  label: string;
}

interface DocumentTypeOption {
  value: string;
  label: string;
}

interface ApplicantDetailsSessionData {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  fatherHusbandName?: string | null;
  father_husband_name?: string | null;
  dob?: string | Date | null;
  gender?: string | null;
  nationality?: string | null;
  maritalStatus?: string | null;
  marital_status?: string | null;
  residentialStatus?: string | null;
  residential_status?: string | null;
  email?: string | null;
  applicantMobileNumber?: string | null;
  mobile_number?: string | null;
  presentAddress?: string | null;
  present_address?: string | null;
  permanentAddress?: string | null;
  permanent_address?: string | null;
  pan?: string | null;
  modeOfOperation?: string | null;
  mode_of_operation?: string | null;
  coiRcSsDocumentType?: string | null;
  coi_rc_ss?: string | null;
  hasSikkimCertificate?: string | null;
  has_sikkim_certificate?: string | null;
  hasExciseLicense?: string | null;
  has_excise_license?: string | null;
  existingLicenseCategoryId?: number | string | null;
  existing_license_category_id?: number | string | null;
  existingLicenseNo?: string | null;
  existing_license_no?: string | null;
  familyExciseLicense?: string | null;
  family_excise_license?: string | null;
  familyLicenseCategoryId?: number | string | null;
  family_license_category_id?: number | string | null;
  familyLicenseNo?: string | null;
  family_license_no?: string | null;
  criminalConviction?: string | null;
  criminal_conviction?: string | null;
}

interface ApplicantDetailsFormPatch {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  applicantMobileNumber?: string;
  email?: string;
  presentAddress?: string;
  permanentAddress?: string;
  fatherHusbandName?: string;
  dob?: Date;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  residentialStatus?: string;
  pan?: string;
}

const GENDER_MAP: Record<string, string> = {
  M: 'Male',
  F: 'Female',
  O: 'Female'
};

const MARITAL_MAP: Record<string, string> = {
  SINGLE: 'Single',
  MARRIED: 'Married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Married'
};

const RESIDENTIAL_MAP: Record<string, string> = {
  RESIDENT: 'Resident',
  NON_RESIDENT: 'Non-Resident',
  OCI: 'Non-Resident'
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

  nationalities = ['Indian', 'Foreign'];
  residentialStatuses = ['Resident', 'Non-Resident'];
  maritalStatuses = ['Single', 'Married', 'Divorced'];
  licenseCategories: LicenseCategory[] = [];
  modesOfOperation: ModeOfOperation[] = [
    { value: 'Self', label: 'Self' },
    { value: 'Salesman', label: 'Salesman' },
    { value: 'Barman', label: 'Barman' }
  ];
  readonly coiRcSsOptions: DocumentTypeOption[] = [
    { value: 'COI', label: 'Certificate of Identification (COI)' },
    { value: 'RC', label: 'Residential Certificate (RC)' },
    { value: 'SS', label: 'Sikkim Subject Certificate (SS)' }
  ];

  documents: DocumentUpload[] = [
    { name: 'passportPhoto', label: 'Passport Size Photo', file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png' },
    { name: 'pan_card', label: 'PAN Card', file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png,.pdf' },
    { name: 'sikkim_certificate', label: 'Certificate of Identification / Residential Certificate / Sikkim Subject Certificate', file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png,.pdf' },
    { name: 'dob_proof', label: 'Date of Birth Proof', file: null, fileUrl: '', required: true, formats: '.jpg,.jpeg,.png,.pdf' }
  ];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private readonly destroy$ = new Subject<void>();
  private readonly memberDocumentKeys = [
    'member_pass_photo',
    'member_aadhaar_card',
    'member_residential_certificate',
    'member_dob_proof'
  ];

  private errorMessages = {
    firstName: signal(''),
    lastName: signal(''),
    fatherHusbandName: signal(''),
    dob: signal(''),
    gender: signal(''),
    nationality: signal(''),
    maritalStatus: signal(''),
    residentialStatus: signal(''),
    presentAddress: signal(''),
    permanentAddress: signal(''),
    pan: signal(''),
    email: signal(''),
    applicantMobileNumber: signal(''),
    coiRcSsDocumentType: signal(''),
    hasSikkimCertificate: signal(''),
    hasExciseLicense: signal(''),
    existingLicenseCategoryId: signal(''),
    existingLicenseNo: signal(''),
    familyExciseLicense: signal(''),
    familyLicenseCategoryId: signal(''),
    familyLicenseNo: signal(''),
    criminalConviction: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private licenseSrv: LicenseApplicationService,
    private accountService: AccountService,
    private masterService: MasterService,
    private cdr: ChangeDetectorRef
  ) {
    const stored = this.getFromSessionStorage();

    this.applicantDetailsForm = this.fb.group({
      firstName: [stored.firstName ?? '', [Validators.required, Validators.pattern(PatternConstants.NAME)]],
      middleName: [stored.middleName ?? ''],
      lastName: [stored.lastName ?? '', [Validators.required, Validators.pattern(PatternConstants.NAME)]],
      fatherHusbandName: [stored.fatherHusbandName ?? stored.father_husband_name ?? '', [Validators.required, Validators.pattern(PatternConstants.NAME)]],
      dob: [stored.dob ?? '', [Validators.required]],
      gender: [stored.gender ?? null, Validators.required],
      nationality: [stored.nationality ?? 'Indian', Validators.required],
      maritalStatus: [stored.maritalStatus ?? stored.marital_status ?? 'Single', Validators.required],
      residentialStatus: [stored.residentialStatus ?? stored.residential_status ?? 'Resident', Validators.required],
      email: [stored.email ?? '', [Validators.required, Validators.pattern(PatternConstants.EMAIL)]],
      applicantMobileNumber: [stored.applicantMobileNumber ?? stored.mobile_number ?? '', [Validators.required, Validators.pattern(PatternConstants.MOBILE)]],
      presentAddress: [stored.presentAddress ?? stored.present_address ?? '', Validators.required],
      permanentAddress: [stored.permanentAddress ?? stored.permanent_address ?? '', Validators.required],
      pan: [stored.pan ?? '', [Validators.required, Validators.pattern(PatternConstants.PAN)]],
      modeOfOperation: [stored.modeOfOperation ?? stored.mode_of_operation ?? null],
      coiRcSsDocumentType: [stored.coiRcSsDocumentType ?? stored.coi_rc_ss ?? null],
      hasSikkimCertificate: [stored.hasSikkimCertificate ?? stored.has_sikkim_certificate ?? 'Yes', Validators.required],
      hasExciseLicense: [stored.hasExciseLicense ?? stored.has_excise_license ?? null, Validators.required],
      existingLicenseCategoryId: [stored.existingLicenseCategoryId ?? stored.existing_license_category_id ?? null],
      existingLicenseNo: [stored.existingLicenseNo ?? stored.existing_license_no ?? ''],
      familyExciseLicense: [stored.familyExciseLicense ?? stored.family_excise_license ?? null, Validators.required],
      familyLicenseCategoryId: [stored.familyLicenseCategoryId ?? stored.family_license_category_id ?? null],
      familyLicenseNo: [stored.familyLicenseNo ?? stored.family_license_no ?? ''],
      criminalConviction: [stored.criminalConviction ?? stored.criminal_conviction ?? null, Validators.required]
    });

    this.f = this.applicantDetailsForm.controls;
    this.setupConditionalValidation();

    this.applicantDetailsForm.get('dob')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.validateAge());

    this.applicantDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateAllErrorMessages());
  }

  ngOnInit(): void {
    this.loadLicenseCategories();
    this.restoreDocuments();
    this.syncApplicationTypeRules();
    this.validateAge();
    this.autoFillFromProfiles();
  }

  ngOnDestroy(): void {
    this.clearAllDocumentUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isIndividualApplication(): boolean {
    const typeName = this.getSelectedApplicationTypeName().toLowerCase();
    return typeName === 'individual' || (!typeName && Number(this.getSelectedApplicationTypeId()) === 1);
  }

  get isCompanyApplication(): boolean {
    const typeName = this.getSelectedApplicationTypeName().toLowerCase();
    return typeName === 'company' || (!typeName && Number(this.getSelectedApplicationTypeId()) === 2);
  }

  get requiresNationalityDocument(): boolean {
    const formValue = this.applicantDetailsForm.getRawValue();
    return this.isIndividualApplication || (this.isCompanyApplication && formValue.nationality === 'Indian');
  }

  get selectedCoiRcSsLabel(): string {
    const selectedValue = this.applicantDetailsForm.getRawValue().coiRcSsDocumentType;
    const matchedOption = this.coiRcSsOptions.find((option) => option.value === selectedValue);
    return matchedOption?.label ?? 'Certificate of Identification / Residential Certificate / Sikkim Subject Certificate';
  }

  getDocumentLabel(document: DocumentUpload): string {
    if (document.name === 'sikkim_certificate' && this.requiresNationalityDocument) {
      return this.selectedCoiRcSsLabel;
    }

    return document.label;
  }

  private autoFillFromProfiles(): void {
    const sessionData = sessionStorage.getItem('applicantDetailsData');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        if (parsed.firstName && parsed.fatherHusbandName) {
          console.log('Applicant details already in session, skipping auto-fill');
          return;
        }
      } catch {
        // Ignore parsing issues and continue with auto-fill.
      }
    }

    forkJoin({
      userProfile: this.fetchUserProfile(),
      licenseeProfile: this.masterService.getMyLicenseeProfile().pipe(catchError(() => of(null)))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ userProfile, licenseeProfile }) => this.fillForm(userProfile, licenseeProfile),
        error: (error) => console.error('Auto-fill error:', error)
      });
  }

  private fetchUserProfile() {
    let cached = this.accountService.getUserProfileSync();
    if (!cached) {
      try {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          cached = JSON.parse(stored);
        }
      } catch {
        // Ignore parsing issues.
      }
    }

    return cached
      ? of(cached)
      : this.accountService.identity(true).pipe(catchError(() => of(null)));
  }

  private fillForm(user: any, licensee: any): void {
    const fillData: ApplicantDetailsFormPatch = {};

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
        fillData.presentAddress = user.address;
        fillData.permanentAddress = user.address;
      }
    }

    if (licensee) {
      if (!this.applicantDetailsForm.get('fatherHusbandName')?.value && licensee.fatherName) {
        fillData.fatherHusbandName = licensee.fatherName;
      }
      if (!this.applicantDetailsForm.get('dob')?.value && licensee.dob) {
        fillData.dob = new Date(licensee.dob);
      }
      if (!this.applicantDetailsForm.get('gender')?.value && licensee.gender) {
        const mappedGender = GENDER_MAP[licensee.gender];
        if (mappedGender) {
          fillData.gender = mappedGender;
        }
      }
      if (!this.isIndividualApplication && !this.applicantDetailsForm.getRawValue().nationality && licensee.nationality) {
        const mappedNationality = String(licensee.nationality).trim();
        fillData.nationality = this.nationalities.includes(mappedNationality) ? mappedNationality : 'Indian';
      }
      if (!this.applicantDetailsForm.get('maritalStatus')?.value && licensee.maritalStatus) {
        const mappedMaritalStatus = MARITAL_MAP[licensee.maritalStatus];
        if (mappedMaritalStatus && this.maritalStatuses.includes(mappedMaritalStatus)) {
          fillData.maritalStatus = mappedMaritalStatus;
        }
      }
      if (!this.applicantDetailsForm.get('residentialStatus')?.value && licensee.residentialStatus) {
        const mappedResidentialStatus = RESIDENTIAL_MAP[licensee.residentialStatus];
        if (mappedResidentialStatus && this.residentialStatuses.includes(mappedResidentialStatus)) {
          fillData.residentialStatus = mappedResidentialStatus;
        }
      }
      if (!this.applicantDetailsForm.get('pan')?.value && licensee.panNumber) {
        fillData.pan = licensee.panNumber;
      }
    }

    if (Object.keys(fillData).length === 0) {
      return;
    }

    this.applicantDetailsForm.patchValue(fillData, { emitEvent: true });

    Object.keys(fillData).forEach((key) => {
      const control = this.applicantDetailsForm.get(key);
      control?.markAsDirty();
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });

    this.cdr.detectChanges();

    setTimeout(() => {
      this.validateAge();
      this.cdr.detectChanges();
    }, 0);
  }

  private getFromSessionStorage(): ApplicantDetailsSessionData {
    const raw = sessionStorage.getItem('applicantDetailsData');
    return raw ? JSON.parse(raw) : {};
  }

  private saveToSessionStorage(): void {
    const raw = this.applicantDetailsForm.getRawValue();

    const applicantNameParts = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean);
    raw.applicant_name = applicantNameParts.join(' ');
    raw.father_husband_name = raw.fatherHusbandName;

    if (raw.applicantMobileNumber) {
      raw.mobile_number = String(raw.applicantMobileNumber).replace(/\D/g, '');
    }
    if (raw.dob) {
      raw.dob = new Date(raw.dob).toISOString().split('T')[0];
    }
    if (raw.maritalStatus) {
      raw.marital_status = raw.maritalStatus;
    }
    if (raw.residentialStatus) {
      raw.residential_status = raw.residentialStatus;
    }

    raw.present_address = raw.presentAddress;
    raw.permanent_address = raw.permanentAddress;
    raw.mode_of_operation = raw.modeOfOperation || null;
    raw.coi_rc_ss = this.requiresNationalityDocument ? raw.coiRcSsDocumentType : null;
    raw.has_sikkim_certificate = raw.hasSikkimCertificate;
    raw.has_excise_license = raw.hasExciseLicense;
    raw.existing_license_category_id = raw.hasExciseLicense === 'Yes' ? raw.existingLicenseCategoryId : null;
    raw.existing_license_category_name = raw.hasExciseLicense === 'Yes'
      ? this.getLicenseCategoryName(raw.existingLicenseCategoryId)
      : null;
    raw.existing_license_no = raw.hasExciseLicense === 'Yes' ? raw.existingLicenseNo : null;
    raw.family_excise_license = raw.familyExciseLicense;
    raw.family_license_category_id = raw.familyExciseLicense === 'Yes' ? raw.familyLicenseCategoryId : null;
    raw.family_license_category_name = raw.familyExciseLicense === 'Yes'
      ? this.getLicenseCategoryName(raw.familyLicenseCategoryId)
      : null;
    raw.family_license_no = raw.familyExciseLicense === 'Yes' ? raw.familyLicenseNo : null;
    raw.criminal_conviction = raw.criminalConviction;

    sessionStorage.setItem('applicantDetailsData', JSON.stringify(raw));
  }

  private loadLicenseCategories(): void {
    this.masterService.getLicenseCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.licenseCategories = categories;
          this.cdr.detectChanges();
        },
        error: (error) => console.error('Failed to load license categories:', error)
      });
  }

  private setupConditionalValidation(): void {
    this.applicantDetailsForm.get('hasExciseLicense')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.toggleLicenseHistoryValidators(value, 'existing'));

    this.applicantDetailsForm.get('familyExciseLicense')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.toggleLicenseHistoryValidators(value, 'family'));

    this.applicantDetailsForm.get('nationality')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateNationalityDocumentRequirements());

    this.applicantDetailsForm.get('modeOfOperation')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value !== 'Salesman' && value !== 'Barman') {
          this.clearMemberDetailsData();
        }
      });

    this.toggleLicenseHistoryValidators(this.applicantDetailsForm.get('hasExciseLicense')?.value, 'existing');
    this.toggleLicenseHistoryValidators(this.applicantDetailsForm.get('familyExciseLicense')?.value, 'family');
    this.updateNationalityDocumentRequirements();
  }

  private syncApplicationTypeRules(): void {
    const nationalityControl = this.applicantDetailsForm.get('nationality');

    if (this.isIndividualApplication) {
      nationalityControl?.setValue('Indian', { emitEvent: false });
      nationalityControl?.disable({ emitEvent: false });
    } else {
      nationalityControl?.enable({ emitEvent: false });
      if (!nationalityControl?.value) {
        nationalityControl?.setValue('Indian', { emitEvent: false });
      }
    }

    this.updateNationalityDocumentRequirements();
  }

  private updateNationalityDocumentRequirements(): void {
    const documentTypeControl = this.applicantDetailsForm.get('coiRcSsDocumentType');
    const certificateDocument = this.documents.find((document) => document.name === 'sikkim_certificate');

    if (this.requiresNationalityDocument) {
      documentTypeControl?.setValidators([Validators.required]);
      if (certificateDocument) {
        certificateDocument.required = true;
      }
    } else {
      documentTypeControl?.clearValidators();
      documentTypeControl?.setValue(null, { emitEvent: false });
      if (certificateDocument) {
        certificateDocument.required = false;
      }
      this.clearDocumentSelection('sikkim_certificate');
    }

    documentTypeControl?.updateValueAndValidity({ emitEvent: false });
  }

  private toggleLicenseHistoryValidators(value: string | null, target: 'existing' | 'family'): void {
    const categoryControl = this.applicantDetailsForm.get(
      target === 'existing' ? 'existingLicenseCategoryId' : 'familyLicenseCategoryId'
    );
    const licenseNumberControl = this.applicantDetailsForm.get(
      target === 'existing' ? 'existingLicenseNo' : 'familyLicenseNo'
    );

    if (value === 'Yes') {
      categoryControl?.setValidators([Validators.required]);
      licenseNumberControl?.setValidators([Validators.required, Validators.maxLength(100)]);
    } else {
      categoryControl?.clearValidators();
      licenseNumberControl?.clearValidators();
      categoryControl?.setValue(null, { emitEvent: false });
      licenseNumberControl?.setValue('', { emitEvent: false });
    }

    categoryControl?.updateValueAndValidity({ emitEvent: false });
    licenseNumberControl?.updateValueAndValidity({ emitEvent: false });
  }

  private getLicenseCategoryName(categoryId: number | string | null): string | null {
    if (!categoryId) {
      return null;
    }

    const matchedCategory = this.licenseCategories.find((category) => Number(category.id) === Number(categoryId));
    return matchedCategory?.licenseCategory ?? null;
  }

  private clearMemberDetailsData(): void {
    sessionStorage.removeItem('memberDetailsData');
    this.memberDocumentKeys.forEach((documentKey) => this.licenseSrv.removeSiteDocument(documentKey));
  }

  private getSelectedApplicationTypeId(): number | null {
    try {
      const selectLicenseData = sessionStorage.getItem('selectLicenseData');
      if (!selectLicenseData) {
        return null;
      }

      const parsed = JSON.parse(selectLicenseData);
      return parsed.licenseType ?? parsed.license_type ?? null;
    } catch (error) {
      console.error('Failed to parse selected application type id:', error);
      return null;
    }
  }

  private getSelectedApplicationTypeName(): string {
    const selectedLicenseTypeId = this.getSelectedApplicationTypeId();

    try {
      const licenseTypes = JSON.parse(sessionStorage.getItem('licenseTypes') || '[]') as Array<{ id?: number; licenseType?: string }>;
      const matchedType = licenseTypes.find((licenseType) => Number(licenseType.id) === Number(selectedLicenseTypeId));
      return String(matchedType?.licenseType ?? '');
    } catch (error) {
      console.error('Failed to determine selected application type:', error);
      return '';
    }
  }

  private restoreDocuments(): void {
    this.documents.forEach((document) => {
      if (document.name === 'passportPhoto') {
        const storedPassPhoto = this.licenseSrv.getPassPhoto();
        if (storedPassPhoto) {
          document.file = storedPassPhoto;
          document.fileUrl = URL.createObjectURL(storedPassPhoto);
        }
        return;
      }

      const storedDocument = this.licenseSrv.getSiteDocument(document.name);
      if (storedDocument) {
        document.file = storedDocument;
        document.fileUrl = URL.createObjectURL(storedDocument);
      }
    });
  }

  private clearAllDocumentUrls(): void {
    this.documents.forEach((document) => {
      if (document.fileUrl) {
        URL.revokeObjectURL(document.fileUrl);
        document.fileUrl = '';
      }
    });
  }

  onDocumentSelect(event: Event, docName: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const document = this.documents.find((item) => item.name === docName);
    if (!file || !document) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5 MB.');
      input.value = '';
      return;
    }

    const allowedExtensions = document.formats.split(',').map((format) => format.trim());
    const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!allowedExtensions.includes(extension)) {
      alert(`Allowed formats: ${document.formats}`);
      input.value = '';
      return;
    }

    if (document.fileUrl) {
      URL.revokeObjectURL(document.fileUrl);
    }

    document.file = file;
    document.fileUrl = URL.createObjectURL(file);

    if (docName === 'passportPhoto') {
      this.licenseSrv.setPassPhoto(file);
    } else {
      this.licenseSrv.setSiteDocument(docName, file);
    }

    this.cdr.detectChanges();
  }

  private clearDocumentSelection(docName: string): void {
    const document = this.documents.find((item) => item.name === docName);
    if (!document) {
      return;
    }

    if (document.fileUrl) {
      URL.revokeObjectURL(document.fileUrl);
    }

    document.file = null;
    document.fileUrl = '';

    if (docName === 'passportPhoto') {
      this.licenseSrv.clearPassPhoto();
    } else {
      this.licenseSrv.removeSiteDocument(docName);
    }
  }

  viewDocument(document: DocumentUpload): void {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  }

  areRequiredDocumentsUploaded(): boolean {
    return this.documents.filter((document) => document.required).every((document) => document.file !== null);
  }

  copyPresentToPermanent(checked: boolean): void {
    if (checked) {
      const presentAddress = this.applicantDetailsForm.get('presentAddress')?.value ?? '';
      this.applicantDetailsForm.patchValue({ permanentAddress: presentAddress });
    }
  }

  private validateAge(): void {
    const dobControl = this.applicantDetailsForm.get('dob');
    if (!dobControl?.value) {
      return;
    }

    const dob = new Date(dobControl.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 21) {
      dobControl.setErrors({ minAge: true });
      this.errorMessages.dob.set('Applicant must be at least 21 years old');
      return;
    }

    const { minAge, ...otherErrors } = dobControl.errors ?? {};
    dobControl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
    this.errorMessages.dob.set(dobControl.hasError('required') ? 'This field is required' : '');
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const control = this.applicantDetailsForm.get(field);
    if (!control) {
      return;
    }

    if (control.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control.hasError('pattern')) {
      const message =
        field === 'pan'
          ? 'Invalid PAN format'
          : field === 'email'
            ? 'Invalid email address'
            : field === 'applicantMobileNumber'
              ? 'Invalid mobile number format'
              : 'Invalid format';
      this.errorMessages[field].set(message);
    } else if (control.hasError('maxlength')) {
      this.errorMessages[field].set('Maximum 100 characters allowed');
    } else if (control.hasError('minAge')) {
      this.errorMessages[field].set('Applicant must be at least 21 years old');
    } else {
      this.errorMessages[field].set('');
    }
  }

  private updateAllErrorMessages(): void {
    (Object.keys(this.errorMessages) as Array<keyof typeof this.errorMessages>)
      .forEach((field) => this.updateErrorMessage(field));
  }

  getErrorMessage(field: keyof typeof this.errorMessages): string {
    return this.errorMessages[field]();
  }

  proceedToNext(): void {
    if (this.applicantDetailsForm.valid && this.areRequiredDocumentsUploaded()) {
      this.saveToSessionStorage();
      this.next.emit();
      return;
    }

    Object.keys(this.applicantDetailsForm.controls)
      .forEach((key) => this.applicantDetailsForm.get(key)?.markAsTouched());

    if (!this.areRequiredDocumentsUploaded()) {
      alert('Please upload all required documents before proceeding.');
    }
  }

  resetForm(): void {
    this.applicantDetailsForm.reset({
      nationality: this.isIndividualApplication ? 'Indian' : null,
      hasSikkimCertificate: 'Yes'
    });

    this.documents.forEach((document) => {
      if (document.fileUrl) {
        URL.revokeObjectURL(document.fileUrl);
      }
      document.file = null;
      document.fileUrl = '';
      if (document.name === 'passportPhoto') {
        this.licenseSrv.clearPassPhoto();
      } else {
        this.licenseSrv.removeSiteDocument(document.name);
      }
    });

    this.clearMemberDetailsData();
    this.syncApplicationTypeRules();
    this.toggleLicenseHistoryValidators(this.applicantDetailsForm.get('hasExciseLicense')?.value, 'existing');
    this.toggleLicenseHistoryValidators(this.applicantDetailsForm.get('familyExciseLicense')?.value, 'family');
    sessionStorage.removeItem('applicantDetailsData');
  }

  goBack(): void {
    this.back.emit();
  }
}
