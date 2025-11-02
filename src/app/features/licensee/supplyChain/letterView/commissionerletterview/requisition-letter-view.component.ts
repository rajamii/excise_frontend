import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

interface RequisitionData {
  id: string;
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  brAmount: number;
  quantity?: number;
  numberOfPermits?: number;
  bulkSpiritType?: string;
  strengthTo?: string;
  liftedFrom?: string;
  viaRoute?: string;
  checkpostEntry?: string;
  purpose?: string;
}

@Component({
  selector: "app-requisition-letter-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./requisition-letter-view.component.html",
  styleUrls: ["./requisition-letter-view.component.scss"],
})
export class RequisitionLetterViewComponent implements OnInit {
  requisitionData?: RequisitionData;
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
        this.loadRequisitionData(ref);
      } else {
        // If no ref provided, redirect back to commissioner dashboard
        this.router.navigate(["/dev-commissioner-dashboard"]);
      }
    }
  }

  private loadRequisitionData(refNo: string): void {
    // First check localStorage for import permit requests
    if (this.isBrowser) {
      const importPermitRequests = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
      const importPermitData = importPermitRequests.find((permit: any) => permit.refNo === refNo);
      
      if (importPermitData) {
        // Convert import permit data to requisition format
        this.requisitionData = {
          id: importPermitData.refNo,
          referenceNo: importPermitData.refNo,
          submissionDate: new Date(importPermitData.date),
          distilleryName: this.getDistilleryName(importPermitData.liftedFrom),
          status: 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
          brAmount: 8.00,
          quantity: importPermitData.quantity,
          numberOfPermits: importPermitData.numberOfPermits,
          bulkSpiritType: importPermitData.bulkSpiritType,
          strengthTo: importPermitData.strengthTo?.replace('%', ''),
          liftedFrom: importPermitData.liftedFrom,
          viaRoute: importPermitData.viaRoute,
          checkpostEntry: importPermitData.checkpostEntry,
          purpose: importPermitData.purpose
        };
        return;
      }
    }

    // Fallback to sample data if not found in localStorage
    const sampleData: RequisitionData[] = [
      {
        id: "1",
        referenceNo: "BF502/EXCISE",
        submissionDate: new Date("2025-09-22"),
        distilleryName: "Sikkim Distilleries Ltd",
        status: "PENDING REVIEW",
        brAmount: 8.0,
        quantity: 1000,
        numberOfPermits: 1,
        bulkSpiritType: "grain-ena",
        strengthTo: "95.5",
        liftedFrom: "sikkim-distilleries",
        viaRoute: "Gangtok - Siliguri Highway",
        checkpostEntry: "rangpo",
        purpose: "manufacturing",
      },
      {
        id: "2",
        referenceNo: "BF503/EXCISE",
        submissionDate: new Date("2025-09-21"),
        distilleryName: "Himalayan Distilleries Pvt Ltd",
        status: "PENDING REVIEW",
        brAmount: 12.5,
        quantity: 1500,
        numberOfPermits: 1,
        bulkSpiritType: "grain-ena",
        strengthTo: "96.0",
        liftedFrom: "himalayan-distilleries",
        viaRoute: "Gangtok - Kalimpong Highway",
        checkpostEntry: "rangpo",
        purpose: "manufacturing",
      },
      {
        id: "3",
        referenceNo: "IBPS/02/EXCISE",
        submissionDate: new Date("2025-09-22"),
        distilleryName: "Sikkim Distilleries Ltd",
        status: "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
        brAmount: 8.0,
        quantity: 1000,
        numberOfPermits: 1,
        bulkSpiritType: "grain-ena",
        strengthTo: "95.5",
        liftedFrom: "sikkim-distilleries",
        viaRoute: "Gangtok - Siliguri Highway",
        checkpostEntry: "rangpo",
        purpose: "manufacturing",
      },
      {
        id: "2",
        referenceNo: "IBPS/06/EXCISE",
        submissionDate: new Date("2025-09-15"),
        distilleryName: "Mount Distilleries Ltd",
        status: "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
        brAmount: 120.0,
        quantity: 15000,
        numberOfPermits: 3,
        bulkSpiritType: "molasses-ena",
        strengthTo: "96.0",
        liftedFrom: "mountain-spirits",
        viaRoute: "National Highway 10",
        checkpostEntry: "melli",
        purpose: "blending",
      },
    ];

    const found = sampleData.find((r) => r.referenceNo === refNo);
    if (found) {
      this.requisitionData = found;
    } else {
      // If not found, redirect back to commissioner dashboard
      this.router.navigate(["/dev-commissioner-dashboard"]);
    }
  }

  goBack(): void {
    this.router.navigate(["/dev-commissioner-dashboard"]);
  }

  printLetter(): void {
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.requisitionData?.referenceNo || '';
    
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
          <p style="margin-bottom: 5px; color: #495057; font-size: 9pt;"><strong>Reference No:</strong> ${this.requisitionData?.referenceNo}</p>
          <p style="margin-bottom: 5px; color: #495057; font-size: 9pt;"><strong>Submission Date:</strong> ${this.requisitionData?.submissionDate ? new Date(this.requisitionData.submissionDate).toLocaleDateString('en-GB') : ''}</p>
          <p style="margin-bottom: 0; color: #495057; font-size: 9pt;"><strong>Distillery:</strong> ${this.requisitionData?.distilleryName}</p>
        </div>
        <div style="flex: 1; background: #f8f9fa; border: 1px solid #dee2e6; border-left: 4px solid #007bff; padding: 15px; border-radius: 6px;">
          <h6 style="color: #007bff; font-weight: 700; font-size: 10pt; margin-bottom: 10px; text-transform: uppercase;">STATUS INFORMATION</h6>
          <p style="margin-bottom: 5px; color: #495057; font-size: 9pt;"><strong>Current Status:</strong></p>
          <div style="background: #28a745; color: white; padding: 4px 8px; font-size: 8pt; font-weight: 600; border-radius: 4px; display: inline-block; margin-bottom: 5px;">
            ${this.requisitionData?.status}
          </div>
          <p style="margin-bottom: 0; color: #495057; font-size: 9pt;"><strong>Amount Paid:</strong> ₹${this.requisitionData?.brAmount}</p>
        </div>
      </div>

      <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);">
        <h5 style="color: #007bff; font-weight: 700; font-size: 11pt; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #007bff; text-transform: uppercase;">IMPORT PERMIT SPECIFICATIONS</h5>
        <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
          <tbody>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600; width: 30%;">Bulk Spirit Type</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.getBulkSpiritTypeName(this.requisitionData?.bulkSpiritType || '')}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Quantity per Permit</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.requisitionData?.quantity} BL</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Number of Permits</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.requisitionData?.numberOfPermits}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Total Quantity</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; color: #28a745; font-weight: 700;">${(this.requisitionData?.quantity || 0) * (this.requisitionData?.numberOfPermits || 0)} BL</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Strength</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.requisitionData?.strengthTo}°</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Purpose</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.getPurposeName(this.requisitionData?.purpose || '')}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Amount Paid</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; color: #007bff; font-weight: 700;">₹${this.requisitionData?.brAmount}</td>
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
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.getDistilleryName(this.requisitionData?.liftedFrom || '')}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Via Route</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.requisitionData?.viaRoute}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #f8f9fa; color: #495057; font-weight: 600;">Checkpost Entry</td>
              <td style="padding: 8px; border: 1px solid #dee2e6;">${this.getCheckpostName(this.requisitionData?.checkpostEntry || '')}</td>
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

  getDistilleryName(code: string): string {
    const distilleryMap: { [key: string]: string } = {
      "sikkim-distilleries": "Sikkim Distilleries Ltd",
      "mount-distilleries": "Mount Distilleries Ltd",
      "mountain-spirits": "Mountain Spirits Pvt Ltd",
      "highland-breweries": "Highland Breweries",
    };
    return distilleryMap[code] || code;
  }

  getBulkSpiritTypeName(code: string): string {
    const typeMap: { [key: string]: string } = {
      "grain-ena": "Grain ENA",
      "molasses-ena": "Molasses ENA",
      "rectified-spirit": "Rectified Spirit",
    };
    return typeMap[code] || code;
  }

  getPurposeName(code: string): string {
    const purposeMap: { [key: string]: string } = {
      manufacturing: "Manufacturing",
      blending: "Blending",
      bottling: "Bottling",
    };
    return purposeMap[code] || code;
  }

  getCheckpostName(code: string): string {
    const checkpostMap: { [key: string]: string } = {
      rangpo: "Rangpo Checkpost",
      melli: "Melli Checkpost",
      "nathu-la": "Nathu La Checkpost",
    };
    return checkpostMap[code] || code;
  }
}
