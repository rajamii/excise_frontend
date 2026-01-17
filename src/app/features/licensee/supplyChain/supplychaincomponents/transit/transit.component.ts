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
  priority?: string;
  destination?: string;
  transportMode?: string;
  vehicleNumber?: string;
  permitValidUntil?: string;
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
  transitStatusFilter: string = '';
  transitDestinationFilter: string = '';
  
  // Pagination
  pageSizeOptions: number[] = [5, 10, 15];
  currentPage: number = 1;
  pageSize: number = 5;
  
  filteredTransitData: TableData[] = [];
  
  // Sample data for transit permit applications (from commissioner's perspective)
  transitData: TableData[] = [
    {
      referenceNo: "TRN/BF801",
      submissionDate: "22-Sep-2025",
      distilleryName: "Sikkim Distilleries Ltd",
      status: "PENDING",
      amount: "2500.00",
      priority: "high",
      destination: "Delhi",
      transportMode: "Road",
      vehicleNumber: "SK01AB1234",
      permitValidUntil: "30-Sep-2025"
    },
    {
      referenceNo: "TRN/BF802",
      submissionDate: "21-Sep-2025",
      distilleryName: "Himalayan Distilleries Pvt Ltd",
      status: "APPROVED",
      amount: "3200.00",
      priority: "normal",
      destination: "Mumbai",
      transportMode: "Road",
      vehicleNumber: "MH12CD5678",
      permitValidUntil: "28-Sep-2025"
    },
    {
      referenceNo: "TRN/BF803",
      submissionDate: "20-Sep-2025",
      distilleryName: "Royal Sikkim Brewery",
      status: "ISSUED",
      amount: "1800.00",
      priority: "urgent",
      destination: "Kolkata",
      transportMode: "Road",
      vehicleNumber: "WB03EF9012",
      permitValidUntil: "25-Sep-2025"
    },
    {
      referenceNo: "TRN/BF804",
      submissionDate: "19-Sep-2025",
      distilleryName: "Mountain View Distilleries",
      status: "PROCESSING",
      amount: "2100.00",
      priority: "normal",
      destination: "Bangalore",
      transportMode: "Road",
      vehicleNumber: "KA05GH3456",
      permitValidUntil: "27-Sep-2025"
    },
    {
      referenceNo: "TRN/BF805",
      submissionDate: "18-Sep-2025",
      distilleryName: "Eastern Himalaya Distillery",
      status: "PENDING",
      amount: "2800.00",
      priority: "high",
      destination: "Chennai",
      transportMode: "Road",
      vehicleNumber: "TN09IJ7890",
      permitValidUntil: "26-Sep-2025"
    },
    {
      referenceNo: "TRN/BF806",
      submissionDate: "17-Sep-2025",
      distilleryName: "Gangtok Premium Spirits",
      status: "REJECTED",
      amount: "1500.00",
      priority: "normal",
      destination: "Guwahati",
      transportMode: "Road",
      vehicleNumber: "AS01KL2345",
      permitValidUntil: "24-Sep-2025"
    }
  ];

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Initialize filtered data
    this.filteredTransitData = [...this.transitData];
  }

  // Filter methods
  applyTransitFilters(): void {
    let filtered = [...this.transitData];

    if (this.transitDateFilter) {
      filtered = filtered.filter(item => {
        const itemDate = this.parseDate(item.submissionDate);
        const filterDate = new Date(this.transitDateFilter);
        return itemDate.toDateString() === filterDate.toDateString();
      });
    }

    if (this.transitStatusFilter) {
      filtered = filtered.filter(item => item.status === this.transitStatusFilter);
    }

    if (this.transitDestinationFilter) {
      filtered = filtered.filter(item => item.destination === this.transitDestinationFilter);
    }

    this.filteredTransitData = filtered;
    this.resetPagination();
  }

  clearTransitFilters(): void {
    this.transitDateFilter = '';
    this.transitStatusFilter = '';
    this.transitDestinationFilter = '';
    this.applyTransitFilters();
  }

  onTransitDateFilterChange(): void {
    this.applyTransitFilters();
  }

  onTransitStatusFilterChange(): void {
    this.applyTransitFilters();
  }

  onTransitDestinationFilterChange(): void {
    this.applyTransitFilters();
  }

  // Summary methods
  getTransitStatusCount(status: string): number {
    return this.filteredTransitData.filter(item => item.status === status).length;
  }

  getUrgentTransitCount(): number {
    return this.filteredTransitData.filter(item => 
      item.priority === 'urgent' || item.priority === 'high'
    ).length;
  }

  getTotalTransitAmount(): number {
    return this.filteredTransitData.reduce((total, item) => total + parseFloat(item.amount || '0'), 0);
  }

  // Action methods
  reviewTransit(item: TableData): void {
    // Navigate to transit permit letter view with reference number
    this.router.navigate(['/dev-transit-permit-letter-view'], {
      queryParams: { ref: item.referenceNo }
    });
  }

  approveTransit(item: TableData): void {
    item.status = 'APPROVED';
    console.log('Approved transit permit:', item.referenceNo);
  }

  rejectTransit(item: TableData): void {
    item.status = 'REJECTED';
    console.log('Rejected transit permit:', item.referenceNo);
  }

  issueTransit(item: TableData): void {
    item.status = 'ISSUED';
    console.log('Issued transit permit:', item.referenceNo);
  }

  // Helper methods
  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'pending';
      case 'APPROVED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      case 'PROCESSING':
        return 'processing';
      case 'ISSUED':
        return 'issued';
      default:
        return 'default';
    }
  }

  private parseDate(dateString: string): Date {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateString);
  }

  // Pagination methods
  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil((this.filteredTransitData?.length || 0) / this.pageSize));
  }

  getPaged(): TableData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (this.filteredTransitData || []).slice(start, start + this.pageSize);
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
