import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface CancellationData {
  id: string;
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  brAmount: number;
  cancellationAmount?: number;
  originalPermitNo?: string;
  originalPermitDate?: Date;
  reasonForCancellation?: string;
  requestedBy?: string;
  authorizedBy?: string;
  cancellationDate?: Date;
  quantity?: number;
  numberOfPermits?: number;
  bulkSpiritType?: string;
  strengthTo?: string;
  liftedFrom?: string;
  viaRoute?: string;
  checkpostEntry?: string;
  purpose?: string;
  refundAmount?: number;
  refundStatus?: string;
}

@Component({
  selector: 'app-supply-chain-cancellation-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-chain-cancellation-view.component.html',
  styleUrls: ['./supply-chain-cancellation-view.component.scss']
})
export class SupplyChainCancellationViewComponent implements OnInit {
  cancellationData?: CancellationData;
  private isBrowser = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      // Check if ref is from route params (permit section) or query params (supply chain/commissioner)
      let ref = this.route.snapshot.paramMap.get('ref');
      if (!ref) {
        ref = this.route.snapshot.queryParamMap.get('ref');
      }
      
      if (ref) {
        this.loadCancellationData(ref);
      } else {
        this.goBack();
      }
    }
  }

  private loadCancellationData(refNo: string): void {
    const sampleData: CancellationData[] = [
      {
        id: '1',
        referenceNo: 'CAN/BF701',
        submissionDate: new Date('2025-09-15'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'CANCELLATION REQUEST APPROVED',
        brAmount: 8.00,
        cancellationAmount: 0.00,
        originalPermitNo: 'BF502/EXCISE',
        originalPermitDate: new Date('2025-08-15'),
        reasonForCancellation: 'Change in business requirements - no longer need the permit',
        requestedBy: 'Mr. Rajesh Kumar, Operations Manager',
        authorizedBy: 'Mrs. Priya Sharma, Director',
        cancellationDate: new Date('2025-09-15'),
        quantity: 1000,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Siliguri Highway',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing',
        refundAmount: 6.00,
        refundStatus: 'Processed'
      },
      {
        id: '2',
        referenceNo: 'CAN/BF702',
        submissionDate: new Date('2025-09-14'),
        distilleryName: 'Himalayan Distilleries Pvt Ltd',
        status: 'CANCELLATION UNDER REVIEW',
        brAmount: 12.50,
        cancellationAmount: 0.00,
        originalPermitNo: 'BF503/EXCISE',
        originalPermitDate: new Date('2025-08-20'),
        reasonForCancellation: 'Permit no longer required due to project cancellation',
        requestedBy: 'Mr. Amit Singh, General Manager',
        authorizedBy: 'Mr. Vikram Das, Managing Director',
        cancellationDate: new Date('2025-09-14'),
        quantity: 1250,
        numberOfPermits: 1,
        bulkSpiritType: 'molasses-ena',
        strengthTo: '95.0',
        liftedFrom: 'mountain-spirits',
        viaRoute: 'NH 31A via Sevoke',
        checkpostEntry: 'melli',
        purpose: 'manufacturing',
        refundAmount: 9.00,
        refundStatus: 'Pending'
      },
      // Permit Section Data
      {
        id: '3',
        referenceNo: 'CAN/001/2025',
        submissionDate: new Date('2025-09-08'),
        distilleryName: 'Mount Distilleries Ltd',
        status: 'CANCELLATION PENDING APPROVAL',
        brAmount: 25.0,
        cancellationAmount: 0.00,
        originalPermitNo: 'IBPS/003/2025',
        originalPermitDate: new Date('2025-08-08'),
        reasonForCancellation: 'Business plan changed - permit no longer needed',
        requestedBy: 'Mr. Suresh Thapa, Operations Head',
        authorizedBy: 'Mrs. Anjali Rai, CEO',
        cancellationDate: new Date('2025-09-08'),
        quantity: 800,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Siliguri Highway via NH-10',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing',
        refundAmount: 18.00,
        refundStatus: 'Pending'
      },
      // Commissioner Dashboard Data
      {
        id: '4',
        referenceNo: 'CAN/BF703',
        submissionDate: new Date('2025-09-13'),
        distilleryName: 'Royal Sikkim Brewery',
        status: 'PENDING COMMISSIONER REVIEW',
        brAmount: 15.00,
        cancellationAmount: 0.00,
        originalPermitNo: 'BF505/EXCISE',
        originalPermitDate: new Date('2025-08-13'),
        reasonForCancellation: 'Operational changes - permit cancellation requested',
        requestedBy: 'Mr. Deepak Sharma, Plant Manager',
        authorizedBy: 'Mr. Ramesh Gupta, Director',
        cancellationDate: new Date('2025-09-13'),
        quantity: 1500,
        numberOfPermits: 1,
        bulkSpiritType: 'rectified-spirit',
        strengthTo: '95.5',
        liftedFrom: 'highland-breweries',
        viaRoute: 'Singtam - Rangpo Road',
        checkpostEntry: 'rangpo',
        purpose: 'blending',
        refundAmount: 11.00,
        refundStatus: 'Pending'
      },
      {
        id: '5',
        referenceNo: 'CAN/BF704',
        submissionDate: new Date('2025-09-12'),
        distilleryName: 'Mountain View Distilleries',
        status: 'APPROVED BY COMMISSIONER',
        brAmount: 20.00,
        cancellationAmount: 0.00,
        originalPermitNo: 'BF506/EXCISE',
        originalPermitDate: new Date('2025-08-12'),
        reasonForCancellation: 'Strategic business decision - cancelling permit',
        requestedBy: 'Mrs. Sunita Rai, Operations Director',
        authorizedBy: 'Mr. Kiran Thapa, CEO',
        cancellationDate: new Date('2025-09-12'),
        quantity: 2000,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Rangpo Highway',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing',
        refundAmount: 15.00,
        refundStatus: 'Processed'
      }
    ];

    const found = sampleData.find(r => r.referenceNo === refNo);
    if (found) {
      this.cancellationData = found;
    } else {
      this.goBack();
    }
  }

  goBack(): void {
    // Check if we came from permit section, commissioner dashboard, or supply chain
    const currentUrl = this.router.url;
    console.log('Going back from URL:', currentUrl); // Debug log
    
    if (currentUrl.includes('/app-permit-section/')) {
      this.router.navigate(['/app-permit-section']);
    } else if (currentUrl.includes('dev-cancellation-letter-view')) {
      this.router.navigate(['/dev-commissioner-dashboard']);
    } else {
      this.router.navigate(['/dev-supply-chain']);
    }
  }

  getBackButtonText(): string {
    const currentUrl = this.router.url;
    console.log('Current URL:', currentUrl); // Debug log
    
    if (currentUrl.includes('/app-permit-section/')) {
      return 'Back to Permit Section';
    } else if (currentUrl.includes('dev-cancellation-letter-view')) {
      return 'Back to Commissioner Dashboard';
    } else {
      return 'Back to Supply Chain';
    }
  }

  printApplication(): void {
    if (!this.isBrowser) {
      console.warn('Print functionality not available in server-side rendering');
      return;
    }

    const printSection = document.getElementById('cancellationPrintSection');
    if (!printSection) {
      console.error('Print section not found');
      alert('Print section not found. Please try again.');
      return;
    }

    const printable = printSection.innerHTML;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');

    const win = window.open('', '_blank', 'width=1200,height=1400,scrollbars=yes,resizable=yes');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site to enable printing.');
      return;
    }

    const ref = this.cancellationData?.referenceNo || 'Unknown';
    
    win.document.open();
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Cancellation Application - ${ref}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${styles}
          <style>
            @page { 
              size: A4; 
              margin: 8mm; 
            }
            * {
              box-sizing: border-box;
            }
            html, body { 
              background: #fff !important; 
              font-family: Arial, sans-serif;
              line-height: 1.1;
              color: #000 !important;
              margin: 0;
              padding: 0;
              width: 100%;
              height: auto;
              overflow-x: hidden;
              font-size: 11px !important;
            }
            .no-print { 
              display: none !important; 
            }
            .printable-content { 
              width: 100% !important;
              max-width: none !important;
              padding: 5px;
            }
            .card {
              border: 1px solid #000 !important;
              box-shadow: none !important;
              margin: 0 !important;
              width: 100% !important;
            }
            .application-header {
              background: white !important;
              border-bottom: 2px solid #000 !important;
              padding: 8px !important;
              text-align: center;
            }
            .application-header img {
              height: 35px !important;
              width: auto !important;
            }
            .application-header span {
              font-size: 12px !important;
              font-weight: bold !important;
            }
            .application-header .fs-4 {
              font-size: 14px !important;
              font-weight: bold !important;
              margin-top: 3px !important;
            }
            .text-danger {
              color: #000 !important;
              font-weight: bold !important;
            }
            .summary-card {
              background: #f5f5f5 !important;
              color: #000 !important;
              border: 1px solid #000 !important;
              margin: 5px 0 !important;
              padding: 8px !important;
            }
            .info-card {
              background: #f9f9f9 !important;
              border-left: 3px solid #000 !important;
              margin: 5px 0 !important;
              padding: 8px !important;
            }
            .section-card {
              border: 1px solid #000 !important;
              margin: 5px 0 !important;
              padding: 8px !important;
            }
            .section-title {
              color: #000 !important;
              border-bottom: 1px solid #000 !important;
              font-weight: bold !important;
              margin-bottom: 5px !important;
              padding-bottom: 2px !important;
              font-size: 12px !important;
            }
            .summary-box {
              border: 1px solid #000 !important;
              padding: 8px !important;
              margin: 5px 0 !important;
              text-align: center;
            }
            .table {
              border-collapse: collapse !important;
              width: 100% !important;
              margin: 5px 0 !important;
              font-size: 10px !important;
            }
            .table td, .table th {
              border: 1px solid #000 !important;
              padding: 4px !important;
              text-align: left !important;
              line-height: 1.1 !important;
            }
            .table th {
              background: #f0f0f0 !important;
              font-weight: bold !important;
            }
            .row {
              display: flex !important;
              flex-wrap: wrap !important;
              margin: 0 !important;
            }
            .col-md-6, .col-md-3 {
              flex: 1 !important;
              padding: 3px !important;
              min-width: 150px !important;
            }
            .d-flex {
              display: flex !important;
            }
            .justify-content-between {
              justify-content: space-between !important;
            }
            .text-center {
              text-align: center !important;
            }
            .fw-bold, .fw-semibold {
              font-weight: bold !important;
            }
            .mb-2, .mb-3, .mb-4 {
              margin-bottom: 5px !important;
            }
            .mt-2, .mt-3, .mt-4 {
              margin-top: 5px !important;
            }
            .p-4 {
              padding: 8px !important;
            }
            .badge {
              background: #f0f0f0 !important;
              color: #000 !important;
              border: 1px solid #000 !important;
              padding: 2px 5px !important;
              border-radius: 2px !important;
              font-size: 9px !important;
            }
            .summary-item {
              margin: 3px 0 !important;
            }
            .summary-value {
              font-size: 11px !important;
              font-weight: bold !important;
            }
            .summary-label {
              font-size: 9px !important;
              color: #666 !important;
            }
            h6 {
              font-size: 11px !important;
              margin: 3px 0 !important;
            }
            p {
              margin: 2px 0 !important;
              font-size: 10px !important;
            }
            strong {
              font-weight: bold !important;
            }
            /* Compact layout for single page */
            .application-content {
              padding: 5px !important;
            }
            .info-card h6 {
              margin-bottom: 3px !important;
            }
            .info-card p {
              margin-bottom: 2px !important;
            }
            /* Ensure content fits on one page */
            .application-content > * {
              page-break-inside: avoid;
            }
            /* Reduce spacing between sections */
            .section-card + .section-card {
              margin-top: 3px !important;
            }
          </style>
        </head>
        <body>
          <div class="printable-content">
            ${printable}
          </div>
        </body>
      </html>`);
    win.document.close();

    // Wait for content to load before printing
    setTimeout(() => {
      win.focus();
      win.print();
      // Don't auto-close to allow user to see the print preview
    }, 1000);
  }



  getDistilleryName(code: string): string {
    const distilleryMap: { [key: string]: string } = {
      'sikkim-distilleries': 'Sikkim Distilleries Ltd',
      'mountain-spirits': 'Mountain Spirits Pvt Ltd',
      'highland-breweries': 'Highland Breweries'
    };
    return distilleryMap[code] || code;
  }

  getBulkSpiritTypeName(code: string): string {
    const typeMap: { [key: string]: string } = {
      'grain-ena': 'Grain ENA',
      'molasses-ena': 'Molasses ENA',
      'rectified-spirit': 'Rectified Spirit'
    };
    return typeMap[code] || code;
  }

  getPurposeName(code: string): string {
    const purposeMap: { [key: string]: string } = {
      'manufacturing': 'Manufacturing',
      'blending': 'Blending',
      'bottling': 'Bottling'
    };
    return purposeMap[code] || code;
  }

  getCheckpostName(code: string): string {
    const checkpostMap: { [key: string]: string } = {
      'rangpo': 'Rangpo Checkpost',
      'melli': 'Melli Checkpost',
      'nathu-la': 'Nathu La Checkpost'
    };
    return checkpostMap[code] || code;
  }

  getStatusBadgeClass(status: string): string {
    if (status.includes('APPROVED')) {
      return 'badge bg-success';
    } else if (status.includes('REVIEW') || status.includes('PENDING')) {
      return 'badge bg-warning';
    } else if (status.includes('REJECTED') || status.includes('CANCELLED')) {
      return 'badge bg-danger';
    } else {
      return 'badge bg-info';
    }
  }

  getRefundStatusBadgeClass(status: string): string {
    if (status === 'Processed') {
      return 'badge bg-success';
    } else if (status === 'Pending') {
      return 'badge bg-warning';
    } else if (status === 'Rejected') {
      return 'badge bg-danger';
    } else {
      return 'badge bg-info';
    }
  }
}
