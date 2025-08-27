import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { BaseDependency } from '../../../../base/dependency/base.dependency';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../../base/base.components';
import { ApplicationMovementComponent } from './application-movement/application-movement.component';
import { ReviewApplicationComponent } from './review-application/review-application.component';
import { LicenseApplication, Objection } from '../../../../core/models/license-application.model';

@Component({
  selector: 'app-application-table',
  imports: [MaterialModule],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})

export class ApplicationTableComponent extends BaseComponent implements OnChanges{
  // Input properties to receive data from parent component
  @Input() title!: string;
  @Input() displayedColumns!: string[];
  @Input() dataSource!: MatTableDataSource<LicenseApplication>;
  @Input() tableType!: string; // For conditional rendering of action buttons

  objections: Objection[] = [];
  unresolvedObjectionAppIds: Set<string> = new Set();

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
  ngOnChanges() {
    this.unresolvedObjectionAppIds.clear();

    this.dataSource?.data?.forEach(app => {
      this.licenseAppService.getObjections(app.applicationId).subscribe((objections) => {
        const hasUnresolved = objections?.some(obj => obj.isResolved === false);
        if (hasUnresolved) {
          this.unresolvedObjectionAppIds.add(app.applicationId);
        }
      });
    });
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
}