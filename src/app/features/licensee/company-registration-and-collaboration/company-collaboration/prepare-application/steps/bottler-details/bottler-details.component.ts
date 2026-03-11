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
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';

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
  brandOwners: CompanyCollaborationBrandOwner[] = [];
  isLoadingBrandOwners = false;

  errorMessages = {
    financialYear: signal(''),
    brandOwner: signal(''),
    brandOwnerCode: signal(''),
    brandOwnerName: signal(''),
    brandOwnerAddress: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private companyCollaborationService: CompanyCollaborationService
  ) {
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
    this.watchBrandOwnerChanges();
    this.loadBrandOwners();
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

  private watchBrandOwnerChanges(): void {
    this.bottlerDetailsForm.get('brandOwner')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((selectedId) => {
      this.applySelectedBrandOwnerDetails(selectedId);
    });
  }

  private loadBrandOwners(): void {
    const savedData = this.getFromSessionStorage();
    if (Object.keys(savedData).length > 0) {
      this.bottlerDetailsForm.patchValue(savedData, { emitEvent: false });
    }

    this.isLoadingBrandOwners = true;
    this.companyCollaborationService.getBrandOwners()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (owners) => {
          this.brandOwners = owners;
          this.applySelectedBrandOwnerDetails(this.bottlerDetailsForm.get('brandOwner')?.value);
          this.isLoadingBrandOwners = false;
        },
        error: (error) => {
          console.error('Failed to load company collaboration brand owners:', error);
          this.brandOwners = [];
          this.isLoadingBrandOwners = false;
        }
      });
  }

  private applySelectedBrandOwnerDetails(selectedId: string | number | null | undefined): void {
    const selectedOwner = this.findBrandOwner(selectedId);
    if (selectedOwner) {
      this.bottlerDetailsForm.patchValue({
        brandOwnerCode: selectedOwner.brand_owner_code,
        brandOwnerName: selectedOwner.company_name,
        brandOwnerAddress: selectedOwner.company_address
      }, { emitEvent: false });
    } else {
      this.bottlerDetailsForm.patchValue({
        brandOwnerCode: '',
        brandOwnerName: '',
        brandOwnerAddress: ''
      }, { emitEvent: false });
    }

    this.saveToSessionStorage();
  }

  private findBrandOwner(selectedId: string | number | null | undefined): CompanyCollaborationBrandOwner | undefined {
    if (!selectedId) {
      return undefined;
    }

    const selectedKey = String(selectedId);
    return this.brandOwners.find((owner) =>
      String(owner.id) === selectedKey || String(owner.brand_owner_code) === selectedKey
    );
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
    return this.findBrandOwner(selectedId);
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
