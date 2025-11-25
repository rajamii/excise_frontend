import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hologramrequest',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramrequest.component.html',
  styleUrl: './hologramrequest.component.scss'
})
export class HologramrequestComponent implements OnInit {
  Math = Math;
  hologramRequestList: any[] = [];
  filteredHologramRequestList: any[] = [];
  private isBrowser = false;

  // Filter properties
  dateFilter: string = '';
  monthFilter: string = '';
  statusFilter: string = '';
  
  showRequestModal = false;
  selectedRequest: any = null;

  // Pagination state
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadHologramRequests();
  }

  loadHologramRequests(): void {
    if (!this.isBrowser) {
      this.hologramRequestList = [];
      return;
    }

    // Load hologram requests from localStorage
    let storedRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');

    // Sort by submission date (newest first)
    this.hologramRequestList = storedRequests.sort((a: any, b: any) => {
      const dateA = new Date(a.submissionDate).getTime();
      const dateB = new Date(b.submissionDate).getTime();
      return dateB - dateA; // Newest first
    });

    // Initialize filtered list
    this.filteredHologramRequestList = [...this.hologramRequestList];
  }

  navigateToHologramRequest(): void {
    this.router.navigate(['/dev-hologramrequestlevel1']);
  }

  getBrandLabel(brandValue: string): string {
    const brandMap: { [key: string]: string } = {
      'sikkim-supreme': 'Sikkim Supreme Whisky',
      'himalayan-gold': 'Himalayan Gold Rum',
      'royal-sikkim': 'Royal Sikkim Brandy',
      'mountain-dew': 'Mountain Dew Vodka',
      'gangtok-special': 'Gangtok Special Whisky',
      'teesta-valley': 'Teesta Valley Rum',
      'khangchendzonga': 'Khangchendzonga Premium',
      'yuksom-heritage': 'Yuksom Heritage Whisky'
    };
    return brandMap[brandValue] || brandValue;
  }

  getRequestStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-warning-subtle text-warning';
      case 'APPROVED':
        return 'bg-success-subtle text-success';
      case 'REJECTED':
        return 'bg-danger-subtle text-danger';
      case 'PROCESSING':
        return 'bg-info-subtle text-info';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }

  viewHologramRequestApplication(request: any): void {
    this.selectedRequest = request;
    this.showRequestModal = true;
  }

  closeRequestModal(): void {
    this.showRequestModal = false;
    this.selectedRequest = null;
  }

  downloadRequestApplication(request: any): void {
    const applicationContent = this.generateRequestApplicationTemplate(request);
    const filename = `Hologram_Request_${request.refNumber.replace(/\//g, '_')}.txt`;
    this.downloadFile(applicationContent, filename);
  }

  private generateRequestApplicationTemplate(request: any): string {
    const submissionDate = new Date(request.submissionDate).toLocaleDateString('en-IN');
    const usageDate = new Date(request.usageDate).toLocaleDateString('en-IN');
    const brandLabel = this.getBrandLabel(request.brandName);

    return `
HOLOGRAM REQUEST APPLICATION
============================

Reference Number: ${request.refNumber}
Application Date: ${submissionDate}

APPLICANT DETAILS:
------------------
Company Name: Sikkim Distilleries Ltd
License Number: SDL/2024/001
Address: Industrial Area, Rangpo, East Sikkim - 737132
Contact: +91-3592-252001
Email: info@sikkimdistilleries.com

REQUEST DETAILS:
----------------
Date to Use Hologram in Factory: ${usageDate}
Brand Name: ${brandLabel}
Bottle Size: ${request.bottleSize}
Total Number of Holograms Required: ${request.totalHolograms.toLocaleString('en-IN')}

${request.remarks ? `Additional Information:\n${request.remarks}\n` : ''}

DECLARATION:
------------
I hereby declare that the information provided above is true and correct to the best of my knowledge. 
I understand that any false information may lead to rejection of this application and/or legal action.

The holograms requested will be used solely for the production of the specified brand and bottle size 
mentioned in this application. Any misuse or unauthorized use of holograms will be reported immediately 
to the concerned authorities.

I agree to comply with all rules and regulations set forth by the Excise Department, Government of Sikkim, 
regarding the use and handling of security holograms.


Signature: _____________________
Name: [Authorized Signatory]
Designation: [Managing Director/Authorized Representative]
Date: ${submissionDate}


FOR OFFICE USE ONLY:
--------------------
Application Received Date: ___________
Received By: ___________
Processing Fee: ₹___________
Approval Status: ${request.status}
Approved By: ___________
Date of Approval: ___________
Hologram Dispatch Date: ___________

Remarks: ________________________________
________________________________________
________________________________________

Signature of Approving Authority: ___________
Name: ___________
Designation: ___________
Date: ___________

============================
End of Application
============================
`;
  }

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  getRequestStatusCount(status: string): number {
    return this.hologramRequestList.filter(request => request.status === status).length;
  }

  getTotalRequestedHolograms(): number {
    return this.hologramRequestList.reduce((total, request) => total + (request.totalHolograms || 0), 0);
  }

  // Filter methods
  applyFilters(): void {
    this.filteredHologramRequestList = this.hologramRequestList.filter(request => {
      let matchesDate = true;
      let matchesMonth = true;
      let matchesStatus = true;

      // Date filter (exact date match)
      if (this.dateFilter) {
        const requestDate = new Date(request.submissionDate);
        const requestDateString = requestDate.getUTCFullYear() + '-' +
          String(requestDate.getUTCMonth() + 1).padStart(2, '0') + '-' +
          String(requestDate.getUTCDate()).padStart(2, '0');
        matchesDate = requestDateString === this.dateFilter;
      }

      // Month filter (month and year match)
      if (this.monthFilter) {
        const requestDate = new Date(request.submissionDate);
        const filterDate = new Date(this.monthFilter + '-01');
        matchesMonth = requestDate.getFullYear() === filterDate.getFullYear() &&
          requestDate.getMonth() === filterDate.getMonth();
      }

      // Status filter
      if (this.statusFilter) {
        matchesStatus = request.status === this.statusFilter;
      }

      return matchesDate && matchesMonth && matchesStatus;
    });

    // Reset pagination to first page when filters are applied
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.dateFilter = '';
    this.monthFilter = '';
    this.statusFilter = '';
    this.filteredHologramRequestList = [...this.hologramRequestList];
    this.currentPage = 1;
  }

  onDateFilterChange(): void {
    this.applyFilters();
  }

  onMonthFilterChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bi bi-clock';
      case 'APPROVED':
        return 'bi bi-check-circle';
      case 'REJECTED':
        return 'bi bi-x-circle';
      case 'PROCESSING':
        return 'bi bi-hourglass-split';
      default:
        return 'bi bi-question-circle';
    }
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

  changePageSize(size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSize = s;
    this.currentPage = 1;
  }

  markPaymentCompleted(refNo: string): void {
    if (!this.isBrowser) return;

    // Get all applications with the same reference number
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    
    // Mark this specific application as paid
    const updatedApplications = applications.map((app: any) => {
      if (app.refNo === refNo) {
        return {
          ...app,
          paymentCompleted: true,
          paymentDate: new Date().toISOString()
        };
      }
      return app;
    });
    localStorage.setItem('hologramApplications', JSON.stringify(updatedApplications));

    // Update hologramRequests
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const updatedRequests = hologramRequests.map((req: any) => {
      if (req.refNo === refNo) {
        return {
          ...req,
          paymentCompleted: true,
          status: 'Payment Completed',
          paymentDate: new Date().toISOString()
        };
      }
      return req;
    });
    localStorage.setItem('hologramRequests', JSON.stringify(updatedRequests));

    alert(`Payment marked as completed for ${refNo}.`);
    
    // Refresh the list
    this.loadHologramRequests();
  }
}
