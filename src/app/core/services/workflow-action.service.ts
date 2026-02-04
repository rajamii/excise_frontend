import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AccountService } from './account.service';  // Assuming same directory based on imports seen
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
  type: 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram' | 'hologram-procurement'; // Changed to type to match component
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
    private accountService: AccountService,
    private supplyChainService: SupplyChainService,
    private requisitionService: EnaRequisitionService,
    private hologramService: HologramDataService
  ) { }

  /**
   * Get available actions for a specific application/stage
   */
  getAvailableActions(data: ApplicationWorkflowData): Observable<WorkflowActionConfig[]> {
    // 1. If actions are already provided (passed from UnifiedSupplyChainView), use them
    if (data.allowedActionConfigs && data.allowedActionConfigs.length > 0) {
      return of(data.allowedActionConfigs);
    }

    // 2. Otherwise, fetch the entity from backend
    return this.fetchActionsFromBackend(data);
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
        return this.http.get<any>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidation/${id}/`).pipe(
          map((res: any) => res.allowed_action_configs || []),
          catchError(() => of([]))
        );
      case 'cancellation':
        return this.http.get<any>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation/${id}/`).pipe(
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
        endpoint = `${environment.apiBaseUrl}/transactional/supply_chain/ena-requisition/${data.id}/perform_action/`;
        break;
      case 'revalidation':
        endpoint = `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidation/${data.id}/perform_action/`;
        break;
      case 'cancellation':
        endpoint = `${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation/${data.id}/perform_action/`;
        break;
      case 'transit':
        endpoint = `${environment.apiBaseUrl}/transactional/supply_chain/transit-permits/${data.id}/perform_action/`;
        break;
      case 'hologram':
      case 'hologram-procurement':
        // Assuming procurement 
        endpoint = `${environment.apiBaseUrl}/transactional/supply_chain/hologram/procurement/${data.id}/perform_action/`;
        break;
    }

    return this.http.post(endpoint, payload);
  }
}