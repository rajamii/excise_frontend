import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { SpecialPermitService } from '../../../../../core/services/special-permit.service';
import { MaterialModule } from '../../../../../shared/material.module';

interface SpecialPermitCounts {
  applied: number;
  pending: number;
  objection: number;
  approved: number;
  rejected: number;
  awaitingPayment?: number;
}

interface SpecialPermitItem {
  id: string;
  applicationId: string;
  applicantName: string;
  establishmentName: string;
  submittedOn: string;
  currentStage: string;
  currentStageRaw: string;
  statusGroup: 'applied' | 'pending' | 'objection' | 'approved' | 'rejected' | 'awaiting-payment';
  canView: boolean;
  canPay: boolean;
  canPrint: boolean;
  paymentAmount: number;
}

@Component({
  selector: 'app-special-permit-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './special-permit-dashboard.component.html',
  styleUrls: ['./special-permit-dashboard.component.scss']
})
export class SpecialPermitDashboardComponent implements OnInit {
  isLoading = false;
  error: string | null = null;

  counts: SpecialPermitCounts = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 };
  allRows: SpecialPermitItem[] = [];
  filteredRows: SpecialPermitItem[] = [];

  pageSizeOptions: number[] = [5, 10, 15];
  pageSize = 5;
  pageIndex = 0;
  searchFilter = '';
  activeSummaryFilter: SpecialPermitItem['statusGroup'] | '' = '';

  constructor(
    private router: Router,
    private specialPermitService: SpecialPermitService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      counts: this.specialPermitService.getDashboardCounts(),
      grouped: this.specialPermitService.getApplicationsByStatus()
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.counts = {
          applied: counts?.applied || 0,
          pending: counts?.pending || 0,
          objection: counts?.objection || 0,
          approved: counts?.approved || 0,
          rejected: counts?.rejected || 0,
          awaitingPayment: counts?.awaiting_payment || counts?.awaitingPayment || 0
        };
        this.allRows = this.flattenGroupedData(grouped || {});
        this.pageIndex = 0;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load special permit applications.';
        this.allRows = [];
        this.filteredRows = [];
        this.isLoading = false;
      }
    });
  }

  onSummaryCardClick(group: SpecialPermitItem['statusGroup'] | 'all'): void {
    this.activeSummaryFilter = group === 'all' ? '' : group;
    this.pageIndex = 0;
    this.applyFilters();
  }

  viewApplication(row: SpecialPermitItem): void {
    const id = row.id || row.applicationId;
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id,
        ref: row.applicationId,
        type: 'special-permit',
        source: 'licensee'
      }
    });
  }

  payApplication(row: SpecialPermitItem): void {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'wallet',
        tab: 'license_fee',
        id: row.applicationId,
        type: 'special-permit',
        ref: row.applicationId,
        referenceNo: row.applicationId,
        amount: row.paymentAmount > 0 ? row.paymentAmount : undefined,
        action: 'pay',
        source: 'special-permit'
      }
    });
  }

  printPermit(row: SpecialPermitItem): void {
    Swal.fire({
      title: 'Special Permit License',
      text: 'Successful',
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }

  applyFilters(): void {
    const q = this.searchFilter.trim().toLowerCase();
    const rows = this.allRows.filter((row) => {
      const matchesSearch =
        !q ||
        row.applicationId.toLowerCase().includes(q) ||
        row.applicantName.toLowerCase().includes(q) ||
        row.establishmentName.toLowerCase().includes(q) ||
        row.currentStage.toLowerCase().includes(q);
      const matchesGroup = !this.activeSummaryFilter || row.statusGroup === this.activeSummaryFilter;
      return matchesSearch && matchesGroup;
    });
    this.filteredRows = rows;
  }

  get pagedRows(): SpecialPermitItem[] {
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

  private flattenGroupedData(grouped: any): SpecialPermitItem[] {
    const groups: Array<SpecialPermitItem['statusGroup']> = [
      'applied',
      'pending',
      'objection',
      'approved',
      'rejected',
      'awaiting-payment'
    ];

    return groups.flatMap((group) => {
      let rows: any[] = [];
      if (group === 'awaiting-payment') {
        rows = Array.isArray(grouped?.awaitingPayment) ? grouped.awaitingPayment :
               (Array.isArray(grouped?.awaiting_payment) ? grouped.awaiting_payment : []);
      } else {
        rows = Array.isArray(grouped?.[group]) ? grouped[group] : [];
      }
      return rows.map((row: any) => this.mapApplicationRow(row, group));
    });
  }

  private mapApplicationRow(row: any, group: SpecialPermitItem['statusGroup']): SpecialPermitItem {
    const applicationId = String(row?.application_id || row?.applicationId || row?.id || '');
    return {
      id: applicationId,
      applicationId,
      applicantName: row?.applicant_name || row?.applicantName || '-',
      establishmentName: row?.establishment_name || row?.establishmentName || row?.license_id || '-',
      submittedOn: this.formatDate(row?.created_at || row?.createdAt),
      currentStage: this.formatStage(row?.current_stage_name || row?.currentStageName || row?.current_stage || ''),
      currentStageRaw: row?.current_stage_name || row?.currentStageName || row?.current_stage || '',
      statusGroup: group,
      canView: Boolean(applicationId),
      canPay: group === 'awaiting-payment',
      canPrint: group === 'approved',
      paymentAmount: Number(row?.payment_amount ?? row?.paymentAmount ?? 0)
    };
  }

  private formatStage(value: string): string {
    if (!value) {
      return '-';
    }
    return String(value)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private formatDate(value: string): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
