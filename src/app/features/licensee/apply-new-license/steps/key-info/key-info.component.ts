import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { MasterService } from '../../../../../core/services/master.service';

interface LicenseCategory {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
}

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

  // Dropdown options
  licenseCategories: LicenseCategory[] = [];
  licenseSubCategories: LicenseCategory[] = [];
  districts: District[] = [];

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
    locationDistrict: signal(''),
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
      locationDistrict: new FormControl(storedValues.locationDistrict, [Validators.required]),
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
    this.loadDropdownData();

    // Watch for category changes to load sub-categories
    this.keyInfoForm.get('licenseCategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((categoryId) => {
        if (categoryId) {
          this.loadSubCategories(categoryId);
        } else {
          // Clear subcategories if no category selected
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
      (data: any[]) => {
        console.log(' Backend license categories:', data);

        this.licenseCategories = data.map(item => ({
          id: item.id,
          name: item.licenseCategory || item.license_category || item.name
        }));

        console.log(' Mapped categories:', this.licenseCategories);
      },
      error => {
        console.error(' Failed to load license categories:', error);
      }
    );

    // Load districts
    this.masterService.getDistrict().subscribe(
      (data: any[]) => {
        console.log(' Backend districts:', data);

        this.districts = data.map(item => ({
          id: item.id,
          name: item.district || item.name
        }));

        console.log(' Mapped districts:', this.districts);
      },
      error => {
        console.error(' Failed to load districts:', error);
      }
    );
  }

  private loadSubCategories(categoryId: number): void {
    console.log(' Loading subcategories for category:', categoryId);

    this.masterService.getLicenseSubcategories().subscribe(
      (data: any[]) => {
        console.log(' Raw subcategories from backend:', data);

        if (data.length > 0) {
          console.log(' First item structure:', JSON.stringify(data[0], null, 2));
        }

        // ✅ FRONTEND-ONLY FIX: Handle multiple possible backend formats
        this.licenseSubCategories = data
          .filter(item => {
            // Extract category ID from various possible formats:
            // 1. item.categoryId (if backend returns flat structure)
            // 2. item.category_id (snake_case)
            // 3. item.category.id (nested object)
            // 4. item.category (if it's just the ID)
            let itemCategoryId;

            if (item.categoryId !== undefined) {
              itemCategoryId = item.categoryId;
            } else if (item.category_id !== undefined) {
              itemCategoryId = item.category_id;
            } else if (item.category && typeof item.category === 'object' && item.category.id) {
              itemCategoryId = item.category.id;
            } else if (item.category && typeof item.category === 'number') {
              itemCategoryId = item.category;
            }

            const matches = Number(itemCategoryId) === Number(categoryId);
            console.log(`  Item ${item.id}: categoryId=${itemCategoryId}, matches=${matches}`);

            return matches;
          })
          .map(item => ({
            id: item.id,
            name: item.description || item.name || item.subcategory
          }));

        console.log(' Filtered subcategories:', this.licenseSubCategories);

        if (this.licenseSubCategories.length === 0) {
          console.warn(' No subcategories found for category:', categoryId);
          console.warn(' Check the logs above to see the data structure');
        }

        // Reset subcategory selection
        this.keyInfoForm.patchValue({ licenseSubCategory: null }, { emitEvent: false });
      },
      error => {
        console.error('❌ Failed to load subcategories:', error);
      }
    );
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