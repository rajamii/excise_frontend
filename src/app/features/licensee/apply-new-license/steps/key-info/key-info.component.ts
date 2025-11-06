import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { MasterService } from '../../../../../core/services/master.service';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';

@Component({
  selector: 'app-key-info',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './key-info.component.html',
  styleUrl: './key-info.component.scss'
})
export class KeyInfoComponent implements OnInit, OnDestroy {

  // Reactive form group
  keyInfoForm: FormGroup;

  private allSubCategories: LicenseSubcategory[] = [];

  // Dropdown options
  licenseCategories: LicenseCategory[] = [];
  licenseSubCategories: LicenseSubcategory[] = [];
  // districts: District[] = [];

  // Event emitters for navigation
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  // Subject for managing subscriptions
  private destroy$ = new Subject<void>();

  // Signal-based error messages for reactive display
  errorMessages = {
    licenseCategory: signal(''),
    licenseSubCategory: signal(''),
    establishmentName: signal(''),
    // locationDistrict: signal(''),
    siteType: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private masterService: MasterService
  ) {
    // Retrieve data from session storage if available
    const storedValues = this.getFromSessionStorage();

    // Initialize reactive form with validation
    this.keyInfoForm = this.fb.group({
      licenseCategory: new FormControl(storedValues.licenseCategory, [Validators.required]),
      licenseSubCategory: new FormControl(storedValues.licenseSubCategory, [Validators.required]),
      establishmentName: new FormControl(storedValues.establishmentName, [
        Validators.required,
        Validators.maxLength(150),
        Validators.pattern(PatternConstants.ORGANISATION_NAME),
      ]),
      // locationDistrict: new FormControl(storedValues.locationDistrict, [Validators.required]),
      siteType: new FormControl(storedValues.siteType, [Validators.required])
    });

    // Subscribe to form changes to update session storage and errors
    this.keyInfoForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {
  this.loadDropdownData(); // Loads categories + all subcategories

  this.keyInfoForm.get('licenseCategory')?.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe((categoryId) => {
      if (categoryId) {
        this.loadSubCategories(categoryId);
      } else {
        this.licenseSubCategories = [];
        this.keyInfoForm.patchValue({ licenseSubCategory: null }, { emitEvent: false });
      }
    });
}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDropdownData(): void {
    // Load license categories
    this.masterService.getLicenseCategories().subscribe(
      (data: LicenseCategory[]) => {
        console.log(' Backend license categories:', data);

        this.licenseCategories = data.map(item => ({
          id: item.id,
          licenseCategory: item.licenseCategory
        }));
      },
      error => {
        console.error(' Failed to load license categories:', error);
      }
    );
  }

  private loadSubCategories(categoryId: number): void {
    this.masterService.getLicenseSubcategories().subscribe(
      (data: LicenseSubcategory[]) => {
        this.allSubCategories = (data || []).map(d => ({
          id: d.id,
          description: d.description ?? '',
          category: d.category ?? ''
        } as LicenseSubcategory));

        // Trigger reload if category is already selected
        const currentCategory = this.keyInfoForm.get('licenseCategory')?.value;
        if (currentCategory) {
          this.filterSubCategories(currentCategory);
        }
      }
    );
  }

  private filterSubCategories(categoryId: number): void {
    // Filter subcategories where category matches
    this.licenseSubCategories = this.allSubCategories.filter(
      sub => {
        // Handle both number and object
        const subCatId = typeof sub.category === 'object' ? sub.category?.id : sub.category;
        return subCatId === categoryId;
      }
    );

    console.log('Filtered subcategories:', this.licenseSubCategories);

    // Reset selection
    this.keyInfoForm.patchValue({ licenseSubCategory: null }, { emitEvent: false });
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('keyInfoData');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage() {
    const formData = this.keyInfoForm.getRawValue();
    sessionStorage.setItem('keyInfoData', JSON.stringify(formData));
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