import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { MaterialModule } from '../../../../../shared/material.module';
import { RoleService } from '../../../../../core/services/role.service';

interface RenewalCounts {
  applied: number;
  pending: number;
  objection: number;
  approved: number;
  rejected: number;
}

interface RenewalItem {
  id: string;
  applicationId: string;
  applicantName: string;
  oldLicenseId: string;
  submittedOn: string;
  currentStage: string;
  currentStageRaw: string;
  statusGroup: 'applied' | 'pending' | 'objection' | 'approved' | 'rejected';
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
  private http = inject(HttpClient);
  private roleService = inject(RoleService);
  private readonly apiBase = `${environment.apiBaseUrl}/transactional/license_renewal_application`;

  isLoading = false;
  error: string | null = null;

  counts: RenewalCounts = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 };
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
      counts: this.http.get<RenewalCounts>(`${this.apiBase}/dashboard-counts/`).pipe(
        catchError(() => of({ applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 }))
      ),
      grouped: this.http.get<GroupedRenewalResponse>(`${this.apiBase}/list-by-status/`).pipe(
        catchError(() => of({ applied: [], pending: [], objection: [], approved: [], rejected: [] }))
      )
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.counts = {
          applied: Number(counts?.applied || 0),
          pending: Number(counts?.pending || 0),
          objection: Number((counts as any)?.objection || 0),
          approved: Number(counts?.approved || 0),
          rejected: Number(counts?.rejected || 0)
        };
        this.allRows = this.flattenGroupedData(grouped);
        if (this.activeSummaryFilter === '') {
          const objectionCount = Number((counts as any)?.objection || 0);
          const pendingCount = Number(counts?.pending || 0);
          if (objectionCount > 0) this.activeSummaryFilter = 'objection';
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
    const groups: Array<[RenewalItem['statusGroup'], any[]]> = [
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
        output.push({
          id: appId,
          applicationId: appId,
          applicantName: String(raw?.applicant_name || raw?.applicantName || '').trim() || '—',
          oldLicenseId: String(raw?.old_license_id || raw?.oldLicenseId || '').trim() || '—',
          submittedOn: String(raw?.created_at || raw?.submitted_at || raw?.submittedAt || '').trim(),
          currentStage: String(raw?.current_stage_name || raw?.currentStageName || raw?.current_stage || '').trim() || '—',
          currentStageRaw: String(raw?.current_stage_name || raw?.currentStageName || raw?.current_stage || '').trim() || '—',
          statusGroup,
          canView: true
        });
      }
    }
    return output;
  }
}

