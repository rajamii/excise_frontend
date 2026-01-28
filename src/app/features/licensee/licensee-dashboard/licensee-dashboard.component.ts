// licensee-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { DashboardCount } from '../../../core/models/dashboard.model';
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
  pendingDataSource = new MatTableDataSource<UnifiedApplication>();
  approvedDataSource = new MatTableDataSource<UnifiedApplication>();
  rejectedDataSource = new MatTableDataSource<UnifiedApplication>();

  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];
  activeTable: 'default' | 'applied' | 'pending' | 'approved' | 'rejected' = 'default';

  constructor(
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private unifiedDashboardService: UnifiedDashboardService,
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

          let filteredApplications = {
            applied: result.applications.applied || [],
            pending: result.applications.pending || [],
            awaitingPayment: result.applications.awaitingPayment || [],
            approved: result.applications.approved || [],
            rejected: result.applications.rejected || []
          };

          if (this.selectedApplicationType !== 'all') {

            filteredApplications = {
              applied: filteredApplications.applied.filter(app => app.type === this.selectedApplicationType),
              pending: filteredApplications.pending.filter(app => app.type === this.selectedApplicationType),
              awaitingPayment: filteredApplications.awaitingPayment.filter(app => app.type === this.selectedApplicationType),
              approved: filteredApplications.approved.filter(app => app.type === this.selectedApplicationType),
              rejected: filteredApplications.rejected.filter(app => app.type === this.selectedApplicationType)
            };
          }


          // Store counts separately but combine pending display
          this.dashboardCounts = {
            applied: filteredApplications.applied.length,
            pending: filteredApplications.pending.length,
            awaitingPayment: filteredApplications.awaitingPayment.length,
            approved: filteredApplications.approved.length,
            rejected: filteredApplications.rejected.length
          };


          // Combine pending and awaiting payment into one datasource
          this.updateDataSources({
            applied: filteredApplications.applied,
            pending: [...filteredApplications.pending, ...filteredApplications.awaitingPayment],
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

  // Modified signature to accept combined pending data
  private updateDataSources(result: {
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }): void {
    this.appliedDataSource.data = result.applied || [];
    this.pendingDataSource.data = result.pending || []; // ✅ Now contains both pending + awaiting payment
    this.approvedDataSource.data = result.approved || [];
    this.rejectedDataSource.data = result.rejected || [];
  }

  private clearDataSources(): void {
    this.appliedDataSource.data = [];
    this.pendingDataSource.data = [];
    this.approvedDataSource.data = [];
    this.rejectedDataSource.data = [];
  }

  onPaymentConfirmed(application: UnifiedApplication): void {
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

    // Use salesmanBarmanService for ALL types since they all use same workflow endpoint
    this.salesmanBarmanService.getNextStages(application.applicationId).subscribe({
      next: (stages: any[]) => {
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
        this.salesmanBarmanService.advanceStage(application.applicationId, stageId, {
          payment_confirmed: true,
          remarks: 'Payment received and confirmed'
        }).subscribe({
          next: (response) => {
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