// ================================================================================================
// FILE: features/licensee/licensee-dashboard/licensee-dashboard.component.ts
// FIXED VERSION - Proper refresh handling for payment approvals
// ================================================================================================

import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module'; 
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationStatus, DashboardCount } from '../../../core/models/dashboard.model';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationTableComponent } from './application-table/application-table.component';
import { LicenseApplication } from '../../../core/models/license-application.model';
import { of, forkJoin } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

type ApplicationType = 'license' | 'new_license';

interface ApplicationTypeOption {
  value: ApplicationType;
  label: string;
}

@Component({
  selector: 'app-licensee-dashboard', 
  standalone: true, 
  imports: [ 
    MaterialModule, 
    ApplicationTableComponent 
  ],
  templateUrl: './licensee-dashboard.component.html',
  styleUrl: './licensee-dashboard.component.scss'   
})
export class LicenseeDashboardComponent implements OnInit {
  dashboardCounts: DashboardCount = { 
    applied: 0, 
    pending: 0, 
    approved: 0, 
    rejected: 0,
    awaitingPayment: 0
  };

  appliedApplications: ApplicationStatus[] = [];
  pendingApplications: ApplicationStatus[] = [];
  approvedApplications: ApplicationStatus[] = [];
  rejectedApplications: ApplicationStatus[] = [];
  awaitingPaymentApplications: ApplicationStatus[] = [];

  selectedApplicationType: ApplicationType = 'license';
  applicationTypes: ApplicationTypeOption[] = [
    { value: 'license', label: 'License Application' },
    { value: 'new_license', label: 'New License Application' }
  ];

  isLoading = false;

  constructor(
    protected licenseAppService: LicenseApplicationService,
    private dialog: MatDialog
  ) { }

  appliedDataSource = new MatTableDataSource<LicenseApplication>();
  pendingDataSource = new MatTableDataSource<LicenseApplication>();
  approvedDataSource = new MatTableDataSource<LicenseApplication>();
  rejectedDataSource = new MatTableDataSource<LicenseApplication>();
  awaitingPaymentDataSource = new MatTableDataSource<LicenseApplication>();
  
  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];

  activeTable: 'default' | 'applied' | 'pending' | 'approved' | 'rejected' | 'awaitingPayment' = 'default';

  showTable(table: 'applied' | 'pending' | 'approved' | 'rejected' | 'awaitingPayment') {
    this.activeTable = table;
  }

  goBack() {
    this.activeTable = 'default';
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  onApplicationTypeChange(): void {
    this.activeTable = 'default';
    this.loadDashboardData();
  }

  // ✅ NEW: Public refresh method that can be called from child components
  refreshDashboard(): void {
    console.log('🔄 Dashboard refresh triggered from child component');
    this.loadDashboardData();
  }

  /**
   * ✅ MAIN LOADING METHOD
   */
  loadDashboardData(): void {
    console.log('📥 Loading dashboard data for:', this.selectedApplicationType);
    this.isLoading = true;

    const countsObservable = this.getCountsObservable();
    const applicationsObservable = this.getApplicationsObservable();

    forkJoin({
      counts: countsObservable,
      applications: applicationsObservable
    })
    .pipe(
      finalize(() => {
        this.isLoading = false;
      })
    )
    .subscribe({
      next: (result) => {
        console.log('📊 Backend response:', result);
        
        // Extract all applications
        const allApplications = [
          ...(result.applications.applied || []),
          ...(result.applications.pending || []),
          ...(result.applications.approved || []),
          ...(result.applications.rejected || []),
          ...(result.applications.objection || [])
        ];
        
        console.log(`📦 Total applications: ${allApplications.length}`);
        
        // ✅ CRITICAL: Stage 23 is payment_pending
        // Backend returns stage ID (23) instead of stage name
        const paymentPendingApps = allApplications.filter(app => {
          const stageId = this.getStageIdFromApp(app);
          const isPaymentPending = stageId === 23; // ✅ Stage 23 = payment_pending
          
          if (isPaymentPending) {
            console.log(`💰 Found payment_pending app: ${app.applicationId || app.application_id}`);
          }
          
          return isPaymentPending;
        });
        
        console.log(`💰 Total payment_pending apps: ${paymentPendingApps.length}`);
        
        // ✅ Calculate actual pending count (excluding payment_pending)
        const actualPendingApps = (result.applications.pending || []).filter((app: any) => {
          const stageId = this.getStageIdFromApp(app);
          return stageId !== 23; // Exclude payment_pending from pending
        });
        
        // ✅ NEW: Also check if approved apps have stage ID for approved (get from backend)
        const actualApprovedApps = result.applications.approved || [];
        console.log('✅ Approved apps count:', actualApprovedApps.length);
        
        // Update dashboard counts
        this.dashboardCounts = {
          applied: result.counts.applied || 0,
          pending: actualPendingApps.length, // ✅ Use filtered count
          approved: actualApprovedApps.length, // ✅ Use actual count from data
          rejected: result.counts.rejected || 0,
          awaitingPayment: paymentPendingApps.length
        };
        
        console.log('✅ Dashboard counts:', this.dashboardCounts);
        console.log('📊 Breakdown:', {
          backendPendingCount: result.counts.pending,
          actualPendingCount: actualPendingApps.length,
          paymentPendingCount: paymentPendingApps.length,
          approvedCount: actualApprovedApps.length,
          stage23Apps: paymentPendingApps.map(a => a.application_id || a.applicationId)
        });
        
        // Update data sources
        this.updateDataSources(result.applications, paymentPendingApps);
      },
      error: (error) => {
        console.error('❌ Error loading dashboard data:', error);
        this.dashboardCounts = { 
          applied: 0, 
          pending: 0, 
          approved: 0, 
          rejected: 0,
          awaitingPayment: 0
        };
        this.clearDataSources();
      }
    });
  }

  /**
   * ✅ GET STAGE ID FROM APPLICATION
   * Backend returns stage as ID number (23), not stage name
   */
  private getStageIdFromApp(app: any): number | null {
    // Try different possible locations for stage ID
    const stageId = app.currentStage || 
                    app.current_stage || 
                    app.stageId || 
                    app.stage_id ||
                    app.stage?.id ||
                    app.workflow?.currentStage ||
                    null;
    
    return typeof stageId === 'number' ? stageId : null;
  }

  /**
   * ✅ GET COUNTS OBSERVABLE
   */
  private getCountsObservable() {
    switch (this.selectedApplicationType) {
      case 'license':
        return this.licenseAppService.getDashboardCounts().pipe(
          catchError(err => {
            console.error('Failed to fetch license application counts:', err);
            return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      case 'new_license':
        return this.licenseAppService.getNewLicenseDashboardCounts().pipe(
          catchError(err => {
            console.error('Failed to fetch new license application counts:', err);
            return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
          })
        );
      
      default:
        return of({ applied: 0, pending: 0, approved: 0, rejected: 0 });
    }
  }

  /**
   * ✅ GET APPLICATIONS OBSERVABLE
   */
  private getApplicationsObservable() {
    switch (this.selectedApplicationType) {
      case 'license':
        return this.licenseAppService.getApplicationsByStatus().pipe(
          catchError(err => {
            console.error('Failed to fetch license applications:', err);
            return of({ applied: [], pending: [], approved: [], rejected: [], objection: [] });
          })
        );
      
      case 'new_license':
        return this.licenseAppService.getNewLicenseApplicationsByStatus().pipe(
          catchError(err => {
            console.error('Failed to fetch new license applications:', err);
            return of({ applied: [], pending: [], approved: [], rejected: [], objection: [] });
          })
        );
      
      default:
        return of({ applied: [], pending: [], approved: [], rejected: [], objection: [] });
    }
  }

  /**
   * ✅ UPDATE DATA SOURCES
   * Removes payment_pending apps from pending array
   */
  private updateDataSources(applications: any, paymentPendingApps: any[]): void {
    const paymentPendingIds = new Set(
      paymentPendingApps.map(app => app.application_id || app.applicationId)
    );
    
    console.log('💰 Payment pending IDs:', Array.from(paymentPendingIds));
    
    // Set payment pending apps
    this.awaitingPaymentDataSource.data = paymentPendingApps;
    
    // Filter payment pending from other arrays
    this.appliedDataSource.data = (applications.applied || []).filter((app: any) => {
      const id = app.application_id || app.applicationId;
      return !paymentPendingIds.has(id);
    });
    
    // ✅ CRITICAL: Remove payment_pending from pending array
    this.pendingDataSource.data = (applications.pending || []).filter((app: any) => {
      const id = app.application_id || app.applicationId;
      return !paymentPendingIds.has(id);
    });
    
    // ✅ Set approved apps
    this.approvedDataSource.data = (applications.approved || []).filter((app: any) => {
      const id = app.application_id || app.applicationId;
      return !paymentPendingIds.has(id);
    });
    
    this.rejectedDataSource.data = (applications.rejected || []).filter((app: any) => {
      const id = app.application_id || app.applicationId;
      return !paymentPendingIds.has(id);
    });
    
    console.log('✅ Data source counts:', {
      applied: this.appliedDataSource.data.length,
      pending: this.pendingDataSource.data.length,
      awaitingPayment: this.awaitingPaymentDataSource.data.length,
      approved: this.approvedDataSource.data.length,
      rejected: this.rejectedDataSource.data.length
    });
  }

  /**
   * ✅ CLEAR DATA SOURCES
   */
  private clearDataSources(): void {
    this.appliedDataSource.data = [];
    this.pendingDataSource.data = [];
    this.approvedDataSource.data = [];
    this.rejectedDataSource.data = [];
    this.awaitingPaymentDataSource.data = [];
  }

  /**
   * ✅ GET APPLICATION TYPE LABEL
   */
  getApplicationTypeLabel(): string {
    const option = this.applicationTypes.find(t => t.value === this.selectedApplicationType);
    return option ? option.label : 'Application';
  }
}