import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandWarehouseService } from '../../services/brand-warehouse.service';
import { ProductionService, ProductionBatch } from '../../services/production.service';

interface TransitPermitDetail {
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
}

interface LastEntryDetail {
  id: string;
  date: string;
  type: 'PRODUCTION' | 'CONSUMPTION' | 'ADJUSTMENT' | 'TRANSIT_PERMIT';
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceNo: string;
  description: string;
  officerName?: string;
  transitPermitNo?: string;
  packSize?: number;  // Pack size in ml
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
  brandName: string;
  distilleryName: string;
  brandType: string;
  packSizes: { [key: number]: PackSizeInfo };
  totalStock: number;
  totalCapacity: number;
  totalUtilized: number;
  lastUpdated: string;
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

@Component({
  selector: 'app-brandwarehouse',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brandwarehouse.component.html',
  styleUrls: ['./brandwarehouse.component.scss']
})
export class BrandwarehouseComponent implements OnInit {
  Math = Math;

  // Current distillery context - TODO: Make this dynamic based on logged-in user
  private readonly CURRENT_DISTILLERY = 'Sikkim'; // This will be dynamic later
  private readonly EXCLUDED_BREWERIES: string[] = []; // Show all Sikkim brands including breweries

  // Data
  groupedBrandStocks: GroupedBrandStock[] = [];
  filteredStocks: GroupedBrandStock[] = [];
  paginatedStocks: GroupedBrandStock[] = [];
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
  isLoadingProduction = false;
  isLoadingLastEntries = false;
  adjustmentQuantity = 0;
  adjustmentType: 'ADD' | 'SUBTRACT' = 'ADD';
  adjustmentReason = '';
  selectedTransitPermits: TransitPermitDetail[] = [];
  selectedLastEntries: LastEntryDetail[] = [];

  // Production data
  productionHistory: ProductionBatch[] = [];
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
    private productionService: ProductionService
  ) { }

  ngOnInit(): void {
    this.initializeSikkimBrands();
    this.loadWarehouseData();
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

    // Load overview first
    this.brandWarehouseService.getWarehouseOverview().subscribe({
      next: (overview) => {
        this.warehouseOverview = overview;
      },
      error: (error) => {
        console.error('Error loading overview:', error);
      }
    });

    // Load brand warehouses with distillery filter
    this.brandWarehouseService.getGroupedBrandWarehouses(this.buildApiFilters()).subscribe({
      next: (data) => {
        console.log('🔍 Received grouped data from service:', data);
        console.log('📊 Data length:', data.length);
        if (data.length > 0) {
          console.log('📋 Sample brand:', data[0]);
        }

        // Filter to show only current distillery's brands
        this.groupedBrandStocks = this.filterByCurrentDistillery(data);
        console.log('✅ After distillery filtering:', this.groupedBrandStocks.length);

        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading warehouse data:', error);
        this.isLoading = false;
        // Fall back to sample data on error
        this.initializeSampleData();
        this.calculateOverview();
        this.applyFilters();
      }
    });
  }

  /**
   * Filter brands to show only those belonging to the current distillery
   * Excludes brewery brands as they will have separate dashboard
   * TODO: Make this dynamic based on logged-in user's distillery
   */
  private filterByCurrentDistillery(brands: GroupedBrandStock[]): GroupedBrandStock[] {
    return brands.filter(brand => {
      if (!brand.distilleryName) return false;

      const distilleryName = brand.distilleryName.toLowerCase();

      // Check if it belongs to current distillery
      const belongsToCurrentDistillery = distilleryName.includes(this.CURRENT_DISTILLERY.toLowerCase());

      // Check if it's a brewery (exclude breweries from distillery dashboard)
      const isBrewery = this.EXCLUDED_BREWERIES.some(brewery =>
        distilleryName.includes(brewery.toLowerCase())
      );

      // Include only if belongs to current distillery AND is not a brewery
      return belongsToCurrentDistillery && !isBrewery;
    });
  }

  /**
   * Build API filters from component filters
   */
  private buildApiFilters(): any {
    const filters: any = {
      // Always filter by current distillery
      distillery_name: this.CURRENT_DISTILLERY
      // Show all Sikkim brands including breweries
    };

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

    this.updatePagination();
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

  viewTransitPermits(brand: GroupedBrandStock): void {
    this.selectedBrand = brand;
    // Sample transit permits data
    this.selectedTransitPermits = [
      {
        permitNo: 'TP-2024-001',
        date: '2024-01-20',
        distributorName: 'ABC Distributors Pvt Ltd',
        depotAddress: 'Sector 5, Industrial Area, Gangtok',
        vehicleNumber: 'SK-01-AB-1234',
        cases: 50,
        bottlesPerCase: 12,
        totalBottles: 600,
        status: 'DELIVERED',
        approvedBy: 'John Doe',
        approvalDate: '2024-01-19'
      },
      {
        permitNo: 'TP-2024-002',
        date: '2024-01-22',
        distributorName: 'XYZ Wine Shop',
        depotAddress: 'MG Road, Gangtok',
        vehicleNumber: 'SK-02-CD-5678',
        cases: 25,
        bottlesPerCase: 12,
        totalBottles: 300,
        status: 'IN_TRANSIT',
        approvedBy: 'Jane Smith',
        approvalDate: '2024-01-21'
      }
    ];
    this.showTransitPermitsModal = true;
  }

  viewLastEntries(brand: GroupedBrandStock): void {
    this.selectedBrand = brand;
    this.isLoadingLastEntries = true;
    this.selectedLastEntries = [];
    
    // Get all pack size IDs for this brand
    const packSizeKeys = this.getPackSizeKeys(brand.packSizes);
    const brandWarehouseIds = packSizeKeys.map(key => parseInt(brand.packSizes[key].id));
    
    console.log('Loading recent entries for brand warehouse IDs:', brandWarehouseIds);
    
    // Fetch arrivals and utilizations for all pack sizes
    const allEntries: LastEntryDetail[] = [];
    let completedRequests = 0;
    const totalRequests = brandWarehouseIds.length * 2; // arrivals + utilizations for each pack size
    
    brandWarehouseIds.forEach(brandWarehouseId => {
      // Fetch arrivals (production, stock additions)
      this.brandWarehouseService.getArrivals(brandWarehouseId, { limit: 10 }).subscribe({
        next: (arrivals: any[]) => {
          arrivals.forEach((arrival: any) => {
            const packSize = this.getPackSizeFromId(brand, brandWarehouseId.toString());
            allEntries.push({
              id: `arrival-${arrival.id}`,
              date: arrival.arrival_date || arrival.arrivalDate,
              type: 'PRODUCTION',
              quantity: arrival.quantity_added || arrival.quantityAdded,
              previousStock: arrival.previous_stock || arrival.previousStock,
              newStock: arrival.new_stock || arrival.newStock,
              referenceNo: arrival.reference_no || arrival.referenceNo,
              description: `Stock addition - ${packSize}ml`,
              officerName: 'System',
              packSize: packSize
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
            allEntries.push({
              id: `util-${util.id}`,
              date: util.date,
              type: 'TRANSIT_PERMIT',
              quantity: util.quantity,
              previousStock: 0, // Will be calculated
              newStock: 0, // Will be calculated
              referenceNo: util.permit_no || util.permitNo,
              description: `Transit to ${util.distributor} - ${packSize}ml`,
              transitPermitNo: util.permit_no || util.permitNo,
              packSize: packSize
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
    // Sort by date descending (most recent first)
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Take only the most recent 10 entries
    this.selectedLastEntries = entries.slice(0, 10);
    this.isLoadingLastEntries = false;
    
    console.log('Finalized recent entries:', this.selectedLastEntries);
  }

  viewProduction(brand: GroupedBrandStock): void {
    this.selectedBrand = brand;
    this.showProductionModal = true;
    this.loadProductionData(brand);
  }

  loadProductionData(brand: GroupedBrandStock): void {
    this.isLoadingProduction = true;
    
    // Initialize with empty data
    this.productionHistory = [];
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

    // Load production history
    this.productionService.getProductionHistory(brandWarehouseId, 10, 30).subscribe({
      next: (response) => {
        console.log('Production history response:', response);
        
        if (response && response.success) {
          // Backend returns camelCase
          this.productionHistory = response.productionHistory || [];
          
          console.log('Production history array:', this.productionHistory);
          console.log('Production history length:', this.productionHistory.length);

          // Update production summary
          if (this.productionHistory && this.productionHistory.length > 0) {
            const firstBatch = this.productionHistory[0];
            this.productionSummary = {
              todayProduction: response.summary?.totalQuantity || 0,
              stockBefore: firstBatch.stockBefore,
              stockAfter: firstBatch.stockAfter,
              latestReference: firstBatch.sourceReference || firstBatch.batchReference,
              productionManager: firstBatch.productionManager,
              productionDate: firstBatch.productionDate,
              productionTime: firstBatch.productionTime
            };
            console.log('Production summary updated:', this.productionSummary);
          } else {
            console.log('No production history found, using defaults');
            // No production history, use current stock
            this.productionSummary = {
              todayProduction: 0,
              stockBefore: brand.totalStock,
              stockAfter: brand.totalStock,
              latestReference: 'N/A',
              productionManager: 'N/A',
              productionDate: '',
              productionTime: ''
            };
          }
        }
        this.isLoadingProduction = false;
      },
      error: (error) => {
        console.error('Error loading production data:', error);
        this.productionHistory = [];
        this.isLoadingProduction = false;
      }
    });
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
    const brandWarehouseId = parseInt(packSizeId);
    console.log('Loading production data for brand warehouse ID:', brandWarehouseId);

    this.productionService.getProductionHistory(brandWarehouseId, 10, 30).subscribe({
      next: (response) => {
        console.log('Production history response for pack size:', response);
        
        if (response && response.success) {
          this.productionHistory = response.productionHistory || [];
          
          if (this.productionHistory && this.productionHistory.length > 0) {
            const firstBatch = this.productionHistory[0];
            this.productionSummary = {
              todayProduction: response.summary?.totalQuantity || 0,
              stockBefore: firstBatch.stockBefore,
              stockAfter: firstBatch.stockAfter,
              latestReference: firstBatch.sourceReference || firstBatch.batchReference,
              productionManager: firstBatch.productionManager,
              productionDate: firstBatch.productionDate,
              productionTime: firstBatch.productionTime
            };
          } else {
            // No production history, use current stock from selected pack size
            if (this.selectedBrand) {
              const packSizeKeys = this.getPackSizeKeys(this.selectedBrand.packSizes);
              let currentStock = 0;
              for (const key of packSizeKeys) {
                if (this.selectedBrand.packSizes[key].id === packSizeId) {
                  currentStock = this.selectedBrand.packSizes[key].currentStock;
                  break;
                }
              }
              
              this.productionSummary = {
                todayProduction: 0,
                stockBefore: currentStock,
                stockAfter: currentStock,
                latestReference: 'N/A',
                productionManager: 'N/A',
                productionDate: '',
                productionTime: ''
              };
            }
          }
        }
        this.isLoadingProduction = false;
      },
      error: (error) => {
        console.error('Error loading production data:', error);
        this.productionHistory = [];
        this.isLoadingProduction = false;
      }
    });
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
    return this.CURRENT_DISTILLERY;
  }

  /**
   * Set current distillery (for future dynamic implementation)
   * TODO: This will be called when user authentication is implemented
   */
  setCurrentDistillery(distilleryName: string): void {
    // TODO: Implement when making dashboard dynamic
    console.log(`Future implementation: Set distillery to ${distilleryName}`);
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
