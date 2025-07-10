import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PatternConstants } from '../../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../../shared/utils/capitalize.util';
import { MaterialModule } from '../../../../../../shared/material.module';
import { SalesmanBarman, SalesmanBarmanDocuments } from '../../../../../../core/models/salesman-barman.model';
import { DatePipe } from '@angular/common';
import { SalesmanBarmanRegistrationService } from '../../../../../../core/services/salesman-barman-registration.service';

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
    { key: 'passPhoto', name: 'Passport Size Photo', format: 'png, jpg, jpeg', accept: '.png,.jpg,.jpeg', required: true, file: null, fileUrl: '' },
    { key: 'aadhaarCard', name: 'Aadhaar card', format: 'pdf', accept: '.pdf', required: true, file: null, fileUrl: '' },
    { key: 'residentialCertificate', name: 'Sikkim Subject Certificate/ Certificate of Identification / Residential Certificate', format: 'pdf', accept: '.pdf', required: true, file: null, fileUrl: '' },
    { key: 'dateofBirthProof', name: 'Date of Birth proof', format: 'pdf', accept: '.pdf', required: true, file: null, fileUrl: '' }
  ];

  constructor(
    private fb: FormBuilder,
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private datePipe: DatePipe
  ) {
    const storedValues = this.getFromSessionStorage();

    this.detailsForm = this.fb.group({
      firstName: new FormControl(storedValues.firstName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      middleName: new FormControl(storedValues.middleName, [Validators.pattern(PatternConstants.NAME)]),
      lastName: new FormControl(storedValues.lastName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      fatherHusbandName: new FormControl(storedValues.fatherHusbandName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      gender: new FormControl(storedValues.gender, [Validators.required]),
      dob: new FormControl(storedValues.dob, [Validators.required]),
      nationality: new FormControl(storedValues.nationality, [Validators.required]),
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
  }

  ngOnDestroy() {
    this.clearFileUrls();
    this.destroy$.next();
    this.destroy$.complete();
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

  onFileSelect(event: any, document: any) {
    const file = event.target.files[0];
    if (file) {
      document.file = file;
      document.fileUrl = URL.createObjectURL(file);

      // Update the service with the selected file
      this.salesmanBarmanService.setSalesmanBarmanDocuments({
        [document.key]: file
      });
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
  }

  proceedToNext() {
    if (this.detailsForm.valid && this.areDocumentsUploaded()) {
      this.next.emit();
    }
  }
}
