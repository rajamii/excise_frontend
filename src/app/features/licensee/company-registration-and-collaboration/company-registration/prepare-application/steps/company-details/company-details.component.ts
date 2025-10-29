import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { PatternConstants } from '../../../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../../../shared/utils/capitalize.util';
import { Company } from '../../../../../../../core/models/company.model';

@Component({
  selector: 'app-company-details',
  imports: [MaterialModule],
  templateUrl: './company-details.component.html',
  styleUrl: './company-details.component.scss',
})
export class CompanyDetailsComponent implements OnInit, OnDestroy {
  // Reactive form for company details
  companyDetailsForm: FormGroup;

  // Dropdown options
  licenses: string[] = ['New', 'License A', 'License B', 'License C'];
  applicationYears: string[] = ['2025-2026'];
  countries: string[] = ['India', 'Nepal', 'Bhutan', 'China'];
  states: string[] = ['Sikkim', 'West Bengal', 'Bihar', 'Assam'];
  
  // Output events for step navigation
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  // Used to unsubscribe from observables
  private destroy$ = new Subject<void>();
  
  // Error messages for each form control, using Angular's signal for reactivity
  errorMessages = {
    brandType: signal(''),
    license: signal(''),
    applicationYear: signal(''),
    companyName: signal(''),
    pan: signal(''),
    officeAddress: signal(''),
    country: signal(''),
    state: signal(''),
    factoryAddress: signal(''),
    pinCode: signal(''),
    companyMobileNumber: signal(''),
    companyEmailId: signal(''),
  };

  constructor(
    private fb: FormBuilder, 
  ) {
    // Load stored form values from sessionStorage
    const storedValues = this.getFromSessionStorage();

    // Initialize the form with controls and validators
    this.companyDetailsForm = this.fb.group({
      brandType: new FormControl(storedValues.brandType, [Validators.required]),
      license: new FormControl(storedValues.license, Validators.required),
      applicationYear: new FormControl(storedValues.applicationYear, Validators.required),
      companyName: new FormControl(storedValues.companyName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      pan: new FormControl(storedValues.pan, [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      officeAddress: new FormControl(storedValues.officeAddress, [Validators.required, Validators.maxLength(1000)]),
      country: new FormControl(storedValues.country, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      state: new FormControl(storedValues.state, [Validators.required]),
      factoryAddress: new FormControl(storedValues.factoryAddress, [Validators.required, Validators.maxLength(500)]),
      pinCode: new FormControl(storedValues.pinCode, [Validators.required, Validators.pattern(PatternConstants.PINCODE)]),
      companyMobileNumber: new FormControl(storedValues.companyMobileNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      companyEmailId: new FormControl(storedValues.companyEmailId, [Validators.pattern(PatternConstants.EMAIL)])
    });

    // Subscribe to form changes to update session storage and error messages
    this.companyDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {
    // Capitalize PAN input in real-time
    FormUtils.capitalize(this.companyDetailsForm.get('pan')!, this.destroy$);
  }

  ngOnDestroy() {
    // Unsubscribe from observables to prevent memory leaks
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Fetch form data from sessionStorage (if any)
  private getFromSessionStorage(): Partial<Company> {
    const storedData = sessionStorage.getItem('companyDetails');
    return storedData ? JSON.parse(storedData) as Company : {};
  }

  // Save current form data to sessionStorage
  private saveToSessionStorage() {
    const formData: Partial<Company> = this.companyDetailsForm.getRawValue();
    sessionStorage.setItem('companyDetails', JSON.stringify(formData));
  }

  // Update specific field's error message based on its validation state
  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.companyDetailsForm.get(field);
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

  // Update all error messages (usually on value change or form submission)
  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  // Getter method used in template to display validation messages
  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  // Move to next step if the form is valid; else trigger validation messages
  proceedToNext() {
    if (this.companyDetailsForm.valid) {
      this.next.emit();
    } else {
      this.companyDetailsForm.markAllAsTouched(); // mark fields as touched to show errors
      this.updateAllErrorMessages();              // show all errors
    }
  }

  // Clear the form and remove stored data
  resetForm() {
    this.companyDetailsForm.reset();
    sessionStorage.removeItem('companyDetails');
  }

  // Emit event to go back to previous step
  goBack() {
    this.back.emit();
  }
}
