import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

import { environment } from '../../../../../../environments/environment';

interface NewLicenseCounts {
  applied: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface NewLicenseItem {
  id: string;
  applicationId: string;
  applicantName: string;
  establishmentName: string;
  submittedOn: string;
  currentStage: string;
  statusGroup: 'applied' | 'pending' | 'approved' | 'rejected';
}

interface GroupedNewLicenseResponse {
  applied: any[];
  pending: any[];
  approved: any[];
  rejected: any[];
}

@Component({
  selector: 'app-new-license-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-license-dashboard.component.html',
  styleUrls: ['./new-license-dashboard.component.scss']
})
export class NewLicenseDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly apiBase = `${environment.apiBaseUrl}/transactional/new_license_application`;

  isLoading = false;
  error: string | null = null;

  counts: NewLicenseCounts = {
    applied: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  };

  allRows: NewLicenseItem[] = [];
  filteredRows: NewLicenseItem[] = [];
  statusFilter = '';
  searchFilter = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      counts: this.http.get<NewLicenseCounts>(`${this.apiBase}/dashboard-counts/`).pipe(
        catchError(() => of({ applied: 0, pending: 0, approved: 0, rejected: 0 }))
      ),
      grouped: this.http.get<GroupedNewLicenseResponse>(`${this.apiBase}/list-by-status/`).pipe(
        catchError(() => of({ applied: [], pending: [], approved: [], rejected: [] }))
      )
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.counts = {
          applied: Number(counts?.applied || 0),
          pending: Number(counts?.pending || 0),
          approved: Number(counts?.approved || 0),
          rejected: Number(counts?.rejected || 0)
        };
        this.allRows = this.flattenGroupedData(grouped);
        this.applyFilters();
        if (this.allRows.length === 0) {
          this.error = null;
        }
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load new license applications.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredRows = this.allRows.filter((row) => {
      const matchesStatus = !this.statusFilter || row.statusGroup === this.statusFilter;
      const q = this.searchFilter.trim().toLowerCase();
      const matchesSearch = !q
        || row.applicationId.toLowerCase().includes(q)
        || row.applicantName.toLowerCase().includes(q)
        || row.establishmentName.toLowerCase().includes(q)
        || row.currentStage.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.searchFilter = '';
    this.applyFilters();
  }

  viewApplication(row: NewLicenseItem): void {
    const id = row.id || row.applicationId;
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id,
        ref: row.applicationId,
        type: 'new-license',
        source: 'licensee'
      }
    });
  }

  private flattenGroupedData(grouped: GroupedNewLicenseResponse): NewLicenseItem[] {
    const mapGroup = (items: any[] | undefined, statusGroup: NewLicenseItem['statusGroup']): NewLicenseItem[] => {
      if (!Array.isArray(items)) {
        return [];
      }

      return items.map((item: any) => ({
        id: String(item?.application_id || item?.id || 'N/A'),
        applicationId: String(item?.application_id || item?.applicationId || item?.id || 'N/A'),
        applicantName: this.getApplicantName(item),
        establishmentName: String(item?.establishment_name || item?.establishmentName || 'N/A'),
        submittedOn: this.formatDate(item?.created_at || item?.createdAt || item?.submitted_on),
        currentStage: String(item?.current_stage_name || item?.currentStageName || item?.current_stage || statusGroup),
        statusGroup
      }));
    };

    return [
      ...mapGroup(grouped?.applied, 'applied'),
      ...mapGroup(grouped?.pending, 'pending'),
      ...mapGroup(grouped?.approved, 'approved'),
      ...mapGroup(grouped?.rejected, 'rejected')
    ];
  }

  private getApplicantName(item: any): string {
    if (item?.applicant_name) return String(item.applicant_name);
    if (item?.applicantName) return String(item.applicantName);
    if (item?.applicant?.first_name || item?.applicant?.last_name) {
      return `${item?.applicant?.first_name || ''} ${item?.applicant?.last_name || ''}`.trim();
    }
    return 'N/A';
  }

  private formatDate(dateValue: string | undefined): string {
    if (!dateValue) return 'N/A';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return 'N/A';

    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-');
  }
}
