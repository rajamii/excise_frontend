import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../shared/utils/capitalize.util';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-unit-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './unit-details.component.html',
  styleUrl: './unit-details.component.scss',
  providers: [DatePipe]
})
export class UnitDetailsComponent implements OnInit, OnDestroy {
  
  // Reactive form for unit/company details
  unitDetailsForm: FormGroup;

  // Emit events to go to the next or previous step in the stepper
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  // Used to unsubscribe from observables on destroy
  private destroy$ = new Subject<void>();

  // Signal-based error message store for each form field
  errorMessages = {
    companyName: signal(''),
    companyAddress: signal(''),
    companyPan: signal(''),
    companyCin: signal(''),
    incorporationDate: signal(''),
    companyPhoneNumber: signal(''),
    companyEmail: signal(''),
  };

  constructor(private fb: FormBuilder, private datePipe: DatePipe) {
    // Retrieve session-stored form data if available
    const storedValues = this.getFromSessionStorage();
    
    // Initialize the form with validation and pre-filled session values
    this.unitDetailsForm = this.fb.group({
      companyName: new FormControl(storedValues.companyName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      companyAddress: new FormControl(storedValues.companyAddress, [Validators.required]),
      companyPan: new FormControl(storedValues.companyPan, [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      companyCin: new FormControl(storedValues.companyCin, [Validators.required, Validators.pattern(PatternConstants.CIN)]),
      incorporationDate: new FormControl(storedValues.incorporationDate ?? null, [Validators.required]),
      companyPhoneNumber: new FormControl(storedValues.companyPhoneNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      companyEmail: new FormControl(storedValues.companyEmail, [Validators.required, Validators.pattern(PatternConstants.EMAIL)])
    });

    // Save to session storage and update error messages on form change
    this.unitDetailsForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  // Lifecycle hook to perform operations after component loads
  ngOnInit() {
    // Automatically capitalize PAN field value as user types
    FormUtils.capitalize(this.unitDetailsForm.get('companyPan')!, this.destroy$);
    FormUtils.capitalize(this.unitDetailsForm.get('companyCin')!, this.destroy$);
  }

  // Lifecycle hook to clean up subscriptions
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Retrieves stored form values from sessionStorage
  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('unitDetailsData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
  }

  // Stores current form data into sessionStorage
  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.unitDetailsForm.getRawValue(); 
    
    if (formData.incorporationDate) {
      const date = new Date(formData.incorporationDate as string);
      formData.incorporationDate = !isNaN(date.getTime())
        ? this.datePipe.transform(date, 'yyyy-MM-dd') ?? undefined
        : undefined;
    }

    sessionStorage.setItem('unitDetailsData', JSON.stringify(formData));
  }

  // Sets an error message for a specific field based on its validation state
  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.unitDetailsForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      this.errorMessages[field].set('Invalid format');
    } else {
      this.errorMessages[field].set('');
    }
  }

  // Updates all error messages for all form fields
  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  // Returns current error message for a given field
  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  // Emits the next event if the form is valid
  proceedToNext() {
    if (this.unitDetailsForm.valid) {
      this.next.emit();
    }
  }

  // Resets the form and clears session data
  resetForm() {
    this.unitDetailsForm.reset();
    sessionStorage.removeItem('unitDetailsData');
  }

  // Emits the back event
  goBack() {
    this.back.emit();
  }
}