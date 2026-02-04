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
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import Swal from 'sweetalert2';

import { EnaRequisitionService } from '../../../../core/services/ena-requisition.service';
import { BulkSpiritType, Distillery } from '../models/supply-chain.models';
import { SupplyChainService } from '../../../licensee/supplyChain/services/supplychain.service';

interface Checkpost {
  id: number;
  checkpostName: string;
}

interface Purpose {
  id: number;
  purposeName: string;
}

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
  bulkSpiritKindType = '';
  selectedDistilleryState = '';
  currentYear = new Date().getFullYear();
  private isBrowser = false;

  formData: FormData = {
    refNo: 'Loading...', // Will be fetched from backend
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
  distilleries: Distillery[] = [];
  checkposts: Checkpost[] = [];
  purposes: Purpose[] = [];
  isLoading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private SupplyChainService: SupplyChainService,
    private enaRequisitionService: EnaRequisitionService,
    private http: HttpClient,
    private changeDetector: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.initializeForm();
      this.loadBulkSpiritTypes();
      this.loadDistilleries();
      this.fetchCheckposts();
      this.fetchPurposes();
    }
  }

  ngAfterViewInit(): void {
    // Initialization code can be added here if needed
  }

  fetchCheckposts(): void {
    this.isLoading = true;
    const baseUrl = `${environment.apiBaseUrl}/masters/supply_chain/checkposts/checkposts/`;

    this.http.get<{ status: string; data: Checkpost[] }>(baseUrl).subscribe({
      next: (dataResponse) => {
        if (dataResponse.status === 'success') {
          this.checkposts = dataResponse.data || [];
        }
        this.isLoading = false;
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.changeDetector.detectChanges();
      },
    });
  }

  fetchPurposes(): void {
    this.isLoading = true;
    const baseUrl = `${environment.apiBaseUrl}/masters/supply_chain/purposes/purposes/`;

    this.http.get<{ status: string; data: Purpose[] }>(baseUrl).subscribe({
      next: (dataResponse) => {
        if (dataResponse.status === 'success') {
          this.purposes = dataResponse.data || [];
        }
        this.isLoading = false;
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.changeDetector.detectChanges();
      },
    });
  }

  // fetchStatuses removed (Legacy)

  private loadBulkSpiritTypes(): void {
    this.isLoading = true;

    this.SupplyChainService.getBulkSpiritTypes().subscribe({
      next: (types) => {
        this.bulkSpiritTypes = types || [];
        this.changeDetector.detectChanges();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private initializeForm(): void {
    // Set today's date as default
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];

    // Fetch and display the next reference number
    this.generateRefNumber();
  }

  generateRefNumber(): void {
    this.refNoError = '';
    this.enaRequisitionService.getNextRefNumber().subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.formData.refNo = response.ref_number || response.refNumber;
        } else {
          this.refNoError = 'Failed to load reference number';
          this.formData.refNo = 'IBPS/01/EXCISE';
        }
      },
      error: (error) => {
        console.error('Error loading reference number:', error);
        this.refNoError = 'Error loading reference number';
        this.formData.refNo = 'IBPS/01/EXCISE';
      }
    });
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
      this.bulkSpiritKindType = '';
      return;
    }

    // Find the selected spirit type
    const selectedType = this.bulkSpiritTypes.find(
      (type) =>
        (type.bulkSpiritKindType) ===
        this.formData.bulkSpiritType
    );

    if (selectedType) {
      // Set the strength values from the selected type
      this.formData.strengthTo = selectedType.strength || '';
      this.bulkSpiritKindType =
        selectedType.bulkSpiritKindType || '';
    } else {
      this.formData.strengthTo = '';
      this.bulkSpiritKindType = '';
    }
  }

  onLiftedFromChange(): void {
    if (this.formData.liftedFrom) {
      // Convert both to string for comparison to handle both string and number IDs
      const selectedDistillery = this.distilleries.find(
        (d) => d.id.toString() === this.formData.liftedFrom.toString()
      );

      if (selectedDistillery) {
        // Handle both camelCase and snake_case property names
        const viaRoute = selectedDistillery.viaRoute || '';
        // API returns 'state' property, not 'distilleryState'
        const state = (selectedDistillery as any).state || selectedDistillery.distilleryState || selectedDistillery.distillery_state || '';
        this.formData.viaRoute = viaRoute;
        this.selectedDistilleryState = state;
        console.log('Selected distillery:', selectedDistillery);
        console.log('Captured state:', this.selectedDistilleryState);
      } else {
        this.formData.viaRoute = '';
        this.selectedDistilleryState = '';
      }
    } else {
      this.formData.viaRoute = '';
      this.selectedDistilleryState = '';
    }

    // Trigger change detection to ensure the view updates
    this.changeDetector.detectChanges();
  }

  private loadDistilleries(): void {
    this.isLoading = true;

    this.SupplyChainService.getDistilleries().subscribe({
      next: (distilleries) => {
        this.distilleries = distilleries || [];
        this.isLoading = false;
        this.changeDetector.detectChanges(); // Trigger change detection
      },
      error: () => {
        this.distilleries = [];
        this.isLoading = false;
        this.changeDetector.detectChanges(); // Trigger change detection
      },
    });
  }

  getDistilleryName(value: string): string {
    if (!value) return '';
    const distillery = this.distilleries.find(
      (d) => d.id.toString() === value.toString()
    );
    return distillery
      ? distillery.distilleryName || ''
      : '';
  }

  saveForm(): void {
    // Logic for saving draft can be implemented here if needed in future
    // Currently removing dummy localStorage logic
    this.router.navigate(['/licensee/import-permit-view'], {
      queryParams: { ref: this.formData.refNo },
    });
  }

  printBill(): void {
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
      this.isLoading = true;

      const now = new Date().toISOString();

      const requisitionData = {
        // Using camelCase for djangorestframework-camel-case
        // ourRefNo is auto-generated by backend, so we don't send it
        requisitonNumberOfPermits: this.formData.numberOfPermits, // Note: typo in backend model
        requisitionDate: now,
        liftedFromDistilleryName: this.getDistilleryName(
          this.formData.liftedFrom
        ),
        branchPurpose: this.formData.purpose,
        viaRoute: this.formData.viaRoute,
        grainEnaNumber: this.formData.quantity,
        bulkSpiritType: this.formData.bulkSpiritType,
        strength: this.formData.strengthTo || '',
        state: this.selectedDistilleryState || 'N/A',
        totalbl: this.calculatedTotal,
        approvalDate: now,
        liftedFrom: this.getDistilleryName(this.formData.liftedFrom),
        purposeName: this.formData.purpose,
        checkPostName: this.formData.checkpostEntry,
      };

      console.log('Submitting requisition with state:', requisitionData.state);
      console.log('Full requisition data:', requisitionData);

      this.enaRequisitionService.createRequisition(requisitionData).subscribe({
        next: (response) => {
          this.isLoading = false;
          const generatedRefNo = response.ourRefNo || response.our_ref_no || 'Unknown';
          Swal.fire({
            title: 'Success!',
            text: `Form submitted successfully! Reference No: ${generatedRefNo}`,
            icon: 'success',
            confirmButtonText: 'OK',
          }).then((result) => {
            if (result.isConfirmed) {
              this.router.navigate(['/dashboard']);
            }
          });
        },
        error: (error) => {
          this.isLoading = false;
          Swal.fire({
            title: 'Error!',
            text: `Error submitting form: ${error.message || 'Please check the console for details'
              }`,
            icon: 'error',
            confirmButtonText: 'OK',
          });
        },
      });
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
    // Navigate back to the dashboard with the 'requisition' section selected
    this.router.navigate(['/dashboard'], { queryParams: { section: 'requisition' } });
  }

  getStatusId(code: string): string {
    return code;
  }
}
