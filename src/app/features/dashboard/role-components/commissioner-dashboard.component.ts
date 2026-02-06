import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupplyChainService } from '../../licensee/supplyChain/services/supplychain.service';
import { EnaRequisitionService } from '../../../core/services/ena-requisition.service';
import { AccountService } from '../../../core/services/account.service';
import { DashboardStatisticsComponent } from '../../../shared/components/dashboard-statistics/dashboard-statistics.component';
import { UnifiedActionButtonsComponent } from '../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../shared/services/unified-actions.service';

interface CommissionerData {
  id?: number;
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  type: 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram';
  allowedActions?: string[];
  allowedActionConfigs?: any[];
  workflowId?: number;
  currentStage?: number;
}

@Component({
  selector: 'app-commissioner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardStatisticsComponent,
    UnifiedActionButtonsComponent
  ],
  template: `
    <div class="commissioner-dashboard">
      <!-- Dashboard Statistics -->
      <app-dashboard-statistics
        [statistics]="getDashboardStatistics()"
        [filterOptions]="getFilterOptions()"
        [showSelectionMessage]="!selectedApplicationType || selectedApplicationType === 'all'"
        (filterChange)="onDashboardFilterChange($event)">
      </app-dashboard-statistics>

      <!-- Data Table - Only show when a specific type is selected -->
      <div class="data-table-section" *ngIf="selectedApplicationType && selectedApplicationType !== 'all' && filteredApplications.length > 0">
        <div class="table-container">
          <table class="table table-striped table-hover">
            <thead class="table-dark">
              <tr>
                <th>Ref. No.</th>
                <th>Submission Date</th>
                <th>Distillery Name</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let application of getPaged()">
                <td>{{ application.referenceNo }}</td>
                <td>{{ application.submissionDate }}</td>
                <td>{{ application.distilleryName }}</td>
                <td>
                  <span class="badge" [ngClass]="getStatusClass(application.status)">
                    {{ application.status }}
                  </span>
                </td>
                <td>₹{{ application.amount }}</td>
                <td>
                  <span class="badge bg-info">{{ application.type | titlecase }}</span>
                </td>
                <td>
                  <app-unified-action-buttons
                    [item]="application"
                    [itemType]="application.type"
                    [context]="'commissioner'"
                    [includeActions]="['VIEW','PAY']"
                    (actionClicked)="onUnifiedAction($event)">
                  </app-unified-action-buttons>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-section" *ngIf="getTotalPages() > 1">
          <nav>
            <ul class="pagination justify-content-center">
              <li class="page-item" [class.disabled]="currentPage === 1">
                <button class="page-link" (click)="goToPage(currentPage - 1)">Previous</button>
              </li>
              <li class="page-item" *ngFor="let page of getPageNumbers()" [class.active]="page === currentPage">
                <button class="page-link" (click)="goToPage(page)">{{ page }}</button>
              </li>
              <li class="page-item" [class.disabled]="currentPage === getTotalPages()">
                <button class="page-link" (click)="goToPage(currentPage + 1)">Next</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <!-- Empty State for specific type with no data -->
      <div class="empty-state" *ngIf="selectedApplicationType && selectedApplicationType !== 'all' && filteredApplications.length === 0">
        <div class="empty-icon">
          <i class="bi bi-inbox"></i>
        </div>
        <h5>No {{ selectedApplicationType | titlecase }} Applications Found</h5>
        <p>There are no {{ selectedApplicationType }} applications requiring commissioner review at this time.</p>
      </div>
    </div>
  `,
  styles: [`
    .commissioner-dashboard {
      padding: 1rem;
    }

    .data-table-section {
      margin-top: 2rem;
    }

    .table-container {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .table {
      margin-bottom: 0;
    }

    .table th {
      border-top: none;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .table td {
      vertical-align: middle;
      font-size: 0.875rem;
    }

    .badge {
      font-size: 0.75rem;
    }

    .pagination-section {
      margin-top: 1.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h5 {
      margin-bottom: 0.5rem;
      color: #374151;
    }

    .empty-state p {
      margin-bottom: 0;
      font-size: 1rem;
    }
  `]
})
export class CommissionerDashboardComponent implements OnInit {
  // Services
  public accountService = inject(AccountService);
  private router = inject(Router);
  private enaRequisitionService = inject(EnaRequisitionService);
  private supplyChainService = inject(SupplyChainService);
  private unifiedActionsService = inject(UnifiedActionsService);

  // Data properties
  allApplications: CommissionerData[] = [];
  filteredApplications: CommissionerData[] = [];
  selectedApplicationType: string = 'all';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  constructor() {}

  ngOnInit(): void {
    this.loadAllApplications();
  }

  loadAllApplications(): void {
    // Load all types of applications for commissioner review
    this.loadRequisitions();
    this.loadRevalidations();
    this.loadCancellations();
    this.loadTransitPermits();
    this.loadHolograms();
  }

  loadRequisitions(): void {
    this.enaRequisitionService.getRequisitions().subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : response?.results || [];
        const requisitions: CommissionerData[] = data
          .filter((item: any) => this.requiresCommissionerReview(item.status))
          .map((item: any) => ({
            id: item.id,
            referenceNo: item.ourRefNo || item.our_ref_no || `REQ-${item.id}`,
            submissionDate: this.formatDate(item.submissionDate || item.submission_date),
            distilleryName: item.distilleryName || item.distillery_name || 'N/A',
            status: item.status || 'PENDING',
            amount: item.amount || '0.00',
            type: 'requisition',
            allowedActions: item.allowedActions || item.allowed_actions || [],
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
            workflowId: item.workflow || item.workflow_id || item.workflowId,
            currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId
          }));
        
        this.updateApplications('requisition', requisitions);
      },
      error: (error) => console.error('Error loading requisitions:', error)
    });
  }

  loadRevalidations(): void {
    this.supplyChainService.getRevalidationData().subscribe({
      next: (data: any[]) => {
        const revalidations: CommissionerData[] = data
          .filter((item: any) => this.requiresCommissionerReview(item.status))
          .map((item: any) => ({
            id: item.id,
            referenceNo: item.ourRefNo || item.our_ref_no || `REV-${item.id}`,
            submissionDate: this.formatDate(item.revalidationDate || item.revalidation_date),
            distilleryName: item.distilleryName || item.distillery_name || 'N/A',
            status: item.status || 'PENDING',
            amount: item.revalidationBrAmount || item.revalidation_br_amount || '0.00',
            type: 'revalidation',
            allowedActions: item.allowedActions || item.allowed_actions || [],
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
            workflowId: item.workflow || item.workflow_id || item.workflowId,
            currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId
          }));
        
        this.updateApplications('revalidation', revalidations);
      },
      error: (error) => console.error('Error loading revalidations:', error)
    });
  }

  loadCancellations(): void {
    this.supplyChainService.getCancellations().subscribe({
      next: (data: any[]) => {
        const cancellations: CommissionerData[] = data
          .filter((item: any) => this.requiresCommissionerReview(item.status))
          .map((item: any) => ({
            id: item.id,
            referenceNo: item.ourRefNo || item.our_ref_no || `CAN-${item.id}`,
            submissionDate: this.formatDate(item.cancellationDate || item.cancellation_date),
            distilleryName: item.branchName || item.branch_name || item.distilleryName || item.distillery_name || 'N/A',
            status: item.status || 'PENDING',
            amount: item.totalCancellationAmount || item.total_cancellation_amount || '0.00',
            type: 'cancellation',
            allowedActions: item.allowedActions || item.allowed_actions || [],
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
            workflowId: item.workflow || item.workflow_id || item.workflowId,
            currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId
          }));
        
        this.updateApplications('cancellation', cancellations);
      },
      error: (error) => console.error('Error loading cancellations:', error)
    });
  }

  loadTransitPermits(): void {
    this.supplyChainService.getTransitPermits().subscribe({
      next: (data: any[]) => {
        const transits: CommissionerData[] = data
          .filter((item: any) => this.requiresCommissionerReview(item.status))
          .map((item: any) => ({
            id: item.id,
            referenceNo: item.billNo || item.bill_no || `TRP-${item.id}`,
            submissionDate: this.formatDate(item.date),
            distilleryName: item.soleDistributorName || item.sole_distributor_name || 'N/A',
            status: item.status || 'PENDING',
            amount: item.totalAmount || item.total_amount || '0.00',
            type: 'transit',
            allowedActions: item.allowedActions || item.allowed_actions || [],
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
            workflowId: item.workflow || item.workflow_id || item.workflowId,
            currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId
          }));
        
        this.updateApplications('transit', transits);
      },
      error: (error) => console.error('Error loading transit permits:', error)
    });
  }

  loadHolograms(): void {
    // Placeholder for hologram loading
    this.updateApplications('hologram', []);
  }

  private requiresCommissionerReview(status: string): boolean {
    const statusLower = status?.toLowerCase() || '';
    return statusLower.includes('forwarded') || 
           statusLower.includes('commissioner') || 
           statusLower.includes('pending_commissioner') ||
           statusLower.includes('under_commissioner_review');
  }

  private updateApplications(type: string, newApplications: CommissionerData[]): void {
    this.allApplications = [
      ...this.allApplications.filter(p => p.type !== type),
      ...newApplications
    ];
    this.applyFilters();
  }

  private formatDate(dateValue: any): string {
    if (!dateValue) return '';
    try {
      return new Date(dateValue).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }).replace(/ /g, '-');
    } catch (e) {
      return dateValue.toString();
    }
  }

  // Dashboard statistics methods
  getDashboardStatistics() {
    return {
      applied: this.getStatusCount('APPLIED') + this.getStatusCount('SUBMITTED'),
      pending: this.getStatusCount('PENDING') + this.getStatusCount('FORWARDED'),
      approved: this.getStatusCount('APPROVED') + this.getStatusCount('APPROVED_BY_COMMISSIONER'),
      rejected: this.getStatusCount('REJECTED') + this.getStatusCount('REJECTED_BY_COMMISSIONER')
    };
  }

  getFilterOptions() {
    return [
      { value: 'all', label: 'All Applications' },
      { value: 'requisition', label: 'Requisitions' },
      { value: 'revalidation', label: 'Revalidations' },
      { value: 'cancellation', label: 'Cancellations' },
      { value: 'transit', label: 'Transit Permits' },
      { value: 'hologram', label: 'Holograms' }
    ];
  }

  onDashboardFilterChange(filterValue: string): void {
    this.selectedApplicationType = filterValue;
    this.applyFilters();
  }

  private applyFilters(): void {
    if (this.selectedApplicationType === 'all') {
      this.filteredApplications = [...this.allApplications];
    } else {
      this.filteredApplications = this.allApplications.filter(app => app.type === this.selectedApplicationType);
    }
    this.currentPage = 1;
  }

  private getStatusCount(status: string): number {
    return this.allApplications.filter(app => 
      app.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  // Unified action handler
  onUnifiedAction(event: {action: string, item: any}): void {
    this.unifiedActionsService.executeAction(
      event.action, 
      event.item, 
      event.item.type, 
      'commissioner'
    ).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (result.message) {
            alert(result.message);
          }
          if (['APPROVE', 'REJECT', 'EXTEND', 'ISSUE'].includes(event.action)) {
            this.loadAllApplications();
          }
        } else {
          alert(`Action failed: ${result.message}`);
        }
      },
      error: (error: any) => {
        console.error('Action failed:', error);
        alert(`Action failed: ${error.message || 'Unknown error'}`);
      }
    });
  }

  // Utility methods
  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved')) return 'bg-success';
    if (statusLower.includes('rejected')) return 'bg-danger';
    if (statusLower.includes('pending') || statusLower.includes('forwarded')) return 'bg-warning';
    return 'bg-secondary';
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredApplications.length / this.pageSize));
  }

  getPaged(): CommissionerData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredApplications.slice(start, start + this.pageSize);
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }
}
