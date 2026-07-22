import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationCompanyDetails
} from '../../../../../../../core/models/company-collaboration.model';
import {
  CompanyCollaborationBrandOwner
} from '../../../../../../../core/models/company-collaboration.model';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';
import { CompanyRegistrationService } from '../../../../../../../core/services/company-registration.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

interface BottlerOption {
  id: string | number;
  code: string;
  name: string;
  address: string;
  licensee_id_no?: string;
}

@Component({
  selector: 'app-company-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './company-details.component.html',
  styleUrl: './company-details.component.scss'
})
export class CompanyDetailsComponent implements OnInit, OnDestroy {
  @Input() showBack: boolean = true;
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  companyDetailsForm: FormGroup;
  bottlerOptions: BottlerOption[] = [];
  isLoadingBottlers = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private companyCollaborationService: CompanyCollaborationService,
    private companyRegistrationService: CompanyRegistrationService,
    private router: Router
  ) {
    const saved = this.getFromSessionStorage();

    this.companyDetailsForm = this.fb.group({
      financialYear:   new FormControl(this.getCurrentFinancialYear(), [Validators.required]),
      applicationDate: new FormControl(saved.applicationDate || this.getTodayDate()),
      bottlerId:       new FormControl(saved.bottlerId       || '', [Validators.required]),
      bottlerName:     new FormControl(saved.bottlerName     || ''),
      bottlerAddress:  new FormControl(saved.bottlerAddress  || '')
    });

    this.companyDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.saveToSessionStorage());
  }

  ngOnInit(): void {
    this.loadBottlerOptions();

    // Watch bottler selection and auto-fill address
    this.companyDetailsForm.get('bottlerId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => this.applyBottlerDetails(id));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentFinancialYear(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return m >= 4
      ? `${y}-${(y + 1).toString().slice(-2)}`
      : `${y - 1}-${y.toString().slice(-2)}`;
  }

  private getTodayDate(): string {
    return new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
  }

  private loadBottlerOptions(): void {
    this.isLoadingBottlers = true;
    this.companyRegistrationService.getApplicationsByStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const approvedList = response?.approved || [];
          if (approvedList.length === 0) {
            Swal.fire({
              title: 'Access Denied',
              text: 'You must have an approved company registration application to apply for company collaboration.',
              icon: 'error',
              confirmButtonText: 'OK'
            }).then(() => {
              this.router.navigate(['/dashboard']);
            });
            this.bottlerOptions = [];
            this.isLoadingBottlers = false;
            return;
          }

          this.bottlerOptions = approvedList.map((app: any) => ({
            id: String(app.applicationId || app.application_id || app.id || ''),
            code: String(app.applicationId || app.application_id || ''),
            name: String(app.companyName || app.company_name || ''),
            address: String(app.factoryAddress || app.factory_address || ''),
            licensee_id_no: String(app.applicantName || app.applicant_name || '')
          }));
          this.isLoadingBottlers = false;

          const current = this.companyDetailsForm.get('bottlerId')?.value;
          if (current) this.applyBottlerDetails(current);
        },
        error: () => {
          this.bottlerOptions = [];
          this.isLoadingBottlers = false;
        }
      });
  }

  private applyBottlerDetails(id: string | number | null): void {
    const found = this.bottlerOptions.find((b) => String(b.id) === String(id));
    this.companyDetailsForm.patchValue({
      bottlerName:    found?.name    || '',
      bottlerAddress: found?.address || ''
    }, { emitEvent: false });
    this.saveToSessionStorage();
  }

  private getFromSessionStorage(): Partial<CompanyCollaborationCompanyDetails> {
    const raw = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.companyDetails);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  private saveToSessionStorage(): void {
    sessionStorage.setItem(
      COMPANY_COLLAB_STORAGE_KEYS.companyDetails,
      JSON.stringify(this.companyDetailsForm.getRawValue())
    );
  }

  resetForm(): void {
    sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.companyDetails);
    this.companyDetailsForm.reset({
      financialYear:   this.getCurrentFinancialYear(),
      applicationDate: this.getTodayDate(),
      bottlerId:       '',
      bottlerName:     '',
      bottlerAddress:  ''
    });
  }

  goBack(): void { this.back.emit(); }

  proceedToNext(): void {
    if (this.companyDetailsForm.valid) {
      this.saveToSessionStorage();
      this.next.emit();
    }
  }
}
