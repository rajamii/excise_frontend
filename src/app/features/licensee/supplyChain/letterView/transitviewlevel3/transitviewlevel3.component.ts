import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

interface TransitData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  permitType: string;
  status: string;
  permitFee: string;
  validityStatus: string;
  fromLocation: string;
  toLocation: string;
  routeDetails: string;
  entryCheckpost: string;
  exitCheckpost: string;
  vehicleNumber: string;
  paymentStatus?: string;
  amount?: string;
  paymentDate?: string;
  reviewedBy?: string;
  reviewDate?: string;
  products?: Array<{
    brand: string;
    size: string;
    cases: string;
    educationCess: string;
    exciseDuty: string;
    additionalExcise: string;
  }>;
  defaultProduct?: {
    brand: string;
    size: string;
    cases: string;
    educationCess: string;
    exciseDuty: string;
    additionalExcise: string;
  };
  totals?: {
    educationCessTotal: string;
    exciseDutyTotal: string;
    additionalExciseTotal: string;
  };

}

@Component({
  selector: 'app-transitviewlevel3',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transitviewlevel3.component.html',
  styleUrl: './transitviewlevel3.component.scss'
})
export class Transitviewlevel3Component implements OnInit {
  transitData?: TransitData;
  private isBrowser = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const ref = this.route.snapshot.queryParamMap.get("ref");
      const source = this.route.snapshot.queryParamMap.get("source");

      if (ref && source === "commissioner-dashboard") {
        this.loadTransitData(ref);
      } else {
        // Redirect to commissioner dashboard if unauthorized access
        this.router.navigate(["/dev-commissioner-dashboard"]);
      }
    }
  }

  private loadTransitData(refNo: string): void {
    // Sample data matching the template format
    const sampleDataMap: Record<string, TransitData> = {
      'TP/001/2025': {
        referenceNo: 'TRP/14/EXCISE',
        submissionDate: '30-10-2025',
        distilleryName: 'M/s Karma Chopel Bhutia',
        permitType: 'Alcohol Transit Permit',
        status: 'TRANSIT PERMIT ISSUED',
        permitFee: '185.5',
        validityStatus: 'Active',
        fromLocation: 'Gangtok, Sikkim',
        toLocation: 'Gangtok, Sikkim',
        routeDetails: 'Gangtok - Siliguri Highway via Rangpo',
        entryCheckpost: 'Rangpo Checkpost',
        exitCheckpost: 'Melli Checkpost',
        vehicleNumber: 'SK 01 AB 1234',
        paymentStatus: 'PAID',
        amount: '185.5',
        paymentDate: '30-10-2025',
        defaultProduct: {
          brand: 'Royal Stag',
          size: '180ml',
          cases: '1',
          educationCess: '15.5',
          exciseDuty: '125',
          additionalExcise: '45'
        },
        totals: {
          educationCessTotal: '15.50',
          exciseDutyTotal: '125.00',
          additionalExciseTotal: '45.00'
        }
      },
      'TP/002/2025': {
        referenceNo: 'TP/002/2025',
        submissionDate: '21-01-2025',
        distilleryName: 'Mount Distilleries Ltd',
        permitType: 'Alcohol Transit Permit',
        status: 'Approved',
        permitFee: '440.0',
        validityStatus: 'Active',
        fromLocation: 'Namchi, Sikkim',
        toLocation: 'Darjeeling, West Bengal',
        routeDetails: 'Namchi - Darjeeling via Melli',
        entryCheckpost: 'Melli Checkpost',
        exitCheckpost: 'Kurseong Checkpost',
        vehicleNumber: 'SK-02-CD-5678',
        paymentStatus: 'PAID',
        amount: '440.0',
        paymentDate: '21-01-2025',
        defaultProduct: {
          brand: 'Mount Heritage ENA',
          size: '750ml',
          cases: '2',
          educationCess: '20.0',
          exciseDuty: '150.0',
          additionalExcise: '50.0'
        },
        totals: {
          educationCessTotal: '40.00',
          exciseDutyTotal: '300.00',
          additionalExciseTotal: '100.00'
        }
      }
    };

    // Try to get data from the sample map
    if (sampleDataMap[refNo]) {
      this.transitData = sampleDataMap[refNo];
      return;
    }

    // Default fallback data
    this.transitData = {
      referenceNo: refNo,
      submissionDate: new Date().toLocaleDateString('en-GB'),
      distilleryName: 'Unknown Distillery',
      permitType: 'Alcohol Transit Permit',
      status: 'PENDING_APPROVAL',
      permitFee: '185.5',
      validityStatus: 'Active',
      fromLocation: 'Gangtok, Sikkim',
      toLocation: 'Gangtok, Sikkim',
      routeDetails: 'Gangtok - Siliguri Highway via Rangpo',
      entryCheckpost: 'Rangpo Checkpost',
      exitCheckpost: 'Melli Checkpost',
      vehicleNumber: 'SK 01 AB 1234',
      paymentStatus: 'PAID',
      amount: '185.5',
      paymentDate: new Date().toLocaleDateString('en-GB'),
      defaultProduct: {
        brand: 'Royal Stag',
        size: '180ml',
        cases: '1',
        educationCess: '15.5',
        exciseDuty: '125',
        additionalExcise: '45'
      },
      totals: {
        educationCessTotal: '15.50',
        exciseDutyTotal: '125.00',
        additionalExciseTotal: '45.00'
      }
    };
  }

  goBack(): void {
    this.router.navigate(["/dev-commissioner-dashboard"]);
  }

  printApplication(): void {
    if (this.isBrowser) {
      // Create a clean print window without browser headers/footers
      const printContent = document.getElementById('transitPrintSection');
      if (!printContent) return;

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) return;

      const styles = `
        <style>
          @page {
            size: A4;
            margin: 0.4in;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: white;
          }
          .application-header { margin-bottom: 0.5rem; padding: 0.5rem; }
          .application-content { padding: 0.25rem; }
          .d-flex { display: flex; }
          .align-items-center { align-items: center; }
          .justify-content-center { justify-content: center; }
          .gap-3 { gap: 1rem; }
          .mb-3 { margin-bottom: 0.5rem; }
          .mb-4 { margin-bottom: 0.5rem; }
          .text-center { text-align: center; }
          .fw-bold { font-weight: bold; }
          .fs-5 { font-size: 0.8rem; line-height: 1.1; }
          .fs-3 { font-size: 1rem; margin-bottom: 0.25rem; line-height: 1.1; }
          .text-success { color: #28a745; }
          .text-primary { color: #007bff; }
          .border-success { border-color: #28a745; }
          .border-primary { border-color: #007bff; }
          .border-2 { border-width: 2px; }
          .row { display: flex; flex-wrap: wrap; margin: 0 -0.25rem; }
          .col-md-6 { flex: 0 0 50%; max-width: 50%; padding: 0 0.25rem; }
          .border { border: 1px solid #dee2e6; }
          .rounded { border-radius: 0.2rem; }
          .p-3 { padding: 0.5rem; }
          .h-100 { height: 100%; }
          .pb-2 { padding-bottom: 0.1rem; }
          .text-muted { color: #6c757d; font-size: 0.7rem; display: inline-block; width: 100px; }
          .badge { background-color: #28a745; color: white; padding: 0.15rem 0.3rem; border-radius: 0.25rem; font-size: 0.65rem; }
          .bg-success { background-color: #28a745; }
          .ms-2 { margin-left: 0.1rem; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
          .table td, .table th { padding: 0.25rem; font-size: 0.75rem; line-height: 1.1; border: 1px solid #dee2e6; vertical-align: middle; }
          .table-bordered { border: 1px solid #dee2e6; }
          .table-info th { background-color: #17a2b8; color: white; font-size: 0.65rem; padding: 0.2rem; line-height: 1; }
          .table-light td { background-color: #f8f9fa; font-size: 0.7rem; }
          .bg-light { background-color: #f8f9fa; }
          .fw-semibold { font-weight: 600; }
          .fw-normal { font-weight: normal; }
          .text-dark { color: #212529; }
          .bg-info { background-color: #17a2b8; }
          .text-white { color: white; }
          h5 { font-size: 0.9rem; margin-bottom: 0.25rem; line-height: 1.1; }
          p { margin-bottom: 0.15rem; font-size: 0.75rem; line-height: 1.2; }
          hr { margin: 0.25rem auto; }
          .table tfoot td { padding: 0.2rem; font-size: 0.7rem; }
          .table thead th { font-size: 0.6rem; padding: 0.2rem; line-height: 1; white-space: nowrap; }
          .table-responsive { overflow: visible; }
        </style>
      `;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Transit Permit Application - ${this.transitData?.referenceNo || ''}</title>
            ${styles}
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }
}
