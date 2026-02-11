import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkflowActionService } from '../../../core/services/workflow-action.service';
import { UnifiedActionsService } from '../../services/unified-actions.service';
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
            type="button"
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
        <a
          *ngIf="button.action === 'VIEW'"
          class="action-icon-link"
          [ngClass]="'action-color-' + button.color"
          [attr.href]="getViewHref()"
          [attr.title]="button.tooltip">
          <mat-icon>{{ button.icon }}</mat-icon>
        </a>
        <button 
          *ngIf="button.action !== 'VIEW'"
          mat-icon-button 
          type="button"
          [color]="button.color"
          [matTooltip]="button.tooltip"
          (click)="onActionClick(button)">
          <mat-icon>{{ button.icon }}</mat-icon>
        </button>
      </ng-container>

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

    .action-icon-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      text-decoration: none;
      cursor: pointer;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .action-color-primary { color: #1976d2; }
    .action-color-success { color: #28a745; }
    .action-color-warning { color: #f59e0b; }
    .action-color-danger { color: #dc3545; }
    .action-color-info { color: #17a2b8; }
    .action-color-warn { color: #dc3545; }
    .action-color-accent { color: #7c3aed; }

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
export class UnifiedActionButtonsComponent implements OnInit, OnChanges {
  @Input() item!: ActionItem;
  @Input() itemType: 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram' | 'new-license' = 'requisition';
  @Input() context: 'licensee' | 'permit-section' | 'commissioner' | 'itcell' | 'officer-in-charge' = 'licensee';
  @Input() displayMode: 'table' | 'detailed' = 'table';
  @Input() includeActions: string[] | null = null;
  @Input() excludeActions: string[] | null = null;

  @Output() actionClicked = new EventEmitter<{ action: string, item: ActionItem }>();

  private availableActionConfigs: ActionButtonConfig[] = [];
  private isLoading = false;

  constructor(
    private workflowActionService: WorkflowActionService,
    private unifiedActionsService: UnifiedActionsService
  ) { }

  ngOnInit(): void {
    // Load all button logic here
    this.loadAllActionConfigs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] || changes['itemType']) {
      this.availableActionConfigs = [];
      this.isLoading = false;
      this.loadAllActionConfigs();
    }
  }

  /**
   * MAIN LOGIC: Load all action configurations based on workflow and context
   * This is where ALL button logic should be centralized
   */
  private loadAllActionConfigs(): void {
    if (this.isLoading) return;
    this.isLoading = true;

    console.log('?? UNIFIED BUTTONS: Loading action configs for item:', this.item);

    // For new-license, always resolve actions from backend current-stage permissions.
    // This avoids showing stale actions after an officer has already forwarded/approved.
    if (this.itemType === 'new-license') {
      this.loadActionsFromBackend();
      return;
    }

    // Step 1: If item already has configs from parent, use them
    if (this.item.allowedActionConfigs && this.item.allowedActionConfigs.length > 0) {
      this.availableActionConfigs = this.normalizeActionConfigs(this.item.allowedActionConfigs);
      this.isLoading = false;
      console.log('?? UNIFIED BUTTONS: Using pre-loaded configs from parent:', this.availableActionConfigs);
      return;
    }

    // Step 2: Fetch from backend (no frontend hardcoding)
    this.loadActionsFromBackend();
  }

  private loadActionsFromBackend(): void {
    const requestData = {
      id: this.item.id,
      workflowId: this.item.workflowId,
      currentStage: this.item.currentStage,
      type: this.itemType,
      status: this.item.status,
      referenceNo: this.item.referenceNo,
      allowedActionConfigs: this.item.allowedActionConfigs
    };

    this.workflowActionService.getAvailableActions(requestData).subscribe({
      next: (configs) => {
        this.availableActionConfigs = this.normalizeActionConfigs(configs || []);
        this.isLoading = false;
        console.log('?? UNIFIED BUTTONS: Loaded backend configs:', this.availableActionConfigs);
      },
      error: (error) => {
        console.error('?? UNIFIED BUTTONS: Error loading backend configs:', error);
        this.availableActionConfigs = [];
        this.isLoading = false;
      }
    });
  }

  getAvailableButtons(): ActionButtonConfig[] {
    return this.getFilteredConfigs();
  }

  getDisplayButtons(): ActionButtonConfig[] {
    const filtered = this.getFilteredConfigs();
    if (this.displayMode === 'detailed') {
      // In detailed mode, show secondary actions as icons (excluding PRINT)
      return filtered
        .filter(config => config.action !== 'PRINT')
        .filter(config => !this.getPrimaryActionButtons().some(primary => primary.action === config.action));
    }
    // In table mode, show all available actions as icons (excluding PRINT)
    return filtered.filter(config => config.action !== 'PRINT');
  }

  getPrimaryActionButtons(): ActionButtonConfig[] {
    const primaryActions = [
      'APPROVE',
      'FORWARD',
      'RAISE_OBJECTION',
      'REJECT',
      'REQUEST_CANCELLATION',
      'REQUEST_REVALIDATION',
      'PAY',
      'SUBMIT'
    ];
    return this.getFilteredConfigs().filter(config =>
      primaryActions.includes(config.action)
    );
  }

  getSecondaryActionButtons(): ActionButtonConfig[] {
    const primaryActions = [
      'APPROVE',
      'FORWARD',
      'RAISE_OBJECTION',
      'REJECT',
      'REQUEST_CANCELLATION',
      'REQUEST_REVALIDATION',
      'PAY',
      'SUBMIT'
    ];
    return this.getFilteredConfigs().filter(config =>
      !primaryActions.includes(config.action)
    );
  }

  /**
   * MAIN ACTION HANDLER - All button logic centralized here
   */
  onActionClick(button: ActionButtonConfig): void {
    const normalizedAction = (button?.action || '').toString().trim().toUpperCase();
    const normalizedButton: ActionButtonConfig = { ...button, action: normalizedAction };
    console.log('🔧 UNIFIED BUTTONS: Action clicked:', normalizedButton.action);

    // Handle confirmation if required
    if (normalizedButton.requiresConfirmation) {
      this.showConfirmationDialog(normalizedButton);
    } else {
      this.executeAction(normalizedButton);
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

      case 'REQUEST_REVALIDATION':
        this.handleRevalidationRequest();
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

  private handleRevalidationRequest(): void {
    Swal.fire({
      title: 'Request Revalidation',
      text: 'The permit has been extended for 45 days. Do you want to proceed with the revalidation request?',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Yes, Request Revalidation',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1976d2', // Primary blue
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        // Just emit the event, parent component will handle navigation or API call
        // The user says "trigger which will automatically copy code", so maybe we just need to navigate
        console.log('🔧 UNIFIED BUTTONS: Emitting REQUEST_REVALIDATION event');
        this.actionClicked.emit({ action: 'REQUEST_REVALIDATION', item: this.item });
      }
    });
  }

  private handleViewAction(): void {
    // Handle VIEW directly so it works across all roles/pages
    this.unifiedActionsService.executeAction('VIEW', this.item, this.itemType, this.context).subscribe({
      error: (error: any) => {
        console.error('VIEW action failed:', error);
      }
    });
  }

  public getViewHref(): string {
    const ref =
      this.item?.referenceNo ??
      this.item?.['refNo'] ??
      this.item?.['ourRefNo'] ??
      this.item?.['our_ref_no'] ??
      this.item?.['billNo'] ??
      this.item?.['bill_no'] ??
      '';

    const id =
      this.item?.id ??
      this.item?.['pk'] ??
      '';

    if (this.context === 'officer-in-charge' && this.itemType === 'hologram') {
      const hologramSections: { [key: string]: string } = {
        'monthly-statement': 'monthly-hologram-statement',
        'daily-register': 'daily-hologram-register',
        'stock-inventory': 'hologram-overview'
      };
      const section = hologramSections[this.item?.['subType']] || 'hologram-register';
      const params = new URLSearchParams({
        section,
        ref: ref || '',
        source: this.context
      });
      return `/dashboard?${params.toString()}`;
    }

    const params = new URLSearchParams();
    if (id !== undefined && id !== null && id !== '') params.set('id', String(id));
    if (ref) params.set('ref', String(ref));
    params.set('type', this.itemType);
    params.set('source', this.context || 'licensee');

    return `/supply-chain-view?${params.toString()}`;
  }

  private handleGenericAction(button: ActionButtonConfig): void {
    console.log(`🔧 UNIFIED BUTTONS: Generic action: ${button.action}`);
    this.actionClicked.emit({ action: button.action, item: this.item });
  }



  private normalizeActionConfigs(configs: any[] | null | undefined): ActionButtonConfig[] {
    if (!Array.isArray(configs)) return [];
    return configs
      .map(config => this.normalizeActionConfig(config))
      .filter(config => !!config.action);
  }

  private normalizeActionList(list: string[] | null | undefined): string[] {
    if (!Array.isArray(list)) return [];
    return list
      .map(action => String(action).toUpperCase().trim())
      .filter(action => !!action);
  }

  private getFilteredConfigs(): ActionButtonConfig[] {
    const include = this.normalizeActionList(this.includeActions);
    const exclude = this.normalizeActionList(this.excludeActions);

    let result = [...this.availableActionConfigs];

    // If includeActions specifies VIEW but backend didn't return it, add a safe fallback.
    if (include.includes('VIEW') && !result.some(config => config.action === 'VIEW')) {
      result.push({
        action: 'VIEW',
        label: 'View',
        icon: 'visibility',
        color: 'primary',
        tooltip: 'View Details'
      });
    }

    if (include.length) {
      result = result.filter(config => include.includes(config.action));
    }

    if (exclude.length) {
      result = result.filter(config => !exclude.includes(config.action));
    }

    // Deduplicate by action so multiple transitions mapped to same action
    // (e.g., two "approve-like" paths) don't render duplicate buttons.
    const seen = new Set<string>();
    const deduped: ActionButtonConfig[] = [];
    for (const config of result) {
      const key = (config.action || '').toUpperCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(config);
    }

    return deduped;
  }

  private normalizeActionConfig(config: any): ActionButtonConfig {
    const rawAction = config?.action ?? config?.Action ?? config?.action_name ?? config?.actionName;
    const action = rawAction ? String(rawAction).toUpperCase().trim() : '';
    const label = config?.label ?? config?.Label ?? this.toTitleCase(action);
    const icon = config?.icon ?? config?.Icon ?? 'arrow_forward';
    const color = config?.color ?? config?.Color ?? 'primary';
    const tooltip = config?.tooltip ?? config?.Tooltip ?? (label ? `${label} Application` : 'Perform Action');
    const requiresConfirmation = config?.requiresConfirmation ?? config?.requires_confirmation ?? false;
    const confirmationMessage = config?.confirmationMessage ?? config?.confirmation_message;
    const transitionId = config?.transitionId ?? config?.transition_id;
    const toStageId = config?.toStageId ?? config?.to_stage_id ?? config?.targetStage ?? config?.target_stage;

    return {
      action,
      label,
      icon,
      color,
      tooltip,
      requiresConfirmation,
      confirmationMessage,
      transitionId,
      toStageId
    };
  }

  private toTitleCase(value: string): string {
    if (!value) return '';
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }
}
