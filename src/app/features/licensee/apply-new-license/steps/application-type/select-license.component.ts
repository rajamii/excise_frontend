import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseType } from '../../../../../core/models/license-type.model';
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
  licenseTypes: LicenseType[] = [];

  // Event emitters for navigation
  // @Output() licenseTypeChanged = new EventEmitter<string>();
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  // Used to unsubscribe from observables
  private destroy$ = new Subject<void>();

  // Signal-based error messages
  errorMessages = {
    licenseTypes: signal(''),
  };

  constructor(private fb: FormBuilder, private masterService: MasterService) {
    // Preload saved data from session storage
    const storedValues = this.getFromSessionStorage();

    // Initialize form group with default or stored values
    this.selectLicenseForm = this.fb.group({
      licenseTypes: new FormControl(storedValues.licenseType, [Validators.required]),
    });

    // Save form to session storage on change and update validation messages
    this.selectLicenseForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  // Lifecycle hook - Component init
  ngOnInit() {
    this.loadData();
  }

  // Lifecycle hook - Cleanup
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load data for License Type dropdown from service
  private loadData(): void {
    this.masterService.getLicenseTypes().subscribe(
      (data: LicenseType[]) => {
        this.licenseTypes = data;
      },
      error => {
        console.error('Failed to load license types.', error);
      }
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
      console.log('Selected License Type:', this.selectLicenseForm.value.licenseTypes);
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
