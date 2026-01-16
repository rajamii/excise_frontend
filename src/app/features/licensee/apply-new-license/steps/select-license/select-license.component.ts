import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseType } from '../../../../../core/models/license-type.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AccountService } from '../../../../../core/services/account.service';

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

  private destroy$ = new Subject<void>();

  errorMessages = {
    licenseType: signal(''),
  };

  constructor(
    private fb: FormBuilder, 
    private masterService: MasterService,
    private accountService: AccountService
  ) {
    const storedValues: any = this.getFromSessionStorage();

    this.selectLicenseForm = this.fb.group({
      licenseType: new FormControl(storedValues.licenseType, [Validators.required]),
    });

    this.selectLicenseForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
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
        
        // ✅ Save to sessionStorage for later use
        sessionStorage.setItem('licenseTypes', JSON.stringify(data));
        console.log('✅ License types loaded and saved:', data.length);
      },
      error: (error) => {
        console.error('❌ Failed to load license types:', error);
      }
    });
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('selectLicenseData');
    if (!storedData) return {};
    const parsed = JSON.parse(storedData);
    return parsed;
  }

  private saveToSessionStorage() {
    const formData = this.selectLicenseForm.getRawValue();
    
    const dataToSave = {
      licenseType: formData.licenseType,
      license_type: formData.licenseType
    };
    
    console.log('💾 Saving Select License Data:', dataToSave);
    sessionStorage.setItem('selectLicenseData', JSON.stringify(dataToSave));
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
      this.saveToSessionStorage();
      this.next.emit();
    }
  }
  
  resetForm() {
    this.selectLicenseForm.reset();
    sessionStorage.removeItem('selectLicenseData');
  }
}