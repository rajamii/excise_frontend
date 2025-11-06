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

interface SerialRange {
  fromSerial: string;
  toSerial: string;
  count: number;
  status: 'AVAILABLE' | 'USED' | 'DAMAGED';
  description: string;
  usedDate?: string;
  damageDate?: string;
  batchNumber?: string;
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
  batchNumber?: string;
  productionLine?: string;
  damageReason?: string;
  reportedBy?: string;
}

interface ProductionBatch {
  size: number;
  productName: string;
  batchNumber: string;
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
    // Generate range-based data instead of individual serial numbers
    const serialRanges = this.generateSerialRanges(availableData);

    return {
      cartoonNumber: availableData.cartoonNumber,
      type: availableData.type,
      fromSerial: availableData.availableRange.split(' - ')[0],
      toSerial: availableData.availableRange.split(' - ')[1],
      totalCount: serialRanges.reduce((sum, range) => sum + range.count, 0),
      availableCount: serialRanges.filter(r => r.status === 'AVAILABLE').reduce((sum, range) => sum + range.count, 0),
      usedCount: serialRanges.filter(r => r.status === 'USED').reduce((sum, range) => sum + range.count, 0),
      damagedCount: serialRanges.filter(r => r.status === 'DAMAGED').reduce((sum, range) => sum + range.count, 0),
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
        range.batchNumber = event.batchNumber;
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
            batchNumber: batch.batchNumber,
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
        batchNumber: `BATCH-${String(batchCounter).padStart(3, '0')}`,
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