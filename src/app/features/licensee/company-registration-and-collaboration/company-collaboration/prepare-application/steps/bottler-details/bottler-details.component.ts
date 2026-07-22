import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { PatternConstants } from '../../../../../../../shared/constants/pattern.constants';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationBottlerDetails
} from '../../../../../../../core/models/company-collaboration.model';
import { LicenseMeService } from '../../../../../../../core/services/license-me.service';
import { RoleService } from '../../../../../../../core/services/role.service';

@Component({
  selector: 'app-bottler-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './bottler-details.component.html',
  styleUrl: './bottler-details.component.scss'
})
export class BottlerDetailsComponent implements OnInit, OnDestroy {
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  bottlerDetailsForm: FormGroup;
  myActiveLicenses: any[] = [];
  isLoadingLicenses = true;

  countries: string[] = ['India', 'Nepal', 'Bhutan', 'China'];
  states: string[] = ['Sikkim', 'West Bengal', 'Bihar', 'Assam'];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private licenseMeService: LicenseMeService,
    private roleService: RoleService
  ) {
    const saved = this.getFromSessionStorage();
    const isDistributor = this.roleService.getCurrentUser()?.roleId === 16;
    const defaultBrandType = isDistributor ? 'Imported from other States/Country' : 'Manufactured in Sikkim';

    this.bottlerDetailsForm = this.fb.group({
      financialYear:             new FormControl(this.getCurrentFinancialYear(), [Validators.required]),
      brandOwnerName:            new FormControl(saved.brandOwnerName || '', [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      brandOwnerPan:             new FormControl(saved.brandOwnerPan || '', [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      brandOwnerOfficeAddress:   new FormControl(saved.brandOwnerOfficeAddress || '', [Validators.required, Validators.maxLength(500)]),
      brandOwnerFactoryAddress:  new FormControl(saved.brandOwnerFactoryAddress || '', [Validators.required, Validators.maxLength(500)]),
      brandOwnerMobile:          new FormControl(saved.brandOwnerMobile || '', [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      brandOwnerEmail:           new FormControl(saved.brandOwnerEmail || '', [Validators.required, Validators.pattern(PatternConstants.EMAIL)]),
      brandType:                 new FormControl(saved.brandType || defaultBrandType, [Validators.required]),
      license:                   new FormControl(saved.license || '', [Validators.required]),
      country:                   new FormControl(saved.country || 'India', [Validators.required]),
      state:                     new FormControl(saved.state || 'Sikkim', [Validators.required]),
      pinCode:                   new FormControl(saved.pinCode || '', [Validators.required, Validators.pattern(PatternConstants.PINCODE)])
    });

    this.bottlerDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.saveToSessionStorage());
  }

  ngOnInit(): void {
    this.loadLicenseTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentFinancialYear(): string {
    const now = new Date();
    const y = now.getFullYear();
    return (now.getMonth() + 1) >= 4
      ? `${y}-${(y + 1).toString().slice(-2)}`
      : `${y - 1}-${y.toString().slice(-2)}`;
  }

  private loadLicenseTypes(): void {
    this.isLoadingLicenses = true;
    this.licenseMeService.getMyLicenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.myActiveLicenses = (data || []).filter((l: any) => {
            const approved = l.isApproved !== undefined ? l.isApproved : (l.is_approved !== undefined ? l.is_approved : false);
            const expired = l.isExpired !== undefined ? l.isExpired : l.is_expired;
            const id = l.licenseId || l.license_id || '';
            return approved && !expired && id.startsWith('NA/');
          });
          this.isLoadingLicenses = false;

          if (this.myActiveLicenses.length === 1) {
            const singleLicense = this.myActiveLicenses[0].licenseId || this.myActiveLicenses[0].license_id;
            this.bottlerDetailsForm.patchValue({ license: singleLicense });
          }
        },
        error: (error) => {
          console.error('Error fetching active licenses:', error);
          this.myActiveLicenses = [];
          this.isLoadingLicenses = false;
        }
      });
  }

  private getFromSessionStorage(): any {
    const raw = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  private saveToSessionStorage(): void {
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails, JSON.stringify(this.bottlerDetailsForm.getRawValue()));
  }

  resetForm(): void {
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
    const isDistributor = this.roleService.getCurrentUser()?.roleId === 16;
    const defaultBrandType = isDistributor ? 'Imported from other States/Country' : 'Manufactured in Sikkim';
    this.bottlerDetailsForm.reset({
      financialYear: this.getCurrentFinancialYear(),
      brandType: defaultBrandType,
      country: 'India',
      state: 'Sikkim'
    });
  }

  goBack(): void { this.back.emit(); }

  proceedToNext(): void {
    if (this.bottlerDetailsForm.valid) {
      this.saveToSessionStorage();
      this.next.emit();
    } else {
      this.bottlerDetailsForm.markAllAsTouched();
    }
  }
}
