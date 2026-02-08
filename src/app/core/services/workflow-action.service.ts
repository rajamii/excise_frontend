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
  type: 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram' | 'hologram-procurement' | 'new-license'; // Changed to type to match component
  status: string;
  referenceNo?: string;
  allowedActionConfigs?: WorkflowActionConfig[];
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowActionService {
  private apiUrl = `${environment.apiBaseUrl}/workflow`;

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

    // 1. If actions are already provided (passed from API/list), use them
    if (data.allowedActionConfigs && data.allowedActionConfigs.length > 0) {
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


  private fetchActionsFromBackend(data: ApplicationWorkflowData): Observable<WorkflowActionConfig[]> {
    const id = data.id;

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

      default:
        return of([]);
    }
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
        return of({ success: false, message: 'Workflow actions are not configured for new-license' });
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
