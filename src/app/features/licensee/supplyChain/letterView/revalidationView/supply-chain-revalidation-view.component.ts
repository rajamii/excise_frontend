import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface RevalidationData {
  id: string;
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  brAmount: number;
  revalidationAmount?: number;
  originalPermitNo?: string;
  originalPermitDate?: Date;
  expiryDate?: Date;
  reasonForRevalidation?: string;
  newQuantity?: number;
  newPurpose?: string;
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
  selector: 'app-supply-chain-revalidation-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-chain-revalidation-view.component.html',
  styleUrls: ['./supply-chain-revalidation-view.component.scss']
})
export class SupplyChainRevalidationViewComponent implements OnInit {
  revalidationData?: RevalidationData;
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
        this.loadRevalidationData(ref);
      } else {
        this.router.navigate(['/dev-supply-chain']);
      }
    }
  }

  private loadRevalidationData(refNo: string): void {
    const sampleData: RevalidationData[] = [
      {
        id: '1',
        referenceNo: 'IMP/SUP-AGDIST',
        submissionDate: new Date('2025-09-22'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'IMPORT PERMIT EXTENDS 45 DAYS - INVALID',
        brAmount: 0.00,
        revalidationAmount: 5.00,
        originalPermitNo: 'BF502/EXCISE',
        originalPermitDate: new Date('2025-08-22'),
        expiryDate: new Date('2025-10-06'),
        reasonForRevalidation: 'Permit expired - requires immediate revalidation',
        newQuantity: 1000,
        newPurpose: 'Manufacturing extension',
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
        referenceNo: 'REV/BF601',
        submissionDate: new Date('2025-09-18'),
        distilleryName: 'Himalayan Distilleries Pvt Ltd',
        status: 'REVALIDATION REQUEST PENDING APPROVAL',
        brAmount: 5.00,
        revalidationAmount: 5.00,
        originalPermitNo: 'BF503/EXCISE',
        originalPermitDate: new Date('2025-08-18'),
        expiryDate: new Date('2025-10-18'),
        reasonForRevalidation: 'Extension of validity period due to operational delays',
        newQuantity: 1250,
        newPurpose: 'Manufacturing continuation',
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
        referenceNo: 'REV/BF602',
        submissionDate: new Date('2025-09-17'),
        distilleryName: 'Royal Sikkim Brewery',
        status: 'PERMIT EXPIRED - REQUIRES IMMEDIATE REVALIDATION',
        brAmount: 7.50,
        revalidationAmount: 7.50,
        originalPermitNo: 'BF504/EXCISE',
        originalPermitDate: new Date('2025-08-17'),
        expiryDate: new Date('2025-10-02'),
        reasonForRevalidation: 'Permit expired - production schedule delays',
        newQuantity: 1575,
        newPurpose: 'Manufacturing with extended timeline',
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
        referenceNo: 'REV/BF603',
        submissionDate: new Date('2025-09-16'),
        distilleryName: 'Mountain View Distilleries',
        status: 'REVALIDATION APPROVED - PERMIT EXTENDED',
        brAmount: 6.25,
        revalidationAmount: 6.25,
        originalPermitNo: 'BF505/EXCISE',
        originalPermitDate: new Date('2025-08-16'),
        expiryDate: new Date('2025-11-16'),
        reasonForRevalidation: 'Change in production capacity requirements',
        newQuantity: 925,
        newPurpose: 'Modified blending process',
        quantity: 925,
        numberOfPermits: 1,
        bulkSpiritType: 'rectified-spirit',
        strengthTo: '95.5',
        liftedFrom: 'highland-breweries',
        viaRoute: 'Singtam - Rangpo Road',
        checkpostEntry: 'rangpo',
        purpose: 'blending'
      }
    ];

    const found = sampleData.find(r => r.referenceNo === refNo);
    if (found) {
      this.revalidationData = found;
    } else {
      this.router.navigate(['/dev-supply-chain']);
    }
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  printApplication(): void {
    const printable = document.getElementById('revalidationPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.revalidationData?.referenceNo || '';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Revalidation Application - ${ref}</title>
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
    if (status.includes('APPROVED') || status.includes('EXTENDED')) {
      return 'badge bg-success';
    } else if (status.includes('PENDING') || status.includes('REQUEST')) {
      return 'badge bg-warning';
    } else if (status.includes('INVALID') || status.includes('EXPIRED')) {
      return 'badge bg-danger';
    } else {
      return 'badge bg-info';
    }
  }
}
