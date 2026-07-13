import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MaterialModule } from '../../../../../shared/material.module';
import { RoleService } from '../../../../../core/services/role.service';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';

interface RenewalCounts {
  applied: number;
  pending: number;
  objection: number;
  approved: number;
  rejected: number;
  awaitingPayment?: number;
}

interface RenewalItem {
  id: string;
  applicationId: string;
  applicantName: string;
  oldLicenseId: string;
  submittedOn: string;
  currentStage: string;
  currentStageRaw: string;
  statusGroup: 'applied' | 'pending' | 'objection' | 'approved' | 'rejected' | 'awaiting-payment';
  canView: boolean;
}

interface GroupedRenewalResponse {
  applied: any[];
  pending: any[];
  objection: any[];
  approved: any[];
  rejected: any[];
}

@Component({
  selector: 'app-license-renewal-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './license-renewal-dashboard.component.html',
  styleUrls: ['./license-renewal-dashboard.component.scss']
})
export class LicenseRenewalDashboardComponent implements OnInit {
  private router = inject(Router);
  private roleService = inject(RoleService);
  private licenseApplicationService = inject(LicenseApplicationService);

  isLoading = false;
  error: string | null = null;

  counts: RenewalCounts = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 };
  allRows: RenewalItem[] = [];
  filteredRows: RenewalItem[] = [];

  pageSizeOptions: number[] = [5, 10, 15];
  pageSize = 5;
  pageIndex = 0;
  searchFilter = '';
  activeSummaryFilter: RenewalItem['statusGroup'] | '' = '';

  ngOnInit(): void {
    this.loadData();
  }

  isLicenseeUser(): boolean {
    return this.roleService.isLicenseeRole();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;
    this.activeSummaryFilter = '';
    this.searchFilter = '';

    forkJoin({
      counts: this.licenseApplicationService.getLicenseRenewalDashboardCounts().pipe(
        catchError(() => of({ applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 }))
      ),
      grouped: this.licenseApplicationService.getLicenseRenewalApplicationsByStatus().pipe(
        catchError(() => of({ applied: [], pending: [], objection: [], approved: [], rejected: [] }))
      )
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.allRows = this.flattenGroupedData(grouped);
        
        const approvedCount = this.allRows.filter(r => r.statusGroup === 'approved').length;
        const pendingCount = this.allRows.filter(r => r.statusGroup === 'pending').length;
        const objectionCount = this.allRows.filter(r => r.statusGroup === 'objection').length;
        const rejectedCount = this.allRows.filter(r => r.statusGroup === 'rejected').length;
        const awaitingPaymentCount = this.allRows.filter(r => r.statusGroup === 'awaiting-payment').length;

        this.counts = {
          applied: this.allRows.filter(r => r.statusGroup === 'applied').length,
          pending: pendingCount,
          objection: objectionCount,
          approved: approvedCount,
          rejected: rejectedCount,
          awaitingPayment: awaitingPaymentCount
        };

        if (this.activeSummaryFilter === '') {
          if (objectionCount > 0) this.activeSummaryFilter = 'objection';
          else if (awaitingPaymentCount > 0) this.activeSummaryFilter = 'awaiting-payment';
          else if (pendingCount > 0) this.activeSummaryFilter = 'pending';
        }
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load license renewal applications.';
        this.isLoading = false;
      }
    });
  }

  onSummaryCardClick(group: RenewalItem['statusGroup'] | 'all'): void {
    this.activeSummaryFilter = group === 'all' ? '' : group;
    this.pageIndex = 0;
    this.applyFilters();
  }

  viewApplication(row: RenewalItem): void {
    const id = row.id || row.applicationId;
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id,
        ref: row.applicationId,
        type: 'license-renewal',
        source: this.getDetailViewSource()
      }
    });
  }

  applyFilters(): void {
    const q = this.searchFilter.trim().toLowerCase();
    const rows = this.allRows.filter((row) => {
      const matchesSearch =
        !q ||
        row.applicationId.toLowerCase().includes(q) ||
        row.applicantName.toLowerCase().includes(q) ||
        row.oldLicenseId.toLowerCase().includes(q) ||
        row.currentStage.toLowerCase().includes(q);
      const matchesGroup = !this.activeSummaryFilter || row.statusGroup === this.activeSummaryFilter;
      return matchesSearch && matchesGroup;
    });
    this.filteredRows = rows;
  }

  get pagedRows(): RenewalItem[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.filteredRows.length ? this.pageIndex * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.filteredRows.length, (this.pageIndex + 1) * this.pageSize);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = Number(size || 5);
    this.pageIndex = 0;
  }

  onPageChange(delta: number): void {
    const next = this.pageIndex + delta;
    const maxPage = Math.max(0, Math.ceil(this.filteredRows.length / this.pageSize) - 1);
    this.pageIndex = Math.max(0, Math.min(maxPage, next));
  }

  private flattenGroupedData(grouped: GroupedRenewalResponse): RenewalItem[] {
    const output: RenewalItem[] = [];
    const groups: Array<[any, any[]]> = [
      ['applied', grouped?.applied || []],
      ['pending', grouped?.pending || []],
      ['objection', (grouped as any)?.objection || []],
      ['approved', grouped?.approved || []],
      ['rejected', grouped?.rejected || []]
    ];

    for (const [statusGroup, list] of groups) {
      for (const raw of list || []) {
        const appId = String(raw?.application_id || raw?.applicationId || raw?.id || '').trim();
        if (!appId) continue;

        const currentStageId = raw?.current_stage_id || raw?.currentStageId || raw?.current_stage;
        const currentStageRaw = String(raw?.current_stage_name || raw?.currentStageName || raw?.current_stage || '').trim();
        
        let finalStatusGroup: RenewalItem['statusGroup'] = statusGroup;
        const stageRawLower = currentStageRaw.toLowerCase();
        const isAwaitingPaymentStage = 
          stageRawLower.includes('awaiting payment') || 
          stageRawLower.includes('awaiting_payment') || 
          currentStageId === 119 || 
          currentStageId === '119' ||
          currentStageId === 109 ||
          currentStageId === '109';

        if (this.isLicenseeUser() && isAwaitingPaymentStage) {
          finalStatusGroup = 'awaiting-payment';
        }

        output.push({
          id: appId,
          applicationId: appId,
          applicantName: String(raw?.applicant_name || raw?.applicantName || '').trim() || '-',
          oldLicenseId: String(raw?.old_license_id || raw?.oldLicenseId || '').trim() || '-',
          submittedOn: this.formatDate(raw?.submitted_on || raw?.submittedOn || raw?.submitted_at || raw?.submittedAt || raw?.created_at || raw?.createdAt || raw?.updated_at || raw?.updatedAt),
          currentStage: this.computeCurrentStageLabel(finalStatusGroup, currentStageRaw),
          currentStageRaw: currentStageRaw || '-',
          statusGroup: finalStatusGroup,
          canView: true
        });
      }
    }
    return output;
  }

  private computeCurrentStageLabel(statusGroup: RenewalItem['statusGroup'], currentStageRaw: string): string {
    if (this.isLicenseeUser()) {
      if (statusGroup === 'approved') return 'Approved';
      if (statusGroup === 'rejected') return 'Rejected';
      if (statusGroup === 'objection') return 'Objection';
      if (statusGroup === 'awaiting-payment') return 'Awaiting Payment';
      return 'Pending';
    }
    return this.formatStageName(currentStageRaw || statusGroup);
  }

  private getDetailViewSource(): string {
    const roleId = Number(this.roleService.getCurrentUser()?.roleId || 0);
    if (this.roleService.isLicenseeRole(roleId)) return 'licensee';
    switch (roleId) {
      case 5: return 'permit-section';
      case 6: return 'itcell';
      case 7: return 'officer-in-charge';
      case 9:
      case 10:
        return 'commissioner-dashboard';
      default:
        return 'commissioner-dashboard';
    }
  }

  private formatDate(value: any): string {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return String(value || '').trim() || '-';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatStageName(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    return raw
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
