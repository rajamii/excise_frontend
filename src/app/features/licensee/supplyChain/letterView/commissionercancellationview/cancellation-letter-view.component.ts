import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

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
  selector: "app-cancellation-letter-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./cancellation-letter-view.component.html",
  styleUrls: ["./cancellation-letter-view.component.scss"],
})
export class CancellationLetterViewComponent implements OnInit {
  cancellationData?: CancellationData;
  private isBrowser = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const ref = this.route.snapshot.queryParamMap.get("ref");
      if (ref) {
        // For now, we'll use sample data. In a real app, this would come from an API
        this.loadCancellationData(ref);
      } else {
        // If no ref provided, redirect back to commissioner dashboard
        this.router.navigate(["/dev-commissioner-dashboard"]);
      }
    }
  }

  private loadCancellationData(refNo: string): void {
    // Sample data - in a real application, this would be fetched from an API
    const sampleData: CancellationData[] = [
      {
        id: "8",
        referenceNo: "CAN/001/2025",
        submissionDate: new Date("2025-09-20"),
        distilleryName: "Sikkim Distilleries Ltd",
        status: "Cancellation Pending",
        brAmount: 25.0,
        cancellationAmount: 15.0,
        originalPermitNo: "IBPS/02/EXCISE",
        originalPermitDate: new Date("2025-08-15"),
        reasonForCancellation:
          "Business Closure",
        cancellationBRFilePath: "/assets/documents/cancellation-br-001.pdf",
        requestedBy: "Mr. Rajesh Kumar, Operations Manager",
        authorizedBy: "Mrs. Priya Sharma, Director",
        cancellationDate: new Date("2025-09-20"),
      },
      {
        id: "9",
        referenceNo: "CAN/002/2025",
        submissionDate: new Date("2025-09-19"),
        distilleryName: "Darjeeling Artisan Pvt Ltd",
        status: "Approved Cancellation",
        brAmount: 40.0,
        cancellationAmount: 20.0,
        originalPermitNo: "IBPS/04/EXCISE",
        originalPermitDate: new Date("2025-08-20"),
        reasonForCancellation:
          "Voluntary Surrender",
        cancellationBRFilePath: "/assets/documents/cancellation-br-002.pdf",
        requestedBy: "Mr. Amit Singh, General Manager",
        authorizedBy: "Mr. Vikram Das, Managing Director",
        cancellationDate: new Date("2025-09-19"),
      },
      {
        id: "10",
        referenceNo: "CAN/003/2025",
        submissionDate: new Date("2025-09-18"),
        distilleryName: "Royal Sikkim Brewery",
        status: "Approved Cancellation",
        brAmount: 30.0,
        cancellationAmount: 0.0,
        originalPermitNo: "IBPS/05/EXCISE",
        originalPermitDate: new Date("2025-08-10"),
        reasonForCancellation:
          "Non-Compliance",
        cancellationBRFilePath: "/assets/documents/cancellation-br-003.pdf",
        requestedBy: "Mr. Suresh Rai, Manager",
        authorizedBy: "Mrs. Kamala Devi, Director",
        cancellationDate: new Date("2025-09-18"),
      },
      {
        id: "11",
        referenceNo: "CAN/004/2025",
        submissionDate: new Date("2025-09-17"),
        distilleryName: "Himalayan Distilleries Pvt Ltd",
        status: "Cancellation Pending",
        brAmount: 35.0,
        cancellationAmount: 0.0,
        originalPermitNo: "IBPS/06/EXCISE",
        originalPermitDate: new Date("2025-08-05"),
        reasonForCancellation:
          "License Transfer",
        cancellationBRFilePath: "/assets/documents/cancellation-br-004.pdf",
        requestedBy: "Mr. Deepak Sharma, Operations Head",
        authorizedBy: "Mr. Ravi Kumar, CEO",
        cancellationDate: new Date("2025-09-17"),
      },
      {
        id: "12",
        referenceNo: "CAN/005/2025",
        submissionDate: new Date("2025-09-16"),
        distilleryName: "Eastern Himalaya Distillery",
        status: "Rejected Cancellation",
        brAmount: 20.0,
        cancellationAmount: 0.0,
        originalPermitNo: "IBPS/07/EXCISE",
        originalPermitDate: new Date("2025-07-30"),
        reasonForCancellation:
          "Financial Issues",
        cancellationBRFilePath: "/assets/documents/cancellation-br-005.pdf",
        requestedBy: "Mr. Binod Thapa, Manager",
        authorizedBy: "Mrs. Sunita Rai, Director",
        cancellationDate: new Date("2025-09-16"),
      },
      {
        id: "13",
        referenceNo: "CAN/006/2025",
        submissionDate: new Date("2025-09-15"),
        distilleryName: "Gangtok Premium Spirits",
        status: "Cancellation Pending",
        brAmount: 15.0,
        cancellationAmount: 0.0,
        originalPermitNo: "IBPS/08/EXCISEss",
        originalPermitDate: new Date("2025-07-25"),
        reasonForCancellation:
          "Regulatory Violation",
        cancellationBRFilePath: "/assets/documents/cancellation-br-006.pdf",
        requestedBy: "Mr. Tenzin Norbu, Operations Manager",
        authorizedBy: "Mr. Lobsang Tashi, Managing Director",
        cancellationDate: new Date("2025-09-15"),
      },
    ];

    const found = sampleData.find((r) => r.referenceNo === refNo);
    if (found) {
      this.cancellationData = found;
    } else {
      // If not found, redirect back to commissioner dashboard
      this.router.navigate(["/dev-commissioner-dashboard"]);
    }
  }

  goBack(): void {
    this.router.navigate(["/dev-commissioner-dashboard"]);
  }

  printApplication(): void {
    if (!this.isBrowser) {
      console.warn('Print functionality not available in server-side rendering');
      return;
    }

    const printSection = document.getElementById('cancellationPrintSection');
    if (!printSection) {
      console.error('Print section not found');
      alert('Print section not found. Please try again.');
      return;
    }

    const printable = printSection.innerHTML;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');

    const win = window.open('', '_blank', 'width=1200,height=1400,scrollbars=yes,resizable=yes');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site to enable printing.');
      return;
    }

    const ref = this.cancellationData?.referenceNo || 'Unknown';
    
    win.document.open();
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Permit Cancellation Application - ${ref}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          ${styles}
          <style>
            @page { 
              size: A4; 
              margin: 12mm; 
            }
            * {
              box-sizing: border-box;
            }
            html, body { 
              background: #fff !important; 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.3;
              color: #000 !important;
              margin: 0;
              padding: 0;
              width: 100%;
              height: auto;
              overflow-x: hidden;
              font-size: 11px !important;
            }
            .no-print { 
              display: none !important; 
            }
            .printable-content { 
              width: 100% !important;
              max-width: none !important;
              padding: 0;
              margin: 0;
            }
            
            /* Override existing styles for print */
            .card {
              border: 1px solid #000 !important;
              box-shadow: none !important;
              margin: 0 !important;
              width: 100% !important;
            }
            
            .application-header {
              background: white !important;
              border-bottom: 2px solid #000 !important;
              padding: 10px !important;
              text-align: center;
            }
            
            .application-header img {
              height: 40px !important;
              width: auto !important;
            }
            
            .application-header span {
              font-size: 12px !important;
              font-weight: bold !important;
              color: #000 !important;
            }
            
            .application-header .fs-4 {
              font-size: 14px !important;
              font-weight: bold !important;
              color: #000 !important;
              margin-top: 5px !important;
            }
            
            .text-danger {
              color: #000 !important;
              font-weight: bold !important;
            }
            
            .application-content {
              padding: 8px !important;
            }
            
            .info-card {
              background: #f5f5f5 !important;
              color: #000 !important;
              border-left: 3px solid #000 !important;
              margin: 8px 0 !important;
              padding: 10px !important;
              page-break-inside: avoid;
            }
            
            .info-card h6 {
              color: #000 !important;
              font-size: 11px !important;
              font-weight: bold !important;
              margin-bottom: 5px !important;
            }
            
            .info-card p {
              font-size: 10px !important;
              margin-bottom: 3px !important;
              color: #000 !important;
            }
            
            .section-card {
              border: 1px solid #000 !important;
              box-shadow: none !important;
              margin: 8px 0 !important;
              padding: 10px !important;
              page-break-inside: avoid;
            }
            
            .section-title {
              color: #000 !important;
              border-bottom: 1px solid #000 !important;
              font-weight: bold !important;
              font-size: 12px !important;
              margin-bottom: 8px !important;
              padding-bottom: 3px !important;
            }
            
            .table {
              border-collapse: collapse !important;
              width: 100% !important;
              margin: 5px 0 !important;
              font-size: 10px !important;
            }
            
            .table td, .table th {
              border: 1px solid #000 !important;
              padding: 6px !important;
              text-align: left !important;
              line-height: 1.2 !important;
            }
            
            .table th, .table .bg-light {
              background: #f0f0f0 !important;
              font-weight: bold !important;
              color: #000 !important;
            }
            
            .row {
              display: flex !important;
              flex-wrap: wrap !important;
              margin: 0 !important;
            }
            
            .col-md-6 {
              flex: 1 !important;
              padding: 3px !important;
              min-width: 200px !important;
            }
            
            .badge {
              background: #f0f0f0 !important;
              color: #000 !important;
              border: 1px solid #000 !important;
              padding: 2px 6px !important;
              border-radius: 2px !important;
              font-size: 9px !important;
              font-weight: bold !important;
            }
            
            .text-success, .text-primary, .text-danger {
              color: #000 !important;
              font-weight: bold !important;
            }
            
            /* Compact spacing */
            .mb-2, .mb-3, .mb-4 {
              margin-bottom: 8px !important;
            }
            
            .mt-2, .mt-3, .mt-4 {
              margin-top: 8px !important;
            }
            
            .p-4 {
              padding: 8px !important;
            }
            
            h1, h2, h3, h4, h5, h6 {
              margin: 5px 0 3px 0 !important;
              color: #000 !important;
            }
            
            p {
              margin: 2px 0 !important;
              font-size: 10px !important;
              color: #000 !important;
            }
            
            strong {
              font-weight: bold !important;
              color: #000 !important;
            }
            
            /* Ensure everything fits on one page */
            .application-content > * {
              page-break-inside: avoid;
            }
            
            .section-card + .section-card {
              margin-top: 5px !important;
            }
          </style>
        </head>
        <body>
          <div class="printable-content">
            ${printable}
          </div>
        </body>
      </html>`);
    win.document.close();

    // Wait for content to load before printing
    setTimeout(() => {
      win.focus();
      win.print();
      // Don't auto-close to allow user to see the print preview
    }, 1000);
  }

  getStatusBadgeClass(status: string): string {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'approved cancellation':
      case 'completed':
      case 'approved':
        return 'badge bg-success';
      case 'cancellation pending':
      case 'pending':
      case 'under review':
        return 'badge bg-warning';
      case 'rejected':
      case 'cancelled':
        return 'badge bg-danger';
      case 'processing':
        return 'badge bg-info';
      default:
        return 'badge bg-secondary';
    }
  }

  viewCancellationBR(): void {
    if (this.cancellationData?.cancellationBRFilePath) {
      window.open(this.cancellationData.cancellationBRFilePath, "_blank");
    }
  }
}
