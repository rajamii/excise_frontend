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
  selectLicenseForm: FormGroup;
  licenseTypes: LicenseType[] = [];
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();
  private destroy$ = new Subject<void>();

  errorMessages = {
    licenseType: signal(''),
  };

  constructor(private fb: FormBuilder, private masterService: MasterService) {
    const storedValues = this.getFromSessionStorage();

    this.selectLicenseForm = this.fb.group({
      licenseType: new FormControl(storedValues.licenseType || '', [Validators.required]),
    });

    this.selectLicenseForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
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

  private loadData(): void {
    this.masterService.getLicenseTypes().subscribe({
      next: (data: LicenseType[]) => {
        this.licenseTypes = data;
      },
      error: (error) => {
        console.error('Failed to load license types.', error);
      }
    });
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('selectLicenseData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
  }

  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.selectLicenseForm.getRawValue();
    sessionStorage.setItem('selectLicenseData', JSON.stringify(formData));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.selectLicenseForm.get(field);
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

  proceedToNext() {
    if (this.selectLicenseForm.valid) {
      console.log('Selected License Type:', this.selectLicenseForm.value.licenseType);
      this.next.emit();
    }
  }

  resetForm() {
    this.selectLicenseForm.reset();
    sessionStorage.removeItem('selectLicenseData');
  }

  goBack() {
    this.back.emit();
  }
}