import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationStage } from '../../../../core/models/dashboard.model';
import { BaseDependency } from '../../../../base/dependency/base.dependendency';
import { LicenseApplicationService } from '../../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../../base/base.components';
import { SiteEnquiryFormComponent } from './site-enquiry-form/site-enquiry-form.component';
import { ApplicationMovementComponent } from './application-movement/application-movement.component';
import { ReviewApplicationComponent } from './review-application/review-application.component';

@Component({
  selector: 'app-application-table',
  imports: [MaterialModule],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})

export class ApplicationTableComponent extends BaseComponent {
  @Input() title!: string;
  @Input() displayedColumns!: string[];
  @Input() dataSource!: MatTableDataSource<any>;
  @Input() tableType!: string;
  objections: any[] = [];

  @Output() view = new EventEmitter<any>();
  @Output() print = new EventEmitter<any>();
  @Output() payment = new EventEmitter<any>();
  @Output() movement = new EventEmitter<any>();

  constructor(
    public baseDependancy: BaseDependency,
    protected licenseApplicationService: LicenseApplicationService,
    private dialog: MatDialog
  ) {
    super(baseDependancy);
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
  };

  roleDisplayMapping: Record<string, string> = {
    level_1: 'Level 1',
    level_2: 'Level 2',
    level_3: 'Level 3',
    level_4: 'Level 4',
    level_5: 'Level 5',
    licensee: 'Licensee',
  };

  hasData(): boolean {
    return !!this.dataSource?.data?.length;
  }

  ngOnChanges() {
    this.dataSource?.data?.forEach(app => {
      this.licenseApplicationService.getObjections(app.application_id).subscribe((objections) => {
        const unresolved = objections?.some(obj => obj.resolved === false);
        app.hasUnresolvedObjection = unresolved;
      });
    });
  }

  onView(application: ApplicationStage): void {
    const dialogRef = this.dialog.open(ReviewApplicationComponent, {
      width: '800px',
      maxHeight: '100%',
      data: { application, tableType: this.tableType }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Emit event instead of reloading
        this.view.emit(application);
      }
    });
  }

  viewMovement(application: ApplicationStage): void {
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