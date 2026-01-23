import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HologramDataService, HologramRequest as ApiHologramRequest } from '../../services/hologram-data.service';

interface HologramRequest {
  id: string;
  referenceNo: string;
  submissionDate: string;
  usageDate: string; // Date when holograms will be used in factory
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
  status: 'PENDING' | 'UNDER_PROCESS' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'IN_USE';
  officerComments?: string;
  approvedQuantity?: number;
  approvalDate?: string;
  rejectionReason?: string;
  allocations?: HologramAllocation[]; // Allocation details saved when approved
  allowedActions?: string[]; // Added from API
  originalId?: number; // Backend ID
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
  actualAvailableRange?: { fromSerial: string; toSerial: string; count: number }; // Actual available range excluding IN_PROGRESS (deprecated - use actualAvailableRanges)
  actualAvailableRanges?: Array<{ fromSerial: string; toSerial: string; count: number }>; // ALL available ranges excluding IN_PROGRESS
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
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './officerinchargehologramreq.component.html',
  styleUrl: './officerinchargehologramreq.component.scss'
})
export class OfficerinchargehologramreqComponent implements OnInit {
  @Output() backToRegister = new EventEmitter<void>();

  private hologramService = inject(HologramDataService);

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
  allocations: any[] = []; // Calculated allocations for the modal

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
  filteredInventory: HologramInventory[] = []; // Added for roll visibility

  // Rolls Assigned Modal
  showRollsModal = false;
  selectedRequestForRolls: HologramRequest | null = null;

  ngOnInit() {
    this.loadHologramRequests();
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString();
  }

  loadHologramRequests() {
    console.log('Loading hologram requests from API...');
    this.hologramService.getRequests().subscribe({
      next: (data) => {
        this.hologramRequests = data.map((req: any) => {
          // Use RAW status from backend - NO MAPPING
          const rawStatus = req.status || 'PENDING';
          console.log(`Ref: ${req.refNo}, Status: ${rawStatus}, Actions: ${req.allowed_actions}`);

          return {
            id: `HR${req.id}`,
            originalId: req.id,
            referenceNo: req.refNo || 'N/A',
            submissionDate: req.submissionDate || new Date().toISOString(),
            usageDate: req.usageDate || new Date().toISOString(),
            submittedBy: req.licenseeName || 'Unknown',
            requestType: 'NEW_ALLOCATION',
            hologramType: this.normalizeHologramType(req.hologramType || req.type),
            requestedQuantity: req.quantity || 0,
            brandDetails: {
              brandName: req.brandName || 'Unknown Brand',
              alcoholPercent: '42.8%',
              sizeMl: parseInt(req.bottleSize) || 750,
              liquorType: 'Whisky'
            },
            justification: req.remarks || '',
            urgencyLevel: 'MEDIUM',
            status: rawStatus, // DISPLAY RAW STATUS
            allowedActions: req.allowed_actions || [], // Dynamic Actions
            officerComments: req.remarks,
            approvedQuantity: req.quantity,
            // CRITICAL: Include rolls_assigned data from API
            rolls_assigned: req.rolls_assigned || req.rollsAssigned || req.issued_assets || [],
            allocations: req.allocations || []
          }
        });

        // Sort by date desc
        this.hologramRequests.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

        this.applyFilters();
      },
      error: (err) => {
        console.error('Error loading hologram requests:', err);
      }
    });
  }

  // Helper Methods for Dynamic Workflow
  canIssue(request: any): boolean {
    // 1. Check Dynamic Actions (Backend)
    const actions = request.allowedActions || [];
    if (actions.includes('issue') || actions.includes('approve')) return true;

    // 2. Fallback: Explicitly allow for 'APPROVED BY PERMIT SECTION' and 'SUBMITTED'
    // This handles cases where role-mapping might fail but status is correct
    const s = (request.status || '').toUpperCase();
    if (s === 'APPROVED BY PERMIT SECTION' || s === 'SUBMITTED' || s === 'PENDING') return true;

    return false;
  }

  canReject(request: any): boolean {
    const actions = request.allowedActions || [];
    if (actions.includes('reject')) return true;

    // Fallback for SUBMITTED/PENDING
    const s = (request.status || '').toUpperCase();
    if (s === 'APPROVED BY PERMIT SECTION' || s === 'SUBMITTED' || s === 'PENDING') return true;

    return false;
  }

  private normalizeHologramType(type: string): 'LOCAL' | 'EXPORT' | 'DEFENCE' {
    const t = (type || '').toUpperCase();
    if (['LOCAL', 'EXPORT', 'DEFENCE'].includes(t)) return t as any;
    return 'LOCAL';
  }

  // REMOVED mapStatus() - using raw status directly

  getStatusClass(status: string): string {
    const category = this.mapStatusToCategory(status);

    switch (category) {
      case 'APPROVED':
        return 'bg-success';
      case 'UNDER_PROCESS':
        return 'bg-warning text-dark';
      case 'PENDING':
        return 'bg-info';
      case 'REJECTED':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    const category = this.mapStatusToCategory(status);

    switch (category) {
      case 'APPROVED':
        return 'bi bi-check-circle-fill';
      case 'UNDER_PROCESS':
        return 'bi bi-hourglass-split';
      case 'PENDING':
        return 'bi bi-clock';
      case 'REJECTED':
        return 'bi bi-x-circle';
      default:
        return 'bi bi-info-circle';
    }
  }

  // Helper methods for data conversion
  private getBrandLabel(brandValue: string): string {
    return brandValue || 'Unknown Brand';
  }

  private getBottleSizeNumber(bottleSize: string): number {
    return parseInt(bottleSize) || 750;
  }

  private getLiquorType(brandValue: string): string {
    return 'Whisky';
  }

  private determineUrgencyLevel(usageDate: string): string {
    return 'MEDIUM';
  }

  applyFilters() {
    this.filteredRequests = this.hologramRequests.filter(request => {
      const matchesReference = !this.filters.referenceNumber ||
        request.referenceNo.toLowerCase().includes(this.filters.referenceNumber.toLowerCase());

      const matchesStatus = !this.filters.status || this.mapStatusToCategory(request.status) === this.filters.status;
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

    // Sort filtered results by submission date and reference number - newest first (descending order)
    this.filteredRequests.sort((a, b) => {
      // First, try to sort by submission date with time
      const dateA = new Date(a.submissionDate).getTime();
      const dateB = new Date(b.submissionDate).getTime();

      if (dateB !== dateA) {
        return dateB - dateA; // Descending order (newest first)
      }

      // If dates are the same, sort by reference number (descending - higher numbers first)
      // Extract the numeric part from reference numbers like "HRQ/251125/012"
      const refNumA = parseInt(a.referenceNo.split('/').pop() || '0');
      const refNumB = parseInt(b.referenceNo.split('/').pop() || '0');
      return refNumB - refNumA; // Descending order (higher ref numbers first)
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
    // Load allocation data if available
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const requestData = hologramRequests.find((req: any) => req.refNumber === request.referenceNo);

    if (requestData && requestData.allocations) {
      request.allocations = requestData.allocations;
    } else {
      // Also check hologramApplications
      const hologramApplications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
      const appData = hologramApplications.find((app: any) => app.refNo === request.referenceNo);
      if (appData && appData.allocations) {
        request.allocations = appData.allocations;
      }
    }

    this.selectedRequest = request;
    console.log('Viewing request details:', request);
    console.log('Allocation details:', request.allocations);
  }

  getTotalAllocatedQuantityFromAllocations(allocations?: HologramAllocation[]): number {
    if (!allocations || allocations.length === 0) return 0;
    return allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  }

  closeRequestDetailsModal(): void {
    this.selectedRequest = null;
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
    if (!this.selectedRequest || !this.selectedRequest.originalId) {
      alert('Invalid request data');
      return;
    }

    // Determine action based on allowedActions or default to 'issue' (OIC standard)
    let action = 'issue';
    if (this.selectedRequest.allowedActions && this.selectedRequest.allowedActions.length > 0) {
      if (this.selectedRequest.allowedActions.includes('issue')) action = 'issue';
      else if (this.selectedRequest.allowedActions.includes('approve')) action = 'approve';
      else action = this.selectedRequest.allowedActions[0];
    }

    // Use existing allocations from modal if available, otherwise auto-allocate
    const quantity = this.selectedRequest.requestedQuantity || 0;
    const type = (this.selectedRequest.hologramType || 'LOCAL').toUpperCase();

    let allocations: any[] = [];
    if (this.allocations && this.allocations.length > 0) {
      // Use modal allocations and normalize format for backend
      allocations = this.allocations.map((a: any) => {
        // calculateHologramAllocation returns: {cartoonNumber, fromSerial, toSerial, quantity, remainingInCartoon}
        // Backend expects: {cartoonNumber/cartoon_number, count/quantity, remainingInCartoon}

        // Recalculate remainingInCartoon if needed
        const allocatedQty = a.quantity || a.count || 0;
        const currentRemaining = a.remainingInCartoon;

        // If remainingInCartoon seems wrong, recalculate from inventory
        let finalRemaining = currentRemaining;
        if (currentRemaining === undefined || currentRemaining === null) {
          const roll = this.hologramInventory.find(r => r.cartoonNumber === a.cartoonNumber);
          if (roll) {
            finalRemaining = roll.availableCount - allocatedQty;
          } else {
            finalRemaining = 0;
          }
        }

        return {
          cartoonNumber: a.cartoonNumber,
          cartoon_number: a.cartoonNumber, // Include both formats
          count: allocatedQty,
          quantity: allocatedQty,
          remainingInCartoon: finalRemaining,
          range: a.range || `${a.fromSerial} - ${a.toSerial}`,
          fromSerial: a.fromSerial,
          toSerial: a.toSerial
        };
      });
      console.log('Using modal allocations (normalized):', allocations);
    } else {
      allocations = this.autoAllocateHolograms(quantity, type);
      console.log(`Auto-allocated fresh for ${quantity} ${type}:`, allocations);
    }

    this.hologramService.performAction('request', this.selectedRequest.originalId, action, this.approvalComments, { issued_assets: allocations }).subscribe({
      next: () => {
        alert(`Request approved successfully. Assigned ${allocations.length} rolls.`);
        this.selectedRequest = null;
        this.allocations = []; // Clear allocations
        this.approvalComments = '';
        this.loadHologramRequests();
        this.loadHologramInventory(); // Reload inventory to see updated Available counts
        
        // Notify other components that request data has been updated
        this.hologramService.notifyRequestUpdate();
      },
      error: (err) => {
        console.error('Error approving request:', err);
        alert('Failed to approve request');
      }
    });
  }

  autoAllocateHolograms(quantity: number, type: string): any[] {
    const allocations: any[] = [];
    let remaining = quantity;

    // Ensure inventory is loaded
    if (!this.hologramInventory || this.hologramInventory.length === 0) {
      this.loadHologramInventory();
    }

    // Filter by type and sort by received date (FIFO)
    const availableRolls = this.hologramInventory
      .filter(r => r.type === type && r.availableCount > 0)
      .sort((a, b) => new Date(a.receivedDate || '2024-01-01').getTime() - new Date(b.receivedDate || '2024-01-01').getTime());

    console.log(`🎯 FIFO Allocation: Allocating ${quantity} holograms of type ${type}`);
    console.log(`📦 Available rolls:`, availableRolls.map(r => ({
      cartoonNumber: r.cartoonNumber,
      availableCount: r.availableCount,
      ranges: r.actualAvailableRanges
    })));

    for (const roll of availableRolls) {
      if (remaining <= 0) break;

      console.log(`\n🔍 Processing roll ${roll.cartoonNumber}, remaining needed: ${remaining}`);
      
      // CRITICAL FIX: Implement proper FIFO allocation within ranges
      if (roll.actualAvailableRanges && roll.actualAvailableRanges.length > 0) {
        // Sort ranges by fromSerial to ensure FIFO order
        const sortedRanges = roll.actualAvailableRanges.sort((a, b) => {
          const aStart = parseInt(a.fromSerial.replace(/\D/g, ''));
          const bStart = parseInt(b.fromSerial.replace(/\D/g, ''));
          return aStart - bStart;
        });

        console.log(`📋 Available ranges in FIFO order:`, sortedRanges.map(r => 
          `${r.fromSerial}-${r.toSerial} (${r.count} units)`
        ));

        // Allocate from earliest ranges first (FIFO)
        for (const range of sortedRanges) {
          if (remaining <= 0) break;

          const rangeCount = range.count;
          const take = Math.min(remaining, rangeCount);
          
          // Calculate actual serial range to allocate
          const fromNum = parseInt(range.fromSerial.replace(/\D/g, ''));
          const prefix = range.fromSerial.replace(/\d/g, '');
          const toNum = fromNum + take - 1;
          
          // CRITICAL FIX: Don't add unnecessary zeros - use actual format from database
          const allocatedFromSerial = prefix + String(fromNum);
          const allocatedToSerial = prefix + String(toNum);
          
          console.log(`✅ FIFO Allocation: ${allocatedFromSerial}-${allocatedToSerial} (${take} units) from range ${range.fromSerial}-${range.toSerial}`);

          allocations.push({
            cartoonNumber: roll.cartoonNumber,
            range: `${allocatedFromSerial} - ${allocatedToSerial}`,
            fromSerial: allocatedFromSerial,
            toSerial: allocatedToSerial,
            count: take,
            quantity: take,
            rollId: roll.id,
            remainingInCartoon: roll.availableCount - take
          });

          remaining -= take;
          
          // If we took the entire range, continue to next range
          // If we took partial, we're done with this roll
          if (take < rangeCount) {
            break; // Partial allocation, move to next roll
          }
        }
      } else {
        // Fallback: use the roll's original range
        const take = Math.min(remaining, roll.availableCount);
        const allocatedRange = `${roll.fromSerial} - ${roll.toSerial}`;
        
        console.log(`⚠️ Fallback allocation: ${allocatedRange} (${take} units)`);

        allocations.push({
          cartoonNumber: roll.cartoonNumber,
          range: allocatedRange,
          fromSerial: roll.fromSerial,
          toSerial: roll.toSerial,
          count: take,
          quantity: take,
          rollId: roll.id,
          remainingInCartoon: roll.availableCount - take
        });

        remaining -= take;
      }
    }

    console.log(`🎉 FIFO Allocation complete. Allocated ${quantity - remaining}/${quantity} holograms`);
    console.log(`📊 Final allocations:`, allocations.map(a => 
      `${a.cartoonNumber}: ${a.fromSerial}-${a.toSerial} (${a.count} units)`
    ));

    if (remaining > 0) {
      console.warn(`⚠️ Could not allocate ${remaining} holograms - insufficient inventory`);
    }

    return allocations;
  }

  confirmRejection() {
    if (!this.selectedRequest || !this.selectedRequest.originalId) {
      alert('Invalid request data');
      return;
    }

    this.hologramService.performAction('request', this.selectedRequest.originalId, 'reject', this.rejectionReason).subscribe({
      next: () => {
        alert('Request rejected');
        this.selectedRequest = null;
        this.rejectionReason = '';
        this.loadHologramRequests();
      },
      error: (err) => {
        console.error('Error rejecting request:', err);
        alert('Failed to reject request');
      }
    });
  }

  getRequestCount(status?: string): number {
    if (status) {
      return this.filteredRequests.filter(req => this.mapStatusToCategory(req.status) === status).length;
    }
    return this.filteredRequests.length;
  }

  // Map backend workflow stage names to frontend status categories
  mapStatusToCategory(backendStatus: string): string {
    const status = (backendStatus || '').toUpperCase();
    
    // PENDING REVIEW - Initial submission states
    if (status === 'SUBMITTED' || 
        status === 'PENDING' || 
        status.includes('FORWARDED TO COMMISSIONER')) {
      return 'PENDING';
    }
    
    // UNDER PROCESS - Being reviewed/processed
    if (status === 'APPROVED BY PERMIT SECTION' || 
        status === 'UNDER IT CELL REVIEW' ||
        status === 'IN USE' ||
        status.includes('UNDER PROCESS') ||
        status.includes('UNDER_PROCESS')) {
      return 'UNDER_PROCESS';
    }
    
    // APPROVED/COMPLETED - Final approved states
    if (status === 'APPROVED BY COMMISSIONER' ||
        status === 'APPROVED' ||
        status === 'PRODUCTION COMPLETED' ||
        status === 'COMPLETED' ||
        status === 'PAYMENT COMPLETED' ||
        status === 'CARTOON ASSIGNED' ||
        status === 'ARRIVED') {
      return 'APPROVED';
    }
    
    // REJECTED
    if (status.includes('REJECTED')) {
      return 'REJECTED';
    }
    
    // Default fallback
    return 'PENDING';
  }

  // Get user-friendly status display text
  getDisplayStatus(backendStatus: string): string {
    const category = this.mapStatusToCategory(backendStatus);
    
    switch (category) {
      case 'PENDING':
        return 'Pending Review';
      case 'UNDER_PROCESS':
        return 'Under Process';
      case 'APPROVED':
        return 'Completed';
      case 'REJECTED':
        return 'Rejected';
      default:
        return backendStatus || 'Unknown';
    }
  }

  getTotalRequestedHolograms(): number {
    return this.filteredRequests.reduce((total, request) => total + request.requestedQuantity, 0);
  }

  getAvailableHologramsByType(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): number {
    // Load hologram inventory from localStorage
    const savedRolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');

    // Filter by type and sum available counts
    return savedRolls
      .filter((roll: any) => roll.type === type)
      .reduce((total: number, roll: any) => total + (roll.availableCount || 0), 0);
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

  // Hologram allocation methods
  loadHologramInventory(): void {
    console.log('=== LOADING HOLOGRAM INVENTORY FROM SINGLE SOURCE OF TRUTH (ROLLS DETAILS) ===');

    this.hologramService.getRollsDetails().subscribe({
      next: (rolls: any[]) => {
        console.log(`Fetched ${rolls.length} rolls details`);

        const inventoryItems: HologramInventory[] = [];

        for (const roll of rolls) {
          // Basic validation
          if (!roll.carton_number && !roll.cartonNumber) continue;

          const uniqueId = roll.id || Math.random();
          const availableQty = roll.available !== undefined ? roll.available : (roll.available_count || 0);
          
          // Use the available_range field from backend (already calculated)
          let actualAvailableRanges: any[] = [];
          
          console.log(`🔥 CHECKING ROLL ${roll.carton_number}:`, {
            available_range: roll.available_range,
            from_serial: roll.from_serial,
            to_serial: roll.to_serial,
            available: availableQty
          });
          
          if (roll.available_range && roll.available_range !== 'None' && roll.available_range !== 'N/A') {
            console.log(`📊 Using available_range from backend for ${roll.carton_number}: ${roll.available_range}`);
            
            // Parse the available_range string (e.g., "101-1000" or "101-500, 600-1000")
            const rangeStrings = roll.available_range.split(',').map((s: string) => s.trim());
            
            for (const rangeStr of rangeStrings) {
              if (rangeStr.includes('-')) {
                const [from, to] = rangeStr.split('-');
                const fromNum = parseInt(from);
                const toNum = parseInt(to);
                const count = toNum - fromNum + 1;
                
                console.log(`  🎯 Parsing range "${rangeStr}": from=${from}, to=${to}, count=${count}`);
                
                // Don't pad - use the numbers as-is from the backend
                actualAvailableRanges.push({
                  fromSerial: from,
                  toSerial: to,
                  count
                });
              }
            }
            
            console.log(`✅ Parsed ${actualAvailableRanges.length} ranges from available_range field:`, actualAvailableRanges);
          }
          
          // Fallback: if no ranges parsed and available > 0, use the roll's original range
          if (actualAvailableRanges.length === 0 && availableQty > 0) {
            console.warn(`⚠️ No available_range from backend for ${roll.carton_number || roll.cartonNumber}, using fallback`);
            console.warn(`⚠️ FALLBACK DATA:`, {
              from_serial: roll.from_serial,
              to_serial: roll.to_serial,
              fromSerial: roll.fromSerial,
              toSerial: roll.toSerial
            });
            actualAvailableRanges = [{
              fromSerial: roll.from_serial || roll.fromSerial || '',
              toSerial: roll.to_serial || roll.toSerial || '',
              count: availableQty
            }];
            console.warn(`⚠️ FALLBACK RANGE CREATED:`, actualAvailableRanges);
          }

          const item: HologramInventory = {
            id: uniqueId,
            cartoonNumber: roll.carton_number || roll.cartonNumber,
            type: (roll.type || 'LOCAL').toUpperCase() as any,
            fromSerial: roll.from_serial || roll.fromSerial || '',
            toSerial: roll.to_serial || roll.toSerial || '',
            totalCount: roll.total_count || roll.totalCount || 0,
            availableCount: availableQty,
            usedCount: roll.used || roll.usedCount || 0,
            damagedCount: roll.damaged || roll.damagedCount || 0,
            status: (roll.status || 'AVAILABLE').toUpperCase() as any,
            receivedDate: roll.received_date || roll.receivedDate || new Date().toISOString(),
            actualAvailableRanges: actualAvailableRanges
          };
          
          console.log(`📦 Roll ${item.cartoonNumber}: receivedDate=${item.receivedDate}, available=${item.availableCount}, ranges=${actualAvailableRanges.length}`);
          
          inventoryItems.push(item);
        }

        console.log(`✅ Built ${inventoryItems.length} inventory items from DB`);
        
        // CRITICAL: Sort inventory by receivedDate for FIFO (oldest first)
        inventoryItems.sort((a, b) => {
          const dateA = new Date(a.receivedDate || '1970-01-01').getTime();
          const dateB = new Date(b.receivedDate || '1970-01-01').getTime();
          return dateA - dateB;
        });
        
        console.log('📊 Inventory sorted by receivedDate (FIFO):', inventoryItems.map(i => ({
          cartoonNumber: i.cartoonNumber,
          receivedDate: i.receivedDate,
          availableCount: i.availableCount,
          availableRange: i.actualAvailableRanges
        })));

        // Populate component state
        this.hologramInventory = inventoryItems;
        this.filteredInventory = [...this.hologramInventory];

        // Debug
        console.log('Final Inventory State:', this.hologramInventory);

        // Update summaries
        this.updateInventorySummary();
      },
      error: (err) => {
        console.error('❌ Error loading rolls:', err);
      }
    });
  }

  // Async wrapper for loadHologramInventory that returns Observable
  loadHologramInventoryAsync(): Observable<void> {
    return new Observable(observer => {
      forkJoin({
        rolls: this.hologramService.getRollsDetails(),
        requests: this.hologramService.getRequests()
      }).subscribe({
        next: ({ rolls, requests }) => {
          const inventoryItems: HologramInventory[] = [];
          
          for (const roll of rolls) {
            if (!roll.carton_number && !roll.cartonNumber) continue;
            
            const uniqueId = roll.id || Math.random();
            const availableQty = roll.available !== undefined ? roll.available : (roll.available_count || 0);
            
            // Use the available_range field from backend (already calculated)
            let actualAvailableRanges: any[] = [];
            
            // Handle both snake_case and camelCase
            const availableRange = roll.available_range || roll.availableRange;
            const fromSerial = roll.from_serial || roll.fromSerial;
            const toSerial = roll.to_serial || roll.toSerial;
            const cartonNumber = roll.carton_number || roll.cartonNumber;
            
            console.log(`🔥 ASYNC CHECKING ROLL ${cartonNumber}:`, {
              available_range: roll.available_range,
              availableRange: roll.availableRange,
              from_serial: roll.from_serial,
              fromSerial: roll.fromSerial,
              to_serial: roll.to_serial,
              toSerial: roll.toSerial,
              available: availableQty,
              rawRoll: roll
            });
            
            if (availableRange && availableRange !== 'None' && availableRange !== 'N/A') {
              console.log(`📊 Using available_range from backend for ${cartonNumber}: ${availableRange}`);
              
              // Parse the available_range string (e.g., "101-1000" or "101-500, 600-1000")
              const rangeStrings = availableRange.split(',').map((s: string) => s.trim());
              
              for (const rangeStr of rangeStrings) {
                if (rangeStr.includes('-')) {
                  const [from, to] = rangeStr.split('-');
                  const fromNum = parseInt(from);
                  const toNum = parseInt(to);
                  const count = toNum - fromNum + 1;
                  
                  console.log(`  🎯 ASYNC Parsing range "${rangeStr}": from=${from}, to=${to}, count=${count}`);
                  
                  // Don't pad - use the numbers as-is from the backend
                  actualAvailableRanges.push({
                    fromSerial: from,
                    toSerial: to,
                    count
                  });
                }
              }
              
              console.log(`✅ ASYNC Parsed ${actualAvailableRanges.length} ranges from available_range field:`, actualAvailableRanges);
            }
            
            // Fallback: if no ranges parsed and available > 0, use the roll's original range
            if (actualAvailableRanges.length === 0 && availableQty > 0) {
              console.warn(`⚠️ No available_range from backend for ${cartonNumber}, using fallback`);
              actualAvailableRanges = [{
                fromSerial: fromSerial || '',
                toSerial: toSerial || '',
                count: availableQty
              }];
              console.warn(`⚠️ FALLBACK RANGE CREATED:`, actualAvailableRanges);
            }
            
            const item: HologramInventory = {
              id: uniqueId,
              cartoonNumber: cartonNumber,
              type: (roll.type || 'LOCAL').toUpperCase() as any,
              fromSerial: fromSerial || '',
              toSerial: toSerial || '',
              totalCount: roll.total_count || roll.totalCount || 0,
              availableCount: availableQty,
              usedCount: roll.used || roll.usedCount || 0,
              damagedCount: roll.damaged || roll.damagedCount || 0,
              status: (roll.status || 'AVAILABLE').toUpperCase() as any,
              receivedDate: roll.received_date || roll.receivedDate || new Date().toISOString(),
              actualAvailableRanges: actualAvailableRanges
            };
            
            inventoryItems.push(item);
          }
          
          // CRITICAL: Sort inventory by receivedDate for FIFO (oldest first)
          inventoryItems.sort((a, b) => {
            const dateA = new Date(a.receivedDate || '1970-01-01').getTime();
            const dateB = new Date(b.receivedDate || '1970-01-01').getTime();
            return dateA - dateB;
          });
          
          this.hologramInventory = inventoryItems;
          this.filteredInventory = [...this.hologramInventory];
          this.updateInventorySummary();
          observer.next();
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  updateInventorySummary(): void {
    // Simply refresh the filtered list, can be extended for filtering logic later
    this.filteredInventory = [...this.hologramInventory];
    // Sort by received date default (FIFO - oldest first)
    this.filteredInventory.sort((a, b) => new Date(a.receivedDate || '1970-01-01').getTime() - new Date(b.receivedDate || '1970-01-01').getTime());
  }





  /**
   * Calculate ALL actual available ranges for a cartoon, excluding IN_PROGRESS issued holograms
   * Returns ALL available ranges (e.g., [{000011-000029}, {000040-000500}]) and their counts
   * This handles non-contiguous ranges properly
   */
  calculateActualAvailableRanges(
    cartoonNumber: string,
    hologramType: string,
    fromSerial: string,
    toSerial: string
  ): Array<{ fromSerial: string; toSerial: string; count: number }> {
    console.log(`🔍 calculateActualAvailableRanges for ${cartoonNumber}:`, { fromSerial, toSerial });

    if (!fromSerial || !toSerial) return [];

    // Extract serial numbers
    const prefix = fromSerial.replace(/\d+$/, '');
    const rollStart = parseInt(fromSerial.match(/\d+$/)?.[0] || '0');
    const rollEnd = parseInt(toSerial.match(/\d+$/)?.[0] || '0');

    console.log(`  Roll range: ${rollStart} to ${rollEnd} (${rollEnd - rollStart + 1} total)`);

    // Get IN_PROGRESS issued holograms for this cartoon
    const issuedData = JSON.parse(localStorage.getItem('hologramOverviewIssued') || '[]');
    const inProgressIssued = issuedData.filter((issued: any) =>
      issued.status === 'IN_PROGRESS' &&
      issued.cartoonNumber === cartoonNumber &&
      (issued.hologramType === hologramType || !issued.hologramType)
    );

    console.log(`  Found ${inProgressIssued.length} IN_PROGRESS issued entries`);

    // Create a Set of all IN_PROGRESS serial numbers
    const inProgressSerials = new Set<number>();
    inProgressIssued.forEach((issued: any) => {
      if (issued.fromSerial && issued.toSerial) {
        const start = parseInt(issued.fromSerial.match(/\d+$/)?.[0] || '0');
        const end = parseInt(issued.toSerial.match(/\d+$/)?.[0] || '0');
        console.log(`    IN_PROGRESS: ${start}-${end} (${end - start + 1} units)`);
        for (let i = start; i <= end; i++) {
          inProgressSerials.add(i);
        }
      }
    });

    // Get USED and DAMAGED ranges from usage history
    const serialData = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');
    const serialRoll = serialData.find((roll: any) =>
      (roll.rollNumber === cartoonNumber || roll.cartoonNumber === cartoonNumber) &&
      roll.hologramType === hologramType
    );

    console.log(`  Found serialRoll:`, serialRoll ? 'YES' : 'NO');

    const usedSerials = new Set<number>();
    if (serialRoll && serialRoll.usageHistory) {
      console.log(`  Processing ${serialRoll.usageHistory.length} usage history entries`);
      serialRoll.usageHistory.forEach((historyEntry: any) => {
        if (historyEntry.cartoonNumber && historyEntry.cartoonNumber !== cartoonNumber) return;

        let fromSerial = '';
        let toSerial = '';

        if (historyEntry.type === 'ISSUED') {
          fromSerial = historyEntry.issuedFromSerial || historyEntry.fromSerial || '';
          toSerial = historyEntry.issuedToSerial || historyEntry.toSerial || '';
        } else if (historyEntry.type === 'WASTAGE' || historyEntry.type === 'DAMAGED') {
          fromSerial = historyEntry.wastageFromSerial || historyEntry.fromSerial || '';
          toSerial = historyEntry.wastageToSerial || historyEntry.toSerial || '';
        }

        if (fromSerial && toSerial) {
          const start = parseInt(fromSerial.match(/\d+$/)?.[0] || '0');
          const end = parseInt(toSerial.match(/\d+$/)?.[0] || '0');
          console.log(`    ${historyEntry.type}: ${start}-${end} (${end - start + 1} units)`);
          for (let i = start; i <= end; i++) {
            usedSerials.add(i);
          }
        }
      });
    }

    console.log(`  Total IN_PROGRESS serials: ${inProgressSerials.size}`);
    console.log(`  Total USED serials: ${usedSerials.size}`);

    // Find ALL available ranges (handles non-contiguous ranges)
    const availableRanges: Array<{ fromSerial: string; toSerial: string; count: number }> = [];
    let currentRangeStart: number | null = null;
    let currentRangeEnd: number | null = null;

    for (let i = rollStart; i <= rollEnd; i++) {
      const isUsed = usedSerials.has(i) || inProgressSerials.has(i);

      if (!isUsed) {
        // Start a new range or extend current range
        if (currentRangeStart === null) {
          currentRangeStart = i;
        }
        currentRangeEnd = i;
      } else {
        // End of current range - save it if valid
        if (currentRangeStart !== null && currentRangeEnd !== null) {
          availableRanges.push({
            fromSerial: prefix + String(currentRangeStart),
            toSerial: prefix + String(currentRangeEnd),
            count: currentRangeEnd - currentRangeStart + 1
          });
          currentRangeStart = null;
          currentRangeEnd = null;
        }
      }
    }

    // Don't forget the last range if it extends to the end
    if (currentRangeStart !== null && currentRangeEnd !== null) {
      availableRanges.push({
        fromSerial: prefix + String(currentRangeStart),
        toSerial: prefix + String(currentRangeEnd),
        count: currentRangeEnd - currentRangeStart + 1
      });
    }

    console.log(`  ✅ Available ranges:`, availableRanges.map(r => `${r.fromSerial}-${r.toSerial} (${r.count})`).join(', '));

    return availableRanges;
  }

  /**
   * Calculate actual available range for a cartoon, excluding IN_PROGRESS issued holograms
   * Returns the FIRST available range (e.g., 000700-000999) and count
   * @deprecated Use calculateActualAvailableRanges() to get ALL ranges
   */
  calculateActualAvailableRange(
    cartoonNumber: string,
    hologramType: string,
    fromSerial: string,
    toSerial: string
  ): { fromSerial: string; toSerial: string; count: number } | null {
    const ranges = this.calculateActualAvailableRanges(cartoonNumber, hologramType, fromSerial, toSerial);
    return ranges.length > 0 ? ranges[0] : null;
  }

  showHologramAllocationModal(request: HologramRequest): void {
    console.log('=== SHOW HOLOGRAM ALLOCATION MODAL ===');
    this.selectedRequest = request;
    this.approvedQuantity = request.requestedQuantity;

    // WAIT for inventory to load before showing modal
    this.loadHologramInventoryAsync().subscribe({
      next: () => {
        console.log('Inventory loaded, count:', this.hologramInventory.length);
        this.allocationResult = this.calculateHologramAllocation(request.requestedQuantity, request.hologramType);
        this.allocations = this.allocationResult.allocations || [];
        console.log('Allocation Result:', this.allocationResult);

        // NOW show the modal (data is ready)
        this.showAllocationModal = true;
      },
      error: (err) => {
        console.error('Failed to load inventory:', err);
        alert('Failed to load inventory data. Please try again.');
      }
    });
  }

  calculateHologramAllocation(requestedQuantity: number, hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE'): AllocationResult {
    console.log('=== CALCULATING HOLOGRAM ALLOCATION ===');
    console.log('Requested Quantity:', requestedQuantity);
    console.log('Requested Type:', hologramType);

    // Filter available inventory by type and status (IN_USE is also allowed if it has available count)
    const availableInventory = this.hologramInventory.filter(item => {
      const typeMatch = item.type === hologramType;
      const statusMatch = item.status === 'AVAILABLE' || item.status === 'IN_USE'; // Allow IN_USE if it has available
      const hasAvailable = item.availableCount > 0;

      console.log(`Checking ${item.cartoonNumber}:`, {
        type: item.type,
        typeMatch,
        status: item.status,
        statusMatch,
        availableCount: item.availableCount,
        actualAvailableRanges: item.actualAvailableRanges,
        rangesCount: item.actualAvailableRanges?.length || 0,
        hasAvailable,
        receivedDate: item.receivedDate,
        passes: typeMatch && statusMatch && hasAvailable
      });

      return typeMatch && statusMatch && hasAvailable;
    });
    
    // CRITICAL: Sort by receivedDate for FIFO (First In, First Out) - oldest first
    availableInventory.sort((a, b) => {
      const dateA = new Date(a.receivedDate || '1970-01-01').getTime();
      const dateB = new Date(b.receivedDate || '1970-01-01').getTime();
      return dateA - dateB; // Ascending order - oldest first
    });

    console.log('Available Inventory After Filter (FIFO sorted):', availableInventory.map(i => ({
      cartoonNumber: i.cartoonNumber,
      receivedDate: i.receivedDate,
      availableCount: i.availableCount
    })));

    const totalAvailable = availableInventory.reduce((sum, item) => sum + item.availableCount, 0);

    console.log('Total Available:', totalAvailable);

    if (totalAvailable < requestedQuantity) {
      console.log('Insufficient inventory!');
      return {
        canAllocate: false,
        totalAvailable,
        allocations: [],
        message: `Insufficient inventory. Available: ${totalAvailable}, Requested: ${requestedQuantity}`
      };
    }

    // FIFO allocation - use oldest cartoons first
    // Handle multiple ranges per cartoon properly
    const allocations: HologramAllocation[] = [];
    let remainingQuantity = requestedQuantity;

    // Track how much has been allocated from each cartoon in this allocation
    const cartoonAllocations = new Map<string, number>();
    // Track which ranges have been used from each cartoon
    const cartoonRangeUsage = new Map<string, number>(); // Map<cartoonNumber, usedCount>

    for (const item of availableInventory) {
      if (remainingQuantity <= 0) break;

      // Get how much has already been allocated from this cartoon in this allocation
      const alreadyAllocated = cartoonAllocations.get(item.cartoonNumber) || 0;
      const availableFromThisCartoon = item.availableCount - alreadyAllocated;

      if (availableFromThisCartoon <= 0) continue; // Skip if no more available from this cartoon

      // Get all available ranges for this cartoon
      const availableRanges = item.actualAvailableRanges || [];
      
      console.log(`📦 Processing ${item.cartoonNumber}:`, {
        availableCount: item.availableCount,
        rangesCount: availableRanges.length,
        ranges: availableRanges,
        fromSerial: item.fromSerial,
        toSerial: item.toSerial
      });

      if (availableRanges.length === 0) {
        console.warn(`⚠️ No available ranges for ${item.cartoonNumber}, skipping...`);
        continue; // Skip this cartoon if no ranges available
      }

      // CRITICAL FIX: Sort ranges by fromSerial to ensure FIFO order
      const sortedRanges = availableRanges.sort((a, b) => {
        const aStart = parseInt(a.fromSerial.replace(/\D/g, ''));
        const bStart = parseInt(b.fromSerial.replace(/\D/g, ''));
        return aStart - bStart;
      });

      console.log(`📋 Available ranges in FIFO order:`, sortedRanges.map(r => 
        `${r.fromSerial}-${r.toSerial} (${r.count} units)`
      ));

      // Allocate from earliest ranges first (FIFO)
      let usedFromThisCartoon = 0;

      for (const range of sortedRanges) {
        if (remainingQuantity <= 0) break;

        console.log(`  🔍 Checking range:`, range);

        // Check how much has been used from this specific range
        const rangeKey = `${item.cartoonNumber}_${range.fromSerial}_${range.toSerial}`;
        const usedFromRange = cartoonRangeUsage.get(rangeKey) || 0;
        const availableInRange = range.count - usedFromRange;

        console.log(`    Available in range: ${availableInRange}, Used from range: ${usedFromRange}`);

        if (availableInRange <= 0) continue; // This range is fully used

        // Allocate from this range using FIFO
        const quantityFromRange = Math.min(remainingQuantity, availableInRange);

        // CRITICAL FIX: Implement proper FIFO allocation within the range
        const rangeFromNum = parseInt(range.fromSerial.replace(/\D/g, ''));
        const prefix = range.fromSerial.replace(/\d/g, '');
        
        // Start from the beginning of the range (FIFO)
        const allocatedFromNum = rangeFromNum + usedFromRange;
        const allocatedToNum = allocatedFromNum + quantityFromRange - 1;
        
        // CRITICAL FIX: Don't add unnecessary zeros - use actual format from database
        const startSerial = prefix + String(allocatedFromNum);
        const endSerial = prefix + String(allocatedToNum);

        console.log(`    ✅ FIFO Allocation: ${startSerial} - ${endSerial} (${quantityFromRange} units) from range ${range.fromSerial}-${range.toSerial}`);

        allocations.push({
          cartoonNumber: item.cartoonNumber,
          fromSerial: startSerial,
          toSerial: endSerial,
          quantity: quantityFromRange,
          remainingInCartoon: item.availableCount - alreadyAllocated - quantityFromRange // What's left after this allocation
        });

        // Track usage
        cartoonRangeUsage.set(rangeKey, usedFromRange + quantityFromRange);
        usedFromThisCartoon += quantityFromRange;
        remainingQuantity -= quantityFromRange;
        
        // If we took the entire range, continue to next range
        // If we took partial, we're done with this cartoon for now
        if (quantityFromRange < availableInRange) {
          break; // Partial allocation, move to next cartoon
        }
      }

      // Update total allocation from this cartoon
      cartoonAllocations.set(item.cartoonNumber, alreadyAllocated + usedFromThisCartoon);
    }

    console.log('Final Allocations:', allocations);
    console.log('=== END CALCULATING HOLOGRAM ALLOCATION ===');

    return {
      canAllocate: true,
      totalAvailable,
      allocations,
      message: `Successfully allocated ${requestedQuantity} holograms from ${allocations.length} cartoon(s)`
    };
  }

  getNextAvailableSerial(item: HologramInventory, offset: number = 0): string {
    // If we have actual available range, use it
    if (item.actualAvailableRange) {
      const rangeStart = parseInt(item.actualAvailableRange.fromSerial.match(/\d+$/)?.[0] || '0');
      const prefix = item.actualAvailableRange.fromSerial.replace(/\d+$/, '');
      return prefix + String(rangeStart + offset);
    }

    if (item.nextAvailableSerial) {
      // If offset is provided, calculate from nextAvailableSerial
      if (offset > 0) {
        const prefix = item.nextAvailableSerial.replace(/\d+$/, '');
        const startNumber = parseInt(item.nextAvailableSerial.match(/\d+$/)?.[0] || '0');
        return prefix + String(startNumber + offset);
      }
      return item.nextAvailableSerial;
    }

    // Calculate next available serial based on used count
    const serialPrefix = item.fromSerial.replace(/\d+$/, '');
    const startNumber = parseInt(item.fromSerial.match(/\d+$/)?.[0] || '0');
    const nextNumber = startNumber + item.usedCount + offset;

    return serialPrefix + nextNumber.toString();
  }

  calculateEndSerial(startSerial: string, quantity: number): string {
    const serialPrefix = startSerial.replace(/\d+$/, '');
    const startNumber = parseInt(startSerial.match(/\d+$/)?.[0] || '0');
    const endNumber = startNumber + quantity;

    return serialPrefix + endNumber.toString();
  }

  confirmHologramAllocation(): void {
    if (!this.selectedRequest || !this.allocationResult) {
      return;
    }

    // Check if there are allocations, if not create a test allocation for daily register
    if (!this.allocationResult.allocations || this.allocationResult.allocations.length === 0) {
      // Create a test allocation for daily register entry
      this.allocationResult.allocations = [{
        cartoonNumber: 'TEST_CTN001',
        fromSerial: 'HG1001',
        toSerial: 'HG1100',
        quantity: this.selectedRequest.requestedQuantity || 100,
        remainingInCartoon: 0
      }];
      console.log('Created test allocation for daily register:', this.allocationResult.allocations);
    }

    // Update inventory
    this.updateInventoryAfterAllocation();

    // Create issued hologram entries
    this.createIssuedHologramEntries();

    // Update request status to IN_USE
    this.selectedRequest.status = 'IN_USE';
    this.selectedRequest.officerComments = this.approvalComments || 'Approved with hologram allocation';
    this.selectedRequest.approvedQuantity = this.approvedQuantity || this.selectedRequest.requestedQuantity;
    this.selectedRequest.approvalDate = new Date().toISOString().split('T')[0];

    // Save allocation details for future reference
    this.selectedRequest.allocations = this.allocationResult.allocations.map(allocation => ({
      cartoonNumber: allocation.cartoonNumber,
      fromSerial: allocation.fromSerial,
      toSerial: allocation.toSerial,
      quantity: allocation.quantity,
      remainingInCartoon: allocation.remainingInCartoon
    }));

    console.log('Request status set to APPROVED');
    console.log('Allocation details saved:', this.selectedRequest.allocations);

    // Verify we have the original ID for backend
    if (!this.selectedRequest.originalId) {
      console.warn('No originalId found for backend update');
    } else {
      // CALL REAL BACKEND API
      // Use 'issue' as default for OIC, or fallback to dynamic action
      let action = 'issue';
      const actions = this.selectedRequest.allowedActions || [];
      if (actions.includes('issue')) action = 'issue';
      else if (actions.includes('approve')) action = 'approve';

      console.log(`Performing backend action: ${action} on ID: ${this.selectedRequest.originalId}`);

      // Normalize allocations for backend (ensure all formats are included)
      const normalizedAllocations = this.allocationResult.allocations.map((a: any) => {
        console.log('🔍 BEFORE normalization - Allocation object:', a);
        console.log('🔍 remainingInCartoon value:', a.remainingInCartoon, 'Type:', typeof a.remainingInCartoon);

        return {
          cartoonNumber: a.cartoonNumber,
          cartoon_number: a.cartoonNumber, // Both formats for compatibility
          count: a.quantity,
          quantity: a.quantity,
          remainingInCartoon: a.remainingInCartoon,
          range: `${a.fromSerial} - ${a.toSerial}`,
          fromSerial: a.fromSerial,
          toSerial: a.toSerial
        };
      });

      console.log('🚀 Sending normalized allocations to backend:', normalizedAllocations);
      console.log('🚀 Detailed check - First allocation remainingInCartoon:', normalizedAllocations[0]?.remainingInCartoon);

      this.hologramService.performAction('request', this.selectedRequest.originalId, action, this.approvalComments, { issued_assets: normalizedAllocations }).subscribe({
        next: (response) => {
          console.log('Backend updated successfully:', response);
          // Reload inventory to show updated available counts
          this.loadHologramInventory();
          // CRITICAL FIX: Notify Daily Register component to reload data
          // This ensures text boxes appear immediately without page refresh
          this.hologramService.notifyRequestUpdate();
          console.log('📢 Notified Daily Register to reload after allocation');
          // We can rely on loadHologramRequests() to refresh the UI
        },
        error: (err) => {
          console.error('Backend update failed:', err);
          // Optional: Show error to user, though we already showed success for localStorage
          // alert('Warning: Backend update failed. Please check connection.');
        }
      });
    }

    alert(`Request ${this.selectedRequest.referenceNo} has been APPROVED!`);

    this.closeAllocationModal();

    // Reload data to reflect changes immediately
    setTimeout(() => {
      this.loadHologramRequests();
    }, 500); // Small delay to ensure backend transaction completes
  }

  updateInventoryAfterAllocation(): void {
    if (!this.allocationResult) return;

    console.log('=== UPDATING INVENTORY AFTER ALLOCATION ===');

    // Load all three data sources
    const rollsData = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
    const availableData = JSON.parse(localStorage.getItem('hologramOverviewAvailable') || '[]');
    const serialData = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');

    for (const allocation of this.allocationResult.allocations) {
      console.log(`Processing allocation for ${allocation.cartoonNumber}:`, allocation);

      // Update Rolls Tab Data
      const rollIndex = rollsData.findIndex((roll: any) =>
        roll.cartoonNumber === allocation.cartoonNumber
      );

      if (rollIndex !== -1) {
        console.log(`BEFORE update - Roll ${allocation.cartoonNumber}:`, {
          availableCount: rollsData[rollIndex].availableCount,
          usedCount: rollsData[rollIndex].usedCount,
          status: rollsData[rollIndex].status
        });

        // Update counts
        // Only subtract from available, DON'T add to usedCount yet
        // usedCount will be updated when Manufacturing Register is approved
        rollsData[rollIndex].availableCount -= allocation.quantity;
        // rollsData[rollIndex].usedCount = (rollsData[rollIndex].usedCount || 0) + allocation.quantity; // REMOVED - will be updated by Manufacturing Register
        rollsData[rollIndex].nextAvailableSerial = this.calculateEndSerial(allocation.toSerial, 1);

        console.log(`AFTER count update - Roll ${allocation.cartoonNumber}:`, {
          availableCount: rollsData[rollIndex].availableCount,
          allocated: allocation.quantity,
          note: 'usedCount will be updated when Manufacturing Register is approved'
        });

        // Update status - Set to IN_USE when holograms have been allocated
        // usedCount will be updated later by Manufacturing Register
        rollsData[rollIndex].status = 'IN_USE';
        console.log(`Status set to IN_USE (allocated = ${allocation.quantity}, availableCount = ${rollsData[rollIndex].availableCount})`);

        console.log(`FINAL - Roll ${allocation.cartoonNumber}:`, rollsData[rollIndex]);
      }

      // Update Available Hologram Data Tab
      const availableIndex = availableData.findIndex((item: any) =>
        item.cartoonNumber === allocation.cartoonNumber
      );

      if (availableIndex !== -1) {
        console.log(`BEFORE update - Available ${allocation.cartoonNumber}:`, {
          availableCount: availableData[availableIndex].availableCount,
          status: availableData[availableIndex].status
        });

        // Update counts
        availableData[availableIndex].availableCount -= allocation.quantity;

        // Get the original total count from the rolls data to calculate percentage correctly
        const correspondingRoll = rollsData.find((roll: any) =>
          roll.cartoonNumber === allocation.cartoonNumber
        );

        // Calculate percentage based on original total count from roll
        if (correspondingRoll && correspondingRoll.totalCount > 0) {
          availableData[availableIndex].percentage = Math.round((availableData[availableIndex].availableCount / correspondingRoll.totalCount) * 100);
        } else {
          // Fallback: if no roll found, percentage is 100% if we have any available, 0% otherwise
          availableData[availableIndex].percentage = availableData[availableIndex].availableCount > 0 ? 100 : 0;
        }

        console.log(`AFTER count update - Available ${allocation.cartoonNumber}:`, {
          availableCount: availableData[availableIndex].availableCount,
          percentage: availableData[availableIndex].percentage,
          hasBeenAllocated: true
        });

        // Update status - Always set to IN_USE when holograms have been allocated
        // Status will only be COMPLETED when explicitly marked by the system later
        availableData[availableIndex].status = 'IN_USE';
        console.log(`Status set to IN_USE (availableCount = ${availableData[availableIndex].availableCount})`);


        console.log(`FINAL - Available ${allocation.cartoonNumber}:`, availableData[availableIndex]);
      }

      // Update Serial Numbers Data Tab
      const serialIndex = serialData.findIndex((roll: any) =>
        (roll.rollNumber === allocation.cartoonNumber || roll.cartoonNumber === allocation.cartoonNumber)
      );

      if (serialIndex !== -1) {
        console.log(`BEFORE update - Serial ${allocation.cartoonNumber}:`, {
          availableCount: serialData[serialIndex].availableCount,
          usedCount: serialData[serialIndex].usedCount,
          status: serialData[serialIndex].status
        });

        // Update counts
        // Only subtract from available, DON'T add to usedCount yet
        // usedCount will be updated when Manufacturing Register is approved
        serialData[serialIndex].availableCount -= allocation.quantity;
        // serialData[serialIndex].usedCount = (serialData[serialIndex].usedCount || 0) + allocation.quantity; // REMOVED
        serialData[serialIndex].nextAvailableSerial = this.calculateEndSerial(allocation.toSerial, 1);

        console.log(`AFTER count update - Serial ${allocation.cartoonNumber}:`, {
          availableCount: serialData[serialIndex].availableCount,
          allocated: allocation.quantity,
          note: 'usedCount will be updated when Manufacturing Register is approved'
        });

        // Update status - Set to IN_USE when holograms have been allocated
        serialData[serialIndex].status = 'IN_USE';
        console.log(`Status set to IN_USE (allocated = ${allocation.quantity}, availableCount = ${serialData[serialIndex].availableCount})`);

        console.log(`FINAL - Serial ${allocation.cartoonNumber}:`, serialData[serialIndex]);
      }
    }

    // Save all updated data back to localStorage
    localStorage.setItem('hologramOverviewRolls', JSON.stringify(rollsData));
    localStorage.setItem('hologramOverviewAvailable', JSON.stringify(availableData));
    localStorage.setItem('hologramOverviewSerialData', JSON.stringify(serialData));

    console.log('=== INVENTORY UPDATE COMPLETE ===');
  }

  createIssuedHologramEntries(): void {
    if (!this.selectedRequest || !this.allocationResult) return;

    console.log('=== CREATING ISSUED HOLOGRAM ENTRIES ===');

    const issuedEntries = this.allocationResult.allocations.map((allocation, index) => ({
      id: Date.now() + index,
      referenceNo: this.selectedRequest!.referenceNo, // Use reference number instead of batch number
      brandName: this.selectedRequest!.brandDetails.brandName,
      fromSerial: allocation.fromSerial,
      toSerial: allocation.toSerial,
      quantity: allocation.quantity,
      issueDate: new Date().toISOString(),
      status: 'IN_PROGRESS', // ← Status is IN_PROGRESS
      officer: this.currentOfficer.name,
      requestReference: this.selectedRequest!.referenceNo,
      hologramType: this.selectedRequest!.hologramType,
      cartoonNumber: allocation.cartoonNumber
    }));

    // Save to CORRECT localStorage key for hologram overview
    const existingIssued = JSON.parse(localStorage.getItem('hologramOverviewIssued') || '[]');
    const updatedIssued = [...existingIssued, ...issuedEntries];
    localStorage.setItem('hologramOverviewIssued', JSON.stringify(updatedIssued));

    console.log('Created issued hologram entries:', issuedEntries);
    console.log('Saved to hologramOverviewIssued');

    // NOTE: Do NOT create history entries here!
    // History entries will be created ONLY when officer approves from Manufacturing Register
    // by the moveIssuedHologramToHistory() method

    // Create auto-populated daily register entries
    this.createDailyRegisterEntries();

    console.log('=== ISSUED HOLOGRAM ENTRIES COMPLETE ===');
  }

  /**
   * DEPRECATED: This method is NO LONGER USED
   * History entries should ONLY be created when officer approves from Manufacturing Register
   * NOT when officer approves the hologram request
   */
  createIssuedHistoryEntries(issuedEntries: any[]): void {
    console.log('=== createIssuedHistoryEntries: DEPRECATED - This method should not be called ===');
    console.log('History entries will be created by moveIssuedHologramToHistory() in manufacturing register');
    // This method is intentionally empty
    // History entries are created ONLY when officer approves from Manufacturing Register
  }

  createDailyRegisterEntries(): void {
    console.log('=== CREATING DAILY REGISTER ENTRIES ===');
    console.log('selectedRequest:', this.selectedRequest);
    console.log('allocationResult:', this.allocationResult);

    if (!this.selectedRequest || !this.allocationResult) {
      console.error('Missing selectedRequest or allocationResult');
      return;
    }

    if (!this.allocationResult.allocations || this.allocationResult.allocations.length === 0) {
      console.error('No allocations found');
      return;
    }

    // Create ONE entry for this request with ALL allocations
    const totalQuantity = this.allocationResult.allocations.reduce((sum, alloc) => sum + alloc.quantity, 0);

    const entry = {
      id: `AUTO_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      hologramType: this.selectedRequest!.hologramType,

      // Store ALL allocations in the entry
      issuedEntries: this.allocationResult.allocations.map((allocation, index) => ({
        id: `ISSUED_${Date.now()}_${index}`,
        fromSerial: allocation.fromSerial,
        toSerial: allocation.toSerial,
        quantity: allocation.quantity,
        cartoonNumber: allocation.cartoonNumber
      })),

      wastageEntries: [],

      // Total quantities
      issuedQuantity: 0, // User will fill this in
      utilizedQuantity: totalQuantity, // Total allocated quantity
      wastageQuantity: 0,
      leftOverQuantity: totalQuantity, // Initially all is leftover
      damageReason: '',
      isFixed: false, // User can edit

      // Metadata
      referenceNo: this.selectedRequest!.referenceNo,
      brandDetails: this.selectedRequest!.brandDetails,
      bottleSize: `${this.selectedRequest!.brandDetails.sizeMl}ml`,
      submissionDate: this.selectedRequest!.submissionDate,
      usageDate: new Date().toISOString().split('T')[0],
      approvalDate: new Date().toISOString().split('T')[0],
      officerName: this.currentOfficer.name,
      autoGenerated: true,

      // Store allocated ranges for reference
      allocatedRanges: this.allocationResult.allocations.map(allocation => ({
        cartoonNumber: allocation.cartoonNumber,
        fromSerial: allocation.fromSerial,
        toSerial: allocation.toSerial,
        quantity: allocation.quantity
      }))
    };

    console.log('Created ONE daily entry with multiple allocations:', entry);
    console.log(`  - Total allocations: ${this.allocationResult.allocations.length}`);
    console.log(`  - Total quantity: ${totalQuantity}`);

    // Save to localStorage for daily register
    const existingDailyEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
    const updatedDailyEntries = [...existingDailyEntries, entry];

    console.log('Existing entries:', existingDailyEntries.length);
    console.log('Total entries after update:', updatedDailyEntries.length);

    localStorage.setItem('approvedHologramEntries', JSON.stringify(updatedDailyEntries));

    console.log('Successfully saved to localStorage under key: approvedHologramEntries');
    console.log('=== END DAILY REGISTER ENTRIES CREATION ===');
  }

  updateRequestInStorage(): void {
    if (!this.selectedRequest) return;

    // Update in hologramRequests
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const requestIndex = hologramRequests.findIndex((req: any) =>
      req.refNumber === this.selectedRequest!.referenceNo
    );

    if (requestIndex !== -1) {
      hologramRequests[requestIndex].status = this.selectedRequest.status; // Use the actual status from selectedRequest
      hologramRequests[requestIndex].officerComments = this.selectedRequest.officerComments;
      hologramRequests[requestIndex].approvedQuantity = this.selectedRequest.approvedQuantity;
      hologramRequests[requestIndex].approvalDate = this.selectedRequest.approvalDate;
      // Save allocation details
      if (this.selectedRequest.allocations) {
        hologramRequests[requestIndex].allocations = this.selectedRequest.allocations;
      }
      localStorage.setItem('hologramRequests', JSON.stringify(hologramRequests));
      console.log('Updated hologramRequests in localStorage:', hologramRequests[requestIndex]);
    }

    // Update in hologramApplications if exists
    const hologramApplications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const appIndex = hologramApplications.findIndex((app: any) =>
      app.refNo === this.selectedRequest!.referenceNo
    );

    if (appIndex !== -1) {
      hologramApplications[appIndex].status = this.selectedRequest.status; // Use the actual status from selectedRequest
      hologramApplications[appIndex].officerComments = this.selectedRequest.officerComments;
      hologramApplications[appIndex].approvedQuantity = this.selectedRequest.approvedQuantity;
      hologramApplications[appIndex].approvalDate = this.selectedRequest.approvalDate;
      // Save allocation details
      if (this.selectedRequest.allocations) {
        hologramApplications[appIndex].allocations = this.selectedRequest.allocations;
      }
      localStorage.setItem('hologramApplications', JSON.stringify(hologramApplications));
      console.log('Updated hologramApplications in localStorage:', hologramApplications[appIndex]);
    }
  }

  closeAllocationModal(): void {
    this.showAllocationModal = false;
    this.allocationResult = null;
    this.selectedRequest = null;
    this.approvalComments = '';
    this.approvedQuantity = 0;
  }

  forceApproveWithoutInventory(): void {
    if (!this.selectedRequest) return;

    // Create a mock allocation result for testing
    this.allocationResult = {
      canAllocate: true,
      totalAvailable: this.selectedRequest.requestedQuantity,
      allocations: [{
        cartoonNumber: 'TEST_CTN001',
        fromSerial: 'HG1001',
        toSerial: `HG${1001 + this.selectedRequest.requestedQuantity - 1}`,
        quantity: this.selectedRequest.requestedQuantity,
        remainingInCartoon: 0
      }],
      message: `Force approved ${this.selectedRequest.requestedQuantity} holograms for testing`
    };

    console.log('Force approving with mock allocation:', this.allocationResult);

    // Now proceed with normal approval
    this.confirmHologramAllocation();
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
        fromSerial: 'HG1001',
        toSerial: 'HG1500',
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

  // Rolls Assigned Methods
  hasRollsAssigned(request: HologramRequest): boolean {
    // Check if request has rolls_assigned or rollsAssigned property with data
    const req = request as any;
    const rolls = req.rolls_assigned || req.rollsAssigned || req.allocations || [];
    const hasRolls = Array.isArray(rolls) && rolls.length > 0;
    
    // Also check status - if approved/in_use/completed, it should have rolls
    const status = (request.status || '').toUpperCase();
    const isApprovedStatus = status.includes('APPROVED') || 
                            status === 'IN_USE' || 
                            status === 'COMPLETED' ||
                            status === 'IN USE';
    
    // Debug logging
    console.log('hasRollsAssigned check:', {
      refNo: request.referenceNo,
      status: request.status,
      hasRolls,
      isApprovedStatus,
      rollsData: rolls
    });
    
    // Show button if either has rolls data OR is in approved status
    return hasRolls || isApprovedStatus;
  }

  viewRollsAssigned(request: HologramRequest): void {
    this.selectedRequestForRolls = request;
    this.showRollsModal = true;
  }

  closeRollsModal(): void {
    this.showRollsModal = false;
    this.selectedRequestForRolls = null;
  }

  getRollsAssigned(request: HologramRequest): any[] {
    if (!request) return [];
    
    const req = request as any;
    // Get rolls from either rolls_assigned, rollsAssigned, or allocations property
    const rolls = req.rolls_assigned || req.rollsAssigned || req.allocations || [];
    
    // Ensure it's an array and normalize the data structure
    if (!Array.isArray(rolls)) return [];
    
    return rolls.map((roll: any) => ({
      cartoonNumber: roll.cartoonNumber || roll.cartoon_number || roll.carton_number || 'N/A',
      fromSerial: roll.fromSerial || roll.from_serial || 'N/A',
      toSerial: roll.toSerial || roll.to_serial || 'N/A',
      quantity: roll.quantity || 0
    }));
  }

  getTotalRollsQuantity(request: HologramRequest): number {
    const rolls = this.getRollsAssigned(request);
    return rolls.reduce((total, roll) => total + (roll.quantity || 0), 0);
  }

}
