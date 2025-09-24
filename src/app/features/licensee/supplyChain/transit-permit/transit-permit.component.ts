import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface FormData {
  billNo: string;
  soleDistributor: string;
  date: string;
  depotAddress: string;
  brand: string;
  size: string;
  cases: number;
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
    cases: 0
  };

  products: Product[] = [];
  validationErrors: string[] = [];
  isLocked = false;

  // Sample rates for calculation
  private rates = {
    'royal-stag': { educationCess: 15.50, exciseDuty: 125.00, additionalExcise: 45.00 },
    'blenders-pride': { educationCess: 18.00, exciseDuty: 140.00, additionalExcise: 50.00 },
    'officers-choice': { educationCess: 12.00, exciseDuty: 95.00, additionalExcise: 35.00 },
    'imperial-blue': { educationCess: 14.00, exciseDuty: 110.00, additionalExcise: 40.00 }
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Set today's date as default
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];
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
    alert('Bill has been locked successfully and is ready for payment processing.');
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
    // Reset form data (keep bill no and distributor)
    this.formData.date = new Date().toISOString().split('T')[0];
    this.formData.depotAddress = '';
    this.formData.brand = '';
    this.formData.size = '';
    this.formData.cases = 0;
    
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