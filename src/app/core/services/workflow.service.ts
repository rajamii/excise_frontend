import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Workflow } from '../models/workflow.model';
import { WorkflowStage } from '../models/workflow-stage.model';
import { WorkflowTransition } from '../models/workflow-transition.model';
import { StagePermission } from '../models/stage-permission.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private apiUrl = `${environment.apiBaseUrl}/auth`;

  constructor(private http: HttpClient) { }

  // Workflow APIs
  getWorkflows(): Observable<Workflow[]> {
    return this.http.get<Workflow[]>(`${this.apiUrl}/workflows/`);
  }

  addWorkflow(workflow: Workflow): Observable<Workflow> {
    return this.http.post<Workflow>(`${this.apiUrl}/workflows/create/`, workflow);
  }

  updateWorkflow(id: number, workflow: Workflow): Observable<Workflow> {
    return this.http.put<Workflow>(`${this.apiUrl}/workflows/${id}/update/`, workflow);
  }

  deleteWorkflow(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/workflows/${id}/delete/`);
  }

  // WorkflowStage APIs
  getWorkflowStages(): Observable<WorkflowStage[]> {
    return this.http.get<WorkflowStage[]>(`${this.apiUrl}/stages/`);
  }

  addWorkflowStage(stage: WorkflowStage): Observable<WorkflowStage> {
    return this.http.post<WorkflowStage>(`${this.apiUrl}/stages/create/`, stage);
  }

  updateWorkflowStage(id: number, stage: WorkflowStage): Observable<WorkflowStage> {
    return this.http.put<WorkflowStage>(`${this.apiUrl}/stages/${id}/update/`, stage);
  }

  deleteWorkflowStage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/stages/${id}/delete/`);
  }

  // WorkflowTransition APIs
  getWorkflowTransitions(): Observable<WorkflowTransition[]> {
    return this.http.get<WorkflowTransition[]>(`${this.apiUrl}/transitions/`);
  }

  addWorkflowTransition(transition: WorkflowTransition): Observable<WorkflowTransition> {
    return this.http.post<WorkflowTransition>(`${this.apiUrl}/transitions/create/`, transition);
  }

  updateWorkflowTransition(id: number, transition: WorkflowTransition): Observable<WorkflowTransition> {
    return this.http.put<WorkflowTransition>(`${this.apiUrl}/transitions/${id}/update/`, transition);
  }

  deleteWorkflowTransition(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/transitions/${id}/delete/`);
  }

  // StagePermission APIs
  getStagePermissions(): Observable<StagePermission[]> {
    return this.http.get<StagePermission[]>(`${this.apiUrl}/permissions/`);
  }

  addStagePermission(permission: StagePermission): Observable<StagePermission> {
    return this.http.post<StagePermission>(`${this.apiUrl}/permissions/create/`, permission);
  }

  updateStagePermission(id: number, permission: StagePermission): Observable<StagePermission> {
    return this.http.put<StagePermission>(`${this.apiUrl}/permissions/${id}/update/`, permission);
  }

  deleteStagePermission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/permissions/${id}/delete/`);
  }

  // Get available transitions for a specific workflow and current stage
  getAvailableTransitions(workflowId: number, currentStageId: number): Observable<WorkflowTransition[]> {

    return this.http.get<WorkflowTransition[]>(`${this.apiUrl}/transitions/`).pipe(
      map((allTransitions: WorkflowTransition[]) => {

        const filteredTransitions = allTransitions.filter(transition => {
          let workflowMatch = false;
          if (typeof transition.workflow === 'number') {
            workflowMatch = transition.workflow === workflowId;
          } else if (typeof transition.workflow === 'object' && transition.workflow.id) {
            workflowMatch = transition.workflow.id === workflowId;
          }
          let stageMatch = false;
          if (typeof transition.from_stage === 'number') {
            stageMatch = transition.from_stage === currentStageId;
          } else if (typeof transition.from_stage === 'object' && transition.from_stage.id) {
            stageMatch = transition.from_stage.id === currentStageId;
          }
          return workflowMatch && stageMatch;
        });
        return filteredTransitions;
      }),
      catchError(error => {
        console.error('WORKFLOW SERVICE: Error fetching transitions:', error);
        if (error.status === 403) {
          console.error('WORKFLOW SERVICE: Permission denied - user may not have workflows view permission');
        }
        return of([]);
      })
    );
  }

  // Get available actions for a specific workflow, current stage, and user role
  getAvailableActionsForStage(workflowId: number, currentStageId: number, userRole: string): Observable<any[]> {
    return this.getAvailableTransitions(workflowId, currentStageId).pipe(
      map((transitions: WorkflowTransition[]) => {

        const availableActions = transitions
          .filter(transition => {
            const matches = this.matchesCondition(transition.condition, userRole);
            return matches;
          })
          .map(transition => {
            const actionConfig = this.transitionToActionConfig(transition);
            return actionConfig;
          });
        return availableActions;
      })
    );
  }

  // Check if a transition's condition matches the user's role
  private matchesCondition(condition: any, userRole: string): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true;
    }
    if (condition['role']) {
      const conditionRole = this.normalizeRole(condition['role']);
      const normalizedUserRole = this.normalizeRole(userRole);
      return conditionRole === normalizedUserRole;
    }

    return true;
  }

  // Convert a WorkflowTransition to an action configuration for UI buttons
  private transitionToActionConfig(transition: WorkflowTransition): any {
    const condition = transition.condition || {};
    const rawAction = condition['action'] || 'FORWARD';
    const actionKey = this.normalizeActionKey(rawAction);
    const actionUpper = this.normalizeActionUpper(rawAction);

    const actionConfigs: any = {
      'approve': {
        action: 'APPROVE',
        label: 'Approve',
        icon: 'check_circle',
        color: 'accent',
        tooltip: 'Approve Application',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to approve this application?'
      },
      'reject': {
        action: 'REJECT',
        label: 'Reject',
        icon: 'cancel',
        color: 'warn',
        tooltip: 'Reject Application',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to reject this application?'
      },
      'forward': {
        action: 'FORWARD',
        label: 'Forward',
        icon: 'forward',
        color: 'primary',
        tooltip: 'Forward to Next Level',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to forward this application?'
      },
      'verify': {
        action: 'VERIFY',
        label: 'Verify',
        icon: 'verified',
        color: 'info',
        tooltip: 'Verify Application',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to verify this application?'
      },
      'issue': {
        action: 'ISSUE',
        label: 'Issue',
        icon: 'assignment_turned_in',
        color: 'success',
        tooltip: 'Issue Permit/Certificate',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to issue this permit?'
      },
      'pay': {
        action: 'PAY',
        label: 'Pay',
        icon: 'payment',
        color: 'primary',
        tooltip: 'Submit Payment',
        requiresConfirmation: false
      },
      'assign_cartons': {
        action: 'ASSIGN_CARTONS',
        label: 'Assign Cartons',
        icon: 'inventory',
        color: 'primary',
        tooltip: 'Assign Hologram Cartons',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to assign cartons?'
      },
      'complete': {
        action: 'COMPLETE',
        label: 'Complete',
        icon: 'done_all',
        color: 'success',
        tooltip: 'Mark as Complete',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to mark this as complete?'
      },
      'submitpayslip': {
        action: 'SUBMITPAYSLIP',
        label: 'Submit Pay Slip',
        icon: 'receipt_long',
        color: 'primary',
        tooltip: 'Submit Payment Slip',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to submit the pay slip?'
      },
      'approvepayslip': {
        action: 'APPROVEPAYSLIP',
        label: 'Approve Pay Slip',
        icon: 'check_circle',
        color: 'accent',
        tooltip: 'Approve Payment Slip',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to approve the pay slip?'
      },
      'rejectpayslip': {
        action: 'REJECTPAYSLIP',
        label: 'Reject Pay Slip',
        icon: 'cancel',
        color: 'warn',
        tooltip: 'Reject Payment Slip',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to reject the pay slip?'
      }
    };

    const config = actionConfigs[actionKey] || {
      action: actionUpper,
      label: this.toTitleCase(actionUpper),
      icon: 'arrow_forward',
      color: 'primary',
      tooltip: `${this.toTitleCase(actionUpper)} Application`,
      requiresConfirmation: true,
      confirmationMessage: `Are you sure you want to ${String(rawAction).toLowerCase()} this application?`
    };
    config.transitionId = transition.id;
    config.toStageId = typeof transition.to_stage === 'number' ? transition.to_stage : transition.to_stage.id;
    return config;
  }

  private normalizeRole(role: string): string {
    if (!role) return '';
    const normalized = String(role).toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
    if (normalized === 'officer_in_charge' || normalized === 'oic' || normalized === 'officer') {
      return 'officer';
    }
    return normalized;
  }

  private normalizeActionKey(action: string): string {
    return String(action || '').toLowerCase().replace(/[\s-]/g, '');
  }

  private normalizeActionUpper(action: string): string {
    return String(action || '').toUpperCase().replace(/[\s-]/g, '');
  }

  private toTitleCase(value: string): string {
    if (!value) return '';
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }
}
