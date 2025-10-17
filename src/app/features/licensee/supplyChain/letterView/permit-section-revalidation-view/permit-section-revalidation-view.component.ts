import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface PermitSectionRevalidationData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  originalPermitNo: string;
  originalPermitDate: Date;
  expiryDate: Date;
  reasonForRevalidation: string;
  newQuantity?: number;
  newPurpose?: string;
}

@Component({
  selector: 'app-permit-section-revalidation-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './permit-section-revalidation-view.component.html',
  styleUrl: './permit-section-revalidation-view.component.scss'
})
export class PermitSectionRevalidationViewComponent implements OnInit {
  revalidationData?: PermitSectionRevalidationData;
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
    // Temporary mock data until API integration
    const sample: PermitSectionRevalidationData[] = [
      {
        referenceNo: 'REV/001/2025',
        submissionDate: new Date('2025-09-10'),
        distilleryName: 'Sikkim Distilleries Ltd',
        originalPermitNo: 'IP/2025/001',
        originalPermitDate: new Date('2025-08-01'),
        expiryDate: new Date('2025-09-15'),
        reasonForRevalidation: 'Logistics delay due to road closure.',
        newQuantity: 800,
        newPurpose: 'Manufacturing'
      }
    ];

    const found = sample.find(r => r.referenceNo === refNo);
    if (found) this.revalidationData = found; else {
      this.revalidationData = {
        referenceNo: refNo,
        submissionDate: new Date(),
        distilleryName: '—',
        originalPermitNo: '—',
        originalPermitDate: new Date(),
        expiryDate: new Date(),
        reasonForRevalidation: '—'
      };
    }
  }

  goBack(): void {
    this.router.navigate(['/app-permit-section']);
  }

  printLetter(): void {
    const printable = document.getElementById('permitSectionRevalidationPrint')?.innerHTML || '';
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
}


