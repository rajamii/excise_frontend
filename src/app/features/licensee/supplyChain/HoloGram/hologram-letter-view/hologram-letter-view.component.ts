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
  selector: 'app-hologram-letter-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hologram-letter-view.component.html',
  styleUrls: ['./hologram-letter-view.component.scss']
})
export class HologramLetterViewComponent implements OnInit {
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
        const found = list.find(r => r.refNo === ref);
        if (found) {
          this.submittedData = found;
        } else {
          // If not found, redirect back to commissioner dashboard
          this.router.navigate(['/dev-commissioner-dashboard']);
        }
      } else {
        // If no ref provided, redirect back to commissioner dashboard
        this.router.navigate(['/dev-commissioner-dashboard']);
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/dev-commissioner-dashboard']);
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
