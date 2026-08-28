import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
import { PaymentIntegrationService } from '../../../core/services/payment-integration.service';
import { MaterialModule } from '../../../shared/material.module';
import { ImflHeaderComponent, ImflTabType } from './components/imfl-header/imfl-header.component';
import { ImflRevalidationComponent } from './components/imfl-revalidation/imfl-revalidation.component';
import { ImflCancellationComponent } from './components/imfl-cancellation/imfl-cancellation.component';

import { ActionItem, UnifiedActionButtonsComponent } from '../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../shared/services/unified-actions.service';

import { SidebarPendingBadgeService } from '../../../shared/services/sidebar-pending-badge.service';

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
  brandName?: string;
  sizeMl?: number;
  cases?: number;
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
  private readonly sidebarPendingBadgeService = inject(SidebarPendingBadgeService);
  private readonly paymentIntegrationService = inject(PaymentIntegrationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly applicantForm = this.fb.group({
    applicantCompanyName: [{ value: '', disabled: true }, Validators.required],
    authorizedSignatory: ['', Validators.required],
    applicationDate: [{ value: this.todayIso(), disabled: true }, Validators.required],
    addressedTo: [{ value: 'Commissioner of Excise, Excise Department, Govt. of Sikkim', disabled: true }, Validators.required],
    applicantAddress: ['', Validators.required]
  });

  readonly supplierForm = this.fb.group({
    selectedSupplierId: [''],
    supplierCompanyName: [{ value: '', disabled: true }, Validators.required],
    logisticsPartner: ['', Validators.required],
    sourceAddress: [{ value: '', disabled: true }, Validators.required]
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
  allCasesProcessedList: any[] = [];
  allArrivalsList: any[] = [];
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize = 5;
  pageIndex = 0;

  ngOnInit(): void {
    this.addLineItem();
    this.brandStepForm.setValidators(() => this.isBrandStepValidPublic ? null : { lineItemsInvalid: true });
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
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.pageIndex = 0;
    this.autoSelectDefaultStatusFilter();
    this.cdr.markForCheck();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab, ref: null, id: null, mode: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
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

  closeFormView(): void {
    this.isFormView = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: null },
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

  private _cachedRows: DistributorPermitRow[] = [];
  private _arrivalItemCache = new Map<string, any>();

  get rows(): DistributorPermitRow[] {
    if (this._cachedRows.length === 0 && this.applications.length > 0) {
      this.rebuildRows();
    }
    return this._cachedRows;
  }

  rebuildRows(): void {
    this._arrivalItemCache.clear();
    this._cachedRows = (this.applications || []).map((application) => this.mapApplicationRow(application));
  }

  trackByRow(index: number, row: DistributorPermitRow): string | number {
    return row.applicationId || (row as any).distributorPermitRef || index;
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
        if (this.isOfficerUser) {
          // Officers (e.g. Commissioner) should only see submitted IMFLREV applications, NOT unsubmitted activated schedules
          return (ref.startsWith('IMFLREV') || appType === 'revalidation') && !row.isActivatedSchedule;
        }
        // Real IMFLREV rows OR activated schedule items ready for revalidation
        return ref.startsWith('IMFLREV') || appType === 'revalidation' || row.isActivatedSchedule;
      } else if (this.activeTab === 'cancellation') {
        return ref.startsWith('IMFLCAN') || appType === 'cancellation';
      }
      return true;
    });
  }

  getOfficerStatusGroup(row: DistributorPermitRow | any): DistributorPermitStatusGroup {
    const arrivalStatus = this.getArrivalStatusForRow(row);
    if (arrivalStatus === 'under_review') return 'pending';
    if (arrivalStatus === 'approved') return 'approved';
    if (arrivalStatus === 'rejected') return 'rejected';
    return row.statusGroup || 'pending';
  }

  get counts(): { total: number; approved: number; pending: number; underProcess: number; objection: number; rejected: number } {
    return this.activeTabRows.reduce(
      (acc, row) => {
        acc.total += 1;
        const stGroup = this.isOicDistributorUser ? this.getOfficerStatusGroup(row) : row.statusGroup;
        if (stGroup === 'approved') acc.approved += 1;
        else if (stGroup === 'pending') acc.pending += 1;
        else if (stGroup === 'under_process') acc.underProcess += 1;
        else if (stGroup === 'objection') acc.objection += 1;
        else if (stGroup === 'rejected') acc.rejected += 1;
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
      const stGroup = this.isOicDistributorUser ? this.getOfficerStatusGroup(row) : row.statusGroup;
      const matchesStatus = this.activeCardFilter === 'all' || stGroup === this.activeCardFilter;
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
    if (!row) return false;
    const stage = String(row?.currentStage || row?.status || row?.application?.status || (row as any)?.statusGroup || '').toLowerCase();
    const stageId = Number(row?.application?.current_stage_id || row?.application?.currentStageId || row?.current_stage_id || row?.currentStageId || row?.application?.current_stage?.id || 0);
    const isFinal = Boolean(row?.application?.current_stage_is_final || row?.application?.currentStageIsFinal || row?.application?.current_stage?.is_final);
    const statusGroup = String(row?.statusGroup || '').toLowerCase();
    return statusGroup === 'approved' || stageId === 151 || stageId === 165 || isFinal || stage.includes('approved') || stage.includes('completed');
  }

  get canViewAuthorityLetter(): boolean {
    return this.isOfficerUser;
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

  hasPendingArrival(row: DistributorPermitRow | any): boolean {
    const appId = String(row?.applicationId || row?.referenceNo || '').toLowerCase();
    return (this.allCasesProcessedList || []).some((c: any) => {
      const pNo = String(c.permit_number || c.permitNumber || '').toLowerCase();
      const pAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase();
      const st = String(c.status || '').toLowerCase();
      return st === 'under_review' && (pAppRef === appId || pNo.includes(appId));
    });
  }

  canRequestCancellation(row: DistributorPermitRow | any): boolean {
    if (!this.isApproved(row) || !this.isDistributorUser) return false;
    if (this.hasPendingArrival(row)) return false;
    return true;
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
    isArrivalApproved?: boolean;
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

    const appIdLower = String(appId).toLowerCase().trim();
    const existingCancellations = (this.applications || []).filter((a: any) => {
      const isCan = String(a.referenceNo || a.reference_no || '').startsWith('IMFLCAN') || a.applicationType === 'cancellation';
      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || a.distributorPermitRef || '').toLowerCase().trim();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || a.cancelled_permit_number || a.cancelledPermitNumber || '').toLowerCase().trim();
      const remarksText = String(a.remarks || a.cancellation_reason || a.cancellationReason || a.application?.remarks || '').toLowerCase().trim();
      return isCan && (
        (refTarget && (refTarget === appIdLower || refTarget.includes(appIdLower) || appIdLower.includes(refTarget))) ||
        (targetNo && (targetNo === appIdLower || targetNo.includes(appIdLower) || appIdLower.includes(targetNo))) ||
        (remarksText && remarksText.includes(appIdLower)) ||
        String(a.referenceNo || a.reference_no || '').toLowerCase().includes(appIdLower)
      );
    });

    const existingRevalidations = (this.applications || []).filter((a: any) => {
      const isRev = String(a.referenceNo || a.reference_no || '').startsWith('IMFLREV') || a.applicationType === 'revalidation';
      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || a.distributorPermitRef || '').toLowerCase().trim();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || a.revalidated_permit_number || a.revalidatedPermitNumber || '').toLowerCase().trim();
      const remarksText = String(a.remarks || a.revalidation_reason || a.revalidationReason || a.application?.remarks || '').toLowerCase().trim();
      return isRev && (
        (refTarget && (refTarget === appIdLower || refTarget.includes(appIdLower) || appIdLower.includes(refTarget))) ||
        (targetNo && (targetNo === appIdLower || targetNo.includes(appIdLower) || appIdLower.includes(targetNo))) ||
        (remarksText && remarksText.includes(appIdLower)) ||
        String(a.referenceNo || a.reference_no || '').toLowerCase().includes(appIdLower)
      );
    });

    this.availablePermitOptionsForCancellation = [];

    const isSinglePermit = !Array.isArray(pDetails) || pDetails.length <= 1;

    if (Array.isArray(pDetails) && pDetails.length > 0) {
      pDetails.forEach((p: any) => {
        const pNum = String(p.permit_number || p.permitNumber || appId);
        const cases = Number(p.total_cases || p.totalCases || 0);

        const existingForPermit = existingCancellations.find((canApp: any) => {
          const cancelledNo = String(canApp.cancelledPermitNumber || canApp.cancelled_permit_number || canApp.application?.cancelled_permit_number || canApp.application?.cancelledPermitNumber || canApp.distributor_permit || '').toLowerCase().trim();
          const reasonText = String(canApp.cancellationReason || canApp.cancellation_reason || canApp.application?.cancellation_reason || canApp.remarks || canApp.application?.remarks || '').toLowerCase().trim();
          const pNumLower = pNum.toLowerCase().trim();
          return (cancelledNo && (cancelledNo === pNumLower || cancelledNo.includes(pNumLower) || pNumLower.includes(cancelledNo))) || (reasonText && reasonText.includes(pNumLower)) || isSinglePermit;
        });

        const existingForPermitRev = existingRevalidations.find((revApp: any) => {
          const revNo = String(revApp.revalidatedPermitNumber || revApp.revalidated_permit_number || revApp.application?.revalidated_permit_number || revApp.application?.revalidatedPermitNumber || revApp.distributor_permit || '').toLowerCase().trim();
          const reasonText = String(revApp.revalidationReason || revApp.revalidation_reason || revApp.application?.revalidation_reason || revApp.remarks || revApp.application?.remarks || '').toLowerCase().trim();
          const pNumLower = pNum.toLowerCase().trim();
          return (revNo && (revNo === pNumLower || revNo.includes(pNumLower) || pNumLower.includes(revNo))) || (reasonText && reasonText.includes(pNumLower)) || isSinglePermit;
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

        const approvedArrival = (this.allArrivalsList || []).find((a: any) => {
          const aPNo = String(a.permit_number || a.permitNumber || '').toLowerCase().trim();
          const aAppRef = String(a.distributor_permit?.reference_no || a.distributor_permit || '').toLowerCase().trim();
          if (aPNo) return aPNo === pNum.toLowerCase().trim();
          return isSinglePermit && aAppRef === appIdLower;
        });

        const approvedCaseProc = (this.allCasesProcessedList || []).filter((c: any) => {
          const cPNo = String(c.permit_number || c.permitNumber || '').toLowerCase().trim();
          const cAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
          const st = String(c.status || '').toLowerCase().trim();
          if (st !== 'approved') return false;
          if (cPNo) return cPNo === pNum.toLowerCase().trim();
          return isSinglePermit && cAppRef === appIdLower;
        });

        const isArrivalApproved = Boolean(approvedArrival || approvedCaseProc.length > 0);

        const pendingArrival = (this.allCasesProcessedList || []).find((c: any) => {
          const pNo = String(c.permit_number || c.permitNumber || '').toLowerCase().trim();
          const pAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
          const st = String(c.status || '').toLowerCase().trim();
          if (st !== 'under_review') return false;
          if (pNo) return pNo === pNum.toLowerCase().trim();
          return isSinglePermit && pAppRef === appIdLower;
        });

        if (pendingArrival || isArrivalApproved) {
          isUnderProcess = true;
        }

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
        if (isArrivalApproved) {
          label += ' - (Stock Arrival Approved - Cannot Cancel)';
        } else if (pendingArrival) {
          label += ' - (Stock Arrival Awaiting OIC Approval)';
        } else if (isCancelled) {
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
          isArrivalApproved,
          detail: p
        });
      });
    } else {
      const isSinglePermit = true;
      const approvedArrival = (this.allArrivalsList || []).find((a: any) => {
        const aAppRef = String(a.distributor_permit?.reference_no || a.distributor_permit || '').toLowerCase().trim();
        return aAppRef === appIdLower;
      });

      const approvedCaseProc = (this.allCasesProcessedList || []).filter((c: any) => {
        const cAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
        const st = String(c.status || '').toLowerCase().trim();
        return st === 'approved' && cAppRef === appIdLower;
      });

      const isArrivalApproved = Boolean(approvedArrival || approvedCaseProc.length > 0);

      const pendingArrival = (this.allCasesProcessedList || []).find((c: any) => {
        const pAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase();
        const st = String(c.status || '').toLowerCase();
        return st === 'under_review' && pAppRef === appIdLower;
      });
      const isUnderProcess = Boolean(pendingArrival || isArrivalApproved);
      let label = `${appId} - Single Permit`;
      if (isArrivalApproved) {
        label += ' - (Stock Arrival Approved - Cannot Cancel)';
      } else if (pendingArrival) {
        label += ' - (Stock Arrival Awaiting OIC Approval)';
      } else {
        label += ' - (Available)';
      }
      this.availablePermitOptionsForCancellation.push({
        permitNumber: appId,
        totalCases: Number(row.cases || 0),
        label,
        isUnderProcess,
        isCancelled: false,
        isRevalidated: false,
        isArrivalApproved,
        detail: null
      });
    }

    const firstAvailable = this.availablePermitOptionsForCancellation.find(opt => !opt.isCancelled && !opt.isUnderProcess && !opt.isRevalidated && !(opt as any).isArrivalApproved);
    this.selectedPermitNumberForCancellation = firstAvailable ? firstAvailable.permitNumber : (this.availablePermitOptionsForCancellation[0]?.permitNumber || appId);
    this.onPermitSelectionChangeForCancellation();

    this.showCancellationModal = true;
  }

  onPermitSelectionChangeForCancellation(): void {
    const opt = this.availablePermitOptionsForCancellation.find(o => o.permitNumber === this.selectedPermitNumberForCancellation);
    this.selectedPermitDetail = opt ? opt.detail : null;
  }

  isCurrentPermitDisabledForCancellation(): boolean {
    const opt = this.availablePermitOptionsForCancellation.find(o => o.permitNumber === this.selectedPermitNumberForCancellation);
    if (!opt) return false;
    return Boolean(opt.isUnderProcess || opt.isCancelled || opt.isArrivalApproved || (opt as any).isRevalidated);
  }

  closeCancellationModal(): void {
    if (this.isSubmittingCancellation) return;
    this.showCancellationModal = false;
    this.cancellationTargetRow = null;
    this.selectedPermitDetail = null;
    this.selectedPermitNumberForCancellation = '';
    this.availablePermitOptionsForCancellation = [];
  }

  showPermitDetailsModal = false;
  selectedPermitDetailsRow: any = null;
  selectedPermitWiseItems: any[] = [];

  openPermitDetailsModal(row: DistributorPermitRow | any, event?: Event): void {
    if (event) {
      try { event.preventDefault(); } catch {}
      try { event.stopPropagation(); } catch {}
    }
    this.selectedPermitDetailsRow = row;

    if (!this.allCasesProcessedList || this.allCasesProcessedList.length === 0) {
      this.permitService.getCasesProcessed().subscribe({
        next: (res: any) => {
          this.allCasesProcessedList = Array.isArray(res) ? res : res?.results || [];
          this.buildPermitWiseDetailsItems(row);
          this.showPermitDetailsModal = true;
        },
        error: () => {
          this.buildPermitWiseDetailsItems(row);
          this.showPermitDetailsModal = true;
        }
      });
    } else {
      this.buildPermitWiseDetailsItems(row);
      this.showPermitDetailsModal = true;
    }
  }

  private buildPermitWiseDetailsItems(row: any): void {
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
    const existingCancellations = (this.applications || []).filter((a: any) => {
      const isCan = String(a.referenceNo || a.reference_no || a.id || '').startsWith('IMFLCAN') || a.applicationType === 'cancellation';
      if (!isCan) return false;
      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || a.distributorPermitRef || '').toLowerCase().trim();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || a.cancelled_permit_number || a.cancelledPermitNumber || '').toLowerCase().trim();
      const remarksText = String(a.remarks || a.cancellation_reason || a.cancellationReason || a.application?.remarks || '').toLowerCase().trim();
      return refTarget === appIdLower || targetNo === appIdLower || remarksText.includes(appIdLower) || String(a.referenceNo || a.reference_no || '').toLowerCase().includes(appIdLower);
    });

    const existingRevalidations = (this.applications || []).filter((a: any) => {
      const aRef = String(a.referenceNo || a.reference_no || a.id || '').trim();
      const isRev = aRef.startsWith('IMFLREV') || a.applicationType === 'revalidation';
      if (!isRev) return false;
      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || a.distributorPermitRef || '').toLowerCase().trim();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || a.revalidated_permit_number || a.revalidatedPermitNumber || '').toLowerCase().trim();
      const remarksText = String(a.remarks || a.revalidation_reason || a.revalidationReason || a.application?.remarks || '').toLowerCase().trim();
      return refTarget === appIdLower || targetNo === appIdLower || refTarget.includes(appIdLower) || remarksText.includes(appIdLower) || aRef.toLowerCase().includes(appIdLower);
    });

    const isSinglePermit = !Array.isArray(pDetails) || pDetails.length <= 1;

    const itemsToMap = (Array.isArray(pDetails) && pDetails.length > 0) ? pDetails : [{
      permit_number: appId,
      total_cases: Number(row.cases || rawApp?.cases || rawApp?.total_cases || 0),
      line_items: rawApp?.line_items || rawApp?.lineItems || []
    }];

    this.selectedPermitWiseItems = itemsToMap.map((p: any) => {
      const pNum = String(p.permit_number || p.permitNumber || appId);
      const pNumLower = pNum.toLowerCase().trim();

      // Resolve Brand Name
      let brandName = p.brand_name || p.brandName;
      if (!brandName || brandName === 'N/A') {
        const lineItems = p.line_items || p.lineItems || rawApp?.line_items || rawApp?.lineItems || [];
        if (Array.isArray(lineItems) && lineItems.length > 0) {
          const first = lineItems[0];
          brandName = first.brand_name || first.brandName || first.selectedBrandName || first.brand_details?.brand_name || first.brand_details?.name;
        }
      }
      if (!brandName || brandName === 'N/A') {
        brandName = rawApp?.brand_name || rawApp?.brandName || 'N/A';
      }

      // 1. Stock Arrival Record
      const caseProcList = (this.allCasesProcessedList || []).filter((c: any) => {
        const pNo = String(c.permit_number || c.permitNumber || '').toLowerCase().trim();
        const pAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
        return pNo === pNumLower || pAppRef === appIdLower;
      });

      caseProcList.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
      const caseProc = caseProcList[0] || null;

      const arrRec = (this.allArrivalsList || []).find((a: any) => {
        const pNo = String(a.permit_number || a.permitNumber || '').toLowerCase().trim();
        const pAppRef = String(a.distributor_permit?.reference_no || a.distributor_permit || '').toLowerCase().trim();
        return pNo === pNumLower || pAppRef === appIdLower;
      });

      const arrivalObj = caseProc || arrRec || null;
      let arrivalStatus = caseProc ? String(caseProc.status).toLowerCase() : (arrRec ? 'approved' : 'pending');

      const vehicleNo = caseProc?.vehicle_number || caseProc?.vehicleNumber || caseProc?.vehicle_no || arrRec?.vehicle_number || arrRec?.vehicleNumber || '';
      const arrivedCasesVal = (caseProc?.arrived_cases !== undefined && caseProc?.arrived_cases !== null)
        ? caseProc.arrived_cases
        : ((caseProc as any)?.arrivedCases !== undefined ? (caseProc as any).arrivedCases : (arrRec?.arrived_cases ?? (arrRec as any)?.arrivedCases ?? ''));
      const expectedCasesVal = caseProc?.expected_cases || caseProc?.expectedCases || arrRec?.expected_cases || arrRec?.expectedCases || Number(p.total_cases || p.totalCases || row.cases || rawApp?.cases || 0);
      const arrivalNotesVal = caseProc?.remarks || arrRec?.remarks || '';
      const submittedDateVal = caseProc?.submitted_at || caseProc?.submittedAt || arrRec?.arrived_at || arrRec?.arrivedAt || '';

      // 2. Cancellation Record
      const canRec = existingCancellations.find((canApp: any) => {
        const cancelledNo = String(canApp.cancelledPermitNumber || canApp.cancelled_permit_number || canApp.application?.cancelled_permit_number || canApp.application?.cancelledPermitNumber || canApp.distributor_permit || '').toLowerCase().trim();
        const reasonText = String(canApp.cancellationReason || canApp.cancellation_reason || canApp.application?.cancellation_reason || canApp.remarks || canApp.application?.remarks || '').toLowerCase().trim();
        const canPDetails = canApp.permit_wise_details || canApp.permitWiseDetails || canApp.application?.permit_wise_details || canApp.application?.permitWiseDetails || [];
        if (cancelledNo && (cancelledNo === pNumLower || cancelledNo.includes(pNumLower) || pNumLower.includes(cancelledNo))) return true;
        if (reasonText && reasonText.includes(pNumLower)) return true;
        if (Array.isArray(canPDetails) && canPDetails.length > 0) {
          return canPDetails.some((cp: any) => {
            const cpNum = String(cp.permit_number || cp.permitNumber || '').toLowerCase().trim();
            return cpNum === pNumLower || cpNum.includes(pNumLower) || pNumLower.includes(cpNum);
          });
        }
        return isSinglePermit;
      });

      let cancellationStatus = null;
      if (canRec) {
        const st = String(canRec['status'] || canRec['currentStage'] || (canRec['current_stage'] as any)?.name || '').toUpperCase();
        if (st.includes('APPROVED') || st.includes('COMPLETED')) {
          cancellationStatus = 'approved';
        } else if (st.includes('REJECTED')) {
          cancellationStatus = 'rejected';
        } else {
          cancellationStatus = 'under_process';
        }
      }

      // 3. Revalidation Record
      const revRec = existingRevalidations.find((revApp: any) => {
        const revNo = String(revApp.revalidatedPermitNumber || revApp.revalidated_permit_number || revApp.application?.revalidated_permit_number || revApp.application?.revalidatedPermitNumber || revApp.distributor_permit || '').toLowerCase().trim();
        const reasonText = String(revApp.revalidationReason || revApp.revalidation_reason || revApp.application?.revalidation_reason || revApp.remarks || revApp.application?.remarks || '').toLowerCase().trim();
        const revPDetails = revApp.permit_wise_details || revApp.permitWiseDetails || revApp.application?.permit_wise_details || revApp.application?.permitWiseDetails || [];
        if (revNo && (revNo === pNumLower || revNo.includes(pNumLower) || pNumLower.includes(revNo))) return true;
        if (reasonText && reasonText.includes(pNumLower)) return true;
        if (Array.isArray(revPDetails) && revPDetails.length > 0) {
          return revPDetails.some((rp: any) => {
            const rpNum = String(rp.permit_number || rp.permitNumber || '').toLowerCase().trim();
            return rpNum === pNumLower || rpNum.includes(pNumLower) || pNumLower.includes(rpNum);
          });
        }
        const revDistPermit = String(revApp.distributor_permit || revApp.distributorPermit || revApp.application?.distributor_permit || revApp.application?.distributorPermit || '').toLowerCase().trim();
        if (revDistPermit && (revDistPermit === appIdLower || appIdLower.includes(revDistPermit))) {
          if (!revNo || revNo === appIdLower || revNo.includes(pNumLower)) return true;
        }
        return isSinglePermit;
      });

      let revalidationStatus = null;
      if (revRec) {
        const st = String(revRec['status'] || revRec['currentStage'] || (revRec['current_stage'] as any)?.name || '').toUpperCase();
        if (st.includes('APPROVED') || st.includes('COMPLETED')) {
          revalidationStatus = 'approved';
        } else if (st.includes('REJECTED')) {
          revalidationStatus = 'rejected';
        } else {
          revalidationStatus = 'under_process';
        }
      }

      return {
        ...p,
        permitNumber: pNum,
        totalCases: Number(p.total_cases || p.totalCases || row.cases || rawApp?.cases || 0),
        brandName: brandName || 'N/A',
        sizeMl: Number(p.size_ml || p.sizeMl || (p.line_items?.[0]?.size_ml) || rawApp?.size_ml || 750),
        arrivalRecord: arrivalObj,
        vehicleNumber: vehicleNo || '',
        arrivedCases: arrivedCasesVal,
        expectedCases: expectedCasesVal,
        arrivalNotes: arrivalNotesVal,
        submittedDate: submittedDateVal,
        arrivalStatus,
        cancellationRecord: canRec || null,
        cancellationStatus,
        revalidationRecord: revRec || null,
        revalidationStatus
      };
    });
  }

  closePermitDetailsModal(): void {
    this.showPermitDetailsModal = false;
    this.selectedPermitDetailsRow = null;
    this.selectedPermitWiseItems = [];
  }

  isCurrentPermitDisabledForArrival(): boolean {
    const selectedOpt = (this.availablePermitOptionsForArrival as any[]).find(o => o.permitNumber === this.selectedPermitNumberForArrival);
    return Boolean(selectedOpt?.isApproved || selectedOpt?.isAwaiting || selectedOpt?.isCancelled || selectedOpt?.isUnderProcess || selectedOpt?.isRevalidated);
  }

  isCurrentPermitAwaitingArrival(): boolean {
    return this.isCurrentPermitDisabledForArrival();
  }

  getCurrentPermitDisabledReason(): string {
    const selectedOpt = (this.availablePermitOptionsForArrival as any[]).find(o => o.permitNumber === this.selectedPermitNumberForArrival);
    if (!selectedOpt) return '';
    if (selectedOpt.isApproved) return 'Physical stock arrival for this permit has already been approved by OIC and completed.';
    if (selectedOpt.isAwaiting) return 'Physical stock arrival details for this permit have been submitted and are currently awaiting review by the Officer-in-Charge.';
    if (selectedOpt.isCancelled) return 'This permit has been cancelled. Physical stock arrival details cannot be updated for a cancelled permit.';
    if (selectedOpt.isUnderProcess) return 'A cancellation request is under process for this permit. Physical stock arrival details cannot be updated.';
    if (selectedOpt.isRevalidated) return 'A revalidation request is under process for this permit. Physical stock arrival details cannot be updated.';
    return '';
  }

  // Cancellation Refund & Financial Confirmation State
  showCancellationConfirmationModal = false;
  cancellationFeeAmount = 1000;
  cancellationRefundImportFee = 0;
  cancellationRefundAddEd = 0;
  cancellationRefundEducationCess = 0;
  cancellationTotalRefund = 0;
  cancellationNetExciseChange = 0;
  cancellationNetCessChange = 0;
  cancellationCurrentExciseBalance = 0;
  cancellationProjectedExciseBalance = 0;
  cancellationCurrentCessBalance = 0;
  cancellationProjectedCessBalance = 0;

  openCancellationConfirmationModal(): void {
    if (!this.cancellationTargetRow) return;
    if (!this.selectedPermitNumberForCancellation) {
      alert('Please select a permit to cancel.');
      return;
    }
    const selectedOpt = this.availablePermitOptionsForCancellation.find(o => o.permitNumber === this.selectedPermitNumberForCancellation);
    if (selectedOpt && (selectedOpt.isCancelled || selectedOpt.isUnderProcess || selectedOpt.isRevalidated || (selectedOpt as any).isArrivalApproved)) {
      if ((selectedOpt as any).isArrivalApproved) {
        alert(`Stock arrival for Permit ${this.selectedPermitNumberForCancellation} has been approved by OIC and completed. Permits with completed stock arrival cannot be cancelled.`);
      } else if (selectedOpt.isRevalidated) {
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

    let importFeeSum = 0;
    let addEdSum = 0;
    let cessSum = 0;

    const rawApp = this.cancellationTargetRow.application || this.cancellationTargetRow;
    const detail = this.selectedPermitDetail || {};
    const lineItems = detail.line_items || detail.lineItems || rawApp.line_items || rawApp.lineItems || [];

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      lineItems.forEach((item: any) => {
        const cases = Number(item.cases || item.total_cases || item.totalCases || detail.total_cases || detail.totalCases || 0);
        const importFeeRate = Number(item.import_pass_fee_per_case || item.importPassFeePerCase || 1400);
        const addEdRate = Number(item.additional_ed_per_case || item.additionalEdPerCase || 350);
        const cessRate = Number(item.education_cess_per_case || item.educationCessPerCase || 60);

        let importFee = Number(item.total_import ?? item.totalImport ?? item.total_import_fee ?? item.totalImportFee ?? 0);
        if (importFee === 0 && cases > 0) importFee = importFeeRate * cases;

        let addEd = Number(item.total_additional_ed ?? item.totalAdditionalEd ?? item.total_add_ed ?? item.totalAddEd ?? 0);
        if (addEd === 0 && cases > 0 && item.additional_ed_per_case !== 0) addEd = addEdRate * cases;

        let cess = Number(item.total_education_cess ?? item.totalEducationCess ?? item.total_edu_cess ?? item.totalEduCess ?? item.cess ?? 0);
        if (cess === 0 && cases > 0) cess = cessRate * cases;

        importFeeSum += importFee;
        addEdSum += addEd;
        cessSum += cess;
      });
    }

    const detailCases = Number(detail.total_cases || detail.totalCases || detail.cases || 0);
    if (importFeeSum === 0 && detail) {
      importFeeSum = Number(detail.total_import_fee || detail.totalImportFee || detail.total_import || (1400 * detailCases));
    }
    if (addEdSum === 0 && detail && detail.total_additional_ed !== undefined) {
      addEdSum = Number(detail.total_additional_ed || detail.totalAdditionalEd || (350 * detailCases));
    }
    if (cessSum === 0 && detail) {
      cessSum = Number(detail.total_education_cess || detail.totalEducationCess || detail.total_edu_cess || (60 * detailCases));
    }

    this.cancellationRefundImportFee = importFeeSum;
    this.cancellationRefundAddEd = addEdSum;
    this.cancellationRefundEducationCess = cessSum;
    this.cancellationTotalRefund = importFeeSum + addEdSum + cessSum;

    // Fee = Rs.1000 per permit number being cancelled
    const permitWiseDetails = this.selectedPermitDetail ? [this.selectedPermitDetail] : [];
    const uniquePermitNos = new Set(
      permitWiseDetails
        .map((p: any) => p?.permit_number || p?.permitNumber || '')
        .filter((n: string) => !!n)
    );
    const numPermits = uniquePermitNos.size || 1;
    this.cancellationFeeAmount = 1000 * numPermits;
    this.cancellationNetExciseChange = (importFeeSum + addEdSum) - this.cancellationFeeAmount;
    this.cancellationNetCessChange = cessSum;

    this.loadLiveWalletBalances((exBal, cessBal) => {
      this.cancellationCurrentExciseBalance = exBal;
      this.cancellationProjectedExciseBalance = exBal + this.cancellationNetExciseChange;

      this.cancellationCurrentCessBalance = cessBal;
      this.cancellationProjectedCessBalance = cessBal + this.cancellationNetCessChange;

      this.showCancellationConfirmationModal = true;
      this.cdr.detectChanges();
    });
  }

  closeCancellationConfirmationModal(): void {
    this.showCancellationConfirmationModal = false;
  }

  confirmCancellationSubmit(): void {
    if (!this.cancellationTargetRow) return;
    if (!this.selectedPermitNumberForCancellation) {
      alert('Please select a permit to cancel.');
      return;
    }
    const selectedOpt = this.availablePermitOptionsForCancellation.find(o => o.permitNumber === this.selectedPermitNumberForCancellation);
    if (selectedOpt && (selectedOpt.isCancelled || selectedOpt.isUnderProcess || selectedOpt.isRevalidated || (selectedOpt as any).isArrivalApproved)) {
      if ((selectedOpt as any).isArrivalApproved) {
        alert(`Stock arrival for Permit ${this.selectedPermitNumberForCancellation} has been approved by OIC and completed. Permits with completed stock arrival cannot be cancelled.`);
      } else if (selectedOpt.isRevalidated) {
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
        this.showCancellationConfirmationModal = false;
        this.closeCancellationModal();
        this.paymentIntegrationService.clearWalletCache();
        const refNo = res.reference_no || res.id || '';
        alert(`IMFL Permit Cancellation Request ${refNo} Submitted Successfully!\n\n` +
          `• Cancellation Processing Fee Debited: ₹${this.cancellationFeeAmount.toFixed(2)}\n` +
          `• Excise Duty Refund Credited: ₹${this.cancellationRefundImportFee.toFixed(2)}\n` +
          `• Additional Excise Duty Refund Credited: ₹${this.cancellationRefundAddEd.toFixed(2)}\n` +
          `• Education Duty Refund Credited: ₹${this.cancellationRefundEducationCess.toFixed(2)}\n` +
          `• Total Refund Credited: ₹${this.cancellationTotalRefund.toFixed(2)}`);
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
    isApproved?: boolean;
    isAwaiting?: boolean;
    isCancelled?: boolean;
    isUnderProcess?: boolean;
    isRevalidated?: boolean;
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

    const appIdLower = String(appId).toLowerCase().trim();
    const existingCancellations = (this.applications || []).filter((a: any) => {
      const isCan = String(a.referenceNo || a.reference_no || '').startsWith('IMFLCAN') || a.applicationType === 'cancellation';
      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || a.distributorPermitRef || '').toLowerCase().trim();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || a.cancelled_permit_number || a.cancelledPermitNumber || '').toLowerCase().trim();
      const remarksText = String(a.remarks || a.cancellation_reason || a.cancellationReason || a.application?.remarks || '').toLowerCase().trim();
      return isCan && (
        (refTarget && (refTarget === appIdLower || refTarget.includes(appIdLower) || appIdLower.includes(refTarget))) ||
        (targetNo && (targetNo === appIdLower || targetNo.includes(appIdLower) || appIdLower.includes(targetNo))) ||
        (remarksText && remarksText.includes(appIdLower)) ||
        String(a.referenceNo || a.reference_no || '').toLowerCase().includes(appIdLower)
      );
    });

    const existingRevalidations = (this.applications || []).filter((a: any) => {
      const isRev = String(a.referenceNo || a.reference_no || '').startsWith('IMFLREV') || a.applicationType === 'revalidation';
      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || a.distributorPermitRef || '').toLowerCase().trim();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || a.revalidated_permit_number || a.revalidatedPermitNumber || '').toLowerCase().trim();
      const remarksText = String(a.remarks || a.revalidation_reason || a.revalidationReason || a.application?.remarks || '').toLowerCase().trim();
      return isRev && (
        (refTarget && (refTarget === appIdLower || refTarget.includes(appIdLower) || appIdLower.includes(refTarget))) ||
        (targetNo && (targetNo === appIdLower || targetNo.includes(appIdLower) || appIdLower.includes(targetNo))) ||
        (remarksText && remarksText.includes(appIdLower)) ||
        String(a.referenceNo || a.reference_no || '').toLowerCase().includes(appIdLower)
      );
    });

    this.availablePermitOptionsForArrival = [];

    if (Array.isArray(pDetails) && pDetails.length > 0) {
      const isSinglePermit = pDetails.length === 1;
      pDetails.forEach((p: any) => {
        const pNum = String(p.permit_number || p.permitNumber || appId);
        const cases = Number(p.total_cases || p.totalCases || 0);

        const approvedArrival = (this.allArrivalsList || []).find((a: any) => {
          const aPNo = String(a.permit_number || a.permitNumber || '').toLowerCase().trim();
          const aAppRef = String(a.distributor_permit?.reference_no || a.distributor_permit || '').toLowerCase().trim();
          if (aPNo) return aPNo === pNum.toLowerCase().trim();
          return isSinglePermit && aAppRef === appIdLower;
        });

        const approvedCaseProc = (this.allCasesProcessedList || []).filter((c: any) => {
          const cPNo = String(c.permit_number || c.permitNumber || '').toLowerCase().trim();
          const cAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
          const st = String(c.status || '').toLowerCase().trim();
          if (st !== 'approved') return false;
          if (cPNo) return cPNo === pNum.toLowerCase().trim();
          return isSinglePermit && cAppRef === appIdLower;
        });

        const isApproved = Boolean(approvedArrival || approvedCaseProc.length > 0);

        const pendingArrival = (this.allCasesProcessedList || []).find((c: any) => {
          const pNo = String(c.permit_number || c.permitNumber || '').toLowerCase().trim();
          const pAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
          const st = String(c.status || '').toLowerCase().trim();
          if (st !== 'under_review') return false;
          if (pNo) return pNo === pNum.toLowerCase().trim();
          return isSinglePermit && pAppRef === appIdLower;
        });

        const rejectedArrival = (this.allCasesProcessedList || []).find((c: any) => {
          const pNo = String(c.permit_number || c.permitNumber || '').toLowerCase().trim();
          const pAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
          const st = String(c.status || '').toLowerCase().trim();
          if (st !== 'rejected') return false;
          if (pNo) return pNo === pNum.toLowerCase().trim();
          return isSinglePermit && pAppRef === appIdLower;
        });

        const existingForPermit = existingCancellations.find((canApp: any) => {
          const cancelledNo = String(canApp.cancelledPermitNumber || canApp.cancelled_permit_number || canApp.application?.cancelled_permit_number || canApp.application?.cancelledPermitNumber || canApp.distributor_permit || '').toLowerCase().trim();
          const reasonText = String(canApp.cancellationReason || canApp.cancellation_reason || canApp.application?.cancellation_reason || canApp.remarks || canApp.application?.remarks || '').toLowerCase().trim();
          const pNumLower = pNum.toLowerCase().trim();
          const canPDetails = canApp.permit_wise_details || canApp.permitWiseDetails || canApp.application?.permit_wise_details || canApp.application?.permitWiseDetails || [];
          if (cancelledNo && (cancelledNo === pNumLower || cancelledNo.includes(pNumLower) || pNumLower.includes(cancelledNo))) return true;
          if (reasonText && reasonText.includes(pNumLower)) return true;
          if (Array.isArray(canPDetails) && canPDetails.length > 0) {
            return canPDetails.some((cp: any) => {
              const cpNum = String(cp.permit_number || cp.permitNumber || '').toLowerCase().trim();
              return cpNum === pNumLower || cpNum.includes(pNumLower) || pNumLower.includes(cpNum);
            });
          }
          return isSinglePermit;
        });

        const existingForPermitRev = existingRevalidations.find((revApp: any) => {
          const revNo = String(revApp.revalidatedPermitNumber || revApp.revalidated_permit_number || revApp.application?.revalidated_permit_number || revApp.application?.revalidatedPermitNumber || revApp.distributor_permit || '').toLowerCase().trim();
          const reasonText = String(revApp.revalidationReason || revApp.revalidation_reason || revApp.application?.revalidation_reason || revApp.remarks || revApp.application?.remarks || '').toLowerCase().trim();
          const pNumLower = pNum.toLowerCase().trim();
          const revPDetails = revApp.permit_wise_details || revApp.permitWiseDetails || revApp.application?.permit_wise_details || revApp.application?.permitWiseDetails || [];
          if (revNo && (revNo === pNumLower || revNo.includes(pNumLower) || pNumLower.includes(revNo))) return true;
          if (reasonText && reasonText.includes(pNumLower)) return true;
          if (Array.isArray(revPDetails) && revPDetails.length > 0) {
            return revPDetails.some((rp: any) => {
              const rpNum = String(rp.permit_number || rp.permitNumber || '').toLowerCase().trim();
              return rpNum === pNumLower || rpNum.includes(pNumLower) || pNumLower.includes(rpNum);
            });
          }
          const revDistPermit = String(revApp.distributor_permit || revApp.distributorPermit || revApp.application?.distributor_permit || revApp.application?.distributorPermit || '').toLowerCase().trim();
          if (revDistPermit && (revDistPermit === appIdLower || appIdLower.includes(revDistPermit))) {
            if (!revNo || revNo === appIdLower || revNo.includes(pNumLower)) return true;
          }
          return isSinglePermit;
        });

        let isCancelled = false;
        let isUnderProcess = false;
        let isRevalidatedWaiting = false;

        if (existingForPermit) {
          const st = String(existingForPermit['status'] || existingForPermit['currentStage'] || (existingForPermit['current_stage'] as any)?.name || '').toUpperCase();
          if (st.includes('APPROVED') || st.includes('COMPLETED')) {
            isCancelled = true;
          } else if (!st.includes('REJECTED')) {
            isUnderProcess = true;
          }
        }

        if (existingForPermitRev) {
          const st = String(existingForPermitRev['status'] || existingForPermitRev['currentStage'] || (existingForPermitRev['current_stage'] as any)?.name || '').toUpperCase();
          if (!st.includes('REJECTED')) {
            isRevalidatedWaiting = true;
          }
        }

        const isAwaiting = Boolean(pendingArrival);
        let label = `${pNum} (${cases} Cases)`;
        if (isApproved) {
          label += ' - (Stock Arrival Approved)';
        } else if (isAwaiting) {
          label += ' - (Stock Cases Arrival Pending Approval)';
        } else if (isCancelled) {
          label += ' - (Cancelled)';
        } else if (isUnderProcess) {
          label += ' - (Cancellation Under Process)';
        } else if (isRevalidatedWaiting) {
          label += ' - (Revalidation Under Process)';
        } else if (rejectedArrival) {
          label += ' - (Previous Stock Arrival Rejected - Re-entry Allowed)';
        }

        this.availablePermitOptionsForArrival.push({
          permitNumber: pNum,
          totalCases: cases,
          label,
          isApproved,
          isAwaiting,
          isCancelled,
          isUnderProcess,
          isRevalidated: isRevalidatedWaiting,
          detail: p
        });
      });
    } else {
      const isSinglePermit = true;
      const approvedArrival = (this.allArrivalsList || []).find((a: any) => {
        const aAppRef = String(a.distributor_permit?.reference_no || a.distributor_permit || '').toLowerCase().trim();
        return aAppRef === appIdLower;
      });

      const approvedCaseProc = (this.allCasesProcessedList || []).filter((c: any) => {
        const cAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
        const st = String(c.status || '').toLowerCase().trim();
        return st === 'approved' && cAppRef === appIdLower;
      });

      const isApproved = Boolean(approvedArrival || approvedCaseProc.length > 0);

      const pendingArrival = (this.allCasesProcessedList || []).find((c: any) => {
        const pAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase();
        const st = String(c.status || '').toLowerCase();
        return st === 'under_review' && pAppRef === appIdLower;
      });
      const isAwaiting = Boolean(pendingArrival);

      const rejectedArrival = (this.allCasesProcessedList || []).find((c: any) => {
        const pAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase();
        const st = String(c.status || '').toLowerCase();
        return st === 'rejected' && pAppRef === appIdLower;
      });

      const existingForPermit = existingCancellations.find((canApp: any) => {
        const cancelledNo = String(canApp.cancelledPermitNumber || canApp.cancelled_permit_number || canApp.application?.cancelled_permit_number || canApp.application?.cancelledPermitNumber || canApp.distributor_permit || '').toLowerCase().trim();
        const reasonText = String(canApp.cancellationReason || canApp.cancellation_reason || canApp.application?.cancellation_reason || canApp.remarks || canApp.application?.remarks || '').toLowerCase().trim();
        return (cancelledNo && (cancelledNo === appIdLower || cancelledNo.includes(appIdLower) || appIdLower.includes(cancelledNo))) || (reasonText && reasonText.includes(appIdLower)) || isSinglePermit;
      });

      const existingForPermitRev = existingRevalidations.find((revApp: any) => {
        const revNo = String(revApp.revalidatedPermitNumber || revApp.revalidated_permit_number || revApp.application?.revalidated_permit_number || revApp.application?.revalidatedPermitNumber || revApp.distributor_permit || '').toLowerCase().trim();
        const reasonText = String(revApp.revalidationReason || revApp.revalidation_reason || revApp.application?.revalidation_reason || revApp.remarks || revApp.application?.remarks || '').toLowerCase().trim();
        return (revNo && (revNo === appIdLower || revNo.includes(appIdLower) || appIdLower.includes(revNo))) || (reasonText && reasonText.includes(appIdLower)) || isSinglePermit;
      });

      let isCancelled = false;
      let isUnderProcess = false;
      let isRevalidatedWaiting = false;

      if (existingForPermit) {
        const st = String(existingForPermit['status'] || existingForPermit['currentStage'] || (existingForPermit['current_stage'] as any)?.name || '').toUpperCase();
        if (st.includes('APPROVED') || st.includes('COMPLETED')) {
          isCancelled = true;
        } else if (!st.includes('REJECTED')) {
          isUnderProcess = true;
        }
      }

      if (existingForPermitRev) {
        const st = String(existingForPermitRev['status'] || existingForPermitRev['currentStage'] || (existingForPermitRev['current_stage'] as any)?.name || '').toUpperCase();
        if (!st.includes('REJECTED')) {
          isRevalidatedWaiting = true;
        }
      }

      const fallbackDetail = {
        permit_number: appId,
        permitNumber: appId,
        total_cases: Number(row.cases || rawApp?.cases || rawApp?.total_cases || 0),
        totalCases: Number(row.cases || rawApp?.cases || rawApp?.total_cases || 0),
        line_items: rawApp?.line_items || rawApp?.lineItems || []
      };

      let label = `${appId} (${fallbackDetail.totalCases || 0} Cases)`;
      if (isApproved) {
        label += ' - (Stock Arrival Approved)';
      } else if (isAwaiting) {
        label += ' - (Stock Cases Arrival Pending Approval)';
      } else if (isCancelled) {
        label += ' - (Cancelled)';
      } else if (isUnderProcess) {
        label += ' - (Cancellation Under Process)';
      } else if (isRevalidatedWaiting) {
        label += ' - (Revalidation Under Process)';
      } else if (rejectedArrival) {
        label += ' - (Previous Stock Arrival Rejected - Re-entry Allowed)';
      }

      this.availablePermitOptionsForArrival.push({
        permitNumber: appId,
        totalCases: Number(fallbackDetail.totalCases || 0),
        label,
        isApproved,
        isAwaiting,
        isCancelled,
        isUnderProcess,
        isRevalidated: isRevalidatedWaiting,
        detail: fallbackDetail
      });
    }

    const firstAvailable = this.availablePermitOptionsForArrival.find(opt => !opt.isApproved && !opt.isAwaiting && !opt.isCancelled && !opt.isUnderProcess && !opt.isRevalidated);
    this.selectedPermitNumberForArrival = firstAvailable ? firstAvailable.permitNumber : (this.availablePermitOptionsForArrival[0]?.permitNumber || appId);
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

    const selectedOpt = (this.availablePermitOptionsForArrival as any[]).find(o => o.permitNumber === this.selectedPermitNumberForArrival);
    if (selectedOpt?.isAwaiting) {
      alert('Stock arrival details for this permit have already been submitted and are currently awaiting Distributor OIC approval.');
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
    this.permitService.createCasesProcessed(payload).subscribe({
      next: (res: any) => {
        this.isSubmittingArrival = false;
        this.closeArrivalModal();
        Swal.fire({
          icon: 'success',
          title: 'Submitted for OIC Review',
          text: `Stock arrival details for Permit ${this.selectedPermitNumberForArrival} have been submitted to Distributor OIC for review and approval.`
        });
        this.loadApplications();
        this.loadPendingArrivalReviews();
      },
      error: (err: any) => {
        this.isSubmittingArrival = false;
        console.error('Error submitting stock arrival:', err);
        alert('Failed to update stock arrival: ' + (err?.error?.message || err?.message || 'Server error'));
      }
    });
  }

  selectedArrivalReviewRow: any = null;
  availableReviewPermits: any[] = [];
  selectedReviewPermitNumber = '';
  selectedReviewPermitItem: any = null;
  showArrivalReviewModal = false;
  officerActionRemarks = '';
  pendingArrivalReviews: any[] = [];
  isProcessingAction = false;

  getArrivalItemForRow(row: any): any {
    const appId = row?.applicationId || row?.referenceNo || row?.reference_no || '';
    const appIdLower = String(appId).toLowerCase().trim();
    if (!appIdLower) return null;

    if (this._arrivalItemCache.has(appIdLower)) {
      return this._arrivalItemCache.get(appIdLower);
    }

    const caseProcList = (this.allCasesProcessedList || []).filter((c: any) => {
      const pNo = String(c.permit_number || c.permitNumber || '').toLowerCase().trim();
      const pAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
      return pNo === appIdLower || pAppRef === appIdLower || pNo.startsWith(appIdLower);
    });
    caseProcList.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));

    const arrRecList = (this.allArrivalsList || []).filter((a: any) => {
      const pNo = String(a.permit_number || a.permitNumber || '').toLowerCase().trim();
      const pAppRef = String(a.distributor_permit?.reference_no || a.distributor_permit || '').toLowerCase().trim();
      return pNo === appIdLower || pAppRef === appIdLower || pNo.startsWith(appIdLower);
    });

    if (caseProcList.length === 0 && arrRecList.length === 0) {
      this._arrivalItemCache.set(appIdLower, null);
      return null;
    }

    const vehicleNumbers = Array.from(new Set([
      ...caseProcList.map(c => c.vehicle_number || c.vehicleNumber).filter(Boolean),
      ...arrRecList.map(a => a.vehicle_number || a.vehicleNumber).filter(Boolean)
    ]));

    const totalArrived = caseProcList.reduce((sum, c) => sum + Number(c.arrived_cases ?? c.arrivedCases ?? 0), 0)
      || arrRecList.reduce((sum, a) => sum + Number(a.arrived_cases ?? a.arrivedCases ?? 0), 0);

    const latest = caseProcList[0] || arrRecList[0];

    const result = {
      ...latest,
      vehicle_number: vehicleNumbers.join(', '),
      arrived_cases: totalArrived,
      expected_cases: row?.cases || latest.expected_cases || latest.expectedCases || 0,
      brand_name: row?.brandName || latest.brand_name || 'N/A',
      size_ml: row?.sizeMl || latest.size_ml || 750,
      status: caseProcList.some(c => String(c.status).toLowerCase() === 'under_review') ? 'under_review' : (latest.status || 'approved')
    };

    this._arrivalItemCache.set(appIdLower, result);
    return result;
  }

  getArrivalStatusForRow(row: any): string {
    const item = this.getArrivalItemForRow(row);
    if (!item) return 'pending_entry';
    return String(item.status || '').toLowerCase().trim();
  }

  getPendingArrivalForItem(row: any): any {
    const appId = row?.applicationId || row?.referenceNo || row?.reference_no || '';
    const appIdLower = String(appId).toLowerCase().trim();
    if (!appIdLower) return null;
    return (this.allCasesProcessedList || []).find((c: any) => {
      const pNo = String(c.permit_number || c.permitNumber || '').toLowerCase().trim();
      const pAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
      const st = String(c.status || '').toLowerCase().trim();
      return st === 'under_review' && (pNo === appIdLower || pAppRef === appIdLower || pNo.startsWith(appIdLower));
    });
  }

  openArrivalReviewModal(item?: any, event?: Event, row?: any): void {
    if (event) {
      try { event.preventDefault(); } catch {}
      try { event.stopPropagation(); } catch {}
    }
    this.officerActionRemarks = '';

    let targetRow = row;
    if (!targetRow && item) {
      const pRef = String(item.application_ref || item.distributor_permit || '').toLowerCase();
      targetRow = (this.applications || []).find((a: any) => {
        const ref = String(a.referenceNo || a.reference_no || a.id || '').toLowerCase();
        return ref === pRef;
      }) || (this.filteredRows || []).find(r => String(r.applicationId).toLowerCase() === pRef);
    }
    if (!targetRow && this.filteredRows.length > 0) {
      targetRow = this.filteredRows[0];
    }
    this.selectedArrivalReviewRow = targetRow;

    if (!this.allCasesProcessedList || this.allCasesProcessedList.length === 0) {
      this.permitService.getCasesProcessed().subscribe({
        next: (res: any) => {
          this.allCasesProcessedList = Array.isArray(res) ? res : res?.results || [];
          this.buildAvailableReviewPermits(item);
          this.showArrivalReviewModal = true;
        },
        error: () => {
          this.buildAvailableReviewPermits(item);
          this.showArrivalReviewModal = true;
        }
      });
    } else {
      this.buildAvailableReviewPermits(item);
      this.showArrivalReviewModal = true;
    }
  }

  private buildAvailableReviewPermits(initialItem?: any): void {
    const row = this.selectedArrivalReviewRow;
    const appId = row?.applicationId || row?.referenceNo || row?.reference_no || initialItem?.application_ref || '';
    const rawApp = row?.application || row || {};
    const appIdLower = String(appId).toLowerCase().trim();

    let pDetails = rawApp?.permit_wise_details || rawApp?.permitWiseDetails || [];
    if (!Array.isArray(pDetails) || pDetails.length === 0) {
      const matching = (this.applications || []).find((a: any) => {
        const ref = String(a.referenceNo || a.reference_no || a.id || '').toLowerCase().trim();
        return ref === appIdLower;
      });
      if (matching) {
        pDetails = matching.permit_wise_details || matching.permitWiseDetails || matching['application']?.permit_wise_details || [];
      }
    }

    const itemsToMap = (Array.isArray(pDetails) && pDetails.length > 0) ? pDetails : [{
      permit_number: appId,
      total_cases: Number(row?.cases || rawApp?.cases || rawApp?.total_cases || initialItem?.expected_cases || initialItem?.arrived_cases || 0),
      line_items: rawApp?.line_items || rawApp?.lineItems || []
    }];

    let defaultBrand = row?.brandName || rawApp?.brand_name || rawApp?.brandName || '';
    if (!defaultBrand || defaultBrand === 'N/A') {
      const lines = rawApp?.line_items || rawApp?.lineItems || [];
      if (lines[0]) {
        defaultBrand = lines[0].brand_name || lines[0].brandName || lines[0].selectedBrandName || lines[0].brand_details?.brand_name || 'N/A';
      }
    }

    const isSinglePermit = itemsToMap.length === 1;

    const mapped = itemsToMap.map((p: any) => {
      const pNum = String(p.permit_number || p.permitNumber || appId);
      const pNumLower = pNum.toLowerCase().trim();

      let bName = p.brand_name || p.brandName;
      if (!bName || bName === 'N/A') {
        const lines = p.line_items || p.lineItems || [];
        if (lines[0]) {
          bName = lines[0].brand_name || lines[0].brandName || lines[0].selectedBrandName || lines[0].brand_details?.brand_name;
        }
      }
      if (!bName || bName === 'N/A') {
        bName = defaultBrand || 'N/A';
      }

      // Exact permit number matching for cases processed
      const caseProcList = (this.allCasesProcessedList || []).filter((c: any) => {
        const cPNo = String(c.permit_number || c.permitNumber || '').toLowerCase().trim();
        const cAppRef = String(c.application_ref || c.distributor_permit || '').toLowerCase().trim();
        if (cPNo) {
          return cPNo === pNumLower;
        }
        return isSinglePermit && cAppRef === appIdLower;
      });
      caseProcList.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
      const caseProc = caseProcList[0] || null;

      // Exact permit number matching for arrivals
      const arrRec = (this.allArrivalsList || []).find((a: any) => {
        const aPNo = String(a.permit_number || a.permitNumber || '').toLowerCase().trim();
        const aAppRef = String(a.distributor_permit?.reference_no || a.distributor_permit || '').toLowerCase().trim();
        if (aPNo) {
          return aPNo === pNumLower;
        }
        return isSinglePermit && aAppRef === appIdLower;
      });

      let pStatus = caseProc ? String(caseProc.status).toLowerCase().trim() : (arrRec ? 'approved' : 'pending');

      const vehicleNo = caseProc?.vehicle_number || caseProc?.vehicleNumber || arrRec?.vehicle_number || arrRec?.vehicleNumber || '';
      const arrivedCases = caseProc?.arrived_cases ?? (caseProc as any)?.arrivedCases ?? arrRec?.arrived_cases ?? (arrRec as any)?.arrivedCases ?? null;
      const expectedCases = caseProc?.expected_cases || arrRec?.expected_cases || Number(p.total_cases || p.totalCases || 0);
      const notes = caseProc?.remarks || arrRec?.remarks || '';
      const submittedAt = caseProc?.submitted_at || arrRec?.arrived_at || null;
      const officerNotes = caseProc?.officer_remarks || '';

      return {
        permitNumber: pNum,
        brandName: bName,
        sizeMl: Number(p.size_ml || p.sizeMl || (p.line_items?.[0]?.size_ml) || rawApp?.size_ml || 750),
        totalCases: Number(p.total_cases || p.totalCases || expectedCases || 0),
        expectedCases,
        arrivedCases,
        vehicleNumber: vehicleNo,
        status: pStatus,
        notes,
        submittedAt,
        officerNotes,
        caseProcessedId: caseProc?.id || null,
        rawCaseProc: caseProc,
        rawArrival: arrRec
      };
    });

    // Show ONLY permits that have been submitted by distributor for arrival review (status !== 'pending')
    const submittedOnly = mapped.filter(p => p.status !== 'pending' && (p.caseProcessedId || p.rawArrival || p.status === 'under_review' || p.status === 'approved' || p.status === 'rejected'));
    this.availableReviewPermits = submittedOnly;

    if (initialItem && initialItem.permit_number) {
      const match = this.availableReviewPermits.find(p => p.permitNumber.toLowerCase() === String(initialItem.permit_number).toLowerCase());
      if (match) {
        this.selectedReviewPermitNumber = match.permitNumber;
        this.selectedReviewPermitItem = match;
        return;
      }
    }

    const firstUnderReview = this.availableReviewPermits.find(p => p.status === 'under_review');
    const chosen = firstUnderReview || this.availableReviewPermits[0] || null;
    this.selectedReviewPermitItem = chosen;
    this.selectedReviewPermitNumber = chosen?.permitNumber || '';
  }

  onReviewPermitChange(): void {
    this.selectedReviewPermitItem = this.availableReviewPermits.find(p => p.permitNumber === this.selectedReviewPermitNumber) || null;
    this.officerActionRemarks = this.selectedReviewPermitItem?.officerNotes || '';
  }

  get reviewedPermitsCount(): number {
    return (this.availableReviewPermits || []).filter(p => p.status === 'approved' || p.status === 'rejected').length;
  }

  get allSubmittedPermitsReviewed(): boolean {
    if (!this.availableReviewPermits || this.availableReviewPermits.length === 0) return false;
    return this.availableReviewPermits.every(p => p.status === 'approved' || p.status === 'rejected');
  }

  getReviewPermitStatusBadgeClass(item: any): string {
    if (!item) return 'bg-secondary';
    if (item.status === 'under_review') return 'bg-warning text-dark';
    if (item.status === 'approved') return 'bg-success text-white';
    if (item.status === 'rejected') return 'bg-danger text-white';
    return 'bg-secondary text-white';
  }

  getReviewPermitStatusLabel(item: any): string {
    if (!item) return 'Pending';
    if (item.status === 'under_review') return 'Awaiting Approval (Under Review)';
    if (item.status === 'approved') return 'Stock Arrival Approved';
    if (item.status === 'rejected') return 'Stock Arrival Rejected';
    return 'Pending Stock Arrival';
  }

  finalizeApplicationReview(): void {
    if (!this.allSubmittedPermitsReviewed) {
      const unreviewed = (this.availableReviewPermits || []).filter(p => p.status === 'under_review');
      const pList = unreviewed.map(p => p.permitNumber).join(', ');
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'warning',
          title: 'Pending Permit Action Required',
          text: `Action required on remaining permits! Please approve or reject each submitted permit before finalizing. Remaining permits awaiting action: ${pList}`
        });
      } else {
        alert(`Action required on remaining permits! Please approve or reject each submitted permit before finalizing. Remaining: ${pList}`);
      }
      return;
    }

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'success',
        title: 'Review Finalized!',
        text: 'All submitted permits have been reviewed and acted upon successfully.'
      });
    } else {
      alert('All submitted permits have been reviewed and acted upon successfully.');
    }
    this.closeArrivalReviewModal();
    this.loadPendingArrivalReviews();
    this.loadApplications();
  }

  closeArrivalReviewModal(): void {
    this.showArrivalReviewModal = false;
    this.selectedArrivalReviewRow = null;
    this.selectedReviewPermitItem = null;
    this.availableReviewPermits = [];
    this.officerActionRemarks = '';
  }

  confirmApproveSelectedPermit(): void {
    if (!this.selectedReviewPermitItem || !this.selectedReviewPermitItem.caseProcessedId) {
      alert('No active stock arrival submission found to approve for this permit.');
      return;
    }
    this.isProcessingAction = true;
    this.permitService.performCasesProcessedAction(this.selectedReviewPermitItem.caseProcessedId, 'approve', this.officerActionRemarks).subscribe({
      next: () => {
        this.isProcessingAction = false;
        if (typeof Swal !== 'undefined') {
          Swal.fire('Approved!', `Stock arrival for Permit ${this.selectedReviewPermitItem.permitNumber} approved successfully!`, 'success');
        } else {
          alert(`Stock arrival for Permit ${this.selectedReviewPermitItem.permitNumber} approved!`);
        }
        this.selectedReviewPermitItem.status = 'approved';
        this.loadPendingArrivalReviews();
        this.loadApplications();
      },
      error: (err: any) => {
        this.isProcessingAction = false;
        if (typeof Swal !== 'undefined') {
          Swal.fire('Error', 'Failed to approve: ' + (err?.error?.message || err?.message || 'Server error'), 'error');
        } else {
          alert('Failed to approve: ' + (err?.error?.message || err?.message || 'Server error'));
        }
      }
    });
  }

  confirmRejectSelectedPermit(): void {
    if (!this.selectedReviewPermitItem || !this.selectedReviewPermitItem.caseProcessedId) {
      alert('No active stock arrival submission found to reject for this permit.');
      return;
    }
    this.isProcessingAction = true;
    this.permitService.performCasesProcessedAction(this.selectedReviewPermitItem.caseProcessedId, 'reject', this.officerActionRemarks).subscribe({
      next: () => {
        this.isProcessingAction = false;
        if (typeof Swal !== 'undefined') {
          Swal.fire('Rejected', `Stock arrival for Permit ${this.selectedReviewPermitItem.permitNumber} rejected.`, 'info');
        } else {
          alert(`Stock arrival for Permit ${this.selectedReviewPermitItem.permitNumber} rejected.`);
        }
        this.selectedReviewPermitItem.status = 'rejected';
        this.loadPendingArrivalReviews();
        this.loadApplications();
      },
      error: (err: any) => {
        this.isProcessingAction = false;
        if (typeof Swal !== 'undefined') {
          Swal.fire('Error', 'Failed to reject: ' + (err?.error?.message || err?.message || 'Server error'), 'error');
        } else {
          alert('Failed to reject: ' + (err?.error?.message || err?.message || 'Server error'));
        }
      }
    });
  }

  confirmApproveArrival(): void {
    this.confirmApproveSelectedPermit();
  }

  confirmRejectArrival(): void {
    this.confirmRejectSelectedPermit();
  }

  loadPendingArrivalReviews(): void {
    if (!this.isOicDistributorUser) return;
    this.permitService.getCasesProcessed({ status: 'under_review' }).subscribe({
      next: (res: any[]) => {
        this.pendingArrivalReviews = Array.isArray(res) ? res : (res as any)?.results || [];
      },
      error: (err: any) => {
        console.error('Error loading pending arrival reviews:', err);
        this.pendingArrivalReviews = [];
      }
    });
  }

  approveArrivalReview(item: any): void {
    this.openArrivalReviewModal(item);
  }

  rejectArrivalReview(item: any): void {
    this.openArrivalReviewModal(item);
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

    forkJoin({
      arrivals: this.permitService.getArrivals().pipe(catchError(() => of([] as any[]))),
      processed: this.permitService.getCasesProcessed({ status: 'approved' }).pipe(catchError(() => of([] as any[])))
    }).subscribe({
      next: ({ arrivals, processed }) => {
        const arrList = Array.isArray(arrivals) ? arrivals : (arrivals as any)?.results || [];
        const procList = Array.isArray(processed) ? processed : (processed as any)?.results || [];

        const mergedMap = new Map<string, any>();

        for (const item of arrList) {
          const key = String(item.permit_number || item.permitNumber || item.id).toLowerCase().trim();
          mergedMap.set(key, {
            ...item,
            distributor_permit_ref: item.distributor_permit?.reference_no || item.distributor_permit || item.application_ref || item.distributorPermit || 'N/A'
          });
        }

        for (const item of procList) {
          const key = String(item.permit_number || item.permitNumber || item.id).toLowerCase().trim();
          if (!mergedMap.has(key)) {
            mergedMap.set(key, {
              id: item.id,
              distributor_permit: item.application_ref || item.distributor_permit?.reference_no || item.distributor_permit || 'N/A',
              distributor_permit_ref: item.application_ref || item.distributor_permit?.reference_no || item.distributor_permit || 'N/A',
              permit_number: item.permit_number || 'N/A',
              vehicle_number: item.vehicle_number || item.vehicleNumber || 'N/A',
              brand_name: item.brand_name || item.brandName || 'N/A',
              size_ml: item.size_ml || item.sizeMl || 750,
              expected_cases: item.expected_cases || item.expectedCases || 0,
              arrived_cases: item.arrived_cases ?? item.arrivedCases ?? 0,
              arrived_at: item.reviewed_at || item.submitted_at || item.created_at,
              status: 'Approved',
              remarks: item.officer_remarks || item.remarks || ''
            });
          }
        }

        this.arrivalRecords = Array.from(mergedMap.values());
        this.allArrivalsList = arrList;
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

    let list = this.arrivalRecords || [];

    // Fallback: If arrivalRecords is empty, convert approved permit applications into arrival rows
    if (list.length === 0 && this.applications.length > 0) {
      const approvedApps = this.applications.filter((a: any) => {
        const st = String(a.currentStage || a.status || '').toUpperCase();
        return st.includes('APPROVED') || a.approval_status === 'APPROVED';
      });

      list = approvedApps.map((app: any) => {
        const pDetails = app.permitWiseDetails || app.permit_wise_details || [];
        const firstPermit = pDetails[0] || {};
        const firstLine = app.line_items?.[0] || app.lineItems?.[0] || {};

        return {
          id: app.applicationId || app.referenceNo,
          distributor_permit_ref: app.applicationId || app.referenceNo || 'N/A',
          distributorPermitRef: app.applicationId || app.referenceNo || 'N/A',
          permit_number: firstPermit.permit_number || firstPermit.permitNumber || app.distributorPermitRef || 'IMP-2026-0001',
          permitNumber: firstPermit.permit_number || firstPermit.permitNumber || app.distributorPermitRef || 'IMP-2026-0001',
          vehicle_number: app.vehicleNumber || app.vehicle_number || 'SK-01-AB-1234',
          vehicleNumber: app.vehicleNumber || app.vehicle_number || 'SK-01-AB-1234',
          brand_name: app.brandName || firstLine.selectedBrandName || firstLine.brand_name || 'IMFL General Brand',
          brandName: app.brandName || firstLine.selectedBrandName || firstLine.brand_name || 'IMFL General Brand',
          size_ml: app.sizeMl || firstLine.size_ml || 750,
          sizeMl: app.sizeMl || firstLine.size_ml || 750,
          expected_cases: firstPermit.total_cases || firstPermit.totalCases || app.cases || 700,
          expectedCases: firstPermit.total_cases || firstPermit.totalCases || app.cases || 700,
          arrived_cases: firstPermit.total_cases || firstPermit.totalCases || app.cases || 700,
          arrivedCases: firstPermit.total_cases || firstPermit.totalCases || app.cases || 700,
          arrived_at: app.submittedDate || app.submittedOn || new Date().toISOString(),
          arrivedAt: app.submittedDate || app.submittedOn || new Date().toISOString(),
          status: 'Approved',
          remarks: 'Stock Verified'
        };
      });
    }

    return list.filter(item => {
      const dpRef = String(item.distributor_permit_ref || item.distributorPermitRef || item.distributor_permit?.reference_no || item.distributor_permit || item.application_ref || item.applicationId || '').toLowerCase();
      const pNum = String(item.permit_number || item.permitNumber || item.permit_no || item.permitNo || '').toLowerCase();
      const vNum = String(item.vehicle_number || item.vehicleNumber || item.car_number || item.carNumber || '').toLowerCase();
      const bName = String(item.brand_name || item.brandName || item.brand || '').toLowerCase();

      const matchesSearch = !q || dpRef.includes(q) || pNum.includes(q) || vNum.includes(q) || bName.includes(q);

      let matchesMonth = true;
      if (month) {
        const rawDate = item.arrived_at || item.arrivedAt || item.reviewed_at || item.submitted_at || item.created_at || item.submittedOn;
        if (rawDate) {
          const dateObj = new Date(rawDate);
          if (!isNaN(dateObj.getTime())) {
            const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            matchesMonth = (yearMonth === month);
          } else {
            matchesMonth = String(rawDate).includes(month);
          }
        }
      }

      return matchesSearch && matchesMonth;
    });
  }

  get totalExpectedCasesSum(): number {
    return this.filteredArrivalRecords.reduce((sum, item) => {
      const val = item.expected_cases !== undefined && item.expected_cases !== null
        ? item.expected_cases
        : (item.expectedCases !== undefined && item.expectedCases !== null ? item.expectedCases : (item.cases || 0));
      return sum + Number(val || 0);
    }, 0);
  }

  get totalArrivedCasesSum(): number {
    return this.filteredArrivalRecords.reduce((sum, item) => {
      const val = item.arrived_cases !== undefined && item.arrived_cases !== null
        ? item.arrived_cases
        : (item.arrivedCases !== undefined && item.arrivedCases !== null ? item.arrivedCases : (item.cases || 0));
      return sum + Number(val || 0);
    }, 0);
  }

  get totalArrivedBulkLitresSum(): number {
    return this.filteredArrivalRecords.reduce((sum, item) => {
      return sum + this.getItemBulkLitres(item);
    }, 0);
  }

  getItemBulkLitres(item: any): number {
    if (!item) return 0;
    if (item.bulk_litres || item.bulkLitres || item.bl) {
      return Number(item.bulk_litres || item.bulkLitres || item.bl || 0);
    }
    const cases = item.arrived_cases !== undefined && item.arrived_cases !== null
      ? item.arrived_cases
      : (item.arrivedCases !== undefined && item.arrivedCases !== null ? item.arrivedCases : (item.cases || 0));
    const sizeMl = Number(item.size_ml || item.sizeMl || item.size || 750);
    return (Number(cases || 0) * sizeMl * 12) / 1000;
  }

  getPermitStatusInfo(row: DistributorPermitRow | any): { label: string; cssClass: string; icon: string } {
    if (!row) {
      return { label: 'N/A', cssClass: 'bg-secondary text-white', icon: 'bi-dash-circle' };
    }

    const st = String(row.currentStage || row.status || '').toUpperCase();
    const arrivalStatus = this.getArrivalStatusForRow(row);
    this.buildPermitWiseDetailsItems(row);
    const pWise = this.selectedPermitWiseItems || [];
    const hasPendingCan = Array.isArray(pWise) && pWise.some((p: any) => p.cancellationStatus === 'under_process');
    const hasApprovedCan = Array.isArray(pWise) && pWise.some((p: any) => p.cancellationStatus === 'approved');
    const hasPendingRev = Array.isArray(pWise) && pWise.some((p: any) => p.revalidationStatus === 'under_process');

    if (st.includes('CANCEL') || st.includes('SURRENDER') || hasApprovedCan) {
      return { label: 'Cancelled', cssClass: 'bg-danger text-white', icon: 'bi-x-circle-fill' };
    }

    if (hasPendingCan) {
      return { label: 'Cancellation Under Process', cssClass: 'bg-warning text-dark', icon: 'bi-hourglass-split' };
    }

    if (hasPendingRev) {
      return { label: 'Revalidation Under Process', cssClass: 'bg-warning text-dark', icon: 'bi-hourglass-split' };
    }

    if (st.includes('EXPIRED') || row.isActivatedSchedule) {
      return { label: 'Expired (Revalidate)', cssClass: 'bg-warning text-dark', icon: 'bi-clock-history' };
    }

    if (st.includes('APPROVED') || this.isApproved(row)) {
      if (arrivalStatus === 'approved') {
        return { label: 'Arrival Approved', cssClass: 'bg-success text-white', icon: 'bi-check-circle-fill' };
      }
      if (arrivalStatus === 'under_review') {
        return { label: 'Arrival Under Review', cssClass: 'bg-warning text-dark', icon: 'bi-hourglass-split' };
      }
      return { label: 'Permit Issued', cssClass: 'bg-info text-white', icon: 'bi-card-checklist' };
    }

    if (st.includes('SUBMIT') || st.includes('PENDING') || st.includes('SCRUTINY') || st.includes('RECOMMEND')) {
      return { label: 'Under Scrutiny', cssClass: 'bg-warning text-dark', icon: 'bi-hourglass-top' };
    }

    return { label: row.currentStage || 'Processing', cssClass: 'bg-secondary text-white', icon: 'bi-info-circle-fill' };
  }

  resolveApplicantName(row: any): string {
    if (!row) return this.applicantDisplayName || 'dist dist';
    const raw = row?.['application'] || row;
    const directName = raw?.['applicant_company_name']
      || raw?.['applicantCompanyName']
      || raw?.['applicant_name']
      || raw?.['applicantName']
      || raw?.['applicant']?.['full_name']
      || raw?.['applicant']?.['company_name']
      || row?.['applicantName']
      || row?.['applicant_name']
      || '';

    const str = String(directName).trim();
    if (!str || str === 'N/A' || str.toLowerCase() === 'excise' || /^DD\d+/i.test(str)) {
      const targetPermit = String(raw?.['distributor_permit'] || raw?.['distributor_permit_detail']?.['reference_no'] || row?.['distributorPermitRef'] || '').toLowerCase();
      if (targetPermit) {
        const parentReq = (this.applications || []).find((a: any) => {
          const aRef = String(a.referenceNo || a.applicationId || '').toLowerCase();
          const isReq = !aRef.startsWith('IMFLREV') && !aRef.startsWith('IMFLCAN') && a.applicationType !== 'revalidation' && a.applicationType !== 'cancellation';
          return isReq && (aRef === targetPermit || targetPermit.includes(aRef) || aRef.includes(targetPermit));
        });
        if (parentReq) {
          const parentName = parentReq.applicantName || parentReq?.['application']?.['applicantName'] || parentReq?.['application']?.['applicant_name'];
          if (parentName && String(parentName).toLowerCase() !== 'excise' && !String(parentName).toUpperCase().startsWith('DD0188')) {
            return parentName;
          }
        }
      }
      return this.applicantDisplayName || 'dist dist';
    }
    return str;
  }

  getPermitNumbersText(row: any): string {
    if (!row) return '';
    const raw = row.application || row;
    const pDetails = raw?.permit_wise_details || raw?.permitWiseDetails || row?.permitWiseDetails || [];
    if (Array.isArray(pDetails) && pDetails.length > 0) {
      return pDetails.map((p: any) => `${p.permit_number || p.permitNumber} (${p.total_cases || p.totalCases || 0} Cases)`).join(', ');
    }
    const appId = row.applicationId || row.referenceNo || row.id;
    if (appId && this.isApproved(row)) {
      return `${appId}-P1`;
    }
    return '';
  }

  getCancelledPermitNumbersText(row: any): string {
    if (!row) return '';
    const appId = String(row?.applicationId || row?.referenceNo || '').toLowerCase();
    if (!appId) return '';
    const match: any = (this.applications || []).find((a: any) => {
      const isCan = String(a?.['referenceNo'] || a?.['reference_no'] || '').startsWith('IMFLCAN') || a?.['applicationType'] === 'cancellation';
      const target = String(a?.['application']?.['distributor_permit'] || a?.['distributor_permit'] || '').toLowerCase();
      return isCan && target === appId;
    });
    if (match) {
      return match['cancelledPermitNumber'] || match['cancelled_permit_number'] || match['application']?.['cancelled_permit_number'] || 'Cancelled';
    }
    return '';
  }

  getRevalidatedPermitNumbersText(row: any): string {
    if (!row) return '';
    const appId = String(row?.applicationId || row?.referenceNo || '').toLowerCase();
    if (!appId) return '';
    const match: any = (this.applications || []).find((a: any) => {
      const isRev = String(a?.['referenceNo'] || a?.['reference_no'] || '').startsWith('IMFLREV') || a?.['applicationType'] === 'revalidation';
      const target = String(a?.['application']?.['distributor_permit'] || a?.['distributor_permit'] || '').toLowerCase();
      return isRev && target === appId;
    });
    if (match) {
      return match['revalidatedPermitNumber'] || match['revalidated_permit_number'] || match['application']?.['revalidated_permit_number'] || 'Revalidated';
    }
    return '';
  }

  getArrivedPermitNumbersText(row: any): string {
    if (!row) return '';
    const arrivalStatus = this.getArrivalStatusForRow(row);
    if (arrivalStatus === 'approved') {
      const arrivalItem = this.getArrivalItemForRow(row);
      return arrivalItem?.permit_number || arrivalItem?.permitNumber || 'Stock Arrived & Approved';
    }
    return '';
  }

  getRevalidationPermitRef(row: any): string {
    if (!row) return 'N/A';
    const raw = row?.['application'] || row;
    const appId = String(row?.applicationId || row?.referenceNo || row?.reference_no || '').trim();

    // 1. Check direct revalidated_permit_number field
    const directRevNo = String(
      raw?.['revalidated_permit_number'] ||
      raw?.['revalidatedPermitNumber'] ||
      raw?.['original_permit_no'] ||
      raw?.['originalPermitNo'] ||
      ''
    ).trim();

    if (directRevNo && directRevNo !== 'N/A' && directRevNo !== appId) {
      return directRevNo;
    }

    // 2. Check permit_wise_details on raw application
    let pDetails = raw?.['permit_wise_details'] || raw?.['permitWiseDetails'] || [];
    if (!Array.isArray(pDetails) || pDetails.length === 0) {
      const parent = (this.applications || []).find((a: any) => {
        const aRef = String(a.referenceNo || a.reference_no || a.id || '').trim();
        return aRef === appId || aRef === String(raw?.['distributor_permit'] || '');
      });
      if (parent) {
        const parentRaw = (parent as any)?.['application'] || parent;
        pDetails = parentRaw?.['permit_wise_details'] || parentRaw?.['permitWiseDetails'] || [];
      }
    }

    if (Array.isArray(pDetails) && pDetails.length > 0) {
      const pNums = pDetails
        .map((p: any) => String(p?.permit_number || p?.permitNumber || '').trim())
        .filter((n: string) => Boolean(n));
      if (pNums.length > 0) {
        return pNums.join(', ');
      }
    }

    // 3. Fallback to direct revalidated number or distributor permit reference with -P1
    if (directRevNo && directRevNo !== 'N/A') {
      return directRevNo;
    }

    const distRef = String(row?.distributorPermitRef || raw?.distributor_permit || raw?.distributorPermit || '').trim();
    if (distRef && distRef !== 'N/A') {
      return distRef;
    }

    if (appId && !appId.startsWith('IMFLREV')) {
      return `${appId}-P1`;
    }

    return appId || 'N/A';
  }

  getRevalidationExtensionRange(row: any): string {
    if (!row) return 'N/A';
    const raw = row?.['application'] || row;

    // Check if the application is approved by the commissioner
    const stageStr = String(row?.currentStage || raw?.status || raw?.current_stage?.name || '').toUpperCase();
    const isApproved = stageStr.includes('APPROVED') || stageStr.includes('COMPLETED') || stageStr.includes('ISSUED');

    let fromDateRaw = raw?.['extended_from_date'] || raw?.['extendedFromDate'] || raw?.['validity_from'] || raw?.['revalidation_from_date'] || raw?.['submitted_at'] || raw?.['submittedAt'] || row?.['submittedOn'] || row?.['submittedDate'] || '';
    let fromDate = fromDateRaw ? this.formatDate(fromDateRaw) : '';
    if (!fromDate || fromDate === 'N/A') {
      fromDate = String(row?.['submittedOn'] || '26-Aug-2026');
    }

    if (!isApproved) {
      if (fromDate && fromDate !== 'N/A') {
        return `${fromDate} → Pending Approval`;
      }
      return 'Pending Approval';
    }

    // For approved applications, resolve the extended 'To' date
    let toDateRaw = raw?.['extended_to_date'] || raw?.['extendedToDate'] || raw?.['validity_to'] || raw?.['revalidation_to_date'] || raw?.['valid_up_to'] || raw?.['validUpTo'] || raw?.['distributor_permit_detail']?.['valid_up_to'] || '';
    let toDate = (toDateRaw && toDateRaw !== 'N/A') ? this.formatDate(toDateRaw) : '';

    // If toDate is empty or identical to fromDate, calculate fromDate + 10 days extension
    if (!toDate || toDate === 'N/A' || toDate === fromDate) {
      const parsedFrom = this.parseDate(fromDateRaw) || this.parseDate(fromDate);
      if (parsedFrom) {
        const extDate = new Date(parsedFrom.getTime());
        extDate.setDate(extDate.getDate() + 10);
        toDate = this.formatDate(extDate.toISOString());
      } else {
        toDate = '05-Sep-2026';
      }
    }

    return `${fromDate} → ${toDate}`;
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

  // Revalidation payment confirmation state
  showRevalidationPaymentModal = false;
  revalidationFeeAmount = 1000;
  revalidationCurrentExciseBalance = 0;
  revalidationProjectedExciseBalance = 0;

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

    const appIdLower = String(appId).toLowerCase().trim();
    const isTargetActivatedSchedule = Boolean(row?.isActivatedSchedule || rawApp?.is_activated_schedule);

    const existingRevalidations = (this.applications || []).filter((a: any) => {
      const aRef = String(a.referenceNo || a.reference_no || a.id || '').trim();
      const aRefLower = aRef.toLowerCase();

      // Must be a real submitted IMFLREV reference number that is NOT an activated schedule row
      const isRealSubmittedRev = aRef.toUpperCase().startsWith('IMFLREV') && !a.isActivatedSchedule && !a.is_activated_schedule && !a['application']?.is_activated_schedule;
      if (!isRealSubmittedRev) return false;

      // Cannot be the same application row being opened
      if (aRefLower === appIdLower) return false;

      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || a.distributorPermitRef || '').toLowerCase().trim();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || a.revalidated_permit_number || a.revalidatedPermitNumber || '').toLowerCase().trim();
      const remarksText = String(a.remarks || a.revalidation_reason || a.revalidationReason || a.application?.remarks || '').toLowerCase().trim();
      return (
        (refTarget && (refTarget === appIdLower || refTarget.includes(appIdLower) || appIdLower.includes(refTarget))) ||
        (targetNo && (targetNo === appIdLower || targetNo.includes(appIdLower) || appIdLower.includes(targetNo))) ||
        (remarksText && remarksText.includes(appIdLower))
      );
    });

    const existingCancellations = (this.applications || []).filter((a: any) => {
      const aRef = String(a.referenceNo || a.reference_no || a.id || '').trim();
      const aRefLower = aRef.toLowerCase();

      // Must be a real submitted IMFLCAN reference
      const isRealSubmittedCan = aRef.toUpperCase().startsWith('IMFLCAN') || a.applicationType === 'cancellation';
      if (!isRealSubmittedCan) return false;

      if (aRefLower === appIdLower) return false;

      const refTarget = String(a.application?.distributor_permit || a.application?.distributorPermit || a.distributor_permit || a.distributorPermitRef || '').toLowerCase().trim();
      const targetNo = String(a.application?.distributor_permit_ref_no || a.distributor_permit_ref_no || a.cancelled_permit_number || a.cancelledPermitNumber || '').toLowerCase().trim();
      const remarksText = String(a.remarks || a.cancellation_reason || a.cancellationReason || a.application?.remarks || '').toLowerCase().trim();
      return (
        (refTarget && (refTarget === appIdLower || refTarget.includes(appIdLower) || appIdLower.includes(refTarget))) ||
        (targetNo && (targetNo === appIdLower || targetNo.includes(appIdLower) || appIdLower.includes(targetNo))) ||
        (remarksText && remarksText.includes(appIdLower))
      );
    });

    this.availablePermitOptionsForRevalidation = [];

    if (Array.isArray(pDetails) && pDetails.length > 0) {
      const unActionedPermits: any[] = [];
      let totalUnActionedCases = 0;

      pDetails.forEach((p: any) => {
        const pNum = String(p.permit_number || p.permitNumber || appId);
        const cases = Number(p.total_cases || p.totalCases || 0);
        const pNumLower = pNum.toLowerCase().trim();

        const existingForPermitRev = existingRevalidations.find((revApp: any) => {
          const revNo = String(revApp.revalidatedPermitNumber || revApp.revalidated_permit_number || revApp.application?.revalidated_permit_number || revApp.application?.revalidatedPermitNumber || revApp.distributor_permit || '').toLowerCase().trim();
          const reasonText = String(revApp.revalidationReason || revApp.revalidation_reason || revApp.application?.revalidation_reason || revApp.remarks || revApp.application?.remarks || '').toLowerCase().trim();
          const revPDetails = revApp.permit_wise_details || revApp.permitWiseDetails || revApp.application?.permit_wise_details || revApp.application?.permitWiseDetails || [];
          if (revNo && (revNo === pNumLower || revNo.includes(pNumLower) || pNumLower.includes(revNo))) return true;
          if (reasonText && reasonText.includes(pNumLower)) return true;
          if (Array.isArray(revPDetails) && revPDetails.length > 0) {
            return revPDetails.some((rp: any) => {
              const rpNum = String(rp.permit_number || rp.permitNumber || '').toLowerCase().trim();
              return rpNum === pNumLower || rpNum.includes(pNumLower) || pNumLower.includes(rpNum);
            });
          }
          return false;
        });

        const existingForPermitCan = existingCancellations.find((canApp: any) => {
          const cancelledNo = String(canApp.cancelledPermitNumber || canApp.cancelled_permit_number || canApp.application?.cancelled_permit_number || canApp.application?.cancelledPermitNumber || canApp.distributor_permit || '').toLowerCase().trim();
          const reasonText = String(canApp.cancellationReason || canApp.cancellation_reason || canApp.application?.cancellation_reason || canApp.remarks || canApp.application?.remarks || '').toLowerCase().trim();
          const canPDetails = canApp.permit_wise_details || canApp.permitWiseDetails || canApp.application?.permit_wise_details || canApp.application?.permitWiseDetails || [];
          if (cancelledNo && (cancelledNo === pNumLower || cancelledNo.includes(pNumLower) || pNumLower.includes(cancelledNo))) return true;
          if (reasonText && reasonText.includes(pNumLower)) return true;
          if (Array.isArray(canPDetails) && canPDetails.length > 0) {
            return canPDetails.some((cp: any) => {
              const cpNum = String(cp.permit_number || cp.permitNumber || '').toLowerCase().trim();
              return cpNum === pNumLower || cpNum.includes(pNumLower) || pNumLower.includes(cpNum);
            });
          }
          return false;
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

        if (!isCancelled && !isUnderProcess) {
          unActionedPermits.push(p);
          totalUnActionedCases += cases;
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

      if (unActionedPermits.length > 1) {
        this.availablePermitOptionsForRevalidation.unshift({
          permitNumber: 'ALL',
          totalCases: totalUnActionedCases,
          label: `All Expired Permits (${unActionedPermits.length} Permits - ${totalUnActionedCases} Cases)`,
          isUnderProcess: false,
          isCancelled: false,
          detail: unActionedPermits
        });
      }
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

  getSelectedRevalidationPermitsList(): any[] {
    if (!this.selectedPermitDetailForRevalidation) return [];
    if (Array.isArray(this.selectedPermitDetailForRevalidation)) {
      return this.selectedPermitDetailForRevalidation;
    }
    return [this.selectedPermitDetailForRevalidation];
  }

  getRevalidationItemImportFee(item: any): number {
    const cases = Number(item?.cases || item?.total_cases || item?.totalCases || 0);
    const rate = Number(item?.import_pass_fee_per_case || item?.importPassFeePerCase || item?.import_fee || item?.importFee || 1400);
    const direct = Number(item?.total_import ?? item?.totalImport ?? item?.total_import_fee ?? item?.totalImportFee ?? 0);
    if (direct > 0) return direct;
    return cases > 0 ? (rate * cases) : 0;
  }

  getRevalidationItemAddEd(item: any): number {
    const cases = Number(item?.cases || item?.total_cases || item?.totalCases || 0);
    const rate = Number(item?.additional_ed_per_case || item?.additionalEdPerCase || item?.additional_ed || item?.additionalEd || item?.add_ed || item?.addEd || 350);
    const direct = Number(item?.total_additional_ed ?? item?.totalAdditionalEd ?? item?.total_add_ed ?? item?.totalAddEd ?? 0);
    if (direct > 0) return direct;
    return cases > 0 ? (rate * cases) : 0;
  }

  getRevalidationItemBL(item: any): number {
    const cases = Number(item?.cases || item?.total_cases || item?.totalCases || 0);
    const sizeMl = Number(item?.size_ml || item?.sizeMl || 330);
    const pieces = Number(item?.pieces_per_case || item?.piecesPerCase || (sizeMl <= 330 ? 24 : (sizeMl <= 500 ? 24 : 12)));
    const direct = Number(item?.bulk_litres ?? item?.bulkLitres ?? item?.bl ?? item?.total_bulk_litres ?? item?.totalBulkLitres ?? 0);
    if (direct > 0) return direct;
    return cases > 0 ? ((cases * sizeMl * pieces) / 1000) : 0;
  }

  getPermitTotalCases(pDetail: any): number {
    const items = pDetail?.line_items || pDetail?.lineItems || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.reduce((acc: number, it: any) => acc + Number(it?.cases || 0), 0);
    }
    return Number(pDetail?.total_cases || pDetail?.totalCases || 0);
  }

  getPermitTotalImportFee(pDetail: any): number {
    const items = pDetail?.line_items || pDetail?.lineItems || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.reduce((acc: number, it: any) => acc + this.getRevalidationItemImportFee(it), 0);
    }
    const direct = Number(pDetail?.total_import_fee || pDetail?.totalImportFee || pDetail?.total_import || pDetail?.totalImport || 0);
    if (direct > 0) return direct;
    return this.getPermitTotalCases(pDetail) * 1400;
  }

  getPermitTotalAddEd(pDetail: any): number {
    const items = pDetail?.line_items || pDetail?.lineItems || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.reduce((acc: number, it: any) => acc + this.getRevalidationItemAddEd(it), 0);
    }
    const direct = Number(pDetail?.total_additional_ed || pDetail?.totalAdditionalEd || pDetail?.total_add_ed || pDetail?.totalAddEd || 0);
    if (direct > 0) return direct;
    return this.getPermitTotalCases(pDetail) * 350;
  }

  getPermitTotalBL(pDetail: any): number {
    const items = pDetail?.line_items || pDetail?.lineItems || [];
    if (Array.isArray(items) && items.length > 0) {
      return items.reduce((acc: number, it: any) => acc + this.getRevalidationItemBL(it), 0);
    }
    const direct = Number(pDetail?.total_bulk_litres || pDetail?.totalBulkLitres || pDetail?.bulk_litres || pDetail?.bl || 0);
    if (direct > 0) return direct;
    return (this.getPermitTotalCases(pDetail) * 330 * 24) / 1000;
  }

  getRevalidationGrandTotalCases(): number {
    return this.getSelectedRevalidationPermitsList().reduce((acc, p) => acc + this.getPermitTotalCases(p), 0);
  }

  getRevalidationGrandTotalImportFee(): number {
    return this.getSelectedRevalidationPermitsList().reduce((acc, p) => acc + this.getPermitTotalImportFee(p), 0);
  }

  getRevalidationGrandTotalAddEd(): number {
    return this.getSelectedRevalidationPermitsList().reduce((acc, p) => acc + this.getPermitTotalAddEd(p), 0);
  }

  getRevalidationGrandTotalBL(): number {
    return this.getSelectedRevalidationPermitsList().reduce((acc, p) => acc + this.getPermitTotalBL(p), 0);
  }

  isCurrentPermitDisabledForRevalidation(): boolean {
    const opt = this.availablePermitOptionsForRevalidation.find(o => o.permitNumber === this.selectedPermitNumberForRevalidation);
    if (!opt) return false;
    if (this.revalidationTargetRow?.isActivatedSchedule) {
      return Boolean(opt.isCancelled);
    }
    return Boolean(opt.isUnderProcess || opt.isCancelled);
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
    const isActivatedSchedule = Boolean(this.revalidationTargetRow.isActivatedSchedule);
    const selectedOpt = this.availablePermitOptionsForRevalidation.find(o => o.permitNumber === this.selectedPermitNumberForRevalidation);
    if (selectedOpt && (selectedOpt.isCancelled || (!isActivatedSchedule && selectedOpt.isUnderProcess))) {
      alert(`Permit ${this.selectedPermitNumberForRevalidation} is ${selectedOpt.isCancelled ? 'cancelled' : 'already under process for revalidation'}.`);
      return;
    }

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

    // Calculate fee and open payment confirmation modal
    const permitWiseDetails = this.getSelectedRevalidationPermitsList();
    const uniquePermitNos = new Set(
      permitWiseDetails
        .map((p: any) => p?.permit_number || p?.permitNumber || '')
        .filter((n: string) => !!n)
    );
    const numPermits = uniquePermitNos.size || 1;
    this.revalidationFeeAmount = 1000 * numPermits;

    // Load live wallet balance and show confirmation popup
    this.loadLiveWalletBalances((exBal, cessBal) => {
      this.revalidationCurrentExciseBalance = exBal;
      this.revalidationProjectedExciseBalance = exBal - this.revalidationFeeAmount;
      this.showRevalidationPaymentModal = true;
      this.cdr.detectChanges();
    });
  }

  closeRevalidationPaymentModal(): void {
    this.showRevalidationPaymentModal = false;
  }

  executeRevalidationSubmit(): void {
    this.showRevalidationPaymentModal = false;
    if (!this.revalidationTargetRow) return;

    const isActivatedSchedule = Boolean(this.revalidationTargetRow.isActivatedSchedule);
    const appId = this.revalidationTargetRow.applicationId;
    const permitWiseDetails = this.getSelectedRevalidationPermitsList();

    const targetPermitStr = Array.isArray(this.selectedPermitDetailForRevalidation)
      ? this.selectedPermitDetailForRevalidation.map((p: any) => p.permit_number || p.permitNumber).join(', ')
      : (this.selectedPermitNumberForRevalidation === 'ALL' ? appId : this.selectedPermitNumberForRevalidation);

    const reason = isActivatedSchedule
      ? `Auto-Revalidation: Permit(s) ${targetPermitStr} validity expired. System initiated revalidation.`
      : `[Permit(s): ${targetPermitStr}] ${this.revalidationReasonType}: ${this.revalidationReasonDetails.trim()}`;

    this.isSubmittingRevalidation = true;
    this.permitService.createRevalidation({
      distributor_permit: appId,
      revalidated_permit_number: targetPermitStr,
      permit_wise_details: permitWiseDetails,
      revalidation_reason: reason
    }).subscribe({
      next: (res: any) => {
        this.isSubmittingRevalidation = false;
        this.closeRevalidationModal();
        this.paymentIntegrationService.clearWalletCache();
        const refNo = res.reference_no || res.id || '';
        alert(
          `Revalidation Application ${refNo} Submitted Successfully!\n\n` +
          `• Revalidation Fee Debited: ₹${this.revalidationFeeAmount.toFixed(2)}\n` +
          `• Application forwarded to Commissioner for approval.`
        );
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
      try { event.preventDefault(); } catch {}
      try { event.stopPropagation(); } catch {}
    }
    const app = row?.application || row;
    const ref = String(app?.referenceNo || app?.reference_no || app?.id || (row as any)?.applicationId || (row as any)?.distributorPermitRef || '').trim();

    const matchingApp = (this.applications || []).find((a: any) => {
      const aRef = String(a.referenceNo || a.reference_no || a.id || '').toLowerCase();
      return aRef === ref.toLowerCase();
    }) || app;

    const rawApp = matchingApp?.application || matchingApp;

    const cleanApp = {
      reference_no: ref,
      referenceNo: ref,
      applicant_name: rawApp?.applicant_name || rawApp?.applicantName || (row as any)?.applicantName || this.applicantDisplayName || '',
      supplier_company_name: rawApp?.supplier_company_name || rawApp?.supplierName || (row as any)?.supplierName || '',
      source_address: rawApp?.source_address || rawApp?.applicantAddress || rawApp?.sourceAddress || '',
      origin: rawApp?.origin || '',
      destination: rawApp?.destination || '',
      route_details: rawApp?.route_details || rawApp?.routeDetails || '',
      submitted_at: rawApp?.submitted_at || rawApp?.created_at || (row as any)?.submittedOn || '',
      status: rawApp?.status || (row as any)?.currentStage || 'Approved',
      line_items: Array.isArray(rawApp?.line_items) && rawApp.line_items.length > 0 ? rawApp.line_items
               : Array.isArray(rawApp?.lineItems) && rawApp.lineItems.length > 0     ? rawApp.lineItems
               : Array.isArray(app?.line_items)                                       ? app.line_items
               : Array.isArray(app?.lineItems)                                        ? app.lineItems
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

  get totalBulkLitres(): number {
    return this.lineItems.controls.reduce((sum, _, index) => sum + this.getLineBulkLitres(index), 0);
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
    const selectedSupplierId = this.supplierForm.get('supplierId')?.value;
    const matchedSupplier = this.suppliers.find((s) => String(s.id) === String(selectedSupplierId));
    const selectedSupplierLabel = matchedSupplier
      ? (matchedSupplier.supplier_master_name || matchedSupplier.supplierMasterName || matchedSupplier.supplier_name || matchedSupplier.company_name || '')
      : '';
    const supplierName = supplier.supplierCompanyName || selectedSupplierLabel || 'IMFL Supplier';
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

  get isOicDistributorUser(): boolean {
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

    if (roleId === 7) return true;
    if ([1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 16].includes(roleId)) return false;

    return (
      roleName.includes('officer_in_charge') ||
      roleName.includes('oic distributor') ||
      roleName.includes('oic_distributor') ||
      roleName.includes('distributor oic') ||
      roleName.includes('distributor_oic')
    );
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

  showPaymentConfirmationModal = false;
  paymentApplicationToProcess: any = null;
  paymentExciseCurrentBalance = 0;
  paymentCessCurrentBalance = 0;
  paymentImportFeeTotal = 0;
  paymentAddEdTotal = 0;
  paymentEduCessTotal = 0;
  isPaymentAgreed = false;
  isSubmittingPayment = false;

  get paymentExciseDeduction(): number {
    return (this.paymentImportFeeTotal || 0) + (this.paymentAddEdTotal || 0);
  }

  get paymentExciseBalanceAfter(): number {
    return (this.paymentExciseCurrentBalance || 0) - this.paymentExciseDeduction;
  }

  get paymentCessBalanceAfter(): number {
    return (this.paymentCessCurrentBalance || 0) - (this.paymentEduCessTotal || 0);
  }

  get isPaymentBalanceInsufficient(): boolean {
    return this.paymentExciseBalanceAfter < 0 || this.paymentCessBalanceAfter < 0;
  }

  get paymentInsufficientErrorMessage(): string {
    if (this.paymentExciseBalanceAfter < 0 && this.paymentCessBalanceAfter < 0) {
      return 'Insufficient Excise Wallet and Education Cess Wallet balances. Add wallet balance before proceeding.';
    }
    if (this.paymentExciseBalanceAfter < 0) {
      return 'Insufficient Excise Wallet (includes Additional Excise). Add wallet balance before proceeding.';
    }
    if (this.paymentCessBalanceAfter < 0) {
      return 'Insufficient Education Cess Wallet. Add wallet balance before proceeding.';
    }
    return '';
  }

  openPaymentConfirmationModal(application: any): void {
    if (!application) return;
    this.paymentApplicationToProcess = application;
    this.isPaymentAgreed = false;
    this.isSubmittingPayment = false;

    let importFee = Number(application.total_import_value ?? application.totalImportValue ?? application.total_import_fee ?? application.totalImportFee ?? 0);
    let addEd = Number(application.total_additional_ed ?? application.totalAdditionalEd ?? application.total_add_ed ?? application.totalAddEd ?? 0);
    let eduCess = Number(application.total_education_cess ?? application.totalEducationCess ?? application.total_edu_cess ?? application.totalEduCess ?? 0);

    const lineItems = application.lineItems || application.line_items || [];
    if (lineItems.length > 0) {
      let calcImport = 0;
      let calcAddEd = 0;
      let calcEduCess = 0;

      lineItems.forEach((li: any) => {
        const cases = Number(li.cases ?? li.no_of_cases ?? li.noOfCases ?? li.quantity ?? li.qty ?? li.permit_qty_cases ?? 0);
        const importFeeRate = Number(li.importPassFeePerCase || li.import_pass_fee_per_case || li.import_fee || li.importFee || 0);
        const addEdRate = Number(li.additionalEdPerCase || li.additional_ed_per_case || li.additional_ed || li.add_ed || li.additionalEd || 0);
        const cessRate = Number(li.educationCessPerCase || li.education_cess_per_case || li.education_cess || li.cess || 0);

        calcImport += Number(li.total_import ?? li.totalImport ?? (importFeeRate * cases));
        calcAddEd += Number(li.total_additional_ed ?? li.totalAdditionalEd ?? li.total_add_ed ?? li.totalAddEd ?? (addEdRate * cases));
        calcEduCess += Number(li.total_education_cess ?? li.totalEducationCess ?? li.total_edu_cess ?? li.totalEduCess ?? (cessRate * cases));
      });

      if (calcImport > 0 || calcAddEd > 0 || calcEduCess > 0) {
        importFee = calcImport;
        addEd = calcAddEd;
        eduCess = calcEduCess;
      }
    } else {
      const details = application.permitWiseDetails || application.permit_wise_details || [];
      if (details.length > 0) {
        let calcImport = 0;
        let calcAddEd = 0;
        let calcEduCess = 0;

        details.forEach((p: any) => {
          const items = p.items || [];
          items.forEach((item: any) => {
            const cases = Number(item.cases || 0);
            calcImport += Number(item.totalImport || item.total_import_fee || (item.importFee || 0) * cases);
            calcAddEd += Number(item.totalAddEd || item.total_additional_ed || (item.addEdPerCase || 0) * cases);
            calcEduCess += Number(item.cess || item.total_education_cess || 0);
          });
        });

        if (calcImport > 0 || calcAddEd > 0 || calcEduCess > 0) {
          importFee = calcImport;
          addEd = calcAddEd;
          eduCess = calcEduCess;
        }
      }
    }

    if (importFee === 0 && addEd === 0 && eduCess === 0) {
      const totalVal = Number(application.paymentAmount || application.payment_amount || application.totalImportValue || application.total_import_value || application.amount || 0);
      if (totalVal > 0) {
        const excisePortion = Math.round(totalVal * 0.85 * 100) / 100;
        eduCess = Math.round((totalVal - excisePortion) * 100) / 100;
        importFee = Math.round(excisePortion * 0.75 * 100) / 100;
        addEd = Math.round((excisePortion - importFee) * 100) / 100;
      }
    } else if (addEd === 0 && importFee > 0) {
      const totalExcise = importFee;
      importFee = Math.round(totalExcise * 0.75 * 100) / 100;
      addEd = Math.round((totalExcise - importFee) * 100) / 100;
    }

    this.paymentImportFeeTotal = importFee;
    this.paymentAddEdTotal = addEd;
    this.paymentEduCessTotal = eduCess;

    this.loadLiveWalletBalances((exBal, cessBal) => {
      this.paymentExciseCurrentBalance = exBal;
      this.paymentCessCurrentBalance = cessBal;
      this.showPaymentConfirmationModal = true;
      this.cdr.detectChanges();
    });
  }

  private loadLiveWalletBalances(callback: (exciseBal: number, cessBal: number) => void): void {
    const user = this.accountService.getCurrentUser() || (this.profileService as any)?.profile;
    const targetRowApp = (this.revalidationTargetRow as any)?.application || this.revalidationTargetRow ||
                         (this.cancellationTargetRow as any)?.application || this.cancellationTargetRow ||
                         (this.paymentApplicationToProcess as any);

    const licenseeId = String(
      targetRowApp?.licensee_id ||
      targetRowApp?.licenseeId ||
      targetRowApp?.applicant ||
      targetRowApp?.applicant_id ||
      (user as any)?.licensee_id ||
      (user as any)?.username ||
      ''
    ).trim();

    this.permitService.getWalletBalances().subscribe({
      next: (res: any) => {
        const exBal = Number(res?.excise_balance ?? res?.exciseBalance ?? 0);
        const cessBal = Number(res?.education_cess_balance ?? res?.educationCessBalance ?? 0);
        if (exBal > 0 || cessBal > 0) {
          callback(exBal, cessBal);
          return;
        }
        if (licenseeId) {
          this.paymentIntegrationService.getWalletBalance(licenseeId, true).subscribe({
            next: (wbRes: any) => {
              const wallets = wbRes?.results || [];
              const exW = wallets.find((w: any) => String(w.wallet_type || w.wallet_type_code || '').toLowerCase() === 'excise');
              const cessW = wallets.find((w: any) => String(w.wallet_type || w.wallet_type_code || '').toLowerCase() === 'education_cess');
              const exB = exW ? Number(exW.current_balance || 0) : 0;
              const cessB = cessW ? Number(cessW.current_balance || 0) : 0;
              callback(exB, cessB);
            },
            error: () => callback(exBal, cessBal)
          });
        } else {
          callback(exBal, cessBal);
        }
      },
      error: () => {
        if (licenseeId) {
          this.paymentIntegrationService.getWalletBalance(licenseeId, true).subscribe({
            next: (wbRes: any) => {
              const wallets = wbRes?.results || [];
              const exW = wallets.find((w: any) => String(w.wallet_type || w.wallet_type_code || '').toLowerCase() === 'excise');
              const cessW = wallets.find((w: any) => String(w.wallet_type || w.wallet_type_code || '').toLowerCase() === 'education_cess');
              const exB = exW ? Number(exW.current_balance || 0) : 0;
              const cessB = cessW ? Number(cessW.current_balance || 0) : 0;
              callback(exB, cessB);
            },
            error: () => callback(0, 0)
          });
        } else {
          callback(0, 0);
        }
      }
    });
  }

  private fallbackPermitWalletBalances(callback: (exciseBal: number, cessBal: number) => void): void {
    this.permitService.getWalletBalances().subscribe({
      next: (res: any) => {
        const exBal = Number(res?.excise_balance ?? res?.exciseBalance ?? 0);
        const cessBal = Number(res?.education_cess_balance ?? res?.educationCessBalance ?? 0);
        callback(exBal, cessBal);
      },
      error: () => callback(0, 0)
    });
  }

  closePaymentConfirmationModal(): void {
    this.showPaymentConfirmationModal = false;
    this.paymentApplicationToProcess = null;
    this.isPaymentAgreed = false;
    this.isSubmittingPayment = false;
  }

  confirmExecutePayment(): void {
    if (!this.paymentApplicationToProcess || !this.isPaymentAgreed || this.isPaymentBalanceInsufficient || this.isSubmittingPayment) {
      return;
    }

    this.isSubmittingPayment = true;
    const refNo = this.paymentApplicationToProcess.referenceNo || this.paymentApplicationToProcess.reference_no || this.paymentApplicationToProcess.id;

    this.unifiedActionsService.executeAction(
      'PAY',
      { referenceNo: refNo, id: refNo } as any,
      'requisition',
      this.detailActionContext
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => {
          this.isSubmittingPayment = false;
          if (result?.success === false) {
            void Swal.fire({
              title: 'Payment Failed',
              text: result.message || 'Unable to process wallet payment.',
              icon: 'error'
            });
            return;
          }
          this.closePaymentConfirmationModal();
          void Swal.fire({
            title: 'Payment Successful',
            text: 'Requisition payment completed and application forwarded to Permit Section.',
            icon: 'success'
          });
          this.loadInitialData();
        },
        error: (err: any) => {
          this.isSubmittingPayment = false;
          void Swal.fire({
            title: 'Payment Failed',
            text: err?.error?.detail || err?.error?.message || err?.message || 'Unable to process wallet payment.',
            icon: 'error'
          });
        }
      });
  }

  onModalActionClicked(event: { action: string; item: ActionItem }): void {
    if (!event?.action || !event?.item) {
      return;
    }

    if (event.action === 'PAY' || event.action === 'FORCE_PAY') {
      this.openPaymentConfirmationModal(event.item);
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

    if (stageId === 144 || value.includes('awaiting payment') || value.includes('awaiting_payment') || (value.includes('awaiting') && value.includes('pay')) || value.includes('awaiting')) {
      return 'under_process';
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

  getLineEduCessPerCase(index: number): number {
    return this.getLineCessPerCase(index);
  }

  getLineTotalAddEd(index: number): number {
    return this.getLineAdditionalEd(index);
  }

  getLineTotalEduCess(index: number): number {
    return this.getLineCess(index);
  }

  getUniqueBrandNames(): string[] {
    const names = new Set<string>();
    const selectedSupId = this.supplierForm.controls.selectedSupplierId.value;
    (this.brandMaster || []).forEach((b: any) => {
      if (b.brandName) {
        if (!selectedSupId || String(b.supplierId) === String(selectedSupId)) {
          names.add(b.brandName);
        }
      }
    });
    return Array.from(names).sort();
  }

  getAvailableSizesForBrand(brandName: string): DistributorBrandMaster[] {
    if (!brandName) return [];
    const selectedSupId = this.supplierForm.controls.selectedSupplierId.value;
    return (this.brandMaster || []).filter(
      (b: any) =>
        b.brandName?.toLowerCase() === brandName.toLowerCase() &&
        (!selectedSupId || String(b.supplierId) === String(selectedSupId))
    );
  }

  getSizeLabel(option: DistributorBrandMaster): string {
    return `${option.sizeMl} ml (${option.piecesPerCase || 0} pcs/case)`;
  }

  getBrandLabel(option: DistributorBrandMaster): string {
    return `${option.brandName} | ${option.sizeMl} ml | ${option.piecesPerCase || 0} pcs/case`;
  }

  getSupplierLabel(option: DistributorSupplier): string {
    if (!option) return '';
    return option.supplier_master_name || option.supplierMasterName || option.supplier_name || option.company_name || option.address || '';
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
      edp: number;
      importFee: number;
      totalImport: number;
      cess: number;
      mrp: number;
      bl: number;
      addEdPerCase: number;
      totalAddEd: number;
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
        const available = 700 - currentCases;
        if (available <= 0) {
          permits.push(this.buildPermitSummaryObject(currentPermitIndex, currentItems));
          currentPermitIndex++;
          currentCases = 0;
          currentItems = [];
        }

        const allocated = Math.min(remCases, 700 - currentCases);
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
      permitName: `Permit #${permitIndex} (Max 700 Cases)`,
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

  // Form validation helpers
  get isApplicantStepValid(): boolean {
    // For applicant step, disabled controls don't count toward validity
    // Just check that the applicant company name and address have values
    const companyName = this.applicantForm.get('applicantCompanyName')?.value;
    const address = this.applicantForm.get('applicantAddress')?.value;
    return !!companyName && !!address;
  }

  get isSupplierStepValid(): boolean {
    return this.supplierForm.valid;
  }

  get isBrandStepValidPublic(): boolean {
    return this.isBrandStepValid();
  }

  get isRouteStepValid(): boolean {
    return this.routeForm.valid;
  }

  get isReviewStepValid(): boolean {
    return this.reviewForm.valid;
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
      cancellations: this.permitService.getCancellations().pipe(catchError(() => of([] as any[]))),
      casesProcessed: this.permitService.getCasesProcessed().pipe(catchError(() => of([] as any[]))),
      arrivals: this.permitService.getArrivals().pipe(catchError(() => of([] as any[])))
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: ({ suppliers, brands, premises, requisitions, revalidations, cancellations, casesProcessed, arrivals }) => {
          try {
            this.suppliers = Array.isArray(suppliers) ? suppliers : [];
            this.brandMaster = Array.isArray(brands?.data) ? brands.data : (Array.isArray(brands) ? brands : []);
            this.routeForm.controls.destination.setValue(premises?.destination || '', { emitEvent: false });
            this.populateDefaultBrandRows();

            this.allCasesProcessedList = Array.isArray(casesProcessed) ? casesProcessed : (casesProcessed as any)?.results || [];
            this.allArrivalsList = Array.isArray(arrivals) ? arrivals : (arrivals as any)?.results || [];
            this.pendingArrivalReviews = this.allCasesProcessedList.filter((c: any) => String(c.status).toLowerCase() === 'under_review');

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
    this.sidebarPendingBadgeService.triggerRefresh();
    forkJoin({
      requisitions: this.permitService.listApplications().pipe(catchError(() => of([]))),
      revalidations: this.permitService.getRevalidations().pipe(catchError(() => of([]))),
      cancellations: this.permitService.getCancellations().pipe(catchError(() => of([]))),
      casesProcessed: this.permitService.getCasesProcessed().pipe(catchError(() => of([]))),
      arrivals: this.permitService.getArrivals().pipe(catchError(() => of([])))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ requisitions, revalidations, cancellations, casesProcessed, arrivals }) => {
        this.allCasesProcessedList = Array.isArray(casesProcessed) ? casesProcessed : (casesProcessed as any)?.results || [];
        this.allArrivalsList = Array.isArray(arrivals) ? arrivals : (arrivals as any)?.results || [];
        this.pendingArrivalReviews = this.allCasesProcessedList.filter((c: any) => String(c.status).toLowerCase() === 'under_review');
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
      const targetPermit = String(r?.distributor_permit || r?.distributor_permit_detail?.reference_no || '').toLowerCase();
      const parentReq = mappedRequisitions.find((req: any) => {
        const reqRef = String(req.referenceNo || req.applicationId || '').toLowerCase();
        return reqRef && (reqRef === targetPermit || targetPermit.includes(reqRef) || reqRef.includes(targetPermit));
      });
      const reqApplicant = parentReq?.applicantName || (mappedRequisitions[0] as any)?.applicantName || this.applicantDisplayName || 'dist dist';

      return {
        ...r,
        applicationType: 'revalidation',
        referenceNo: refNo,
        reference_no: refNo,
        submittedAt: dateVal,
        submitted_at: dateVal,
        createdAt: dateVal,
        applicantName: reqApplicant,
        supplierCompanyName: r?.distributor_permit_detail?.supplier_company_name || r?.supplier_company_name || r?.supplierCompanyName || 'N/A',
        status: stageName,
        current_stage: r?.current_stage || { name: stageName }
      };
    });

    const mappedCancellations = canList.map((c: any) => {
      const refNo = c?.reference_no || c?.referenceNo || '';
      const dateVal = c?.submitted_at || c?.submittedAt || c?.created_at || '';
      const stageName = c?.current_stage?.name || c?.current_stage_name || c?.status || 'Pending';
      const cancelledNo = c?.cancelled_permit_number || c?.cancelledPermitNumber || c?.distributor_permit_ref_no || c?.distributor_permit_detail?.reference_no || c?.distributor_permit || c?.distributorPermit || '';
      const permitWiseDetails = c?.permit_wise_details || c?.permitWiseDetails || [];
      const distPermitRef = cancelledNo || c?.distributor_permit_detail?.reference_no || c?.distributor_permit_detail?.id || c?.distributor_permit || c?.distributorPermit || 'IMFLREQ/2026-27/0001-P1';
      const targetPermit = String(c?.distributor_permit || c?.distributor_permit_detail?.reference_no || '').toLowerCase();
      const parentReq = mappedRequisitions.find((req: any) => {
        const reqRef = String(req.referenceNo || req.applicationId || '').toLowerCase();
        return reqRef && (reqRef === targetPermit || targetPermit.includes(reqRef) || reqRef.includes(targetPermit));
      });
      const reqApplicant = parentReq?.applicantName || (mappedRequisitions[0] as any)?.applicantName || this.applicantDisplayName || 'dist dist';

      return {
        ...c,
        applicationType: 'cancellation',
        referenceNo: refNo,
        reference_no: refNo,
        cancelledPermitNumber: cancelledNo,
        cancelled_permit_number: cancelledNo,
        distributorPermitRef: distPermitRef,
        distributor_permit_ref: distPermitRef,
        distributorPermit: distPermitRef,
        distributor_permit: distPermitRef,
        permitWiseDetails,
        permit_wise_details: permitWiseDetails,
        submittedAt: dateVal,
        submitted_at: dateVal,
        createdAt: dateVal,
        applicantName: reqApplicant,
        supplierCompanyName: distPermitRef || c?.distributor_permit_detail?.supplier_company_name || c?.supplier_company_name || c?.supplierCompanyName || 'N/A',
        status: stageName,
        current_stage: c?.current_stage || { name: stageName }
      };
    });

    this.applications = [
      ...mappedRequisitions,
      ...mappedRevalidations,
      ...mappedCancellations
    ];
    this.rebuildRows();
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

      if (companyName) {
        this.applicantForm.controls.applicantCompanyName.setValue(companyName, { emitEvent: false });
      }
      if (signatoryName) {
        this.applicantForm.controls.authorizedSignatory.setValue(signatoryName, { emitEvent: false });
      }
      if (address) {
        this.applicantForm.controls.applicantAddress.setValue(address, { emitEvent: false });
      }

      const destAddress = address ? `Excise Warehouse / Bonded Warehouse, ${address}` : 'Central Excise Warehouse / Sikkim Bonded Warehouse, Rangpo, East Sikkim';
      this.routeForm.controls.destination.setValue(destAddress, { emitEvent: false });
      this.routeForm.controls.destination.disable({ emitEvent: false });

      // Disable Step 1 controls to make Step 1 completely uneditable
      this.applicantForm.disable({ emitEvent: false });
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
          if (profileName) {
            this.applicantForm.controls.applicantCompanyName.setValue(profileName, { emitEvent: false });
          }
          this.applicantForm.disable({ emitEvent: false });
        },
        error: () => {
          // Leave the account fallback in place.
        }
      });
  }

  private applySupplierById(supplierId: string): void {
    const supplier = this.suppliers.find((item) => String(item.id) === String(supplierId));
    if (!supplier) {
      this.supplierForm.patchValue({
        supplierCompanyName: '',
        sourceAddress: ''
      }, { emitEvent: false });
      this.supplierForm.controls.supplierCompanyName.enable({ emitEvent: false });
      this.supplierForm.controls.sourceAddress.enable({ emitEvent: false });

      this.routeForm.patchValue({
        origin: '',
        routeDetails: ''
      }, { emitEvent: false });
      this.routeForm.controls.origin.enable({ emitEvent: false });
      this.routeForm.controls.routeDetails.enable({ emitEvent: false });
      return;
    }

    const compName =
      (supplier as any).supplier_name ||
      (supplier as any).supplierName ||
      supplier.company_name ||
      (supplier as any).companyName ||
      (supplier as any).supplier_master_name ||
      (supplier as any).supplierMasterName ||
      '';

    this.supplierForm.patchValue({
      supplierCompanyName: compName,
      sourceAddress: supplier.address || ''
    }, { emitEvent: false });
    this.supplierForm.controls.supplierCompanyName.disable({ emitEvent: false });
    this.supplierForm.controls.sourceAddress.disable({ emitEvent: false });

    const routeText = (supplier as any).route_details || (supplier as any).routeDetails || '';
    this.routeForm.patchValue({
      origin: supplier.address || '',
      routeDetails: routeText
    }, { emitEvent: false });
    this.routeForm.controls.origin.disable({ emitEvent: false });
    this.routeForm.controls.routeDetails.disable({ emitEvent: false });
    this.routeForm.controls.transportMode.setValue('Road', { emitEvent: false });
    this.routeForm.controls.transportMode.disable({ emitEvent: false });

    this.resetBrandRowsForSupplier(supplier.id);
    this.syncBrandStepValidity();
  }

  private resetBrandRowsForSupplier(supplierId: number | string): void {
    const validBrandNames = new Set(
      (this.brandMaster || [])
        .filter((b: any) => !supplierId || String(b.supplierId) === String(supplierId))
        .map((b: any) => b.brandName)
    );

    this.lineItems.controls.forEach((control) => {
      const selectedBrand = control.get('selectedBrandName')?.value;
      if (selectedBrand && !validBrandNames.has(selectedBrand)) {
        control.patchValue({ selectedBrandName: '', brandKey: '' });
      }
    });
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

    const firstItem = application?.line_items?.[0] || application?.lineItems?.[0] || application?.items?.[0];
    const brandName = application?.brand_name || application?.brandName || firstItem?.brand_name || firstItem?.brandName || firstItem?.selectedBrandName || 'N/A';
    const sizeMl = Number(application?.size_ml || application?.sizeMl || firstItem?.size_ml || firstItem?.sizeMl || 750);
    const cases = Number(application?.total_cases || application?.totalCases || application?.cases || 0);

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
      brandName,
      sizeMl,
      cases,
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
