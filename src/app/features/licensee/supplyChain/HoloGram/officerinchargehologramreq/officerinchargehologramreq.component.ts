import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface HologramRequest {
  id: string;
  referenceNo: string;
  submissionDate: string;
  submittedBy: string;
  requestType: 'NEW_ALLOCATION' | 'ADDITIONAL_STOCK' | 'REPLACEMENT';
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  requestedQuantity: number;
  fromSerial?: string;
  toSerial?: string;
  brandDetails: {
    brandName: string;
    alcoholPercent: string;
    sizeMl: number;
    liquorType: string;
  };
  justification: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  officerComments?: string;
  approvedQuantity?: number;
  approvalDate?: string;
  rejectionReason?: string;
}

interface FilterOptions {
  referenceNumber: string;
  status: string;
  requestType: string;
  hologramType: string;
  urgencyLevel: string;
  dateFrom: string;
  dateTo: string;
}

@Component({
  selector: 'app-officerinchargehologramreq',
  imports: [CommonModule, FormsModule],
  templateUrl: './officerinchargehologramreq.component.html',
  styleUrl: './officerinchargehologramreq.component.scss'
})
export class OfficerinchargehologramreqComponent implements OnInit {
  @Output() backToRegister = new EventEmitter<void>();
  
  Math = Math;
  
  // Officer information - same as officer-in-charge component
  currentOfficer = {
    name: 'Rajesh Kumar',
    distilleryName: 'Sikkim Distilleries Ltd',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@sikkimdistilleries.com',
    officerId: 'OFF001'
  };

  hologramRequests: HologramRequest[] = [];
  filteredRequests: HologramRequest[] = [];
  paginatedRequests: HologramRequest[] = [];

  filters: FilterOptions = {
    referenceNumber: '',
    status: '',
    requestType: '',
    hologramType: '',
    urgencyLevel: '',
    dateFrom: '',
    dateTo: ''
  };

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Modal data
  selectedRequest: HologramRequest | null = null;
  approvalComments = '';
  approvedQuantity = 0;
  rejectionReason = '';

  ngOnInit() {
    this.loadHologramRequests();
    
    // Listen for storage changes to auto-refresh when new requests are submitted
    window.addEventListener('storage', (e) => {
      if (e.key === 'hologramRequests' || e.key === 'hologramApplications') {
        console.log('Storage change detected:', e.key);
        this.loadHologramRequests();
      }
    });
    
    // Check for updates every 10 seconds
    setInterval(() => {
      this.loadHologramRequests();
    }, 10000);
    
    // Also listen for focus events to refresh when user returns to tab
    window.addEventListener('focus', () => {
      console.log('Window focus detected, refreshing requests...');
      this.loadHologramRequests();
    });
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString();
  }

  loadHologramRequests() {
    console.log('Loading hologram requests from localStorage...');
    
    // Load actual submitted requests from localStorage
    const submittedRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const hologramApplications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    
    console.log('Found hologramRequests:', submittedRequests);
    console.log('Found hologramApplications:', hologramApplications);
    
    // Convert submitted requests to officer format
    const convertedRequests = submittedRequests.map((request: any, index: number) => {
      console.log('Converting request:', request);
      
      return {
        id: `HR${String(Date.now() + index).slice(-6)}`,
        referenceNo: request.refNumber || `HRQ/${new Date().getFullYear()}/${String(index + 1).padStart(3, '0')}`,
        submissionDate: request.submissionDate ? new Date(request.submissionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        submittedBy: 'Supply Chain User - Sikkim Distilleries Ltd',
        requestType: 'NEW_ALLOCATION' as const,
        hologramType: 'LOCAL' as const,
        requestedQuantity: request.totalHolograms || 0,
        brandDetails: {
          brandName: this.getBrandLabel(request.brandName) || request.brandName || 'Unknown Brand',
          alcoholPercent: '42.8%',
          sizeMl: this.getBottleSizeNumber(request.bottleSize) || 750,
          liquorType: this.getLiquorType(request.brandName) || 'Whisky'
        },
        justification: request.remarks || `Hologram request for ${this.getBrandLabel(request.brandName) || request.brandName} production - ${request.bottleSize} bottles. Usage date: ${request.usageDate}`,
        urgencyLevel: this.determineUrgencyLevel(request.usageDate) as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        status: request.status === 'APPROVED' ? 'APPROVED' as const : 
                request.status === 'REJECTED' ? 'REJECTED' as const : 'PENDING' as const,
        officerComments: request.officerComments,
        approvedQuantity: request.approvedQuantity,
        approvalDate: request.approvalDate,
        rejectionReason: request.rejectionReason
      };
    });

    // Convert hologram applications to officer format
    const convertedApplications = hologramApplications.map((app: any, index: number) => {
      const totalHolograms = (app.localQtyLakh || 0) + (app.exportQtyLakh || 0) + (app.defenceQtyLakh || 0);
      let hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';
      
      if (app.exportQtyLakh > 0) hologramType = 'EXPORT';
      else if (app.defenceQtyLakh > 0) hologramType = 'DEFENCE';

      return {
        id: `HA${String(Date.now() + index + 1000).slice(-6)}`,
        referenceNo: app.refNo || `HRQ/${new Date().getFullYear()}/${String(index + 100).padStart(3, '0')}`,
        submissionDate: app.date || new Date().toISOString().split('T')[0],
        submittedBy: `${app.companyName || 'Supply Chain User'} - Hologram Application`,
        requestType: 'NEW_ALLOCATION' as const,
        hologramType: hologramType,
        requestedQuantity: totalHolograms,
        brandDetails: {
          brandName: app.companyName || 'Unknown Company',
          alcoholPercent: '42.8%',
          sizeMl: 750,
          liquorType: 'Mixed Products'
        },
        justification: `Hologram application for ${hologramType.toLowerCase()} market. Local: ${app.localQtyLakh || 0}, Export: ${app.exportQtyLakh || 0}, Defence: ${app.defenceQtyLakh || 0} units.`,
        urgencyLevel: 'MEDIUM' as const,
        status: app.status === 'APPROVED' ? 'APPROVED' as const : 
                app.status === 'REJECTED' ? 'REJECTED' as const : 'PENDING' as const,
        officerComments: app.officerComments,
        approvedQuantity: app.approvedQuantity || totalHolograms,
        approvalDate: app.approvalDate,
        rejectionReason: app.rejectionReason
      };
    });

    // Combine all requests
    this.hologramRequests = [...convertedRequests, ...convertedApplications];

    console.log('Total converted requests:', convertedRequests.length);
    console.log('Total converted applications:', convertedApplications.length);
    console.log('Combined hologram requests:', this.hologramRequests.length);

    // Add sample data only if no real requests exist
    if (this.hologramRequests.length === 0) {
      console.log('No real requests found, adding sample data');
      this.hologramRequests = [
        {
          id: 'SAMPLE001',
          referenceNo: 'HRQ/2024/SAMPLE001',
          submissionDate: '2024-11-01',
          submittedBy: 'Sample Data - No real requests found',
          requestType: 'NEW_ALLOCATION',
          hologramType: 'LOCAL',
          requestedQuantity: 1000,
          brandDetails: {
            brandName: 'SDL Premium Whisky',
            alcoholPercent: '42.8%',
            sizeMl: 750,
            liquorType: 'Whisky'
          },
          justification: 'Sample data - Submit a real hologram request to see it here.',
          urgencyLevel: 'MEDIUM',
          status: 'PENDING'
        }
      ];
    } else {
      console.log('Found real requests, using them instead of sample data');
    }

    this.applyFilters();
  }

  // Helper methods for data conversion
  private getBrandLabel(brandValue: string): string {
    if (!brandValue) return 'Unknown Brand';
    
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

  private getBottleSizeNumber(bottleSize: string): number {
    const sizeMap: { [key: string]: number } = {
      '180ml': 180,
      '375ml': 375,
      '750ml': 750,
      '1000ml': 1000
    };
    return sizeMap[bottleSize] || 750;
  }

  private getLiquorType(brandValue: string): string {
    if (brandValue?.includes('whisky') || brandValue?.includes('whiskey')) return 'Whisky';
    if (brandValue?.includes('rum')) return 'Rum';
    if (brandValue?.includes('brandy')) return 'Brandy';
    if (brandValue?.includes('vodka')) return 'Vodka';
    return 'Whisky';
  }

  private determineUrgencyLevel(usageDate: string): string {
    if (!usageDate) return 'MEDIUM';
    
    const usage = new Date(usageDate);
    const today = new Date();
    const diffDays = Math.ceil((usage.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'CRITICAL';
    if (diffDays <= 3) return 'HIGH';
    if (diffDays <= 7) return 'MEDIUM';
    return 'LOW';
  }

  applyFilters() {
    this.filteredRequests = this.hologramRequests.filter(request => {
      const matchesReference = !this.filters.referenceNumber ||
        request.referenceNo.toLowerCase().includes(this.filters.referenceNumber.toLowerCase());

      const matchesStatus = !this.filters.status || request.status === this.filters.status;
      const matchesRequestType = !this.filters.requestType || request.requestType === this.filters.requestType;
      const matchesHologramType = !this.filters.hologramType || request.hologramType === this.filters.hologramType;
      const matchesUrgencyLevel = !this.filters.urgencyLevel || request.urgencyLevel === this.filters.urgencyLevel;

      const matchesDateFrom = !this.filters.dateFrom ||
        new Date(request.submissionDate) >= new Date(this.filters.dateFrom);

      const matchesDateTo = !this.filters.dateTo ||
        new Date(request.submissionDate) <= new Date(this.filters.dateTo);

      return matchesReference && matchesStatus && matchesRequestType && 
             matchesHologramType && matchesUrgencyLevel && matchesDateFrom && matchesDateTo;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilters() {
    this.filters = {
      referenceNumber: '',
      status: '',
      requestType: '',
      hologramType: '',
      urgencyLevel: '',
      dateFrom: '',
      dateTo: ''
    };
    this.applyFilters();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredRequests.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedRequests = this.filteredRequests.slice(startIndex, endIndex);
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
      case 'PENDING': return 'bg-warning text-dark';
      case 'APPROVED': return 'bg-success';
      case 'REJECTED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING': return 'bi bi-clock';
      case 'APPROVED': return 'bi bi-check-circle';
      case 'REJECTED': return 'bi bi-x-circle';
      default: return 'bi bi-question-circle';
    }
  }

  getUrgencyClass(urgency: string): string {
    switch (urgency) {
      case 'CRITICAL': return 'bg-danger';
      case 'HIGH': return 'bg-warning text-dark';
      case 'MEDIUM': return 'bg-info';
      case 'LOW': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  getRequestTypeClass(type: string): string {
    switch (type) {
      case 'NEW_ALLOCATION': return 'bg-primary';
      case 'ADDITIONAL_STOCK': return 'bg-info';
      case 'REPLACEMENT': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  }

  viewRequestDetails(request: HologramRequest) {
    this.selectedRequest = request;
    // In real app, open modal or navigate to details page
    console.log('Viewing request details:', request);
  }

  approveRequest(request: HologramRequest) {
    this.selectedRequest = request;
    this.approvalComments = '';
    this.approvedQuantity = request.requestedQuantity;
    // In real app, open approval modal
    const comments = prompt('Enter approval comments (optional):');
    const quantity = prompt(`Approved quantity (requested: ${request.requestedQuantity}):`, request.requestedQuantity.toString());
    
    if (comments !== null && quantity !== null) {
      this.approvalComments = comments;
      this.approvedQuantity = parseInt(quantity) || request.requestedQuantity;
      this.confirmApproval();
    }
  }

  rejectRequest(request: HologramRequest) {
    this.selectedRequest = request;
    this.rejectionReason = '';
    // In real app, open rejection modal
    const reason = prompt('Enter rejection reason (required):');
    
    if (reason && reason.trim()) {
      this.rejectionReason = reason;
      this.confirmRejection();
    }
  }

  confirmApproval() {
    if (this.selectedRequest) {
      this.selectedRequest.status = 'APPROVED';
      this.selectedRequest.officerComments = this.approvalComments;
      this.selectedRequest.approvedQuantity = this.approvedQuantity;
      this.selectedRequest.approvalDate = new Date().toISOString().split('T')[0];

      console.log('Request approved:', this.selectedRequest.referenceNo);
      alert(`Request ${this.selectedRequest.referenceNo} has been approved for ${this.approvedQuantity} holograms!`);

      this.selectedRequest = null;
      this.approvalComments = '';
      this.approvedQuantity = 0;
      this.applyFilters();
    }
  }

  confirmRejection() {
    if (this.selectedRequest && this.rejectionReason.trim()) {
      this.selectedRequest.status = 'REJECTED';
      this.selectedRequest.rejectionReason = this.rejectionReason;
      this.selectedRequest.approvalDate = new Date().toISOString().split('T')[0];

      console.log('Request rejected:', this.selectedRequest.referenceNo);
      alert(`Request ${this.selectedRequest.referenceNo} has been rejected.`);

      this.selectedRequest = null;
      this.rejectionReason = '';
      this.applyFilters();
    }
  }

  getRequestCount(status?: string): number {
    if (status) {
      return this.filteredRequests.filter(req => req.status === status).length;
    }
    return this.filteredRequests.length;
  }

  getTotalRequestedHolograms(): number {
    return this.filteredRequests.reduce((total, request) => total + request.requestedQuantity, 0);
  }

  exportData() {
    console.log('Exporting hologram requests data:', this.filteredRequests);
    alert('Export functionality will be implemented with backend integration');
  }

  backToHologramRegister() {
    this.backToRegister.emit();
  }

  // Manual refresh method
  refreshRequests() {
    console.log('Refreshing hologram requests...');
    
    // Debug: Check what's in localStorage
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const hologramApplications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    
    console.log('Found hologramRequests in localStorage:', hologramRequests);
    console.log('Found hologramApplications in localStorage:', hologramApplications);
    
    this.loadHologramRequests();
    alert(`Hologram requests refreshed successfully! Found ${hologramRequests.length} requests and ${hologramApplications.length} applications.`);
  }

  // Debug method to add test request (for testing)
  addTestRequest() {
    const testRequest = {
      usageDate: '2024-11-06',
      brandName: 'himalayan-gold',
      bottleSize: '750ml',
      totalHolograms: 1000,
      remarks: 'Test hologram request for verification',
      refNumber: `TEST/${Date.now()}`,
      submissionDate: new Date().toISOString(),
      status: 'PENDING'
    };

    const existingRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    existingRequests.push(testRequest);
    localStorage.setItem('hologramRequests', JSON.stringify(existingRequests));
    
    console.log('Added test request:', testRequest);
    this.loadHologramRequests();
    alert('Test request added successfully!');
  }

  // Debug method to show localStorage contents
  showStorageContents() {
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const hologramApplications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    
    console.log('=== LOCALSTORAGE CONTENTS ===');
    console.log('hologramRequests:', hologramRequests);
    console.log('hologramApplications:', hologramApplications);
    console.log('Current component requests:', this.hologramRequests);
    console.log('Filtered requests:', this.filteredRequests);
    
    const message = `
    LocalStorage Contents:
    - hologramRequests: ${hologramRequests.length} items
    - hologramApplications: ${hologramApplications.length} items
    
    Component Data:
    - Total requests loaded: ${this.hologramRequests.length}
    - Filtered requests: ${this.filteredRequests.length}
    
    Check browser console for detailed data.
    `;
    
    alert(message);
  }

  // Debug method to clear localStorage (for testing)
  clearTestData() {
    if (confirm('Are you sure you want to clear all test data? This will remove all hologram requests.')) {
      localStorage.removeItem('hologramRequests');
      localStorage.removeItem('hologramApplications');
      localStorage.removeItem('approvedHologramEntries');
      this.loadHologramRequests();
      alert('Test data cleared successfully!');
    }
  }
}
