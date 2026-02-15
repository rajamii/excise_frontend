import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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
    context?: string
  ): Observable<ActionResult> {

    const normalizedAction = (action || '').toString().trim().toUpperCase();
    console.log(`Executing action: ${normalizedAction} on ${itemType} with ID: ${item.id}`);

    switch (normalizedAction) {
      case 'VIEW':
        return this.handleViewAction(item, itemType, context);

      case 'APPROVE':
        return this.handleApproveAction(item, itemType);

      case 'REJECT':
        return this.handleRejectAction(item, itemType);

      case 'FORWARD':
        return this.handleForwardAction(item, itemType);

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

  private handleApproveAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for approval'
      });
    }

    switch (itemType) {
      case 'requisition':
        return this.enaRequisitionService.performAction(item.id, 'APPROVE');

      case 'revalidation':
        return this.supplyChainService.performRevalidationAction(item.id, 'APPROVE', 'Approved');

      case 'cancellation':
        return this.supplyChainService.performCancellationAction(item.id, 'APPROVE', 'Approved');

      case 'transit':
        return this.supplyChainService.performTransitPermitAction(item.id, 'APPROVE', 'Approved');

      case 'hologram':
        return this.performHologramWorkflowAction(item, 'approve', 'Approved', 'Approved');
      case 'new-license':
      case 'company-registration':
      case 'salesman-barman-registration':
        return this.executeWorkflowAdvance(item, 'approve', 'Approved');

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

    const reason = prompt('Enter rejection reason (optional):') || 'Rejected';

    switch (itemType) {
      case 'requisition':
        return this.enaRequisitionService.performAction(item.id, 'REJECT');

      case 'revalidation':
        return this.supplyChainService.performRevalidationAction(item.id, 'REJECT', reason);

      case 'cancellation':
        return this.supplyChainService.performCancellationAction(item.id, 'REJECT', reason);

      case 'transit':
        return this.supplyChainService.performTransitPermitAction(item.id, 'REJECT', reason);

      case 'hologram':
        return this.performHologramWorkflowAction(item, 'reject', reason, 'Rejected');
      case 'new-license':
      case 'company-registration':
      case 'salesman-barman-registration':
        return this.executeWorkflowAdvance(item, 'reject', reason);

      default:
        return of({
          success: false,
          message: `Rejection not implemented for ${itemType}`
        });
    }
  }

  private handleForwardAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({ success: false, message: 'Item ID is required for forward' });
    }

    if (itemType === 'hologram') {
      return this.performHologramWorkflowAction(item, 'forward', 'Forwarded', 'Forwarded');
    }
    if (['new-license', 'company-registration', 'salesman-barman-registration'].includes(itemType)) {
      return this.executeWorkflowAdvance(item, 'forward', 'Forwarded');
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
      case 'requisition':
        return this.enaRequisitionService.performAction(item.id, 'APPROVE'); // Payment submission

      case 'transit':
        return this.supplyChainService.performTransitPermitAction(item.id, 'PAY', 'Payment submitted');

      case 'hologram':
        return this.performHologramWorkflowAction(item, 'pay', 'Payment completed', 'Payment completed');
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

      default:
        // Navigate to payment page within SPA
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'payment-confirmation',
            ref: item.referenceNo,
            type: itemType,
            action: 'pay'
          }
        });

        return of({
          success: true,
          message: 'Navigated to payment page within SPA'
        });
    }
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
    // Reuse cancellation navigation
    return this.handleCancelAction(item, itemType);
  }

  private handleSubmitPaySlipAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({ success: false, message: 'Item ID is required for pay slip submission' });
    }

    if (itemType === 'cancellation') {
      return this.supplyChainService.performCancellationAction(item.id, 'SubmitPayslip', 'licensee');
    }

    return of({ success: false, message: `Submit pay slip not implemented for ${itemType}` });
  }

  private handleApprovePaySlipAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({ success: false, message: 'Item ID is required for pay slip approval' });
    }

    if (itemType === 'cancellation') {
      return this.supplyChainService.performCancellationAction(item.id, 'ApprovePayslip', 'commissioner');
    }

    return of({ success: false, message: `Approve pay slip not implemented for ${itemType}` });
  }

  private handleRejectPaySlipAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({ success: false, message: 'Item ID is required for pay slip rejection' });
    }

    if (itemType === 'cancellation') {
      return this.supplyChainService.performCancellationAction(item.id, 'RejectPayslip', 'commissioner');
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
      'requisition': '/dev-final-requisition-letters',
      'revalidation': '/dev-revalidation-permit-slip',
      'transit': '/dev-final-transit-permit-view',
      'hologram': '/dev-payslip'
    };

    const route = slipRoutes[itemType];
    if (route) {
      this.router.navigate([route], {
        queryParams: {
          ref: item.referenceNo,
          source: context || 'dashboard'
        }
      });

      return of({
        success: true,
        message: `Navigated to ${itemType} slip view`
      });
    }

    return of({
      success: false,
      message: `No slip route defined for ${itemType}`
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
    if (!['new-license', 'company-registration', 'salesman-barman-registration'].includes(itemType)) {
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
    remarks: string
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
              action: mode.toUpperCase()
            }
          }
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
    return this.http.get<any[]>(`${this.workflowBaseUrl}/${encodeURIComponent(applicationId)}/next-stages/`).pipe(
      map((res: any) => Array.isArray(res) ? res : []),
      catchError(() => of([]))
    );
  }

  private pickWorkflowStage(
    stages: any[],
    mode: 'approve' | 'reject' | 'forward' | 'objection'
  ): any | null {
    if (!Array.isArray(stages) || stages.length === 0) return null;

    const byAction = (expected: string) =>
      stages.find((s: any) => String(s?.action || '').toUpperCase().trim() === expected);

    const byName = (keyword: string) =>
      stages.find((s: any) => String(s?.name || '').toLowerCase().includes(keyword));

    if (mode === 'objection') {
      return byAction('RAISE_OBJECTION') || byAction('OBJECTION') || byName('objection');
    }

    if (mode === 'reject') {
      return byAction('REJECT') || byName('reject');
    }

    if (mode === 'approve') {
      return byAction('APPROVE') || byName('approved') || byName('payment') || stages[0];
    }

    const explicitForward = byAction('FORWARD');
    if (explicitForward) return explicitForward;

    return stages.find((s: any) => {
      const name = String(s?.name || '').toLowerCase();
      return !name.includes('reject') && !name.includes('objection');
    }) || stages[0];
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
