import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

// Import existing services
import { EnaRequisitionService } from '../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../features/licensee/supplyChain/services/hologram-data.service';
import { ApplicationType } from '../constants/application.constants';

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
    private enaRequisitionService: EnaRequisitionService,
    private supplyChainService: SupplyChainService,
    private hologramService: HologramDataService
  ) { }

  /**
   * Execute an action on an item based on item type and action
   */
  executeAction(
    action: string,
    item: any,
    itemType: ApplicationType,
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

  private handleApproveAction(item: any, itemType: string, options?: ActionExecutionOptions): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for approval'
      });
    }

    switch (itemType) {
      case 'requisition':
        return this.toActionResult(
          this.enaRequisitionService.performAction(item.id, 'APPROVE'),
          'Requisition approved successfully',
          'Failed to approve requisition'
        );

      case 'revalidation':
        return this.toActionResult(
          this.supplyChainService.performRevalidationAction(item.id, 'APPROVE', 'Approved'),
          'Revalidation approved successfully',
          'Failed to approve revalidation'
        );

      case 'cancellation':
        return this.toActionResult(
          this.supplyChainService.performCancellationAction(item.id, 'APPROVE', 'Approved'),
          'Cancellation approved successfully',
          'Failed to approve cancellation'
        );

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
      case 'salesman-barman-registration':
        return this.executeWorkflowAdvance(item, 'approve', 'Approved', options?.workflowContextData);

      default:
        return of({
          success: false,
          message: `Approval not implemented for ${itemType}`
        });
    }
  }

  private handleRejectAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for rejection'
      });
    }

    const hasInlineReason = !!item && Object.prototype.hasOwnProperty.call(item, '__rejectReason');
    const inlineReason = String(item?.__rejectReason ?? item?.rejectReason ?? '').trim();
    const reason = hasInlineReason
      ? (inlineReason || 'Rejected')
      : (prompt('Enter rejection reason (optional):') || 'Rejected');

    switch (itemType) {
      case 'requisition':
        return this.toActionResult(
          this.enaRequisitionService.performAction(item.id, 'REJECT'),
          'Requisition rejected successfully',
          'Failed to reject requisition'
        );

      case 'revalidation':
        return this.toActionResult(
          this.supplyChainService.performRevalidationAction(item.id, 'REJECT', reason),
          'Revalidation rejected successfully',
          'Failed to reject revalidation'
        );

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
      case 'salesman-barman-registration':
        return this.executeWorkflowAdvance(item, 'reject', reason);

      default:
        return of({
          success: false,
          message: `Rejection not implemented for ${itemType}`
        });
    }
  }

  private handleForwardAction(item: any, itemType: string, options?: ActionExecutionOptions): Observable<ActionResult> {
    if (!item.id) {
      return of({ success: false, message: 'Item ID is required for forward' });
    }

    if (itemType === 'hologram') {
      return this.performHologramWorkflowAction(item, 'forward', 'Forwarded', 'Forwarded');
    }
    if (['new-license', 'company-registration', 'company-collaboration', 'salesman-barman-registration'].includes(itemType)) {
      return this.executeWorkflowAdvance(item, 'forward', 'Forwarded', options?.workflowContextData);
    }

    // Forward is typically the same as approve for most workflows
    return this.handleApproveAction(item, itemType);
  }

  private handleVerifyAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for verification'
      });
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

    switch (itemType) {
      case 'new-license': {
        const applicationId = this.getWorkflowApplicationId(item);
        if (!applicationId) {
          return of({ success: false, message: 'Application ID is required for payment' });
        }
        return this.http.post<any>(`${this.workflowBaseUrl}/${encodeURIComponent(applicationId)}/pay-license-fee/`, {}).pipe(
          map(() => ({ success: true, message: 'Payment completed successfully' })),
          catchError((error) => of({ success: false, message: error?.error?.detail || error?.error?.error || 'Payment failed' }))
        );
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

      default:
        const walletTab = this.mapWalletTabForItemType(itemType);
        this.navigateToWalletForPayment(item, itemType, walletTab);

        return of({
          success: true,
          message: `Redirected to wallet (${walletTab}) for payment`
        });
    }
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
      item?.totalCancellationAmount,
      item?.total_cancellation_amount
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
    if (!['new-license', 'company-registration', 'company-collaboration', 'salesman-barman-registration'].includes(itemType)) {
      return of({ success: false, message: `Raise objection not implemented for ${itemType}` });
    }

    const reason = prompt('Enter objection remarks (required):');
    if (!reason || !reason.trim()) {
      return of({ success: false, message: 'Objection remarks are required' });
    }

    return this.executeWorkflowObjection(item, reason.trim());
  }

  private executeWorkflowAdvance(
    item: any,
    mode: 'approve' | 'reject' | 'forward',
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

  private executeWorkflowObjection(item: any, remarks: string): Observable<ActionResult> {
    const applicationId = this.getWorkflowApplicationId(item);
    if (!applicationId) {
      return of({ success: false, message: 'Application ID is missing for objection' });
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
            objections: [{
              field_name: 'general',
              remarks
            }],
            remarks
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
    mode: 'approve' | 'reject' | 'forward' | 'objection'
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
        || condition?.['has_objections'] === true
        || condition?.['hasObjections'] === true
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
      return action === 'RAISE_OBJECTION' || action === 'OBJECTION' || name.includes('objection');
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

    if (mode === 'reject') {
      return byAction('REJECT') || byName('reject');
    }

    if (mode === 'approve') {
      return (
        byAction('APPROVE') ||
        byAction('FORWARD') ||
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
