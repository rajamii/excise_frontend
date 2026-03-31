import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { HologramService, DailyRegisterEntry, DailyRegisterSummary } from '../../../../core/services/hologram.service';
import { environment } from '../../../../../environments/environment';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface FilterOptions {
  referenceNumber: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  onlyOverdue: boolean;
  distillery: string;
  completion: '' | 'onTime' | 'late';
}

@Component({
  selector: 'app-dailyhologramrecordregister',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dailyhologramrecordregister.component.html',
  styleUrl: './dailyhologramrecordregister.component.scss'
})
export class DailyhologramrecordregisterComponent implements OnInit, OnDestroy {
  Math = Math;
  private readonly IST_DEADLINE_UTC_HOUR = 11; // 5:00 PM IST == 11:30 UTC
  private readonly IST_DEADLINE_UTC_MINUTE = 30;
  private destroy$ = new Subject<void>();
  private readonly licenseApiBase = `${environment.apiBaseUrl}/masters/license`;
  private readonly authUsersApiBase = `${environment.apiBaseUrl}/auth/users`;
  private readonly hologramApiBase = `${environment.apiBaseUrl}/transactional/supply_chain/hologram`;
  now = new Date();
  
  dailyRegisterEntries: DailyRegisterEntry[] = [];
  filteredEntries: DailyRegisterEntry[] = [];
  paginatedEntries: DailyRegisterEntry[] = [];
  summary: DailyRegisterSummary = {
    totalEntries: 0,
    applied: 0,
    underProcess: 0,
    completedOnTime: 0,
    completedLate: 0,
    overdue: 0
  };

  filters: FilterOptions = {
    referenceNumber: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    onlyOverdue: false,
    distillery: '',
    completion: ''
  };

  activeSummaryFilter: 'all' | 'applied' | 'underProcess' | 'onTime' | 'late' | 'overdue' = 'all';

  // List of distilleries/breweries - will be populated from backend
  distilleries: string[] = [];
  private createdDistilleryBreweryNames: string[] = [];
  private oicMappedEstablishmentNames: string[] = [];
  private hologramRequestLicenseeNames: string[] = [];
  private oicMappedCountByName: Record<string, number> = {};

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Selected entry for details modal
  selectedEntry: DailyRegisterEntry | null = null;

  // Loading state
  isLoading = false;
  errorMessage = '';

  // SLA breach alert for commissioner-approved entries not updated by configured deadline
  approvalDeadlineBreaches: DailyRegisterEntry[] = [];
  approvalDeadlineBreachMessage = '';
  approvalDeadlineLabel = '';

  constructor(
    private hologramService: HologramService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadDropdownSources();
    this.loadDailyRegisterEntries(true);
    this.startClock();
    this.startDeadlineBreachCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private startClock(): void {
    // Drive "Time Remaining" countdown without hitting the backend.
    interval(5_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.now = new Date();
      });
  }

  private startDeadlineBreachCheck(): void {
    interval(60_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateApprovalDeadlineBreaches(this.now));
  }

  loadDailyRegisterEntries(showLoader: boolean = false) {
    if (showLoader) {
      this.isLoading = true;
      this.errorMessage = '';
    }
    
    this.hologramService.getDailyRegisterOverview().subscribe({
      next: (response) => {
        this.summary = response.summary;
        this.dailyRegisterEntries = response.entries;

        this.updateDistilleryOptions(response.entries);
        
        this.applyFilters();
        this.updateApprovalDeadlineBreaches(this.now);
        if (showLoader) {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading daily register:', error);
        if (showLoader) {
          this.errorMessage = 'Failed to load daily register data. Please try again.';
          this.isLoading = false;
        }
      }
    });
  }

  private updateApprovalDeadlineBreaches(now: Date = new Date()): void {
    const breaches = (this.dailyRegisterEntries || []).filter((entry) => this.isApprovalUpdateOverdue(entry, now));

    this.approvalDeadlineBreaches = breaches;
    // SLA rule for this screen: deadline is always 5:00 PM IST.
    this.approvalDeadlineLabel = '5:00 PM';
    if (breaches.length > 0) {
      const sampleRefs = breaches.slice(0, 4).map((e) => e.referenceNo).join(', ');
      this.approvalDeadlineBreachMessage =
        `${breaches.length} approved hologram request(s) not updated by ${this.approvalDeadlineLabel || 'deadline'}. ` +
        (sampleRefs ? `Ref: ${sampleRefs}${breaches.length > 4 ? '…' : ''}` : '');
    } else {
      this.approvalDeadlineBreachMessage = '';
    }

    // Keep commissioner dashboard warning in sync
    try {
      const simplified = breaches.map((e) => ({
        referenceNo: e.referenceNo,
        distilleryName: e.distilleryName,
        approvalDate: e.approvalDate,
        approvalTime: e.approvalTime,
        status: e.status,
        deadline: (e as any).deadline,
      }));
      localStorage.setItem('overdueHologramEntries', JSON.stringify(simplified));
      window.dispatchEvent(new CustomEvent('overdueHologramAlert', { detail: { entries: simplified } }));
    } catch {
      // ignore storage errors
    }
  }

  private isApprovalUpdateOverdue(entry: DailyRegisterEntry, now: Date): boolean {
    if (!entry) return false;
    if (!entry.approvalDate) return false; // not approved yet
    if (entry.status === 'COMPLETED') return false;

    const deadline = this.getEntryDeadlineAt5Pm(entry);
    if (!deadline) return false;
    return now.getTime() > deadline.getTime();
  }

  private getDeadlineLabel(deadlineIso?: string | null): string {
    const iso = String(deadlineIso || '').trim();
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private loadDropdownSources(): void {
    this.loadOicMappedEstablishments();
    this.loadCreatedDistilleryBreweryNames();
    this.loadHologramRequestLicensees();
  }

  private loadCreatedDistilleryBreweryNames(): void {
    this.http.get<any>(`${this.licenseApiBase}/list/?page_size=2000`).subscribe({
      next: (payload) => {
        const rows = this.extractRows(payload);
        const result = new Set<string>();
        for (const row of rows) {
          if (!this.isDistilleryOrBrewery(row)) {
            continue;
          }
          const name = this.extractLicenseeName(row);
          if (name) {
            result.add(name);
          }
        }
        this.createdDistilleryBreweryNames = Array.from(result).sort((a, b) => a.localeCompare(b));
        this.updateDistilleryOptions(this.dailyRegisterEntries);
      },
      error: () => {
        this.createdDistilleryBreweryNames = [];
        this.updateDistilleryOptions(this.dailyRegisterEntries);
      }
    });
  }

  private loadOicMappedEstablishments(): void {
    this.http.get<any>(`${this.authUsersApiBase}/oic/officers/?page_size=2000`).subscribe({
      next: (payload) => {
        const rows = this.extractRows(payload);
        const countByName: Record<string, number> = {};
        for (const row of rows) {
          const name = String(row?.establishment_name || row?.establishmentName || '').trim();
          if (!name) {
            continue;
          }
          countByName[name] = (countByName[name] || 0) + 1;
        }

        this.oicMappedCountByName = countByName;
        this.oicMappedEstablishmentNames = Object.keys(countByName).sort((a, b) => a.localeCompare(b));
        this.updateDistilleryOptions(this.dailyRegisterEntries);
      },
      error: () => {
        this.oicMappedCountByName = {};
        this.oicMappedEstablishmentNames = [];
        this.updateDistilleryOptions(this.dailyRegisterEntries);
      }
    });
  }

  private loadHologramRequestLicensees(): void {
    this.http.get<any>(`${this.hologramApiBase}/request/?page_size=2000`).subscribe({
      next: (payload) => {
        const rows = this.extractRows(payload);
        const names = new Set<string>();
        for (const row of rows) {
          const name = String(
            row?.licenseeName ||
            row?.licensee_name ||
            row?.manufacturingUnit ||
            row?.manufacturing_unit ||
            ''
          ).trim();
          if (name) {
            names.add(name);
          }
        }

        this.hologramRequestLicenseeNames = Array.from(names).sort((a, b) => a.localeCompare(b));
        this.updateDistilleryOptions(this.dailyRegisterEntries);
      },
      error: () => {
        this.hologramRequestLicenseeNames = [];
        this.updateDistilleryOptions(this.dailyRegisterEntries);
      }
    });
  }

  private extractRows(payload: any): any[] {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const candidates = [
      payload.results,
      payload.data,
      payload.items,
      payload.rows,
      payload.approved,
      payload.officers,
      payload.establishments
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private updateDistilleryOptions(entries: DailyRegisterEntry[]): void {
    const entryNames = Array.from(
      new Set((entries || []).map((e) => String(e?.distilleryName || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const merged = [
      ...this.oicMappedEstablishmentNames,
      ...this.createdDistilleryBreweryNames,
      ...this.hologramRequestLicenseeNames,
      ...entryNames
    ];

    const normalized = new Map<string, string>();
    for (const raw of merged) {
      const trimmed = String(raw || '').trim();
      if (!trimmed) {
        continue;
      }
      const key = trimmed.toLowerCase();
      if (!normalized.has(key)) {
        normalized.set(key, trimmed);
      }
    }

    this.distilleries = Array.from(normalized.values()).sort((a, b) => a.localeCompare(b));

    if (this.filters.distillery && !this.distilleries.includes(this.filters.distillery)) {
      this.filters.distillery = '';
    }
  }

  getDistilleryOptionLabel(name: string): string {
    return name;
  }

  private isDistilleryOrBrewery(row: any): boolean {
    const subCategoryId = Number(
      row?.license_sub_category_id ??
      row?.licenseSubCategoryId ??
      row?.license_sub_category?.id ??
      row?.licenseSubCategory?.id ??
      0
    );
    if (subCategoryId === 1 || subCategoryId === 2) {
      return true;
    }

    const subCategoryName = String(
      row?.license_sub_category_name ??
      row?.licenseSubCategoryName ??
      row?.license_sub_category?.description ??
      row?.licenseSubCategory?.description ??
      row?.license_sub_category ??
      row?.licenseSubCategory ??
      ''
    ).toLowerCase();

    const categoryTokens = [
      subCategoryName,
      String(row?.license_category_name ?? row?.licenseCategoryName ?? row?.license_category ?? row?.licenseCategory ?? '').toLowerCase(),
      String(row?.license_type_name ?? row?.licenseTypeName ?? row?.license_type ?? row?.licenseType ?? '').toLowerCase(),
      String(row?.category ?? '').toLowerCase(),
      String(row?.sub_category ?? row?.subCategory ?? '').toLowerCase()
    ].join(' ');

    return categoryTokens.includes('brew') || categoryTokens.includes('distill');
  }

  private extractLicenseeName(row: any): string {
    return String(
      row?.manufacturing_unit_name ??
      row?.manufacturingUnitName ??
      row?.establishment_name ??
      row?.establishmentName ??
      row?.licensee_name ??
      row?.licenseeName ??
      ''
    ).trim();
  }

  applyFilters() {
    this.filteredEntries = this.dailyRegisterEntries.filter(entry => {
      const matchesReference = !this.filters.referenceNumber ||
        entry.referenceNo.toLowerCase().includes(this.filters.referenceNumber.toLowerCase());

      const matchesStatus = !this.filters.status || entry.status === this.filters.status;
      const matchesType = !this.filters.type || entry.hologramType === this.filters.type;

      const entryDate = this.getEntryDateForFiltering(entry);
      const fromDate = this.filters.dateFrom ? new Date(this.filters.dateFrom) : null;
      const toDate = this.filters.dateTo ? new Date(this.filters.dateTo) : null;

      const matchesDateFrom = !fromDate || !entryDate || entryDate.getTime() >= fromDate.getTime();
      const matchesDateTo = !toDate || !entryDate || entryDate.getTime() <= toDate.getTime();

      const matchesOverdue = !this.filters.onlyOverdue || entry.isOverdue;

      const matchesDistillery = !this.filters.distillery || 
        entry.distilleryName === this.filters.distillery;

      const matchesCompletion =
        !this.filters.completion ||
        (this.filters.completion === 'onTime' && entry.status === 'COMPLETED' && entry.completedOnTime === true) ||
        (this.filters.completion === 'late' && entry.status === 'COMPLETED' && entry.completedOnTime === false);

      return matchesReference && matchesStatus && matchesType && 
             matchesDateFrom && matchesDateTo && matchesOverdue && matchesDistillery && matchesCompletion;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  setSummaryFilter(filter: 'all' | 'applied' | 'underProcess' | 'onTime' | 'late' | 'overdue'): void {
    this.activeSummaryFilter = filter;

    if (filter === 'all') {
      this.filters.status = '';
      this.filters.onlyOverdue = false;
      this.filters.completion = '';
      this.applyFilters();
      return;
    }

    if (filter === 'applied') {
      this.filters.status = 'APPLIED';
      this.filters.onlyOverdue = false;
      this.filters.completion = '';
      this.applyFilters();
      return;
    }

    if (filter === 'underProcess') {
      this.filters.status = 'UNDER_PROCESS';
      this.filters.onlyOverdue = false;
      this.filters.completion = '';
      this.applyFilters();
      return;
    }

    if (filter === 'onTime') {
      this.filters.status = 'COMPLETED';
      this.filters.onlyOverdue = false;
      this.filters.completion = 'onTime';
      this.applyFilters();
      return;
    }

    if (filter === 'late') {
      this.filters.status = 'COMPLETED';
      this.filters.onlyOverdue = false;
      this.filters.completion = 'late';
      this.applyFilters();
      return;
    }

    if (filter === 'overdue') {
      this.filters.status = '';
      this.filters.onlyOverdue = true;
      this.filters.completion = '';
      this.applyFilters();
    }
  }

  clearFilters() {
    this.filters = {
      referenceNumber: '',
      status: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      onlyOverdue: false,
      distillery: '',
      completion: ''
    };
    this.activeSummaryFilter = 'all';
    this.applyFilters();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredEntries.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedEntries = this.filteredEntries.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'APPLIED': return 'bg-info text-white';
      case 'UNDER_PROCESS': return 'bg-warning text-dark';
      case 'COMPLETED': return 'bg-success text-white';
      default: return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'APPLIED': return 'bi bi-file-earmark-text';
      case 'UNDER_PROCESS': return 'bi bi-hourglass-split';
      case 'COMPLETED': return 'bi bi-check-circle-fill';
      default: return 'bi bi-question-circle';
    }
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'LOCAL': return 'bg-success text-white';
      case 'EXPORT': return 'bg-primary text-white';
      case 'DEFENCE': return 'bg-warning text-dark';
      default: return 'bg-secondary text-white';
    }
  }

  viewEntryDetails(entry: DailyRegisterEntry) {
    this.selectedEntry = entry;
  }

  closeDetailsModal() {
    this.selectedEntry = null;
  }

  getEntryCount(status?: string): number {
    if (status) {
      return this.filteredEntries.filter(entry => entry.status === status).length;
    }
    return this.filteredEntries.length;
  }

  getTotalHolograms(): number {
    return this.filteredEntries.reduce((total, entry) => total + entry.quantity, 0);
  }

  getOverdueCount(): number {
    return this.summary.overdue;
  }

  getCompletedOnTimeCount(): number {
    return this.summary.completedOnTime;
  }

  getCompletedLateCount(): number {
    return this.summary.completedLate;
  }

  exportData() {
    this.hologramService.exportDailyRegister('excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-hologram-register-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Export failed:', error);
        alert('Failed to export data. Please try again.');
      }
    });
  }

  refreshData() {
    this.loadDropdownSources();
    this.loadDailyRegisterEntries(true);
  }

  isSlaBreached(entry: DailyRegisterEntry): boolean {
    return !!entry.isOverdue || (entry.status === 'COMPLETED' && entry.completedOnTime === false);
  }

  getCompletedOnTimeLabel(entry: DailyRegisterEntry): string {
    if (entry.status !== 'COMPLETED') {
      return '-';
    }
    if (entry.completedOnTime === true) {
      return 'Yes';
    }
    if (entry.completedOnTime === false) {
      return 'No';
    }
    return '-';
  }

  getCompletedOnTimeClass(entry: DailyRegisterEntry): string {
    if (entry.status !== 'COMPLETED') {
      return 'bg-secondary text-white';
    }
    return entry.completedOnTime === true ? 'bg-success text-white' : 'bg-danger text-white';
  }

  clearAllData() {
    if (confirm('Are you sure you want to clear all register data? This will remove all entries.')) {
      // This would need a backend endpoint to clear data
      alert('Clear functionality requires backend implementation');
    }
  }

  getTimeRemaining(entry: DailyRegisterEntry): string {
    if (entry.status === 'APPLIED') {
      return 'Awaiting Approval';
    }
    
    if (entry.status === 'COMPLETED') {
      if (entry.completedOnTime === false) {
        const saved = this.getEntrySavedTime(entry);
        return entry.completionTime
          ? `Completed Late (saved at ${entry.completionTime})`
          : saved
            ? `Completed Late (saved at ${saved})`
          : 'Completed Late';
      }
      const saved = this.getEntrySavedTime(entry);
      return entry.completionTime
        ? `Completed On Time (saved at ${entry.completionTime})`
        : saved
          ? `Completed On Time (saved at ${saved})`
        : 'Completed';
    }

    const deadline = this.getEntryDeadlineAt5Pm(entry);
    if (!deadline) {
      return entry.timeRemaining || 'No deadline set';
    }

    const diffMs = deadline.getTime() - this.now.getTime();
    const absMs = Math.abs(diffMs);
    const label = this.formatDuration(absMs);
    return diffMs >= 0 ? `${label} remaining` : `Overdue by ${label}`;
  }

  getTimeRemainingClass(entry: DailyRegisterEntry): string {
    if (entry.status === 'APPLIED') {
      return 'text-info';
    }
    
    if (entry.status === 'COMPLETED') {
      if (entry.completedOnTime === false) {
        return 'text-danger fw-bold';
      }
      return 'text-success';
    }

    const deadline = this.getEntryDeadlineAt5Pm(entry);
    if (deadline) {
      const diffMs = deadline.getTime() - this.now.getTime();
      const hours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));

      if (diffMs < 0) {
        return 'text-danger fw-bold';
      }
      if (hours < 2) {
        return 'text-danger';
      }
      if (hours < 4) {
        return 'text-warning';
      }
      return 'text-success';
    }
    
    return 'text-success';
  }

  /**
   * SLA rule: deadline is always 5:00 PM local time on the "approval day".
   * Why: backend often sends `deadline` as UTC (`...Z`), which becomes 10:30 PM in IST and shows wrong remaining time.
   */
  private getEntryDeadlineAt5Pm(entry: DailyRegisterEntry): Date | null {
    const dateParts =
      this.extractYmdFromAny((entry as any)?.deadline) ||
      this.extractYmdFromAny(entry.approvalDate) ||
      this.extractYmdFromAny(entry.submissionDate) ||
      this.extractYmdFromAny((entry as any)?.usageDate);

    // Fallback: if backend date fields are missing/unparseable, still compute deadline as 5 PM IST today.
    const effective = dateParts ?? { year: this.now.getFullYear(), month: this.now.getMonth() + 1, day: this.now.getDate() };

    const { year, month, day } = effective;
    // Always treat deadline as a fixed moment: 5:00 PM IST, regardless of the client's local timezone.
    return new Date(Date.UTC(year, month - 1, day, this.IST_DEADLINE_UTC_HOUR, this.IST_DEADLINE_UTC_MINUTE, 0, 0));
  }

  private extractYmdFromAny(value: any): { year: number; month: number; day: number } | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    // ISO-like: 2026-03-31 or 2026-03-31T...
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const year = Number(iso[1]);
      const month = Number(iso[2]);
      const day = Number(iso[3]);
      if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) return { year, month, day };
    }

    // dd-MMM-yyyy (e.g., 25-Mar-2026) with optional time part
    const dmyText = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s.*)?$/);
    if (dmyText) {
      const day = Number(dmyText[1]);
      const month = this.monthShortToNumber(dmyText[2]);
      const year = Number(dmyText[3]);
      if (year && month && day) return { year, month, day };
    }

    // dd/MM/yyyy or dd-MM-yyyy with optional time part (incl. newline)
    const dmyNum = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s.*)?$/);
    if (dmyNum) {
      const day = Number(dmyNum[1]);
      const month = Number(dmyNum[2]);
      const year = Number(dmyNum[3]);
      if (year && month >= 1 && month <= 12 && day >= 1 && day <= 31) return { year, month, day };
    }

    // dd MMM yyyy (e.g., 27 Mar 2026) with optional time part
    const dmySpaced = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})(?:\s.*)?$/);
    if (dmySpaced) {
      const day = Number(dmySpaced[1]);
      const month = this.monthShortToNumber(dmySpaced[2]);
      const year = Number(dmySpaced[3]);
      if (year && month && day) return { year, month, day };
    }

    // Last resort: Date parse
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      return { year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() };
    }

    return null;
  }

  private getEntryDateForFiltering(entry: DailyRegisterEntry): Date | null {
    const dateParts =
      this.extractYmdFromAny(entry.approvalDate) ||
      this.extractYmdFromAny(entry.submissionDate) ||
      this.extractYmdFromAny((entry as any)?.usageDate);

    if (!dateParts) return null;
    return new Date(dateParts.year, dateParts.month - 1, dateParts.day, 0, 0, 0, 0);
  }

  private monthShortToNumber(value: string): number | null {
    const v = String(value || '').trim().toLowerCase();
    const map: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    return map[v] || null;
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // Helper methods for brands summary
  getTotalBrandQuantity(brands: any[]): number {
    return brands.reduce((total, brand) => total + (brand.quantity || 0), 0);
  }

  getTotalRollsCount(brands: any[]): number {
    return brands.reduce((total, brand) => {
      const rollsCount = (brand.rollsAssigned || []).length;
      return total + rollsCount;
    }, 0);
  }

  getTotalSerialRanges(brands: any[]): number {
    return brands.reduce((total, brand) => {
      const serialRanges = brand.serialRanges || [];
      const rollsAssigned = brand.rollsAssigned || [];
      
      let rangesCount = 0;
      if (serialRanges.length > 0) {
        rangesCount = serialRanges.length;
      } else if (rollsAssigned.length > 0) {
        rangesCount = rollsAssigned.filter((roll: any) => roll.fromSerial && roll.toSerial).length;
      }
      return total + rangesCount;
    }, 0);
  }

  getBrandAllocatedQty(brand: any): number {
    return Number(brand?.allocatedQty ?? brand?.quantity ?? 0);
  }

  getBrandIssuedQty(brand: any): number {
    return Number(brand?.issuedQty ?? brand?.quantity ?? 0);
  }

  getBrandWastageQty(brand: any): number {
    return Number(brand?.wastageQty ?? 0);
  }

  getBrandSavedAt(brand: any): string {
    return String(brand?.savedAt || '');
  }

  getBrandRollsCount(brand: any): number {
    const rollKeys = new Set<string>();
    const rollsAssigned = Array.isArray(brand?.rollsAssigned) ? brand.rollsAssigned : [];

    for (const roll of rollsAssigned) {
      const key =
        String(roll?.rollId ?? '').trim() ||
        String(roll?.rollNumber ?? '').trim() ||
        String(roll?.cartoonNumber ?? '').trim();
      if (key) {
        rollKeys.add(key);
      } else if (roll?.fromSerial && roll?.toSerial) {
        // Roll without explicit identifier but has a serial range
        rollKeys.add(`${String(roll.fromSerial)}-${String(roll.toSerial)}`);
      }
    }

    if (rollKeys.size > 0) {
      return rollKeys.size;
    }

    const serialRanges = Array.isArray(brand?.serialRanges) ? brand.serialRanges : [];
    for (const r of serialRanges) {
      const key = String(r?.rollNumber ?? '').trim();
      if (key) {
        rollKeys.add(key);
      }
    }
    if (rollKeys.size > 0) {
      return rollKeys.size;
    }

    const rollRange = String(brand?.rollRange ?? '').trim();
    return rollRange ? 1 : 0;
  }

  getBrandSerialRangesCount(brand: any): number {
    const serialRanges = Array.isArray(brand?.serialRanges) ? brand.serialRanges : [];
    const explicitRanges = serialRanges.filter((r: any) => !!String(r?.from ?? '').trim() && !!String(r?.to ?? '').trim()).length;
    if (explicitRanges > 0) {
      return explicitRanges;
    }

    const rollsAssigned = Array.isArray(brand?.rollsAssigned) ? brand.rollsAssigned : [];
    const rollRanges = rollsAssigned.filter((r: any) => !!String(r?.fromSerial ?? '').trim() && !!String(r?.toSerial ?? '').trim()).length;
    if (rollRanges > 0) {
      return rollRanges;
    }

    const rollRange = String(brand?.rollRange ?? '').trim();
    return rollRange ? 1 : 0;
  }

  getEntrySavedTime(entry: DailyRegisterEntry): string | null {
    const direct = String((entry as any)?.completionTime ?? '').trim();
    if (direct) {
      return direct;
    }

    const brands = Array.isArray((entry as any)?.brandsEntered) ? (entry as any).brandsEntered : [];
    const dates: Date[] = [];
    for (const b of brands) {
      const raw = String(b?.savedAt ?? '').trim();
      if (!raw) continue;
      const dt = new Date(raw);
      if (!Number.isNaN(dt.getTime())) {
        dates.push(dt);
      }
    }
    if (dates.length === 0) return null;
    const latest = dates.sort((a, b) => b.getTime() - a.getTime())[0];
    return latest.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
}
