import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, computed, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { MasterService } from '../../../../../core/services/master.service';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';
import { AdminService } from '../../../../admin/admin.service';
import { PaymentIntegrationService } from '../../../../../core/services/payment-integration.service';

@Component({
  selector: 'app-key-info',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './key-info.component.html',
  styleUrls: ['./key-info.component.scss']
})
export class KeyInfoComponent implements OnInit, OnDestroy {

  keyInfoForm: FormGroup;

  // Additional charges (from master additional charge configurations)
  showPachwai = signal(false);
  showDraughtBeer = signal(false);
  showMiniBar = signal(false);
  pachwaiAmount = signal<number>(3000);
  draughtBeerAmount = signal<number>(5000);
  miniBarAmount = signal<number>(1000);
  shouldShowAdditionalCharges = computed(() => this.showPachwai() || this.showDraughtBeer() || this.showMiniBar());
  
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
    siteType: signal(''),
    existingSiteLicense: signal(''),
    miniBarQuantity: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    private adminService: AdminService,
    private paymentService: PaymentIntegrationService,
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
      pachwai: new FormControl(!!(storedValues['pachwai'] ?? storedValues['pachwai_flag'] ?? storedValues['pachwai_selected'])),
      draughtBeer: new FormControl(!!(storedValues['draughtBeer'] ?? storedValues['draught_beer'])),
      miniBar: new FormControl(!!(storedValues['miniBar'] ?? storedValues['mini_bar'])),
      miniBarQuantity: new FormControl(storedValues['miniBarQuantity'] ?? storedValues['mini_bar_quantity'] ?? 0),
      establishmentName: new FormControl(storedValues['establishmentName'] ?? '', [
        Validators.required,
        Validators.maxLength(150),
        Validators.pattern(PatternConstants.ORGANISATION_NAME),
      ]),
      siteType: new FormControl(storedValues['siteType'] ?? null, Validators.required),
      existingSiteLicense: new FormControl(storedValues['existingSiteLicense'] ?? storedValues['existing_site_license'] ?? '')
    });

    this.setupSiteTypeValidation();

    const qtyCtrl = this.keyInfoForm.get('miniBarQuantity');
    this.keyInfoForm.get('miniBar')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(miniBar => {
        if (miniBar) {
          qtyCtrl?.setValidators([Validators.required, Validators.min(1)]);
          if (!qtyCtrl?.value) {
            qtyCtrl?.setValue(1, { emitEvent: false });
          }
        } else {
          qtyCtrl?.clearValidators();
          qtyCtrl?.setValue(0, { emitEvent: false });
        }
        qtyCtrl?.updateValueAndValidity({ emitEvent: false });
      });

    if (this.keyInfoForm.get('miniBar')?.value) {
      qtyCtrl?.setValidators([Validators.required, Validators.min(1)]);
      qtyCtrl?.updateValueAndValidity({ emitEvent: false });
    }

    this.keyInfoForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateAllErrorMessages();
      });
  }

  ngOnInit(): void {
       
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
          this.loadCategoryAdditionalCharges(Number(categoryId));
        } else {
          subCategoryCtrl?.disable();
          this.licenseSubCategories = [];
          this.keyInfoForm.patchValue({ licenseSubCategory: null }, { emitEvent: false });
          this.loadCategoryAdditionalCharges(0);
        }
      });
    this.loadAdditionalChargeAmounts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  
  //Load license categories from API
  private loadDropdownData(): void {
    this.masterService.getLicenseCategories().subscribe({
      next: (data: LicenseCategory[]) => {
        this.licenseCategories = data
          .filter(item => item.isActive !== false)
          .map(item => ({
            id: item.id ?? 0,
            licenseCategory: item.licenseCategory,
            description: item.description ?? ''
          }));        
        sessionStorage.setItem('licenseCategories', JSON.stringify(this.licenseCategories));
        this.restoreCategoryIfNeeded();
      },
      error: (err) => console.error('Failed to load license categories', err)
    });
  }

  //Load ALL subcategories from API and store them   
  private loadAllSubCategories(): void {
    this.masterService.getLicenseSubcategories().subscribe({
      next: (data: any[]) => {
        console.log('📦 Raw subcategories from API:', data);
        
        this.allSubCategories = data
          .filter(d => d.isActive !== false && d.is_active !== false)
          .map(d => {
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
            console.warn('No category field found in subcategory:', d);
            categoryId = 0;
          }
            
          const subcategory: LicenseSubcategory = {
            id: d.id ?? 0,
            description: d.description ?? '',
            category: categoryId
          };
          
          return subcategory;
        });

        // Filter based on current category selection
        const currentCategory = this.keyInfoForm.get('licenseCategory')?.value;
        if (currentCategory) {
          this.filterSubCategories(currentCategory);
        }
        
        sessionStorage.setItem('licenseSubcategories', JSON.stringify(this.allSubCategories));
        this.restoreSubcategoryIfNeeded();
      },
      error: (err) => console.error('Failed to load subcategories', err)
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
    this.licenseSubCategories = this.allSubCategories.filter(sub => sub.category === categoryId);
    if (this.licenseSubCategories.length === 0) {
      console.warn('No subcategories found for category:', categoryId);
    }

    // Check if current subcategory is still valid for the new category
    const currentSubCategory = this.keyInfoForm.get('licenseSubCategory')?.value;
    if (currentSubCategory) {
      const isValid = this.licenseSubCategories.some(s => s.id === currentSubCategory);
      if (!isValid) {
        console.log('Current subcategory not valid for new category, resetting');
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
      this.keyInfoForm.patchValue({ licenseCategory: categoryId }, { emitEvent: false });
      
      this.loadCategoryAdditionalCharges(Number(categoryId));

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
    
    // Map to backend field names
    const backendData = {
      // Keep original for restoration
      licenseCategory: formData.licenseCategory,
      licenseSubCategory: formData.licenseSubCategory,
      establishmentName: formData.establishmentName,
      siteType: formData.siteType,
      existingSiteLicense: formData.siteType === 'Existing' ? formData.existingSiteLicense : null,
      pachwai: !!formData.pachwai,
      draughtBeer: !!formData.draughtBeer,
      miniBar: !!formData.miniBar,
      miniBarQuantity: formData.miniBar ? Number(formData.miniBarQuantity || 0) : 0,
       
      // Backend field names (PrimaryKeyRelatedField expects IDs)
      license_category: formData.licenseCategory,
      license_category_name: this.getLicenseCategoryName(formData.licenseCategory),
      license_sub_category: formData.licenseSubCategory,
      license_sub_category_name: this.getLicenseSubcategoryName(formData.licenseSubCategory),
      establishment_name: formData.establishmentName,
      site_type: formData.siteType,
      existing_site_license: formData.siteType === 'Existing' ? formData.existingSiteLicense : null,
      pachwai_flag: !!formData.pachwai,
      pachwai_selected: !!formData.pachwai,
      draught_beer: !!formData.draughtBeer,
      mini_bar: !!formData.miniBar,
      mini_bar_quantity: formData.miniBar ? Number(formData.miniBarQuantity || 0) : 0,
    };
    
    console.log('Saving Key Info:', backendData);
    sessionStorage.setItem('keyInfoData', JSON.stringify(backendData));
  }

  loadCategoryAdditionalCharges(categoryId: number): void {
    if (!categoryId) {
      this.showPachwai.set(false);
      this.showDraughtBeer.set(false);
      this.showMiniBar.set(false);
      this.keyInfoForm.patchValue({ pachwai: false, draughtBeer: false, miniBar: false, miniBarQuantity: 0 }, { emitEvent: false });
      return;
    }

    this.adminService.getAdditionalChargeConfigs(categoryId).subscribe({
      next: (configs: any[]) => {
        let hasPachwai = false;
        let hasDraughtBeer = false;
        let hasMiniBar = false;

        configs.forEach(config => {
          if (config.chargeType === 'pachwai') {
            if (config.isActive) {
              this.showPachwai.set(true);
              hasPachwai = true;
            } else {
              this.showPachwai.set(false);
            }
          } else if (config.chargeType === 'draught_beer') {
            if (config.isActive) {
              this.showDraughtBeer.set(true);
              hasDraughtBeer = true;
            } else {
              this.showDraughtBeer.set(false);
            }
          } else if (config.chargeType === 'mini_bar') {
            if (config.isActive) {
              this.showMiniBar.set(true);
              hasMiniBar = true;
            } else {
              this.showMiniBar.set(false);
            }
          }
        });

        // If a config is missing or deactivated, clear its checked state
        if (!hasPachwai) {
          this.showPachwai.set(false);
          this.keyInfoForm.patchValue({ pachwai: false }, { emitEvent: false });
        }
        if (!hasDraughtBeer) {
          this.showDraughtBeer.set(false);
          this.keyInfoForm.patchValue({ draughtBeer: false }, { emitEvent: false });
        }
        if (!hasMiniBar) {
          this.showMiniBar.set(false);
          this.keyInfoForm.patchValue({ miniBar: false, miniBarQuantity: 0 }, { emitEvent: false });
        }

        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Failed to load additional charge configs', err);
        this.showPachwai.set(false);
        this.showDraughtBeer.set(false);
        this.showMiniBar.set(false);
        this.keyInfoForm.patchValue({ pachwai: false, draughtBeer: false, miniBar: false, miniBarQuantity: 0 }, { emitEvent: false });
      }
    });
  }

  private getLicenseCategoryName(categoryId: number | string | null): string | null {
    if (!categoryId) return null;
    const matchedCategory = this.licenseCategories.find(category => Number(category.id) === Number(categoryId));
    return matchedCategory?.licenseCategory ?? null;
  }

  private getLicenseSubcategoryName(subcategoryId: number | string | null): string | null {
    if (!subcategoryId) return null;
    const matchedSubcategory = this.allSubCategories.find(subcategory => Number(subcategory.id) === Number(subcategoryId));
    return matchedSubcategory?.description ?? null;
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
      this.errorMessages[field].set(field === 'existingSiteLicense' ? 'Maximum 100 characters allowed' : 'Maximum 150 characters allowed');
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

  private setupSiteTypeValidation(): void {
    const existingSiteLicenseControl = this.keyInfoForm.get('existingSiteLicense');

    this.keyInfoForm.get('siteType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((siteType) => {
        if (siteType === 'Existing') {
          existingSiteLicenseControl?.setValidators([Validators.required, Validators.maxLength(100)]);
        } else {
          existingSiteLicenseControl?.clearValidators();
          existingSiteLicenseControl?.setValue('', { emitEvent: false });
        }

        existingSiteLicenseControl?.updateValueAndValidity({ emitEvent: false });
      });

    const currentSiteType = this.keyInfoForm.get('siteType')?.value;
    if (currentSiteType === 'Existing') {
      existingSiteLicenseControl?.setValidators([Validators.required, Validators.maxLength(100)]);
      existingSiteLicenseControl?.updateValueAndValidity({ emitEvent: false });
    }
  }

  /**
   * Proceed to next step
   */
  proceedToNext(): void {
    if (this.keyInfoForm.valid) {
      this.saveToSessionStorage();
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

  private loadAdditionalChargeAmounts(): void {
    this.paymentService.getPaymentModule('NLI_ADD_PACHWAI').subscribe({
      next: (res: any) => {
        const amount = Number(res?.license_fee ?? res?.licenseFee ?? res?.fee ?? res?.amount);
        if (isFinite(amount) && amount > 0) this.pachwaiAmount.set(amount);
      },
      error: () => {
        this.pachwaiAmount.set(3000);
      }
    });

    this.paymentService.getPaymentModule('NLI_ADD_DRAUGHT_BEER').subscribe({
      next: (res: any) => {
        const amount = Number(res?.license_fee ?? res?.licenseFee ?? res?.fee ?? res?.amount);
        if (isFinite(amount) && amount > 0) this.draughtBeerAmount.set(amount);
      },
      error: () => {
        this.draughtBeerAmount.set(5000);
      }
    });

    this.paymentService.getPaymentModule('NLI_ADD_MINI_BAR').subscribe({
      next: (res: any) => {
        const amount = Number(res?.license_fee ?? res?.licenseFee ?? res?.fee ?? res?.amount);
        if (isFinite(amount) && amount > 0) this.miniBarAmount.set(amount);
      },
      error: () => {
        this.miniBarAmount.set(1000);
      }
    });
  }
}
