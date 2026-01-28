import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupplyChainService } from '../services/supplychain.service';
import { DistRow, LiquorRates } from '../models/supply-chain.models';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

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
  availableDepotAddresses: string[] = [];
  brandOptions: string[] = [];
  sizeOptions: string[] = [];
  bottleTypes: { id: number; bottleType: string }[] = [];
  /* vehicleNumbers: string[] = []; */
  private brandsData: { brandName: string; sizes: number[] }[] = [];

  // New properties for stock logic
  private brandMlConversionData: any[] = [];
  private brandWarehouseData: any[] = [];
  availableStockPieces: number = 0;
  conversionFactor: number = 0;
  currentStockStatus: string = '';
  stockError: string = '';

  // Stock Summary Box
  selectedBrandStockSummary: { size: number, pieces: number, approxCases: number }[] = [];


  private isBrowser = false;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) platformId: Object,
    private supplyChainService: SupplyChainService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
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

      // If default distributor is set, trigger change logic to load stock/depots
      if (this.formData.soleDistributor) {
        // Use setTimeout to ensure data bindings have settled or just call directly
        this.onDistributorChange();
      }
    });

    // Fetch Brands - We might fetch this later based on stock, or keep as fallback
    this.supplyChainService.getLiquorBrands().subscribe(data => {
      this.brandsData = data;
      this.brandOptions = data.map(b => b.brandName);
    });

    // Fetch Bottle Types
    this.supplyChainService.getBottleTypes().subscribe(data => {
      console.log('Bottle Types loaded in component:', data);
      this.bottleTypes = data;
    });

    // Fetch Brand ML Conversion Data
    this.supplyChainService.getBrandMlInCases().subscribe(data => {
      this.brandMlConversionData = data;
      console.log('ML Conversion Data:', this.brandMlConversionData);
    });
  }

  onDistributorChange(): void {
    if (!this.formData.soleDistributor) {
      this.availableDepotAddresses = [];
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

    // Check if there is an onDepotAddressChange method needed or just simple binding

    // Fetch Warehouse Stock for this distributor
    if (this.formData.soleDistributor) {
      // Fetch ALL stock temporarily to debug mismatch between Distributor name and Distillery name in DB
      this.supplyChainService.getBrandWarehouseStock('').subscribe(data => {
        console.log(`Stock Data Received (ALL):`, data);
        this.brandWarehouseData = data;

        // Update brand options based on available stock
        // Filter unique brands from warehouse data
        const warehouseBrands = [...new Set(data.map(item => item.brand_details))].filter(b => !!b);
        if (warehouseBrands.length > 0) {
          this.brandOptions = warehouseBrands;
        }
        // If no stock data, maybe fallback to getLiquorBrands? 
        // For now, let's assume if distributor has stock, we use that.
      });
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

    // FETCH STOCK SPECIFICALLY FOR THIS BRAND
    console.log('Fetching specific stock for brand:', this.formData.brand);
    // Pass empty distillery name to ignore that filter, and pass brand name
    this.supplyChainService.getBrandWarehouseStock('', this.formData.brand).subscribe(data => {
      console.log('Stock Data for Brand (raw response):', data);
      this.brandWarehouseData = data;

      // Log each entry to see what we got - USE CAMELCASE FIELD NAMES
      data.forEach((entry, index) => {
        console.log(`Entry ${index}:`, {
          brandDetails: entry.brandDetails,
          capacitySize: entry.capacitySize,
          currentStock: entry.currentStock,
          status: entry.status
        });
      });

      // After fetching, update the summary logic
      this.updateStockSummary(selectedBrandBasic);
    }, error => {
      console.error('Error fetching brand warehouse stock:', error);
      this.selectedBrandStockSummary = [];
    });
  }

  updateStockSummary(selectedBrandBasic: any): void {
    // Filter available sizes from warehouse data (loose match just in case, though API should handle it)
    const searchBrand = this.formData.brand.toLowerCase().trim();

    console.log('updateStockSummary called with brand:', this.formData.brand);
    console.log('brandWarehouseData:', this.brandWarehouseData);

    // Check if we have any data - USE CAMELCASE FIELD NAMES
    const warehouseEntries = this.brandWarehouseData.filter(item => {
      if (!item.brandDetails) return false;
      const dbBrand = item.brandDetails.toLowerCase().trim();
      const matches = dbBrand.includes(searchBrand) || searchBrand.includes(dbBrand);
      console.log(`Comparing "${dbBrand}" with "${searchBrand}": ${matches}`);
      return matches;
    });

    console.log('Filtered warehouse entries:', warehouseEntries);

    if (selectedBrandBasic) {
      // Use all defined sizes for the brand as the base
      this.sizeOptions = selectedBrandBasic.sizes.map((s: number) => s.toString()).sort((a: any, b: any) => parseInt(a) - parseInt(b));

      // Generate summary for ALL sizes - USE CAMELCASE FIELD NAMES
      this.selectedBrandStockSummary = selectedBrandBasic.sizes.map((size: number) => {
        // Check if we have stock for this size
        const stockEntry = warehouseEntries.find(we => we.capacitySize === size);
        const pieces = stockEntry ? (stockEntry.currentStock || 0) : 0;

        console.log(`Size ${size}ml: stockEntry=`, stockEntry, `pieces=${pieces}`);

        // Find conversion
        const conv = this.brandMlConversionData.find(c => c.ml === size);
        const factor = conv ? conv.pieces_in_case : 0;
        const approxCases = factor > 0 ? Math.floor(pieces / factor) : 0;

        return { size, pieces, approxCases };
      }).sort((a: any, b: any) => a.size - b.size);

    } else {
      // Fallback if brand not found in basic list - USE CAMELCASE FIELD NAMES
      if (warehouseEntries.length > 0) {
        this.sizeOptions = warehouseEntries.map(item => item.capacitySize.toString()).sort((a: any, b: any) => parseInt(a) - parseInt(b));

        this.selectedBrandStockSummary = warehouseEntries.map(entry => {
          const size = entry.capacitySize;
          const pieces = entry.currentStock || 0;
          const conv = this.brandMlConversionData.find(c => c.ml === size);
          const factor = conv ? conv.pieces_in_case : 0;
          const approxCases = factor > 0 ? Math.floor(pieces / factor) : 0;
          
          console.log(`Fallback - Size ${size}ml: pieces=${pieces}, approxCases=${approxCases}`);
          
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

    // 1. Get Conversion Factor
    const conversionEntry = this.brandMlConversionData.find(x => x.ml === sizeMl);
    if (conversionEntry) {
      this.conversionFactor = conversionEntry.pieces_in_case;
      console.log('Conversion factor found:', this.conversionFactor);
    } else {
      console.warn(`No conversion factor found for ${sizeMl}ml`);
      this.conversionFactor = 0; // Handle error or default?
    }

    // 2. Get Available Stock - use loose matching for brand name - USE CAMELCASE FIELD NAMES
    const searchBrand = this.formData.brand.toLowerCase().trim();
    const stockEntry = this.brandWarehouseData.find(x => {
      if (!x.brandDetails) return false;
      const dbBrand = x.brandDetails.toLowerCase().trim();
      const brandMatches = dbBrand.includes(searchBrand) || searchBrand.includes(dbBrand);
      const sizeMatches = x.capacitySize === sizeMl;
      console.log(`Checking: "${dbBrand}" vs "${searchBrand}" (${brandMatches}) and ${x.capacitySize} vs ${sizeMl} (${sizeMatches})`);
      return brandMatches && sizeMatches;
    });

    console.log('Stock entry found:', stockEntry);

    if (stockEntry) {
      this.availableStockPieces = stockEntry.currentStock || 0;
      console.log('Available stock pieces:', this.availableStockPieces);
      this.currentStockStatus = `Available: ${this.availableStockPieces} pieces (Approx. ${Math.floor(this.availableStockPieces / (this.conversionFactor || 1))} cases)`;
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
    if (!this.formData.cases || this.formData.cases <= 0) return;

    if (this.conversionFactor > 0) {
      const requiredPieces = this.formData.cases * this.conversionFactor;

      if (requiredPieces > this.availableStockPieces) {
        this.stockError = `Insufficient stock! You need ${requiredPieces} pieces for ${this.formData.cases} cases, but only ${this.availableStockPieces} pieces are available.`;
      }
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
    // Proceed with submission
    this.submitApplication();

    // Manually close modal if we assume submission trigger started (or move this inside submitApplication subscription)
    // Looking at submitApplication, it has an alert.
    // Ideally we should close modal ONLY if validation passes.

    if (this.validationErrors.length === 0) {
      const closeBtn = document.getElementById('closeModalBtn');
      if (closeBtn) closeBtn.click();
    }
  }

  cancelDeclaration(): void {
    console.log('Declaration cancelled');
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

    // Clear products and errors
    this.products = [];
    this.validationErrors = [];
    this.isLocked = false;
    this.isSubmitted = false;
    this.isCommonFieldsLocked = false;

    // Generate new bill number for next application
    this.generateNextBillNumber();

    console.log('Form cleared');
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

    console.log('Common fields unlocked, product fields cleared, and PRODUCT DETAILS table cleared');
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
}