import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentIntegrationService } from '../../../../../core/services/payment-integration.service';
import { SupplyChainProfileService } from '../../../../../core/services/supply-chain-profile.service';

interface Transaction {
  id: string;
  transactionId: string;
  amount: number;
  payerId: string;
  category: string;
  responseId: string;
  paymentDate: Date;
  paymentMethod: string;
  status: string;
}

interface ReceiptData {
  payerId: string;
  transactionId: string;
  category: string;
  transactionAmount: number;
  responseId: string;
  paymentDate: Date;
  amountPaid: number;
  paymentMethod: string;
}

@Component({
  selector: 'app-payment-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-receipt.component.html',
  styleUrls: ['./payment-receipt.component.scss']
})
export class PaymentReceiptComponent implements OnInit {
  paymentStatus = 'Status: Payment Successful';
  paymentDateTime = new Date();
  selectedTransactionId = '';
  transactionMessage = '';
  billNo = '';
  activeLicenseeId = '';

  transactions: Transaction[] = [];

  // Current receipt data
  receiptData: ReceiptData = {
    payerId: '-',
    transactionId: '-',
    category: 'Transit Permit Payment',
    transactionAmount: 0,
    responseId: '-',
    paymentDate: new Date(),
    amountPaid: 0,
    paymentMethod: 'Wallet'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentIntegrationService: PaymentIntegrationService,
    private supplyChainProfileService: SupplyChainProfileService
  ) {}

  ngOnInit(): void {
    // Check for query parameters
    this.route.queryParams.subscribe(params => {
      this.selectedTransactionId = String(params['transactionId'] || '').trim();
      this.billNo = String(params['billNo'] || '').trim();
      this.loadLiveReceiptData();
    });

    // Set current date/time
    this.paymentDateTime = new Date();
  }

  onTransactionChange(): void {
    if (this.selectedTransactionId) {
      this.loadTransactionData(this.selectedTransactionId);
    }
  }

  loadTransactionData(transactionId: string): void {
    const transaction = this.transactions.find(t => t.id === transactionId);
    if (transaction) {
      this.receiptData = {
        payerId: transaction.payerId,
        transactionId: transaction.transactionId,
        category: transaction.category,
        transactionAmount: transaction.amount,
        responseId: transaction.responseId,
        paymentDate: transaction.paymentDate,
        amountPaid: transaction.amount,
        paymentMethod: transaction.paymentMethod
      };

      // Update status based on transaction
      this.paymentStatus = `Status: Payment ${transaction.status}`;
      
      // Set transaction message if needed
      if (transaction.status === 'Success') {
        this.transactionMessage = 'Your payment has been processed successfully. Please keep this receipt for your records.';
      }
    }
  }

  private loadLiveReceiptData(): void {
    this.supplyChainProfileService.getProfile().subscribe({
      next: (profileRes: any) => {
        const profile = profileRes?.data || {};
        this.activeLicenseeId = String(profile.licensee_id || profile.licenseeId || '').trim();
        if (!this.activeLicenseeId) {
          this.paymentStatus = 'Status: Payment Data Unavailable';
          this.transactionMessage = 'Active license/profile not found. Unable to fetch wallet transaction receipt.';
          return;
        }
        this.fetchWalletHistoryAndBuildReceipt();
      },
      error: () => {
        this.paymentStatus = 'Status: Payment Data Unavailable';
        this.transactionMessage = 'Unable to load profile. Please login again and retry.';
      }
    });
  }

  private fetchWalletHistoryAndBuildReceipt(): void {
    this.paymentIntegrationService.getWalletHistory(this.activeLicenseeId, 500).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.results) ? res.results : [];
        const transitRows = rows.filter((row: any) =>
          String(row.source_module || row.sourceModule || '').toLowerCase() === 'transit_permit'
        );

        if (this.billNo) {
          const billRows = transitRows.filter((row: any) =>
            String(row.reference_no || row.referenceNo || '').trim() === this.billNo
          );

          if (billRows.length > 0) {
            const totalPaid = billRows.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
            const latest = billRows.sort((a: any, b: any) => {
              const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
              const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
              return bTime - aTime;
            })[0];

            this.receiptData = {
              payerId: this.activeLicenseeId,
              transactionId: `TP-${this.billNo}`,
              category: 'Transit Permit Wallet Deduction',
              transactionAmount: totalPaid,
              responseId: String(latest.transaction_id || latest.transactionId || latest.wallet_transaction_id || '-'),
              paymentDate: new Date(latest.created_at || latest.createdAt || new Date()),
              amountPaid: totalPaid,
              paymentMethod: 'Wallet'
            };

            this.transactions = billRows.map((row: any, idx: number) => ({
              id: String(row.wallet_transaction_id || row.walletTransactionId || `${idx + 1}`),
              transactionId: String(row.transaction_id || row.transactionId || `TP-${this.billNo}`),
              amount: Number(row.amount || 0),
              payerId: this.activeLicenseeId,
              category: String(row.wallet_type || row.walletType || 'wallet').toUpperCase(),
              responseId: String(row.reference_no || row.referenceNo || this.billNo),
              paymentDate: new Date(row.created_at || row.createdAt || new Date()),
              paymentMethod: 'Wallet',
              status: 'Success'
            }));

            this.paymentStatus = 'Status: Payment Successful';
            this.transactionMessage = `Payment completed for transit permit ${this.billNo}. Application forwarded to Officer In-Charge for approval.`;
            return;
          }
        }

        this.transactions = transitRows.map((row: any, idx: number) => ({
          id: String(row.wallet_transaction_id || row.walletTransactionId || `${idx + 1}`),
          transactionId: String(row.transaction_id || row.transactionId || `TP-${idx + 1}`),
          amount: Number(row.amount || 0),
          payerId: String(row.licensee_id || row.licenseeId || this.activeLicenseeId),
          category: String(row.wallet_type || row.walletType || 'wallet').toUpperCase(),
          responseId: String(row.reference_no || row.referenceNo || '-'),
          paymentDate: new Date(row.created_at || row.createdAt || new Date()),
          paymentMethod: 'Wallet',
          status: 'Success'
        }));

        if (this.transactions.length > 0) {
          const selected = this.selectedTransactionId || this.transactions[0].id;
          this.selectedTransactionId = selected;
          this.loadTransactionData(selected);
        } else {
          this.paymentStatus = 'Status: Payment Data Unavailable';
          this.transactionMessage = 'No transit wallet payment transaction found for this profile.';
        }
      },
      error: () => {
        this.paymentStatus = 'Status: Payment Data Unavailable';
        this.transactionMessage = 'Unable to load wallet history for receipt.';
      }
    });
  }

  printReceipt(): void {
    window.print();
  }

  downloadReceipt(): void {
    // Create a printable version and trigger download
    const printContent = document.querySelector('.receipt-container')?.innerHTML;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Payment Receipt - ${this.receiptData.transactionId}</title>
              <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt-container { max-width: 800px; margin: 0 auto; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="receipt-container">
                <div class="text-center mb-4">
                  <h2>Excise Department</h2>
                  <h3>Payment Receipt</h3>
                </div>
                ${printContent}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  }

  backToHome(): void {
    // Navigate back to payment confirmation page
    this.router.navigate(['/dashboard'], {
      queryParams: { section: 'transit' }
    });
  }
}
