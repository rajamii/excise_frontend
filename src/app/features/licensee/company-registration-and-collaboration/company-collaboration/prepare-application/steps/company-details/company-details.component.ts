import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { PatternConstants } from '../../../../../../../shared/constants/pattern.constants';

@Component({
  selector: 'app-company-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './company-details.component.html',
  styleUrl: './company-details.component.scss'
})
export class CompanyDetailsComponent implements OnInit, OnDestroy {
  companyDetailsForm: FormGroup;
  
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();
  
  private destroy$ = new Subject<void>();

  licenseTypes = [
    { value: 'retail', label: 'Retail License' },
    { value: 'wholesale', label: 'Wholesale License' },
    { value: 'bar', label: 'Bar License' },
    { value: 'restaurant', label: 'Restaurant License' }
  ];

  establishmentTypes = [
    { value: 'shop', label: 'Liquor Shop' },
    { value: 'bar', label: 'Bar' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'club', label: 'Club' }
  ];

  errorMessages = {
    licenseeName: signal(''),
    licenseeAddress: signal(''),
    contactPerson: signal(''),
    contactNumber: signal(''),
    emailAddress: signal(''),
    licenseNumber: signal(''),
    licenseType: signal(''),
    establishmentType: signal(''),
    businessRegNumber: signal('')
  };

  constructor(private fb: FormBuilder) {
    const storedValues = this.getFromSessionStorage();
    
    this.companyDetailsForm = this.fb.group({
      licenseeName: new FormControl(storedValues.licenseeName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      licenseeAddress: new FormControl(storedValues.licenseeAddress, [Validators.required, Validators.maxLength(500)]),
      contactPerson: new FormControl(storedValues.contactPerson, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      contactNumber: new FormControl(storedValues.contactNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      emailAddress: new FormControl(storedValues.emailAddress, [Validators.required, Validators.pattern(PatternConstants.EMAIL)]),
      licenseNumber: new FormControl(storedValues.licenseNumber, [Validators.required]),
      licenseType: new FormControl(storedValues.licenseType, [Validators.required]),
      establishmentType: new FormControl(storedValues.establishmentType, [Validators.required]),
      businessRegNumber: new FormControl(storedValues.businessRegNumber, [Validators.required])
    });

    this.companyDetailsForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    // Load saved data
    const savedData = this.getFromSessionStorage();
    if (Object.keys(savedData).length > 0) {
      this.companyDetailsForm.patchValue(savedData);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('companyDetails');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage() {
    const formData = this.companyDetailsForm.getRawValue();
    sessionStorage.setItem('companyDetails', JSON.stringify(formData));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.companyDetailsForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      this.errorMessages[field].set('Please enter a valid value');
    } else if (control?.hasError('email')) {
      this.errorMessages[field].set('Please enter a valid email address');
    } else if (control?.hasError('maxlength')) {
      this.errorMessages[field].set('Maximum 500 characters allowed');
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

  getLicenseTypeLabel(value: string): string {
    const type = this.licenseTypes.find(t => t.value === value);
    return type?.label || '';
  }

  getEstablishmentTypeLabel(value: string): string {
    const type = this.establishmentTypes.find(t => t.value === value);
    return type?.label || '';
  }

  resetForm() {
    this.companyDetailsForm.reset();
    sessionStorage.removeItem('companyDetails');
  }

  goBack() {
    this.back.emit();
  }

  proceedToNext() {
    if (this.companyDetailsForm.valid) {
      this.next.emit();
    }
  }
}