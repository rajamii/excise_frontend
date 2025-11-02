import { Component, OnInit } from '@angular/core';
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
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString();
  }

  loadHologramRequests() {
    // Sample data - requests from supply chain users
    this.hologramRequests = [
      {
        id: 'HR001',
        referenceNo: 'HRQ/2024/001',
        submissionDate: '2024-11-01',
        submittedBy: 'Supply Chain Manager - John Doe',
        requestType: 'NEW_ALLOCATION',
        hologramType: 'LOCAL',
        requestedQuantity: 1000,
        brandDetails: {
          brandName: 'SDL Premium Whisky',
          alcoholPercent: '42.8%',
          sizeMl: 750,
          liquorType: 'Whisky'
        },
        justification: 'New product launch requires initial hologram allocation for local market distribution.',
        urgencyLevel: 'HIGH',
        status: 'PENDING'
      },
      {
        id: 'HR002',
        referenceNo: 'HRQ/2024/002',
        submissionDate: '2024-10-28',
        submittedBy: 'Production Supervisor - Jane Smith',
        requestType: 'ADDITIONAL_STOCK',
        hologramType: 'EXPORT',
        requestedQuantity: 500,
        fromSerial: 'EXP001001',
        toSerial: 'EXP001500',
        brandDetails: {
          brandName: 'SDL Reserve Brandy',
          alcoholPercent: '42.8%',
          sizeMl: 750,
          liquorType: 'Brandy'
        },
        justification: 'Current export stock running low. Need additional holograms for upcoming shipment to Nepal.',
        urgencyLevel: 'MEDIUM',
        status: 'PENDING'
      },
      {
        id: 'HR003',
        referenceNo: 'HRQ/2024/003',
        submissionDate: '2024-10-25',
        submittedBy: 'Quality Control - Mike Johnson',
        requestType: 'REPLACEMENT',
        hologramType: 'LOCAL',
        requestedQuantity: 50,
        brandDetails: {
          brandName: 'SDL Classic Rum',
          alcoholPercent: '40%',
          sizeMl: 375,
          liquorType: 'Rum'
        },
        justification: 'Damaged holograms during production process. Need replacement for quality compliance.',
        urgencyLevel: 'CRITICAL',
        status: 'APPROVED',
        officerComments: 'Approved for replacement due to production damage',
        approvedQuantity: 50,
        approvalDate: '2024-10-26'
      },
      {
        id: 'HR004',
        referenceNo: 'HRQ/2024/004',
        submissionDate: '2024-10-20',
        submittedBy: 'Export Manager - Sarah Wilson',
        requestType: 'NEW_ALLOCATION',
        hologramType: 'DEFENCE',
        requestedQuantity: 200,
        brandDetails: {
          brandName: 'SDL Mountain Vodka',
          alcoholPercent: '40%',
          sizeMl: 180,
          liquorType: 'Vodka'
        },
        justification: 'Defence canteen order requires special allocation for military personnel.',
        urgencyLevel: 'HIGH',
        status: 'REJECTED',
        rejectionReason: 'Insufficient defence quota available for current month',
        approvalDate: '2024-10-22'
      },
      {
        id: 'HR005',
        referenceNo: 'HRQ/2024/005',
        submissionDate: '2024-10-15',
        submittedBy: 'Supply Chain Coordinator - David Brown',
        requestType: 'ADDITIONAL_STOCK',
        hologramType: 'LOCAL',
        requestedQuantity: 750,
        brandDetails: {
          brandName: 'SDL Heritage Whisky',
          alcoholPercent: '42.8%',
          sizeMl: 750,
          liquorType: 'Whisky'
        },
        justification: 'Festival season demand increase. Additional stock required for local distribution.',
        urgencyLevel: 'MEDIUM',
        status: 'PENDING'
      }
    ];

    this.applyFilters();
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
}
