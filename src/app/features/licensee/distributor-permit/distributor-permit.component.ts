import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { Subject, catchError, forkJoin, of, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { AccountService } from '../../../core/services/account.service';
import { SupplyChainProfileService } from '../../../core/services/supply-chain-profile.service';
import {
  DistributorBrandMaster,
  DistributorPermitApplication,
  DistributorSupplier
} from '../../../core/models/distributor-permit.model';
import { DistributorPermitService } from '../../../core/services/distributor-permit.service';
import { MaterialModule } from '../../../shared/material.module';
import { ImflHeaderComponent, ImflTabType } from './components/imfl-header/imfl-header.component';
import { ImflRevalidationComponent } from './components/imfl-revalidation/imfl-revalidation.component';
import { ImflCancellationComponent } from './components/imfl-cancellation/imfl-cancellation.component';

type DistributorPermitStatusFilter = 'all' | 'approved' | 'pending' | 'objection' | 'rejected';
type DistributorPermitStatusGroup = Exclude<DistributorPermitStatusFilter, 'all'>;

interface DistributorPermitRow {
  id: string;
  applicationId: string;
  submittedOn: string;
  submittedDate: Date | null;
  paymentStatus: string;
  applicantName: string;
  supplierName: string;
  currentStage: string;
  statusGroup: DistributorPermitStatusGroup;
  application: DistributorPermitApplication;
}

@Component({
  selector: 'app-distributor-permit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    ImflHeaderComponent,
    ImflRevalidationComponent,
    ImflCancellationComponent
  ],
  templateUrl: './distributor-permit.component.html',
  styleUrl: './distributor-permit.component.scss'
})
export class DistributorPermitComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly permitService = inject(DistributorPermitService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);
  private readonly profileService = inject(SupplyChainProfileService);
  private readonly destroy$ = new Subject<void>();

  readonly applicantForm = this.fb.group({
    applicantCompanyName: ['', Validators.required],
    authorizedSignatory: ['', Validators.required],
    applicationDate: [this.todayIso(), Validators.required],
    addressedTo: ['Commissioner of Excise, Excise Department, Govt. of Sikkim', Validators.required],
    applicantAddress: ['']
  });

  readonly supplierForm = this.fb.group({
    selectedSupplierId: [''],
    supplierCompanyName: ['', Validators.required],
    logisticsPartner: [''],
    sourceAddress: ['', Validators.required]
  });

  readonly brandStepForm = this.fb.group({});

  readonly routeForm = this.fb.group({
    origin: [{ value: '', disabled: true }],
    destination: [{ value: '', disabled: true }, Validators.required],
    transportMode: ['Road', Validators.required],
    vehicleNumber: [''],
    routeDetails: ['', Validators.required]
  });

  readonly reviewForm = this.fb.group({
    declarationAccepted: [false, Validators.requiredTrue]
  });

  readonly lineItems = this.fb.array<FormGroup>([]);

  suppliers: DistributorSupplier[] = [];
  brandMaster: DistributorBrandMaster[] = [];
  applications: DistributorPermitApplication[] = [];
  selectedApplication: DistributorPermitApplication | null = null;
  submittedReferenceNo = '';
  isLoading = false;
  isSubmitting = false;
  loadError = '';
  error: string | null = null;
  isFormView = false;

  activeTab: ImflTabType = 'requisition';

  activeCardFilter: DistributorPermitStatusFilter = 'all';
  searchFilter = '';
  dateFromFilter = '';
  dateToFilter = '';
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize = 5;
  pageIndex = 0;

  ngOnInit(): void {
    this.addLineItem();
    this.brandStepForm.setValidators(() => this.isBrandStepValid() ? null : { lineItemsInvalid: true });
    this.syncBrandStepValidity();
    this.loadInitialData();
    this.loadApplicantDefaults();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.isFormView = String(params?.['mode'] || '').toLowerCase() === 'apply';
        const tabParam = String(params?.['tab'] || '').toLowerCase() as ImflTabType;
        if (['requisition', 'revalidation', 'cancellation'].includes(tabParam)) {
          this.activeTab = tabParam;
        }
      });

    this.supplierForm.controls.selectedSupplierId.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((supplierId) => this.applySupplierById(supplierId || ''));

    this.supplierForm.controls.sourceAddress.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((address) => {
        this.routeForm.controls.origin.setValue(address || '', { emitEvent: false });
      });

    this.lineItems.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncBrandStepValidity());
  }

  onTabChange(tab: ImflTabType): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  openApplyForm(): void {
    this.isFormView = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: 'apply' },
      queryParamsHandling: 'merge'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get lineItemControls(): FormArray<FormGroup> {
    return this.lineItems;
  }

  get rows(): DistributorPermitRow[] {
    return this.applications.map((application) => this.mapApplicationRow(application));
  }

  get counts(): Record<DistributorPermitStatusGroup, number> & { total: number } {
    return this.rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.statusGroup] += 1;
        return acc;
      },
      { total: 0, approved: 0, pending: 0, objection: 0, rejected: 0 }
    );
  }

  get filteredRows(): DistributorPermitRow[] {
    const q = this.searchFilter.trim().toLowerCase();
    const fromDate = this.dateFromFilter ? new Date(this.dateFromFilter) : null;
    const toDate = this.dateToFilter ? new Date(this.dateToFilter) : null;

    return this.rows.filter((row) => {
      const matchesStatus = this.activeCardFilter === 'all' || row.statusGroup === this.activeCardFilter;
      const matchesSearch = !q ||
        row.applicationId.toLowerCase().includes(q) ||
        row.applicantName.toLowerCase().includes(q) ||
        row.supplierName.toLowerCase().includes(q) ||
        row.currentStage.toLowerCase().includes(q);

      const matchesFrom = !fromDate || (row.submittedDate !== null && row.submittedDate >= this.startOfDay(fromDate));
      const matchesTo = !toDate || (row.submittedDate !== null && row.submittedDate <= this.endOfDay(toDate));

      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }

  get pagedRows(): DistributorPermitRow[] {
    if (this.filteredRows.length === 0) {
      return [];
    }
    const start = this.pageIndex * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return this.filteredRows.length === 0 ? 0 : Math.ceil(this.filteredRows.length / this.pageSize);
  }

  get pageStart(): number {
    return this.filteredRows.length === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }

  get pageEnd(): number {
    return this.filteredRows.length === 0 ? 0 : Math.min((this.pageIndex + 1) * this.pageSize, this.filteredRows.length);
  }

  get totalCases(): number {
    return this.lineItems.controls.reduce((sum, _, index) => sum + this.getLineCases(index), 0);
  }

  get totalImport(): number {
    return this.lineItems.controls.reduce((sum, _, index) => sum + this.getLineImport(index), 0);
  }

  get totalCess(): number {
    return this.lineItems.controls.reduce((sum, _, index) => sum + this.getLineCess(index), 0);
  }

  get totalAdditionalEd(): number {
    return this.lineItems.controls.reduce((sum, _, index) => sum + this.getLineAdditionalEd(index), 0);
  }

  get applicantDisplayName(): string {
    return String(this.applicantForm.controls.applicantCompanyName.value || '').trim() || 'Applicant';
  }

  showForm(): void {
    this.router.navigate(['/dashboard'], {
      queryParams: { section: 'distributor-permit', mode: 'apply' }
    });
  }

  showList(): void {
    this.router.navigate(['/dashboard'], {
      queryParams: { section: 'distributor-permit' }
    });
  }

  onCardFilterClick(filter: DistributorPermitStatusFilter): void {
    this.activeCardFilter = filter;
    this.applyFilters();
  }

  applyFilters(): void {
    this.pageIndex = 0;
  }

  clearFilters(): void {
    this.activeCardFilter = 'all';
    this.searchFilter = '';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.applyFilters();
  }

  onPageSizeChange(): void {
    this.pageIndex = 0;
  }

  prevPage(): void {
    if (this.pageIndex > 0) {
      this.pageIndex -= 1;
    }
  }

  nextPage(): void {
    if (this.totalPages > 0 && this.pageIndex < this.totalPages - 1) {
      this.pageIndex += 1;
    }
  }

  addLineItem(): void {
    this.lineItems.push(this.fb.group({
      selectedBrandName: ['', Validators.required],
      brandKey: ['', Validators.required],
      cases: [1, [Validators.required, Validators.min(1)]]
    }) as FormGroup);
    this.syncBrandStepValidity();
  }

  removeLineItem(index: number): void {
    if (this.lineItems.length === 1) {
      return;
    }
    this.lineItems.removeAt(index);
    this.syncBrandStepValidity();
  }

  onBrandNameChange(index: number): void {
    const row = this.lineItems.at(index);
    row.patchValue({ brandKey: '' }, { emitEvent: false });
    this.syncBrandStepValidity();
  }

  onSizeChange(index: number): void {
    const row = this.lineItems.at(index);
    const value = row.value as any;
    const master = this.getBrandMasterByKey(value.brandKey);
    if (master) {
      row.patchValue({ selectedBrandName: master.brandName }, { emitEvent: false });
    }
    this.syncBrandStepValidity();
  }

  submit(): void {
    this.applicantForm.markAllAsTouched();
    this.supplierForm.markAllAsTouched();
    this.brandStepForm.markAllAsTouched();
    this.routeForm.markAllAsTouched();
    this.reviewForm.markAllAsTouched();
    this.lineItems.markAllAsTouched();

    if (
      this.applicantForm.invalid ||
      this.supplierForm.invalid ||
      this.brandStepForm.invalid ||
      this.routeForm.invalid ||
      this.reviewForm.invalid ||
      this.lineItems.invalid
    ) {
      return;
    }

    const lineItems = this.lineItems.controls
      .map((control) => {
        const value = control.value as any;
        const master = this.getBrandMasterByKey(value.brandKey);
        if (!master) {
          return null;
        }
        return {
          brand_id: master.brandId,
          size_ml: master.sizeMl,
          cases: Number(value.cases || 0)
        };
      })
      .filter(Boolean) as any[];

    if (lineItems.length === 0) {
      return;
    }

    const supplier = this.supplierForm.getRawValue();
    const route = this.routeForm.getRawValue();
    const payload: any = {
      supplierCompanyName: supplier.supplierCompanyName || '',
      logisticsPartner: supplier.logisticsPartner || '',
      sourceAddress: supplier.sourceAddress || '',
      origin: route.origin || supplier.sourceAddress || '',
      destination: route.destination || '',
      routeDetails: this.buildRouteDetails(route),
      declarationAccepted: this.reviewForm.value.declarationAccepted === true,
      lineItems
    };

    this.isSubmitting = true;
    this.permitService.createApplication(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.submittedReferenceNo = response.referenceNo || '';
          this.loadApplications();
          this.resetApplicationForm();
          this.showList();
          void Swal.fire({
            title: 'Application Submitted',
            html: `Reference No: <b>${this.submittedReferenceNo || 'Generated on save'}</b>`,
            icon: 'success',
            confirmButtonText: 'OK'
          });
        },
        error: (error) => {
          this.isSubmitting = false;
          void Swal.fire('Error', error?.error?.detail || 'Unable to submit application.', 'error');
        }
      });
  }

  selectApplication(row: DistributorPermitApplication): void {
    this.selectedApplication = row;
  }

  clearSelectedApplication(): void {
    this.selectedApplication = null;
  }

  getStatusGroup(status: string | undefined): DistributorPermitStatusGroup {
    const value = String(status || '').toLowerCase();
    if (value.includes('approve')) return 'approved';
    if (value.includes('reject')) return 'rejected';
    if (value.includes('object')) return 'objection';
    return 'pending';
  }

  getCurrentStage(status: string | undefined): string {
    const value = String(status || '').trim();
    if (!value) {
      return 'Pending';
    }
    if (value.toLowerCase() === 'draft') {
      return 'Application Not Submitted';
    }
    if (value.toLowerCase() === 'submitted') {
      return 'Pending';
    }
    return this.formatStageName(value);
  }

  getBrandMasterByKey(key: string): DistributorBrandMaster | undefined {
    return this.brandMaster.find((item) => this.getBrandKey(item) === key);
  }

  getBrandKey(item: DistributorBrandMaster): string {
    return `${item.brandId}:${item.sizeMl}`;
  }

  getLineSummary(index: number): DistributorBrandMaster | undefined {
    const value = this.lineItems.at(index).value as any;
    return this.getBrandMasterByKey(value.brandKey);
  }

  getLineCases(index: number): number {
    const value = this.lineItems.at(index).value as any;
    return Number(value.cases || 0);
  }

  getLineImport(index: number): number {
    const master = this.getLineSummary(index);
    return master ? Number(master.importPassFeePerCase || 0) * this.getLineCases(index) : 0;
  }

  getLineCess(index: number): number {
    const master = this.getLineSummary(index);
    return master ? Number(master.educationCessPerCase || 0) * this.getLineCases(index) : 0;
  }

  getLineAdditionalEd(index: number): number {
    const master = this.getLineSummary(index);
    return master ? Number(master.additionalEdPerCase || 0) * this.getLineCases(index) : 0;
  }

  getLineBulkLitres(index: number): number {
    const master = this.getLineSummary(index);
    return master ? (Number(master.sizeMl || 0) * Number(master.piecesPerCase || 0) * this.getLineCases(index)) / 1000 : 0;
  }

  getLineEdp(index: number): number {
    return Number(this.getLineSummary(index)?.edpPerCase || 0);
  }

  getLineImportFee(index: number): number {
    return Number(this.getLineSummary(index)?.importPassFeePerCase || 0);
  }

  getLineMrp(index: number): number {
    return Number(this.getLineSummary(index)?.mrpPerBottle || 0);
  }

  getLineAdditionalEdPerCase(index: number): number {
    return Number(this.getLineSummary(index)?.additionalEdPerCase || 0);
  }

  getLineCessPerCase(index: number): number {
    return Number(this.getLineSummary(index)?.educationCessPerCase || 0);
  }

  getLineTotalAddEd(index: number): number {
    return this.getLineAdditionalEd(index);
  }

  getUniqueBrandNames(): string[] {
    const names = new Set<string>();
    (this.brandMaster || []).forEach((b) => {
      if (b.brandName) names.add(b.brandName);
    });
    return Array.from(names).sort();
  }

  getAvailableSizesForBrand(brandName: string): DistributorBrandMaster[] {
    if (!brandName) return [];
    return (this.brandMaster || []).filter(
      (b) => b.brandName?.toLowerCase() === brandName.toLowerCase()
    );
  }

  getSizeLabel(option: DistributorBrandMaster): string {
    return `${option.sizeMl} ml (${option.piecesPerCase || 0} pcs/case)`;
  }

  getBrandLabel(option: DistributorBrandMaster): string {
    return `${option.brandName} | ${option.sizeMl} ml | ${option.piecesPerCase || 0} pcs/case`;
  }

  getSupplierLabel(option: DistributorSupplier): string {
    const parts = [
      option.company_name,
      option.address,
      option.state
    ].filter((value) => !!String(value || '').trim());
    return parts.join(' • ');
  }

  getBrandReviewRows(): Array<{
    brand: string;
    size: string;
    cases: number;
    edp: number;
    importFee: number;
    totalImport: number;
    cess: number;
    mrp: number;
    bl: number;
    addEdPerCase: number;
    totalAddEd: number;
  }> {
    return this.lineItems.controls
      .map((control, index) => {
        const master = this.getLineSummary(index);
        if (!master) {
          return null;
        }
        return {
          brand: master.brandName,
          size: `${master.sizeMl} ml`,
          cases: this.getLineCases(index),
          edp: this.getLineEdp(index),
          importFee: this.getLineImportFee(index),
          totalImport: this.getLineImport(index),
          cess: this.getLineCess(index),
          mrp: this.getLineMrp(index),
          bl: this.getLineBulkLitres(index),
          addEdPerCase: this.getLineAdditionalEdPerCase(index),
          totalAddEd: this.getLineTotalAddEd(index)
        };
      })
      .filter(Boolean) as Array<{
      brand: string;
      size: string;
      cases: number;
      edp: number;
      importFee: number;
      totalImport: number;
      cess: number;
      mrp: number;
      bl: number;
      addEdPerCase: number;
      totalAddEd: number;
    }>;
  }

  get applicantSummaryRows(): Array<{ label: string; value: string }> {
    return [
      { label: 'Applicant Company', value: String(this.applicantForm.value.applicantCompanyName || '-') },
      { label: 'Authorized Signatory', value: String(this.applicantForm.value.authorizedSignatory || '-') },
      { label: 'Application Date', value: this.formatDateInput(String(this.applicantForm.value.applicationDate || '')) },
      { label: 'Addressed To', value: String(this.applicantForm.value.addressedTo || '-') }
    ];
  }

  get supplierSummaryRows(): Array<{ label: string; value: string }> {
    return [
      { label: 'Supplier Company', value: String(this.supplierForm.value.supplierCompanyName || '-') },
      { label: 'C/O Logistics Partner', value: String(this.supplierForm.value.logisticsPartner || '-') },
      { label: 'Source Address', value: String(this.supplierForm.value.sourceAddress || '-') }
    ];
  }

  get routeSummaryRows(): Array<{ label: string; value: string }> {
    return [
      { label: 'Origin', value: String(this.routeForm.getRawValue().origin || '-') },
      { label: 'Destination', value: String(this.routeForm.getRawValue().destination || '-') },
      { label: 'Mode of Transport', value: String(this.routeForm.value.transportMode || '-') },
      { label: 'Vehicle / Container', value: String(this.routeForm.value.vehicleNumber || '-') },
      { label: 'Route Details', value: String(this.routeForm.value.routeDetails || '-') }
    ];
  }

  trackByIndex(index: number): number {
    return index;
  }

  private loadInitialData(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      suppliers: this.permitService.getSuppliers().pipe(catchError(() => of([] as DistributorSupplier[]))),
      brands: this.permitService.getBrandMaster().pipe(catchError(() => of({ success: true, data: [] as DistributorBrandMaster[], total: 0 }))),
      premises: this.permitService.getPremises().pipe(catchError(() => of({ destination: '' } as any))),
      applications: this.permitService.listApplications().pipe(catchError(() => of([] as DistributorPermitApplication[])))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ suppliers, brands, premises, applications }) => {
          this.suppliers = suppliers || [];
          this.brandMaster = brands?.data || [];
          this.applications = applications || [];
          this.applyFilters();
          this.routeForm.controls.destination.setValue(premises?.destination || '', { emitEvent: false });
          this.populateDefaultBrandRows();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.loadError = 'Unable to load distributor permit details.';
        }
      });
  }

  private loadApplications(): void {
    this.permitService.listApplications()
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => {
        this.applications = rows || [];
        this.applyFilters();
      });
  }

  private loadApplicantDefaults(): void {
    const applyFromAccount = (account: any | null) => {
      if (!account) {
        return;
      }

      const companyName = this.cleanValue(
        account?.companyName ||
        account?.company_name ||
        account?.firstName ||
        account?.username
      );
      const signatoryName = this.cleanValue(
        [account?.firstName, account?.middleName, account?.lastName]
          .filter((part) => !!this.cleanValue(part))
          .join(' ')
      ) || this.cleanValue(account?.username);
      const address = this.cleanValue(account?.address);

      if (companyName && !this.cleanValue(this.applicantForm.controls.applicantCompanyName.value)) {
        this.applicantForm.controls.applicantCompanyName.setValue(companyName, { emitEvent: false });
      }
      if (signatoryName && !this.cleanValue(this.applicantForm.controls.authorizedSignatory.value)) {
        this.applicantForm.controls.authorizedSignatory.setValue(signatoryName, { emitEvent: false });
      }
      if (address && !this.cleanValue(this.applicantForm.controls.applicantAddress.value)) {
        this.applicantForm.controls.applicantAddress.setValue(address, { emitEvent: false });
      }
    };

    const current = this.accountService.getUserProfileSync() || this.accountService.getCurrentUser();
    if (current) {
      applyFromAccount(current);
    } else {
      this.accountService.identity(true)
        .pipe(takeUntil(this.destroy$))
        .subscribe((account) => applyFromAccount(account));
    }

    this.profileService.getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const profile = response?.data;
          if (!profile) {
            return;
          }

          const profileName = this.cleanValue(profile.manufacturingUnitName || profile.licenseeId);
          if (profileName && !this.cleanValue(this.applicantForm.controls.applicantCompanyName.value)) {
            this.applicantForm.controls.applicantCompanyName.setValue(profileName, { emitEvent: false });
          }
        },
        error: () => {
          // Leave the account fallback in place.
        }
      });
  }

  private applySupplierById(supplierId: string): void {
    const supplier = this.suppliers.find((item) => String(item.id) === String(supplierId));
    if (!supplier) {
      return;
    }

    this.supplierForm.patchValue({
      supplierCompanyName: supplier.company_name || '',
      sourceAddress: supplier.address || ''
    }, { emitEvent: false });
    this.routeForm.controls.origin.setValue(supplier.address || '', { emitEvent: false });
    this.syncBrandStepValidity();
  }

  private mapApplicationRow(application: DistributorPermitApplication): DistributorPermitRow {
    const dateValue = application.submittedAt || application.createdAt || '';
    const submittedDate = this.parseDate(dateValue);
    return {
      id: application.referenceNo || '',
      applicationId: application.referenceNo || 'N/A',
      submittedOn: this.formatDate(dateValue),
      submittedDate,
      paymentStatus: 'Pending',
      applicantName: application.applicantName || this.applicantDisplayName,
      supplierName: application.supplierCompanyName || 'N/A',
      currentStage: this.getCurrentStage(application.status),
      statusGroup: this.getStatusGroup(application.status),
      application
    };
  }

  private resetApplicationForm(): void {
    this.applicantForm.reset({
      applicantCompanyName: this.applicantForm.controls.applicantCompanyName.value || '',
      authorizedSignatory: this.applicantForm.controls.authorizedSignatory.value || '',
      applicationDate: this.todayIso(),
      addressedTo: 'Commissioner of Excise, Excise Department, Govt. of Sikkim',
      applicantAddress: this.applicantForm.controls.applicantAddress.value || ''
    });

    this.supplierForm.reset({
      selectedSupplierId: '',
      supplierCompanyName: '',
      logisticsPartner: '',
      sourceAddress: ''
    });

    this.routeForm.reset({
      origin: '',
      destination: this.routeForm.getRawValue().destination || '',
      transportMode: 'Road',
      vehicleNumber: '',
      routeDetails: ''
    });

    this.reviewForm.reset({ declarationAccepted: false });
    this.populateDefaultBrandRows();
    this.loadApplicantDefaults();
  }

  populateDefaultBrandRows(): void {
    this.lineItems.clear();
    this.addLineItem();
  }

  private isBrandStepValid(): boolean {
    if (this.lineItems.length === 0) {
      return false;
    }

    return this.lineItems.controls.every((control) => {
      const value = control.value as any;
      const hasBrandName = !!value.selectedBrandName;
      const hasBrandKey = !!this.getBrandMasterByKey(String(value.brandKey || ''));
      const cases = Number(value.cases || 0);
      return hasBrandName && hasBrandKey && cases > 0 && control.valid;
    });
  }

  private syncBrandStepValidity(): void {
    this.brandStepForm.updateValueAndValidity({ emitEvent: false });
  }

  private buildRouteDetails(route: any): string {
    const parts = [
      `Mode: ${String(route?.transportMode || '').trim()}`,
      `Vehicle: ${String(route?.vehicleNumber || '').trim()}`,
      String(route?.routeDetails || '').trim()
    ].filter((part) => !!part && part !== 'Mode: ' && part !== 'Vehicle: ');
    return parts.join(' | ');
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private cleanValue(value: any): string {
    return String(value || '').trim();
  }

  private parseDate(value: string | undefined): Date | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatDate(value: string | undefined): string {
    const date = this.parseDate(value);
    if (!date) {
      return 'N/A';
    }
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-');
  }

  private formatDateInput(value: string): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-GB');
  }

  private formatStageName(value: string): string {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private endOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
  }
}
