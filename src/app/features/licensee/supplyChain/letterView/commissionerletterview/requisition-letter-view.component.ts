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
  selector: 'app-requisition-letter-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './requisition-letter-view.component.html',
  styleUrls: ['./requisition-letter-view.component.scss']
})
export class RequisitionLetterViewComponent implements OnInit {
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
      const ref = this.route.snapshot.queryParamMap.get('ref');
      if (ref) {
        // For now, we'll use sample data. In a real app, this would come from an API
        this.loadRequisitionData(ref);
      } else {
        // If no ref provided, redirect back to commissioner dashboard
        this.router.navigate(['/dev-commissioner-dashboard']);
      }
    }
  }

  private loadRequisitionData(refNo: string): void {
    // Sample data - in a real application, this would be fetched from an API
    const sampleData: RequisitionData[] = [
      {
        id: '1',
        referenceNo: 'IBPS/02/EXCISE',
        submissionDate: new Date('2025-09-22'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'IMPORT PERMIT GENERATED',
        brAmount: 8.00,
        quantity: 1000,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '95.5',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Siliguri Highway',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      },
      {
        id: '2',
        referenceNo: 'IBPS/06/EXCISE',
        submissionDate: new Date('2025-09-15'),
        distilleryName: 'Mount Distilleries Ltd',
        status: 'IMPORT PERMIT GENERATED',
        brAmount: 120.00,
        quantity: 15000,
        numberOfPermits: 3,
        bulkSpiritType: 'molasses-ena',
        strengthTo: '96.0',
        liftedFrom: 'mountain-spirits',
        viaRoute: 'National Highway 10',
        checkpostEntry: 'melli',
        purpose: 'blending'
      }
    ];

    const found = sampleData.find(r => r.referenceNo === refNo);
    if (found) {
      this.requisitionData = found;
    } else {
      // If not found, redirect back to commissioner dashboard
      this.router.navigate(['/dev-commissioner-dashboard']);
    }
  }

  goBack(): void {
    this.router.navigate(['/dev-commissioner-dashboard']);
  }

  printLetter(): void {
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
          <title>Import Permit Requisition - ${ref}</title>
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
      'mount-distilleries': 'Mount Distilleries Ltd',
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
}
