import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../../../shared/material.module';
import { CommonModule } from '@angular/common';

interface District {
  id: number;
  name: string;
  code: string;
}

interface LicenseCategory {
  id: number;
  name: string;
  description: string;
}

interface Licensee {
  id: number;
  licensee_id: string;
  establishment_name: string;
  license_category: string;
  district: string;
  status: string;
}

interface ModeOfOperation {
  value: string;
  label: string;
  code: string;
}

@Component({
  selector: 'app-license',
  standalone: true,
  imports: [MaterialModule, ReactiveFormsModule, CommonModule],
  templateUrl: './license.component.html',
  styleUrl: './license.component.scss'
})
export class LicenseComponent implements OnInit {
  @Output() next = new EventEmitter<void>();

  applicationForm: FormGroup;

  // Sample data - replace with actual service calls
  districts: District[] = [
    { id: 1, name: 'East Sikkim', code: 'ES' },
    { id: 2, name: 'West Sikkim', code: 'WS' },
    { id: 3, name: 'North Sikkim', code: 'NS' },
    { id: 4, name: 'South Sikkim', code: 'SS' }
  ];

  licenseCategories: LicenseCategory[] = [
    { id: 1, name: 'Retail Liquor License', description: 'For retail sale of liquor' },
    { id: 2, name: 'Bar License', description: 'For serving liquor in bars/restaurants' },
    { id: 3, name: 'Wholesale License', description: 'For wholesale distribution' },
    { id: 4, name: 'Hotel License', description: 'For hotels and resorts' }
  ];

  licensees: Licensee[] = [
    {
      id: 1,
      licensee_id: 'LIC001/2024-25',
      establishment_name: 'ABC Liquor Store',
      license_category: 'Retail',
      district: 'East Sikkim',
      status: 'Active'
    },
    {
      id: 2,
      licensee_id: 'LIC002/2024-25',
      establishment_name: 'XYZ Bar & Restaurant',
      license_category: 'Bar',
      district: 'West Sikkim',
      status: 'Active'
    },
    {
      id: 3,
      licensee_id: 'LIC003/2024-25',
      establishment_name: 'Mountain View Hotel',
      license_category: 'Hotel',
      district: 'North Sikkim',
      status: 'Active'
    }
  ];

  modesOfOperation: ModeOfOperation[] = [
    { value: 'salesman', label: 'Salesman', code: 'SM' },
    { value: 'barman', label: 'Barman', code: 'BM' }
  ];

  filteredLicensees: Licensee[] = [];
  currentFinancialYear = this.getCurrentFinancialYear();

  constructor(private fb: FormBuilder) {
    this.applicationForm = this.fb.group({
      financialYear: [this.currentFinancialYear, Validators.required],
      district: ['', Validators.required],
      licenseCategory: ['', Validators.required],
      licensee: ['', Validators.required],
      modeOfOperation: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadSavedData();
    this.setupFormSubscriptions();
  }

  getCurrentFinancialYear(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    if (currentMonth >= 4) { // April onwards
      return `${currentYear}-${(currentYear + 1).toString().substring(2)}`;
    } else { // January to March
      return `${currentYear - 1}-${currentYear.toString().substring(2)}`;
    }
  }

  setupFormSubscriptions() {
    // Filter licensees based on district and license category selection
    this.applicationForm.get('district')?.valueChanges.subscribe(() => {
      this.filterLicensees();
    });

    this.applicationForm.get('licenseCategory')?.valueChanges.subscribe(() => {
      this.filterLicensees();
    });
  }

  filterLicensees() {
    const selectedDistrict = this.applicationForm.get('district')?.value;
    const selectedCategory = this.applicationForm.get('licenseCategory')?.value;

    if (selectedDistrict && selectedCategory) {
      const districtName = this.getDistrictName(selectedDistrict);
      const categoryName = this.getLicenseCategoryName(selectedCategory);

      this.filteredLicensees = this.licensees.filter(licensee =>
        licensee.district === districtName &&
        licensee.license_category === categoryName &&
        licensee.status === 'Active'
      );

      // Reset licensee selection if current selection is not in filtered list
      const currentLicensee = this.applicationForm.get('licensee')?.value;
      if (currentLicensee && !this.filteredLicensees.find(l => l.id.toString() === currentLicensee)) {
        this.applicationForm.get('licensee')?.setValue('');
      }
    } else {
      this.filteredLicensees = [];
      this.applicationForm.get('licensee')?.setValue('');
    }
  }

  loadSavedData() {
    const savedData = sessionStorage.getItem('applicationDetails');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        this.applicationForm.patchValue(parsedData);

        // Trigger filtering after loading saved data
        setTimeout(() => {
          this.filterLicensees();
        }, 0);
      } catch (error) {
        console.error('Error loading saved application data:', error);
      }
    }
  }

  onSubmit() {
    if (this.applicationForm.valid) {
      const formData = this.applicationForm.value;

      // Generate application ID
      const applicationId = this.generateApplicationId();

      // Enhance form data with additional details
      const enhancedData = {
        ...formData,
        applicationId,
        applicationDate: new Date().toISOString().split('T')[0],
        applicationType: formData.modeOfOperation === 'salesman' ? 'Salesman Registration' : 'Barman Registration',

        // Add descriptive names
        districtName: this.getDistrictName(formData.district),
        licenseCategoryName: this.getLicenseCategoryName(formData.licenseCategory),
        licenseeDetails: this.getLicenseeDetails(formData.licensee),
        modeOfOperationLabel: this.getModeOfOperationLabel(formData.modeOfOperation),

        // Application status tracking
        applicationStatus: '01', // Draft
        applicationPendingWith: null,
        applicationEnteredBy: 'APPLICANT', // This would come from user session
        applicationFee: this.calculateApplicationFee(formData.modeOfOperation),
        applicationPaymentFlag: 'N'
      };

      // Save to sessionStorage
      sessionStorage.setItem('applicationDetails', JSON.stringify(enhancedData));

      // Also save individual items for backward compatibility with your existing components
      Object.keys(enhancedData).forEach(key => {
        const value = enhancedData[key as keyof typeof enhancedData];
        if (typeof value === 'object') {
          sessionStorage.setItem(key, JSON.stringify(value));
        } else {
          sessionStorage.setItem(key, value?.toString() || '');
        }
      });

      console.log('Application details saved:', enhancedData);
      this.next.emit();
    } else {
      this.markFormGroupTouched();
    }
  }

  generateApplicationId(): string {
    const district = this.districts.find(d => d.id.toString() === this.applicationForm.value.district);
    const districtCode = district?.code || 'XX';
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const modeCode = this.modesOfOperation.find(m => m.value === this.applicationForm.value.modeOfOperation)?.code || 'XX';

    return `${districtCode}/${modeCode}/${year}/${randomNum}`;
  }

  calculateApplicationFee(modeOfOperation: string): number {
    // Define fee structure based on mode of operation
    const fees = {
      'salesman': 500,
      'barman': 500
    };
    return fees[modeOfOperation as keyof typeof fees] || 500;
  }

  getDistrictName(districtId: string): string {
    const district = this.districts.find(d => d.id.toString() === districtId);
    return district?.name || '';
  }

  getLicenseCategoryName(categoryId: string): string {
    const category = this.licenseCategories.find(c => c.id.toString() === categoryId);
    return category?.name || '';
  }

  getLicenseeDetails(licenseeId: string): Licensee | null {
    const licensee = this.licensees.find(l => l.id.toString() === licenseeId);
    return licensee || null;
  }

  getModeOfOperationLabel(modeValue: string): string {
    const mode = this.modesOfOperation.find(m => m.value === modeValue);
    return mode?.label || '';
  }

  markFormGroupTouched() {
    Object.keys(this.applicationForm.controls).forEach(key => {
      const control = this.applicationForm.get(key);
      control?.markAsTouched();
    });
  }

  // Template helper methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.applicationForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.applicationForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      financialYear: 'Financial Year',
      district: 'District',
      licenseCategory: 'License Category',
      licensee: 'Licensee',
      modeOfOperation: 'Mode of Operation'
    };
    return labels[fieldName] || fieldName;
  }
}