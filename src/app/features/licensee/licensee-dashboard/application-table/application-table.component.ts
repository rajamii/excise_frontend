// ================================================================================================
// FILE: features/licensee/licensee-dashboard/application-table/application-table.component.ts
// FIXED VERSION - Routes to correct service based on application type (NLI vs LIC)
// ================================================================================================

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../../base/base.components';
import { ApplicationMovementComponent } from './application-movement/application-movement.component';
import { ReviewApplicationComponent } from '../../../admin/dashboard/application-table/review-application/review-application.component';
import { LicenseApplication, Objection } from '../../../../core/models/license-application.model';
import { isPaymentPending } from '../../../../core/models/dashboard.model';
import { Subject, Observable } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-application-table',
  imports: [MaterialModule],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})
export class ApplicationTableComponent extends BaseComponent implements OnChanges, OnDestroy {
  @Input() title!: string;
  @Input() displayedColumns!: string[];
  @Input() dataSource!: MatTableDataSource<LicenseApplication>;
  @Input() tableType!: string;

  objections: Objection[] = [];
  unresolvedObjectionAppIds: Set<string> = new Set();
  
  private destroy$ = new Subject<void>();

  @Output() view = new EventEmitter<any>();
  @Output() print = new EventEmitter<any>();
  @Output() payment = new EventEmitter<any>();
  @Output() movement = new EventEmitter<any>();
  @Output() refreshData = new EventEmitter<void>();

  constructor(
    public deps: BaseDependency,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    super(deps);
  }

  stageDisplayMapping: Record<string, string> = {
    level_1: 'Under Review by Level 1',
    level_2: 'Under Review by Level 2',
    level_3: 'Under Review by Level 3',
    level_4: 'Under Review by Level 4',
    level_5: 'Under Review by Level 5',
    payment_pending: 'Awaiting Payment',
    awaiting_payment: 'Awaiting Payment',
    level_1_objection: 'Objection Raised by Level 1',
    level_2_objection: 'Objection Raised by Level 2',
    level_3_objection: 'Objection Raised by Level 3',
    level_4_objection: 'Objection Raised by Level 4',
    level_5_objection: 'Objection Raised by Level 5',
    rejected_by_level_1: 'Rejected by Level 1',
    rejected_by_level_2: 'Rejected by Level 2',
    rejected_by_level_3: 'Rejected by Level 3',
    rejected_by_level_4: 'Rejected by Level 4',
    rejected_by_level_5: 'Rejected by Level 5',
    approved: 'Application Approved',
    rejected: 'Application Rejected',
    objection_raised: 'Objection Raised',
    applicant_applied: 'Application Submitted',
  };

  roleDisplayMapping: Record<string, string> = {
    level_1: 'Level 1',
    level_2: 'Level 2',
    level_3: 'Level 3',
    level_4: 'Level 4',
    level_5: 'Level 5',
    licensee: 'Licensee',
  };

  // ============================================================
  // ✅ NEW: Helper methods to detect application type and route to correct service
  // ============================================================

  /**
   * Determines if an application is a New License (NLI/) or Old License (LIC/)
   */
  private isNewLicenseApplication(applicationId: string): boolean {
    return applicationId?.startsWith('NLI/');
  }

  /**
   * Routes to the correct getNextStages method based on application type
   */
  private getNextStagesForApplication(applicationId: string): Observable<any[]> {
    console.log('🔍 Getting next stages for:', applicationId);
    console.log('📋 Application type:', this.isNewLicenseApplication(applicationId) ? 'NEW LICENSE' : 'OLD LICENSE');
    
    return this.isNewLicenseApplication(applicationId)
      ? this.licenseAppService.getNewLicenseNextStages(applicationId)
      : this.licenseAppService.getNextStages(applicationId);
  }

  /**
   * Routes to the correct advanceApplication method based on application type
   */
  private advanceApplicationToStage(
    applicationId: string, 
    stageId: number, 
    contextData: any
  ): Observable<any> {
    console.log('⏭️ Advancing application:', applicationId, 'to stage:', stageId);
    console.log('📋 Application type:', this.isNewLicenseApplication(applicationId) ? 'NEW LICENSE' : 'OLD LICENSE');
    
    return this.isNewLicenseApplication(applicationId)
      ? this.licenseAppService.advanceNewLicenseApplication(applicationId, stageId, contextData)
      : this.licenseAppService.advanceApplication(applicationId, stageId, contextData);
  }

  /**
   * Routes to the correct getObjections method based on application type
   */
  private getObjectionsForApplication(applicationId: string): Observable<any> {
    return this.isNewLicenseApplication(applicationId)
      ? this.licenseAppService.getNewLicenseObjections(applicationId)
      : this.licenseAppService.getObjections(applicationId);
  }

  // ============================================================
  // HELPER METHODS FOR TEMPLATE
  // ============================================================
  
  getApplicationId(element: any): string {
    return element?.application_id || element?.applicationId || element?.id || element?.app_id || '';
  }

  getCurrentStage(element: any): string {
    return element?.current_stage || element?.currentStage || '';
  }

  getNextLevel(element: any): string {
    const currentStage = this.getCurrentStage(element);
    
    const stageToNextLevel: Record<string, string> = {
      'level_1': 'Level 2',
      'level_2': 'Level 3',
      'level_3': 'Level 4',
      'level_4': 'Level 5',
      'level_5': 'Payment',
      'payment_pending': 'Approval',
      'awaiting_payment': 'Approval',
      'approved': 'Completed',
      'rejected': 'Closed',
      'rejected_by_level_1': 'Closed',
      'rejected_by_level_2': 'Closed',
      'rejected_by_level_3': 'Closed',
      'rejected_by_level_4': 'Closed',
      'rejected_by_level_5': 'Closed',
      'level_1_objection': 'Level 1 Review',
      'level_2_objection': 'Level 2 Review',
      'level_3_objection': 'Level 3 Review',
      'level_4_objection': 'Level 4 Review',
      'level_5_objection': 'Level 5 Review',
      'objection_raised': 'Review',
      'applicant_applied': 'Level 1',
    };
    
    return stageToNextLevel[currentStage] || 'N/A';
  }

  getLatestRemarks(element: any): string {
    return element?.latestTransaction?.remarks || 
           element?.latest_transaction?.remarks || 
           element?.remarks || 
           '';
  }

  getPerformedByUsername(element: any): string {
    return element?.latestTransaction?.performedBy?.username ||
           element?.latestTransaction?.performed_by?.username ||
           element?.latest_transaction?.performedBy?.username ||
           element?.latest_transaction?.performed_by?.username ||
           '';
  }

  getPerformedByRole(element: any): string {
    return element?.latestTransaction?.performedBy?.roleName ||
           element?.latestTransaction?.performedBy?.role_name ||
           element?.latestTransaction?.performed_by?.roleName ||
           element?.latestTransaction?.performed_by?.role_name ||
           element?.latest_transaction?.performedBy?.roleName ||
           element?.latest_transaction?.performedBy?.role_name ||
           element?.latest_transaction?.performed_by?.roleName ||
           element?.latest_transaction?.performed_by?.role_name ||
           '';
  }

  getLatestTimestamp(element: any): string {
    return element?.latestTransaction?.timestamp ||
           element?.latest_transaction?.timestamp ||
           '';
  }

  showPaymentButton(element: any): boolean {
    const tableTypeCheck = this.tableType === 'awaitingPayment';
    const paymentPendingCheck = isPaymentPending(element);
    
    return tableTypeCheck && paymentPendingCheck;
  }

  // ============================================================
  // COMPONENT METHODS
  // ============================================================

  private getAppId(app: any): string | undefined {
    return app?.application_id || app?.applicationId || app?.id || app?.app_id;
  }

  hasData(): boolean {
    return !!this.dataSource?.data?.length;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataSource'] && this.dataSource?.data) {
      this.unresolvedObjectionAppIds.clear();
      
      if (Array.isArray(this.dataSource.data) && this.dataSource.data.length > 0) {
        this.loadObjections();
      }
    }
  }

  private loadObjections(): void {
    this.dataSource.data.forEach(app => {
      const appId = this.getAppId(app);
      
      if (!appId) {
        console.warn('Application missing ID:', app);
        return;
      }

      if (this.shouldFetchObjections(app)) {
        // ✅ Use the routing method that detects application type
        this.getObjectionsForApplication(appId)
          .pipe(
            takeUntil(this.destroy$),
            catchError(err => {
              if (err.status === 404) {
                console.log(`No objections found for application ${appId}`);
              } else {
                console.error(`Error fetching objections for ${appId}:`, err);
              }
              return of([]);
            })
          )
          .subscribe({
            next: (objections) => {
              if (Array.isArray(objections) && objections.length > 0) {
                const hasUnresolved = objections.some(obj => obj?.isResolved === false);
                if (hasUnresolved && appId) {
                  this.unresolvedObjectionAppIds.add(appId);
                }
              }
            },
            error: (err) => {
              console.error(`Unexpected error for ${appId}:`, err);
            }
          });
      }
    });
  }

  private shouldFetchObjections(app: LicenseApplication): boolean {
    const currentStage = app.current_stage || (app as any).currentStage;
    
    if (!currentStage) {
      return false;
    }

    const objectionStages = [
      'level_1_objection',
      'level_2_objection',
      'level_3_objection',
      'level_4_objection',
      'level_5_objection',
      'level_1',
      'level_2',
      'level_3',
      'level_4',
      'level_5',
      'objection_raised'
    ];
    
    return objectionStages.includes(currentStage);
  }

  onView(application: any): void {
    const appId = this.getAppId(application);

    if (!appId) {
      console.error('❌ Cannot open dialog - no application ID found!');
      alert('Error: Application ID is missing. Cannot open review dialog.');
      return;
    }

    console.log('👁️ Opening review dialog for application:', appId);

    const dialogRef = this.dialog.open(ReviewApplicationComponent, {
      width: '550px',
      maxHeight: '100%',
      data: { 
        application: application, 
        tableType: this.tableType 
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('🔄 Review dialog closed with result:', result);
      
      if (result?.success) {
        console.log('✅ Action successful:', result.action);
        console.log('📤 Emitting refresh request to dashboard...');
        this.refreshData.emit();
        console.log('✅ Refresh event emitted successfully');
      }
    });
  }

  onPayment(application: any): void {
    console.log('💰 Payment button clicked for application:', application);
    
    const appId = this.getAppId(application);
    
    if (!appId) {
      console.error('❌ Application ID is missing');
      Swal.fire('Error', 'Application ID is missing', 'error');
      return;
    }
    
    console.log('✅ Opening payment confirmation dialog for:', appId);
    this.openPaymentConfirmationDialog(application);
  }

  private openPaymentConfirmationDialog(application: any): void {
    const appId = this.getAppId(application);
    const feeAmount = application.yearly_license_fee || 
                     application.fee_amount || 
                     application.yearlyLicenseFee ||
                     0;
    
    Swal.fire({
      title: 'Confirm Payment Receipt',
      html: `
        <div style="text-align: center; padding: 30px 20px;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="margin: 0 0 15px 0; color: #1C2B78; font-size: 18px;">Application Details</h4>
            <p style="margin: 8px 0; font-size: 15px;"><strong>Application ID:</strong> ${appId}</p>
            <p style="margin: 8px 0; font-size: 15px;"><strong>Fee Amount:</strong> <span style="color: #28a745; font-weight: 600;">₹${feeAmount}</span></p>
          </div>
          
          <div style="margin-top: 25px;">
            <mat-icon style="font-size: 48px; color: #ff9800; margin-bottom: 15px;">help_outline</mat-icon>
            <h3 style="margin: 15px 0; color: #333; font-size: 20px; font-weight: 600;">Has the payment been received?</h3>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">Please confirm if the license fee payment has been received for this application.</p>
          </div>
        </div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: '<i class="fas fa-check"></i> Yes - Received',
      denyButtonText: '<i class="fas fa-times"></i> No - Not Received',
      cancelButtonText: 'Cancel',
      width: '650px',
      padding: '0',
      customClass: {
        popup: 'swal2-custom-popup',
        confirmButton: 'swal2-confirm-custom',
        denyButton: 'swal2-deny-custom',
        cancelButton: 'swal2-cancel-custom'
      },
      buttonsStyling: false,
      didOpen: () => {
        const style = document.createElement('style');
        style.innerHTML = `
          .swal2-custom-popup { border-radius: 12px !important; }
          .swal2-confirm-custom {
            background-color: #28a745 !important; color: white !important;
            padding: 12px 30px !important; border-radius: 6px !important;
            font-weight: 600 !important; font-size: 15px !important;
            border: none !important; margin: 0 8px !important;
            min-width: 150px !important; cursor: pointer !important;
          }
          .swal2-confirm-custom:hover {
            background-color: #218838 !important; transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3) !important;
          }
          .swal2-deny-custom {
            background-color: #dc3545 !important; color: white !important;
            padding: 12px 30px !important; border-radius: 6px !important;
            font-weight: 600 !important; font-size: 15px !important;
            border: none !important; margin: 0 8px !important;
            min-width: 150px !important; cursor: pointer !important;
          }
          .swal2-deny-custom:hover {
            background-color: #c82333 !important; transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3) !important;
          }
          .swal2-cancel-custom {
            background-color: #6c757d !important; color: white !important;
            padding: 12px 30px !important; border-radius: 6px !important;
            font-weight: 600 !important; font-size: 15px !important;
            border: none !important; margin: 0 8px !important; cursor: pointer !important;
          }
          .swal2-cancel-custom:hover {
            background-color: #5a6268 !important; transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3) !important;
          }
          .swal2-actions { margin-top: 30px !important; padding: 0 20px 30px !important; }
        `;
        document.head.appendChild(style);
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.approvePaymentAndAdvanceStage(appId!, application);
      } else if (result.isDenied) {
        Swal.fire({
          icon: 'info',
          title: 'Payment Not Confirmed',
          text: 'The application will remain in "Awaiting Payment" status.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#1C2B78'
        });
      }
    });
  }

  // ✅ FIXED: Now routes to correct service based on application type
  private approvePaymentAndAdvanceStage(applicationId: string, application: any): void {
    Swal.fire({
      title: 'Processing...',
      html: 'Approving payment and advancing application',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // ✅ Use routing method that automatically detects application type
    this.getNextStagesForApplication(applicationId).subscribe({
      next: (stages: any[]) => {
        console.log('📋 Available next stages:', stages);
        
        const approvedStage = stages.find(s => 
          s.name === 'approved' || 
          s.name.toLowerCase().includes('approved')
        );
        
        if (!approvedStage) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not find approved stage in workflow',
            confirmButtonText: 'OK'
          });
          return;
        }
        
        console.log('✅ Found approved stage:', approvedStage);
        
        const contextData = {
          fee_paid: true,
          payment_confirmed: true,
          remarks: 'Payment received and confirmed'
        };
        
        // ✅ Use routing method that automatically detects application type
        this.advanceApplicationToStage(applicationId, approvedStage.id, contextData)
          .subscribe({
            next: (response: any) => {
              console.log('✅ Application advanced to approved:', response);
              
              Swal.fire({
                icon: 'success',
                title: 'Payment Approved!',
                html: `
                  <p>Payment has been confirmed and the application has been approved.</p>
                  <p><strong>Application ID:</strong> ${applicationId}</p>
                  <p><strong>New Status:</strong> Approved</p>
                `,
                confirmButtonText: 'OK'
              }).then(() => {
                this.refreshData.emit();
              });
            },
            error: (error: any) => {
              console.error('❌ Failed to advance application:', error);
              
              const errorMessage = error?.error?.detail || 
                                 error?.error?.message || 
                                 error?.message ||
                                 'Failed to approve payment. Please try again.';
              
              Swal.fire({
                icon: 'error',
                title: 'Approval Failed',
                text: errorMessage,
                confirmButtonText: 'OK'
              });
            }
          });
      },
      error: (error: any) => {
        console.error('❌ Failed to fetch next stages:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch workflow stages',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  viewMovement(application: any): void {
    const appId = this.getAppId(application);
    
    if (!appId) {
      console.error('Cannot view movement: application ID is missing');
      return;
    }

    console.log('📊 Opening movement dialog for application:', appId);

    this.dialog.open(ApplicationMovementComponent, {
      width: '70vw',
      maxWidth: '100%',
      height: 'auto',
      data: {
        movementDataSource: new MatTableDataSource([application])
      }
    });
  }

  override ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    super.ngOnDestroy();
  }
}