import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { LicenseApplicationService } from '../../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationMovementComponent } from './application-movement/application-movement.component';
import { ViewApplicationComponent } from './view-application/view-application.component';
import { PrintApplicationComponent } from './print-application/print-application.component';
import { LicenseApplication, Objection } from '../../../../core/models/license-application.model';

@Component({
  selector: 'app-application-table',
  imports: [MaterialModule],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})
export class ApplicationTableComponent implements OnChanges {
  // Input properties to receive data from parent component
  @Input() title!: string;
  @Input() displayedColumns!: string[];
  @Input() dataSource!: MatTableDataSource<any>;
  @Input() tableType!: string;  // For conditional rendering of action buttons

  objections: Objection[] = [];
  unresolvedObjectionAppIds: Set<string> = new Set();

  // Output events to notify parent components on certain actions
  @Output() view = new EventEmitter<any>();
  @Output() print = new EventEmitter<any>();
  @Output() payment = new EventEmitter<any>();
  @Output() movement = new EventEmitter<any>();

  constructor(
    protected licenseAppService: LicenseApplicationService,
    private dialog: MatDialog
  ) { }

  // Mapping of internal application stages to user-friendly display strings
  stageDisplayMapping: { [key: string]: string } = {
    level_1: 'Under Review by Level 1',
    level_2: 'Under Review by Level 2',
    level_3: 'Under Review by Level 3',
    level_4: 'Under Review by Level 4',
    level_5: 'Under Review by Level 5',

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
    rejected: 'Application Rejected'
  };

  // Mapping for displaying roles
  roleDisplayMapping: { [key: string]: string } = {
    level_1: 'Level 1',
    level_2: 'Level 2',
    level_3: 'Level 3',
    level_4: 'Level 4',
    level_5: 'Level 5',
    licensee: 'Licensee',
  };

  // Angular lifecycle hook that runs when input properties change
  ngOnChanges() {
    this.unresolvedObjectionAppIds.clear();

    this.dataSource?.data?.forEach(app => {
      // Safely get applicationId from both old and new applications
      const appId = app.applicationId || app.id;

      if (!appId) return;

      // Choose correct service based on applicationType
      const serviceCall = app.applicationType === 'new'
        ? this.licenseAppService.getNewLicenseObjections(appId)
        : this.licenseAppService.getObjections(appId);

      serviceCall.subscribe((objections: any[]) => {
        const hasUnresolved = objections?.some(obj => obj.isResolved === false);
        if (hasUnresolved) {
          this.unresolvedObjectionAppIds.add(appId);
        }
      });
    });
  }

  // Print the selected application
  onPrint(application: any) {
    const appId = application.applicationId || application.id;

    this.dialog.open(PrintApplicationComponent, {
      width: '450px',
      data: { application, applicationId: appId }
    });
  }

  // Method to view application details
  onView(application: any) {
    const appId = application.applicationId || application.id;

    const dialogRef = this.dialog.open(ViewApplicationComponent, {
      width: '550px',
      maxHeight: '100%',
      data: {
        application,
        tableType: this.tableType,
        applicationId: appId  // ← ensure detail page gets correct ID
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        location.reload();
      }
    });
  }
  // Opens a dialog to show the movement history of the selected application
  viewMovement(application: any) {
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