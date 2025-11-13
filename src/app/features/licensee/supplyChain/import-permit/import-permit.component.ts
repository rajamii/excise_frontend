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
import {
  MasterService,
  BulkSpiritType,
  Distillery,
} from '../../../../core/services/master.service';
import { EnaRequisitionService } from '../../../../core/services/ena-requisition.service';

interface Checkpost {
  id: number;
  checkpostName: string; // Changed from checkpost_name to checkpostName to match backend response
}

interface Purpose {
  id: number;
  purposeName: string; // Changed from purpose_name to purposeName to match backend response
}

interface ApiResponse<T> {
  status: string;
  data: T[];
  message?: string;
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
  distilleries: Distillery[] = [];
  checkposts: Checkpost[] = [];
  purposes: Purpose[] = [];
  isLoading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private masterService: MasterService,
    private enaRequisitionService: EnaRequisitionService,
    private http: HttpClient,
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
      this.loadDistilleries();
      this.fetchCheckposts();
      this.fetchPurposes();
    }
  }

  ngAfterViewInit(): void {
    // Initialization code can be added here if needed
  }

  fetchCheckposts(): void {
    console.log('1. Starting to fetch checkposts...');
    this.isLoading = true;

    const baseUrl = `${environment.apiBaseUrl}/transactional/supply_chain/checkposts/`;
    console.log('2. Initial API URL:', baseUrl);

    // First get the URL for the actual data
    this.http.get<{ checkposts: string }>(baseUrl).subscribe({
      next: (response) => {
        console.log('3. Received checkposts URL:', response.checkposts);

        // Now fetch the actual checkposts data
        this.http
          .get<{ status: string; data: Checkpost[] }>(response.checkposts)
          .subscribe({
            next: (dataResponse) => {
              console.log('4. Received checkposts data:', dataResponse);
              if (dataResponse.status === 'success') {
                this.checkposts = dataResponse.data || [];
                console.log('5. Parsed checkposts:', this.checkposts);
                console.log(
                  '5.1 Checkposts array length:',
                  this.checkposts.length
                );
                if (this.checkposts.length > 0) {
                  console.log('5.2 First checkpost:', this.checkposts[0]);
                }

                // Force change detection
                this.changeDetector.detectChanges();

                // Check the dropdown after a small delay
                setTimeout(() => {
                  console.log(
                    '5.3 After timeout - checkposts in component:',
                    this.checkposts
                  );
                  const selectElement = document.querySelector(
                    'select[name="checkpostEntry"]'
                  ) as HTMLSelectElement;
                  console.log(
                    '5.4 Check if dropdown element exists:',
                    selectElement
                  );
                  if (selectElement) {
                    console.log(
                      '5.5 Number of options in dropdown:',
                      selectElement.options.length
                    );
                    console.log('5.6 Dropdown value:', selectElement.value);
                  }
                }, 100);
              } else {
                console.warn(
                  '6. Unexpected data format in checkposts response:',
                  dataResponse
                );
              }
              this.isLoading = false;
            },
            error: (error) => {
              console.error('7. Error fetching checkposts data:', error);
              this.isLoading = false;
            },
          });
      },
      error: (error) => {
        console.error('8. Error fetching checkposts URL:', error);
        this.isLoading = false;
      },
      complete: () => console.log('9. Checkposts URL fetch completed'),
    });
  }

  fetchPurposes(): void {
    console.log('1. Starting to fetch purposes...');
    this.isLoading = true;

    const baseUrl = `${environment.apiBaseUrl}/transactional/supply_chain/purposes/`;
    console.log('2. Initial API URL:', baseUrl);

    // First get the URL for the actual data
    this.http.get<{ purposes: string }>(baseUrl).subscribe({
      next: (response) => {
        console.log('3. Received purposes URL:', response.purposes);

        // Now fetch the actual purposes data
        this.http
          .get<{ status: string; data: Purpose[] }>(response.purposes)
          .subscribe({
            next: (dataResponse) => {
              console.log('4. Received purposes data:', dataResponse);
              if (dataResponse.status === 'success') {
                this.purposes = dataResponse.data || [];
                console.log('5. Parsed purposes:', this.purposes);
              } else {
                console.warn(
                  '6. Unexpected data format in purposes response:',
                  dataResponse
                );
              }
              this.isLoading = false;
            },
            error: (error) => {
              console.error('7. Error fetching purposes data:', error);
              this.isLoading = false;
            },
          });
      },
      error: (error) => {
        console.error('8. Error fetching purposes URL:', error);
        this.isLoading = false;
      },
      complete: () => console.log('9. Purposes URL fetch completed'),
    });
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
    console.log('Distillery changed to:', this.formData.liftedFrom);
    console.log('Available distilleries:', this.distilleries);

    if (this.formData.liftedFrom) {
      console.log('Looking for distillery with ID:', this.formData.liftedFrom);

      // Convert both to string for comparison to handle both string and number IDs
      const selectedDistillery = this.distilleries.find(
        (d) => d.id.toString() === this.formData.liftedFrom.toString()
      );

      console.log('Found distillery:', selectedDistillery);

      if (selectedDistillery) {
        // Handle both camelCase and snake_case property names
        const viaRoute =
          selectedDistillery.viaRoute || selectedDistillery.via_route || '';
        console.log('Setting viaRoute to:', viaRoute);
        this.formData.viaRoute = viaRoute;
      } else {
        console.warn(
          'No matching distillery found for ID:',
          this.formData.liftedFrom
        );
        this.formData.viaRoute = '';
      }
    } else {
      console.log('No distillery selected, clearing viaRoute');
      this.formData.viaRoute = '';
    }

    // Trigger change detection to ensure the view updates
    this.changeDetector.detectChanges();
  }

  private loadDistilleries(): void {
    console.log('Loading distilleries...');
    this.isLoading = true;

    this.masterService.getDistilleries().subscribe({
      next: (distilleries) => {
        console.log('Received distilleries:', distilleries);
        this.distilleries = distilleries || [];
        console.log('Updated distilleries array:', this.distilleries);
        this.isLoading = false;
        this.changeDetector.detectChanges(); // Trigger change detection
      },
      error: (error) => {
        console.error('Error loading distilleries:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
        });
        this.distilleries = [];
        this.isLoading = false;
        this.changeDetector.detectChanges(); // Trigger change detection
      },
    });
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

    // Prepare data for display
    const savedData = {
      referenceNo: this.formData.refNo,
      submissionDate: new Date(this.formData.date),
      totalENA: this.calculatedTotal,
      strengthFrom: this.strengthFrom,
      strengthTo: this.formData.strengthTo,
      distillery: this.formData.liftedFrom,
      viaRoute: this.formData.viaRoute,
      purpose: this.formData.purpose,
      checkPost: this.formData.checkpostEntry,
      numberOfPermits: this.formData.numberOfPermits,
      quantity: this.formData.quantity,
    };

    // Save to localStorage
    if (this.isBrowser) {
      const key = 'importPermitRequests';
      const list: any[] = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = list.findIndex((r) => r.refNo === this.formData.refNo);
      if (idx >= 0) {
        list[idx] = { ...savedData };
      } else {
        list.unshift({ ...savedData });
      }
      localStorage.setItem(key, JSON.stringify(list));
    }

    // Navigate to view page with the saved data
    this.router.navigate(['/licensee/import-permit-view'], {
      queryParams: { ref: this.formData.refNo },
    });
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
      this.isLoading = true;
      console.log('Submitting form:', this.formData);

      const now = new Date().toISOString();

      const requisitionData = {
        // Existing fields
        requisiton_number_of_permits: this.formData.numberOfPermits,
        our_ref_no: this.formData.refNo,
        requisition_date: now,
        lifted_from_distillery_name: this.formData.liftedFrom,
        branch_address: 'N/A',
        branch_purpose: this.formData.purpose,
        via_route: this.formData.viaRoute,
        govt_officer: 'N/A',
        grain_ena_number: 0,
        strength_from: 0,
        strength_to: parseFloat(this.formData.strengthTo) || 0,
        status: 'pending',
        state: 'draft',
        totalbl: 0,
        approval_date: now,
        lifted_from: this.formData.liftedFrom,
        purpose_name: this.formData.purpose,
        check_post_name: this.formData.checkpostEntry,
        permit_nocount: '0',
        br_amount: 0,

        // Add the required fields with default values
        evc_file_path: 'N/A',
        cancellation_br_amount: 0,
        cancellation_br_number: 'N/A',
        licensee_id: 'N/A',
      };

      console.log('Sending data to backend:', requisitionData);

      this.enaRequisitionService.createRequisition(requisitionData).subscribe({
        next: (response) => {
          console.log('Requisition created successfully:', response);
          this.isLoading = false;
          alert('Form submitted successfully!');
        },
        error: (error) => {
          console.error('Error submitting form:', error);
          this.isLoading = false;
          alert(
            `Error submitting form: ${
              error.message || 'Please check the console for details'
            }`
          );
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
    this.router.navigate(['/dev-supply-chain']);
  }
}
