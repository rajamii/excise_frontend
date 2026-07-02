import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupplyChainService } from '../../licensee/supplyChain/services/supplychain.service';
import { EnaRequisitionService } from '../../../core/services/ena-requisition.service';
import { AccountService } from '../../../core/services/account.service';
import { CompanyRegistrationService } from '../../../core/services/company-registration.service';
import { DashboardStatisticsComponent } from '../../../shared/components/dashboard-statistics/dashboard-statistics.component';
import { UnifiedActionButtonsComponent } from '../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../shared/services/unified-actions.service';

interface PermitData {
  id?: number;
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  type: 'requisition' | 'revalidation' | 'transit' | 'hologram' | 'cancellation' | 'company';
  allowedActions?: string[];
  allowedActionConfigs?: any[];
  workflowId?: number;
  currentStage?: number;
}

@Component({
  selector: 'app-permit-section-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardStatisticsComponent,
    UnifiedActionButtonsComponent
  ],
  template: `
    <div class="permit-section-dashboard">
      <!-- Dashboard Statistics -->
      <app-dashboard-statistics
        [statistics]="getDashboardStatistics()">
      </app-dashboard-statistics>

      <!-- Data Table -->
      <div class="data-table-section" *ngIf="false">
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
              <tr *ngFor="let permit of getPaged()">
                <td>{{ permit.referenceNo }}</td>
                <td>{{ permit.submissionDate }}</td>
                <td>{{ permit.distilleryName }}</td>
                <td>
                  <span class="badge" [ngClass]="getStatusClass(permit.status)">
                    {{ permit.status }}
                  </span>
                </td>
                <td>₹{{ permit.amount }}</td>
                <td>
                  <span class="badge bg-info">{{ permit.type | titlecase }}</span>
                </td>
                <td>
                  <app-unified-action-buttons
                    [item]="permit"
                    [itemType]="permit.type"
                    [context]="'permit-section'"
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

      <!-- Empty State -->
      <!-- Empty State removed (hide message) -->
    </div>
  `,
  styles: [`
    .permit-section-dashboard {
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
export class PermitSectionDashboardComponent implements OnInit {
  // Services
  public accountService = inject(AccountService);
  private router = inject(Router);
  private enaRequisitionService = inject(EnaRequisitionService);
  private supplyChainService = inject(SupplyChainService);
  private companyRegistrationService = inject(CompanyRegistrationService);
  private unifiedActionsService = inject(UnifiedActionsService);

  // Data properties
  allPermits: PermitData[] = [];
  filteredPermits: PermitData[] = [];
  selectedApplicationType: string = 'all';

  /** Selected module from the parent chart dropdown — drives stat box filtering */
  @Input() selectedModule: string = 'all';
  /** supplyChainModuleCounts passed from parent — used for per-module stat boxes */
  @Input() moduleCounts: Record<string, any> = {};

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  constructor() {}

  ngOnInit(): void {
    this.loadAllApplications();
  }

  private isPermitSectionUser(): boolean {
    return Number(this.accountService.getCurrentUser()?.role?.id ?? 0) === 5;
  }

  loadAllApplications(): void {
    // Permit Section bar chart and stat cards only cover Requisitions and Company Registration.
    // Revalidations, cancellations and holograms are handled by their own dedicated tabs.
    this.loadRequisitions();
    this.loadCompanyRegistrations();
  }

  loadRequisitions(): void {
    this.enaRequisitionService.getRequisitions().subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : response?.results || [];
        const requisitions: PermitData[] = data.map((item: any) => ({
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
        
        this.updatePermits('requisition', requisitions);
      },
      error: (error) => console.error('Error loading requisitions:', error)
    });
  }

  loadRevalidations(): void {
    this.supplyChainService.getRevalidationData().subscribe({
      next: (data: any[]) => {
        const revalidations: PermitData[] = data.map((item: any) => ({
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
        
        this.updatePermits('revalidation', revalidations);
      },
      error: (error) => console.error('Error loading revalidations:', error)
    });
  }

  loadTransitPermits(): void {
    this.supplyChainService.getTransitPermits().subscribe({
      next: (data: any[]) => {
        const transits: PermitData[] = data.map((item: any) => ({
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
        
        this.updatePermits('transit', transits);
      },
      error: (error) => console.error('Error loading transit permits:', error)
    });
  }

  loadHolograms(): void {
    // Hologram data not applicable for permit section — keep as empty
    this.updatePermits('hologram', []);
  }

  loadCompanyRegistrations(): void {
    // Use list-by-status endpoint — same as registration-management component uses
    // to get the actual row data visible to permit section
    this.companyRegistrationService.getApplicationsByStatus().subscribe({
      next: (response: any) => {
        // Response is { applied:[], pending:[], approved:[], rejected:[], objection:[], awaiting_payment:[] }
        const flatten = (arr: any[]) => Array.isArray(arr) ? arr : [];
        const allItems = [
          ...flatten(response?.applied),
          ...flatten(response?.pending),
          ...flatten(response?.approved),
          ...flatten(response?.rejected),
          ...flatten(response?.objection),
          ...flatten(response?.awaiting_payment)
        ];
        // Deduplicate by id
        const seen = new Set<any>();
        const data = allItems.filter(item => {
          const key = item?.id ?? item?.application_id ?? item?.applicationId;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const companies: PermitData[] = data.map((item: any) => ({
          id: item.id,
          referenceNo: item.application_id || item.applicationId || `COMP-${item.id}`,
          submissionDate: this.formatDate(item.submitted_on || item.submittedOn || item.created_at),
          distilleryName: item.establishment_name || item.establishmentName ||
                          item.company_name || item.companyName || 'N/A',
          status: item.current_stage_name || item.currentStageName ||
                  item.status || 'PENDING',
          amount: String(item.amount || item.fee || '0.00'),
          type: 'company' as const,
          allowedActions: item.allowedActions || item.allowed_actions || [],
          allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
          workflowId: item.workflow || item.workflow_id || item.workflowId,
          currentStage: item.current_stage || item.currentStage || item.stage_id
        }));
        this.updatePermits('company', companies);
      },
      error: () => {
        // Fallback: try root list endpoint
        this.companyRegistrationService.getCompanyList().subscribe({
          next: (res: any) => {
            const data = Array.isArray(res) ? res : (res?.results || res?.data || []);
            const companies: PermitData[] = data.map((item: any) => ({
              id: item.id,
              referenceNo: item.application_id || item.applicationId || `COMP-${item.id}`,
              submissionDate: this.formatDate(item.submitted_on || item.submittedOn || item.created_at),
              distilleryName: item.establishment_name || item.establishmentName ||
                              item.company_name || item.companyName || 'N/A',
              status: item.current_stage_name || item.currentStageName || item.status || 'PENDING',
              amount: String(item.amount || item.fee || '0.00'),
              type: 'company' as const,
              allowedActions: item.allowedActions || item.allowed_actions || [],
              allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
              workflowId: item.workflow || item.workflow_id || item.workflowId,
              currentStage: item.current_stage || item.currentStage || item.stage_id
            }));
            this.updatePermits('company', companies);
          },
          error: (err) => console.error('Error loading company registrations:', err)
        });
      }
    });
  }

  loadCancellations(): void {
    this.supplyChainService.getCancellationData().subscribe({
      next: (data: any[]) => {
        const cancellations: PermitData[] = (data || []).map((item: any) => ({
          id: item.id,
          referenceNo: item.ourRefNo || item.our_ref_no || `CAN-${item.id}`,
          submissionDate: this.formatDate(
            item.cancellationDate ||
              item.cancellation_date ||
              item.requisitionDate ||
              item.requisition_date ||
              item.submissionDate ||
              item.submission_date
          ),
          distilleryName:
            item.branchName ||
            item.branch_name ||
            item.distilleryName ||
            item.distillery_name ||
            item.establishmentName ||
            item.establishment_name ||
            item.licenseeName ||
            item.licensee_name ||
            'N/A',
          status: item.status || 'PENDING',
          amount: String(
            item.totalCancellationAmount ||
              item.total_cancellation_amount ||
              item.cancellationBrAmount ||
              item.cancellation_br_amount ||
              item.amount ||
              '0.00'
          ),
          type: 'cancellation',
          allowedActions:
            item.allowedActions ||
            item.allowed_actions ||
            this.getDefaultActionsFromStatus(item.status),
          allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
          workflowId: item.workflow || item.workflow_id || item.workflowId,
          currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId
        }));

        this.updatePermits('cancellation', cancellations);
      },
      error: (error) => console.error('Error loading cancellations:', error)
    });
  }

  private getDefaultActionsFromStatus(status: any): string[] {
    const value = String(status || '').toLowerCase();
    if (!value) return [];
    if (value.includes('reject')) return [];
    if (value.includes('approve')) return [];
    if (value.includes('pending') || value.includes('forward') || value.includes('submit')) return ['APPROVE', 'REJECT'];
    return [];
  }

  private updatePermits(type: string, newPermits: PermitData[]): void {
    // Remove old permits of this type and add new ones
    this.allPermits = [
      ...this.allPermits.filter(p => p.type !== type),
      ...newPermits
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
    // When a specific module is selected, use its counts from moduleCounts
    if (this.selectedModule && this.selectedModule !== 'all') {
      const mc = this.moduleCounts[this.selectedModule];
      if (mc) {
        const total = (mc.applied || 0) || (mc.pending || 0) + (mc.approved || 0) +
                      (mc.objection || 0) + (mc.rejected || 0);
        return {
          applied: total,
          pending: mc.pending || 0,
          approved: mc.approved || 0,
          rejected: mc.rejected || 0
        };
      }
    }

    // All Modules: use allPermits totals
    const actionablePending = this.getActionablePendingCount();

    const approved = this.allPermits.filter(p => {
      const s = String(p.status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (s.includes('approv') || s.includes('issued') || s.includes('complete')) &&
             !s.includes('reject');
    }).length;

    const rejected = this.allPermits.filter(p => {
      const s = String(p.status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return s.includes('reject') || s.includes('cancel');
    }).length;

    return { applied: this.allPermits.length, pending: actionablePending, approved, rejected };
  }

  getFilterOptions() {
    const options = [
      { value: 'all', label: 'All Applications' },
      { value: 'requisition', label: 'Requisitions' },
      { value: 'revalidation', label: 'Revalidations' },
      { value: 'transit', label: 'Transit Permits' },
      { value: 'hologram', label: 'Holograms' },
      { value: 'cancellation', label: 'Cancellations' }
    ];

    return this.isPermitSectionUser()
      ? options.filter(option => option.value !== 'transit')
      : options;
  }

  onDashboardFilterChange(filterValue: string): void {
    this.selectedApplicationType = filterValue;
    this.applyFilters();
  }

  private applyFilters(): void {
    if (this.selectedApplicationType === 'all') {
      this.filteredPermits = [...this.allPermits];
    } else {
      this.filteredPermits = this.allPermits.filter(permit => permit.type === this.selectedApplicationType);
    }
    this.currentPage = 1;
  }

  private getStatusCount(status: string): number {
    return this.allPermits.filter(permit => 
      permit.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  private getActionablePendingCount(): number {
    // Prefer DB workflow metadata (allowed actions) so pending count stays correct even when stage names change.
    return this.allPermits.filter((permit) => {
      const actions = Array.isArray(permit?.allowedActions) ? permit.allowedActions : [];
      const upper = actions.map((a) => String(a || '').toUpperCase());
      return upper.includes('APPROVE') || upper.includes('REJECT');
    }).length;
  }

  // Unified action handler
  onUnifiedAction(event: {action: string, item: any}): void {
    this.unifiedActionsService.executeAction(
      event.action, 
      event.item, 
      event.item.type, 
      'permit-section'
    ).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (result.message) {
            alert(result.message);
          }
          // Reload data if it was a backend action
          if (['APPROVE', 'REJECT', 'FORWARD', 'VERIFY'].includes(event.action)) {
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
    if (statusLower.includes('pending')) return 'bg-warning';
    return 'bg-secondary';
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPermits.length / this.pageSize));
  }

  getPaged(): PermitData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPermits.slice(start, start + this.pageSize);
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
