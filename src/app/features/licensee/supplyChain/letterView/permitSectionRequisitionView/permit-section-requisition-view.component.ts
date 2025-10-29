import { CommonModule } from "@angular/common";
import { Component, OnInit, Inject, PLATFORM_ID } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { isPlatformBrowser } from "@angular/common";

interface RequisitionData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  amount: number;
  numberOfPermits?: number;
  quantity?: number; // per permit BL
  bulkSpiritType?: string;
  strengthFrom?: string;
  strengthTo?: string;
  liftedFrom?: string;
  viaRoute?: string;
  transactionId?: string;
  paymentStatus?: string;
}

@Component({
  selector: "app-permit-section-requisition-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./permit-section-requisition-view.component.html",
  styleUrls: ["./permit-section-requisition-view.component.scss"],
})
export class PermitSectionRequisitionViewComponent implements OnInit {
  data?: RequisitionData;
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
    // First check localStorage for import permit requests
    if (this.isBrowser) {
      const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
      const importPermitData = importPermitRequests.find((permit: any) => permit.refNo === ref);

      if (importPermitData) {
        // Convert import permit data to requisition format
        this.data = {
          referenceNo: importPermitData.refNo,
          submissionDate: new Date(importPermitData.date),
          distilleryName: this.getDistilleryName(importPermitData.liftedFrom),
          status: 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
          amount: 8.00,
          numberOfPermits: importPermitData.numberOfPermits,
          quantity: importPermitData.quantity,
          bulkSpiritType: importPermitData.bulkSpiritType,
          strengthFrom: this.getStrengthFrom(importPermitData.bulkSpiritType),
          strengthTo: importPermitData.strengthTo?.replace('%', ''),
          liftedFrom: importPermitData.liftedFrom,
          viaRoute: importPermitData.viaRoute,
          transactionId: `TXN${new Date(importPermitData.date).getFullYear()}${String(new Date(importPermitData.date).getMonth() + 1).padStart(2, '0')}${String(new Date(importPermitData.date).getDate()).padStart(2, '0')}0001`,
          paymentStatus: 'PAID'
        };
        return;
      }
    }

    // Fallback to sample data if not found in localStorage
    const samples: RequisitionData[] = [
      {
        referenceNo: "IBPS/02/EXCISE",
        submissionDate: new Date("2025-09-22"),
        distilleryName: "Sikkim Distilleries Ltd",
        status:
          "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
        amount: 8.0,
        numberOfPermits: 1,
        quantity: 1000,
        bulkSpiritType: "grain-ena",
        strengthFrom: "95",
        strengthTo: "96",
        liftedFrom: "sikkim-distilleries",
        viaRoute: "Gangtok - Siliguri Highway via NH-10",
        transactionId: "TXN202509220001",
        paymentStatus: "PAID",
      },
      {
        referenceNo: "IBPS/03/EXCISE",
        submissionDate: new Date("2025-09-05"),
        distilleryName: "Darjeeling Artisan Pvt Ltd",
        status:
          "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
        amount: 8.0,
        numberOfPermits: 2,
        quantity: 500,
        bulkSpiritType: "molasses-ena",
        strengthFrom: "93",
        strengthTo: "95",
        liftedFrom: "darjeeling-artisan",
        viaRoute: "Darjeeling - Siliguri via Hill Cart Road",
        transactionId: "TXN202509050001",
        paymentStatus: "PAID",
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
        numberOfPermits: 0,
        quantity: 0,
        bulkSpiritType: "",
        strengthFrom: "0",
        strengthTo: "0",
        liftedFrom: "",
        viaRoute: "",
        transactionId: "",
        paymentStatus: "UNKNOWN",
      };
    }
  }

  backToList(): void {
    this.router.navigate(["/app-permit-section"]);
  }

  getBulkSpiritTypeName(code: string): string {
    const typeMap: { [key: string]: string } = {
      "grain-ena": "Grain ENA",
      "molasses-ena": "Molasses ENA",
      "rectified-spirit": "Rectified Spirit",
      "neutral-spirit": "Neutral Spirit",
      "denatured-spirit": "Denatured Spirit",
    };
    return typeMap[code] || code || "Not specified";
  }

  getDistilleryName(code: string): string {
    const distilleryMap: { [key: string]: string } = {
      "sikkim-distilleries": "Sikkim Distilleries Ltd",
      "mountain-spirits": "Mountain Spirits Pvt Ltd",
      "highland-breweries": "Highland Breweries",
      "mount-distilleries": "Mount Distilleries Ltd, Pakyong",
      "darjeeling-artisan": "Darjeeling Artisan Pvt Ltd, Kurseong",
      "himalayan-spirits": "Himalayan Spirits Pvt Ltd, Gangtok",
    };
    return distilleryMap[code] || code || "Not specified";
  }

  getStrengthFrom(bulkSpiritType: string): string {
    switch (bulkSpiritType) {
      case 'grain-ena':
        return '95';
      case 'molasses-ena':
        return '94';
      case 'rectified-spirit':
        return '95';
      default:
        return '0';
    }
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
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.data?.referenceNo || '';

    // Create the exact template content optimized for single page
    const printContent = `
      <div style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #007bff;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">
          <img src="assets/images/header/Seal_of_Sikkim_greyscale.png" alt="Department Seal" style="height: 45px; width: auto;" />
          <span style="color: #6c757d; font-weight: 700; font-size: 14pt; text-transform: uppercase;">GOVERNMENT OF SIKKIM - EXCISE DEPARTMENT</span>
        </div>
        <div style="color: #007bff; font-weight: 700; font-size: 16pt; text-transform: uppercase; margin-top: 8px;">ENA IMPORT PERMIT REQUISITION</div>
      </div>

      <div style="display: flex; margin-bottom: 18px; gap: 15px;">
        <div style="flex: 1; background: #f8f9fa; border: 1px solid #dee2e6; border-left: 4px solid #007bff; padding: 15px; border-radius: 6px;">
          <h6 style="color: #007bff; font-weight: 700; font-size: 10pt; margin-bottom: 10px; text-transform: uppercase;">APPLICATION DETAILS</h6>
          <p style="margin-bottom: 5px; color: #495057; font-size: 9pt;"><strong>Reference No:</strong> ${this.data?.referenceNo}</p>
          <p style="margin-bottom: 5px; color: #495057; font-size: 9pt;"><strong>Submission Date:</strong> ${this.data?.submissionDate ? new Date(this.data.submissionDate).toLocaleDateString('en-GB') : ''}</p>
          <p style="margin-bottom: 0; color: #495057; font-size: 9pt;"><strong>Distillery:</strong> ${this.data?.distilleryName}</p>
        </div>
        <div style="flex: 1; background: #f8f9fa; border: 1px solid #dee2e6; border-left: 4px solid #007bff; padding: 15px; border-radius: 6px;">
          <h6 style="color: #007bff; font-weight: 700; font-size: 10pt; margin-bottom: 10px; text-transform: uppercase;">STATUS INFORMATION</h6>
          <p style="margin-bottom: 5px; color: #495057; font-size: 9pt;"><strong>Current Status:</strong></p>
          <div style="background: #28a745; color: white; padding: 4px 8px; font-size: 8pt; font-weight: 600; border-radius: 4px; display: inline-block; margin-bottom: 5px;">
            ${this.data?.status}
          </div>
          <p style="margin-bottom: 0; color: #495057; font-size: 9pt;"><strong>Amount Paid:</strong> ₹${this.data?.amount}</p>
        </div>
      </div>

      <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);">
        <h5 style="color: #007bff; font-weight: 700; font-size: 11pt; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #007bff; text-transform: uppercase;">IMPORT PERMIT SPECIFICATIONS</h5>
        <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600; width: 30%;">Bulk Spirit Type</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.getBulkSpiritTypeName(this.data?.bulkSpiritType || '')}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Quantity per Permit</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.data?.quantity} BL</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Number of Permits</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.data?.numberOfPermits}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Total Quantity</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; color: #28a745; font-weight: 700;">${this.getTotalQuantity()} BL</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Strength</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.data?.strengthFrom}° to ${this.data?.strengthTo}°</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Purpose</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">Manufacturing</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Amount Paid</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; color: #007bff; font-weight: 700;">₹${this.data?.amount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);">
        <h5 style="color: #007bff; font-weight: 700; font-size: 11pt; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #007bff; text-transform: uppercase;">TRANSPORT & ROUTE INFORMATION</h5>
        <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600; width: 30%;">Lifted From</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.getDistilleryName(this.data?.liftedFrom || '')}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Via Route</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.data?.viaRoute}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Transaction ID</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.data?.transactionId || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

    
    `;

    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Requisition Application - ${ref}</title>
          <style>
            @page { 
              size: A4; 
              margin: 10mm; 
            }
            
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            
            body { 
              background: white !important;
              font-family: Arial, sans-serif !important;
              font-size: 10pt !important;
              line-height: 1.3 !important;
              margin: 0 !important;
              padding: 12px !important;
              color: #000 !important;
              height: 100vh !important;
              overflow: hidden !important;
            }
            
            /* Ensure single page layout */
            .page-content {
              height: calc(100vh - 24px) !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
            }
            
            /* Prevent page breaks */
            * {
              page-break-inside: avoid !important;
            }
            
            table {
              page-break-inside: avoid !important;
            }
            
            tr {
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <div class="page-content">
            ${printContent}
          </div>
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
    // In a real application, this would generate and download a PDF
    alert(
      "PDF download functionality will be implemented with a PDF library like jsPDF or server-side PDF generation.",
    );
  }

  viewPaymentDetails(): void {
    if (!this.data) return;

    this.router.navigate(["/dev-payment-receipt"], {
      queryParams: {
        transactionId: this.data.transactionId || this.data.referenceNo,
        type: "requisition",
        amount: this.data.amount,
      },
    });
  }
}
