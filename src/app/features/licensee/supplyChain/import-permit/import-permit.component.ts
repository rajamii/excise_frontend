import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MasterService,
  BulkSpiritType,
} from '../../../../core/services/master.service';

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
  styleUrls: ['./import-permit.component.scss'],
})
export class ImportPermitComponent implements OnInit, AfterViewInit {
  @ViewChild('spiritTypeSelect')
  spiritTypeSelect!: ElementRef<HTMLSelectElement>;
  errorMessage = '';
  refNoError = '';
  calculatedTotal = 0;
  strengthFrom = '';
  currentYear = new Date().getFullYear();
  private isBrowser = false;
  viewModeRef?: string;

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
    purpose: '',
  };

  bulkSpiritTypes: BulkSpiritType[] = [];
  isLoading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private masterService: MasterService,
    private changeDetector: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.viewModeRef =
        this.route.snapshot.queryParamMap.get('viewMode') || '';
      this.initializeForm();
      this.loadBulkSpiritTypes();
    }
  }

  ngAfterViewInit(): void {
    // Initialization code can be added here if needed
  }

  private loadBulkSpiritTypes(): void {
    this.isLoading = true;

    this.masterService.getBulkSpiritTypes().subscribe({
      next: (types) => {
        this.bulkSpiritTypes = types || [];
        this.changeDetector.detectChanges();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading bulk spirit types:', error);
        this.isLoading = false;
        // You might want to show an error message to the user here
      },
    });
  }

  private initializeForm(): void {
    // Set today's date as default
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];

    // Generate reference number
    this.generateRefNumber();

    // If navigated with a ref, attempt to load saved request and show it
    const ref = this.route.snapshot.queryParamMap.get('ref');
    if (ref && this.isBrowser) {
      this.viewModeRef = ref;
      const list: any[] = JSON.parse(
        localStorage.getItem('importPermitRequests') || '[]'
      );
      const found = list.find((r) => r.refNo === ref);
      if (found) {
        this.formData = { ...this.formData, ...found };
        // recalc derived fields
        this.onBulkSpiritTypeChange();
        this.calculateTotal();
      }
    }
  }

  generateRefNumber(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.formData.refNo = `IBPS/${month}${day}/${year}`;
  }

  calculateTotal(): void {
    this.calculatedTotal =
      (this.formData.quantity || 0) * (this.formData.numberOfPermits || 0);
  }

  /**
   * Handles changes to the bulk spirit type selection
   */
  onBulkSpiritTypeChange(): void {
    if (!this.formData.bulkSpiritType) {
      this.formData.strengthTo = '';
      this.strengthFrom = '';
      return;
    }

    // Find the selected spirit type
    const selectedType = this.bulkSpiritTypes.find(
      (type) => type.strengthFrom === this.formData.bulkSpiritType
    );

    if (selectedType) {
      // Set the strength values from the selected type
      this.formData.strengthTo = selectedType.strengthTo;
      this.strengthFrom = selectedType.strengthFrom;
      console.log('Selected bulk spirit type:', selectedType);
    } else {
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
      const idx = list.findIndex((r) => r.refNo === this.formData.refNo);
      if (idx >= 0) list[idx] = { ...this.formData };
      else list.unshift({ ...this.formData });
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
      const printable =
        document.getElementById('importPermitPrintSection')?.innerHTML || '';
      const styles = Array.from(
        document.querySelectorAll('link[rel="stylesheet"], style')
      )
        .map((el) => (el as HTMLElement).outerHTML)
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
        const idx = list.findIndex((r) => r.refNo === this.formData.refNo);
        if (idx >= 0) list[idx] = { ...this.formData };
        else list.unshift({ ...this.formData });
        localStorage.setItem(key, JSON.stringify(list));
      }
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
