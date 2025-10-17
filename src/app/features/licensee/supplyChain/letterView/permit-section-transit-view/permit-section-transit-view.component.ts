import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface PermitSectionTransitData {
  referenceNo: string;           // Bill No
  issuedDate: Date;              // Date
  soleDistributor: string;       // Sole distributor name
  distilleryName: string;        // Unit name
  unitLocation: string;          // Location like Rangpo (Sikkim)
}

@Component({
  selector: 'app-permit-section-transit-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './permit-section-transit-view.component.html',
  styleUrl: './permit-section-transit-view.component.scss'
})
export class PermitSectionTransitViewComponent implements OnInit {
  transitData?: PermitSectionTransitData;
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
    // Mock until API is connected
    const sample: PermitSectionTransitData[] = [
      {
        referenceNo: 'TRP/2/EXCISE',
        issuedDate: new Date(),
        soleDistributor: 'Karma Chopel Bhutia',
        distilleryName: 'Sikkim Distilleries Ltd',
        unitLocation: 'Rangpo (Sikkim)'
      }
    ];

    this.transitData = sample.find(r => r.referenceNo === refNo) || {
      referenceNo: refNo,
      issuedDate: new Date(),
      soleDistributor: '—',
      distilleryName: '—',
      unitLocation: '—'
    };
  }

  goBack(): void {
    this.router.navigate(['/app-permit-section']);
  }

  printLetter(): void {
    const printable = document.getElementById('permitSectionTransitPrint')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.transitData?.referenceNo || '';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Transit Permit Application - ${ref}</title>
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
}


