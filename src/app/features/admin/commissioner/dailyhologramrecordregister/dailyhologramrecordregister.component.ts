import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { HologramService, DailyRegisterEntry, DailyRegisterSummary } from '../../../../core/services/hologram.service';
import { environment } from '../../../../../environments/environment';

interface FilterOptions {
  referenceNumber: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  onlyOverdue: boolean;
  distillery: string;
}

@Component({
  selector: 'app-dailyhologramrecordregister',
  imports: [CommonModule, FormsModule],
  templateUrl: './dailyhologramrecordregister.component.html',
  styleUrl: './dailyhologramrecordregister.component.scss'
})
export class DailyhologramrecordregisterComponent implements OnInit {
  Math = Math;
  private readonly licenseApiBase = `${environment.apiBaseUrl}/masters/license`;
  private readonly authUsersApiBase = `${environment.apiBaseUrl}/auth/users`;
  private readonly hologramApiBase = `${environment.apiBaseUrl}/transactional/supply_chain/hologram`;
  
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
    distillery: ''
  };

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

  constructor(
    private hologramService: HologramService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadDropdownSources();
    this.loadDailyRegisterEntries();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
      this.loadDailyRegisterEntries();
    }, 30000);
  }

  loadDailyRegisterEntries() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.hologramService.getDailyRegisterOverview().subscribe({
      next: (response) => {
        this.summary = response.summary;
        this.dailyRegisterEntries = response.entries;

        this.updateDistilleryOptions(response.entries);
        
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading daily register:', error);
        this.errorMessage = 'Failed to load daily register data. Please try again.';
        this.isLoading = false;
      }
    });
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

      const matchesDateFrom = !this.filters.dateFrom ||
        (entry.approvalDate ? new Date(entry.approvalDate) >= new Date(this.filters.dateFrom) : 
         new Date(entry.submissionDate) >= new Date(this.filters.dateFrom));

      const matchesDateTo = !this.filters.dateTo ||
        (entry.approvalDate ? new Date(entry.approvalDate) <= new Date(this.filters.dateTo) :
         new Date(entry.submissionDate) <= new Date(this.filters.dateTo));

      const matchesOverdue = !this.filters.onlyOverdue || entry.isOverdue;

      const matchesDistillery = !this.filters.distillery || 
        entry.distilleryName === this.filters.distillery;

      return matchesReference && matchesStatus && matchesType && 
             matchesDateFrom && matchesDateTo && matchesOverdue && matchesDistillery;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilters() {
    this.filters = {
      referenceNumber: '',
      status: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      onlyOverdue: false,
      distillery: ''
    };
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
    this.loadDailyRegisterEntries();
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
        return entry.completionTime
          ? `Completed Late (saved ${entry.completionTime})`
          : 'Completed Late';
      }
      return entry.completionTime
        ? `Completed On Time (saved ${entry.completionTime})`
        : 'Completed';
    }

    return entry.timeRemaining || 'No deadline set';
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

    if (entry.isOverdue) {
      return 'text-danger fw-bold';
    }

    if (entry.timeRemaining) {
      const hours = parseInt(entry.timeRemaining.split('h')[0]);
      if (hours < 2) {
        return 'text-danger';
      } else if (hours < 4) {
        return 'text-warning';
      }
    }
    
    return 'text-success';
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
}
