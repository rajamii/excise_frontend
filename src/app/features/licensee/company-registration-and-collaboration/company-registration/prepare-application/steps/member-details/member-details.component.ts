import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { PatternConstants } from '../../../../../../../shared/constants/pattern.constants';
import { Company } from '../../../../../../../core/models/company.model';

@Component({
  selector: 'app-member-details',
  imports: [MaterialModule],
  templateUrl: './member-details.component.html',
  styleUrl: './member-details.component.scss'
})
export class MemberDetailsComponent implements OnInit, OnDestroy {

  // Reactive form group for member details
  memberDetailsForm: FormGroup;

  // Output events for stepper navigation
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  // Subject to handle unsubscription and avoid memory leaks
  private destroy$ = new Subject<void>();

  // Signal-based error message store for each field
  errorMessages = {
    memberName: signal(''),
    memberDesignation: signal(''),
    memberMobileNumber: signal(''),
    memberEmailId: signal(''),
    memberAddress: signal(''),
  };

  constructor(
    private fb: FormBuilder,
  ) {
    // Retrieve saved form values from session storage
    const storedValues = this.getFromSessionStorage();

    // Initialize the form with validators and prefilled data (if any)
    this.memberDetailsForm = this.fb.group({
      memberName: new FormControl(storedValues.memberName, [
        Validators.required,
        Validators.pattern(PatternConstants.NAME)
      ]),
      memberDesignation: new FormControl(storedValues.memberDesignation, [
        Validators.required,
        Validators.maxLength(100)
      ]),
      memberMobileNumber: new FormControl(storedValues.memberMobileNumber, [
        Validators.required,
        Validators.pattern(PatternConstants.MOBILE)
      ]),
      memberEmailId: new FormControl(storedValues.memberEmailId, [
        Validators.pattern(PatternConstants.EMAIL)
      ]),
      memberAddress: new FormControl(storedValues.memberAddress, [
        Validators.required,
        Validators.maxLength(500)
      ])
    });

    // Listen to form value changes and update session + error messages
    this.memberDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {}

  ngOnDestroy() {
    // Complete the destroy$ subject to avoid memory leaks
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Retrieve form data from sessionStorage (if available)
  private getFromSessionStorage(): Partial<Company> {
    const storedData = sessionStorage.getItem('memberDetails');
    return storedData ? JSON.parse(storedData) as Company : {};
  }

  // Save current form values into sessionStorage
  private saveToSessionStorage() {
    const formData: Partial<Company> = this.memberDetailsForm.getRawValue();
    sessionStorage.setItem('memberDetails', JSON.stringify(formData));
  }

  // Set specific error messages based on validation errors for a given field
  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.memberDetailsForm.get(field);
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

  // Update error messages for all fields in the form
  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  // Helper to get current error message value for display in template
  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  // Emit next event if form is valid — used to proceed to next step in form
  proceedToNext() {
    if (this.memberDetailsForm.valid) {
      this.next.emit();
    }
  }

  // Clear form fields and remove stored session data
  resetForm() {
    this.memberDetailsForm.reset();
    sessionStorage.removeItem('memberDetails');
  }

  // Emit back event — used to go to the previous step in form
  goBack() {
    this.back.emit();
  }
}
