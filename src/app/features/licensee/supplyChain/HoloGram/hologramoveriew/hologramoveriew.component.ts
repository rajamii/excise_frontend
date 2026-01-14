import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';

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
  available_range?: string; // Available serial ranges (e.g., "1-49, 101-300")
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
  brandDetails?: string;
  bottleSize?: string;
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
  
  // Serial Details Filters
  serialFilters: {
    brandReferenceNo: string;
    brandName: string;
    qty: number | null;
  } = {
    brandReferenceNo: '',
    brandName: '',
    qty: null
  };
  
  // Autocomplete suggestions
  brandReferenceNoSuggestions: string[] = [];
  brandNameSuggestions: string[] = [];

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

  constructor(private route: ActivatedRoute, private router: Router, private hologramService: HologramDataService) { }

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    // Load rolls data first (from API), then generate available/issued/history from it
    this.loadRollsData();
    // Note: loadAvailableData() is now called inside loadRollsData() after data is loaded
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
    // Load data from API (database) first
    this.hologramService.getRollsDetails().subscribe({
      next: (apiRolls) => {
        console.log('✅ Loaded rolls from API:', apiRolls);
        
        // Transform API data to component format
        this.rollsData = apiRolls.map((roll: any) => ({
          id: roll.id,
          cartoonNumber: roll.cartonNumber || roll.carton_number,
          type: roll.type as 'LOCAL' | 'EXPORT' | 'DEFENCE',
          fromSerial: roll.fromSerial || roll.from_serial,
          toSerial: roll.toSerial || roll.to_serial,
          totalCount: roll.totalCount || roll.total_count || 0,
          availableCount: roll.available || 0,
          usedCount: roll.used || 0,
          damagedCount: roll.damaged || 0,
          status: roll.status as 'AVAILABLE' | 'IN_USE' | 'COMPLETED' | 'DAMAGED',
          receivedDate: roll.receivedDate || roll.received_date,
          isNew: roll.isNew || roll.is_new || false,
          newUntil: roll.newUntil || roll.new_until,
          usageHistory: roll.usageHistory || roll.usage_history || [],
          available_range: roll.available_range || roll.availableRange // Add this field!
        }));
        
        // Sort by received date (newest first) and then by ID (newest first)
        this.rollsData.sort((a: any, b: any) => {
          const dateA = new Date(a.receivedDate || '2024-01-01').getTime();
          const dateB = new Date(b.receivedDate || '2024-01-01').getTime();
          
          if (dateB !== dateA) {
            return dateB - dateA; // Newer date first
          }
          
          return (b.id || 0) - (a.id || 0); // Newer ID first
        });
        
        // Also sync to localStorage for offline capability
        localStorage.setItem('hologramOverviewRolls', JSON.stringify(this.rollsData));
        
        // Apply filters after loading
        this.applyRollsFilters();
        
        // Generate available data from rolls
        this.loadAvailableData();
        
        console.log('📊 Rolls data loaded:', this.rollsData.length, 'rolls');
      },
      error: (error) => {
        console.error('❌ Error loading rolls from API:', error);
        
        // Fallback to localStorage if API fails
        const savedRolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
        this.rollsData = savedRolls.sort((a: any, b: any) => {
          const dateA = new Date(a.receivedDate || '2024-01-01').getTime();
          const dateB = new Date(b.receivedDate || '2024-01-01').getTime();
          
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          
          return (b.id || 0) - (a.id || 0);
        });
        
        this.applyRollsFilters();
        
        // Generate available data from rolls (even in fallback mode)
        this.loadAvailableData();
        
        console.log('⚠️ Using localStorage fallback:', this.rollsData.length, 'rolls');
      }
    });
  }

  loadAvailableData() {
    // Generate available data from rolls data (which is now loaded from API)
    // This ensures Available tab always reflects the current state from database
    this.availableData = this.rollsData
      .filter(roll => roll.availableCount > 0) // Only show rolls with available holograms
      .map(roll => {
        // Use available_range from backend if available
        let availableRange: string;
        let nextSerial: string;
        
        if (roll.available_range && roll.available_range !== 'None' && roll.available_range !== 'N/A') {
          // Use the available_range from backend (e.g., "101-1000" or "1-49, 101-300")
          availableRange = roll.available_range.replace(',', ' -'); // Format for display
          
          // Get the first available serial from the range
          const firstRange = roll.available_range.split(',')[0].trim();
          if (firstRange.includes('-')) {
            nextSerial = firstRange.split('-')[0].trim();
          } else {
            nextSerial = firstRange;
          }
        } else {
          // Fallback: Calculate manually
          const fromSerialNum = this.extractSerialNumber(roll.fromSerial);
          const prefix = roll.fromSerial.replace(/\d+$/, '');
          
          // Calculate next available serial (after used ones)
          const nextSerialNum = fromSerialNum + roll.usedCount + roll.damagedCount;
          nextSerial = prefix + nextSerialNum.toString().padStart(6, '0');
          
          // Available range is from next serial to end serial
          availableRange = `${nextSerial} - ${roll.toSerial}`;
        }
        
        // Calculate percentage of available
        const percentage = roll.totalCount > 0 
          ? (roll.availableCount / roll.totalCount) * 100 
          : 0;
        
        return {
          id: roll.id,
          cartoonNumber: roll.cartoonNumber,
          type: roll.type,
          availableRange: availableRange,
          availableCount: roll.availableCount,
          nextSerial: nextSerial,
          percentage: Math.round(percentage),
          status: roll.availableCount === roll.totalCount ? 'AVAILABLE' : 'IN_USE',
          isNew: roll.isNew,
          newUntil: roll.newUntil
        } as AvailableHologram;
      })
      .sort((a, b) => b.id - a.id); // Sort by ID (newest first)
    
    // Also sync to localStorage for offline capability
    localStorage.setItem('hologramOverviewAvailable', JSON.stringify(this.availableData));
    
    console.log('📊 Available data generated from rolls:', this.availableData.length, 'available');
  }
  
  // Helper method to extract serial number from serial string
  private extractSerialNumber(serial: string): number {
    const match = serial.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
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
    this.clearSerialFilters();
    this.brandReferenceNoSuggestions = [];
    this.brandNameSuggestions = [];
    this.showSerialDetailsModal = true;
  }

  closeSerialDetailsModal(): void {
    this.showSerialDetailsModal = false;
    this.selectedSerialData = null;
    this.serialViewMode = 'all';
    this.currentSerialPage = 1;
    this.clearSerialFilters();
  }
  
  clearSerialFilters(): void {
    this.serialFilters = {
      brandReferenceNo: '',
      brandName: '',
      qty: null
    };
  }
  
  applySerialFilters(): void {
    // Reset to first page when filters change
    this.currentSerialPage = 1;
  }
  
  getBrandReferenceNoSuggestions(): string[] {
    if (!this.selectedSerialData || !this.selectedSerialData.serialRanges) return [];
    
    // Extract unique brand reference numbers from serial ranges
    const uniqueRefs = new Set<string>();
    this.selectedSerialData.serialRanges.forEach(range => {
      if (range.referenceNo && range.referenceNo !== 'N/A') {
        uniqueRefs.add(range.referenceNo);
      }
    });
    
    return Array.from(uniqueRefs).sort();
  }
  
  getBrandNameSuggestions(): string[] {
    if (!this.selectedSerialData || !this.selectedSerialData.serialRanges) return [];
    
    // Extract unique brand names from serial ranges
    const uniqueBrands = new Set<string>();
    this.selectedSerialData.serialRanges.forEach(range => {
      if (range.brandDetails && range.brandDetails.trim() !== '') {
        uniqueBrands.add(range.brandDetails);
      }
      // Also check productionLine as it sometimes contains brand name
      if (range.productionLine && range.productionLine !== 'N/A' && !range.productionLine.startsWith('LINE-')) {
        uniqueBrands.add(range.productionLine);
      }
    });
    
    return Array.from(uniqueBrands).sort();
  }
  
  onBrandReferenceNoInput(): void {
    // Update suggestions based on input
    this.brandReferenceNoSuggestions = this.getBrandReferenceNoSuggestions().filter(ref =>
      ref.toLowerCase().includes(this.serialFilters.brandReferenceNo.toLowerCase())
    );
    this.applySerialFilters();
  }
  
  onBrandNameInput(): void {
    // Update suggestions based on input
    this.brandNameSuggestions = this.getBrandNameSuggestions().filter(brand =>
      brand.toLowerCase().includes(this.serialFilters.brandName.toLowerCase())
    );
    this.applySerialFilters();
  }
  
  selectBrandReferenceNo(ref: string): void {
    this.serialFilters.brandReferenceNo = ref;
    this.brandReferenceNoSuggestions = [];
    this.applySerialFilters();
  }
  
  selectBrandName(brand: string): void {
    this.serialFilters.brandName = brand;
    this.brandNameSuggestions = [];
    this.applySerialFilters();
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
    
    // Filter by brand reference no
    if (this.serialFilters.brandReferenceNo && this.serialFilters.brandReferenceNo.trim() !== '') {
      filtered = filtered.filter(range => 
        range.referenceNo && 
        range.referenceNo.toLowerCase().includes(this.serialFilters.brandReferenceNo.toLowerCase())
      );
    }
    
    // Filter by brand name
    if (this.serialFilters.brandName && this.serialFilters.brandName.trim() !== '') {
      filtered = filtered.filter(range => {
        const brandMatch = range.brandDetails && 
          range.brandDetails.toLowerCase().includes(this.serialFilters.brandName.toLowerCase());
        const productionLineMatch = range.productionLine && 
          range.productionLine.toLowerCase().includes(this.serialFilters.brandName.toLowerCase());
        return brandMatch || productionLineMatch;
      });
    }
    
    // Filter by quantity
    if (this.serialFilters.qty !== null && this.serialFilters.qty > 0) {
      filtered = filtered.filter(range => range.count === this.serialFilters.qty);
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
    
    // Filter by brand reference no
    if (this.serialFilters.brandReferenceNo && this.serialFilters.brandReferenceNo.trim() !== '') {
      filtered = filtered.filter(range => 
        range.referenceNo && 
        range.referenceNo.toLowerCase().includes(this.serialFilters.brandReferenceNo.toLowerCase())
      );
    }
    
    // Filter by brand name
    if (this.serialFilters.brandName && this.serialFilters.brandName.trim() !== '') {
      filtered = filtered.filter(range => {
        const brandMatch = range.brandDetails && 
          range.brandDetails.toLowerCase().includes(this.serialFilters.brandName.toLowerCase());
        const productionLineMatch = range.productionLine && 
          range.productionLine.toLowerCase().includes(this.serialFilters.brandName.toLowerCase());
        return brandMatch || productionLineMatch;
      });
    }
    
    // Filter by quantity
    if (this.serialFilters.qty !== null && this.serialFilters.qty > 0) {
      filtered = filtered.filter(range => range.count === this.serialFilters.qty);
    }

    return Math.ceil(filtered.length / this.serialPageSize);
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

    // PRIMARY SOURCE: Get usage history from rollsData (which comes from API)
    const roll = this.rollsData.find((r: any) => 
      r.cartoonNumber === cartoonNumber && 
      r.type === hologramType
    );

    console.log('Generating real serial ranges for:', cartoonNumber, hologramType);
    console.log('Found roll from API:', roll);

    // Use a Set to track unique ranges and prevent duplicates
    const processedRanges = new Set<string>();

    // Process usage history from roll (from API/database)
    if (roll && roll.usageHistory && roll.usageHistory.length > 0) {
      console.log('✅ Using usage history from API:', roll.usageHistory.length, 'entries');
      
      roll.usageHistory.forEach((historyEntry: any, index: number) => {
        console.log(`Processing history entry ${index}:`, historyEntry);
        
        // Only process entries that belong to this cartoon number
        if (historyEntry.cartoonNumber && historyEntry.cartoonNumber !== cartoonNumber) {
          console.log('Skipping entry - belongs to different cartoon:', historyEntry.cartoonNumber);
          return;
        }

        let fromSerial = '';
        let toSerial = '';
        let quantity = 0;
        let isValid = true;

        if (historyEntry.type === 'ISSUED') {
          // Handle issued ranges
          fromSerial = historyEntry.issuedFromSerial || historyEntry.fromSerial || '';
          toSerial = historyEntry.issuedToSerial || historyEntry.toSerial || '';
          quantity = historyEntry.issuedQuantity || historyEntry.quantity || 0;
          isValid = !!(fromSerial && toSerial && quantity > 0);
        } else if (historyEntry.type === 'WASTAGE' || historyEntry.type === 'DAMAGED') {
          // Handle wastage/damaged ranges
          fromSerial = historyEntry.wastageFromSerial || historyEntry.fromSerial || '';
          toSerial = historyEntry.wastageToSerial || historyEntry.toSerial || '';
          quantity = historyEntry.wastageQuantity || historyEntry.quantity || 0;
          isValid = !!(fromSerial && toSerial && quantity > 0);
        } else {
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
                productionLine: historyEntry.brandName || 'N/A',
                brandDetails: historyEntry.brandDetails || historyEntry.brandName || '',
                bottleSize: historyEntry.bottleSize || ''
              });
              console.log('✅ Added USED range:', fromSerial, '-', toSerial, 'quantity:', quantity);
            } else {
              ranges.push({
                fromSerial: fromSerial,
                toSerial: toSerial,
                count: quantity,
                status: 'DAMAGED',
                description: historyEntry.damageReason || 'Damaged during production',
                damageDate: historyEntry.date || historyEntry.approvedAt,
                damageReason: historyEntry.damageReason || 'Not specified',
                reportedBy: historyEntry.approvedBy || historyEntry.reportedBy || 'System',
                referenceNo: historyEntry.referenceNo || 'N/A',
                productionLine: historyEntry.brandName || 'N/A',
                brandDetails: historyEntry.brandDetails || '',
                bottleSize: historyEntry.bottleSize || ''
              });
              console.log('✅ Added DAMAGED range:', fromSerial, '-', toSerial, 'quantity:', quantity);
            }
          }
        } else {
          console.log('⚠️ Skipping invalid entry:', historyEntry);
        }
      });
      
      console.log('✅ Total ranges generated from usage history:', ranges.length);
    } else {
      console.log('⚠️ No usage history found in roll data');
    }
    
    // Add AVAILABLE range(s) if there are available holograms
    if (availableCount > 0 && roll) {
      // Use the available_range field from backend if available
      if (roll.available_range && roll.available_range !== 'None' && roll.available_range !== 'N/A') {
        console.log('✅ Using available_range from backend:', roll.available_range);
        
        // Parse comma-separated ranges (e.g., "1-49, 101-300")
        const rangeStrings = roll.available_range.split(',').map((s: string) => s.trim());
        
        for (const rangeStr of rangeStrings) {
          if (rangeStr.includes('-')) {
            const [from, to] = rangeStr.split('-');
            const fromNum = parseInt(from);
            const toNum = parseInt(to);
            const count = toNum - fromNum + 1;
            
            // Don't pad - use the numbers as-is from backend
            ranges.push({
              fromSerial: from,
              toSerial: to,
              count: count,
              status: 'AVAILABLE',
              description: 'Ready for production use'
            });
            
            console.log(`✅ Added AVAILABLE range: ${from} - ${to} (${count} units)`);
          }
        }
      } else {
        // Fallback: Calculate next available serial manually
        console.log('⚠️ No available_range from backend, using fallback calculation');
        const fromNum = this.extractSerialNumber(roll.fromSerial);
        const nextNum = fromNum + usedCount + damagedCount;
        const prefix = roll.fromSerial.replace(/\d+$/, '');
        
        const nextSerial = prefix + nextNum.toString().padStart(6, '0');
        
        ranges.push({
          fromSerial: nextSerial,
          toSerial: roll.toSerial,
          count: availableCount,
          status: 'AVAILABLE',
          description: 'Ready for production use'
        });
        
        console.log('✅ Added AVAILABLE range (fallback):', nextSerial, '-', roll.toSerial, 'quantity:', availableCount);
      }
    }
    
    // Sort ranges by from_serial
    ranges.sort((a, b) => {
      const aNum = this.extractSerialNumber(a.fromSerial);
      const bNum = this.extractSerialNumber(b.fromSerial);
      return aNum - bNum;
    });

    console.log('✅ Final ranges:', ranges.length, 'total');
    return ranges;
  }

  // Payment Slip Upload Tracking Methods
  
  /**
   * Upload payment slip for a specific type of hologram application
   */
  uploadPaymentSlipForType(refNo: string, procurementType: 'Local' | 'Export' | 'Defence', file: File): void {
    if (!file) {
      alert('Please select a file to upload');
      return;
    }

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File size exceeds 5MB. Please select a smaller file.');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please select a PDF, JPG, or PNG file.');
      return;
    }

    // Update payment slip tracking
    const slipTrackingKey = 'hologramPaymentSlipTracking';
    const slipTracking = JSON.parse(localStorage.getItem(slipTrackingKey) || '{}');
    
    if (!slipTracking[refNo]) {
      alert('Application not found');
      return;
    }

    // Add this type to uploaded types if not already there
    if (!slipTracking[refNo].uploadedTypes.includes(procurementType)) {
      slipTracking[refNo].uploadedTypes.push(procurementType);
    }

    // Store slip details
    slipTracking[refNo].slipDetails[procurementType] = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadDate: new Date().toISOString(),
      uploadedBy: 'Current User' // Replace with actual user
    };

    // Check if all required slips are uploaded
    const allUploaded = slipTracking[refNo].requiredTypes.every((type: string) => 
      slipTracking[refNo].uploadedTypes.includes(type)
    );

    slipTracking[refNo].allSlipsUploaded = allUploaded;
    slipTracking[refNo].commissionerVisible = allUploaded;

    localStorage.setItem(slipTrackingKey, JSON.stringify(slipTracking));

    // Update the application status in hologramApplications
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const appIndex = applications.findIndex((app: any) => 
      app.refNo === refNo && app.procurementType === procurementType
    );

    if (appIndex !== -1) {
      applications[appIndex].paymentSlipUploaded = true;
      applications[appIndex].paymentSlipUploadDate = new Date().toISOString();
      applications[appIndex].paymentSlipFileName = file.name;
      
      // Update status if all slips uploaded
      if (allUploaded) {
        applications[appIndex].status = 'Slip Uploaded - Pending Commissioner Approval';
      }
      
      localStorage.setItem('hologramApplications', JSON.stringify(applications));
    }

    // Show success message
    const message = allUploaded 
      ? `✅ Payment slip uploaded successfully for ${procurementType}!\n\nAll payment slips have been uploaded. This application is now visible to the Commissioner for approval.`
      : `✅ Payment slip uploaded successfully for ${procurementType}!\n\nRemaining types to upload: ${slipTracking[refNo].requiredTypes.filter((t: string) => !slipTracking[refNo].uploadedTypes.includes(t)).join(', ')}`;
    
    alert(message);

    // Reload data to reflect changes
    this.loadAllData();
  }

  /**
   * Get upload status for a reference number
   */
  getUploadStatus(refNo: string): any {
    const slipTrackingKey = 'hologramPaymentSlipTracking';
    const slipTracking = JSON.parse(localStorage.getItem(slipTrackingKey) || '{}');
    return slipTracking[refNo] || null;
  }

  /**
   * Check if a specific type has slip uploaded
   */
  isSlipUploadedForType(refNo: string, procurementType: string): boolean {
    const status = this.getUploadStatus(refNo);
    return status ? status.uploadedTypes.includes(procurementType) : false;
  }

  /**
   * Get applications that are ready for commissioner (all slips uploaded)
   */
  getApplicationsForCommissioner(): any[] {
    const slipTrackingKey = 'hologramPaymentSlipTracking';
    const slipTracking = JSON.parse(localStorage.getItem(slipTrackingKey) || '{}');
    
    return Object.values(slipTracking).filter((tracking: any) => 
      tracking.allSlipsUploaded && tracking.commissionerVisible
    );
  }

  /**
   * Get grouped applications by reference number with upload status
   */
  getGroupedApplicationsWithStatus(): any[] {
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const slipTrackingKey = 'hologramPaymentSlipTracking';
    const slipTracking = JSON.parse(localStorage.getItem(slipTrackingKey) || '{}');
    
    // Group by reference number
    const grouped: { [key: string]: any } = {};
    
    applications.forEach((app: any) => {
      if (!grouped[app.refNo]) {
        grouped[app.refNo] = {
          refNo: app.refNo,
          date: app.date,
          companyName: app.companyName,
          types: [],
          uploadStatus: slipTracking[app.refNo] || {
            totalTypes: 0,
            uploadedTypes: [],
            allSlipsUploaded: false
          }
        };
      }
      
      grouped[app.refNo].types.push({
        type: app.procurementType,
        quantity: app.totalQtyLakh,
        slipUploaded: app.paymentSlipUploaded || false,
        uploadDate: app.paymentSlipUploadDate,
        fileName: app.paymentSlipFileName
      });
    });
    
    return Object.values(grouped);
  }
}
