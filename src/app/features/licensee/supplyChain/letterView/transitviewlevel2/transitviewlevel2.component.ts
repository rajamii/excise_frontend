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
  selector: "app-transitviewlevel2",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./transitviewlevel2.component.html",
  styleUrls: ["./transitviewlevel2.component.scss"],
})
export class Transitviewlevel2Component implements OnInit {
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
      if (ref) {
        this.loadTransitData(ref);
      } else {
        this.router.navigate(["/dev-officer-in-charge"]);
      }
    }
  }

  private loadTransitData(refNo: string): void {
    // Sample data based on different reference numbers
    const sampleDataMap: Record<string, TransitData> = {
      'TP001/2024': {
        referenceNo: 'TP001/2024',
        submissionDate: '15-01-2024',
        distilleryName: 'Sikkim Distilleries Ltd',
        permitType: 'Alcohol Transit Permit',
        status: 'PENDING_APPROVAL',
        permitFee: '15000.00',
        validityStatus: 'Active',
        fromLocation: 'Gangtok, Sikkim',
        toLocation: 'Siliguri, West Bengal',
        routeDetails: 'Gangtok - Siliguri Highway via Rangpo',
        entryCheckpost: 'Rangpo Checkpost',
        exitCheckpost: 'Melli Checkpost',
        vehicleNumber: 'SK 01 AB 1234',
        paymentStatus: 'PAID',
        amount: '15000.00',
        paymentDate: '15-01-2024',
        products: [
          {
            brand: 'Royal Stag',
            size: '750ml',
            cases: '2',
            educationCess: '20.00',
            exciseDuty: '150.00',
            additionalExcise: '50.00'
          }
        ],
        totals: {
          educationCessTotal: '40.00',
          exciseDutyTotal: '300.00',
          additionalExciseTotal: '100.00'
        }
      },
      'TP002/2024': {
        referenceNo: 'TP002/2024',
        submissionDate: '14-01-2024',
        distilleryName: 'Sikkim Distilleries Ltd',
        permitType: 'Alcohol Transit Permit',
        status: 'PENDING_APPROVAL',
        permitFee: '12000.00',
        validityStatus: 'Active',
        fromLocation: 'Namchi, Sikkim',
        toLocation: 'Darjeeling, West Bengal',
        routeDetails: 'Namchi - Darjeeling via Melli',
        entryCheckpost: 'Melli Checkpost',
        exitCheckpost: 'Kurseong Checkpost',
        vehicleNumber: 'SK 02 CD 5678',
        paymentStatus: 'PAID',
        amount: '12000.00',
        paymentDate: '14-01-2024',
        products: [
          {
            brand: 'Blenders Pride',
            size: '375ml',
            cases: '3',
            educationCess: '15.00',
            exciseDuty: '120.00',
            additionalExcise: '40.00'
          }
        ],
        totals: {
          educationCessTotal: '45.00',
          exciseDutyTotal: '360.00',
          additionalExciseTotal: '120.00'
        }
      },
      'TP003/2024': {
        referenceNo: 'TP003/2024',
        submissionDate: '13-01-2024',
        distilleryName: 'Sikkim Distilleries Ltd',
        permitType: 'Alcohol Transit Permit',
        status: 'APPROVED',
        permitFee: '18000.00',
        validityStatus: 'Active',
        fromLocation: 'Gyalshing, Sikkim',
        toLocation: 'Kalimpong, West Bengal',
        routeDetails: 'Gyalshing - Kalimpong via Jorethang',
        entryCheckpost: 'Jorethang Checkpost',
        exitCheckpost: 'Kalimpong Checkpost',
        vehicleNumber: 'SK 03 EF 9012',
        paymentStatus: 'PAID',
        amount: '18000.00',
        paymentDate: '13-01-2024',
        reviewedBy: 'Officer Rajesh Kumar',
        reviewDate: '15-01-2024',
        products: [
          {
            brand: 'McDowell\'s No.1',
            size: '180ml',
            cases: '5',
            educationCess: '12.00',
            exciseDuty: '100.00',
            additionalExcise: '35.00'
          }
        ],
        totals: {
          educationCessTotal: '60.00',
          exciseDutyTotal: '500.00',
          additionalExciseTotal: '175.00'
        }
      },
      'TRP/14/EXCISE': {
        referenceNo: 'TRP/14/EXCISE',
        submissionDate: '30-10-2025',
        distilleryName: 'M/s Karma Chapel Bhutia',
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
      }
    };

    // Try to get data from the sample map first
    if (sampleDataMap[refNo]) {
      this.transitData = sampleDataMap[refNo];
      return;
    }

    // If not found in sample data, try to load from localStorage
    if (this.isBrowser) {
      try {
        const transitList: any[] = JSON.parse(localStorage.getItem('transitPermitRequests') || '[]');
        const foundTransit = transitList.find((r: any) => (r.billNo || r.refNo) === refNo);
        
        if (foundTransit) {
          this.transitData = {
            referenceNo: foundTransit.billNo || foundTransit.refNo,
            submissionDate: new Date(foundTransit.submissionDate || foundTransit.date).toLocaleDateString('en-GB'),
            distilleryName: foundTransit.soleDistributor || foundTransit.distilleryName || 'Unknown Distillery',
            permitType: 'Alcohol Transit Permit',
            status: foundTransit.status || 'PENDING_APPROVAL',
            permitFee: String(foundTransit.totalAmount || foundTransit.brAmount || '0'),
            validityStatus: 'Active',
            fromLocation: this.getLocationName(foundTransit.depotAddress) || 'Gangtok, Sikkim',
            toLocation: foundTransit.toLocation || 'Gangtok, Sikkim',
            routeDetails: foundTransit.routeDetails || 'Gangtok - Siliguri Highway via Rangpo',
            entryCheckpost: foundTransit.checkpostEntry || 'Rangpo Checkpost',
            exitCheckpost: foundTransit.checkpostExit || 'Melli Checkpost',
            vehicleNumber: foundTransit.vehicleNumber || 'SK 01 AB 1234',
            paymentStatus: 'PAID',
            amount: String(foundTransit.totalAmount || foundTransit.brAmount || '0'),
            paymentDate: new Date(foundTransit.submissionDate || foundTransit.date).toLocaleDateString('en-GB'),
            products: foundTransit.products || [],
            totals: {
              educationCessTotal: this.calculateTotal(foundTransit.products, 'educationCess'),
              exciseDutyTotal: this.calculateTotal(foundTransit.products, 'exciseDuty'),
              additionalExciseTotal: this.calculateTotal(foundTransit.products, 'additionalExcise')
            }
          };
          return;
        }
      } catch (error) {
        console.error('Error loading transit data:', error);
      }
    }

    // Default fallback data
    this.transitData = {
      referenceNo: refNo,
      submissionDate: new Date().toLocaleDateString('en-GB'),
      distilleryName: 'Unknown Distillery',
      permitType: 'Alcohol Transit Permit',
      status: 'PENDING_APPROVAL',
      permitFee: '0.00',
      validityStatus: 'Active',
      fromLocation: 'Gangtok, Sikkim',
      toLocation: 'Gangtok, Sikkim',
      routeDetails: 'Gangtok - Siliguri Highway via Rangpo',
      entryCheckpost: 'Rangpo Checkpost',
      exitCheckpost: 'Melli Checkpost',
      vehicleNumber: 'SK 01 AB 1234',
      paymentStatus: 'PAID',
      amount: '0.00',
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

  private getLocationName(value?: string): string {
    if (!value) return 'Gangtok, Sikkim';
    const map: Record<string, string> = {
      gangtok: 'Gangtok, Sikkim',
      namchi: 'Namchi, Sikkim',
      gyalshing: 'Gyalshing, Sikkim',
      mangan: 'Mangan, Sikkim'
    };
    return map[value] || value;
  }

  private calculateTotal(products: any[], field: string): string {
    if (!products || products.length === 0) return '0.00';
    
    const total = products.reduce((sum, product) => {
      const value = parseFloat(product[field] || '0');
      const cases = parseInt(product.cases || '1');
      return sum + (value * cases);
    }, 0);
    
    return total.toFixed(2);
  }

  goBack(): void {
    window.close(); // Close the current tab/window
    // Fallback if window.close() doesn't work
    this.router.navigate(["/dev-officer-in-charge"]);
  }

  approveApplication(): void {
    if (!this.transitData) return;
    
    const confirmation = confirm(`Are you sure you want to approve application ${this.transitData.referenceNo}?`);
    if (confirmation) {
      this.transitData.status = 'APPROVED';
      this.transitData.reviewedBy = 'Officer Rajesh Kumar';
      this.transitData.reviewDate = new Date().toLocaleDateString('en-GB');
      
      alert(`Application ${this.transitData.referenceNo} has been approved successfully!`);
      
      // In a real application, you would make an API call here to update the status
      console.log('Application approved:', this.transitData.referenceNo);
    }
  }

  rejectApplication(): void {
    if (!this.transitData) return;
    
    const reason = prompt('Please enter the reason for rejection:');
    if (reason && reason.trim()) {
      this.transitData.status = 'TERMINATED';
      this.transitData.reviewedBy = 'Officer Rajesh Kumar';
      this.transitData.reviewDate = new Date().toLocaleDateString('en-GB');
      
      alert(`Application ${this.transitData.referenceNo} has been rejected.\nReason: ${reason}`);
      
      // In a real application, you would make an API call here to update the status
      console.log('Application rejected:', this.transitData.referenceNo, 'Reason:', reason);
    }
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
          .text-center { text-align: center; }
          .fw-bold { font-weight: bold; }
          .fs-5 { font-size: 0.8rem; line-height: 1.1; }
          .fs-3 { font-size: 1rem; margin-bottom: 0.25rem; line-height: 1.1; }
          .text-success { color: #28a745; }
          .border-success { border-color: #28a745; }
          .border-2 { border-width: 2px; }
          .row { display: flex; flex-wrap: wrap; margin: 0 -0.25rem; }
          .col-md-6 { flex: 0 0 50%; max-width: 50%; padding: 0 0.25rem; }
          .border { border: 1px solid #dee2e6; }
          .rounded { border-radius: 0.2rem; }
          .p-3 { padding: 0.5rem; }
          .h-100 { height: 100%; }
          .mb-4 { margin-bottom: 0.5rem; }
          .mb-2 { margin-bottom: 0.15rem; }
          .pb-2 { padding-bottom: 0.1rem; }
          .text-muted { color: #6c757d; font-size: 0.7rem; display: inline-block; width: 100px; }
          .badge { background-color: #28a745; color: white; padding: 0.15rem 0.3rem; border-radius: 0.25rem; font-size: 0.65rem; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
          .table td, .table th { padding: 0.25rem; font-size: 0.75rem; line-height: 1.1; border: 1px solid #dee2e6; vertical-align: middle; }
          .table-bordered { border: 1px solid #dee2e6; }
          .table-info th { background-color: #17a2b8; color: white; font-size: 0.65rem; padding: 0.2rem; line-height: 1; }
          .table-light td { background-color: #f8f9fa; font-size: 0.7rem; }
          .bg-light { background-color: #f8f9fa; }
          .fw-semibold { font-weight: 600; }
          .fw-normal { font-weight: normal; }
          .text-dark { color: #212529; }
          .text-primary { color: #007bff; }
          .bg-info { background-color: #17a2b8; }
          .text-white { color: white; }
          h5 { font-size: 0.9rem; margin-bottom: 0.25rem; line-height: 1.1; }
          p { margin-bottom: 0.15rem; font-size: 0.75rem; line-height: 1.2; }
          hr { margin: 0.25rem auto; }
          .table tfoot td { padding: 0.2rem; font-size: 0.7rem; }
          .print-only { display: block; }
          .status-stamp { display: inline-block; padding: 0.5rem 1rem; border: 2px solid; border-radius: 0.5rem; font-weight: bold; text-align: center; margin: 0.5rem 0; }
          .status-stamp.approved { border-color: #28a745; color: #28a745; background-color: rgba(40, 167, 69, 0.1); }
          .status-stamp.rejected { border-color: #dc3545; color: #dc3545; background-color: rgba(220, 53, 69, 0.1); }
          .status-stamp.pending { border-color: #ffc107; color: #856404; background-color: rgba(255, 193, 7, 0.1); }
          .stamp-text { font-size: 1rem; font-weight: bold; letter-spacing: 1px; }
          .reviewer-info, .review-date { font-size: 0.7rem; margin-top: 0.25rem; font-weight: normal; }
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