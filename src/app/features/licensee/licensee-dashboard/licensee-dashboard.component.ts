// licensee-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { DashboardCount } from '../../../core/models/dashboard.model';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationTableComponent } from './application-table/application-table.component';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { UnifiedDashboardService } from '../../../core/services/unified-dashboard.service';
import { UnifiedApplication } from '../../../core/models/unified-application.model';
import { SalesmanBarmanRegistrationService } from '../../../core/services/salesman-barman-registration.service';
import Swal from 'sweetalert2';

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
  dashboardCounts: DashboardCount & { awaitingPayment?: number } = { 
    applied: 0, 
    pending: 0, 
    approved: 0, 
    rejected: 0,
    awaitingPayment: 0
  };

  selectedApplicationType: 'all' | 'license-renewal' | 'new-license' | 'salesman-barman' = 'all';
  isLoading = false;

  appliedDataSource = new MatTableDataSource<UnifiedApplication>();
  pendingDataSource = new MatTableDataSource<UnifiedApplication>(); // ✅ Now includes awaiting payment
  approvedDataSource = new MatTableDataSource<UnifiedApplication>();
  rejectedDataSource = new MatTableDataSource<UnifiedApplication>();

  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];
  activeTable: 'default' | 'applied' | 'pending' | 'approved' | 'rejected' = 'default';

  constructor(
    private licenseAppService: LicenseApplicationService,
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private unifiedDashboardService: UnifiedDashboardService,
    private dialog: MatDialog
  ) { }

  showTable(table: 'applied' | 'pending' | 'approved' | 'rejected') {
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

  loadDashboardData(): void {
    this.isLoading = true;

    forkJoin({
      counts: this.unifiedDashboardService.getUnifiedDashboardCounts(),
      applications: this.unifiedDashboardService.getUnifiedApplicationsByStatus()
    })
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: (result) => {
          console.log('📊 Raw data from API:', result);
          
          let filteredApplications = {
            applied: result.applications.applied || [],
            pending: result.applications.pending || [],
            awaitingPayment: result.applications.awaitingPayment || [],
            approved: result.applications.approved || [],
            rejected: result.applications.rejected || []
          };
          
          if (this.selectedApplicationType !== 'all') {
            console.log('🔍 Filtering by type:', this.selectedApplicationType);
            filteredApplications = {
              applied: filteredApplications.applied.filter(app => app.type === this.selectedApplicationType),
              pending: filteredApplications.pending.filter(app => app.type === this.selectedApplicationType),
              awaitingPayment: filteredApplications.awaitingPayment.filter(app => app.type === this.selectedApplicationType),
              approved: filteredApplications.approved.filter(app => app.type === this.selectedApplicationType),
              rejected: filteredApplications.rejected.filter(app => app.type === this.selectedApplicationType)
            };
          }
          
          console.log('✅ Filtered applications:', filteredApplications);
          console.log('💳 Awaiting Payment count:', filteredApplications.awaitingPayment.length);

          // ✅ CRITICAL CHANGE: Store counts separately but combine pending display
          this.dashboardCounts = {
            applied: filteredApplications.applied.length,
            pending: filteredApplications.pending.length, // Still track separately
            awaitingPayment: filteredApplications.awaitingPayment.length, // Still track separately
            approved: filteredApplications.approved.length,
            rejected: filteredApplications.rejected.length
          };
          
          console.log('📈 Dashboard counts:', this.dashboardCounts);
          
          // ✅ CRITICAL CHANGE: Combine pending and awaiting payment into one datasource
          this.updateDataSources({
            applied: filteredApplications.applied,
            pending: [...filteredApplications.pending, ...filteredApplications.awaitingPayment], // Combined!
            approved: filteredApplications.approved,
            rejected: filteredApplications.rejected
          });
        },
        error: (error) => {
          console.error('❌ Error loading dashboard data:', error);
          this.dashboardCounts = { applied: 0, pending: 0, awaitingPayment: 0, approved: 0, rejected: 0 };
          this.clearDataSources();
        }
      });
  }

  // ✅ UPDATED: Modified signature to accept combined pending data
  private updateDataSources(result: {
    applied: UnifiedApplication[];
    pending: UnifiedApplication[]; // Now includes both pending AND awaiting payment
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }): void {
    console.log('📋 Updating data sources...');
    console.log('  - Applied:', result.applied.length);
    console.log('  - Pending (combined):', result.pending.length);
    console.log('  - Approved:', result.approved.length);
    console.log('  - Rejected:', result.rejected.length);

    this.appliedDataSource.data = result.applied || [];
    this.pendingDataSource.data = result.pending || []; // ✅ Now contains both pending + awaiting payment
    this.approvedDataSource.data = result.approved || [];
    this.rejectedDataSource.data = result.rejected || [];
    
    // Log the actual data
    if (result.pending.length > 0) {
      console.log('📋 Pending applications (including awaiting payment):', result.pending);
    }
  }

  private clearDataSources(): void {
    this.appliedDataSource.data = [];
    this.pendingDataSource.data = [];
    this.approvedDataSource.data = [];
    this.rejectedDataSource.data = [];
  }

  onPaymentConfirmed(application: UnifiedApplication): void {
    console.log('💳 Payment confirmation for:', application);
    
    Swal.fire({
      title: 'Confirm Payment Receipt',
      text: `Have you received the payment for application ${application.applicationId}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Payment Received',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.processPayment(application);
      }
    });
  }

  private processPayment(application: UnifiedApplication): void {
    Swal.fire({
      title: 'Processing...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const appId = application.applicationId;
    const appType = application.type;

    console.log('🚀 Processing payment for:', application.applicationId);
    console.log('📦 Type:', appType);

    // ✅ Use salesmanBarmanService for ALL types since they all use same workflow endpoint
    this.salesmanBarmanService.getNextStages(application.applicationId).subscribe({
      next: (stages: any[]) => {
        console.log('✅ Next stages received:', stages);
        
        // Find the approved stage
        const approvalStage = stages.find(s => {
          const stageName = (s.name || s.stage_name || '').toLowerCase();
          const stageId = s.id || s.stage_id;
          return stageName === 'approved' || stageId === 12 || stageId === 16;
        });

        if (!approvalStage) {
          console.error('❌ No approval stage found in:', stages);
          Swal.fire('Error', 'No approval stage found. Available stages: ' + stages.map(s => s.name || s.id).join(', '), 'error');
          return;
        }

        const stageId = approvalStage.id || approvalStage.stage_id;
        console.log('✅ Found approval stage:', approvalStage);
        console.log('✅ Advancing to stage ID:', stageId);
        
        this.salesmanBarmanService.advanceStage(application.applicationId, stageId, {
          payment_confirmed: true,
          remarks: 'Payment received and confirmed'
        }).subscribe({
          next: (response) => {
            console.log('✅ Payment processed successfully:', response);
            Swal.fire({
              title: 'Success!',
              text: 'Payment confirmed and application approved.',
              icon: 'success'
            }).then(() => {
              this.loadDashboardData();
            });
          },
          error: (err) => {
            console.error('❌ Error advancing application:', err);
            Swal.fire('Error', err?.error?.detail || 'Failed to process payment.', 'error');
          }
        });
      },
      error: (err) => {
        console.error('❌ Error fetching stages:', err);
        Swal.fire('Error', 'Failed to fetch approval stages: ' + (err?.error?.detail || err?.message || 'Unknown error'), 'error');
      }
    });
  }
}