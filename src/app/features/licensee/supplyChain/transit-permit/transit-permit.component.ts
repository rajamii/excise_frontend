import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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
  styleUrls: ['./transit-permit.component.scss']
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
    vehicleNumber: ''
  };

  products: Product[] = [];
  validationErrors: string[] = [];
  isLocked = false;
  isSubmitted = false;

  // Sample rates for calculation
  private rates = {
    'royal-stag': { educationCess: 15.50, exciseDuty: 125.00, additionalExcise: 45.00 },
    'blenders-pride': { educationCess: 18.00, exciseDuty: 140.00, additionalExcise: 50.00 },
    'officers-choice': { educationCess: 12.00, exciseDuty: 95.00, additionalExcise: 35.00 },
    'imperial-blue': { educationCess: 14.00, exciseDuty: 110.00, additionalExcise: 40.00 }
  };

  vehicleNumbers: string[] = [
    'SK 01 AB 1234',
    'SK 02 CD 5678',
    'SK 03 EF 9012'
  ];

  private isBrowser = false;
  constructor(private router: Router, private route: ActivatedRoute, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Set today's date as default
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];
    
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

  onBrandChange(): void {
    // Reset size when brand changes
    this.formData.size = '';
  }

  addProduct(): void {
    this.validationErrors = [];

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    // Get rates for the selected brand
    const brandRates = this.rates[this.formData.brand as keyof typeof this.rates];
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
      additionalExcise: brandRates.additionalExcise
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
    const brandNames: { [key: string]: string } = {
      'royal-stag': 'Royal Stag',
      'blenders-pride': 'Blenders Pride',
      'officers-choice': 'Officers Choice',
      'imperial-blue': 'Imperial Blue'
    };
    return brandNames[brandValue] || brandValue;
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

  submitApplication(): void {
    if (this.products.length === 0) {
      this.validationErrors = ['Please add at least one product before submitting'];
      return;
    }

    // Validate all required fields
    if (!this.formData.date || !this.formData.depotAddress || !this.formData.vehicleNumber) {
      this.validationErrors = ['Please fill all required fields: Date, Depot Address, and Vehicle Number'];
      return;
    }

    // Clear validation errors
    this.validationErrors = [];
    
    // Mark as submitted and locked
    this.isSubmitted = true;
    this.isLocked = true;

    // Save to localStorage for supply chain dashboard
    this.saveToSupplyChainDashboard();

    // Show success message
    alert('Transit Permit Application submitted successfully!');
  }

  private generateNextBillNumber(): void {
    if (!this.isBrowser) {
      return;
    }

    // Get all existing transit permit requests to find the highest bill number
    const transitList: any[] = JSON.parse(localStorage.getItem('transitPermitRequests') || '[]');
    const importList: any[] = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
    
    // Combine both lists and filter for transit permits
    const allTransitPermits = [
      ...transitList,
      ...importList.filter((item: any) => item.type === 'transit-permit')
    ];

    // Extract bill numbers and find the highest sequence number
    let maxSequence = 1; // Start from 1 if no existing bills
    
    allTransitPermits.forEach((permit: any) => {
      const billNo = permit.billNo || permit.refNo;
      if (billNo && billNo.startsWith('TRP/')) {
        // Extract number from format like "TRP/2/EXCISE"
        const match = billNo.match(/TRP\/(\d+)\/EXCISE/);
        if (match) {
          const sequence = parseInt(match[1], 10);
          if (sequence >= maxSequence) {
            maxSequence = sequence + 1;
          }
        }
      }
    });

    // Generate the next bill number
    this.formData.billNo = `TRP/${maxSequence}/EXCISE`;
  }

  private saveToSupplyChainDashboard(): void {
    if (this.isBrowser) {
      // Save to transitPermitRequests for transit permit dashboard
      const transitKey = 'transitPermitRequests';
      const transitList: any[] = JSON.parse(localStorage.getItem(transitKey) || '[]');
      const transitEntry = { 
        ...this.formData, 
        products: this.products,
        submissionDate: new Date().toISOString(),
        status: 'TRANSIT PERMIT ISSUED',
        totalAmount: this.getTotalEducationCess() + this.getTotalExciseDuty() + this.getTotalAdditionalExcise()
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

    // Generate new bill number for next application
    this.generateNextBillNumber();

    console.log('Form cleared');
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