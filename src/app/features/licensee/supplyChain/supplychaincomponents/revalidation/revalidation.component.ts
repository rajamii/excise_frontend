import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface TableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  isLive?: boolean;
  isInvalid?: boolean;
}

@Component({
  selector: 'app-revalidation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './revalidation.component.html',
  styleUrl: './revalidation.component.scss'
})
export class RevalidationComponent implements OnInit {
  Math = Math;
  
  // Filter properties for revalidation
  revalidationDateFilter: string = '';
  revalidationMonthFilter: string = '';
  revalidationYearFilter: string = '';
  revalidationStatusFilter: string = '';
  
  filteredRevalidationData: TableData[] = [];
  
  revlidationData: TableData[] = [
    {
      referenceNo: "IMP/SUP-AGDIST",
      submissionDate: "22-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "IMPORT PERMIT EXTENDS 45 DAYS - INVALID",
      amount: "0.00",
      isLive: true,
      isInvalid: true,
    },
    {
      referenceNo: "REV/BF601",
      submissionDate: "18-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "REVALIDATION REQUEST PENDING APPROVAL",
      amount: "5.00",
      isLive: false,
      isInvalid: false,
    },
    {
      referenceNo: "REV/BF602",
      submissionDate: "17-Sep-2025",
      distilleryName: "Royal Sikkim Brewery",
      status: "PERMIT EXPIRED - REQUIRES IMMEDIATE REVALIDATION",
      amount: "7.50",
      isLive: true,
      isInvalid: true,
    },
    {
      referenceNo: "REV/BF603",
      submissionDate: "16-Sep-2025",
      distilleryName: "Mountain View Distilleries",
      status: "REVALIDATION APPROVED - PERMIT EXTENDED",
      amount: "6.25",
      isLive: false,
      isInvalid: false,
    },
  ];

  // Pagination state
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Initialize filtered data
    this.filteredRevalidationData = [...this.revlidationData];
  }

  // Revalidation filter methods
  applyRevalidationFilters(): void {
    console.log('Applying revalidation filters:', { 
      dateFilter: this.revalidationDateFilter, 
      monthFilter: this.revalidationMonthFilter, 
      yearFilter: this.revalidationYearFilter,
      statusFilter: this.revalidationStatusFilter 
    });
    
    this.filteredRevalidationData = this.revlidationData.filter(item => {
      let matchesDate = true;
      let matchesMonth = true;
      let matchesYear = true;
      let matchesStatus = true;

      // Parse the date from the format "22-Sep-2025"
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
          if (this.revalidationDateFilter) {
            const filterDate = new Date(this.revalidationDateFilter);
            matchesDate = itemDate.getFullYear() === filterDate.getFullYear() &&
                         itemDate.getMonth() === filterDate.getMonth() &&
                         itemDate.getDate() === filterDate.getDate();
          }

          // Month filter (month and year match)
          if (this.revalidationMonthFilter) {
            const filterDate = new Date(this.revalidationMonthFilter + '-01');
            matchesMonth = itemDate.getFullYear() === filterDate.getFullYear() && 
                          itemDate.getMonth() === filterDate.getMonth();
          }

          // Year filter
          if (this.revalidationYearFilter) {
            const filterYear = parseInt(this.revalidationYearFilter);
            matchesYear = itemDate.getFullYear() === filterYear;
          }
        }
      }

      // Status filter (partial match for long status messages)
      if (this.revalidationStatusFilter) {
        matchesStatus = item.status.toLowerCase().includes(this.revalidationStatusFilter.toLowerCase());
      }

      const finalMatch = matchesDate && matchesMonth && matchesYear && matchesStatus;
      console.log('Revalidation match for:', item.referenceNo, finalMatch);
      
      return finalMatch;
    });
    
    console.log('Filtered revalidation results:', this.filteredRevalidationData.length, 'out of', this.revlidationData.length);
    
    // Reset pagination to first page when filters are applied
    this.resetPagination();
  }

  clearRevalidationFilters(): void {
    this.revalidationDateFilter = '';
    this.revalidationMonthFilter = '';
    this.revalidationYearFilter = '';
    this.revalidationStatusFilter = '';
    this.filteredRevalidationData = [...this.revlidationData];
    this.resetPagination();
  }

  onRevalidationDateFilterChange(): void {
    console.log('Revalidation date filter changed to:', this.revalidationDateFilter);
    this.applyRevalidationFilters();
  }

  onRevalidationMonthFilterChange(): void {
    console.log('Revalidation month filter changed to:', this.revalidationMonthFilter);
    this.applyRevalidationFilters();
  }

  onRevalidationYearFilterChange(): void {
    console.log('Revalidation year filter changed to:', this.revalidationYearFilter);
    this.applyRevalidationFilters();
  }

  onRevalidationStatusFilterChange(): void {
    console.log('Revalidation status filter changed to:', this.revalidationStatusFilter);
    this.applyRevalidationFilters();
  }

  // Revalidation summary methods
  getRevalidationStatusCount(status: string): number {
    return this.revlidationData.filter(item => 
      item.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  getLiveRevalidationCount(): number {
    return this.revlidationData.filter(item => item.isLive).length;
  }

  getTotalRevalidationAmount(): number {
    return this.revlidationData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }

  // Navigation methods
  viewApplication(item: TableData, event?: Event): void {
    // Prevent form submission
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Navigate to revalidation application view
    const refNo = item.referenceNo;
    this.router.navigate(["/dev-supply-chain-revalidation-view"], {
      queryParams: { ref: refNo },
    });
  }

  requestRevlidation(item: TableData): void {
    // Navigate to payment confirmation page
    this.router.navigate(["/dev-payment-confirmation"], {
      queryParams: {
        tab: "revalidation",
        referenceNo: item.referenceNo,
      },
    });
  }

  // Pagination methods
  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRevalidationData.length / this.pageSize));
  }

  getPaged(): TableData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRevalidationData.slice(start, start + this.pageSize);
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
}
