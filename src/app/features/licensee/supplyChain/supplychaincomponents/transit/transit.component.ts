import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface TableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
}

@Component({
  selector: 'app-transit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transit.component.html',
  styleUrl: './transit.component.scss'
})
export class TransitComponent implements OnInit {
  Math = Math;
  private isBrowser = false;
  
  // Filter properties for transit
  transitDateFilter: string = '';
  transitMonthFilter: string = '';
  transitYearFilter: string = '';
  transitStatusFilter: string = '';
  
  transitData: TableData[] = [];
  
  filteredTransitData: TableData[] = [];
  
  // Pagination state
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.loadTransitData();
  }

  ngOnInit(): void {
    // Initialize filtered data
    this.filteredTransitData = [...this.transitData];
  }

  private loadTransitData(): void {
    if (!this.isBrowser) {
      return;
    }

    // Load transit permit requests from localStorage
    const transitPermitRequests = JSON.parse(localStorage.getItem('transitPermitRequests') || '[]');

    // Also check importPermitRequests for transit permits (for backward compatibility)
    const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
    const transitFromImport = importPermitRequests.filter((permit: any) => permit.type === 'transit-permit');

    // Combine both sources
    const allTransitRequests = [...transitPermitRequests, ...transitFromImport];

    // Remove duplicates based on reference number (billNo or refNo)
    const uniqueTransitRequests = allTransitRequests.reduce((acc: any[], current: any) => {
      const refNo = current.billNo || current.refNo;
      const isDuplicate = acc.some((item: any) => (item.billNo || item.refNo) === refNo);
      if (!isDuplicate) {
        acc.push(current);
      }
      return acc;
    }, []);

    // Sort by submission time (newest first)
    uniqueTransitRequests.sort((a: any, b: any) => {
      const dateA = new Date(a.submissionDate || a.date).getTime();
      const dateB = new Date(b.submissionDate || b.date).getTime();
      return dateB - dateA; // Newest first
    });

    // Convert transit permit data to table format
    const transitPermitData: TableData[] = uniqueTransitRequests.map((permit: any) => ({
      referenceNo: permit.billNo || permit.refNo,
      submissionDate: new Date(permit.submissionDate || permit.date).toLocaleDateString('en-GB'),
      distilleryName: permit.soleDistributor || permit.distilleryName || 'Unknown Distributor',
      status: permit.status || 'TRANSIT PERMIT ISSUED',
      amount: (permit.totalAmount || permit.brAmount || 0).toFixed(2)
    }));

    // Set transit data (no sample data)
    this.transitData = transitPermitData;
    this.filteredTransitData = [...this.transitData];
  }

  // Transit filter methods
  applyTransitFilters(): void {
    console.log('Applying transit filters:', {
      dateFilter: this.transitDateFilter,
      monthFilter: this.transitMonthFilter,
      yearFilter: this.transitYearFilter,
      statusFilter: this.transitStatusFilter
    });

    this.filteredTransitData = this.transitData.filter(item => {
      let matchesDate = true;
      let matchesMonth = true;
      let matchesYear = true;
      let matchesStatus = true;

      // Parse the date from the format "13-Sep-2025"
      const dateParts = item.submissionDate.split('-');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0]);
        const monthName = dateParts[1];
        const year = parseInt(dateParts[2]);

        // Convert month name to number
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.indexOf(monthName) + 1;

        if (month > 0) {
          const itemDate = new Date(year, month - 1, day);

          // Date filter (exact date match)
          if (this.transitDateFilter) {
            const filterDate = new Date(this.transitDateFilter);
            matchesDate = itemDate.getFullYear() === filterDate.getFullYear() &&
              itemDate.getMonth() === filterDate.getMonth() &&
              itemDate.getDate() === filterDate.getDate();
          }

          // Month filter (month and year match)
          if (this.transitMonthFilter) {
            const filterDate = new Date(this.transitMonthFilter + '-01');
            matchesMonth = itemDate.getFullYear() === filterDate.getFullYear() &&
              itemDate.getMonth() === filterDate.getMonth();
          }

          // Year filter
          if (this.transitYearFilter) {
            const filterYear = parseInt(this.transitYearFilter);
            matchesYear = itemDate.getFullYear() === filterYear;
          }
        }
      }

      // Status filter (partial match for long status messages)
      if (this.transitStatusFilter) {
        matchesStatus = item.status.toLowerCase().includes(this.transitStatusFilter.toLowerCase());
      }

      const finalMatch = matchesDate && matchesMonth && matchesYear && matchesStatus;
      console.log('Transit match for:', item.referenceNo, finalMatch);

      return finalMatch;
    });

    console.log('Filtered transit results:', this.filteredTransitData.length, 'out of', this.transitData.length);

    // Reset pagination to first page when filters are applied
    this.resetPagination();
  }

  clearTransitFilters(): void {
    this.transitDateFilter = '';
    this.transitMonthFilter = '';
    this.transitYearFilter = '';
    this.transitStatusFilter = '';
    this.filteredTransitData = [...this.transitData];
    this.resetPagination();
  }

  onTransitDateFilterChange(): void {
    console.log('Transit date filter changed to:', this.transitDateFilter);
    this.applyTransitFilters();
  }

  onTransitMonthFilterChange(): void {
    console.log('Transit month filter changed to:', this.transitMonthFilter);
    this.applyTransitFilters();
  }

  onTransitYearFilterChange(): void {
    console.log('Transit year filter changed to:', this.transitYearFilter);
    this.applyTransitFilters();
  }

  onTransitStatusFilterChange(): void {
    console.log('Transit status filter changed to:', this.transitStatusFilter);
    this.applyTransitFilters();
  }

  // Transit summary methods
  getTransitStatusCount(status: string): number {
    return this.transitData.filter(item =>
      item.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  getTotalTransitAmount(): number {
    return this.transitData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }

  // Pagination methods
  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(data: any[]): number {
    return Math.max(1, Math.ceil((data?.length || 0) / this.pageSize));
  }

  getPaged<T = any>(data: T[]): T[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (data || []).slice(start, start + this.pageSize);
  }

  goToPage(page: number, data: any[]): void {
    const total = this.getTotalPages(data);
    if (page < 1 || page > total) return;
    this.currentPage = page;
  }

  resetPagination(): void {
    this.currentPage = 1;
  }

  changePageSize(size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSize = s;
    this.currentPage = 1;
  }

  // Navigation methods
  applicationCheck(item: TableData): void {
    // Navigate to transit view level 1 component
    console.log('Application Check clicked for:', item.referenceNo);
    this.router.navigate(["/dev-supply-chain-transit-view-level1"], {
      queryParams: { ref: item.referenceNo },
    });
  }

  // Clear cache method
  clearCache(): void {
    if (!this.isBrowser) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to clear all transit data?\n\n' +
      'This will remove:\n' +
      '- All transit permit requests from localStorage\n' +
      '- All transit permit data from importPermitRequests\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    // Clear transit permit requests from localStorage
    localStorage.removeItem('transitPermitRequests');

    // Also clear transit permits from importPermitRequests
    const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
    const filteredImportRequests = importPermitRequests.filter((permit: any) => permit.type !== 'transit-permit');
    localStorage.setItem('importPermitRequests', JSON.stringify(filteredImportRequests));

    // Reset to empty data
    this.transitData = [];

    // Reset filtered data
    this.filteredTransitData = [];

    // Reset pagination
    this.resetPagination();

    // Clear filters
    this.transitDateFilter = '';
    this.transitMonthFilter = '';
    this.transitYearFilter = '';
    this.transitStatusFilter = '';

    alert('✅ Transit cache cleared successfully!\n\nAll transit data has been removed from localStorage.');
  }
}
