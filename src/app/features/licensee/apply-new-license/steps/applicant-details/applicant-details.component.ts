import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../shared/utils/capitalize.util';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';

@Component({
  selector: 'app-applicant-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './applicant-details.component.html',
  styleUrl: './applicant-details.component.scss',
})
export class ApplicantDetailsComponent implements OnInit, OnDestroy {
  applicantDetailsForm: FormGroup;

  passPhoto = {
    file: null as File | null,
    fileUrl: ''
  };

  // Static dropdown values
  statuses: string[] = ['Single', 'Married', 'Divorced'];
  nationalities: string[] = ['Indian', 'Foreign'];
  
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();
  
  private destroy$ = new Subject<void>();
  
  errorMessages = {
    status: signal(''),
    applicantName: signal(''),
    fatherHusbandName: signal(''),
    nationality: signal(''),
    gender: signal(''),
    pan: signal(''),
    applicantMobileNumber: signal(''),
    applicantEmail: signal(''),
    photo: signal('')
  };

  constructor(
    private fb: FormBuilder, 
    private licenseApplicationService: LicenseApplicationService,
    private cdr: ChangeDetectorRef
  ){
    const storedValues = this.getFromSessionStorage();

    this.applicantDetailsForm = this.fb.group({
      status: new FormControl(storedValues.status, [Validators.required]),
      applicantName: new FormControl(storedValues.applicantName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      fatherHusbandName: new FormControl(storedValues.fatherHusbandName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      nationality: new FormControl(storedValues.nationality, [Validators.required]),
      gender: new FormControl(storedValues.gender, [Validators.required]),
      pan: new FormControl(storedValues.pan, [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      applicantMobileNumber: new FormControl(storedValues.applicantMobileNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      applicantEmail: new FormControl(storedValues.applicantEmail, [Validators.required, Validators.pattern(PatternConstants.EMAIL)]),
    });

    this.applicantDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {
    FormUtils.capitalize(this.applicantDetailsForm.get('pan')!, this.destroy$);

    const storedPhoto = this.licenseApplicationService.getPassPhoto();
    if (storedPhoto) {
      this.passPhoto.file = storedPhoto;
      this.passPhoto.fileUrl = URL.createObjectURL(storedPhoto);
    }
  }

  ngOnDestroy() {
    this.clearPhotoUrl();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('applicantDetailsData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
  }

  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.applicantDetailsForm.getRawValue(); 
    sessionStorage.setItem('applicantDetailsData', JSON.stringify(formData));
  }

  onPhotoSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.passPhoto.file = file;
      this.passPhoto.fileUrl = URL.createObjectURL(file);
      this.cdr.detectChanges();
      this.licenseApplicationService.setPassPhoto(file);
    }
  }

  viewPhoto() {
    if (this.passPhoto.fileUrl) {
      window.open(this.passPhoto.fileUrl, '_blank');
    }
  }

  isPhotoUploaded(): boolean {
    return !!this.passPhoto.file;
  }

  clearPhotoUrl() {
    if (this.passPhoto.fileUrl) {
      URL.revokeObjectURL(this.passPhoto.fileUrl);
      this.passPhoto.fileUrl = '';
    }
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.applicantDetailsForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      this.errorMessages[field].set('Invalid format');
    } else if (control?.hasError('email')) {
      this.errorMessages[field].set('Not a valid email');
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

  proceedToNext() {
    if (this.applicantDetailsForm.valid && this.isPhotoUploaded()) {
      this.next.emit();
    }
  }

  resetForm() {
    this.applicantDetailsForm.reset();
    this.passPhoto.file = null;
    this.clearPhotoUrl();
    this.licenseApplicationService.setPassPhoto(null);
    sessionStorage.removeItem('applicantDetailsData');
  }

  goBack() {
    this.back.emit();
  }
}