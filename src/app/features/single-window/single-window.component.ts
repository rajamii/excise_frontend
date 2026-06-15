import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MaterialModule } from '../../shared/material.module';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-single-window',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './single-window.component.html',
  styleUrls: ['./single-window.component.scss']
})
export class SingleWindowComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  searchQuery = '';
  searchResults: any[] = [];
  filteredResults: any[] = [];
  selectedTab = 'all'; // 'all', 'licensee', 'license', 'new_license_app', 'renewal_app', 'salesman_barman_app'
  isLoading = false;
  hasSearched = false;
  error: string | null = null;
  searchMode: 'registry' | 'payment' = 'registry';

  // Advanced Filters states
  showAdvancedFilters = false;
  filterDay = '';
  filterMonth = '';
  filterYear = '';
  filterCategory = '';
  filterRole = '';

  daysList: number[] = Array.from({ length: 31 }, (_, i) => i + 1);
  monthsList = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  yearsList: number[] = [2024, 2025, 2026, 2027];
  categoriesList: string[] = ['Foreign Liquor Retail Shop', 'Manufacturing'];
  rolesList: string[] = [
    'Commissioner',
    'Deputy Commissioner',
    'District User',
    'IT Cell',
    'Joint commissioner',
    'Offcier-In-Charge',
    'Permit Section',
    'Secretary',
    'Single Window',
    'Site Inquiry Officer',
    'site_admin'
  ];

  // Latest created records states
  latestUsers: any[] = [];
  latestRecords: any[] = [];
  latestDeactivatedUsers: any[] = [];
  activeLatestTab = 'admin'; // 'admin', 'license', or 'deactivated'
  isLatestLoading = false;

  // Pagination states
  adminPageSize = 10;
  adminPageIndex = 0;
  adminPageSizes = [10, 15, 30, 40];

  licensePageSize = 10;
  licensePageIndex = 0;
  licensePageSizes = [10, 15, 30, 40];

  deactivatedPageSize = 10;
  deactivatedPageIndex = 0;
  deactivatedPageSizes = [10, 15, 30, 40];

  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.executeSearch(query);
    });

    // Load latest created entries for landing view
    this.fetchLatestCreated();
  }

  fetchLatestCreated() {
    this.isLatestLoading = true;
    this.http.get<any>(`${environment.apiBaseUrl}/transactional/single-window/latest/`).subscribe({
      next: (res) => {
        this.latestUsers = res.users || [];
        this.latestRecords = res.records || [];
        this.latestDeactivatedUsers = res.deactivated_users || [];
        this.isLatestLoading = false;
      },
      error: (err) => {
        console.error('Failed to load latest records', err);
        this.isLatestLoading = false;
      }
    });
  }

  get filteredLatestUsers(): any[] {
    let list = this.latestUsers;
    if (this.showAdvancedFilters) {
      if (this.filterRole) {
        list = list.filter(u => u.role_name && u.role_name.toLowerCase().includes(this.filterRole.toLowerCase()));
      }
      if (this.filterDay || this.filterMonth || this.filterYear) {
        list = list.filter(u => {
          if (!u.date_joined || u.date_joined === 'N/A') return false;
          const d = new Date(u.date_joined);
          if (isNaN(d.getTime())) return false;
          if (this.filterDay && d.getDate() !== parseInt(this.filterDay)) return false;
          if (this.filterMonth && (d.getMonth() + 1) !== parseInt(this.filterMonth)) return false;
          if (this.filterYear && d.getFullYear() !== parseInt(this.filterYear)) return false;
          return true;
        });
      }
    }
    return list;
  }

  get filteredLatestDeactivatedUsers(): any[] {
    let list = this.latestDeactivatedUsers;
    if (this.showAdvancedFilters) {
      if (this.filterRole) {
        list = list.filter(u => u.role_name && u.role_name.toLowerCase().includes(this.filterRole.toLowerCase()));
      }
      if (this.filterDay || this.filterMonth || this.filterYear) {
        list = list.filter(u => {
          if (!u.date_joined || u.date_joined === 'N/A') return false;
          const d = new Date(u.date_joined);
          if (isNaN(d.getTime())) return false;
          if (this.filterDay && d.getDate() !== parseInt(this.filterDay)) return false;
          if (this.filterMonth && (d.getMonth() + 1) !== parseInt(this.filterMonth)) return false;
          if (this.filterYear && d.getFullYear() !== parseInt(this.filterYear)) return false;
          return true;
        });
      }
    }
    return list;
  }

  get filteredLatestRecords(): any[] {
    let list = this.latestRecords;
    if (this.showAdvancedFilters) {
      if (this.filterCategory) {
        list = list.filter(r => r.license_category && r.license_category.toLowerCase().includes(this.filterCategory.toLowerCase()));
      }
      if (this.filterDay || this.filterMonth || this.filterYear) {
        list = list.filter(r => {
          if (!r.created_at || r.created_at === 'N/A') return false;
          const parts = r.created_at.split('-');
          if (parts.length < 3) return false;
          const y = parseInt(parts[0]);
          const m = parseInt(parts[1]);
          const d = parseInt(parts[2]);
          if (this.filterDay && d !== parseInt(this.filterDay)) return false;
          if (this.filterMonth && m !== parseInt(this.filterMonth)) return false;
          if (this.filterYear && y !== parseInt(this.filterYear)) return false;
          return true;
        });
      }
    }
    return list;
  }

  get paginatedLatestUsers(): any[] {
    const start = this.adminPageIndex * this.adminPageSize;
    return this.filteredLatestUsers.slice(start, start + this.adminPageSize);
  }

  get paginatedLatestRecords(): any[] {
    const start = this.licensePageIndex * this.licensePageSize;
    return this.filteredLatestRecords.slice(start, start + this.licensePageSize);
  }

  get paginatedLatestDeactivatedUsers(): any[] {
    const start = this.deactivatedPageIndex * this.deactivatedPageSize;
    return this.filteredLatestDeactivatedUsers.slice(start, start + this.deactivatedPageSize);
  }

  onAdminPageChange(event: any) {
    this.adminPageIndex = event.pageIndex;
    this.adminPageSize = event.pageSize;
  }

  onLicensePageChange(event: any) {
    this.licensePageIndex = event.pageIndex;
    this.licensePageSize = event.pageSize;
  }

  // Handle page changes for deactivated users paginator
  onDeactivatedPageChange(event: any) {
    this.deactivatedPageIndex = event.pageIndex;
    this.deactivatedPageSize = event.pageSize;
  }

  setLatestTab(tab: string) {
    this.activeLatestTab = tab;
  }

  setSearchMode(mode: 'registry' | 'payment') {
    this.searchMode = mode;
    this.selectedTab = 'all';
    this.clearSearch();
    this.resetFilters();
  }

  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters;
    if (!this.showAdvancedFilters) {
      this.resetFilters();
    }
  }

  resetFilters() {
    this.filterDay = '';
    this.filterMonth = '';
    this.filterYear = '';
    this.filterCategory = '';
    this.filterRole = '';
    this.onFilterChange();
  }

  onFilterChange() {
    if (this.hasSearched) {
      this.executeSearch(this.searchQuery);
    } else {
      this.adminPageIndex = 0;
      this.licensePageIndex = 0;
      this.deactivatedPageIndex = 0;
    }
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery);
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.filteredResults = [];
    this.hasSearched = false;
  }

  executeSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      this.searchResults = [];
      this.filteredResults = [];
      this.hasSearched = false;
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.hasSearched = true;

    const params: any = { 
      query: trimmed,
      search_type: this.searchMode
    };

    if (this.showAdvancedFilters) {
      if (this.filterDay) params.day = this.filterDay;
      if (this.filterMonth) params.month = this.filterMonth;
      if (this.filterYear) params.year = this.filterYear;
      if (this.filterCategory) params.category = this.filterCategory;
      if (this.filterRole) params.role = this.filterRole;
    }

    this.http.get<any>(`${environment.apiBaseUrl}/transactional/single-window/search/`, {
      params
    }).subscribe({
      next: (res) => {
        this.searchResults = res.results || [];
        this.filterResults();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Search failed', err);
        this.error = 'Failed to execute search. Please try again.';
        this.isLoading = false;
      }
    });
  }

  setTab(tab: string) {
    this.selectedTab = tab;
    this.filterResults();
  }

  filterResults() {
    if (this.selectedTab === 'all') {
      this.filteredResults = this.searchResults;
    } else {
      this.filteredResults = this.searchResults.filter(r => r.type === this.selectedTab);
    }
  }

  viewDetails(result: any) {
    if (result.type === 'licensee') {
      this.router.navigate(['/dashboard'], {
        queryParams: {
          section: 'single-window-detail',
          type: 'licensee',
          id: result.id
        }
      });
    } else {
      // Check if there is an associated NLA application ID
      const appId = (result.meta && result.meta.application_id) || result.application_id;
      if (appId) {
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'single-window-detail',
            type: 'new_license_app',
            id: appId,
            targetId: result.id
          }
        });
      } else if (result.type === 'license' && result.meta && result.meta.applicant_id) {
        // Fallback for license: navigate to licensee profile
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'single-window-detail',
            type: 'licensee',
            id: result.meta.applicant_id
          }
        });
      } else {
        // Fallback to original navigation
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'single-window-detail',
            type: result.type,
            id: result.id
          }
        });
      }
    }
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'licensee': 'Licensee / User',
      'license': 'License',
      'new_license_app': 'New License Application',
      'renewal_app': 'Renewal Application',
      'salesman_barman_app': 'Salesman/Barman Application',
      'payment': 'Payment Transaction'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'licensee': 'person',
      'license': 'card_membership',
      'new_license_app': 'add_business',
      'renewal_app': 'autorenew',
      'salesman_barman_app': 'badge',
      'payment': 'payments'
    };
    return icons[type] || 'description';
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-draft';
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes('approve') || s.includes('pass') || s.includes('resolve')) {
      return 'status-active';
    }
    if (s.includes('reject') || s.includes('expire') || s.includes('inactive')) {
      return 'status-inactive';
    }
    if (s.includes('objection') || s.includes('pending') || s.includes('submitted')) {
      return 'status-pending';
    }
    return 'status-draft';
  }

  getTabCount(type: string): number {
    if (type === 'all') {
      return this.searchResults.length;
    }
    return this.searchResults.filter(r => r.type === type).length;
  }
}
