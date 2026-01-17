import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../shared/utils/capitalize.util';
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
    companyName: signal(''),
    companyAddress: signal(''),
    companyPan: signal(''),
    companyCin: signal(''),
    incorporationDate: signal(''),
    companyPhoneNumber: signal(''),
    companyEmail: signal(''),
  };

  constructor(private fb: FormBuilder, private datePipe: DatePipe) {
    const storedValues: any = this.getFromSessionStorage();
    
    this.unitDetailsForm = this.fb.group({
      companyName: new FormControl(storedValues.companyName, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      companyAddress: new FormControl(storedValues.companyAddress, [Validators.required]),
      companyPan: new FormControl(storedValues.companyPan, [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      companyCin: new FormControl(storedValues.companyCin, [Validators.required, Validators.pattern(PatternConstants.CIN)]),
      incorporationDate: new FormControl(storedValues.incorporationDate ?? null, [Validators.required]),
      companyPhoneNumber: new FormControl(storedValues.companyPhoneNumber, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      companyEmail: new FormControl(storedValues.companyEmail, [Validators.required, Validators.pattern(PatternConstants.EMAIL)])
    });

    this.unitDetailsForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    FormUtils.capitalize(this.unitDetailsForm.get('companyPan')!, this.destroy$);
    FormUtils.capitalize(this.unitDetailsForm.get('companyCin')!, this.destroy$);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('unitDetailsData');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage() {
    const formData: any = this.unitDetailsForm.getRawValue(); 
    
    // Map to backend field names (CharField)
    formData.company_name = formData.companyName;
    formData.company_address = formData.companyAddress;
    formData.company_pan = formData.companyPan?.toUpperCase();
    formData.company_cin = formData.companyCin?.toUpperCase();
    formData.company_email = formData.companyEmail;
    
    // Clean phone number (CharField but numeric)
    if (formData.companyPhoneNumber) {
      formData.company_phone_number = String(formData.companyPhoneNumber).replace(/\D/g, '');
    }
    
    // Date field (ISO format YYYY-MM-DD)
    if (formData.incorporationDate) {
      const date = new Date(formData.incorporationDate);
      if (!isNaN(date.getTime())) {
        formData.incorporation_date = date.toISOString().split('T')[0];
      }
    }
    
    console.log('Saving Unit Details:', formData);
    sessionStorage.setItem('unitDetailsData', JSON.stringify(formData));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.unitDetailsForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      if (field === 'companyPan') {
        this.errorMessages[field].set('Invalid PAN format (e.g., ABCDE1234F)');
      } else if (field === 'companyCin') {
        this.errorMessages[field].set('Invalid CIN format');
      } else if (field === 'companyPhoneNumber') {
        this.errorMessages[field].set('Invalid phone number format');
      } else if (field === 'companyEmail') {
        this.errorMessages[field].set('Invalid email format');
      } else {
        this.errorMessages[field].set('Invalid format');
      }
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
      this.saveToSessionStorage();
      this.next.emit();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.unitDetailsForm.controls).forEach(key => {
        this.unitDetailsForm.get(key)?.markAsTouched();
      });
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