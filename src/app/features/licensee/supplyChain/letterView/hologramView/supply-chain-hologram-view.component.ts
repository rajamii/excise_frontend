import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface HologramFormData {
  refNo: string;
  date: string;
  companyName: string;
  localQtyLakh: number | null;
  exportQtyLakh: number | null;
  defenceQtyLakh: number | null;
}

@Component({
  selector: 'app-supply-chain-hologram-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-chain-hologram-view.component.html',
  styleUrls: ['./supply-chain-hologram-view.component.scss']
})
export class SupplyChainHologramViewComponent implements OnInit {
  submittedData?: HologramFormData;
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
        const list: HologramFormData[] = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
        let found = list.find(r => r.refNo === ref);

        if (!found) {
          // If not found in localStorage, create sample data for demonstration
          found = this.createSampleHologramData(ref);
        }

        this.submittedData = found;
      } else {
        // If no ref provided, redirect back to supply chain dashboard
        this.router.navigate(['/dev-supply-chain']);
      }
    }
  }

  private createSampleHologramData(refNo: string): HologramFormData {
    // Create sample data for demonstration purposes
    const sampleData: { [key: string]: HologramFormData } = {
      'YB/1/BREW/24': {
        refNo: 'YB/1/BREW/24',
        date: '2025-01-13',
        companyName: 'Yuksom Breweries Ltd.',
        localQtyLakh: 15,
        exportQtyLakh: 0,
        defenceQtyLakh: 0
      },
      'YB/2/BREW/24': {
        refNo: 'YB/2/BREW/24',
        date: '2025-01-13',
        companyName: 'Yuksom Breweries Ltd.',
        localQtyLakh: 10,
        exportQtyLakh: 2,
        defenceQtyLakh: 0
      }
    };

    return sampleData[refNo] || {
      refNo: refNo,
      date: new Date().toISOString().split('T')[0],
      companyName: 'Sikkim Distilleries Ltd',
      localQtyLakh: 25,
      exportQtyLakh: 5,
      defenceQtyLakh: 2
    };
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  getTotalQuantity(): number {
    if (!this.submittedData) return 0;
    return (this.submittedData.localQtyLakh || 0) +
           (this.submittedData.exportQtyLakh || 0) +
           (this.submittedData.defenceQtyLakh || 0);
  }

  printLetter(): void {
    const printable = document.getElementById('hologramPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.submittedData?.refNo || '';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Hologram Requisition - ${ref}</title>
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
