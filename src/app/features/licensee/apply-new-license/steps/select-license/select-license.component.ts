import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
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

  // License types: Individual, Multiple Individual, Company
  licenseTypes: LicenseType[] = [];

  // Event emitter for navigation to next step
  @Output() readonly next = new EventEmitter<void>();

  // Subject used to unsubscribe from observables on component destroy
  private destroy$ = new Subject<void>();

  // Signal-based error messages for reactive UI updates
  errorMessages = {
    licenseType: signal(''),
  };

  constructor(
    private fb: FormBuilder, 
    private masterService: MasterService
  ) {
    // Preload saved data from session storage if available
    const storedValues = this.getFromSessionStorage();

    // Initialize form group with validators
    this.selectLicenseForm = this.fb.group({
      licenseType: new FormControl(storedValues.licenseType, [Validators.required]),
    });

    // Subscribe to form value changes to auto-save to session storage
    this.selectLicenseForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load license types from backend service
   */
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

  /**
   * Retrieve stored form data from sessionStorage
   */
  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('selectLicenseData');
    return storedData ? JSON.parse(storedData) : {};
  }

  /**
   * Save current form data to sessionStorage
   */
  private saveToSessionStorage() {
    const formData = this.selectLicenseForm.getRawValue(); 
    sessionStorage.setItem('selectLicenseData', JSON.stringify(formData));
  }

  /**
   * Update error message for a specific form field
   */
  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.selectLicenseForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else {
      this.errorMessages[field].set('');
    }
  }

  /**
   * Update all error messages
   */
  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  /**
   * Get error message for display in template
   */
  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  /**
   * Proceed to next step if form is valid
   */
  proceedToNext() {
    if (this.selectLicenseForm.valid) {
      console.log('Selected License Type:', this.selectLicenseForm.value.licenseType);
      this.next.emit();
    }
  }
  
  /**
   * Reset form and clear session storage
   */
  resetForm() {
    this.selectLicenseForm.reset();
    sessionStorage.removeItem('selectLicenseData');
  }
}