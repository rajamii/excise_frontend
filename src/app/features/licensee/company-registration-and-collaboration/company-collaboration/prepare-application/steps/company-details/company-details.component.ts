import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { PatternConstants } from '../../../../../../../shared/constants/pattern.constants';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationCompanyDetails
} from '../../../../../../../core/models/company-collaboration.model';
import { AccountService } from '../../../../../../../core/services/account.service';
import { MasterService } from '../../../../../../../core/services/master.service';
import { SupplyChainProfileService } from '../../../../../../../core/services/supply-chain-profile.service';

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

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private masterService: MasterService,
    private supplyChainProfileService: SupplyChainProfileService,
    private cdr: ChangeDetectorRef
  ) {
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

    setTimeout(() => {
      this.autoFillFromProfiles();
    }, 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getFromSessionStorage(): Partial<CompanyCollaborationCompanyDetails> {
    const storedData = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.companyDetails);
    if (!storedData) {
      return {};
    }
    try {
      return JSON.parse(storedData) as Partial<CompanyCollaborationCompanyDetails>;
    } catch (error) {
      console.error('Unable to parse company collaboration company details from sessionStorage:', error);
      return {};
    }
  }

  private saveToSessionStorage() {
    const formData = this.companyDetailsForm.getRawValue();
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.companyDetails, JSON.stringify(formData));
  }

  private autoFillFromProfiles(): void {
    forkJoin({
      userProfile: this.fetchUserProfile(),
      licenseeProfile: this.masterService.getMyLicenseeProfile().pipe(catchError(() => of(null))),
      supplyChainProfile: this.supplyChainProfileService.getProfile().pipe(
        catchError(() => of({ success: false, exists: false, data: null }))
      )
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ userProfile, licenseeProfile, supplyChainProfile }) => {
          this.fillForm(userProfile, licenseeProfile, supplyChainProfile?.data || null);
        },
        error: (error) => {
          console.error('Failed to auto-fill company collaboration details:', error);
        }
      });
  }

  private fetchUserProfile() {
    let cached = this.accountService.getUserProfileSync();

    if (!cached) {
      try {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          cached = JSON.parse(stored);
        }
      } catch {
        // Ignore malformed local cache and fall through to backend call.
      }
    }

    return cached
      ? of(cached)
      : this.accountService.identity(true).pipe(catchError(() => of(null)));
  }

  private fillForm(user: any, licensee: any, supplyChainProfile: any): void {
    const fillData: Partial<CompanyCollaborationCompanyDetails> = {};
    const fullName = this.buildFullName(user);
    const currentLicenseeName = String(this.companyDetailsForm.get('licenseeName')?.value || '').trim();
    const unitName = String(supplyChainProfile?.manufacturingUnitName || '').trim();
    const currentLicenseeAddress = String(this.companyDetailsForm.get('licenseeAddress')?.value || '').trim();
    const unitAddress = String(supplyChainProfile?.address || '').trim();
    const userAddress = String(user?.address || '').trim();

    const preferredLicenseeName = fullName || unitName;
    if (
      preferredLicenseeName &&
      (!currentLicenseeName || (!!unitName && currentLicenseeName === unitName))
    ) {
      fillData.licenseeName = preferredLicenseeName;
    }

    const preferredLicenseeAddress = userAddress || unitAddress;
    if (
      preferredLicenseeAddress &&
      (!currentLicenseeAddress || (!!unitAddress && currentLicenseeAddress === unitAddress))
    ) {
      fillData.licenseeAddress = preferredLicenseeAddress;
    }

    if (!this.companyDetailsForm.get('contactPerson')?.value && fullName) {
      fillData.contactPerson = fullName;
    }

    if (!this.companyDetailsForm.get('contactNumber')?.value && (user?.phoneNumber || user?.phone_number)) {
      fillData.contactNumber = String(user.phoneNumber || user.phone_number);
    }

    if (!this.companyDetailsForm.get('emailAddress')?.value && user?.email) {
      fillData.emailAddress = String(user.email);
    }

    if (!this.companyDetailsForm.get('licenseNumber')?.value && supplyChainProfile?.licenseeId) {
      fillData.licenseNumber = String(supplyChainProfile.licenseeId);
    }

    if (!this.companyDetailsForm.get('licenseType')?.value) {
      const mappedLicenseType = this.mapLicenseType(supplyChainProfile?.licenseType);
      if (mappedLicenseType) {
        fillData.licenseType = mappedLicenseType;
      }
    }

    if (!this.companyDetailsForm.get('establishmentType')?.value) {
      const mappedEstablishmentType = this.mapEstablishmentType(supplyChainProfile?.licenseType);
      if (mappedEstablishmentType) {
        fillData.establishmentType = mappedEstablishmentType;
      }
    }

    if (!this.companyDetailsForm.get('businessRegNumber')?.value && licensee?.registrationNumber) {
      fillData.businessRegNumber = String(licensee.registrationNumber);
    }

    if (Object.keys(fillData).length === 0) {
      return;
    }

    this.companyDetailsForm.patchValue(fillData, { emitEvent: false });

    Object.keys(fillData).forEach((key) => {
      const control = this.companyDetailsForm.get(key);
      control?.markAsDirty();
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });

    this.cdr.detectChanges();
    this.saveToSessionStorage();
  }

  private buildFullName(user: any): string {
    return [
      user?.firstName || user?.first_name,
      user?.middleName || user?.middle_name,
      user?.lastName || user?.last_name
    ]
      .filter((value) => !!String(value || '').trim())
      .join(' ')
      .trim();
  }

  private mapLicenseType(value: unknown): string | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return null;

    if (normalized.includes('retail')) return 'retail';
    if (normalized.includes('wholesale')) return 'wholesale';
    if (normalized.includes('restaurant')) return 'restaurant';
    if (normalized.includes('bar')) return 'bar';

    return this.licenseTypes.some((type) => type.value === normalized) ? normalized : null;
  }

  private mapEstablishmentType(value: unknown): string | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return null;

    if (normalized.includes('retail') || normalized.includes('shop')) return 'shop';
    if (normalized.includes('restaurant')) return 'restaurant';
    if (normalized.includes('hotel')) return 'hotel';
    if (normalized.includes('club')) return 'club';
    if (normalized.includes('bar')) return 'bar';

    return this.establishmentTypes.some((type) => type.value === normalized) ? normalized : null;
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
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.companyDetails);
    this.autoFillFromProfiles();
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
