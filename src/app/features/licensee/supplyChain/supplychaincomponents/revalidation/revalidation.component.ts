import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http'; // Added for debug
import { SupplyChainService } from '../../services/supplychain.service';
import { environment } from '../../../../../../environments/environment'; // Added for debug

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

  revlidationData: TableData[] = [];

  // Pagination state
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  constructor(
    private router: Router,
    private supplyChainService: SupplyChainService,
    private http: HttpClient // Debug: Direct injection
  ) {
    console.log('DEBUG: RevalidationComponent Constructor');
    console.log('DEBUG: supplyChainService:', this.supplyChainService);
    console.log('DEBUG: http:', this.http);
  }

  ngOnInit(): void {
    console.log('DEBUG: ngOnInit');
    this.fetchRevalidationData();
  }

  async fetchRevalidationData() {
    try {
      console.log('DEBUG: Fetching data...');

      let response: any;

      if (this.supplyChainService) {
        console.log('DEBUG: Using SupplyChainService');
        response = await firstValueFrom(this.supplyChainService.getRevalidationData());
      } else {
        console.warn('DEBUG: Service undefined! Using direct Http as fallback.');
        const url = `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/`;
        response = await firstValueFrom(this.http.get<any[]>(url));

        // Manual handling of results structure if direct call
        if (response && !Array.isArray(response) && response.results) {
          response = response.results;
        }
      }

      console.log('DEBUG: Raw Response:', response);

      this.revlidationData = (response || []).map((item: any) => ({
        referenceNo: item.ourRefNo,
        submissionDate: new Date(item.revalidationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        distilleryName: item.distilleryName,
        status: item.status,
        amount: item.revalidationBrAmount || '0.00',
        isLive: !item.status.includes('INVALID') && !item.status.includes('EXPIRED'),
        isInvalid: item.status.includes('INVALID') || item.status.includes('EXPIRED'),
      }));

      this.filteredRevalidationData = [...this.revlidationData];
      console.log('DEBUG: Processed Data length:', this.filteredRevalidationData.length);

    } catch (error) {
      console.error('Error fetching revalidation data:', error);
    }
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

          if (this.revalidationDateFilter) {
            const filterDate = new Date(this.revalidationDateFilter);
            matchesDate = itemDate.getFullYear() === filterDate.getFullYear() &&
              itemDate.getMonth() === filterDate.getMonth() &&
              itemDate.getDate() === filterDate.getDate();
          }

          if (this.revalidationMonthFilter) {
            const filterDate = new Date(this.revalidationMonthFilter + '-01');
            matchesMonth = itemDate.getFullYear() === filterDate.getFullYear() &&
              itemDate.getMonth() === filterDate.getMonth();
          }

          if (this.revalidationYearFilter) {
            const filterYear = parseInt(this.revalidationYearFilter);
            matchesYear = itemDate.getFullYear() === filterYear;
          }
        }
      }

      if (this.revalidationStatusFilter) {
        matchesStatus = item.status.toLowerCase().includes(this.revalidationStatusFilter.toLowerCase());
      }

      const finalMatch = matchesDate && matchesMonth && matchesYear && matchesStatus;

      return finalMatch;
    });

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
    this.applyRevalidationFilters();
  }

  onRevalidationMonthFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationYearFilterChange(): void {
    this.applyRevalidationFilters();
  }

  onRevalidationStatusFilterChange(): void {
    this.applyRevalidationFilters();
  }

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

  viewApplication(item: TableData, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const refNo = item.referenceNo;
    this.router.navigate(["/dev-supply-chain-revalidation-view"], {
      queryParams: { ref: refNo },
    });
  }

  requestRevlidation(item: TableData): void {
    this.router.navigate(["/dev-payment-confirmation"], {
      queryParams: {
        tab: "revalidation",
        referenceNo: item.referenceNo,
      },
    });
  }

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
