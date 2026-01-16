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
    console.log('📋 ngOnChanges called');
    console.log('📊 Changes:', changes);
    
    if (changes['dataSource']) {
      console.log('📊 DataSource changed');
      console.log('📊 DataSource value:', this.dataSource);
      console.log('📊 DataSource.data:', this.dataSource?.data);
      console.log('📊 DataSource.data length:', this.dataSource?.data?.length);
      
      this.unresolvedObjectionAppIds.clear();

      if (this.dataSource?.data) {
        console.log(`📋 Processing ${this.dataSource.data.length} applications`);
        
        this.dataSource.data.forEach((app, index) => {
          console.log(`📋 Processing app ${index}:`, app);
          const appId = this.getApplicationId(app);
          const appType = app.type || 'license-renewal';
          console.log(`🆔 Application ID for app ${index}:`, appId);
          console.log(`📦 Application Type for app ${index}:`, appType);
          
          if (appId) {
            this.unifiedDashboardService.getObjections(appId).subscribe({
              next: (objections) => {
                const hasUnresolved = objections?.some((obj: Objection) => obj.isResolved === false);
                if (hasUnresolved) {
                  this.unresolvedObjectionAppIds.add(appId);
                  console.log(`⚠️ Found unresolved objections for ${appId}`);
                }
              },
              error: (err) => {
                if (err.status !== 404) {
                  console.error(`❌ Error fetching objections for ${appId}:`, err);
                }
              }
            });
          } else {
            console.warn(`⚠️ No applicationId found for app ${index}:`, app);
          }
        });
      } else {
        console.log('⚠️ No data in dataSource');
      }
    }
    
    if (changes['tableType']) {
      console.log('📊 Table Type changed to:', this.tableType);
    }
  }

  hasData(): boolean {
    const hasData = this.dataSource && 
                    this.dataSource.data && 
                    Array.isArray(this.dataSource.data) && 
                    this.dataSource.data.length > 0;
    
    console.log('✅ hasData check:', hasData);
    console.log('📊 Data count:', this.dataSource?.data?.length || 0);
    
    if (hasData) {
      console.log('📋 First item:', this.dataSource.data[0]);
      console.log('📋 Sample item structure:', JSON.stringify(this.dataSource.data[0], null, 2));
    }
    
    return hasData;
  }

  getApplicationId(element: any): string {
    if (!element) {
      console.warn('⚠️ getApplicationId - element is null/undefined');
      return '';
    }
    
    console.log('🔍 Extracting ID from element:', element);
    console.log('🔑 Element keys:', Object.keys(element));
    
    const directProperties = [
      element.applicationId,
      element.application_id,
      element.id,
      element.app_id,
      element.applicationID,
      element.application_ID
    ];
    
    console.log('🔍 Direct properties found:', directProperties.filter(id => id));
    
    const nestedProperties = [
      element.raw?.application_id,
      element.raw?.applicationId,
      element.raw?.id,
      element.data?.application_id,
      element.data?.applicationId,
      element.data?.id
    ];
    
    console.log('🔍 Nested properties found:', nestedProperties.filter(id => id));
    
    const possibleIds = [...directProperties, ...nestedProperties];
    
    console.log('🔍 All possible IDs:', possibleIds);
    
    const appId = possibleIds.find(id => {
      return id !== null && id !== undefined && id !== '' && String(id).trim() !== '';
    });
    
    if (appId) {
      const finalId = String(appId);
      console.log('✅ Found application ID:', finalId);
      return finalId;
    }
    
    console.error('❌ CRITICAL: Could not find application ID in element');
    console.error('❌ Element type:', element.type);
    console.error('❌ Element keys:', Object.keys(element));
    console.error('❌ Full element:', JSON.stringify(element, null, 2));
    
    return '';
  }

  getCurrentStage(element: any): string {
    const stage = element?.currentStage || 
                  element?.current_stage || 
                  element?.raw?.current_stage || 
                  '';
    console.log('🔍 Current stage:', stage, 'for element:', element);
    return stage;
  }

  isAwaitingPayment(element: any): boolean {
    const stage = this.getCurrentStage(element);
    const isAwaiting = stage === 'awaiting_payment';
    
    if (isAwaiting) {
      console.log('💳 Application is awaiting payment:', this.getApplicationId(element));
    }
    
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
    console.log('💳 Payment clicked for application:', application);
    console.log('💳 Application ID:', this.getApplicationId(application));
    console.log('💳 Table Type:', this.tableType);
    console.log('💳 Current Stage:', this.getCurrentStage(application));
    
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

  // ✅ CRITICAL FIX: Pass tableType to print dialog
  onPrint(application: any) {
    console.log('🖨️ Print clicked for application:', application);
    
    const appId = this.getApplicationId(application);
    const appType = application.type || 'license-renewal';
    
    if (!appId) {
      console.error('❌ No application ID found');
      Swal.fire('Error', 'Could not find application ID', 'error');
      return;
    }
    
    console.log('🔍 Fetching full application details for printing...');
    console.log('📦 App ID:', appId);
    console.log('📦 App Type:', appType);
    console.log('📊 Table Type:', this.tableType); // ✅ NEW LOG
    
    // Fetch the full application details before opening print dialog
    this.unifiedDashboardService.getApplicationDetail(appId, appType).subscribe({
      next: (fullApp) => {
        console.log('✅ Full application loaded:', fullApp);
        console.log('✅ Full app current_stage:', fullApp.current_stage);
        console.log('✅ Full app is_approved:', fullApp.is_approved);
        
        // ✅ CRITICAL FIX: Pass tableType to print dialog
        this.dialog.open(PrintApplicationComponent, {
          width: '450px',
          data: { 
            application: fullApp,
            tableType: this.tableType  // ✅ PASS TABLE TYPE HERE!
          }
        });
      },
      error: (err) => {
        console.error('❌ Error fetching application details:', err);
        Swal.fire('Error', 'Failed to load application details for printing', 'error');
      }
    });
  }
  
  onView(application: any) {
    console.log('👁️ View clicked for application:', application);
    console.log('📊 Application structure:', JSON.stringify(application, null, 2));
    
    const applicationId = this.getApplicationId(application);
    
    if (!applicationId) {
      console.error('❌ CRITICAL: No applicationId found, cannot open view dialog');
      console.error('❌ Full application object:', application);
      return;
    }
    
    console.log('✅ Opening view dialog with ID:', applicationId);
    
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
    
    console.log('✅ Created UnifiedApplication:', unifiedApp);
    
    const dialogRef = this.dialog.open(ViewApplicationComponent, {
      width: '550px',
      maxHeight: '100%',
      data: { unifiedApp: unifiedApp, tableType: this.tableType }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        console.log('🔄 Reloading page after dialog close');
        location.reload();
      }
    });
  }
  
  viewMovement(application: any): void {
    console.log('📊 Movement clicked for application:', application);
    
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