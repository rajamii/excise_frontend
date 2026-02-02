import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface RequisitionData {
  id: string;
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  brAmount: number;
  quantity?: number;
  numberOfPermits?: number;
  bulkSpiritType?: string;
  strengthTo?: string;
  liftedFrom?: string;
  viaRoute?: string;
  checkpostEntry?: string;
  purpose?: string;
}

@Component({
  selector: 'app-supply-chain-requisition-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-chain-requisition-view.component.html',
  styleUrls: ['./supply-chain-requisition-view.component.scss']
})
export class SupplyChainRequisitionViewComponent implements OnInit {
  requisitionData?: RequisitionData;
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
      // Check if ref is from route params or query params
      let ref = this.route.snapshot.paramMap.get('ref');
      if (!ref) {
        ref = this.route.snapshot.queryParamMap.get('ref');
      }
      
      if (ref) {
        this.loadRequisitionData(ref);
      } else {
        this.goBack();
      }
    }
  }

  private loadRequisitionData(refNo: string): void {
    // First check localStorage for requisition requests
    if (this.isBrowser) {
      const requisitionRequests = JSON.parse(localStorage.getItem('requisitionRequests') || '[]');
      const requisitionData = requisitionRequests.find((req: any) => req.refNo === refNo || req.referenceNo === refNo);
      
      if (requisitionData) {
        // Convert requisition data to the expected format
        this.requisitionData = {
          id: requisitionData.refNo || requisitionData.referenceNo,
          referenceNo: requisitionData.refNo || requisitionData.referenceNo,
          submissionDate: new Date(requisitionData.date || requisitionData.submissionDate),
          distilleryName: requisitionData.distilleryName || 'Unknown Distillery',
          status: requisitionData.status || 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
          brAmount: parseFloat(requisitionData.brAmount || requisitionData.amount || '0'),
          quantity: requisitionData.quantity,
          numberOfPermits: requisitionData.numberOfPermits,
          bulkSpiritType: requisitionData.bulkSpiritType,
          strengthTo: requisitionData.strengthTo,
          liftedFrom: requisitionData.liftedFrom,
          viaRoute: requisitionData.viaRoute,
          checkpostEntry: requisitionData.checkpostEntry,
          purpose: requisitionData.purpose
        };
        return;
      }
      
      // Fallback: check import permit requests for backward compatibility
      const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
      const importPermitData = importPermitRequests.find((permit: any) => permit.refNo === refNo);
      
      if (importPermitData) {
        // Convert import permit data to requisition format
        this.requisitionData = {
          id: importPermitData.refNo,
          referenceNo: importPermitData.refNo,
          submissionDate: new Date(importPermitData.date),
          distilleryName: this.getDistilleryName(importPermitData.liftedFrom),
          status: 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
          brAmount: 8.00,
          quantity: importPermitData.quantity,
          numberOfPermits: importPermitData.numberOfPermits,
          bulkSpiritType: importPermitData.bulkSpiritType,
          strengthTo: importPermitData.strengthTo,
          liftedFrom: importPermitData.liftedFrom,
          viaRoute: importPermitData.viaRoute,
          checkpostEntry: importPermitData.checkpostEntry,
          purpose: importPermitData.purpose
        };
        return;
      }
    }

    // Fallback to sample data if not found in localStorage
    const sampleData: RequisitionData[] = [
      {
        id: '1',
        referenceNo: 'BF502/EXCISE',
        submissionDate: new Date('2025-09-22'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
        brAmount: 8.00,
        quantity: 1000,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Siliguri Highway',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      },
      {
        id: '2',
        referenceNo: 'BF503/EXCISE',
        submissionDate: new Date('2025-09-21'),
        distilleryName: 'Himalayan Distilleries Pvt Ltd',
        status: 'APPLICATION UNDER REVIEW BY DEPARTMENT.',
        brAmount: 12.50,
        quantity: 1250,
        numberOfPermits: 1,
        bulkSpiritType: 'molasses-ena',
        strengthTo: '95.0',
        liftedFrom: 'mountain-spirits',
        viaRoute: 'NH 31A via Sevoke',
        checkpostEntry: 'melli',
        purpose: 'manufacturing'
      },
      {
        id: '3',
        referenceNo: 'BF504/EXCISE',
        submissionDate: new Date('2025-09-20'),
        distilleryName: 'Royal Sikkim Brewery',
        status: 'PERMIT APPROVED AND READY FOR COLLECTION.',
        brAmount: 15.75,
        quantity: 1575,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Rangpo Highway',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      },
      {
        id: '4',
        referenceNo: 'BF505/EXCISE',
        submissionDate: new Date('2025-09-19'),
        distilleryName: 'Mountain View Distilleries',
        status: 'DOCUMENTATION VERIFICATION IN PROGRESS.',
        brAmount: 9.25,
        quantity: 925,
        numberOfPermits: 1,
        bulkSpiritType: 'rectified-spirit',
        strengthTo: '95.5',
        liftedFrom: 'highland-breweries',
        viaRoute: 'Singtam - Rangpo Road',
        checkpostEntry: 'rangpo',
        purpose: 'blending'
      },
      {
        id: '5',
        referenceNo: 'BF506/EXCISE',
        submissionDate: new Date('2025-09-18'),
        distilleryName: 'Eastern Himalaya Distillery',
        status: 'PERMIT PROCESSING - AWAITING FINAL APPROVAL.',
        brAmount: 11.00,
        quantity: 1100,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'East Sikkim Highway',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      },
      {
        id: '6',
        referenceNo: 'BF507/EXCISE',
        submissionDate: new Date('2025-09-17'),
        distilleryName: 'Gangtok Premium Spirits',
        status: 'APPLICATION SUBMITTED - INITIAL REVIEW COMPLETED.',
        brAmount: 14.25,
        quantity: 1425,
        numberOfPermits: 1,
        bulkSpiritType: 'molasses-ena',
        strengthTo: '95.0',
        liftedFrom: 'mountain-spirits',
        viaRoute: 'Gangtok - Tadong - Ranipool',
        checkpostEntry: 'melli',
        purpose: 'manufacturing'
      },
      {
        id: '7',
        referenceNo: 'BF508/EXCISE',
        submissionDate: new Date('2025-09-16'),
        distilleryName: 'Khangchendzonga Breweries',
        status: 'PERMIT READY FOR DISPATCH TO LICENSEE.',
        brAmount: 13.50,
        quantity: 1350,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'North Sikkim Highway',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      },
      {
        id: '8',
        referenceNo: 'BF509/EXCISE',
        submissionDate: new Date('2025-09-15'),
        distilleryName: 'Teesta Valley Distilleries',
        status: 'TECHNICAL EVALUATION IN PROGRESS.',
        brAmount: 16.80,
        quantity: 1680,
        numberOfPermits: 1,
        bulkSpiritType: 'rectified-spirit',
        strengthTo: '95.5',
        liftedFrom: 'highland-breweries',
        viaRoute: 'Teesta Valley Road',
        checkpostEntry: 'melli',
        purpose: 'blending'
      },
      {
        id: '9',
        referenceNo: 'BF510/EXCISE',
        submissionDate: new Date('2025-09-14'),
        distilleryName: 'Rangit River Spirits',
        status: 'COMPLIANCE CHECK COMPLETED - AWAITING CLEARANCE.',
        brAmount: 10.75,
        quantity: 1075,
        numberOfPermits: 1,
        bulkSpiritType: 'molasses-ena',
        strengthTo: '95.0',
        liftedFrom: 'mountain-spirits',
        viaRoute: 'Rangit River Highway',
        checkpostEntry: 'melli',
        purpose: 'manufacturing'
      },
      {
        id: '10',
        referenceNo: 'BF511/EXCISE',
        submissionDate: new Date('2025-09-13'),
        distilleryName: 'Sikkim Highland Brewery',
        status: 'PERMIT APPROVED - COLLECTION NOTICE SENT.',
        brAmount: 18.90,
        quantity: 1890,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Highland Circuit Road',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      },
      {
        id: '11',
        referenceNo: 'BF512/EXCISE',
        submissionDate: new Date('2025-09-12'),
        distilleryName: 'Pelling Craft Distillery',
        status: 'APPLICATION UNDER DEPARTMENTAL REVIEW.',
        brAmount: 7.60,
        quantity: 760,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Pelling - Geyzing Highway',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      },
      {
        id: '12',
        referenceNo: 'BF513/EXCISE',
        submissionDate: new Date('2025-09-11'),
        distilleryName: 'Yuksom Traditional Spirits',
        status: 'PERMIT GENERATION IN FINAL STAGE.',
        brAmount: 20.25,
        quantity: 2025,
        numberOfPermits: 1,
        bulkSpiritType: 'rectified-spirit',
        strengthTo: '95.5',
        liftedFrom: 'highland-breweries',
        viaRoute: 'Yuksom - Geyzing Road',
        checkpostEntry: 'melli',
        purpose: 'blending'
      },
      {
        id: '13',
        referenceNo: 'BF514/EXCISE',
        submissionDate: new Date('2025-09-10'),
        distilleryName: 'Namchi Valley Breweries',
        status: 'DOCUMENTATION REVIEW COMPLETED - PROCESSING.',
        brAmount: 12.40,
        quantity: 1240,
        numberOfPermits: 1,
        bulkSpiritType: 'molasses-ena',
        strengthTo: '95.0',
        liftedFrom: 'mountain-spirits',
        viaRoute: 'Namchi - Ravangla Highway',
        checkpostEntry: 'melli',
        purpose: 'manufacturing'
      },
      {
        id: '14',
        referenceNo: 'BF515/EXCISE',
        submissionDate: new Date('2025-09-09'),
        distilleryName: 'Jorethang Premium Distillery',
        status: 'PERMIT ISSUED - READY FOR COLLECTION.',
        brAmount: 19.15,
        quantity: 1915,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Jorethang - Namchi Road',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      }
    ];

    const found = sampleData.find(r => r.referenceNo === refNo);
    if (found) {
      this.requisitionData = found;
    } else {
      this.router.navigate(['/dev-supply-chain']);
    }
  }

  goBack(): void {
    // Check source parameter first, then fall back to URL-based detection
    const source = this.route.snapshot.queryParamMap.get('source');
    const currentUrl = this.router.url;
    console.log('Going back from URL:', currentUrl, 'Source:', source); // Debug log
    
    // Priority 1: Check source query parameter
    if (source === 'commissioner-dashboard') {
      this.router.navigate(['/dev-commissioner-dashboard']);
      return;
    } else if (source === 'permit-section') {
      this.router.navigate(['/app-permit-section']);
      return;
    } else if (source === 'licensee-dashboard') {
      this.router.navigate(['/dev-supply-chain']);
      return;
    }
    
    // Priority 2: Check URL patterns for backward compatibility
    if (currentUrl.includes('/app-permit-section/')) {
      this.router.navigate(['/app-permit-section']);
    } else if (currentUrl.includes('commissioner')) {
      this.router.navigate(['/dev-commissioner-dashboard']);
    } else {
      // Default: go back to supply chain
      this.router.navigate(['/dev-supply-chain']);
    }
  }

  getBackButtonText(): string {
    // Check source parameter first, then fall back to URL-based detection
    const source = this.route.snapshot.queryParamMap.get('source');
    const currentUrl = this.router.url;
    console.log('Current URL:', currentUrl, 'Source:', source); // Debug log
    
    // Priority 1: Check source query parameter
    if (source === 'commissioner-dashboard') {
      return 'Back to Commissioner Dashboard';
    } else if (source === 'permit-section') {
      return 'Back to Permit Section';
    } else if (source === 'licensee-dashboard') {
      return 'Back to Supply Chain';
    }
    
    // Priority 2: Check URL patterns for backward compatibility
    if (currentUrl.includes('/app-permit-section/')) {
      return 'Back to Permit Section';
    } else if (currentUrl.includes('commissioner')) {
      return 'Back to Commissioner Dashboard';
    } else {
      return 'Back to Supply Chain';
    }
  }

  printApplication(): void {
    const printable = document.getElementById('requisitionPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.requisitionData?.referenceNo || '';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Requisition Application - ${ref}</title>
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
    if (status.includes('GENERATED') || status.includes('APPROVED') || status.includes('ISSUED') || status.includes('READY')) {
      return 'badge bg-success';
    } else if (status.includes('REVIEW') || status.includes('PROCESSING') || status.includes('PENDING') || status.includes('PROGRESS')) {
      return 'badge bg-warning';
    } else if (status.includes('INVALID') || status.includes('EXPIRED') || status.includes('REJECTED')) {
      return 'badge bg-danger';
    } else {
      return 'badge bg-info';
    }
  }
}
