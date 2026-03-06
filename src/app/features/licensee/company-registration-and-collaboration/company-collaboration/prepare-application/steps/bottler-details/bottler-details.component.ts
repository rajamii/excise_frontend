import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationBottlerDetails,
  CompanyCollaborationBrandOwner
} from '../../../../../../../core/models/company-collaboration.model';

@Component({
  selector: 'app-bottler-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './bottler-details.component.html',
  styleUrl: './bottler-details.component.scss'
})
export class BottlerDetailsComponent implements OnInit, OnDestroy {
  bottlerDetailsForm: FormGroup;
  
  @Output() readonly next = new EventEmitter<void>();
  
  private destroy$ = new Subject<void>();
  
  // Sample brand owners data - replace with actual service call
  brandOwners: CompanyCollaborationBrandOwner[] = [
    {
      id: 1,
      brand_owner_code: 'NA',
      company_name: 'NA',
      company_address: 'NA',
      location: 'NA',
      status: 'Active',
      brand_count: 1
    },
    {
      id: 2,
      brand_owner_code: 'NA', 
      company_name: 'NA',
      company_address: 'NA',
      location: 'NA',
      status: 'Active',
      brand_count: 2
    },
    {
      id: 3,
      brand_owner_code: 'NA',
      company_name: 'NA',
      company_address: 'NA',
      location: 'NA', 
      status: 'Active',
      brand_count: 3
    }
  ];

  errorMessages = {
    financialYear: signal(''),
    brandOwner: signal(''),
    brandOwnerCode: signal(''),
    brandOwnerName: signal(''),
    brandOwnerAddress: signal('')
  };

  constructor(private fb: FormBuilder) {
    const storedValues = this.getFromSessionStorage();
    
    this.bottlerDetailsForm = this.fb.group({
      financialYear: new FormControl(this.getCurrentFinancialYear(), [Validators.required]),
      brandOwner: new FormControl(storedValues.brandOwner, [Validators.required]),
      brandOwnerCode: new FormControl(storedValues.brandOwnerCode),
      brandOwnerName: new FormControl(storedValues.brandOwnerName),
      brandOwnerAddress: new FormControl(storedValues.brandOwnerAddress)
    });

    this.bottlerDetailsForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    // Watch for brand owner selection changes
    this.bottlerDetailsForm.get('brandOwner')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((selectedId) => {
      if (selectedId) {
        const selectedOwner = this.brandOwners.find(owner => owner.id.toString() === selectedId.toString());
        if (selectedOwner) {
          this.bottlerDetailsForm.patchValue({
            brandOwnerCode: selectedOwner.brand_owner_code,
            brandOwnerName: selectedOwner.company_name,
            brandOwnerAddress: selectedOwner.company_address
          });
        }
      } else {
        this.bottlerDetailsForm.patchValue({
          brandOwnerCode: '',
          brandOwnerName: '',
          brandOwnerAddress: ''
        });
      }
    });

    // Load saved data and trigger brand owner selection
    const savedData = this.getFromSessionStorage();
    if (savedData.brandOwner) {
      this.bottlerDetailsForm.patchValue(savedData);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCurrentFinancialYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (currentMonth >= 4) {
      return `${currentYear}-${(currentYear + 1).toString().substring(2)}`;
    } else {
      return `${currentYear - 1}-${currentYear.toString().substring(2)}`;
    }
  }

  private getFromSessionStorage(): Partial<CompanyCollaborationBottlerDetails> {
    const storedData = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
    if (!storedData) {
      return {};
    }
    try {
      return JSON.parse(storedData) as Partial<CompanyCollaborationBottlerDetails>;
    } catch (error) {
      console.error('Unable to parse company collaboration bottler details from sessionStorage:', error);
      return {};
    }
  }

  private saveToSessionStorage() {
    const formData = this.bottlerDetailsForm.getRawValue();
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails, JSON.stringify(formData));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.bottlerDetailsForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
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

  getSelectedBrandOwnerDetails(): CompanyCollaborationBrandOwner | undefined {
    const selectedId = this.bottlerDetailsForm.get('brandOwner')?.value;
    return this.brandOwners.find(owner => owner.id.toString() === selectedId?.toString());
  }

  resetForm() {
    this.bottlerDetailsForm.reset();
    this.bottlerDetailsForm.patchValue({
      financialYear: this.getCurrentFinancialYear()
    });
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
  }

  proceedToNext() {
    if (this.bottlerDetailsForm.valid) {
      this.next.emit();
    }
  }
}
