import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../../environments/environment';

export interface FeeTransactionItem {
  utr?: string;
  transaction_id?: string;
  transactionId?: string;
  payment_status?: string; // 'S' | 'F' | 'P'
  paymentStatus?: string;
  status_label?: string; // 'Successful' | 'Failed' | 'Pending'
  statusLabel?: string;
  amount?: number;
  transaction_date?: string;
  transactionDate?: string;
  error_description?: string;
  errorDescription?: string;
  bank_ref_no?: string;
  bankRefNo?: string;
}

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
  errorDescription?: string;
  transactions?: FeeTransactionItem[];
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

  transactions: FeeTransactionItem[] = [];
  selectedTxnIndex = 0;

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
    sbmApplicationId: '',
    errorDescription: '',
    transactions: []
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
      if (Array.isArray(this.data.transactions) && this.data.transactions.length > 0) {
        this.transactions = this.data.transactions;
        this.selectTransaction(0);
      }
    }

    const appId = String(this.data?.applicationId || '').trim();
    if (appId) {
      this.fetchFullApplicationDetails(appId);
    }
  }

  get isFailed(): boolean {
    const s = String(this.slipData.paymentStatus || '').toLowerCase();
    return s === 'failed' || s === 'f';
  }

  get isPending(): boolean {
    const s = String(this.slipData.paymentStatus || '').toLowerCase();
    return s === 'pending' || s === 'p';
  }

  get isSuccessful(): boolean {
    return !this.isFailed && !this.isPending;
  }

  isTxnSuccess(tx: any): boolean {
    if (!tx) return false;
    const s = String(tx.paymentStatus || tx.payment_status || tx.status || '').trim().toUpperCase();
    const l = String(tx.statusLabel || tx.status_label || tx.status || '').trim().toLowerCase();
    const utr = String(tx.utr || tx.transactionId || tx.transaction_id || '').trim().toUpperCase();
    if (s === 'S' || l.includes('success')) return true;
    if (utr.startsWith('FORCE-NLI-') || (utr.includes('FORCE') && !utr.includes('FAIL') && !utr.includes('PEND'))) return true;
    return false;
  }

  isTxnPending(tx: any): boolean {
    if (!tx) return false;
    const s = String(tx.paymentStatus || tx.payment_status || tx.status || '').trim().toUpperCase();
    const l = String(tx.statusLabel || tx.status_label || tx.status || '').trim().toLowerCase();
    const utr = String(tx.utr || tx.transactionId || tx.transaction_id || '').trim().toUpperCase();
    if (s === 'P' || l.includes('pend')) return true;
    if (utr.includes('PEND')) return true;
    return false;
  }

  isTxnFailed(tx: any): boolean {
    return !this.isTxnSuccess(tx) && !this.isTxnPending(tx);
  }

  getTxnStatusLabel(tx: any): string {
    if (this.isTxnSuccess(tx)) return 'Successful';
    if (this.isTxnPending(tx)) return 'Pending';
    return 'Failed';
  }

  selectTransaction(index: number): void {
    if (index < 0 || index >= this.transactions.length) return;
    this.selectedTxnIndex = index;
    const tx: any = this.transactions[index];
    const isSuccess = this.isTxnSuccess(tx);
    const isPend = this.isTxnPending(tx);
    const statusLabel = isSuccess ? 'Successful' : (isPend ? 'Pending' : 'Failed');
    const txnDate = tx?.transactionDate || tx?.transaction_date || this.slipData.paymentDate;
    const txnId = tx?.transactionId || tx?.transaction_id || tx?.utr || this.slipData.transactionId;
    const errDesc = tx?.errorDescription || tx?.error_description || '';

    this.slipData = {
      ...this.slipData,
      transactionId: txnId,
      paymentStatus: statusLabel,
      paymentDate: txnDate,
      amount: Number(tx?.amount) > 0 ? Number(tx.amount) : 500.00,
      errorDescription: isSuccess ? '' : errDesc
    };
  }

  private fetchFullApplicationDetails(appId: string): void {
    this.isLoading = true;
    const encoded = encodeURIComponent(appId);
    const base = String(environment.apiBaseUrl || '').replace(/\/+$/, '');
    this.http.get<any>(`${base}/transactional/new_license_application/detail/${encoded}/`).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (!res) return;

        const applicantName = res.applicantName || res.applicant_name ||
          (res.applicant ? `${res.applicant.first_name || ''} ${res.applicant.last_name || ''}`.trim() || res.applicant.username : '') ||
          this.slipData.applicantName;

        const categoryName = res.licenseCategoryName || res.license_category_name ||
          res.licenseCategory?.name || res.license_category?.license_category ||
          res.license_category?.name ||
          this.slipData.licenseCategoryName;

        const subCategoryName = res.licenseSubCategoryName || res.license_sub_category_name ||
          res.licenseSubCategory?.name || res.license_sub_category?.description ||
          res.license_sub_category?.name ||
          this.slipData.licenseSubCategoryName;

        const txnId = res.applicationFeeTransactionId || res.application_fee_transaction_id ||
          res.transactionId || res.transaction_id ||
          this.slipData.transactionId;

        const pDate = res.applicationFeePaymentDate || res.application_fee_payment_date ||
          res.paymentDate || res.payment_date ||
          res.createdAt || res.created_at ||
          this.slipData.paymentDate;

        const rawTxns = res.applicationFeeTransactions || res.application_fee_transactions || [];
        if (Array.isArray(rawTxns) && rawTxns.length > 0) {
          this.transactions = rawTxns;
        }

        const rawFeeStatus = String(
          res.applicationFeePaymentStatus ||
          res.application_fee_payment_status ||
          res.paymentStatus ||
          res.payment_status ||
          ''
        ).trim().toUpperCase();

        const isFeeSuccess = rawFeeStatus === 'S' || rawFeeStatus.includes('SUCCESS') || Boolean(res.isApplicationFeePaid ?? res.is_application_fee_paid);
        const isFeePending = rawFeeStatus === 'P' || rawFeeStatus.includes('PEND');
        const normalizedStatus = isFeeSuccess ? 'Successful' : (isFeePending ? 'Pending' : 'Failed');

        this.slipData = {
          ...this.slipData,
          applicantName: applicantName || 'N/A',
          establishmentName: res.establishmentName || res.establishment_name || this.slipData.establishmentName || 'N/A',
          licenseCategoryName: categoryName || 'N/A',
          licenseSubCategoryName: subCategoryName || '',
          modeOfOperation: res.modeOfOperation || res.mode_of_operation || this.slipData.modeOfOperation || 'Self',
          transactionId: txnId || this.slipData.transactionId || 'FORCE-NLI-' + appId.replace(/[^a-zA-Z0-9]/g, ''),
          paymentStatus: normalizedStatus,
          paymentDate: pDate || this.slipData.paymentDate || this.slipData.submittedOn || new Date().toISOString(),
          sbmApplicationId: res.sbmApplicationId || res.sbm_application_id || this.slipData.sbmApplicationId || '',
          errorDescription: (normalizedStatus === 'Successful' ? '' : (res.applicationFeeError || res.application_fee_error || ''))
        };

        // If transactions exist, select the current or latest attempt
        if (this.transactions.length > 0) {
          const idxToSelect = (this.selectedTxnIndex >= 0 && this.selectedTxnIndex < this.transactions.length) ? this.selectedTxnIndex : 0;
          this.selectTransaction(idxToSelect);
        }
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
          /* Frame and Card variants */
          .slip-card-frame.frame-failed {
            border-color: #dc2626 !important;
          }
          .slip-card.card-failed {
            border-color: #f87171 !important;
          }
          .slip-card-frame.frame-pending {
            border-color: #d97706 !important;
          }
          .slip-card.card-pending {
            border-color: #fbbf24 !important;
          }
          .watermark--failed .watermark-row {
            color: #dc2626 !important;
          }
          .watermark--pending .watermark-row {
            color: #d97706 !important;
          }

          /* Badges */
          .slip-type-badge.badge-failed {
            background: #fef2f2 !important;
            border-color: #dc2626 !important;
            color: #dc2626 !important;
          }
          .slip-type-badge.badge-pending {
            background: #fffbeb !important;
            border-color: #d97706 !important;
            color: #d97706 !important;
          }

          /* Status Banner Variants */
          .payment-status-banner.status-banner--failed {
            background: #fef2f2 !important;
            border-color: #dc2626 !important;
          }
          .status-banner--failed .status-seal {
            color: #dc2626 !important;
          }
          .status-banner--failed .status-title {
            color: #991b1b !important;
          }
          .status-banner--failed .status-subtitle {
            color: #b91c1c !important;
          }
          .amount-pill--failed {
            background: #dc2626 !important;
          }

          .payment-status-banner.status-banner--pending {
            background: #fffbeb !important;
            border-color: #d97706 !important;
          }
          .status-banner--pending .status-seal {
            color: #d97706 !important;
          }
          .status-banner--pending .status-title {
            color: #92400e !important;
          }
          .status-banner--pending .status-subtitle {
            color: #b45309 !important;
          }
          .amount-pill--pending {
            background: #d97706 !important;
          }

          /* Notice Box */
          .slip-notice-box {
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 12px;
            font-size: 11px;
            line-height: 1.4;
          }
          .slip-notice-box.notice-failed {
            background: #fef2f2 !important;
            border: 1.5px solid #fca5a5 !important;
            color: #991b1b !important;
          }
          .slip-notice-box.notice-failed .notice-head {
            font-weight: 800;
            margin-bottom: 3px;
            color: #dc2626 !important;
          }
          .slip-notice-box.notice-pending {
            background: #fffbeb !important;
            border: 1.5px solid #fde68a !important;
            color: #92400e !important;
          }
          .slip-notice-box.notice-pending .notice-head {
            font-weight: 800;
            margin-bottom: 3px;
            color: #d97706 !important;
          }

          .total-row--failed .total-amount {
            color: #dc2626 !important;
          }
          .total-row--pending .total-amount {
            color: #d97706 !important;
          }

          /* Dynamic Seal */
          .digital-seal.seal-failed {
            border-color: #dc2626 !important;
            color: #dc2626 !important;
          }
          .digital-seal.seal-pending {
            border-color: #d97706 !important;
            color: #d97706 !important;
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
