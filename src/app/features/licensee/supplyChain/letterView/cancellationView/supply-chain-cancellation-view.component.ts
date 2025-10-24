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
      const ref = this.route.snapshot.queryParamMap.get('ref');
      if (ref) {
        this.loadCancellationData(ref);
      } else {
        this.router.navigate(['/dev-supply-chain']);
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
      }
    ];

    const found = sampleData.find(r => r.referenceNo === refNo);
    if (found) {
      this.cancellationData = found;
    } else {
      this.router.navigate(['/dev-supply-chain']);
    }
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  printApplication(): void {
    const printable = document.getElementById('cancellationPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.cancellationData?.referenceNo || '';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Cancellation Application - ${ref}</title>
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
