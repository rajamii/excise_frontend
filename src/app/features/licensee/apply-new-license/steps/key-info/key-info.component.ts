import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { MasterService } from '../../../../../core/services/master.service';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';

@Component({
  selector: 'app-key-info',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './key-info.component.html',
  styleUrls: ['./key-info.component.scss']
})
export class KeyInfoComponent implements OnInit, OnDestroy {

  keyInfoForm: FormGroup;
  
  // Store ALL subcategories from API
  private allSubCategories: LicenseSubcategory[] = [];

  // Displayed data in dropdowns
  licenseCategories: LicenseCategory[] = [];
  licenseSubCategories: LicenseSubcategory[] = [];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  errorMessages = {
    licenseCategory: signal(''),
    licenseSubCategory: signal(''),
    establishmentName: signal(''),
    siteType: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    private cdr: ChangeDetectorRef
  ) {
    const storedValues = this.getFromSessionStorage();
    const hasCategory = !!storedValues['licenseCategory'];

    this.keyInfoForm = this.fb.group({
      licenseCategory: new FormControl(storedValues['licenseCategory'] ?? null, Validators.required),
      licenseSubCategory: new FormControl(
        { value: storedValues['licenseSubCategory'] ?? null, disabled: !hasCategory },
        Validators.required
      ),
      establishmentName: new FormControl(storedValues['establishmentName'] ?? '', [
        Validators.required,
        Validators.maxLength(150),
        Validators.pattern(PatternConstants.ORGANISATION_NAME),
      ]),
      siteType: new FormControl(storedValues['siteType'] ?? null, Validators.required)
    });

    this.keyInfoForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit(): void {
    console.log('🚀 KeyInfoComponent initialized');
    
    // Load categories first
    this.loadDropdownData();
    
    // Load all subcategories
    this.loadAllSubCategories();

    // Watch for category changes
    this.keyInfoForm.get('licenseCategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(categoryId => {
        console.log('📂 Category changed to:', categoryId);
        const subCategoryCtrl = this.keyInfoForm.get('licenseSubCategory');
        
        if (categoryId) {
          subCategoryCtrl?.enable();
          this.filterSubCategories(categoryId);
        } else {
          subCategoryCtrl?.disable();
          this.licenseSubCategories = [];
          this.keyInfoForm.patchValue({ licenseSubCategory: null }, { emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load license categories from API
   */
  private loadDropdownData(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data: LicenseCategory[]) => {
        this.licenseCategories = data.map(item => ({
          id: item.id ?? 0,
          licenseCategory: item.licenseCategory,
          description: item.description ?? ''
        }));
        console.log('✅ License Categories loaded:', this.licenseCategories);
        
        // Restore category if needed
        this.restoreCategoryIfNeeded();
      },
      error: (err) => console.error('❌ Failed to load license categories', err)
    });
  }

  /**
   * Load ALL subcategories from API and store them
   */
  private loadAllSubCategories(): void {
    this.masterService.getLicenseSubcategories().subscribe({
      next: (data: any[]) => {
        console.log('📦 Raw subcategories from API:', data);
        
        this.allSubCategories = data.map(d => {
          // Handle multiple possible field names for category foreign key
          let categoryId: number;
          
          if (d.license_category_id !== undefined && d.license_category_id !== null) {
            categoryId = Number(d.license_category_id);
          } else if (d.category !== undefined && d.category !== null) {
            if (typeof d.category === 'object' && d.category !== null) {
              categoryId = d.category.id ?? Number(d.category);
            } else {
              categoryId = Number(d.category);
            }
          } else if (d.licenseCategory !== undefined && d.licenseCategory !== null) {
            if (typeof d.licenseCategory === 'object' && d.licenseCategory !== null) {
              categoryId = d.licenseCategory.id ?? Number(d.licenseCategory);
            } else {
              categoryId = Number(d.licenseCategory);
            }
          } else {
            console.warn('⚠️ No category field found in subcategory:', d);
            categoryId = 0;
          }
            
          const subcategory: LicenseSubcategory = {
            id: d.id ?? 0,
            description: d.description ?? '',
            category: categoryId
          };
          
          return subcategory;
        });
        
        console.log('✅ All subcategories processed:', this.allSubCategories);

        // Filter based on current category selection
        const currentCategory = this.keyInfoForm.get('licenseCategory')?.value;
        if (currentCategory) {
          console.log('🔄 Filtering subcategories for already selected category:', currentCategory);
          this.filterSubCategories(currentCategory);
        }
        
        this.restoreSubcategoryIfNeeded();
      },
      error: (err) => console.error('❌ Failed to load subcategories', err)
    });
  }

  /**
   * Filter subcategories based on selected category
   */
  private filterSubCategories(categoryId: number): void {
    if (!categoryId) {
      this.licenseSubCategories = [];
      return;
    }

    console.log('🔍 Filtering subcategories for category ID:', categoryId);

    this.licenseSubCategories = this.allSubCategories.filter(sub => sub.category === categoryId);

    console.log('✅ Filtered subcategories count:', this.licenseSubCategories.length);

    if (this.licenseSubCategories.length === 0) {
      console.warn('⚠️ No subcategories found for category:', categoryId);
    }

    // Check if current subcategory is still valid for the new category
    const currentSubCategory = this.keyInfoForm.get('licenseSubCategory')?.value;
    if (currentSubCategory) {
      const isValid = this.licenseSubCategories.some(s => s.id === currentSubCategory);
      if (!isValid) {
        console.log('⚠️ Current subcategory not valid for new category, resetting');
        this.keyInfoForm.patchValue({ licenseSubCategory: null }, { emitEvent: false });
      }
    }

    this.cdr.detectChanges();
  }

  /**
   * Restore previously selected category from session storage
   */
  private restoreCategoryIfNeeded(): void {
    const stored = this.getFromSessionStorage();
    const categoryId = stored['licenseCategory'];
    
    if (categoryId && this.licenseCategories.some(c => c.id === categoryId)) {
      console.log('🔄 Restoring category:', categoryId);
      this.keyInfoForm.patchValue({ licenseCategory: categoryId }, { emitEvent: false });
      
      // Trigger filtering after a short delay to ensure subcategories are loaded
      setTimeout(() => {
        if (this.allSubCategories.length > 0) {
          this.filterSubCategories(categoryId);
        }
      }, 0);
    }
  }

  /**
   * Restore previously selected subcategory from session storage
   */
  private restoreSubcategoryIfNeeded(): void {
    const stored = this.getFromSessionStorage();
    const subCategoryId = stored['licenseSubCategory'];
    
    if (subCategoryId && this.licenseSubCategories.length > 0) {
      const isValid = this.licenseSubCategories.some(s => s.id === subCategoryId);
      if (isValid) {
        console.log('🔄 Restoring subcategory:', subCategoryId);
        this.keyInfoForm.patchValue({ licenseSubCategory: subCategoryId }, { emitEvent: false });
      }
    }
  }

  /**
   * Get stored form data from session storage
   */
  private getFromSessionStorage(): Partial<any> {
    const storedData = sessionStorage.getItem('keyInfoData');
    return storedData ? JSON.parse(storedData) : {};
  }

  /**
   * Save form data to session storage with backend field names
   */
  private saveToSessionStorage(): void {
    const formData = this.keyInfoForm.getRawValue();
    
    // ✅ Map to backend field names
    const backendData = {
      // Keep original for restoration
      licenseCategory: formData.licenseCategory,
      licenseSubCategory: formData.licenseSubCategory,
      establishmentName: formData.establishmentName,
      siteType: formData.siteType,
      
      // Backend field names (PrimaryKeyRelatedField expects IDs)
      license_category: formData.licenseCategory,
      license_sub_category: formData.licenseSubCategory,
      establishment_name: formData.establishmentName,
      site_type: formData.siteType
    };
    
    console.log('💾 Saving Key Info:', backendData);
    sessionStorage.setItem('keyInfoData', JSON.stringify(backendData));
  }

  /**
   * Update error message for a specific field
   */
  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
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

  /**
   * Update all error messages
   */
  private updateAllErrorMessages(): void {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  /**
   * Get error message for a field
   */
  getErrorMessage(field: keyof typeof this.errorMessages): string {
    return this.errorMessages[field]();
  }

  /**
   * Proceed to next step
   */
  proceedToNext(): void {
    if (this.keyInfoForm.valid) {
      this.next.emit();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.keyInfoForm.controls).forEach(key => {
        this.keyInfoForm.get(key)?.markAsTouched();
      });
    }
  }

  /**
   * Reset form and clear session storage
   */
  resetForm(): void {
    this.keyInfoForm.reset();
    this.licenseSubCategories = [];
    sessionStorage.removeItem('keyInfoData');
  }

  /**
   * Go back to previous step
   */
  goBack(): void {
    this.back.emit();
  }
}