import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MasterService } from '../../../../core/services/master.service';
import { environment } from '../../../../../environments/environment';

interface BrandSizeData {
  brandName: string;
  sizes: number[];
}

interface Brand {
  id: number;
  name: string;
  sizes: number[];
}

interface LiquorData {
  brand_name: string;
  pack_size_ml: number;
}

interface FormData {
  billNo: string;
  soleDistributor: string;
  date: string;
  depotAddress: string;
  brand: string;
  size: string;
  cases: number;
  vehicleNumber?: string;
}

interface Product {
  brand: string;
  size: string;
  cases: number;
  educationCess: number;
  exciseDuty: number;
  additionalExcise: number;
}

@Component({
  selector: 'app-transit-permit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transit-permit.component.html',
  styleUrls: ['./transit-permit.component.scss'],
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
  };

  brands: { [key: string]: number[] } = {}; // Store brands and their sizes
  brandOptions: string[] = [];
  sizeOptions: number[] = [];

  products: Product[] = [];
  validationErrors: string[] = [];
  isLocked = false;

  // Sample rates for calculation
  private rates = {
    'royal-stag': {
      educationCess: 15.5,
      exciseDuty: 125.0,
      additionalExcise: 45.0,
    },
    'blenders-pride': {
      educationCess: 18.0,
      exciseDuty: 140.0,
      additionalExcise: 50.0,
    },
    'officers-choice': {
      educationCess: 12.0,
      exciseDuty: 95.0,
      additionalExcise: 35.0,
    },
    'imperial-blue': {
      educationCess: 14.0,
      exciseDuty: 110.0,
      additionalExcise: 40.0,
    },
  };

  vehicleNumbers: string[] = [
    'SK 01 AB 1234',
    'SK 02 CD 5678',
    'SK 03 EF 9012',
  ];

  private apiUrl = environment.apiBaseUrl;
  private isBrowser = false;

  constructor(
    private masterService: MasterService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.fetchBrands();
    // Set today's date as default
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];
    // Load by ref if provided
    const ref = this.route.snapshot.queryParamMap.get('ref');
    if (ref && this.isBrowser) {
      const list: any[] = JSON.parse(
        localStorage.getItem('transitPermitRequests') || '[]'
      );
      const found = list.find((r) => r.billNo === ref);
      if (found) {
        this.formData = { ...this.formData, ...found };
        this.products = found.products || [];
      }
    }
  }

  fetchBrands(): void {
    this.masterService.getLiquorBrands().subscribe({
      next: (data: BrandSizeData[]) => {
        // Process the brand and size data
        this.brands = {};
        data.forEach((item: BrandSizeData) => {
          if (item.brandName) {
            this.brands[item.brandName] = item.sizes || [];
          }
        });

        // Update brand options
        this.brandOptions = Object.keys(this.brands).sort();

        console.log('Fetched brands and sizes:', this.brands);
      },
      error: (error: any) => {
        console.error('Error fetching brands:', error);
        // Fallback to default data if API fails
        this.initializeDefaultBrands();
      },
    });
  }

  private initializeDefaultBrands(): void {
    // Fallback to default data if API fails
    this.brands = {
      'Royal Stag': [180, 375, 750],
      'Blenders Pride': [180, 375, 750],
      'Officers Choice': [180, 375, 750],
      'Imperial Blue': [180, 375, 750],
    };
    this.brandOptions = Object.keys(this.brands).sort();

    // Sort sizes for each brand
    for (const brand in this.brands) {
      this.brands[brand].sort((a: number, b: number) => a - b);
    }
  }

  onBrandChange(): void {
    // Reset size when brand changes
    if (this.formData) {
      this.formData.size = '';

      // Update available sizes based on selected brand
      const brandName = this.formData.brand;
      if (brandName && this.brands[brandName]) {
        this.sizeOptions = [...this.brands[brandName]];
      } else {
        this.sizeOptions = [];
      }
    }
  }

  addProduct(): void {
    this.validationErrors = [];

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    // Get rates for the selected brand
    const brandRates =
      this.rates[this.formData.brand as keyof typeof this.rates];
    if (!brandRates) {
      this.validationErrors.push('Invalid brand selected');
      return;
    }

    // Create new product
    const newProduct: Product = {
      brand: this.getBrandDisplayName(this.formData.brand),
      size: this.formData.size + 'ml',
      cases: this.formData.cases,
      educationCess: brandRates.educationCess,
      exciseDuty: brandRates.exciseDuty,
      additionalExcise: brandRates.additionalExcise,
    };

    // Add to products list
    this.products.push(newProduct);

    // Reset form fields for next product
    this.formData.brand = '';
    this.formData.size = '';
    this.formData.cases = 0;

    console.log('Product added:', newProduct);
  }

  deleteProduct(index: number): void {
    if (confirm('Are you sure you want to delete this product?')) {
      this.products.splice(index, 1);
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

    this.validationErrors = errors;
    return errors.length === 0;
  }

  getBrandDisplayName(brandValue: string): string {
    // Convert from URL-friendly format to display format
    return brandValue
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getBrandValue(displayName: string): string {
    // Convert from display format to URL-friendly format
    return displayName.toLowerCase().replace(/\s+/g, '-');
  }

  getTotalEducationCess(): number {
    return this.products.reduce(
      (total, product) => total + product.educationCess * product.cases,
      0
    );
  }

  getTotalExciseDuty(): number {
    return this.products.reduce(
      (total, product) => total + product.exciseDuty * product.cases,
      0
    );
  }

  getTotalAdditionalExcise(): number {
    return this.products.reduce(
      (total, product) => total + product.additionalExcise * product.cases,
      0
    );
  }

  showDeclarationModal(): void {
    if (this.products.length === 0) {
      this.validationErrors = ['Please add at least one product before saving'];
      return;
    }

    // Show Bootstrap modal
    const modalElement = document.getElementById('declarationModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  cancelDeclaration(): void {
    // Hide modal
    const modalElement = document.getElementById('declarationModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    console.log('Declaration cancelled');
  }

  acceptDeclaration(): void {
    // Lock the bill
    this.isLocked = true;

    // Hide modal
    const modalElement = document.getElementById('declarationModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }

    console.log('Bill locked successfully');
    alert(
      'Bill has been locked successfully and is ready for payment processing.'
    );
    // Save to local storage for later viewing
    if (this.isBrowser) {
      const key = 'transitPermitRequests';
      const list: any[] = JSON.parse(localStorage.getItem(key) || '[]');
      const entry = { ...this.formData, products: this.products };
      const idx = list.findIndex((r) => r.billNo === this.formData.billNo);
      if (idx >= 0) list[idx] = entry;
      else list.unshift(entry);
      localStorage.setItem(key, JSON.stringify(list));
    }
  }

  payAllItems(): void {
    // Navigate to payment confirmation page
    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: {
        tab: 'transit',
        billNo: this.formData.billNo,
        totalAmount:
          this.getTotalEducationCess() +
          this.getTotalExciseDuty() +
          this.getTotalAdditionalExcise(),
      },
    });
  }

  clearForm(): void {
    // Reset form data (keep bill no and distributor)
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

    console.log('Form cleared');
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }
}
