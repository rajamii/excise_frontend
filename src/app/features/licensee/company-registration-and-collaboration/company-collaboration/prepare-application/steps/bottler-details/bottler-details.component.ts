import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationBottlerDetails,
  CompanyCollaborationBrandOwner,
  CompanyCollaborationMember
} from '../../../../../../../core/models/company-collaboration.model';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';

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
  brandOwners: CompanyCollaborationBrandOwner[] = [];
  selectedOwner: CompanyCollaborationBrandOwner | null = null;
  members: CompanyCollaborationMember[] = [];
  isLoadingBrandOwners = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private companyCollaborationService: CompanyCollaborationService
  ) {
    const saved = this.getFromSessionStorage();

    this.bottlerDetailsForm = this.fb.group({
      financialYear:             new FormControl(this.getCurrentFinancialYear(), [Validators.required]),
      brandOwner:                new FormControl(saved.brandOwner || '', [Validators.required]),
      brandOwnerCode:            new FormControl(saved.brandOwnerCode || ''),
      brandOwnerName:            new FormControl(saved.brandOwnerName || ''),
      brandOwnerPan:             new FormControl(saved.brandOwnerPan || ''),
      brandOwnerOfficeAddress:   new FormControl(saved.brandOwnerOfficeAddress || ''),
      brandOwnerFactoryAddress:  new FormControl(saved.brandOwnerFactoryAddress || ''),
      brandOwnerMobile:          new FormControl(saved.brandOwnerMobile || ''),
      brandOwnerEmail:           new FormControl(saved.brandOwnerEmail || '')
    });

    this.bottlerDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.saveToSessionStorage());
  }

  ngOnInit(): void {
    this.watchBrandOwnerChanges();
    this.loadBrandOwners();
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

  private watchBrandOwnerChanges(): void {
    this.bottlerDetailsForm.get('brandOwner')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => this.applySelectedOwnerDetails(id));
  }

  private loadBrandOwners(): void {
    this.isLoadingBrandOwners = true;
    this.companyCollaborationService.getBrandOwners()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (owners) => {
          this.brandOwners = owners;
          // Restore previously selected owner
          const savedId = this.bottlerDetailsForm.get('brandOwner')?.value;
          if (savedId) this.applySelectedOwnerDetails(savedId);
          this.isLoadingBrandOwners = false;
        },
        error: (err) => {
          console.error('Failed to load brand owners:', err);
          this.brandOwners = [];
          this.isLoadingBrandOwners = false;
        }
      });
  }

  private applySelectedOwnerDetails(selectedId: string | number | null | undefined): void {
    if (!selectedId) {
      this.selectedOwner = null;
      this.members = [];
      this.bottlerDetailsForm.patchValue({
        brandOwnerCode: '', brandOwnerName: '', brandOwnerPan: '',
        brandOwnerOfficeAddress: '', brandOwnerFactoryAddress: '',
        brandOwnerMobile: '', brandOwnerEmail: ''
      }, { emitEvent: false });
      this.saveToSessionStorage();
      return;
    }

    const owner = this.brandOwners.find(
      (o) => String(o.id) === String(selectedId) || String(o.brand_owner_code) === String(selectedId)
    );

    this.selectedOwner = owner || null;
    this.members = owner?.members || [];

    if (owner) {
      this.bottlerDetailsForm.patchValue({
        brandOwnerCode:           owner.brand_owner_code,
        brandOwnerName:           owner.company_name,
        brandOwnerPan:            owner.pan_no,
        brandOwnerOfficeAddress:  owner.office_address,
        brandOwnerFactoryAddress: owner.factory_address,
        brandOwnerMobile:         owner.mobile,
        brandOwnerEmail:          owner.email
      }, { emitEvent: false });
    }

    this.saveToSessionStorage();
  }

  private getFromSessionStorage(): Partial<CompanyCollaborationBottlerDetails> {
    const raw = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  private saveToSessionStorage(): void {
    const value = {
      ...this.bottlerDetailsForm.getRawValue(),
      brandOwnerMembers: this.members
    };
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails, JSON.stringify(value));
  }

  resetForm(): void {
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
    this.selectedOwner = null;
    this.members = [];
    this.bottlerDetailsForm.reset({
      financialYear: this.getCurrentFinancialYear(),
      brandOwner: ''
    });
  }

  goBack(): void { this.back.emit(); }

  proceedToNext(): void {
    if (this.bottlerDetailsForm.valid) {
      this.saveToSessionStorage();
      this.next.emit();
    }
  }
}
