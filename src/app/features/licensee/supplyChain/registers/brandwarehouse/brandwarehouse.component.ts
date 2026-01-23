import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HologramDataService } from '../../services/hologram-data.service';

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
}

interface BrandStock {
  id: string;
  brandName: string;
  brandCode: string;
  alcoholPercent: string;
  bottleSize: number;
  liquorType: string;
  currentStock: number;
  capacity180ml: number; // Capacity for 180ml bottles
  capacity360ml: number; // Capacity for 360ml bottles
  capacity550ml: number; // Capacity for 550ml bottles
  totalProduction: number;
  lastUpdated: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';
  reorderLevel: number;
  maxCapacity: number;
  averageDailyUsage: number;
  totalUtilized: number; // Total quantity utilized through transit permits
  transitPermits: TransitPermitDetail[]; // All transit permits for this brand
  lastEntry: {
    date: string;
    type: 'PRODUCTION' | 'CONSUMPTION' | 'ADJUSTMENT' | 'TRANSIT_PERMIT';
    quantity: number;
    previousStock: number;
    newStock: number;
    referenceNo: string;
  };
  lastEntries: LastEntryDetail[]; // All recent entries
  monthlyMovement: {
    month: string;
    opening: number;
    production: number;
    consumption: number;
    wastage: number;
    closing: number;
  };
}

interface WarehouseOverview {
  totalBrands: number;
  totalCapacity180ml: number;
  totalCapacity360ml: number;
  totalCapacity550ml: number;
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
  styleUrl: './brandwarehouse.component.scss'
})
export class BrandwarehouseComponent implements OnInit {
  Math = Math;

  // Data
  brandStocks: BrandStock[] = [];
  filteredStocks: BrandStock[] = [];
  paginatedStocks: BrandStock[] = [];
  warehouseOverview: WarehouseOverview = {
    totalBrands: 0,
    totalCapacity180ml: 0,
    totalCapacity360ml: 0,
    totalCapacity550ml: 0,
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
    brandName: '',
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
  selectedBrand: BrandStock | null = null;
  showDetailsModal = false;
  showAdjustmentModal = false;
  showTransitPermitsModal = false;
  showLastEntriesModal = false;
  adjustmentQuantity = 0;
  adjustmentType: 'ADD' | 'SUBTRACT' = 'ADD';
  adjustmentReason = '';
  selectedTransitPermits: TransitPermitDetail[] = [];
  selectedLastEntries: LastEntryDetail[] = [];

  // Chart data for stock levels
  stockLevelChart = {
    labels: [] as string[],
    data: [] as number[]
  };

  constructor(private hologramDataService: HologramDataService) {}

  ngOnInit(): void {
    this.loadWarehouseData();
    this.initializeSampleData();
  }

  loadWarehouseData(): void {
    this.isLoading = true;
    // TODO: Replace with actual API call
    setTimeout(() => {
      this.calculateOverview();
      this.applyFilters();
      this.isLoading = false;
    }, 1000);
  }

  initializeSampleData(): void {
    this.brandStocks = [
      {
        id: '1',
        brandName: 'Sikkim Supreme Whisky',
        brandCode: 'SSW001',
        alcoholPercent: '42.8%',
        bottleSize: 750,
        liquorType: 'Whisky',
        currentStock: 15420,
        capacity180ml: 8500,
        capacity360ml: 4200,
        capacity550ml: 2720,
        totalProduction: 89650,
        totalUtilized: 12500,
        lastUpdated: '2026-01-23T10:30:00',
        status: 'IN_STOCK',
        reorderLevel: 5000,
        maxCapacity: 30000,
        averageDailyUsage: 850,
        transitPermits: [
          {
            permitNo: 'TRP/2026/001',
            date: '2026-01-20',
            distributorName: 'M/s Karma Chapel Bhutia',
            depotAddress: 'Gangtok Main Market, Sikkim',
            vehicleNumber: 'SK01AB1234',
            cases: 50,
            bottlesPerCase: 12,
            totalBottles: 600,
            status: 'DELIVERED',
            approvedBy: 'Commissioner Singh',
            approvalDate: '2026-01-20'
          },
          {
            permitNo: 'TRP/2026/015',
            date: '2026-01-22',
            distributorName: 'M/s Himalayan Distributors',
            depotAddress: 'Namchi Industrial Area, Sikkim',
            vehicleNumber: 'SK02CD5678',
            cases: 75,
            bottlesPerCase: 12,
            totalBottles: 900,
            status: 'IN_TRANSIT',
            approvedBy: 'Commissioner Singh',
            approvalDate: '2026-01-22'
          }
        ],
        lastEntry: {
          date: '2026-01-23',
          type: 'PRODUCTION',
          quantity: 2500,
          previousStock: 12920,
          newStock: 15420,
          referenceNo: 'PRD/2026/001'
        },
        lastEntries: [
          {
            id: '1',
            date: '2026-01-23',
            type: 'PRODUCTION',
            quantity: 2500,
            previousStock: 12920,
            newStock: 15420,
            referenceNo: 'PRD/2026/001',
            description: 'Daily production batch #001',
            officerName: 'Rajesh Kumar'
          },
          {
            id: '2',
            date: '2026-01-22',
            type: 'TRANSIT_PERMIT',
            quantity: 900,
            previousStock: 13820,
            newStock: 12920,
            referenceNo: 'TRP/2026/015',
            description: 'Transit permit to Himalayan Distributors',
            officerName: 'Commissioner Singh',
            transitPermitNo: 'TRP/2026/015'
          },
          {
            id: '3',
            date: '2026-01-21',
            type: 'CONSUMPTION',
            quantity: 450,
            previousStock: 14270,
            newStock: 13820,
            referenceNo: 'CON/2026/021',
            description: 'Quality testing and sampling',
            officerName: 'Lab Technician'
          }
        ],
        monthlyMovement: {
          month: 'January 2026',
          opening: 12500,
          production: 8500,
          consumption: 5580,
          wastage: 0,
          closing: 15420
        }
      },
      {
        id: '2',
        brandName: 'Himalayan Gold Rum',
        brandCode: 'HGR002',
        alcoholPercent: '40%',
        bottleSize: 750,
        liquorType: 'Rum',
        currentStock: 3200,
        capacity180ml: 1800,
        capacity360ml: 900,
        capacity550ml: 500,
        totalProduction: 45230,
        totalUtilized: 8500,
        lastUpdated: '2026-01-23T09:15:00',
        status: 'LOW_STOCK',
        reorderLevel: 3500,
        maxCapacity: 18000,
        averageDailyUsage: 420,
        transitPermits: [
          {
            permitNo: 'TRP/2026/008',
            date: '2026-01-18',
            distributorName: 'M/s Mountain View Traders',
            depotAddress: 'Pelling Market, West Sikkim',
            vehicleNumber: 'SK03EF9012',
            cases: 40,
            bottlesPerCase: 12,
            totalBottles: 480,
            status: 'DELIVERED',
            approvedBy: 'Commissioner Singh',
            approvalDate: '2026-01-18'
          }
        ],
        lastEntry: {
          date: '2026-01-22',
          type: 'CONSUMPTION',
          quantity: 800,
          previousStock: 4000,
          newStock: 3200,
          referenceNo: 'CON/2026/045'
        },
        lastEntries: [
          {
            id: '4',
            date: '2026-01-22',
            type: 'CONSUMPTION',
            quantity: 800,
            previousStock: 4000,
            newStock: 3200,
            referenceNo: 'CON/2026/045',
            description: 'Regular consumption for local market',
            officerName: 'Market Officer'
          },
          {
            id: '5',
            date: '2026-01-20',
            type: 'PRODUCTION',
            quantity: 1200,
            previousStock: 2800,
            newStock: 4000,
            referenceNo: 'PRD/2026/020',
            description: 'Weekly production batch',
            officerName: 'Production Manager'
          }
        ],
        monthlyMovement: {
          month: 'January 2026',
          opening: 8500,
          production: 4200,
          consumption: 9500,
          wastage: 0,
          closing: 3200
        }
      },
      {
        id: '3',
        brandName: 'Royal Sikkim Vodka',
        brandCode: 'RSV003',
        alcoholPercent: '40%',
        bottleSize: 750,
        liquorType: 'Vodka',
        currentStock: 0,
        capacity180ml: 6700,
        capacity360ml: 3350,
        capacity550ml: 1950,
        totalProduction: 28450,
        totalUtilized: 15200,
        lastUpdated: '2026-01-22T16:45:00',
        status: 'OUT_OF_STOCK',
        reorderLevel: 2500,
        maxCapacity: 15000,
        averageDailyUsage: 320,
        transitPermits: [
          {
            permitNo: 'TRP/2026/012',
            date: '2026-01-19',
            distributorName: 'M/s Royal Distributors',
            depotAddress: 'Jorethang Commercial Complex',
            vehicleNumber: 'SK04GH3456',
            cases: 60,
            bottlesPerCase: 12,
            totalBottles: 720,
            status: 'DELIVERED',
            approvedBy: 'Commissioner Singh',
            approvalDate: '2026-01-19'
          }
        ],
        lastEntry: {
          date: '2026-01-22',
          type: 'CONSUMPTION',
          quantity: 450,
          previousStock: 450,
          newStock: 0,
          referenceNo: 'CON/2026/044'
        },
        lastEntries: [
          {
            id: '6',
            date: '2026-01-22',
            type: 'CONSUMPTION',
            quantity: 450,
            previousStock: 450,
            newStock: 0,
            referenceNo: 'CON/2026/044',
            description: 'Final stock consumption - urgent order',
            officerName: 'Emergency Officer'
          }
        ],
        monthlyMovement: {
          month: 'January 2026',
          opening: 5500,
          production: 2800,
          consumption: 8300,
          wastage: 0,
          closing: 0
        }
      },
      {
        id: '4',
        brandName: 'Mountain Gin Premium',
        brandCode: 'MGP004',
        alcoholPercent: '43%',
        bottleSize: 750,
        liquorType: 'Gin',
        currentStock: 8750,
        capacity180ml: 5600,
        capacity360ml: 2800,
        capacity550ml: 1600,
        totalProduction: 32100,
        totalUtilized: 5400,
        lastUpdated: '2026-01-23T11:20:00',
        status: 'IN_STOCK',
        reorderLevel: 2000,
        maxCapacity: 12000,
        averageDailyUsage: 280,
        transitPermits: [
          {
            permitNo: 'TRP/2026/005',
            date: '2026-01-17',
            distributorName: 'M/s Premium Spirits Ltd',
            depotAddress: 'Singtam Industrial Estate',
            vehicleNumber: 'SK05IJ7890',
            cases: 30,
            bottlesPerCase: 12,
            totalBottles: 360,
            status: 'DELIVERED',
            approvedBy: 'Commissioner Singh',
            approvalDate: '2026-01-17'
          }
        ],
        lastEntry: {
          date: '2026-01-23',
          type: 'PRODUCTION',
          quantity: 1500,
          previousStock: 7250,
          newStock: 8750,
          referenceNo: 'PRD/2026/002'
        },
        lastEntries: [
          {
            id: '7',
            date: '2026-01-23',
            type: 'PRODUCTION',
            quantity: 1500,
            previousStock: 7250,
            newStock: 8750,
            referenceNo: 'PRD/2026/002',
            description: 'Premium batch production',
            officerName: 'Head Distiller'
          }
        ],
        monthlyMovement: {
          month: 'January 2026',
          opening: 6500,
          production: 5200,
          consumption: 2950,
          wastage: 0,
          closing: 8750
        }
      },
      {
        id: '5',
        brandName: 'Heritage Beer',
        brandCode: 'HB005',
        alcoholPercent: '5%',
        bottleSize: 650,
        liquorType: 'Beer',
        currentStock: 22500,
        capacity180ml: 11100,
        capacity360ml: 5550,
        capacity550ml: 3350,
        totalProduction: 156780,
        totalUtilized: 25600,
        lastUpdated: '2026-01-23T12:00:00',
        status: 'OVERSTOCKED',
        reorderLevel: 8000,
        maxCapacity: 25000,
        averageDailyUsage: 1200,
        transitPermits: [
          {
            permitNo: 'TRP/2026/020',
            date: '2026-01-21',
            distributorName: 'M/s Beer Distributors Pvt Ltd',
            depotAddress: 'Rangpo Border Trade Complex',
            vehicleNumber: 'SK06KL2468',
            cases: 100,
            bottlesPerCase: 24,
            totalBottles: 2400,
            status: 'APPROVED',
            approvedBy: 'Commissioner Singh',
            approvalDate: '2026-01-21'
          },
          {
            permitNo: 'TRP/2026/018',
            date: '2026-01-20',
            distributorName: 'M/s Valley Beverages',
            depotAddress: 'Mangan North Sikkim Depot',
            vehicleNumber: 'SK07MN1357',
            cases: 80,
            bottlesPerCase: 24,
            totalBottles: 1920,
            status: 'IN_TRANSIT',
            approvedBy: 'Commissioner Singh',
            approvalDate: '2026-01-20'
          }
        ],
        lastEntry: {
          date: '2026-01-23',
          type: 'PRODUCTION',
          quantity: 5000,
          previousStock: 17500,
          newStock: 22500,
          referenceNo: 'PRD/2026/003'
        },
        lastEntries: [
          {
            id: '8',
            date: '2026-01-23',
            type: 'PRODUCTION',
            quantity: 5000,
            previousStock: 17500,
            newStock: 22500,
            referenceNo: 'PRD/2026/003',
            description: 'Large batch beer production',
            officerName: 'Brewery Manager'
          },
          {
            id: '9',
            date: '2026-01-21',
            type: 'TRANSIT_PERMIT',
            quantity: 2400,
            previousStock: 19900,
            newStock: 17500,
            referenceNo: 'TRP/2026/020',
            description: 'Transit permit to Beer Distributors',
            officerName: 'Commissioner Singh',
            transitPermitNo: 'TRP/2026/020'
          }
        ],
        monthlyMovement: {
          month: 'January 2026',
          opening: 15000,
          production: 18500,
          consumption: 11000,
          wastage: 0,
          closing: 22500
        }
      }
    ];
  }

  calculateOverview(): void {
    this.warehouseOverview = {
      totalBrands: this.brandStocks.length,
      totalCapacity180ml: this.brandStocks.reduce((sum, brand) => sum + brand.capacity180ml, 0),
      totalCapacity360ml: this.brandStocks.reduce((sum, brand) => sum + brand.capacity360ml, 0),
      totalCapacity550ml: this.brandStocks.reduce((sum, brand) => sum + brand.capacity550ml, 0),
      totalCurrentStock: this.brandStocks.reduce((sum, brand) => sum + brand.currentStock, 0),
      lowStockAlerts: this.brandStocks.filter(b => b.status === 'LOW_STOCK').length,
      outOfStockAlerts: this.brandStocks.filter(b => b.status === 'OUT_OF_STOCK').length,
      newArrivals: this.brandStocks.filter(b => 
        b.lastEntry.type === 'PRODUCTION' && 
        new Date(b.lastEntry.date).toDateString() === new Date().toDateString()
      ).length,
      todayProduction: this.brandStocks
        .filter(b => b.lastEntry.type === 'PRODUCTION' && 
          new Date(b.lastEntry.date).toDateString() === new Date().toDateString())
        .reduce((sum, b) => sum + b.lastEntry.quantity, 0),
      todayConsumption: this.brandStocks
        .filter(b => b.lastEntry.type === 'CONSUMPTION' && 
          new Date(b.lastEntry.date).toDateString() === new Date().toDateString())
        .reduce((sum, b) => sum + b.lastEntry.quantity, 0),
      pendingAdjustments: 2
    };
  }

  applyFilters(): void {
    this.filteredStocks = this.brandStocks.filter(stock => {
      const matchesBrand = !this.filters.brandName || 
        stock.brandName.toLowerCase().includes(this.filters.brandName.toLowerCase());
      
      const matchesType = !this.filters.liquorType || stock.liquorType === this.filters.liquorType;
      
      const matchesStatus = !this.filters.status || stock.status === this.filters.status;
      
      const matchesStockLevel = !this.filters.stockLevel || this.checkStockLevel(stock);

      return matchesBrand && matchesType && matchesStatus && matchesStockLevel;
    });

    this.updatePagination();
  }

  checkStockLevel(stock: BrandStock): boolean {
    const totalCapacity = stock.capacity180ml + stock.capacity360ml + stock.capacity550ml;
    const utilizationPercent = (stock.currentStock / totalCapacity) * 100;
    
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
      brandName: '',
      liquorType: '',
      status: '',
      stockLevel: '',
      dateFrom: '',
      dateTo: ''
    };
    this.applyFilters();
  }

  viewBrandDetails(brand: BrandStock): void {
    this.selectedBrand = brand;
    this.showDetailsModal = true;
  }

  openAdjustmentModal(brand: BrandStock): void {
    this.selectedBrand = brand;
    this.adjustmentQuantity = 0;
    this.adjustmentType = 'ADD';
    this.adjustmentReason = '';
    this.showAdjustmentModal = true;
  }

  submitStockAdjustment(): void {
    if (!this.selectedBrand || this.adjustmentQuantity <= 0) return;

    const previousStock = this.selectedBrand.currentStock;
    const newStock = this.adjustmentType === 'ADD' 
      ? previousStock + this.adjustmentQuantity
      : previousStock - this.adjustmentQuantity;

    // Update the brand stock
    this.selectedBrand.currentStock = Math.max(0, newStock);
    this.selectedBrand.lastUpdated = new Date().toISOString();
    this.selectedBrand.lastEntry = {
      date: new Date().toISOString().split('T')[0],
      type: 'ADJUSTMENT',
      quantity: this.adjustmentQuantity,
      previousStock: previousStock,
      newStock: this.selectedBrand.currentStock,
      referenceNo: `ADJ/2026/${Date.now()}`
    };

    // Update status based on new stock level
    this.updateBrandStatus(this.selectedBrand);

    // Recalculate overview
    this.calculateOverview();
    this.applyFilters();

    // Close modal
    this.showAdjustmentModal = false;
    this.selectedBrand = null;
  }

  updateBrandStatus(brand: BrandStock): void {
    if (brand.currentStock === 0) {
      brand.status = 'OUT_OF_STOCK';
    } else if (brand.currentStock <= brand.reorderLevel) {
      brand.status = 'LOW_STOCK';
    } else {
      const totalCapacity = brand.capacity180ml + brand.capacity360ml + brand.capacity550ml;
      if (brand.currentStock > totalCapacity) {
        brand.status = 'OVERSTOCKED';
      } else {
        brand.status = 'IN_STOCK';
      }
    }
  }

  viewTransitPermits(brand: BrandStock): void {
    this.selectedBrand = brand;
    this.selectedTransitPermits = brand.transitPermits;
    this.showTransitPermitsModal = true;
  }

  viewLastEntries(brand: BrandStock): void {
    this.selectedBrand = brand;
    this.selectedLastEntries = brand.lastEntries;
    this.showLastEntriesModal = true;
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

  refreshData(): void {
    this.loadWarehouseData();
  }

  getTotalStock(): number {
    return this.filteredStocks.reduce((sum, brand) => sum + brand.currentStock, 0);
  }

  getPageNumbers(): number[] {
    const pageCount = Math.min(5, this.totalPages);
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  getAdjustmentResult(): number {
    if (!this.selectedBrand) return 0;
    
    return this.adjustmentType === 'ADD' 
      ? (this.selectedBrand.currentStock + this.adjustmentQuantity)
      : Math.max(0, this.selectedBrand.currentStock - this.adjustmentQuantity);
  }
}
