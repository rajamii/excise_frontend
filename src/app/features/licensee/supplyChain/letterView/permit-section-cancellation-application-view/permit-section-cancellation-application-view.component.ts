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

  getStatusBadgeClass(status: string): string {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'approved':
      case 'completed':
      case 'cancellation approved':
        return 'bg-success';
      case 'pending':
      case 'under review':
        return 'bg-warning';
      case 'rejected':
      case 'cancelled':
        return 'bg-danger';
      case 'processing':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  printLetter(): void {
    if (!this.isBrowser) {
      console.warn('Print functionality not available in server-side rendering');
      return;
    }

    const printSection = document.getElementById('permitSectionCancellationPrint');
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

    const ref = this.data?.referenceNo || 'Unknown';
    
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
            
            .text-success, .text-primary {
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

  private generateCompactPrintContent(): string {
    if (!this.data) return '<p>No data available</p>';

    return `
      <div class="application-content">
        <!-- Header -->
        <div class="application-header">
          <img src="assets/images/sikkim-seal.png" alt="Department Seal" style="float: left;">
          <div class="header-text">
            GOVERNMENT OF SIKKIM - EXCISE DEPARTMENT<br>
            <div class="title">PERMIT CANCELLATION APPLICATION</div>
          </div>
          <div style="clear: both;"></div>
        </div>

        <!-- Cancellation Details Section -->
        <div class="section-group">
          <div class="section-title">Cancellation Details</div>
          <table class="info-table">
            <tr>
              <td class="label-col">Reference No:</td>
              <td class="value-col">${this.data.referenceNo}</td>
            </tr>
            <tr>
              <td class="label-col">Submission Date:</td>
              <td class="value-col">${this.data.submissionDate.toLocaleDateString('en-GB')}</td>
            </tr>
            <tr>
              <td class="label-col">Distillery:</td>
              <td class="value-col">${this.data.distilleryName}</td>
            </tr>
            <tr>
              <td class="label-col">Cancellation Date:</td>
              <td class="value-col">${this.data.submissionDate.toLocaleDateString('en-GB')}</td>
            </tr>
          </table>
        </div>

        <!-- Status & Financial Section -->
        <div class="section-group">
          <div class="section-title">Status & Financial</div>
          <table class="info-table">
            <tr>
              <td class="label-col">Current Status:</td>
              <td class="value-col">
                ${this.data.status}
              </td>
            </tr>
            <tr>
              <td class="label-col">Cancellation Fee:</td>
              <td class="value-col">₹${this.data.amount}</td>
            </tr>
            <tr>
              <td class="label-col">Refund Amount:</td>
              <td class="value-col">₹${this.data.refundAmount || 0} ${this.data.refundStatus || 'PROCESSING'}</td>
            </tr>
          </table>
        </div>

        <!-- Original Permit Information Section -->
        <div class="section-group">
          <div class="section-title">Original Permit Information</div>
          <table class="info-table">
            <tr>
              <td class="label-col">Original Permit No:</td>
              <td class="value-col">${this.data.originalPermitNo || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label-col">Original Issue Date:</td>
              <td class="value-col">${this.data.originalPermitDate?.toLocaleDateString('en-GB') || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label-col">Original Amount Paid:</td>
              <td class="value-col">₹${this.data.amount}</td>
            </tr>
            <tr>
              <td class="label-col">Distillery Name:</td>
              <td class="value-col">${this.data.distilleryName}</td>
            </tr>
          </table>
        </div>

        <!-- Cancellation Request Information Section -->
        <div class="section-group">
          <div class="section-title">Cancellation Request Information</div>
          <table class="info-table">
            <tr>
              <td class="label-col">Reason for Cancellation:</td>
              <td class="value-col">${this.data.reason || 'Not specified'}</td>
            </tr>
            <tr>
              <td class="label-col">Cancellation Type:</td>
              <td class="value-col">${this.getCancellationTypeName()}</td>
            </tr>
            <tr>
              <td class="label-col">Requested By:</td>
              <td class="value-col">${this.data.distilleryName}</td>
            </tr>
            <tr>
              <td class="label-col">Cancellation Date:</td>
              <td class="value-col">${this.data.submissionDate.toLocaleDateString('en-GB')}</td>
            </tr>
            <tr>
              <td class="label-col">Refund Amount:</td>
              <td class="value-col">₹${this.data.refundAmount || 0}</td>
            </tr>
            <tr>
              <td class="label-col">Refund Status:</td>
              <td class="value-col">${this.data.refundStatus || 'PROCESSING'}</td>
            </tr>
          </table>
        </div>

        <!-- Original Application Specifications Section -->
        <div class="section-group">
          <div class="section-title">Original Application Specifications</div>
          <table class="info-table">
            <tr>
              <td class="label-col">Bulk Spirit Type:</td>
              <td class="value-col">${this.getBulkSpiritTypeName(this.data.bulkSpiritType || '')}</td>
            </tr>
            <tr>
              <td class="label-col">Strength Range:</td>
              <td class="value-col">${this.data.strengthFrom || 'N/A'}% - ${this.data.strengthTo || 'N/A'}%</td>
            </tr>
            <tr>
              <td class="label-col">Quantity per Permit:</td>
              <td class="value-col">${this.data.quantity || 0} BL</td>
            </tr>
            <tr>
              <td class="label-col">Number of Permits:</td>
              <td class="value-col">${this.data.numberOfPermits || 0}</td>
            </tr>
            <tr>
              <td class="label-col">Total Quantity:</td>
              <td class="value-col">${this.getTotalQuantity()} BL</td>
            </tr>
            <tr>
              <td class="label-col">Transport Route:</td>
              <td class="value-col">${this.data.viaRoute || 'Not specified'}</td>
            </tr>
          </table>
        </div>
      </div>
    `;
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
