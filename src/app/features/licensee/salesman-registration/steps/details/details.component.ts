import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../shared/utils/capitalize.util';
import { MaterialModule } from '../../../../../shared/material.module';
import { SalesmanBarman, SalesmanBarmanDocuments } from '../../../../../core/models/salesman-barman.model';
import { DatePipe } from '@angular/common';
import { SalesmanBarmanRegistrationService } from '../../../../../core/services/salesman-barman-registration.service';
import { AccountService } from '../../../../../core/services/account.service';

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
  documents = [
    { key: 'passPhoto', name: 'Passport Size Photo', format: 'png, jpg, jpeg', accept: '.png,.jpg,.jpeg', required: true, file: null as File | null, fileUrl: '' },
    { key: 'aadhaarCard', name: 'Aadhaar card', format: 'pdf', accept: '.pdf', required: true, file: null as File | null, fileUrl: '' },
    { key: 'residentialCertificate', name: 'Sikkim Subject Certificate/ Certificate of Identification / Residential Certificate', format: 'pdf', accept: '.pdf', required: true, file: null as File | null, fileUrl: '' },
    { key: 'dateofBirthProof', name: 'Date of Birth proof', format: 'pdf', accept: '.pdf', required: true, file: null as File | null, fileUrl: '' }
  ];

  constructor(
    private fb: FormBuilder,
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private accountService: AccountService,
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
    
    // ✅ AUTO-FILL from user profile
    this.autoFillFromUserProfile();
  }

  ngOnDestroy() {
    this.clearFileUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ Auto-fill salesman/barman details from logged-in user profile
   */
  private autoFillFromUserProfile(): void {
    // Check if form already has data from session storage
    const sessionData = sessionStorage.getItem('personalDetails');
    if (sessionData) {
      console.log('📋 Salesman/Barman details already in session, skipping auto-fill');
      return;
    }

    // Try to get user profile from memory first
    let userProfile = this.accountService.getUserProfileSync();
    
    if (!userProfile) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          userProfile = JSON.parse(storedUser);
          console.log('✅ User profile loaded from localStorage for salesman/barman');
        } catch (e) {
          console.error('❌ Failed to parse stored user profile:', e);
          return;
        }
      }
    }

    if (userProfile) {
      console.log('✅ Auto-filling salesman/barman details with profile:', userProfile);
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
    console.log('🔍 Filling salesman/barman details form with profile data:', profile);
    
    const fillData: any = {};

    // Map firstName
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
      fillData.mobileNumber = profile.phoneNumber || profile.phone_number;
    }

    // Map email
    if (profile.email) {
      fillData.emailId = profile.email;
    }

    // Map address
    if (profile.address) {
      fillData.address = profile.address;
    }

    // Default nationality to Indian
    fillData.nationality = 'Indian';

    console.log('📝 Salesman/Barman details data to be filled:', fillData);

    // Patch the form with the data
    this.detailsForm.patchValue(fillData, { emitEvent: true });

    console.log('✅ Salesman/Barman details auto-filled from user profile');
    
    // Trigger change detection
    this.cdr.detectChanges();
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