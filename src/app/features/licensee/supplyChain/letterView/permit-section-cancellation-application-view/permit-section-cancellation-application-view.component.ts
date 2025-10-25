import { CommonModule } from "@angular/common";
import { Component, OnInit, Inject, PLATFORM_ID } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { isPlatformBrowser } from "@angular/common";

interface CancellationData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  amount: number;
  originalPermitNo?: string;
  originalPermitDate?: Date;
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
  cancellationType?: string; // 'full' | 'partial'
  quantityCancelled?: number;
  refundAmount?: number;
  refundStatus?: string;
}

@Component({
  selector: "app-permit-section-cancellation-application-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./permit-section-cancellation-application-view.component.html",
  styleUrls: ["./permit-section-cancellation-application-view.component.scss"],
})
export class PermitSectionCancellationApplicationViewComponent implements OnInit {
  data?: CancellationData;
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
    const samples: CancellationData[] = [
      {
        referenceNo: "CAN/001/2025",
        submissionDate: new Date("2025-09-08"),
        distilleryName: "Mount Distilleries Ltd",
        status: "CANCELLATION PENDING APPROVAL",
        amount: 25.0,
        originalPermitNo: "IBPS/007/2025",
        originalPermitDate: new Date("2025-07-15"),
        numberOfPermits: 2,
        quantity: 500,
        bulkSpiritType: "molasses-ena",
        strengthFrom: "93",
        strengthTo: "95",
        liftedFrom: "mount-distilleries",
        viaRoute: "Pakyong - Siliguri via NH-10",
        transactionId: "TXN202509080001",
        paymentStatus: "PAID",
        reason: "Change in business requirements - no longer needed",
        cancellationType: "full",
        quantityCancelled: 1000,
        refundAmount: 15.0,
        refundStatus: "PROCESSING",
      },
      {
        referenceNo: "CAN/002/2025",
        submissionDate: new Date("2025-08-30"),
        distilleryName: "Darjeeling Artisan Pvt Ltd",
        status: "CANCELLATION APPROVED",
        amount: 15.0,
        originalPermitNo: "IBPS/009/2025",
        originalPermitDate: new Date("2025-06-20"),
        numberOfPermits: 1,
        quantity: 750,
        bulkSpiritType: "grain-ena",
        strengthFrom: "95",
        strengthTo: "96",
        liftedFrom: "darjeeling-artisan",
        viaRoute: "Darjeeling - Siliguri via Hill Cart Road",
        transactionId: "TXN202508300001",
        paymentStatus: "PAID",
        reason: "Regulatory compliance issues",
        cancellationType: "partial",
        quantityCancelled: 375,
        refundAmount: 7.5,
        refundStatus: "COMPLETED",
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
        cancellationType: "full",
        quantityCancelled: 0,
        refundAmount: 0,
        refundStatus: "UNKNOWN",
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

  getCancellationTypeName(): string {
    if (!this.data?.cancellationType) return "Not specified";
    return this.data.cancellationType === "full" ? "Full Cancellation" : "Partial Cancellation";
  }

  getRefundStatusBadgeClass(): string {
    if (!this.data?.refundStatus) return "bg-secondary";
    switch (this.data.refundStatus.toLowerCase()) {
      case "completed": return "bg-success";
      case "processing": return "bg-warning";
      case "pending": return "bg-info";
      case "failed": return "bg-danger";
      default: return "bg-secondary";
    }
  }

  printLetter(): void {
    if (!this.isBrowser) return;

    const printable =
      document.getElementById("permitSectionCancellationPrint")?.innerHTML || "";
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
          <title>Cancellation Application - ${ref}</title>
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
        type: "cancellation",
        amount: this.data.amount,
      },
    });
  }

  viewRefundDetails(): void {
    if (!this.data || !this.data.refundAmount) return;

    alert(`Refund Details:\nAmount: ₹${this.data.refundAmount}\nStatus: ${this.data.refundStatus}\nRefund will be processed within 7-10 working days.`);
  }
}
