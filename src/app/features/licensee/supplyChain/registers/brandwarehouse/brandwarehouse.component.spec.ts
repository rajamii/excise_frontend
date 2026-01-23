import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrandwarehouseComponent } from './brandwarehouse.component';
import { HologramDataService } from '../../services/hologram-data.service';

describe('BrandwarehouseComponent', () => {
  let component: BrandwarehouseComponent;
  let fixture: ComponentFixture<BrandwarehouseComponent>;
  let mockHologramDataService: jasmine.SpyObj<HologramDataService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('HologramDataService', ['getDailyEntries']);

    await TestBed.configureTestingModule({
      imports: [BrandwarehouseComponent, FormsModule],
      providers: [
        { provide: HologramDataService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BrandwarehouseComponent);
    component = fixture.componentInstance;
    mockHologramDataService = TestBed.inject(HologramDataService) as jasmine.SpyObj<HologramDataService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with sample data', () => {
    component.ngOnInit();
    expect(component.brandStocks.length).toBeGreaterThan(0);
    expect(component.warehouseOverview.totalBrands).toBeGreaterThan(0);
  });

  it('should calculate total stock correctly', () => {
    component.filteredStocks = [
      { currentStock: 100 } as any,
      { currentStock: 200 } as any,
      { currentStock: 300 } as any
    ];
    
    expect(component.getTotalStock()).toBe(600);
  });

  it('should generate page numbers correctly', () => {
    component.totalPages = 3;
    const pageNumbers = component.getPageNumbers();
    expect(pageNumbers).toEqual([0, 1, 2]);
  });

  it('should calculate adjustment result correctly', () => {
    component.selectedBrand = { currentStock: 100 } as any;
    component.adjustmentQuantity = 50;
    
    component.adjustmentType = 'ADD';
    expect(component.getAdjustmentResult()).toBe(150);
    
    component.adjustmentType = 'SUBTRACT';
    expect(component.getAdjustmentResult()).toBe(50);
  });

  it('should apply filters correctly', () => {
    component.initializeSampleData();
    component.filters.brandName = 'Sikkim';
    component.applyFilters();
    
    expect(component.filteredStocks.length).toBeGreaterThan(0);
    expect(component.filteredStocks.every(stock => 
      stock.brandName.toLowerCase().includes('sikkim')
    )).toBeTruthy();
  });

  it('should update brand status correctly', () => {
    const brand = {
      currentStock: 0,
      reorderLevel: 100,
      capacity180ml: 500,
      capacity360ml: 300,
      capacity550ml: 200,
      averageDailyUsage: 10
    } as any;

    component.updateBrandStatus(brand);
    expect(brand.status).toBe('OUT_OF_STOCK');

    brand.currentStock = 50;
    component.updateBrandStatus(brand);
    expect(brand.status).toBe('LOW_STOCK');

    brand.currentStock = 500;
    component.updateBrandStatus(brand);
    expect(brand.status).toBe('IN_STOCK');

    brand.currentStock = 1200;
    component.updateBrandStatus(brand);
    expect(brand.status).toBe('OVERSTOCKED');
  });

  it('should open transit permits modal', () => {
    const mockBrand = {
      transitPermits: [
        { permitNo: 'TRP/001', status: 'DELIVERED' }
      ]
    } as any;

    component.viewTransitPermits(mockBrand);
    
    expect(component.selectedBrand).toBe(mockBrand);
    expect(component.selectedTransitPermits).toBe(mockBrand.transitPermits);
    expect(component.showTransitPermitsModal).toBeTruthy();
  });

  it('should open last entries modal', () => {
    const mockBrand = {
      lastEntries: [
        { id: '1', type: 'PRODUCTION', quantity: 100 }
      ]
    } as any;

    component.viewLastEntries(mockBrand);
    
    expect(component.selectedBrand).toBe(mockBrand);
    expect(component.selectedLastEntries).toBe(mockBrand.lastEntries);
    expect(component.showLastEntriesModal).toBeTruthy();
  });
});