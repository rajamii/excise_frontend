import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

interface TableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
}

@Component({
  selector: 'app-cancellation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation.component.html',
  styleUrl: './cancellation.component.scss'
})
export class CancellationComponent implements OnInit {
  Math = Math;
  private isBrowser = false;
  
  // Filter properties for cancellation
  cancellationDateFilter: string = '';
  cancellationMonthFilter: string = '';
  cancellationYearFilter: string = '';
  cancellationStatusFilter: string = '';
  
  // Pagination
  pageSizeOptions: number[] = [5, 10, 15];
  currentPage: number = 1;
  pageSize: number = 5;
  
  filteredCancellationData: TableData[] = [];
  
  cancellationData: TableData[] = [
    {
      referenceNo: "CAN/BF701",
      submissionDate: "15-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "CANCELLATION REQUEST APPROVED",
      amount: "0.00",
    },
    {
      referenceNo: "CAN/BF702",
      submissionDate: "14-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "CANCELLATION UNDER REVIEW",
      amount: "0.00",
    },
  ];

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Initialize filtered data
    this.filteredCancellationData = [...this.cancellationData];
  }

  // Filter methods
  applyCancellationFilters(): void {
    console.log('Applying cancellation filters:', {
      dateFilter: this.cancellationDateFilter,
      monthFilter: this.cancellationMonthFilter,
      yearFilter: this.cancellationYearFilter,
      statusFilter: this.cancellationStatusFilter
    });

    this.filteredCancellationData = this.cancellationData.filter(item => {
      let matchesDate = true;
      let matchesMonth = true;
      let matchesYear = true;
      let matchesStatus = true;

      // Parse the date from the format "15-Sep-2025"
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
          if (this.cancellationDateFilter) {
            const filterDate = new Date(this.cancellationDateFilter);
            matchesDate = itemDate.getFullYear() === filterDate.getFullYear() &&
              itemDate.getMonth() === filterDate.getMonth() &&
              itemDate.getDate() === filterDate.getDate();
          }

          // Month filter (month and year match)
          if (this.cancellationMonthFilter) {
            const filterDate = new Date(this.cancellationMonthFilter + '-01');
            matchesMonth = itemDate.getFullYear() === filterDate.getFullYear() &&
              itemDate.getMonth() === filterDate.getMonth();
          }

          // Year filter
          if (this.cancellationYearFilter) {
            const filterYear = parseInt(this.cancellationYearFilter);
            matchesYear = itemDate.getFullYear() === filterYear;
          }
        }
      }

      // Status filter (partial match for long status messages)
      if (this.cancellationStatusFilter) {
        matchesStatus = item.status.toLowerCase().includes(this.cancellationStatusFilter.toLowerCase());
      }

      const finalMatch = matchesDate && matchesMonth && matchesYear && matchesStatus;
      console.log('Cancellation match for:', item.referenceNo, finalMatch);

      return finalMatch;
    });

    console.log('Filtered cancellation results:', this.filteredCancellationData.length, 'out of', this.cancellationData.length);

    // Reset pagination to first page when filters are applied
    this.resetPagination();
  }

  clearCancellationFilters(): void {
    this.cancellationDateFilter = '';
    this.cancellationMonthFilter = '';
    this.cancellationYearFilter = '';
    this.cancellationStatusFilter = '';
    this.filteredCancellationData = [...this.cancellationData];
    this.resetPagination();
  }

  onCancellationDateFilterChange(): void {
    console.log('Cancellation date filter changed to:', this.cancellationDateFilter);
    this.applyCancellationFilters();
  }

  onCancellationMonthFilterChange(): void {
    console.log('Cancellation month filter changed to:', this.cancellationMonthFilter);
    this.applyCancellationFilters();
  }

  onCancellationYearFilterChange(): void {
    console.log('Cancellation year filter changed to:', this.cancellationYearFilter);
    this.applyCancellationFilters();
  }

  onCancellationStatusFilterChange(): void {
    console.log('Cancellation status filter changed to:', this.cancellationStatusFilter);
    this.applyCancellationFilters();
  }

  // Summary methods
  getCancellationStatusCount(status: string): number {
    return this.cancellationData.filter(item =>
      item.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  getTotalCancellationAmount(): number {
    return this.cancellationData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }

  // Pagination methods
  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil((this.filteredCancellationData?.length || 0) / this.pageSize));
  }

  getPaged(): TableData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (this.filteredCancellationData || []).slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const total = this.getTotalPages();
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

  // View application
  viewApplication(item: TableData, event?: Event): void {
    // Prevent form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Navigate to cancellation application view
    this.router.navigate(["/dev-supply-chain-cancellation-view"], {
      queryParams: { ref: item.referenceNo },
    });
  }
}
