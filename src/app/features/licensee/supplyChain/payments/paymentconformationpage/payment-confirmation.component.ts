import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface PaymentItem {
  id: string;
  referenceNo: string;
  amount: number;
  hoa: string;
  status: string;
}

interface TransitItem {
  id: string;
  billNumber: string;
  serialNo: string;
  quantity: number;
  portions: number;
  nips: string;
  licenseeId: string;
  status: string;
  paymentDate: Date | null;
  totalAmount: number;
}

interface RechargeItem {
  id: string;
  transactionType: string;
  hoa: string;
  amount: number;
  date: Date;
  status: string;
}

interface HistoryItem {
  id: string;
  txnId: string;
  userId: string;
  type: string;
  amount: number;
  reference: string;
  status: string;
  dateTime: Date;
  licenseeId: string;
}

@Component({
  selector: 'app-payment-confirmation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-confirmation.component.html',
  styleUrls: ['./payment-confirmation.component.scss']
})
export class PaymentConfirmationComponent implements OnInit {
  activeTab = 'requisition';
  isBreweryUser = false;
  showRetryButton = false;
  showTransitPayment = false;
  selectedItem: PaymentItem | null = null;

  // Wallet Balances
  exciseWalletBalance = 9831806.35;
  breweryWalletBalance = 0;
  educationCessBalance = 9998687.78;

  // Transit Data
  transitBillNo = '';
  transitTotalAmount = 0;
  transitEducationCess = 0;
  transitExciseDuty = 0;
  transitAdditionalExcise = 0;
  transitItemCount = 0;
  transitBillStatus = 'Ready for Payment';

  // Sample Data
  requisitionData: PaymentItem[] = [
    {
      id: '1',
      referenceNo: 'IBPS/03/EXCISE',
      amount: 8.00,
      hoa: '0039-00-105-45-01',
      status: 'Approved'
    }
  ];

  revalidationData: PaymentItem[] = [
    {
      id: '2',
      referenceNo: 'REV/001/2025',
      amount: 15.50,
      hoa: '0039-00-105-45-02',
      status: 'ApprovedRevalidationByCommissioner'
    }
  ];

  cancellationData: PaymentItem[] = [
    {
      id: '3',
      referenceNo: 'CAN/001/2025',
      amount: 25.00,
      hoa: '0039-00-105-45-03',
      status: 'ApprovedCancellationByCommissioner'
    }
  ];

  transitData: TransitItem[] = [
    {
      id: '4',
      billNumber: 'BILL001',
      serialNo: 'SER001',
      quantity: 100,
      portions: 10,
      nips: 'NIPS001',
      licenseeId: 'LIC001',
      status: 'Ready for Payment',
      paymentDate: null,
      totalAmount: 1500.00
    }
  ];

  rechargeData: RechargeItem[] = [
    {
      id: '5',
      transactionType: 'Wallet Recharge',
      hoa: '0045-00-112-45-03',
      amount: 10000.00,
      date: new Date(),
      status: 'Success'
    }
  ];

  historyData: HistoryItem[] = [
    {
      id: '6',
      txnId: 'TXN001',
      userId: 'USER001',
      type: 'Payment',
      amount: 500.00,
      reference: 'REF001',
      status: 'Success',
      dateTime: new Date(),
      licenseeId: 'LIC001'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get query parameters
    this.route.queryParams.subscribe(params => {
      if (params['billNo']) {
        this.transitBillNo = params['billNo'];
        this.activeTab = 'transit';
        this.loadTransitData();
      }
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });

    // Check user type (this would come from a service in real app)
    this.isBreweryUser = false; // Set based on user session
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved') || statusLower.includes('success')) {
      return 'badge bg-success';
    } else if (statusLower.includes('pending') || statusLower.includes('ready')) {
      return 'badge bg-warning';
    } else if (statusLower.includes('rejected') || statusLower.includes('failed')) {
      return 'badge bg-danger';
    }
    return 'badge bg-secondary';
  }

  canPay(item: PaymentItem): boolean {
    const payableStatuses = [
      'ApprovedByCommissioner',
      'ApprovedByJointCommissioner',
      'ApprovedRevalidationByCommissioner',
      'ApprovedRevalidationByJointCommissioner',
      'ApprovedCancellationByCommissioner',
      'ApprovedCancellationByJointCommissioner'
    ];
    return payableStatuses.includes(item.status) && item.amount > 0;
  }

  payItem(item: PaymentItem): void {
    this.selectedItem = item;
    // Show payment confirmation modal
    const modal = document.getElementById('paymentModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  confirmPayment(): void {
    if (!this.selectedItem) return;

    // Check if sufficient balance
    if (this.educationCessBalance < this.selectedItem.amount) {
      this.showInsufficientBalanceAlert();
      return;
    }

    // Process payment
    this.processPayment(this.selectedItem);
    
    // Close modal
    const modal = document.getElementById('paymentModal');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
      bootstrapModal?.hide();
    }
  }

  processPayment(item: PaymentItem): void {
    // Simulate payment processing
    console.log('Processing payment for:', item.referenceNo);
    
    // Update wallet balance
    this.educationCessBalance -= item.amount;
    
    // Update item status
    item.status = 'Payment Successful';
    
    // Show success message
    this.showSuccessMessage(`Payment of ₹${item.amount} processed successfully!`);
  }

  payAllTransit(): void {
    if (this.transitTotalAmount > this.getTotalWalletBalance()) {
      this.showInsufficientBalanceAlert();
      return;
    }

    // Process all transit payments
    console.log('Processing all transit payments');
    this.showSuccessMessage('All transit payments processed successfully!');
  }

  getTotalWalletBalance(): number {
    return this.educationCessBalance + 
           (this.isBreweryUser ? this.breweryWalletBalance : this.exciseWalletBalance);
  }

  addMoney(walletType: string): void {
    console.log('Add money to:', walletType);
    // Navigate to add money page or show modal
    this.showInfoMessage('Redirecting to payment gateway...');
  }

  downloadDetails(): void {
    console.log('Downloading payment details');
    // Navigate to payment receipt page
    this.router.navigate(['/dev-payment-receipt']);
  }

  retryPayment(): void {
    console.log('Retrying payment');
    this.showInfoMessage('Retrying payment...');
  }

  returnToApplication(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  loadTransitData(): void {
    // Load transit-specific data based on bill number
    this.showTransitPayment = true;
    this.transitTotalAmount = 1500.00;
    this.transitEducationCess = 500.00;
    this.transitExciseDuty = 700.00;
    this.transitAdditionalExcise = 300.00;
    this.transitItemCount = 5;
  }

  showInsufficientBalanceAlert(): void {
    this.showErrorMessage('Insufficient wallet balance. Please add money to your wallet.');
  }

  showSuccessMessage(message: string): void {
    // Implementation for success toast/alert
    console.log('Success:', message);
  }

  showErrorMessage(message: string): void {
    // Implementation for error toast/alert
    console.log('Error:', message);
  }

  showInfoMessage(message: string): void {
    // Implementation for info toast/alert
    console.log('Info:', message);
  }
}