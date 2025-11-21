import { CommonModule } from "@angular/common";
import { Component, OnInit, Inject, PLATFORM_ID } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { isPlatformBrowser } from "@angular/common";

interface TransitData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  amount: number;
  vehicleNo?: string;
  driverName?: string;
  driverLicense?: string;
  fromLocation?: string;
  toLocation?: string;
  viaRoute?: string;
  numberOfPermits?: number;
  quantity?: number;
  bulkSpiritType?: string;
  strengthFrom?: string;
  strengthTo?: string;
  transportDistance?: string;
  estimatedTravelTime?: string;
  transitFee?: number;
  transactionId?: string;
  paymentStatus?: string;
  validityPeriod?: string;
}

@Component({
  selector: "app-permit-section-transit-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./permit-section-transit-view.component.html",
  styleUrls: ["./permit-section-transit-view.component.scss"],
})
export class PermitSectionTransitViewComponent implements OnInit {
  data?: TransitData;
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
    const samples: TransitData[] = [
      {
        referenceNo: "TRP/001/2025",
        submissionDate: new Date("2025-09-20"),
        distilleryName: "Sikkim Distilleries Ltd",
        status: "TRANSIT PERMIT APPROVED",
        amount: 75.0,
        vehicleNo: "SK-01-AB-1234",
        driverName: "Karma Chopel Bhutia",
        driverLicense: "SK1234567890",
        fromLocation: "Sikkim Distilleries Ltd, Rangpo",
        toLocation: "Delhi Warehouse, New Delhi",
        viaRoute: "Gangtok - Siliguri - Delhi Highway (NH-10, NH-31, NH-1)",
        numberOfPermits: 1,
        quantity: 2000,
        bulkSpiritType: "grain-ena",
        strengthFrom: "95",
        strengthTo: "96",
        transportDistance: "650 km",
        estimatedTravelTime: "18-20 hours",
        transitFee: 75.0,
        transactionId: "TXN202509200001",
        paymentStatus: "PAID",
        validityPeriod: "7 days",
      },
      {
        referenceNo: "TRP/002/2025",
        submissionDate: new Date("2025-09-18"),
        distilleryName: "Mount Distilleries Ltd",
        status: "TRANSIT PERMIT PENDING APPROVAL",
        amount: 50.0,
        vehicleNo: "WB-22-CD-5678",
        driverName: "Sonam Tshering",
        driverLicense: "WB9876543210",
        fromLocation: "Mount Distilleries Ltd, Pakyong",
        toLocation: "Mumbai Distribution Center",
        viaRoute: "Pakyong - Siliguri - Kolkata - Mumbai (NH-10, NH-6, NH-3)",
        numberOfPermits: 1,
        quantity: 1500,
        bulkSpiritType: "molasses-ena",
        strengthFrom: "93",
        strengthTo: "95",
        transportDistance: "850 km",
        estimatedTravelTime: "24-26 hours",
        transitFee: 50.0,
        transactionId: "TXN202509180001",
        paymentStatus: "PAID",
        validityPeriod: "10 days",
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
        vehicleNo: "",
        driverName: "",
        driverLicense: "",
        fromLocation: "",
        toLocation: "",
        viaRoute: "",
        numberOfPermits: 0,
        quantity: 0,
        bulkSpiritType: "",
        strengthFrom: "0",
        strengthTo: "0",
        transportDistance: "",
        estimatedTravelTime: "",
        transitFee: 0,
        transactionId: "",
        paymentStatus: "UNKNOWN",
        validityPeriod: "",
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

  getTotalQuantity(): number {
    if (!this.data) return 0;
    return (this.data.quantity || 0) * (this.data.numberOfPermits || 0);
  }

  getPaymentStatus(): string {
    if (!this.data || this.data.amount === 0) return "NO PAYMENT REQUIRED";
    return this.data.paymentStatus || "UNKNOWN";
  }

  printLetter(): void {
    if (!this.isBrowser) return;

    const printable =
      document.getElementById("permitSectionTransitPrint")?.innerHTML || "";

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
          <title>Transit Permit Application - ${ref}</title>
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
            .application-header .header-text {
              font-size: 11pt !important;
              font-weight: bold !important;
              color: #000 !important;
            }
            .application-header .text-success {
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
            
            /* Row and Columns */
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
            
            /* Border Cards */
            .border.border-success.rounded.p-3 {
              border: 1pt solid #000 !important;
              border-radius: 0 !important;
              padding: 8pt !important;
              margin-bottom: 8pt !important;
              background: #f8f8f8 !important;
            }
            
            /* Section Titles */
            .text-success.fw-bold {
              font-size: 9pt !important;
              font-weight: bold !important;
              color: #000 !important;
              margin-bottom: 6pt !important;
              border-bottom: 1pt solid #000 !important;
              padding-bottom: 3pt !important;
            }
            
            /* Info Paragraphs */
            .transit-info p,
            .status-info p {
              margin-bottom: 3pt !important;
              font-size: 8pt !important;
              line-height: 1.1 !important;
            }
            .transit-info span.text-muted,
            .status-info span.text-muted {
              font-weight: bold !important;
              color: #000 !important;
              width: auto !important;
            }
            
            /* Badges */
            .badge {
              background: #e0e0e0 !important;
              color: #000 !important;
              font-size: 7pt !important;
              padding: 2pt 4pt !important;
              border: 1pt solid #999 !important;
              border-radius: 0 !important;
            }
            
            /* Section Headers */
            .mb-4 h5 {
              font-size: 9pt !important;
              font-weight: bold !important;
              color: #000 !important;
              margin-bottom: 6pt !important;
              border-bottom: 1pt solid #000 !important;
              padding-bottom: 3pt !important;
            }
            
            /* Tables */
            .table-responsive {
              overflow: visible !important;
            }
            .table {
              margin-bottom: 8pt !important;
              font-size: 8pt !important;
              width: 100% !important;
              border-collapse: collapse !important;
            }
            .table td,
            .table th {
              padding: 4pt 6pt !important;
              vertical-align: top !important;
              border: 1pt solid #000 !important;
              line-height: 1.1 !important;
            }
            .table thead th {
              background: #f0f0f0 !important;
              color: #000 !important;
              font-weight: bold !important;
            }
            .table tbody td {
              background: white !important;
            }
            .table tfoot td {
              background: #f8f8f8 !important;
              font-weight: bold !important;
            }
            .fw-semibold.bg-light {
              font-weight: bold !important;
              color: #000 !important;
              background: #f8f8f8 !important;
            }
            .fw-normal {
              font-weight: normal !important;
              color: #000 !important;
            }
            .fw-bold {
              font-weight: bold !important;
              color: #000 !important;
            }
            .text-center {
              text-align: center !important;
            }
            
            /* HR */
            hr {
              border: 1pt solid #000 !important;
              margin: 5pt 0 !important;
            }
            
            /* Bootstrap utility classes */
            .d-flex { display: flex !important; }
            .align-items-center { align-items: center !important; }
            .justify-content-center { justify-content: center !important; }
            .text-center { text-align: center !important; }
            .fw-bold { font-weight: bold !important; }
            .mb-2 { margin-bottom: 0.5rem !important; }
            .mb-3 { margin-bottom: 1rem !important; }
            .gap-3 { gap: 1rem !important; }
            .fs-3 { font-size: 1.75rem !important; }
            .fs-5 { font-size: 1.25rem !important; }
          </style>
        </head>
        <body>
          <div class="transitviewlevel1-container">
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
        type: "transit",
        amount: this.data.amount,
      },
    });
  }
}
