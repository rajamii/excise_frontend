import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { RoleService } from '../../../../../core/services/role.service';
import { ApplicationMovementComponent } from '../../../../licensee/licensee-dashboard/application-table/application-movement/application-movement.component';
import { ObjectionDetailsDialogComponent } from '../new-license/objection-details-dialog/objection-details-dialog.component';
import { SalesmanBarmanResolveObjectionsDialogComponent } from './salesman-barman-resolve-objections-dialog.component';
import { PrintApplicationComponent } from '../../../licensee-dashboard/application-table/print-application/print-application.component';
import { UnifiedDashboardService } from '../../../../../core/services/unified-dashboard.service';
import Swal from 'sweetalert2';

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
  private readonly labelApiBase = `${environment.apiBaseUrl}/transactional/label-registration`;
  private readonly salesmanApiBase = `${environment.apiBaseUrl}/transactional/salesman_barman`;

  currentSection = '';
  isLoading = false;
  error: string | null = null;

  counts = {
    newApplication: 0,
    approved: 0,
    pending: 0,
    objection: 0,
    rejected: 0,
    awaitingPayment: 0
  };

  activeCardFilter: 'new' | 'approved' | 'pending' | 'objection' | 'rejected' | 'awaiting-payment' | '' = '';

  pageSizeOptions: number[] = [5, 10, 15];
  pageSize = 5;
  pageIndex = 0;

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
    statusGroup: 'approved' | 'pending' | 'objection' | 'rejected' | 'awaiting-payment';
    hasObjectionHistory?: boolean;
    hasObjectionUpdate?: boolean;
    isPrintFeePaid?: boolean;
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
    private roleService: RoleService,
    private dialog: MatDialog,
    private unifiedDashboardService: UnifiedDashboardService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.currentSection = String(params?.['section'] || '').trim();
      this.loadData();
    });
  }

  /** Returns true when the current user needs to take action on this row. */
  needsLicenseeAction(row: { statusGroup: string; currentStageRaw: string }): boolean {
    const group = String(row.statusGroup || '').toLowerCase();
    const stage = String(row.currentStageRaw || '').toLowerCase();

    if (this.isLicenseeUser()) {
      // Licensee: only flag awaiting payment or objection
      return group === 'objection' ||
        group === 'awaiting-payment' ||
        (stage.includes('payment') && stage.includes('await')) ||
        stage === 'awaiting_payment' ||
        stage === 'awaiting payment';
    }

    // Admin/officer: flag only pending rows (needs processing by officer).
    // Objection rows are waiting for the licensee to respond — not the officer's action.
    return group === 'pending';
  }

  isLicenseeUser(): boolean {
    return this.roleService.isLicenseeRole() || this.roleService.getCurrentUser()?.roleId === 16;
  }

  isAdminUser(): boolean {
    return this.roleService.isAdminRole();
  }

  private simplifyStageForLicensee(stageValue: string, statusGroup: string, currentStageId?: any): string {
    if (statusGroup === 'approved') return 'Approved';
    if (statusGroup === 'rejected') return 'Rejected';
    if (statusGroup === 'objection') return 'Objection';

    const raw = String(stageValue || '').toLowerCase();
    const stageIdStr = String(currentStageId || '').trim();
    if (raw.includes('approve')) return 'Approved';
    if (raw.includes('reject')) return 'Rejected';
    if (
      (raw.includes('awaiting') && raw.includes('payment')) ||
      raw.includes('payment') ||
      stageIdStr === '109' ||
      stageIdStr === '119'
    ) return 'Awaiting Payment';
    return 'Pending';
  }

  onCardFilterClick(filter: 'new' | 'approved' | 'pending' | 'objection' | 'rejected' | 'awaiting-payment'): void {
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

    // Reset pagination whenever filters change.
    this.pageIndex = 0;
  }

  get totalPages(): number {
    if (this.filteredRows.length === 0) return 0;
    return Math.ceil(this.filteredRows.length / this.pageSize);
  }

  get pageStart(): number {
    if (this.filteredRows.length === 0) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get pageEnd(): number {
    if (this.filteredRows.length === 0) return 0;
    return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredRows.length);
  }

  get pagedRows(): typeof this.filteredRows {
    if (this.filteredRows.length === 0) return [];
    const start = this.pageIndex * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  onPageSizeChange(): void {
    this.pageIndex = 0;
  }

  prevPage(): void {
    if (this.pageIndex <= 0) return;
    this.pageIndex -= 1;
  }

  nextPage(): void {
    if (this.totalPages === 0) return;
    if (this.pageIndex >= this.totalPages - 1) return;
    this.pageIndex += 1;
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

    if (this.currentSection === 'label-registration') {
      this.router.navigate(['/supply-chain-view'], {
        queryParams: {
          type: 'label-registration',
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

  viewTimeline(row: { id: string; applicationId: string }): void {
    const applicationId = String(row.applicationId || row.id || '').trim();
    if (!applicationId) return;

    const encoded = encodeURIComponent(applicationId);
    let apiBase = this.salesmanApiBase;
    if (this.currentSection === 'company-registration') {
      apiBase = this.companyApiBase;
    } else if (this.currentSection === 'company-collaboration') {
      apiBase = this.collaborationApiBase;
    } else if (this.currentSection === 'label-registration') {
      apiBase = this.labelApiBase;
    }

    this.http.get<any>(`${apiBase}/detail/${encoded}/`).subscribe({
      next: (res: any) => {
        this.dialog.open(ApplicationMovementComponent, {
          width: '700px',
          maxHeight: '80vh',
          data: { movementDataSource: { data: [res] } }
        });
      },
      error: (err: any) => {
        const msg = err?.error?.detail || err?.error?.error || err?.message || 'Failed to load timeline.';
        void Swal.fire('Error', String(msg), 'error');
      }
    });
  }

  viewObjectionDetails(row: { id: string; applicationId: string; statusGroup?: string; hasObjectionHistory?: boolean }): void {
    if (!this.isAdminUser()) return;
    if (this.currentSection !== 'salesman-barman-registration' && this.currentSection !== 'company-registration') return;
    const hasHistory = Boolean((row as any)?.hasObjectionHistory) || String((row as any)?.statusGroup || '').toLowerCase() === 'objection';
    if (!hasHistory) return;

    const applicationId = String(row.applicationId || row.id || '').trim();
    if (!applicationId) return;

    this.dialog.open(ObjectionDetailsDialogComponent, {
      width: 'min(980px, 96vw)',
      maxWidth: '96vw',
      panelClass: 'objection-details-dialog',
      data: { applicationId }
    });
  }

  fixObjections(row: { id: string; applicationId: string; statusGroup?: string }): void {
    if (!this.isLicenseeUser()) return;
    if (this.currentSection !== 'salesman-barman-registration' && this.currentSection !== 'company-registration') return;
    if (String((row as any)?.statusGroup || '').toLowerCase() !== 'objection') return;

    const applicationId = String(row.applicationId || row.id || '').trim();
    if (!applicationId) return;

    const appType = this.currentSection === 'company-registration' ? 'company-registration' : 'salesman-barman';

    this.dialog.open(SalesmanBarmanResolveObjectionsDialogComponent, {
      width: 'min(1020px, 96vw)',
      maxWidth: '96vw',
      data: { applicationId, appType }
    }).afterClosed().subscribe((ok) => {
      if (ok) {
        if (appType === 'company-registration') {
          this.loadCompanyData();
        } else {
          this.loadSalesmanBarmanData();
        }
      }
    });
  }

  isCommissionerOrAdmin(): boolean {
    const user = this.roleService.getCurrentUser();
    if (!user) return false;
    return user.roleId === 1 || user.roleId === 10;
  }

  isCommissionerUser(): boolean {
    const user = this.roleService.getCurrentUser();
    if (!user) return false;
    return user.roleId === 10;
  }

  isPaymentSuccess(row: any): boolean {
    return String(row.paymentStatus || '').toLowerCase().includes('success');
  }

  printLicense(row: any): void {
    const appId = row.applicationId || row.id;
    if (!appId) {
      void Swal.fire('Error', 'Could not find application ID', 'error');
      return;
    }

    const type = this.currentSection === 'salesman-barman-registration' ? 'salesman-barman' : 'company-registration';

    this.unifiedDashboardService.getApplicationDetail(appId, type).subscribe({
      next: (fullApp: any) => {
        const formattedApp = {
          ...fullApp,
          type: type,
          applicationId: appId,
          raw: fullApp
        };
        this.dialog.open(PrintApplicationComponent, {
          width: '450px',
          data: { application: formattedApp, tableType: 'approved', returnUrl: this.router.url }
        });
      },
      error: (err: any) => {
        console.error('Error fetching application details:', err);
        const formattedApp = {
          ...row,
          type: type,
          applicationId: appId,
          raw: row
        };
        this.dialog.open(PrintApplicationComponent, {
          width: '450px',
          data: { application: formattedApp, tableType: 'approved', returnUrl: this.router.url }
        });
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
    if (this.currentSection === 'label-registration') {
      return 'Label Registration Entries';
    }
    return 'Company Registration Entries';
  }

  private loadData(): void {
    this.error = null;
    this.isLoading = true;

    // Reset filters when section changes so the default pending filter applies fresh.
    this.activeCardFilter = '';
    this.statusFilter = '';
    this.searchFilter = '';
    this.monthFilter = '';
    this.dateFromFilter = '';
    this.companyFilter = '';

    if (this.currentSection === 'salesman-barman-registration') {
      this.loadSalesmanBarmanData();
      return;
    }

    if (this.currentSection === 'company-collaboration') {
      this.loadCompanyCollaborationData();
      return;
    }

    if (this.currentSection === 'label-registration') {
      this.loadLabelRegistrationData();
      return;
    }

    this.loadCompanyData();
  }

  private loadLabelRegistrationData(): void {
    forkJoin({
      countsResult: this.http
        .get<any>(`${this.labelApiBase}/dashboard-counts/`)
        .pipe(
          map((data) => ({ data, error: null as any })),
          catchError((error) => of({ data: null, error }))
        ),
      groupedResult: this.http
        .get<any>(`${this.labelApiBase}/list-by-status/`)
        .pipe(
          map((data) => ({ data, error: null as any })),
          catchError((error) => of({ data: null, error }))
        ),
      listResult: this.http
        .get<any>(`${this.labelApiBase}/list/`)
        .pipe(
          map((data) => ({ data, error: null as any })),
          catchError((error) => of({ data: null, error }))
        )
    }).subscribe({
      next: ({ countsResult, groupedResult, listResult }) => {
        const groupedRows = groupedResult.data
          ? this.flattenLabelRegistrationGroupedData(groupedResult.data)
          : [];
        const fallbackRows = groupedRows.length === 0 && listResult.data
          ? this.flattenLabelRegistrationListData(listResult.data)
          : [];

        this.allRows = groupedRows.length > 0 ? groupedRows : fallbackRows;

        if (this.allRows.length === 0 && (groupedResult.error || listResult.error)) {
          this.error = this.extractHttpErrorMessage(
            groupedResult.error || listResult.error || countsResult.error,
            'Failed to load label registration entries.'
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
        this.error = 'Failed to load label registration entries.';
        this.isLoading = false;
      }
    });
  }

  private loadCompanyData(): void {
    forkJoin({
      counts: this.http
        .get<any>(`${this.companyApiBase}/dashboard-counts/`)
        .pipe(catchError(() => of({ approved: 0, pending: 0, rejected: 0, objection: 0, awaiting_payment: 0 }))),
      grouped: this.http
        .get<any>(`${this.companyApiBase}/list-by-status/`)
        .pipe(catchError(() => of({ applied: [], pending: [], approved: [], rejected: [], objection: [], awaiting_payment: [] })))
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.allRows = this.flattenCompanyGroupedData(grouped);
        
        // Normalize backend awaiting_payment to awaitingPayment for resolveCounts
        const rawCounts = {
          approved: Number(counts?.approved || 0),
          pending: Number(counts?.pending || 0),
          objection: Number(counts?.objection || 0),
          rejected: Number(counts?.rejected || 0),
          awaitingPayment: Number(counts?.awaiting_payment || counts?.awaitingPayment || 0)
        };
        this.counts = this.resolveCounts(this.allRows, rawCounts);
        this.stageFilterOptions = this.getStageFilterOptions(this.allRows);

        // Auto-select active tab if default filter is not set
        if (this.activeCardFilter === '') {
          if (this.counts.pending > 0) {
            this.activeCardFilter = 'pending';
            this.statusFilter = 'pending';
          } else if (this.counts.objection > 0) {
            this.activeCardFilter = 'objection';
            this.statusFilter = 'objection';
          } else if (this.counts.awaitingPayment > 0) {
            this.activeCardFilter = 'awaiting-payment';
            this.statusFilter = 'awaiting-payment';
          }
        }

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

        // Auto-select active tab if default filter is not set
        if (this.activeCardFilter === '') {
          if (this.counts.pending > 0) {
            this.activeCardFilter = 'pending';
            this.statusFilter = 'pending';
          } else if (this.counts.objection > 0) {
            this.activeCardFilter = 'objection';
            this.statusFilter = 'objection';
          } else if (this.counts.awaitingPayment > 0) {
            this.activeCardFilter = 'awaiting-payment';
            this.statusFilter = 'awaiting-payment';
          }
        }

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
    statusGroup: 'approved' | 'pending' | 'objection' | 'rejected' | 'awaiting-payment';
    hasObjectionHistory?: boolean;
    hasObjectionUpdate?: boolean;
  }> {
    const mapGroup = (
      items: any[] | undefined,
      statusGroup: 'approved' | 'pending' | 'objection' | 'rejected' | 'awaiting-payment'
    ) => {
      if (!Array.isArray(items)) return [];
      return items.map((item: any) => {
        const rawStage = this.resolveCompanyStage(item);
        const currentStageId = item?.current_stage_id ?? item?.currentStageId ?? item?.current_stage;

        const computedStage = this.isLicenseeUser()
          ? this.simplifyStageForLicensee(rawStage, statusGroup, currentStageId)
          : this.formatStageName(rawStage || 'submitted');

        let finalStatusGroup = statusGroup;
        if (this.isLicenseeUser() && computedStage === 'Awaiting Payment') {
          finalStatusGroup = 'awaiting-payment';
        }

        const transactions = Array.isArray(item?.transactions) ? item.transactions : [];
        const txnText = (t: any) => `${t?.action ?? ''} ${t?.remarks ?? ''} ${t?.to_stage ?? ''} ${t?.to_stageName ?? ''} ${t?.to_stage_name ?? ''}`;
        const hasHistoryFromTxn = transactions.some((t: any) => /objection/i.test(txnText(t)));
        const hasUpdateFromTxn = transactions.some((t: any) => /resolve|correct|update/i.test(txnText(t)) && /objection/i.test(txnText(t)));
        const hasObjectionHistory = statusGroup === 'objection' ||
          Boolean(item?.has_objection_history ?? item?.hasObjectionHistory ?? item?.has_objection ?? item?.hasObjection ?? item?.has_objections ?? item?.hasObjections) ||
          hasHistoryFromTxn;
        const hasObjectionUpdate = Boolean(item?.has_objection_update ?? item?.hasObjectionUpdate) || hasUpdateFromTxn;

        return {
          id: String(item?.id ?? item?.applicationId ?? item?.application_id ?? ''),
          applicationId: String(item?.applicationId ?? item?.application_id ?? item?.id ?? 'N/A'),
          submittedOn: this.formatDate(item?.created_at ?? item?.createdAt ?? item?.paymentDate ?? item?.payment_date),
          applicantName: String(item?.memberName ?? item?.member_name ?? 'N/A'),
          establishmentName: String(item?.companyName ?? item?.company_name ?? 'N/A'),
          currentStage: computedStage,
          currentStageRaw: String(rawStage || 'submitted'),
          statusGroup: finalStatusGroup,
          hasObjectionHistory,
          hasObjectionUpdate
        };
      });
    };

    const merged = [
      ...mapGroup(grouped?.pending, 'pending'),
      ...mapGroup(grouped?.approved, 'approved'),
      ...mapGroup(grouped?.rejected, 'rejected'),
      ...mapGroup(grouped?.objection, 'objection'),
      ...mapGroup(grouped?.applied, 'pending'),
      ...mapGroup(grouped?.awaiting_payment, 'awaiting-payment'),
      ...mapGroup(grouped?.awaitingPayment, 'awaiting-payment')
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

        // For licensees: classify by actual stage name so internal officer stages
        // (permit_section, commissioner) show as Pending, not Approved.
        // Only use the API bucket as 'approved' when the stage truly is final.
        const resolvedGroup = this.isLicenseeUser()
          ? this.resolveStatusGroup(rawStage, statusGroup)
          : statusGroup;

        // Display: licensees see 'Under Review' for officer stages, 'Approved' only when final
        let displayStage: string;
        if (this.isLicenseeUser()) {
          if (resolvedGroup === 'approved') displayStage = 'Approved';
          else if (resolvedGroup === 'rejected') displayStage = 'Rejected';
          else if (resolvedGroup === 'objection') displayStage = 'Objection';
          else displayStage = 'Under Review';
        } else {
          displayStage = this.formatStageName(rawStage);
        }

        return {
          id: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
          applicationId: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
          submittedOn: this.formatDate(item?.created_at ?? item?.createdAt ?? item?.updated_at ?? item?.updatedAt),
          applicantName: String(item?.licensee_name ?? item?.licenseeName ?? item?.applicant_name ?? item?.applicantName ?? 'N/A'),
          establishmentName: String(item?.brand_owner_name ?? item?.brandOwnerName ?? item?.brand_owner ?? item?.brandOwner ?? 'N/A'),
          currentStage: displayStage,
          currentStageRaw: rawStage,
          statusGroup: resolvedGroup
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

      const resolvedGroup = this.classifyStatus(rawStage);

      // Licensees see 'Under Review' for internal officer stages (permit_section, commissioner)
      let displayStage: string;
      if (this.isLicenseeUser()) {
        if (resolvedGroup === 'approved') displayStage = 'Approved';
        else if (resolvedGroup === 'rejected') displayStage = 'Rejected';
        else if (resolvedGroup === 'objection') displayStage = 'Objection';
        else displayStage = 'Under Review';
      } else {
        displayStage = this.formatStageName(rawStage);
      }

      return {
        id: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
        applicationId: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
        submittedOn: this.formatDate(item?.created_at ?? item?.createdAt ?? item?.updated_at ?? item?.updatedAt),
        applicantName: String(item?.licensee_name ?? item?.licenseeName ?? item?.applicant_name ?? item?.applicantName ?? 'N/A'),
        establishmentName: String(item?.brand_owner_name ?? item?.brandOwnerName ?? item?.brand_owner ?? item?.brandOwner ?? 'N/A'),
        currentStage: displayStage,
        currentStageRaw: rawStage,
        statusGroup: resolvedGroup
      };
    });
  }

  private flattenLabelRegistrationGroupedData(grouped: any): Array<{
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
      return items.map((item: any) => this.mapLabelRegistrationRow(item, statusGroup));
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

  private flattenLabelRegistrationListData(items: any): Array<{
    id: string;
    applicationId: string;
    submittedOn: string;
    applicantName: string;
    establishmentName: string;
    currentStage: string;
    currentStageRaw: string;
    statusGroup: 'approved' | 'pending' | 'objection' | 'rejected';
  }> {
    return this.unwrapArrayResponse(items).map((item: any) => this.mapLabelRegistrationRow(item));
  }

  private mapLabelRegistrationRow(
    item: any,
    fallback: 'approved' | 'pending' | 'objection' | 'rejected' = 'pending'
  ) {
    const rawStage = String(
      item?.current_stage_name ??
      item?.currentStageName ??
      item?.current_stage ??
      item?.currentStage ??
      item?.status ??
      'submitted'
    );
    const licensee = item?.licensee_details ?? item?.licenseeDetails ?? {};
    const product = item?.product_details ?? item?.productDetails ?? {};

    return {
      id: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
      applicationId: String(item?.application_id ?? item?.applicationId ?? item?.id ?? 'N/A'),
      submittedOn: this.formatDate(item?.created_at ?? item?.createdAt ?? item?.application_date ?? item?.applicationDate),
      applicantName: String(licensee?.applicantType ?? item?.applicant_name ?? item?.applicantName ?? 'N/A'),
      establishmentName: String(product?.brandName ?? product?.brand_name ?? product?.bottlerName ?? product?.bottler_name ?? 'N/A'),
      currentStage: this.formatStageName(rawStage),
      currentStageRaw: rawStage,
      statusGroup: this.resolveStatusGroup(rawStage, fallback)
    };
  }

  private loadSalesmanBarmanData(): void {
    forkJoin({
      counts: this.http
        .get<any>(`${this.salesmanApiBase}/dashboard-counts/`)
        .pipe(catchError(() => of({ approved: 0, pending: 0, rejected: 0, objection: 0 }))),
      grouped: this.http
        .get<any>(`${this.salesmanApiBase}/list-by-status/`)
        .pipe(catchError(() => of({ applied: [], pending: [], approved: [], rejected: [], objection: [] })))
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.allRows = this.flattenSalesmanGroupedData(grouped);
        
        const approvedCount = this.allRows.filter(r => r.statusGroup === 'approved').length;
        const pendingCount = this.allRows.filter(r => r.statusGroup === 'pending').length;
        const objectionCount = this.allRows.filter(r => r.statusGroup === 'objection').length;
        const rejectedCount = this.allRows.filter(r => r.statusGroup === 'rejected').length;
        const awaitingPaymentCount = this.allRows.filter(r => r.statusGroup === 'awaiting-payment').length;

        this.counts = {
          newApplication: this.allRows.length,
          approved: approvedCount,
          pending: pendingCount,
          objection: objectionCount,
          rejected: rejectedCount,
          awaitingPayment: awaitingPaymentCount
        };
        this.stageFilterOptions = this.getStageFilterOptions(this.allRows);
        this.companyOptions = this.getCompanyOptions(this.allRows);

        if (this.activeCardFilter === '') {
          if (pendingCount > 0) {
            this.activeCardFilter = 'pending';
            this.statusFilter = 'pending';
          } else if (objectionCount > 0) {
            this.activeCardFilter = 'objection';
            this.statusFilter = 'objection';
          } else if (awaitingPaymentCount > 0) {
            this.activeCardFilter = 'awaiting-payment';
            this.statusFilter = 'awaiting-payment';
          }
        }

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
    statusGroup: 'approved' | 'pending' | 'objection' | 'rejected' | 'awaiting-payment';
    hasObjectionHistory?: boolean;
    hasObjectionUpdate?: boolean;
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
        const currentStageId = item?.current_stage_id ?? item?.currentStageId ?? item?.current_stage;

        const computedStage = this.isLicenseeUser()
          ? this.simplifyStageForLicensee(rawStage, statusGroup, currentStageId)
          : this.formatStageName(rawStage);

        const transactions = Array.isArray(item?.transactions) ? item.transactions : [];
        const txnText = (t: any) => `${t?.action ?? ''} ${t?.remarks ?? ''} ${t?.to_stage ?? ''} ${t?.to_stageName ?? ''} ${t?.to_stage_name ?? ''}`;
        const hasHistoryFromTxn = transactions.some((t: any) => /objection/i.test(txnText(t)));
        const hasUpdateFromTxn = transactions.some((t: any) => /resolve|correct|update/i.test(txnText(t)) && /objection/i.test(txnText(t)));
        const hasObjectionHistory = statusGroup === 'objection' ||
          Boolean(item?.has_objection_history ?? item?.hasObjectionHistory ?? item?.has_objection ?? item?.hasObjection ?? item?.has_objections ?? item?.hasObjections) ||
          hasHistoryFromTxn;
        const hasObjectionUpdate = Boolean(item?.has_objection_update ?? item?.hasObjectionUpdate) || hasUpdateFromTxn;

        let finalStatusGroup: 'approved' | 'pending' | 'objection' | 'rejected' | 'awaiting-payment' = statusGroup;
        if (this.isLicenseeUser() && computedStage === 'Awaiting Payment') {
          finalStatusGroup = 'awaiting-payment';
        }

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
          currentStage: computedStage,
          currentStageRaw: rawStage,
          statusGroup: finalStatusGroup,
          hasObjectionHistory,
          hasObjectionUpdate,
          isPrintFeePaid: Boolean(item?.is_print_fee_paid ?? item?.isPrintFeePaid ?? false)
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
    if (fallback === 'rejected') {
      return fallback;
    }
    // Always classify by actual stage name so that items at officer stages
    // (permit_section, commissioner) show as 'pending' from licensee's view,
    // not as 'approved' just because the API placed them in the approved bucket.
    return this.classifyStatus(stageValue);
  }

  private classifyStatus(stageValue: string): 'approved' | 'pending' | 'objection' | 'rejected' {
    const value = String(stageValue || '').toLowerCase();
    if (value.includes('reject')) return 'rejected';
    if (value.includes('object')) return 'objection';
    if (value === 'approved' || value.includes('final_approved') || value.includes('issued') || value.includes('complete') || value === 'active') {
      return 'approved';
    }
    return 'pending';
  }

  private resolveCounts(
    rows: Array<{ statusGroup: any }>,
    rawCounts: any
  ): {
    newApplication: number;
    approved: number;
    pending: number;
    objection: number;
    rejected: number;
    awaitingPayment: number;
  } {
    if (rows.length > 0) {
      return { newApplication: 0, ...this.calculateCounts(rows) };
    }

    return {
      newApplication: 0,
      approved: Number(rawCounts?.approved || 0),
      pending: Number(rawCounts?.pending || rawCounts?.applied || 0),
      objection: Number(rawCounts?.objection || 0),
      rejected: Number(rawCounts?.rejected || 0),
      awaitingPayment: Number(rawCounts?.awaitingPayment || rawCounts?.awaiting_payment || 0)
    };
  }

  private calculateCounts(rows: Array<{ statusGroup: any }>): {
    approved: number;
    pending: number;
    objection: number;
    rejected: number;
    awaitingPayment: number;
  } {
    return rows.reduce(
      (acc, row) => {
        const group = String(row.statusGroup || '').toLowerCase();
        if (group === 'awaiting-payment' || group === 'awaiting_payment') {
          acc.awaitingPayment += 1;
        } else if (group === 'approved' || group === 'pending' || group === 'objection' || group === 'rejected') {
          (acc as any)[group] += 1;
        }
        return acc;
      },
      { approved: 0, pending: 0, objection: 0, rejected: 0, awaitingPayment: 0 } as any
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
