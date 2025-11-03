import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface HologramRecord {
  id: number;
  date: string;
  fromSerial: string;
  toSerial: string;
  numberOfHolograms: number;
  previousStock: number;
  newArrival: number;
  totalStock: number;
  remarks?: string;
  entryType: 'NEW_ARRIVAL' | 'EXISTING';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
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
    // Sample data - replace with actual API call
    this.hologramRecords = [
      {
        id: 1,
        date: '2024-11-01',
        fromSerial: 'HG001001',
        toSerial: 'HG001500',
        numberOfHolograms: 500,
        previousStock: 0, // Keep for backward compatibility
        newArrival: 500, // Keep for backward compatibility
        totalStock: 1500,
        remarks: 'First batch received',
        entryType: 'NEW_ARRIVAL',
        status: 'APPROVED'
      },
      {
        id: 2,
        date: '2024-10-28',
        fromSerial: 'HG000501',
        toSerial: 'HG001000',
        numberOfHolograms: 500,
        previousStock: 0, // Keep for backward compatibility
        newArrival: 500, // Keep for backward compatibility
        totalStock: 1000,
        remarks: 'Regular monthly supply',
        entryType: 'NEW_ARRIVAL',
        status: 'APPROVED'
      },
      {
        id: 3,
        date: '2024-10-25',
        fromSerial: 'HG000001',
        toSerial: 'HG000500',
        numberOfHolograms: 500,
        previousStock: 0, // Keep for backward compatibility
        newArrival: 500, // Keep for backward compatibility
        totalStock: 500,
        remarks: 'Initial stock',
        entryType: 'NEW_ARRIVAL',
        status: 'APPROVED'
      }
    ];

    this.applyFilters();
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

  getTotalNewArrivals(): number {
    return this.filteredRecords.reduce((total, record) => total + record.newArrival, 0);
  }

  getTotalPreviousStock(): number {
    return this.filteredRecords.reduce((total, record) => total + record.previousStock, 0);
  }

  getCurrentTotalStock(): number {
    return this.filteredRecords.reduce((total, record) => total + record.totalStock, 0);
  }



  // Add new record methods
  showAddNewRecord() {
    this.showAddForm = true;
    this.newRecord = {
      date: new Date().toISOString().split('T')[0],
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0,
      totalStock: this.getLatestTotalStock(),
      remarks: '',
      entryType: 'NEW_ARRIVAL'
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
        this.calculateTotalStock();
      }
    }
  }

  calculateTotalStock() {
    // Calculate total stock based on current hologram count plus existing stock
    const currentStock = this.getLatestTotalStock();
    this.newRecord.totalStock = currentStock + (this.newRecord.numberOfHolograms || 0);
  }

  extractSerialNumber(serial: string): number | null {
    const match = serial.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  getLatestTotalStock(): number {
    if (this.hologramRecords.length === 0) return 0;
    const sortedRecords = [...this.hologramRecords].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sortedRecords[0]?.totalStock || 0;
  }

  saveNewRecord() {
    if (this.validateNewRecord()) {
      const newId = Math.max(...this.hologramRecords.map(r => r.id), 0) + 1;
      const recordToAdd: HologramRecord = {
        id: newId,
        date: this.newRecord.date!,
        fromSerial: this.newRecord.fromSerial!,
        toSerial: this.newRecord.toSerial!,
        numberOfHolograms: this.newRecord.numberOfHolograms!,
        previousStock: 0, // Keep for backward compatibility but not used in UI
        newArrival: this.newRecord.numberOfHolograms!, // Keep for backward compatibility but not used in UI
        totalStock: this.newRecord.totalStock!,
        remarks: this.newRecord.remarks || '',
        entryType: 'NEW_ARRIVAL'
      };

      this.hologramRecords.unshift(recordToAdd);
      this.applyFilters();
      this.hideAddForm();

      console.log('New hologram record added:', recordToAdd);
    }
  }

  validateNewRecord(): boolean {
    if (!this.newRecord.date || !this.newRecord.fromSerial || !this.newRecord.toSerial) {
      alert('Please fill in all required fields');
      return false;
    }

    if (!this.newRecord.numberOfHolograms || this.newRecord.numberOfHolograms <= 0) {
      alert('Number of holograms must be greater than 0');
      return false;
    }

    return true;
  }

  // Status related methods
  getStatusCount(status: string): number {
    return this.filteredRecords.filter(record => record.status === status).length;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-warning text-dark';
      case 'APPROVED':
        return 'bg-success';
      case 'REJECTED':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bi bi-clock';
      case 'APPROVED':
        return 'bi bi-check-circle';
      case 'REJECTED':
        return 'bi bi-x-circle';
      default:
        return 'bi bi-question-circle';
    }
  }

  approveRecord(record: HologramRecord): void {
    record.status = 'APPROVED';
    console.log('Record approved:', record);
  }

  rejectRecord(record: HologramRecord): void {
    record.status = 'REJECTED';
    console.log('Record rejected:', record);
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
