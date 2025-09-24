import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface FormData {
  refNo: string;
  date: string;
  quantity: number;
  numberOfPermits: number;
  bulkSpiritType: string;
  strengthTo: string;
  liftedFrom: string;
  viaRoute: string;
  checkpostEntry: string;
  purpose: string;
}

@Component({
  selector: 'app-import-permit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-permit.component.html',
  styleUrls: ['./import-permit.component.scss']
})
export class ImportPermitComponent implements OnInit {
  errorMessage = '';
  refNoError = '';
  calculatedTotal = 0;
  strengthFrom = '';
  currentYear = new Date().getFullYear();

  formData: FormData = {
    refNo: 'IBPS/01/EXCISE',
    date: '',
    quantity: 0,
    numberOfPermits: 0,
    bulkSpiritType: '',
    strengthTo: '',
    liftedFrom: '',
    viaRoute: '',
    checkpostEntry: '',
    purpose: ''
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Set today's date as default
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];
    
    // Generate reference number
    this.generateRefNumber();
  }

  generateRefNumber(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.formData.refNo = `IBPS/${month}${day}/${year}`;
  }

  calculateTotal(): void {
    this.calculatedTotal = (this.formData.quantity || 0) * (this.formData.numberOfPermits || 0);
  }

  onBulkSpiritTypeChange(): void {
    switch (this.formData.bulkSpiritType) {
      case 'grain-ena':
        this.formData.strengthTo = '96%';
        this.strengthFrom = '95%';
        break;
      case 'molasses-ena':
        this.formData.strengthTo = '95%';
        this.strengthFrom = '94%';
        break;
      case 'rectified-spirit':
        this.formData.strengthTo = '95.5%';
        this.strengthFrom = '95%';
        break;
      default:
        this.formData.strengthTo = '';
        this.strengthFrom = '';
    }
  }

  onLiftedFromChange(): void {
    // Handle distillery selection change
    console.log('Distillery changed to:', this.formData.liftedFrom);
  }

  getDistilleryName(value: string): string {
    switch (value) {
      case 'sikkim-distilleries':
        return 'Sikkim Distilleries Ltd';
      case 'mountain-spirits':
        return 'Mountain Spirits Pvt Ltd';
      case 'highland-breweries':
        return 'Highland Breweries';
      default:
        return '';
    }
  }

  saveForm(): void {
    console.log('Saving form:', this.formData);
    // Frontend save logic only
    alert('Form saved successfully!');
  }

  printBill(): void {
    console.log('Printing bill');
    window.print();
  }

  submitForm(): void {
    if (this.validateForm()) {
      console.log('Submitting form:', this.formData);
      // Frontend submit logic only
      alert('Form submitted successfully!');
    }
  }

  validateForm(): boolean {
    if (!this.formData.date) {
      this.errorMessage = 'Please select a date';
      return false;
    }
    if (!this.formData.quantity || this.formData.quantity <= 0) {
      this.errorMessage = 'Please enter a valid quantity';
      return false;
    }
    if (!this.formData.numberOfPermits || this.formData.numberOfPermits <= 0) {
      this.errorMessage = 'Please enter number of permits';
      return false;
    }
    if (!this.formData.bulkSpiritType) {
      this.errorMessage = 'Please select bulk spirit type';
      return false;
    }
    if (!this.formData.liftedFrom) {
      this.errorMessage = 'Please select distillery';
      return false;
    }
    if (!this.formData.viaRoute) {
      this.errorMessage = 'Please enter via route';
      return false;
    }
    if (!this.formData.checkpostEntry) {
      this.errorMessage = 'Please select checkpost entry';
      return false;
    }
    if (!this.formData.purpose) {
      this.errorMessage = 'Please select purpose';
      return false;
    }
    
    this.errorMessage = '';
    return true;
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }
}