import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkflowActionService } from '../../../core/services/workflow-action.service';
import { UnifiedActionsService } from '../../services/unified-actions.service';
import { ApplicationType } from '../../constants/application.constants';
import Swal from 'sweetalert2';

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
      'UPDATE_ARRIVAL',
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
      'UPDATE_ARRIVAL',
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
    const normalizedAction = this.normalizeActionName(button?.action);
    const normalizedButton: ActionButtonConfig = { ...button, action: normalizedAction };

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
      title: 'Declaration Before Rejection',
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.5">
          <p style="margin:0 0 8px 0;"><strong>Reference:</strong> ${refNo}</p>
          <p style="margin:0 0 10px 0;color:#9a3412;">
            Rejecting this transit permit will trigger automatic reversal actions.
          </p>
          <ul style="padding-left:18px;margin:0 0 10px 0;">
            <li>Stock utilized under this permit will be reverted to inventory.</li>
            <li>Wallet refund will be posted for this permit.</li>
            <li><strong>Excise refund:</strong> ${excise}</li>
            <li><strong>Education cess refund:</strong> ${education}</li>
            <li><strong>Total wallet refund:</strong> ${currency}</li>
            <li><strong>Stock impact:</strong> ${summary.totalCases} case(s) will be reverted.</li>
          </ul>
          <p style="margin:0;">
            Proceed only if this cancellation is valid and fully verified.
          </p>
          <div style="margin-top:12px;">
            <label for="rejectReasonInput" style="display:block;font-weight:600;margin-bottom:6px;">
              Rejection reason (optional)
            </label>
            <textarea
              id="rejectReasonInput"
              class="swal2-textarea"
              style="display:block;width:100%;min-height:78px;margin:0;"
              placeholder="Enter reason for rejection..."
            ></textarea>
          </div>
          <div style="margin-top:10px;">
            <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
              <input id="rejectAcknowledgeCheckbox" type="checkbox" />
              <span>I understand the above consequences and want to continue.</span>
            </label>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Proceed With Rejection',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6c757d',
      focusConfirm: false,
      preConfirm: () => {
        const popup = Swal.getPopup();
        const checkbox = popup?.querySelector('#rejectAcknowledgeCheckbox') as HTMLInputElement | null;
        const reasonInput = popup?.querySelector('#rejectReasonInput') as HTMLTextAreaElement | null;

        if (!checkbox?.checked) {
          Swal.showValidationMessage('Please acknowledge the declaration to proceed.');
          return false;
        }

        return {
          reason: String(reasonInput?.value || '').trim()
        };
      }
    }).then((declarationResult) => {
      if (declarationResult.isConfirmed) {
        const reason = String((declarationResult.value as any)?.reason || '').trim();
        this.item = {
          ...this.item,
          __rejectReason: reason
        };
        this.executeAction(button);
      }
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

    const routeByType: Record<string, string> = {
      requisition: '/dev-final-requisition-letters',
      revalidation: '/dev-revalidation-permit-slip',
      transit: '/dev-final-transit-permit-view',
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
    const include = this.normalizeActionList(this.includeActions);
    const exclude = this.normalizeActionList(this.excludeActions);

    console.log('🔧 UNIFIED BUTTONS: getFilteredConfigs ->', {
      includeActions: this.includeActions,
      normalizedInclude: include,
      excludeActions: this.excludeActions,
      normalizedExclude: exclude,
      availableActionConfigs: this.availableActionConfigs
    });

    let result = [...this.availableActionConfigs];

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

    return configs.filter(config => this.normalizeActionName(config?.action) !== 'REJECT');
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
      'forwardedtocommissioner',
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


