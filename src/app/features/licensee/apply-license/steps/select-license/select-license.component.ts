import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { District } from '../../../../../core/models/district.model';
import { Subdivision } from '../../../../../core/models/subdivision.model';
import { LicenseCategory } from '../../../../../core/models/license-category.model';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { MasterService } from '../../../../../core/services/master.service';

@Component({
  selector: 'app-select-license',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './select-license.component.html',
  styleUrl: './select-license.component.scss',
})
export class SelectLicenseComponent implements OnInit, OnDestroy {
  // Reactive form instance
  selectLicenseForm: FormGroup;

  // Dropdown data
  districts: District[] = [];
  private subdivisions: Subdivision[] = [];
  filteredSubdivisions: Subdivision[] = [];
  licenseCategories: LicenseCategory[] = [];

  // Static license types
  licenses: string[] = ['New', 'License A', 'License B', 'License C'];

  // Event emitters for navigation
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  // Used to unsubscribe from observables
  private destroy$ = new Subject<void>();

  // Signal-based error messages
  errorMessages = {
    exciseDistrict: signal(''),
    licenseCategory: signal(''),
    exciseSubdivision: signal(''),
    license: signal('')
  };

  constructor(private fb: FormBuilder, private masterService: MasterService) {
    // Preload saved data from session storage
    const storedValues = this.getFromSessionStorage();

    // Initialize form group with default or stored values
    this.selectLicenseForm = this.fb.group({
      exciseDistrict: new FormControl(storedValues.exciseDistrict, [Validators.required]),
      licenseCategory: new FormControl(storedValues.licenseCategory, [Validators.required]),
      exciseSubdivision: new FormControl(storedValues.exciseSubdivision, [Validators.required]),
      license: new FormControl(storedValues.license || 'New', [Validators.required]),
    });

    // Save form to session storage on change and update validation messages
    this.selectLicenseForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  // Lifecycle hook - Component init
  ngOnInit() {
    this.loadDropdownData();
  }

  // Lifecycle hook - Cleanup
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load dropdown values from service
  private loadDropdownData(): void {
    this.masterService.getDistrict().subscribe({
      next: (data: District[]) => this.districts = data,
      error: (error) => console.error('Error fetching districts:', error)
    });

    this.masterService.getSubdivision().subscribe({
      next: (data: Subdivision[]) => {
        this.subdivisions = data;

        // After loading subdivisions, trigger filtering using saved district
        const storedDistrict = this.selectLicenseForm.get('exciseDistrict')?.value;
        if (storedDistrict) {
          this.onDistrictChange(storedDistrict);
        }
      },
      error: (error) => console.error('Failed to load subdivisions.', error)
    });

    this.masterService.getLicenseCategories().subscribe({
      next: (data: LicenseCategory[]) => this.licenseCategories = data,
      error: (error) => console.error('Failed to load license categories.', error)
    });
  }

  // Filter sub-divisions when district changes
  onDistrictChange(selectedDistrictCode: number): void {
    this.filteredSubdivisions = this.subdivisions.filter(
      subdiv => subdiv.districtCode === selectedDistrictCode
    );
  }

  // Read form data from session storage
  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('selectLicenseData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
  }

  // Save form data to session storage
  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.selectLicenseForm.getRawValue(); 
    sessionStorage.setItem('selectLicenseData', JSON.stringify(formData));
  }

  // Update specific field error message
  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.selectLicenseForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else {
      this.errorMessages[field].set('');
    }
  }

  // Update all field error messages
  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  // Used in template to retrieve error message
  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  // Emit event if form is valid
  proceedToNext() {
    if (this.selectLicenseForm.valid) {
      this.next.emit();
    }
  }
  
  // Reset form and remove saved session data
  resetForm() {
    this.selectLicenseForm.reset();
    sessionStorage.removeItem('selectLicenseData');
  }

  // Emit back navigation
  goBack() {
    this.back.emit();
  }
}
