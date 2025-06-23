import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { BaseDependency } from '../../../../base/dependency/base.dependendency';
import { LicenseApplicationService } from '../../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../../base/base.components';
import { ApplyLicenseComponent } from '../../apply-license/apply-license.component';
import { ApplicationMovementComponent } from './application-movement/application-movement.component';
import { ViewApplicationComponent } from './view-application/view-application.component';
import { PrintApplicationComponent } from './print-application/print-application.component';

@Component({
  selector: 'app-application-table',
  imports: [MaterialModule],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})
export class ApplicationTableComponent extends BaseComponent{
  // Input properties to receive data from parent component
  @Input() title!: string;
  @Input() displayedColumns!: string[];
  @Input() dataSource!: MatTableDataSource<any>;
  @Input() tableType!: string;  // For conditional rendering of action buttons

  objections: any[] = [];

  // Output events to notify parent components on certain actions
  @Output() view = new EventEmitter<any>();
  @Output() print = new EventEmitter<any>();
  @Output() payment = new EventEmitter<any>();
  @Output() movement = new EventEmitter<any>();

  constructor(
    public baseDependancy: BaseDependency,
    protected licenseApplicationService: LicenseApplicationService,
    private dialog: MatDialog
  ) { 
    super(baseDependancy); // Calling the parent class constructor
  }

  // Mapping of internal application stages to user-friendly display strings
  stageDisplayMapping: { [key: string]: string } = {
    level_1: 'Under Review by Level 1',
    level_2: 'Under Review by Level 2',
    level_3: 'Under Review by Level 3',
    level_4: 'Under Review by Level 4',
    level_5: 'Under Review by Level 5',
    
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
    licensee: 'Licensee',
  };

  // Angular lifecycle hook that runs when input properties change
  ngOnChanges() {
    // For each application in the data source, check for unresolved objections
    this.dataSource?.data?.forEach(app => {
      this.licenseApplicationService.getObjections(app.application_id).subscribe((objections) => {
        const unresolved = objections?.some(obj => obj.resolved === false);
        app.hasUnresolvedObjection = unresolved;
      });
    });
  }

  // Print the selected application
  onPrint(application: any) {
    this.dialog.open(PrintApplicationComponent, {
      width: '450px',
      data: { application }
    });
  }
  
  // Method to view application details
  onView(application: any) {
    const dialogRef = this.dialog.open(ViewApplicationComponent, {
      width: '800px',
      maxHeight: '100%',
      data: { application, tableType: this.tableType }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // Refresh table or show success notification
        location.reload();
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