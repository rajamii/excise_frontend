import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface PaymentTransaction {
  id: string;
  refNo: string;
  type: 'REQUISITION' | 'REVALIDATION' | 'CANCELLATION' | 'TRANSIT' | 'HOLOGRAM';
  companyName: string;
  date: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
  status: string;
}

@Component({
  selector: 'app-payslip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payslip.component.html',
  styleUrl: './payslip.component.scss'
})
export class PayslipComponent implements OnInit {
  refNo: string = '';
  type: string = '';
  paymentData: PaymentTransaction | null = null;
  private isBrowser = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Get ref number and type from query params
    this.route.queryParams.subscribe(params => {
      this.refNo = params['ref'] || '';
      this.type = params['type'] || '';
      
      if (this.refNo && this.type) {
        this.loadPaymentData();
      }
    });
  }

  private loadPaymentData(): void {
    if (!this.isBrowser) return;

    // Load payment data based on type
    switch (this.type.toUpperCase()) {
      case 'HOLOGRAM':
        this.loadHologramPayment();
        break;
      case 'REQUISITION':
        this.loadRequisitionPayment();
        break;
      case 'REVALIDATION':
        this.loadRevalidationPayment();
        break;
      case 'CANCELLATION':
        this.loadCancellationPayment();
        break;
      case 'TRANSIT':
        this.loadTransitPayment();
        break;
      default:
        console.error('Unknown payment type:', this.type);
    }
  }

  private loadHologramPayment(): void {
    // Load from hologramPaymentTransactions
    const transactions = JSON.parse(localStorage.getItem('hologramPaymentTransactions') || '[]');
    const transaction = transactions.find((t: any) => t.hologramRefNo === this.refNo);

    if (transaction) {
      this.paymentData = {
        id: transaction.transactionId,
        refNo: transaction.hologramRefNo,
        type: 'HOLOGRAM',
        companyName: transaction.companyName,
        date: transaction.hologramDate,
        amount: transaction.walletPaymentAmount,
        paymentDate: transaction.paymentDate,
        paymentMethod: 'Wallet Payment',
        transactionId: transaction.transactionId,
        status: transaction.status
      };
    } else {
      // Fallback: check hologramRequests for payment info
      const requests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      const request = requests.find((r: any) => r.refNo === this.refNo && r.paymentCompleted);
      
      if (request) {
        this.paymentData = {
          id: request.refNo,
          refNo: request.refNo,
          type: 'HOLOGRAM',
          companyName: request.companyName || 'Yuksom Breweries Ltd.',
          date: request.date,
          amount: this.calculateHologramAmount(request),
          paymentDate: request.paymentDate || new Date().toISOString(),
          paymentMethod: 'Wallet Payment',
          transactionId: `TXN-${request.refNo}-${Date.now()}`,
          status: 'Completed'
        };
      }
    }
  }

  private calculateHologramAmount(request: any): number {
    const totalQty = (request.localQtyLakh || 0) + (request.exportQtyLakh || 0) + (request.defenceQtyLakh || 0);
    return totalQty * 0.15; // Wallet payment rate
  }

  private loadRequisitionPayment(): void {
    // TODO: Implement requisition payment loading
    console.log('Loading requisition payment for:', this.refNo);
  }

  private loadRevalidationPayment(): void {
    // TODO: Implement revalidation payment loading
    console.log('Loading revalidation payment for:', this.refNo);
  }

  private loadCancellationPayment(): void {
    // TODO: Implement cancellation payment loading
    console.log('Loading cancellation payment for:', this.refNo);
  }

  private loadTransitPayment(): void {
    // TODO: Implement transit payment loading
    console.log('Loading transit payment for:', this.refNo);
  }

  getTypeLabel(): string {
    switch (this.type.toUpperCase()) {
      case 'HOLOGRAM': return 'Hologram Procurement';
      case 'REQUISITION': return 'Import Permit Requisition';
      case 'REVALIDATION': return 'Permit Revalidation';
      case 'CANCELLATION': return 'Permit Cancellation';
      case 'TRANSIT': return 'Transit Permit';
      default: return this.type;
    }
  }

  getTypeIcon(): string {
    switch (this.type.toUpperCase()) {
      case 'HOLOGRAM': return 'bi-qr-code';
      case 'REQUISITION': return 'bi-file-text';
      case 'REVALIDATION': return 'bi-arrow-repeat';
      case 'CANCELLATION': return 'bi-x-circle';
      case 'TRANSIT': return 'bi-truck';
      default: return 'bi-receipt';
    }
  }

  printSlip(): void {
    // Get only the slip content
    const slipContent = document.querySelector('.slip-card');
    if (!slipContent) {
      alert('Payment slip content not found');
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups to print the slip');
      return;
    }

    // Write the slip content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Slip - ${this.paymentData?.refNo}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 0.4in;
            }
            
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: white;
              color: #000;
              line-height: 1.2;
              font-size: 12px;
            }
            
            .slip-card {
              max-width: 100%;
              width: 100%;
              margin: 0;
              padding: 0.8rem;
              border: 3px solid #000;
              background: white;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            
            .gov-header {
              text-align: center;
              margin-bottom: 0.7rem;
            }
            
            .seal-image {
              height: 40px;
              width: auto;
              margin-bottom: 0.3rem;
            }
            
            .gov-title {
              font-size: 1rem;
              font-weight: bold;
              margin-bottom: 0.15rem;
            }
            
            .dept-title {
              font-size: 0.9rem;
              font-weight: bold;
              margin-bottom: 0.15rem;
            }
            
            .location {
              font-size: 0.8rem;
              color: #333;
            }
            
            .divider {
              border: none;
              height: 1px;
              background: #000;
              margin: 0.5rem 0;
            }
            
            .slip-title {
              text-align: center;
              margin-bottom: 1rem;
              padding-bottom: 0.5rem;
              border-bottom: 1px solid #ddd;
            }
            
            .slip-title h4 {
              font-size: 1rem;
              margin-bottom: 0.3rem;
              text-decoration: underline;
            }
            
            .slip-title p {
              font-size: 0.85rem;
              margin: 0;
              font-weight: bold;
              text-decoration: underline;
              color: #000;
            }
            
            .detail-group {
              margin-bottom: 0.5rem;
              display: flex;
              align-items: center;
              padding: 0.2rem 0;
            }
            
            .detail-label {
              font-weight: 600;
              color: #555;
              min-width: 140px;
              margin-right: 0.8rem;
              text-decoration: underline;
              font-size: 0.85rem;
            }
            
            .detail-value {
              color: #000;
              font-weight: 600;
              font-size: 0.85rem;
            }
            
            /* Add visual separation between detail sections */
            .row:not(:last-child) {
              border-bottom: 1px solid #f0f0f0;
              padding-bottom: 0.3rem;
            }
            
            .amount-box {
              border: 3px solid #000;
              padding: 0.8rem;
              margin: 1rem 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: white;
            }
            
            .amount-label {
              font-weight: 700;
              font-size: 0.95rem;
            }
            
            .amount-value {
              font-weight: 700;
              font-size: 1.2rem;
            }
            
            .section-title {
              font-size: 0.8rem;
              font-weight: 600;
              margin-bottom: 0.3rem;
            }
            
            .table {
              width: 100%;
              border-collapse: collapse;
              margin: 0.4rem 0;
              font-size: 0.8rem;
            }
            
            .table th,
            .table td {
              border: 1px solid #000;
              padding: 0.3rem 0.4rem;
              text-align: left;
            }
            
            .table th {
              background: #f0f0f0;
              font-weight: bold;
            }
            

            
            .text-end {
              text-align: right;
            }
            
            .alert {
              background: #d1ecf1;
              border: 1px solid #bee5eb;
              padding: 0.3rem;
              margin: 0.4rem 0;
              border-radius: 3px;
              font-size: 0.7rem;
              line-height: 1.3;
            }
            
            .slip-footer {
              margin-top: 0.8rem;
            }
            
            .slip-footer .row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            
            .slip-footer .col-6 {
              flex: 0 0 45%;
            }
            
            .slip-footer .col-6:last-child {
              text-align: right;
            }
            
            .signature-section {
              display: block;
              width: 100%;
            }
            
            .signature-line {
              border-bottom: 2px solid #000;
              margin: 0.8rem 0 0.3rem 0;
              width: 120px;
            }
            
            .slip-footer .col-6:last-child .signature-line {
              margin-left: auto;
              margin-right: 0;
            }
            
            .text-center {
              text-align: center;
            }
            
            .border-top {
              border-top: 1px solid #000;
              margin-top: 0.5rem;
              padding-top: 0.3rem;
            }
            
            .badge {
              background: #28a745;
              color: white;
              padding: 0.1rem 0.3rem;
              border-radius: 2px;
              font-size: 0.7rem;
            }
            
            .row {
              display: flex;
              margin-bottom: 0.5rem;
            }
            
            .col-md-6 {
              flex: 0 0 50%;
              padding-right: 0.5rem;
            }
            
            .col-12 {
              flex: 0 0 100%;
              margin-bottom: 0.3rem;
            }
            
            .payment-details {
              margin-bottom: 0.8rem;
            }
            
            .small {
              font-size: 0.65rem;
              line-height: 1.2;
            }
            
            .mb-0 {
              margin-bottom: 0;
            }
            
            .mb-1 {
              margin-bottom: 0.1rem;
            }
            
            .mb-2 {
              margin-bottom: 0.2rem;
            }
            
            .mb-3 {
              margin-bottom: 0.3rem;
            }
            
            .text-muted {
              color: #666;
            }
            
            .fw-bold {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${slipContent.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  }

  downloadSlip(): void {
    // Generate and download slip as PDF (simplified version)
    alert('Download functionality will be implemented with PDF generation library');
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain'], {
      queryParams: { tab: this.type.toLowerCase() }
    });
  }
}
