import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ActionButtonConfig {
    action: string;
    label: string;
    icon: string;
    color: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'warn';
    tooltip: string;
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
    targetStage?: number;
    transitionId?: number;
    toStageId?: number;
}

export interface ActionConfigResponse {
    success: boolean;
    data: ActionButtonConfig[];
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ActionConfigService {
    private apiUrl = `${environment.apiBaseUrl}/auth/workflow`;

    constructor(private http: HttpClient) {}


    // Get all action configurations from backend workflow system
    getActionConfigurations(): Observable<{ [key: string]: ActionButtonConfig }> {
        return this.http.get<ActionConfigResponse>(`${this.apiUrl}/action-configs/`).pipe(
            map(response => {
                if (response.success && response.data) {
                    // Convert array to map for easy lookup
                    const configMap: { [key: string]: ActionButtonConfig } = {};
                    response.data.forEach(config => {
                        configMap[config.action] = config;
                    });
                    return configMap;
                }
                return this.getFallbackActionConfigs();
            }),
            catchError(error => {
                return of(this.getFallbackActionConfigs());
            })
        );
    }


    //  Get specific action configurations for given actions
    getActionConfigsForActions(actions: string[]): Observable<ActionButtonConfig[]> {
        return this.getActionConfigurations().pipe(
            map(configMap => {
                const configs = actions
                    .map(action => configMap[action])
                    .filter(config => config !== undefined);
                return configs;
            })
        );
    }

 
    // Get contextual action configurations (non-workflow actions like VIEW, PAY, PRINT)
    getContextualActionConfigs(): Observable<{ [key: string]: ActionButtonConfig }> {
        return this.http.get<ActionConfigResponse>(`${this.apiUrl}/contextual-action-configs/`).pipe(
            map(response => {
                if (response.success && response.data) {
                    const configMap: { [key: string]: ActionButtonConfig } = {};
                    response.data.forEach(config => {
                        configMap[config.action] = config;
                    });
                    return configMap;
                }
                return this.getFallbackContextualConfigs();
            }),
            catchError(error => {
                return of(this.getFallbackContextualConfigs());
            })
        );
    }

    
    // Get workflow action configurations (APPROVE, REJECT, etc.)
    getWorkflowActionConfigs(): Observable<{ [key: string]: ActionButtonConfig }> {
        return this.http.get<ActionConfigResponse>(`${this.apiUrl}/workflow-action-configs/`).pipe(
            map(response => {
                if (response.success && response.data) {
                    const configMap: { [key: string]: ActionButtonConfig } = {};
                    response.data.forEach(config => {
                        configMap[config.action] = config;
                    });
                    return configMap;
                }
                return this.getFallbackWorkflowConfigs();
            }),
            catchError(error => {
                return of(this.getFallbackWorkflowConfigs());
            })
        );
    }

    // Comprehensive fallback action configurations if backend is unavailable
    private getFallbackActionConfigs(): { [key: string]: ActionButtonConfig } {
        return {
            // Merge workflow and contextual configs
            ...this.getFallbackWorkflowConfigs(),
            ...this.getFallbackContextualConfigs()
        };
    }

    // Fallback workflow action configurations (should come from backend workflow system)
    private getFallbackWorkflowConfigs(): { [key: string]: ActionButtonConfig } {
        return {
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
                tooltip: 'Forward to Next Level', 
                requiresConfirmation: true, 
                confirmationMessage: 'Are you sure you want to forward this application?' 
            },
            'VERIFY': { 
                action: 'VERIFY', 
                label: 'Verify', 
                icon: 'verified', 
                color: 'primary', 
                tooltip: 'Verify Application',
                requiresConfirmation: true,
                confirmationMessage: 'Are you sure you want to verify this application?'
            },
            'ISSUE': { 
                action: 'ISSUE', 
                label: 'Issue', 
                icon: 'assignment_turned_in', 
                color: 'accent', 
                tooltip: 'Issue Permit/Certificate', 
                requiresConfirmation: true, 
                confirmationMessage: 'Are you sure you want to issue this permit?' 
            },
            'COMPLETE': { 
                action: 'COMPLETE', 
                label: 'Complete', 
                icon: 'done_all', 
                color: 'accent', 
                tooltip: 'Mark as Complete',
                requiresConfirmation: true,
                confirmationMessage: 'Are you sure you want to mark this as complete?'
            },
            'ASSIGN_CARTONS': { 
                action: 'ASSIGN_CARTONS', 
                label: 'Assign Cartons', 
                icon: 'inventory', 
                color: 'primary', 
                tooltip: 'Assign Hologram Cartons',
                requiresConfirmation: true,
                confirmationMessage: 'Are you sure you want to assign cartons?'
            },
            'EXTEND': { 
                action: 'EXTEND', 
                label: 'Extend', 
                icon: 'schedule', 
                color: 'warning', 
                tooltip: 'Extend Validity',
                requiresConfirmation: true,
                confirmationMessage: 'Are you sure you want to extend the validity?'
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
            'SUBMITPAYSLIP': { 
                action: 'SUBMITPAYSLIP', 
                label: 'Submit Pay Slip', 
                icon: 'receipt_long', 
                color: 'primary', 
                tooltip: 'Submit Payment Slip' 
            },
            'APPROVEPAYSLIP': { 
                action: 'APPROVEPAYSLIP', 
                label: 'Approve Pay Slip', 
                icon: 'check_circle', 
                color: 'accent', 
                tooltip: 'Approve Payment Slip' 
            },
            'REJECTPAYSLIP': { 
                action: 'REJECTPAYSLIP', 
                label: 'Reject Pay Slip', 
                icon: 'cancel', 
                color: 'warn', 
                tooltip: 'Reject Payment Slip' 
            }
        };
    }

    // Fallback contextual action configurations (non-workflow actions)
    private getFallbackContextualConfigs(): { [key: string]: ActionButtonConfig } {
        return {
            'VIEW': { 
                action: 'VIEW', 
                label: 'View', 
                icon: 'visibility', 
                color: 'primary', 
                tooltip: 'View Details' 
            },
            'PAY': { 
                action: 'PAY', 
                label: 'Pay Now', 
                icon: 'payment', 
                color: 'accent', 
                tooltip: 'Make Payment for Application' 
            },
            'DOWNLOAD': { 
                action: 'DOWNLOAD', 
                label: 'Download', 
                icon: 'download', 
                color: 'info', 
                tooltip: 'Download Document' 
            },
            'EDIT': { 
                action: 'EDIT', 
                label: 'Edit', 
                icon: 'edit', 
                color: 'primary', 
                tooltip: 'Edit Details' 
            },
            'REQUEST_CANCELLATION': { 
                action: 'REQUEST_CANCELLATION', 
                label: 'Request Cancellation', 
                icon: 'cancel', 
                color: 'warn', 
                tooltip: 'Request Cancellation of Invalid/Expired Permit', 
                requiresConfirmation: true, 
                confirmationMessage: 'Are you sure you want to request cancellation? This action cannot be undone.' 
            }
        };
    }
}