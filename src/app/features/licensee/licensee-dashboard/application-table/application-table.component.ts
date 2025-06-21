import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationStage } from '../../../../core/models/dashboard.model';
import Swal from 'sweetalert2';
import { BaseDependency } from '../../../../base/dependency/base.dependendency';
import { LicenseApplicationService } from '../../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../../base/base.components';
import { ApplyLicenseComponent } from '../../apply-license/apply-license.component';
import { ApplicationMovementComponent } from '../application-movement/application-movement.component';
import { ViewApplicationComponent } from './view-application/view-application.component';

@Component({
  selector: 'app-application-table',
  imports: [MaterialModule],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})
export class ApplicationTableComponent extends BaseComponent{
  @Input() title!: string;
  @Input() displayedColumns!: string[];
  @Input() dataSource!: MatTableDataSource<any>;
  @Input() tableType!: string;  // For conditional rendering of action buttons
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
    super(baseDependancy); // Calling the parent class constructor
  }

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

  ngOnChanges() {
    this.dataSource?.data?.forEach(app => {
      this.licenseApplicationService.getObjections(app.application_id).subscribe((objections) => {
        const unresolved = objections?.some(obj => obj.resolved === false);
        app.hasUnresolvedObjection = unresolved;
      });
    });
  }

  onPrint(application: ApplicationStage): void {
    Swal.fire({
      title: '<span style="font-size: 23px;">Print License</span>',
      html: `
      <div style="margin-top: 10px; color: red; font-size: 16px;">
      The printing of license is limited to 5 nos, if lost a duplicate copy can be printed only after payment of Rs. 500/- per copy.
      </div>
      <div style="margin-top: 20px; font-size: 16px;">
      No. of times license printed by licensee : <!-- {application.print_count ?? 0}-->
      </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Print License',
      cancelButtonText: 'Close',
      confirmButtonColor: '#007bff', // Bootstrap primary blue
      cancelButtonColor: '#6c757d',   // Bootstrap secondary gray
      focusConfirm: false,
      showCloseButton: true,
      customClass: {
        popup: 'swal2-print-dialog'
      }
    }).then(result => {
      if (result.isConfirmed) {
        // Call your print logic here
        this.licenseApplicationService.printLicense(application.id).subscribe({
          next: () => {
            Swal.fire('Printed!', 'License printed successfully.', 'success');
          },
          error: () => {
            Swal.fire('Error', 'Failed to print the license.', 'error');
          }
        });
      }
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