import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';

// Import existing services
import { EnaRequisitionService } from '../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../features/licensee/supplyChain/services/hologram-data.service';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UnifiedActionsService {

  constructor(
    private router: Router,
    private enaRequisitionService: EnaRequisitionService,
    private supplyChainService: SupplyChainService,
    private hologramService: HologramDataService
  ) { }

  /**
   * Execute an action on an item based on item type and action
   */
  executeAction(
    action: string,
    item: any,
    itemType: 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram',
    context?: string
  ): Observable<ActionResult> {

    console.log(`Executing action: ${action} on ${itemType} with ID: ${item.id}`);

    switch (action) {
      case 'VIEW':
        return this.handleViewAction(item, itemType, context);

      case 'APPROVE':
        return this.handleApproveAction(item, itemType);

      case 'REJECT':
        return this.handleRejectAction(item, itemType);

      case 'FORWARD':
        return this.handleForwardAction(item, itemType);

      case 'VERIFY':
        return this.handleVerifyAction(item, itemType);

      case 'ISSUE':
        return this.handleIssueAction(item, itemType);

      case 'EXTEND':
        return this.handleExtendAction(item, itemType);

      case 'TERMINATE':
        return this.handleTerminateAction(item, itemType);

      case 'PAY':
        return this.handlePayAction(item, itemType);

      case 'CANCEL':
        return this.handleCancelAction(item, itemType);

      case 'VIEW_SLIP':
        return this.handleViewSlipAction(item, itemType, context);

      case 'DOWNLOAD':
        return this.handleDownloadAction(item, itemType);

      case 'EDIT':
        return this.handleEditAction(item, itemType);

      default:
        return of({
          success: false,
          message: `Unknown action: ${action}`
        });
    }
  }

  private handleViewAction(item: any, itemType: string, context?: string): Observable<ActionResult> {
    // Special handling for OIC context
    if (context === 'officer-in-charge') {
      if (itemType === 'hologram') {
        // For OIC, navigate to hologram monthly report or daily register based on item type
        const hologramSections: { [key: string]: string } = {
          'monthly-statement': 'monthly-hologram-statement',
          'daily-register': 'daily-hologram-register',
          'stock-inventory': 'hologram-overview'
        };

        const section = hologramSections[item.subType] || 'hologram-register';
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: section,
            ref: item.referenceNo,
            source: context
          }
        });

        return of({
          success: true,
          message: `Navigated to ${itemType} ${item.subType || 'view'} within SPA`
        });
      }
    }

    // Use unified supply chain view for all types
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id: item.id,
        ref: item.referenceNo,
        type: itemType,
        source: context || 'licensee'
      }
    });

    return of({
      success: true,
      message: `Navigated to ${itemType} view`
    });
  }

  private handleApproveAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for approval'
      });
    }

    switch (itemType) {
      case 'requisition':
        return this.enaRequisitionService.performAction(item.id, 'APPROVE');

      case 'revalidation':
        return this.supplyChainService.performRevalidationAction(item.id, 'APPROVE', 'Approved');

      case 'cancellation':
        return this.supplyChainService.performCancellationAction(item.id, 'APPROVE', 'Approved');

      case 'transit':
        return this.supplyChainService.performTransitPermitAction(item.id, 'APPROVE', 'Approved');

      case 'hologram':
        return this.hologramService.performAction('procurement', Number(item.id), 'approve', 'Approved');

      default:
        return of({
          success: false,
          message: `Approval not implemented for ${itemType}`
        });
    }
  }

  private handleRejectAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for rejection'
      });
    }

    const reason = prompt('Enter rejection reason (optional):') || 'Rejected';

    switch (itemType) {
      case 'requisition':
        return this.enaRequisitionService.performAction(item.id, 'REJECT');

      case 'revalidation':
        return this.supplyChainService.performRevalidationAction(item.id, 'REJECT', reason);

      case 'cancellation':
        return this.supplyChainService.performCancellationAction(item.id, 'REJECT', reason);

      case 'transit':
        return this.supplyChainService.performTransitPermitAction(item.id, 'REJECT', reason);

      case 'hologram':
        return this.hologramService.performAction('procurement', Number(item.id), 'reject', reason);

      default:
        return of({
          success: false,
          message: `Rejection not implemented for ${itemType}`
        });
    }
  }

  private handleForwardAction(item: any, itemType: string): Observable<ActionResult> {
    // Forward is typically the same as approve for most workflows
    return this.handleApproveAction(item, itemType);
  }

  private handleVerifyAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for verification'
      });
    }

    switch (itemType) {
      case 'hologram':
        return this.hologramService.performAction('procurement', Number(item.id), 'verify', 'Verified by IT Cell');

      default:
        return of({
          success: false,
          message: `Verification not implemented for ${itemType}`
        });
    }
  }

  private handleIssueAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for issuing'
      });
    }

    switch (itemType) {
      case 'hologram':
        return this.hologramService.performAction('procurement', Number(item.id), 'issue', 'Issued');

      default:
        return of({
          success: false,
          message: `Issue action not implemented for ${itemType}`
        });
    }
  }

  private handleExtendAction(item: any, itemType: string): Observable<ActionResult> {
    // Extend validity - typically for revalidations
    // Since the backend doesn't support EXTEND action, we'll use APPROVE with extend message
    if (itemType === 'revalidation' && item.id) {
      const extendReason = prompt('Enter reason for extending validity:');
      if (!extendReason || !extendReason.trim()) {
        return of({
          success: false,
          message: 'Extension reason is required'
        });
      }

      return this.supplyChainService.performRevalidationAction(item.id, 'APPROVE', `Validity extended: ${extendReason}`);
    }

    return of({
      success: false,
      message: `Extend action not implemented for ${itemType}`
    });
  }

  private handleTerminateAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for termination'
      });
    }

    const reason = prompt('Enter termination reason (required):');
    if (!reason || !reason.trim()) {
      return of({
        success: false,
        message: 'Termination reason is required'
      });
    }

    switch (itemType) {
      case 'transit':
        // Use REJECT action with termination reason for transit permits
        return this.supplyChainService.performTransitPermitAction(item.id, 'REJECT', `Terminated: ${reason}`);

      default:
        return of({
          success: false,
          message: `Termination not implemented for ${itemType}`
        });
    }
  }

  private handlePayAction(item: any, itemType: string): Observable<ActionResult> {
    if (!item.id) {
      return of({
        success: false,
        message: 'Item ID is required for payment'
      });
    }

    switch (itemType) {
      case 'requisition':
        return this.enaRequisitionService.performAction(item.id, 'APPROVE'); // Payment submission

      case 'transit':
        return this.supplyChainService.performTransitPermitAction(item.id, 'PAY', 'Payment submitted');

      case 'hologram':
        return this.hologramService.performAction('procurement', Number(item.id), 'pay', 'Payment completed');

      default:
        // Navigate to payment page within SPA
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'payment-confirmation',
            ref: item.referenceNo,
            type: itemType,
            action: 'pay'
          }
        });

        return of({
          success: true,
          message: 'Navigated to payment page within SPA'
        });
    }
  }

  private handleCancelAction(item: any, itemType: string): Observable<ActionResult> {
    // Navigate to cancellation request within SPA
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'cancellation',
        ref: item.referenceNo,
        type: itemType
      }
    });

    return of({
      success: true,
      message: 'Navigated to cancellation request within SPA'
    });
  }

  private handleViewSlipAction(item: any, itemType: string, context?: string): Observable<ActionResult> {
    const slipRoutes: { [key: string]: string } = {
      'requisition': '/dev-final-requisition-letters',
      'revalidation': '/dev-revalidation-permit-slip',
      'transit': '/dev-final-transit-permit-view',
      'hologram': '/dev-payslip'
    };

    const route = slipRoutes[itemType];
    if (route) {
      this.router.navigate([route], {
        queryParams: {
          ref: item.referenceNo,
          source: context || 'dashboard'
        }
      });

      return of({
        success: true,
        message: `Navigated to ${itemType} slip view`
      });
    }

    return of({
      success: false,
      message: `No slip route defined for ${itemType}`
    });
  }

  private handleDownloadAction(item: any, itemType: string): Observable<ActionResult> {
    // Implement download logic based on item type
    console.log(`Download action for ${itemType}:`, item.referenceNo);

    return of({
      success: true,
      message: `Download initiated for ${item.referenceNo}`
    });
  }

  private handleEditAction(item: any, itemType: string): Observable<ActionResult> {
    // Navigate to edit page based on item type within SPA
    const editRoutes: { [key: string]: string } = {
      'requisition': 'requisition',
      'transit': 'transit-permit',
      'hologram': 'hologram'
    };

    const section = editRoutes[itemType];
    if (section) {
      this.router.navigate(['/dashboard'], {
        queryParams: {
          section: section,
          edit: true,
          ref: item.referenceNo
        }
      });

      return of({
        success: true,
        message: `Navigated to edit ${itemType} within SPA`
      });
    }

    return of({
      success: false,
      message: `Edit not available for ${itemType}`
    });
  }
}