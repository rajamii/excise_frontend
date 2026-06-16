import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { BrandwarehouseComponent } from './brandwarehouse.component';
import { BrandWarehouseService } from '../../services/brand-warehouse.service';
import { SupplyChainService } from '../../services/supplychain.service';
import { SupplyChainProfileService } from '../../../../../core/services/supply-chain-profile.service';
import { ProductionService } from '../../services/production.service';

describe('BrandwarehouseComponent', () => {
  let component: BrandwarehouseComponent;
  let fixture: ComponentFixture<BrandwarehouseComponent>;
  let mockBrandWarehouseService: jasmine.SpyObj<BrandWarehouseService>;
  let mockSupplyChainService: jasmine.SpyObj<SupplyChainService>;
  let mockSupplyChainProfileService: jasmine.SpyObj<SupplyChainProfileService>;
  let mockProductionService: jasmine.SpyObj<ProductionService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('BrandWarehouseService', [
      'getGroupedBrandWarehouses',
      'getWarehouseOverview',
      'initializeSikkimBrands',
      'adjustStock'
    ]);

    const supplychainSpy = jasmine.createSpyObj('SupplyChainService', ['getBrandMlInCases']);
    const profileSpy = jasmine.createSpyObj('SupplyChainProfileService', ['getProfile']);
    const productionSpy = jasmine.createSpyObj('ProductionService', ['getProductionHistory']);

    await TestBed.configureTestingModule({
      imports: [BrandwarehouseComponent, FormsModule, HttpClientTestingModule],
      providers: [
        { provide: BrandWarehouseService, useValue: spy },
        { provide: SupplyChainService, useValue: supplychainSpy },
        { provide: SupplyChainProfileService, useValue: profileSpy },
        { provide: ProductionService, useValue: productionSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BrandwarehouseComponent);
    component = fixture.componentInstance;
    mockBrandWarehouseService = TestBed.inject(BrandWarehouseService) as jasmine.SpyObj<BrandWarehouseService>;
    mockSupplyChainService = TestBed.inject(SupplyChainService) as jasmine.SpyObj<SupplyChainService>;
    mockSupplyChainProfileService = TestBed.inject(SupplyChainProfileService) as jasmine.SpyObj<SupplyChainProfileService>;
    mockProductionService = TestBed.inject(ProductionService) as jasmine.SpyObj<ProductionService>;

    // Setup default mock responses
    mockBrandWarehouseService.initializeSikkimBrands.and.returnValue(of({ success: true, created: 0, updated: 0 }));
    mockBrandWarehouseService.getWarehouseOverview.and.returnValue(of({
      totalBrands: 5,
      totalCapacity: 10000,
      totalCurrentStock: 5000,
      lowStockAlerts: 2,
      outOfStockAlerts: 1,
      newArrivals: 0,
      todayProduction: 100,
      todayConsumption: 50,
      pendingAdjustments: 0
    }));
    mockBrandWarehouseService.getGroupedBrandWarehouses.and.returnValue(of([]));
    mockSupplyChainService.getBrandMlInCases.and.returnValue(of([
      { ml: 90, pieces_in_case: 12 },
      { ml: 180, pieces_in_case: 1 },
    ]));
    mockSupplyChainProfileService.getProfile.and.returnValue(of({ success: true, exists: true, data: null } as any));
    mockProductionService.getProductionHistory.and.returnValue(of([] as any));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.groupedBrandStocks).toEqual([]);
    expect(component.filteredStocks).toEqual([]);
    expect(component.paginatedStocks).toEqual([]);
    expect(component.currentPage).toBe(1);
    expect(component.pageSize).toBe(10);
    expect(component.filters.brandName).toBe('');
  });

  it('should calculate total stock correctly', () => {
    component.filteredStocks = [
      { totalStock: 100 } as any,
      { totalStock: 200 } as any,
      { totalStock: 300 } as any
    ];
    
    expect(component.getTotalStock()).toBe(600);
  });

  it('should generate page numbers correctly', () => {
    component.totalPages = 3;
    const pageNumbers = component.getPageNumbers();
    expect(pageNumbers).toEqual([1, 2, 3]);
  });

  it('should calculate adjustment result correctly for ADD', () => {
    component.selectedPackSize = { currentStock: 100 } as any;
    component.adjustmentQuantity = 50;
    component.adjustmentType = 'ADD';
    
    expect(component.getAdjustmentResult()).toBe(150);
  });

  it('should calculate adjustment result correctly for SUBTRACT', () => {
    component.selectedPackSize = { currentStock: 100 } as any;
    component.adjustmentQuantity = 50;
    component.adjustmentType = 'SUBTRACT';
    
    expect(component.getAdjustmentResult()).toBe(50);
  });

  it('should handle SUBTRACT with quantity greater than stock', () => {
    component.selectedPackSize = { currentStock: 30 } as any;
    component.adjustmentQuantity = 50;
    component.adjustmentType = 'SUBTRACT';
    
    expect(component.getAdjustmentResult()).toBe(0);
  });

  it('should return 0 when no pack size is selected', () => {
    component.selectedPackSize = null;
    component.adjustmentQuantity = 50;
    
    expect(component.getAdjustmentResult()).toBe(0);
  });

  it('should apply filters correctly', () => {
    component.groupedBrandStocks = [
      {
        brandName: 'Sikkim Gold Whisky',
        distilleryName: 'Sikkim Distilleries',
        brandType: 'Whisky',
        overallStatus: 'IN_STOCK',
        totalStock: 1000,
        totalCapacity: 2000
      } as any,
      {
        brandName: 'Royal Challenge',
        distilleryName: 'UBL',
        brandType: 'Whisky',
        overallStatus: 'LOW_STOCK',
        totalStock: 500,
        totalCapacity: 1000
      } as any
    ];

    component.filters.brandName = 'Sikkim';
    component.applyFilters();
    
    expect(component.filteredStocks.length).toBe(1);
    expect(component.filteredStocks[0].brandName).toContain('Sikkim');
  });

  it('should check stock level correctly', () => {
    const highStock = {
      totalStock: 900,
      totalCapacity: 1000
    } as any;

    const mediumStock = {
      totalStock: 600,
      totalCapacity: 1000
    } as any;

    const lowStock = {
      totalStock: 300,
      totalCapacity: 1000
    } as any;

    component.filters.stockLevel = 'HIGH';
    expect(component.checkStockLevel(highStock)).toBeTruthy();
    expect(component.checkStockLevel(mediumStock)).toBeFalsy();

    component.filters.stockLevel = 'MEDIUM';
    expect(component.checkStockLevel(mediumStock)).toBeTruthy();
    expect(component.checkStockLevel(lowStock)).toBeFalsy();

    component.filters.stockLevel = 'LOW';
    expect(component.checkStockLevel(lowStock)).toBeTruthy();
    expect(component.checkStockLevel(highStock)).toBeFalsy();
  });

  it('should update pagination correctly', () => {
    component.filteredStocks = new Array(25).fill({}).map((_, i) => ({ id: i })) as any;
    component.pageSize = 10;
    component.currentPage = 1;
    
    component.updatePagination();
    
    expect(component.totalPages).toBe(3);
    expect(component.paginatedStocks.length).toBe(10);
  });

  it('should change page correctly', () => {
    component.totalPages = 5;
    component.currentPage = 1;
    
    component.changePage(3);
    expect(component.currentPage).toBe(3);
    
    // Should not change to invalid page
    component.changePage(10);
    expect(component.currentPage).toBe(3);
    
    component.changePage(0);
    expect(component.currentPage).toBe(3);
  });

  it('should clear filters correctly', () => {
    component.filters = {
      brandName: 'Test',
      liquorType: 'Whisky',
      status: 'IN_STOCK',
      stockLevel: 'HIGH',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31'
    };
    
    component.clearFilters();
    
    expect(component.filters.brandName).toBe('');
    expect(component.filters.liquorType).toBe('');
    expect(component.filters.status).toBe('');
    expect(component.filters.stockLevel).toBe('');
    expect(component.filters.dateFrom).toBe('');
    expect(component.filters.dateTo).toBe('');
  });

  it('should open brand details modal', () => {
    const mockBrand = {
      brandName: 'Test Brand',
      distilleryName: 'Test Distillery'
    } as any;

    component.viewBrandDetails(mockBrand);
    
    expect(component.selectedBrand).toBe(mockBrand);
    expect(component.showDetailsModal).toBeTruthy();
  });

  it('should open adjustment modal', () => {
    const mockBrand = { brandName: 'Test Brand' } as any;
    const mockPackSize = { id: '1', currentStock: 100 } as any;

    component.openAdjustmentModal(mockBrand, mockPackSize);
    
    expect(component.selectedBrand).toBe(mockBrand);
    expect(component.selectedPackSize).toBe(mockPackSize);
    expect(component.adjustmentQuantity).toBe(0);
    expect(component.adjustmentType).toBe('ADD');
    expect(component.adjustmentReason).toBe('');
    expect(component.showAdjustmentModal).toBeTruthy();
  });

  it('should open transit permits modal', () => {
    const mockBrand = { brandName: 'Test Brand' } as any;

    component.viewTransitPermits(mockBrand);
    
    expect(component.selectedBrand).toBe(mockBrand);
    expect(component.selectedTransitPermits.length).toBeGreaterThan(0);
    expect(component.showTransitPermitsModal).toBeTruthy();
  });

  it('should open last entries modal', () => {
    const mockBrand = { brandName: 'Test Brand' } as any;

    component.viewLastEntries(mockBrand);
    
    expect(component.selectedBrand).toBe(mockBrand);
    expect(component.selectedLastEntries.length).toBeGreaterThan(0);
    expect(component.showLastEntriesModal).toBeTruthy();
  });

  it('should return correct status color', () => {
    expect(component.getStatusColor('IN_STOCK')).toBe('success');
    expect(component.getStatusColor('LOW_STOCK')).toBe('warning');
    expect(component.getStatusColor('OUT_OF_STOCK')).toBe('danger');
    expect(component.getStatusColor('OVERSTOCKED')).toBe('info');
    expect(component.getStatusColor('UNKNOWN')).toBe('secondary');
  });

  it('should return correct utilization color', () => {
    expect(component.getUtilizationColor(95)).toBe('danger');
    expect(component.getUtilizationColor(75)).toBe('warning');
    expect(component.getUtilizationColor(45)).toBe('success');
    expect(component.getUtilizationColor(25)).toBe('info');
  });

  it('should get pack size keys in sorted order', () => {
    const packSizes = {
      750: { id: '1' } as any,
      180: { id: '2' } as any,
      375: { id: '3' } as any
    };

    const keys = component.getPackSizeKeys(packSizes);
    expect(keys).toEqual([180, 375, 750]);
  });

  it('should initialize sample data when API fails', () => {
    mockBrandWarehouseService.getGroupedBrandWarehouses.and.returnValue(
      new Promise((_, reject) => reject('API Error')) as any
    );

    component.loadWarehouseData();
    
    // The component should fall back to sample data
    expect(component.groupedBrandStocks.length).toBeGreaterThan(0);
  });

  it('should build API filters correctly', () => {
    component.filters = {
      brandName: 'Test Brand',
      liquorType: 'Whisky',
      status: 'IN_STOCK',
      stockLevel: 'HIGH',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31'
    };

    const apiFilters = (component as any).buildApiFilters();
    
    expect(apiFilters.distillery_name).toBe('Sikkim'); // Always filters by Sikkim
    expect(apiFilters.exclude_breweries).toBe(true); // Excludes breweries
    expect(apiFilters.brand_name).toBe('Test Brand');
    expect(apiFilters.brand_type).toBe('Whisky');
    expect(apiFilters.status).toBe('IN_STOCK');
    expect(apiFilters.stock_level).toBe('HIGH');
  });

  it('should filter brands by current distillery and exclude breweries', () => {
    const mockBrands = [
      {
        brandName: 'Sikkim Gold',
        distilleryName: 'M/s Sikkim Distilleries Ltd',
        brandType: 'Whisky'
      } as any,
      {
        brandName: 'Royal Challenge',
        distilleryName: 'UBL Distillery',
        brandType: 'Whisky'
      } as any,
      {
        brandName: 'Sikkim Premium',
        distilleryName: 'Sikkim Distilleries',
        brandType: 'Rum'
      } as any,
      {
        brandName: 'Densberg Beer',
        distilleryName: 'M/s Yuksom Breweries Ltd, Melli, Sikkim',
        brandType: 'Beer'
      } as any
    ];

    const filteredBrands = (component as any).filterByCurrentDistillery(mockBrands);
    
    expect(filteredBrands.length).toBe(2);
    expect(filteredBrands[0].brandName).toBe('Sikkim Gold');
    expect(filteredBrands[1].brandName).toBe('Sikkim Premium');
    // Densberg Beer should be excluded as it's from a brewery
    expect(filteredBrands.find((b: any) => b.brandName === 'Densberg Beer')).toBeUndefined();
  });

  it('should get current distillery name', () => {
    expect(component.getCurrentDistillery()).toBe('Sikkim');
  });

  it('should paginate transit permits without getting stuck', () => {
    component.selectedTransitPermits = Array.from({ length: 12 }).map((_, i) => ({
      permitNo: `P-${i + 1}`,
      date: '2026-03-27',
      distributorName: 'Test',
      depotAddress: 'Test',
      vehicleNumber: 'V',
      cases: 1,
      bottlesPerCase: 12,
      totalBottles: 12,
      status: 'APPROVED',
      approvedBy: 'Test',
      approvalDate: '2026-03-27'
    }) as any);

    component.permitSelectedMonth = 'ALL';
    component.permitPageSize = 5;
    component.onPermitPageSizeChange();

    expect(component.permitTotalPages).toBe(3);
    expect(component.paginatedTransitPermits.length).toBe(5);
    expect(component.permitSummaryText).toBe('1-5 of 12');

    component.changePermitPage(2);
    expect(component.permitCurrentPage).toBe(2);
    expect(component.paginatedTransitPermits[0].permitNo).toBe('P-6');
    expect(component.permitSummaryText).toBe('6-10 of 12');
  });

  it('should filter transit permits by month and reset to page 1', () => {
    component.selectedTransitPermits = [
      { permitNo: 'M1', date: '2026-03-01' } as any,
      { permitNo: 'M2', date: '2026-03-15' } as any,
      { permitNo: 'A1', date: '2026-04-01' } as any,
    ];

    component.permitPageSize = 5;
    component.permitCurrentPage = 2;
    component.permitSelectedMonth = '03';
    component.onPermitMonthChange();

    expect(component.permitCurrentPage).toBe(1);
    expect(component.filteredTransitPermits.length).toBe(2);
    expect(component.paginatedTransitPermits.map(p => p.permitNo)).toEqual(['M1', 'M2']);
  });
});
