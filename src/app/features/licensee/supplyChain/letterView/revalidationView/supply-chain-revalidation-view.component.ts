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
      // Check if ref is from route params (permit section) or query params (supply chain)
      let ref = this.route.snapshot.paramMap.get('ref');
      if (!ref) {
        ref = this.route.snapshot.queryParamMap.get('ref');
      }
      
      if (ref) {
        this.loadRevalidationData(ref);
      } else {
        this.goBack();
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
      },
      // Permit Section Data
      {
        id: '5',
        referenceNo: 'REV/001/2025',
        submissionDate: new Date('2025-09-10'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'REVALIDATION APPROVED BY COMMISSIONER',
        brAmount: 0.00,
        revalidationAmount: 50.00,
        originalPermitNo: 'IBPS/001/2025',
        originalPermitDate: new Date('2025-06-15'),
        expiryDate: new Date('2025-09-15'),
        reasonForRevalidation: 'Delay in transportation due to road conditions',
        newQuantity: 1000,
        newPurpose: 'Manufacturing - Extended Period',
        quantity: 1000,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Siliguri Highway via NH-10',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      },
      // Commissioner Dashboard Data
      {
        id: '6',
        referenceNo: 'REV/BF601',
        submissionDate: new Date('2025-09-18'),
        distilleryName: 'Himalayan Distilleries Pvt Ltd',
        status: 'PENDING REVIEW',
        brAmount: 50.0,
        revalidationAmount: 5.0,
        originalPermitNo: 'BF501/EXCISE',
        originalPermitDate: new Date('2025-08-18'),
        expiryDate: new Date('2025-09-25'),
        reasonForRevalidation: 'Extension of validity period due to urgent requirements',
        newQuantity: 1500,
        newPurpose: 'Extended manufacturing for export orders',
        quantity: 1500,
        numberOfPermits: 1,
        bulkSpiritType: 'molasses-ena',
        strengthTo: '95.0',
        liftedFrom: 'mountain-spirits',
        viaRoute: 'NH 31A via Sevoke',
        checkpostEntry: 'melli',
        purpose: 'manufacturing'
      },
      {
        id: '7',
        referenceNo: 'REV/BF604',
        submissionDate: new Date('2025-09-15'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'PENDING REVIEW',
        brAmount: 55.0,
        revalidationAmount: 8.0,
        originalPermitNo: 'BF504/EXCISE',
        originalPermitDate: new Date('2025-08-15'),
        expiryDate: new Date('2025-09-28'),
        reasonForRevalidation: 'Change in production requirements',
        newQuantity: 2200,
        newPurpose: 'Modified blending process for premium products',
        quantity: 2200,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Rangpo Highway',
        checkpostEntry: 'rangpo',
        purpose: 'blending'
      },
      {
        id: '8',
        referenceNo: 'REV/002/2025',
        submissionDate: new Date('2025-09-12'),
        distilleryName: 'Mount Distilleries Ltd',
        status: 'ApprovedRevalidationByCommissioner',
        brAmount: 60.0,
        revalidationAmount: 30.0,
        originalPermitNo: 'IBPS/06/EXCISE',
        originalPermitDate: new Date('2025-08-20'),
        expiryDate: new Date('2025-11-20'),
        reasonForRevalidation: 'Change in quantity requirements',
        newQuantity: 18000,
        newPurpose: 'Modified blending',
        quantity: 18000,
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
      this.goBack();
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
