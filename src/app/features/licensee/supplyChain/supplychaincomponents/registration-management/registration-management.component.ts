import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-registration-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration-management.component.html',
  styleUrls: ['./registration-management.component.scss']
})
export class RegistrationManagementComponent implements OnInit {
  private readonly companyApiBase = `${environment.apiBaseUrl}/transactional/company-registration`;
  private readonly salesmanApiBase = `${environment.apiBaseUrl}/transactional/salesman_barman`;

  currentSection = '';
  isLoading = false;
  error: string | null = null;

  counts = {
    approved: 0,
    pending: 0,
    objection: 0,
    rejected: 0
  };

  allRows: Array<{
    id: string;
    applicationId: string;
    submittedOn: string;
    applicantName: string;
    establishmentName: string;
    currentStage: string;
    currentStageRaw: string;
    statusGroup: 'approved' | 'pending' | 'objection' | 'rejected';
  }> = [];
  filteredRows = [...this.allRows];
  stageFilterOptions: string[] = [];
  statusFilter = '';
  searchFilter = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.currentSection = String(params?.['section'] || '').trim();
      this.loadData();
    });
  }

  applyFilters(): void {
    const q = this.searchFilter.trim().toLowerCase();
    const selected = this.statusFilter.trim().toLowerCase();

    this.filteredRows = this.allRows.filter((row) => {
      const stageRaw = String(row.currentStageRaw || '').toLowerCase();
      const stageText = String(row.currentStage || '').toLowerCase();

      const matchesStatus =
        !selected ||
        row.statusGroup === selected ||
        stageRaw === selected ||
        stageRaw.includes(selected) ||
        stageText === selected ||
        stageText.includes(selected);

      const matchesSearch =
        !q ||
        row.applicationId.toLowerCase().includes(q) ||
        row.applicantName.toLowerCase().includes(q) ||
        row.establishmentName.toLowerCase().includes(q) ||
        row.currentStage.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.searchFilter = '';
    this.applyFilters();
  }

  viewApplication(row: { id: string; applicationId: string }): void {
    if (this.currentSection === 'salesman-barman-registration') {
      this.router.navigate(['/supply-chain-view'], {
        queryParams: {
          type: 'salesman-barman-registration',
          id: row.id || row.applicationId,
          ref: row.applicationId,
          source: 'licensee'
        }
      });
      return;
    }

    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        type: 'company-registration',
        id: row.id || row.applicationId,
        ref: row.applicationId,
        source: 'licensee'
      }
    });
  }

  get entriesTitle(): string {
    if (this.currentSection === 'salesman-barman-registration') {
      return 'Salesman/Barman Application Entries';
    }
    return 'Company Registration Entries';
  }

  private loadData(): void {
    this.error = null;
    this.isLoading = true;

    if (this.currentSection === 'salesman-barman-registration') {
      this.loadSalesmanBarmanData();
      return;
    }

    this.loadCompanyData();
  }

  private loadCompanyData(): void {
    this.http
      .get<{ count?: number; results?: any[] }>(`${this.companyApiBase}/`)
      .pipe(
        catchError(() => of({ count: 0, results: [] }))
      )
      .subscribe({
        next: (response) => {
          const rows = Array.isArray(response?.results) ? response.results : [];
          this.allRows = rows.map((item: any) => {
            const rawStage = this.resolveCompanyStage(item);
            const normalized = this.classifyStatus(rawStage);

            return {
              id: String(item?.id ?? item?.applicationId ?? ''),
              applicationId: String(item?.applicationId ?? item?.application_id ?? item?.id ?? 'N/A'),
              submittedOn: this.formatDate(item?.created_at ?? item?.createdAt ?? item?.paymentDate),
              applicantName: String(item?.memberName ?? item?.member_name ?? 'N/A'),
              establishmentName: String(item?.companyName ?? item?.company_name ?? 'N/A'),
              currentStage: this.formatStageName(rawStage || 'submitted'),
              currentStageRaw: String(rawStage || 'submitted'),
              statusGroup: normalized
            };
          });

          this.counts = this.calculateCounts(this.allRows);
          this.stageFilterOptions = this.getStageFilterOptions(this.allRows);
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => {
          this.error = 'Failed to load company registration entries.';
          this.isLoading = false;
        }
      });
  }

  private loadSalesmanBarmanData(): void {
    forkJoin({
      counts: this.http
        .get<any>(`${this.salesmanApiBase}/dashboard-counts/`)
        .pipe(catchError(() => of({ approved: 0, pending: 0, rejected: 0 }))),
      grouped: this.http
        .get<any>(`${this.salesmanApiBase}/list-by-status/`)
        .pipe(catchError(() => of({ applied: [], pending: [], approved: [], rejected: [] })))
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.counts = {
          approved: Number(counts?.approved || 0),
          pending: Number(counts?.pending || 0),
          objection: Number((counts as any)?.objection || 0),
          rejected: Number(counts?.rejected || 0)
        };

        this.allRows = this.flattenSalesmanGroupedData(grouped);
        this.stageFilterOptions = this.getStageFilterOptions(this.allRows);
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load salesman/barman registration entries.';
        this.isLoading = false;
      }
    });
  }

  private flattenSalesmanGroupedData(grouped: any): Array<{
    id: string;
    applicationId: string;
    submittedOn: string;
    applicantName: string;
    establishmentName: string;
    currentStage: string;
    currentStageRaw: string;
    statusGroup: 'approved' | 'pending' | 'objection' | 'rejected';
  }> {
    const mapGroup = (
      items: any[] | undefined,
      statusGroup: 'approved' | 'pending' | 'objection' | 'rejected'
    ) => {
      if (!Array.isArray(items)) {
        return [];
      }

      return items.map((item: any) => {
        const rawStage = String(
          item?.current_stage_name ??
          item?.currentStageName ??
          item?.current_stage ??
          item?.currentStage ??
          statusGroup
        );

        return {
          id: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
          applicationId: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
          submittedOn: this.formatDate(item?.created_at ?? item?.createdAt ?? item?.submitted_on),
          applicantName: this.getSalesmanApplicantName(item),
          establishmentName: String(item?.license_category_name ?? item?.licenseCategoryName ?? 'N/A'),
          currentStage: this.formatStageName(rawStage),
          currentStageRaw: rawStage,
          statusGroup
        };
      });
    };

    return [
      ...mapGroup(grouped?.pending, 'pending'),
      ...mapGroup(grouped?.approved, 'approved'),
      ...mapGroup(grouped?.rejected, 'rejected'),
      ...mapGroup(grouped?.applied, 'pending')
    ];
  }

  private getSalesmanApplicantName(item: any): string {
    const fullName = [
      item?.firstName,
      item?.middleName,
      item?.lastName
    ].filter((value: string) => !!String(value || '').trim()).join(' ').trim();

    if (fullName) {
      return fullName;
    }
    return String(item?.applicant_name ?? item?.applicantName ?? 'N/A');
  }

  private resolveCompanyStage(item: any): string {
    return String(
      item?.current_stage_name ??
      item?.currentStageName ??
      item?.current_stage ??
      item?.currentStage ??
      item?.status ??
      item?.application_status ??
      'submitted'
    );
  }

  private classifyStatus(stageValue: string): 'approved' | 'pending' | 'objection' | 'rejected' {
    const value = String(stageValue || '').toLowerCase();
    if (value.includes('reject')) return 'rejected';
    if (value.includes('object')) return 'objection';
    if (value.includes('approve')) return 'approved';
    return 'pending';
  }

  private calculateCounts(rows: Array<{ statusGroup: 'approved' | 'pending' | 'objection' | 'rejected' }>): {
    approved: number;
    pending: number;
    objection: number;
    rejected: number;
  } {
    return rows.reduce(
      (acc, row) => {
        acc[row.statusGroup] += 1;
        return acc;
      },
      { approved: 0, pending: 0, objection: 0, rejected: 0 }
    );
  }

  private getStageFilterOptions(
    rows: Array<{ currentStage: string }>
  ): string[] {
    const values = Array.from(
      new Set(
        rows
          .map((row) => String(row.currentStage || '').trim())
          .filter((value) => !!value)
      )
    );
    values.sort((a, b) => a.localeCompare(b));
    return values;
  }

  private formatDate(value: string | undefined): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-');
  }

  private formatStageName(stageValue: string): string {
    return String(stageValue || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
