import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';
import { Subscription } from 'rxjs';
import { SupplyChainProfileService } from '../../../../../core/services/supply-chain-profile.service';

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
  receivedBy?: string;
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
  updatedBy?: string;
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
  status: 'AVAILABLE' | 'IN_USE' | 'COMPLETED';
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
  requestReference: string; // Request reference number
  cartoonNumber: string; // Carton number
  totalRollsAssigned: number; // Total quantity allocated
  serialRange: string; // Serial range (e.g., "1-200")
  brandName: string; // Brand details
  bottleSize: string; // Bottle size in ML (e.g., "750ml")
  qtyUsed: number; // Quantity used in production
  qtyDamaged: number; // Quantity damaged/wasted
  qtyLeftover: number; // Quantity left over (available - used - damaged)
  brandDetailsList?: HistoryBrandDetail[];
  status: 'COMPLETED' | 'CANCELLED';
  completionDate: string; // When the daily register was approved
  officer?: string; // Officer who approved
  hologramType?: 'LOCAL' | 'EXPORT' | 'DEFENCE';
}

interface HistoryBrandDetail {
  brandName: string;
  bottleSize: string;
  cartonNumber: string;
  serialRanges: string;
  qtyUsed: number;
  qtyDamaged: number;
  qtyLeftover: number;
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

interface TabDateFilters {
  month: string;
  dateFrom: string;
  dateTo: string;
}





@Component({
  selector: 'app-hologramoveriew',
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramoveriew.component.html',
  styleUrl: './hologramoveriew.component.scss'
})
export class HologramoveriewComponent implements OnInit, OnDestroy {
  activeTab: string = 'rolls';
  establishmentName: string = '';
  establishmentLicenseeId: string = '';
  establishmentDisplay: string = '';

  rollsData: HologramRoll[] = [];
  filteredRollsData: HologramRoll[] = []; // Filtered rolls data
  availableData: AvailableHologram[] = [];
  filteredAvailableData: AvailableHologram[] = [];
  issuedData: IssuedHologram[] = [];
  filteredIssuedData: IssuedHologram[] = [];
  historyData: HistoryHologram[] = [];
  filteredHistoryData: HistoryHologram[] = [];
  private savedDailyRegisterEntries: any[] = [];
  showHistoryBrandsModal: boolean = false;
  selectedHistoryForBrands: HistoryHologram | null = null;

  // Subscription management
  private requestUpdateSubscription?: Subscription;
  private dailyRegisterUpdateSubscription?: Subscription;


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
    rollRange: string;
  } = {
      brandReferenceNo: '',
      brandName: '',
      qty: null,
      rollRange: ''
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
    month: string;
    dateFrom: string;
    dateTo: string;
    serialSearch: string;
  } = {
      rollStatus: '',
      hologramType: '',
      month: '',
      dateFrom: '',
      dateTo: '',
      serialSearch: ''
    };

  // Month/Date filters for other overview tabs
  availableFilters: TabDateFilters = { month: '', dateFrom: '', dateTo: '' };
  issuedFilters: TabDateFilters = { month: '', dateFrom: '', dateTo: '' };
  historyFilters: TabDateFilters = { month: '', dateFrom: '', dateTo: '' };

  // Table pagination (Rolls / Available / Issued / History)
  readonly tablePageSizeOptions: number[] = [5, 10, 15];

  rollsTablePage = 1;
  rollsTablePageSize = 5;

  availableTablePage = 1;
  availableTablePageSize = 5;

  issuedTablePage = 1;
  issuedTablePageSize = 5;

  historyTablePage = 1;
  historyTablePageSize = 5;



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

  private parseDateInputLocal(value: string): Date | null {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // HTML date input emits yyyy-mm-dd
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return this.tryParseAnyDate(raw);

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, monthIndex, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private tryParseAnyDate(value: any): Date | null {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // Common "dd-MMM-yyyy" (e.g. 17-Apr-2026)
    const dmy = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (dmy) {
      const day = Number(dmy[1]);
      const mon = dmy[2].toLowerCase();
      const year = Number(dmy[3]);
      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const monthIndex = monthMap[mon];
      if (monthIndex === undefined) return null;
      const date = new Date(year, monthIndex, day);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private matchesTabDateFilters(date: Date | null, filters: TabDateFilters): boolean {
    if (!date) return false;

    if (filters.month) {
      const monthValue = String(date.getMonth() + 1).padStart(2, '0');
      if (monthValue !== String(filters.month)) return false;
    }

    const from = this.parseDateInputLocal(filters.dateFrom);
    if (from) {
      const fromStart = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0);
      if (date.getTime() < fromStart.getTime()) return false;
    }

    const to = this.parseDateInputLocal(filters.dateTo);
    if (to) {
      const toEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
      if (date.getTime() > toEnd.getTime()) return false;
    }

    return true;
  }

  private paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
    const safePageSize = Math.max(1, Number(pageSize) || 1);
    const totalPages = Math.max(1, Math.ceil((rows?.length || 0) / safePageSize));
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = (safePage - 1) * safePageSize;
    return (rows || []).slice(start, start + safePageSize);
  }

  private getPaginationLabel(totalRows: number, page: number, pageSize: number): string {
    const total = Math.max(0, Number(totalRows) || 0);
    const size = Math.max(1, Number(pageSize) || 1);
    const totalPages = Math.max(1, Math.ceil(total / size));
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = total === 0 ? 0 : (safePage - 1) * size + 1;
    const end = total === 0 ? 0 : Math.min(safePage * size, total);
    return `${start}\u2013${end} of ${total} \u2022 Page ${safePage} of ${totalPages}`;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hologramService: HologramDataService,
    private profileService: SupplyChainProfileService
  ) { }

  ngOnInit() {
    this.loadEstablishmentInfo();
    this.loadAllData();

    // Subscribe to request updates from other components
    this.requestUpdateSubscription = this.hologramService.requestUpdate$.subscribe(() => {
      console.log('📢 Received request update notification - reloading issued data');
      this.loadIssuedData();
      this.loadRollsData(); // Also reload rolls to update available counts
    });

    // Subscribe to daily register updates from other components
    this.dailyRegisterUpdateSubscription = this.hologramService.dailyRegisterUpdate$.subscribe(() => {
      console.log('📢 Received daily register update notification - reloading history data');
      this.loadHistoryData();
      this.loadRollsData(); // Also reload rolls to update available counts
    });
  }

  ngOnDestroy() {
    // Clean up subscriptions
    if (this.requestUpdateSubscription) {
      this.requestUpdateSubscription.unsubscribe();
    }
    if (this.dailyRegisterUpdateSubscription) {
      this.dailyRegisterUpdateSubscription.unsubscribe();
    }
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

  goBack() {
    // Navigate back to the previous page
    window.history.back();
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
          receivedBy: (() => {
            const picked = this.pickDisplayOfficer(
              roll.received_by_name,
              roll.receivedByName,
              roll.received_by_display_name,
              roll.receivedByDisplayName,
              roll.received_by_username,
              roll.receivedByUsername
            );
            return picked === 'Pending' ? '' : picked;
          })(),
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
        this.resolveEstablishmentFromRolls(this.rollsData);

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
        this.resolveEstablishmentFromRolls(this.rollsData);

        // Generate available data from rolls (even in fallback mode)
        this.loadAvailableData();

        console.log('⚠️ Using localStorage fallback:', this.rollsData.length, 'rolls');
      }
    });
  }

  private loadEstablishmentInfo(): void {
    this.profileService.getProfile().subscribe({
      next: (response) => {
        const data = response?.data;
        if (!data) {
          return;
        }

        this.establishmentName = (data.manufacturingUnitName || '').toString().trim();
        this.establishmentLicenseeId = (data.licenseeId || '').toString().trim();
        this.updateEstablishmentDisplay();
      },
      error: () => {
        // Fallback from login payload if profile endpoint is unavailable
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
          return;
        }

        try {
          const user = JSON.parse(storedUser);
          this.establishmentName = (
            user?.manufacturingUnitName ||
            user?.manufacturing_unit_name ||
            user?.establishmentName ||
            this.establishmentName
          ).toString().trim();
          this.establishmentLicenseeId = (
            user?.licenseeId ||
            user?.licensee_id ||
            this.establishmentLicenseeId
          ).toString().trim();
          this.updateEstablishmentDisplay();
        } catch {
          // no-op
        }
      }
    });
  }

  private resolveEstablishmentFromRolls(rolls: any[]): void {
    if (!Array.isArray(rolls) || !rolls.length) {
      return;
    }

    const firstRollWithNames = rolls.find((roll: any) =>
      roll?.manufacturing_unit ||
      roll?.manufacturingUnit ||
      roll?.licensee_name ||
      roll?.licenseeName
    );
    const firstRollWithLicense = rolls.find((roll: any) =>
      roll?.licensee_code || roll?.licenseeCode || roll?.license_id || roll?.licenseId
    );

    if (!this.establishmentName && firstRollWithNames) {
      this.establishmentName = (
        firstRollWithNames.manufacturing_unit ||
        firstRollWithNames.manufacturingUnit ||
        firstRollWithNames.licensee_name ||
        firstRollWithNames.licenseeName ||
        ''
      ).toString().trim();
    }

    if (!this.establishmentLicenseeId && firstRollWithLicense) {
      this.establishmentLicenseeId = (
        firstRollWithLicense.licensee_code ||
        firstRollWithLicense.licenseeCode ||
        firstRollWithLicense.license_id ||
        firstRollWithLicense.licenseId ||
        ''
      ).toString().trim();
    }

    this.updateEstablishmentDisplay();
  }

  private updateEstablishmentDisplay(): void {
    if (this.establishmentName && this.establishmentLicenseeId) {
      this.establishmentDisplay = `${this.establishmentName} (${this.establishmentLicenseeId})`;
      return;
    }
    if (this.establishmentName) {
      this.establishmentDisplay = this.establishmentName;
      return;
    }
    if (this.establishmentLicenseeId) {
      this.establishmentDisplay = this.establishmentLicenseeId;
      return;
    }
    this.establishmentDisplay = '';
  }

  loadAvailableData() {
    // Generate available data from rolls data (which is now loaded from API)
    // This ensures Available tab always reflects the current state from database
    // CRITICAL FIX: Show ALL rolls (including fully used ones) so users can see usage history
    this.availableData = this.rollsData
      .map(roll => {
        // Use available_range from backend if available
        let availableRange: string;
        let nextSerial: string;

        // CRITICAL FIX: Handle completed rolls (availableCount = 0)
        if (roll.availableCount === 0 || roll.status === 'COMPLETED') {
          // Roll is fully used - show "None" for available range
          availableRange = 'None (Fully Used)';
          nextSerial = '-';
        } else if (roll.available_range && roll.available_range !== 'None' && roll.available_range !== 'N/A') {
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

        // Determine display status dynamically based on database status
        // AVAILABLE: Roll has holograms available and is not assigned to any request
        // IN_USE: Roll is assigned to a request (after allocation, before/during Daily Register)
        // COMPLETED: Roll has no holograms left (availableCount = 0)
        let displayStatus: 'AVAILABLE' | 'IN_USE' | 'COMPLETED' = 'AVAILABLE';

        // Use the status from database (backend manages this)
        if (roll.status === 'COMPLETED' || roll.availableCount === 0) {
          // Roll is fully used - show as COMPLETED so users can see usage history
          displayStatus = 'COMPLETED';
        } else if (roll.status === 'IN_USE') {
          // Roll is assigned to a request
          displayStatus = 'IN_USE';
        } else {
          // Roll is AVAILABLE (has holograms and not assigned)
          displayStatus = 'AVAILABLE';
        }

        return {
          id: roll.id,
          cartoonNumber: roll.cartoonNumber,
          type: roll.type,
          availableRange: availableRange,
          availableCount: roll.availableCount,
          nextSerial: nextSerial,
          percentage: Math.round(percentage),
          status: displayStatus,
          isNew: roll.isNew,
          newUntil: roll.newUntil
        } as AvailableHologram;
      })
      .sort((a, b) => b.id - a.id); // Sort by ID (newest first)

    // Also sync to localStorage for offline capability
    localStorage.setItem('hologramOverviewAvailable', JSON.stringify(this.availableData));

    this.applyAvailableFilters();

    console.log('📊 Available data generated from rolls:', this.availableData.length, 'available');
  }

  // Helper method to extract serial number from serial string
  private extractSerialNumber(serial: string): number {
    const match = serial.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
  }

  loadIssuedData(): void {
    // Load issued holograms from database (requests with rolls_assigned populated)
    // These are requests in "In Use" status (after allocation, before daily register completion)

    console.log('🔍 Loading issued data...');
    console.log('🔍 Current issuedData length:', this.issuedData.length);
    console.log('🔍 Calling hologramService.getRequestsWithAllocatedRolls()...');

    this.hologramService.getRequestsWithAllocatedRolls().subscribe({
      next: (requests) => {
        console.log('✅ Loaded requests with allocated rolls:', requests);
        console.log('📊 Total requests received:', requests.length);

        // Log each request for debugging
        requests.forEach((req: any, index: number) => {
          console.log(`Request ${index + 1}:`, {
            id: req.id,
            ref_no: req.ref_no || req.refNo,
            status: req.status,
            current_stage: req.current_stage,
            issued_assets: req.issued_assets,
            rolls_assigned: req.rolls_assigned,
            issued_assets_length: req.issued_assets?.length || 0,
            rolls_assigned_length: req.rolls_assigned?.length || 0
          });
        });

        // Transform API data to IssuedHologram format
        // Group multiple rolls by reference number (one row per request)
        this.issuedData = [];

        requests.forEach((request: any) => {
          // CRITICAL FIX: Use rolls_assigned which contains the actual allocated ranges from backend
          // rolls_assigned is populated during allocation with the exact ranges that were allocated (e.g., 4-4, 7-7)
          // available_cartons contains full roll ranges from procurement (e.g., 101-101, 102-102) - NOT what we want
          const rollsData = request.rolls_assigned || request.rollsAssigned || request.issued_assets || request.issuedAssets || [];

          console.log(`Processing request ${request.ref_no || request.refNo}:`, {
            rollsDataCount: rollsData.length,
            rollsData: rollsData,
            source: 'rolls_assigned (TRUE ALLOCATED RANGES)'
          });

          if (rollsData.length === 0) {
            console.warn(`⚠️ Request ${request.ref_no || request.refNo} has no rolls assigned`);
            return;
          }

          // Collect all carton numbers and serial ranges for this request
          const cartoonNumbers: string[] = [];
          const serialRanges: string[] = [];
          let totalQuantity = 0;

          rollsData.forEach((roll: any) => {
            const cartoonNumber = roll.cartoonNumber || roll.cartoon_number || roll.cartonNumber || '';
            const fromSerial = roll.fromSerial || roll.from_serial || '';
            const toSerial = roll.toSerial || roll.to_serial || '';
            const quantity = roll.count || roll.quantity || 0;

            console.log(`  Roll:`, {
              cartoonNumber,
              fromSerial,
              toSerial,
              quantity
            });

            if (cartoonNumber) {
              cartoonNumbers.push(cartoonNumber);
            }

            if (fromSerial && toSerial) {
              serialRanges.push(`${fromSerial}-${toSerial}`);
            }

            totalQuantity += quantity;
          });

          console.log(`  Collected:`, {
            cartoonNumbers,
            serialRanges,
            totalQuantity
          });

          // Determine status based on request stage
          const stageName = request.status || request.current_stage?.name || '';
          let status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' = 'IN_PROGRESS';

          if (stageName.includes('Production Completed') || stageName.includes('Completed')) {
            status = 'COMPLETED';
          } else if (stageName.includes('Cancelled') || stageName.includes('Rejected')) {
            status = 'CANCELLED';
          }

          console.log(`  Status: ${stageName} → ${status}`);

          // Skip COMPLETED and CANCELLED requests - they should be in History tab
          if (status === 'COMPLETED' || status === 'CANCELLED') {
            console.log(`  ⏭️ Skipping ${status} request - belongs in History tab`);
            return;
          }

          // Create one entry per request with comma-separated values
          const entry = {
            id: request.id,
            referenceNo: request.ref_no || request.refNo || '',
            brandName: 'N/A', // Not needed for this view
            fromSerial: serialRanges.join(', '), // Comma-separated ranges
            toSerial: '', // Not used when showing multiple ranges
            quantity: totalQuantity,
            issueDate: request.submission_date || request.submissionDate || new Date().toISOString(),
            status: status,
            officer: '', // Removed
            requestReference: request.ref_no || request.refNo || '',
            hologramType: request.hologram_type || request.hologramType || 'LOCAL',
            cartoonNumber: cartoonNumbers.join(', ') // Comma-separated carton numbers
          };

          console.log(`  Created entry:`, entry);

          this.issuedData.push(entry);
        });

        // Sort by issue date (newest first)
        this.issuedData.sort((a, b) => {
          return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
        });

        this.applyIssuedFilters();

        console.log('📊 Issued data loaded:', this.issuedData.length, 'entries (grouped by reference)');
        console.log('📋 Final issuedData:', this.issuedData);
      },
      error: (error) => {
        console.error('❌ Error loading issued data:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url
        });
        this.issuedData = [];
        this.applyIssuedFilters();
      }
    });
  }

  loadHistoryData(): void {
    // Load history data from backend (saved daily register entries)
    // These are entries that have been saved (is_fixed=True)
    // They appear immediately after "Save Entry" is clicked

    console.log('🔍 Loading history data from API...');

    this.hologramService.getDailyRegisterEntries().subscribe({
      next: (entries) => {
        console.log('✅ Loaded daily register entries:', entries);
        console.log('📊 Total entries received:', entries.length);

        // Filter for SAVED entries (is_fixed=True)
        // Show entries immediately after "Save Entry" is clicked
        const savedEntries = entries.filter((entry: any) =>
          (entry.is_fixed === true || entry.isFixed === true)
        );
        this.savedDailyRegisterEntries = savedEntries;

        console.log('📊 Saved entries (is_fixed=true):', savedEntries.length);

        // Group entries by request reference (multiple rolls per request)
        const groupedByRequest = new Map<string, any[]>();

        savedEntries.forEach((entry: any) => {
          const refNo = entry.reference_no || entry.referenceNo || 'N/A';
          if (!groupedByRequest.has(refNo)) {
            groupedByRequest.set(refNo, []);
          }
          groupedByRequest.get(refNo)!.push(entry);
        });

        console.log('📊 Grouped by request:', groupedByRequest.size, 'requests');

        // Transform to HistoryHologram format (one row per request)
        this.historyData = Array.from(groupedByRequest.entries()).map(([refNo, requestEntries]) => {
          // Collect data from all entries for this request
          const cartoonNumbers: string[] = [];
          const serialRanges: string[] = [];
          let totalQty = 0;
          let totalUsed = 0;
          let totalDamaged = 0;
          let brandName = 'N/A';
          let bottleSize = 'N/A';
          let usageDate = '';
          let approvalStatus = 'PENDING';
          let approvedAt = '';
          let approvedBy = 'Pending';
          let hologramType = 'LOCAL';

          requestEntries.forEach((entry: any) => {
            // Carton number from roll_range or cartoon_number
            const cartoonNumber = entry.cartoon_number || entry.cartoonNumber ||
              entry.roll_range || entry.rollRange || 'N/A';
            if (cartoonNumber && cartoonNumber !== 'N/A' && !cartoonNumbers.includes(cartoonNumber)) {
              cartoonNumbers.push(cartoonNumber);
            }

            // Serial ranges from issued_ranges (JSON array)
            const issuedRanges = entry.issued_ranges || entry.issuedRanges || [];
            if (Array.isArray(issuedRanges) && issuedRanges.length > 0) {
              issuedRanges.forEach((range: any) => {
                const fromSerial = range.fromSerial || range.from_serial || range.from || '';
                const toSerial = range.toSerial || range.to_serial || range.to || '';
                if (fromSerial && toSerial) {
                  serialRanges.push(`${fromSerial}-${toSerial}`);
                }
              });
            } else {
              // Fallback to issued_from and issued_to
              const issuedFrom = entry.issued_from || entry.issuedFrom || '';
              const issuedTo = entry.issued_to || entry.issuedTo || '';
              if (issuedFrom && issuedTo) {
                serialRanges.push(`${issuedFrom}-${issuedTo}`);
              }
            }

            // Also add wastage ranges if they exist
            const wastageRanges = entry.wastage_ranges || entry.wastageRanges || [];
            if (Array.isArray(wastageRanges) && wastageRanges.length > 0) {
              wastageRanges.forEach((range: any) => {
                const fromSerial = range.fromSerial || range.from_serial || range.from || '';
                const toSerial = range.toSerial || range.to_serial || range.to || '';
                if (fromSerial && toSerial) {
                  const rangeStr = `${fromSerial}-${toSerial}`;
                  if (!serialRanges.includes(rangeStr)) {
                    serialRanges.push(rangeStr);
                  }
                }
              });
            }

            // Accumulate quantities
            totalQty += entry.hologram_qty || entry.hologramQty || 0;
            totalUsed += entry.issued_qty || entry.issuedQty || 0;
            totalDamaged += entry.wastage_qty || entry.wastageQty || 0;

            // Take first non-empty brand name
            if (brandName === 'N/A') {
              brandName = entry.brand_details || entry.brandDetails || 'N/A';
            }

            // Take first non-empty bottle size
            if (bottleSize === 'N/A') {
              bottleSize = entry.bottle_size || entry.bottleSize || 'N/A';
            }

            // Take first usage date
            if (!usageDate) {
              usageDate = entry.usage_date || entry.usageDate || new Date().toISOString();
            }

            // Take approval info from first entry
            if (!approvedAt) {
              approvalStatus = entry.approval_status || entry.approvalStatus || 'PENDING';
              approvedAt = entry.approved_at || entry.approvedAt || new Date().toISOString();
              approvedBy = this.pickDisplayOfficer(
                entry.approved_by_name,
                entry.approvedByName,
                entry.updated_by_name,
                entry.updatedByName,
                entry.created_by_name,
                entry.createdByName,
                entry.approved_by,
                entry.updated_by,
                entry.created_by,
                this.getCurrentUsername()
              );
              hologramType = entry.hologram_type || entry.hologramType || 'LOCAL';
            }
          });

          // Calculate leftover: total allocated - used - damaged
          const qtyLeftover = totalQty - totalUsed - totalDamaged;
          const brandDetailsList: HistoryBrandDetail[] = requestEntries.map((entry: any) => {
            const issuedQty = Number(entry.issued_qty || entry.issuedQty || 0);
            const damagedQty = Number(entry.wastage_qty || entry.wastageQty || 0);
            const allocatedQty = Number(entry.hologram_qty || entry.hologramQty || 0);

            const issuedRanges = entry.issued_ranges || entry.issuedRanges || [];
            const wastageRanges = entry.wastage_ranges || entry.wastageRanges || [];

            const issuedRangeText = Array.isArray(issuedRanges)
              ? issuedRanges
                .map((range: any) => `${range.fromSerial || range.from_serial || ''}-${range.toSerial || range.to_serial || ''}`)
                .filter((txt: string) => txt !== '-')
                .join(', ')
              : '';

            const wastageRangeText = Array.isArray(wastageRanges)
              ? wastageRanges
                .map((range: any) => `${range.fromSerial || range.from_serial || ''}-${range.toSerial || range.to_serial || ''}`)
                .filter((txt: string) => txt !== '-')
                .join(', ')
              : '';

            const serialRanges = [issuedRangeText, wastageRangeText].filter(Boolean).join(' | ') || 'N/A';

            return {
              brandName: this.sanitizeBrandName(entry.brand_details || entry.brandDetails || 'Not Used'),
              bottleSize: entry.bottle_size || entry.bottleSize || 'N/A',
              cartonNumber: entry.cartoon_number || entry.cartoonNumber || entry.roll_range || entry.rollRange || 'N/A',
              serialRanges,
              qtyUsed: issuedQty,
              qtyDamaged: damagedQty,
              qtyLeftover: Math.max(0, allocatedQty - issuedQty - damagedQty)
            };
          });

          // Build comma-separated strings
          const cartoonNumberStr = cartoonNumbers.length > 0 ? cartoonNumbers.join(', ') : 'N/A';
          const serialRangeStr = serialRanges.length > 0 ? serialRanges.join(', ') : 'N/A';

          console.log(`📋 Request ${refNo}:`, {
            cartoonNumbers,
            serialRanges,
            cartoonNumberStr,
            serialRangeStr,
            totalQty,
            totalUsed,
            totalDamaged,
            qtyLeftover
          });

          // Determine status based on approval
          let status: 'COMPLETED' | 'CANCELLED' = 'COMPLETED';
          if (approvalStatus === 'APPROVED') {
            status = 'COMPLETED';
          } else if (approvalStatus === 'REJECTED') {
            status = 'CANCELLED';
          } else {
            // PENDING - still show as COMPLETED but with "Pending" officer
            status = 'COMPLETED';
          }

          return {
            id: requestEntries[0].id,
            issueDate: usageDate,
            requestReference: refNo,
            cartoonNumber: cartoonNumberStr,
            totalRollsAssigned: totalQty,
            serialRange: serialRangeStr,
            brandName: brandName,
            bottleSize: bottleSize,
            qtyUsed: totalUsed,
            qtyDamaged: totalDamaged,
            qtyLeftover: qtyLeftover,
            brandDetailsList,
            status: status,
            completionDate: approvedAt,
            officer: approvedBy,
            hologramType: hologramType as 'LOCAL' | 'EXPORT' | 'DEFENCE'
          };
        });

        // Sort by usage date (newest first)
        this.historyData.sort((a, b) => {
          return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
        });

        this.applyHistoryFilters();

        console.log('📊 History data loaded:', this.historyData.length, 'entries');
        console.log('📋 Final historyData:', this.historyData);
      },
      error: (error) => {
        console.error('❌ Error loading history data:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url
        });
        this.historyData = [];
        this.savedDailyRegisterEntries = [];
        this.applyHistoryFilters();
      }
    });
  }



  getTypeClass(type: string): string {
    switch (type) {
      case 'LOCAL': return 'bg-primary';
      case 'EXPORT': return 'bg-dark';
      case 'DEFENCE': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'AVAILABLE': return 'bg-success';
      case 'IN_USE': return 'bg-warning text-dark'; // Changed from 'IN_PROGRESS' to match interface
      case 'IN_PROGRESS': return 'bg-warning text-dark'; // Keep for compatibility
      case 'COMPLETED': return 'bg-secondary'; // Changed from 'USED' to match interface
      case 'USED': return 'bg-secondary'; // Keep for compatibility
      case 'DAMAGED': return 'bg-danger';
      case 'CANCELLED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  // --- Analytics Helper Methods ---

  getDistributionValue(type: string): number {
    // Calculate total count for a specific type (LOCAL, EXPORT, DEFENCE)
    // Use filteredRollsData if filters are active, otherwise rollsData
    const data = this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData;
    return data
      .filter(roll => roll.type === type)
      .reduce((sum, roll) => sum + roll.totalCount, 0);
  }

  getDistributionPercentage(type: string): number {
    const total = this.getTotalHolograms();
    if (total === 0) return 0;
    return Math.round((this.getDistributionValue(type) / total) * 100);
  }

  getUsageTrendValue(status: string): number {
    // Calculate total count for a specific status (AVAILABLE, USED, DAMAGED)
    // Note: This sums up the *counts* within rolls, not just counting rolls by status
    const data = this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData;

    switch (status) {
      case 'AVAILABLE':
        return data.reduce((sum, roll) => sum + roll.availableCount, 0);
      case 'USED':
        return data.reduce((sum, roll) => sum + roll.usedCount, 0);
      case 'DAMAGED':
        return data.reduce((sum, roll) => sum + roll.damagedCount, 0);
      default:
        return 0;
    }
  }

  getUsageTrendPercentage(status: string): number {
    const total = this.getTotalHolograms();
    if (total === 0) return 0;
    return Math.round((this.getUsageTrendValue(status) / total) * 100);
  }

  // Existing helper methods need to be robust
  getTotalHolograms(): number {
    const data = this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData;
    return data.reduce((sum, roll) => sum + roll.totalCount, 0);
  }

  getTotalAvailable(): number {
    const data = this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData;
    return data.reduce((sum, roll) => sum + roll.availableCount, 0);
  }

  getTotalUsedInProduction(): number {
    const data = this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData;
    return data.reduce((sum, roll) => sum + roll.usedCount, 0);
  }

  getTotalDamagedWastage(): number {
    const data = this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData;
    return data.reduce((sum, roll) => sum + roll.damagedCount, 0);
  }

  getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
  }



  isNewRoll(roll: HologramRoll): boolean {
    return !!(roll.isNew === true && roll.newUntil && Date.now() < roll.newUntil);
  }

  isNewAvailable(available: AvailableHologram): boolean {
    return !!(available.isNew === true && available.newUntil && Date.now() < available.newUntil);
  }

  // Overview statistics calculated from Rolls tab data (NOT Serial Numbers Data)


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
    console.log('Opening serial details modal for:', availableData.cartoonNumber);

    const selectedRoll = this.rollsData.find(roll =>
      roll.cartoonNumber === availableData.cartoonNumber &&
      roll.type === availableData.type
    );

    const openModalWithData = (mappedRanges?: SerialRange[]) => {
      const generated = this.generateSerialNumbersData(availableData);

      if (mappedRanges && mappedRanges.length > 0) {
        generated.serialRanges = mappedRanges;
        generated.availableCount = mappedRanges
          .filter(r => r.status === 'AVAILABLE')
          .reduce((sum, r) => sum + (r.count || 0), 0);
        generated.usedCount = mappedRanges
          .filter(r => r.status === 'USED')
          .reduce((sum, r) => sum + (r.count || 0), 0);
        generated.damagedCount = mappedRanges
          .filter(r => r.status === 'DAMAGED')
          .reduce((sum, r) => sum + (r.count || 0), 0);
      }

      const serialRanges = generated.serialRanges || [];
      const approvedRefNo =
        serialRanges.find(range => range.referenceNo && range.referenceNo !== 'N/A')?.referenceNo ||
        this.getFallbackRequestReferenceForCartoon(availableData.cartoonNumber);
      const approvedBrandName = approvedRefNo && approvedRefNo !== 'N/A'
        ? this.getFallbackBrandByReference(approvedRefNo)
        : '';

      if (approvedRefNo && approvedRefNo !== 'N/A') {
        serialRanges.forEach((range) => {
          if (range.status !== 'AVAILABLE' && (!range.referenceNo || range.referenceNo === 'N/A')) {
            range.referenceNo = approvedRefNo;
          }
          if (range.status !== 'AVAILABLE' && (!range.brandDetails || range.brandDetails === 'N/A') && approvedBrandName) {
            range.brandDetails = approvedBrandName;
          }
        });
      }

      this.selectedSerialData = generated;
      this.serialViewMode = 'all';
      this.currentSerialPage = 1;
      this.clearSerialFilters();
      this.brandReferenceNoSuggestions = [];
      this.brandNameSuggestions = [];
      this.showSerialDetailsModal = true;
    };

    if (!selectedRoll?.id) {
      openModalWithData();
      return;
    }

    this.hologramService.getSerialRanges(selectedRoll.id).subscribe({
      next: (response: any) => {
        const responseRanges = Array.isArray(response?.ranges) ? response.ranges : [];
        const mappedRanges = responseRanges
          .map((range: any) => this.mapApiSerialRange(range))
          .filter((range: SerialRange | null): range is SerialRange => !!range);
        openModalWithData(mappedRanges);
      },
      error: () => {
        openModalWithData();
      }
    });
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
      qty: null,
      rollRange: ''
    };
  }

  private mapApiSerialRange(range: any): SerialRange | null {
    if (!range) return null;

    const statusRaw = (range.status || '').toString().toUpperCase().trim();
    const status = (['AVAILABLE', 'USED', 'DAMAGED'].includes(statusRaw)
      ? statusRaw
      : 'AVAILABLE') as 'AVAILABLE' | 'USED' | 'DAMAGED';

    const fromSerial = (range.fromSerial ?? range.from_serial ?? '').toString();
    const toSerial = (range.toSerial ?? range.to_serial ?? '').toString();
    const countRaw = Number(range.count ?? 0);
    const count = Number.isFinite(countRaw) ? countRaw : 0;

    if (!fromSerial || !toSerial) {
      return null;
    }

    const referenceNo = range.referenceNo || range.reference_no || 'N/A';
    const cartoonNumber = range.cartoonNumber || range.cartoon_number || range.roll_range || range.rollRange || '';
    const incomingBrand = range.brandDetails || range.brand_details || range.brand_name || '';
    const resolvedBrand = this.resolveBrandBySerialContext(
      referenceNo,
      cartoonNumber,
      fromSerial,
      toSerial,
      incomingBrand
    );

    return {
      fromSerial,
      toSerial,
      count,
      status,
      description: (range.description || (status === 'AVAILABLE' ? 'Available for production use' : '')).toString(),
      usedDate: range.usedDate || range.used_date,
      damageDate: range.damageDate || range.damage_date,
      referenceNo,
      productionLine: range.productionLine || range.production_line || 'N/A',
      damageReason: range.damageReason || range.damage_reason,
      reportedBy: range.reportedBy || range.reported_by,
      updatedBy: this.pickDisplayOfficer(
        range.updated_by_name,
        range.updatedByName,
        range.updated_by_display_name,
        range.updatedByDisplayName,
        range.reportedBy,
        range.reported_by
      ),
      brandDetails: resolvedBrand || '',
      bottleSize: range.bottleSize || range.bottle_size || ''
    };
  }

  getRangeUpdatedBy(range: SerialRange): string {
    const direct = String(range?.updatedBy || '').trim();
    if (direct && direct.toLowerCase() !== 'pending') {
      return direct;
    }

    const ref = String(range?.referenceNo || '').trim();
    if (!ref || ref.toUpperCase() === 'N/A') {
      return '';
    }

    // Prefer grouped history row (already normalized to display names)
    const fromHistory = this.historyData?.find((h: any) => String(h?.requestReference || '').trim() === ref)?.officer;
    const historyName = String(fromHistory || '').trim();
    if (historyName && historyName.toLowerCase() !== 'pending') {
      return historyName;
    }

    // Fallback to raw daily register entries if available
    const anySavedEntries: any[] = Array.isArray((this as any).savedDailyRegisterEntries)
      ? (this as any).savedDailyRegisterEntries
      : [];
    const entry = anySavedEntries.find((e: any) => String(e?.reference_no || e?.referenceNo || '').trim() === ref);
    if (!entry) return '';

    const picked = this.pickDisplayOfficer(
      entry.approved_by_name,
      entry.approvedByName,
      entry.updated_by_name,
      entry.updatedByName,
      entry.created_by_name,
      entry.createdByName,
      entry.approved_by,
      entry.updated_by,
      entry.created_by
    );
    return picked && picked !== 'Pending' ? picked : '';
  }

  private normalizeSerialValue(value: any): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (!/^\d+$/.test(raw)) return raw.toUpperCase();
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? raw : String(parsed);
  }

  private parseRangeArrayField(field: any): any[] {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private isMatchingCartoonNumber(candidate: string, target: string): boolean {
    const c = String(candidate || '').trim();
    const t = String(target || '').trim();
    if (!c || !t) return true;
    if (c === t) return true;
    return c.split('_')[0] === t.split('_')[0];
  }

  private hasExactRangeMatch(range: any, fromSerial: string, toSerial: string): boolean {
    const rangeFrom = this.normalizeSerialValue(range?.fromSerial ?? range?.from_serial ?? range?.from ?? '');
    const rangeTo = this.normalizeSerialValue(range?.toSerial ?? range?.to_serial ?? range?.to ?? '');
    const fromNorm = this.normalizeSerialValue(fromSerial);
    const toNorm = this.normalizeSerialValue(toSerial);
    return !!(rangeFrom && rangeTo && rangeFrom === fromNorm && rangeTo === toNorm);
  }

  private resolveBrandBySerialContext(
    referenceNo: string,
    cartoonNumber: string,
    fromSerial: string,
    toSerial: string,
    currentBrand: string
  ): string {
    // Priority 1: exact daily register entry match (reference + cartoon + range)
    const candidates = this.savedDailyRegisterEntries.filter((entry: any) => {
      const entryRef = entry.reference_no || entry.referenceNo || '';
      const entryCartoon = entry.cartoon_number || entry.cartoonNumber || entry.roll_range || entry.rollRange || '';
      const refMatches = referenceNo && referenceNo !== 'N/A' ? entryRef === referenceNo : true;
      const cartoonMatches = this.isMatchingCartoonNumber(entryCartoon, cartoonNumber);
      return refMatches && cartoonMatches;
    });

    for (const entry of candidates) {
      const issuedRanges = this.parseRangeArrayField(entry.issued_ranges || entry.issuedRanges);
      const wastageRanges = this.parseRangeArrayField(entry.wastage_ranges || entry.wastageRanges);
      const listToCheck = [...issuedRanges, ...wastageRanges];
      const exactFromRanges = listToCheck.some((r) => this.hasExactRangeMatch(r, fromSerial, toSerial));

      const fromSingle = this.normalizeSerialValue(entry.issued_from || entry.issuedFrom || entry.wastage_from || entry.wastageFrom || '');
      const toSingle = this.normalizeSerialValue(entry.issued_to || entry.issuedTo || entry.wastage_to || entry.wastageTo || '');
      const fromNorm = this.normalizeSerialValue(fromSerial);
      const toNorm = this.normalizeSerialValue(toSerial);
      const exactFromSingle = !!(fromSingle && toSingle && fromSingle === fromNorm && toSingle === toNorm);

      if (exactFromRanges || exactFromSingle) {
        const name = this.sanitizeBrandName(entry.brand_details || entry.brandDetails || '');
        if (name) return name;
      }
    }

    // Priority 2: fallback brand by reference (old behavior)
    let resolved = currentBrand || '';
    if (!resolved || resolved === 'N/A') {
      resolved = this.getFallbackBrandByReference(referenceNo);
    }
    return this.sanitizeBrandName(resolved);
  }

  private getFallbackBrandByReference(referenceNo: string): string {
    if (!referenceNo || referenceNo === 'N/A') return '';

    const issuedEntry = this.issuedData.find(item =>
      item.referenceNo === referenceNo || item.requestReference === referenceNo
    );
    if (issuedEntry?.brandName && issuedEntry.brandName !== 'N/A') {
      return this.sanitizeBrandName(issuedEntry.brandName);
    }

    const historyEntry = this.historyData.find(item => item.requestReference === referenceNo);
    if (historyEntry?.brandName && historyEntry.brandName !== 'N/A') {
      return this.sanitizeBrandName(historyEntry.brandName);
    }

    return '';
  }

  private getFallbackRequestReferenceForCartoon(cartoonNumber: string): string {
    const issuedEntry = this.issuedData.find((issued) => {
      const cartons = String(issued.cartoonNumber || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      return cartons.includes(cartoonNumber);
    });

    if (issuedEntry?.referenceNo && issuedEntry.referenceNo !== 'N/A') {
      return issuedEntry.referenceNo;
    }

    const historyEntry = this.historyData.find((history) => String(history.cartoonNumber || '').trim() === cartoonNumber);
    if (historyEntry?.requestReference && historyEntry.requestReference !== 'N/A') {
      return historyEntry.requestReference;
    }

    return 'N/A';
  }

  private sanitizeBrandName(name: string): string {
    if (!name) return '';
    let value = String(name).trim();
    value = value.replace(/\s*-\s*M\/s\s*Sikkim\s*Distilleries\s*Ltd\.?$/i, '');
    value = value.replace(/\s*M\/s\s*Sikkim\s*Distilleries\s*Ltd\.?$/i, '');
    return value.trim();
  }

  private getCurrentUsername(): string {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return '';
      const user = JSON.parse(raw);
      return user?.username || user?.userName || user?.name || '';
    } catch {
      return '';
    }
  }

  private pickDisplayOfficer(...candidates: any[]): string {
    for (const raw of candidates) {
      const value = (raw ?? '').toString().trim();
      if (!value) continue;
      if (value.toLowerCase() === 'pending') continue;
      return value;
    }
    return 'Pending';
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
    const filtered = this.getFilteredSerialRangesRaw();

    // Apply pagination
    const startIndex = (this.currentSerialPage - 1) * this.serialPageSize;
    const endIndex = startIndex + this.serialPageSize;

    return filtered.slice(startIndex, endIndex);
  }

  private getFilteredSerialRangesRaw(): SerialRange[] {
    if (!this.selectedSerialData || !this.selectedSerialData.serialRanges) return [];

    let filtered = this.selectedSerialData.serialRanges;

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

    if (this.serialFilters.brandReferenceNo && this.serialFilters.brandReferenceNo.trim() !== '') {
      filtered = filtered.filter(range =>
        range.referenceNo &&
        range.referenceNo.toLowerCase().includes(this.serialFilters.brandReferenceNo.toLowerCase())
      );
    }

    if (this.serialFilters.brandName && this.serialFilters.brandName.trim() !== '') {
      filtered = filtered.filter(range => {
        const brandMatch = range.brandDetails &&
          range.brandDetails.toLowerCase().includes(this.serialFilters.brandName.toLowerCase());
        const productionLineMatch = range.productionLine &&
          range.productionLine.toLowerCase().includes(this.serialFilters.brandName.toLowerCase());
        return brandMatch || productionLineMatch;
      });
    }

    if (this.serialFilters.qty !== null && this.serialFilters.qty > 0) {
      filtered = filtered.filter(range => range.count === this.serialFilters.qty);
    }

    if (this.serialFilters.rollRange && this.serialFilters.rollRange.trim() !== '') {
      filtered = filtered.filter(range => this.matchesRollRangeFilter(range, this.serialFilters.rollRange));
    }

    return filtered;
  }

  private matchesRollRangeFilter(range: SerialRange, input: string): boolean {
    const query = String(input || '').trim();
    if (!query) return true;

    const rangeFrom = this.extractOptionalSerialNumber(range.fromSerial);
    const rangeTo = this.extractOptionalSerialNumber(range.toSerial);
    if (rangeFrom === null || rangeTo === null) {
      const text = `${range.fromSerial}-${range.toSerial}`.toLowerCase();
      return text.includes(query.toLowerCase());
    }

    const serialBounds: [number, number] = rangeFrom <= rangeTo ? [rangeFrom, rangeTo] : [rangeTo, rangeFrom];
    const normalized = query.toLowerCase().replace(/\s+/g, '');

    const pairMatch = normalized.match(/^(\d+)(?:-|to)(\d+)$/i);
    if (pairMatch) {
      const q1 = Number(pairMatch[1]);
      const q2 = Number(pairMatch[2]);
      if (Number.isFinite(q1) && Number.isFinite(q2)) {
        const queryBounds: [number, number] = q1 <= q2 ? [q1, q2] : [q2, q1];
        // Show ranges that overlap with entered roll range
        return serialBounds[0] <= queryBounds[1] && queryBounds[0] <= serialBounds[1];
      }
    }

    const singleMatch = normalized.match(/^(\d+)$/);
    if (singleMatch) {
      const value = Number(singleMatch[1]);
      return Number.isFinite(value) && value >= serialBounds[0] && value <= serialBounds[1];
    }

    const queryNumbers = query.match(/\d+/g);
    if (queryNumbers && queryNumbers.length >= 2) {
      const q1 = Number(queryNumbers[0]);
      const q2 = Number(queryNumbers[1]);
      if (Number.isFinite(q1) && Number.isFinite(q2)) {
        const queryBounds: [number, number] = q1 <= q2 ? [q1, q2] : [q2, q1];
        return serialBounds[0] <= queryBounds[1] && queryBounds[0] <= serialBounds[1];
      }
    }

    const text = `${range.fromSerial}-${range.toSerial}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }

  private extractOptionalSerialNumber(value: string): number | null {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const match = raw.match(/\d+/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
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
    const filtered = this.getFilteredSerialRangesRaw();
    return Math.max(1, Math.ceil(filtered.length / this.serialPageSize));
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
    const hasDateFilters = !!(this.rollsFilters.month || this.rollsFilters.dateFrom || this.rollsFilters.dateTo);
    const dateFilters: TabDateFilters = {
      month: this.rollsFilters.month,
      dateFrom: this.rollsFilters.dateFrom,
      dateTo: this.rollsFilters.dateTo
    };

    this.filteredRollsData = this.rollsData.filter(roll => {
      if (this.rollsFilters.rollStatus && roll.status !== this.rollsFilters.rollStatus) {
        return false;
      }
      if (this.rollsFilters.hologramType && roll.type !== this.rollsFilters.hologramType) {
        return false;
      }

      if (hasDateFilters) {
        const rollDate = this.tryParseAnyDate(roll.receivedDate);
        if (!this.matchesTabDateFilters(rollDate, dateFilters)) {
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

    this.rollsTablePage = 1;
  }

  clearRollsFilters(): void {
    this.rollsFilters = {
      rollStatus: '',
      hologramType: '',
      month: '',
      dateFrom: '',
      dateTo: '',
      serialSearch: ''
    };
    this.applyRollsFilters();
  }

  hasActiveRollsFilters(): boolean {
    return !!(this.rollsFilters.rollStatus ||
      this.rollsFilters.hologramType ||
      this.rollsFilters.month ||
      this.rollsFilters.dateFrom ||
      this.rollsFilters.dateTo ||
      this.rollsFilters.serialSearch);
  }

  getRollsFilterSummary(): string {
    const filters = [];
    if (this.rollsFilters.rollStatus) filters.push(`Status: ${this.rollsFilters.rollStatus}`);
    if (this.rollsFilters.hologramType) filters.push(`Type: ${this.rollsFilters.hologramType}`);
    if (this.rollsFilters.month) {
      const label = this.months.find((m) => m.value === this.rollsFilters.month)?.label || this.rollsFilters.month;
      filters.push(`Month: ${label}`);
    }
    if (this.rollsFilters.serialSearch) filters.push(`Search: ${this.rollsFilters.serialSearch}`);

    return filters.length > 0 ?
      `Filtered by: ${filters.join(', ')} | Showing ${this.filteredRollsData.length} of ${this.rollsData.length} rolls` :
      `Showing all ${this.rollsData.length} rolls`;
  }

  private getAvailableRowDate(available: AvailableHologram): Date | null {
    const roll = this.rollsData.find((r) =>
      String(r.cartoonNumber || '').trim() === String(available.cartoonNumber || '').trim() &&
      r.type === available.type
    );
    return this.tryParseAnyDate(roll?.receivedDate || '');
  }

  applyAvailableFilters(): void {
    const hasFilters = !!(this.availableFilters.month || this.availableFilters.dateFrom || this.availableFilters.dateTo);
    if (!hasFilters) {
      this.filteredAvailableData = [...this.availableData];
      this.availableTablePage = 1;
      return;
    }

    this.filteredAvailableData = this.availableData.filter((row) =>
      this.matchesTabDateFilters(this.getAvailableRowDate(row), this.availableFilters)
    );
    this.availableTablePage = 1;
  }

  clearAvailableFilters(): void {
    this.availableFilters = { month: '', dateFrom: '', dateTo: '' };
    this.applyAvailableFilters();
  }

  applyIssuedFilters(): void {
    const hasFilters = !!(this.issuedFilters.month || this.issuedFilters.dateFrom || this.issuedFilters.dateTo);
    if (!hasFilters) {
      this.filteredIssuedData = [...this.issuedData];
      this.issuedTablePage = 1;
      return;
    }

    this.filteredIssuedData = this.issuedData.filter((row) =>
      this.matchesTabDateFilters(this.tryParseAnyDate(row.issueDate), this.issuedFilters)
    );
    this.issuedTablePage = 1;
  }

  clearIssuedFilters(): void {
    this.issuedFilters = { month: '', dateFrom: '', dateTo: '' };
    this.applyIssuedFilters();
  }

  applyHistoryFilters(): void {
    const hasFilters = !!(this.historyFilters.month || this.historyFilters.dateFrom || this.historyFilters.dateTo);
    if (!hasFilters) {
      this.filteredHistoryData = [...this.historyData];
      this.historyTablePage = 1;
      return;
    }

    this.filteredHistoryData = this.historyData.filter((row) =>
      this.matchesTabDateFilters(this.tryParseAnyDate(row.issueDate), this.historyFilters)
    );
    this.historyTablePage = 1;
  }

  clearHistoryFilters(): void {
    this.historyFilters = { month: '', dateFrom: '', dateTo: '' };
    this.applyHistoryFilters();
  }

  // Pagination helpers for each tab table
  getRollsTableRows(): HologramRoll[] {
    const rows = this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData;
    return this.paginateRows(rows, this.rollsTablePage, this.rollsTablePageSize);
  }

  getRollsTableTotal(): number {
    return (this.hasActiveRollsFilters() ? this.filteredRollsData : this.rollsData).length;
  }

  getRollsTableTotalPages(): number {
    return Math.max(1, Math.ceil(this.getRollsTableTotal() / Math.max(1, this.rollsTablePageSize)));
  }

  setRollsTablePage(page: number): void {
    const totalPages = this.getRollsTableTotalPages();
    this.rollsTablePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  }

  onRollsTablePageSizeChange(): void {
    this.rollsTablePage = 1;
  }

  getRollsTablePaginationLabel(): string {
    return this.getPaginationLabel(this.getRollsTableTotal(), this.rollsTablePage, this.rollsTablePageSize);
  }

  getAvailableTableRows(): AvailableHologram[] {
    return this.paginateRows(this.filteredAvailableData, this.availableTablePage, this.availableTablePageSize);
  }

  getAvailableTableTotalPages(): number {
    return Math.max(1, Math.ceil((this.filteredAvailableData?.length || 0) / Math.max(1, this.availableTablePageSize)));
  }

  setAvailableTablePage(page: number): void {
    const totalPages = this.getAvailableTableTotalPages();
    this.availableTablePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  }

  onAvailableTablePageSizeChange(): void {
    this.availableTablePage = 1;
  }

  getAvailableTablePaginationLabel(): string {
    return this.getPaginationLabel(this.filteredAvailableData.length, this.availableTablePage, this.availableTablePageSize);
  }

  getIssuedTableRows(): IssuedHologram[] {
    return this.paginateRows(this.filteredIssuedData, this.issuedTablePage, this.issuedTablePageSize);
  }

  getIssuedTableTotalPages(): number {
    return Math.max(1, Math.ceil((this.filteredIssuedData?.length || 0) / Math.max(1, this.issuedTablePageSize)));
  }

  setIssuedTablePage(page: number): void {
    const totalPages = this.getIssuedTableTotalPages();
    this.issuedTablePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  }

  onIssuedTablePageSizeChange(): void {
    this.issuedTablePage = 1;
  }

  getIssuedTablePaginationLabel(): string {
    return this.getPaginationLabel(this.filteredIssuedData.length, this.issuedTablePage, this.issuedTablePageSize);
  }

  getHistoryTableRows(): HistoryHologram[] {
    return this.paginateRows(this.filteredHistoryData, this.historyTablePage, this.historyTablePageSize);
  }

  getHistoryTableTotalPages(): number {
    return Math.max(1, Math.ceil((this.filteredHistoryData?.length || 0) / Math.max(1, this.historyTablePageSize)));
  }

  setHistoryTablePage(page: number): void {
    const totalPages = this.getHistoryTableTotalPages();
    this.historyTablePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  }

  onHistoryTablePageSizeChange(): void {
    this.historyTablePage = 1;
  }

  getHistoryTablePaginationLabel(): string {
    return this.getPaginationLabel(this.filteredHistoryData.length, this.historyTablePage, this.historyTablePageSize);
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

  openHistoryBrandsModal(history: HistoryHologram): void {
    this.selectedHistoryForBrands = history;
    this.showHistoryBrandsModal = true;
  }

  closeHistoryBrandsModal(): void {
    this.showHistoryBrandsModal = false;
    this.selectedHistoryForBrands = null;
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

    const normalizeSerial = (value: any): string => {
      const raw = String(value ?? '').trim();
      if (!raw) return '';
      const digitsOnly = /^\d+$/.test(raw);
      if (!digitsOnly) return raw.toUpperCase();
      const normalized = String(parseInt(raw, 10));
      return Number.isNaN(Number(normalized)) ? raw : normalized;
    };

    const parseRangesFromText = (text: string): Array<{ from: string; to: string }> => {
      if (!text) return [];
      const matches = text.match(/\d+\s*-\s*\d+/g) || [];
      return matches
        .map((segment) => {
          const parts = segment.split('-').map((p) => normalizeSerial(p));
          return { from: parts[0] || '', to: parts[1] || '' };
        })
        .filter((r) => !!r.from && !!r.to);
    };

    const isSameCartoon = (candidate: string, target: string): boolean => {
      const c = String(candidate || '').trim();
      const t = String(target || '').trim();
      if (!c || !t) return true;
      if (c === t) return true;
      return c.split('_')[0] === t.split('_')[0];
    };

    const findBrandInfoBySerialRange = (
      referenceNo: string,
      fromSerial: string,
      toSerial: string,
      currentCartoon: string
    ): { brandName: string; bottleSize: string } | null => {
      const fromNorm = normalizeSerial(fromSerial);
      const toNorm = normalizeSerial(toSerial);

      const candidateHistory = this.historyData.filter((history) =>
        referenceNo && referenceNo !== 'N/A'
          ? history.requestReference === referenceNo
          : String(history.cartoonNumber || '').includes(currentCartoon)
      );

      for (const historyEntry of candidateHistory) {
        const details = historyEntry.brandDetailsList || [];
        for (const brand of details) {
          if (!isSameCartoon(brand.cartonNumber || '', currentCartoon)) continue;
          const parsedRanges = parseRangesFromText(brand.serialRanges || '');
          const hasExactMatch = parsedRanges.some((r) => {
            const rangeFrom = normalizeSerial(r.from);
            const rangeTo = normalizeSerial(r.to);
            return rangeFrom === fromNorm && rangeTo === toNorm;
          });
          if (hasExactMatch) {
            return {
              brandName: this.sanitizeBrandName(brand.brandName || 'N/A'),
              bottleSize: brand.bottleSize || ''
            };
          }
        }
      }

      return null;
    };

    // Helper method to get brand information from issued/history data as fallback
    const getBrandInfoFromIssuedData = (referenceNo: string): { brandName: string, bottleSize: string } => {
      // Try to find brand info from issued data (requests)
      const issuedEntry = this.issuedData.find(issued => 
        issued.referenceNo === referenceNo || 
        issued.requestReference === referenceNo
      );
      
      if (issuedEntry && issuedEntry.brandName && issuedEntry.brandName !== 'N/A') {
        return { 
          brandName: issuedEntry.brandName, 
          bottleSize: '' // Issued data doesn't have bottle size
        };
      }

      // Try to find brand info from history data
      const historyEntry = this.historyData.find(history => 
        history.requestReference === referenceNo
      );
      
      if (historyEntry) {
        return { 
          brandName: historyEntry.brandName || 'N/A', 
          bottleSize: historyEntry.bottleSize || ''
        };
      }

      return { brandName: 'N/A', bottleSize: '' };
    };

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

            // Get brand information with multiple fallbacks
            let brandDetails = historyEntry.brandDetails || historyEntry.brandName || historyEntry.brand_name || historyEntry.brand_details || '';
            let bottleSize = historyEntry.bottleSize || historyEntry.bottle_size || '';
            let referenceNo = historyEntry.referenceNo || historyEntry.refNo || historyEntry.ref_no || 'N/A';

            // First resolve brand from exact serial-range + cartoon mapping (most accurate for multi-brand)
            const rangeBasedBrandInfo = findBrandInfoBySerialRange(referenceNo, fromSerial, toSerial, cartoonNumber);
            if (rangeBasedBrandInfo && rangeBasedBrandInfo.brandName !== 'N/A') {
              brandDetails = rangeBasedBrandInfo.brandName;
              if (!bottleSize && rangeBasedBrandInfo.bottleSize) {
                bottleSize = rangeBasedBrandInfo.bottleSize;
              }
            }

            // If brand details are still missing, try to get from issued/history data
            if (!brandDetails || brandDetails === 'N/A' || brandDetails.trim() === '') {
              const brandInfo = getBrandInfoFromIssuedData(referenceNo);
              if (brandInfo.brandName !== 'N/A') {
                brandDetails = brandInfo.brandName;
                if (!bottleSize && brandInfo.bottleSize) {
                  bottleSize = brandInfo.bottleSize;
                }
              }
            }

            if (historyEntry.type === 'ISSUED') {
              ranges.push({
                fromSerial: fromSerial,
                toSerial: toSerial,
                count: quantity,
                status: 'USED',
                description: `Production batch - Used on ${new Date(historyEntry.date || historyEntry.approvedAt).toLocaleDateString()}`,
                usedDate: historyEntry.date || historyEntry.approvedAt,
                referenceNo: referenceNo,
                productionLine: historyEntry.productionLine || historyEntry.brandName || historyEntry.brand_name || 'N/A',
                brandDetails: brandDetails || 'N/A',
                bottleSize: bottleSize
              });
              console.log('✅ Added USED range:', fromSerial, '-', toSerial, 'quantity:', quantity, 'brand:', brandDetails);
            } else {
              ranges.push({
                fromSerial: fromSerial,
                toSerial: toSerial,
                count: quantity,
                status: 'DAMAGED',
                description: historyEntry.damageReason || historyEntry.damage_reason || 'Damaged during production',
                damageDate: historyEntry.date || historyEntry.approvedAt,
                damageReason: historyEntry.damageReason || historyEntry.damage_reason || 'Not specified',
                reportedBy: historyEntry.approvedBy || historyEntry.reportedBy || historyEntry.reported_by || 'System',
                referenceNo: referenceNo,
                productionLine: historyEntry.productionLine || historyEntry.brandName || historyEntry.brand_name || 'N/A',
                brandDetails: brandDetails || 'N/A',
                bottleSize: bottleSize
              });
              console.log('✅ Added DAMAGED range:', fromSerial, '-', toSerial, 'quantity:', quantity, 'brand:', brandDetails);
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
