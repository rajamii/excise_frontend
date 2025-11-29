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
  // Input properties to receive data from parent component
  @Input() title!: string;
  @Input() displayedColumns!: string[];
  @Input() dataSource!: MatTableDataSource<LicenseApplication>;
  @Input() tableType!: string; // For conditional rendering of action buttons

  objections: Objection[] = [];
  unresolvedObjectionAppIds: Set<string> = new Set();
  
  // Subject for managing subscriptions
  private destroy$ = new Subject<void>();

  // Output events to notify parent components on certain actions
  @Output() view = new EventEmitter<any>();
  @Output() print = new EventEmitter<any>();
  @Output() payment = new EventEmitter<any>();
  @Output() movement = new EventEmitter<any>();

  constructor(
    public deps: BaseDependency,
    private dialog: MatDialog
  ) {
    super(deps);
  }

  // Mapping of internal application stages to user-friendly display strings
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
  };

  // Mapping for displaying roles
  roleDisplayMapping: Record<string, string> = {
    level_1: 'Level 1',
    level_2: 'Level 2',
    level_3: 'Level 3',
    level_4: 'Level 4',
    level_5: 'Level 5',
    licensee: 'Licensee',
  };

  // Utility method to check if the table has any data to display
  hasData(): boolean {
    return !!this.dataSource?.data?.length;
  }

  // Angular lifecycle hook that runs when input properties change
  ngOnChanges(changes: SimpleChanges): void {
    // Only process if dataSource actually changed and has data
    if (changes['dataSource'] && this.dataSource?.data) {
      this.unresolvedObjectionAppIds.clear();
      
      // Safety check: ensure data is an array and has length
      if (Array.isArray(this.dataSource.data) && this.dataSource.data.length > 0) {
        this.loadObjections();
      }
    }
  }

  // Separate method to load objections with proper error handling
  private loadObjections(): void {
    this.dataSource.data.forEach(app => {
      // Safety check: ensure application has an ID
      if (!app?.applicationId) {
        console.warn('Application missing applicationId:', app);
        return;
      }

      // Only fetch objections if application is in a state where they might exist
      if (this.shouldFetchObjections(app)) {
        this.licenseAppService.getObjections(app.applicationId)
          .pipe(
            takeUntil(this.destroy$),
            catchError(err => {
              // Handle 404 errors silently (no objections found)
              if (err.status === 404) {
                console.log(`No objections found for application ${app.applicationId}`);
              } else {
                console.error(`Error fetching objections for ${app.applicationId}:`, err);
              }
              // Return empty array on error
              return of([]);
            })
          )
          .subscribe({
            next: (objections) => {
              // Safety check: ensure objections is an array
              if (Array.isArray(objections) && objections.length > 0) {
                const hasUnresolved = objections.some(obj => obj?.isResolved === false);
                if (hasUnresolved) {
                  this.unresolvedObjectionAppIds.add(app.applicationId);
                }
              }
            },
            error: (err) => {
              // This shouldn't be reached due to catchError, but just in case
              console.error(`Unexpected error for ${app.applicationId}:`, err);
            }
          });
      }
    });
  }

  // Helper method to determine if objections should be fetched
  private shouldFetchObjections(app: LicenseApplication): boolean {
    // Only fetch objections if application is in a state where they might exist
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
      'level_5'
    ];
    
    return objectionStages.includes(app.currentStage);
  }

  // Method to view application details
  onView(application: any): void {
    const dialogRef = this.dialog.open(ReviewApplicationComponent, {
      width: '550px',
      maxHeight: '100%',
      data: { application, tableType: this.tableType }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.view.emit(application);
      }
    });
  }

  // Opens a dialog to show the movement history of the selected application
  viewMovement(application: any): void {
    this.dialog.open(ApplicationMovementComponent, {
      width: '70vw',
      maxWidth: '100%',
      height: 'auto',
      data: {
        movementDataSource: new MatTableDataSource([application])
      }
    });
  }

  // Cleanup subscriptions on component destroy - ADDED override modifier
  override ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    super.ngOnDestroy();
  }
}