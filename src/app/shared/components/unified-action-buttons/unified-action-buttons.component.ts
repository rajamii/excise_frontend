import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AccountService } from '../../../core/services/account.service';

export interface ActionItem {
  id?: number | string;
  referenceNo: string;
  status: string;
  allowedActions?: string[];
  allowedActionConfigs?: ActionButtonConfig[]; // Dynamic configs from backend
  canCancel?: boolean;
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
  @Input() displayMode: 'table' | 'detailed' = 'table'; // New input to control display mode

  @Output() actionClicked = new EventEmitter<{ action: string, item: ActionItem }>();

  private currentUser: any;

  // Define all possible action button configurations
  private actionButtonConfigs: { [key: string]: ActionButtonConfig } = {
    'APPROVE': {
      action: 'APPROVE',
      label: 'Approve',
      icon: 'check_circle',
      color: 'accent', // Will be styled as green in SCSS
      tooltip: 'Approve Application',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to approve this application?'
    },
    'REJECT': {
      action: 'REJECT',
      label: 'Reject',
      icon: 'cancel',
      color: 'warn', // Will be styled as red
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
    'EDIT': {
      action: 'EDIT',
      label: 'Edit',
      icon: 'edit',
      color: 'primary',
      tooltip: 'Edit Details'
    },
    'DOWNLOAD': {
      action: 'DOWNLOAD',
      label: 'Download',
      icon: 'download',
      color: 'info',
      tooltip: 'Download Document'
    },
    'REQUEST_CANCELLATION': {
      action: 'REQUEST_CANCELLATION',
      label: 'Request Cancellation',
      icon: 'cancel',
      color: 'warn',
      tooltip: 'Request Cancellation of Approved Application',
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to request cancellation of this approved application?'
    },
    'VIEW': {
      action: 'VIEW',
      label: 'View',
      icon: 'visibility',
      color: 'primary',
      tooltip: 'View Details'
    }
  };

  constructor(private accountService: AccountService) { }

  ngOnInit(): void {
    this.accountService.getAuthenticationState().subscribe(user => {
      this.currentUser = user;
    });
  }

  isLegacyPaymentMode(): boolean {
    // Only use legacy mode if no dynamic configs are present
    return !this.item.allowedActionConfigs || this.item.allowedActionConfigs.length === 0;
  }

  hasViewAction(): boolean {
    const buttons = this.getAvailableButtons();
    return buttons.some(b => b.action === 'VIEW');
  }

  getAvailableButtons(): ActionButtonConfig[] {
    // 1. Priority: Dynamic configs from backend
    if (this.item.allowedActionConfigs && this.item.allowedActionConfigs.length > 0) {
      return this.item.allowedActionConfigs;
    }

    // 2. Fallback: Legacy local mapping
    if (!this.item.allowedActions) {
      return [];
    }

    return this.item.allowedActions
      .filter(action => this.actionButtonConfigs[action])
      .map(action => this.actionButtonConfigs[action]);
  }

  getDisplayButtons(): ActionButtonConfig[] {
    // Priority: Dynamic configs from backend
    if (this.item.allowedActionConfigs && this.item.allowedActionConfigs.length > 0) {
      // Detailed mode: Show secondary actions (everything NOT primary)
      if (this.displayMode === 'detailed') {
        return this.getSecondaryActionButtons();
      }
      // Table mode: Show "VIEW" and other secondary actions suitable for table
      else {
        const availableButtons = this.item.allowedActionConfigs;
        // In table, we usually hide big primary actions like Approve/Reject unless specifically asked
        // But for now, let's keep it simple: Show VIEW + others. 
        // Logic: Filter out explicit primary ones if we only want icons?
        // Actually, backend config might have 'icon' so we can show them.
        // Let's stick to showing View + others defined in nonPrimary.
        const nonPrimaryActions = ['VIEW', 'DOWNLOAD', 'EDIT', 'FORWARD', 'VERIFY', 'ISSUE', 'EXTEND', 'TERMINATE'];
        // Trust backend, but maybe filter for space in table
        return availableButtons.filter(b => nonPrimaryActions.includes(b.action));
      }
    }

    if (this.displayMode === 'detailed') {
      // In detailed mode, show secondary actions as icons (excluding VIEW since we're already viewing)
      return this.getSecondaryActionButtons().filter(button => button.action !== 'VIEW');
    } else {
      // In table mode, show ONLY VIEW and other non-primary actions (NO approve/reject)
      const nonPrimaryActions = ['VIEW', 'DOWNLOAD', 'EDIT', 'FORWARD', 'VERIFY', 'ISSUE', 'EXTEND', 'TERMINATE'];
      return this.getAvailableButtons().filter(button =>
        nonPrimaryActions.includes(button.action) && this.shouldShowButton(button)
      );
    }
  }

  getPrimaryActionButtons(): ActionButtonConfig[] {
    const primaryActions = ['APPROVE', 'REJECT', 'REQUEST_CANCELLATION', 'PAY', 'SUBMIT'];

    // 1. Dynamic Configs (Backend Driven) - TRUST BACKEND
    if (this.item.allowedActionConfigs && this.item.allowedActionConfigs.length > 0) {
      return this.item.allowedActionConfigs.filter(config => primaryActions.includes(config.action));
    }

    // 2. Legacy Fallback
    if (!this.item.allowedActions) {
      return [];
    }

    return this.item.allowedActions
      .filter(action => primaryActions.includes(action) && this.actionButtonConfigs[action])
      .map(action => this.actionButtonConfigs[action])
      .filter(button => this.shouldShowButton(button));
  }

  getSecondaryActionButtons(): ActionButtonConfig[] {
    const primaryActions = ['APPROVE', 'REJECT', 'REQUEST_CANCELLATION', 'PAY', 'SUBMIT'];

    // 1. Dynamic Configs (Backend Driven) - TRUST BACKEND
    if (this.item.allowedActionConfigs && this.item.allowedActionConfigs.length > 0) {
      return this.item.allowedActionConfigs.filter(config => !primaryActions.includes(config.action));
    }

    // 2. Legacy Fallback
    if (!this.item.allowedActions) {
      return [];
    }

    return this.item.allowedActions
      .filter(action => !primaryActions.includes(action) && this.actionButtonConfigs[action])
      .map(action => this.actionButtonConfigs[action])
      .filter(button => this.shouldShowButton(button));
  }

  private shouldShowButton(config: ActionButtonConfig): boolean {
    // Role-based filtering logic
    switch (this.context) {
      case 'licensee':
        // Licensees can request cancellation for approved applications, but can't approve/reject
        return ['REQUEST_CANCELLATION', 'VIEW', 'DOWNLOAD', 'EDIT'].includes(config.action);

      case 'permit-section':
        // Permit section can approve/reject/forward
        return ['APPROVE', 'REJECT', 'FORWARD', 'VIEW', 'DOWNLOAD'].includes(config.action);

      case 'commissioner':
        // Commissioner can approve/reject/extend/issue
        return ['APPROVE', 'REJECT', 'EXTEND', 'ISSUE', 'VIEW', 'DOWNLOAD'].includes(config.action);

      case 'itcell':
        // IT Cell can verify/forward
        return ['VERIFY', 'FORWARD', 'VIEW', 'DOWNLOAD'].includes(config.action);

      case 'officer-in-charge':
        // Officer in charge can approve/terminate
        return ['APPROVE', 'TERMINATE', 'VIEW', 'DOWNLOAD'].includes(config.action);

      default:
        return true;
    }
  }

  onActionClick(button: ActionButtonConfig): void {
    if (button.requiresConfirmation) {
      if (confirm(button.confirmationMessage || `Are you sure you want to ${button.label.toLowerCase()} this item?`)) {
        this.onAction(button.action);
      }
    } else {
      this.onAction(button.action);
    }
  }

  onAction(action: string): void {
    this.actionClicked.emit({ action, item: this.item });
  }

  // Helper methods for role detection
  isLicensee(): boolean {
    return this.context === 'licensee' || this.hasRole(['licensee']);
  }

  isPermitSection(): boolean {
    return this.context === 'permit-section' || this.hasRole(['permit_section', 'Permit Section']);
  }

  isCommissioner(): boolean {
    return this.context === 'commissioner' || this.hasRole(['level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'site_admin']);
  }

  isITCell(): boolean {
    return this.context === 'itcell' || this.hasRole(['it_cell', 'it-cell']);
  }

  isOfficerInCharge(): boolean {
    return this.context === 'officer-in-charge' || this.hasRole(['officer_in_charge', 'officer-incharge']);
  }

  private hasRole(roles: string[]): boolean {
    if (!this.currentUser) return false;

    const userRoles = this.currentUser.authorities || this.currentUser.roles || [];
    return roles.some(role =>
      userRoles.some((userRole: any) =>
        (typeof userRole === 'string' ? userRole : userRole.name) === role
      )
    );
  }

  // Business logic methods
  canPay(): boolean {
    // Licensee can pay when approved by commissioner and has APPROVE action
    return !!(this.item.allowedActions?.includes('APPROVE') &&
      this.item.status?.toLowerCase().includes('approved'));
  }

  canViewPermitSlip(): boolean {
    if (this.isLicensee()) return false; // Licensees don't see permit slips in this view

    const status = this.item.status?.toUpperCase() || '';

    // Block commissioner-related statuses
    if (status.includes('COMMISSIONER') || status.includes('APPROVEDBY')) {
      return false;
    }

    // Allow final approved status
    return status.includes('APPROVED') ||
      status.includes('ISSUED') ||
      status.includes('GENERATED') ||
      status.includes('COMPLETED');
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