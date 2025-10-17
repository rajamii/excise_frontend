import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface PermitSectionRequisitionData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  quantity?: number; // per permit BL
  numberOfPermits?: number;
  bulkSpiritType?: string; // e.g., grain-ena
  strengthFrom?: string; // optional from-degree
  strengthTo?: string;   // to-degree
  liftedFrom?: string;   // code
  viaRoute?: string;
}

@Component({
  selector: 'app-permit-section-requisition-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './permit-section-requisition-view.component.html',
  styleUrls: ['./permit-section-requisition-view.component.scss']
})
export class PermitSectionRequisitionViewComponent implements OnInit {
  requisitionData?: PermitSectionRequisitionData;
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
        this.loadData(ref);
      } else {
        this.router.navigate(['/app-permit-section']);
      }
    }
  }

  private loadData(refNo: string): void {
    // Sample/mock data until API is connected
    const sample: PermitSectionRequisitionData[] = [
      {
        referenceNo: 'IBPS/02/EXCISE',
        submissionDate: new Date(),
        distilleryName: 'Sikkim Distilleries Ltd',
        quantity: 1000,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthFrom: '0',
        strengthTo: '0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Siliguri Highway'
      }
    ];

    const found = sample.find(r => r.referenceNo === refNo);
    this.requisitionData = found || {
      referenceNo: refNo,
      submissionDate: new Date(),
      distilleryName: '—',
      quantity: 0,
      numberOfPermits: 0,
      bulkSpiritType: 'grain-ena',
      strengthFrom: '0',
      strengthTo: '0',
      liftedFrom: '',
      viaRoute: ''
    };
  }

  goBack(): void {
    this.router.navigate(['/app-permit-section']);
  }

  printLetter(): void {
    const printable = document.getElementById('permitSectionRequisitionPrint')?.innerHTML || '';
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
          <title>Requisition Letter - ${ref}</title>
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

  getBulkSpiritTypeName(code: string): string {
    const typeMap: { [key: string]: string } = {
      'grain-ena': 'Grain ENA',
      'molasses-ena': 'Molasses ENA',
      'rectified-spirit': 'Rectified Spirit'
    };
    return typeMap[code] || code;
  }
}
