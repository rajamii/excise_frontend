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

interface HologramInventory {
  id: number;
  cartoonNumber: string;
  type: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  fromSerial: string;
  toSerial: string;
  totalCount: number;
  availableCount: number;
  usedCount: number;
  damagedCount: number;
  status: 'AVAILABLE' | 'IN_USE' | 'COMPLETED' | 'DAMAGED';
  receivedDate: string;
  nextAvailableSerial?: string;
}

interface HologramAllocation {
  cartoonNumber: string;
  fromSerial: string;
  toSerial: string;
  quantity: number;
  remainingInCartoon: number;
}

interface AllocationResult {
  canAllocate: boolean;
  totalAvailable: number;
  allocations: HologramAllocation[];
  message: string;
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

  // Hologram allocation modal
  showAllocationModal = false;
  allocationResult: AllocationResult | null = null;
  hologramInventory: HologramInventory[] = [];

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
    
    // Check inventory and show allocation popup
    this.showHologramAllocationModal(request);
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

  // Hologram allocation methods
  loadHologramInventory(): void {
    // Load from localStorage (saved by hologram overview)
    const savedRolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
    const savedSerialData = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');
    
    // Combine both sources and prioritize serial data
    const combinedInventory = [...savedSerialData, ...savedRolls];
    
    // Sample inventory data if no real data exists
    const sampleInventory = [
      {
        id: 1,
        cartoonNumber: 'CTN001',
        type: 'LOCAL',
        fromSerial: 'HG001001',
        toSerial: 'HG001500',
        totalCount: 500,
        availableCount: 350,
        usedCount: 120,
        damagedCount: 30,
        status: 'AVAILABLE',
        receivedDate: '2024-09-01'
      },
      {
        id: 2,
        cartoonNumber: 'CTN002',
        type: 'LOCAL',
        fromSerial: 'HG002001',
        toSerial: 'HG002500',
        totalCount: 500,
        availableCount: 500,
        usedCount: 0,
        damagedCount: 0,
        status: 'AVAILABLE',
        receivedDate: '2024-08-28'
      },
      {
        id: 3,
        cartoonNumber: 'CTN003',
        type: 'EXPORT',
        fromSerial: 'HG003001',
        toSerial: 'HG003300',
        totalCount: 300,
        availableCount: 250,
        usedCount: 40,
        damagedCount: 10,
        status: 'AVAILABLE',
        receivedDate: '2024-08-15'
      }
    ];

    this.hologramInventory = combinedInventory.length > 0 ? combinedInventory : sampleInventory;
    
    // Sort by received date (oldest first for FIFO)
    this.hologramInventory.sort((a, b) => {
      return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
    });
  }

  showHologramAllocationModal(request: HologramRequest): void {
    this.selectedRequest = request;
    this.approvedQuantity = request.requestedQuantity;
    this.loadHologramInventory();
    this.allocationResult = this.calculateHologramAllocation(request.requestedQuantity, request.hologramType);
    this.showAllocationModal = true;
  }

  calculateHologramAllocation(requestedQuantity: number, hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE'): AllocationResult {
    // Filter available inventory by type and status
    const availableInventory = this.hologramInventory.filter(item => 
      item.type === hologramType && 
      item.status === 'AVAILABLE' && 
      item.availableCount > 0
    );

    const totalAvailable = availableInventory.reduce((sum, item) => sum + item.availableCount, 0);

    if (totalAvailable < requestedQuantity) {
      return {
        canAllocate: false,
        totalAvailable,
        allocations: [],
        message: `Insufficient inventory. Available: ${totalAvailable}, Requested: ${requestedQuantity}`
      };
    }

    // FIFO allocation - use oldest cartoons first
    const allocations: HologramAllocation[] = [];
    let remainingQuantity = requestedQuantity;

    for (const item of availableInventory) {
      if (remainingQuantity <= 0) break;

      const quantityFromThisCartoon = Math.min(remainingQuantity, item.availableCount);
      
      // Calculate serial range for this allocation
      const startSerial = this.getNextAvailableSerial(item);
      const endSerial = this.calculateEndSerial(startSerial, quantityFromThisCartoon - 1);

      allocations.push({
        cartoonNumber: item.cartoonNumber,
        fromSerial: startSerial,
        toSerial: endSerial,
        quantity: quantityFromThisCartoon,
        remainingInCartoon: item.availableCount - quantityFromThisCartoon
      });

      remainingQuantity -= quantityFromThisCartoon;
    }

    return {
      canAllocate: true,
      totalAvailable,
      allocations,
      message: `Successfully allocated ${requestedQuantity} holograms from ${allocations.length} cartoon(s)`
    };
  }

  getNextAvailableSerial(item: HologramInventory): string {
    if (item.nextAvailableSerial) {
      return item.nextAvailableSerial;
    }

    // Calculate next available serial based on used count
    const serialPrefix = item.fromSerial.replace(/\d+$/, '');
    const startNumber = parseInt(item.fromSerial.match(/\d+$/)?.[0] || '0');
    const nextNumber = startNumber + item.usedCount;
    
    return serialPrefix + nextNumber.toString().padStart(6, '0');
  }

  calculateEndSerial(startSerial: string, quantity: number): string {
    const serialPrefix = startSerial.replace(/\d+$/, '');
    const startNumber = parseInt(startSerial.match(/\d+$/)?.[0] || '0');
    const endNumber = startNumber + quantity;
    
    return serialPrefix + endNumber.toString().padStart(6, '0');
  }

  confirmHologramAllocation(): void {
    if (!this.selectedRequest || !this.allocationResult) {
      return;
    }

    // Update inventory
    this.updateInventoryAfterAllocation();

    // Create issued hologram entries
    this.createIssuedHologramEntries();

    // Update request status
    this.selectedRequest.status = 'APPROVED';
    this.selectedRequest.officerComments = this.approvalComments || 'Approved with hologram allocation';
    this.selectedRequest.approvedQuantity = this.approvedQuantity || this.selectedRequest.requestedQuantity;
    this.selectedRequest.approvalDate = new Date().toISOString().split('T')[0];

    // Update localStorage
    this.updateRequestInStorage();


    alert(`Request ${this.selectedRequest.referenceNo} approved! ${this.allocationResult.allocations.length} hologram allocation(s) created.`);

    this.closeAllocationModal();
    this.applyFilters();
  }

  updateInventoryAfterAllocation(): void {
    if (!this.allocationResult) return;

    for (const allocation of this.allocationResult.allocations) {
      const inventoryItem = this.hologramInventory.find(item => 
        item.cartoonNumber === allocation.cartoonNumber
      );

      if (inventoryItem) {
        inventoryItem.availableCount -= allocation.quantity;
        inventoryItem.usedCount += allocation.quantity;
        inventoryItem.nextAvailableSerial = this.calculateEndSerial(allocation.toSerial, 1);

        if (inventoryItem.availableCount === 0) {
          inventoryItem.status = 'COMPLETED';
        }
      }
    }

    // Update localStorage
    localStorage.setItem('hologramOverviewRolls', JSON.stringify(this.hologramInventory));
    localStorage.setItem('hologramOverviewSerialData', JSON.stringify(this.hologramInventory));
  }

  createIssuedHologramEntries(): void {
    if (!this.selectedRequest || !this.allocationResult) return;

    const issuedEntries = this.allocationResult.allocations.map((allocation, index) => ({
      id: Date.now() + index,
      batchNumber: `BATCH${String(Date.now()).slice(-6)}`,
      brandName: this.selectedRequest!.brandDetails.brandName,
      fromSerial: allocation.fromSerial,
      toSerial: allocation.toSerial,
      quantity: allocation.quantity,
      issueDate: new Date().toISOString(),
      status: 'IN_PROGRESS',
      officer: this.currentOfficer.name,
      requestReference: this.selectedRequest!.referenceNo,
      hologramType: this.selectedRequest!.hologramType,
      cartoonNumber: allocation.cartoonNumber
    }));

    // Save to localStorage for hologram overview
    const existingIssued = JSON.parse(localStorage.getItem('issuedHolograms') || '[]');
    const updatedIssued = [...existingIssued, ...issuedEntries];
    localStorage.setItem('issuedHolograms', JSON.stringify(updatedIssued));

    // Create auto-populated daily register entries
    this.createDailyRegisterEntries();

    console.log('Created issued hologram entries:', issuedEntries);
  }

  createDailyRegisterEntries(): void {
    if (!this.selectedRequest || !this.allocationResult) return;

    // Create daily register entries for each allocation
    const dailyEntries = this.allocationResult.allocations.map((allocation, index) => ({
      id: `AUTO_${Date.now()}_${index}`,
      date: new Date().toISOString().split('T')[0], // Today's date
      hologramType: this.selectedRequest!.hologramType,
      issuedFromSerial: allocation.fromSerial,
      issuedToSerial: allocation.toSerial,
      issuedQuantity: allocation.quantity,
      utilizedQuantity: 0, // User will update this
      wastageFromSerial: '',
      wastageToSerial: '',
      wastageQuantity: 0,
      leftOverQuantity: allocation.quantity, // Initially all are left over
      damageReason: '',
      isFixed: false, // User can edit these fields
      // Additional metadata for tracking
      referenceNo: this.selectedRequest!.referenceNo,
      brandDetails: this.selectedRequest!.brandDetails,
      bottleSize: `${this.selectedRequest!.brandDetails.sizeMl}ml`,
      submissionDate: this.selectedRequest!.submissionDate,
      usageDate: new Date().toISOString().split('T')[0],
      approvalDate: new Date().toISOString().split('T')[0],
      officerName: this.currentOfficer.name,
      cartoonNumber: allocation.cartoonNumber,
      autoGenerated: true
    }));

    // Save to localStorage for daily register
    const existingDailyEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
    const updatedDailyEntries = [...existingDailyEntries, ...dailyEntries];
    localStorage.setItem('approvedHologramEntries', JSON.stringify(updatedDailyEntries));

    console.log('Created auto-populated daily register entries:', dailyEntries);
  }

  updateRequestInStorage(): void {
    if (!this.selectedRequest) return;

    // Update in hologramRequests
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const requestIndex = hologramRequests.findIndex((req: any) => 
      req.refNumber === this.selectedRequest!.referenceNo
    );

    if (requestIndex !== -1) {
      hologramRequests[requestIndex].status = 'APPROVED';
      hologramRequests[requestIndex].officerComments = this.selectedRequest.officerComments;
      hologramRequests[requestIndex].approvedQuantity = this.selectedRequest.approvedQuantity;
      hologramRequests[requestIndex].approvalDate = this.selectedRequest.approvalDate;
      localStorage.setItem('hologramRequests', JSON.stringify(hologramRequests));
    }

    // Update in hologramApplications if exists
    const hologramApplications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const appIndex = hologramApplications.findIndex((app: any) => 
      app.refNo === this.selectedRequest!.referenceNo
    );

    if (appIndex !== -1) {
      hologramApplications[appIndex].status = 'APPROVED';
      hologramApplications[appIndex].officerComments = this.selectedRequest.officerComments;
      hologramApplications[appIndex].approvedQuantity = this.selectedRequest.approvedQuantity;
      hologramApplications[appIndex].approvalDate = this.selectedRequest.approvalDate;
      localStorage.setItem('hologramApplications', JSON.stringify(hologramApplications));
    }
  }

  closeAllocationModal(): void {
    this.showAllocationModal = false;
    this.allocationResult = null;
    this.selectedRequest = null;
    this.approvalComments = '';
    this.approvedQuantity = 0;
  }

  editAllocationQuantity(allocation: HologramAllocation, newQuantity: number): void {
    if (newQuantity <= 0 || !this.allocationResult) return;

    const inventoryItem = this.hologramInventory.find(item => 
      item.cartoonNumber === allocation.cartoonNumber
    );

    if (!inventoryItem) return;

    const maxQuantity = inventoryItem.availableCount;
    if (newQuantity > maxQuantity) {
      alert(`Maximum available in ${allocation.cartoonNumber}: ${maxQuantity}`);
      return;
    }

    // Update allocation
    const oldQuantity = allocation.quantity;
    allocation.quantity = newQuantity;
    allocation.toSerial = this.calculateEndSerial(allocation.fromSerial, newQuantity - 1);
    allocation.remainingInCartoon = inventoryItem.availableCount - newQuantity;

    // Recalculate total and update approved quantity
    const totalAllocated = this.allocationResult.allocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
    this.approvedQuantity = totalAllocated;

    // Update message
    this.allocationResult.message = `Allocated ${totalAllocated} holograms from ${this.allocationResult.allocations.length} cartoon(s)`;
  }

  // Method to add sample inventory for testing
  addSampleInventory(): void {
    const sampleInventory = [
      {
        id: Date.now(),
        cartoonNumber: `CTN${String(Date.now()).slice(-3)}`,
        type: 'LOCAL',
        fromSerial: 'HG001001',
        toSerial: 'HG001500',
        totalCount: 500,
        availableCount: 500,
        usedCount: 0,
        damagedCount: 0,
        status: 'AVAILABLE',
        receivedDate: new Date().toISOString().split('T')[0],
        isNew: true,
        newUntil: Date.now() + (60 * 60 * 1000) // 1 hour from now
      },
      {
        id: Date.now() + 1,
        cartoonNumber: `CTN${String(Date.now() + 1).slice(-3)}`,
        type: 'EXPORT',
        fromSerial: 'HG002001',
        toSerial: 'HG002300',
        totalCount: 300,
        availableCount: 300,
        usedCount: 0,
        damagedCount: 0,
        status: 'AVAILABLE',
        receivedDate: new Date().toISOString().split('T')[0],
        isNew: true,
        newUntil: Date.now() + (60 * 60 * 1000) // 1 hour from now
      }
    ];

    // Add to localStorage
    const existingRolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
    const existingSerial = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');
    const existingAvailable = JSON.parse(localStorage.getItem('hologramOverviewAvailable') || '[]');

    // Add to all storage locations
    localStorage.setItem('hologramOverviewRolls', JSON.stringify([...existingRolls, ...sampleInventory]));
    localStorage.setItem('hologramOverviewSerialData', JSON.stringify([...existingSerial, ...sampleInventory]));
    
    // Create available data
    const availableData = sampleInventory.map(item => ({
      id: item.id + 1000,
      cartoonNumber: item.cartoonNumber,
      type: item.type,
      availableRange: `${item.fromSerial} - ${item.toSerial}`,
      availableCount: item.availableCount,
      nextSerial: item.fromSerial,
      percentage: 100,
      status: 'AVAILABLE',
      isNew: true,
      newUntil: item.newUntil
    }));

    localStorage.setItem('hologramOverviewAvailable', JSON.stringify([...existingAvailable, ...availableData]));

    alert(`Added ${sampleInventory.length} sample hologram cartoons to inventory! You can now test the approval workflow.`);
  }

  // Helper method for template calculations
  getTotalAllocatedQuantity(): number {
    if (!this.allocationResult) return 0;
    return this.allocationResult.allocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
  }

  // Event handler for allocation quantity change
  onAllocationQuantityChange(allocation: HologramAllocation, event: Event): void {
    const target = event.target as HTMLInputElement;
    const newQuantity = parseInt(target.value) || 0;
    this.editAllocationQuantity(allocation, newQuantity);
  }


}
