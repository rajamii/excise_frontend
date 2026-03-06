import { Component, EventEmitter, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountService } from '../../../../../../core/services/account.service';
import { PatternConstants } from '../../../../../../shared/constants/pattern.constants';
import { MaterialModule } from '../../../../../../shared/material.module';

@Component({
  selector: 'app-label-registration-licensee-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './licensee-details.component.html',
  styleUrl: './licensee-details.component.scss'
})
export class LabelRegistrationLicenseeDetailsComponent implements OnInit, OnDestroy {
  @Output() readonly next = new EventEmitter<void>();

  licenseeForm: FormGroup;
  private destroy$ = new Subject<void>();

  licenseTypes = [
    { value: 'distillery', label: 'Distillery' },
    { value: 'brewery', label: 'Brewery' },
    { value: 'winery', label: 'Winery' },
    { value: 'importer', label: 'Importer' },
    { value: 'bottler', label: 'Bottler' }
  ];

  errorMessages = {
    applicationYear: signal(''),
    licenseeName: signal(''),
    licenseNumber: signal(''),
    licenseType: signal(''),
    establishmentName: signal(''),
    contactPerson: signal(''),
    contactNumber: signal(''),
    emailAddress: signal(''),
    premisesAddress: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService
  ) {
    const storedValues = this.getFromSessionStorage();

    this.licenseeForm = this.fb.group({
      applicationYear: new FormControl(storedValues.applicationYear || this.getCurrentFinancialYear(), [Validators.required]),
      licenseeName: new FormControl(storedValues.licenseeName || '', [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      licenseNumber: new FormControl(storedValues.licenseNumber || '', [Validators.required]),
      licenseType: new FormControl(storedValues.licenseType || '', [Validators.required]),
      establishmentName: new FormControl(storedValues.establishmentName || '', [Validators.required]),
      contactPerson: new FormControl(storedValues.contactPerson || '', [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      contactNumber: new FormControl(storedValues.contactNumber || '', [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      emailAddress: new FormControl(storedValues.emailAddress || '', [Validators.required, Validators.pattern(PatternConstants.EMAIL)]),
      premisesAddress: new FormControl(storedValues.premisesAddress || '', [Validators.required, Validators.maxLength(500)])
    });

    this.licenseeForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit(): void {
    const savedData = this.getFromSessionStorage();
    if (Object.keys(savedData).length === 0) {
      this.autoFillFromUserProfile();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private autoFillFromUserProfile(): void {
    const profile = this.accountService.getUserProfileSync() || this.accountService.getCurrentUser();
    if (!profile) {
      return;
    }

    const fullName = [profile.firstName, profile.middleName, profile.lastName]
      .filter((value) => !!String(value || '').trim())
      .join(' ')
      .trim();

    const patch: Record<string, string> = {};
    if (fullName) {
      patch['licenseeName'] = fullName;
      patch['contactPerson'] = fullName;
    }
    if (profile.phoneNumber) {
      patch['contactNumber'] = String(profile.phoneNumber);
    }
    if (profile.email) {
      patch['emailAddress'] = String(profile.email);
    }
    if (profile.address) {
      patch['premisesAddress'] = String(profile.address);
    }

    this.licenseeForm.patchValue(patch);
  }

  private getCurrentFinancialYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (currentMonth >= 4) {
      return `${currentYear}-${(currentYear + 1).toString().substring(2)}`;
    }
    return `${currentYear - 1}-${currentYear.toString().substring(2)}`;
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('labelRegLicenseeDetails');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage(): void {
    sessionStorage.setItem('labelRegLicenseeDetails', JSON.stringify(this.licenseeForm.getRawValue()));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const control = this.licenseeForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      this.errorMessages[field].set('Please enter a valid value');
    } else if (control?.hasError('maxlength')) {
      this.errorMessages[field].set('Maximum 500 characters allowed');
    } else {
      this.errorMessages[field].set('');
    }
  }

  private updateAllErrorMessages(): void {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  getErrorMessage(field: keyof typeof this.errorMessages): string {
    return this.errorMessages[field]();
  }

  resetForm(): void {
    sessionStorage.removeItem('labelRegLicenseeDetails');
    this.licenseeForm.reset({
      applicationYear: this.getCurrentFinancialYear()
    });
    this.autoFillFromUserProfile();
  }

  proceedToNext(): void {
    if (this.licenseeForm.valid) {
      this.next.emit();
      return;
    }
    this.licenseeForm.markAllAsTouched();
    this.updateAllErrorMessages();
  }
}
