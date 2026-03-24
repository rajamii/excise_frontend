import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseType } from '../../../../../core/models/license-type.model';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { DatePipe } from '@angular/common';
import { MasterService } from '../../../../../core/services/master.service';
import { AccountService } from '../../../../../core/services/account.service';

@Component({
  selector: 'app-key-info',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './key-info.component.html',
  styleUrl: './key-info.component.scss',
  providers: [DatePipe]
})
export class KeyInfoComponent implements OnInit, OnDestroy {
  keyInfoForm: FormGroup;

  licenseTypes: LicenseType[] = [];
  licenseNatures: string[] = ['Regular', 'Temporary', 'Seasonal', 'Special Event'];
  functioningStatuses: string[] = ['Yes', 'No'];
  modeOfOperations: string[] = ['Self', 'Salesman', 'Barman'];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  errorMessages = {
    license_type: signal(''),
    establishment_name: signal(''),
    mobile_number: signal(''),
    email: signal(''),
    license_no: signal(''),
    initial_grant_date: signal(''),
    renewed_from: signal(''),
    valid_up_to: signal(''),
    yearly_license_fee: signal(''),
    license_nature: signal(''),
    functioning_status: signal(''),
    mode_of_operation: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    private accountService: AccountService,
    private datePipe: DatePipe
  ) {
    const storedValues = this.getFromSessionStorage();

    this.keyInfoForm = this.fb.group({
      license_type: new FormControl(storedValues.license_type, [Validators.required]),
      establishment_name: new FormControl(storedValues.establishment_name, [
        Validators.required,
        Validators.maxLength(150),
        Validators.pattern(PatternConstants.ORGANISATION_NAME),
      ]),
      mobile_number: new FormControl(storedValues.mobile_number, [
        Validators.required,
        Validators.pattern(PatternConstants.MOBILE)
      ]),
      email: new FormControl(storedValues.email, [
        Validators.required,
        Validators.pattern(PatternConstants.EMAIL)
      ]),
      license_no: new FormControl(storedValues.license_no, [
        Validators.pattern(PatternConstants.CODE)
      ]),
      initial_grant_date: new FormControl(storedValues?.initial_grant_date ?? null),
      renewed_from: new FormControl(storedValues?.renewed_from ?? null),
      valid_up_to: new FormControl(storedValues?.valid_up_to ?? null),
      yearly_license_fee: new FormControl(storedValues.yearly_license_fee, [
        Validators.pattern(PatternConstants.NUMBER)
      ]),
      license_nature: new FormControl(storedValues.license_nature, [Validators.required]),
      functioning_status: new FormControl(storedValues.functioning_status, [Validators.required]),
      mode_of_operation: new FormControl(storedValues.mode_of_operation, [Validators.required])
    });

    this.keyInfoForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {
    this.loadDropdownData();
    
    // ✅ AUTO-FILL from user profile
    this.autoFillFromUserProfile();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ Auto-fill contact details from logged-in user profile
   */
  private autoFillFromUserProfile(): void {
    const sessionData = sessionStorage.getItem('keyInfoData');
    if (sessionData) {
      console.log('📋 Key info already in session, skipping auto-fill');
      return;
    }

    const userProfile = this.accountService.getUserProfileSync();
    
    if (!userProfile) {
      console.log('⚠️ No user profile in memory, fetching from backend...');
      this.accountService.identity(true).subscribe({
        next: (profile) => {
          if (profile) {
            this.fillFormWithProfile(profile);
          }
        },
        error: (err) => {
          console.error('❌ Failed to fetch user profile:', err);
        }
      });
    } else {
      console.log('✅ User profile found in memory, auto-filling...');
      this.fillFormWithProfile(userProfile);
    }
  }

  /**
   * Fill form with user profile data
   */
  private fillFormWithProfile(profile: any): void {
    console.log('🔍 Auto-filling key info with profile:', profile);
    
    this.keyInfoForm.patchValue({
      mobile_number: profile.phoneNumber || profile.phone_number,
      email: profile.email
    }, { emitEvent: true });

    console.log('✅ Key info auto-filled from user profile');
  }

  private loadDropdownData(): void {
    this.masterService.getLicenseTypes().subscribe({
      next: (data: LicenseType[]) => {
        this.licenseTypes = data;
        sessionStorage.setItem('licenseTypes', JSON.stringify(data));
        console.log('✅ License types loaded and saved:', data.length);
      },
      error: (error) => {
        console.error('❌ Failed to load license types:', error);
      }
    });
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('keyInfoData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
  }

  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.keyInfoForm.getRawValue();

    const parsedDates = {
      initial_grant_date: this.transformValidDate(formData.initial_grant_date),
      renewed_from: this.transformValidDate(formData.renewed_from),
      valid_up_to: this.transformValidDate(formData.valid_up_to),
    };

    const enrichedData: any = {
      license_type: formData.license_type ? parseInt(String(formData.license_type)) : null,
      establishment_name: formData.establishment_name,
      mobile_number: formData.mobile_number ? Number(formData.mobile_number) : null,
      email: formData.email,
      license_no: formData.license_no || null,
      ...parsedDates,
      yearly_license_fee: formData.yearly_license_fee ? String(formData.yearly_license_fee) : null,
      license_nature: formData.license_nature,
      functioning_status: formData.functioning_status,
      mode_of_operation: formData.mode_of_operation
    };

    console.log('💾 Saving key info to sessionStorage:', enrichedData);
    sessionStorage.setItem('keyInfoData', JSON.stringify(enrichedData));
  }

  private transformValidDate(dateValue: unknown): string | null {
    if (!dateValue) return null;
    const date = new Date(dateValue as string);
    return isNaN(date.getTime()) ? null : this.datePipe.transform(date, 'yyyy-MM-dd');
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.keyInfoForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      this.errorMessages[field].set('Invalid format');
    } else if (control?.hasError('maxlength')) {
      this.errorMessages[field].set('Maximum 150 characters allowed');
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
    if (this.keyInfoForm.valid) {
      this.next.emit();
    }
  }

  resetForm() {
    this.keyInfoForm.reset();
    sessionStorage.removeItem('keyInfoData');
  }

  goBack() {
    this.back.emit();
  }
}