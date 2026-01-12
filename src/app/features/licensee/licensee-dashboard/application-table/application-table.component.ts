import { Component, Input, Output, EventEmitter, OnChanges, ViewChild, AfterViewInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { LicenseApplicationService } from '../../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ApplicationMovementComponent } from './application-movement/application-movement.component';
import { ViewApplicationComponent } from './view-application/view-application.component';
import { PrintApplicationComponent } from './print-application/print-application.component';
import { LicenseApplication, Objection } from '../../../../core/models/license-application.model';
import { UnifiedApplication } from '../../../../core/models/unified-application.model';

@Component({
  selector: 'app-application-table',
  imports: [MaterialModule],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})
export class ApplicationTableComponent implements OnChanges {
  @Input() dataSource!: MatTableDataSource<any>
  @Input() displayedColumns!: string[];
  
  @Input() tableType!: string;

  objections: Objection[] = [];
  unresolvedObjectionAppIds: Set<string> = new Set();

  @Output() view = new EventEmitter<any>();
  @Output() print = new EventEmitter<any>();
  @Output() payment = new EventEmitter<any>();
  @Output() movement = new EventEmitter<any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

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

  roleDisplayMapping: { [key: string]: string } = {
    level_1: 'Level 1',
    level_2: 'Level 2',
    level_3: 'Level 3',
    level_4: 'Level 4',
    level_5: 'Level 5',
    licensee: 'Licensee',
  };

  constructor(
    protected licenseAppService: LicenseApplicationService,
    private dialog: MatDialog
  ) { }

  ngOnChanges() {
    this.unresolvedObjectionAppIds.clear();

    this.dataSource?.data?.forEach(app => {
      // ✅ FIXED Line 79: Use application_id
      this.licenseAppService.getObjections(app.application_id!).subscribe((objections) => {
        const hasUnresolved = objections?.some(obj => obj.isResolved === false);
        if (hasUnresolved) {
          // ✅ FIXED Line 82: Use application_id
          this.unresolvedObjectionAppIds.add(app.application_id!);
        }
      });
    });
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'license-renewal': return 'License Renewal';
      case 'new-license': return 'New License';
      case 'salesman-barman': return 'Salesman/Barman';
      default: return type;
    }
  }

  onPrint(application: any) {
    this.dialog.open(PrintApplicationComponent, {
      width: '450px',
      data: { application }
    });
  }
  
  onView(application: UnifiedApplication) {
    const dialogRef = this.dialog.open(ViewApplicationComponent, {
      width: '550px',
      maxHeight: '100%',
      data: { application, tableType: this.tableType }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        location.reload();
      }
    });
  }
  
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