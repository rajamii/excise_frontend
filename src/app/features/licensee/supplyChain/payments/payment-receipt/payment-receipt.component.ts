import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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

  // Sample transactions data
  transactions: Transaction[] = [
    {
      id: '1',
      transactionId: 'BILLDESK000000000000000000584',
      amount: 1.00,
      payerId: '01/2025/0012',
      category: 'Import Permit Fee',
      responseId: 'RES001234567890',
      paymentDate: new Date('2025-09-03T15:23:26'),
      paymentMethod: 'Direct Banking',
      status: 'Success'
    },
    {
      id: '2',
      transactionId: 'BILLDESK000000000000000000585',
      amount: 500.00,
      payerId: '01/2025/0013',
      category: 'Excise Duty',
      responseId: 'RES001234567891',
      paymentDate: new Date('2025-09-03T14:15:30'),
      paymentMethod: 'Net Banking',
      status: 'Success'
    }
  ];

  // Current receipt data
  receiptData: ReceiptData = {
    payerId: '01/2025/0012',
    transactionId: 'BILLDESK000000000000000000584',
    category: 'Import Permit Fee',
    transactionAmount: 1.00,
    responseId: 'RES001234567890',
    paymentDate: new Date('2025-09-03T15:23:26'),
    amountPaid: 1.00,
    paymentMethod: 'Direct Banking'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check for query parameters
    this.route.queryParams.subscribe(params => {
      if (params['transactionId']) {
        this.selectedTransactionId = params['transactionId'];
        this.loadTransactionData(params['transactionId']);
      } else {
        // Load default transaction (first one)
        if (this.transactions.length > 0) {
          this.selectedTransactionId = this.transactions[0].id;
          this.loadTransactionData(this.transactions[0].id);
        }
      }
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
    this.router.navigate(['/dev-payment-confirmation']);
  }
}