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
          <title>Revalidation Application - ${ref}</title>
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
        type: "revalidation",
        amount: this.data.amount,
      },
    });
  }
}
