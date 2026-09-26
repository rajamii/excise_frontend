import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../../environments/environment';

export interface ApplicationFeeSlipDialogData {
  applicationId: string;
  applicantName?: string;
  establishmentName?: string;
  licenseCategoryName?: string;
  licenseSubCategoryName?: string;
  modeOfOperation?: string;
  submittedOn?: string;
  paymentStatus?: string;
  transactionId?: string;
  paymentDate?: string;
  hoa?: string;
  amount?: number;
  sbmApplicationId?: string;
}

@Component({
  selector: 'app-application-fee-slip-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './application-fee-slip-dialog.component.html',
  styleUrls: ['./application-fee-slip-dialog.component.scss']
})
export class ApplicationFeeSlipDialogComponent implements OnInit {
  isLoading = false;
  copiedField: string | null = null;
  readonly watermarkRows = Array.from({ length: 11 }, (_, i) => i + 1);

  slipData: ApplicationFeeSlipDialogData = {
    applicationId: '',
    applicantName: 'N/A',
    establishmentName: 'N/A',
    licenseCategoryName: 'N/A',
    licenseSubCategoryName: '',
    modeOfOperation: 'Self',
    submittedOn: '',
    paymentStatus: 'Successful',
    transactionId: '',
    paymentDate: '',
    hoa: '0039-00-800-45-02',
    amount: 500.00,
    sbmApplicationId: ''
  };

  constructor(
    public dialogRef: MatDialogRef<ApplicationFeeSlipDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ApplicationFeeSlipDialogData,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.slipData = {
        ...this.slipData,
        ...this.data,
        amount: Number(this.data.amount) > 0 ? Number(this.data.amount) : 500.00,
        hoa: this.data.hoa || '0039-00-800-45-02'
      };
    }

    const appId = String(this.data?.applicationId || '').trim();
    if (appId) {
      this.fetchFullApplicationDetails(appId);
    }
  }

  private fetchFullApplicationDetails(appId: string): void {
    this.isLoading = true;
    const encoded = encodeURIComponent(appId);
    this.http.get<any>(`${environment.apiBaseUrl}/transactional/new_license_application/detail/${encoded}/`).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (!res) return;

        const applicantName = res.applicant_name ||
          (res.applicant ? `${res.applicant.first_name || ''} ${res.applicant.last_name || ''}`.trim() || res.applicant.username : '') ||
          this.slipData.applicantName;

        const categoryName = res.license_category_name ||
          res.license_category?.license_category ||
          res.license_category?.name ||
          this.slipData.licenseCategoryName;

        const subCategoryName = res.license_sub_category_name ||
          res.license_sub_category?.description ||
          res.license_sub_category?.name ||
          this.slipData.licenseSubCategoryName;

        const txnId = res.application_fee_transaction_id ||
          res.transaction_id ||
          this.slipData.transactionId;

        const pDate = res.application_fee_payment_date ||
          res.payment_date ||
          res.created_at ||
          this.slipData.paymentDate;

        this.slipData = {
          ...this.slipData,
          applicantName: applicantName || 'N/A',
          establishmentName: res.establishment_name || this.slipData.establishmentName || 'N/A',
          licenseCategoryName: categoryName || 'N/A',
          licenseSubCategoryName: subCategoryName || '',
          modeOfOperation: res.mode_of_operation || this.slipData.modeOfOperation || 'Self',
          transactionId: txnId || this.slipData.transactionId || 'FORCE-NLI-' + appId.replace(/[^a-zA-Z0-9]/g, ''),
          paymentDate: pDate || this.slipData.paymentDate || this.slipData.submittedOn || new Date().toISOString(),
          sbmApplicationId: res.sbm_application_id || this.slipData.sbmApplicationId || ''
        };
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  copyToClipboard(text: string, field: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedField = field;
      setTimeout(() => {
        if (this.copiedField === field) {
          this.copiedField = null;
        }
      }, 2000);
    }).catch(() => {});
  }

  printSlip(): void {
    const frameEl = document.getElementById('printableSlipFrame') || document.getElementById('printableSlipCard');
    if (!frameEl) {
      window.print();
      return;
    }

    const printHtml = frameEl.outerHTML;

    // Create an isolated hidden iframe for 100% reliable printing without blank page issues
    let printIframe = document.getElementById('slipPrintIframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'slipPrintIframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);
    }

    const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${this.slipData.applicationId}</title>
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #0f172a;
          }
          body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 18mm 16mm;
          }
          .no-print {
            display: none !important;
          }
          
          /* 4-Border Framed Official Printable Slip Card centered on page */
          .slip-card-frame {
            width: 100%;
            max-width: 680px;
            margin: 0 auto;
            padding: 5px;
            background: #ffffff;
            border: 3px solid #0f766e;
            border-radius: 4px;
            box-sizing: border-box;
          }

          .slip-card {
            position: relative;
            background: #ffffff;
            border: 1.5px solid #14b8a6;
            padding: 20px 24px;
            border-radius: 3px;
            overflow: hidden;
          }

          /* Straight-Line Watermark Across Entire Page */
          .watermark-grid {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 15px 0;
            opacity: 0.055;
            user-select: none;
          }
          .watermark-row {
            display: flex;
            align-items: center;
            justify-content: space-around;
            white-space: nowrap;
            font-size: 11px;
            font-weight: 800;
            color: #0f766e;
            letter-spacing: 3px;
            text-transform: uppercase;
            transform: none !important;
          }
          .watermark-row .dot {
            font-size: 12px;
            opacity: 0.7;
          }

          /* Header */
          .slip-header {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .gov-crest {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #0f766e;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          }
          .header-titles {
            text-align: center;
            flex: 1;
          }
          .gov-title {
            margin: 0;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 1px;
            color: #0f172a;
          }
          .dept-title {
            margin: 2px 0 0;
            font-size: 14px;
            font-weight: 800;
            color: #0f766e;
            letter-spacing: 0.5px;
          }
          .portal-sub {
            margin: 2px 0 5px;
            font-size: 11.5px;
            color: #475569;
            font-weight: 600;
          }
          .slip-type-badge {
            display: inline-block;
            padding: 3px 12px;
            background: #f0fdfa;
            border: 1px solid #0f766e;
            border-radius: 20px;
            font-size: 10.5px;
            font-weight: 800;
            color: #0f766e;
            letter-spacing: 0.5px;
          }

          /* Payment Status Banner */
          .payment-status-banner {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f0fdf4;
            border: 1.5px solid #16a34a;
            border-radius: 6px;
            padding: 9px 14px;
            margin-bottom: 14px;
          }
          .status-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .status-seal {
            font-size: 24px;
            color: #16a34a;
          }
          .status-title {
            font-size: 14px;
            font-weight: 900;
            color: #15803d;
            letter-spacing: 0.5px;
          }
          .status-subtitle {
            font-size: 11.5px;
            color: #166534;
            font-weight: 600;
          }
          .amount-pill {
            background: #15803d;
            color: #ffffff;
            padding: 5px 12px;
            border-radius: 6px;
            font-weight: 900;
            font-size: 17px;
          }

          /* Details Grid */
          .info-section {
            position: relative;
            z-index: 1;
            margin-bottom: 14px;
          }
          .section-title {
            font-size: 12.5px;
            font-weight: 800;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
          }
          .details-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px 16px;
          }
          .grid-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .grid-item--full {
            grid-column: 1 / -1;
          }
          .item-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.3px;
          }
          .item-value {
            font-size: 12.5px;
            color: #0f172a;
            font-weight: 700;
          }
          .mono {
            font-family: Consolas, monospace;
          }
          .highlight-code {
            color: #0f766e;
          }

          /* Fee Table */
          .fee-table-container {
            position: relative;
            z-index: 1;
            margin-bottom: 14px;
          }
          .fee-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
          }
          .fee-table th, .fee-table td {
            padding: 7px 9px;
            border: 1px solid #cbd5e1;
          }
          .fee-table thead th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 10.5px;
          }
          .total-row td {
            background: #f8fafc;
            border-top: 2px solid #0f766e;
          }
          .total-label {
            font-weight: 800;
            color: #0f172a;
            font-size: 12.5px;
          }
          .total-amount {
            font-size: 14px;
            font-weight: 900;
            color: #15803d;
          }
          .amount-in-words {
            margin-top: 5px;
            padding: 5px 8px;
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 4px;
            font-size: 11px;
            color: #334155;
          }

          /* Footer */
          .slip-footer {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1.5px solid #cbd5e1;
            padding-top: 10px;
            gap: 14px;
          }
          .terms-text {
            margin: 0;
            font-size: 10px;
            color: #64748b;
            line-height: 1.4;
          }
          .digital-seal {
            width: 76px;
            height: 76px;
            border: 2px dashed #0f766e;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #0f766e;
            font-size: 16px;
          }
          .digital-seal span {
            font-size: 7px;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .digital-seal small {
            font-size: 6px;
            font-weight: 700;
            color: #475569;
          }
        </style>
      </head>
      <body>
        ${printHtml}
      </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    }, 400);
  }

  close(): void {
    this.dialogRef.close();
  }
}
