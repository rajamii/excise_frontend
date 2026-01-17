import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
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
  selectLicenseForm: FormGroup;

  districts: District[] = [];
  private subdivisions: Subdivision[] = [];
  filteredSubdivisions: Subdivision[] = [];
  licenseCategories: LicenseCategory[] = [];
  licenses: string[] = ['New'];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private dataLoaded = false;

  errorMessages = {
    excise_district: signal(''),
    license_category: signal(''),
    excise_subdivision: signal(''),
    license: signal('')
  };

  constructor(private fb: FormBuilder, private masterService: MasterService) {
    const storedValues = this.getFromSessionStorage();

    this.selectLicenseForm = this.fb.group({
      excise_district: new FormControl(storedValues.excise_district, [Validators.required]),
      license_category: new FormControl(storedValues.license_category, [Validators.required]),
      excise_subdivision: new FormControl(storedValues.excise_subdivision, [Validators.required]),
      license: new FormControl(storedValues.license || 'New', [Validators.required]),
    });

    this.selectLicenseForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    this.loadDropdownData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ CRITICAL: Load master data AND save to sessionStorage
   */
  private loadDropdownData(): void {
    forkJoin({
      districts: this.masterService.getDistrict(),
      subdivisions: this.masterService.getSubdivision(),
      licenseCategories: this.masterService.getLicenseCategories()
    }).subscribe({
      next: ({ districts, subdivisions, licenseCategories }) => {
        this.districts = districts;
        this.subdivisions = subdivisions;
        this.licenseCategories = licenseCategories;
        this.dataLoaded = true;
        
        // ✅ CRITICAL: Save master data to sessionStorage for later use
        sessionStorage.setItem('districts', JSON.stringify(districts));
        sessionStorage.setItem('subdivisions', JSON.stringify(subdivisions));
        sessionStorage.setItem('licenseCategories', JSON.stringify(licenseCategories));
        
        console.log('✅ Master data loaded and saved to sessionStorage');
        console.log('  Districts:', districts.length);
        console.log('  Subdivisions:', subdivisions.length);
        console.log('  License Categories:', licenseCategories.length);
        
        const storedDistrict = this.selectLicenseForm.get('excise_district')?.value;
        if (storedDistrict) {
          this.onDistrictChange(storedDistrict);
        }
      },
      error: (error) => {
        console.error('❌ Failed to load master data:', error);
      }
    });
  }

  onDistrictChange(districtId: number): void {
    if (!this.dataLoaded || this.districts.length === 0 || this.subdivisions.length === 0) {
      return;
    }
    
    const district = this.districts.find(d => d.id === districtId);
    
    if (!district) {
      console.warn('⚠️ District not found for ID:', districtId);
      this.filteredSubdivisions = [];
      return;
    }

    console.log('🔍 Filtering subdivisions for district code:', district.districtCode);
    
    this.filteredSubdivisions = this.subdivisions.filter(
      subdiv => subdiv.districtCode === district.districtCode
    );
    
    console.log('✅ Filtered subdivisions:', this.filteredSubdivisions.length);
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('selectLicenseData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
  }

  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.selectLicenseForm.getRawValue();
    
    console.log('💾 Saving selectLicenseData to sessionStorage:', formData);
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