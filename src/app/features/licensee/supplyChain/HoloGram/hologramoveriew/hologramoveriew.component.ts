import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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
  usageHistory?: any[]; // Add usage history for Rolls tab
}

interface SerialNumber {
  number: string;
  status: 'AVAILABLE' | 'USED' | 'DAMAGED';
  usedDate?: string;
  batchNumber?: string;
  productionLine?: string;
}

interface SerialRange {
  fromSerial: string;
  toSerial: string;
  count: number;
  status: 'AVAILABLE' | 'USED' | 'DAMAGED';
  description: string;
  usedDate?: string;
  damageDate?: string;
  referenceNo?: string; // Changed from batchNumber to referenceNo
  productionLine?: string;
  damageReason?: string;
  reportedBy?: string;
}

interface UsageEvent {
  startSerial: number;
  endSerial: number;
  count: number;
  status: 'AVAILABLE' | 'USED' | 'DAMAGED';
  description: string;
  date: string;
  referenceNo?: string; // Changed from batchNumber to referenceNo
  productionLine?: string;
  damageReason?: string;
  reportedBy?: string;
}

interface ProductionBatch {
  size: number;
  productName: string;
  referenceNo: string; // Changed from batchNumber to referenceNo
  productionLine: string;
}

interface DamageIncident {
  count: number;
  reason: string;
  reportedBy: string;
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
  serialRanges?: SerialRange[];
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
  referenceNo: string; // Changed from batchNumber to referenceNo
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
  referenceNo: string; // Changed from batchNumber to referenceNo
  brandName: string;
  fromSerial: string;
  toSerial: string;
  quantity: number;
  status: 'COMPLETED' | 'CANCELLED';
  completionDate: string;
  officer: string;
  requestReference?: string; // For backward compatibility
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





@Component({
  selector: 'app-hologramoveriew',
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramoveriew.component.html',
  styleUrl: './hologramoveriew.component.scss'
})
export class HologramoveriewComponent implements OnInit {
  activeTab: string = 'rolls';

  rollsData: HologramRoll[] = [];
  filteredRollsData: HologramRoll[] = []; // Filtered rolls data
  availableData: AvailableHologram[] = [];
  issuedData: IssuedHologram[] = [];
  historyData: HistoryHologram[] = [];


  // Serial Details Modal
  showSerialDetailsModal: boolean = false;
  selectedSerialData: SerialData | null = null;
  serialViewMode: 'all' | 'available' | 'used' | 'damaged' = 'all';
  currentSerialPage: number = 1;
  serialPageSize: number = 50;

  // Usage Details Modal
  showUsageDetailsModal: boolean = false;
  selectedRollForUsageRolls: HologramRoll | null = null; // For Rolls tab

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



  // Rolls Filters
  rollsFilters: {
    rollStatus: string;
    hologramType: string;
    dateFrom: string;
    dateTo: string;
    serialSearch: string;
  } = {
    rollStatus: '',
    hologramType: '',
    dateFrom: '',
    dateTo: '',
    serialSearch: ''
  };



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

  constructor(private route: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    this.loadRollsData();
    this.loadAvailableData();
    this.loadIssuedData();
    this.loadHistoryData();
    
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

    // Use only saved data (no sample data for clean testing)
    this.rollsData = sortedSavedRolls;
    // Apply filters after loading
    this.applyRollsFilters();
  }

  loadAvailableData() {
    // Load data from localStorage (saved by arrival process)
    const savedAvailable = JSON.parse(localStorage.getItem('hologramOverviewAvailable') || '[]');

    // Sort saved data by ID (newest first, since ID is timestamp-based)
    const sortedSavedAvailable = savedAvailable.sort((a: any, b: any) => {
      return b.id - a.id; // Higher ID (newer timestamp) first
    });

    // Use only saved data (no sample data for clean testing)
    this.availableData = sortedSavedAvailable;
  }

  loadIssuedData(): void {
    // Load issued holograms from localStorage (created by officer approval)
    const savedIssued = JSON.parse(localStorage.getItem('hologramOverviewIssued') || '[]');

    // Sort saved data by issue date (newest first)
    const sortedSavedIssued = savedIssued.sort((a: any, b: any) => {
      return new Date(b.issueDate || b.issuedDate || 0).getTime() - new Date(a.issueDate || a.issuedDate || 0).getTime();
    });

    // Use only saved data (no sample data for clean testing)
    this.issuedData = sortedSavedIssued;
  }

  loadHistoryData(): void {
    // Load history data from localStorage (created by officer approval)
    const savedHistory = JSON.parse(localStorage.getItem('hologramOverviewHistory') || '[]');
    
    // Sort saved data by issue date (newest first)
    const sortedSavedHistory = savedHistory.sort((a: any, b: any) => {
      return new Date(b.issueDate || b.date || 0).getTime() - new Date(a.issueDate || a.date || 0).getTime();
    });
    
    // Use only saved data (no sample data for clean testing)
    this.historyData = sortedSavedHistory;
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

  // Overview statistics calculated from Rolls tab data (NOT Serial Numbers Data)
  getTotalHolograms(): number {
    return this.rollsData.reduce((total, roll) => total + (roll.totalCount || 0), 0);
  }

  getTotalAvailable(): number {
    return this.rollsData.reduce((total, roll) => total + roll.availableCount, 0);
  }

  getTotalUsedInProduction(): number {
    return this.rollsData.reduce((total, roll) => total + roll.usedCount, 0);
  }

  getTotalDamagedWastage(): number {
    return this.rollsData.reduce((total, roll) => total + roll.damagedCount, 0);
  }

  // Helper method to calculate percentage safely
  getPercentage(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  getAvailableByType(type: 'LOCAL' | 'EXPORT' | 'DEFENCE'): number {
    return this.rollsData
      .filter(roll => roll.type === type)
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
    // Find the actual roll data from rollsData to get real counts
    const actualRoll = this.rollsData.find(roll => 
      roll.cartoonNumber === availableData.cartoonNumber && 
      roll.type === availableData.type
    );

    // If we have actual roll data, use it; otherwise use available data
    const totalCount = actualRoll ? actualRoll.totalCount : availableData.availableCount;
    const availableCount = actualRoll ? actualRoll.availableCount : availableData.availableCount;
    const usedCount = actualRoll ? actualRoll.usedCount : 0;
    const damagedCount = actualRoll ? actualRoll.damagedCount : 0;

    // Generate serial ranges based on ACTUAL data from daily register entries
    const serialRanges = this.generateRealSerialRanges(
      availableData.cartoonNumber,
      availableData.type,
      availableData.availableRange,
      totalCount,
      availableCount,
      usedCount,
      damagedCount
    );

    return {
      cartoonNumber: availableData.cartoonNumber,
      type: availableData.type,
      fromSerial: availableData.availableRange.split(' - ')[0],
      toSerial: availableData.availableRange.split(' - ')[1],
      totalCount: totalCount,
      availableCount: availableCount,
      usedCount: usedCount,
      damagedCount: damagedCount,
      serialNumbers: [], // Keep empty for backward compatibility
      serialRanges: serialRanges // New property for ranges
    };
  }

  generateSerialRanges(availableData: AvailableHologram): SerialRange[] {
    // Extract start and end numbers from serial range
    const fromMatch = availableData.availableRange.split(' - ')[0].match(/\d+/);
    const toMatch = availableData.availableRange.split(' - ')[1].match(/\d+/);

    if (!fromMatch || !toMatch) return [];

    const startNum = parseInt(fromMatch[0]);
    const endNum = parseInt(toMatch[0]);
    const prefix = availableData.availableRange.split(' - ')[0].replace(/\d+/, '');
    const totalCount = endNum - startNum + 1;

    // Calculate used and damaged counts based on realistic patterns
    const usedCount = Math.floor(totalCount * 0.6); // 60% used
    const damagedCount = Math.floor(totalCount * 0.1); // 10% damaged
    const actualAvailableCount = totalCount - usedCount - damagedCount;

    // Create realistic mixed usage pattern
    return this.generateRealisticMixedRanges(
      prefix, 
      startNum, 
      endNum, 
      totalCount,
      actualAvailableCount,
      usedCount,
      damagedCount
    );
  }

  generateRealisticMixedRanges(
    prefix: string, 
    startNum: number, 
    endNum: number, 
    totalCount: number,
    availableCount: number,
    usedCount: number,
    damagedCount: number
  ): SerialRange[] {
    const ranges: SerialRange[] = [];
    
    // Create usage events with realistic patterns
    const usageEvents = this.generateUsageEvents(startNum, endNum, availableCount, usedCount, damagedCount);
    
    // Sort events by serial number to process in order
    usageEvents.sort((a, b) => a.startSerial - b.startSerial);
    
    // Convert events to ranges
    for (const event of usageEvents) {
      const range: SerialRange = {
        fromSerial: prefix + event.startSerial.toString().padStart(6, '0'),
        toSerial: prefix + event.endSerial.toString().padStart(6, '0'),
        count: event.count,
        status: event.status,
        description: event.description
      };

      // Add additional properties based on status
      if (event.status === 'USED') {
        range.usedDate = event.date;
        range.referenceNo = event.referenceNo; // Changed from batchNumber to referenceNo
        range.productionLine = event.productionLine;
      } else if (event.status === 'DAMAGED') {
        range.damageDate = event.date;
        range.damageReason = event.damageReason;
        range.reportedBy = event.reportedBy;
      }

      ranges.push(range);
    }

    return ranges;
  }

  generateUsageEvents(startNum: number, endNum: number, availableCount: number, usedCount: number, damagedCount: number): UsageEvent[] {
    const events: UsageEvent[] = [];
    const totalRange = endNum - startNum + 1;
    
    // Create realistic usage timeline (last 90 days)
    const today = new Date();
    const usageDates = this.generateRealisticUsageDates(usedCount + damagedCount);
    
    let currentSerial = startNum;
    let eventIndex = 0;

    // Strategy: Create mixed patterns that reflect real-world usage
    
    // 1. Start with some available holograms (fresh stock)
    if (availableCount > 0) {
      const availableChunks = this.splitIntoChunks(availableCount, 1, 3); // 1-3 available chunks
      
      for (const chunkSize of availableChunks) {
        events.push({
          startSerial: currentSerial,
          endSerial: currentSerial + chunkSize - 1,
          count: chunkSize,
          status: 'AVAILABLE',
          description: 'Ready for production use',
          date: today.toISOString().split('T')[0]
        });
        currentSerial += chunkSize;
      }
    }

    // 2. Create realistic production usage patterns
    if (usedCount > 0) {
      const productionBatches = this.generateProductionBatches(usedCount);
      
      for (const batch of productionBatches) {
        if (currentSerial + batch.size - 1 <= endNum && eventIndex < usageDates.length) {
          events.push({
            startSerial: currentSerial,
            endSerial: currentSerial + batch.size - 1,
            count: batch.size,
            status: 'USED',
            description: `Production batch - ${batch.productName}`,
            date: usageDates[eventIndex],
            referenceNo: batch.referenceNo, // Changed from batchNumber to referenceNo
            productionLine: batch.productionLine
          });
          currentSerial += batch.size;
          eventIndex++;
        }
      }
    }

    // 3. Simulate damage incidents at various points
    if (damagedCount > 0) {
      const damageIncidents = this.generateDamageIncidents(damagedCount);
      
      for (const incident of damageIncidents) {
        if (currentSerial + incident.count - 1 <= endNum && eventIndex < usageDates.length) {
          events.push({
            startSerial: currentSerial,
            endSerial: currentSerial + incident.count - 1,
            count: incident.count,
            status: 'DAMAGED',
            description: incident.reason,
            date: usageDates[eventIndex],
            damageReason: incident.reason,
            reportedBy: incident.reportedBy
          });
          currentSerial += incident.count;
          eventIndex++;
        }
      }
    }

    // 4. Fill any remaining gaps with mixed available/used based on realistic patterns
    while (currentSerial <= endNum) {
      const remaining = endNum - currentSerial + 1;
      const chunkSize = Math.min(remaining, Math.floor(Math.random() * 50) + 10);
      
      // 70% chance of being used, 20% available, 10% damaged
      const rand = Math.random();
      let status: 'AVAILABLE' | 'USED' | 'DAMAGED';
      let description: string;
      
      if (rand < 0.7) {
        status = 'USED';
        description = 'Production batch - Mixed products';
      } else if (rand < 0.9) {
        status = 'AVAILABLE';
        description = 'Ready for production use';
      } else {
        status = 'DAMAGED';
        description = 'Quality control rejection';
      }

      events.push({
        startSerial: currentSerial,
        endSerial: currentSerial + chunkSize - 1,
        count: chunkSize,
        status: status,
        description: description,
        date: eventIndex < usageDates.length ? usageDates[eventIndex] : today.toISOString().split('T')[0]
      });
      
      currentSerial += chunkSize;
      eventIndex++;
    }

    return events;
  }

  generateProductionBatches(totalUsed: number): ProductionBatch[] {
    const batches: ProductionBatch[] = [];
    const productNames = [
      'Premium Whiskey 750ml',
      'Export Rum 1L', 
      'Local Brandy 750ml',
      'Special Edition Vodka 500ml',
      'Craft Beer 330ml',
      'Wine Collection 750ml'
    ];
    
    let remaining = totalUsed;
    let batchCounter = 1;
    
    while (remaining > 0) {
      const batchSize = Math.min(remaining, this.getRealisticBatchSize());
      const productName = productNames[Math.floor(Math.random() * productNames.length)];
      
      batches.push({
        size: batchSize,
        productName: productName,
        referenceNo: `REF-${String(batchCounter).padStart(3, '0')}`, // Changed from batchNumber to referenceNo
        productionLine: `LINE-${Math.floor(Math.random() * 5) + 1}`
      });
      
      remaining -= batchSize;
      batchCounter++;
    }
    
    return batches;
  }

  generateDamageIncidents(totalDamaged: number): DamageIncident[] {
    const incidents: DamageIncident[] = [];
    const damageReasons = [
      'Printing quality defects - Color bleeding',
      'Physical damage during transport',
      'Adhesive failure - Poor bonding',
      'Color mismatch - Batch variation', 
      'Cutting defects - Irregular edges',
      'Storage damage - Moisture exposure',
      'Quality control rejection - Specifications not met',
      'Machine malfunction damage',
      'Handling damage during inspection',
      'Temperature damage during storage'
    ];
    
    const inspectors = ['QC-001', 'QC-002', 'QC-003', 'PROD-MGR', 'SHIFT-SUP'];
    
    let remaining = totalDamaged;
    
    while (remaining > 0) {
      const incidentSize = Math.min(remaining, Math.floor(Math.random() * 25) + 5); // 5-30 damaged per incident
      
      incidents.push({
        count: incidentSize,
        reason: damageReasons[Math.floor(Math.random() * damageReasons.length)],
        reportedBy: inspectors[Math.floor(Math.random() * inspectors.length)]
      });
      
      remaining -= incidentSize;
    }
    
    return incidents;
  }

  getRealisticBatchSize(): number {
    // Realistic production batch sizes based on product type
    const batchSizes = [50, 75, 100, 150, 200, 250, 300, 500];
    return batchSizes[Math.floor(Math.random() * batchSizes.length)];
  }

  splitIntoChunks(total: number, minChunks: number, maxChunks: number): number[] {
    const numChunks = Math.min(maxChunks, Math.max(minChunks, Math.floor(Math.random() * maxChunks) + 1));
    const chunks: number[] = [];
    let remaining = total;
    
    for (let i = 0; i < numChunks - 1; i++) {
      const chunkSize = Math.floor(remaining / (numChunks - i)) + Math.floor(Math.random() * 20) - 10;
      const actualChunkSize = Math.max(1, Math.min(remaining - (numChunks - i - 1), chunkSize));
      chunks.push(actualChunkSize);
      remaining -= actualChunkSize;
    }
    
    if (remaining > 0) {
      chunks.push(remaining);
    }
    
    return chunks;
  }

  generateRealisticUsageDates(eventCount: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < eventCount; i++) {
      // Generate dates over the last 90 days with more recent activity
      const daysAgo = Math.floor(Math.pow(Math.random(), 2) * 90); // Weighted towards recent dates
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates.sort(); // Sort chronologically
  }



  setSerialViewMode(mode: 'all' | 'available' | 'used' | 'damaged'): void {
    this.serialViewMode = mode;
    this.currentSerialPage = 1;
  }

  getFilteredSerialNumbers(): SerialNumber[] {
    // This method is kept for backward compatibility but now returns empty
    // We use getFilteredSerialRanges() instead
    return [];
  }

  getFilteredSerialRanges(): SerialRange[] {
    if (!this.selectedSerialData || !this.selectedSerialData.serialRanges) return [];

    let filtered = this.selectedSerialData.serialRanges;

    // Filter by view mode
    if (this.serialViewMode !== 'all') {
      filtered = filtered.filter(range => {
        switch (this.serialViewMode) {
          case 'available':
            return range.status === 'AVAILABLE';
          case 'used':
            return range.status === 'USED';
          case 'damaged':
            return range.status === 'DAMAGED';
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

  getRangeStatusClass(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'range-available';
      case 'USED':
        return 'range-used';
      case 'DAMAGED':
        return 'range-damaged';
      default:
        return 'range-unknown';
    }
  }

  getRangeStatusIcon(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bi-check-circle-fill';
      case 'USED':
        return 'bi-arrow-up-circle-fill';
      case 'DAMAGED':
        return 'bi-exclamation-triangle-fill';
      default:
        return 'bi-question-circle-fill';
    }
  }

  getTotalSerialPages(): number {
    if (!this.selectedSerialData || !this.selectedSerialData.serialRanges) return 1;

    let totalItems = this.selectedSerialData.serialRanges.length;

    // Filter by view mode
    if (this.serialViewMode !== 'all') {
      totalItems = this.selectedSerialData.serialRanges.filter(range => {
        switch (this.serialViewMode) {
          case 'available':
            return range.status === 'AVAILABLE';
          case 'used':
            return range.status === 'USED';
          case 'damaged':
            return range.status === 'DAMAGED';
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



  // Rolls filter methods (same logic as Serial filters)
  applyRollsFilters(): void {
    this.filteredRollsData = this.rollsData.filter(roll => {
      if (this.rollsFilters.rollStatus && roll.status !== this.rollsFilters.rollStatus) {
        return false;
      }
      if (this.rollsFilters.hologramType && roll.type !== this.rollsFilters.hologramType) {
        return false;
      }
      if (this.rollsFilters.dateFrom) {
        const rollDate = new Date(roll.receivedDate);
        const filterDate = new Date(this.rollsFilters.dateFrom);
        if (rollDate < filterDate) {
          return false;
        }
      }
      if (this.rollsFilters.dateTo) {
        const rollDate = new Date(roll.receivedDate);
        const filterDate = new Date(this.rollsFilters.dateTo);
        if (rollDate > filterDate) {
          return false;
        }
      }
      if (this.rollsFilters.serialSearch &&
        !roll.fromSerial.toLowerCase().includes(this.rollsFilters.serialSearch.toLowerCase()) &&
        !roll.toSerial.toLowerCase().includes(this.rollsFilters.serialSearch.toLowerCase())) {
        return false;
      }
      return true;
    });
  }

  clearRollsFilters(): void {
    this.rollsFilters = {
      rollStatus: '',
      hologramType: '',
      dateFrom: '',
      dateTo: '',
      serialSearch: ''
    };
    this.applyRollsFilters();
  }

  hasActiveRollsFilters(): boolean {
    return !!(this.rollsFilters.rollStatus ||
      this.rollsFilters.hologramType ||
      this.rollsFilters.dateFrom ||
      this.rollsFilters.dateTo ||
      this.rollsFilters.serialSearch);
  }

  getRollsFilterSummary(): string {
    const filters = [];
    if (this.rollsFilters.rollStatus) filters.push(`Status: ${this.rollsFilters.rollStatus}`);
    if (this.rollsFilters.hologramType) filters.push(`Type: ${this.rollsFilters.hologramType}`);
    if (this.rollsFilters.serialSearch) filters.push(`Search: ${this.rollsFilters.serialSearch}`);

    return filters.length > 0 ?
      `Filtered by: ${filters.join(', ')} | Showing ${this.filteredRollsData.length} of ${this.rollsData.length} rolls` :
      `Showing all ${this.rollsData.length} rolls`;
  }



  // Rolls data summary methods (for Rolls tab)
  getTotalRollsForRollsTab(): number {
    return this.hasActiveRollsFilters() ? this.filteredRollsData.length : this.rollsData.length;
  }

  getAvailableHologramsForRollsTab(): number {
    const data = this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData;
    return data.reduce((total, roll) => total + roll.availableCount, 0);
  }

  getUsedInProductionForRollsTab(): number {
    const data = this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData;
    return data.reduce((total, roll) => total + roll.usedCount, 0);
  }

  getDamagedWastageForRollsTab(): number {
    const data = this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData;
    return data.reduce((total, roll) => total + roll.damagedCount, 0);
  }



  viewUsageDetailsForRoll(roll: HologramRoll): void {
    // Show usage details for roll from Rolls tab
    this.selectedRollForUsageRolls = roll;
    this.showUsageDetailsModal = true;
  }

  closeUsageDetailsModal(): void {
    this.showUsageDetailsModal = false;
    this.selectedRollForUsageRolls = null;
  }

  getUsageDetailsData() {
    // Handle HologramRoll (from Rolls tab)
    let roll: any = null;
    let rollType: 'rolls' = 'rolls';
    
    if (this.selectedRollForUsageRolls) {
      roll = this.selectedRollForUsageRolls;
      rollType = 'rolls';
    } else {
      return null;
    }

    const cartoonNumber = roll.rollNumber || roll.cartoonNumber;
    const hologramType = roll.hologramType || roll.type;

    // Primary source: usage history stored in hologramOverviewSerialData or hologramOverviewRolls
    const serialData = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');
    const rollsData = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
    
    // Try to find in serial data first (more detailed)
    let serialRoll = serialData.find((r: any) => 
      (r.rollNumber === cartoonNumber || r.cartoonNumber === cartoonNumber) && 
      (r.hologramType === hologramType || r.type === hologramType)
    );
    
    // If not found in serial data, try rolls data
    if (!serialRoll && rollType === 'rolls') {
      const rollData = rollsData.find((r: any) => 
        (r.cartoonNumber === cartoonNumber || r.rollNumber === cartoonNumber) && 
        (r.type === hologramType || r.hologramType === hologramType)
      );
      if (rollData && rollData.usageHistory) {
        serialRoll = rollData;
      }
    }

    const issuedDetails: any[] = [];
    const wastageDetails: any[] = [];

    if (serialRoll && Array.isArray(serialRoll.usageHistory)) {
      serialRoll.usageHistory.forEach((u: any) => {
        // Respect cartoonNumber routing; if present and doesn't match, skip
        if (u.cartoonNumber && u.cartoonNumber !== cartoonNumber) return;

        if (u.type === 'ISSUED') {
          const fromSerial = u.issuedFromSerial || u.fromSerial || '';
          const toSerial = u.issuedToSerial || u.toSerial || '';
          const quantity = u.issuedQuantity || u.quantity || 0;
          if (fromSerial && toSerial && quantity > 0) {
            issuedDetails.push({
              date: u.date || u.approvedAt,
              fromSerial,
              toSerial,
              quantity,
              brandName: u.brandName || 'N/A',
              referenceNo: u.referenceNo || 'N/A',
              officerName: u.approvedBy || 'Officer In Charge'
            });
          }
        } else if (u.type === 'WASTAGE' || u.type === 'DAMAGED') {
          const fromSerial = u.wastageFromSerial || u.fromSerial || '';
          const toSerial = u.wastageToSerial || u.toSerial || '';
          const quantity = u.wastageQuantity || u.quantity || 0;
          if (fromSerial && toSerial && quantity > 0) {
            wastageDetails.push({
              date: u.date || u.approvedAt,
              fromSerial,
              toSerial,
              quantity,
              reason: u.damageReason || 'Not specified',
              officerName: u.approvedBy || 'Officer In Charge',
              referenceNo: u.referenceNo || 'N/A'
            });
          }
        }
      });
    } else {
      // Fallback: derive from daily register entries (backward compatibility)
      const dailyEntries = JSON.parse(localStorage.getItem('hologramDailyEntries') || '[]');
      const approvedEntries = JSON.parse(localStorage.getItem('dailyRegisterEntries') || '[]');
      const allEntries = [...dailyEntries, ...approvedEntries];
      const relevantEntries = allEntries.filter((entry: any) => 
        (entry.cartoonNumber === cartoonNumber || entry.cartoonNumber === roll.rollNumber) && 
        (entry.hologramType === hologramType || entry.hologramType === roll.hologramType) &&
        (entry.isFixed === true || entry.approvalStatus === 'APPROVED')
      );

      relevantEntries.forEach((entry: any) => {
        if (entry.issuedEntries && entry.issuedEntries.length > 0) {
          entry.issuedEntries.forEach((issued: any) => {
            if (issued.fromSerial && issued.toSerial && issued.quantity > 0) {
              issuedDetails.push({
                date: entry.date,
                fromSerial: issued.fromSerial,
                toSerial: issued.toSerial,
                quantity: issued.quantity,
                brandName: entry.brandDetails?.brandName || 'N/A',
                referenceNo: entry.referenceNo || 'N/A',
                officerName: entry.officerName || 'System'
              });
            }
          });
        } else if (entry.issuedFromSerial && entry.issuedToSerial && entry.issuedQuantity > 0) {
          issuedDetails.push({
            date: entry.date,
            fromSerial: entry.issuedFromSerial,
            toSerial: entry.issuedToSerial,
            quantity: entry.issuedQuantity,
            brandName: entry.brandDetails?.brandName || 'N/A',
            referenceNo: entry.referenceNo || 'N/A',
            officerName: entry.officerName || 'System'
          });
        }

        if (entry.wastageEntries && entry.wastageEntries.length > 0) {
          entry.wastageEntries.forEach((wastage: any) => {
            if (wastage.fromSerial && wastage.toSerial && wastage.quantity > 0) {
              wastageDetails.push({
                date: entry.date,
                fromSerial: wastage.fromSerial,
                toSerial: wastage.toSerial,
                quantity: wastage.quantity,
                reason: wastage.damageReason || entry.damageReason || 'Not specified',
                officerName: entry.officerName || 'System',
                referenceNo: entry.referenceNo || 'N/A'
              });
            }
          });
        } else if (entry.wastageFromSerial && entry.wastageToSerial && entry.wastageQuantity > 0) {
          wastageDetails.push({
            date: entry.date,
            fromSerial: entry.wastageFromSerial,
            toSerial: entry.wastageToSerial,
            quantity: entry.wastageQuantity,
            reason: entry.damageReason || 'Not specified',
            officerName: entry.officerName || 'System',
            referenceNo: entry.referenceNo || 'N/A'
          });
        }
      });
    }

    const issuedSorted = issuedDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const wastageSorted = wastageDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      roll: roll,
      issuedDetails: issuedSorted,
      wastageDetails: wastageSorted,
      totalIssued: issuedSorted.reduce((sum, item) => sum + item.quantity, 0),
      totalWastage: wastageSorted.reduce((sum, item) => sum + item.quantity, 0)
    };
  }



  exportRollsData(): void {
    alert('Rolls data export functionality will be implemented with backend integration');
  }

  // Method to clear test data (for debugging)
  clearTestData(): void {
    if (confirm('⚠️ Clear ALL hologram data? This will remove everything and start fresh.\n\nThis includes:\n- All Rolls\n- Available Hologram Data\n- Serial Numbers Data\n- Issued Holograms\n- Issued History\n- Daily Register Entries\n\nAre you sure?')) {
      // Clear all hologram overview data
      localStorage.removeItem('hologramOverviewRolls');
      localStorage.removeItem('hologramOverviewAvailable');
      localStorage.removeItem('hologramOverviewSerialData');
      localStorage.removeItem('hologramOverviewIssued');
      localStorage.removeItem('hologramOverviewHistory');
      
      // Clear daily register and approval data
      localStorage.removeItem('dailyRegisterEntries');
      localStorage.removeItem('approvedHologramEntries');
      
      // Clear legacy keys
      localStorage.removeItem('issuedHolograms');
      localStorage.removeItem('hologramDailyEntries');
      
      // Clear all arrays to show empty state
      this.rollsData = [];
      this.availableData = [];
      this.issuedData = [];
      this.historyData = [];
      
      alert('✅ All hologram data cleared successfully!\n\nYou now have a fresh start. All tabs are empty.');
      
      console.log('=== ALL HOLOGRAM DATA CLEARED ===');
      console.log('Rolls:', this.rollsData.length);
      console.log('Available:', this.availableData.length);
      console.log('Issued:', this.issuedData.length);
      console.log('History:', this.historyData.length);
    }
  }

  // Helper method to check if an issued hologram is new (within last hour)
  isNewIssued(issued: IssuedHologram): boolean {
    const issueTime = new Date(issued.issueDate).getTime();
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return issueTime > oneHourAgo;
  }

  // Method to mark hologram as completed (NO LONGER USED - kept for backward compatibility)
  markAsCompleted(issued: IssuedHologram): void {
    if (confirm(`Mark request ${issued.referenceNo} as completed?`)) {
      issued.status = 'COMPLETED';
      
      // Update in localStorage
      const issuedHolograms = JSON.parse(localStorage.getItem('hologramOverviewIssued') || '[]');
      const index = issuedHolograms.findIndex((item: any) => item.id === issued.id);
      if (index !== -1) {
        issuedHolograms[index].status = 'COMPLETED';
        localStorage.setItem('hologramOverviewIssued', JSON.stringify(issuedHolograms));
      }
      
      alert(`Request ${issued.referenceNo} marked as completed!`);
    }
  }

  // Method to view issued hologram details
  viewIssuedDetails(issued: IssuedHologram): void {
    const details = `
Request Reference: ${issued.referenceNo}
Brand: ${issued.brandName}
Serial Range: ${issued.fromSerial} - ${issued.toSerial}
Quantity: ${issued.quantity}
Issue Date: ${new Date(issued.issueDate).toLocaleString()}
Status: ${issued.status}
Officer: ${issued.officer}
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

  /**
   * Generate real serial ranges based on actual daily register entries
   * This uses the actual data entered by users instead of simulated data
   */
  generateRealSerialRanges(
    cartoonNumber: string,
    hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE',
    availableRange: string,
    totalCount: number,
    availableCount: number,
    usedCount: number,
    damagedCount: number
  ): SerialRange[] {
    const ranges: SerialRange[] = [];

    // PRIMARY SOURCE: Load usage history from hologramOverviewSerialData
    // This is the most accurate source because it has the cartoonNumber stored with each range
    const serialData = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');
    const serialRoll = serialData.find((roll: any) => 
      roll.rollNumber === cartoonNumber && 
      roll.hologramType === hologramType
    );

    console.log('Generating real serial ranges for:', cartoonNumber, hologramType);
    console.log('Found serial roll:', serialRoll);

    // Use a Set to track unique ranges and prevent duplicates
    const processedRanges = new Set<string>();

    // NOTE: We do NOT include IN_PROGRESS issued holograms as USED here
    // because we don't know how many will actually be used, damaged, or leftover
    // until the officer in charge approves from the manufacturing register.
    // Only after approval will the usage history be updated with actual used/damaged ranges.

    // Also load daily register entries to supplement usage history (especially for wastage data)
    const dailyEntries = JSON.parse(localStorage.getItem('hologramDailyEntries') || '[]');
    const approvedEntries = JSON.parse(localStorage.getItem('dailyRegisterEntries') || '[]');
    const approvedHologramEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
    const allDailyEntries = [...dailyEntries, ...approvedEntries, ...approvedHologramEntries];
    
    // Filter entries for this specific cartoon number and type
    const relevantDailyEntries = allDailyEntries.filter((entry: any) => 
      entry.cartoonNumber === cartoonNumber && 
      entry.hologramType === hologramType &&
      (entry.isFixed === true || entry.approvalStatus === 'APPROVED')
    );

    // Process usage history from serial roll (this is the most accurate source)
    if (serialRoll && serialRoll.usageHistory && serialRoll.usageHistory.length > 0) {
      console.log('Using usage history from serial roll:', serialRoll.usageHistory.length, 'entries');
      console.log('Serial roll data:', {
        rollNumber: serialRoll.rollNumber,
        fromSerial: serialRoll.fromSerial,
        toSerial: serialRoll.toSerial,
        usageHistoryCount: serialRoll.usageHistory.length
      });
      console.log('Also checking daily register entries:', relevantDailyEntries.length, 'entries');
      
      // Extract the cartoon number's serial range to validate entries
      const rollFromSerial = serialRoll.fromSerial || '';
      const rollToSerial = serialRoll.toSerial || '';
      let rollStart = 0;
      let rollEnd = 0;
      
      if (rollFromSerial && rollToSerial) {
        const fromMatch = rollFromSerial.match(/(\d+)$/);
        const toMatch = rollToSerial.match(/(\d+)$/);
        if (fromMatch && toMatch) {
          rollStart = parseInt(fromMatch[1], 10);
          rollEnd = parseInt(toMatch[1], 10);
        }
      }
      
      serialRoll.usageHistory.forEach((historyEntry: any, index: number) => {
        console.log(`Processing history entry ${index}:`, historyEntry);
        
        // Only process entries that belong to this cartoon number
        // The cartoonNumber field was added in our fix to ensure correct routing
        // If cartoonNumber is present and doesn't match, skip it
        if (historyEntry.cartoonNumber && historyEntry.cartoonNumber !== cartoonNumber) {
          console.log('Skipping entry - belongs to different cartoon:', historyEntry.cartoonNumber, 'expected:', cartoonNumber);
          return; // Skip entries that don't belong to this cartoon number
        }

        // If cartoonNumber matches (or is not present for backward compatibility), trust it
        // Only validate by serial number range if cartoonNumber is not present (old data)
        let fromSerial = '';
        let toSerial = '';
        let quantity = 0;
        let isValid = true; // Default to valid if cartoonNumber matches

        if (historyEntry.type === 'ISSUED') {
          // Handle issued ranges
          fromSerial = historyEntry.issuedFromSerial || historyEntry.fromSerial || '';
          toSerial = historyEntry.issuedToSerial || historyEntry.toSerial || '';
          quantity = historyEntry.issuedQuantity || historyEntry.quantity || 0;

          if (!fromSerial || !toSerial || quantity <= 0) {
            isValid = false;
          } else if (!historyEntry.cartoonNumber) {
            // Only validate by serial number range if cartoonNumber is not present (old data)
            const fromMatch = fromSerial.match(/(\d+)$/);
            const toMatch = toSerial.match(/(\d+)$/);
            
            if (fromMatch && toMatch && rollStart > 0 && rollEnd > 0) {
              const fromNum = parseInt(fromMatch[1], 10);
              const toNum = parseInt(toMatch[1], 10);
              
              // Validate that the range overlaps with the cartoon number's range
              isValid = (fromNum >= rollStart && fromNum <= rollEnd) || 
                       (toNum >= rollStart && toNum <= rollEnd) ||
                       (fromNum <= rollStart && toNum >= rollEnd);
            }
          }
        } else if (historyEntry.type === 'WASTAGE' || historyEntry.type === 'DAMAGED') {
          // Handle wastage/damaged ranges
          fromSerial = historyEntry.wastageFromSerial || historyEntry.fromSerial || '';
          toSerial = historyEntry.wastageToSerial || historyEntry.toSerial || '';
          quantity = historyEntry.wastageQuantity || historyEntry.quantity || 0;

          if (!fromSerial || !toSerial || quantity <= 0) {
            isValid = false;
          } else if (!historyEntry.cartoonNumber) {
            // Only validate by serial number range if cartoonNumber is not present (old data)
            const fromMatch = fromSerial.match(/(\d+)$/);
            const toMatch = toSerial.match(/(\d+)$/);
            
            if (fromMatch && toMatch && rollStart > 0 && rollEnd > 0) {
              const fromNum = parseInt(fromMatch[1], 10);
              const toNum = parseInt(toMatch[1], 10);
              
              // Validate that the range overlaps with the cartoon number's range
              isValid = (fromNum >= rollStart && fromNum <= rollEnd) || 
                       (toNum >= rollStart && toNum <= rollEnd) ||
                       (fromNum <= rollStart && toNum >= rollEnd);
            }
          }
        } else {
          // Unknown type
          isValid = false;
        }

        if (isValid && fromSerial && toSerial && quantity > 0) {
          const rangeKey = historyEntry.type === 'ISSUED' 
            ? `USED-${fromSerial}-${toSerial}` 
            : `DAMAGED-${fromSerial}-${toSerial}`;
            
          if (!processedRanges.has(rangeKey)) {
            processedRanges.add(rangeKey);
            
            if (historyEntry.type === 'ISSUED') {
              ranges.push({
                fromSerial: fromSerial,
                toSerial: toSerial,
                count: quantity,
                status: 'USED',
                description: `Production batch - Used on ${new Date(historyEntry.date || historyEntry.approvedAt).toLocaleDateString()}`,
                usedDate: historyEntry.date || historyEntry.approvedAt,
                referenceNo: historyEntry.referenceNo || 'N/A',
                productionLine: historyEntry.brandName || 'N/A'
              });
              console.log('Added USED range:', fromSerial, '-', toSerial, 'quantity:', quantity);
            } else {
              // Try to get damage reason from daily register entry if not in history
              let damageReason = historyEntry.damageReason;
              if (!damageReason || damageReason.trim() === '') {
                // Fallback: try to find it from daily register entries
                const dailyEntries = JSON.parse(localStorage.getItem('hologramDailyEntries') || '[]');
                const approvedEntries = JSON.parse(localStorage.getItem('dailyRegisterEntries') || '[]');
                const approvedHologramEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
                const allEntries = [...dailyEntries, ...approvedEntries, ...approvedHologramEntries];
                
                const matchingEntry = allEntries.find((entry: any) => {
                  // Check if this entry matches the wastage range
                  if (entry.cartoonNumber !== cartoonNumber || entry.hologramType !== hologramType) {
                    return false;
                  }
                  
                  // Check wastageEntries array
                  if (entry.wastageEntries && entry.wastageEntries.length > 0) {
                    return entry.wastageEntries.some((w: any) => 
                      w.fromSerial === fromSerial && w.toSerial === toSerial
                    );
                  }
                  
                  // Check legacy wastage fields
                  return entry.wastageFromSerial === fromSerial && entry.wastageToSerial === toSerial;
                });
                
                if (matchingEntry) {
                  damageReason = matchingEntry.damageReason || matchingEntry.wastageEntries?.find((w: any) => 
                    w.fromSerial === fromSerial && w.toSerial === toSerial
                  )?.damageReason || '';
                }
              }
              
              ranges.push({
                fromSerial: fromSerial,
                toSerial: toSerial,
                count: quantity,
                status: 'DAMAGED',
                description: damageReason || 'Damaged during production',
                damageDate: historyEntry.date || historyEntry.approvedAt,
                damageReason: damageReason || 'Not specified',
                reportedBy: historyEntry.approvedBy || historyEntry.reportedBy || 'System',
                referenceNo: historyEntry.referenceNo || 'N/A', // Add reference number for damaged entries
                productionLine: historyEntry.brandName || 'N/A' // Add brand name for damaged entries
              });
              console.log('Added DAMAGED range:', fromSerial, '-', toSerial, 'quantity:', quantity, 'damageReason:', damageReason || 'Not specified', 'refNo:', historyEntry.referenceNo);
            }
          }
        } else {
          console.log('Skipping invalid entry:', historyEntry);
        }
      });
      
      console.log('Total ranges generated from usage history:', ranges.length);
      
      // SUPPLEMENT: Also check daily register entries for any wastage ranges that might not be in usage history
      // This ensures we capture all wastage data even if usage history is incomplete
      console.log('Supplementing with daily register entries for wastage data:', relevantDailyEntries.length, 'entries');
      
      relevantDailyEntries.forEach((entry: any) => {
        // Add wastage/damaged ranges from daily register (might not be in usage history yet)
        if (entry.wastageEntries && entry.wastageEntries.length > 0) {
          entry.wastageEntries.forEach((wastage: any) => {
            if (wastage.fromSerial && wastage.toSerial && wastage.quantity > 0) {
              const rangeKey = `DAMAGED-${wastage.fromSerial}-${wastage.toSerial}`;
              if (!processedRanges.has(rangeKey)) {
                processedRanges.add(rangeKey);
                ranges.push({
                  fromSerial: wastage.fromSerial,
                  toSerial: wastage.toSerial,
                  count: wastage.quantity,
                  status: 'DAMAGED',
                  description: wastage.damageReason || entry.damageReason || 'Damaged during production',
                  damageDate: entry.date,
                  damageReason: wastage.damageReason || entry.damageReason || 'Not specified',
                  reportedBy: entry.officerName || 'System',
                  referenceNo: entry.referenceNo || 'N/A'
                });
                console.log('Added DAMAGED range from daily register:', wastage.fromSerial, '-', wastage.toSerial, 'quantity:', wastage.quantity);
              }
            }
          });
        } else if (entry.wastageFromSerial && entry.wastageToSerial && entry.wastageQuantity > 0) {
          const rangeKey = `DAMAGED-${entry.wastageFromSerial}-${entry.wastageToSerial}`;
          if (!processedRanges.has(rangeKey)) {
            processedRanges.add(rangeKey);
            ranges.push({
              fromSerial: entry.wastageFromSerial,
              toSerial: entry.wastageToSerial,
              count: entry.wastageQuantity,
              status: 'DAMAGED',
              description: entry.damageReason || 'Damaged during production',
              damageDate: entry.date,
              damageReason: entry.damageReason || 'Not specified',
              reportedBy: entry.officerName || 'System',
              referenceNo: entry.referenceNo || 'N/A'
            });
            console.log('Added DAMAGED range from daily register (legacy):', entry.wastageFromSerial, '-', entry.wastageToSerial, 'quantity:', entry.wastageQuantity);
          }
        }
      });
    }

    // FALLBACK: If no usage history found, try daily register entries
    // This is for backward compatibility with older data
    if (ranges.length === 0) {
      console.log('No usage history found, falling back to daily register entries');
      
      // Use the already filtered relevantDailyEntries
      const relevantEntries = relevantDailyEntries;

      console.log('Found fallback entries:', relevantEntries.length);

      relevantEntries.forEach((entry: any) => {
        // Add issued ranges
        if (entry.issuedEntries && entry.issuedEntries.length > 0) {
          entry.issuedEntries.forEach((issued: any) => {
            if (issued.fromSerial && issued.toSerial && issued.quantity > 0) {
              const rangeKey = `USED-${issued.fromSerial}-${issued.toSerial}`;
              if (!processedRanges.has(rangeKey)) {
                processedRanges.add(rangeKey);
                ranges.push({
                  fromSerial: issued.fromSerial,
                  toSerial: issued.toSerial,
                  count: issued.quantity,
                  status: 'USED',
                  description: `Production batch - Used on ${new Date(entry.date).toLocaleDateString()}`,
                  usedDate: entry.date,
                  referenceNo: entry.referenceNo || 'N/A',
                  productionLine: entry.brandDetails?.brandName || 'N/A'
                });
              }
            }
          });
        } else if (entry.issuedFromSerial && entry.issuedToSerial && entry.issuedQuantity > 0) {
          const rangeKey = `USED-${entry.issuedFromSerial}-${entry.issuedToSerial}`;
          if (!processedRanges.has(rangeKey)) {
            processedRanges.add(rangeKey);
            ranges.push({
              fromSerial: entry.issuedFromSerial,
              toSerial: entry.issuedToSerial,
              count: entry.issuedQuantity,
              status: 'USED',
              description: `Production batch - Used on ${new Date(entry.date).toLocaleDateString()}`,
              usedDate: entry.date,
              referenceNo: entry.referenceNo || 'N/A',
              productionLine: entry.brandDetails?.brandName || 'N/A'
            });
          }
        }

        // Add wastage/damaged ranges
        if (entry.wastageEntries && entry.wastageEntries.length > 0) {
          entry.wastageEntries.forEach((wastage: any) => {
            if (wastage.fromSerial && wastage.toSerial && wastage.quantity > 0) {
              const rangeKey = `DAMAGED-${wastage.fromSerial}-${wastage.toSerial}`;
              if (!processedRanges.has(rangeKey)) {
                processedRanges.add(rangeKey);
                ranges.push({
                  fromSerial: wastage.fromSerial,
                  toSerial: wastage.toSerial,
                  count: wastage.quantity,
                  status: 'DAMAGED',
                  description: wastage.damageReason || entry.damageReason || 'Damaged during production',
                  damageDate: entry.date,
                  damageReason: wastage.damageReason || entry.damageReason || 'Not specified',
                  reportedBy: entry.officerName || 'System',
                  referenceNo: entry.referenceNo || 'N/A' // Add reference number for damaged entries
                });
              }
            }
          });
        } else if (entry.wastageFromSerial && entry.wastageToSerial && entry.wastageQuantity > 0) {
          const rangeKey = `DAMAGED-${entry.wastageFromSerial}-${entry.wastageToSerial}`;
          if (!processedRanges.has(rangeKey)) {
            processedRanges.add(rangeKey);
            ranges.push({
              fromSerial: entry.wastageFromSerial,
              toSerial: entry.wastageToSerial,
              count: entry.wastageQuantity,
              status: 'DAMAGED',
              description: entry.damageReason || 'Damaged during production',
              damageDate: entry.date,
              damageReason: entry.damageReason || 'Not specified',
              reportedBy: entry.officerName || 'System',
              referenceNo: entry.referenceNo || 'N/A' // Add reference number for damaged entries
            });
          }
        }
      });
    }

    // Calculate available ranges by finding GAPS between used/damaged ranges
    if (availableCount > 0 && availableRange) {
      const [rollFromSerial, rollToSerial] = availableRange.split(' - ');
      const prefix = rollFromSerial.replace(/\d+/, '');
      const rollStart = parseInt(rollFromSerial.match(/\d+/)?.[0] || '0');
      const rollEnd = parseInt(rollToSerial.match(/\d+/)?.[0] || '0');
      
      // Create a Set of all used/damaged serial numbers
      const usedSerials = new Set<number>();
      ranges.forEach(range => {
        const start = parseInt(range.fromSerial.match(/\d+/)?.[0] || '0');
        const end = parseInt(range.toSerial.match(/\d+/)?.[0] || '0');
        for (let i = start; i <= end; i++) {
          usedSerials.add(i);
        }
      });

      // Also exclude IN_PROGRESS issued holograms from available ranges
      // (but don't mark them as USED since we don't know final usage until approval)
      const issuedData = JSON.parse(localStorage.getItem('hologramOverviewIssued') || '[]');
      const inProgressIssued = issuedData.filter((issued: any) => 
        issued.status === 'IN_PROGRESS' &&
        issued.cartoonNumber === cartoonNumber &&
        (issued.hologramType === hologramType || !issued.hologramType)
      );

      inProgressIssued.forEach((issued: any) => {
        if (issued.fromSerial && issued.toSerial) {
          const start = parseInt(issued.fromSerial.match(/\d+/)?.[0] || '0');
          const end = parseInt(issued.toSerial.match(/\d+/)?.[0] || '0');
          for (let i = start; i <= end; i++) {
            usedSerials.add(i); // Exclude from available, but don't add as USED range
          }
          console.log('Excluding IN_PROGRESS range from available:', issued.fromSerial, '-', issued.toSerial);
        }
      });
      
      // Find gaps (available ranges)
      const availableRanges: SerialRange[] = [];
      let gapStart: number | null = null;
      
      for (let i = rollStart; i <= rollEnd; i++) {
        if (!usedSerials.has(i)) {
          // This serial is available
          if (gapStart === null) {
            gapStart = i; // Start of a new gap
          }
        } else {
          // This serial is used/damaged
          if (gapStart !== null) {
            // End of a gap - add it as an available range
            availableRanges.push({
              fromSerial: prefix + String(gapStart).padStart(6, '0'),
              toSerial: prefix + String(i - 1).padStart(6, '0'),
              count: i - gapStart,
              status: 'AVAILABLE',
              description: 'Ready for production use'
            });
            gapStart = null;
          }
        }
      }
      
      // Handle last gap if it extends to the end
      if (gapStart !== null) {
        availableRanges.push({
          fromSerial: prefix + String(gapStart).padStart(6, '0'),
          toSerial: prefix + String(rollEnd).padStart(6, '0'),
          count: rollEnd - gapStart + 1,
          status: 'AVAILABLE',
          description: 'Ready for production use'
        });
      }
      
      // Add all available ranges
      ranges.push(...availableRanges);
    }

    // Sort ranges by serial number
    ranges.sort((a, b) => {
      const aNum = parseInt(a.fromSerial.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.fromSerial.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });

    console.log('Generated ranges:', ranges);
    return ranges;
  }
}