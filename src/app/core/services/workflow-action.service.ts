import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EnaRequisitionService } from './ena-requisition.service'; // Assuming same directory
import { SupplyChainService } from '../../features/licensee/supplyChain/services/supplychain.service'; // Correct path verified
import { HologramDataService } from '../../features/licensee/supplyChain/services/hologram-data.service'; // Correct path verified

export interface WorkflowActionConfig {
  action: string;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'warn';
  tooltip: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  targetStage?: number;
}

export interface ApplicationWorkflowData {
  id: any;
  workflowId?: number;
  currentStage?: number | any;
  currentStageName?: string;
  type:
    | 'requisition'
    | 'revalidation'
    | 'cancellation'
    | 'transit'
    | 'hologram'
    | 'hologram-procurement'
    | 'new-license'
    | 'license-renewal'
    | 'company-registration'
    | 'company-collaboration'
    | 'salesman-barman-registration'; // Changed to type to match component
  status: string;
  referenceNo?: string;
  allowedActionConfigs?: WorkflowActionConfig[];
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowActionService {
  private apiUrl = `${environment.apiBaseUrl}/workflow`;
  private workflowBaseUrl = `${environment.apiBaseUrl}/auth`;

  constructor(
    private http: HttpClient,
    private supplyChainService: SupplyChainService,
    private requisitionService: EnaRequisitionService,
    private hologramService: HologramDataService
  ) { }

  /**
   * Get available actions for a specific application/stage
   * PRODUCTION READY: Fetches actions dynamically from workflow transitions
   */
  getAvailableActions(data: ApplicationWorkflowData): Observable<WorkflowActionConfig[]> {
    console.log('?? WORKFLOW ACTION SERVICE: getAvailableActions called with:', data);

    // 1. If actions are already provided (passed from API/list), use them.
    // New-license details must always ask the backend because approval can move
    // the application to awaiting_payment while older list/detail data still has
    // preloaded officer actions.
    if (data.type !== 'new-license' && data.allowedActionConfigs && data.allowedActionConfigs.length > 0) {
      console.log('?? WORKFLOW ACTION SERVICE: Using provided action configs:', data.allowedActionConfigs);
      return of(data.allowedActionConfigs);
    }

    // 2. Otherwise, fetch from backend detail endpoint (no frontend hardcoding)
    return this.fetchActionsFromBackend(data).pipe(
      catchError(error => {
        console.error('?? WORKFLOW ACTION SERVICE: Error getting available actions:', error);
        return of([]);
      })
    );

  }

  /**
   * Fetch full detail for workflow-backed applications (used when list/dashboard
   * rows don't contain computed fields like license fee amounts).
   */
  getNewLicenseApplicationDetail(applicationId: string): Observable<any> {
    const encoded = encodeURIComponent(String(applicationId || '').trim());
    if (!encoded) return of(null);
    return this.http.get<any>(`${environment.apiBaseUrl}/transactional/new_license_application/detail/${encoded}/`).pipe(
      catchError(() => of(null))
    );
  }

  getLicenseRenewalApplicationDetail(applicationId: string): Observable<any> {
    const encoded = encodeURIComponent(String(applicationId || '').trim());
    if (!encoded) return of(null);
    return this.http.get<any>(`${environment.apiBaseUrl}/transactional/license_renewal_application/detail/${encoded}/`).pipe(
      catchError(() => of(null))
    );
  }


  private fetchActionsFromBackend(data: ApplicationWorkflowData): Observable<WorkflowActionConfig[]> {
    const id = data.id;
    const workflowApplicationId = this.getWorkflowApplicationId(data);

    switch (data.type) {
      case 'transit':
        return this.http.get<any>(`${environment.apiBaseUrl}/transactional/supply_chain/transit-permits/${id}/`).pipe(
          map((res: any) => res.allowed_action_configs || []),
          catchError(() => of([]))
        );

      case 'requisition':
        return this.requisitionService.getRequisitionById(id).pipe(
          map((res: any) => res.allowed_action_configs || []),
          catchError(() => of([]))
        );

      case 'revalidation':
        return this.http.get<any>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/${id}/`).pipe(
          map((res: any) => res.allowed_action_configs || []),
          catchError(() => of([]))
        );
      case 'cancellation':
        return this.http.get<any>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/${id}/`).pipe(
          map((res: any) => res.allowed_action_configs || []),
          catchError(() => of([]))
        );

      case 'hologram':
      case 'hologram-procurement':
        return this.http.get<any>(`${environment.apiBaseUrl}/transactional/supply_chain/hologram-procurement/${id}/`).pipe(
          map((res: any) => res.allowed_action_configs || []),
          catchError(() => of([]))
        );
      case 'new-license':
      case 'license-renewal':
      case 'company-registration':
      case 'company-collaboration':
      case 'salesman-barman-registration':
        if (!workflowApplicationId) {
          return of([]);
        }
        return this.http.get<any[]>(`${this.workflowBaseUrl}/${encodeURIComponent(workflowApplicationId)}/next-stages/`).pipe(
          map((stages: any[]) => this.mapNextStagesToActionConfigs(stages)),
          catchError(() => of([]))
        );

      default:
        return of([]);
    }
  }

  private getWorkflowApplicationId(data: ApplicationWorkflowData): string {
    return String(
      (data as any)?.application_id ??
      (data as any)?.applicationId ??
      data.referenceNo ??
      data.id ??
      ''
    ).trim();
  }

  private mapNextStagesToActionConfigs(stages: any[]): WorkflowActionConfig[] {
    if (!Array.isArray(stages)) return [];

    const hasSpecialConditionalFlag = (stage: any): boolean => {
      const condition = stage?.condition;
      if (!condition || typeof condition !== 'object') return false;
      return condition['is_reverted'] === true
        || condition['isReverted'] === true
        || condition['objections_resolved'] === true
        || condition['objectionsResolved'] === true;
    };

    const sortedStages = [...stages].sort((a: any, b: any) => {
      const aTransitionId = Number(a?.transition_id ?? a?.transitionId);
      const bTransitionId = Number(b?.transition_id ?? b?.transitionId);
      if (Number.isFinite(aTransitionId) && Number.isFinite(bTransitionId) && aTransitionId !== bTransitionId) {
        return aTransitionId - bTransitionId;
      }
      const aId = Number(a?.id);
      const bId = Number(b?.id);
      if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) {
        return aId - bId;
      }
      return 0;
    });

    return sortedStages
      .filter((stage: any) => !hasSpecialConditionalFlag(stage))
      .map((stage: any): WorkflowActionConfig | null => {
        const explicitAction = String(stage?.action || '').toUpperCase().trim();
        const stageName = String(stage?.name || '').toLowerCase();
        const condition = stage?.condition && typeof stage.condition === 'object' ? stage.condition : {};
        let action = '';
        let label = '';
        let icon = '';
        let color: WorkflowActionConfig['color'] = 'accent';
        let tooltip = '';
        let requiresConfirmation = false;

        if (condition['has_objections'] === true || condition['hasObjections'] === true) {
          action = 'RAISE_OBJECTION';
          label = 'Raise Objection';
          icon = 'report_problem';
          color = 'warning';
          tooltip = 'Raise objection and send back to applicant';
          requiresConfirmation = true;
        } else if (explicitAction === 'RAISE_OBJECTION' || explicitAction === 'OBJECTION') {
          action = 'RAISE_OBJECTION';
          label = 'Raise Objection';
          icon = 'report_problem';
          color = 'warning';
          tooltip = 'Raise objection and send back to applicant';
          requiresConfirmation = true;
      } else if (explicitAction === 'REJECT') {
        action = 'REJECT';
        label = 'Reject';
        icon = 'cancel';
        color = 'danger';
        tooltip = 'Reject this application';
        requiresConfirmation = true;
      } else if (explicitAction === 'FORWARD') {
        action = 'FORWARD';
        label = 'Forward';
        icon = 'arrow_forward';
        color = 'primary';
        tooltip = 'Forward to next stage';
        requiresConfirmation = true;
      } else if (explicitAction === 'APPROVE') {
        action = 'APPROVE';
        label = 'Approve';
        icon = 'check_circle';
        color = 'success';
        tooltip = 'Approve this application';
        requiresConfirmation = true;
      } else if (explicitAction === 'PAY') {
        action = 'PAY';
        label = 'Pay';
        icon = 'payment';
        color = 'primary';
        tooltip = 'Proceed to payment';
        requiresConfirmation = true;
      } else if (explicitAction === 'VIEW') {
        action = 'VIEW';
        label = 'View';
        icon = 'visibility';
        color = 'info';
        tooltip = 'View details';
        requiresConfirmation = false;
      } else if (explicitAction) {
        // Hide unsupported or internal transition actions from UI buttons
        // (e.g. REVERT/RESOLVE_OBJECTION paths).
        return null;
      } else if (stageName.includes('objection')) {
        action = 'RAISE_OBJECTION';
        label = 'Raise Objection';
        icon = 'report_problem';
        color = 'warning';
        tooltip = 'Raise objection and send back to applicant';
        requiresConfirmation = true;
      } else if (stageName.includes('reject')) {
        action = 'REJECT';
        label = 'Reject';
        icon = 'cancel';
        color = 'danger';
        tooltip = 'Reject this application';
        requiresConfirmation = true;
      } else if (stageName.includes('approved') || stageName === 'approved') {
        action = 'APPROVE';
        label = 'Approve';
        icon = 'check_circle';
        color = 'success';
        tooltip = 'Approve this application';
        requiresConfirmation = true;
      } else {
        // IMPORTANT: Don't infer PAY from stage name (e.g. "payment_pending").
        // Action must come explicitly from workflow transition action.
        // Otherwise commissioner/officer stages that forward to payment stage
        // get wrongly shown as "Pay" instead of "Approve".
        action = 'APPROVE';
        label = 'Approve';
        icon = 'check_circle';
        color = 'success';
        tooltip = `Move to ${stage?.name || 'next stage'}`;
        requiresConfirmation = true;
      }

      return {
        action,
        label,
        icon,
        color,
        tooltip,
        requiresConfirmation,
        targetStage: stage?.id ? Number(stage.id) : undefined
      };
    }).filter((config): config is WorkflowActionConfig => !!config);
  }

  /**
   * Execute a workflow action
   * Signature matches UnifiedSupplyChainViewComponent usage: (data, actionConfig)
   */
  executeWorkflowAction(
    data: ApplicationWorkflowData,
    actionConfig: WorkflowActionConfig | string, // Can be object or string
    comments?: string,
    extraData?: any
  ): Observable<any> {

    const actionName = typeof actionConfig === 'string' ? actionConfig : actionConfig.action;

    const payload = {
      action: actionName,
      comments: comments || '',
      ...extraData
    };

    let endpoint = '';

    switch (data.type) {
      case 'requisition':
        // Requisition uses APIView with hyphen
        endpoint = `${environment.apiBaseUrl}/transactional/supply_chain/ena-requisitions/${data.id}/perform-action/`;
        break;
      case 'revalidation':
        // Revalidation uses ViewSet with underscore
        endpoint = `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/${data.id}/perform_action/`;
        break;
      case 'cancellation':
        // Cancellation uses ViewSet with underscore
        endpoint = `${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/${data.id}/perform_action/`;
        break;
      case 'transit':
        // Transit permits use APIView with action/<id>/ pattern
        endpoint = `${environment.apiBaseUrl}/transactional/supply_chain/transit-permits/action/${data.id}/`;
        break;
      case 'hologram':
      case 'hologram-procurement':
        // Hologram uses ViewSet with underscore - procurement endpoint
        endpoint = `${environment.apiBaseUrl}/transactional/supply_chain/hologram/procurement/${data.id}/perform_action/`;
        break;
      case 'new-license':
      case 'license-renewal':
      case 'company-registration':
      case 'company-collaboration':
      case 'salesman-barman-registration':
        const workflowApplicationId = this.getWorkflowApplicationId(data);
        const targetStage = typeof actionConfig === 'string' ? undefined : actionConfig.targetStage;

        if (!workflowApplicationId || !targetStage) {
          return of({ success: false, message: `Missing application id or target stage for ${data.type} action` });
        }

        if (actionName === 'RAISE_OBJECTION') {
          return this.http.post(
            `${this.workflowBaseUrl}/${encodeURIComponent(workflowApplicationId)}/raise-objection/`,
            {
              target_stage_id: targetStage,
              objections: [{
                field_name: 'general',
                remarks: comments || 'Objection raised'
              }],
              remarks: comments || 'Objection raised'
            }
          );
        }

        return this.http.post(
          `${this.workflowBaseUrl}/${encodeURIComponent(workflowApplicationId)}/advance/${targetStage}/`,
          {
            remarks: comments || `${actionName} from unified action`,
            context_data: {
              action: String(actionName || '').toUpperCase().trim()
            }
          }
        );
    }

    if (!endpoint) {
      return of({ success: false, message: `No workflow endpoint configured for ${data.type}` });
    }

    console.log('🔧 WORKFLOW ACTION SERVICE: Executing action:', {
      type: data.type,
      id: data.id,
      action: actionName,
      endpoint: endpoint,
      payload: payload
    });

    return this.http.post(endpoint, payload);
  }
}
