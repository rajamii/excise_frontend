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
  cancellationBRFilePath?: string;
  requestedBy?: string;
  authorizedBy?: string;
  cancellationDate?: Date;
}

@Component({
  selector: 'app-cancellation-letter-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cancellation-letter-view.component.html',
  styleUrls: ['./cancellation-letter-view.component.scss']
})
export class CancellationLetterViewComponent implements OnInit {
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
        // For now, we'll use sample data. In a real app, this would come from an API
        this.loadCancellationData(ref);
      } else {
        // If no ref provided, redirect back to commissioner dashboard
        this.router.navigate(['/dev-commissioner-dashboard']);
      }
    }
  }

  private loadCancellationData(refNo: string): void {
    // Sample data - in a real application, this would be fetched from an API
    const sampleData: CancellationData[] = [
      {
        id: '8',
        referenceNo: 'CAN/001/2025',
        submissionDate: new Date('2025-09-08'),
        distilleryName: 'Sikkim Distilleries Ltd',
        status: 'Cancellation Pending',
        brAmount: 25.00,
        cancellationAmount: 15.00,
        originalPermitNo: 'IBPS/02/EXCISE',
        originalPermitDate: new Date('2025-08-15'),
        reasonForCancellation: 'Change in business requirements - no longer need the permit',
        cancellationBRFilePath: '/assets/documents/cancellation-br-001.pdf',
        requestedBy: 'Mr. Rajesh Kumar, Operations Manager',
        authorizedBy: 'Mrs. Priya Sharma, Director',
        cancellationDate: new Date('2025-09-08')
      },
      {
        id: '9',
        referenceNo: 'CAN/002/2025',
        submissionDate: new Date('2025-09-14'),
        distilleryName: 'Darjeeling Artisan Pvt Ltd',
        status: 'Approved Cancellation',
        brAmount: 40.00,
        cancellationAmount: 20.00,
        originalPermitNo: 'IBPS/04/EXCISE',
        originalPermitDate: new Date('2025-08-20'),
        reasonForCancellation: 'Permit no longer required due to project cancellation',
        cancellationBRFilePath: '/assets/documents/cancellation-br-002.pdf',
        requestedBy: 'Mr. Amit Singh, General Manager',
        authorizedBy: 'Mr. Vikram Das, Managing Director',
        cancellationDate: new Date('2025-09-14')
      }
    ];

    const found = sampleData.find(r => r.referenceNo === refNo);
    if (found) {
      this.cancellationData = found;
    } else {
      // If not found, redirect back to commissioner dashboard
      this.router.navigate(['/dev-commissioner-dashboard']);
    }
  }

  goBack(): void {
    this.router.navigate(['/dev-commissioner-dashboard']);
  }

  printLetter(): void {
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

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Approved Cancellation':
        return 'badge bg-success';
      case 'Cancellation Pending':
        return 'badge bg-warning';
      case 'Cancelled':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  viewCancellationBR(): void {
    if (this.cancellationData?.cancellationBRFilePath) {
      window.open(this.cancellationData.cancellationBRFilePath, '_blank');
    }
  }
}
