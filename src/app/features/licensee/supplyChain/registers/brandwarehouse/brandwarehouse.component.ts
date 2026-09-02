import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandWarehouseService, BrandWarehouseUtilization } from '../../services/brand-warehouse.service';
import { ProductionService, ProductionBatch } from '../../services/production.service';
import { SupplyChainProfileService } from '../../../../../core/services/supply-chain-profile.service';
import { SupplyChainService } from '../../services/supplychain.service';

interface TransitPermitDetail {
  utilizationId?: number;
  permitNo: string;
  date: string;
  distributorName: string;
  depotAddress: string;
  vehicleNumber: string;
  cases: number;
  bottlesPerCase: number;
  totalBottles: number;
  status: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  approvedBy?: string;
  approvalDate?: string;
  createdAt?: string;
}

interface LastEntryDetail {
  id: string;
  date: string;
  type: 'PRODUCTION' | 'CONSUMPTION' | 'ADJUSTMENT' | 'TRANSIT_PERMIT' | 'CANCELLATION';
  activity?: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceNo: string;
  description: string;
  officerName?: string;
  transitPermitNo?: string;
  packSize?: number;  // Pack size in ml
  sortTimestamp?: number;
}

interface PackSizeInfo {
  id: string;
  capacitySize: number;
  currentStock: number;
  maxCapacity: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';
  totalUtilized: number;
  reorderLevel: number;
  utilizationPercentage: number;
}

interface GroupedBrandStock {
  brandId?: number | null;
  brandName: string;
  licenseId?: string;
  distilleryName: string;
  brandType: string;
  packSizes: { [key: number]: PackSizeInfo };
  totalStock: number;
  totalCapacity: number;
  totalUtilized: number;
  lastUpdated: string;
  isNew?: boolean;
  overallStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';
}

interface WarehouseOverview {
  totalBrands: number;
  totalCapacity: number;
  totalCurrentStock: number;
  lowStockAlerts: number;
  outOfStockAlerts: number;
  newArrivals: number;
  todayProduction: number;
  todayConsumption: number;
  pendingAdjustments: number;
}

interface FilterOptions {
  brandName: string;
  liquorType: string;
  status: string;
  stockLevel: string;
  dateFrom: string;
  dateTo: string;
}

import { TeleportToBodyDirective } from '../../../../../shared/directives/teleport-to-body.directive';

@Component({
  selector: 'app-brandwarehouse',
  standalone: true,
  imports: [CommonModule, FormsModule, TeleportToBodyDirective],
  templateUrl: './brandwarehouse.component.html',
  styleUrls: ['./brandwarehouse.component.scss']
})
export class BrandwarehouseComponent implements OnInit {
  Math = Math;
  private static readonly NEW_UPDATE_BADGE_WINDOW_MS = 24 * 60 * 60 * 1000;
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;

  // Current distillery context resolved from active user profile.
  private currentDistilleryName = '';
  private currentLicenseId = '';
  private resolvedLicenseId = '';
  private currentLicenseType = '';
  private readonly EXCLUDED_BREWERIES: string[] = []; // Show all Sikkim brands including breweries

  // Data
  groupedBrandStocks: GroupedBrandStock[] = [];
  filteredStocks: GroupedBrandStock[] = [];
  paginatedStocks: GroupedBrandStock[] = [];
  newlyUpdatedStocks: GroupedBrandStock[] = [];

  // Master config: ml -> pieces per case (from brand_ml_in_cases)
  private mlPiecesInCase: Record<number, number> = {};
  timelineMonthOptions: { value: string; label: string }[] = [];
  selectedTimelineMonth: string = 'ALL';
  timelinePageSizeOptions: number[] = [5, 10, 15];
  timelinePageSize = 5;
  timelineCurrentPage = 1;
  warehouseOverview: WarehouseOverview = {
    totalBrands: 0,
    totalCapacity: 0,
    totalCurrentStock: 0,
    lowStockAlerts: 0,
    outOfStockAlerts: 0,
    newArrivals: 0,
    todayProduction: 0,
    todayConsumption: 0,
    pendingAdjustments: 0
  };

  // Filters
  filters: FilterOptions = {
    brandName: '', // Start with empty brand name filter
    liquorType: '',
    status: '',
    stockLevel: '',
    dateFrom: '',
    dateTo: ''
  };

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // UI State
  isLoading = false;
  selectedBrand: GroupedBrandStock | null = null;
  selectedPackSize: PackSizeInfo | null = null;
  showDetailsModal = false;
  showAdjustmentModal = false;
  showTransitPermitsModal = false;
  showLastEntriesModal = false;
  showProductionModal = false;
  showNewUpdatesModal = false;
  isLoadingProduction = false;
  isLoadingLastEntries = false;
  adjustmentQuantity = 0;
  adjustmentType: 'ADD' | 'SUBTRACT' = 'ADD';
  adjustmentReason = '';
  selectedTransitPermits: TransitPermitDetail[] = [];
  selectedLastEntries: LastEntryDetail[] = [];

  // Transit permits modal pagination & filter
  permitPageSize = 5;
  permitPageSizeOptions = [5, 10, 15];
  permitCurrentPage = 1;
  permitSelectedMonth = 'ALL';
  filteredTransitPermits: TransitPermitDetail[] = [];
  paginatedTransitPermits: TransitPermitDetail[] = [];
  permitTotalPages = 1;
  permitSummaryText = 'No permits';
  permitMonthOptions = [
    { value: 'ALL', label: 'All Months' },
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' },   { value: '04', label: 'April' },
    { value: '05', label: 'May' },     { value: '06', label: 'June' },
    { value: '07', label: 'July' },    { value: '08', label: 'August' },
    { value: '09', label: 'September' },{ value: '10', label: 'October' },
    { value: '11', label: 'November' },{ value: '12', label: 'December' },
  ];

  // Recent Entries modal pagination & filter
  entryPageSize = 5;
  entryPageSizeOptions = [5, 10, 15];
  entryCurrentPage = 1;
  entrySelectedMonth = 'ALL';
  entryMonthOptions = [
    { value: 'ALL', label: 'All Months' },
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' },   { value: '04', label: 'April' },
    { value: '05', label: 'May' },     { value: '06', label: 'June' },
    { value: '07', label: 'July' },    { value: '08', label: 'August' },
    { value: '09', label: 'September' },{ value: '10', label: 'October' },
    { value: '11', label: 'November' },{ value: '12', label: 'December' },
  ];

  // Production data
  productionHistory: ProductionBatch[] = [];
  filteredProductionHistory: ProductionBatch[] = [];
  productionSelectedMonth: string = this.getMonthValue(new Date().toISOString());
  productionMonthOptions = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];
  productionPageSizeOptions = [5, 10, 15];
  productionPageSize = 5;
  productionCurrentPage = 1;
  currentPackSizeId: string = '';
  productionSummary = {
    todayProduction: 0,
    stockBefore: 0,
    stockAfter: 0,
    latestReference: '',
    productionManager: 'Production Manager',
    productionDate: '',
    productionTime: ''
  };


  // Chart data for stock levels
  stockLevelChart = {
    labels: [] as string[],
    data: [] as number[]
  };

  constructor(
    private brandWarehouseService: BrandWarehouseService,
    private productionService: ProductionService,
    private supplyChainProfileService: SupplyChainProfileService,
    private supplyChainService: SupplyChainService
  ) { }

  ngOnInit(): void {
    this.loadMlInCasesConfig();
    this.resolveCurrentDistilleryAndLoad();
  }

  private loadMlInCasesConfig(): void {
    this.supplyChainService.getBrandMlInCases().subscribe({
      next: (rows: any[]) => {
        const nextMap: Record<number, number> = {};
        (rows || []).forEach((row: any) => {
          const mlRaw = row?.ml ?? row?.capacity_size ?? row?.capacitySize ?? row?.pack_size ?? row?.packSize;
          const piecesRaw = row?.pieces_in_case ?? row?.piecesInCase ?? row?.pieces_per_case ?? row?.bottles_per_case ?? row?.bottlesPerCase;
          const ml = parseInt(String(mlRaw ?? '').replace(/[^\d]/g, ''), 10);
          const pieces = parseInt(String(piecesRaw ?? '').replace(/[^\d]/g, ''), 10);
          if (Number.isFinite(ml) && ml > 0 && Number.isFinite(pieces) && pieces > 0) {
            nextMap[ml] = pieces;
          }
        });
        this.mlPiecesInCase = nextMap;
      },
      error: (error: unknown) => {
        console.error('Error loading brand_ml_in_cases config:', error);
        this.mlPiecesInCase = {};
      }
    });
  }

  getPiecesInCase(ml: number): number | null {
    const pieces = this.mlPiecesInCase?.[Number(ml)];
    return Number.isFinite(pieces) && pieces > 0 ? pieces : null;
  }

  getCasesForUnits(units: number, ml: number): number | null {
    const normalizedUnits = Number(units);
    if (!Number.isFinite(normalizedUnits) || normalizedUnits < 0) return null;
    const piecesInCase = this.getPiecesInCase(ml);
    if (!piecesInCase) return null;
    return Math.floor(normalizedUnits / piecesInCase);
  }

  private resolveCurrentDistilleryAndLoad(): void {
    this.supplyChainProfileService.getProfile().subscribe({
      next: (profileResponse) => {
        const profileData: any = profileResponse?.data || {};
        this.currentLicenseId = String( 
          profileData?.licenseeId || 
          profileData?.licensee_id || 
          '' 
        ).trim(); 
        this.resolvedLicenseId = this.normalizeLicenseId(this.currentLicenseId); 
        this.currentLicenseType = String( 
          profileData?.licenseType || 
          profileData?.license_type || 
          '' 
        ).trim(); 
        this.currentDistilleryName = String(
          profileData?.manufacturingUnitName ||
          profileData?.manufacturing_unit_name ||
          ''
        ).trim();
        this.initializeSikkimBrands();
        this.loadWarehouseData();
      },
      error: () => {
        this.currentDistilleryName = '';
        this.currentLicenseId = '';
        this.resolvedLicenseId = '';
        this.currentLicenseType = '';
        this.initializeSikkimBrands();
        this.loadWarehouseData();
      }
    }); 
  } 
 
  private normalizeLicenseId(value: string): string { 
    return String(value || '').trim(); 
  } 
 
  private shouldSendExplicitLicenseId(value: string): boolean { 
    const normalized = String(value || '').trim(); 
    return ( 
      normalized.startsWith('NA/') || 
      normalized.startsWith('NLI/') || 
      normalized.startsWith('LA/') ||
      normalized.startsWith('SB/') ||
      /^MP[A-Z0-9]+$/i.test(normalized)
    ); 
  } 

  /**
   * Initialize Sikkim brands from liquor_data_details table
   */
  initializeSikkimBrands(): void {
    this.brandWarehouseService.initializeSikkimBrands().subscribe({
      next: (response) => {
        console.log('Sikkim brands initialized:', response);
        if (response.success) {
          console.log(`Created: ${response.created}, Updated: ${response.updated}`);
        }
      },
      error: (error) => {
        console.error('Error initializing Sikkim brands:', error);
        // Continue even if initialization fails
      }
    });
  }

  loadWarehouseData(): void {
    this.isLoading = true;

    // Load brand warehouses — overview is derived from this same data
    this.brandWarehouseService.getGroupedBrandWarehouses(this.buildApiFilters()).subscribe({
      next: (data) => {
        console.log('🔍 Received grouped data from service:', data);
        console.log('📊 Data length:', data.length);
        if (data.length > 0) {
          console.log('📋 Sample brand:', data[0]);
        }

        this.groupedBrandStocks = this.filterByCurrentDistillery(data);
        console.log('✅ After distillery filtering:', this.groupedBrandStocks.length);

        // Build overview from loaded data, then patch production/consumption
        this.calculateOverview();
        this.loadTodayProductionAndConsumption();

        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading warehouse data:', error);
        this.isLoading = false;
        this.initializeSampleData();
        this.calculateOverview();
        this.loadTodayProductionAndConsumption();
        this.applyFilters();
      }
    });
  }

  /**
   * Load this month's production and consumption totals.
   * "Today" often has no data since hologram entries use past usage_date
   * and transit permits are raised on varying dates, so month-to-date
   * gives consistently meaningful numbers.
   */
  private loadTodayProductionAndConsumption(): void {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10); // YYYY-MM-01
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // Month-to-date production via brand-warehouse production-summary
    const daysIntoMonth = now.getDate(); // 1-31
    this.brandWarehouseService.getMonthlyProductionTotal(daysIntoMonth).subscribe({
      next: (monthProd) => {
        console.log('🏭 Monthly production total:', monthProd);
        this.warehouseOverview = { ...this.warehouseOverview, todayProduction: monthProd };
      },
      error: (err) => {
        console.error('❌ Error loading production summary:', err);
      }
    });

    // Month-to-date consumption via utilizations filtered to this month
    this.brandWarehouseService.getUtilizations({
      date_from: monthStart,
      date_to: todayStr
    }).subscribe({
      next: (utilizations) => {
        const monthConsumption = (utilizations || []).reduce((sum: number, u: any) => {
          const qty = u.quantity ?? u.total_bottles ?? 0;
          return sum + (Number(qty) || 0);
        }, 0);
        this.warehouseOverview = { ...this.warehouseOverview, todayConsumption: monthConsumption };
      },
      error: (err) => {
        console.error('Error loading consumption:', err);
      }
    });
  }

  /**
   * Filter brands to show only those belonging to the current distillery
   * Excludes brewery brands as they will have separate dashboard
   * TODO: Make this dynamic based on logged-in user's distillery
   */
  private filterByCurrentDistillery(brands: GroupedBrandStock[]): GroupedBrandStock[] {
    // Server-side scoping by mapped license_id is authoritative.
    return brands;
  }

  /**
   * Build API filters from component filters
   */
  private buildApiFilters(): any { 
    const filters: any = {}; 
 
    // Only pass explicit license_id when it is a real issued/app license format. 
    // Otherwise rely on backend user-scope resolution (OIC assignment/profile mapping). 
    if (this.shouldSendExplicitLicenseId(this.resolvedLicenseId)) { 
      filters.license_id = this.resolvedLicenseId; 
    } 

    if (this.filters.brandName) {
      filters.brand_name = this.filters.brandName;
    }
    if (this.filters.liquorType) {
      filters.brand_type = this.filters.liquorType;
    }
    if (this.filters.status) {
      filters.status = this.filters.status;
    }
    if (this.filters.stockLevel) {
      filters.stock_level = this.filters.stockLevel;
    }

    return filters;
  }

  private getDisplayEstablishmentName(): string {
    const fromProfile = String(this.currentDistilleryName || '').trim();
    if (fromProfile) {
      return fromProfile;
    }

    const fromData = String(
      this.groupedBrandStocks.find((b) => String(b?.distilleryName || '').trim())?.distilleryName || ''
    ).trim();
    if (fromData) {
      return fromData;
    }

    return 'Assigned Establishment';
  }

  private inferEstablishmentType(name: string): 'Brewery' | 'Distillery' | 'Establishment' {
    const haystack = `${this.currentLicenseType} ${name}`.toLowerCase();
    if (haystack.includes('brew')) {
      return 'Brewery';
    }
    if (haystack.includes('distill')) {
      return 'Distillery';
    }
    return 'Establishment';
  }

  get inventoryTitle(): string {
    return `${this.getDisplayEstablishmentName()} - Stock Inventory`;
  }

  get inventorySubtitle(): string {
    const establishmentName = this.getDisplayEstablishmentName();
    const unitType = this.inferEstablishmentType(establishmentName).toLowerCase();
    return `Monitor and manage ${unitType} brand inventory for ${establishmentName}`;
  }

  initializeSampleData(): void {
    this.groupedBrandStocks = [
      {
        brandName: 'Sikkim Gold Whisky',
        distilleryName: 'M/s Sikkim Distilleries Ltd',
        brandType: 'Whisky',
        packSizes: {
          180: {
            id: '1',
            capacitySize: 180,
            currentStock: 500,
            maxCapacity: 1000,
            status: 'IN_STOCK',
            totalUtilized: 100,
            reorderLevel: 100,
            utilizationPercentage: 50
          },
          375: {
            id: '2',
            capacitySize: 375,
            currentStock: 300,
            maxCapacity: 800,
            status: 'IN_STOCK',
            totalUtilized: 200,
            reorderLevel: 80,
            utilizationPercentage: 37.5
          },
          750: {
            id: '3',
            capacitySize: 750,
            currentStock: 200,
            maxCapacity: 500,
            status: 'IN_STOCK',
            totalUtilized: 150,
            reorderLevel: 50,
            utilizationPercentage: 40
          }
        },
        totalStock: 1000,
        totalCapacity: 2300,
        totalUtilized: 450,
        lastUpdated: new Date().toISOString(),
        overallStatus: 'IN_STOCK'
      },
      {
        brandName: 'Sikkim Premium Rum',
        distilleryName: 'M/s Sikkim Distilleries Ltd',
        brandType: 'Rum',
        packSizes: {
          375: {
            id: '4',
            capacitySize: 375,
            currentStock: 150,
            maxCapacity: 600,
            status: 'LOW_STOCK',
            totalUtilized: 300,
            reorderLevel: 120,
            utilizationPercentage: 25
          },
          750: {
            id: '5',
            capacitySize: 750,
            currentStock: 80,
            maxCapacity: 400,
            status: 'LOW_STOCK',
            totalUtilized: 200,
            reorderLevel: 100,
            utilizationPercentage: 20
          }
        },
        totalStock: 230,
        totalCapacity: 1000,
        totalUtilized: 500,
        lastUpdated: new Date().toISOString(),
        overallStatus: 'LOW_STOCK'
      }
    ];
  }

  calculateOverview(): void {
    this.warehouseOverview = {
      totalBrands: this.groupedBrandStocks.length,
      totalCapacity: this.groupedBrandStocks.reduce((sum, brand) => sum + brand.totalCapacity, 0),
      totalCurrentStock: this.groupedBrandStocks.reduce((sum, brand) => sum + brand.totalStock, 0),
      lowStockAlerts: this.groupedBrandStocks.filter(b => b.overallStatus === 'LOW_STOCK').length,
      outOfStockAlerts: this.groupedBrandStocks.filter(b => b.overallStatus === 'OUT_OF_STOCK').length,
      newArrivals: 0,
      todayProduction: 0,
      todayConsumption: this.groupedBrandStocks.reduce((sum, brand) => sum + brand.totalUtilized, 0),
      pendingAdjustments: 2
    };
  }

  applyFilters(): void {
    this.filteredStocks = this.groupedBrandStocks.filter(stock => {
      const matchesBrand = !this.filters.brandName ||
        stock.brandName.toLowerCase().includes(this.filters.brandName.toLowerCase());

      const matchesType = !this.filters.liquorType || stock.brandType === this.filters.liquorType;

      const matchesStatus = !this.filters.status || stock.overallStatus === this.filters.status;

      const matchesStockLevel = !this.filters.stockLevel || this.checkStockLevel(stock);

      return matchesBrand && matchesType && matchesStatus && matchesStockLevel;
    });

    // Priority ordering: newly updated first, then latest updated time
    this.filteredStocks.sort((a, b) => {
      const aPriority = this.isRecentlyUpdatedStock(a) ? 1 : 0;
      const bPriority = this.isRecentlyUpdatedStock(b) ? 1 : 0;
      if (bPriority !== aPriority) return bPriority - aPriority;

      const aTs = new Date(a.lastUpdated || 0).getTime() || 0;
      const bTs = new Date(b.lastUpdated || 0).getTime() || 0;
      return bTs - aTs;
    });

    this.newlyUpdatedStocks = this.filteredStocks
      .filter(stock => this.isRecentlyUpdatedStock(stock) && (stock.totalStock || 0) > 0)
      .slice(0, 8);

    this.refreshTimelineMonthOptions();
    this.timelineCurrentPage = 1;

    this.updatePagination();
  }

  isRecentlyUpdatedStock(stock: GroupedBrandStock): boolean {
    if (!stock) return false;
    const updatedTs = new Date(stock.lastUpdated || '').getTime();
    if (!updatedTs) return false;
    const ageMs = Date.now() - updatedTs;
    return ageMs >= 0 && ageMs <= BrandwarehouseComponent.NEW_UPDATE_BADGE_WINDOW_MS;
  }

  getNewUpdateTag(stock: GroupedBrandStock): string {
    if (!stock) return '';
    if (!this.isRecentlyUpdatedStock(stock)) return '';
    if (stock.isNew === true) return 'NEW';
    return 'UPDATED';
  }

  getVisibleNewlyUpdatedStocks(): GroupedBrandStock[] {
    return (this.newlyUpdatedStocks || []).slice(0, 5);
  }

  getHiddenNewUpdatesCount(): number {
    const total = (this.newlyUpdatedStocks || []).length;
    return total > 5 ? total - 5 : 0;
  }

  openNewUpdatesModal(): void {
    this.refreshTimelineMonthOptions();
    const currentMonthKey = this.getCurrentMonthKey();
    const hasCurrentMonth = this.timelineMonthOptions.some(option => option.value === currentMonthKey);
    this.selectedTimelineMonth = hasCurrentMonth ? currentMonthKey : 'ALL';
    this.timelineCurrentPage = 1;
    this.showNewUpdatesModal = true;
  }

  onTimelineMonthChange(): void {
    this.timelineCurrentPage = 1;
  }

  onTimelinePageSizeChange(): void {
    this.timelineCurrentPage = 1;
  }

  changeTimelinePage(page: number): void {
    const totalPages = this.getTimelineTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.timelineCurrentPage = page;
    }
  }

  getPaginatedTimelineStocks(): GroupedBrandStock[] {
    const filtered = this.getMonthFilteredTimelineStocks();
    const start = (this.timelineCurrentPage - 1) * this.timelinePageSize;
    return filtered.slice(start, start + this.timelinePageSize);
  }

  getTimelineTotalPages(): number {
    const total = this.getMonthFilteredTimelineStocks().length;
    return Math.max(1, Math.ceil(total / this.timelinePageSize));
  }

  getTimelineSummary(): string {
    const filtered = this.getMonthFilteredTimelineStocks();
    if (!filtered.length) return 'No updates';
    const start = (this.timelineCurrentPage - 1) * this.timelinePageSize + 1;
    const end = Math.min(filtered.length, start + this.timelinePageSize - 1);
    return `${start}-${end} of ${filtered.length}`;
  }

  private getMonthFilteredTimelineStocks(): GroupedBrandStock[] {
    if (this.selectedTimelineMonth === 'ALL') {
      return this.newlyUpdatedStocks || [];
    }
    return (this.newlyUpdatedStocks || []).filter(
      stock => this.getMonthValue(stock.lastUpdated) === this.selectedTimelineMonth
    );
  }

  private refreshTimelineMonthOptions(): void {
    const monthLabels = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    this.timelineMonthOptions = [
      { value: 'ALL', label: 'All Months' },
      ...monthLabels.map((label, idx) => ({
        value: String(idx + 1).padStart(2, '0'),
        label
      }))
    ];

    if (!this.timelineMonthOptions.some(option => option.value === this.selectedTimelineMonth)) {
      this.selectedTimelineMonth = 'ALL';
    }
  }

  private getCurrentMonthKey(): string {
    return this.getMonthValue(new Date().toISOString());
  }

  private getMonthValue(value: string): string {
    const dt = new Date(String(value || '').trim());
    if (Number.isNaN(dt.getTime())) return '';
    return String(dt.getMonth() + 1).padStart(2, '0');
  }

  checkStockLevel(stock: GroupedBrandStock): boolean {
    const utilizationPercent = stock.totalCapacity > 0 ? (stock.totalStock / stock.totalCapacity) * 100 : 0;

    switch (this.filters.stockLevel) {
      case 'HIGH': return utilizationPercent >= 80;
      case 'MEDIUM': return utilizationPercent >= 40 && utilizationPercent < 80;
      case 'LOW': return utilizationPercent < 40;
      default: return true;
    }
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredStocks.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedStocks = this.filteredStocks.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  clearFilters(): void {
    this.filters = {
      brandName: '', // Clear the brand name completely
      liquorType: '',
      status: '',
      stockLevel: '',
      dateFrom: '',
      dateTo: ''
    };
    this.applyFilters();
  }

  viewBrandDetails(brand: GroupedBrandStock): void {
    this.selectedBrand = brand;
    this.showDetailsModal = true;
  }

  openAdjustmentModal(brand: GroupedBrandStock, packSize: PackSizeInfo): void {
    this.selectedBrand = brand;
    this.selectedPackSize = packSize;
    this.adjustmentQuantity = 0;
    this.adjustmentType = 'ADD';
    this.adjustmentReason = '';
    this.showAdjustmentModal = true;
  }

  submitStockAdjustment(): void {
    if (!this.selectedBrand || !this.selectedPackSize || this.adjustmentQuantity <= 0) return;

    const brandId = parseInt(this.selectedPackSize.id);
    const adjustment = {
      adjustment_type: this.adjustmentType,
      quantity: this.adjustmentQuantity,
      reason: this.adjustmentReason
    };

    this.brandWarehouseService.adjustStock(brandId, adjustment).subscribe({
      next: (response) => {
        console.log('Stock adjusted:', response);

        // Update local data
        if (this.selectedBrand && this.selectedPackSize) {
          this.selectedPackSize.currentStock = response.data.new_stock;
          this.selectedPackSize.status = response.data.status;

          // Recalculate brand totals
          this.selectedBrand.totalStock = Object.values(this.selectedBrand.packSizes)
            .reduce((sum, pack) => sum + pack.currentStock, 0);

          this.selectedBrand.lastUpdated = new Date().toISOString();
        }

        // Recalculate overview
        this.calculateOverview();
        this.applyFilters();

        // Close modal
        this.showAdjustmentModal = false;
        this.selectedBrand = null;
        this.selectedPackSize = null;
      },
      error: (error) => {
        console.error('Error adjusting stock:', error);
        alert(`Error adjusting stock: ${error.error?.errors || error.message || 'Unknown error'}`);
      }
    });
  }

  isLoadingPermits = false;

  viewTransitPermits(brand: GroupedBrandStock): void {
    this.selectedBrand = brand;
    this.selectedTransitPermits = [];
    this.filteredTransitPermits = [];
    this.paginatedTransitPermits = [];
    this.isLoadingPermits = true;
    this.showTransitPermitsModal = true;
    this.permitCurrentPage = 1;
    this.permitSelectedMonth = 'ALL';
    this.permitTotalPages = 1;
    this.permitSummaryText = 'No permits';

    // Get all pack size IDs for this brand
    const packSizeKeys = this.getPackSizeKeys(brand.packSizes);
    const brandWarehouseIds = packSizeKeys.map(key => parseInt(brand.packSizes[key].id));

    console.log('Loading transit permits for brand warehouse IDs:', brandWarehouseIds);

    const allPermits: TransitPermitDetail[] = [];
    let completedRequests = 0;
    const totalRequests = brandWarehouseIds.length;

    if (totalRequests === 0) {
      this.isLoadingPermits = false;
      return;
    }

    brandWarehouseIds.forEach(brandWarehouseId => {
      this.brandWarehouseService.getUtilizations(brandWarehouseId).subscribe({
        next: (utilizations: BrandWarehouseUtilization[]) => {
          utilizations.forEach((util: any) => {
            // Map API response to TransitPermitDetail
            // Handle potential differences in field names between API and interface
            allPermits.push({
              utilizationId: util.id,
              permitNo: util.permit_no || util.permitNo,
              date: util.date,
              distributorName: util.distributor,
              depotAddress: util.depot_address || util.depotAddress,
              vehicleNumber: util.vehicle,
              cases: util.cases,
              bottlesPerCase: util.bottles_per_case || util.bottlesPerCase || 12, // Default if missing
              totalBottles: util.total_bottles || util.totalBottles || (util.cases * (util.bottles_per_case || util.bottlesPerCase || 12)) || util.quantity,
              status: (util.transit_permit_status || util.transitPermitStatus || util.status),
              approvedBy: util.approvedByDisplay || util.approved_by_display || util.approvedBy || util.approved_by,
              approvalDate: util.approvalDate || util.approval_date,
              createdAt: util.createdAt || util.created_at
            });
          });

          completedRequests++;
          if (completedRequests === totalRequests) {
            this.finalizeTransitPermits(allPermits);
          }
        },
        error: (error) => {
          console.error(`Error loading utilizations for warehouse ${brandWarehouseId}:`, error);
          completedRequests++;
          if (completedRequests === totalRequests) {
            this.finalizeTransitPermits(allPermits);
          }
        }
      });
    });
  }

  finalizeTransitPermits(permits: TransitPermitDetail[]): void {
    const parseTs = (value: any): number => {
      const s = String(value || '').trim();
      if (!s) return Number.NEGATIVE_INFINITY;
      const t = new Date(s).getTime();
      return isNaN(t) ? Number.NEGATIVE_INFINITY : t;
    };

    const permitSeq = (permitNo: any): number => {
      const s = String(permitNo || '').trim();
      // Common format: TRP/33/EXCISE
      const m = s.match(/(?:^|\/)TRP\/(\d+)\//i);
      if (m && m[1]) return parseInt(m[1], 10) || 0;
      const parts = s.split('/').filter(Boolean);
      const maybe = parts.length >= 2 ? parseInt(parts[1], 10) : NaN;
      return isNaN(maybe) ? 0 : maybe;
    };

    // Sort newest first:
    // 1) approvalDate/createdAt/date (timestamp) desc
    // 2) permit sequence number desc
    // 3) utilization id desc
    permits.sort((a, b) => {
      const ta = Math.max(parseTs(a.approvalDate), parseTs(a.createdAt), parseTs(a.date));
      const tb = Math.max(parseTs(b.approvalDate), parseTs(b.createdAt), parseTs(b.date));
      if (tb !== ta) return tb - ta;

      const sa = permitSeq(a.permitNo);
      const sb = permitSeq(b.permitNo);
      if (sb !== sa) return sb - sa;

      const ia = Number(a.utilizationId || 0);
      const ib = Number(b.utilizationId || 0);
      return ib - ia;
    });
    this.selectedTransitPermits = permits;
    this.isLoadingPermits = false;
    // Reset pagination & auto-select current month if data exists
    this.permitCurrentPage = 1;
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const hasCurrentMonth = permits.some(p => this.getPermitMonth(p.date) === currentMonth);
    this.permitSelectedMonth = hasCurrentMonth ? currentMonth : 'ALL';
    this.recomputePermitView();
  }

  getPermitMonth(dateStr: string): string {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : String(d.getMonth() + 1).padStart(2, '0');
  }

  getFilteredPermits(): TransitPermitDetail[] {
    return this.filteredTransitPermits;
  }

  getPaginatedPermits(): TransitPermitDetail[] {
    return this.paginatedTransitPermits;
  }

  getPermitTotalPages(): number {
    return this.permitTotalPages;
  }

  getPermitSummary(): string {
    return this.permitSummaryText;
  }

  onPermitMonthChange(): void {
    this.permitCurrentPage = 1;
    this.recomputePermitView();
  }
  onPermitPageSizeChange(): void {
    this.permitCurrentPage = 1;
    this.recomputePermitView();
  }
  changePermitPage(page: number): void {
    if (page < 1 || page > this.permitTotalPages) return;
    this.permitCurrentPage = page;
    this.recomputePermitView();
  }

  private recomputePermitView(): void {
    const pageSize = Math.max(1, Number(this.permitPageSize) || 1);

    this.filteredTransitPermits = this.permitSelectedMonth === 'ALL'
      ? this.selectedTransitPermits
      : this.selectedTransitPermits.filter(p => this.getPermitMonth(p.date) === this.permitSelectedMonth);

    this.permitTotalPages = Math.max(1, Math.ceil(this.filteredTransitPermits.length / pageSize));
    this.permitCurrentPage = Math.min(Math.max(1, this.permitCurrentPage), this.permitTotalPages);

    const startIndex = (this.permitCurrentPage - 1) * pageSize;
    this.paginatedTransitPermits = this.filteredTransitPermits.slice(startIndex, startIndex + pageSize);

    if (!this.filteredTransitPermits.length) {
      this.permitSummaryText = 'No permits';
      return;
    }

    const start = startIndex + 1;
    const end = startIndex + this.paginatedTransitPermits.length;
    this.permitSummaryText = `${start}-${end} of ${this.filteredTransitPermits.length}`;
  }

  trackByPermit(index: number, permit: TransitPermitDetail): string {
    return `${permit.permitNo || index}|${permit.date}`;
  }

  viewLastEntries(brand: GroupedBrandStock): void {
    this.selectedBrand = brand;
    this.isLoadingLastEntries = true;
    this.selectedLastEntries = [];

    // Get all pack size IDs for this brand
    const packSizeKeys = this.getPackSizeKeys(brand.packSizes);
    const brandWarehouseIds = packSizeKeys.map(key => parseInt(brand.packSizes[key].id));

    console.log('Loading recent entries for brand warehouse IDs:', brandWarehouseIds);

    // Fetch arrivals, utilizations, and cancellations for all pack sizes
    const allEntries: LastEntryDetail[] = [];
    let completedRequests = 0;
    const totalRequests = brandWarehouseIds.length * 3; // arrivals + utilizations + cancellations

    brandWarehouseIds.forEach(brandWarehouseId => {
      // Fetch arrivals (production, stock additions)
      this.brandWarehouseService.getArrivals(brandWarehouseId, { limit: 10 }).subscribe({
        next: (arrivals: any[]) => {
          arrivals.forEach((arrival: any) => {
            const packSize = this.getPackSizeFromId(brand, brandWarehouseId.toString());
            const eventDate = this.resolveEntryDate(
              arrival.arrival_date,
              arrival.arrivalDate,
              arrival.created_at,
              arrival.createdAt,
              arrival.updated_at,
              arrival.updatedAt
            );
            allEntries.push({
              id: `arrival-${arrival.id}`,
              date: eventDate,
              type: 'PRODUCTION',
              activity: 'Stock Added',
              quantity: arrival.quantity_added || arrival.quantityAdded,
              previousStock: arrival.previous_stock || arrival.previousStock,
              newStock: arrival.new_stock || arrival.newStock,
              referenceNo: arrival.reference_no || arrival.referenceNo,
              description: `Stock addition - ${packSize}ml`,
              officerName: 'System',
              packSize: packSize,
              sortTimestamp: this.toSortTimestamp(eventDate)
            });
          });

          completedRequests++;
          if (completedRequests === totalRequests) {
            this.finalizeLastEntries(allEntries);
          }
        },
        error: (error) => {
          console.error('Error loading arrivals:', error);
          completedRequests++;
          if (completedRequests === totalRequests) {
            this.finalizeLastEntries(allEntries);
          }
        }
      });

      // Fetch utilizations (transit permits, stock reductions)
      this.brandWarehouseService.getUtilizations(brandWarehouseId, { limit: 10 }).subscribe({
        next: (utilizations: any[]) => {
          utilizations.forEach((util: any) => {
            const packSize = this.getPackSizeFromId(brand, brandWarehouseId.toString());
            const eventDate = this.resolveEntryDate(
              util.approval_date,
              util.approvalDate,
              util.updated_at,
              util.updatedAt,
              util.created_at,
              util.createdAt,
              util.date
            );
            allEntries.push({
              id: `util-${util.id}`,
              date: eventDate,
              type: 'TRANSIT_PERMIT',
              activity: 'Stock Utilized',
              quantity: util.quantity,
              previousStock: util.previousStock || 0,
              newStock: util.newStock || 0,
              referenceNo: util.permit_no || util.permitNo,
              description: `Transit to ${util.distributor} - ${packSize}ml`,
              transitPermitNo: util.permit_no || util.permitNo,
              packSize: packSize,
              sortTimestamp: this.toSortTimestamp(eventDate)
            });
          });

          completedRequests++;
          if (completedRequests === totalRequests) {
            this.finalizeLastEntries(allEntries);
          }
        },
        error: (error) => {
          console.error('Error loading utilizations:', error);
          completedRequests++;
          if (completedRequests === totalRequests) {
            this.finalizeLastEntries(allEntries);
          }
        }
      });

      // Fetch cancellations
      this.brandWarehouseService.getCancellations(brandWarehouseId).subscribe({
        next: (cancellations: any[]) => {
          cancellations.forEach((cancel: any) => {
            const packSize = this.getPackSizeFromId(brand, brandWarehouseId.toString());
            const eventDate = this.resolveEntryDate(
              cancel.cancellationDate,
              cancel.cancellation_date,
              cancel.updatedAt,
              cancel.updated_at,
              cancel.createdAt,
              cancel.created_at
            );
            allEntries.push({
              id: `cancel-${cancel.id}`,
              date: eventDate,
              type: 'CANCELLATION',
              activity: 'Stock Restored',
              quantity: cancel.bottlesReversed || cancel.bottles_reversed || cancel.quantityBottles || cancel.quantity_bottles || 0,
              previousStock: cancel.previousStock || cancel.previous_stock || 0,
              newStock: cancel.newStock || cancel.new_stock || 0,
              referenceNo: cancel.permitNo || cancel.permit_no || cancel.referenceNo || cancel.reference_no || '',
              description: `Cancelled Permit - Restored Stock - ${packSize}ml (Reason: ${cancel.remarks || cancel.reason || 'N/A'})`,
              transitPermitNo: cancel.permitNo || cancel.permit_no || cancel.referenceNo || cancel.reference_no || '',
              packSize: packSize,
              sortTimestamp: this.toSortTimestamp(eventDate)
            });
          });

          completedRequests++;
          if (completedRequests === totalRequests) {
            this.finalizeLastEntries(allEntries);
          }
        },
        error: (error) => {
          console.error('Error loading cancellations:', error);
          completedRequests++;
          if (completedRequests === totalRequests) {
            this.finalizeLastEntries(allEntries);
          }
        }
      });
    });

    this.showLastEntriesModal = true;
  }

  getPackSizeFromId(brand: GroupedBrandStock, brandWarehouseId: string): number {
    const packSizeKeys = this.getPackSizeKeys(brand.packSizes);
    for (const key of packSizeKeys) {
      if (brand.packSizes[key].id === brandWarehouseId) {
        return brand.packSizes[key].capacitySize;
      }
    }
    return 0;
  }

  finalizeLastEntries(entries: LastEntryDetail[]): void {
    entries.sort((a, b) => {
      const timeDiff = this.getEntrySortTimestamp(b) - this.getEntrySortTimestamp(a);
      if (timeDiff !== 0) return timeDiff;
      const idDiff = this.extractEntryNumericId(b.id) - this.extractEntryNumericId(a.id);
      if (idDiff !== 0) return idDiff;
      return String(a.id).localeCompare(String(b.id));
    });

    this.selectedLastEntries = entries;
    this.isLoadingLastEntries = false;
    // Reset pagination & auto-select current month
    this.entryCurrentPage = 1;
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const hasCurrentMonth = entries.some(e => this.getEntryMonth(e.date) === currentMonth);
    this.entrySelectedMonth = hasCurrentMonth ? currentMonth : 'ALL';
  }

  getEntryMonth(dateStr: string): string {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : String(d.getMonth() + 1).padStart(2, '0');
  }

  getFilteredEntries(): LastEntryDetail[] {
    if (this.entrySelectedMonth === 'ALL') return this.selectedLastEntries;
    return this.selectedLastEntries.filter(e => this.getEntryMonth(e.date) === this.entrySelectedMonth);
  }

  getPaginatedEntries(): LastEntryDetail[] {
    const filtered = this.getFilteredEntries();
    const start = (this.entryCurrentPage - 1) * this.entryPageSize;
    return filtered.slice(start, start + this.entryPageSize);
  }

  getEntryTotalPages(): number {
    return Math.max(1, Math.ceil(this.getFilteredEntries().length / this.entryPageSize));
  }

  getEntrySummary(): string {
    const filtered = this.getFilteredEntries();
    if (!filtered.length) return 'No entries';
    const start = (this.entryCurrentPage - 1) * this.entryPageSize + 1;
    const end = Math.min(filtered.length, start + this.entryPageSize - 1);
    return `${start}–${end} of ${filtered.length}`;
  }

  onEntryMonthChange(): void { this.entryCurrentPage = 1; }
  onEntryPageSizeChange(): void { this.entryCurrentPage = 1; }
  changeEntryPage(page: number): void {
    if (page >= 1 && page <= this.getEntryTotalPages()) this.entryCurrentPage = page;
  }

  private resolveEntryDate(...candidates: any[]): string {
    for (const candidate of candidates) {
      const value = String(candidate ?? '').trim();
      if (!value) continue;
      const dt = new Date(value);
      if (!Number.isNaN(dt.getTime())) {
        return dt.toISOString();
      }
    }
    return new Date().toISOString();
  }

  private toSortTimestamp(value: any): number {
    const dt = new Date(String(value ?? ''));
    const time = dt.getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  private getEntrySortTimestamp(entry: LastEntryDetail): number {
    if (Number.isFinite(entry.sortTimestamp as number)) {
      return Number(entry.sortTimestamp);
    }
    return this.toSortTimestamp(entry.date);
  }

  private extractEntryNumericId(entryId: string): number {
    const match = String(entryId || '').match(/(\d+)(?!.*\d)/);
    if (!match) return 0;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  viewProduction(brand: GroupedBrandStock): void {
    this.selectedBrand = brand;
    this.showProductionModal = true;
    this.productionSelectedMonth = this.getCurrentMonthKey();
    this.loadProductionData(brand);
  }

  loadProductionData(brand: GroupedBrandStock): void {
    this.isLoadingProduction = true;

    // Initialize with empty data
    this.productionHistory = [];
    this.filteredProductionHistory = [];
    this.productionSummary = {
      todayProduction: 0,
      stockBefore: brand.totalStock,
      stockAfter: brand.totalStock,
      latestReference: 'N/A',
      productionManager: 'N/A',
      productionDate: '',
      productionTime: ''
    };

    // Get the first pack size ID for the API call
    const packSizeKeys = this.getPackSizeKeys(brand.packSizes);
    if (packSizeKeys.length === 0) {
      this.isLoadingProduction = false;
      return;
    }

    const firstPackSize = brand.packSizes[packSizeKeys[0]];
    const brandWarehouseId = parseInt(firstPackSize.id);

    // Store current pack size ID for highlighting
    this.currentPackSizeId = firstPackSize.id;

    this.loadProductionDataForSelectedMonth(brandWarehouseId);
  }



  getCurrentDate(): Date {
    return new Date();
  }

  getCurrentPackSizeId(): string {
    return this.currentPackSizeId;
  }

  getCurrentPackSize(): string {
    if (!this.selectedBrand || !this.currentPackSizeId) {
      return '';
    }
    const packSizeKeys = this.getPackSizeKeys(this.selectedBrand.packSizes);
    for (const key of packSizeKeys) {
      if (this.selectedBrand.packSizes[key].id === this.currentPackSizeId) {
        return `${this.selectedBrand.packSizes[key].capacitySize}ml`;
      }
    }
    return '';
  }

  switchPackSize(packSizeId: string): void {
    console.log('switchPackSize called with:', packSizeId);
    console.log('Current pack size ID:', this.currentPackSizeId);
    console.log('Selected brand:', this.selectedBrand);

    if (!this.selectedBrand || packSizeId === this.currentPackSizeId) {
      console.log('Returning early - same pack size or no brand selected');
      return;
    }

    // Update current pack size ID
    this.currentPackSizeId = packSizeId;
    console.log('Updated current pack size ID to:', this.currentPackSizeId);

    // Reload production data for the new pack size
    this.isLoadingProduction = true;
    this.productionCurrentPage = 1;
    const brandWarehouseId = parseInt(packSizeId);
    console.log('Loading production data for brand warehouse ID:', brandWarehouseId);

    this.productionHistory = [];
    this.filteredProductionHistory = [];
    this.loadProductionDataForSelectedMonth(brandWarehouseId);
  }

  onProductionMonthChange(): void {
    if (!this.currentPackSizeId) return;
    const brandWarehouseId = parseInt(this.currentPackSizeId);
    if (!Number.isFinite(brandWarehouseId)) return;

    this.isLoadingProduction = true;
    this.productionCurrentPage = 1;
    this.productionHistory = [];
    this.filteredProductionHistory = [];
    this.loadProductionDataForSelectedMonth(brandWarehouseId);
  }

  onProductionPageSizeChange(): void {
    this.productionCurrentPage = 1;
  }

  changeProductionPage(page: number): void {
    if (page >= 1 && page <= this.getProductionTotalPages()) {
      this.productionCurrentPage = page;
    }
  }

  getProductionTotalPages(): number {
    return Math.max(1, Math.ceil((this.filteredProductionHistory || []).length / this.productionPageSize));
  }

  getPaginatedProductionHistory(): ProductionBatch[] {
    const filtered = this.filteredProductionHistory || [];
    const start = (this.productionCurrentPage - 1) * this.productionPageSize;
    return filtered.slice(start, start + this.productionPageSize);
  }

  getProductionSummary(): string {
    const filtered = this.filteredProductionHistory || [];
    if (!filtered.length) return 'No batches';
    const start = (this.productionCurrentPage - 1) * this.productionPageSize + 1;
    const end = Math.min(filtered.length, start + this.productionPageSize - 1);
    return `${start}-${end} of ${filtered.length}`;
  }

  private loadProductionDataForSelectedMonth(brandWarehouseId: number): void {
    const daysBack = this.getDaysBackForMonth(this.productionSelectedMonth);
    const limit = 500;

    this.productionService.getProductionHistory(brandWarehouseId, limit, daysBack).subscribe({
      next: (response) => {
        console.log('Production history response:', response);

        if (response && response.success) {
          this.productionHistory = response.productionHistory || [];
          this.applyProductionMonthFilter();
        } else {
          this.productionHistory = [];
          this.filteredProductionHistory = [];
          this.applyProductionMonthFilter();
        }

        this.isLoadingProduction = false;
      },
      error: (error) => {
        console.error('Error loading production data:', error);
        this.productionHistory = [];
        this.filteredProductionHistory = [];
        this.applyProductionMonthFilter();
        this.isLoadingProduction = false;
      }
    });
  }

  private applyProductionMonthFilter(): void {
    const month = this.productionSelectedMonth;
    const year = new Date().getFullYear();

    const normalized = [...(this.productionHistory || [])].sort((a, b) => {
      const aTime = this.getBatchSortTime(a);
      const bTime = this.getBatchSortTime(b);
      return bTime - aTime;
    });

    this.filteredProductionHistory = normalized.filter((batch) => {
      const dt = this.getBatchDate(batch);
      if (!dt) return false;
      const batchMonth = String(dt.getMonth() + 1).padStart(2, '0');
      return dt.getFullYear() === year && batchMonth === month;
    });

    const totalPages = this.getProductionTotalPages();
    if (this.productionCurrentPage > totalPages) {
      this.productionCurrentPage = 1;
    }

    if (this.filteredProductionHistory.length > 0) {
      const firstBatch = this.filteredProductionHistory[0];
      const totalQuantity = this.filteredProductionHistory.reduce((sum, b) => sum + Number(b.quantityProduced || 0), 0);

      this.productionSummary = {
        todayProduction: totalQuantity,
        stockBefore: firstBatch.stockBefore,
        stockAfter: firstBatch.stockAfter,
        latestReference: firstBatch.sourceReference || firstBatch.batchReference,
        productionManager: firstBatch.productionManager,
        productionDate: firstBatch.productionDate,
        productionTime: firstBatch.productionTime
      };
      return;
    }

    const fallbackStock = this.getCurrentPackSizeStock();
    this.productionSummary = {
      todayProduction: 0,
      stockBefore: fallbackStock,
      stockAfter: fallbackStock,
      latestReference: 'N/A',
      productionManager: 'N/A',
      productionDate: '',
      productionTime: ''
    };
  }

  private getCurrentPackSizeStock(): number {
    if (!this.selectedBrand || !this.currentPackSizeId) return this.selectedBrand?.totalStock ?? 0;
    const packSizeKeys = this.getPackSizeKeys(this.selectedBrand.packSizes);
    for (const key of packSizeKeys) {
      if (this.selectedBrand.packSizes[key].id === this.currentPackSizeId) {
        return this.selectedBrand.packSizes[key].currentStock;
      }
    }
    return this.selectedBrand.totalStock || 0;
  }

  private getDaysBackForMonth(monthValue: string): number {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = Number(monthValue) - 1;
    if (!Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return 30;

    const monthStart = new Date(year, monthIndex, 1);
    const diffMs = now.getTime() - monthStart.getTime();
    if (diffMs < 0) return 1;

    const rawDays = Math.ceil(diffMs / BrandwarehouseComponent.DAY_MS) + 1;
    return Math.min(Math.max(rawDays, 1), 366);
  }

  private getBatchDate(batch: ProductionBatch): Date | null {
    const candidates = [
      (batch as any)?.productionDatetime,
      (batch as any)?.productionDate,
      (batch as any)?.createdAt,
      (batch as any)?.updatedAt,
    ];

    for (const candidate of candidates) {
      const value = String(candidate ?? '').trim();
      if (!value) continue;
      const dt = new Date(value);
      if (!Number.isNaN(dt.getTime())) return dt;
    }

    return null;
  }

  private getBatchSortTime(batch: ProductionBatch): number {
    const dt = this.getBatchDate(batch);
    return dt ? dt.getTime() : 0;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'IN_STOCK': return 'success';
      case 'LOW_STOCK': return 'warning';
      case 'OUT_OF_STOCK': return 'danger';
      case 'OVERSTOCKED': return 'info';
      default: return 'secondary';
    }
  }

  getUtilizationColor(utilization: number): string {
    if (utilization >= 90) return 'danger';
    if (utilization >= 70) return 'warning';
    if (utilization >= 40) return 'success';
    return 'info';
  }

  exportToExcel(): void {
    // TODO: Implement Excel export functionality
    console.log('Exporting warehouse data to Excel...');
  }

  /**
   * Get current distillery name
   * TODO: Replace with actual user session/authentication service
   */
  getCurrentDistillery(): string {
    return this.currentDistilleryName || 'N/A';
  }

  /**
   * Set current distillery (for future dynamic implementation)
   * TODO: This will be called when user authentication is implemented
   */
  setCurrentDistillery(distilleryName: string): void {
    this.currentDistilleryName = String(distilleryName || '').trim();
    this.loadWarehouseData();
  }

  refreshData(): void {
    this.loadWarehouseData();
  }

  getTotalStock(): number {
    return this.filteredStocks.reduce((sum, brand) => sum + brand.totalStock, 0);
  }

  getAdjustmentResult(): number {
    if (!this.selectedPackSize) return 0;

    return this.adjustmentType === 'ADD'
      ? (this.selectedPackSize.currentStock + this.adjustmentQuantity)
      : Math.max(0, this.selectedPackSize.currentStock - this.adjustmentQuantity);
  }

  getPackSizeKeys(packSizes: { [key: number]: PackSizeInfo }): number[] {
    return Object.keys(packSizes).map(key => parseInt(key)).sort((a, b) => a - b);
  }

  getPageNumbers(): number[] {
    const pageCount = Math.min(5, this.totalPages);
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
}
