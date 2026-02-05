import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AccountService } from './account.service';  // Assuming same directory based on imports seen
import { WorkflowService } from './workflow.service'; // Add workflow service
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
    private workflowService: WorkflowService, // Add workflow service
    private supplyChainService: SupplyChainService,
    private requisitionService: EnaRequisitionService,
    private hologramService: HologramDataService
  ) { }

  /**
   * Get available actions for a specific application/stage
   * PRODUCTION READY: Fetches actions dynamically from workflow transitions
   */
  getAvailableActions(data: ApplicationWorkflowData): Observable<WorkflowActionConfig[]> {
    console.log('🔧 WORKFLOW ACTION SERVICE: getAvailableActions called with:', data);
    
    // 1. If actions are already provided (passed from UnifiedSupplyChainView), use them
    if (data.allowedActionConfigs && data.allowedActionConfigs.length > 0) {
      console.log('🔧 WORKFLOW ACTION SERVICE: Using provided action configs:', data.allowedActionConfigs);
      return of(data.allowedActionConfigs);
    }

    // 2. Get current user role to filter transitions
    return this.accountService.getAuthenticationState().pipe(
      switchMap(user => {
        console.log('🔧 WORKFLOW ACTION SERVICE: Current user:', user);
        
        if (!user) {
          console.log('🔧 WORKFLOW ACTION SERVICE: No user found, returning empty actions');
          return of([]);
        }

        // Determine user role from authentication
        const userRole = this.getUserRole(user);
        console.log('🔧 WORKFLOW ACTION SERVICE: Determined user role:', userRole);
        
        // If we have workflow and stage information, use dynamic transitions
        if (data.workflowId && data.currentStage) {
          const currentStageId = typeof data.currentStage === 'number' ? data.currentStage : data.currentStage.id;
          
          console.log('🔧 WORKFLOW ACTION SERVICE: Fetching transitions for:', {
            workflowId: data.workflowId,
            currentStageId: currentStageId,
            userRole: userRole
          });
          
          return this.workflowService.getAvailableActionsForStage(
            data.workflowId,
            currentStageId,
            userRole
          );
        }

        console.log('🔧 WORKFLOW ACTION SERVICE: Missing workflowId or currentStage, falling back to backend fetch');
        // Fallback: Try to fetch from backend entity
        return this.fetchActionsFromBackend(data);
      }),
      catchError(error => {
        console.error('🔧 WORKFLOW ACTION SERVICE: Error getting available actions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get user role from authentication state
   */
  private getUserRole(user: any): string {
    if (!user) return 'licensee';

    const authorities = user.authorities || user.roles || [];
    
    // Map user authorities to workflow roles
    const roleMapping: { [key: string]: string } = {
      'licensee': 'licensee',
      'permit_section': 'permit-section',
      'permit-section': 'permit-section',
      'level_1': 'commissioner',
      'level_2': 'commissioner', 
      'level_3': 'commissioner',
      'level_4': 'commissioner',
      'level_5': 'commissioner',
      'site_admin': 'commissioner',
      'commissioner': 'commissioner',
      'it_cell': 'it_cell',
      'it-cell': 'it_cell',
      'officer_in_charge': 'officer_in_charge',
      'officer-in-charge': 'officer_in_charge',
      'officer-incharge': 'officer_in_charge'
    };

    // Find the first matching role
    for (const authority of authorities) {
      const roleName = typeof authority === 'string' ? authority : authority.name;
      const normalizedRole = roleName.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
      
      if (roleMapping[normalizedRole]) {
        return roleMapping[normalizedRole];
      }
    }

    // Default to licensee if no specific role found
    return 'licensee';
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