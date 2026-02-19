import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupplyChainService } from '../services/supplychain.service';
import { DistRow, LiquorRates } from '../models/supply-chain.models';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { SupplyChainProfileService } from '../../../../core/services/supply-chain-profile.service';
import { PaymentIntegrationService } from '../../../../core/services/payment-integration.service';

interface FormData {
  billNo: string;
  soleDistributor: string;
  date: string;
  depotAddress: string;
  brand: string;
  size: string;
  cases: number;
  vehicleNumber?: string;
  bottleType?: string;
}

interface Product {
  brand: string;
  size: string;
  cases: number;
  educationCess: number;
  exciseDuty: number;
  additionalExcise: number;
  // New fields
  brandOwner?: string;
  liquorType?: string;
  exFactoryPrice?: number;
  manufacturingUnitName?: string;
  bottleType?: string;
}

interface BrandOption {
  label: string;
  brandName: string;
}

interface WalletDeductionPreview {
  walletType: 'excise' | 'education_cess';
  label: string;
  before: number;
  deduction: number;
  after: number;
}

interface StockDeductionPreview {
  brand: string;
  size: number;
  currentPieces: number;
  deductionPieces: number;
  remainingPieces: number;
}

@Component({
  selector: 'app-transit-permit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transit-permit.component.html',
  styleUrls: ['./transit-permit.component.scss'],
  animations: [
    trigger('slideInAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0, transform: 'translateY(-15px)' }))
      ])
    ])
  ]
})
export class TransitPermitComponent implements OnInit {
  formData: FormData = {
    billNo: 'TRP/2/EXCISE',
    soleDistributor: 'M/s Karma Chopel Bhutia',
    date: '',
    depotAddress: '',
    brand: '',
    size: '',
    cases: 0,
    vehicleNumber: '',
    bottleType: ''
  };

  products: Product[] = [];
  validationErrors: string[] = [];
  isLocked = false;
  isSubmitted = false;
  isCommonFieldsLocked = false;
  showUnlockModal = false;

  distributors: DistRow[] = [];
  uniqueDistributorNames: string[] = [];
  availableDepotAddresses: string[] = [];
  brandOptions: BrandOption[] = [];
  sizeOptions: string[] = [];
  bottleTypes: { id: number; bottleType: string }[] = [];
  /* vehicleNumbers: string[] = []; */
  private brandsData: { brandName: string; sizes: number[] }[] = [];
  private warehouseCatalogData: any[] = [];
  private activeLicenseId: string = '';
  private resolvedLicenseId: string = '';

  // New properties for stock logic
  private brandMlConversionData: any[] = [];
  private brandWarehouseData: any[] = [];
  availableStockPieces: number = 0;
  conversionFactor: number = 0;
  currentStockStatus: string = '';
  stockError: string | null = null;
  paymentAgreed: boolean = false; // For payment confirmation modal
  walletPreviews: WalletDeductionPreview[] = [];
  stockPreviews: StockDeductionPreview[] = [];
  paymentConfirmAgreed = false;
  loadingPaymentPreview = false;
  paymentPreviewError = '';
  private paymentPreviewWatchdog: any = null;
  paymentDeductionPopupVisible = false;

  // Stock Summary Box
  selectedBrandStockSummary: { size: number, pieces: number, approxCases: number }[] = [];

  // ML Per Case Data for Info Box
  mlPerCaseData: any[] = [];

  // Sidebar toggle state - Default to open
  isMlInfoSidebarExpanded: boolean = true;


  private isBrowser = false;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) platformId: Object,
    private supplyChainService: SupplyChainService,
    private supplyChainProfileService: SupplyChainProfileService,
    private paymentIntegrationService: PaymentIntegrationService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Listen for window resize to recalculate sidebar height
    if (this.isBrowser) {
      window.addEventListener('resize', () => {
        // Trigger change detection to recalculate height
        setTimeout(() => {
          // Force recalculation by triggering change detection
        }, 100);
      });
    }
  }

  ngOnInit(): void {
    // Set today's date as default
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];

    // Fetch initial data
    this.loadInitialData();

    // Load by ref if provided
    const ref = this.route.snapshot.queryParamMap.get('ref');
    if (ref && this.isBrowser) {
      const list: any[] = JSON.parse(localStorage.getItem('transitPermitRequests') || '[]');
      const found = list.find(r => r.billNo === ref);
      if (found) {
        this.formData = { ...this.formData, ...found };
        this.products = found.products || [];
        return; // Don't generate new bill number if loading existing
      }
    }

    // Generate next sequential bill number
    this.generateNextBillNumber();
  }

  private loadInitialData(): void {
    // Fetch Distributors
    this.supplyChainService.getDistributors().subscribe(data => {
      this.distributors = data;
      this.uniqueDistributorNames = [...new Set(
        data
          .map(d => (d.distributorName || '').trim())
          .filter(name => !!name)
      )];

      // If default distributor is set, trigger change logic to load stock/depots
      if (this.formData.soleDistributor) {
        // Use setTimeout to ensure data bindings have settled or just call directly
        this.onDistributorChange();
      }
    });

    this.loadEstablishmentScopedBrands();

    // Fetch Bottle Types
    this.supplyChainService.getBottleTypes().subscribe(data => {
      console.log('Bottle Types loaded in component:', data);
      this.bottleTypes = data;
    });

    // Fetch Brand ML Conversion Data
    this.loadMlConversionData();
  }

  private loadEstablishmentScopedBrands(): void {
    this.supplyChainProfileService.getProfile().subscribe({
      next: (response: any) => {
        const profile = response?.data as any;
        this.activeLicenseId = String(
          profile?.licenseeId ||
          profile?.licensee_id ||
          ''
        ).trim();
        this.resolvedLicenseId = this.toValidLicenseId(this.activeLicenseId);
        this.loadBrandWarehouseCatalog();
      },
      error: () => {
        this.activeLicenseId = '';
        this.resolvedLicenseId = '';
        this.loadBrandWarehouseCatalog();
      }
    });
  }

  private toValidLicenseId(value: string): string {
    const normalized = String(value || '').trim();
    if (normalized.startsWith('NA/') || normalized.startsWith('NLI/')) {
      return normalized;
    }
    return '';
  }

  private resolveEffectiveLicenseIdForPayment(): string {
    const fromProfile = this.toValidLicenseId(this.resolvedLicenseId || this.activeLicenseId);
    if (fromProfile) {
      return fromProfile;
    }

    const rows = Array.isArray(this.warehouseCatalogData) ? this.warehouseCatalogData : [];
    for (const row of rows) {
      const candidate = this.toValidLicenseId(String(row?.licenseId || row?.license_id || '').trim());
      if (candidate) {
        return candidate;
      }
    }
    return '';
  }

  private loadBrandWarehouseCatalog(): void {
    this.supplyChainService.getBrandWarehouseStock(
      undefined,
      undefined,
      this.resolvedLicenseId || undefined
    ).subscribe({
      next: (data) => {
        this.warehouseCatalogData = data || [];
        this.brandWarehouseData = data || [];
        if (!this.resolvedLicenseId) {
          const inferred = this.resolveEffectiveLicenseIdForPayment();
          if (inferred) {
            this.resolvedLicenseId = inferred;
          }
        }
        this.rebuildBrandCatalogFromWarehouse();
      },
      error: (error) => {
        console.error('Failed to load establishment-scoped warehouse brands', error);
        this.warehouseCatalogData = [];
        this.brandWarehouseData = [];
        this.brandsData = [];
        this.brandOptions = [];
      }
    });
  }

  private rebuildBrandCatalogFromWarehouse(): void {
    const sizesByBrand = new Map<string, Set<number>>();
    const options: BrandOption[] = [];

    this.warehouseCatalogData.forEach((entry: any) => {
      const brandName = this.getWarehouseBrandName(entry);
      const capacitySize = this.getWarehouseCapacitySize(entry);
      const exciseDuty = this.getWarehouseExciseDuty(entry);

      if (!brandName || !capacitySize) return;

      if (!sizesByBrand.has(brandName)) {
        sizesByBrand.set(brandName, new Set<number>());
      }
      sizesByBrand.get(brandName)!.add(capacitySize);

      options.push({
        brandName,
        label: brandName
      });
    });

    this.brandsData = Array.from(sizesByBrand.entries())
      .map(([brandName, sizes]) => ({
        brandName,
        sizes: Array.from(sizes).sort((a, b) => a - b)
      }))
      .sort((a, b) => a.brandName.localeCompare(b.brandName));

    this.brandOptions = options.sort((a, b) => a.label.localeCompare(b.label));
  }

  private getWarehouseBrandName(entry: any): string {
    return String(entry?.brandDetails || entry?.brand_details || '').trim();
  }

  private getWarehouseCapacitySize(entry: any): number {
    const value = Number(entry?.capacitySize ?? entry?.capacity_size ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private getWarehouseCurrentStock(entry: any): number {
    const value = Number(entry?.currentStock ?? entry?.current_stock ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private getWarehouseExciseDuty(entry: any): number {
    const value = Number(entry?.exciseDutyRsPerCase ?? entry?.excise_duty_rs_per_case ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  loadMlConversionData(): void {
    this.supplyChainService.getBrandMlInCases().subscribe(data => {
      this.brandMlConversionData = data;
      // Also populate the info box data - map correctly
      this.mlPerCaseData = data.map(item => ({
        ...item,
        isEditing: false,
        pieces_in_case: item.pieces_in_case || item.piecesInCase
      }));
      console.log('ML Conversion Data:', this.brandMlConversionData);

      // If we have selected a size, re-trigger calculation just in case data changed
      if (this.formData.size && this.formData.brand) {
        this.onSizeChange();
      }
    });
  }

  // Edit Logic for ML Sidebar
  editingMlId: number | null = null;
  tempPieces: number = 0;

  startEditingMl(item: any): void {
    this.editingMlId = item.id;
    this.tempPieces = item.pieces_in_case;
  }

  cancelEditingMl(): void {
    this.editingMlId = null;
    this.tempPieces = 0;
  }

  saveMlItem(item: any): void {
    if (!this.tempPieces || this.tempPieces <= 0) {
      alert('Please enter a valid number of pieces.');
      return;
    }

    this.supplyChainService.updateBrandMlInCases(item.id, this.tempPieces).subscribe({
      next: (res) => {
        console.log('Updated ML item:', res);
        this.editingMlId = null;
        this.loadMlConversionData(); // Reload data to refresh UI and conversion factors
      },
      error: (err) => {
        console.error('Failed to update ML item', err);
        alert('Failed to update. Please try again.');
      }
    });
  }

  onDistributorChange(): void {
    if (!this.formData.soleDistributor) {
      this.availableDepotAddresses = [];
      this.selectedBrandStockSummary = [];
      this.brandWarehouseData = [...this.warehouseCatalogData];
      this.availableStockPieces = 0;
      this.conversionFactor = 0;
      this.currentStockStatus = '';
      this.stockError = '';
      return;
    }
    // Filter distributors matching the selected name to get their addresses
    const matches = this.distributors.filter(d => d.distributorName === this.formData.soleDistributor);
    this.availableDepotAddresses = matches.map(d => d.depoAddress).filter(a => !!a);

    if (this.availableDepotAddresses.length === 1) {
      this.formData.depotAddress = this.availableDepotAddresses[0];
    } else {
      this.formData.depotAddress = '';
    }
  }

  onDepotAddressChange(): void {
    // Logic if needed when depot address changes explicitly
  }

  onBrandChange(): void {
    // Reset size when brand changes
    this.formData.size = '';
    this.formData.cases = 0;
    this.availableStockPieces = 0;
    this.stockError = '';
    this.currentStockStatus = '';
    this.selectedBrandStockSummary = [];

    console.log('onBrandChange called with brand:', this.formData.brand);

    const selectedBrandBasic = this.brandsData.find(b => b.brandName === this.formData.brand);
    console.log('selectedBrandBasic:', selectedBrandBasic);

    // Fetch fresh stock for selected brand within active establishment scope.
    this.supplyChainService
      .getBrandWarehouseStock(
        undefined,
        this.formData.brand,
        this.resolvedLicenseId || undefined
      )
      .subscribe({
        next: (data) => {
          console.log('Stock Data for Brand (raw response):', data);
          this.brandWarehouseData = data || [];
          this.updateStockSummary(selectedBrandBasic);
        },
        error: (error) => {
          console.error('Error fetching brand warehouse stock:', error);
          const searchBrand = this.formData.brand.toLowerCase().trim();
          this.brandWarehouseData = this.warehouseCatalogData.filter((item: any) => {
            const dbBrand = this.getWarehouseBrandName(item).toLowerCase().trim();
            return dbBrand.includes(searchBrand) || searchBrand.includes(dbBrand);
          });
          this.updateStockSummary(selectedBrandBasic);
        }
      });
  }

  updateStockSummary(selectedBrandBasic: any): void {
    // Filter available sizes from warehouse data (loose match just in case, though API should handle it)
    const searchBrand = this.formData.brand.toLowerCase().trim();

    console.log('updateStockSummary called with brand:', this.formData.brand);
    console.log('brandWarehouseData:', this.brandWarehouseData);

    const warehouseEntries = this.brandWarehouseData.filter(item => {
      const dbBrand = this.getWarehouseBrandName(item).toLowerCase().trim();
      if (!dbBrand) return false;
      const matches = dbBrand.includes(searchBrand) || searchBrand.includes(dbBrand);
      console.log(`Comparing "${dbBrand}" with "${searchBrand}": ${matches}`);
      return matches;
    });

    console.log('Filtered warehouse entries:', warehouseEntries);

    if (selectedBrandBasic) {
      // Use all defined sizes for the brand as the base
      this.sizeOptions = selectedBrandBasic.sizes.map((s: number) => s.toString()).sort((a: any, b: any) => parseInt(a) - parseInt(b));

      this.selectedBrandStockSummary = selectedBrandBasic.sizes.map((size: number) => {
        const stockEntry = warehouseEntries.find(we => this.getWarehouseCapacitySize(we) === size);
        const pieces = stockEntry ? this.getWarehouseCurrentStock(stockEntry) : 0;

        console.log(`Size ${size}ml: stockEntry=`, stockEntry, `pieces=${pieces}`);

        // Find conversion - check both field name formats
        const conv = this.brandMlConversionData.find(c => c.ml === size);
        const factor = conv ? (conv.pieces_in_case || conv.piecesInCase || 0) : 0;
        const approxCases = factor > 0 ? Math.floor(pieces / factor) : 0;

        console.log(`Size ${size}ml: factor=${factor}, approxCases=${approxCases}`);

        return { size, pieces, approxCases };
      }).sort((a: any, b: any) => a.size - b.size);

    } else {
      if (warehouseEntries.length > 0) {
        this.sizeOptions = warehouseEntries
          .map(item => this.getWarehouseCapacitySize(item).toString())
          .sort((a: any, b: any) => parseInt(a) - parseInt(b));

        this.selectedBrandStockSummary = warehouseEntries.map(entry => {
          const size = this.getWarehouseCapacitySize(entry);
          const pieces = this.getWarehouseCurrentStock(entry);
          const conv = this.brandMlConversionData.find(c => c.ml === size);
          const factor = conv ? (conv.pieces_in_case || conv.piecesInCase || 0) : 0;
          const approxCases = factor > 0 ? Math.floor(pieces / factor) : 0;

          console.log(`Fallback - Size ${size}ml: pieces=${pieces}, factor=${factor}, approxCases=${approxCases}`);

          return { size, pieces, approxCases };
        }).sort((a: any, b: any) => a.size - b.size);
      } else {
        console.log('No warehouse entries found for brand');
        this.sizeOptions = [];
        this.selectedBrandStockSummary = [];
      }
    }

    console.log('Final selectedBrandStockSummary:', this.selectedBrandStockSummary);
  }

  onSizeChange(): void {
    const sizeMl = parseInt(this.formData.size || '0', 10);
    this.availableStockPieces = 0;
    this.conversionFactor = 0;
    this.stockError = '';
    this.currentStockStatus = '';

    if (!sizeMl || !this.formData.brand) return;

    console.log('onSizeChange called with size:', sizeMl, 'brand:', this.formData.brand);
    console.log('brandWarehouseData:', this.brandWarehouseData);
    console.log('brandMlConversionData:', this.brandMlConversionData);

    // 1. Get Conversion Factor - check both snake_case and camelCase
    const conversionEntry = this.brandMlConversionData.find(x => x.ml === sizeMl);
    console.log('Conversion entry found:', conversionEntry);

    if (conversionEntry) {
      // Try both field name formats
      this.conversionFactor = conversionEntry.pieces_in_case || conversionEntry.piecesInCase || 0;
      console.log('Conversion factor set to:', this.conversionFactor);
    } else {
      console.warn(`No conversion entry found for ${sizeMl}ml in brandMlConversionData`);
      this.conversionFactor = 0;
    }

    // If conversion factor is still 0, show error
    if (this.conversionFactor === 0) {
      console.error('Conversion factor is 0! Available conversion data:', this.brandMlConversionData);
      this.currentStockStatus = `No pieces-per-case mapping found for ${sizeMl}ml in master table.`;
      return;
    }

    // 2. Get Available Stock - use loose matching for brand name.
    const searchBrand = this.formData.brand.toLowerCase().trim();
    const stockEntry = this.brandWarehouseData.find(x => {
      const dbBrand = this.getWarehouseBrandName(x).toLowerCase().trim();
      if (!dbBrand) return false;
      const brandMatches = dbBrand.includes(searchBrand) || searchBrand.includes(dbBrand);
      const capacitySize = this.getWarehouseCapacitySize(x);
      const sizeMatches = capacitySize === sizeMl;
      console.log(`Checking: "${dbBrand}" vs "${searchBrand}" (${brandMatches}) and ${capacitySize} vs ${sizeMl} (${sizeMatches})`);
      return brandMatches && sizeMatches;
    });

    console.log('Stock entry found:', stockEntry);

    if (stockEntry) {
      this.availableStockPieces = this.getWarehouseCurrentStock(stockEntry);
      console.log('Available stock pieces:', this.availableStockPieces);
      const approxCases = Math.floor(this.availableStockPieces / this.conversionFactor);
      this.currentStockStatus = `Available: ${this.availableStockPieces} pieces (Approx. ${approxCases} case${approxCases !== 1 ? 's' : ''})`;
    } else {
      console.warn('No stock entry found for brand:', this.formData.brand, 'size:', sizeMl);
      this.currentStockStatus = 'No stock information available';
      this.availableStockPieces = 0;
    }

    // Re-validate cases if already entered
    if (this.formData.cases > 0) {
      this.onCasesChange();
    }
  }

  onCasesChange(): void {
    this.stockError = '';

    if (!this.formData.cases || this.formData.cases <= 0) {
      return;
    }

    if (!this.formData.size || !this.formData.brand) {
      this.stockError = 'Please select brand and size first';
      return;
    }

    console.log('onCasesChange called with cases:', this.formData.cases);
    console.log('Conversion factor:', this.conversionFactor);
    console.log('Available stock pieces:', this.availableStockPieces);

    if (this.conversionFactor > 0) {
      const requiredPieces = this.formData.cases * this.conversionFactor;
      console.log('Required pieces for', this.formData.cases, 'cases:', requiredPieces);

      if (requiredPieces > this.availableStockPieces) {
        const shortfall = requiredPieces - this.availableStockPieces;
        const maxCases = Math.floor(this.availableStockPieces / this.conversionFactor);

        this.stockError = `Insufficient stock! You need ${shortfall} more pieces to pack ${this.formData.cases} case${this.formData.cases > 1 ? 's' : ''} (requires ${requiredPieces} pieces, available ${this.availableStockPieces} pieces). Maximum cases you can pack: ${maxCases}`;

        console.error('Stock validation failed:', {
          requestedCases: this.formData.cases,
          requiredPieces: requiredPieces,
          availablePieces: this.availableStockPieces,
          shortfall: shortfall,
          maxCases: maxCases
        });
      } else {
        // Success - show confirmation message
        const remainingPieces = this.availableStockPieces - requiredPieces;
        console.log('Stock validation passed:', {
          requestedCases: this.formData.cases,
          requiredPieces: requiredPieces,
          availablePieces: this.availableStockPieces,
          remainingPieces: remainingPieces
        });

        // Update the current stock status to show calculation
        this.currentStockStatus = `✓ Valid: ${this.formData.cases} case${this.formData.cases > 1 ? 's' : ''} = ${requiredPieces} pieces. Remaining stock: ${remainingPieces} pieces`;
      }
    } else {
      this.stockError = 'Unable to calculate pieces per case. Please contact administrator.';
      console.error('Conversion factor not available for size:', this.formData.size);
    }
  }

  addProduct(): void {
    this.validationErrors = [];

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    // Get rates from backend
    this.supplyChainService.getLiquorRates(this.formData.brand, this.formData.size + 'ml').subscribe({
      next: (rates) => {
        // Create new product
        const newProduct: Product = {
          brand: this.formData.brand, // Use brand directly as display name for now, or fetch
          size: this.formData.size,
          cases: this.formData.cases,
          educationCess: rates.educationCess,
          exciseDuty: rates.exciseDuty,
          additionalExcise: rates.additionalExcise,

          // Populate new fields (ensure backend returns these or handle defaults)
          brandOwner: (rates as any).brandOwner || (rates as any).brand_owner || '',
          liquorType: (rates as any).liquorType || (rates as any).liquor_type || '',
          exFactoryPrice: rates.exFactoryPrice,
          manufacturingUnitName: (rates as any).manufacturingUnitName,
          bottleType: this.formData.bottleType
        };

        // Add to products list
        this.products.push(newProduct);

        // Lock common fields after adding first product
        if (this.products.length === 1) {
          this.lockCommonFields();
        }

        // Reset form fields for next product
        this.formData.brand = '';
        this.formData.size = '';
        this.formData.cases = 0;
        this.formData.bottleType = '';
        this.sizeOptions = [];

        console.log('Product added:', newProduct);
      },
      error: (err) => {
        console.error('Failed to fetch rates', err);
        this.validationErrors.push('Failed to fetch rates for selected product');
      }
    });




  }

  deleteProduct(index: number): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.products.splice(index, 1);

      // Unlock common fields if no products remain
      if (this.products.length === 0) {
        this.unlockCommonFields();
      }

      console.log('Product deleted at index:', index);
    }
  }

  validateForm(): boolean {
    const errors: string[] = [];

    if (!this.formData.date) {
      errors.push('Date is required');
    }
    if (!this.formData.depotAddress) {
      errors.push('Depot Address is required');
    }
    if (!this.formData.brand) {
      errors.push('Brand is required');
    }
    if (!this.formData.size) {
      errors.push('Size is required');
    }
    if (!this.formData.cases || this.formData.cases <= 0) {
      errors.push('Cases must be greater than 0');
    }
    if (!this.formData.bottleType) {
      errors.push('Bottle Type is required');
    }

    // Add stock validation error
    if (this.stockError) {
      errors.push(this.stockError);
    }

    this.validationErrors = errors;
    return errors.length === 0;
  }



  getTotalEducationCess(): number {
    return this.products.reduce((total, product) =>
      total + (product.educationCess * product.cases), 0);
  }

  getTotalExciseDuty(): number {
    return this.products.reduce((total, product) =>
      total + (product.exciseDuty * product.cases), 0);
  }

  getTotalAdditionalExcise(): number {
    return this.products.reduce((total, product) =>
      total + (product.additionalExcise * product.cases), 0);
  }

  validateApplication(): boolean {
    const errors: string[] = [];
    if (!this.formData.date) errors.push('Date is required');
    if (!this.formData.depotAddress) errors.push('Depot Address is required');
    if (!this.formData.vehicleNumber) errors.push('Vehicle Number is required');

    this.validationErrors = errors;
    return errors.length === 0;
  }

  onPreSubmit(): void {
    if (this.products.length === 0) {
      this.validationErrors = ['Please add at least one product before submitting'];
      return;
    }

    if (this.validateApplication()) {
      // Trigger modal if valid
      const btn = document.getElementById('openModalBtn');
      if (btn) btn.click();
    }
  }

  submitApplication(): void {
    // Final check (should be valid already)
    if (!this.validateApplication()) return;

    // Clear validation errors
    this.validationErrors = [];

    // Create payload
    const payload = {
      ...this.formData,
      products: this.products
    };

    // Call backend
    this.supplyChainService.submitTransitPermit(payload).subscribe({
      next: (response) => {
        // Mark as submitted and locked
        this.isSubmitted = true;
        this.isLocked = true;

        // Show success message
        alert('Transit Permit Application submitted successfully!');

        // Open payment receipt from actual wallet deduction transaction context.
        this.router.navigate(['/dev-payment-receipt'], {
          queryParams: { billNo: this.formData.billNo }
        });

        // Optional: Navigate or reset
      },
      error: (error) => {
        console.error('Submission failed', error);
        let errorMessage = 'Submission failed. Please try again.';

        if (error.error && typeof error.error === 'object') {
          // Check for explicit message field first
          if (error.error.message) {
            errorMessage = error.error.message;
          } else {
            // Handle DRF standard error format
            const keys = Object.keys(error.error);
            if (keys.length > 0) {
              const firstKey = keys[0];
              const firstError = error.error[firstKey];
              if (Array.isArray(firstError)) {
                errorMessage = `${firstKey}: ${firstError[0]}`;
              } else if (typeof firstError === 'string') {
                errorMessage = `${firstKey}: ${firstError}`;
              } else {
                errorMessage = JSON.stringify(error.error);
              }
            }
          }
        }

        this.validationErrors = [errorMessage];
      }
    });
  }

  acceptDeclaration(): void {
    this.paymentConfirmAgreed = false;
    this.paymentPreviewError = '';
    this.startPaymentPreviewLoading();
    this.buildStockDeductionPreview();
    this.loadWalletDeductionPreviewAndOpenModal();
  }

  private startPaymentPreviewLoading(): void {
    this.loadingPaymentPreview = true;
    if (this.paymentPreviewWatchdog) {
      clearTimeout(this.paymentPreviewWatchdog);
    }
    this.paymentPreviewWatchdog = setTimeout(() => {
      if (!this.loadingPaymentPreview) return;
      this.loadingPaymentPreview = false;
      this.paymentPreviewError = 'Wallet information is taking too long to load. Please try again.';
      this.validationErrors = [this.paymentPreviewError];
    }, 10000);
  }

  private stopPaymentPreviewLoading(): void {
    this.loadingPaymentPreview = false;
    if (this.paymentPreviewWatchdog) {
      clearTimeout(this.paymentPreviewWatchdog);
      this.paymentPreviewWatchdog = null;
    }
  }

  cancelDeclaration(): void {
    console.log('Declaration cancelled');
  }

  private loadWalletDeductionPreviewAndOpenModal(): void {
    const licenseId = this.resolveEffectiveLicenseIdForPayment();
    if (!licenseId) {
      this.stopPaymentPreviewLoading();
      this.paymentPreviewError = 'Approved license not found in profile. Please switch to approved unit/profile first.';
      this.validationErrors = [this.paymentPreviewError];
      return;
    }

    const exciseDeduction = this.getTotalExciseDuty() + this.getTotalAdditionalExcise();
    const educationDeduction = this.getTotalEducationCess();

    this.paymentIntegrationService.getWalletSummary(licenseId).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.results) ? res.results : [];

        const exciseRow = rows.find((r: any) => String(r.walletType || r.wallet_type || '').toLowerCase() === 'excise');
        const educationRow = rows.find((r: any) => String(r.walletType || r.wallet_type || '').toLowerCase() === 'education_cess');

        const exciseBefore = Number(exciseRow?.currentBalance ?? exciseRow?.current_balance ?? 0);
        const educationBefore = Number(educationRow?.currentBalance ?? educationRow?.current_balance ?? 0);

        this.walletPreviews = [
          {
            walletType: 'excise',
            label: 'Excise Wallet (includes Additional Excise)',
            before: exciseBefore,
            deduction: exciseDeduction,
            after: exciseBefore - exciseDeduction
          },
          {
            walletType: 'education_cess',
            label: 'Education Cess Wallet',
            before: educationBefore,
            deduction: educationDeduction,
            after: educationBefore - educationDeduction
          }
        ];

        const insuff = this.walletPreviews.find(w => w.after < 0);
        this.paymentPreviewError = insuff
          ? `Insufficient ${insuff.label}. Add wallet balance before proceeding.`
          : '';
        this.validationErrors = this.paymentPreviewError ? [this.paymentPreviewError] : [];

        this.stopPaymentPreviewLoading();
        this.openPaymentModalAfterDeclarationClose();
      },
      error: (err) => {
        this.stopPaymentPreviewLoading();
        this.paymentPreviewError = 'Unable to fetch wallet balances for deduction preview.';
        this.validationErrors = [this.paymentPreviewError];
      }
    });
  }

  private openPaymentModalAfterDeclarationClose(): void {
    // Close declaration popup and show a simple, non-animated custom popup.
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
      closeBtn.click();
    }
    this.paymentDeductionPopupVisible = true;
  }

  private buildStockDeductionPreview(): void {
    const grouped = new Map<string, StockDeductionPreview>();
    const catalog = Array.isArray(this.warehouseCatalogData) ? this.warehouseCatalogData : [];

    for (const product of this.products) {
      const sizeMl = Number(product.size || 0);
      if (!product.brand || !sizeMl) continue;

      const conversion = this.brandMlConversionData.find((x: any) => Number(x.ml) === sizeMl);
      const piecesPerCase = Number(conversion?.pieces_in_case ?? conversion?.piecesInCase ?? 0);
      const requiredPieces = piecesPerCase > 0 ? Number(product.cases || 0) * piecesPerCase : 0;

      const matchedEntry = catalog.find((entry: any) => {
        const entryBrand = this.getWarehouseBrandName(entry).toLowerCase().trim();
        const productBrand = String(product.brand).toLowerCase().trim();
        const brandMatch = entryBrand === productBrand || entryBrand.includes(productBrand) || productBrand.includes(entryBrand);
        return brandMatch && this.getWarehouseCapacitySize(entry) === sizeMl;
      });

      const currentPieces = matchedEntry ? this.getWarehouseCurrentStock(matchedEntry) : 0;
      const key = `${String(product.brand).toLowerCase().trim()}::${sizeMl}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          brand: product.brand,
          size: sizeMl,
          currentPieces,
          deductionPieces: requiredPieces,
          remainingPieces: currentPieces - requiredPieces
        });
      } else {
        const row = grouped.get(key)!;
        row.deductionPieces += requiredPieces;
        row.remainingPieces = row.currentPieces - row.deductionPieces;
      }
    }

    this.stockPreviews = Array.from(grouped.values()).sort((a, b) => {
      if (a.brand === b.brand) return a.size - b.size;
      return a.brand.localeCompare(b.brand);
    });
  }

  proceedWithWalletAndStockDeduction(): void {
    if (!this.paymentConfirmAgreed) return;
    if (this.paymentPreviewError) return;
    if (this.walletPreviews.some(w => w.after < 0)) return;
    if (this.stockPreviews.some(s => s.remainingPieces < 0)) return;
    this.paymentDeductionPopupVisible = false;
    this.submitApplication();
  }

  closePaymentDeductionPopup(): void {
    this.paymentDeductionPopupVisible = false;
  }

  canProceedWithDeduction(): boolean {
    if (!this.paymentConfirmAgreed) return false;
    if (!!this.paymentPreviewError) return false;
    if (this.walletPreviews.some(w => w.after < 0)) return false;
    if (this.stockPreviews.some(s => s.remainingPieces < 0)) return false;
    return true;
  }

  private generateNextBillNumber(): void {
    this.supplyChainService.getTransitPermits().subscribe({
      next: (permits: any[]) => {
        let maxSequence = 0;

        // Check backend data
        if (permits && permits.length > 0) {
          permits.forEach(p => {
            const billNo = p.bill_no || p.billNo; // Backend uses bill_no
            if (billNo && billNo.startsWith('TRP/')) {
              const match = billNo.match(/TRP\/(\d+)\/EXCISE/);
              if (match) {
                const sequence = parseInt(match[1], 10);
                if (sequence > maxSequence) {
                  maxSequence = sequence;
                }
              }
            }
          });
        }

        // Check localStorage as fallback/supplement (optional, but good if mixed usage)
        if (this.isBrowser) {
          const transitList: any[] = JSON.parse(localStorage.getItem('transitPermitRequests') || '[]');
          transitList.forEach((permit: any) => {
            const billNo = permit.billNo;
            if (billNo && billNo.startsWith('TRP/')) {
              const match = billNo.match(/TRP\/(\d+)\/EXCISE/);
              if (match) {
                const sequence = parseInt(match[1], 10);
                if (sequence > maxSequence) {
                  maxSequence = sequence;
                }
              }
            }
          });
        }

        // Set next sequence
        this.formData.billNo = `TRP/${maxSequence + 1}/EXCISE`;
      },
      error: (err) => {
        console.error('Failed to fetch permits for bill number generation', err);
        // Fallback to basic logic or previous localStorage logic if API fails
        this.formData.billNo = `TRP/${Math.floor(Math.random() * 10000)}/EXCISE`; // Temporary fallback to avoid collision if offline
      }
    });
  }

  private saveToSupplyChainDashboard(): void {
    if (this.isBrowser) {
      // Save to transitPermitRequests for transit permit dashboard
      const transitKey = 'transitPermitRequests';
      const transitList: any[] = JSON.parse(localStorage.getItem(transitKey) || '[]');
      const transitEntry = {
        ...this.formData,
        submissionDate: new Date().toISOString(),
        status: 'TRANSIT PERMIT ISSUED',
        totalAmount: this.getTotalEducationCess() + this.getTotalExciseDuty() + this.getTotalAdditionalExcise(),
        products: this.products.map(p => ({
          ...p,
          exfactory_price_rs_per_case: p.exFactoryPrice, // Map mostly for consistency if used elsewhere
          excise_duty_rs_per_case: p.exciseDuty,
          education_cess_rs_per_case: p.educationCess,
          additional_excise_duty_rs_per_case: p.additionalExcise,
          brand_owner: p.brandOwner,
          liquor_type: p.liquorType,
          manufacturing_unit_name: p.manufacturingUnitName
        }))
      };
      const transitIdx = transitList.findIndex(r => r.billNo === this.formData.billNo);
      if (transitIdx >= 0) transitList[transitIdx] = transitEntry; else transitList.unshift(transitEntry);
      localStorage.setItem(transitKey, JSON.stringify(transitList));

      // Also save to supply chain dashboard (importPermitRequests for compatibility)
      const supplyChainKey = 'importPermitRequests';
      const supplyChainList: any[] = JSON.parse(localStorage.getItem(supplyChainKey) || '[]');
      const supplyChainEntry = {
        refNo: this.formData.billNo,
        date: this.formData.date,
        distilleryName: this.formData.soleDistributor,
        status: 'TRANSIT PERMIT ISSUED',
        brAmount: this.getTotalEducationCess(),
        type: 'transit-permit',
        depotAddress: this.formData.depotAddress,
        vehicleNumber: this.formData.vehicleNumber,
        products: this.products,
        totalAmount: this.getTotalEducationCess() + this.getTotalExciseDuty() + this.getTotalAdditionalExcise()
      };
      const supplyChainIdx = supplyChainList.findIndex(r => r.refNo === this.formData.billNo);
      if (supplyChainIdx >= 0) supplyChainList[supplyChainIdx] = supplyChainEntry; else supplyChainList.unshift(supplyChainEntry);
      localStorage.setItem(supplyChainKey, JSON.stringify(supplyChainList));

      // DON'T generate next bill number here - keep the current bill number for the generated document
      // Bill number will only change when clearing form or starting new application
    }
  }



  payAllItems(): void {
    // Reset agreement
    this.paymentAgreed = false;

    // Open the Payment Confirmation Modal
    // Using bootstrap JS since we don't have direct access here easily without ViewChild for now
    // In a real angular way we should use ViewChild or NgbModal, but for consistency with this file:
    const modalElement = document.getElementById('paymentConfirmationModal');
    if (modalElement) {
      // @ts-ignore
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  proceedToPayment(): void {
    // Close modal first
    const modalElement = document.getElementById('paymentConfirmationModal');
    if (modalElement) {
      // @ts-ignore
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    }

    // Navigate to payment confirmation page
    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: {
        tab: 'transit',
        billNo: this.formData.billNo,
        totalAmount: this.getTotalEducationCess() + this.getTotalExciseDuty() + this.getTotalAdditionalExcise()
      }
    });
  }

  clearForm(): void {
    // Reset form data
    this.formData.date = new Date().toISOString().split('T')[0];
    this.formData.depotAddress = '';
    this.formData.brand = '';
    this.formData.size = '';
    this.formData.cases = 0;
    this.formData.vehicleNumber = '';
    this.formData.bottleType = '';

    // Clear products and errors
    this.products = [];
    this.validationErrors = [];
    this.isLocked = false;
    this.isSubmitted = false;
    this.isCommonFieldsLocked = false;

    // Clear all stock-related data and status
    this.selectedBrandStockSummary = []; // Clear the Available Stock Summary
    this.brandWarehouseData = []; // Clear warehouse data
    this.availableStockPieces = 0;
    this.conversionFactor = 0;
    this.currentStockStatus = '';
    this.stockError = '';
    this.sizeOptions = []; // Clear size options

    // Generate new bill number for next application
    this.generateNextBillNumber();

    console.log('Form cleared - All data including Available Stock Summary reset');
  }

  // Common Fields Locking Methods
  lockCommonFields(): void {
    this.isCommonFieldsLocked = true;
    console.log('Common fields locked after adding first product');
  }

  confirmUnlockFields(): void {
    this.showUnlockModal = true;
  }

  closeUnlockModal(): void {
    this.showUnlockModal = false;
  }

  confirmUnlockAction(): void {
    this.proceedWithUnlock();
    this.closeUnlockModal();

    // Show success message
    this.showSuccessMessage();
  }

  showSuccessMessage(): void {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    successDiv.style.cssText = 'top: 20px; right: 20px; z-index: 10000; min-width: 350px;';
    successDiv.innerHTML = `
      <i class="bi bi-check-circle-fill me-2"></i>
      <strong>Fields Unlocked!</strong> Common fields are now editable, product selection cleared, and product details table reset.
      <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;

    document.body.appendChild(successDiv);

    // Auto-remove after 5 seconds (increased time for longer message)
    setTimeout(() => {
      if (successDiv.parentElement) {
        successDiv.remove();
      }
    }, 5000);
  }

  proceedWithUnlock(): void {
    // Proceed with unlocking common fields and resetting product selection
    this.unlockCommonFields();
  }

  unlockCommonFields(): void {
    this.isCommonFieldsLocked = false;

    // Clear ALL product selection fields when unlocking
    this.formData.brand = '';
    this.formData.size = '';
    this.formData.cases = 0;
    this.formData.bottleType = '';
    this.sizeOptions = [];

    // IMPORTANT: Clear the products array to avoid data inconsistency
    // when user changes depot address or distributor
    this.products = [];

    // Clear any validation errors
    this.validationErrors = [];

    // Clear all stock-related data when unlocking
    this.selectedBrandStockSummary = []; // Clear the Available Stock Summary
    this.brandWarehouseData = []; // Clear warehouse data
    this.availableStockPieces = 0;
    this.conversionFactor = 0;
    this.currentStockStatus = '';
    this.stockError = '';

    // Force Angular to update the form by triggering change detection
    setTimeout(() => {
      // Additional reset to ensure dropdowns are properly cleared
      const brandSelect = document.querySelector('select[ng-reflect-model="brand"]') as HTMLSelectElement;
      const sizeSelect = document.querySelector('select[ng-reflect-model="size"]') as HTMLSelectElement;
      const bottleTypeSelect = document.querySelector('select[ng-reflect-model="bottleType"]') as HTMLSelectElement;
      const casesInput = document.querySelector('input[ng-reflect-model="cases"]') as HTMLInputElement;

      if (brandSelect) brandSelect.selectedIndex = 0;
      if (sizeSelect) sizeSelect.selectedIndex = 0;
      if (bottleTypeSelect) bottleTypeSelect.selectedIndex = 0;
      if (casesInput) casesInput.value = '0';
    }, 50);

    console.log('Common fields unlocked, product fields cleared, PRODUCT DETAILS table cleared, and Available Stock Summary cleared');
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  getDepotDisplayName(depotValue: string): string {
    const depotNames: { [key: string]: string } = {
      'gangtok': 'Gangtok, Sikkim',
      'namchi': 'Namchi, Sikkim',
      'gyalshing': 'Gyalshing, Sikkim',
      'mangan': 'Mangan, Sikkim'
    };
    return depotNames[depotValue] || depotValue;
  }

  printApplication(): void {
    const printable = document.getElementById('transitPermitPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.formData.billNo || 'TRN/BF801';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Transit Permit Application - ${ref}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 12mm; }
            body { background: #fff; color: #000; }
            .no-print { display:none !important; }
            .container { max-width: 100%; padding: 20px; }
            .government-header .text-success { color: #000 !important; }
            .details-card h6 { color: #000 !important; }
            .route-section h5 { color: #000 !important; }
            .form-section h5 { color: #000 !important; }
            .products-section h5 { color: #000 !important; }
            .table { border: 1px solid #000; }
            .table td, .table th { border-color: #000; }
            .bg-light { background-color: #f0f0f0 !important; }
          </style>
        </head>
        <body>
          ${printable}
        </body>
      </html>`);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
      win.close();
    };
  }

  toggleMlInfoSidebar(): void {
    this.isMlInfoSidebarExpanded = !this.isMlInfoSidebarExpanded;
  }

  // Calculate dynamic height based on content - More compact
  calculateSidebarHeight(): string {
    if (!this.mlPerCaseData || this.mlPerCaseData.length === 0) {
      return 'auto';
    }

    // Reduced base height for header and footer
    const baseHeight = 100; // Header (50px) + Footer (50px) - more compact

    // Reduced height per item (card + margin)
    const itemHeight = 90; // Each card is approximately 90px including margin - more compact

    // Calculate total height
    const totalHeight = baseHeight + (this.mlPerCaseData.length * itemHeight);

    // Ensure it doesn't exceed 85% of viewport height (reduced from 90%)
    const maxHeight = window.innerHeight * 0.85;

    return Math.min(totalHeight, maxHeight) + 'px';
  }
}
