import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AccountService } from '../../../core/services/account.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { ActionConfigService } from '../../../core/services/action-config.service';
import { 
    USER_CONTEXTS, 
    UserContext, 
    WORKFLOW_ROLE_MAPPING,
    INVALID_STATUS_KEYWORDS
} from '../../constants/application.constants';
import Swal from 'sweetalert2';

export interface ActionItem {
  id?: number | string;
  referenceNo: string;
  status: string;
  workflowId?: number;
  currentStage?: number;
  allowedActions?: string[];
  allowedActionConfigs?: ActionButtonConfig[]; // Dynamic configs from backend
  [key: string]: any; // Allow additional properties
}

export interface ActionButtonConfig {
  action: string;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'warn' | 'accent';
  tooltip: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  transitionId?: number;
  toStageId?: number;
}

@Component({
  selector: 'app-unified-action-buttons',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="action-buttons-container">
      <!-- DETAILED VIEW MODE: Primary Action Buttons for all users -->
      <ng-container *ngIf="displayMode === 'detailed'">
        <ng-container *ngFor="let button of getPrimaryActionButtons()">
          <button 
            mat-raised-button 
            [color]="button.color"
            class="action-btn"
            (click)="onActionClick(button)">
            <mat-icon>{{ button.icon }}</mat-icon>
            {{ button.label }}
          </button>
        </ng-container>
      </ng-container>

      <!-- TABLE MODE: All buttons as icons OR DETAILED MODE: Secondary Action Buttons -->
      <ng-container *ngFor="let button of getDisplayButtons()">
        <button 
          mat-icon-button 
          [color]="button.color"
          [matTooltip]="button.tooltip"
          (click)="onActionClick(button)">
          <mat-icon>{{ button.icon }}</mat-icon>
        </button>
      </ng-container>

      <!-- Licensee: Payment button (Legacy fallback if not coming from backend) -->
      <button 
        *ngIf="isLegacyPaymentMode() && isLicensee() && canPay()"
        [attr.mat-raised-button]="displayMode === 'detailed' ? '' : null"
        [attr.mat-icon-button]="displayMode === 'table' ? '' : null"
        color="primary"
        [class.action-btn]="displayMode === 'detailed'"
        [matTooltip]="displayMode === 'table' ? 'Submit Payment' : ''"
        (click)="onAction('PAY')">
        <mat-icon>payment</mat-icon>
        <span *ngIf="displayMode === 'detailed'">Submit Payment</span>
      </button>

      <!-- Permit Slip button (Legacy fallback) -->
      <button 
        *ngIf="isLegacyPaymentMode() && canViewPermitSlip()"
        mat-icon-button 
        color="accent"
        matTooltip="View Permit Slip"
        (click)="onAction('VIEW_SLIP')">
        <mat-icon>description</mat-icon>
      </button>

      <!-- View Button - Only available in table mode and if not already in list -->
      <button 
        *ngIf="displayMode === 'table' && !hasViewAction()"
        mat-icon-button 
        color="primary"
        [matTooltip]="'View ' + getItemType()"
        (click)="onAction('VIEW')">
        <mat-icon>visibility</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .action-buttons-container {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
    }

    .action-btn {
      min-width: 120px;
      height: 40px;
      font-weight: 500;
      
      mat-icon {
        margin-right: 8px;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    button[mat-icon-button] {
      min-width: 40px;
      width: 40px;
      height: 40px;
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    /* Color overrides for better visibility */
    .mat-mdc-raised-button.mat-success {
      background-color: #28a745;
      color: white;
    }

    .mat-mdc-raised-button.mat-danger {
      background-color: #dc3545;
      color: white;
    }
  `]
})
export class UnifiedActionButtonsComponent implements OnInit {
  @Input() item!: ActionItem;
  @Input() itemType: 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram' = 'requisition';
  @Input() context: 'licensee' | 'permit-section' | 'commissioner' | 'itcell' | 'officer-in-charge' = 'licensee';
  @Input() displayMode: 'table' | 'detailed' = 'table';

  @Output() actionClicked = new EventEmitter<{ action: string, item: ActionItem }>();

  private currentUser: any;
  private availableActionConfigs: ActionButtonConfig[] = [];
  private isLoading = false;

  constructor(
    private accountService: AccountService,
    private workflowService: WorkflowService,
    private actionConfigService: ActionConfigService
  ) { }

  ngOnInit(): void {
    this.accountService.getAuthenticationState().subscribe(user => {
      this.currentUser = user;
    });

    // Load all button logic here
    this.loadAllActionConfigs();
  }

  /**
   * MAIN LOGIC: Load all action configurations based on workflow and context
   * This is where ALL button logic should be centralized
   */
  private loadAllActionConfigs(): void {
    if (this.isLoading) return;
    this.isLoading = true;

    console.log('🔧 UNIFIED BUTTONS: Loading action configs for item:', this.item);

    // Step 1: If item already has configs from parent, use them
    if (this.item.allowedActionConfigs && this.item.allowedActionConfigs.length > 0) {
      this.availableActionConfigs = this.item.allowedActionConfigs;
      this.isLoading = false;
      console.log('🔧 UNIFIED BUTTONS: Using pre-loaded configs from parent:', this.availableActionConfigs);
      return;
    }

    // Step 2: Load workflow actions if we have workflow info
    if (this.item.workflowId && this.item.currentStage) {
      this.loadWorkflowActions();
    } else {
      // Step 3: Load contextual actions only
      this.loadContextualActions();
    }
  }

  /**
   * Load workflow-based actions from backend
   */
  private loadWorkflowActions(): void {
    const userRole = this.getUserRoleForWorkflow();
    
    this.workflowService.getAvailableActionsForStage(
      this.item.workflowId!,
      this.item.currentStage!,
      userRole
    ).subscribe({
      next: (workflowActions: any[]) => {
        console.log('🔧 UNIFIED BUTTONS: Loaded workflow actions:', workflowActions);
        
        // Combine with contextual actions
        this.loadContextualActions(workflowActions);
      },
      error: (error) => {
        console.error('🔧 UNIFIED BUTTONS: Error loading workflow actions:', error);
        this.loadContextualActions();
      }
    });
  }

  /**
   * Load contextual actions (VIEW, PAY, PRINT, etc.)
   */
  private loadContextualActions(workflowActions: ActionButtonConfig[] = []): void {
    const contextualActionNames = this.getContextualActionNames();
    
    if (contextualActionNames.length === 0) {
      this.availableActionConfigs = workflowActions;
      this.isLoading = false;
      return;
    }

    this.actionConfigService.getActionConfigsForActions(contextualActionNames).subscribe({
      next: (contextualConfigs) => {
        console.log('🔧 UNIFIED BUTTONS: Loaded contextual actions:', contextualConfigs);
        
        // Combine workflow and contextual actions
        this.availableActionConfigs = [...workflowActions, ...contextualConfigs];
        this.isLoading = false;
        
        console.log('🔧 UNIFIED BUTTONS: Final available actions:', this.availableActionConfigs);
      },
      error: (error) => {
        console.error('🔧 UNIFIED BUTTONS: Error loading contextual actions:', error);
        this.availableActionConfigs = workflowActions;
        this.isLoading = false;
      }
    });
  }

  /**
   * Determine which contextual actions to show based on status and context
   */
  private getContextualActionNames(): string[] {
    const contextualActions: string[] = [];
    const status = this.item.status?.toUpperCase() || '';
    
    // Always show VIEW in table mode
    if (this.displayMode === 'table') {
      contextualActions.push('VIEW');
    }
    
    // Show PAY for licensee when payment is needed
    if (this.context === 'licensee' && this.shouldShowPaymentAction(status)) {
      contextualActions.push('PAY');
    }
    
    // REMOVED: PRINT action - no longer needed in action buttons
    // contextualActions.push('PRINT');
    
    // Show REQUEST_CANCELLATION for invalid status
    if (this.isInvalidStatus(status) && this.context === 'licensee') {
      contextualActions.push('REQUEST_CANCELLATION');
    }
    
    return contextualActions;
  }

  private shouldShowPaymentAction(status: string): boolean {
    return status.includes('APPROVED') || status.includes('PAYMENT_PENDING');
  }

  private isInvalidStatus(status: string): boolean {
    return INVALID_STATUS_KEYWORDS.some(keyword => status.includes(keyword));
  }

  private getUserRoleForWorkflow(): string {
    const contextMap: { [key: string]: UserContext } = {
      'licensee': USER_CONTEXTS.LICENSEE,
      'permit-section': USER_CONTEXTS.PERMIT_SECTION,
      'commissioner': USER_CONTEXTS.COMMISSIONER,
      'officer-in-charge': USER_CONTEXTS.OFFICER_IN_CHARGE,
      'itcell': USER_CONTEXTS.IT_CELL
    };
    
    const userContext = contextMap[this.context] || USER_CONTEXTS.LICENSEE;
    return WORKFLOW_ROLE_MAPPING[userContext] || 'licensee';
  }

  // Template helper methods - SIMPLIFIED
  isLegacyPaymentMode(): boolean {
    return false; // We handle everything dynamically now
  }

  hasViewAction(): boolean {
    return this.availableActionConfigs.some(config => config.action === 'VIEW');
  }

  getAvailableButtons(): ActionButtonConfig[] {
    return this.availableActionConfigs;
  }

  getDisplayButtons(): ActionButtonConfig[] {
    if (this.displayMode === 'detailed') {
      // In detailed mode, show secondary actions as icons (excluding PRINT)
      return this.getSecondaryActionButtons().filter(config => config.action !== 'PRINT');
    } else {
      // In table mode, show non-primary actions (excluding PRINT)
      const nonPrimaryActions = ['VIEW', 'DOWNLOAD', 'EDIT'];
      return this.availableActionConfigs.filter(config => 
        nonPrimaryActions.includes(config.action)
      );
    }
  }

  getPrimaryActionButtons(): ActionButtonConfig[] {
    const primaryActions = ['APPROVE', 'REJECT', 'REQUEST_CANCELLATION', 'PAY', 'SUBMIT'];
    return this.availableActionConfigs.filter(config => 
      primaryActions.includes(config.action)
    );
  }

  getSecondaryActionButtons(): ActionButtonConfig[] {
    const primaryActions = ['APPROVE', 'REJECT', 'REQUEST_CANCELLATION', 'PAY', 'SUBMIT'];
    return this.availableActionConfigs.filter(config => 
      !primaryActions.includes(config.action)
    );
  }

  /**
   * MAIN ACTION HANDLER - All button logic centralized here
   */
  onActionClick(button: ActionButtonConfig): void {
    console.log('🔧 UNIFIED BUTTONS: Action clicked:', button.action);

    // Handle confirmation if required
    if (button.requiresConfirmation) {
      this.showConfirmationDialog(button);
    } else {
      this.executeAction(button);
    }
  }

  private showConfirmationDialog(button: ActionButtonConfig): void {
    Swal.fire({
      title: `Confirm ${button.label}`,
      text: button.confirmationMessage || `Are you sure you want to ${button.label.toLowerCase()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Yes, ${button.label}`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: button.color === 'warn' ? '#dc3545' : '#28a745',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeAction(button);
      }
    });
  }

  /**
   * Execute the actual action - ALL ACTION LOGIC HERE
   */
  private executeAction(button: ActionButtonConfig): void {
    switch (button.action) {
      case 'APPROVE':
      case 'REJECT':
      case 'FORWARD':
      case 'VERIFY':
      case 'ISSUE':
      case 'COMPLETE':
      case 'ASSIGN_CARTONS':
        this.handleWorkflowAction(button);
        break;
        
      case 'PAY':
        this.handlePaymentAction();
        break;
        
      case 'REQUEST_CANCELLATION':
        this.handleCancellationRequest();
        break;
        
      case 'VIEW':
        this.handleViewAction();
        break;
        
      default:
        this.handleGenericAction(button);
    }
  }

  private handleWorkflowAction(button: ActionButtonConfig): void {
    console.log(`🔧 UNIFIED BUTTONS: Executing workflow action: ${button.action}`);
    
    // Call backend service to execute workflow action
    // For now, show success message
    Swal.fire({
      title: 'Action Completed',
      text: `${button.label} action has been executed successfully.`,
      icon: 'success',
      confirmButtonText: 'OK'
    }).then(() => {
      // Emit event to parent for any additional handling
      this.actionClicked.emit({ action: button.action, item: this.item });
    });
  }

  private handlePaymentAction(): void {
    Swal.fire({
      title: 'Confirm Payment',
      html: `
        <div class="payment-details">
          <p><strong>Application:</strong> ${this.item.referenceNo}</p>
          <p><strong>Amount:</strong> ₹${this.item['brAmount'] || 'N/A'}</p>
          <p><strong>Type:</strong> ${this.itemType}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Proceed to Payment',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Payment Successful!',
          text: 'Your payment has been processed successfully.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        this.actionClicked.emit({ action: 'PAY', item: this.item });
      }
    });
  }

  private handleCancellationRequest(): void {
    Swal.fire({
      title: 'Request Cancellation',
      text: 'Are you sure you want to request cancellation of this invalid/expired permit?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Request Cancellation',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Cancellation Requested',
          text: 'Your cancellation request has been submitted successfully.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        this.actionClicked.emit({ action: 'REQUEST_CANCELLATION', item: this.item });
      }
    });
  }

  private handleViewAction(): void {
    this.actionClicked.emit({ action: 'VIEW', item: this.item });
  }

  private handleGenericAction(button: ActionButtonConfig): void {
    console.log(`🔧 UNIFIED BUTTONS: Generic action: ${button.action}`);
    this.actionClicked.emit({ action: button.action, item: this.item });
  }

  onAction(action: string): void {
    // Legacy support - find the config and execute
    const config = this.availableActionConfigs.find(c => c.action === action);
    if (config) {
      this.onActionClick(config);
    } else {
      console.warn('🔧 UNIFIED BUTTONS: Action config not found for:', action);
      this.actionClicked.emit({ action, item: this.item });
    }
  }

  // Helper methods for role detection - SIMPLIFIED
  isLicensee(): boolean {
    return this.context === 'licensee';
  }

  isPermitSection(): boolean {
    return this.context === 'permit-section';
  }

  isCommissioner(): boolean {
    return this.context === 'commissioner';
  }

  isITCell(): boolean {
    return this.context === 'itcell';
  }

  isOfficerInCharge(): boolean {
    return this.context === 'officer-in-charge';
  }

  // Business logic methods - SIMPLIFIED
  canPay(): boolean {
    return false; // Handled by dynamic action loading
  }

  canViewPermitSlip(): boolean {
    return false; // Handled by dynamic action loading
  }

  getItemType(): string {
    const types: { [key: string]: string } = {
      'requisition': 'Requisition',
      'revalidation': 'Revalidation',
      'cancellation': 'Cancellation',
      'transit': 'Transit Permit',
      'hologram': 'Hologram Application'
    };
    return types[this.itemType] || 'Application';
  }
}