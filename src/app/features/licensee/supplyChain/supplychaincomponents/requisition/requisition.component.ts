import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
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
  selector: 'app-requisition',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './requisition.component.html',
  styleUrls: ['./requisition.component.scss']
})
export class RequisitionComponent implements OnInit {
  Math = Math;
  private isBrowser = false;

  // Data
  requisitionData: TableData[] = [];
  filteredRequisitionData: TableData[] = [];

  // Filter properties
  requisitionDateFilter: string = '';
  requisitionMonthFilter: string = '';
  requisitionYearFilter: string = '';
  requisitionStatusFilter: string = '';

  // Pagination
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadRequisitionData();
    this.filteredRequisitionData = [...this.requisitionData];
  }

  private loadRequisitionData(): void {
    if (!this.isBrowser) {
      return;
    }

    // Load import permit requests from localStorage
    const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');

    // Sort by submission time (newest first)
    importPermitRequests.sort((a: any, b: any) => {
      const dateA = new Date(a.submittedAt || a.date).getTime();
      const dateB = new Date(b.submittedAt || b.date).getTime();
      return dateB - dateA;
    });

    // Convert import permit data to requisition format
    const importPermitData: TableData[] = importPermitRequests
      .filter((permit: any) => permit.type !== 'transit-permit')
      .map((permit: any) => ({
        referenceNo: permit.refNo,
        submissionDate: new Date(permit.date).toLocaleDateString('en-GB'),
        distilleryName: this.getDistilleryDisplayName(permit.liftedFrom),
        status: "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
        amount: "8.00"
      }));

    // Only use real data from localStorage
    this.requisitionData = [...importPermitData];
  }

  private getDistilleryDisplayName(value: string): string {
    const map: { [key: string]: string } = {
      'sikkim-distilleries': 'Sikkim Distilleries Ltd',
      'mountain-spirits': 'Mountain Spirits Pvt Ltd',
      'highland-breweries': 'Highland Breweries',
      'gangtok': 'Gangtok Depot',
      'namchi': 'Namchi Depot',
      'gyalshing': 'Gyalshing Depot',
      'mangan': 'Mangan Depot'
    };
    return map[value] || value || 'Unknown Distillery';
  }

  // Summary methods
  getTotalRequisitionAmount(): number {
    return this.filteredRequisitionData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }

  getRequisitionStatusCount(status: string): number {
    return this.filteredRequisitionData.filter(item =>
      item.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  // Filter methods
  applyRequisitionFilters(): void {
    this.filteredRequisitionData = this.requisitionData.filter(item => {
      let matchesDate = true;
      let matchesMonth = true;
      let matchesYear = true;
      let matchesStatus = true;

      const dateParts = item.submissionDate.split('-');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0]);
        const monthName = dateParts[1];
        const year = parseInt(dateParts[2]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.indexOf(monthName) + 1;

        if (month > 0) {
          const itemDate = new Date(year, month - 1, day);

          if (this.requisitionDateFilter) {
            const filterDate = new Date(this.requisitionDateFilter);
            matchesDate = itemDate.getFullYear() === filterDate.getFullYear() &&
              itemDate.getMonth() === filterDate.getMonth() &&
              itemDate.getDate() === filterDate.getDate();
          }

          if (this.requisitionMonthFilter) {
            const filterDate = new Date(this.requisitionMonthFilter + '-01');
            matchesMonth = itemDate.getFullYear() === filterDate.getFullYear() &&
              itemDate.getMonth() === filterDate.getMonth();
          }

          if (this.requisitionYearFilter) {
            const filterYear = parseInt(this.requisitionYearFilter);
            matchesYear = itemDate.getFullYear() === filterYear;
          }
        }
      }

      if (this.requisitionStatusFilter) {
        matchesStatus = item.status.toLowerCase().includes(this.requisitionStatusFilter.toLowerCase());
      }

      return matchesDate && matchesMonth && matchesYear && matchesStatus;
    });

    this.currentPage = 1;
  }

  clearRequisitionFilters(): void {
    this.requisitionDateFilter = '';
    this.requisitionMonthFilter = '';
    this.requisitionYearFilter = '';
    this.requisitionStatusFilter = '';
    this.filteredRequisitionData = [...this.requisitionData];
    this.currentPage = 1;
  }

  onRequisitionDateFilterChange(): void {
    this.applyRequisitionFilters();
  }

  onRequisitionMonthFilterChange(): void {
    this.applyRequisitionFilters();
  }

  onRequisitionYearFilterChange(): void {
    this.applyRequisitionFilters();
  }

  onRequisitionStatusFilterChange(): void {
    this.applyRequisitionFilters();
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRequisitionData.length / this.pageSize));
  }

  getPaged(): TableData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRequisitionData.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const total = this.getTotalPages();
    if (page < 1 || page > total) return;
    this.currentPage = page;
  }

  changePageSize(size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSize = s;
    this.currentPage = 1;
  }

  // Navigation methods
  viewRequisitionApplication(item: TableData): void {
    this.router.navigate(["/dev-supply-chain-application-view"], {
      queryParams: { ref: item.referenceNo }
    });
  }

  viewSlip(item: TableData): void {
    this.router.navigate(["/dev-final-requisition-letters"], {
      queryParams: {
        ref: item.referenceNo,
      },
    });
  }

  // Clear all requisition data
  clearAllRequisitionData(): void {
    if (!this.isBrowser) {
      return;
    }

    if (confirm('Are you sure you want to clear all requisition data? This action cannot be undone.')) {
      // Clear import permit requests from localStorage
      localStorage.removeItem('importPermitRequests');
      
      // Reload the data
      this.requisitionData = [];
      this.filteredRequisitionData = [];
      
      alert('All requisition data has been cleared successfully.');
    }
  }
}
