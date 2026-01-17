// application-table.component.ts - FIXED VERSION
import { Component, Input, Output, EventEmitter, OnChanges, ViewChild, AfterViewInit, SimpleChanges } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { LicenseApplicationService } from '../../../../core/services/license-application.service';
import { UnifiedDashboardService } from '../../../../core/services/unified-dashboard.service';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ApplicationMovementComponent } from './application-movement/application-movement.component';
import { ViewApplicationComponent } from './view-application/view-application.component';
import { PrintApplicationComponent } from './print-application/print-application.component';
import { Objection } from '../../../../core/models/license-application.model';
import { UnifiedApplication } from '../../../../core/models/unified-application.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-application-table',
  imports: [MaterialModule],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})
export class ApplicationTableComponent implements OnChanges, AfterViewInit {
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
    if (this.dataSource) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
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
    private unifiedDashboardService: UnifiedDashboardService,
    private dialog: MatDialog
  ) { }

  ngOnChanges(changes: SimpleChanges) {

    if (changes['dataSource']) {
      this.unresolvedObjectionAppIds.clear();
      if (this.dataSource?.data) {
        this.dataSource.data.forEach((app, index) => {
          const appId = this.getApplicationId(app);
          if (appId) {
            this.unifiedDashboardService.getObjections(appId).subscribe({
              next: (objections) => {
                const hasUnresolved = objections?.some((obj: Objection) => obj.isResolved === false);
                if (hasUnresolved) {
                  this.unresolvedObjectionAppIds.add(appId);
                }
              },
              error: (err) => {
                if (err.status !== 404) {
                  console.error(`Error fetching objections for ${appId}:`, err);
                }
              }
            });
          } else {
            console.warn(`No applicationId found for app ${index}:`, app);
          }
        });
      } else {
        console.log('No data in dataSource'); // Debug log
      }
    }
  }

  hasData(): boolean {
    const hasData = this.dataSource &&
      this.dataSource.data &&
      Array.isArray(this.dataSource.data) &&
      this.dataSource.data.length > 0;
    return hasData;
  }

  getApplicationId(element: any): string {
    if (!element) {
      console.warn('Application ID is missing: null or undefined'); // WARN LOG
      return '';
    }

    const directProperties = [
      element.applicationId,
      element.application_id,
      element.id,
      element.app_id,
      element.applicationID,
      element.application_ID
    ];

    const nestedProperties = [
      element.raw?.application_id,
      element.raw?.applicationId,
      element.raw?.id,
      element.data?.application_id,
      element.data?.applicationId,
      element.data?.id
    ];

    const possibleIds = [...directProperties, ...nestedProperties];

    const appId = possibleIds.find(id => {
      return id !== null && id !== undefined && id !== '' && String(id).trim() !== '';
    });

    if (appId) {
      const finalId = String(appId);
      return finalId;
    }
    return '';
  }

  getCurrentStage(element: any): string {
    const stage = element?.currentStage ||
      element?.current_stage ||
      element?.raw?.current_stage ||
      '';
    return stage;
  }

  isAwaitingPayment(element: any): boolean {
    const stage = this.getCurrentStage(element);
    const isAwaiting = stage === 'awaiting_payment';
    return isAwaiting;
  }

  getLatestRemarks(element: any): string {
    const transactions = element?.transactions || element?.raw?.transactions || [];
    if (transactions.length > 0) {
      return transactions[0]?.remarks || '-';
    }
    return '-';
  }

  getPerformedByUsername(element: any): string {
    const transactions = element?.transactions || element?.raw?.transactions || [];
    if (transactions.length > 0) {
      return transactions[0]?.performed_by_username || transactions[0]?.performedByUsername || 'Unknown';
    }
    return 'Unknown';
  }

  getPerformedByRole(element: any): string {
    const transactions = element?.transactions || element?.raw?.transactions || [];
    if (transactions.length > 0) {
      return transactions[0]?.performed_by_role || transactions[0]?.performedByRole || 'unknown';
    }
    return 'unknown';
  }

  getLatestTimestamp(element: any): string | null {
    const transactions = element?.transactions || element?.raw?.transactions || [];
    if (transactions.length > 0) {
      return transactions[0]?.timestamp || null;
    }
    return null;
  }

  onPayment(application: any): void {
    this.payment.emit(application);
  }

  // FIXED: Updated labels
  getTypeLabel(type: string): string {
    switch (type) {
      case 'license-renewal': return 'License Renewal';
      case 'new-license': return 'New License';
      case 'salesman-barman': return 'Salesman/Barman';
      default: return type;
    }
  }

  // Pass tableType to print dialog
  onPrint(application: any) {
    const appId = this.getApplicationId(application);
    const appType = application.type || 'license-renewal';

    if (!appId) {
      console.error('No application ID found');
      Swal.fire('Error', 'Could not find application ID', 'error');
      return;
    }

    // Fetch the full application details before opening print dialog
    this.unifiedDashboardService.getApplicationDetail(appId, appType).subscribe({
      next: (fullApp) => {
        // Pass tableType to print dialog
        this.dialog.open(PrintApplicationComponent, {
          width: '450px',
          data: {
            application: fullApp,
            tableType: this.tableType
          }
        });
      },
      error: (err) => {
        console.error('Error fetching application details:', err);
        Swal.fire('Error', 'Failed to load application details for printing', 'error');
      }
    });
  }

  onView(application: any) {
    const applicationId = this.getApplicationId(application);

    if (!applicationId) {
      console.error('CRITICAL: No applicationId found, cannot open view dialog');
      console.error('Full application object:', application);
      return;
    }

    const unifiedApp: UnifiedApplication = {
      type: application.type || 'license-renewal',
      applicationId: applicationId,
      currentStage: this.getCurrentStage(application),
      currentStageName: application.currentStageName ||
        application.current_stage_name ||
        application.raw?.current_stage_name ||
        'Unknown',
      isApproved: application.isApproved ??
        application.is_approved ??
        application.raw?.is_approved ??
        false,
      establishmentName: application.establishmentName ||
        application.establishment_name ||
        application.raw?.establishment_name ||
        null,
      applicantFullName: application.applicantFullName ||
        application.applicant_name ||
        application.raw?.applicant_name ||
        application.member_name ||
        application.raw?.member_name ||
        'N/A',
      mobileNumber: application.mobileNumber ||
        application.mobile_number ||
        application.raw?.mobile_number ||
        '',
      email: application.email ||
        application.emailId ||
        application.email_id ||
        application.raw?.email ||
        '',
      licenseCategoryName: application.licenseCategoryName ||
        application.license_category_name ||
        application.raw?.license_category_name ||
        'N/A',
      siteDistrictName: application.siteDistrictName ||
        application.site_district_name ||
        application.raw?.site_district_name ||
        'N/A',
      transactions: application.transactions || application.raw?.transactions || [],
      raw: application.raw || application
    };

    const dialogRef = this.dialog.open(ViewApplicationComponent, {
      width: '550px',
      maxHeight: '100%',
      data: { unifiedApp: unifiedApp, tableType: this.tableType }
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