import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

interface HologramRoll {
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
  isNew?: boolean;
  newUntil?: number;
}

interface SerialNumber {
  number: string;
  status: 'AVAILABLE' | 'USED' | 'DAMAGED';
  usedDate?: string;
  batchNumber?: string;
  productionLine?: string;
}

interface SerialData {
  cartoonNumber: string;
  type: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  fromSerial: string;
  toSerial: string;
  totalCount: number;
  availableCount: number;
  usedCount: number;
  damagedCount: number;
  serialNumbers: SerialNumber[];
}

interface AvailableHologram {
  id: number;
  cartoonNumber: string;
  type: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  availableRange: string;
  availableCount: number;
  nextSerial: string;
  percentage: number;
  status: 'AVAILABLE' | 'IN_USE';
  isNew?: boolean;
  newUntil?: number;
}

interface IssuedHologram {
  id: number;
  batchNumber: string;
  brandName: string;
  fromSerial: string;
  toSerial: string;
  quantity: number;
  issueDate: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  officer: string;
  requestReference?: string;
  hologramType?: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  cartoonNumber?: string;
}

interface HistoryHologram {
  id: number;
  issueDate: string;
  batchNumber: string;
  brandName: string;
  fromSerial: string;
  toSerial: string;
  quantity: number;
  status: 'COMPLETED' | 'CANCELLED';
  completionDate: string;
  officer: string;
}

interface ChartFilters {
  specificDate: string;
  month: string;
  year: string;
  type: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  minQuantity: number | null;
  maxQuantity: number | null;
}

interface SerialFilters {
  rollStatus: string;
  hologramType: string;
  dateFrom: string;
  dateTo: string;
  serialSearch: string;
}

interface SerialRollData {
  id: number;
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
  usageHistory: any[];
  isNew?: boolean;
  newUntil?: number;
}

@Component({
  selector: 'app-hologramoveriew',
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramoveriew.component.html',
  styleUrl: './hologramoveriew.component.scss'
})
export class HologramoveriewComponent implements OnInit {
  activeTab: string = 'rolls';

  rollsData: HologramRoll[] = [];
  availableData: AvailableHologram[] = [];
  issuedData: IssuedHologram[] = [];
  historyData: HistoryHologram[] = [];
  serialRollsData: SerialRollData[] = [];
  filteredSerialData: SerialRollData[] = [];

  // Serial Details Modal
  showSerialDetailsModal: boolean = false;
  selectedSerialData: SerialData | null = null;
  serialViewMode: 'all' | 'available' | 'used' | 'damaged' = 'all';
  currentSerialPage: number = 1;
  serialPageSize: number = 50;

  // Chart Filters
  chartFilters: ChartFilters = {
    specificDate: '',
    month: '',
    year: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    minQuantity: null,
    maxQuantity: null
  };

  // Serial Filters
  serialFilters: SerialFilters = {
    rollStatus: '',
    hologramType: '',
    dateFrom: '',
    dateTo: '',
    serialSearch: ''
  };

  // Pagination for serial data
  serialCurrentPage: number = 1;
  serialDataPageSize: number = 10;

  // UI State
  showAdvancedFilters: boolean = false;

  // Filter options
  months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  years = [
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
    { value: '2022', label: '2022' }
  ];

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    this.loadRollsData();
    this.loadAvailableData();
    this.loadIssuedData();
    this.loadHistoryData();
    this.loadSerialRollsData();
    this.applySerialFilters();
    
    // Force change detection to ensure UI updates
    setTimeout(() => {
      // This ensures the UI reflects the new data order
    }, 0);
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  loadRollsData() {
    // Load data from localStorage (saved by arrival process)
    const savedRolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');

    // Sample data for demonstration (using older dates to ensure saved data appears first)
    const sampleData = [
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
        status: 'IN_USE',
        receivedDate: '2024-09-01'
      },
      {
        id: 2,
        cartoonNumber: 'CTN002',
        type: 'EXPORT',
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
        type: 'DEFENCE',
        fromSerial: 'HG003001',
        toSerial: 'HG003300',
        totalCount: 300,
        availableCount: 0,
        usedCount: 280,
        damagedCount: 20,
        status: 'COMPLETED',
        receivedDate: '2024-08-15'
      }
    ];

    // Sort saved data by received date (newest first) and then by ID (newest first)
    const sortedSavedRolls = savedRolls.sort((a: any, b: any) => {
      // First sort by date
      const dateA = new Date(a.receivedDate || '2024-01-01').getTime();
      const dateB = new Date(b.receivedDate || '2024-01-01').getTime();
      
      if (dateB !== dateA) {
        return dateB - dateA; // Newer date first
      }
      
      // If dates are same, sort by ID (newer ID first)
      return (b.id || 0) - (a.id || 0);
    });

    // Combine with saved data at top, then sample data
    this.rollsData = [...sortedSavedRolls, ...sampleData];
  }

  loadAvailableData() {
    // Load data from localStorage (saved by arrival process)
    const savedAvailable = JSON.parse(localStorage.getItem('hologramOverviewAvailable') || '[]');

    // Sample available hologram data
    const sampleData = [
      {
        id: 1,
        cartoonNumber: 'CTN001',
        type: 'LOCAL',
        availableRange: 'HG001111 - HG001500',
        availableCount: 350,
        nextSerial: 'HG001111',
        percentage: 70,
        status: 'AVAILABLE'
      },
      {
        id: 2,
        cartoonNumber: 'CTN002',
        type: 'EXPORT',
        availableRange: 'HG002001 - HG002500',
        availableCount: 500,
        nextSerial: 'HG002001',
        percentage: 100,
        status: 'AVAILABLE'
      },
      {
        id: 4,
        cartoonNumber: 'CTN004',
        type: 'LOCAL',
        availableRange: 'HG004101 - HG004750',
        availableCount: 600,
        nextSerial: 'HG004101',
        percentage: 80,
        status: 'AVAILABLE'
      }
    ];

    // Sort saved data by ID (newest first, since ID is timestamp-based)
    const sortedSavedAvailable = savedAvailable.sort((a: any, b: any) => {
      return b.id - a.id; // Higher ID (newer timestamp) first
    });

    // Combine with saved data at top, then sample data
    this.availableData = [...sortedSavedAvailable, ...sampleData];
  }

  loadIssuedData(): void {
    // Load issued holograms from localStorage (created by officer approval)
    const savedIssued = JSON.parse(localStorage.getItem('issuedHolograms') || '[]');
    
    // Sample data for demonstration
    const sampleData = [
      {
        id: 1,
        batchNumber: 'BATCH001',
        brandName: 'Premium Brand A',
        fromSerial: 'HG001001',
        toSerial: 'HG001100',
        quantity: 100,
        issueDate: '2024-11-01T10:30:00',
        status: 'IN_PROGRESS',
        officer: 'John Smith'
      },
      {
        id: 2,
        batchNumber: 'BATCH002',
        brandName: 'Export Brand B',
        fromSerial: 'HG002001',
        toSerial: 'HG002050',
        quantity: 50,
        issueDate: '2024-10-28T14:15:00',
        status: 'COMPLETED',
        officer: 'Jane Doe'
      }
    ];

    // Sort saved data by issue date (newest first)
    const sortedSavedIssued = savedIssued.sort((a: any, b: any) => {
      return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
    });

    // Combine with saved data at top, then sample data
    this.issuedData = [...sortedSavedIssued, ...sampleData];
  }

  loadHistoryData(): void {
    this.historyData = [
      {
        id: 1,
        issueDate: '2024-10-15',
        batchNumber: 'BATCH003',
        brandName: 'Defence Brand C',
        fromSerial: 'HG003001',
        toSerial: 'HG003200',
        quantity: 200,
        status: 'COMPLETED',
        completionDate: '2024-10-20',
        officer: 'Mike Johnson'
      },
      {
        id: 2,
        issueDate: '2024-10-10',
        batchNumber: 'BATCH004',
        brandName: 'Local Brand D',
        fromSerial: 'HG004001',
        toSerial: 'HG004150',
        quantity: 150,
        status: 'COMPLETED',
        completionDate: '2024-10-18',
        officer: 'Sarah Wilson'
      }
    ];
  }

  loadSerialRollsData(): void {
    // Load data from localStorage (saved by arrival process)
    const savedSerialData = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');

    // Sample data for demonstration
    const sampleData = [
      {
        id: 1,
        rollNumber: 'ROLL001',
        hologramType: 'LOCAL',
        fromSerial: 'HG001001',
        toSerial: 'HG001500',
        totalCount: 500,
        availableCount: 350,
        usedCount: 120,
        damagedCount: 30,
        status: 'IN_USE',
        receivedDate: '2024-09-01',
        usageHistory: []
      },
      {
        id: 2,
        rollNumber: 'ROLL002',
        hologramType: 'EXPORT',
        fromSerial: 'HG002001',
        toSerial: 'HG002500',
        totalCount: 500,
        availableCount: 500,
        usedCount: 0,
        damagedCount: 0,
        status: 'AVAILABLE',
        receivedDate: '2024-08-28',
        usageHistory: []
      }
    ];

    // Sort saved data by received date (newest first) and then by ID (newest first)
    const sortedSavedSerialData = savedSerialData.sort((a: any, b: any) => {
      // First sort by date
      const dateA = new Date(a.receivedDate || '2024-01-01').getTime();
      const dateB = new Date(b.receivedDate || '2024-01-01').getTime();
      
      if (dateB !== dateA) {
        return dateB - dateA; // Newer date first
      }
      
      // If dates are same, sort by ID (newer ID first)
      return (b.id || 0) - (a.id || 0);
    });

    // Combine with saved data at top, then sample data
    this.serialRollsData = [...sortedSavedSerialData, ...sampleData];
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'LOCAL':
        return 'bg-success text-white';
      case 'EXPORT':
        return 'bg-primary text-white';
      case 'DEFENCE':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary text-white';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-success text-white';
      case 'IN_USE':
        return 'bg-warning text-dark';
      case 'COMPLETED':
        return 'bg-secondary text-white';
      case 'DAMAGED':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
    }
  }

  isNewRoll(roll: HologramRoll): boolean {
    return !!(roll.isNew === true && roll.newUntil && Date.now() < roll.newUntil);
  }

  isNewAvailable(available: AvailableHologram): boolean {
    return !!(available.isNew === true && available.newUntil && Date.now() < available.newUntil);
  }

  // Overview statistics calculated from Serial Numbers Data only
  getTotalHolograms(): number {
    return this.serialRollsData.reduce((total, roll) => total + roll.availableCount, 0);
  }

  getTotalAvailable(): number {
    return this.serialRollsData.reduce((total, roll) => total + roll.availableCount, 0);
  }

  getTotalUsedInProduction(): number {
    return this.serialRollsData.reduce((total, roll) => total + roll.usedCount, 0);
  }

  getTotalDamagedWastage(): number {
    return this.serialRollsData.reduce((total, roll) => total + roll.damagedCount, 0);
  }

  // Helper method to calculate percentage safely
  getPercentage(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  getAvailableByType(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): number {
    return this.serialRollsData
      .filter(roll => roll.hologramType === type)
      .reduce((total, roll) => total + roll.availableCount, 0);
  }

  // Legacy methods for backward compatibility (now using serial data)
  getTotalAvailableFromRolls(): number {
    return this.rollsData.reduce((total, roll) => total + roll.availableCount, 0);
  }

  getAvailableByTypeFromRolls(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): number {
    return this.rollsData
      .filter(roll => roll.type === type)
      .reduce((total, roll) => total + roll.availableCount, 0);
  }

  // Serial Details Modal Methods
  openSerialDetailsModal(availableData: AvailableHologram): void {
    // Generate detailed serial numbers data
    this.selectedSerialData = this.generateSerialNumbersData(availableData);
    this.serialViewMode = 'all';
    this.currentSerialPage = 1;
    this.showSerialDetailsModal = true;
  }

  closeSerialDetailsModal(): void {
    this.showSerialDetailsModal = false;
    this.selectedSerialData = null;
    this.serialViewMode = 'all';
    this.currentSerialPage = 1;
  }

  generateSerialNumbersData(availableData: AvailableHologram): SerialData {
    const serialNumbers: SerialNumber[] = [];

    // Extract start and end numbers from serial range
    const fromMatch = availableData.availableRange.split(' - ')[0].match(/\d+/);
    const toMatch = availableData.availableRange.split(' - ')[1].match(/\d+/);

    if (fromMatch && toMatch) {
      const startNum = parseInt(fromMatch[0]);
      const endNum = parseInt(toMatch[0]);
      const prefix = availableData.availableRange.split(' - ')[0].replace(/\d+/, '');

      // Generate serial numbers with realistic usage patterns
      for (let i = startNum; i <= endNum; i++) {
        const serialNumber = prefix + i.toString().padStart(6, '0');
        let status: 'AVAILABLE' | 'USED' | 'DAMAGED' = 'AVAILABLE';
        let usedDate: string | undefined;

        // Simulate realistic usage patterns - first part available, middle part used, some damaged
        const totalRange = endNum - startNum + 1;
        const availableEnd = startNum + availableData.availableCount - 1;

        if (i <= availableEnd) {
          status = 'AVAILABLE';
        } else if (i <= startNum + totalRange * 0.9) { // 90% of remaining are used
          status = 'USED';
          // Generate random used date within last 30 days
          const daysAgo = Math.floor(Math.random() * 30);
          const date = new Date();
          date.setDate(date.getDate() - daysAgo);
          usedDate = date.toISOString().split('T')[0];
        } else {
          status = 'DAMAGED';
        }

        serialNumbers.push({
          number: serialNumber,
          status: status,
          usedDate: usedDate,
          batchNumber: status === 'USED' ? `BATCH-${Math.floor(Math.random() * 100) + 1}` : undefined,
          productionLine: status === 'USED' ? `LINE-${Math.floor(Math.random() * 5) + 1}` : undefined
        });
      }
    }

    return {
      cartoonNumber: availableData.cartoonNumber,
      type: availableData.type,
      fromSerial: availableData.availableRange.split(' - ')[0],
      toSerial: availableData.availableRange.split(' - ')[1],
      totalCount: serialNumbers.length,
      availableCount: serialNumbers.filter(s => s.status === 'AVAILABLE').length,
      usedCount: serialNumbers.filter(s => s.status === 'USED').length,
      damagedCount: serialNumbers.filter(s => s.status === 'DAMAGED').length,
      serialNumbers: serialNumbers
    };
  }

  setSerialViewMode(mode: 'all' | 'available' | 'used' | 'damaged'): void {
    this.serialViewMode = mode;
    this.currentSerialPage = 1;
  }

  getFilteredSerialNumbers(): SerialNumber[] {
    if (!this.selectedSerialData) return [];

    let filtered = this.selectedSerialData.serialNumbers;

    // Filter by view mode
    if (this.serialViewMode !== 'all') {
      filtered = filtered.filter(serial => {
        switch (this.serialViewMode) {
          case 'available':
            return serial.status === 'AVAILABLE';
          case 'used':
            return serial.status === 'USED';
          case 'damaged':
            return serial.status === 'DAMAGED';
          default:
            return true;
        }
      });
    }

    // Apply pagination
    const startIndex = (this.currentSerialPage - 1) * this.serialPageSize;
    const endIndex = startIndex + this.serialPageSize;

    return filtered.slice(startIndex, endIndex);
  }

  getSerialStatusClass(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'serial-available';
      case 'USED':
        return 'serial-used';
      case 'DAMAGED':
        return 'serial-damaged';
      default:
        return 'serial-unknown';
    }
  }

  getSerialBadgeClass(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-success text-white';
      case 'USED':
        return 'bg-warning text-dark';
      case 'DAMAGED':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
    }
  }

  getTotalSerialPages(): number {
    if (!this.selectedSerialData) return 1;

    let totalItems = this.selectedSerialData.serialNumbers.length;

    // Filter by view mode
    if (this.serialViewMode !== 'all') {
      totalItems = this.selectedSerialData.serialNumbers.filter(serial => {
        switch (this.serialViewMode) {
          case 'available':
            return serial.status === 'AVAILABLE';
          case 'used':
            return serial.status === 'USED';
          case 'damaged':
            return serial.status === 'DAMAGED';
          default:
            return true;
        }
      }).length;
    }

    return Math.ceil(totalItems / this.serialPageSize);
  }

  getSerialPageNumbers(): number[] {
    const totalPages = this.getTotalSerialPages();
    const pages: number[] = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, this.currentSerialPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  setSerialPage(page: number): void {
    const totalPages = this.getTotalSerialPages();
    if (page >= 1 && page <= totalPages) {
      this.currentSerialPage = page;
    }
  }

  exportSerialNumbers(): void {
    if (!this.selectedSerialData) return;

    // Implement export functionality
    alert('Serial numbers export functionality will be implemented with backend integration');
  }

  // Chart filter methods
  applyChartFilters(): void {
    // Implement chart filtering logic
  }

  clearChartFilters(): void {
    this.chartFilters = {
      specificDate: '',
      month: '',
      year: '',
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      minQuantity: null,
      maxQuantity: null
    };
    this.applyChartFilters();
  }

  getFilterSummary(): string {
    const filters = [];
    if (this.chartFilters.specificDate) filters.push(`Date: ${this.chartFilters.specificDate}`);
    if (this.chartFilters.month) filters.push(`Month: ${this.chartFilters.month}`);
    if (this.chartFilters.year) filters.push(`Year: ${this.chartFilters.year}`);
    if (this.chartFilters.type) filters.push(`Type: ${this.chartFilters.type}`);
    if (this.chartFilters.status) filters.push(`Status: ${this.chartFilters.status}`);

    return filters.length > 0 ? filters.join(', ') : 'All data';
  }

  refreshChartData(): void {
    this.loadAllData();
  }

  exportChartData(): void {
    alert('Chart data export functionality will be implemented with backend integration');
  }

  getFilteredDataCount(): number {
    // Return filtered data count based on current filters
    return 1250; // Mock value
  }

  // Serial filter methods
  applySerialFilters(): void {
    this.filteredSerialData = this.serialRollsData.filter(roll => {
      if (this.serialFilters.rollStatus && roll.status !== this.serialFilters.rollStatus) {
        return false;
      }
      if (this.serialFilters.hologramType && roll.hologramType !== this.serialFilters.hologramType) {
        return false;
      }
      if (this.serialFilters.serialSearch &&
        !roll.fromSerial.toLowerCase().includes(this.serialFilters.serialSearch.toLowerCase()) &&
        !roll.toSerial.toLowerCase().includes(this.serialFilters.serialSearch.toLowerCase())) {
        return false;
      }
      return true;
    });
    this.serialCurrentPage = 1;
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

  hasActiveSerialFilters(): boolean {
    return !!(this.serialFilters.rollStatus ||
      this.serialFilters.hologramType ||
      this.serialFilters.dateFrom ||
      this.serialFilters.dateTo ||
      this.serialFilters.serialSearch);
  }

  getSerialFilterSummary(): string {
    const filters = [];
    if (this.serialFilters.rollStatus) filters.push(`Status: ${this.serialFilters.rollStatus}`);
    if (this.serialFilters.hologramType) filters.push(`Type: ${this.serialFilters.hologramType}`);
    if (this.serialFilters.serialSearch) filters.push(`Search: ${this.serialFilters.serialSearch}`);

    return filters.length > 0 ?
      `Filtered by: ${filters.join(', ')} | Showing ${this.filteredSerialData.length} of ${this.serialRollsData.length} rolls` :
      `Showing all ${this.serialRollsData.length} rolls`;
  }

  // Serial data summary methods
  getTotalRolls(): number {
    return this.hasActiveSerialFilters() ? this.filteredSerialData.length : this.serialRollsData.length;
  }

  getAvailableHolograms(): number {
    const data = this.hasActiveSerialFilters() ? this.filteredSerialData : this.serialRollsData;
    return data.reduce((total, roll) => total + roll.availableCount, 0);
  }

  getUsedInProduction(): number {
    const data = this.hasActiveSerialFilters() ? this.filteredSerialData : this.serialRollsData;
    return data.reduce((total, roll) => total + roll.usedCount, 0);
  }

  getDamagedWastage(): number {
    const data = this.hasActiveSerialFilters() ? this.filteredSerialData : this.serialRollsData;
    return data.reduce((total, roll) => total + roll.damagedCount, 0);
  }

  // Serial data pagination methods
  getPaginatedSerialData(): SerialRollData[] {
    const startIndex = (this.serialCurrentPage - 1) * this.serialDataPageSize;
    const endIndex = startIndex + this.serialDataPageSize;
    return this.filteredSerialData.slice(startIndex, endIndex);
  }

  getSerialDataStartIndex(): number {
    return (this.serialCurrentPage - 1) * this.serialDataPageSize;
  }

  getSerialDataEndIndex(): number {
    const endIndex = this.serialCurrentPage * this.serialDataPageSize;
    return Math.min(endIndex, this.filteredSerialData.length);
  }

  getTotalSerialDataPages(): number {
    return Math.ceil(this.filteredSerialData.length / this.serialDataPageSize);
  }

  // Serial roll action methods
  isNewSerialRoll(roll: SerialRollData): boolean {
    return !!(roll.isNew === true && roll.newUntil && Date.now() < roll.newUntil);
  }

  viewUsageDetails(roll: SerialRollData): void {
    alert(`Usage details for ${roll.rollNumber} will be implemented with backend integration`);
  }

  editRoll(roll: SerialRollData): void {
    alert(`Edit functionality for ${roll.rollNumber} will be implemented`);
  }

  viewRollDetails(roll: SerialRollData): void {
    alert(`Detailed view for ${roll.rollNumber} will be implemented`);
  }

  markDamaged(roll: SerialRollData): void {
    alert(`Mark damaged functionality for ${roll.rollNumber} will be implemented`);
  }

  refreshSerialData(): void {
    this.loadAllData();
  }

  exportSerialData(): void {
    alert('Serial data export functionality will be implemented with backend integration');
  }

  // Method to clear test data (for debugging)
  clearTestData(): void {
    if (confirm('Clear all hologram data from localStorage? This will remove all arrival data.')) {
      localStorage.removeItem('hologramOverviewRolls');
      localStorage.removeItem('hologramOverviewAvailable');
      localStorage.removeItem('issuedHolograms');
      this.loadAllData();
      alert('Test data cleared successfully!');
    }
  }

  // Helper method to check if an issued hologram is new (within last hour)
  isNewIssued(issued: IssuedHologram): boolean {
    const issueTime = new Date(issued.issueDate).getTime();
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return issueTime > oneHourAgo;
  }

  // Method to mark hologram as completed
  markAsCompleted(issued: IssuedHologram): void {
    if (confirm(`Mark batch ${issued.batchNumber} as completed?`)) {
      issued.status = 'COMPLETED';
      
      // Update in localStorage
      const issuedHolograms = JSON.parse(localStorage.getItem('issuedHolograms') || '[]');
      const index = issuedHolograms.findIndex((item: any) => item.id === issued.id);
      if (index !== -1) {
        issuedHolograms[index].status = 'COMPLETED';
        localStorage.setItem('issuedHolograms', JSON.stringify(issuedHolograms));
      }
      
      alert(`Batch ${issued.batchNumber} marked as completed!`);
    }
  }

  // Method to view issued hologram details
  viewIssuedDetails(issued: IssuedHologram): void {
    const details = `
Batch Number: ${issued.batchNumber}
Brand: ${issued.brandName}
Serial Range: ${issued.fromSerial} - ${issued.toSerial}
Quantity: ${issued.quantity}
Issue Date: ${new Date(issued.issueDate).toLocaleString()}
Status: ${issued.status}
Officer: ${issued.officer}
${issued.requestReference ? `Request Reference: ${issued.requestReference}` : ''}
${issued.hologramType ? `Hologram Type: ${issued.hologramType}` : ''}
${issued.cartoonNumber ? `Cartoon Number: ${issued.cartoonNumber}` : ''}
    `;
    
    alert(details);
  }

  // Helper methods for template calculations
  getInProgressCount(): number {
    return this.issuedData.filter(item => item.status === 'IN_PROGRESS').length;
  }

  getCompletedCount(): number {
    return this.issuedData.filter(item => item.status === 'COMPLETED').length;
  }

  getTotalIssuedQuantity(): number {
    return this.issuedData.reduce((sum, item) => sum + item.quantity, 0);
  }
}