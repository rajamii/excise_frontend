import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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
  private isBrowser = false;
  viewModeRef?: string;
  showApplicationTemplate = false;

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

  constructor(private router: Router, private route: ActivatedRoute, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Set today's date as default
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];

    // Generate reference number
    this.generateRefNumber();

    // If navigated with a ref, attempt to load saved request and show it
    const ref = this.route.snapshot.queryParamMap.get('ref');
    if (ref && this.isBrowser) {
      this.viewModeRef = ref;
      const list: any[] = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
      const found = list.find(r => r.refNo === ref);
      if (found) {
        this.formData = { ...this.formData, ...found };
        // recalc derived fields
        this.onBulkSpiritTypeChange();
        this.calculateTotal();
      }
    }
  }

  generateRefNumber(): void {
    if (!this.isBrowser) {
      this.formData.refNo = 'IBPS/01/EXCISE';
      return;
    }

    // Get existing requests to determine next sequence number
    const existingRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');

    // Find the highest sequence number
    let maxSequence = 0;
    existingRequests.forEach((request: any) => {
      const match = request.refNo.match(/IBPS\/(\d+)\/EXCISE/);
      if (match) {
        const sequence = parseInt(match[1], 10);
        if (sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    });

    // Generate next sequence number
    const nextSequence = maxSequence + 1;
    this.formData.refNo = `IBPS/${String(nextSequence).padStart(2, '0')}/EXCISE`;
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
    if (this.isBrowser) {
      const key = 'importPermitRequests';
      const list: any[] = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = list.findIndex(r => r.refNo === this.formData.refNo);
      if (idx >= 0) list[idx] = { ...this.formData }; else list.unshift({ ...this.formData });
      localStorage.setItem(key, JSON.stringify(list));
    }
    alert('Form saved successfully!');
  }

  printBill(): void {
    console.log('Printing bill');

    if (!this.validateForm()) {
      alert('Please fill all required fields before printing the bill.');
      return;
    }

    // Extract printable HTML and open a clean window for printing
    setTimeout(() => {
      const printable = document.getElementById('importPermitPrintSection')?.innerHTML || '';
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => (el as HTMLElement).outerHTML)
        .join('');

      const printWindow = window.open('', '_blank', 'width=900,height=1000');
      if (!printWindow) return;
      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
        <html>
          <head>
            <title>Import Permit - ${this.formData.refNo}</title>
            ${styles}
            <style>
              @page { size: A4; margin: 12mm; }
              body { background: #fff; }
              .no-print { display: none !important; }
              /* Ensure our printable content is visible */
              .printable-content, .printable-content * { visibility: visible !important; }
            </style>
          </head>
          <body>
            ${printable}
          </body>
        </html>`);
      printWindow.document.close();
      // Print after window is ready
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    }, 50);
  }

  submitForm(): void {
    if (this.validateForm()) {
      console.log('Submitting form:', this.formData);
      // Frontend submit logic only
      if (this.isBrowser) {
        const key = 'importPermitRequests';
        const list: any[] = JSON.parse(localStorage.getItem(key) || '[]');

        // Add timestamp for proper sorting
        const submissionData = {
          ...this.formData,
          submittedAt: new Date().toISOString()
        };

        // Always add as new entry at the beginning (unshift adds to top)
        list.unshift(submissionData);
        localStorage.setItem(key, JSON.stringify(list));
      }

      // Show the application template
      this.showApplicationTemplate = true;

      // Generate new reference number for next submission
      this.generateRefNumber();

      // Scroll to the template
      setTimeout(() => {
        const templateElement = document.querySelector('.card.shadow-sm.border-0.mt-4');
        if (templateElement) {
          templateElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

      alert('Form submitted successfully! Application template is now displayed below. A new reference number has been generated for your next submission.');
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

  getBulkSpiritDisplayName(value: string): string {
    switch (value) {
      case 'grain-ena':
        return 'Grain ENA';
      case 'molasses-ena':
        return 'Molasses ENA';
      case 'rectified-spirit':
        return 'Rectified Spirit';
      default:
        return value;
    }
  }

  getPurposeDisplayName(value: string): string {
    switch (value) {
      case 'manufacturing':
        return 'Manufacturing';
      case 'blending':
        return 'Blending';
      case 'bottling':
        return 'Bottling';
      default:
        return value;
    }
  }

  getCheckpostDisplayName(value: string): string {
    switch (value) {
      case 'rangpo':
        return 'Rangpo Checkpost';
      case 'melli':
        return 'Melli Checkpost';
      case 'nathu-la':
        return 'Nathu La Checkpost';
      default:
        return value;
    }
  }

  hideApplicationTemplate(): void {
    this.showApplicationTemplate = false;
  }

  printApplication(): void {
    const printable = document.getElementById('importPermitPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.formData.refNo || '';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Import Permit Application - ${ref}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 12mm; }
            body { background: #fff; }
            .no-print { display:none !important; }
            .printable-content, .printable-content * { visibility: visible !important; }
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

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }
}