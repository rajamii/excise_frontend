import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface HologramRecord {
  id: number;
  date: string;
  ourRefNo: string;
  cartoonNumber?: string;
  fromSerial: string;
  toSerial: string;
  numberOfHolograms: number;
  remarks?: string;
  status: 'PENDING_ARRIVAL' | 'ARRIVED' | 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL';
  approvedDate?: string;
  arrivedDate?: string;
  supplyChainData?: any;
}

export interface HologramRoll {
  rollNumber: string;
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  fromSerial: string;
  toSerial: string;
  totalCount: number;
  availableCount: number;
  usedCount: number;
  damagedCount: number;
  status: 'AVAILABLE' | 'IN_USE' | 'COMPLETED' | 'DAMAGED';
  receivedDate: string;
  usageHistory: UsageHistory[];
}

export interface UsageHistory {
  date: string;
  batchNumber: string;
  brandName: string;
  fromSerial: string;
  toSerial: string;
  quantity: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'DAMAGED';
}

export interface SerialFilters {
  rollStatus: string;
  hologramType: string;
  dateFrom: string;
  dateTo: string;
  serialSearch: string;
}

@Component({
  selector: 'app-hologramdetails',
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramdetails.component.html',
  styleUrl: './hologramdetails.component.scss'
})
export class HologramdetailsComponent implements OnInit {
  @Output() hologramRequestsClicked = new EventEmitter<void>();
  
  hologramRecords: HologramRecord[] = [];
  filteredRecords: HologramRecord[] = [];

  // Officer information
  currentOfficer = {
    name: 'Rajesh Kumar',
    distilleryName: 'Sikkim Distilleries Ltd',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@sikkimdistilleries.com',
    officerId: 'OFF001'
  };

  // Filter properties
  selectedDate: string = '';
  selectedMonth: string = '';
  selectedYear: string = '';
  selectedStatus: string = '';
  searchText: string = '';

  // Add new record properties
  showAddForm: boolean = false;
  newRecord: Partial<HologramRecord> = {};

  // Update arrival properties
  showUpdateModal: boolean = false;
  selectedRecordForUpdate: HologramRecord | null = null;
  updateForm = {
    cartoonNumber: '',
    fromSerial: '',
    toSerial: '',
    numberOfHolograms: 0
  };

  // Hologram Serial Numbers Data properties
  showHologramSerialModal: boolean = false;
  showUsageDetailsModal: boolean = false;
  hologramRolls: HologramRoll[] = [];
  filteredSerialData: HologramRoll[] = [];
  selectedRoll: HologramRoll | null = null;
  
  serialFilters: SerialFilters = {
    rollStatus: '',
    hologramType: '',
    dateFrom: '',
    dateTo: '',
    serialSearch: ''
  };

  // Date filter options
  months = [
    { value: '', label: 'All Months' },
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  years = Array.from({ length: 10 }, (_, i) => {
    const year = (new Date().getFullYear() - 5 + i).toString();
    return { value: year, label: year };
  });

  constructor() {
    this.selectedMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
    this.selectedYear = new Date().getFullYear().toString();
  }

  ngOnInit() {
    this.loadHologramRecords();
    this.loadHologramRolls();
  }

  loadHologramRecords() {
    // Load hologram requests from supply chain and officer approvals
    this.loadSupplyChainHologramRequests();
    this.applyFilters();
  }

  loadSupplyChainHologramRequests() {
    // Load hologram requests from supply chain (dev-hologram page)
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const hologramApplications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    
    // Load approved entries from officer in-charge
    const approvedEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
    
    // Convert supply chain hologram data to register format
    const supplyChainRecords = [...hologramRequests, ...hologramApplications].map((item: any, index: number) => ({
      id: item.id || (1000 + index),
      date: item.date || new Date().toISOString().split('T')[0],
      ourRefNo: item.refNo || item.referenceNo || `HRQ/${new Date().getFullYear()}/${String(index + 1).padStart(3, '0')}`,
      cartoonNumber: item.cartoonNumber || '',
      fromSerial: item.fromSerial || '',
      toSerial: item.toSerial || '',
      numberOfHolograms: this.calculateTotalHolograms(item),
      remarks: `Supply chain hologram request - ${item.companyName || 'Unknown Company'}`,
      status: this.determineStatus(item),
      approvedDate: item.approvedDate,
      arrivedDate: item.arrivedDate,
      supplyChainData: item
    }));

    // Convert officer approved entries
    const officerRecords = approvedEntries.map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      ourRefNo: entry.ourRefNo,
      cartoonNumber: entry.cartoonNumber || '',
      fromSerial: entry.fromSerial || '',
      toSerial: entry.toSerial || '',
      numberOfHolograms: entry.numberOfHolograms,
      remarks: entry.remarks,
      status: entry.status,
      approvedDate: entry.approvedDate,
      arrivedDate: entry.arrivedDate
    }));

    // Combine and deduplicate records based on ourRefNo
    const allRecords = [...supplyChainRecords, ...officerRecords];
    const uniqueRecordsMap = new Map();
    
    // Deduplicate by ourRefNo, keeping the most recent/complete record
    allRecords.forEach(record => {
      const existingRecord = uniqueRecordsMap.get(record.ourRefNo);
      
      if (!existingRecord) {
        // No existing record, add this one
        uniqueRecordsMap.set(record.ourRefNo, record);
      } else {
        // Record exists, keep the one with more complete data or higher status
        const shouldReplace = this.shouldReplaceRecord(existingRecord, record);
        if (shouldReplace) {
          uniqueRecordsMap.set(record.ourRefNo, record);
        }
      }
    });

    // Convert map back to array
    this.hologramRecords = Array.from(uniqueRecordsMap.values());

    // Add sample data if no records exist (ensure unique reference numbers)
    if (this.hologramRecords.length === 0) {
      const sampleRecords = [
        {
          id: 1,
          date: '2024-11-03',
          ourRefNo: 'HRQ/2024/001',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 1, // 1 unit - Ready for update (this will show as 1 unit, not 100,000)
          remarks: 'Hologram request for Premium Whisky production - Approved by Commissioner',
          status: 'PENDING_ARRIVAL' as const,
          approvedDate: '2024-11-03',
          supplyChainData: {
            refNo: 'HRQ/2024/001',
            companyName: 'Sikkim Distilleries Ltd',
            totalHolograms: 1, // Direct unit entry, not in lakhs
            status: 'APPROVED'
          }
        },
        {
          id: 2,
          date: '2024-11-02',
          ourRefNo: 'HRQ/2024/002',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 5000, // 5000 units - Ready for update
          remarks: 'Hologram request for Export Rum - Approved by Commissioner',
          status: 'PENDING_ARRIVAL' as const,
          approvedDate: '2024-11-02',
          supplyChainData: {
            refNo: 'HRQ/2024/002',
            companyName: 'Sikkim Distilleries Ltd',
            totalHolograms: 5000,
            status: 'APPROVED'
          }
        },
        {
          id: 3,
          date: '2024-11-01',
          ourRefNo: 'HRQ/2024/003',
          cartoonNumber: 'CTN001',
          fromSerial: 'HG001001',
          toSerial: 'HG002000',
          numberOfHolograms: 2000, // 2000 units - Already arrived
          remarks: 'Hologram request for Local Beer production - Completed',
          status: 'ARRIVED' as const,
          approvedDate: '2024-11-01',
          arrivedDate: '2024-11-01',
          supplyChainData: {
            refNo: 'HRQ/2024/003',
            companyName: 'Sikkim Distilleries Ltd',
            totalHolograms: 2000,
            status: 'APPROVED'
          }
        },
        {
          id: 4,
          date: '2024-10-30',
          ourRefNo: 'HRQ/2024/004',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 1500, // 1500 units - Ready for update
          remarks: 'Hologram request for Defence supplies - Approved by Commissioner',
          status: 'PENDING_ARRIVAL' as const,
          approvedDate: '2024-10-30',
          supplyChainData: {
            refNo: 'HRQ/2024/004',
            companyName: 'Sikkim Distilleries Ltd',
            totalHolograms: 1500,
            status: 'APPROVED'
          }
        },
        {
          id: 5,
          date: '2024-10-28',
          ourRefNo: 'HRQ/2024/005',
          cartoonNumber: 'CTN002',
          fromSerial: 'HG003001',
          toSerial: 'HG003500',
          numberOfHolograms: 500, // 500 units - Already arrived
          remarks: 'Hologram request for Special Edition Vodka - Completed',
          status: 'ARRIVED' as const,
          approvedDate: '2024-10-28',
          arrivedDate: '2024-10-29',
          supplyChainData: {
            refNo: 'HRQ/2024/005',
            companyName: 'Sikkim Distilleries Ltd',
            totalHolograms: 500,
            status: 'APPROVED'
          }
        },
        {
          id: 6,
          date: '2024-10-25',
          ourRefNo: 'HRQ/2024/006',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 1000, // 1000 units - Waiting for approval
          remarks: 'Hologram request for Premium Gin production - Waiting for Commissioner Approval',
          status: 'PENDING_APPROVAL' as const,
          supplyChainData: {
            refNo: 'HRQ/2024/006',
            companyName: 'Sikkim Distilleries Ltd',
            totalHolograms: 1000,
            status: 'Submitted'
          }
        }
      ];

      // Apply deduplication to sample data as well
      const uniqueSampleMap = new Map();
      sampleRecords.forEach(record => {
        uniqueSampleMap.set(record.ourRefNo, record);
      });
      
      this.hologramRecords = Array.from(uniqueSampleMap.values());
    }
  }

  calculateTotalHolograms(item: any): number {
    // Check if this is supply chain data (has lakh fields) or direct entry
    if (item.localQtyLakh !== undefined || item.exportQtyLakh !== undefined || item.defenceQtyLakh !== undefined) {
      // Supply chain data - but check if values are small (likely entered as units, not lakhs)
      const local = item.localQtyLakh || 0;
      const export_ = item.exportQtyLakh || 0;
      const defence = item.defenceQtyLakh || 0;
      const total = local + export_ + defence;
      
      // If the total is very small (less than 10), treat it as units, not lakhs
      // This handles cases where users enter 1, 2, 5 etc. thinking they're entering units
      if (total <= 10) {
        return total; // Return as units
      } else {
        // For larger values, treat as lakhs and convert to units
        return total * 100000;
      }
    } else if (item.totalHolograms !== undefined) {
      // Direct entry - already in units
      return item.totalHolograms;
    } else if (item.numberOfHolograms !== undefined) {
      // Direct entry - already in units
      return item.numberOfHolograms;
    } else {
      // Fallback - assume it's already in units
      return 0;
    }
  }

  determineStatus(item: any): 'PENDING_ARRIVAL' | 'ARRIVED' | 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL' {
    // Check if hologram has physically arrived
    if (item.arrivedDate) return 'ARRIVED';
    
    // Check if approved by commissioner and ready for arrival
    if (item.status === 'APPROVED' || item.approvedDate) return 'PENDING_ARRIVAL';
    
    // Check if rejected
    if (item.status === 'REJECTED') return 'REJECTED';
    
    // Check if submitted but not yet approved
    if (item.status === 'Submitted') return 'PENDING_APPROVAL';
    
    // Default status for new requests
    return 'PENDING_APPROVAL';
  }



  // Check if record is from completed workflow
  isFromCompletedWorkflow(record: HologramRecord): boolean {
    return record.supplyChainData && (record.status === 'PENDING_ARRIVAL' || record.status === 'ARRIVED');
  }

  // Determine which record to keep when deduplicating
  shouldReplaceRecord(existing: HologramRecord, newRecord: HologramRecord): boolean {
    // Priority order: ARRIVED > PENDING_ARRIVAL > PENDING_APPROVAL
    const statusPriority = {
      'ARRIVED': 3,
      'PENDING_ARRIVAL': 2,
      'PENDING_APPROVAL': 1,
      'APPROVED': 1,
      'REJECTED': 0
    };

    const existingPriority = statusPriority[existing.status] || 0;
    const newPriority = statusPriority[newRecord.status] || 0;

    // Keep the record with higher status priority
    if (newPriority > existingPriority) {
      return true;
    }

    // If same priority, keep the one with more complete data
    if (newPriority === existingPriority) {
      const existingComplete = (existing.cartoonNumber || '') + (existing.fromSerial || '') + (existing.toSerial || '');
      const newComplete = (newRecord.cartoonNumber || '') + (newRecord.fromSerial || '') + (newRecord.toSerial || '');
      
      return newComplete.length > existingComplete.length;
    }

    return false;
  }

  applyFilters() {
    this.filteredRecords = this.hologramRecords.filter(record => {
      const recordDate = new Date(record.date);

      // Specific date filter
      const dateMatch = !this.selectedDate || record.date === this.selectedDate;

      // Month filter
      const monthMatch = !this.selectedMonth ||
        (recordDate.getMonth() + 1).toString().padStart(2, '0') === this.selectedMonth;

      // Year filter
      const yearMatch = !this.selectedYear ||
        recordDate.getFullYear().toString() === this.selectedYear;

      // Status filter
      const statusMatch = !this.selectedStatus || record.status === this.selectedStatus;

      // Search filter
      const searchMatch = !this.searchText ||
        record.fromSerial.toLowerCase().includes(this.searchText.toLowerCase()) ||
        record.toSerial.toLowerCase().includes(this.searchText.toLowerCase()) ||
        (record.remarks && record.remarks.toLowerCase().includes(this.searchText.toLowerCase()));

      return dateMatch && monthMatch && yearMatch && statusMatch && searchMatch;
    });
  }

  clearFilters() {
    this.selectedDate = '';
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedStatus = '';
    this.searchText = '';
    this.applyFilters();
  }



  getCurrentDateTime(): string {
    return new Date().toLocaleString();
  }

  getTotalHolograms(): number {
    return this.filteredRecords.reduce((total, record) => total + record.numberOfHolograms, 0);
  }





  // Add new record methods
  showAddNewRecord() {
    this.showAddForm = true;
    this.newRecord = {
      date: new Date().toISOString().split('T')[0],
      ourRefNo: '',
      cartoonNumber: '',
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0,
      remarks: '',
      status: 'PENDING_ARRIVAL'
    };
  }

  hideAddForm() {
    this.showAddForm = false;
    this.newRecord = {};
  }

  calculateHologramCount() {
    if (this.newRecord.fromSerial && this.newRecord.toSerial) {
      const fromNum = this.extractSerialNumber(this.newRecord.fromSerial);
      const toNum = this.extractSerialNumber(this.newRecord.toSerial);

      if (fromNum && toNum && toNum >= fromNum) {
        this.newRecord.numberOfHolograms = toNum - fromNum + 1;
      }
    }
  }

  extractSerialNumber(serial: string): number | null {
    const match = serial.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }



  saveNewRecord() {
    if (this.validateNewRecord()) {
      const newId = Math.max(...this.hologramRecords.map(r => r.id), 0) + 1;
      const recordToAdd: HologramRecord = {
        id: newId,
        date: this.newRecord.date!,
        ourRefNo: this.newRecord.ourRefNo!,
        cartoonNumber: this.newRecord.cartoonNumber || '',
        fromSerial: this.newRecord.fromSerial!,
        toSerial: this.newRecord.toSerial!,
        numberOfHolograms: this.newRecord.numberOfHolograms!,
        remarks: this.newRecord.remarks || '',
        status: 'ARRIVED',
        arrivedDate: this.newRecord.date
      };

      this.hologramRecords.unshift(recordToAdd);
      this.applyFilters();
      this.hideAddForm();

      console.log('New hologram record added:', recordToAdd);
    }
  }

  validateNewRecord(): boolean {
    if (!this.newRecord.date || !this.newRecord.ourRefNo || !this.newRecord.fromSerial || !this.newRecord.toSerial) {
      alert('Please fill in all required fields');
      return false;
    }

    if (!this.newRecord.numberOfHolograms || this.newRecord.numberOfHolograms <= 0) {
      alert('Number of holograms must be greater than 0');
      return false;
    }

    return true;
  }

  // Update arrival methods
  canUpdateRecord(record: HologramRecord): boolean {
    return record.status === 'PENDING_ARRIVAL';
  }

  updateArrivalDetails(record: HologramRecord) {
    this.selectedRecordForUpdate = record;
    this.updateForm = {
      cartoonNumber: record.cartoonNumber || '',
      fromSerial: record.fromSerial || '',
      toSerial: record.toSerial || '',
      numberOfHolograms: record.numberOfHolograms || 0
    };
    this.showUpdateModal = true;
  }

  calculateUpdateHologramCount() {
    if (this.updateForm.fromSerial && this.updateForm.toSerial) {
      const fromNum = this.extractSerialNumber(this.updateForm.fromSerial);
      const toNum = this.extractSerialNumber(this.updateForm.toSerial);

      if (fromNum && toNum && toNum >= fromNum) {
        this.updateForm.numberOfHolograms = toNum - fromNum + 1;
      }
    }
  }

  saveArrivalUpdate() {
    if (this.selectedRecordForUpdate && this.validateUpdateForm()) {
      // Update the record
      this.selectedRecordForUpdate.cartoonNumber = this.updateForm.cartoonNumber;
      this.selectedRecordForUpdate.fromSerial = this.updateForm.fromSerial;
      this.selectedRecordForUpdate.toSerial = this.updateForm.toSerial;
      this.selectedRecordForUpdate.numberOfHolograms = this.updateForm.numberOfHolograms;
      this.selectedRecordForUpdate.status = 'ARRIVED';
      this.selectedRecordForUpdate.arrivedDate = new Date().toISOString().split('T')[0];
      
      // Update in storage
      this.updateHologramRecordInStorage(this.selectedRecordForUpdate);
      
      this.closeUpdateModal();
      this.applyFilters();
      
      alert(`Hologram ${this.selectedRecordForUpdate.ourRefNo} marked as arrived successfully!`);
    }
  }

  validateUpdateForm(): boolean {
    if (!this.updateForm.cartoonNumber.trim()) {
      alert('Please enter cartoon number');
      return false;
    }
    if (!this.updateForm.fromSerial.trim()) {
      alert('Please enter from serial number');
      return false;
    }
    if (!this.updateForm.toSerial.trim()) {
      alert('Please enter to serial number');
      return false;
    }
    if (this.updateForm.numberOfHolograms <= 0) {
      alert('Invalid hologram count');
      return false;
    }
    return true;
  }

  closeUpdateModal() {
    this.showUpdateModal = false;
    this.selectedRecordForUpdate = null;
    this.updateForm = {
      cartoonNumber: '',
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0
    };
  }

  // Status related methods
  getStatusCount(status: string): number {
    return this.filteredRecords.filter(record => record.status === status).length;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING_ARRIVAL':
        return 'bg-warning text-dark';
      case 'ARRIVED':
        return 'bg-success';
      case 'APPROVED':
        return 'bg-info';
      case 'REJECTED':
        return 'bg-danger';
      case 'PENDING_APPROVAL':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING_ARRIVAL':
        return 'bi bi-clock';
      case 'ARRIVED':
        return 'bi bi-check-circle';
      case 'APPROVED':
        return 'bi bi-check-circle-fill';
      case 'REJECTED':
        return 'bi bi-x-circle';
      case 'PENDING_APPROVAL':
        return 'bi bi-hourglass-split';
      default:
        return 'bi bi-question-circle';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING_ARRIVAL':
        return 'Pending Arrival';
      case 'ARRIVED':
        return 'Arrived';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'PENDING_APPROVAL':
        return 'Pending Approval';
      default:
        return 'Unknown';
    }
  }







  updateHologramRecordInStorage(updatedRecord: HologramRecord) {
    // Update the record in localStorage
    const approvedEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
    const index = approvedEntries.findIndex((entry: any) => entry.id === updatedRecord.id);
    
    if (index !== -1) {
      approvedEntries[index] = {
        ...approvedEntries[index],
        cartoonNumber: updatedRecord.cartoonNumber,
        fromSerial: updatedRecord.fromSerial,
        toSerial: updatedRecord.toSerial,
        numberOfHolograms: updatedRecord.numberOfHolograms,
        status: updatedRecord.status,
        arrivedDate: updatedRecord.arrivedDate
      };
      localStorage.setItem('approvedHologramEntries', JSON.stringify(approvedEntries));
    }

    // Also update supply chain data if it exists
    if (updatedRecord.supplyChainData) {
      const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      const requestIndex = hologramRequests.findIndex((req: any) => req.refNo === updatedRecord.ourRefNo);
      
      if (requestIndex !== -1) {
        hologramRequests[requestIndex] = {
          ...hologramRequests[requestIndex],
          cartoonNumber: updatedRecord.cartoonNumber,
          fromSerial: updatedRecord.fromSerial,
          toSerial: updatedRecord.toSerial,
          status: updatedRecord.status,
          arrivedDate: updatedRecord.arrivedDate
        };
        localStorage.setItem('hologramRequests', JSON.stringify(hologramRequests));
      }
    }
  }

  // Refresh data method
  refreshData() {
    this.loadHologramRecords();
    console.log('Hologram register data refreshed and deduplicated');
  }

  // Force deduplication of existing records
  deduplicateRecords() {
    const uniqueRecordsMap = new Map();
    
    this.hologramRecords.forEach(record => {
      const existingRecord = uniqueRecordsMap.get(record.ourRefNo);
      
      if (!existingRecord) {
        uniqueRecordsMap.set(record.ourRefNo, record);
      } else {
        const shouldReplace = this.shouldReplaceRecord(existingRecord, record);
        if (shouldReplace) {
          uniqueRecordsMap.set(record.ourRefNo, record);
        }
      }
    });

    this.hologramRecords = Array.from(uniqueRecordsMap.values());
    this.applyFilters();
  }

  // Get summary counts for new status system
  getPendingArrivals(): number {
    return this.filteredRecords.filter(record => record.status === 'PENDING_ARRIVAL').length;
  }

  getArrivedCount(): number {
    return this.filteredRecords.filter(record => record.status === 'ARRIVED').length;
  }

  openHologramRequests(): void {
    this.hologramRequestsClicked.emit();
  }

  // Hologram Serial Numbers Data Methods
  loadHologramRolls(): void {
    // Sample data - replace with actual API call
    this.hologramRolls = [
      {
        rollNumber: 'ROLL-001',
        hologramType: 'LOCAL',
        fromSerial: 'HG001001',
        toSerial: 'HG001500',
        totalCount: 500,
        availableCount: 350,
        usedCount: 120,
        damagedCount: 30,
        status: 'IN_USE',
        receivedDate: '2024-11-01',
        usageHistory: [
          {
            date: '2024-11-02',
            batchNumber: 'BATCH-001',
            brandName: 'Premium Whisky',
            fromSerial: 'HG001001',
            toSerial: 'HG001050',
            quantity: 50,
            status: 'COMPLETED'
          },
          {
            date: '2024-11-03',
            batchNumber: 'BATCH-002',
            brandName: 'Royal Rum',
            fromSerial: 'HG001051',
            toSerial: 'HG001120',
            quantity: 70,
            status: 'COMPLETED'
          }
        ]
      },
      {
        rollNumber: 'ROLL-002',
        hologramType: 'EXPORT',
        fromSerial: 'HG002001',
        toSerial: 'HG002500',
        totalCount: 500,
        availableCount: 500,
        usedCount: 0,
        damagedCount: 0,
        status: 'AVAILABLE',
        receivedDate: '2024-10-28',
        usageHistory: []
      },
      {
        rollNumber: 'ROLL-003',
        hologramType: 'DEFENCE',
        fromSerial: 'HG003001',
        toSerial: 'HG003300',
        totalCount: 300,
        availableCount: 0,
        usedCount: 280,
        damagedCount: 20,
        status: 'COMPLETED',
        receivedDate: '2024-10-15',
        usageHistory: [
          {
            date: '2024-10-20',
            batchNumber: 'DEF-001',
            brandName: 'Military Special',
            fromSerial: 'HG003001',
            toSerial: 'HG003280',
            quantity: 280,
            status: 'COMPLETED'
          }
        ]
      }
    ];

    this.applySerialFilters();
  }

  openHologramSerialData(): void {
    this.showHologramSerialModal = true;
  }

  closeHologramSerialModal(): void {
    this.showHologramSerialModal = false;
  }

  applySerialFilters(): void {
    this.filteredSerialData = this.hologramRolls.filter(roll => {
      const rollDate = new Date(roll.receivedDate);

      // Status filter
      const statusMatch = !this.serialFilters.rollStatus || roll.status === this.serialFilters.rollStatus;

      // Type filter
      const typeMatch = !this.serialFilters.hologramType || roll.hologramType === this.serialFilters.hologramType;

      // Date from filter
      const dateFromMatch = !this.serialFilters.dateFrom || rollDate >= new Date(this.serialFilters.dateFrom);

      // Date to filter
      const dateToMatch = !this.serialFilters.dateTo || rollDate <= new Date(this.serialFilters.dateTo);

      // Serial search filter
      const serialMatch = !this.serialFilters.serialSearch ||
        roll.fromSerial.toLowerCase().includes(this.serialFilters.serialSearch.toLowerCase()) ||
        roll.toSerial.toLowerCase().includes(this.serialFilters.serialSearch.toLowerCase()) ||
        roll.rollNumber.toLowerCase().includes(this.serialFilters.serialSearch.toLowerCase());

      return statusMatch && typeMatch && dateFromMatch && dateToMatch && serialMatch;
    });
  }

  clearSerialFilters(): void {
    this.serialFilters = {
      rollStatus: '',
      hologramType: '',
      dateFrom: '',
      dateTo: '',
      serialSearch: ''
    };
    this.applySerialFilters();
  }

  getTotalRolls(): number {
    return this.hologramRolls.length;
  }

  getAvailableHolograms(): number {
    return this.hologramRolls.reduce((total, roll) => total + roll.availableCount, 0);
  }

  getUsedHolograms(): number {
    return this.hologramRolls.reduce((total, roll) => total + roll.usedCount, 0);
  }

  getDamagedHolograms(): number {
    return this.hologramRolls.reduce((total, roll) => total + roll.damagedCount, 0);
  }

  viewUsageDetails(roll: HologramRoll): void {
    this.selectedRoll = roll;
    this.showUsageDetailsModal = true;
  }

  closeUsageDetailsModal(): void {
    this.showUsageDetailsModal = false;
    this.selectedRoll = null;
  }

  viewRollDetails(roll: HologramRoll): void {
    console.log('Viewing roll details:', roll);
    // Implement detailed view logic
  }

  markDamaged(roll: HologramRoll): void {
    if (confirm(`Are you sure you want to mark roll ${roll.rollNumber} as damaged?`)) {
      roll.status = 'DAMAGED';
      console.log('Roll marked as damaged:', roll);
    }
  }

  getUsagePercentage(roll: HologramRoll, type: 'available' | 'used' | 'damaged'): number {
    if (roll.totalCount === 0) return 0;
    
    switch (type) {
      case 'available':
        return (roll.availableCount / roll.totalCount) * 100;
      case 'used':
        return (roll.usedCount / roll.totalCount) * 100;
      case 'damaged':
        return (roll.damagedCount / roll.totalCount) * 100;
      default:
        return 0;
    }
  }

  exportSerialData(): void {
    console.log('Exporting serial data...');
    // Implement export functionality
  }

  generateSerialReport(): void {
    console.log('Generating serial report...');
    // Implement report generation
  }

  exportUsageReport(roll: HologramRoll): void {
    console.log('Exporting usage report for roll:', roll.rollNumber);
    // Implement usage report export
  }
}
