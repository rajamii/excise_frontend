import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupplyChainService } from '../../licensee/supplyChain/services/supplychain.service';
import { AccountService } from '../../../core/services/account.service';
import { MatIconModule } from '@angular/material/icon';
import { EnaRequisitionService } from '../../../core/services/ena-requisition.service';
import { DashboardStatisticsComponent } from '../../../shared/components/dashboard-statistics/dashboard-statistics.component';
import { UnifiedActionButtonsComponent } from '../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../shared/services/unified-actions.service';
import { HologramDataService } from '../../licensee/supplyChain/services/hologram-data.service';
import { SidebarPendingBadgeService } from '../../../shared/services/sidebar-pending-badge.service';

type HologramRequestCategory = 'PENDING' | 'UNDER_PROCESS' | 'APPROVED' | 'REJECTED';

interface OfficerData {
  id?: number;
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  type: 'transit';
  allowedActions?: string[];
  allowedActionConfigs?: any[];
  workflowId?: number;
  currentStage?: number;
}

@Component({
  selector: 'app-officer-in-charge-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    DashboardStatisticsComponent,
    UnifiedActionButtonsComponent
  ],
  template: `
    <div class="officer-in-charge-dashboard">
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
                    [context]="'officer-in-charge'"
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
      <div class="oic-dashboard-note" *ngIf="false">
        <div class="note-card">
          <h5 class="note-title">Requests are available in modules</h5>
          <p class="note-text">
            Hologram Requests and Transit Applications are available in their dedicated pages, so we don’t duplicate the
            table on the OIC dashboard.
          </p>
          <div class="note-actions">
            <button type="button" class="btn btn-primary" (click)="openHologramRequests()">
              Hologram Requests
            </button>
            <button type="button" class="btn btn-outline-primary" (click)="openTransitApplications()">
              Transit Applications
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .officer-in-charge-dashboard {
      padding: 1rem;
    }

    .oic-workspace-cards {
      margin-top: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .module-card {
      border-radius: 1rem;
      transition: all 0.3s ease;
      cursor: pointer;
      background: white;
      border: 1px solid #e5e7eb !important;
    }

    .module-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08) !important;
      border-color: #3b82f6 !important;
    }

    .icon-bubble {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bg-primary-soft { background: #eff6ff; color: #2563eb; }
    .bg-info-soft { background: #f0fdf4; color: #0284c7; }
    .bg-purple-soft { background: #f5f3ff; color: #7c3aed; }
    .bg-success-soft { background: #f0fdf4; color: #16a34a; }
    .text-purple { color: #7c3aed; }

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

    .oic-dashboard-note {
      margin-top: 1.25rem;
    }

    .note-card {
      background: white;
      border-radius: 0.75rem;
      border: 1px solid #e5e7eb;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
      padding: 1rem 1.125rem;
    }

    .note-title {
      margin: 0 0 0.375rem 0;
      font-weight: 700;
      color: #111827;
    }

    .note-text {
      margin: 0 0 0.875rem 0;
      color: #4b5563;
      font-size: 0.95rem;
    }

    .note-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  `]
})
export class OfficerInChargeDashboardComponent implements OnInit {
  // Services
  public accountService = inject(AccountService);
  private router = inject(Router);
  private supplyChainService = inject(SupplyChainService);
  private unifiedActionsService = inject(UnifiedActionsService);
  private hologramService = inject(HologramDataService);
  private enaRequisitionService = inject(EnaRequisitionService);
  private sidebarPendingBadgeService = inject(SidebarPendingBadgeService);

  // Data properties
  allApplications: OfficerData[] = [];
  filteredApplications: OfficerData[] = [];
  selectedApplicationType: string = 'all';
  private currentScopedLicenseId = '';
  public hologramRequestCounts: Record<HologramRequestCategory, number> = {
    PENDING: 0,
    UNDER_PROCESS: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  public hologramProcurementPendingCount = 0;
  public blDetailsPendingCount = 0;
  public dailyEntryPendingCount = 0;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  constructor() {}

  ngOnInit(): void {
    this.currentScopedLicenseId = this.resolveCurrentScopedLicenseId();
    setTimeout(() => {
      this.loadTransitApplications();
      this.loadHologramRequestsCounts();
      this.loadHologramProcurementPendingCount();
      this.loadBlDetailsPendingCount();
      this.loadDailyEntryPendingCount();
    }, 0);
  }

  private loadDailyEntryPendingCount(): void {
    this.sidebarPendingBadgeService.refresh(['hologram-daily-entry'], false, { audience: 'officer', mode: 'full' }).subscribe({
      next: (counts: any) => {
        this.dailyEntryPendingCount = counts['hologram-daily-entry'] || 0;
      },
      error: () => {
        this.dailyEntryPendingCount = 0;
      }
    });
  }

  openHologramRequests(): void {
    this.router.navigate(['/dashboard'], { queryParams: { section: 'oic-hologram-requests' } });
  }

  openTransitApplications(): void {
    this.router.navigate(['/dashboard'], { queryParams: { section: 'transit-applications' } });
  }

  loadTransitApplications(): void {
    // Officer-in-charge primarily handles transit permit terminations
    this.supplyChainService.getTransitPermits().subscribe({
      next: (data: any[]) => {
        const seen = new Set<string>();
        const uniqueData = (data || []).filter((item: any) => {
          const billNo = String(item?.billNo || item?.bill_no || '').trim();
          if (!billNo) return true;
          if (seen.has(billNo)) return false;
          seen.add(billNo);
          return true;
        });

        const transits: OfficerData[] = uniqueData
          .filter((item: any) => this.requiresOfficerReview(item.status))
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
        
        this.allApplications = transits;
        this.applyFilters();
      },
      error: (error) => console.error('Error loading transit applications:', error)
    });
  }

  private requiresOfficerReview(status: string): boolean {
    return true;
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

  @Input() selectedModule: string = 'all';
  @Input() moduleCounts: Record<string, any> = {};

  // Dashboard statistics methods
  getDashboardStatistics() {
    if (this.selectedModule && this.selectedModule !== 'all' && this.moduleCounts[this.selectedModule]) {
      const counts = this.moduleCounts[this.selectedModule];
      return {
        applied: counts.applied || 0,
        pending: counts.pending || 0,
        approved: counts.approved || 0,
        rejected: counts.rejected || 0,
        dailyEntry: this.dailyEntryPendingCount
      };
    }

    const hologramReqPending = (this.hologramRequestCounts.PENDING || 0);
    const hologramReqApproved = (this.hologramRequestCounts.APPROVED || 0);
    const hologramReqRejected = (this.hologramRequestCounts.REJECTED || 0);
    const hologramReqApplied = hologramReqPending + (this.hologramRequestCounts.UNDER_PROCESS || 0) + hologramReqApproved + hologramReqRejected;

    const transitApplied = Array.isArray(this.allApplications) ? this.allApplications.length : 0;
    const transitPending = this.getTransitPendingCount();
    const transitApproved = this.getTransitApprovedCount();
    const transitRejected = Array.isArray(this.allApplications) ? this.allApplications.filter(app => {
      const s = (app.status || '').toLowerCase();
      return s.includes('terminated') || s.includes('cancelled') || s.includes('rejected');
    }).length : 0;

    const bldApplied = this.blDetailsAllCount || 0;
    const bldPending = this.blDetailsPendingCount || 0;
    const bldApproved = this.blDetailsApprovedCount || 0;
    const bldRejected = this.blDetailsRejectedCount || 0;

    const holProcPending = this.hologramProcurementPendingCount || 0;

    return {
      applied: transitApplied + hologramReqApplied + bldApplied,
      pending: transitPending + hologramReqPending + holProcPending + bldPending,
      approved: transitApproved + hologramReqApproved + bldApproved,
      rejected: transitRejected + hologramReqRejected + bldRejected,
      dailyEntry: this.dailyEntryPendingCount
    };
  }

  getTransitPendingCount(): number {
    return Array.isArray(this.allApplications) 
      ? this.allApplications.filter(app => {
          const s = (app.status || '').toLowerCase();
          return !s.includes('approved') && !s.includes('issued') && !s.includes('terminated') && !s.includes('cancelled');
        }).length 
      : 0;
  }

  getTransitApprovedCount(): number {
    return Array.isArray(this.allApplications)
      ? this.allApplications.filter(app => {
          const s = (app.status || '').toLowerCase();
          return s.includes('approved') || s.includes('issued');
        }).length
      : 0;
  }

  openDailyRegister(): void {
    this.router.navigate(['/dashboard'], { queryParams: { section: 'hologram-daily-entry' } });
  }

  private loadHologramProcurementPendingCount(): void {
    this.hologramService.getProcurements().subscribe({
      next: (procurements: any[]) => {
        const scoped = this.filterByCurrentLicense(procurements || []);
        this.hologramProcurementPendingCount = this.countOicHologramProcurementPending(scoped);
      },
      error: () => {
        this.hologramProcurementPendingCount = 0;
      }
    });
  }

  private normalizeStageToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private countOicHologramProcurementPending(rows: any[]): number {
    const items = Array.isArray(rows) ? rows : [];

    const hasAnyActions = items.some((row) => this.extractAllowedActions(row).length > 0);
    if (hasAnyActions) {
      const actionable = new Set(['ASSIGN_CARTONS', 'UPDATE_ARRIVAL']);
      return items.filter((row) => {
        const actions = this.extractAllowedActions(row);
        const hasAssignCartons = actions.includes('ASSIGN_CARTONS');
        const hasUpdateArrival = actions.includes('UPDATE_ARRIVAL');
        if (!hasAssignCartons && !hasUpdateArrival) return false;

        const details = row?.carton_details ?? row?.cartoon_details ?? row?.cartonDetails ?? row?.cartoonDetails ?? [];
        const hasDetails = Array.isArray(details) && details.length > 0;

        if (hasAssignCartons && !hasDetails) return true;
        if (hasUpdateArrival && hasDetails) return true;
        return false;
      }).length;
    }

    // Fallback when backend doesn't return allowed actions consistently.
    return items.filter((row) => {
      const statusToken = this.normalizeStageToken(row?.status);
      if (!statusToken) return false;

      if (statusToken.includes('paymentcompleted')) return false;
      if (statusToken.includes('cartonassigned') || statusToken.includes('cartoonassigned')) return false;
      if (statusToken.includes('rejected') || statusToken.includes('reject')) return false;

      return statusToken.includes('approved') || statusToken.includes('pending') || statusToken.includes('under');
    }).length;
  }

  public blDetailsAllCount = 0;

  public blDetailsApprovedCount = 0;

  public blDetailsRejectedCount = 0;

  private loadBlDetailsPendingCount(): void {
    this.enaRequisitionService.getRequisitionArrivalDetailsByStatus('ALL').subscribe({
      next: (response: any) => {
        const rows = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        const scoped = this.filterByCurrentLicense(rows);
        this.blDetailsAllCount = scoped.length;
        this.blDetailsPendingCount = scoped.filter((r: any) => {
          const s = String(r?.approvalStatus || r?.approval_status || r?.review_status || r?.reviewStatus || r?.status || '').toUpperCase();
          return s.includes('PENDING') || s === '';
        }).length;
        this.blDetailsApprovedCount = scoped.filter((r: any) => {
          const s = String(r?.approvalStatus || r?.approval_status || r?.review_status || r?.reviewStatus || r?.status || '').toUpperCase();
          return s.includes('APPROV') || s.includes('COMPLET');
        }).length;
        this.blDetailsRejectedCount = scoped.filter((r: any) => {
          const s = String(r?.approvalStatus || r?.approval_status || r?.review_status || r?.reviewStatus || r?.status || '').toUpperCase();
          return s.includes('REJECT') || s.includes('CANCEL');
        }).length;
      },
      error: () => {
        this.blDetailsAllCount = 0;
        this.blDetailsPendingCount = 0;
        this.blDetailsApprovedCount = 0;
        this.blDetailsRejectedCount = 0;
      }
    });
  }

  getFilterOptions() {
    return [
      { value: 'all', label: 'All Applications' },
      { value: 'transit', label: 'Transit Permits' }
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

  private loadHologramRequestsCounts(): void {
    this.hologramService.getRequests().subscribe({
      next: (requests: any[]) => {
        const scopedRequests = this.filterByCurrentLicense(requests || []);
        const counts: Record<HologramRequestCategory, number> = {
          PENDING: 0,
          UNDER_PROCESS: 0,
          APPROVED: 0,
          REJECTED: 0,
        };

        for (const request of scopedRequests) {
          counts[this.categorizeHologramRequest(request)] += 1;
        }

        this.hologramRequestCounts = counts;
      },
      error: (error) => {
        console.error('Error loading hologram requests for OIC stats:', error);
        this.hologramRequestCounts = { PENDING: 0, UNDER_PROCESS: 0, APPROVED: 0, REJECTED: 0 };
      }
    });
  }

  private toUpperActions(value: any): string[] {
    const list = Array.isArray(value) ? value : [];
    return list.map((x) => String(x || '').toUpperCase()).filter(Boolean);
  }

  private extractAllowedActions(item: any): string[] {
    const allowed =
      item?.allowedActions ??
      item?.allowed_actions ??
      item?.allowed_action ??
      item?.actions ??
      item?.currentStageEntryActions ??
      item?.current_stage_entry_actions ??
      [];
    return this.toUpperActions(allowed);
  }

  private countActionable(items: any[], actionableActions: string[]): number {
    const actionable = new Set(this.toUpperActions(actionableActions));

    const rows = Array.isArray(items) ? items : [];
    const hasAnyActions = rows.some((row) => this.extractAllowedActions(row).length > 0);
    if (hasAnyActions) {
      return rows.filter((row) => {
        const actions = this.extractAllowedActions(row);
        return actions.some((action) => actionable.has(action));
      }).length;
    }

    // Fallback when backend doesn't return allowed actions consistently.
    return rows.filter((row) => {
      const statusText = String(row?.status || row?.current_stage_name || row?.currentStageName || '').toLowerCase();
      return statusText.includes('pending') || statusText.includes('under') || statusText.includes('submitted');
    }).length;
  }

  private isUsageDatePast(request: any): boolean {
    const usageDate = String(request?.usage_date || request?.usageDate || '').trim();
    if (!usageDate) return false;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const usageKey = usageDate.slice(0, 10);
    return usageKey < todayKey;
  }

  private categorizeHologramRequest(request: any): HologramRequestCategory {
    const isInitial = Boolean(request?.currentStageIsInitial ?? request?.current_stage_is_initial ?? false);
    const isFinal = Boolean(request?.currentStageIsFinal ?? request?.current_stage_is_final ?? false);
    const allowedActions = this.toUpperActions(request?.allowedActions || request?.allowed_actions || []);
    const entryActions = this.toUpperActions(request?.currentStageEntryActions || request?.current_stage_entry_actions || []);

    if (isFinal && entryActions.includes('REJECT')) return 'REJECTED';
    if (isFinal) return 'APPROVED';
    if (isInitial) {
      // If usage date already passed and still in pending-review stage, treat as rejected-by-timeout.
      if (this.isUsageDatePast(request)) return 'REJECTED';
      return 'PENDING';
    }

    if (allowedActions.includes('ISSUE') || allowedActions.includes('APPROVE') || allowedActions.includes('REJECT')) {
      if (this.isUsageDatePast(request)) return 'REJECTED';
      return 'PENDING';
    }

    const statusText = String(request?.currentStageName || request?.current_stage_name || request?.status || '').toUpperCase();
    if (statusText.includes('REJECT')) return 'REJECTED';
    if (statusText.includes('COMPLETE') || statusText.includes('APPROVE')) return 'APPROVED';

    return 'UNDER_PROCESS';
  }

  private resolveCurrentScopedLicenseId(): string {
    if (typeof window === 'undefined') return '';

    const sources = [
      sessionStorage.getItem('currentUser'),
      localStorage.getItem('currentUser'),
      sessionStorage.getItem('user'),
      localStorage.getItem('user')
    ];

    for (const raw of sources) {
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const resolved = this.extractLicenseId(parsed);
        if (resolved) return resolved;
      } catch {
        // Ignore non-JSON payloads
      }
    }
    return '';
  }

  private extractLicenseId(payload: any): string {
    if (!payload || typeof payload !== 'object') return '';

    const direct = this.pickFirstNonEmpty(payload, [
      'license_id', 'licenseId',
      'licensee_id', 'licenseeId'
    ]);
    if (direct) return direct;

    const nestedCandidates = [
      payload.user,
      payload.profile,
      payload.supply_chain_profile,
      payload.supplyChainProfile,
      payload.oic_assignment,
      payload.oicAssignment,
      payload.assignment
    ];
    for (const nested of nestedCandidates) {
      const nestedId = this.extractLicenseId(nested);
      if (nestedId) return nestedId;
    }

    return '';
  }

  private pickFirstNonEmpty(source: any, keys: string[]): string {
    for (const key of keys) {
      const value = source?.[key];
      const normalized = String(value ?? '').trim();
      if (normalized) return normalized;
    }
    return '';
  }

  private expandLicenseAliases(licenseId: string): string[] {
    const normalized = String(licenseId || '').trim();
    if (!normalized) return [];
    const aliases = [normalized];
    if (normalized.startsWith('NLI/')) aliases.push(`NA/${normalized.slice(4)}`);
    if (normalized.startsWith('NA/')) aliases.push(`NLI/${normalized.slice(3)}`);
    return aliases;
  }

  private filterByCurrentLicense<T = any>(rows: T[]): T[] {
    const scopedLicense = String(this.currentScopedLicenseId || '').trim();
    if (!scopedLicense) return rows || [];

    const allowed = new Set(this.expandLicenseAliases(scopedLicense));
    return (rows || []).filter((row: any) => {
      const rowLicense = this.pickFirstNonEmpty(row, [
        'license_id', 'licenseId',
        'licensee_id', 'licenseeId'
      ]);
      if (!rowLicense) return false;
      return this.expandLicenseAliases(rowLicense).some((alias) => allowed.has(alias));
    });
  }

  // Unified action handler
  onUnifiedAction(event: {action: string, item: any}): void {
    this.unifiedActionsService.executeAction(
      event.action, 
      event.item, 
      'transit', 
      'officer-in-charge'
    ).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (result.message) {
            alert(result.message);
          }
          if (['TERMINATE', 'APPROVE'].includes(event.action)) {
            this.loadTransitApplications();
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
    if (statusLower.includes('approved') || statusLower.includes('issued')) return 'bg-success';
    if (statusLower.includes('terminated') || statusLower.includes('cancelled')) return 'bg-danger';
    if (statusLower.includes('active') || statusLower.includes('in_transit')) return 'bg-warning';
    return 'bg-secondary';
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredApplications.length / this.pageSize));
  }

  getPaged(): OfficerData[] {
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
