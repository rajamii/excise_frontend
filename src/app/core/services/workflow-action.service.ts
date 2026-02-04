import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { WorkflowService } from './workflow.service';
import { AccountService } from './account.service';
import { EnaRequisitionService } from './ena-requisition.service';
import { SupplyChainService } from '../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../features/licensee/supplyChain/services/hologram-data.service';
import { WorkflowStage } from '../models/workflow-stage.model';
import { WorkflowTransition } from '../models/workflow-transition.model';

export interface WorkflowActionConfig {
  action: string;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'warn' | 'accent';
  tooltip: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  targetStage?: number;
}

export interface ApplicationWorkflowData {
  id: string;
  type: 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram' | 'hologram-procurement';
  status: string;
  currentStage?: number;
  currentStageName?: string;
  workflowId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowActionService {
  
  // Workflow mapping for different application types
  private workflowMapping: { [key: string]: number } = {
    'requisition': 1,
    'revalidation': 2,
    'cancellation': 3,
    'transit': 4,
    'hologram': 5,
    'hologram-procurement': 6,
    'hologram-request': 5 // Alias for hologram
  };

  // Standard action configurations
  private actionConfigs: { [key: string]: WorkflowActionConfig } = {
    'APPROVE': {
      action: 'APPROVE',
      label: 'Approve',
      icon: 'check_circle',
      color: 'accent',
      tooltip: 'Approve Application',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to approve this application?'
    },
    'REJECT': {
      action: 'REJECT',
      label: 'Reject',
      icon: 'cancel',
      color: 'warn',
      tooltip: 'Reject Application',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to reject this application?'
    },
    'FORWARD': {
      action: 'FORWARD',
      label: 'Forward',
      icon: 'forward',
      color: 'primary',
      tooltip: 'Forward to Next Stage',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to forward this application?'
    },
    'RETURN': {
      action: 'RETURN',
      label: 'Return',
      icon: 'undo',
      color: 'warning',
      tooltip: 'Return to Previous Stage',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to return this application?'
    },
    'VERIFY': {
      action: 'VERIFY',
      label: 'Verify',
      icon: 'verified',
      color: 'info',
      tooltip: 'Verify Application',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to verify this application?'
    },
    'ISSUE': {
      action: 'ISSUE',
      label: 'Issue',
      icon: 'assignment_turned_in',
      color: 'success',
      tooltip: 'Issue Permit/Certificate',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to issue this permit?'
    },
    'TERMINATE': {
      action: 'TERMINATE',
      label: 'Terminate',
      icon: 'block',
      color: 'danger',
      tooltip: 'Terminate Application',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to terminate this application?'
    },
    'VIEW': {
      action: 'VIEW',
      label: 'View',
      icon: 'visibility',
      color: 'primary',
      tooltip: 'View Details'
    }
  };

  constructor(
    private workflowService: WorkflowService,
    private accountService: AccountService,
    private enaRequisitionService: EnaRequisitionService,
    private supplyChainService: SupplyChainService,
    private hologramDataService: HologramDataService
  ) {}

  /**
   * Get available actions for an application based on workflow rules
   */
  getAvailableActions(applicationData: ApplicationWorkflowData): Observable<WorkflowActionConfig[]> {
    // Always include VIEW action
    const viewAction = this.actionConfigs['VIEW'];
    
    // If no workflow data, return basic actions
    if (!applicationData.currentStage && !applicationData.workflowId) {
      return of([viewAction, ...this.getDefaultActions(applicationData)]);
    }

    // Get workflow-based actions
    return this.getWorkflowBasedActions(applicationData).pipe(
      map(workflowActions => [viewAction, ...workflowActions]),
      catchError(error => {
        console.error('Error getting workflow actions:', error);
        return of([viewAction, ...this.getDefaultActions(applicationData)]);
      })
    );
  }

  /**
   * Get workflow-based actions by checking transitions and permissions
   */
  private getWorkflowBasedActions(applicationData: ApplicationWorkflowData): Observable<WorkflowActionConfig[]> {
    const workflowId = applicationData.workflowId || this.workflowMapping[applicationData.type];
    const currentStage = applicationData.currentStage;

    if (!workflowId || !currentStage) {
      return of(this.getDefaultActions(applicationData));
    }

    return forkJoin({
      transitions: this.workflowService.getWorkflowTransitions(),
      stages: this.workflowService.getWorkflowStages(),
      currentUser: this.accountService.getAuthenticationState()
    }).pipe(
      map(({ transitions, stages, currentUser }) => {
        const availableActions: WorkflowActionConfig[] = [];

        // Filter transitions from current stage for this workflow
        const availableTransitions = transitions.filter(t => 
          (typeof t.workflow === 'number' ? t.workflow : t.workflow.id) === workflowId &&
          (typeof t.from_stage === 'number' ? t.from_stage : t.from_stage.id) === currentStage
        );

        // Get current user role
        const userRole = this.getCurrentUserRole(currentUser);

        // Generate actions based on available transitions and user role
        availableTransitions.forEach(transition => {
          const condition = transition.condition || {};
          const requiredRole = condition['role'];
          
          // Check if user has the required role for this transition
          if (requiredRole && this.hasMatchingRole(userRole, requiredRole)) {
            const targetStageId = typeof transition.to_stage === 'number' ? transition.to_stage : transition.to_stage.id;
            const targetStage = stages.find(s => s.id === targetStageId);

            if (targetStage) {
              const action = this.getActionForTransition(transition, targetStage);
              if (action) {
                availableActions.push({
                  ...action,
                  targetStage: targetStageId
                });
              }
            }
          }
        });

        // Add default actions if no workflow actions found
        if (availableActions.length === 0) {
          return this.getDefaultActions(applicationData);
        }

        return availableActions;
      })
    );
  }

  /**
   * Get action configuration based on transition condition
   */
  private getActionForTransition(transition: WorkflowTransition, targetStage: WorkflowStage): WorkflowActionConfig | null {
    // Parse the condition JSON to get the action
    const condition = transition.condition || {};
    const actionFromCondition = condition['action'];
    
    if (actionFromCondition) {
      const actionKey = actionFromCondition.toUpperCase();
      
      // Map specific actions from the database
      switch (actionKey) {
        case 'APPROVE':
        case 'ACCEPT':
          return this.actionConfigs['APPROVE'];
        case 'REJECT':
        case 'DECLINE':
          return this.actionConfigs['REJECT'];
        case 'FORWARD':
          return this.actionConfigs['FORWARD'];
        case 'VERIFY':
          return this.actionConfigs['VERIFY'];
        case 'ISSUE':
          return this.actionConfigs['ISSUE'];
        case 'PAY':
          return {
            action: 'PAY',
            label: 'Submit Payment',
            icon: 'payment',
            color: 'primary',
            tooltip: 'Submit Payment',
            requiresConfirmation: true,
            confirmationMessage: 'Are you sure you want to submit payment?'
          };
        case 'ASSIGN_CARTONS':
          return {
            action: 'ASSIGN_CARTONS',
            label: 'Assign Cartons',
            icon: 'inventory',
            color: 'info',
            tooltip: 'Assign Cartons',
            requiresConfirmation: true,
            confirmationMessage: 'Are you sure you want to assign cartons?'
          };
        case 'COMPLETE':
          return {
            action: 'COMPLETE',
            label: 'Complete',
            icon: 'check_circle',
            color: 'success',
            tooltip: 'Complete Process',
            requiresConfirmation: true,
            confirmationMessage: 'Are you sure you want to complete this process?'
          };
        case 'SUBMITPAYSLIP':
          return {
            action: 'SUBMITPAYSLIP',
            label: 'Submit Pay Slip',
            icon: 'receipt',
            color: 'primary',
            tooltip: 'Submit Pay Slip',
            requiresConfirmation: true,
            confirmationMessage: 'Are you sure you want to submit the pay slip?'
          };
        case 'APPROVEPAYSLIP':
          return {
            action: 'APPROVEPAYSLIP',
            label: 'Approve Pay Slip',
            icon: 'check_circle',
            color: 'success',
            tooltip: 'Approve Pay Slip',
            requiresConfirmation: true,
            confirmationMessage: 'Are you sure you want to approve this pay slip?'
          };
        case 'REJECTPAYSLIP':
          return {
            action: 'REJECTPAYSLIP',
            label: 'Reject Pay Slip',
            icon: 'cancel',
            color: 'warn',
            tooltip: 'Reject Pay Slip',
            requiresConfirmation: true,
            confirmationMessage: 'Are you sure you want to reject this pay slip?'
          };
        default:
          // Check if it's a known action in our configs
          if (this.actionConfigs[actionKey]) {
            return this.actionConfigs[actionKey];
          }
      }
    }

    // Fallback: try to determine action from stage name
    const stageName = targetStage.name.toLowerCase();
    if (stageName.includes('approve') || stageName.includes('accept')) {
      return this.actionConfigs['APPROVE'];
    } else if (stageName.includes('reject') || stageName.includes('decline')) {
      return this.actionConfigs['REJECT'];
    } else if (stageName.includes('forward') || stageName.includes('next')) {
      return this.actionConfigs['FORWARD'];
    } else if (stageName.includes('verify')) {
      return this.actionConfigs['VERIFY'];
    } else if (stageName.includes('issue') || stageName.includes('generate')) {
      return this.actionConfigs['ISSUE'];
    }

    // Default to FORWARD for unknown transitions
    return this.actionConfigs['FORWARD'];
  }

  /**
   * Get default actions when workflow data is not available
   */
  private getDefaultActions(applicationData: ApplicationWorkflowData): WorkflowActionConfig[] {
    const status = applicationData.status?.toUpperCase() || '';
    const actions: WorkflowActionConfig[] = [];

    // Basic approval workflow based on status
    if (status.includes('PENDING') || status.includes('FORWARDED') || status.includes('SUBMITTED')) {
      actions.push(this.actionConfigs['APPROVE']);
      actions.push(this.actionConfigs['REJECT']);
      
      if (!status.includes('FINAL')) {
        actions.push(this.actionConfigs['FORWARD']);
      }
    }

    return actions;
  }

  /**
   * Get current user role from authentication state
   */
  private getCurrentUserRole(currentUser: any): string {
    if (!currentUser) return '';
    
    const authorities = currentUser.authorities || currentUser.roles || [];
    if (Array.isArray(authorities) && authorities.length > 0) {
      // Return the first role name
      const firstRole = authorities[0];
      return typeof firstRole === 'string' ? firstRole : firstRole.name || firstRole.authority || '';
    }
    
    return '';
  }

  /**
   * Check if user role matches the required role from workflow transition
   */
  private hasMatchingRole(userRole: string, requiredRole: string): boolean {
    if (!userRole || !requiredRole) return false;
    
    // Direct match
    if (userRole === requiredRole) return true;
    
    // Role mapping for different naming conventions
    const roleMapping: { [key: string]: string[] } = {
      'permit-section': ['permit_section', 'Permit Section', 'permit-section'],
      'commissioner': ['level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'site_admin', 'commissioner'],
      'licensee': ['licensee', 'Licensee'],
      'it_cell': ['it_cell', 'it-cell', 'IT Cell'],
      'officer_in_charge': ['officer_in_charge', 'officer-incharge', 'Officer in Charge'],
      'officer': ['officer', 'Officer']
    };
    
    // Check if user role matches any of the mapped roles
    for (const [key, mappedRoles] of Object.entries(roleMapping)) {
      if (key === requiredRole && mappedRoles.includes(userRole)) {
        return true;
      }
      if (mappedRoles.includes(requiredRole) && mappedRoles.includes(userRole)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Execute workflow action
   */
  executeWorkflowAction(
    applicationData: ApplicationWorkflowData, 
    action: WorkflowActionConfig,
    context?: any
  ): Observable<any> {
    console.log('Executing workflow action:', action.action, 'for application:', applicationData.id);
    
    // For now, we'll simulate the API call and return success
    // In a real implementation, this would call the appropriate backend service
    
    // Determine the API endpoint based on application type
    let apiCall: Observable<any>;
    
    switch (applicationData.type) {
      case 'requisition':
        apiCall = this.executeRequisitionAction(applicationData, action);
        break;
      case 'revalidation':
        apiCall = this.executeRevalidationAction(applicationData, action);
        break;
      case 'cancellation':
        apiCall = this.executeCancellationAction(applicationData, action);
        break;
      case 'transit':
        apiCall = this.executeTransitAction(applicationData, action);
        break;
      case 'hologram':
      case 'hologram-procurement':
        apiCall = this.executeHologramAction(applicationData, action);
        break;
      default:
        apiCall = of({
          success: false,
          message: `Action not implemented for type: ${applicationData.type}`
        });
    }
    
    return apiCall;
  }

  /**
   * Execute requisition-specific actions
   */
  private executeRequisitionAction(applicationData: ApplicationWorkflowData, action: WorkflowActionConfig): Observable<any> {
    console.log('Executing requisition action:', action.action, 'for ID:', applicationData.id);
    
    // Use the real ENA Requisition API
    return this.enaRequisitionService.performAction(Number(applicationData.id), action.action as 'APPROVE' | 'REJECT').pipe(
      map(response => {
        console.log('Requisition API response:', response);
        
        // Determine new status based on action
        let newStatus = '';
        switch (action.action) {
          case 'APPROVE':
            newStatus = 'APPROVED_BY_PERMIT_SECTION';
            break;
          case 'REJECT':
            newStatus = 'REJECTED_BY_PERMIT_SECTION';
            break;
          case 'FORWARD':
            newStatus = 'FORWARDED_TO_COMMISSIONER';
            break;
          default:
            newStatus = 'PROCESSED';
        }
        
        return {
          success: true,
          message: response.message || `Requisition ${action.label.toLowerCase()}d successfully`,
          newStatus: newStatus,
          newStage: action.targetStage,
          applicationId: applicationData.id,
          apiResponse: response
        };
      }),
      catchError(error => {
        console.error('Requisition action failed:', error);
        return of({
          success: false,
          message: error.message || `Failed to ${action.label.toLowerCase()} requisition`,
          error: error
        });
      })
    );
  }

  /**
   * Execute revalidation-specific actions
   */
  private executeRevalidationAction(applicationData: ApplicationWorkflowData, action: WorkflowActionConfig): Observable<any> {
    console.log('Executing revalidation action:', action.action, 'for ID:', applicationData.id);
    
    // Use the real Supply Chain Service API
    return this.supplyChainService.performRevalidationAction(applicationData.id, action.action as 'APPROVE' | 'REJECT', 'permit-section').pipe(
      map(response => {
        console.log('Revalidation API response:', response);
        
        let newStatus = '';
        switch (action.action) {
          case 'APPROVE':
            newStatus = 'REVALIDATION_APPROVED';
            break;
          case 'REJECT':
            newStatus = 'REVALIDATION_REJECTED';
            break;
          case 'FORWARD':
            newStatus = 'REVALIDATION_FORWARDED';
            break;
          default:
            newStatus = 'REVALIDATION_PROCESSED';
        }
        
        return {
          success: true,
          message: response.message || `Revalidation ${action.label.toLowerCase()}d successfully`,
          newStatus: newStatus,
          newStage: action.targetStage,
          applicationId: applicationData.id,
          apiResponse: response
        };
      }),
      catchError(error => {
        console.error('Revalidation action failed:', error);
        return of({
          success: false,
          message: error.message || `Failed to ${action.label.toLowerCase()} revalidation`,
          error: error
        });
      })
    );
  }

  /**
   * Execute cancellation-specific actions
   */
  private executeCancellationAction(applicationData: ApplicationWorkflowData, action: WorkflowActionConfig): Observable<any> {
    console.log('Executing cancellation action:', action.action, 'for ID:', applicationData.id);
    
    // Use the real Supply Chain Service API
    return this.supplyChainService.performCancellationAction(applicationData.id, action.action as 'APPROVE' | 'REJECT', 'permit-section').pipe(
      map(response => {
        console.log('Cancellation API response:', response);
        
        let newStatus = '';
        switch (action.action) {
          case 'APPROVE':
            newStatus = 'CANCELLATION_APPROVED';
            break;
          case 'REJECT':
            newStatus = 'CANCELLATION_REJECTED';
            break;
          case 'FORWARD':
            newStatus = 'CANCELLATION_FORWARDED';
            break;
          default:
            newStatus = 'CANCELLATION_PROCESSED';
        }
        
        return {
          success: true,
          message: response.message || `Cancellation ${action.label.toLowerCase()}d successfully`,
          newStatus: newStatus,
          newStage: action.targetStage,
          applicationId: applicationData.id,
          apiResponse: response
        };
      }),
      catchError(error => {
        console.error('Cancellation action failed:', error);
        return of({
          success: false,
          message: error.message || `Failed to ${action.label.toLowerCase()} cancellation`,
          error: error
        });
      })
    );
  }

  /**
   * Execute transit-specific actions
   */
  private executeTransitAction(applicationData: ApplicationWorkflowData, action: WorkflowActionConfig): Observable<any> {
    console.log('Executing transit action:', action.action, 'for ID:', applicationData.id);
    
    // Use the real Supply Chain Service API
    return this.supplyChainService.performTransitPermitAction(applicationData.id, action.action as 'APPROVE' | 'REJECT', 'permit-section').pipe(
      map(response => {
        console.log('Transit API response:', response);
        
        let newStatus = '';
        switch (action.action) {
          case 'APPROVE':
            newStatus = 'TRANSIT_APPROVED';
            break;
          case 'REJECT':
            newStatus = 'TRANSIT_REJECTED';
            break;
          case 'ISSUE':
            newStatus = 'TRANSIT_PERMIT_ISSUED';
            break;
          default:
            newStatus = 'TRANSIT_PROCESSED';
        }
        
        return {
          success: true,
          message: response.message || `Transit permit ${action.label.toLowerCase()}d successfully`,
          newStatus: newStatus,
          newStage: action.targetStage,
          applicationId: applicationData.id,
          apiResponse: response
        };
      }),
      catchError(error => {
        console.error('Transit action failed:', error);
        return of({
          success: false,
          message: error.message || `Failed to ${action.label.toLowerCase()} transit permit`,
          error: error
        });
      })
    );
  }

  /**
   * Execute hologram-specific actions
   */
  private executeHologramAction(applicationData: ApplicationWorkflowData, action: WorkflowActionConfig): Observable<any> {
    console.log('Executing hologram action:', action.action, 'for ID:', applicationData.id);
    
    // Determine endpoint based on application type
    const endpoint = applicationData.type === 'hologram-procurement' ? 'procurement' : 'request';
    
    // Use the real Hologram Data Service API
    return this.hologramDataService.performAction(endpoint, Number(applicationData.id), action.action).pipe(
      map(response => {
        console.log('Hologram API response:', response);
        
        let newStatus = '';
        switch (action.action) {
          case 'APPROVE':
            newStatus = 'HOLOGRAM_APPROVED';
            break;
          case 'REJECT':
            newStatus = 'HOLOGRAM_REJECTED';
            break;
          case 'ISSUE':
            newStatus = 'HOLOGRAM_ISSUED';
            break;
          case 'ASSIGN_CARTONS':
            newStatus = 'CARTONS_ASSIGNED';
            break;
          default:
            newStatus = 'HOLOGRAM_PROCESSED';
        }
        
        return {
          success: true,
          message: response.message || `Hologram ${action.label.toLowerCase()}d successfully`,
          newStatus: newStatus,
          newStage: action.targetStage,
          applicationId: applicationData.id,
          apiResponse: response
        };
      }),
      catchError(error => {
        console.error('Hologram action failed:', error);
        return of({
          success: false,
          message: error.message || `Failed to ${action.label.toLowerCase()} hologram`,
          error: error
        });
      })
    );
  }
}