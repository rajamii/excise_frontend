import { CommonModule } from "@angular/common";
import { Component, OnInit, Inject, PLATFORM_ID } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { isPlatformBrowser } from "@angular/common";

interface RevalidationData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  amount: number;
  originalPermitNo?: string;
  originalPermitDate?: Date;
  expiryDate?: Date;
  revalidationPeriod?: string;
  numberOfPermits?: number;
  quantity?: number;
  bulkSpiritType?: string;
  strengthFrom?: string;
  strengthTo?: string;
  liftedFrom?: string;
  viaRoute?: string;
  transactionId?: string;
  paymentStatus?: string;
  reason?: string;
}

@Component({
  selector: "app-permit-section-revalidation-application-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./permit-section-revalidation-application-view.component.html",
  styleUrls: ["./permit-section-revalidation-application-view.component.scss"],
})
export class PermitSectionRevalidationApplicationViewComponent implements OnInit {
  data?: RevalidationData;
  private isBrowser = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    const ref = this.route.snapshot.paramMap.get("ref");
    if (!ref) {
      this.router.navigate(["/app-permit-section"]);
      return;
    }
    this.loadData(ref);
  }

  loadData(ref: string): void {
    // Sample data - replace with API call
    const samples: RevalidationData[] = [
      {
        referenceNo: "REV/001/2025",
        submissionDate: new Date("2025-09-10"),
        distilleryName: "Sikkim Distilleries Ltd",
        status: "REVALIDATION APPROVED BY COMMISSIONER",
        amount: 50.0,
        originalPermitNo: "IBPS/001/2025",
        originalPermitDate: new Date("2025-06-15"),
        expiryDate: new Date("2025-09-15"),
        revalidationPeriod: "3 months",
        numberOfPermits: 1,
        quantity: 1000,
        bulkSpiritType: "grain-ena",
        strengthFrom: "95",
        strengthTo: "96",
        liftedFrom: "sikkim-distilleries",
        viaRoute: "Gangtok - Siliguri Highway via NH-10",
        transactionId: "TXN202509100001",
        paymentStatus: "PAID",
        reason: "Delay in transportation due to road conditions",
      },
      {
        referenceNo: "REV/002/2025",
        submissionDate: new Date("2025-08-25"),
        distilleryName: "Mount Distilleries Ltd",
        status: "REVALIDATION PENDING APPROVAL",
        amount: 25.0,
        originalPermitNo: "IBPS/005/2025",
        originalPermitDate: new Date("2025-05-20"),
        expiryDate: new Date("2025-08-20"),
        revalidationPeriod: "2 months",
        numberOfPermits: 1,
        quantity: 750,
        bulkSpiritType: "molasses-ena",
        strengthFrom: "93",
        strengthTo: "95",
        liftedFrom: "mount-distilleries",
        viaRoute: "Pakyong - Siliguri via NH-10",
        transactionId: "TXN202508250001",
        paymentStatus: "PAID",
        reason: "Administrative delays in processing",
      },
    ];

    this.data = samples.find((s) => s.referenceNo === ref);
    if (!this.data) {
      // If no data found, create a basic structure with the ref
      this.data = {
        referenceNo: ref,
        submissionDate: new Date(),
        distilleryName: "Unknown Distillery",
        status: "Data not found",
        amount: 0,
        originalPermitNo: "",
        originalPermitDate: new Date(),
        expiryDate: new Date(),
        revalidationPeriod: "",
        numberOfPermits: 0,
        quantity: 0,
        bulkSpiritType: "",
        strengthFrom: "0",
        strengthTo: "0",
        liftedFrom: "",
        viaRoute: "",
        transactionId: "",
        paymentStatus: "UNKNOWN",
        reason: "",
      };
    }
  }

  backToList(): void {
    this.router.navigate(["/app-permit-section"]);
  }

  getBulkSpiritTypeName(code: string): string {
    const typeMap: { [key: string]: string } = {
      "grain-ena": "Grain ENA (Extra Neutral Alcohol)",
      "molasses-ena": "Molasses ENA (Extra Neutral Alcohol)",
      "rectified-spirit": "Rectified Spirit",
      "neutral-spirit": "Neutral Spirit",
      "denatured-spirit": "Denatured Spirit",
    };
    return typeMap[code] || code || "Not specified";
  }

  getDistilleryName(code: string): string {
    const distilleryMap: { [key: string]: string } = {
      "sikkim-distilleries": "Sikkim Distilleries Ltd, Rangpo",
      "mount-distilleries": "Mount Distilleries Ltd, Pakyong",
      "darjeeling-artisan": "Darjeeling Artisan Pvt Ltd, Kurseong",
      "himalayan-spirits": "Himalayan Spirits Pvt Ltd, Gangtok",
    };
    return distilleryMap[code] || code || "Not specified";
  }

  getTotalQuantity(): number {
    if (!this.data) return 0;
    return (this.data.quantity || 0) * (this.data.numberOfPermits || 0);
  }

  getPaymentStatus(): string {
    if (!this.data || this.data.amount === 0) return "NO PAYMENT REQUIRED";
    return this.data.paymentStatus || "UNKNOWN";
  }

  getDaysOverdue(): number {
    if (!this.data?.expiryDate) return 0;
    const today = new Date();
    const expiry = new Date(this.data.expiryDate);
    const diffTime = today.getTime() - expiry.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  printLetter(): void {
    if (!this.isBrowser) return;

    const printable =
      document.getElementById("permitSectionRevalidationPrint")?.innerHTML || "";

    const win = window.open("", "_blank", "width=900,height=1200");
    if (!win) {
      alert("Please allow popups to print the application");
      return;
    }

    win.document.open();
    const ref = this.data?.referenceNo || "";
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Revalidation Application - ${ref}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <style>
            @page { 
              size: A4; 
              margin: 15mm 10mm; 
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              background: #fff !important;
              font-family: Arial, sans-serif !important;
              line-height: 1.3 !important;
              font-size: 10pt !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .no-print { 
              display: none !important; 
            }
            .printable-content { 
              visibility: visible !important;
              background: white !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .card { 
              border: none !important; 
              box-shadow: none !important; 
              margin: 0 !important;
              padding: 0 !important;
            }
            
            /* Application Header */
            .application-header {
              text-align: center !important;
              margin-bottom: 15pt !important;
              padding: 10pt 0 !important;
              background: white !important;
              border-bottom: 1pt solid #000 !important;
              page-break-inside: avoid !important;
            }
            .application-header .d-flex {
              justify-content: center !important;
              align-items: center !important;
              gap: 10pt !important;
              margin-bottom: 8pt !important;
            }
            .application-header img {
              max-height: 40pt !important;
              width: auto !important;
            }
            .application-header span {
              font-size: 11pt !important;
              font-weight: bold !important;
              color: #000 !important;
            }
            .application-header .text-primary {
              color: #000 !important;
              font-size: 12pt !important;
              font-weight: bold !important;
              margin-top: 5pt !important;
            }
            
            /* Application Content */
            .application-content {
              padding: 0 !important;
              font-size: 9pt !important;
              line-height: 1.2 !important;
            }
            
            /* Basic Information Row */
            .row.mb-4 {
              margin-bottom: 10pt !important;
            }
            .row.mb-4::after {
              content: "";
              display: table;
              clear: both;
            }
            .col-md-6 {
              width: 50% !important;
              float: left !important;
              padding: 0 5pt !important;
            }
            
            /* Info Cards */
            .info-card {
              background: #f8f8f8 !important;
              border: 1pt solid #ccc !important;
              border-radius: 0 !important;
              padding: 8pt !important;
              margin-bottom: 8pt !important;
            }
            .info-card h6 {
              font-size: 9pt !important;
              font-weight: bold !important;
              margin-bottom: 6pt !important;
              color: #000 !important;
            }
            .info-card p {
              margin-bottom: 3pt !important;
              font-size: 8pt !important;
              line-height: 1.1 !important;
            }
            .info-card p strong {
              font-weight: bold !important;
              color: #000 !important;
            }
            .info-card .badge {
              background: #e0e0e0 !important;
              color: #000 !important;
              font-size: 7pt !important;
              padding: 2pt 4pt !important;
              border: 1pt solid #999 !important;
              border-radius: 0 !important;
            }
            
            /* Section Cards */
            .section-card {
              border: 1pt solid #000 !important;
              margin-bottom: 8pt !important;
              page-break-inside: avoid;
              border-radius: 0 !important;
            }
            .section-card .section-title {
              background: #f0f0f0 !important;
              color: #000 !important;
              padding: 6pt 8pt !important;
              margin: 0 !important;
              font-size: 9pt !important;
              font-weight: bold !important;
              border-bottom: 1pt solid #000 !important;
            }
            .section-card .table-responsive {
              overflow: visible !important;
            }
            .section-card .table {
              margin-bottom: 0 !important;
              font-size: 8pt !important;
              width: 100% !important;
              border-collapse: collapse !important;
            }
            .section-card .table td {
              padding: 4pt 6pt !important;
              vertical-align: top !important;
              border: 1pt solid #ccc !important;
              line-height: 1.1 !important;
            }
            .section-card .table td.fw-semibold {
              font-weight: bold !important;
              color: #000 !important;
              background: #f8f8f8 !important;
            }
            .section-card .table td.bg-light {
              background-color: #f8f8f8 !important;
            }
            .section-card .table td.text-danger {
              color: #000 !important;
              font-weight: bold !important;
            }
            .section-card .table td.text-success {
              color: #000 !important;
              font-weight: bold !important;
            }
            .section-card .table td.text-primary {
              color: #000 !important;
              font-weight: bold !important;
            }
            
            /* Summary Card */
            .summary-card {
              background: #f8f8f8 !important;
              border: 1pt solid #000 !important;
              border-radius: 0 !important;
              padding: 8pt !important;
              margin: 8pt 0 !important;
              page-break-inside: avoid;
            }
            .summary-card h6 {
              font-size: 9pt !important;
              font-weight: bold !important;
              color: #000 !important;
              margin-bottom: 8pt !important;
              text-align: center !important;
            }
            .summary-card .row {
              display: flex !important;
              justify-content: space-around !important;
            }
            .summary-card .summary-item {
              text-align: center !important;
              flex: 1 !important;
            }
            .summary-card .summary-value {
              font-size: 10pt !important;
              font-weight: bold !important;
              margin-bottom: 2pt !important;
              color: #000 !important;
            }
            .summary-card .summary-label {
              font-size: 7pt !important;
              color: #000 !important;
              font-weight: normal !important;
              text-transform: uppercase !important;
            }
            
            /* Footer */
            .mt-4.text-center {
              margin-top: 8pt !important;
              text-align: center !important;
            }
            .mt-4.text-center p {
              font-size: 7pt !important;
              margin-bottom: 2pt !important;
              color: #666 !important;
            }
            .mt-4.text-center small {
              font-size: 6pt !important;
              color: #666 !important;
            }
            
            /* Bootstrap utility classes */
            .d-flex { display: flex !important; }
            .align-items-center { align-items: center !important; }
            .justify-content-center { justify-content: center !important; }
            .text-center { text-align: center !important; }
            .fw-bold { font-weight: bold !important; }
            .mb-2 { margin-bottom: 0.5rem !important; }
            .mb-3 { margin-bottom: 1rem !important; }
            .mt-1 { margin-top: 0.25rem !important; }
            .mt-2 { margin-top: 0.5rem !important; }
            .gap-3 { gap: 1rem !important; }
            .fs-4 { font-size: 1.5rem !important; }
            .fs-5 { font-size: 1.25rem !important; }
          </style>
        </head>
        <body>
          <div class="permit-section-revalidation-application-view">
            <div class="application-container">
              ${printable}
            </div>
          </div>
        </body>
      </html>`);
    win.document.close();

    win.onload = () => {
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 1000);
    };
  }

  downloadPDF(): void {
    // Placeholder for PDF download functionality
    alert(
      "PDF download functionality will be implemented with a PDF library like jsPDF or server-side PDF generation.",
    );
  }

  viewPaymentDetails(): void {
    if (!this.data) return;

    this.router.navigate(["/dev-payment-receipt"], {
      queryParams: {
        transactionId: this.data.transactionId || this.data.referenceNo,
        type: "revalidation",
        amount: this.data.amount,
      },
    });
  }
}
