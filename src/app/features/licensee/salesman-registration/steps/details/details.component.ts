import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../shared/utils/capitalize.util';
import { MaterialModule } from '../../../../../shared/material.module';
import { SalesmanBarman, SalesmanBarmanDocuments } from '../../../../../core/models/salesman-barman.model';
import { DatePipe } from '@angular/common';
import { SalesmanBarmanRegistrationService } from '../../../../../core/services/salesman-barman-registration.service';
import { AccountService } from '../../../../../core/services/account.service';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
  providers: [DatePipe]
})
export class DetailsComponent implements OnInit, OnDestroy {
  detailsForm: FormGroup;
  nationalities: string[] = ['Indian', 'Foreign'];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  errorMessages = {
    firstName: signal(''),
    middleName: signal(''),
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

  displayedColumns: string[] = ['serialNo', 'docType', 'upload', 'view'];
  private readonly genderMap: Record<string, string> = {
    m: 'Male',
    male: 'Male',
    f: 'Female',
    female: 'Female'
  };

  documents = [
    { key: 'passPhoto', name: 'Passport Size Photo', format: 'png, jpg, jpeg', accept: '.png,.jpg,.jpeg', required: true, file: null as File | null, fileUrl: '' },
    { key: 'aadhaarCard', name: 'Aadhaar card', format: 'pdf, png, jpg, jpeg', accept: '.pdf,.png,.jpg,.jpeg', required: true, file: null as File | null, fileUrl: '' },
    { key: 'residentialCertificate', name: 'Sikkim Subject Certificate/ Certificate of Identification / Residential Certificate', format: 'pdf, png, jpg, jpeg', accept: '.pdf,.png,.jpg,.jpeg', required: true, file: null as File | null, fileUrl: '' },
    { key: 'dateofBirthProof', name: 'Date of Birth proof', format: 'pdf, png, jpg, jpeg', accept: '.pdf,.png,.jpg,.jpeg', required: true, file: null as File | null, fileUrl: '' }
  ];

  constructor(
    private fb: FormBuilder,
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private accountService: AccountService,
    private masterService: MasterService,
    private datePipe: DatePipe,
    private cdr: ChangeDetectorRef
  ) {
    const storedValues = this.getFromSessionStorage();

    this.detailsForm = this.fb.group({
      firstName: new FormControl(storedValues.firstName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      middleName: new FormControl(storedValues.middleName, [Validators.pattern(PatternConstants.NAME)]),
      lastName: new FormControl(storedValues.lastName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      fatherHusbandName: new FormControl(storedValues.fatherHusbandName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      gender: new FormControl(storedValues.gender, [Validators.required]),
      dob: new FormControl(storedValues.dob, [Validators.required]),
      nationality: new FormControl(storedValues.nationality ?? 'Indian', [Validators.required]),
      address: new FormControl(storedValues.address, [Validators.required]),
      pan: new FormControl(storedValues.pan, [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      aadhaar: new FormControl(storedValues.aadhaar, [Validators.required, Validators.pattern(PatternConstants.AADHAAR_NUMBER)]),
      mobileNumber: new FormControl(storedValues.mobileNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      emailId: new FormControl(storedValues.emailId, [Validators.pattern(PatternConstants.EMAIL)]),
      sikkimSubject: new FormControl(storedValues.sikkimSubject, [Validators.required])
    });

    this.detailsForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    FormUtils.capitalize(this.detailsForm.get('pan')!, this.destroy$);
    this.loadSavedDocuments();

    this.autoFillFromProfiles();
  }

  ngOnDestroy() {
    this.clearFileUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ Auto-fill salesman/barman details from logged-in user profile
   */
  private autoFillFromProfiles(): void {
    forkJoin({
      userProfile: this.fetchUserProfile(),
      licenseeProfile: this.masterService.getMyLicenseeProfile().pipe(catchError(() => of(null)))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ userProfile, licenseeProfile }) => {
          this.fillFormWithProfiles(userProfile, licenseeProfile);
        },
        error: (error) => {
          console.error('❌ Failed to auto-fill salesman/barman details:', error);
        }
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
          console.error('❌ Failed to parse stored user profile:', error);
        }
      }
    }

    return cached
      ? of(cached)
      : this.accountService.identity(true).pipe(catchError(() => of(null)));
  }

  private fillFormWithProfiles(userProfile: any, licenseeProfile: any): void {
    const fillData: any = {};

    if (userProfile) {
      if (!this.detailsForm.get('firstName')?.value && (userProfile.firstName || userProfile.first_name)) {
        fillData.firstName = userProfile.firstName || userProfile.first_name;
      }

      if (!this.detailsForm.get('middleName')?.value && (userProfile.middleName || userProfile.middle_name)) {
        fillData.middleName = userProfile.middleName || userProfile.middle_name;
      }

      if (!this.detailsForm.get('lastName')?.value && (userProfile.lastName || userProfile.last_name)) {
        fillData.lastName = userProfile.lastName || userProfile.last_name;
      }

      if (!this.detailsForm.get('mobileNumber')?.value && (userProfile.phoneNumber || userProfile.phone_number)) {
        fillData.mobileNumber = userProfile.phoneNumber || userProfile.phone_number;
      }

      if (!this.detailsForm.get('emailId')?.value && userProfile.email) {
        fillData.emailId = userProfile.email;
      }

      if (!this.detailsForm.get('address')?.value && userProfile.address) {
        fillData.address = userProfile.address;
      }
    }

    if (licenseeProfile) {
      if (!this.detailsForm.get('fatherHusbandName')?.value && licenseeProfile.fatherName) {
        fillData.fatherHusbandName = licenseeProfile.fatherName;
      }

      if (!this.detailsForm.get('dob')?.value && licenseeProfile.dob) {
        fillData.dob = new Date(licenseeProfile.dob);
      }

      if (!this.detailsForm.get('gender')?.value) {
        const mappedGender = this.mapGender(licenseeProfile.genderDisplay || licenseeProfile.gender);
        if (mappedGender) {
          fillData.gender = mappedGender;
        }
      }

      if (!this.detailsForm.get('nationality')?.value && licenseeProfile.nationality) {
        fillData.nationality = this.mapNationality(licenseeProfile.nationality);
      }

      if (!this.detailsForm.get('pan')?.value && licenseeProfile.panNumber) {
        fillData.pan = String(licenseeProfile.panNumber).toUpperCase();
      }
    }

    if (!this.detailsForm.get('nationality')?.value && !fillData.nationality) {
      fillData.nationality = 'Indian';
    }

    if (Object.keys(fillData).length === 0) {
      return;
    }

    this.detailsForm.patchValue(fillData, { emitEvent: true });

    Object.keys(fillData).forEach((key) => {
      const control = this.detailsForm.get(key);
      control?.markAsDirty();
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });

    this.cdr.detectChanges();
  }

  private mapGender(value: unknown): string | null {
    const normalized = String(value || '').trim().toLowerCase();
    return this.genderMap[normalized] || null;
  }

  private mapNationality(value: unknown): string {
    const normalized = String(value || '').trim();
    return this.nationalities.includes(normalized) ? normalized : 'Indian';
  }

  get modeofOperation() {
    const storedData = sessionStorage.getItem('licenseDetails');
    return storedData ? JSON.parse(storedData).modeofOperation : null;
  }

  private getFromSessionStorage(): Partial<SalesmanBarman> {
    const storedData = sessionStorage.getItem('personalDetails');
    return storedData ? JSON.parse(storedData) as SalesmanBarman : {};
  }

  private saveToSessionStorage() {
    const formData: Partial<SalesmanBarman> = this.detailsForm.getRawValue();
    const rawDate = new Date(formData.dob as string);

    if (!isNaN(rawDate.getTime())) {
      formData.dob = this.datePipe.transform(rawDate, 'yyyy-MM-dd')!;
    }
    sessionStorage.setItem('personalDetails', JSON.stringify(formData));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.detailsForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else {
      this.errorMessages[field].set('');
    }
  }

  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  // Load previously uploaded documents from service
  private loadSavedDocuments() {
    const savedDocs = this.salesmanBarmanService.getSalesmanBarmanDocuments();

    this.documents.forEach(doc => {
      const savedFile = savedDocs[doc.key as keyof SalesmanBarmanDocuments];
      if (savedFile) {
        doc.file = savedFile;
        doc.fileUrl = URL.createObjectURL(savedFile);
      }
    });
  }

  onFileSelect(event: any, document: any) {
    const file = event.target.files[0];
    if (file) {
      // Clear old URL if exists
      if (document.fileUrl) {
        URL.revokeObjectURL(document.fileUrl);
      }

      // Update local document object
      document.file = file;
      document.fileUrl = URL.createObjectURL(file);

      // Get existing documents first, then add the new one
      const currentDocs = this.salesmanBarmanService.getSalesmanBarmanDocuments();

      // Create updated documents object with the new file
      const updatedDocs = {
        ...currentDocs,
        [document.key]: file
      };

      // Set all documents back to service
      this.salesmanBarmanService.setSalesmanBarmanDocuments(updatedDocs);
    }
  }

  viewFile(document: any) {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  }

  areDocumentsUploaded(): boolean {
    return this.documents.every(doc => !doc.required || !!doc.file);
  }

  clearFileUrls() {
    this.documents.forEach(doc => {
      if (doc.fileUrl) {
        URL.revokeObjectURL(doc.fileUrl);
        doc.fileUrl = '';
      }
    });
  }

  goBack() {
    this.back.emit();
  }

  resetForm() {
    this.detailsForm.reset();
    sessionStorage.removeItem('personalDetails');
    this.clearFileUrls();

    // Clear documents from service
    this.salesmanBarmanService.clearSalesmanBarmanDocuments();

    // Clear local document files
    this.documents.forEach(doc => {
      doc.file = null;
      doc.fileUrl = '';
    });

    this.autoFillFromProfiles();
  }

  proceedToNext() {
    if (this.detailsForm.valid && this.areDocumentsUploaded()) {
      const raw = this.detailsForm.getRawValue();
      raw.dob = this.datePipe.transform(raw.dob, 'yyyy-MM-dd');
      sessionStorage.setItem('personalDetails', JSON.stringify(raw));
      this.next.emit();
    } else {
      this.detailsForm.markAllAsTouched();
      if (!this.areDocumentsUploaded()) {
        alert('Please upload all required documents before proceeding.');
      }
    }
  }
}
