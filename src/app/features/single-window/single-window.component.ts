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

  // Latest created records states
  latestUsers: any[] = [];
  latestRecords: any[] = [];
  activeLatestTab = 'admin'; // 'admin' or 'license'
  isLatestLoading = false;

  // Pagination states
  adminPageSize = 10;
  adminPageIndex = 0;
  adminPageSizes = [10, 15, 30, 40];

  licensePageSize = 10;
  licensePageIndex = 0;
  licensePageSizes = [10, 15, 30, 40];

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
        this.isLatestLoading = false;
      },
      error: (err) => {
        console.error('Failed to load latest records', err);
        this.isLatestLoading = false;
      }
    });
  }

  get paginatedLatestUsers(): any[] {
    const start = this.adminPageIndex * this.adminPageSize;
    return this.latestUsers.slice(start, start + this.adminPageSize);
  }

  get paginatedLatestRecords(): any[] {
    const start = this.licensePageIndex * this.licensePageSize;
    return this.latestRecords.slice(start, start + this.licensePageSize);
  }

  onAdminPageChange(event: any) {
    this.adminPageIndex = event.pageIndex;
    this.adminPageSize = event.pageSize;
  }

  onLicensePageChange(event: any) {
    this.licensePageIndex = event.pageIndex;
    this.licensePageSize = event.pageSize;
  }

  setLatestTab(tab: string) {
    this.activeLatestTab = tab;
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

    this.http.get<any>(`${environment.apiBaseUrl}/transactional/single-window/search/`, {
      params: { query: trimmed }
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
            id: appId
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
      'salesman_barman_app': 'Salesman/Barman Application'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'licensee': 'person',
      'license': 'card_membership',
      'new_license_app': 'add_business',
      'renewal_app': 'autorenew',
      'salesman_barman_app': 'badge'
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
