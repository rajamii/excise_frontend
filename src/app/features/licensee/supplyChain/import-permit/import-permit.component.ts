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

interface MyLicense {
  license_id?: string;
  licenseId?: string;
  license_sub_category_id?: number;
  licenseSubCategoryId?: number;
  license_sub_category?: string;
  licenseSubCategory?: string;
  establishment_name?: string;
  establishmentName?: string;
}

interface SupplyChainProfileResponse {
  success?: boolean;
  exists?: boolean;
  data?: {
    licensee_id?: string;
    licenseeId?: string;
    manufacturing_unit_name?: string;
    manufacturingUnitName?: string;
  } | null;
}

interface UserUnitsResponse {
  success?: boolean;
  data?: Array<{
    licensee_id?: string;
    licenseeId?: string;
    manufacturing_unit_name?: string;
    manufacturingUnitName?: string;
  }>;
}

interface UnitCatalogResponse {
  success?: boolean;
  data?: Array<{
    name?: string;
    licensee_id?: string;
    licenseeId?: string;
    type?: string;
  }>;
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
  currentLicenseIds: string[] = [];
  currentProfileLicenseeIds: string[] = [];
  currentLicenseSubCategoryIds: number[] = [];
  currentEstablishmentNames: string[] = [];
  isDistilleryLicensee = false;
  accessMessage = '';

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
      this.fetchCheckposts();
      this.fetchPurposes();
      this.loadLicenseContextAndMasters();
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

  private loadLicenseContextAndMasters(): void {
    this.http
      .get<MyLicense[]>(`${environment.apiBaseUrl}/masters/license/me/`)
      .subscribe({
        next: (licenses) => {
          const rows = Array.isArray(licenses) ? licenses : [];
          this.currentLicenseIds = rows
            .map((item) => String(item?.license_id ?? item?.licenseId ?? '').trim())
            .filter((id) => !!id);

          this.currentLicenseSubCategoryIds = rows
            .map((item) =>
              Number(item?.license_sub_category_id ?? item?.licenseSubCategoryId ?? 0)
            )
            .filter((id) => Number.isFinite(id) && id > 0);
          this.currentEstablishmentNames = rows
            .map((item) =>
              String(item?.establishment_name ?? item?.establishmentName ?? '').trim()
            )
            .filter((name) => !!name);

          this.isDistilleryLicensee =
            this.currentLicenseSubCategoryIds.includes(2) ||
            rows.some((item) =>
              String(item?.license_sub_category ?? item?.licenseSubCategory ?? '')
                .toLowerCase()
                .includes('distiller')
            );

          if (!this.isDistilleryLicensee) {
            this.bulkSpiritTypes = [];
            this.distilleries = [];
            this.accessMessage =
              'Requisition / Import Permit is only available for distillery licensees.';
            this.changeDetector.detectChanges();
            return;
          }

          this.accessMessage = '';
          this.loadBulkSpiritTypes(this.getPreferredLicenseSubCategoryId());
          this.loadProfileLicenseeIdsAndDistilleries();
        },
        error: () => {
          this.bulkSpiritTypes = [];
          this.distilleries = [];
          this.accessMessage = 'Unable to verify license details. Please try again.';
          this.changeDetector.detectChanges();
        },
      });
  }

  private getPreferredLicenseSubCategoryId(): number | undefined {
    if (this.currentLicenseSubCategoryIds.includes(2)) {
      return 2;
    }
    return this.currentLicenseSubCategoryIds[0];
  }

  private loadBulkSpiritTypes(licenseSubCategoryId?: number): void {
    this.isLoading = true;

    this.SupplyChainService.getBulkSpiritTypes(licenseSubCategoryId).subscribe({
      next: (types) => {
        const unique = new Map<string, BulkSpiritType>();
        (types || []).forEach((type: any) => {
          const key = String(
            type?.bulkSpiritKindType ?? type?.bulk_spirit_kind_type ?? ''
          ).trim().toLowerCase();
          if (!key || unique.has(key)) {
            return;
          }

          unique.set(key, {
            ...type,
            bulkSpiritKindType: String(
              type?.bulkSpiritKindType ?? type?.bulk_spirit_kind_type ?? ''
            ).trim(),
            strength: String(type?.strength ?? '').trim(),
          });
        });

        this.bulkSpiritTypes = Array.from(unique.values());
        this.changeDetector.detectChanges();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private loadProfileLicenseeIdsAndDistilleries(): void {
    this.http
      .get<SupplyChainProfileResponse>(
        `${environment.apiBaseUrl}/masters/supply_chain/user-profile/profile/`
      )
      .subscribe({
        next: (profileResponse) => {
          const activeProfileId = String(
            profileResponse?.data?.licensee_id ??
              profileResponse?.data?.licenseeId ??
              ''
          ).trim();
          const activeProfileName = String(
            profileResponse?.data?.manufacturing_unit_name ??
              profileResponse?.data?.manufacturingUnitName ??
              ''
          ).trim();

          this.http
            .get<UserUnitsResponse>(
              `${environment.apiBaseUrl}/masters/supply_chain/user-profile/user-units/`
            )
            .subscribe({
              next: (unitsResponse) => {
                const unitIds = (unitsResponse?.data || [])
                  .map((unit) =>
                    String(unit?.licensee_id ?? unit?.licenseeId ?? '').trim()
                  )
                  .filter((id) => !!id);
                const unitNames = (unitsResponse?.data || [])
                  .map((unit) =>
                    String(
                      unit?.manufacturing_unit_name ?? unit?.manufacturingUnitName ?? ''
                    ).trim()
                  )
                  .filter((name) => !!name);

                const merged = new Set<string>([
                  ...(activeProfileId ? [activeProfileId] : []),
                  ...unitIds,
                ]);
                const mergedNames = new Set<string>([
                  ...this.currentEstablishmentNames,
                  ...(activeProfileName ? [activeProfileName] : []),
                  ...unitNames,
                ]);

                this.currentProfileLicenseeIds = Array.from(merged);
                this.currentEstablishmentNames = Array.from(mergedNames);
                if (this.currentProfileLicenseeIds.length > 0) {
                  this.accessMessage = '';
                  this.loadDistilleries();
                  return;
                }

                this.loadDerivedLicenseeIdsFromUnitsCatalog();
              },
              error: () => {
                this.currentProfileLicenseeIds = activeProfileId ? [activeProfileId] : [];
                if (activeProfileName) {
                  this.currentEstablishmentNames = Array.from(
                    new Set<string>([...this.currentEstablishmentNames, activeProfileName])
                  );
                }
                if (this.currentProfileLicenseeIds.length > 0) {
                  this.loadDistilleries();
                  return;
                }
                this.loadDerivedLicenseeIdsFromUnitsCatalog();
              },
            });
        },
        error: () => {
          this.currentProfileLicenseeIds = [];
          this.loadDerivedLicenseeIdsFromUnitsCatalog();
        },
      });
  }

  private loadDerivedLicenseeIdsFromUnitsCatalog(): void {
    this.http
      .get<UnitCatalogResponse>(
        `${environment.apiBaseUrl}/masters/supply_chain/user-profile/units/`
      )
      .subscribe({
        next: (catalogResponse) => {
          const derivedIds = (catalogResponse?.data || [])
            .filter((unit) => {
              const unitName = String(unit?.name ?? '').trim();
              if (!unitName) {
                return false;
              }
              return this.currentEstablishmentNames.some((estName) =>
                this.matchesEstablishment(unitName, estName)
              );
            })
            .map((unit) => String(unit?.licensee_id ?? unit?.licenseeId ?? '').trim())
            .filter((id) => !!id);

          this.currentProfileLicenseeIds = Array.from(new Set<string>(derivedIds));
          this.loadDistilleries();
        },
        error: () => {
          this.currentProfileLicenseeIds = [];
          this.loadDistilleries();
        }
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
    if (this.currentLicenseIds.length === 0) {
      this.distilleries = [];
      this.isLoading = false;
      this.accessMessage =
        'No mapped license_id found for your account. Please verify approved license mapping.';
      this.changeDetector.detectChanges();
      return;
    }

    // Strict filter: Lifted From is scoped by license_id from /masters/license/me/.
    this.SupplyChainService.getDistilleries(
      [],
      this.currentEstablishmentNames,
      this.currentLicenseIds
    ).subscribe({
      next: (distilleries) => {
        const mapped = this.normalizeAndDedupeDistilleries(distilleries || []);

        if (mapped.length === 0) {
          this.distilleries = [];
          this.isLoading = false;
          this.accessMessage =
            'No mapped distillery found for your account. Please verify supply-chain profile or license mapping.';
          this.changeDetector.detectChanges();
          return;
        }

        this.distilleries = mapped;
        this.accessMessage = '';
        this.isLoading = false;
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.distilleries = [];
        this.isLoading = false;
        this.changeDetector.detectChanges();
      },
    });
  }

  private normalizeAndDedupeDistilleries(items: any[]): Distillery[] {
    const unique = new Map<string, Distillery>();

    items.forEach((item: any) => {
      const normalized: Distillery = {
        ...item,
        id: Number(item?.id ?? 0),
        distilleryName: String(item?.distilleryName ?? item?.distillery_name ?? '').trim(),
        distilleryAddress: String(item?.distilleryAddress ?? item?.distillery_address ?? '').trim(),
        distilleryState: String(item?.distilleryState ?? item?.distillery_state ?? item?.state ?? '').trim(),
        viaRoute: String(item?.viaRoute ?? item?.via_route ?? '').trim(),
        licenseeId: String(item?.licenseeId ?? item?.licensee_id ?? '').trim(),
        licensee_id: String(item?.licenseeId ?? item?.licensee_id ?? '').trim()
      };

      const key = `${normalized.id}|${normalized.distilleryName.toLowerCase()}`;
      if (
        !unique.has(key) &&
        normalized.distilleryName &&
        !this.isBreweryName(normalized.distilleryName)
      ) {
        unique.set(key, normalized);
      }
    });

    return Array.from(unique.values());
  }

  private isBreweryName(name: string): boolean {
    const value = String(name || '').toLowerCase();
    return value.includes('brewery') || value.includes('breweries') || value.includes('beer');
  }

  private normalizeName(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/m\/s/g, '')
      .replace(/pvt\.?/g, '')
      .replace(/ltd\.?/g, '')
      .replace(/limited/g, '')
      .replace(/industries/g, '')
      .replace(/distilleries/g, 'distillery')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private matchesEstablishment(distilleryName: string, establishmentName: string): boolean {
    const d = this.normalizeName(distilleryName);
    const e = this.normalizeName(establishmentName);

    if (!d || !e) {
      return false;
    }

    return d.includes(e) || e.includes(d);
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
    if (!this.isDistilleryLicensee) {
      this.errorMessage = 'Only distillery licensees can submit requisition.';
      return;
    }

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
    if (!this.isDistilleryLicensee) {
      this.errorMessage = 'Requisition is allowed only for distillery licensees.';
      return false;
    }
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
