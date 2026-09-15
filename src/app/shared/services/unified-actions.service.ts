import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, from } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { ObjectionDialogComponent, ObjectionDialogResult } from '../components/objection-dialog/objection-dialog.component';
import { RejectionRemarksDialogComponent } from '../components/rejection-remarks-dialog';
import Swal from 'sweetalert2';

// Import existing services
import { EnaRequisitionService } from '../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../features/licensee/supplyChain/services/hologram-data.service';
import { PaymentIntegrationService } from '../../core/services/payment-integration.service';
import { ApplicationType } from '../constants/application.constants';
import { SidebarPendingBadgeService } from './sidebar-pending-badge.service';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ActionExecutionOptions {
  workflowContextData?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class UnifiedActionsService {
  private workflowBaseUrl = `${environment.apiBaseUrl}/auth`;

  constructor(
    private router: Router,
    private http: HttpClient,
    private dialog: MatDialog,
    private enaRequisitionService: EnaRequisitionService,
    private supplyChainService: SupplyChainService,
    private hologramService: HologramDataService,
    private sidebarPendingBadgeService: SidebarPendingBadgeService,
    private paymentIntegrationService: PaymentIntegrationService
  ) { }

  /**
   * Execute an action on an item based on item type and action
   */
  executeAction(
    action: string,
    item: any,
    itemType: ApplicationType | string,
    context?: string,
    options?: ActionExecutionOptions
  ): Observable<ActionResult> {
    return this.executeActionInternal(action, item, itemType, context, options).pipe(
      tap((result) => {
        if (result && result.success !== false) {
          console.log(`🔄 UNIFIED ACTIONS: Action ${action} executed successfully. Requesting sidebar pending badge refresh & clearing caches.`);
          this.sidebarPendingBadgeService.triggerRefresh();
          try {
            this.paymentIntegrationService.clearWalletCache();
          } catch (e) {
            console.warn('Could not clear wallet cache on action:', e);
          }
          try {
            this.enaRequisitionService.clearCache();
          } catch (e) {}
          try {
            const interceptorModule = require('../../core/interceptors/read-api-cache.interceptor');
            if (interceptorModule?.ReadApiCacheInterceptor) {
              interceptorModule.ReadApiCacheInterceptor.clearCache();
            }
          } catch (e) {}
        }
      })
    );
  }

  private executeActionInternal(
    action: string,
    item: any,
    itemType: ApplicationType | string,
    context?: string,
    options?: ActionExecutionOptions
  ): Observable<ActionResult> {

    const normalizedAction = (action || '').toString().trim().toUpperCase();
    console.log(`Executing action: ${normalizedAction} on ${itemType} with ID: ${item.id}`);

    switch (normalizedAction) {
      case 'VIEW':
        return this.handleViewAction(item, itemType, context);

      case 'APPROVE':
        return this.handleApproveAction(item, itemType, options);

      case 'REJECT':
        return this.handleRejectAction(item, itemType);

      case 'FORWARD':
        return this.handleForwardAction(item, itemType, options);

      case 'VERIFY':
        return this.handleVerifyAction(item, itemType);

      case 'ISSUE':
        return this.handleIssueAction(item, itemType);

      case 'EXTEND':
        return this.handleExtendAction(item, itemType);

      case 'TERMINATE':
        return this.handleTerminateAction(item, itemType);

      case 'PAY':
        return this.handlePayAction(item, itemType);

      case 'FORCE_PAY':
        return this.handleForcePayAction(item, itemType);

      case 'REQUEST_REVALIDATION':
        return this.handleRequestRevalidationAction(item, itemType, context);

      case 'REQUEST_CANCELLATION':
        return this.handleRequestCancellationAction(item, itemType);

      case 'SUBMITPAYSLIP':
        return this.handleSubmitPaySlipAction(item, itemType);

      case 'APPROVEPAYSLIP':
        return this.handleApprovePaySlipAction(item, itemType);

      case 'REJECTPAYSLIP':
        return this.handleRejectPaySlipAction(item, itemType);

      case 'ASSIGN_CARTONS':
        return this.handleAssignCartonsAction(item, itemType);

      case 'COMPLETE':
        return this.handleCompleteAction(item, itemType);

      case 'CANCEL':
        return this.handleCancelAction(item, itemType);

      case 'VIEW_SLIP':
        return this.handleViewSlipAction(item, itemType, context);

      case 'VIEW_PAYMENT_SLIP':
        return this.handleViewPaymentSlipAction(item, itemType, context);

      case 'DOWNLOAD':
        return this.handleDownloadAction(item, itemType);

      case 'EDIT':
        return this.handleEditAction(item, itemType);
      case 'RAISE_OBJECTION':
        return this.handleRaiseObjectionAction(item, itemType);
      case 'VIEW_REMARK':
        return this.handleViewRemarkAction(item, itemType);
      case 'REVERT':
        return this.handleRevertAction(item, itemType);

      default:
        return of({
          success: false,
          message: `Unknown action: ${action}`
        });
    }
  }

  private normalizeActionResult(response: any, fallbackMessage: string): ActionResult {
    if (response && typeof response.success === 'boolean') {
      return {
        success: response.success,
        message: response.message || fallbackMessage,
        data: response.data ?? response
      };
    }

    const statusToken = String(response?.status || '').toLowerCase();
    const isSuccess = statusToken === 'success' || statusToken === 'ok';

    return {
      success: isSuccess || Boolean(response),
      message: response?.message || fallbackMessage,
      data: response
    };
  }

  private normalizeActionError(error: any, fallbackMessage: string): ActionResult {
    const message =
      error?.error?.message ||
      error?.error?.detail ||
      error?.error?.error ||
      error?.message ||
      fallbackMessage;

    return {
      success: false,
      message,
      data: error
    };
  }

  private toActionResult(source$: Observable<any>, successMessage: string, errorMessage: string): Observable<ActionResult> {
    return source$.pipe(
      map((response: any) => this.normalizeActionResult(response, successMessage)),
      catchError((error: any) => of(this.normalizeActionError(error, errorMessage)))
    );
  }

  private handleViewAction(item: any, itemType: string, context?: string): Observable<ActionResult> {
    const ref =
      item?.referenceNo ??
      item?.refNo ??
      item?.ourRefNo ??
      item?.our_ref_no ??
      item?.billNo ??
      item?.bill_no ??
      '';

    const id =
      item?.id ??
      item?.pk ??
      '';

    // Special handling for OIC context
    if (context === 'officer-in-charge') {
      if (itemType === 'hologram') {
        // For OIC, navigate to hologram monthly report or daily register based on item type
        const hologramSections: { [key: string]: string } = {
          'monthly-statement': 'monthly-hologram-statement',
          'daily-register': 'daily-hologram-register',
          'stock-inventory': 'hologram-overview'
        };

        const section = hologramSections[item.subType] || 'hologram-register';
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: section,
            ref: ref,
            source: context
          }
        });

        return of({
          success: true,
          message: `Navigated to ${itemType} ${item.subType || 'view'} within SPA`
        });
      }
    }

    if (String(itemType || '').startsWith('imfl-') || itemType === 'distributor-permit') {
      const tab = itemType === 'imfl-revalidation' ? 'revalidation' : (itemType === 'imfl-cancellation' ? 'cancellation' : 'requisition');
      this.router.navigate(['/dashboard'], {
        queryParams: {
          section: 'distributor-permit',
          tab,
          ref: ref || id,
          view: 'details'
        }
      });
      return of({
        success: true,
        message: `Navigated to ${itemType} details`
      });
    }

    const queryParams: any = {
      id: id || undefined,
      ref: ref || undefined,
      type: itemType,
      source: context || 'licensee'
    };

    // Use unified supply chain view for all types
    this.router.navigate(['/supply-chain-view'], { queryParams })
      .then((ok) => {
        if (!ok) {
          this.forceNavigateToSupplyChainView(queryParams);
        }
      })
      .catch(() => {
        this.forceNavigateToSupplyChainView(queryParams);
      });

    return of({
      success: true,
      message: `Navigated to ${itemType} view`
    });
  }

  private forceNavigateToSupplyChainView(queryParams: any): void {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    Object.entries(queryParams || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    const query = params.toString();
    const url = query ? `/supply-chain-view?${query}` : '/supply-chain-view';
    window.location.href = url;
  }

  private isImflRequisitionItem(item: any, itemType?: string): boolean {
    const typeStr = String(itemType || '').toLowerCase();
    if (
      typeStr === 'special-permit' ||
      typeStr === 'new-license' ||
      typeStr === 'license-renewal' ||
      typeStr === 'company-registration' ||
      typeStr === 'company-collaboration' ||
      typeStr === 'label-registration' ||
      typeStr === 'salesman-barman-registration'
    ) {
      return false;
    }

    if (
      typeStr === 'imfl-requisition' ||
      typeStr === 'distributor-permit' ||
      typeStr === 'distributor-permit-requisition'
    ) {
      return true;
    }

    if (
      item?.application_type === 'special_permit' ||
      item?.type === 'special-permit' ||
      item?.source === 'special-permit' ||
      item?.permission_duration ||
      item?.selected_dates
    ) {
      return false;
    }

    const ref = String(
      item?.referenceNo ||
      item?.reference_no ||
      item?.permit_number ||
      item?.permitNumber ||
      item?.requisition_number ||
      item?.id ||
      ''
    ).toUpperCase();

    if (ref.startsWith('DP/') || ref.startsWith('SP/')) {
      return false;
    }

    if (ref.startsWith('IMFL') || ref.startsWith('IMP/') || ref.startsWith('DIST/')) {
      return true;
    }

    if (item?.assigned_hologram_ranges || item?.assignedHologramRanges || item?.is_excise_duty_fee_paid !== undefined || item?.brand_items || item?.brands) {
      return true;
    }

    return false;
  }

  private handleApproveAction(item: any, itemType: string, options?: ActionExecutionOptions): Observable<ActionResult> {
    const itemId = item?.id || item?.referenceNo || item?.reference_no;
    if (!itemId) {
      return of({
        success: false,
        message: 'Item ID is required for approval'
      });
    }

    if (this.isImflRequisitionItem(item, itemType)) {
      const targetId = encodeURIComponent(String(item.referenceNo || item.reference_no || item.id || '').trim());
      return this.toActionResult(
        this.http.post<any>(`${environment.apiBaseUrl}/transactional/distributor-permit/${targetId}/perform-action/`, { action: 'APPROVE' }),
        'Distributor permit requisition approved successfully',
        'Failed to approve distributor permit requisition'
      );
    }

    switch (itemType) {
      case 'requisition':
        return this.toActionResult(
          this.enaRequisitionService.performAction(item.id, 'APPROVE'),
          'Requisition approved successfully',
          'Failed to approve requisition'
        );

      case 'imfl-revalidation':
      case 'distributor-permit-revalidation':
      case 'revalidation': {
        const revId = item.id || item.referenceNo || item.reference_no || '';
        return this.toActionResult(
          this.supplyChainService.performRevalidationAction(revId, 'APPROVE', 'Approved'),
          'Revalidation approved successfully',
          'Failed to approve revalidation'
        );
      }

      case 'imfl-cancellation':
      case 'distributor-permit-cancellation':
      case 'cancellation': {
        const cancelId = item.id || item.referenceNo || item.reference_no || '';
        return this.toActionResult(
          this.supplyChainService.performCancellationAction(cancelId, 'APPROVE', 'Approved'),
          'Cancellation approved successfully',
          'Failed to approve cancellation'
        );
      }

      case 'transit':
        return this.toActionResult(
          this.supplyChainService.performTransitPermitAction(item.id, 'APPROVE', 'Approved'),
          'Transit permit approved successfully',
          'Failed to approve transit permit'
        );

      case 'hologram':
        return this.performHologramWorkflowAction(item, 'approve', 'Approved', 'Approved');
      case 'new-license':
      case 'company-registration':
      case 'company-collaboration':
      case 'label-registration':
      case 'salesman-barman-registration':
      case 'special-permit':
        return this.executeWorkflowAdvance(item, 'approve', 'Approved', options?.workflowContextData);

      case 'license-renewal':
        return this.toActionResult(
          this.http.post<any>(
            `${environment.apiBaseUrl}/transactional/license_renewal_application/${encodeURIComponent(this.getWorkflowApplicationId(item))}/approve/`,
            {
              remarks: 'Approved',
              context_data: {
                action: 'APPROVE',
                ...(options?.workflowContextData ?? {})
              }
            },
            { headers: new HttpHeaders({ Accept: 'application/json' }) }
          ),
          'Renewal application approved successfully',
          'Failed to approve renewal application'
        );

      default:
        return of({
          success: false,
          message: `Approval not implemented for ${itemType}`
        });
    }
  }

  private promptRejectionReasonWithHologramImpact(item: any, itemType: string): Promise<string | null> {
    const isImflRequisition = this.isImflRequisitionItem(item, itemType);

    const refNo = String(item?.referenceNo || item?.reference_no || item?.id || 'N/A').trim();
    
    // Calculate allocated holograms
    let ranges: any[] = [];
    if (Array.isArray(item?.assigned_hologram_ranges) && item.assigned_hologram_ranges.length) {
      ranges = item.assigned_hologram_ranges;
    } else if (Array.isArray(item?.assignedHologramRanges) && item.assignedHologramRanges.length) {
      ranges = item.assignedHologramRanges;
    } else if (Array.isArray(item?.hologram_ranges) && item.hologram_ranges.length) {
      ranges = item.hologram_ranges;
    }

    let serialRangeText = '';
    let totalHologramCount = 0;

    if (ranges.length > 0) {
      const activeRanges = ranges.filter((r: any) => String(r?.status || '').toUpperCase() !== 'REVERTED');
      if (activeRanges.length > 0) {
        serialRangeText = activeRanges.map((r: any) => `${r.from} &rarr; ${r.to}`).join(', ');
        totalHologramCount = activeRanges.reduce((acc: number, r: any) => {
          const f = parseInt(String(r.from || 0).replace(/\D/g, ''), 10);
          const t = parseInt(String(r.to || 0).replace(/\D/g, ''), 10);
          const c = Number(r.count || (t >= f && f > 0 ? t - f + 1 : 0));
          return acc + c;
        }, 0);
      }
    }

    if (!serialRangeText && (item?.hologram_from || item?.hologramFrom) && (item?.hologram_to || item?.hologramTo)) {
      const fromVal = item.hologram_from || item.hologramFrom;
      const toVal = item.hologram_to || item.hologramTo;
      serialRangeText = `${fromVal} &rarr; ${toVal}`;
      const f = parseInt(String(fromVal).replace(/\D/g, ''), 10);
      const t = parseInt(String(toVal).replace(/\D/g, ''), 10);
      totalHologramCount = Number(item.total_holograms_assigned || item.totalHolograms || (t >= f && f > 0 ? t - f + 1 : 0));
    }

    if (!totalHologramCount && item?.total_holograms_assigned) {
      totalHologramCount = Number(item.total_holograms_assigned);
    }
    if (!totalHologramCount && item?.total_quantity_cases) {
      const pieces = Array.isArray(item?.items) ? item.items.reduce((sum: number, it: any) => sum + Number(it.pieces || (it.cases * (it.pieces_per_case || 12)) || 0), 0) : 0;
      if (pieces > 0) totalHologramCount = pieces;
    }

    const hasHologramReversion = isImflRequisition && (totalHologramCount > 0 || !!serialRangeText);

    let htmlContent = `
      <div style="text-align: left; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    `;

    if (hasHologramReversion) {
      htmlContent += `
        <!-- Hologram Reversion Alert Card -->
        <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
          <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i class="bi bi-arrow-counterclockwise" style="color: #b45309; font-size: 18px; font-weight: bold;"></i>
            </div>
            <div>
              <div style="font-weight: 700; color: #92400e; font-size: 14px;">Automatic Hologram Reversal & Inventory Restoration</div>
              <div style="font-size: 12px; color: #78350f; margin-top: 2px;">
                Rejecting this requisition will cancel the assigned holograms and restore them back to <strong>Available Warehouse Inventory Stock</strong>.
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #ffffff; border: 1px solid #fef3c7; border-radius: 8px; padding: 10px;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Reverting Serial Range</div>
              <div style="font-size: 13px; font-weight: 700; color: #111827; font-family: monospace; margin-top: 2px;">
                ${serialRangeText || 'Allocated Serials'}
              </div>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Total Restored Quantity</div>
              <div style="font-size: 14px; font-weight: 700; color: #047857; font-family: monospace; margin-top: 2px;">
                ${totalHologramCount ? totalHologramCount.toLocaleString() + ' pcs' : 'All Allocated Holograms'}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    htmlContent += `
        <!-- Rejection Reason Input -->
        <div style="margin-bottom: 8px;">
          <label for="swalRejectReasonInput" style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">
            Rejection Reason / Remarks <span style="color: #dc2626;">*</span>
          </label>
          <textarea
            id="swalRejectReasonInput"
            class="swal2-textarea"
            rows="3"
            style="width: 100%; box-sizing: border-box; margin: 0; font-size: 13px; border: 1.5px solid #d1d5db; border-radius: 8px; padding: 10px; resize: vertical; min-height: 80px;"
            placeholder="Please enter the clear reason for rejecting this application (e.g. document mismatch, quota discrepancy, incorrect batch details)..."
          ></textarea>
        </div>
        <div style="font-size: 11px; color: #6b7280;">
          <i class="bi bi-shield-lock me-1"></i>This rejection reason will be stored in the workflow audit registry.
        </div>
      </div>
    `;

    return Swal.fire({
      title: `<div style="font-size: 18px; font-weight: 700; color: #111827; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="bi bi-x-circle-fill text-danger" style="font-size: 22px;"></i>
                Reject Application ${refNo !== 'N/A' ? '• ' + refNo : ''}
              </div>`,
      html: htmlContent,
      icon: undefined,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-x-octagon-fill me-1"></i> Confirm Rejection',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6c757d',
      width: '560px',
      focusConfirm: false,
      preConfirm: () => {
        const input = document.getElementById('swalRejectReasonInput') as HTMLTextAreaElement | null;
        const val = String(input?.value || '').trim();
        if (!val) {
          Swal.showValidationMessage('Rejection reason / remark is required.');
          return false as any;
        }
        return val;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        return String(result.value).trim();
      }
      return null;
    });
  }

  private handleRejectAction(item: any, itemType: string): Observable<ActionResult> {
    const itemId = item?.id || item?.referenceNo || item?.reference_no;
    if (!itemId) {
      return of({
        success: false,
        message: 'Item ID is required for rejection'
      });
    }

    const hasInlineReason = !!item && Object.prototype.hasOwnProperty.call(item, '__rejectReason');
    const inlineReason = String(item?.__rejectReason ?? item?.rejectReason ?? '').trim();

    const getReason$: Observable<string | null> = (hasInlineReason && inlineReason)
      ? of(inlineReason)
      : from(this.promptRejectionReasonWithHologramImpact(item, itemType));

    return getReason$.pipe(
      switchMap((reason) => {
        if (!reason) {
          return of({ success: false, message: 'Rejection cancelled (remark is required).' });
        }

        if (this.isImflRequisitionItem(item, itemType)) {
          const targetId = encodeURIComponent(String(item.referenceNo || item.reference_no || item.id || '').trim());
          return this.toActionResult(
            this.http.post<any>(`${environment.apiBaseUrl}/transactional/distributor-permit/${targetId}/perform-action/`, { action: 'REJECT', remarks: reason }),
            'Distributor permit requisition rejected successfully',
            'Failed to reject distributor permit requisition'
          );
        }

        switch (itemType) {
          case 'requisition':
            return this.toActionResult(
              this.enaRequisitionService.performAction(item.id, 'REJECT'),
              'Requisition rejected successfully',
              'Failed to reject requisition'
            );

          case 'imfl-revalidation':
          case 'distributor-permit-revalidation':
          case 'revalidation': {
            const revId = item.id || item.referenceNo || item.reference_no || '';
            return this.toActionResult(
              this.supplyChainService.performRevalidationAction(revId, 'REJECT', reason),
              'Revalidation rejected successfully',
              'Failed to reject revalidation'
            );
          }

          case 'imfl-cancellation':
          case 'distributor-permit-cancellation':
          case 'cancellation':
            return this.toActionResult(
              this.supplyChainService.performCancellationAction(item.id, 'REJECT', reason),
              'Cancellation rejected successfully',
              'Failed to reject cancellation'
            );

          case 'transit':
            return this.toActionResult(
              this.supplyChainService.performTransitPermitAction(item.id, 'REJECT', reason),
              'Transit permit rejected successfully',
              'Failed to reject transit permit'
            );

          case 'hologram':
            return this.performHologramWorkflowAction(item, 'reject', reason, 'Rejected');
          case 'new-license':
          case 'company-registration':
          case 'company-collaboration':
          case 'label-registration':
          case 'salesman-barman-registration':
          case 'special-permit':
            return this.executeWorkflowReject(item, reason);

          case 'license-renewal':
            return this.toActionResult(
              this.http.post<any>(
                `${environment.apiBaseUrl}/transactional/license_renewal_application/${encodeURIComponent(this.getWorkflowApplicationId(item))}/reject/`,
                { remarks: reason },
                { headers: new HttpHeaders({ Accept: 'application/json' }) }
              ),
              'Renewal application rejected successfully',
              'Failed to reject renewal application'
            );

          default:
            return of({
              success: false,
              message: `Rejection not implemented for ${itemType}`
            });
        }
      })
    );
  }

  private handleViewRemarkAction(item: any, itemType: string): Observable<ActionResult> {
    if (!['new-license', 'company-registration', 'company-collaboration', 'salesman-barman-registration'].includes(itemType)) {
      return of({ success: false, message: `View remark not implemented for ${itemType}` });
    }

    const applicationId = this.getWorkflowApplicationId(item);
    if (!applicationId) {
      return of({ success: false, message: 'Application ID is missing for view remark' });
    }

    return this.http.get<any[]>(
      `${this.workflowBaseUrl}/${encodeURIComponent(applicationId)}/rejections/`,
      { headers: new HttpHeaders({ Accept: 'application/json' }) }
    ).pipe(
      map((res: any) => Array.isArray(res) ? res : []),
      map((rejections: any[]) => {
        if (!rejections.length) {
          return { success: false, message: 'No rejection remarks found for this application.' };
        }

        this.dialog.open(RejectionRemarksDialogComponent, {
          width: 'min(920px, 96vw)',
          maxWidth: '96vw',
          data: {
            applicationId,
            referenceNo: item?.referenceNo ?? item?.refNo ?? applicationId,
            rejections,
            viewerContext: (() => {
              const roleName = String(localStorage.getItem('role') ?? '').trim().toLowerCase();
              if (roleName) return roleName === 'licensee' ? 'licensee' : 'admin';
              const roleId = String(localStorage.getItem('role_id') ?? '').trim();
              if (roleId) return roleId === '2' ? 'licensee' : 'admin';
              return 'admin';
            })()
          }
        });

        return { success: true, message: 'Loaded rejection remarks.', data: rejections };
      }),
      catchError((error) => of({
        success: false,
        message: error?.error?.detail || 'Failed to load rejection remarks',
        data: error
      }))
    );
  }

  private handleForwardAction(item: any, itemType: string, options?: ActionExecutionOptions): Observable<ActionResult> {
    const itemId = item?.id || item?.referenceNo || item?.reference_no;
    if (!itemId) {
      return of({ success: false, message: 'Item ID is required for forward' });
    }

    if (this.isImflRequisitionItem(item, itemType)) {
      const targetId = encodeURIComponent(String(item.referenceNo || item.reference_no || item.id || '').trim());
      return this.toActionResult(
        this.http.post<any>(`${environment.apiBaseUrl}/transactional/distributor-permit/${targetId}/perform-action/`, { action: 'FORWARD' }),
        'Distributor permit requisition forwarded successfully',
        'Failed to forward distributor permit requisition'
      );
    }

    if (itemType === 'hologram') {
      return this.performHologramWorkflowAction(item, 'forward', 'Forwarded', 'Forwarded');
    }
    if (['new-license', 'company-registration', 'company-collaboration', 'label-registration', 'salesman-barman-registration', 'special-permit'].includes(itemType)) {
      return this.executeWorkflowAdvance(item, 'forward', 'Forwarded', options?.workflowContextData);
    }

    // Forward is typically the same as approve for most workflows
    return this.handleApproveAction(item, itemType);
  }

  private handleVerifyAction(item: any, itemType: string): Observable<ActionResult> {
    const itemId = item?.id || item?.referenceNo || item?.reference_no;
    if (!itemId) {
      return of({
        success: false,
        message: 'Item ID is required for verification'
      });
    }

    if (this.isImflRequisitionItem(item, itemType)) {
      const targetId = encodeURIComponent(String(item.referenceNo || item.reference_no || item.id || '').trim());
      return this.toActionResult(
        this.http.post<any>(`${environment.apiBaseUrl}/transactional/distributor-permit/${targetId}/perform-action/`, { action: 'VERIFY' }),
        'Distributor permit requisition verified successfully',
        'Failed to verify distributor permit requisition'
      );
    }

    switch (itemType) {
      case 'hologram':
        return this.performHologramWorkflowAction(item, 'verify', 'Verified by IT Cell', 'Verified');

      default:
        return of({
          success: false,
          message: `Verification not implemented for ${itemType}`
        });
    }
  }

  private handleIssueAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for issuing'
      });
    }

    switch (itemType) {
      case 'hologram':
        return this.performHologramWorkflowAction(item, 'issue', 'Issued', 'Issued');

      default:
        return of({
          success: false,
          message: `Issue action not implemented for ${itemType}`
        });
    }
  }

  private handleExtendAction(item: any, itemType: string): Observable<ActionResult> {
    // Extend validity - typically for revalidations
    // Since the backend doesn't support EXTEND action, we'll use APPROVE with extend message
    if (itemType === 'revalidation' && item.id) {
      const extendReason = prompt('Enter reason for extending validity:');
      if (!extendReason || !extendReason.trim()) {
        return of({
          success: false,
          message: 'Extension reason is required'
        });
      }

      return this.supplyChainService.performRevalidationAction(item.id, 'APPROVE', `Validity extended: ${extendReason}`);
    }

    return of({
      success: false,
      message: `Extend action not implemented for ${itemType}`
    });
  }

  private handleTerminateAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for termination'
      });
    }

    const reason = prompt('Enter termination reason (required):');
    if (!reason || !reason.trim()) {
      return of({
        success: false,
        message: 'Termination reason is required'
      });
    }

    switch (itemType) {
      case 'transit':
        // Use REJECT action with termination reason for transit permits
        return this.supplyChainService.performTransitPermitAction(item.id, 'REJECT', `Terminated: ${reason}`);

      default:
        return of({
          success: false,
          message: `Termination not implemented for ${itemType}`
        });
    }
  }

  private handlePayAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for payment'
      });
    }

    // IMFL Distributor Permit payment — directly call backend perform-action (PAY)
    if (this.isImflRequisitionItem(item, itemType)) {
      const targetId = encodeURIComponent(String(item.referenceNo || item.reference_no || item.id || '').trim());
      return this.toActionResult(
        this.http.post<any>(
          `${environment.apiBaseUrl}/transactional/distributor-permit/${targetId}/perform-action/`,
          { action: 'PAY' }
        ),
        'Payment completed successfully. Application forwarded to Permit Section.',
        'Failed to complete payment for IMFL Requisition'
      );
    }

    switch (itemType) {
      case 'new-license': {
        const applicationId = this.getWorkflowApplicationId(item);
        if (!applicationId) {
          return of({ success: false, message: 'Application ID is required for payment' });
        }

        const licenseFee = Number(item?.license_fee_amount ?? item?.licenseFeeAmount ?? item?.yearly_license_fee ?? item?.yearlyLicenseFee ?? 0);
        const securityFee = Number(item?.security_fee_amount ?? item?.securityFeeAmount ?? 0);
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'wallet',
            walletView: 'others',
            tab: 'license_fee',
            id: applicationId,
            type: 'new-license',
            ref: applicationId,
            referenceNo: applicationId,
            amount: Number.isFinite(licenseFee) && licenseFee > 0 ? licenseFee : undefined,
            securityAmount: Number.isFinite(securityFee) && securityFee > 0 ? securityFee : undefined,
            action: 'pay',
            source: 'new-license'
          }
        });
        return of({ success: true, message: 'Redirected to wallet for payment' });
      }

      case 'license-renewal': {
        const applicationId = this.getWorkflowApplicationId(item);
        if (!applicationId) {
          return of({ success: false, message: 'Application ID is required for payment' });
        }
        const licenseFee = Number(item?.license_fee_amount ?? item?.licenseFeeAmount ?? item?.yearly_license_fee ?? item?.yearlyLicenseFee ?? 0);
        const securityFee = Number(item?.security_fee_amount ?? item?.securityFeeAmount ?? 0);
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'wallet',
            walletView: 'others',
            tab: 'license_fee',
            id: applicationId,
            type: 'license-renewal',
            ref: applicationId,
            referenceNo: applicationId,
            amount: Number.isFinite(licenseFee) && licenseFee > 0 ? licenseFee : undefined,
            securityAmount: Number.isFinite(securityFee) && securityFee > 0 ? securityFee : undefined,
            action: 'pay',
            source: 'license-renewal'
          }
        });
        return of({ success: true, message: 'Redirected to wallet for payment' });
      }

      case 'special-permit': {
        const applicationId = this.getWorkflowApplicationId(item);
        if (!applicationId) {
          return of({ success: false, message: 'Application ID is required for payment' });
        }
        const licenseFee = Number(item?.license_fee_amount ?? item?.licenseFeeAmount ?? item?.amount ?? item?.payment_amount ?? item?.paymentAmount ?? 0);
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'wallet',
            tab: 'license_fee',
            id: applicationId,
            type: 'special-permit',
            ref: applicationId,
            referenceNo: applicationId,
            amount: Number.isFinite(licenseFee) && licenseFee > 0 ? licenseFee : undefined,
            action: 'pay',
            source: 'special-permit'
          }
        });
        return of({ success: true, message: 'Redirected to wallet for payment' });
      }

      case 'requisition':
      case 'revalidation':
      case 'cancellation':
      case 'transit':
      case 'hologram': {
        const walletTab = this.mapWalletTabForItemType(itemType);
        this.navigateToWalletForPayment(item, itemType, walletTab);
        return of({
          success: true,
          message: `Redirected to wallet (${walletTab}) for payment`
        });
      }

      case 'company-registration': {
        const applicationId = this.getWorkflowApplicationId(item);
        if (!applicationId) {
          return of({ success: false, message: 'Application ID is required for payment' });
        }
        const fee = Number(
          item?.payment_amount ?? item?.paymentAmount ?? item?.amount ?? 0
        );
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'wallet',
            tab: 'license_fee',
            id: applicationId,
            type: 'company-registration',
            ref: applicationId,
            referenceNo: applicationId,
            amount: Number.isFinite(fee) && fee > 0 ? fee : undefined,
            action: 'pay',
            source: 'company-registration'
          }
        });
        return of({ success: true, message: 'Redirected to wallet for payment' });
      }

      case 'company-collaboration': {
        const applicationId = this.getWorkflowApplicationId(item);
        if (!applicationId) {
          return of({ success: false, message: 'Application ID is required for payment' });
        }
        return this.toActionResult(
          this.http.post<any>(
            `${environment.apiBaseUrl}/transactional/company-collaboration/pay-fee/${encodeURIComponent(applicationId)}/`,
            {}
          ),
          'Company Collaboration fee payment completed successfully.',
          'Failed to complete payment for Company Collaboration'
        );
      }

      default:
        const walletTab = this.mapWalletTabForItemType(itemType);
        this.navigateToWalletForPayment(item, itemType, walletTab);

        return of({
          success: true,
          message: `Redirected to wallet (${walletTab}) for payment`
        });
    }
  }

  private handleForcePayAction(item: any, itemType: string): Observable<ActionResult> {
    const rawId = item?.referenceNo || item?.reference_no || item?.refNo || item?.id;
    if (!rawId) {
      return of({
        success: false,
        message: 'Item ID is required for force payment'
      });
    }

    const targetId = encodeURIComponent(String(rawId).trim());
    return this.toActionResult(
      this.http.post<any>(
        `${environment.apiBaseUrl}/transactional/distributor-permit/${targetId}/perform-action/`,
        { action: 'FORCE_PAY' }
      ),
      'Force payment completed successfully. Application forwarded to Permit Section.',
      'Failed to force payment for IMFL Requisition'
    );
  }

  private mapWalletTabForItemType(itemType: string): 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram' {
    const normalized = String(itemType || '').toLowerCase().trim();
    if (normalized === 'transit-permit') {
      return 'transit';
    }
    if (normalized === 'hologram-request') {
      return 'hologram';
    }
    if (normalized === 'revalidation') {
      return 'revalidation';
    }
    if (normalized === 'cancellation') {
      return 'cancellation';
    }
    if (normalized === 'hologram') {
      return 'hologram';
    }
    if (normalized === 'transit') {
      return 'transit';
    }
    return 'requisition';
  }

  private navigateToWalletForPayment(
    item: any,
    itemType: string,
    tab: 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram'
  ): void {
    const referenceNo = this.getItemReferenceNo(item);
    const paymentAmount = this.getItemPaymentAmount(item);
    const licenseeId = this.extractFirstNonEmpty(item, [
      'licenseeId',
      'licensee_id',
      'licenseId',
      'license_id'
    ]);

    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'wallet',
        tab,
        id: item?.id,
        type: itemType,
        ref: referenceNo || undefined,
        referenceNo: referenceNo || undefined,
        amount: Number.isFinite(paymentAmount) ? paymentAmount : undefined,
        licenseeId: licenseeId || undefined,
        action: 'pay',
        source: 'supply-chain-view'
      }
    });
  }

  private getItemPaymentAmount(item: any): number {
    const candidates = [
      item?.paymentAmount,
      item?.payment_amount,
      item?.amount,
      item?.brAmount,
      item?.br_amount,
      item?.totalAmount,
      item?.total_amount,
      item?.total_import_value,
      item?.totalImportValue,
      item?.totalCancellationAmount,
      item?.total_cancellation_amount,
      item?.license_fee_amount,
      item?.licenseFeeAmount,
      item?.yearly_license_fee,
      item?.yearlyLicenseFee
    ];

    for (const value of candidates) {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue) && numericValue > 0) {
        return numericValue;
      }
    }

    return 0;
  }

  private handleRequestRevalidationAction(item: any, itemType: string, context?: string): Observable<ActionResult> {
    // Navigate to revalidation request form within SPA
    this.router.navigate(['/dev-supply-chain-revalidation-request'], {
      queryParams: {
        id: item.id,
        ref: item.referenceNo,
        source: context || 'licensee-dashboard',
        mode: 'edit'
      }
    });

    return of({
      success: true,
      message: 'Navigated to revalidation request'
    });
  }

  private handleRequestCancellationAction(item: any, itemType: string): Observable<ActionResult> {
    if (itemType !== 'requisition') {
      return this.handleCancelAction(item, itemType);
    }

    const referenceNo = this.getItemReferenceNo(item);
    if (!referenceNo) {
      return of({
        success: false,
        message: 'Reference number is required to open cancellation request'
      });
    }

    const requisitionId = item?.id ? String(item.id) : '';
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'requisition',
        openCancellationRef: referenceNo,
        openCancellationId: requisitionId || undefined,
        source: 'licensee-dashboard'
      }
    });

    return of({
      success: true,
      message: 'Opening cancellation request form'
    });
  }

  private submitCancellationFromRequisition(referenceNo: string, requisition: any, fallbackItem: any): Observable<any> {
    const payload = this.buildCancellationPayload(referenceNo, requisition, fallbackItem);
    if (!Array.isArray(payload.permit_numbers) || payload.permit_numbers.length === 0) {
      return throwError(() => new Error('No permit numbers available to submit cancellation'));
    }
    return this.supplyChainService.submitCancellation(payload);
  }

  private buildCancellationPayload(referenceNo: string, requisition: any, fallbackItem: any): any {
    const source = requisition || {};
    const fallback = fallbackItem || {};

    const permitNumbers = this.extractPermitNumbers(source, fallback);
    const licenseeId =
      this.extractFirstNonEmpty(source, ['licenseeId', 'licensee_id']) ||
      this.extractFirstNonEmpty(fallback, ['licenseeId', 'licensee_id']) ||
      '';

    const payload: any = {
      reference_no: referenceNo,
      permit_numbers: permitNumbers
    };

    if (licenseeId) {
      payload.licensee_id = String(licenseeId).trim();
    }

    return payload;
  }

  private extractPermitNumbers(source: any, fallback: any): string[] {
    const sequence =
      this.extractFirstNonEmpty(source, ['detailsPermitsNumber', 'details_permits_number']) ||
      this.extractFirstNonEmpty(fallback, ['detailsPermitsNumber', 'details_permits_number']);

    if (sequence) {
      const parsed = String(sequence)
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
      if (parsed.length > 0) {
        return parsed;
      }
    }

    const countRaw =
      this.extractFirstNonEmpty(source, [
        'requisitonNumberOfPermits',
        'requisiton_number_of_permits',
        'numberOfPermits',
        'number_of_permits'
      ]) ||
      this.extractFirstNonEmpty(fallback, [
        'requisitonNumberOfPermits',
        'requisiton_number_of_permits',
        'numberOfPermits',
        'number_of_permits'
      ]);

    const count = Number(countRaw);
    if (!Number.isFinite(count) || count <= 0) {
      return [];
    }

    const generated: string[] = [];
    for (let i = 1; i <= count; i++) {
      generated.push(String(i));
    }
    return generated;
  }

  private extractFirstNonEmpty(source: any, keys: string[]): string {
    if (!source) return '';
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value);
      }
    }
    return '';
  }

  private getItemReferenceNo(item: any): string {
    return this.extractFirstNonEmpty(item, ['referenceNo', 'refNo', 'ourRefNo', 'our_ref_no', 'billNo', 'bill_no']);
  }

  private handleSubmitPaySlipAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({ success: false, message: 'Item ID is required for pay slip submission' });
    }

    if (itemType === 'cancellation') {
      return this.toActionResult(
        this.supplyChainService.performCancellationAction(item.id, 'SubmitPayslip', 'licensee'),
        'Pay slip submitted successfully',
        'Failed to submit pay slip'
      );
    }

    return of({ success: false, message: `Submit pay slip not implemented for ${itemType}` });
  }

  private handleApprovePaySlipAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({ success: false, message: 'Item ID is required for pay slip approval' });
    }

    if (itemType === 'cancellation') {
      return this.toActionResult(
        this.supplyChainService.performCancellationAction(item.id, 'ApprovePayslip', 'commissioner'),
        'Pay slip approved successfully',
        'Failed to approve pay slip'
      );
    }

    return of({ success: false, message: `Approve pay slip not implemented for ${itemType}` });
  }

  private handleRejectPaySlipAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({ success: false, message: 'Item ID is required for pay slip rejection' });
    }

    if (itemType === 'cancellation') {
      return this.toActionResult(
        this.supplyChainService.performCancellationAction(item.id, 'RejectPayslip', 'commissioner'),
        'Pay slip rejected successfully',
        'Failed to reject pay slip'
      );
    }

    return of({ success: false, message: `Reject pay slip not implemented for ${itemType}` });
  }

  private handleAssignCartonsAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({ success: false, message: 'Item ID is required for carton assignment' });
    }

    if (itemType === 'hologram') {
      return this.performHologramWorkflowAction(item, 'assign_cartons', 'Cartons assigned', 'Cartons assigned');
    }

    return of({ success: false, message: `Assign cartons not implemented for ${itemType}` });
  }

  private handleCompleteAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({ success: false, message: 'Item ID is required to complete' });
    }

    if (itemType === 'hologram') {
      return this.performHologramWorkflowAction(item, 'complete', 'Completed', 'Completed');
    }

    return of({ success: false, message: `Complete action not implemented for ${itemType}` });
  }

  private handleCancelAction(item: any, itemType: string): Observable<ActionResult> {
    // Navigate to cancellation request within SPA
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'cancellation',
        ref: item.referenceNo,
        type: itemType
      }
    });

    return of({
      success: true,
      message: 'Navigated to cancellation request within SPA'
    });
  }

  private handleViewSlipAction(item: any, itemType: string, context?: string): Observable<ActionResult> {
    const slipRoutes: { [key: string]: string } = {
      'requisition': '/unified-letter-view/requisition',
      'revalidation': '/unified-letter-view/revalidation',
      'transit': '/unified-letter-view/transit',
      'hologram': '/payment-slip-view'
    };

    const normalizedType = String(itemType || '').toLowerCase();
    const route = slipRoutes[normalizedType];
    if (route) {
      const queryParams = {
        id: item.id,
        type: normalizedType,
        refNo: item.referenceNo,
        ref: item.referenceNo,
        referenceNo: item.referenceNo,
        source: context || 'dashboard'
      };

      this.router.navigate([route], {
        queryParams
      }).then((ok) => {
        if (!ok && typeof window !== 'undefined') {
          const params = new URLSearchParams();
          Object.entries(queryParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              params.set(key, String(value));
            }
          });
          const query = params.toString();
          window.location.href = query ? `${route}?${query}` : route;
        }
      }).catch(() => {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams();
          Object.entries(queryParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              params.set(key, String(value));
            }
          });
          const query = params.toString();
          window.location.href = query ? `${route}?${query}` : route;
        }
      });

      return of({
        success: true,
        message: `Navigated to ${normalizedType} slip view`
      });
    }

    return of({
      success: false,
      message: `No slip route defined for ${itemType}`
    });
  }

  private handleViewPaymentSlipAction(item: any, itemType: string, context?: string): Observable<ActionResult> {
    // Navigate to unified payment slip view
    const queryParams = {
      id: item.id,
      type: itemType,
      refNo: item.referenceNo,
      ref: item.referenceNo,
      referenceNo: item.referenceNo,
      source: context || 'dashboard'
    };

    this.router.navigate(['/payment-slip-view'], {
      queryParams
    }).then((ok) => {
      if (!ok && typeof window !== 'undefined') {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value));
          }
        });
        const query = params.toString();
        window.location.href = query ? `/payment-slip-view?${query}` : '/payment-slip-view';
      }
    }).catch(() => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value));
          }
        });
        const query = params.toString();
        window.location.href = query ? `/payment-slip-view?${query}` : '/payment-slip-view';
      }
    });

    return of({
      success: true,
      message: `Navigated to payment slip view`
    });
  }

  private handleDownloadAction(item: any, itemType: string): Observable<ActionResult> {
    // Implement download logic based on item type
    console.log(`Download action for ${itemType}:`, item.referenceNo);

    return of({
      success: true,
      message: `Download initiated for ${item.referenceNo}`
    });
  }

  private handleEditAction(item: any, itemType: string): Observable<ActionResult> {
    // Navigate to edit page based on item type within SPA
    const editRoutes: { [key: string]: string } = {
      'requisition': 'requisition',
      'transit': 'transit-permit',
      'hologram': 'hologram'
    };

    const section = editRoutes[itemType];
    if (section) {
      this.router.navigate(['/dashboard'], {
        queryParams: {
          section: section,
          edit: true,
          ref: item.referenceNo
        }
      });

      return of({
        success: true,
        message: `Navigated to edit ${itemType} within SPA`
      });
    }

    return of({
      success: false,
      message: `Edit not available for ${itemType}`
    });
  }

  private handleRaiseObjectionAction(item: any, itemType: string): Observable<ActionResult> {
    if (this.isImflRequisitionItem(item, itemType)) {
      const targetId = encodeURIComponent(String(item?.referenceNo || item?.reference_no || item?.id || '').trim());
      return from(
        Swal.fire({
          title: 'Raise Objection',
          input: 'textarea',
          inputLabel: 'Objection Remarks (Required)',
          inputPlaceholder: 'Enter the objection remarks...',
          showCancelButton: true,
          confirmButtonText: 'Submit Objection',
          confirmButtonColor: '#f59e0b',
          cancelButtonColor: '#6c757d',
          inputValidator: (value) => {
            if (!value || !value.trim()) {
              return 'Objection remarks are required!';
            }
            return null;
          }
        })
      ).pipe(
        switchMap((result) => {
          if (!result.isConfirmed || !result.value) {
            return of({ success: false, message: 'Objection cancelled' });
          }
          const remarks = String(result.value).trim();
          return this.toActionResult(
            this.http.post<any>(`${environment.apiBaseUrl}/transactional/distributor-permit/${targetId}/perform-action/`, { action: 'RAISE_OBJECTION', remarks }),
            'Objection raised successfully',
            'Failed to raise objection'
          );
        })
      );
    }

    if (!['new-license', 'company-registration', 'company-collaboration', 'label-registration', 'salesman-barman-registration'].includes(itemType)) {
      return of({ success: false, message: `Raise objection not implemented for ${itemType}` });
    }

    return this.dialog.open(ObjectionDialogComponent, {
      width: 'min(1150px, 96vw)',
      maxWidth: '96vw',
      data: {
        application: item,
        title: 'Raise Objection'
      }
    }).afterClosed().pipe(
      switchMap((result: ObjectionDialogResult | null | undefined) => {
        if (!result?.objections?.length) {
          return of({ success: false, message: 'Objection cancelled' });
        }
        return this.executeWorkflowObjection(item, result.objections, result.generalRemarks);
      })
    );
  }

  private executeWorkflowAdvance(
    item: any,
    mode: 'approve' | 'reject' | 'forward' | 'revert',
    remarks: string,
    workflowContextData?: Record<string, any>
  ): Observable<ActionResult> {
    const applicationId = this.getWorkflowApplicationId(item);
    if (!applicationId) {
      return of({ success: false, message: 'Application ID is missing for workflow action' });
    }

    return this.fetchWorkflowNextStages(applicationId).pipe(
      switchMap((stages: any[]) => {
        const target = this.pickWorkflowStage(stages, mode);
        if (!target?.id) {
          return of({ success: false, message: `No valid target stage found for ${mode}` });
        }

        return this.http.post<any>(
          `${this.workflowBaseUrl}/${encodeURIComponent(applicationId)}/advance/${target.id}/`,
          {
            remarks,
            context_data: {
              action: mode.toUpperCase(),
              ...(workflowContextData ?? {})
            }
          },
          { headers: new HttpHeaders({ Accept: 'application/json' }) }
        ).pipe(
          map(() => ({ success: true, message: `${mode.toUpperCase()} action completed successfully` })),
          catchError((error) => of({
            success: false,
            message: error?.error?.detail || `Failed to ${mode} application`
          }))
        );
      }),
      catchError((error) => of({
        success: false,
        message: error?.error?.detail || 'Failed to fetch next stages'
      }))
    );
  }

  private executeWorkflowReject(
    item: any,
    remarks: string
  ): Observable<ActionResult> {
    const applicationId = this.getWorkflowApplicationId(item);
    if (!applicationId) {
      return of({ success: false, message: 'Application ID is missing for workflow rejection' });
    }

    return this.fetchWorkflowNextStages(applicationId).pipe(
      switchMap((stages: any[]) => {
        const target = this.pickWorkflowStage(stages, 'reject');
        if (!target?.id) {
          return of({ success: false, message: 'No rejection stage available from current stage' });
        }

        return this.http.post<any>(
          `${this.workflowBaseUrl}/${encodeURIComponent(applicationId)}/reject/`,
          { target_stage_id: target.id, remarks },
          { headers: new HttpHeaders({ Accept: 'application/json' }) }
        ).pipe(
          map(() => ({ success: true, message: `REJECT action completed successfully` })),
          catchError((error) => of({
            success: false,
            message: error?.error?.detail || `Failed to reject application`,
            data: error
          }))
        );
      }),
      catchError((error) => of({
        success: false,
        message: error?.error?.detail || 'Failed to fetch next stages',
        data: error
      }))
    );
  }

  private handleRevertAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for revert'
      });
    }

    if (itemType === 'new-license' || itemType === 'company-registration' || itemType === 'company-collaboration' || itemType === 'salesman-barman-registration' || itemType === 'special-permit') {
      return new Observable<ActionResult>((subscriber) => {
        Swal.fire({
          title: 'Revert Application',
          input: 'textarea',
          inputLabel: 'Remarks (required)',
          inputPlaceholder: 'Enter remarks for reverting...',
          showCancelButton: true,
          confirmButtonText: 'Revert Back',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#dc3545',
          reverseButtons: true,
          inputValidator: (value: any) => {
            if (!value || !value.trim()) {
              return 'Remarks are required!';
            }
            return null;
          }
        }).then((result: any) => {
          if (result.isConfirmed && result.value) {
            this.executeWorkflowAdvance(item, 'revert', result.value, { is_reverted: true }).subscribe({
              next: (res) => {
                subscriber.next(res);
                subscriber.complete();
              },
              error: (err) => {
                subscriber.error(err);
              }
            });
          } else {
            subscriber.next({ success: false, message: 'Revert cancelled.' });
            subscriber.complete();
          }
        });
      });
    }

    return of({
      success: false,
      message: `Revert not implemented for ${itemType}`
    });
  }

  private executeWorkflowObjection(
    item: any,
    objections: { field: string; remarks: string }[],
    generalRemarks?: string
  ): Observable<ActionResult> {
    const applicationId = this.getWorkflowApplicationId(item);
    if (!applicationId) {
      return of({ success: false, message: 'Application ID is missing for objection' });
    }

    const safeObjections = Array.isArray(objections)
      ? objections
          .map(o => ({
            field: String((o as any)?.field || (o as any)?.field_name || '').trim(),
            remarks: String((o as any)?.remarks || '').trim()
          }))
          .filter(o => !!o.field && !!o.remarks)
      : [];

    if (!safeObjections.length) {
      return of({ success: false, message: 'Please select at least one field and enter remarks' });
    }

    return this.fetchWorkflowNextStages(applicationId).pipe(
      switchMap((stages: any[]) => {
        const target = this.pickWorkflowStage(stages, 'objection');
        if (!target?.id) {
          return of({ success: false, message: 'No objection stage available from current stage' });
        }

        return this.http.post<any>(
          `${this.workflowBaseUrl}/${encodeURIComponent(applicationId)}/raise-objection/`,
          {
            target_stage_id: target.id,
            objections: safeObjections,
            remarks: (generalRemarks || '').trim() || 'Objections raised'
          }
        ).pipe(
          map(() => ({ success: true, message: 'Objection raised successfully' })),
          catchError((error) => of({
            success: false,
            message: error?.error?.detail || 'Failed to raise objection'
          }))
        );
      }),
      catchError((error) => of({
        success: false,
        message: error?.error?.detail || 'Failed to fetch next stages'
      }))
    );
  }

  private fetchWorkflowNextStages(applicationId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.workflowBaseUrl}/${encodeURIComponent(applicationId)}/next-stages/`,
      { headers: new HttpHeaders({ Accept: 'application/json' }) }
    ).pipe(
      map((res: any) => Array.isArray(res) ? res : []),
      catchError(() => of([]))
    );
  }

  private pickWorkflowStage(
    stages: any[],
    mode: 'approve' | 'reject' | 'forward' | 'objection' | 'revert'
  ): any | null {
    if (!Array.isArray(stages) || stages.length === 0) return null;

    const normalizedStages = [...stages].sort((a: any, b: any) => {
      const aTransitionId = Number(a?.transition_id ?? a?.transitionId);
      const bTransitionId = Number(b?.transition_id ?? b?.transitionId);
      if (Number.isFinite(aTransitionId) && Number.isFinite(bTransitionId) && aTransitionId !== bTransitionId) {
        return aTransitionId - bTransitionId;
      }
      const aId = Number(a?.id);
      const bId = Number(b?.id);
      if (Number.isFinite(aId) && Number.isFinite(bId)) {
        return aId - bId;
      }
      return 0;
    });

    const getCondition = (stage: any): Record<string, any> => {
      const condition = stage?.condition;
      return condition && typeof condition === 'object' ? condition : {};
    };

    const hasSpecialConditionalFlag = (stage: any) => {
      const condition = getCondition(stage);
      return condition?.['is_reverted'] === true
        || condition?.['isReverted'] === true
        || condition?.['objections_resolved'] === true
        || condition?.['objectionsResolved'] === true;
    };

    const isRejectLike = (stage: any) => {
      const action = String(stage?.action || '').toUpperCase().trim();
      const name = String(stage?.name || '').toLowerCase();
      return action === 'REJECT' || name.includes('reject');
    };

    const isObjectionLike = (stage: any) => {
      const action = String(stage?.action || '').toUpperCase().trim();
      const name = String(stage?.name || '').toLowerCase();
      const condition = getCondition(stage);
      return condition?.['has_objections'] === true
        || condition?.['hasObjections'] === true
        || action === 'RAISE_OBJECTION'
        || action === 'OBJECTION'
        || name.includes('objection');
    };

    const byAction = (expected: string) =>
      normalizedStages.find((s: any) => String(s?.action || '').toUpperCase().trim() === expected);

    const byName = (keyword: string, predicate?: (stage: any) => boolean) =>
      normalizedStages.find((s: any) => {
        const name = String(s?.name || '').toLowerCase();
        return name.includes(keyword) && (!predicate || predicate(s));
      });

    const byConditionFlag = (flag: string) =>
      normalizedStages.find((s: any) => getCondition(s)?.[flag] === true);

    const firstSafeNonRejectStage = () =>
      normalizedStages.find((s: any) => {
        return !isRejectLike(s) && !isObjectionLike(s) && !hasSpecialConditionalFlag(s);
      }) || null;

    if (mode === 'objection') {
      return (
        byAction('RAISE_OBJECTION') ||
        byAction('OBJECTION') ||
        byConditionFlag('has_objections') ||
        byName('objection')
      );
    }

    if (mode === 'revert') {
      return (
        byAction('REVERT') ||
        byConditionFlag('is_reverted') ||
        byConditionFlag('isReverted') ||
        byName('revert')
      );
    }

    if (mode === 'reject') {
      return byAction('REJECT') || byName('reject');
    }

    if (mode === 'approve') {
      const approveAction = byAction('APPROVE');
      const forwardAction = byAction('FORWARD');
      return (
        (approveAction && !hasSpecialConditionalFlag(approveAction) ? approveAction : null) ||
        (forwardAction && !hasSpecialConditionalFlag(forwardAction) ? forwardAction : null) ||
        byName('approved', (s) => !hasSpecialConditionalFlag(s)) ||
        byName('payment', (s) => !hasSpecialConditionalFlag(s)) ||
        firstSafeNonRejectStage()
      );
    }

    const explicitForward = byAction('FORWARD');
    if (explicitForward) return explicitForward;

    return firstSafeNonRejectStage();
  }

  private getWorkflowApplicationId(item: any): string {
    return String(
      item?.application_id ?? item?.applicationId ?? item?.referenceNo ?? item?.refNo ?? item?.id ?? ''
    ).trim();
  }

  private getHologramEndpoint(item: any): 'procurement' | 'request' {
    const workflowId = item?.workflowId || item?.workflow_id || item?.workflow;
    return workflowId === 7 ? 'request' : 'procurement';
  }

  private performHologramWorkflowAction(
    item: any,
    action: string,
    remarks: string,
    successMessage: string
  ): Observable<ActionResult> {
    return this.hologramService.performAction(
      this.getHologramEndpoint(item),
      Number(item.id),
      action,
      remarks
    ).pipe(
      map((res: any) => ({
        success: res?.success !== false,
        message: res?.message || res?.detail || successMessage,
        data: res
      })),
      catchError((error: any) => of({
        success: false,
        message: error?.error?.detail || error?.error?.message || `Failed to ${action}`
      }))
    );
  }
}
