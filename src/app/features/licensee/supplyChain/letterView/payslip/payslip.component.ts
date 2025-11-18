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
    window.print();
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
