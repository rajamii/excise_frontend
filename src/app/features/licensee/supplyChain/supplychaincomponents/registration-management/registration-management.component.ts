import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { RoleService } from '../../../../../core/services/role.service';

@Component({
  selector: 'app-registration-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration-management.component.html',
  styleUrls: ['./registration-management.component.scss']
})
export class RegistrationManagementComponent implements OnInit {
  private readonly companyApiBase = `${environment.apiBaseUrl}/transactional/company-registration`;
  private readonly collaborationApiBase = `${environment.apiBaseUrl}/transactional/company-collaboration`;
  private readonly salesmanApiBase = `${environment.apiBaseUrl}/transactional/salesman_barman`;

  currentSection = '';
  isLoading = false;
  error: string | null = null;

  counts = {
    newApplication: 0,
    approved: 0,
    pending: 0,
    objection: 0,
    rejected: 0
  };

  activeCardFilter: 'new' | 'approved' | 'pending' | 'objection' | 'rejected' | '' = '';

  allRows: Array<{
    id: string;
    applicationId: string;
    submittedOn: string;
    paymentStatus?: string;
    applicantName: string;
    establishmentName: string;
    companyName?: string;
    currentStage: string;
    currentStageRaw: string;
    statusGroup: 'approved' | 'pending' | 'objection' | 'rejected';
  }> = [];
  filteredRows = [...this.allRows];
  stageFilterOptions: string[] = [];
  statusFilter = '';
  searchFilter = '';
  monthFilter = '';
  dateFromFilter = '';
  companyFilter = '';
  companyOptions: string[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.currentSection = String(params?.['section'] || '').trim();
      this.loadData();
    });
  }

  isAdminUser(): boolean {
    return this.roleService.isAdminRole();
  }

  onCardFilterClick(filter: 'new' | 'approved' | 'pending' | 'objection' | 'rejected'): void {
    if (this.activeCardFilter === filter || filter === 'new') {
      // 'new' = Total Application — always shows all rows (no status filter)
      // toggling the same filter off also shows all rows
      this.activeCardFilter = filter === 'new' ? 'new' : '';
      this.statusFilter = '';
    } else {
      this.activeCardFilter = filter;
      this.statusFilter = filter;
    }
    this.applyFilters();
  }

  applyFilters(): void {
    const q = this.searchFilter.trim().toLowerCase();
    const selected = this.statusFilter.trim().toLowerCase();
    const dateFrom = this.dateFromFilter ? new Date(this.dateFromFilter) : null;

    this.filteredRows = this.allRows.filter((row) => {
      const stageRaw = String(row.currentStageRaw || '').toLowerCase();
      const stageText = String(row.currentStage || '').toLowerCase();

      // Status filter (driven by card click)
      const matchesStatus =
        !selected ||
        row.statusGroup === selected ||
        stageRaw === selected ||
        stageRaw.includes(selected) ||
        stageText === selected ||
        stageText.includes(selected);

      // Text search
      const matchesSearch =
        !q ||
        row.applicationId.toLowerCase().includes(q) ||
        String(row.paymentStatus || '').toLowerCase().includes(q) ||
        row.applicantName.toLowerCase().includes(q) ||
        row.establishmentName.toLowerCase().includes(q) ||
        row.currentStage.toLowerCase().includes(q);

      // Parse stored "DD-Mon-YYYY" back to a Date
      let rowDate: Date | null = null;
      if (row.submittedOn && row.submittedOn !== 'N/A') {
        const parsed = new Date(row.submittedOn.replace(/-/g, ' '));
        if (!isNaN(parsed.getTime())) rowDate = parsed;
      }

      // Month filter — 2-digit string "01"–"12"
      const matchesMonth = !this.monthFilter || (
        rowDate !== null && (rowDate.getMonth() + 1) === parseInt(this.monthFilter, 10)
      );

      // Single date filter — exact day match
      const matchesDate = !dateFrom || (
        rowDate !== null &&
        rowDate.getFullYear() === dateFrom.getFullYear() &&
        rowDate.getMonth() === dateFrom.getMonth() &&
        rowDate.getDate() === dateFrom.getDate()
      );

      // Company filter (admin only)
      const matchesCompany = !this.companyFilter ||
        String((row as any).companyName || '').toLowerCase() === this.companyFilter.toLowerCase();

      return matchesStatus && matchesSearch && matchesMonth && matchesDate && matchesCompany;
    });
  }

  clearFilters(): void {
    this.statusFilter = '';
    this.searchFilter = '';
    this.monthFilter = '';
    this.dateFromFilter = '';
    this.companyFilter = '';
    this.activeCardFilter = '';
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

    if (this.currentSection === 'company-collaboration') {
      this.router.navigate(['/supply-chain-view'], {
        queryParams: {
          type: 'company-collaboration',
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
    if (this.currentSection === 'company-collaboration') {
      return 'Company Collaboration Entries';
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

    if (this.currentSection === 'company-collaboration') {
      this.loadCompanyCollaborationData();
      return;
    }

    this.loadCompanyData();
  }

  private loadCompanyData(): void {
    forkJoin({
      counts: this.http
        .get<any>(`${this.companyApiBase}/dashboard-counts/`)
        .pipe(catchError(() => of({ approved: 0, pending: 0, rejected: 0, objection: 0 }))),
      grouped: this.http
        .get<any>(`${this.companyApiBase}/list-by-status/`)
        .pipe(catchError(() => of({ applied: [], pending: [], approved: [], rejected: [], objection: [] })))
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.allRows = this.flattenCompanyGroupedData(grouped);
        this.counts = {
          newApplication: 0,
          approved: Number(counts?.approved || 0),
          pending: Number(counts?.pending || 0),
          objection: Number(counts?.objection || 0),
          rejected: Number(counts?.rejected || 0)
        };
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

  private loadCompanyCollaborationData(): void {
    forkJoin({
      countsResult: this.http
        .get<any>(`${this.collaborationApiBase}/dashboard-counts/`)
        .pipe(
          map((data) => ({ data, error: null as any })),
          catchError((error) => of({ data: null, error }))
        ),
      groupedResult: this.http
        .get<any>(`${this.collaborationApiBase}/list-by-status/`)
        .pipe(
          map((data) => ({ data, error: null as any })),
          catchError((error) => of({ data: null, error }))
        ),
      listResult: this.http
        .get<any>(`${this.collaborationApiBase}/list/`)
        .pipe(
          map((data) => ({ data, error: null as any })),
          catchError((error) => of({ data: null, error }))
        )
    }).subscribe({
      next: ({ countsResult, groupedResult, listResult }) => {
        const groupedRows = groupedResult.data
          ? this.flattenCompanyCollaborationGroupedData(groupedResult.data)
          : [];
        const fallbackRows = groupedRows.length === 0 && listResult.data
          ? this.flattenCompanyCollaborationListData(listResult.data)
          : [];

        this.allRows = groupedRows.length > 0 ? groupedRows : fallbackRows;

        if (this.allRows.length === 0 && (groupedResult.error || listResult.error)) {
          this.error = this.extractHttpErrorMessage(
            groupedResult.error || listResult.error || countsResult.error,
            'Failed to load company collaboration entries.'
          );
          this.filteredRows = [];
          this.stageFilterOptions = [];
          this.counts = this.resolveCounts([], countsResult.data || {});
          this.isLoading = false;
          return;
        }

        this.counts = this.resolveCounts(this.allRows, countsResult.data || {});
        this.stageFilterOptions = this.getStageFilterOptions(this.allRows);
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load company collaboration entries.';
        this.isLoading = false;
      }
    });
  }

  private flattenCompanyGroupedData(grouped: any): Array<{
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
      if (!Array.isArray(items)) return [];
      return items.map((item: any) => {
        const rawStage = this.resolveCompanyStage(item);
        return {
          id: String(item?.id ?? item?.applicationId ?? item?.application_id ?? ''),
          applicationId: String(item?.applicationId ?? item?.application_id ?? item?.id ?? 'N/A'),
          submittedOn: this.formatDate(item?.created_at ?? item?.createdAt ?? item?.paymentDate ?? item?.payment_date),
          applicantName: String(item?.memberName ?? item?.member_name ?? 'N/A'),
          establishmentName: String(item?.companyName ?? item?.company_name ?? 'N/A'),
          currentStage: this.formatStageName(rawStage || 'submitted'),
          currentStageRaw: String(rawStage || 'submitted'),
          statusGroup
        };
      });
    };

    const merged = [
      ...mapGroup(grouped?.pending, 'pending'),
      ...mapGroup(grouped?.approved, 'approved'),
      ...mapGroup(grouped?.rejected, 'rejected'),
      ...mapGroup(grouped?.objection, 'objection'),
      ...mapGroup(grouped?.applied, 'pending')
    ];

    const seen = new Set<string>();
    return merged.filter((row) => {
      const key = String(row.applicationId || row.id || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private flattenCompanyCollaborationGroupedData(grouped: any): Array<{
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
      if (!Array.isArray(items)) return [];
      return items.map((item: any) => {
        const rawStage = String(
          item?.current_stage_name ??
          item?.currentStageName ??
          item?.current_stage ??
          item?.currentStage ??
          item?.status ??
          'submitted'
        );

        return {
          id: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
          applicationId: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
          submittedOn: this.formatDate(item?.created_at ?? item?.createdAt ?? item?.updated_at ?? item?.updatedAt),
          applicantName: String(item?.licensee_name ?? item?.licenseeName ?? item?.applicant_name ?? item?.applicantName ?? 'N/A'),
          establishmentName: String(item?.brand_owner_name ?? item?.brandOwnerName ?? item?.brand_owner ?? item?.brandOwner ?? 'N/A'),
          currentStage: this.formatStageName(rawStage),
          currentStageRaw: rawStage,
          statusGroup: this.resolveStatusGroup(rawStage, statusGroup)
        };
      });
    };

    const merged = [
      ...mapGroup(grouped?.pending, 'pending'),
      ...mapGroup(grouped?.approved, 'approved'),
      ...mapGroup(grouped?.rejected, 'rejected'),
      ...mapGroup(grouped?.objection, 'objection'),
      ...mapGroup(grouped?.applied, 'pending'),
      ...mapGroup(grouped?.in_review, 'pending')
    ];

    const seen = new Set<string>();
    return merged.filter((row) => {
      const key = String(row.applicationId || row.id || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private flattenCompanyCollaborationListData(items: any): Array<{
    id: string;
    applicationId: string;
    submittedOn: string;
    applicantName: string;
    establishmentName: string;
    currentStage: string;
    currentStageRaw: string;
    statusGroup: 'approved' | 'pending' | 'objection' | 'rejected';
  }> {
    return this.unwrapArrayResponse(items).map((item: any) => {
      const rawStage = String(
        item?.current_stage_name ??
        item?.currentStageName ??
        item?.current_stage ??
        item?.currentStage ??
        item?.status ??
        'submitted'
      );

      return {
        id: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
        applicationId: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
        submittedOn: this.formatDate(item?.created_at ?? item?.createdAt ?? item?.updated_at ?? item?.updatedAt),
        applicantName: String(item?.licensee_name ?? item?.licenseeName ?? item?.applicant_name ?? item?.applicantName ?? 'N/A'),
        establishmentName: String(item?.brand_owner_name ?? item?.brandOwnerName ?? item?.brand_owner ?? item?.brandOwner ?? 'N/A'),
        currentStage: this.formatStageName(rawStage),
        currentStageRaw: rawStage,
        statusGroup: this.classifyStatus(rawStage)
      };
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
        this.allRows = this.flattenSalesmanGroupedData(grouped);
        this.counts = {
          newApplication: Number((counts as any)?.new_application || (counts as any)?.newApplication || 0),
          approved: Number(counts?.approved || 0),
          pending: Number(counts?.pending || 0),
          objection: Number((counts as any)?.objection || 0),
          rejected: Number(counts?.rejected || 0)
        };
        this.stageFilterOptions = this.getStageFilterOptions(this.allRows);
        this.companyOptions = this.getCompanyOptions(this.allRows);
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
    paymentStatus?: string;
    applicantName: string;
    establishmentName: string;
    companyName?: string;
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
          paymentStatus: (() => {
            const raw = String(
              item?.application_fee_payment_status_display ??
              item?.applicationFeePaymentStatusDisplay ??
              item?.application_fee_payment_status ??
              item?.applicationFeePaymentStatus ??
              ''
            );
            // Applications submitted directly via the stepper have no payment gateway
            // transaction — treat them as Success (no payment required).
            const hasNewLicenseApp = !!(item?.new_license_application ?? item?.newLicenseApplication);
            if (!hasNewLicenseApp && (!raw || raw === 'Pending' || raw === 'P')) {
              return 'Success';
            }
            return raw || 'Pending';
          })(),
          applicantName: this.getSalesmanApplicantName(item),
          establishmentName: String(item?.license_category_name ?? item?.licenseCategoryName ?? 'N/A'),
          companyName: String(item?.applicant_full_name ?? item?.applicantFullName ?? item?.applicant_username ?? item?.applicantUsername ?? 'N/A'),
          currentStage: this.formatStageName(rawStage),
          currentStageRaw: rawStage,
          statusGroup
        };
      });
    };

    const merged = [
      ...mapGroup(grouped?.pending, 'pending'),
      ...mapGroup(grouped?.approved, 'approved'),
      ...mapGroup(grouped?.rejected, 'rejected'),
      ...mapGroup(grouped?.objection, 'objection'),
      ...mapGroup(grouped?.applied, 'pending')
    ];

    // Guard against backend bucket overlap by de-duplicating on application id.
    const seen = new Set<string>();
    return merged.filter((row) => {
      const key = String(row.applicationId || row.id || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

  private resolveStatusGroup(
    stageValue: string,
    fallback: 'approved' | 'pending' | 'objection' | 'rejected'
  ): 'approved' | 'pending' | 'objection' | 'rejected' {
    if (fallback === 'approved' || fallback === 'rejected') {
      return fallback;
    }
    return this.classifyStatus(stageValue);
  }

  private classifyStatus(stageValue: string): 'approved' | 'pending' | 'objection' | 'rejected' {
    const value = String(stageValue || '').toLowerCase();
    if (value.includes('reject')) return 'rejected';
    if (value.includes('object')) return 'objection';
    if (value.includes('approve')) return 'approved';
    return 'pending';
  }

  private resolveCounts(
    rows: Array<{ statusGroup: 'approved' | 'pending' | 'objection' | 'rejected' }>,
    rawCounts: any
  ): {
    newApplication: number;
    approved: number;
    pending: number;
    objection: number;
    rejected: number;
  } {
    if (rows.length > 0) {
      return { newApplication: 0, ...this.calculateCounts(rows) };
    }

    return {
      newApplication: 0,
      approved: Number(rawCounts?.approved || 0),
      pending: Number(rawCounts?.pending || rawCounts?.applied || 0),
      objection: Number(rawCounts?.objection || 0),
      rejected: Number(rawCounts?.rejected || 0)
    };
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

  private getCompanyOptions(
    rows: Array<{ companyName?: string }>
  ): string[] {
    const values = Array.from(
      new Set(
        rows
          .map((row) => String(row.companyName || '').trim())
          .filter((v) => !!v && v !== 'N/A')
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

  private unwrapArrayResponse(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray(response?.results)) {
      return response.results;
    }
    if (Array.isArray(response?.items)) {
      return response.items;
    }
    return [];
  }

  private extractHttpErrorMessage(error: any, fallback: string): string {
    const detail = error?.error?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim();
    }

    const message = error?.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }

    return fallback;
  }
}
