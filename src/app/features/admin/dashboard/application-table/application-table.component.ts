import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../../base/base.components';
import { ApplicationMovementComponent } from './application-movement/application-movement.component';
import { ReviewApplicationComponent } from './review-application/review-application.component';
import { LicenseApplication, Objection } from '../../../../core/models/license-application.model';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

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
    private dialog: MatDialog
  ) {
    super(deps);
  }

  stageDisplayMapping: Record<string, string> = {
    level_1: 'Under Review by Level 1',
    level_2: 'Under Review by Level 2',
    level_3: 'Under Review by Level 3',
    level_4: 'Under Review by Level 4',
    level_5: 'Under Review by Level 5',
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
  // HELPER METHODS FOR TEMPLATE
  // ============================================================
  
  getApplicationId(element: any): string {
    return element?.application_id || element?.applicationId || element?.id || element?.app_id || '';
  }

  getCurrentStage(element: any): string {
    return element?.current_stage || element?.currentStage || '';
  }

  // ✅ NEW: Get next level based on current stage
  getNextLevel(element: any): string {
    const currentStage = this.getCurrentStage(element);
    
    const stageToNextLevel: Record<string, string> = {
      'level_1': 'Level 2',
      'level_2': 'Level 3',
      'level_3': 'Level 4',
      'level_4': 'Level 5',
      'level_5': 'Approval',
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
        this.licenseAppService.getObjections(appId)
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