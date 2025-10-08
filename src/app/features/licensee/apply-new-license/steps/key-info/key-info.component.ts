import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseType } from '../../../../../core/models/license-type.model';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LicenseSubcategory } from '../../../../../core/models/license-subcategory.model';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { DatePipe } from '@angular/common';
import { MasterService } from '../../../../../core/services/master.service';

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
 
  licenseCategories: LicenseCategory[] = [];
  licenseSubcategories: LicenseSubcategory[] = [];
  filteredSubcategories: LicenseSubcategory[] = [];
  licenseNatures: string[] = ['Regular', 'Temporary', 'Seasonal', 'Special Event'];
  functioningStatuses: string[] = ['Yes', 'No'];
  modeOfOperations: string[] = ['Self', 'Salesman', 'Barman'];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  errorMessages = {

    licenseCategory: signal(''),
    licenseSubCategory: signal(''),
    establishmentName: signal(''),
    // mobileNumber: signal(''),
    // email: signal(''),
    // licenseNo: signal(''),
    // initialGrantDate: signal(''),
    // renewedFrom: signal(''),
    // validUpTo: signal(''),
    // yearlyLicenseFee: signal(''),
    licenseNature: signal(''),
    functioningStatus: signal(''),
    modeOfOperation: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    private datePipe: DatePipe
  ) {
    const storedValues = this.getFromSessionStorage();

    this.keyInfoForm = this.fb.group({
      
      licenseCategory: new FormControl(storedValues.licenseCategory || '', [Validators.required]),
      licenseSubCategory: new FormControl(storedValues.licenseSubCategory || '', [Validators.required]),
      establishmentName: new FormControl(storedValues.establishmentName || '', [
        Validators.required,
        Validators.maxLength(150),
        Validators.pattern(PatternConstants.ORGANISATION_NAME),
      ]),
      // mobileNumber: new FormControl(storedValues.mobileNumber || '', [
      //   Validators.required,
      //   Validators.pattern(PatternConstants.MOBILE)
      // ]),
      // email: new FormControl(storedValues.email || '', [
      //   Validators.required,
      //   Validators.pattern(PatternConstants.EMAIL)
      // ]),
      // licenseNo: new FormControl(storedValues.licenseNo || '', [
      //   Validators.pattern(PatternConstants.CODE),
      //   Validators.maxLength(50)
      // ]),
      // initialGrantDate: new FormControl(storedValues.initialGrantDate || null),
      // renewedFrom: new FormControl(storedValues.renewedFrom || null),
      // validUpTo: new FormControl(storedValues.validUpTo || null),
      // yearlyLicenseFee: new FormControl(storedValues.yearlyLicenseFee || '', [
      //   Validators.pattern(PatternConstants.NUMBER)
      // ]),
      licenseNature: new FormControl(storedValues.licenseNature || '', [Validators.required]),
      functioningStatus: new FormControl(storedValues.functioningStatus || '', [Validators.required]),
      modeOfOperation: new FormControl(storedValues.modeOfOperation || '', [Validators.required])
    });

    this.keyInfoForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });

    // Listen for licenseCategory changes to update subcategories
    this.keyInfoForm.get('licenseCategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(categoryId => {
        this.onCategoryChange(categoryId);
      });
  }

  ngOnInit() {
    this.loadDropdownData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDropdownData(): void {
    

    this.masterService.getLicenseCategories().subscribe({
      next: (data: LicenseCategory[]) => {
        this.licenseCategories = data;
        const storedCategoryId = this.keyInfoForm.get('licenseCategory')?.value;
        if (storedCategoryId) {
          this.onCategoryChange(storedCategoryId);
        }
      },
      error: (error) => {
        console.error('Failed to load license categories.', error);
      }
    });

    this.masterService.getLicenseSubcategories().subscribe({
      next: (data: LicenseSubcategory[]) => {
        this.licenseSubcategories = data;
        const storedCategoryId = this.keyInfoForm.get('licenseCategory')?.value;
        if (storedCategoryId) {
          this.filteredSubcategories = this.filterSubcategories(storedCategoryId);
          const storedSubCategoryId = this.keyInfoForm.get('licenseSubCategory')?.value;
          if (storedSubCategoryId && !this.filteredSubcategories.find(sub => sub.id === storedSubCategoryId)) {
            this.keyInfoForm.get('licenseSubCategory')?.setValue('');
          }
        }
      },
      error: (error) => {
        console.error('Failed to load license subcategories.', error);
      }
    });
  }

  onCategoryChange(categoryId: number | string): void {
    const id = Number(categoryId);
    if (!isNaN(id)) {
      this.filteredSubcategories = this.filterSubcategories(id);
      // Reset subcategory if the current value is invalid for the new category
      const currentSubCategoryId = this.keyInfoForm.get('licenseSubCategory')?.value;
      if (currentSubCategoryId && !this.filteredSubcategories.find(sub => sub.id === currentSubCategoryId)) {
        this.keyInfoForm.get('licenseSubCategory')?.setValue('');
      }
    } else {
      this.filteredSubcategories = [];
      this.keyInfoForm.get('licenseSubCategory')?.setValue('');
    }
    this.saveToSessionStorage();
  }

  private filterSubcategories(categoryId: number): LicenseSubcategory[] {
    return this.licenseSubcategories.filter(sub => {
      // Handle cases where category is a number or LicenseCategory object
      if (typeof sub.category === 'number') {
        return sub.category === categoryId;
      } else if (sub.category && typeof sub.category === 'object' && 'id' in sub.category) {
        return sub.category.id === categoryId;
      }
      return false;
    });
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('keyInfoData');
    return storedData ? JSON.parse(storedData) as Partial<LicenseApplication> : {};
  }

  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.keyInfoForm.getRawValue();
    const parsedDates = {
      initialGrantDate: this.transformValidDate(formData.initialGrantDate),
      renewedFrom: this.transformValidDate(formData.renewedFrom),
      validUpTo: this.transformValidDate(formData.validUpTo),
    };
    sessionStorage.setItem(
      'keyInfoData',
      JSON.stringify({
        ...formData,
        ...parsedDates
      })
    );
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
      this.errorMessages[field].set('Input exceeds maximum length');
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
    this.filteredSubcategories = [];
    sessionStorage.removeItem('keyInfoData');
  }

  goBack() {
    this.back.emit();
  }
}