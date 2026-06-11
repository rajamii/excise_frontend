import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkflowActionService } from '../../../core/services/workflow-action.service';
import { UnifiedActionsService } from '../../services/unified-actions.service';
import { ApplicationType } from '../../constants/application.constants';
import { PaymentIntegrationService } from '../../../core/services/payment-integration.service';
import { AccountService } from '../../../core/services/account.service';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';

export interface ActionItem {
  id?: number | string;
  referenceNo: string;
  status: string;
  workflowId?: number;
  currentStage?: number;
  allowedActions?: string[];
  allowedActionConfigs?: ActionButtonConfig[]; // Dynamic configs from backend
  refNo?: string;
  billNo?: string;
  transitProducts?: any[];
  cases?: number;
  quantity?: number;
  exciseDuty?: number;
  total_excise_duty?: number;
  totalExciseDuty?: number;
  additionalExcise?: number;
  total_additional_excise?: number;
  totalAdditionalExcise?: number;
  educationCess?: number;
  total_education_cess?: number;
  totalEducationCess?: number;
  brAmount?: number;
  totalAmount?: number;
  total_amount?: number;
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
    <div class="action-buttons-container" [class.table-mode]="displayMode === 'table'">
      <!-- DETAILED VIEW MODE: Primary Action Buttons for all users -->
      <ng-container *ngIf="displayMode === 'detailed'">
        <ng-container *ngFor="let button of getPrimaryActionButtons()">
          <button 
            mat-raised-button 
            type="button"
            [color]="button.color"
            class="action-btn"
            (click)="onActionClick(button)"
            (mousedown)="onActionClick(button)">
            <mat-icon>{{ button.icon }}</mat-icon>
            {{ button.label }}
          </button>
        </ng-container>
      </ng-container>

      <!-- TABLE MODE: All buttons as icons OR DETAILED MODE: Secondary Action Buttons -->
      <ng-container *ngFor="let button of getDisplayButtons()">
        <button
          mat-icon-button
          type="button"
          [matTooltip]="button.tooltip || getButtonTooltip(button)"
          [attr.title]="button.tooltip || getButtonTooltip(button)"
          [attr.data-action]="button.action"
          [attr.data-variant]="getButtonVariant(button)"
          [color]="button.color"
          (click)="onActionButtonClick(button, $event)"
          (mousedown)="onActionButtonClick(button, $event)">
          <mat-icon>{{ button.icon }}</mat-icon>
        </button>
      </ng-container>

    </div>
  `,
  styles: [`
    .action-buttons-container {
      display: flex;
      flex-direction: row;
      gap: 12px;
      align-items: center;
      justify-content: center;
      flex-wrap: nowrap;
      position: relative;
      z-index: 10;
      min-height: 40px;
    }

    .action-buttons-container.table-mode {
      gap: 10px;
      flex-wrap: nowrap;
    }

    .action-btn {
      min-width: 120px;
      height: 40px;
      font-weight: 600;
      pointer-events: auto !important;
      cursor: pointer !important;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      }
      
      mat-icon {
        margin-right: 8px;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    /* Color overrides for raised buttons */
    .mat-mdc-raised-button.mat-success {
      background-color: #388e3c;
      color: white;
    }

    .mat-mdc-raised-button.mat-danger {
      background-color: #d32f2f;
      color: white;
    }
  `]
})
export class UnifiedActionButtonsComponent implements OnInit, OnChanges {
  @Input() item!: ActionItem;
  @Input() itemType: ApplicationType = 'requisition';
  @Input() context: 'licensee' | 'permit-section' | 'commissioner' | 'itcell' | 'officer-in-charge' = 'licensee';
  @Input() displayMode: 'table' | 'detailed' = 'table';
  @Input() includeActions: string[] | null = null;
  @Input() excludeActions: string[] | null = null;

  @Output() actionClicked = new EventEmitter<{ action: string, item: ActionItem }>();

  private availableActionConfigs: ActionButtonConfig[] = [];
  private isLoading = false;

  constructor(
    private workflowActionService: WorkflowActionService,
    private unifiedActionsService: UnifiedActionsService,
    private router: Router,
    private paymentIntegrationService: PaymentIntegrationService,
    private accountService: AccountService
  ) { }

  private isCurrentUserLicensee(): boolean {
    const roleFromIdentity = String(this.accountService.getUserProfileSync()?.role?.name ?? '').trim().toLowerCase();
    if (roleFromIdentity) return roleFromIdentity === 'licensee';
    const roleFromStorage = String(localStorage.getItem('role') ?? '').trim().toLowerCase();
    if (roleFromStorage) return roleFromStorage === 'licensee';

    // Fallback: some flows only persist `role_id` early (or `role` may be missing until `/me` resolves).
    const roleId = String(localStorage.getItem('role_id') ?? '').trim();
    if (roleId) return roleId === '2';

    // Last-resort: decode JWT payload (if present) and infer role.
    try {
      const access = String(localStorage.getItem('access') ?? '').trim();
      if (!access || !access.includes('.')) return false;
      const payload = JSON.parse(atob(access.split('.')[1] ?? ''));
      const jwtRole = String(payload?.role ?? payload?.role_name ?? payload?.roleName ?? '').trim().toLowerCase();
      if (jwtRole) return jwtRole === 'licensee';
      const jwtRoleId = String(payload?.role_id ?? payload?.roleId ?? payload?.roleid ?? '').trim();
      if (jwtRoleId) return jwtRoleId === '2';
    } catch {
      // ignore
    }

    return false;
  }

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
    return this.ensureAdminNewLicenseDetailsButton(this.getFilteredConfigs());
  }

  getDisplayButtons(): ActionButtonConfig[] {
    const filtered = this.ensureAdminNewLicenseDetailsButton(this.getFilteredConfigs());
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
      'VIEW_REMARK',
      'REQUEST_CANCELLATION',
      'UPDATE_ARRIVAL',
      'REQUEST_REVALIDATION',
      'PAY',
      'MAKE_PAYMENT',
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
      'VIEW_REMARK',
      'REQUEST_CANCELLATION',
      'UPDATE_ARRIVAL',
      'REQUEST_REVALIDATION',
      'PAY',
      'SUBMIT'
    ];
    return this.getFilteredConfigs().filter(config =>
      !primaryActions.includes(config.action)
    );
  }

  private ensureAdminNewLicenseDetailsButton(configs: ActionButtonConfig[]): ActionButtonConfig[] {
    const exclude = this.normalizeActionList(this.excludeActions);
    if (
      this.itemType === 'new-license' &&
      this.context !== 'licensee' &&
      !exclude.includes('VIEW') &&
      !configs.some(config => this.normalizeActionName(config.action) === 'VIEW')
    ) {
      return [
        ...configs,
        {
          action: 'VIEW',
          label: 'Details',
          icon: 'visibility',
          color: 'primary',
          tooltip: 'View Details'
        }
      ];
    }
    return configs;
  }

  /**
   * MAIN ACTION HANDLER - All button logic centralized here
   */
  onActionClick(button: ActionButtonConfig): void {
    const normalizedAction = this.normalizeActionName(button?.action);
    const normalizedButton: ActionButtonConfig = { ...button, action: normalizedAction };

    if (this.shouldRequireNewLicenseUploadsDeclaration(normalizedAction)) {
      this.showNewLicenseUploadsDeclaration(normalizedButton).then((ok) => {
        if (ok) this.continueActionAfterDeclaration(normalizedButton);
      });
      return;
    }

    this.continueActionAfterDeclaration(normalizedButton);
  }

  private continueActionAfterDeclaration(button: ActionButtonConfig): void {
    if (this.shouldBypassDetailedNewLicenseApproveConfirmation(button)) {
      this.executeAction(button);
      return;
    }

    if (button.requiresConfirmation) {
      this.showConfirmationDialog(button);
    } else {
      this.executeAction(button);
    }
  }

  private shouldBypassDetailedNewLicenseApproveConfirmation(button: ActionButtonConfig): boolean {
    return this.displayMode === 'detailed' &&
      this.itemType === 'new-license' &&
      this.context !== 'licensee' &&
      this.normalizeActionName(button?.action) === 'APPROVE';
  }

  private shouldRequireNewLicenseUploadsDeclaration(action: string): boolean {
    const token = this.normalizeActionName(action);
    const isWorkflowDecision = token === 'APPROVE' || token === 'REJECT' || token === 'RAISE_OBJECTION';
    const isAdminContext = this.context !== 'licensee';
    return this.itemType === 'new-license' && isAdminContext && isWorkflowDecision;
  }

  private showNewLicenseUploadsDeclaration(button: ActionButtonConfig): Promise<boolean> {
    const label = String(button?.label || button?.action || 'Proceed').trim();
    const action = this.normalizeActionName(button?.action);

    const confirmationText =
      button?.confirmationMessage ||
      (action === 'APPROVE'
        ? 'Please confirm you have verified all the details and uploaded documents.'
        : action === 'REJECT'
          ? 'Please confirm you have verified all the details and uploaded documents before rejecting.'
          : 'Please confirm you have verified all the details and uploaded documents before raising an objection.');

    return Swal.fire({
      title: 'Declaration',
      html: `
        <div style="text-align:left;">
          <div style="margin-bottom: 10px; color: #374151; font-size: 14px;">
            ${this.escapeHtml(confirmationText)}
          </div>
          <div style="display:flex; align-items:flex-start; gap:10px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f9fafb;">
            <input type="checkbox" id="uploadsDeclaration" style="margin-top: 2px;" />
            <label for="uploadsDeclaration" style="margin: 0; cursor: pointer; color: #111827; font-size: 14px; line-height: 1.35;">
              I declare that I have checked all uploaded documents and they are correct.
            </label>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Proceed (${label})`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: action === 'REJECT' ? '#dc3545' : '#2563eb',
      cancelButtonColor: '#6c757d',
      focusConfirm: false,
      didOpen: () => {
        const confirmBtn = Swal.getConfirmButton();
        if (confirmBtn) confirmBtn.disabled = true;

        const checkbox = document.getElementById('uploadsDeclaration') as HTMLInputElement | null;
        if (!checkbox) return;
        checkbox.addEventListener('change', () => {
          const isChecked = !!checkbox.checked;
          const btn = Swal.getConfirmButton();
          if (btn) btn.disabled = !isChecked;
        });
      },
      preConfirm: () => {
        const checkbox = document.getElementById('uploadsDeclaration') as HTMLInputElement | null;
        if (!checkbox?.checked) {
          Swal.showValidationMessage('Please accept the declaration to continue.');
          return false as any;
        }
        return true;
      }
    }).then((result) => !!result.isConfirmed);
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
        if (this.shouldShowTransitOicRejectDeclaration(button)) {
          this.showTransitOicRejectDeclaration(button);
          return;
        }
        this.executeAction(button);
      }
    });
  }

    private shouldShowTransitOicRejectDeclaration(button: ActionButtonConfig): boolean {
    const action = this.normalizeActionName(button?.action);
    return action === 'REJECT' && this.itemType === 'transit' && this.context === 'officer-in-charge';
  }

  private showTransitOicRejectDeclaration(button: ActionButtonConfig): void {
    const summary = this.getTransitRejectSummary();
    const currency = this.formatInr(summary.totalRefund);
    const excise = this.formatInr(summary.exciseRefund);
    const education = this.formatInr(summary.educationRefund);
    const refNo = this.escapeHtml(String(this.item?.referenceNo || this.item?.['refNo'] || this.item?.['billNo'] || 'N/A'));

    Swal.fire({
        html: `
            <div style="padding: 16px;">
                <!-- Header -->
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="bi bi-exclamation-triangle-fill" style="font-size: 24px; color: white;"></i>
                    </div>
                    <div style="flex: 1;">
                        <h2 style="margin: 0 0 4px 0; color: #1f2937; font-size: 20px; font-weight: 700;">Declaration Before Rejection</h2>
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Ref: ${refNo} • Please review consequences</p>
                    </div>
                </div>
                
                <!-- Warning Bar -->
                <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="bi bi-info-circle-fill" style="font-size: 16px; color: #dc2626; flex-shrink: 0;"></i>
                        <span style="font-size: 13px; color: #991b1b; font-weight: 600;">This action cannot be undone and will trigger automatic reversals.</span>
                    </div>
                </div>
                
                <!-- Impact Summary -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <!-- Stock Impact -->
                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <i class="bi bi-box-seam" style="font-size: 16px; color: #0ea5e9;"></i>
                            <span style="font-size: 12px; color: #0369a1; font-weight: 600;">Stock Impact</span>
                        </div>
                        <div style="font-size: 16px; color: #0c4a6e; font-weight: 700;">${summary.totalCases} cases</div>
                        <div style="font-size: 11px; color: #075985;">will be reverted</div>
                    </div>
                    
                    <!-- Refund Amount -->
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <i class="bi bi-wallet2" style="font-size: 16px; color: #10b981;"></i>
                            <span style="font-size: 12px; color: #047857; font-weight: 600;">Total Refund</span>
                        </div>
                        <div style="font-size: 16px; color: #064e3b; font-weight: 700;">₹${currency}</div>
                        <div style="font-size: 11px; color: #047857;">to wallet</div>
                    </div>
                </div>
                
                <!-- Breakdown -->
                <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-size: 12px; color: #374151; font-weight: 600; margin-bottom: 8px;">Refund Breakdown:</div>
                    <div style="display: flex; gap: 16px; align-items: center;">
                        <span style="font-size: 12px; color: #6b7280;">Excise: <strong>₹${excise}</strong></span>
                        <span style="font-size: 12px; color: #6b7280;">Education: <strong>₹${education}</strong></span>
                        <span style="font-size: 13px; color: #10b981; font-weight: 700;">Total: <strong>₹${currency}</strong></span>
                    </div>
                </div>
                
                <!-- Reason and Action -->
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start;">
                    <div>
                        <label for="rejectReasonInput" style="display: block; font-size: 13px; color: #374151; font-weight: 600; margin-bottom: 6px;">
                            <i class="bi bi-chat-left-text me-1"></i>Reason (Optional)
                        </label>
                        <textarea
                            id="rejectReasonInput"
                            class="swal2-textarea"
                            style="display: block; width: 100%; height: 60px; margin: 0; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; font-size: 13px; resize: vertical;"
                            placeholder="Enter reason for rejection..."
                        ></textarea>
                    </div>
                    
                    <div style="text-align: right;">
                        <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; padding: 8px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; margin-bottom: 8px;">
                            <input id="rejectAcknowledgeCheckbox" type="checkbox" style="margin-top: 2px; width: 14px; height: 14px;" />
                            <span style="font-size: 12px; color: #92400e; font-weight: 600;">I understand the consequences</span>
                        </label>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: '<i class="bi bi-check-circle me-2"></i>Proceed With Rejection',
        cancelButtonText: '<i class="bi bi-x-circle me-2"></i>Cancel',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        focusConfirm: false,
        showCloseButton: true,
        allowEscapeKey: true,
        allowOutsideClick: true,
        width: '700px',
        padding: '0',
        showClass: {
            popup: 'swal2-noanimation',
            backdrop: 'swal2-noanimation'
        },
        hideClass: {
            popup: 'swal2-noanimation',
            backdrop: 'swal2-noanimation'
        },
        didOpen: () => {
          const hardClose = () => {
            Swal.close();
            // Defensive cleanup: if any overlay/body classes remain, they can block the UI.
            try {
              document.body.classList.remove('swal2-shown', 'swal2-height-auto');
              document.documentElement.classList.remove('swal2-shown');
              document.querySelectorAll('.swal2-container').forEach(el => el.remove());
            } catch {
              // ignore
            }
          };

          const actions = Swal.getActions();
          if (actions) {
            (actions as HTMLElement).style.pointerEvents = 'auto';
          }

          // Ensure Cancel always closes (some pages/styles interfere with click events).
          const cancelButton = Swal.getCancelButton();
          if (cancelButton) {
            cancelButton.disabled = false;
            cancelButton.style.pointerEvents = 'auto';
            cancelButton.style.cursor = 'pointer';
            cancelButton.addEventListener('pointerdown', hardClose, { once: true });
            cancelButton.addEventListener('mousedown', hardClose, { once: true });
            cancelButton.addEventListener('touchstart', hardClose, { once: true });
            cancelButton.addEventListener('click', hardClose, { once: true });
          }

          const closeButton = Swal.getCloseButton();
          if (closeButton) {
            closeButton.style.pointerEvents = 'auto';
            closeButton.style.cursor = 'pointer';
            closeButton.addEventListener('pointerdown', hardClose, { once: true });
            closeButton.addEventListener('click', hardClose, { once: true });
          }
        },
        didClose: () => {
          // Defensive cleanup (covers cancel/outside/escape/close button).
          try {
            document.body.classList.remove('swal2-shown', 'swal2-height-auto');
            document.documentElement.classList.remove('swal2-shown');
            document.querySelectorAll('.swal2-container').forEach(el => el.remove());
          } catch {
            // ignore
          }
        },
        preConfirm: () => {
            const popup = Swal.getPopup();
            const checkbox = popup?.querySelector('#rejectAcknowledgeCheckbox') as HTMLInputElement | null;
            const reasonInput = popup?.querySelector('#rejectReasonInput') as HTMLTextAreaElement | null;

            if (!checkbox?.checked) {
                Swal.showValidationMessage('Please acknowledge the declaration to proceed with rejection.');
                return false;
            }

            return {
                reason: String(reasonInput?.value || '').trim()
            };
        }
    }).then((declarationResult) => {
        if (declarationResult.isConfirmed) {
            const reason = String((declarationResult.value as any)?.reason || '').trim();
            
            // Show loading state
            Swal.fire({
                title: 'Processing Rejection...',
                text: 'Please wait while we process your rejection request.',
                icon: 'info',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // Add the rejection reason to the item
            this.item = {
                ...this.item,
                __rejectReason: reason
            };
            
            console.log('🔧 UNIFIED BUTTONS: Proceeding with rejection, reason:', reason);
            
            // Execute the action with a timeout to ensure loading shows
            setTimeout(() => {
                try {
                    this.executeAction(button);
                    console.log('🔧 UNIFIED BUTTONS: Rejection action executed successfully');
                    // Close loading after a short delay to allow parent to handle
                    setTimeout(() => {
                        Swal.close();
                    }, 1000);
                } catch (error) {
                    console.error('🔧 UNIFIED BUTTONS: Error executing rejection action:', error);
                    Swal.fire({
                        title: 'Error',
                        text: 'An error occurred while processing the rejection. Please try again.',
                        icon: 'error',
                        confirmButtonText: 'OK'
                    });
                }
            }, 500);
        }
    }).catch((error) => {
        console.error('🔧 UNIFIED BUTTONS: Rejection dialog error:', error);
        Swal.fire({
            title: 'Error',
            text: 'An error occurred with the rejection dialog. Please try again.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    });
}

private getTransitRejectSummary(): {
    totalCases: number;
    exciseRefund: number;
    educationRefund: number;
    totalRefund: number;
  } {
    const products = this.getTransitProductsForSummary();
    let totalCases = 0;
    let exciseRefund = 0;
    let educationRefund = 0;

    products.forEach((row: any) => {
      totalCases += this.toNumber(row?.cases ?? row?.quantity);
      const rowExcise = this.toNumber(row?.exciseDuty ?? row?.total_excise_duty ?? row?.totalExciseDuty);
      const rowAdditional = this.toNumber(row?.additionalExcise ?? row?.total_additional_excise ?? row?.totalAdditionalExcise);
      const rowEducation = this.toNumber(row?.educationCess ?? row?.total_education_cess ?? row?.totalEducationCess);
      exciseRefund += (rowExcise + rowAdditional);
      educationRefund += rowEducation;
    });

    if (products.length === 0) {
      totalCases = this.toNumber(this.item?.cases ?? this.item?.quantity);
      const fallbackExcise = this.toNumber(this.item?.exciseDuty ?? this.item?.total_excise_duty ?? this.item?.totalExciseDuty);
      const fallbackAdditional = this.toNumber(this.item?.additionalExcise ?? this.item?.total_additional_excise ?? this.item?.totalAdditionalExcise);
      const fallbackEducation = this.toNumber(this.item?.educationCess ?? this.item?.total_education_cess ?? this.item?.totalEducationCess);
      exciseRefund = fallbackExcise + fallbackAdditional;
      educationRefund = fallbackEducation;
    }

    const fallbackTotal = this.toNumber(this.item?.brAmount ?? this.item?.totalAmount ?? this.item?.total_amount);
    const calculatedTotal = exciseRefund + educationRefund;
    const totalRefund = calculatedTotal > 0 ? calculatedTotal : fallbackTotal;

    return {
      totalCases,
      exciseRefund,
      educationRefund,
      totalRefund
    };
  }

  private getTransitProductsForSummary(): any[] {
    const products = this.item?.transitProducts;
    if (Array.isArray(products)) {
      return products;
    }
    return [];
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatInr(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.toNumber(value));
  }

  private toBool(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const text = String(value ?? '').trim().toLowerCase();
    return text === 'true' || text === 'yes' || text === '1';
  }

  private async getPaymentModuleFee(moduleCode: string, fallback: number): Promise<number> {
    try {
      const res: any = await firstValueFrom(this.paymentIntegrationService.getPaymentModule(String(moduleCode)));
      const fee = this.toNumber(res?.license_fee ?? res?.licenseFee ?? res?.licenseFeeAmount ?? res?.amount ?? 0);
      return Number.isFinite(fee) && fee > 0 ? fee : fallback;
    } catch {
      return fallback;
    }
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Execute the actual action - ALL ACTION LOGIC HERE
   */
  private executeAction(button: ActionButtonConfig): void {
    switch (button.action) {
      case 'MAKE_PAYMENT':
        if (this.itemType === 'salesman-barman-registration') {
          this.handleSalesmanBarmanMakePaymentAction();
        } else {
          this.handleNewLicenseMakePaymentAction();
        }
        break;
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

      case 'UPDATE_ARRIVAL':
        this.actionClicked.emit({ action: 'UPDATE_ARRIVAL', item: this.item });
        break;

      case 'REQUEST_REVALIDATION':
        this.handleRevalidationRequest();
        break;

      case 'VIEW':
        this.handleViewAction();
        break;
      case 'VIEW_SLIP':
        this.handleViewSlipAction();
        break;
      case 'VIEW_PAYMENT_SLIP':
        this.handleViewPaymentSlipAction();
        break;
      case 'VIEW_PERMIT_SLIP':
        this.handleViewPermitSlipAction();
        break;

      default:
        this.handleGenericAction(button);
    }
  }

  private isAwaitingNewLicensePaymentForLicensee(): boolean {
    if (this.itemType !== 'new-license') return false;
    if (this.context !== 'licensee') return false;
    if (!this.isCurrentUserLicensee()) return false;
    const stageName = String(
      this.item?.['current_stage_name'] ??
      this.item?.['currentStageName'] ??
      this.item?.['current_stage'] ??
      this.item?.status ??
      ''
    ).toLowerCase();
    return stageName.includes('awaiting_payment') || (stageName.includes('awaiting') && stageName.includes('payment'));
  }

  private isAwaitingRenewalPaymentForLicensee(): boolean {
    if (this.itemType !== 'license-renewal') return false;
    if (this.context !== 'licensee') return false;
    if (!this.isCurrentUserLicensee()) return false;
    const stageName = String(
      this.item?.['current_stage_name'] ??
      this.item?.['currentStageName'] ??
      this.item?.['current_stage'] ??
      this.item?.status ??
      ''
    ).toLowerCase();
    return stageName.includes('awaiting_payment') || (stageName.includes('awaiting') && stageName.includes('payment'));
  }

  private isAwaitingSalesmanBarmanPaymentForLicensee(): boolean {
    if (this.itemType !== 'salesman-barman-registration') return false;
    if (this.context !== 'licensee') return false;
    if (!this.isCurrentUserLicensee()) return false;
    const stageName = String(
      this.item?.['current_stage_name'] ??
      this.item?.['currentStageName'] ??
      this.item?.['current_stage'] ??
      this.item?.status ??
      ''
    ).toLowerCase();
    return stageName.includes('awaiting_payment') || (stageName.includes('awaiting') && stageName.includes('payment'));
  }

  private getNewLicenseFeeAmounts(): { licenseFee: number; securityFee: number; total: number } {
    const licenseFee = this.toNumber(
      this.item?.['license_fee_amount'] ??
      this.item?.['licenseFeeAmount'] ??
      this.item?.['yearly_license_fee'] ??
      this.item?.['yearlyLicenseFee'] ??
      0
    );
    const securityFee = this.toNumber(this.item?.['security_fee_amount'] ?? this.item?.['securityFeeAmount'] ?? 0);
    return { licenseFee, securityFee, total: licenseFee + securityFee };
  }

  private handleNewLicenseMakePaymentAction(): void {
    const isRenewal = this.itemType === 'license-renewal';
    const isPaymentAllowed = isRenewal
      ? this.isAwaitingRenewalPaymentForLicensee()
      : this.isAwaitingNewLicensePaymentForLicensee();

    if (!isPaymentAllowed) {
      Swal.fire('Not Available', 'Payment is only available when the application is awaiting license fee/security deposit payment.', 'info');
      return;
    }

    const applicationId = String(
      this.item?.['application_id'] ??
      this.item?.['applicationId'] ??
      this.item?.referenceNo ??
      this.item?.refNo ??
      this.item?.id ??
      ''
    ).trim();
    if (!applicationId) {
      Swal.fire('Error', 'Application ID is missing for payment.', 'error');
      return;
    }

    const resolveAmounts = (source: any): { licenseFee: number; securityFee: number; total: number } => {
      const licenseFee = this.toNumber(
        source?.['license_fee_amount'] ??
        source?.['licenseFeeAmount'] ??
        source?.['yearly_license_fee'] ??
        source?.['yearlyLicenseFee'] ??
        0
      );
      const securityFee = isRenewal ? 0 : this.toNumber(source?.['security_fee_amount'] ?? source?.['securityFeeAmount'] ?? 0);
      return { licenseFee, securityFee, total: licenseFee + securityFee };
    };

    const showProceedModal = async (amountSource: any) => {
      const { licenseFee, securityFee, total } = resolveAmounts(amountSource);

      const pachwaiSelected = this.toBool(amountSource?.pachwai ?? amountSource?.pachwai_flag ?? amountSource?.pachwai_selected);
      const draughtSelected = this.toBool(amountSource?.draught_beer ?? amountSource?.draughtBeer ?? amountSource?.draughtbeer);

      let pachwaiFee = 0;
      let draughtFee = 0;
      if (pachwaiSelected) pachwaiFee = await this.getPaymentModuleFee('NLI_ADD_PACHWAI', 3000);
      if (draughtSelected) draughtFee = await this.getPaymentModuleFee('NLI_ADD_DRAUGHT_BEER', 5000);

      const additionalTotal = (pachwaiFee || 0) + (draughtFee || 0);
      const hasAdditional = additionalTotal > 0;
      const baseLicenseFee = Math.max(0, licenseFee - additionalTotal);
      const baseSecurityFee = Math.max(0, securityFee - additionalTotal);

      const feeRow = (label: string, amount: number, accent = false) => `
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:10px 14px; border-radius:8px; margin-bottom:6px;
                    background:${accent ? '#f0fdf8' : '#f9fafb'};
                    border:1px solid ${accent ? '#6ee7c7' : '#e5e7eb'};">
          <span style="color:#374151; font-size:14px;">${label}</span>
          <span style="font-weight:700; color:${accent ? '#0d6e56' : '#111827'}; font-size:14px;">&#8377;${this.formatInr(amount)}</span>
        </div>`;

      const breakdownHtml = hasAdditional
        ? `
          <div style="margin-top:16px; border-radius:10px; border:1px solid #d1fae5; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#065f46,#059669); color:#fff; padding:8px 14px; font-size:13px; font-weight:600; letter-spacing:0.5px;">
              &#9783; Fee Breakup
            </div>
            <div style="padding:10px 10px 4px;">
              ${feeRow('Base License Fee', baseLicenseFee)}
              ${pachwaiSelected ? feeRow('Pachwai (Additional)', pachwaiFee) : ''}
              ${draughtSelected ? feeRow('Draught Beer (Additional)', draughtFee) : ''}
            </div>
            <div style="padding:6px 14px 10px; font-size:11.5px; color:#6b7280; font-style:italic;">
              &#9432; Additional charges are applied to both License Fee and Security Deposit.
            </div>
          </div>
        `
        : '';

      Swal.fire({
        title: '',
        html: `
          <div style="font-family:'Segoe UI',sans-serif; text-align:left;">

            <!-- Header -->
            <div style="text-align:center; margin-bottom:20px;">
              <div style="display:inline-flex; align-items:center; justify-content:center;
                          width:52px; height:52px; border-radius:50%;
                          background:linear-gradient(135deg,#065f46,#10b981); margin-bottom:10px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="white"/>
                </svg>
              </div>
              <div style="font-size:20px; font-weight:700; color:#065f46; line-height:1.2;">Proceed to Pay</div>
              <div style="font-size:12px; color:#6b7280; margin-top:4px;">Review your payment summary before proceeding</div>
            </div>

            <!-- Fee Summary -->
            <div style="border-radius:10px; border:1px solid #d1fae5; overflow:hidden; margin-bottom:12px;">
              <div style="background:#ecfdf5; padding:8px 14px; font-size:12px; font-weight:600;
                          color:#065f46; letter-spacing:0.6px; text-transform:uppercase;">
                Payment Summary
              </div>
              <div style="padding:10px 10px 4px;">
                ${feeRow('License Fee', licenseFee, true)}
                ${securityFee > 0 ? feeRow('Security Deposit', securityFee, true) : ''}
              </div>
              <!-- Total -->
              <div style="display:flex; justify-content:space-between; align-items:center;
                          padding:12px 14px; background:linear-gradient(135deg,#065f46,#10b981);
                          border-top:1px solid #6ee7c7;">
                <span style="color:#d1fae5; font-size:14px; font-weight:600;">Total Payable</span>
                <span style="color:#ffffff; font-size:18px; font-weight:800;">&#8377;${this.formatInr(total)}</span>
              </div>
            </div>

            ${breakdownHtml}

            <!-- Info note -->
            <div style="margin-top:12px; padding:10px 14px; background:#fffbeb; border:1px solid #fde68a;
                        border-radius:8px; font-size:12px; color:#92400e; display:flex; gap:8px; align-items:flex-start;">
              <span style="font-size:15px; flex-shrink:0;">&#9888;</span>
              <span>You will be taken to <b>Wallet &rarr; ${isRenewal ? 'License Fee' : 'License Fee / Security Deposit'}</b> tabs to complete payment.</span>
            </div>

          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '&#10003; &nbsp;Proceed',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#065f46',
        cancelButtonColor: '#6b7280',
        customClass: {
          popup: 'swal-proceed-popup',
          confirmButton: 'swal-proceed-confirm',
          cancelButton: 'swal-proceed-cancel'
        },
        width: '480px'
      }).then((result) => {
        if (!result.isConfirmed) return;
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'wallet',
            action: 'pay',
            tab: 'license_fee',
            id: applicationId,
            type: isRenewal ? 'license-renewal' : 'new-license',
            ref: applicationId,
            referenceNo: applicationId,
            amount: Number.isFinite(licenseFee) && licenseFee > 0 ? licenseFee : undefined,
            securityAmount: !isRenewal && Number.isFinite(securityFee) && securityFee > 0 ? securityFee : undefined,
            source: isRenewal ? 'license-renewal' : 'new-license'
          }
        });
      });
    };

    Swal.fire({
      title: 'Loading...',
      text: 'Fetching fee amounts',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const detail$ = isRenewal
      ? this.workflowActionService.getLicenseRenewalApplicationDetail(applicationId)
      : this.workflowActionService.getNewLicenseApplicationDetail(applicationId);

    detail$.subscribe({
      next: (detail: any) => {
        Swal.close();
        void showProceedModal(detail || this.item);
      },
      error: () => {
        Swal.close();
        void showProceedModal(this.item);
      }
    });
  }

  private handleSalesmanBarmanMakePaymentAction(): void {
    if (!this.isAwaitingSalesmanBarmanPaymentForLicensee()) {
      Swal.fire('Not Available', 'Payment is only available when the application is awaiting registration fee payment.', 'info');
      return;
    }

    const applicationId = String(
      this.item?.['application_id'] ??
      this.item?.['applicationId'] ??
      this.item?.referenceNo ??
      this.item?.refNo ??
      this.item?.id ??
      ''
    ).trim();
    if (!applicationId) {
      Swal.fire('Error', 'Application ID is missing for payment.', 'error');
      return;
    }

    Swal.fire({
      title: 'Loading...',
      text: 'Fetching registration fee',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.paymentIntegrationService.getPaymentModule('012').subscribe({
      next: (module: any) => {
        Swal.close();
        const fee = this.toNumber(module?.license_fee ?? module?.licenseFee ?? module?.licenseFeeAmount ?? 0);
        if (!fee || fee <= 0) {
          Swal.fire('Fee Not Configured', 'Registration fee is not configured for Salesman/Barman (module_code=012).', 'error');
          return;
        }

        Swal.fire({
          title: 'Proceed to Pay',
          html: `
            <div style="text-align:left;">
              <div style="margin-bottom:8px;">Registration Fee: <b>₹${this.formatInr(fee)}</b></div>
              <div>Total: <b>₹${this.formatInr(fee)}</b></div>
              <div style="margin-top:10px; font-size:12px; color:#6b7280;">
                You will be taken to Wallet → License Fee tab to complete payment.
              </div>
            </div>
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Proceed',
          cancelButtonText: 'Cancel'
        }).then((result) => {
          if (!result.isConfirmed) return;
          this.router.navigate(['/dashboard'], {
            queryParams: {
              section: 'wallet',
              action: 'pay',
              tab: 'license_fee',
              id: applicationId,
              type: 'salesman-barman-registration',
              ref: applicationId,
              referenceNo: applicationId,
              amount: fee,
              source: 'salesman-barman-registration'
            }
          });
        });
      },
      error: () => {
        Swal.close();
        Swal.fire('Error', 'Unable to fetch registration fee. Please try again later.', 'error');
      }
    });
  }

  private handleWorkflowAction(button: ActionButtonConfig): void {
    console.log(`🔧 UNIFIED BUTTONS: Executing workflow action: ${button.action}`);
    // Real success/failure is handled in parent after API response.
    this.actionClicked.emit({ action: button.action, item: this.item });
  }

  private handlePaymentAction(): void {
    Swal.fire({
      title: 'Confirm Payment',
      html: `
        <div class="payment-details">
          <p><strong>Application:</strong> ${this.item.referenceNo}</p>
          <p><strong>Amount:</strong> Rs ${this.item['brAmount'] || 'N/A'}</p>
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
        this.unifiedActionsService.executeAction('PAY', this.item, this.itemType, this.context).subscribe({
          next: (response) => {
            if (response?.success === false) {
              Swal.fire({
                title: 'Payment Redirection Failed',
                text: response?.message || 'Unable to open wallet payment page.',
                icon: 'error',
                confirmButtonText: 'OK'
              });
            }
            // Success path intentionally shows no extra modal:
            // user is redirected to wallet section by UnifiedActionsService.
          },
          error: (error) => {
            const message =
              error?.error?.detail ||
              error?.error?.message ||
              error?.message ||
              'Unable to open wallet payment page.';
            Swal.fire({
              title: 'Payment Redirection Failed',
              text: message,
              icon: 'error',
              confirmButtonText: 'OK'
            });
          }
        });
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
    console.log('🔧 UNIFIED BUTTONS: Handling VIEW action');
    
    // Force navigation directly using window.location for reliability
    const ref = this.item?.referenceNo ?? this.item?.['refNo'] ?? '';
    const id = this.item?.id ?? this.item?.['pk'] ?? '';
    
    const queryParams: any = {
      id: id || undefined,
      ref: ref || undefined,
      type: this.itemType,
      source: this.context || 'licensee'
    };
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
      const query = params.toString();
      const url = query ? `/supply-chain-view?${query}` : '/supply-chain-view';
      console.log('🚀 NAVIGATE to view:', url);
      
      // Use setTimeout to defer navigation to next event loop cycle
      setTimeout(() => {
        window.location.href = url;
      }, 0);
    }
  }

  private handleViewSlipAction(): void {
    console.log('🔧 UNIFIED BUTTONS: Handling VIEW_SLIP action for item:', this.item);
    
    // Force navigation directly using window.location for reliability
    const url = this.getSlipHref();
    console.log('🚀 NAVIGATE to slip:', url);
    
    if (typeof window !== 'undefined') {
      // Use setTimeout to defer navigation to next event loop cycle
      setTimeout(() => {
        window.location.href = url;
      }, 0);
    }
  }

  private handleViewPaymentSlipAction(): void {
    console.log('🔧 UNIFIED BUTTONS: Handling VIEW_PAYMENT_SLIP action for item:', this.item);
    
    // Force navigation directly using window.location for reliability
    const queryParams = {
      id: this.item.id,
      type: this.itemType,
      refNo: this.item.referenceNo,
      ref: this.item.referenceNo,
      referenceNo: this.item.referenceNo,
      source: this.context || 'dashboard'
    };
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
      const query = params.toString();
      const url = query ? `/payment-slip-view?${query}` : '/payment-slip-view';
      console.log('🚀 NAVIGATE to payment slip:', url);
      
      // Use setTimeout to defer navigation to next event loop cycle
      setTimeout(() => {
        window.location.href = url;
      }, 0);
    }
  }

  private handleViewPermitSlipAction(): void {
    console.log('🔧 UNIFIED BUTTONS: Handling VIEW_PERMIT_SLIP action for item:', this.item);
    
    // Determine the correct view path based on itemType
    let viewPath = '';
    
    if (this.itemType === 'revalidation') {
      viewPath = '/unified-letter-view/revalidation';
    } else if (this.itemType === 'cancellation') {
      viewPath = '/unified-letter-view/cancellation';
    } else if (this.itemType === 'requisition') {
      viewPath = '/unified-letter-view/requisition';
    } else {
      console.error('Unknown itemType for permit slip:', this.itemType);
      return;
    }
    
    const queryParams = {
      id: this.item.id,
      ref: this.item.referenceNo,
      refNo: this.item.referenceNo,
      source: this.context || 'dashboard'
    };
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
      const query = params.toString();
      const url = query ? `${viewPath}?${query}` : viewPath;
      console.log('🚀 NAVIGATE to permit slip:', url);
      
      // Use setTimeout to defer navigation to next event loop cycle
      setTimeout(() => {
        window.location.href = url;
      }, 0);
    }
  }

  public getSlipHref(): string {
    const id = this.item?.id ?? this.item?.['pk'] ?? '';
    const ref =
      this.item?.referenceNo ??
      this.item?.['refNo'] ??
      this.item?.['ourRefNo'] ??
      this.item?.['our_ref_no'] ??
      this.item?.['billNo'] ??
      this.item?.['bill_no'] ??
      '';

    const params = new URLSearchParams();
    if (id !== undefined && id !== null && id !== '') params.set('id', String(id));
    if (this.itemType) params.set('type', String(this.itemType));
    if (ref) {
      params.set('refNo', String(ref));
      params.set('ref', String(ref));
      params.set('referenceNo', String(ref));
      if (this.itemType === 'transit') params.set('billNo', String(ref));
    }
    params.set('source', this.context || 'dashboard');
    const query = params.toString();

    // Note: "dev-*" routes are guarded with `devOnly` and will redirect to `/accessdenied` in production builds.
    // Permit slips should use stable routes that work in both localhost and hosted environments.
    const routeByType: Record<string, string> = {
      requisition: '/unified-letter-view/requisition',
      revalidation: '/unified-letter-view/revalidation',
      transit: '/unified-letter-view/transit',
      hologram: '/payment-slip-view'
    };
    const route = routeByType[String(this.itemType || '').toLowerCase()] || '/payment-slip-view';
    const finalUrl = query ? `${route}?${query}` : route;
    
    console.log('🔧 UNIFIED BUTTONS: getSlipHref ->', {
      itemType: this.itemType,
      id,
      ref,
      route,
      finalUrl
    });
    
    return finalUrl;
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
      .map(action => this.normalizeActionName(action))
      .filter(action => !!action);
  }

  private getFilteredConfigs(): ActionButtonConfig[] {
    let include = this.normalizeActionList(this.includeActions);
    const exclude = this.normalizeActionList(this.excludeActions);

    console.log('🔧 UNIFIED BUTTONS: getFilteredConfigs ->', {
      includeActions: this.includeActions,
      normalizedInclude: include,
      excludeActions: this.excludeActions,
      normalizedExclude: exclude,
      availableActionConfigs: this.availableActionConfigs
    });

    let result = [...this.availableActionConfigs];

    const stageNameForRemark = String(
      this.item?.['current_stage_name'] ??
      this.item?.['currentStageName'] ??
      this.item?.['current_stage'] ??
      this.item?.status ??
      ''
    ).toLowerCase();
    const isRejected = stageNameForRemark.includes('reject');
    const canShowViewRemark = isRejected && ['new-license', 'company-registration', 'company-collaboration', 'salesman-barman-registration'].includes(String(this.itemType || ''));
    if (canShowViewRemark && !result.some(config => this.normalizeActionName(config.action) === 'VIEW_REMARK')) {
      result.push({
        action: 'VIEW_REMARK',
        label: 'View Remark',
        icon: 'comment',
        color: 'info',
        tooltip: 'View rejection remarks'
      });
    }

    if (canShowViewRemark && include.length && !include.includes('VIEW_REMARK')) {
      include = [...include, 'VIEW_REMARK'];
    }

    // If includeActions specifies VIEW but backend didn't return it, add a safe fallback.
    if (include.includes('VIEW') && !result.some(config => config.action === 'VIEW')) {
      console.log('🔧 UNIFIED BUTTONS: Adding VIEW fallback');
      result.push({
        action: 'VIEW',
        label: 'View',
        icon: 'visibility',
        color: 'primary',
        tooltip: 'View Details'
      });
    }

    if (include.includes('VIEW_SLIP') && !result.some(config => config.action === 'VIEW_SLIP')) {
      console.log('🔧 UNIFIED BUTTONS: Adding VIEW_SLIP fallback');
      result.push({
        action: 'VIEW_SLIP',
        label: this.getSlipButtonLabel(),
        icon: 'receipt',
        color: 'primary',
        tooltip: this.getSlipButtonTooltip()
      });
    }

    if (include.includes('VIEW_PAYMENT_SLIP') && !result.some(config => config.action === 'VIEW_PAYMENT_SLIP')) {
      console.log('🔧 UNIFIED BUTTONS: Adding VIEW_PAYMENT_SLIP fallback');
      result.push({
        action: 'VIEW_PAYMENT_SLIP',
        label: 'View Payment Slip',
        icon: 'receipt_long',
        color: 'primary',
        tooltip: 'View Payment Slip'
      });
    }

    if (include.includes('VIEW_PERMIT_SLIP') && !result.some(config => config.action === 'VIEW_PERMIT_SLIP')) {
      console.log('🔧 UNIFIED BUTTONS: Adding VIEW_PERMIT_SLIP fallback');
      result.push({
        action: 'VIEW_PERMIT_SLIP',
        label: 'View Permit Slip',
        icon: 'description',
        color: 'success',
        tooltip: 'View Permit Slip'
      });
    }

    if (
      include.includes('REQUEST_CANCELLATION') &&
      this.context === 'licensee' &&
      !result.some(config => config.action === 'REQUEST_CANCELLATION')
    ) {
      console.log('🔧 UNIFIED BUTTONS: Adding REQUEST_CANCELLATION fallback');
      result.push({
        action: 'REQUEST_CANCELLATION',
        label: 'Request Cancellation',
        icon: 'cancel',
        color: 'warn',
        tooltip: 'Request Cancellation'
      });
    }

    if (include.includes('UPDATE_ARRIVAL') && !result.some(config => config.action === 'UPDATE_ARRIVAL')) {
      console.log('🔧 UNIFIED BUTTONS: Adding UPDATE_ARRIVAL fallback');
      result.push({
        action: 'UPDATE_ARRIVAL',
        label: 'Update Arrival',
        icon: 'local_shipping',
        color: 'accent',
        tooltip: 'Update Bulk Liter Arrival'
      });
    }

    if (include.includes('REQUEST_REVALIDATION') && !result.some(config => config.action === 'REQUEST_REVALIDATION')) {
      result.push({
        action: 'REQUEST_REVALIDATION',
        label: 'Request Revalidation',
        icon: 'restore',
        color: 'warn',
        tooltip: 'Request Revalidation'
      });
    }

    if (include.length) {
      result = result.filter(config => include.includes(config.action));
    }

    if (exclude.length) {
      result = result.filter(config => !exclude.includes(config.action));
    }

    result = this.applyRequisitionPostPaymentActionRules(result);
    result = this.applyContextActionRestrictions(result);
    result = this.applyCancellationCommissionerActionRules(result);
    result = this.applyRevalidationCommissionerActionRules(result);
    result = this.applyHologramCommissionerActionRules(result);

    // New License: once application is routed to awaiting payment for licensee,
    // do not show an "Approve" workflow action; show Make Payment instead.
    if (this.isAwaitingNewLicensePaymentForLicensee()) {
      result = result.filter(config => this.normalizeActionName(config.action) !== 'APPROVE');
      if (!result.some(config => this.normalizeActionName(config.action) === 'MAKE_PAYMENT')) {
        result.unshift({
          action: 'MAKE_PAYMENT',
          label: 'Make Payment',
          icon: 'payment',
          color: 'primary',
          tooltip: 'Pay license fee and security deposit from wallet'
        });
      }
    }

    if (this.isAwaitingRenewalPaymentForLicensee()) {
      result = result.filter(config => this.normalizeActionName(config.action) !== 'APPROVE');
      result = result.filter(config => this.normalizeActionName(config.action) !== 'PAY');
      if (!result.some(config => this.normalizeActionName(config.action) === 'MAKE_PAYMENT')) {
        result.unshift({
          action: 'MAKE_PAYMENT',
          label: 'Make Payment',
          icon: 'payment',
          color: 'primary',
          tooltip: 'Pay renewal license fee and security deposit from wallet'
        });
      }
    }

    // Salesman/Barman: once application is routed to awaiting payment for licensee,
    // show Make Payment (registration fee from license fee wallet).
    // Also remove any workflow-level PAY action to avoid duplicate payment buttons.
    if (this.isAwaitingSalesmanBarmanPaymentForLicensee()) {
      result = result.filter(config => this.normalizeActionName(config.action) !== 'APPROVE');
      result = result.filter(config => this.normalizeActionName(config.action) !== 'PAY');
      if (!result.some(config => this.normalizeActionName(config.action) === 'MAKE_PAYMENT')) {
        result.unshift({
          action: 'MAKE_PAYMENT',
          label: 'Make Payment',
          icon: 'payment',
          color: 'primary',
          tooltip: 'Pay registration fee from license fee wallet'
        });
      }
    }

    // Salesman/Barman awaiting payment: always remove the raw PAY workflow action
    // when a MAKE_PAYMENT button is already present, to prevent duplicate payment buttons.
    // Also: if stage is awaiting_payment for salesman-barman licensee context but
    // isAwaitingSalesmanBarmanPaymentForLicensee() returned false (e.g. JWT check edge case),
    // still inject MAKE_PAYMENT and remove PAY.
    // NOTE: isCurrentUserLicensee() is required here — the URL source param can be 'licensee'
    // even when a commissioner opens the link, so we must verify the actual logged-in role.
    if (this.itemType === 'salesman-barman-registration' && this.context === 'licensee' && this.isCurrentUserLicensee()) {
      const stageName = String(
        this.item?.['current_stage_name'] ??
        this.item?.['currentStageName'] ??
        this.item?.['current_stage'] ??
        this.item?.status ??
        ''
      ).toLowerCase();
      const isAtPaymentStage = stageName.includes('awaiting_payment') ||
        (stageName.includes('awaiting') && stageName.includes('payment'));

      if (isAtPaymentStage) {
        // Remove PAY — MAKE_PAYMENT is the correct button for licensees
        result = result.filter(config => this.normalizeActionName(config.action) !== 'PAY');
        // Ensure MAKE_PAYMENT is present
        if (!result.some(config => this.normalizeActionName(config.action) === 'MAKE_PAYMENT')) {
          result.unshift({
            action: 'MAKE_PAYMENT',
            label: 'Make Payment',
            icon: 'payment',
            color: 'primary',
            tooltip: 'Pay registration fee from license fee wallet'
          });
        }
      }
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

    console.log('🔧 UNIFIED BUTTONS: Final filtered configs:', deduped);
    return deduped;
  }

  private applyContextActionRestrictions(configs: ActionButtonConfig[]): ActionButtonConfig[] {
    return configs.filter(config => {
      const action = this.normalizeActionName(config?.action);
      if (action === 'REQUEST_CANCELLATION' && this.itemType === 'requisition') {
        return false;
      }
      if (action === 'REQUEST_CANCELLATION' && this.context !== 'licensee') {
        return false;
      }
      return true;
    });
  }

  private applyRequisitionPostPaymentActionRules(configs: ActionButtonConfig[]): ActionButtonConfig[] {
    if (this.itemType !== 'requisition') {
      return configs;
    }

    if (!['permit-section', 'commissioner'].includes(this.context)) {
      return configs;
    }

    if (!this.isRequisitionPostPaymentStage()) {
      return configs;
    }

    return configs.filter(config => this.normalizeActionName(config?.action) !== 'REJECT');
  }

  private applyCancellationCommissionerActionRules(configs: ActionButtonConfig[]): ActionButtonConfig[] {
    if (this.itemType !== 'cancellation') {
      return configs;
    }

    return configs.filter(config => this.normalizeActionName(config?.action) !== 'REJECT');
  }

  private applyRevalidationCommissionerActionRules(configs: ActionButtonConfig[]): ActionButtonConfig[] {
    if (this.itemType !== 'revalidation') {
      return configs;
    }

    if (this.context !== 'commissioner') {
      return configs;
    }

    const currentUrl = this.router.url || '';
    const isDetailView = currentUrl.includes('/supply-chain-view');

    return configs.filter(config => {
      const action = this.normalizeActionName(config?.action);
      if (action === 'REJECT') {
        return false;
      }
      if (!isDetailView && action === 'APPROVE') {
        return false;
      }
      return true;
    });
  }

  private applyHologramCommissionerActionRules(configs: ActionButtonConfig[]): ActionButtonConfig[] {
    if (this.itemType !== 'hologram') {
      return configs;
    }

    if (this.context !== 'commissioner') {
      return configs;
    }

    return configs.filter(config => this.normalizeActionName(config?.action) !== 'REJECT');
  }

  private isRequisitionPostPaymentStage(): boolean {
    const status = String(this.item?.status || '').toLowerCase().replace(/\s+/g, '');
    const stageName = String(this.item?.['currentStageName'] || this.item?.['current_stage_name'] || '').toLowerCase().replace(/\s+/g, '');

    const merged = `${status} ${stageName}`;
    const postPaymentMarkers = [
      'payslip',
      'payment',
      'paid',
      'wallet',
      'approvedbypermitsection',
      'approvedbycommissioner',
      'rejectedbycommissioner'
    ];

    return postPaymentMarkers.some(marker => merged.includes(marker));
  }

  private normalizeActionConfig(config: any): ActionButtonConfig {
    const rawAction = config?.action ?? config?.Action ?? config?.action_name ?? config?.actionName;
    const action = this.normalizeActionName(rawAction);
    let label = config?.label ?? config?.Label ?? this.toTitleCase(action);
    let icon = config?.icon ?? config?.Icon ?? 'arrow_forward';
    const color = config?.color ?? config?.Color ?? 'primary';
    let tooltip = config?.tooltip ?? config?.Tooltip ?? (label ? `${label} Application` : 'Perform Action');
    const requiresConfirmation = config?.requiresConfirmation ?? config?.requires_confirmation ?? false;
    const confirmationMessage = config?.confirmationMessage ?? config?.confirmation_message;
    const transitionId = config?.transitionId ?? config?.transition_id;
    const toStageId = config?.toStageId ?? config?.to_stage_id ?? config?.targetStage ?? config?.target_stage;

    if (this.isSlipAction(action)) {
      label = this.getSlipButtonLabel();
      icon = 'receipt';
      tooltip = this.getSlipButtonTooltip();
    }

    if (action === 'VIEW_PAYMENT_SLIP') {
      label = 'View Payment Slip';
      icon = 'receipt_long';
      tooltip = 'View Payment Slip';
    }

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

  private normalizeActionName(action: any): string {
    const normalized = String(action || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
    if (!normalized) return '';
    switch (normalized) {
      case 'VIEWSLIP':
      case 'VIEWPAYMENTSLIP':
      case 'VIEW_PAYMENTSLIP':
      case 'VIEW_PAY_SLIP':
      case 'PAYMENTSLIP':
      case 'PAY_SLIP':
      case 'SLIP_VIEW':
      case 'SUBMITPAYSLIP':
      case 'APPROVEPAYSLIP':
      case 'REJECTPAYSLIP':
        return 'VIEW_SLIP';
      case 'VIEWAPPLICATION':
      case 'VIEW_DETAILS':
      case 'VIEWDETAILS':
        return 'VIEW';
      default:
        return normalized;
    }
  }

  onActionButtonClick(button: ActionButtonConfig, event?: Event): void {
    console.log('🖱️ BUTTON CLICKED!', {
      action: button.action,
      label: button.label,
      event: event?.type,
      button
    });
    
    // CRITICAL: Stop event propagation to prevent parent handlers from interfering
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
    
    // Use setTimeout to defer execution to next event loop cycle
    // This allows Angular's change detection to complete first
    setTimeout(() => {
      this.onActionClick(button);
    }, 0);
  }

  logButtonInteraction(eventType: string, button: ActionButtonConfig): void {
    console.log(`🖱️ Button ${eventType}:`, button.action, button.label);
    if (eventType === 'mouseenter') {
      console.log('  ✅ Mouse is OVER the button!');
    }
  }

  forceNavigateToSlip(): void {
    console.log('🚀 FORCE NAVIGATE TO SLIP!');
    const url = this.getSlipHref();
    console.log('🚀 Navigating to:', url);
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }

  private isSlipAction(action: any): boolean {
    const token = String(action || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
    if (!token) return false;
    return token.includes('PAYSLIP') || token.includes('PAY_SLIP') || token === 'VIEW_SLIP' || token === 'VIEWSLIP';
  }

  private getSlipButtonLabel(): string {
    const permitTypes = new Set(['requisition', 'revalidation', 'transit']);
    return permitTypes.has(String(this.itemType || '').toLowerCase()) ? 'View Permit Slip' : 'View Slip';
  }

  private getSlipButtonTooltip(): string {
    const permitTypes = new Set(['requisition', 'revalidation', 'transit']);
    return permitTypes.has(String(this.itemType || '').toLowerCase()) ? 'View Permit Slip' : 'View Payment Slip';
  }

  isSlipButton(button: ActionButtonConfig | null | undefined): boolean {
    if (!button) return false;
    if (this.isSlipAction(button.action)) return true;
    const combinedText = `${button.label || ''} ${button.tooltip || ''}`.toLowerCase();
    if (combinedText.includes('slip')) return true;
    if (combinedText.includes('payment') && combinedText.includes('view')) return true;
    if (combinedText.includes('permit') && combinedText.includes('slip')) return true;

    const icon = String(button.icon || '').toLowerCase();
    return icon.includes('receipt') || icon.includes('description') || icon.includes('assignment');
  }

  getButtonTooltip(button: ActionButtonConfig | null | undefined): string {
    if (!button) return '';
    if (button.tooltip) return button.tooltip;
    if (this.isSlipAction(button.action)) return this.getSlipButtonTooltip();
    if (button.label) return button.label;
    return this.toTitleCase(this.normalizeActionName(button.action));
  }

  getButtonBackground(button: ActionButtonConfig): string {
    const variant = this.getButtonVariant(button);
    if (variant === 'slip') {
      return 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)';
    }
    if (variant === 'view') {
      return 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
    }

    const color = button.color || 'primary';
    const action = button.action || '';
    
    switch (color) {
      case 'primary':
        return 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
      case 'warning':
        return 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)';
      case 'success':
        return 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)';
      case 'warn':
      case 'danger':
        return 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)';
      case 'info':
        return 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)';
      case 'accent':
        return 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)';
      default:
        return 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
    }
  }

  getIconColor(button: ActionButtonConfig): string {
    const variant = this.getButtonVariant(button);
    if (variant === 'slip') {
      return '#f9a825';
    }
    if (variant === 'view') {
      return '#1976d2';
    }

    const color = button.color || 'primary';

    switch (color) {
      case 'primary':
        return '#1976d2';
      case 'warning':
        return '#f9a825';
      case 'success':
        return '#388e3c';
      case 'warn':
      case 'danger':
        return '#d32f2f';
      case 'info':
        return '#0097a7';
      case 'accent':
        return '#7b1fa2';
      default:
        return '#1976d2';
    }
  }

  getButtonVariant(button: ActionButtonConfig | null | undefined): 'slip' | 'view' | 'payment-slip' | 'default' {
    if (!button) return 'default';
    
    // Check if it's specifically a payment slip
    if (button.action === 'VIEW_PAYMENT_SLIP') return 'payment-slip';
    
    // Check if it's a permit slip
    if (this.isSlipButton(button)) return 'slip';

    const normalizedAction = this.normalizeActionName(button.action);
    if (normalizedAction === 'VIEW') return 'view';

    return 'default';
  }
}


