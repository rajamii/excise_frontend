import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface ApplicationData {
  id: string;
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  brAmount: number;
  applicationType: string;
  quantity?: number;
  numberOfPermits?: number;
  bulkSpiritType?: string;
  strengthTo?: string;
  liftedFrom?: string;
  viaRoute?: string;
  checkpostEntry?: string;
  purpose?: string;
  // Revalidation specific fields
  revalidationAmount?: number;
  originalPermitNo?: string;
  originalPermitDate?: Date;
  expiryDate?: Date;
  reasonForRevalidation?: string;
  newQuantity?: number;
  newPurpose?: string;
  // Cancellation specific fields
  cancellationAmount?: number;
  reasonForCancellation?: string;
  requestedBy?: string;
  authorizedBy?: string;
  cancellationDate?: Date;
  // Transit specific fields
  permitType?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverLicense?: string;
  fromLocation?: string;
  toLocation?: string;
  goodsDescription?: string;
  unit?: string;
  routeDetails?: string;
  checkpostExit?: string;
  validityPeriod?: number;
  issuedBy?: string;
  issuedDate?: Date;
}

@Component({
  selector: 'app-supply-chain-application-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-chain-application-view.component.html',
  styleUrls: ['./supply-chain-application-view.component.scss']
})
export class SupplyChainApplicationViewComponent implements OnInit {
  applicationData?: ApplicationData;
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
      const ref = this.route.snapshot.queryParamMap.get('ref');
      if (ref) {
        this.loadApplicationData(ref);
      } else {
        this.router.navigate(['/dev-supply-chain']);
      }
    }
  }

  private loadApplicationData(refNo: string): void {
    const sampleData: ApplicationData[] = [
      // Requisition Applications
      {
        id: '1',
        referenceNo: 'BF502/EXCISE',
        submissionDate: new Date('2025-09-22'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
        brAmount: 8.00,
        applicationType: 'requisition',
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
        applicationType: 'requisition',
        quantity: 1250,
        numberOfPermits: 1,
        bulkSpiritType: 'molasses-ena',
        strengthTo: '95.0',
        liftedFrom: 'mountain-spirits',
        viaRoute: 'NH 31A via Sevoke',
        checkpostEntry: 'melli',
        purpose: 'manufacturing'
      },
      // Revalidation Applications
      {
        id: '3',
        referenceNo: 'IMP/SUP-AGDIST',
        submissionDate: new Date('2025-09-22'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'IMPORT PERMIT EXTENDS 45 DAYS - INVALID',
        brAmount: 0.00,
        applicationType: 'revalidation',
        revalidationAmount: 5.00,
        originalPermitNo: 'BF502/EXCISE',
        originalPermitDate: new Date('2025-08-22'),
        expiryDate: new Date('2025-10-06'),
        reasonForRevalidation: 'Permit expired - requires immediate revalidation',
        newQuantity: 1000,
        newPurpose: 'Manufacturing extension'
      },
      {
        id: '4',
        referenceNo: 'REV/BF601',
        submissionDate: new Date('2025-09-18'),
        distilleryName: 'Himalayan Distilleries Pvt Ltd',
        status: 'REVALIDATION REQUEST PENDING APPROVAL',
        brAmount: 5.00,
        applicationType: 'revalidation',
        revalidationAmount: 5.00,
        originalPermitNo: 'BF503/EXCISE',
        originalPermitDate: new Date('2025-08-18'),
        expiryDate: new Date('2025-10-18'),
        reasonForRevalidation: 'Extension of validity period due to operational delays',
        newQuantity: 1250,
        newPurpose: 'Manufacturing continuation'
      },
      // Cancellation Applications
      {
        id: '5',
        referenceNo: 'CAN/BF701',
        submissionDate: new Date('2025-09-15'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'CANCELLATION REQUEST APPROVED',
        brAmount: 0.00,
        applicationType: 'cancellation',
        cancellationAmount: 0.00,
        originalPermitNo: 'BF502/EXCISE',
        originalPermitDate: new Date('2025-08-15'),
        reasonForCancellation: 'Change in business requirements - no longer need the permit',
        requestedBy: 'Mr. Rajesh Kumar, Operations Manager',
        authorizedBy: 'Mrs. Priya Sharma, Director',
        cancellationDate: new Date('2025-09-15')
      },
      {
        id: '6',
        referenceNo: 'CAN/BF702',
        submissionDate: new Date('2025-09-14'),
        distilleryName: 'Himalayan Distilleries Pvt Ltd',
        status: 'CANCELLATION UNDER REVIEW',
        brAmount: 0.00,
        applicationType: 'cancellation',
        cancellationAmount: 0.00,
        originalPermitNo: 'BF503/EXCISE',
        originalPermitDate: new Date('2025-08-20'),
        reasonForCancellation: 'Permit no longer required due to project cancellation',
        requestedBy: 'Mr. Amit Singh, General Manager',
        authorizedBy: 'Mr. Vikram Das, Managing Director',
        cancellationDate: new Date('2025-09-14')
      },
      // Transit Applications
      {
        id: '7',
        referenceNo: 'TRN/BF801',
        submissionDate: new Date('2025-09-13'),
        distilleryName: 'Royal Sikkim Brewery',
        status: 'TRANSIT PERMIT ISSUED',
        brAmount: 10.00,
        applicationType: 'transit',
        permitType: 'Alcohol Transit Permit',
        vehicleNumber: 'SK-01-AB-1234',
        driverName: 'Rajesh Kumar',
        driverLicense: 'DL-1234567890',
        fromLocation: 'Gangtok, Sikkim',
        toLocation: 'Siliguri, West Bengal',
        goodsDescription: 'Grain ENA (96.0% strength)',
        quantity: 1000,
        unit: 'BL',
        routeDetails: 'Gangtok - Siliguri Highway via Rangpo',
        checkpostEntry: 'Rangpo Checkpost',
        checkpostExit: 'Melli Checkpost',
        validityPeriod: 7,
        issuedBy: 'Excise Officer',
        issuedDate: new Date('2025-09-13')
      },
      {
        id: '8',
        referenceNo: 'TRN/BF802',
        submissionDate: new Date('2025-09-12'),
        distilleryName: 'Mountain View Distilleries',
        status: 'TRANSIT APPLICATION PROCESSING',
        brAmount: 8.50,
        applicationType: 'transit',
        permitType: 'Alcohol Transit Permit',
        vehicleNumber: 'SK-02-CD-5678',
        driverName: 'Amit Singh',
        driverLicense: 'DL-9876543210',
        fromLocation: 'Namchi, Sikkim',
        toLocation: 'Darjeeling, West Bengal',
        goodsDescription: 'Molasses ENA (95.0% strength)',
        quantity: 850,
        unit: 'BL',
        routeDetails: 'Namchi - Darjeeling via Melli',
        checkpostEntry: 'Melli Checkpost',
        checkpostExit: 'Kurseong Checkpost',
        validityPeriod: 10,
        issuedBy: 'Senior Excise Officer',
        issuedDate: new Date('2025-09-12')
      }
    ];

    const found = sampleData.find(r => r.referenceNo === refNo);
    if (found) {
      this.applicationData = found;
    } else {
      this.router.navigate(['/dev-supply-chain']);
    }
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  printApplication(): void {
    const printable = document.getElementById('applicationPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.applicationData?.referenceNo || '';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Application - ${ref}</title>
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
    if (status.includes('GENERATED') || status.includes('APPROVED') || status.includes('ISSUED')) {
      return 'badge bg-success';
    } else if (status.includes('REVIEW') || status.includes('PROCESSING') || status.includes('PENDING')) {
      return 'badge bg-warning';
    } else if (status.includes('INVALID') || status.includes('EXPIRED')) {
      return 'badge bg-danger';
    } else {
      return 'badge bg-info';
    }
  }

  getApplicationTypeTitle(): string {
    if (!this.applicationData) return '';

    switch (this.applicationData.applicationType) {
      case 'requisition':
        return 'ENA Import Permit Requisition';
      case 'revalidation':
        return 'Permit Revalidation Application';
      case 'cancellation':
        return 'Permit Cancellation Application';
      case 'transit':
        return 'Transit Permit Application';
      default:
        return 'Application Details';
    }
  }
}
