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
    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((el) => (el as HTMLElement).outerHTML)
      .join("");

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
          ${styles}
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              background: #fff;
              font-family: Arial, sans-serif;
              line-height: 1.6;
            }
            .no-print { display: none !important; }
            .printable-content, .printable-content * { visibility: visible !important; }
            .card { border: none !important; box-shadow: none !important; }
            .card-header { display: none !important; }
            .letter-content { margin: 0 !important; }
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
