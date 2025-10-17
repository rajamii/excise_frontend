import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface PermitSectionCancellationData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  originalPermitNo: string;
  originalPermitDate: Date;
  reasonForCancellation: string;
  cancellationAmount?: number;
  cancellationBRFilePath?: string;
  status?: string;
}

@Component({
  selector: 'app-permit-section-cancellation-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './permit-section-cancellation-view.component.html',
  styleUrl: './permit-section-cancellation-view.component.scss'
})
export class PermitSectionCancellationViewComponent implements OnInit {
  cancellationData?: PermitSectionCancellationData;
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
    const sample: PermitSectionCancellationData[] = [
      {
        referenceNo: 'CAN/001/2025',
        submissionDate: new Date('2025-09-08'),
        distilleryName: 'Mount Distilleries Ltd',
        originalPermitNo: 'IP/2025/010',
        originalPermitDate: new Date('2025-08-20'),
        reasonForCancellation: 'Operational changes; shipment not required.',
        cancellationAmount: 2500,
        status: 'PENDING'
      }
    ];

    const found = sample.find(r => r.referenceNo === refNo);
    this.cancellationData = found || {
      referenceNo: refNo,
      submissionDate: new Date(),
      distilleryName: '—',
      originalPermitNo: '—',
      originalPermitDate: new Date(),
      reasonForCancellation: '—'
    };
  }

  goBack(): void {
    this.router.navigate(['/app-permit-section']);
  }

  printLetter(): void {
    const printable = document.getElementById('permitSectionCancellationPrint')?.innerHTML || '';
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
}


