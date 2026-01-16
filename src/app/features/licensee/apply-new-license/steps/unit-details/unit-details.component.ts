import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../shared/utils/capitalize.util';
import { AccountService } from '../../../../../core/services/account.service';
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

  constructor(
    private fb: FormBuilder, 
    private datePipe: DatePipe,
    private accountService: AccountService
  ) {
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
    
    // ✅ AUTO-FILL from user profile (optional - company details might not be in user profile)
    this.autoFillFromUserProfile();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ Auto-fill company details from user profile (if available)
   * Note: This is optional since company details are typically separate
   */
  private autoFillFromUserProfile(): void {
    const sessionData = sessionStorage.getItem('unitDetailsData');
    if (sessionData) {
      console.log('📋 Unit details already in session, skipping auto-fill');
      return;
    }

    let userProfile = this.accountService.getUserProfileSync();
    
    if (!userProfile) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          userProfile = JSON.parse(storedUser);
        } catch (e) {
          console.error('❌ Failed to parse stored user profile:', e);
          return;
        }
      }
    }

    if (userProfile) {
      console.log('✅ Checking for company details in profile:', userProfile);
      this.fillFormWithProfile(userProfile);
    }
  }

  /**
   * Fill form with user profile data (if company info exists)
   */
  private fillFormWithProfile(profile: any): void {
    const fillData: any = {};

    // Map phone number as company phone (user's contact)
    if (profile.phoneNumber || profile.phone_number) {
      fillData.companyPhoneNumber = profile.phoneNumber || profile.phone_number;
      console.log('✅ Mapped company phone from user phone');
    }

    // Map email as company email (user's email)
    if (profile.email) {
      fillData.companyEmail = profile.email;
      console.log('✅ Mapped company email from user email');
    }

    // Map address as company address (user's address)
    if (profile.address) {
      fillData.companyAddress = profile.address;
      console.log('✅ Mapped company address from user address');
    }

    if (Object.keys(fillData).length > 0) {
      console.log('📝 Company details data to be filled:', fillData);
      this.unitDetailsForm.patchValue(fillData, { emitEvent: true });
      console.log('✅ Company contact details auto-filled from user profile');
    } else {
      console.log('ℹ️ No company details to auto-fill from profile');
    }
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
    
    console.log('💾 Saving Unit Details:', formData);
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