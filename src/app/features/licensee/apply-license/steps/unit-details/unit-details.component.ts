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
  unitDetailsForm: FormGroup;

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  errorMessages = {
    company_name: signal(''),
    company_address: signal(''),
    company_gst: signal(''),
    company_phone_number: signal(''),
    company_email: signal(''),
  };

  constructor(private fb: FormBuilder, private datePipe: DatePipe) {
    const storedValues = this.getFromSessionStorage();
    
    this.unitDetailsForm = this.fb.group({
      company_name: new FormControl(storedValues.company_name, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      company_address: new FormControl(storedValues.company_address, [Validators.required]),
      company_gst: new FormControl(storedValues.company_gst, [Validators.required, Validators.pattern(PatternConstants.GST)]),
      company_phone_number: new FormControl(storedValues.company_phone_number, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      company_email: new FormControl(storedValues.company_email, [Validators.required, Validators.pattern(PatternConstants.EMAIL)])
    });

    this.unitDetailsForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    FormUtils.capitalize(this.unitDetailsForm.get('company_gst')!, this.destroy$);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('unitDetailsData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
  }

  private saveToSessionStorage() {
    const formData: any = this.unitDetailsForm.getRawValue();
    
    // ✅ CRITICAL: Ensure numbers are stored as integers
    const cleanData = {
      company_name: formData.company_name,
      company_address: formData.company_address,
      company_gst: formData.company_gst,
      company_phone_number: formData.company_phone_number ? Number(formData.company_phone_number) : null,
      company_email: formData.company_email
    };

    // Validate conversion
    if (cleanData.company_phone_number && isNaN(cleanData.company_phone_number)) {
      console.error('❌ Invalid company_phone_number:', formData.company_phone_number);
      cleanData.company_phone_number = null;
    }

    console.log('💾 Saving unit details to sessionStorage:', cleanData);
    sessionStorage.setItem('unitDetailsData', JSON.stringify(cleanData));
  }

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

  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  proceedToNext() {
    if (this.unitDetailsForm.valid) {
      this.next.emit();
    }
  }

  resetForm() {
    this.unitDetailsForm.reset();
    sessionStorage.removeItem('unitDetailsData');
  }

  goBack() {
    this.back.emit();
  }
}