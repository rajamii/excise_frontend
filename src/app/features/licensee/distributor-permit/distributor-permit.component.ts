import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { Subject, catchError, finalize, forkJoin, of, takeUntil } from 'rxjs';
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

import { ActionItem, UnifiedActionButtonsComponent } from '../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../shared/services/unified-actions.service';

type DistributorPermitStatusFilter = 'all' | 'approved' | 'pending' | 'under_process' | 'objection' | 'rejected';
type DistributorPermitStatusGroup = Exclude<DistributorPermitStatusFilter, 'all'>;

interface DistributorPermitRow {
  id: string;
  applicationId: string;
  distributorPermitRef: string;
  submittedOn: string;
  submittedDate: Date | null;
  paymentStatus: string;
  applicantName: string;
  supplierName: string;
  currentStage: string;
  statusGroup: DistributorPermitStatusGroup;
  isActivatedSchedule: boolean;
  application: DistributorPermitApplication;
}

@Component({
  selector: 'app-distributor-permit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    ImflHeaderComponent
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
  private readonly unifiedActionsService = inject(UnifiedActionsService);
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
  readonly useInlineDetails = true;

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
        } else {
          // Also resolve from the 'section' param (e.g. distributor-permit-cancellation)
          const sectionParam = String(params?.['section'] || '').toLowerCase();
          if (sectionParam.includes('cancellation')) {
            this.activeTab = 'cancellation';
          } else if (sectionParam.includes('revalidation')) {
            this.activeTab = 'revalidation';
          } else if (sectionParam.includes('requisition') || sectionParam.includes('distributor-permit')) {
            this.activeTab = 'requisition';
          }
        }
        const statusParam = String(params?.['status'] || '').toLowerCase() as DistributorPermitStatusFilter;
        if (['all', 'approved', 'pending', 'under_process', 'objection', 'rejected'].includes(statusParam)) {
          this.activeCardFilter = statusParam;
        } else {
          this.autoSelectDefaultStatusFilter();
        }

        const refParam = params?.['ref'] || params?.['id'];
        if (refParam) {
          this.openRefWhenApplicationsLoaded(String(refParam));
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
    this.pageIndex = 0;
    this.autoSelectDefaultStatusFilter();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  autoSelectDefaultStatusFilter(): void {
    const statusParam = String(this.route.snapshot.queryParams['status'] || '').toLowerCase();
    if (['all', 'approved', 'pending', 'under_process', 'objection', 'rejected'].includes(statusParam)) {
      this.activeCardFilter = statusParam as DistributorPermitStatusFilter;
      return;
    }
    if (this.counts.pending > 0) {
      this.activeCardFilter = 'pending';
    } else {
      this.activeCardFilter = 'all';
    }
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

  get activeTabRows(): DistributorPermitRow[] {
    return this.rows.filter((row) => {
      const ref = String(row.applicationId || '').toUpperCase();
      const appType = String(row.application?.['applicationType'] || '').toLowerCase();

      if (this.activeTab === 'requisition') {
        // Only real requisition entries: not a revalidation/cancellation type and not an activated schedule
        return (
          !ref.startsWith('IMFLREV') &&
          !ref.startsWith('IMFLCAN') &&
          appType !== 'revalidation' &&
          appType !== 'cancellation' &&
          !row.isActivatedSchedule
        );
      } else if (this.activeTab === 'revalidation') {
        // Real IMFLREV rows OR activated schedule items ready for revalidation
        return ref.startsWith('IMFLREV') || appType === 'revalidation' || row.isActivatedSchedule;
      } else if (this.activeTab === 'cancellation') {
        return ref.startsWith('IMFLCAN') || appType === 'cancellation';
      }
      return true;
    });
  }

  get counts(): { total: number; approved: number; pending: number; underProcess: number; objection: number; rejected: number } {
    return this.activeTabRows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.statusGroup === 'approved') acc.approved += 1;
        else if (row.statusGroup === 'pending') acc.pending += 1;
        else if (row.statusGroup === 'under_process') acc.underProcess += 1;
        else if (row.statusGroup === 'objection') acc.objection += 1;
        else if (row.statusGroup === 'rejected') acc.rejected += 1;
        return acc;
      },
      { total: 0, approved: 0, pending: 0, underProcess: 0, objection: 0, rejected: 0 }
    );
  }

  get filteredRows(): DistributorPermitRow[] {
    const q = this.searchFilter.trim().toLowerCase();
    const parsedFrom = this.dateFromFilter ? this.parseDate(this.dateFromFilter) : null;
    const parsedTo = this.dateToFilter ? this.parseDate(this.dateToFilter) : null;
    const validFrom = parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : null;
    const validTo = parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : null;

    return this.activeTabRows.filter((row) => {
      const matchesStatus = this.activeCardFilter === 'all' || row.statusGroup === this.activeCardFilter;
      const matchesSearch = !q ||
        (row.applicationId || '').toLowerCase().includes(q) ||
        (row.applicantName || '').toLowerCase().includes(q) ||
        (row.supplierName || '').toLowerCase().includes(q) ||
        (row.currentStage || '').toLowerCase().includes(q);

      const matchesFrom = !validFrom || (row.submittedDate !== null && row.submittedDate >= this.startOfDay(validFrom));
      const matchesTo = !validTo || (row.submittedDate !== null && row.submittedDate <= this.endOfDay(validTo));

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

  authorityLetterModalOpen = false;
  authorityLetterData: any = null;

  isApproved(row: DistributorPermitRow | any): boolean {
    const stage = String(row?.currentStage || row?.status || row?.application?.status || '').toLowerCase();
    const stageId = row?.application?.current_stage_id || row?.application?.currentStageId || row?.current_stage_id;
    const isFinal = Boolean(row?.application?.current_stage_is_final || row?.application?.currentStageIsFinal);
    return stageId === 151 || isFinal || stage.includes('approved');
  }

  get canViewAuthorityLetter(): boolean {
    const user = this.accountService.getCurrentUser() as any;
    let roleId = Number(user?.role?.id || user?.roleId || 0);
    if (!roleId) {
      try {
        const cached = localStorage.getItem('currentUser') || localStorage.getItem('user');
        if (cached) {
          const parsed = JSON.parse(cached);
          roleId = Number(parsed?.roleId || parsed?.role?.id || parsed?.user?.roleId || parsed?.user?.role?.id || 0);
        }
      } catch {}
    }
    // Authority letter visible to Commissioner (10), Permit Section (5), and Admin (1, 3)
    return roleId === 10 || roleId === 5 || roleId === 1 || roleId === 3;
  }

  get isDistributorUser(): boolean {
    const user = this.accountService.getCurrentUser() as any;
    let roleId = Number(user?.role?.id || user?.roleId || user?.role_id || 0);
    if (!roleId) {
      try {
        const cached = localStorage.getItem('currentUser') || localStorage.getItem('user');
        if (cached) {
          const parsed = JSON.parse(cached);
          roleId = Number(parsed?.roleId || parsed?.role?.id || parsed?.user?.roleId || parsed?.user?.role?.id || 0);
        }
      } catch {}
    }
    const roleName = String(user?.role?.name || user?.role || '').toLowerCase();
    const officerRoles = [1, 3, 5, 6, 7, 8, 9, 10];
    if (officerRoles.includes(roleId) && !roleName.includes('distributor')) {
      return false;
    }
    return true;
  }

  canRequestCancellation(row: DistributorPermitRow | any): boolean {
    return this.isApproved(row) && this.isDistributorUser;
  }

  showCancellationModal = false;
  cancellationTargetRow: DistributorPermitRow | null = null;
  cancellationReasonType = 'Non-availability of tankers / Transport issues';
  cancellationReasonDetails = '';
  cancellationDeclarationAccepted = false;
  isSubmittingCancellation = false;

  selectedPermitNumberForCancellation = '';
  availablePermitOptionsForCancellation: Array<{
    permitNumber: string;
    totalCases: number;
    label: string;
    isUnderProcess: boolean;
    isCancelled: boolean;
    isRevalidated: boolean;
    detail: any;
  }> = [];
  selectedPermitDetail: any = null;

  onCancelPermit(row: DistributorPermitRow | any, event?: Event): void {
    if (event) {
      try { event.preventDefault(); } catch {}
      try { event.stopPropagation(); } catch {}
    }
    this.cancellationTargetRow = row;
    this.cancellationReasonType = 'Non-availability of tankers / Transport issues';
    this.cancellationReasonDetails = '';
    this.cancellationDeclarationAccepted = false;

    const appId = row.applicationId || row.referenceNo || row.reference_no || '';
    const rawApp = row.application || row;
    const pDetails = rawApp?.permit_wise_details || rawApp?.permitWiseDetails || [];

    const appIdLower = String(appId).toLowerCase();
    const existingCancellations = (this.applications || []).filter((a: any) => {
      const isCan = String(a.referenceNo || a.reference_no || '').startsWith('IMFLCAN') || a.applicationType === 'cancellation';
      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || '').toLowerCase();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || '').toLowerCase();
      return isCan && (refTarget === appIdLower || targetNo === appIdLower || String(a.referenceNo).toLowerCase().includes(appIdLower));
    });

    const existingRevalidations = (this.applications || []).filter((a: any) => {
      const isRev = String(a.referenceNo || a.reference_no || '').startsWith('IMFLREV') || a.applicationType === 'revalidation';
      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || '').toLowerCase();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || '').toLowerCase();
      return isRev && (refTarget === appIdLower || targetNo === appIdLower || String(a.referenceNo).toLowerCase().includes(appIdLower));
    });

    this.availablePermitOptionsForCancellation = [];

    if (Array.isArray(pDetails) && pDetails.length > 0) {
      pDetails.forEach((p: any) => {
        const pNum = String(p.permit_number || p.permitNumber || appId);
        const cases = Number(p.total_cases || p.totalCases || 0);

        const existingForPermit = existingCancellations.find((canApp: any) => {
          const cancelledNo = String(canApp.cancelledPermitNumber || canApp.cancelled_permit_number || canApp.application?.cancelled_permit_number || '').toLowerCase();
          const reasonText = String(canApp.cancellationReason || canApp.cancellation_reason || '').toLowerCase();
          return (cancelledNo && cancelledNo === pNum.toLowerCase()) || reasonText.includes(pNum.toLowerCase());
        });

        const existingForPermitRev = existingRevalidations.find((revApp: any) => {
          const revNo = String(revApp.revalidatedPermitNumber || revApp.revalidated_permit_number || revApp.application?.revalidated_permit_number || '').toLowerCase();
          const reasonText = String(revApp.revalidationReason || revApp.revalidation_reason || '').toLowerCase();
          return (revNo && revNo === pNum.toLowerCase()) || reasonText.includes(pNum.toLowerCase()) || !revNo;
        });

        const now = new Date();
        const validUpToStr = rawApp?.valid_up_to || rawApp?.validUpTo || row?.application?.valid_up_to || '';
        const validUpToDate = validUpToStr ? new Date(validUpToStr) : null;
        const isExpired = Boolean(validUpToDate && validUpToDate <= now);
        const isActivatedSched = Boolean(
          row?.isActivatedSchedule ||
          rawApp?.is_activated_schedule ||
          rawApp?.can_submit_application ||
          String(row?.currentStage || rawApp?.status || '').toLowerCase().includes('activated') ||
          String(row?.currentStage || rawApp?.status || '').toLowerCase().includes('ready for revalidation')
        );

        let isCancelled = false;
        let isUnderProcess = false;
        let isRevalidatedWaiting = false;

        if (existingForPermit) {
          const st = String(existingForPermit['status'] || existingForPermit['currentStage'] || '').toUpperCase();
          if (st.includes('APPROVED') || st.includes('COMPLETED')) {
            isCancelled = true;
          } else if (!st.includes('REJECTED')) {
            isUnderProcess = true;
          }
        }

        if (!isCancelled && !isUnderProcess) {
          if (existingForPermitRev) {
            const st = String(existingForPermitRev['status'] || existingForPermitRev['currentStage'] || '').toUpperCase();
            if (!st.includes('REJECTED') && !st.includes('APPROVED')) {
              isRevalidatedWaiting = true;
            } else if (isExpired || isActivatedSched) {
              isRevalidatedWaiting = true;
            }
          } else if (isExpired || isActivatedSched) {
            isRevalidatedWaiting = true;
          }
        }

        let label = `${pNum} (${cases} Cases)`;
        if (isCancelled) {
          label += ' - (Cancelled)';
        } else if (isUnderProcess) {
          label += ' - (Cancellation Under Process)';
        } else if (isRevalidatedWaiting) {
          label += ' - (Revalidation Waiting)';
        } else {
          label += ' - (Available)';
        }

        this.availablePermitOptionsForCancellation.push({
          permitNumber: pNum,
          totalCases: cases,
          label,
          isUnderProcess,
          isCancelled,
          isRevalidated: isRevalidatedWaiting,
          detail: p
        });
      });
    } else {
      const now = new Date();
      const validUpToStr = rawApp?.valid_up_to || rawApp?.validUpTo || row?.application?.valid_up_to || '';
      const validUpToDate = validUpToStr ? new Date(validUpToStr) : null;
      const isExpired = Boolean(validUpToDate && validUpToDate <= now);
      const isActivatedSched = Boolean(
        row?.isActivatedSchedule ||
        rawApp?.is_activated_schedule ||
        rawApp?.can_submit_application ||
        String(row?.currentStage || rawApp?.status || '').toLowerCase().includes('activated') ||
        String(row?.currentStage || rawApp?.status || '').toLowerCase().includes('ready for revalidation')
      );
      const isRevalidatedWaiting = isExpired || isActivatedSched || existingRevalidations.length > 0;
      let label = `${appId} - Single Permit`;
      if (isRevalidatedWaiting) {
        label += ' - (Revalidation Waiting)';
      } else {
        label += ' - (Available)';
      }
      this.availablePermitOptionsForCancellation.push({
        permitNumber: appId,
        totalCases: Number(row.cases || 0),
        label,
        isUnderProcess: false,
        isCancelled: false,
        isRevalidated: isRevalidatedWaiting,
        detail: null
      });
    }

    const firstAvailable = this.availablePermitOptionsForCancellation.find(opt => !opt.isCancelled && !opt.isUnderProcess && !opt.isRevalidated);
    this.selectedPermitNumberForCancellation = firstAvailable ? firstAvailable.permitNumber : (this.availablePermitOptionsForCancellation[0]?.permitNumber || appId);
    this.onPermitSelectionChangeForCancellation();

    this.showCancellationModal = true;
  }

  onPermitSelectionChangeForCancellation(): void {
    const opt = this.availablePermitOptionsForCancellation.find(o => o.permitNumber === this.selectedPermitNumberForCancellation);
    this.selectedPermitDetail = opt ? opt.detail : null;
  }

  closeCancellationModal(): void {
    if (this.isSubmittingCancellation) return;
    this.showCancellationModal = false;
    this.cancellationTargetRow = null;
    this.selectedPermitDetail = null;
    this.selectedPermitNumberForCancellation = '';
    this.availablePermitOptionsForCancellation = [];
  }

  confirmCancellationSubmit(): void {
    if (!this.cancellationTargetRow) return;
    if (!this.selectedPermitNumberForCancellation) {
      alert('Please select a permit to cancel.');
      return;
    }
    const selectedOpt = this.availablePermitOptionsForCancellation.find(o => o.permitNumber === this.selectedPermitNumberForCancellation);
    if (selectedOpt && (selectedOpt.isCancelled || selectedOpt.isUnderProcess || selectedOpt.isRevalidated)) {
      if (selectedOpt.isRevalidated) {
        alert(`Permit ${this.selectedPermitNumberForCancellation} validity has expired and is waiting for revalidation. Please submit and complete revalidation before attempting to cancel.`);
      } else {
        alert(`Permit ${this.selectedPermitNumberForCancellation} is already ${selectedOpt.isCancelled ? 'cancelled' : 'under process for cancellation'}.`);
      }
      return;
    }

    if (!this.cancellationDeclarationAccepted) {
      alert('Please accept the declaration to proceed.');
      return;
    }
    if (!this.cancellationReasonDetails.trim()) {
      alert('Please enter detailed remarks/reason for cancellation.');
      return;
    }

    const appId = this.cancellationTargetRow.applicationId;
    const fullReason = `[Permit: ${this.selectedPermitNumberForCancellation}] ${this.cancellationReasonType}: ${this.cancellationReasonDetails.trim()}`;

    this.isSubmittingCancellation = true;
    this.permitService.createCancellation({
      distributor_permit: appId,
      cancelled_permit_number: this.selectedPermitNumberForCancellation,
      permit_wise_details: this.selectedPermitDetail ? [this.selectedPermitDetail] : [],
      cancellation_reason: fullReason
    }).subscribe({
      next: (res: any) => {
        this.isSubmittingCancellation = false;
        this.closeCancellationModal();
        alert(`Permit cancellation request submitted successfully for Permit ${this.selectedPermitNumberForCancellation}. Reference No: ${res.reference_no || res.id}`);
        this.loadApplications();
      },
      error: (err: any) => {
        this.isSubmittingCancellation = false;
        console.error('Error submitting cancellation request:', err);
        alert('Failed to submit cancellation request: ' + (err?.error?.message || err?.message || 'Server error'));
      }
    });
  }

  canUpdateArrival(row: DistributorPermitRow | any): boolean {
    if (!this.isDistributorUser) return false;
    const appId = String(row?.applicationId || row?.referenceNo || '').toUpperCase();
    if (!appId.startsWith('IMFLREQ')) return false;
    return this.isApproved(row);
  }

  showArrivalModal = false;
  arrivalTargetRow: DistributorPermitRow | null = null;
  selectedPermitNumberForArrival = '';
  availablePermitOptionsForArrival: Array<{
    permitNumber: string;
    totalCases: number;
    label: string;
    detail: any;
  }> = [];
  selectedPermitDetailForArrival: any = null;
  arrivalVehicleNumber = '';
  arrivalBrandName = '';
  arrivalSizeMl = 750;
  arrivalExpectedCases = 0;
  arrivalArrivedCases: number | null = null;
  arrivalRemarks = '';
  isSubmittingArrival = false;

  openArrivalModal(row: DistributorPermitRow | any, event?: Event): void {
    if (event) {
      try { event.preventDefault(); } catch {}
      try { event.stopPropagation(); } catch {}
    }
    this.arrivalTargetRow = row;
    this.arrivalVehicleNumber = '';
    this.arrivalRemarks = '';
    this.arrivalArrivedCases = null;

    const appId = row.applicationId || row.referenceNo || row.reference_no || '';
    const rawApp = row.application || row;
    let pDetails = rawApp?.permit_wise_details || rawApp?.permitWiseDetails || [];

    if (!Array.isArray(pDetails) || pDetails.length === 0) {
      const matching = (this.applications || []).find((a: any) => {
        const ref = String(a.referenceNo || a.reference_no || a.id || '').toLowerCase();
        return ref === String(appId).toLowerCase();
      });
      if (matching) {
        pDetails = matching.permit_wise_details || matching.permitWiseDetails || matching['application']?.permit_wise_details || [];
      }
    }

    this.availablePermitOptionsForArrival = [];

    if (Array.isArray(pDetails) && pDetails.length > 0) {
      pDetails.forEach((p: any) => {
        const pNum = String(p.permit_number || p.permitNumber || appId);
        const cases = Number(p.total_cases || p.totalCases || 0);
        this.availablePermitOptionsForArrival.push({
          permitNumber: pNum,
          totalCases: cases,
          label: `${pNum} (${cases} Cases)`,
          detail: p
        });
      });
    } else {
      const fallbackDetail = {
        permit_number: appId,
        permitNumber: appId,
        total_cases: Number(row.cases || rawApp?.cases || rawApp?.total_cases || 0),
        totalCases: Number(row.cases || rawApp?.cases || rawApp?.total_cases || 0),
        line_items: rawApp?.line_items || rawApp?.lineItems || []
      };
      this.availablePermitOptionsForArrival.push({
        permitNumber: appId,
        totalCases: Number(fallbackDetail.totalCases || 0),
        label: `${appId} (${fallbackDetail.totalCases || 0} Cases)`,
        detail: fallbackDetail
      });
    }

    this.selectedPermitNumberForArrival = this.availablePermitOptionsForArrival[0]?.permitNumber || appId;
    this.onPermitSelectionChangeForArrival();
    this.showArrivalModal = true;
  }

  onPermitSelectionChangeForArrival(): void {
    const opt = this.availablePermitOptionsForArrival.find(o => o.permitNumber === this.selectedPermitNumberForArrival);
    this.selectedPermitDetailForArrival = opt ? opt.detail : null;

    if (this.selectedPermitDetailForArrival) {
      const items = this.selectedPermitDetailForArrival.line_items || this.selectedPermitDetailForArrival.lineItems || [];
      const firstItem = items[0] || {};
      this.arrivalBrandName = firstItem.brand_name || firstItem.brandName || '';
      this.arrivalSizeMl = Number(firstItem.size_ml || firstItem.sizeMl || 750);
      this.arrivalExpectedCases = Number(this.selectedPermitDetailForArrival.total_cases || this.selectedPermitDetailForArrival.totalCases || 0);
    } else {
      this.arrivalBrandName = '';
      this.arrivalSizeMl = 750;
      this.arrivalExpectedCases = 0;
    }
    this.arrivalArrivedCases = this.arrivalExpectedCases || null;
  }

  closeArrivalModal(): void {
    if (this.isSubmittingArrival) return;
    this.showArrivalModal = false;
    this.arrivalTargetRow = null;
    this.selectedPermitDetailForArrival = null;
    this.selectedPermitNumberForArrival = '';
    this.availablePermitOptionsForArrival = [];
    this.arrivalVehicleNumber = '';
    this.arrivalArrivedCases = null;
    this.arrivalRemarks = '';
  }

  confirmArrivalSubmit(): void {
    if (!this.arrivalTargetRow) return;
    if (!this.selectedPermitNumberForArrival) {
      alert('Please select a permit number for arrival update.');
      return;
    }
    if (!this.arrivalVehicleNumber.trim()) {
      alert('Please enter Car / Vehicle Number.');
      return;
    }
    if (this.arrivalArrivedCases === null || this.arrivalArrivedCases === undefined || this.arrivalArrivedCases < 0) {
      alert('Please enter a valid number of arrived cases.');
      return;
    }

    const payload = {
      distributor_permit: this.arrivalTargetRow.applicationId,
      permit_number: this.selectedPermitNumberForArrival,
      vehicle_number: this.arrivalVehicleNumber.trim(),
      brand_name: this.arrivalBrandName.trim() || 'N/A',
      size_ml: this.arrivalSizeMl || 750,
      expected_cases: this.arrivalExpectedCases || 0,
      arrived_cases: this.arrivalArrivedCases,
      remarks: this.arrivalRemarks.trim()
    };

    this.isSubmittingArrival = true;
    this.permitService.createArrival(payload).subscribe({
      next: (res: any) => {
        this.isSubmittingArrival = false;
        this.closeArrivalModal();
        alert(`Stock arrival details updated successfully for Permit ${this.selectedPermitNumberForArrival}. Vehicle: ${payload.vehicle_number}, Arrived Cases: ${payload.arrived_cases}.`);
        this.loadApplications();
      },
      error: (err: any) => {
        this.isSubmittingArrival = false;
        console.error('Error submitting stock arrival:', err);
        alert('Failed to update stock arrival: ' + (err?.error?.message || err?.message || 'Server error'));
      }
    });
  }

  showArrivalsRegisterModal = false;
  arrivalRecords: any[] = [];
  isLoadingArrivalRecords = false;
  arrivalSearchTerm = '';
  arrivalMonthFilter = '';

  openArrivalsRegisterModal(): void {
    this.isLoadingArrivalRecords = true;
    this.showArrivalsRegisterModal = true;
    this.arrivalSearchTerm = '';
    this.arrivalMonthFilter = '';

    this.permitService.getArrivals().subscribe({
      next: (res: any[]) => {
        this.arrivalRecords = Array.isArray(res) ? res : [];
        this.isLoadingArrivalRecords = false;
      },
      error: (err: any) => {
        console.error('Error fetching stock arrivals register:', err);
        this.arrivalRecords = [];
        this.isLoadingArrivalRecords = false;
      }
    });
  }

  closeArrivalsRegisterModal(): void {
    this.showArrivalsRegisterModal = false;
  }

  get filteredArrivalRecords(): any[] {
    const q = (this.arrivalSearchTerm || '').trim().toLowerCase();
    const month = (this.arrivalMonthFilter || '').trim();

    return (this.arrivalRecords || []).filter(item => {
      const dpRef = String(item.distributor_permit || item.distributorPermit || '').toLowerCase();
      const pNum = String(item.permit_number || item.permitNumber || '').toLowerCase();
      const vNum = String(item.vehicle_number || item.vehicleNumber || '').toLowerCase();
      const bName = String(item.brand_name || item.brandName || '').toLowerCase();

      const matchesSearch = !q || dpRef.includes(q) || pNum.includes(q) || vNum.includes(q) || bName.includes(q);

      let matchesMonth = true;
      if (month && item.arrived_at) {
        const itemMonth = String(item.arrived_at).substring(0, 7); // YYYY-MM
        matchesMonth = itemMonth === month;
      }

      return matchesSearch && matchesMonth;
    });
  }

  get totalArrivedCasesSum(): number {
    return this.filteredArrivalRecords.reduce((sum, item) => sum + Number(item.arrived_cases || item.arrivedCases || 0), 0);
  }

  canRequestRevalidation(row: DistributorPermitRow | any): boolean {
    if (!this.isDistributorUser) return false;
    const raw = row?.application || row;
    return Boolean(raw?.['is_activated_schedule'] || raw?.['can_submit_application']) || (this.isApproved(row) && !String(row?.applicationId || '').startsWith('IMFLREV'));
  }

  showRevalidationModal = false;
  revalidationTargetRow: DistributorPermitRow | null = null;
  revalidationReasonType = 'Delay in Transit / Transport Issue';
  revalidationReasonDetails = '';
  revalidationDeclarationAccepted = false;
  isSubmittingRevalidation = false;

  selectedPermitNumberForRevalidation = '';
  availablePermitOptionsForRevalidation: Array<{
    permitNumber: string;
    totalCases: number;
    label: string;
    isUnderProcess: boolean;
    isCancelled: boolean;
    detail: any;
  }> = [];
  selectedPermitDetailForRevalidation: any = null;

  openRevalidationModal(row: DistributorPermitRow | any, event?: Event): void {
    this.onRevalidatePermit(row, event);
  }

  onRevalidatePermit(row: DistributorPermitRow | any, event?: Event): void {
    if (event) {
      try { event.preventDefault(); } catch {}
      try { event.stopPropagation(); } catch {}
    }
    this.revalidationTargetRow = row;
    this.revalidationReasonType = 'Delay in Transit / Transport Issue';
    this.revalidationReasonDetails = '';
    this.revalidationDeclarationAccepted = false;

    const appId = row.applicationId || row.referenceNo || row.reference_no || '';
    const rawApp = row.application || row;
    let pDetails = rawApp?.permit_wise_details || rawApp?.permitWiseDetails || [];

    if (!Array.isArray(pDetails) || pDetails.length === 0) {
      const matching = (this.applications || []).find((a: any) => {
        const ref = String(a.referenceNo || a.reference_no || a.id || '').toLowerCase();
        return ref === String(appId).toLowerCase();
      });
      if (matching) {
        pDetails = matching.permit_wise_details || matching.permitWiseDetails || matching['application']?.permit_wise_details || [];
      }
    }

    const appIdLower = String(appId).toLowerCase();
    const existingRevalidations = (this.applications || []).filter((a: any) => {
      const isRev = String(a.referenceNo || a.reference_no || '').startsWith('IMFLREV') || a.applicationType === 'revalidation';
      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || '').toLowerCase();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || '').toLowerCase();
      return isRev && (refTarget === appIdLower || targetNo === appIdLower || String(a.referenceNo).toLowerCase().includes(appIdLower));
    });

    const existingCancellations = (this.applications || []).filter((a: any) => {
      const isCan = String(a.referenceNo || a.reference_no || '').startsWith('IMFLCAN') || a.applicationType === 'cancellation';
      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || '').toLowerCase();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || '').toLowerCase();
      return isCan && (refTarget === appIdLower || targetNo === appIdLower || String(a.referenceNo).toLowerCase().includes(appIdLower));
    });

    this.availablePermitOptionsForRevalidation = [];

    if (Array.isArray(pDetails) && pDetails.length > 0) {
      pDetails.forEach((p: any) => {
        const pNum = String(p.permit_number || p.permitNumber || appId);
        const cases = Number(p.total_cases || p.totalCases || 0);

        const existingForPermitRev = existingRevalidations.find((revApp: any) => {
          const revNo = String(revApp.revalidatedPermitNumber || revApp.revalidated_permit_number || revApp.application?.revalidated_permit_number || '').toLowerCase();
          const reasonText = String(revApp.revalidationReason || revApp.revalidation_reason || '').toLowerCase();
          return (revNo && revNo === pNum.toLowerCase()) || reasonText.includes(pNum.toLowerCase());
        });

        const existingForPermitCan = existingCancellations.find((canApp: any) => {
          const cancelledNo = String(canApp.cancelledPermitNumber || canApp.cancelled_permit_number || canApp.application?.cancelled_permit_number || '').toLowerCase();
          const reasonText = String(canApp.cancellationReason || canApp.cancellation_reason || '').toLowerCase();
          return (cancelledNo && cancelledNo === pNum.toLowerCase()) || reasonText.includes(pNum.toLowerCase());
        });

        let isCancelled = false;
        let isUnderProcess = false;
        let underProcessReason = '';

        if (existingForPermitCan) {
          const st = String(existingForPermitCan['status'] || existingForPermitCan['currentStage'] || '').toUpperCase();
          if (st.includes('APPROVED') || st.includes('COMPLETED')) {
            isCancelled = true;
          } else if (!st.includes('REJECTED')) {
            isUnderProcess = true;
            underProcessReason = 'Cancellation Under Process';
          }
        }

        if (existingForPermitRev) {
          const st = String(existingForPermitRev['status'] || existingForPermitRev['currentStage'] || '').toUpperCase();
          if (!st.includes('REJECTED')) {
            isUnderProcess = true;
            underProcessReason = 'Revalidation Under Process';
          }
        }

        let label = `${pNum} (${cases} Cases)`;
        if (isCancelled) {
          label += ' - (Cancelled)';
        } else if (isUnderProcess && underProcessReason) {
          label += ` - (${underProcessReason})`;
        }

        this.availablePermitOptionsForRevalidation.push({
          permitNumber: pNum,
          totalCases: cases,
          label,
          isUnderProcess,
          isCancelled,
          detail: p
        });
      });
    } else {
      const fallbackDetail = {
        permit_number: appId,
        permitNumber: appId,
        total_cases: Number(row.cases || rawApp?.cases || rawApp?.total_cases || 0),
        totalCases: Number(row.cases || rawApp?.cases || rawApp?.total_cases || 0),
        total_bulk_litres: Number(rawApp?.total_bulk_litres || rawApp?.bulk_litres || 0),
        total_import_fee: Number(rawApp?.total_import_value || rawApp?.total_import_fee || 0),
        total_additional_ed: Number(rawApp?.total_additional_ed || 0),
        line_items: rawApp?.line_items || rawApp?.lineItems || []
      };
      this.availablePermitOptionsForRevalidation.push({
        permitNumber: appId,
        totalCases: Number(fallbackDetail.totalCases || 0),
        label: `${appId} (${fallbackDetail.totalCases || 0} Cases)`,
        isUnderProcess: false,
        isCancelled: false,
        detail: fallbackDetail
      });
    }

    const firstAvailable = this.availablePermitOptionsForRevalidation.find(opt => !opt.isCancelled && !opt.isUnderProcess);
    this.selectedPermitNumberForRevalidation = firstAvailable ? firstAvailable.permitNumber : (this.availablePermitOptionsForRevalidation[0]?.permitNumber || appId);
    this.onPermitSelectionChangeForRevalidation();

    this.showRevalidationModal = true;
  }

  onPermitSelectionChangeForRevalidation(): void {
    const opt = this.availablePermitOptionsForRevalidation.find(o => o.permitNumber === this.selectedPermitNumberForRevalidation);
    this.selectedPermitDetailForRevalidation = opt ? opt.detail : null;
  }

  closeRevalidationModal(): void {
    if (this.isSubmittingRevalidation) return;
    this.showRevalidationModal = false;
    this.revalidationTargetRow = null;
    this.selectedPermitDetailForRevalidation = null;
    this.selectedPermitNumberForRevalidation = '';
    this.availablePermitOptionsForRevalidation = [];
  }

  confirmRevalidationSubmit(): void {
    if (!this.revalidationTargetRow) return;
    if (!this.selectedPermitNumberForRevalidation) {
      alert('Please select a permit for revalidation.');
      return;
    }
    const selectedOpt = this.availablePermitOptionsForRevalidation.find(o => o.permitNumber === this.selectedPermitNumberForRevalidation);
    if (selectedOpt && (selectedOpt.isCancelled || selectedOpt.isUnderProcess)) {
      alert(`Permit ${this.selectedPermitNumberForRevalidation} is ${selectedOpt.isCancelled ? 'cancelled' : 'already under process for revalidation'}.`);
      return;
    }

    const isActivatedSchedule = Boolean(this.revalidationTargetRow.isActivatedSchedule);

    if (!isActivatedSchedule) {
      if (!this.revalidationDeclarationAccepted) {
        alert('Please accept the declaration to proceed.');
        return;
      }
      if (!this.revalidationReasonDetails.trim()) {
        alert('Please enter detailed remarks/reason for revalidation.');
        return;
      }
    }

    const appId = this.revalidationTargetRow.applicationId;
    const reason = isActivatedSchedule
      ? `Auto-Revalidation: Permit ${this.selectedPermitNumberForRevalidation} validity expired. System initiated revalidation.`
      : `[Permit: ${this.selectedPermitNumberForRevalidation}] ${this.revalidationReasonType}: ${this.revalidationReasonDetails.trim()}`;

    this.isSubmittingRevalidation = true;
    this.permitService.createRevalidation({
      distributor_permit: appId,
      revalidated_permit_number: this.selectedPermitNumberForRevalidation,
      permit_wise_details: this.selectedPermitDetailForRevalidation ? [this.selectedPermitDetailForRevalidation] : [],
      revalidation_reason: reason
    }).subscribe({
      next: (res: any) => {
        this.isSubmittingRevalidation = false;
        this.closeRevalidationModal();
        alert(`Revalidation application submitted successfully! Reference No: ${res.reference_no || res.id}. It has been forwarded to the Commissioner for approval.`);
        this.loadApplications();
      },
      error: (err: any) => {
        this.isSubmittingRevalidation = false;
        console.error('Error submitting revalidation request:', err);
        alert('Failed to submit revalidation request: ' + (err?.error?.message || err?.message || 'Server error'));
      }
    });
  }

  openAuthorityLetter(row: DistributorPermitRow | any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const app = row?.application || row;
    const ref = app?.referenceNo || app?.reference_no || app?.id || (row as any)?.applicationId || '';

    // Build a clean, serializable object to avoid circular-reference errors
    const cleanApp = {
      reference_no: ref,
      referenceNo: ref,
      applicant_name: app?.applicant_name || app?.applicantName || (row as any)?.applicantName || '',
      supplier_company_name: app?.supplier_company_name || app?.supplierName || (row as any)?.supplierName || '',
      source_address: app?.source_address || app?.applicantAddress || '',
      origin: app?.origin || '',
      destination: app?.destination || '',
      route_details: app?.route_details || app?.routeDetails || '',
      submitted_at: app?.submitted_at || app?.created_at || (row as any)?.submittedOn || '',
      status: app?.status || (row as any)?.currentStage || 'Approved',
      line_items: Array.isArray(app?.line_items) ? app.line_items
               : Array.isArray(app?.lineItems)   ? app.lineItems
               : []
    };

    try {
      localStorage.setItem('finalImflPermitData', JSON.stringify(cleanApp));
    } catch (err) {
      console.warn('Could not save permit data to localStorage:', err);
    }

    this.router.navigate(['/unified-letter-view/imfl-permit'], { queryParams: { ref } });
  }

  closeAuthorityLetterModal(): void {
    this.authorityLetterModalOpen = false;
    this.authorityLetterData = null;
  }

  getAuthorityLetterItems(): any[] {
    const app = this.authorityLetterData;
    if (!app) return [];
    if (Array.isArray(app.line_items) && app.line_items.length > 0) return app.line_items;
    if (Array.isArray(app.lineItems) && app.lineItems.length > 0) return app.lineItems;
    return [];
  }

  getAuthorityLetterTotalCases(): number {
    return this.getAuthorityLetterItems().reduce((sum, item) => sum + Number(item.cases || 0), 0);
  }

  getAuthorityLetterTotalBulkLitres(): number {
    return this.getAuthorityLetterItems().reduce((sum, item) => sum + Number(item.bulk_litres || item.bulkLitres || (item.cases * 9) || 0), 0);
  }

  getAuthorityLetterValidityDate(): string {
    const dateStr = this.authorityLetterData?.submitted_at || this.authorityLetterData?.created_at;
    const base = dateStr ? new Date(dateStr) : new Date();
    base.setDate(base.getDate() + 60);
    return base.toLocaleDateString('en-GB');
  }

  getAuthorityLetterHash(): string {
    const ref = String(this.authorityLetterData?.referenceNo || this.authorityLetterData?.reference_no || 'IMFLREQ');
    return (ref + '33ecfbeb91bd24d127a40ee77dcboe5320df025fe109d63deb1c027d08abd4a6').slice(0, 48);
  }

  printAuthorityLetter(): void {
    const printContents = document.getElementById('imflAuthorityLetterPrintArea')?.innerHTML;
    if (!printContents) return;
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>IMFL Import Permit Pass - ${this.authorityLetterData?.referenceNo || ''}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 30px; background: white; color: #111; }
            .imfl-pass-document { border: none !important; box-shadow: none !important; padding: 0 !important; }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="imfl-pass-document">${printContents}</div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    win.document.close();
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
          cases: Number(value.cases || 0),
          pieces_per_case: master.piecesPerCase || 12,
          edp_per_case: master.edpPerCase || 5800,
          import_pass_fee_per_case: master.importPassFeePerCase || 1400,
          mrp_per_bottle: master.mrpPerBottle || 850,
          additional_ed_per_case: master.additionalEdPerCase || 350,
          education_cess_per_case: master.educationCessPerCase || 60
        };
      })
      .filter(Boolean) as any[];

    if (lineItems.length === 0) {
      return;
    }

    const supplier = this.supplierForm.getRawValue();
    const route = this.routeForm.getRawValue();
    const supplierName = supplier.supplierCompanyName || '';
    const srcAddress = supplier.sourceAddress || '';
    const logistics = supplier.logisticsPartner || '';
    const routeText = this.buildRouteDetails(route);

    const payload: any = {
      supplier_company_name: supplierName,
      supplierCompanyName: supplierName,
      logistics_partner: logistics,
      logisticsPartner: logistics,
      source_address: srcAddress,
      sourceAddress: srcAddress,
      origin: route.origin || srcAddress || '',
      destination: route.destination || '',
      route_details: routeText,
      routeDetails: routeText,
      declaration_accepted: this.reviewForm.value.declarationAccepted === true,
      declarationAccepted: this.reviewForm.value.declarationAccepted === true,
      line_items: lineItems,
      lineItems: lineItems
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
          let message = 'Unable to submit application.';
          if (error?.error) {
            if (typeof error.error === 'string') {
              message = error.error;
            } else if (error.error.detail) {
              message = error.error.detail;
            } else {
              const errs = Object.entries(error.error)
                .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                .join('<br>');
              if (errs) message = errs;
            }
          }
          void Swal.fire({
            title: 'Error',
            html: message,
            icon: 'error'
          });
        }
      });
  }

  get isOfficerUser(): boolean {
    const user = this.accountService.getCurrentUser() as any;
    let roleId = Number(user?.role?.id || user?.roleId || user?.role_id || 0);
    if (!roleId) {
      try {
        const cached = localStorage.getItem('currentUser') || localStorage.getItem('user');
        if (cached) {
          const parsed = JSON.parse(cached);
          roleId = Number(parsed?.roleId || parsed?.role?.id || parsed?.user?.roleId || parsed?.user?.role?.id || 0);
        }
      } catch {}
    }
    const roleName = String(user?.role?.name || user?.role?.displayName || user?.role || '').toLowerCase();
    const normalized = roleName.replace(/[^a-z0-9]/g, '');

    if ([5, 6, 7, 10, 12, 1, 3].includes(roleId)) {
      return true;
    }
    return normalized.includes('officer') || normalized.includes('oic') || normalized.includes('permit') || normalized.includes('commissioner');
  }

  selectApplication(rawApp: any): void {
    console.log('selectApplication called with:', rawApp);
    if (!rawApp) {
      console.log('rawApp is null or undefined');
      return;
    }
    const app = rawApp.application || rawApp;
    console.log('Processed app:', app);
    const ref = app.referenceNo || app.reference_no || app.id || rawApp.applicationId || rawApp.id;
    console.log('Reference:', ref);

    const normalized: DistributorPermitApplication = {
      ...app,
      id: app.id || ref,
      referenceNo: ref || 'N/A',
      applicantName: app.applicantName || app.applicant_name || rawApp.applicantName || this.applicantDisplayName || 'N/A',
      supplierCompanyName: app.supplierCompanyName || app.supplier_company_name || rawApp.supplierName || 'N/A',
      sourceAddress: app.sourceAddress || app.source_address || 'N/A',
      origin: app.origin || 'N/A',
      destination: app.destination || 'N/A',
      status: app.status || app.current_stage_name || rawApp.currentStage || 'PENDING',
      submittedAt: app.submittedAt || app.submitted_at || app.createdAt || app.created_at || rawApp.submittedOn,
      lineItems: app.lineItems || app.line_items || []
    };

    this.selectedApplication = normalized;
    console.log('selectedApplication set to:', this.selectedApplication);

    if (ref) {
      this.permitService.getApplication(String(ref)).subscribe({
        next: (res: any) => {
          console.log('API response:', res);
          if (res) {
            const lines = res.lineItems || res.line_items || normalized.lineItems || [];
            this.selectedApplication = {
              ...normalized,
              ...res,
              referenceNo: res.referenceNo || res.reference_no || normalized.referenceNo,
              applicantName: res.applicantName || res.applicant_name || normalized.applicantName,
              supplierCompanyName: res.supplierCompanyName || res.supplier_company_name || normalized.supplierCompanyName,
              sourceAddress: res.sourceAddress || res.source_address || normalized.sourceAddress,
              origin: res.origin || normalized.origin,
              destination: res.destination || normalized.destination,
              status: res.status || normalized.status,
              lineItems: lines.map((li: any) => ({
                ...li,
                brandName: li.brandName || li.brand_name || li.brand?.name || 'N/A',
                sizeMl: li.sizeMl || li.size_ml || li.size || 0,
                cases: li.cases || 0,
                edpPerCase: li.edpPerCase || li.edp_per_case || 0,
                importPassFeePerCase: li.importPassFeePerCase || li.import_pass_fee_per_case || 0,
                totalImport: li.totalImport || li.total_import_fee || li.total_import || 0,
                bulkLitres: li.bulkLitres || li.bulk_litres || 0
              }))
            };
            console.log('Updated selectedApplication:', this.selectedApplication);
          }
        },
        error: (err) => console.error('Error fetching full permit application details:', err)
      });
    }
  }

  onViewDetails(row: DistributorPermitRow): void {
    const referenceNo = row.applicationId || row.application?.referenceNo || row.application?.reference_no || row.id;
    const refUpper = String(referenceNo || '').toUpperCase();
    let type: 'requisition' | 'revalidation' | 'cancellation' = 'requisition';
    if (this.activeTab === 'cancellation' || refUpper.startsWith('IMFLCAN')) {
      type = 'cancellation';
    } else if (this.activeTab === 'revalidation' || refUpper.startsWith('IMFLREV')) {
      type = 'revalidation';
    }

    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        type,
        id: referenceNo,
        ref: referenceNo,
        source: 'distributor-permit'
      }
    });
  }

  get selectedActionItem(): any {
    if (!this.selectedApplication) return null;
    return {
      id: this.selectedApplication['id'] || this.selectedApplication.referenceNo || '',
      referenceNo: this.selectedApplication.referenceNo || '',
      status: this.selectedApplication.status || 'PENDING',
      ...this.selectedApplication
    };
  }

  get detailActionContext(): 'licensee' | 'permit-section' {
    return this.isOfficerUser ? 'permit-section' : 'licensee';
  }

  get detailActionIncludeActions(): string[] | null {
    if (this.isOfficerUser) {
      return null;
    }
    return ['REQUEST_REVALIDATION', 'REQUEST_CANCELLATION'];
  }

  clearSelectedApplication(): void {
    this.selectedApplication = null;
  }

  onModalActionClicked(event: { action: string; item: ActionItem }): void {
    if (!event?.action || !event?.item) {
      return;
    }

    this.unifiedActionsService.executeAction(
      event.action,
      event.item,
      'requisition',
      this.detailActionContext
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result?.success === false) {
            void Swal.fire({
              title: 'Action Failed',
              text: result.message || 'Unable to complete the selected action.',
              icon: 'error'
            });
            return;
          }

          if (event.action === 'REQUEST_REVALIDATION' || event.action === 'REQUEST_CANCELLATION') {
            this.clearSelectedApplication();
          }
        },
        error: (error) => {
          void Swal.fire({
            title: 'Action Failed',
            text: error?.error?.detail || error?.error?.message || error?.message || 'Unable to complete the selected action.',
            icon: 'error'
          });
        }
      });
  }

  onOfficerActionCompleted(): void {
    this.clearSelectedApplication();
    this.loadInitialData();
  }

  getUserRoleInfo(): { isPermitSection: boolean; isCommissioner: boolean; isAdmin: boolean } {
    const user = this.accountService.getCurrentUser() as any;
    let roleId = Number(user?.role?.id || user?.roleId || user?.role_id || 0);
    if (!roleId) {
      try {
        const cached = localStorage.getItem('currentUser') || localStorage.getItem('user');
        if (cached) {
          const parsed = JSON.parse(cached);
          roleId = Number(parsed?.roleId || parsed?.role?.id || parsed?.user?.roleId || parsed?.user?.role?.id || 0);
        }
      } catch {}
    }
    const roleName = String(user?.role?.name || user?.role || '').toLowerCase();
    const isCommissioner = roleId === 10 || roleName.includes('commissioner');
    const isPermitSection = roleId === 5 || roleId === 6 || roleName.includes('permit') || roleName.includes('oic');
    const isAdmin = roleId === 1 || roleId === 3 || roleName.includes('admin');

    return { isPermitSection, isCommissioner, isAdmin };
  }

  getStatusGroup(statusStr: string | undefined, rawApp?: any): DistributorPermitStatusGroup {
    const value = String(statusStr || rawApp?.status || '').toLowerCase();
    const stageId = Number(rawApp?.current_stage_id || rawApp?.currentStageId || rawApp?.current_stage?.id || 0);
    const isFinal = Boolean(rawApp?.current_stage_is_final || rawApp?.currentStageIsFinal || rawApp?.current_stage?.is_final);

    if (isFinal || stageId === 151 || stageId === 165 || value.includes('approved by commissioner')) {
      return 'approved';
    }
    if (stageId === 152 || value.includes('reject')) {
      return 'rejected';
    }
    if (value.includes('object')) {
      return 'objection';
    }

    const { isPermitSection, isCommissioner } = this.getUserRoleInfo();

    const isCommissionerStage = stageId === 153 || stageId === 157 || stageId === 160 || stageId === 162 || stageId === 163 || value.includes('commissioner');
    const isPermitSectionStage = stageId === 148 || stageId === 147 || stageId === 149 || stageId === 155 || stageId === 156 || value.includes('permit') || value.includes('oic');

    if (isPermitSection) {
      if (isCommissionerStage) {
        return 'under_process';
      }
      if (isPermitSectionStage) {
        return 'pending';
      }
    } else if (isCommissioner) {
      if (isPermitSectionStage || stageId === 154 || value.includes('payment') || value.includes('awaiting')) {
        return 'under_process';
      }
      if (isCommissionerStage) {
        return 'pending';
      }
    }

    if (value.includes('approve')) return 'approved';
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

  getPermitBreakdown(): Array<{
    permitIndex: number;
    permitName: string;
    totalCases: number;
    totalImport: number;
    totalAddEd: number;
    totalCess: number;
    totalBulkLitres: number;
    items: Array<{
      brand: string;
      size: string;
      cases: number;
      importFee: number;
      totalImport: number;
      addEdPerCase: number;
      totalAddEd: number;
      cess: number;
      bl: number;
    }>;
  }> {
    const rawRows = this.getBrandReviewRows();
    if (!rawRows || rawRows.length === 0) return [];

    const permits: Array<{
      permitIndex: number;
      permitName: string;
      totalCases: number;
      totalImport: number;
      totalAddEd: number;
      totalCess: number;
      totalBulkLitres: number;
      items: any[];
    }> = [];

    let currentPermitIndex = 1;
    let currentCases = 0;
    let currentItems: any[] = [];

    for (const row of rawRows) {
      let remCases = row.cases;
      while (remCases > 0) {
        const available = 600 - currentCases;
        if (available <= 0) {
          permits.push(this.buildPermitSummaryObject(currentPermitIndex, currentItems));
          currentPermitIndex++;
          currentCases = 0;
          currentItems = [];
        }

        const allocated = Math.min(remCases, 600 - currentCases);
        currentItems.push({
          ...row,
          cases: allocated,
          totalImport: row.importFee * allocated,
          totalAddEd: row.addEdPerCase * allocated,
          cess: row.cess ? (row.cess / row.cases) * allocated : 0,
          bl: row.bl ? (row.bl / row.cases) * allocated : 0
        });

        currentCases += allocated;
        remCases -= allocated;
      }
    }

    if (currentItems.length > 0) {
      permits.push(this.buildPermitSummaryObject(currentPermitIndex, currentItems));
    }

    return permits;
  }

  private buildPermitSummaryObject(permitIndex: number, items: any[]) {
    const totalCases = items.reduce((sum, item) => sum + item.cases, 0);
    const totalImport = items.reduce((sum, item) => sum + item.totalImport, 0);
    const totalAddEd = items.reduce((sum, item) => sum + item.totalAddEd, 0);
    const totalCess = items.reduce((sum, item) => sum + item.cess, 0);
    const totalBulkLitres = items.reduce((sum, item) => sum + item.bl, 0);
    return {
      permitIndex,
      permitName: `Permit #${permitIndex} (Max 600 Cases)`,
      totalCases,
      totalImport,
      totalAddEd,
      totalCess,
      totalBulkLitres,
      items
    };
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
      requisitions: this.permitService.listApplications().pipe(catchError(() => of([] as any[]))),
      revalidations: this.permitService.getRevalidations().pipe(catchError(() => of([] as any[]))),
      cancellations: this.permitService.getCancellations().pipe(catchError(() => of([] as any[])))
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: ({ suppliers, brands, premises, requisitions, revalidations, cancellations }) => {
          try {
            this.suppliers = Array.isArray(suppliers) ? suppliers : [];
            this.brandMaster = Array.isArray(brands?.data) ? brands.data : (Array.isArray(brands) ? brands : []);
            this.routeForm.controls.destination.setValue(premises?.destination || '', { emitEvent: false });
            this.populateDefaultBrandRows();

            this.processLoadedApplications(requisitions, revalidations, cancellations);
          } catch (err) {
            console.error('Error processing permit initial data:', err);
          }
        },
        error: (err) => {
          console.error('Error loading initial permit data:', err);
          this.loadError = 'Unable to load distributor permit details.';
        }
      });
  }

  private loadApplications(): void {
    forkJoin({
      requisitions: this.permitService.listApplications().pipe(catchError(() => of([]))),
      revalidations: this.permitService.getRevalidations().pipe(catchError(() => of([]))),
      cancellations: this.permitService.getCancellations().pipe(catchError(() => of([])))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ requisitions, revalidations, cancellations }) => {
        this.processLoadedApplications(requisitions, revalidations, cancellations);
      });
  }

  private processLoadedApplications(requisitions: any, revalidations: any, cancellations: any): void {
    const reqList = Array.isArray(requisitions) ? requisitions : (requisitions?.results || requisitions?.data || []);
    const revList = Array.isArray(revalidations) ? revalidations : (revalidations?.results || revalidations?.data || []);
    const canList = Array.isArray(cancellations) ? cancellations : (cancellations?.results || cancellations?.data || []);

    const mappedRequisitions = reqList.map((req: any) => {
      const refNo = req?.reference_no || req?.referenceNo || '';
      const dateVal = req?.submitted_at || req?.submittedAt || req?.created_at || req?.createdAt || '';
      const stageName = req?.current_stage?.name || req?.current_stage_name || req?.status || 'Pending';
      return {
        ...req,
        referenceNo: refNo,
        reference_no: refNo,
        submittedAt: dateVal,
        submitted_at: dateVal,
        createdAt: dateVal,
        created_at: dateVal,
        applicantName: req?.applicant_name || req?.applicantName || req?.applicant?.full_name || this.applicantDisplayName,
        supplierCompanyName: req?.supplier_company_name || req?.supplierCompanyName || 'N/A',
        status: stageName,
        current_stage: req?.current_stage || { name: stageName }
      };
    });

    const mappedRevalidations = revList.map((r: any) => {
      const refNo = r?.reference_no || r?.referenceNo || '';
      const dateVal = r?.submitted_at || r?.submittedAt || r?.created_at || '';
      const stageName = r?.current_stage?.name || r?.current_stage_name || r?.status || 'Pending';
      return {
        ...r,
        applicationType: 'revalidation',
        referenceNo: refNo,
        reference_no: refNo,
        submittedAt: dateVal,
        submitted_at: dateVal,
        createdAt: dateVal,
        applicantName: r?.applicant_name || r?.applicantName || 'N/A',
        supplierCompanyName: r?.distributor_permit_detail?.supplier_company_name || r?.supplier_company_name || r?.supplierCompanyName || 'N/A',
        status: stageName,
        current_stage: r?.current_stage || { name: stageName }
      };
    });

    const mappedCancellations = canList.map((c: any) => {
      const refNo = c?.reference_no || c?.referenceNo || '';
      const dateVal = c?.submitted_at || c?.submittedAt || c?.created_at || '';
      const stageName = c?.current_stage?.name || c?.current_stage_name || c?.status || 'Pending';
      const cancelledNo = c?.cancelled_permit_number || c?.cancelledPermitNumber || '';
      const permitWiseDetails = c?.permit_wise_details || c?.permitWiseDetails || [];
      const distPermitRef = c?.distributor_permit_detail?.reference_no || c?.distributor_permit_detail?.id || c?.distributor_permit || c?.distributorPermit || '';
      return {
        ...c,
        applicationType: 'cancellation',
        referenceNo: refNo,
        reference_no: refNo,
        cancelledPermitNumber: cancelledNo,
        cancelled_permit_number: cancelledNo,
        distributorPermit: distPermitRef,
        distributor_permit: distPermitRef,
        permitWiseDetails,
        permit_wise_details: permitWiseDetails,
        submittedAt: dateVal,
        submitted_at: dateVal,
        createdAt: dateVal,
        applicantName: c?.applicant_name || c?.applicantName || 'N/A',
        supplierCompanyName: c?.distributor_permit_detail?.supplier_company_name || c?.supplier_company_name || c?.supplierCompanyName || 'N/A',
        status: stageName,
        current_stage: c?.current_stage || { name: stageName }
      };
    });

    this.applications = [
      ...mappedRequisitions,
      ...mappedRevalidations,
      ...mappedCancellations
    ];
    this.autoSelectDefaultStatusFilter();
    this.applyFilters();
    const refParam = this.route.snapshot.queryParams['ref'] || this.route.snapshot.queryParams['id'];
    if (refParam) {
      this.openRefWhenApplicationsLoaded(String(refParam));
    }
  }

  private openRefWhenApplicationsLoaded(ref: string): void {
    if (!ref) return;
    const match = (this.applications || []).find((app: any) => {
      const r = app.referenceNo || app.reference_no || app.id;
      return String(r || '').toLowerCase() === String(ref || '').toLowerCase();
    });
    if (match) {
      this.selectApplication(match);
    } else {
      this.selectApplication({ referenceNo: ref, reference_no: ref, id: ref } as any);
    }
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

  private mapApplicationRow(application: any): DistributorPermitRow {
    const refNo = application?.referenceNo || application?.reference_no || application?.id || '';
    const dateValue = application?.submittedAt || application?.submitted_at || application?.createdAt || application?.created_at || '';
    const submittedDate = this.parseDate(dateValue);
    const applicantName = application?.applicantName || application?.applicant_name || application?.applicant?.full_name || this.applicantDisplayName;
    const supplierName = application?.supplierCompanyName || application?.supplier_company_name || application?.distributor_permit_detail?.supplier_company_name || 'N/A';
    const stageStr = application?.current_stage?.name || application?.current_stage || application?.status || 'Pending';

    const distributorPermitRef = application?.distributor_permit_ref_no
      || application?.distributorPermitRefNo
      || application?.distributor_permit_detail?.reference_no
      || application?.distributor_permit_detail?.referenceNo
      || (typeof application?.distributor_permit === 'string' ? application.distributor_permit : '')
      || (typeof application?.distributorPermit === 'string' ? application.distributorPermit : '')
      || supplierName;

    const refNoUpper = String(refNo).toUpperCase();
    const statusLower = String(application?.status || '').toLowerCase();
    const stageLower = String(stageStr).toLowerCase();
    const isActivatedSchedule = Boolean(
      application?.is_activated_schedule ||
      application?.can_submit_application ||
      statusLower.includes('activated') ||
      stageLower.includes('activated') ||
      stageLower.includes('ready for revalidation') ||
      (!refNoUpper.startsWith('IMFLREV') && application?.applicationType === 'revalidation')
    );

    return {
      id: refNo,
      applicationId: refNo || 'N/A',
      distributorPermitRef: distributorPermitRef || 'N/A',
      submittedOn: this.formatDate(dateValue),
      submittedDate,
      paymentStatus: application?.is_excise_duty_fee_paid ? 'Paid' : 'Pending',
      applicantName,
      supplierName,
      currentStage: this.getCurrentStage(stageStr),
      statusGroup: this.getStatusGroup(stageStr, application),
      isActivatedSchedule,
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
    const isoStr = String(value).trim().replace(' ', 'T');
    const date = new Date(isoStr);
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
