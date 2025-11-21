import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { ReceiptNumberService } from '../../services/receipt-number.service';

interface PaymentItem {
  id: string;
  referenceNo: string;
  amount: number;
  hoa: string;
  status: string;
  procurementType?: string; // For hologram payments to track specific type
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

interface HologramItem {
  id: string;
  referenceNo: string;
  companyName: string;
  procurementType?: string;
  totalQuantity: number;
  hologramFee: number;
  hoa: string;
  status: string;
  localQty: number;
  exportQty: number;
  defenceQty: number;
  paymentDate: Date | null;
  paymentSlipUploaded?: boolean;
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
  showMultiTypePaymentModal = false;
  multiTypePaymentItems: HologramItem[] = [];

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

  hologramData: HologramItem[] = [
    {
      id: '7',
      referenceNo: 'YB/1/BREW/25',
      companyName: 'Yuksom Breweries Ltd.',
      totalQuantity: 15.0,
      hologramFee: 1500.00,
      hoa: '0039-00-105-45-04',
      status: 'ApprovedByCommissioner',
      localQty: 15.0,
      exportQty: 0.0,
      defenceQty: 0.0,
      paymentDate: null
    },
    {
      id: '8',
      referenceNo: 'YB/2/BREW/25',
      companyName: 'Yuksom Breweries Ltd.',
      totalQuantity: 25.5,
      hologramFee: 2550.00,
      hoa: '0039-00-105-45-04',
      status: 'ApprovedByCommissioner',
      localQty: 20.0,
      exportQty: 5.5,
      defenceQty: 0.0,
      paymentDate: null
    },
    {
      id: '9',
      referenceNo: 'YB/3/BREW/25',
      companyName: 'Yuksom Breweries Ltd.',
      totalQuantity: 10.0,
      hologramFee: 1000.00,
      hoa: '0039-00-105-45-04',
      status: 'Payment Successful',
      localQty: 10.0,
      exportQty: 0.0,
      defenceQty: 0.0,
      paymentDate: new Date('2025-01-15')
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private receiptNumberService: ReceiptNumberService
  ) {}

  ngOnInit(): void {
    // Load hologram data from localStorage
    this.loadHologramDataFromStorage();

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
      // Handle hologram payment navigation
      if (params['refNo'] && params['action'] === 'makePayment') {
        this.activeTab = 'hologram';
        // Optionally highlight or scroll to the specific hologram item
        setTimeout(() => {
          // If type is provided, scroll to specific type
          if (params['type']) {
            const element = document.getElementById(`hologram-${params['refNo']}-${params['type']}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('highlight-row');
              setTimeout(() => element.classList.remove('highlight-row'), 3000);
            }
          } else {
            // If no type, find first matching refNo and scroll to it
            const matchingItem = this.hologramData.find(h => h.referenceNo === params['refNo']);
            if (matchingItem) {
              const element = document.getElementById(`hologram-${matchingItem.referenceNo}-${matchingItem.procurementType}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-row');
                setTimeout(() => element.classList.remove('highlight-row'), 3000);
              }
            }
          }
        }, 500);
      }
    });

    // Check user type (this would come from a service in real app)
    this.isBreweryUser = false; // Set based on user session

    // Ensure any stale modal/backdrop artifacts are cleaned on navigation
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) {
        this.cleanupModalArtifacts();
      }
    });
  }

  loadHologramDataFromStorage(): void {
    try {
      // Load hologram applications from localStorage
      const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
      
      // Load payment records to check which ones have slips uploaded
      const payments = JSON.parse(localStorage.getItem('hologramPayments') || '[]');
      
      console.log('📦 Loading hologram data...');
      console.log('Applications found:', applications.length);
      console.log('Payment records found:', payments.length);
      
      // Transform applications into hologram payment items
      this.hologramData = applications
        .filter((app: any) => {
          // Include items that:
          // 1. Have payment slips uploaded for this specific type, OR
          // 2. Are approved by commissioner and ready for payment (even without slip uploaded yet)
          const hasPaymentSlip = payments.some((payment: any) => 
            payment.hologramRefNo === app.refNo && 
            payment.procurementType === app.procurementType
          );
          
          const isApprovedAndReady = app.status === 'Approved by Commissioner - Ready for Payment' || 
                                     app.status === 'ApprovedByCommissioner' ||
                                     app.paymentSlipUploaded === true;
          
          return hasPaymentSlip || isApprovedAndReady;
        })
        .map((app: any) => {
          // Find the corresponding payment record for this specific type
          const payment = payments.find((p: any) => 
            p.hologramRefNo === app.refNo && 
            p.procurementType === app.procurementType
          );

          // Calculate hologram fee (₹0.15 per hologram) for this specific type
          const totalQty = (app.localQtyLakh || 0) + (app.exportQtyLakh || 0) + (app.defenceQtyLakh || 0);
          const hologramFee = totalQty * 0.15;

          return {
            id: `${app.refNo}-${app.procurementType}`, // Unique ID combining refNo and type
            referenceNo: app.refNo,
            companyName: app.companyName,
            procurementType: app.procurementType,
            totalQuantity: totalQty,
            hologramFee: hologramFee,
            hoa: '0039-00-105-45-04',
            status: app.paymentCompleted ? 'Payment Successful' : 'ApprovedByCommissioner',
            localQty: app.localQtyLakh || 0,
            exportQty: app.exportQtyLakh || 0,
            defenceQty: app.defenceQtyLakh || 0,
            paymentDate: app.paymentCompleted ? new Date(app.paymentDate) : null,
            paymentSlipUploaded: payment ? true : (app.paymentSlipUploaded || false)
          };
        });

      console.log('✅ Loaded hologram data for payment:', this.hologramData.length, 'items');
      console.log('Hologram data:', this.hologramData);
    } catch (error) {
      console.error('❌ Error loading hologram data:', error);
      // Keep sample data if loading fails
    }
  }

  // Process hologram payment - called when user completes payment
  processHologramPayment(hologramItem: HologramItem): void {
    try {
      const refNo = hologramItem.referenceNo;
      
      // Update hologramRequests
      const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      const updatedRequests = hologramRequests.map((req: any) => {
        if (req.refNo === refNo) {
          return {
            ...req,
            paymentCompleted: true,
            status: 'Payment Completed',
            paymentDate: new Date().toISOString()
          };
        }
        return req;
      });
      localStorage.setItem('hologramRequests', JSON.stringify(updatedRequests));

      // Update hologramApplications
      const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
      const updatedApplications = applications.map((app: any) => {
        if (app.refNo === refNo) {
          return {
            ...app,
            paymentCompleted: true,
            status: 'Payment Completed',
            paymentDate: new Date().toISOString()
          };
        }
        return app;
      });
      localStorage.setItem('hologramApplications', JSON.stringify(updatedApplications));

      // Update the item status in the current view
      hologramItem.status = 'Payment Successful';
      hologramItem.paymentDate = new Date();

      // Reload hologram data to reflect changes
      this.loadHologramDataFromStorage();

      alert(`Payment completed successfully for ${refNo}!\n\nStatus has been updated to "Payment Completed" across all dashboards.`);
    } catch (error) {
      console.error('Error processing hologram payment:', error);
      alert('Error processing payment. Please try again.');
    }
  }

  // Wallet history (utilization and additions)
  selectedWalletForHistory: 'excise' | 'education' | null = null;
  walletHistoryFilters = {
    from: '',
    to: '',
    type: '', // Added | Utilized
    minAmount: '',
    maxAmount: ''
  };

  exciseWalletTransactions: Array<{ id: string; date: string; type: 'Added' | 'Utilized'; amount: number; balanceAfter: number; reference: string; }>= [
    { id: 'E1', date: '2025-09-20', type: 'Added', amount: 200000.00, balanceAfter: 10000000.00, reference: 'PG-20250920-001' },
    { id: 'E2', date: '2025-09-21', type: 'Utilized', amount: 1500.00, balanceAfter: 99998500.00, reference: 'TP-BILL001' },
    { id: 'E3', date: '2025-09-22', type: 'Utilized', amount: 2500.00, balanceAfter: 99996000.00, reference: 'REQUISITION-IBPS/03/EXCISE' }
  ];

  educationWalletTransactions: Array<{ id: string; date: string; type: 'Added' | 'Utilized'; amount: number; balanceAfter: number; reference: string; }>= [
    { id: 'ED1', date: '2025-09-19', type: 'Added', amount: 100000.00, balanceAfter: 10000000.00, reference: 'PG-20250919-111' },
    { id: 'ED2', date: '2025-09-21', type: 'Utilized', amount: 500.00, balanceAfter: 99999500.00, reference: 'REV-REV/001/2025' }
  ];

  walletHistoryFiltered: Array<{ id: string; date: string; type: 'Added' | 'Utilized'; amount: number; balanceAfter: number; reference: string; }> = [];

  openWalletHistory(wallet: 'excise' | 'education'): void {
    // Clean any previous artifacts before opening a new modal
    this.cleanupModalArtifacts();
    this.selectedWalletForHistory = wallet;
    this.clearWalletHistoryFilters(false);
    this.walletHistoryFiltered = [...this.getActiveWalletTxns()];
    const modalEl = document.getElementById('walletHistoryModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
      // When modal fully hidden, run cleanup in case bootstrap misses anything
      modalEl.addEventListener('hidden.bs.modal', () => this.cleanupModalArtifacts(), { once: true });
    }
  }

  getActiveWalletTxns() {
    return this.selectedWalletForHistory === 'excise' ? this.exciseWalletTransactions : this.educationWalletTransactions;
  }

  applyWalletHistoryFilters(): void {
    const txns = this.getActiveWalletTxns();
    const f = this.walletHistoryFilters;
    this.walletHistoryFiltered = txns.filter(t => {
      const tDate = t.date;
      const afterFrom = f.from ? tDate >= f.from : true;
      const beforeTo = f.to ? tDate <= f.to : true;
      const typeOk = f.type ? t.type === (f.type as any) : true;
      const minOk = f.minAmount ? t.amount >= Number(f.minAmount) : true;
      const maxOk = f.maxAmount ? t.amount <= Number(f.maxAmount) : true;
      return afterFrom && beforeTo && typeOk && minOk && maxOk;
    });
  }

  clearWalletHistoryFilters(apply: boolean = true): void {
    this.walletHistoryFilters = { from: '', to: '', type: '', minAmount: '', maxAmount: '' };
    if (apply) {
      this.walletHistoryFiltered = [...this.getActiveWalletTxns()];
    }
  }

  // Defensive cleanup to avoid "stuck" page due to lingering modal/backdrop/body classes
  private cleanupModalArtifacts(): void {
    try {
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      const backdrops = Array.from(document.getElementsByClassName('modal-backdrop')) as HTMLElement[];
      backdrops.forEach(el => el.parentNode?.removeChild(el));
    } catch (_) {
      // no-op
    }
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

    // If this is a hologram payment, update the specific hologram application in localStorage
    if (this.activeTab === 'hologram') {
      // Get procurement type from the item (stored when payHologramItem was called)
      const procurementType = item.procurementType;
      
      if (procurementType) {
        this.updateHologramPaymentStatus(item.referenceNo, procurementType);
      } else {
        // Fallback: Find the hologram item to get its procurement type
        const hologramItem = this.hologramData.find(h => 
          h.referenceNo === item.referenceNo && h.id === item.id
        );
        if (hologramItem) {
          this.updateHologramPaymentStatus(item.referenceNo, hologramItem.procurementType);
        }
      }
    }
    
    // Show success message
    this.showSuccessMessage(`Payment of ₹${item.amount} processed successfully!`);
  }

  updateHologramPaymentStatus(refNo: string, procurementType?: string): void {
    try {
      // Get the procurement type from the selected item if not provided
      const selectedHologram = this.hologramData.find(h => h.referenceNo === refNo);
      const typeToUpdate = procurementType || selectedHologram?.procurementType;

      if (!typeToUpdate) {
        console.error('Cannot update payment status: procurement type not found');
        return;
      }

      // Update only the specific hologram application with matching refNo AND procurementType
      const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
      const updatedApplications = applications.map((app: any) => {
        if (app.refNo === refNo && app.procurementType === typeToUpdate) {
          return { 
            ...app, 
            paymentCompleted: true,
            paymentDate: new Date().toISOString(),
            status: 'Payment Completed'
          };
        }
        return app;
      });
      localStorage.setItem('hologramApplications', JSON.stringify(updatedApplications));

      // Update only the specific hologram payment with matching refNo AND procurementType
      const payments = JSON.parse(localStorage.getItem('hologramPayments') || '[]');
      const updatedPayments = payments.map((payment: any) => {
        if (payment.hologramRefNo === refNo && payment.procurementType === typeToUpdate) {
          return { 
            ...payment, 
            status: 'Payment Completed',
            paymentCompletedDate: new Date().toISOString()
          };
        }
        return payment;
      });
      localStorage.setItem('hologramPayments', JSON.stringify(updatedPayments));

      console.log(`✅ Payment completed for ${refNo} - ${typeToUpdate}`);

      // Reload hologram data
      this.loadHologramDataFromStorage();
    } catch (error) {
      console.error('Error updating hologram payment status:', error);
    }
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

  // Hologram payment methods
  canPayHologram(item: HologramItem): boolean {
    const payableStatuses = [
      'ApprovedByCommissioner',
      'ApprovedByJointCommissioner'
    ];
    return payableStatuses.includes(item.status) && item.hologramFee > 0;
  }

  payHologramItem(item: HologramItem): void {
    // Check if there are multiple types for the same reference number
    const sameRefItems = this.hologramData.filter(h => h.referenceNo === item.referenceNo);
    
    if (sameRefItems.length > 1) {
      // Multiple types exist - check if all are ready for payment
      const allReady = sameRefItems.every(h => this.canPayHologram(h));

      if (!allReady) {
        // Not all types are ready for payment
        const notReadyTypes = sameRefItems
          .filter(h => !this.canPayHologram(h))
          .map(h => h.procurementType || 'Unknown');

        alert(
          `Multiple types exist for reference number ${item.referenceNo}.\n\n` +
          `The following types are not yet ready for payment:\n${notReadyTypes.join(', ')}\n\n` +
          `All types must be approved before making payment.`
        );
        return;
      }

      // All types are ready - show multi-type payment modal
      this.multiTypePaymentItems = sameRefItems;
      this.showMultiTypePaymentModal = true;
      return;
    }

    // Single type - proceed with normal payment flow
    this.proceedToSinglePayment(item);
  }

  // Close multi-type payment modal
  closeMultiTypePaymentModal(): void {
    this.showMultiTypePaymentModal = false;
    this.multiTypePaymentItems = [];
  }

  // Proceed to payment for all types
  proceedToMultiTypePayment(): void {
    if (this.multiTypePaymentItems.length === 0) return;
    
    const totalAmount = this.multiTypePaymentItems.reduce((sum, item) => sum + item.hologramFee, 0);
    
    // Check if sufficient balance
    if (totalAmount > this.getTotalWalletBalance()) {
      this.closeMultiTypePaymentModal();
      this.showInsufficientBalanceAlert();
      return;
    }

    // Confirm payment for all types
    const confirmed = confirm(
      `You are about to pay for ${this.multiTypePaymentItems.length} types under reference ${this.multiTypePaymentItems[0].referenceNo}.\n\n` +
      `Total Amount: ₹${totalAmount.toFixed(2)}\n\n` +
      `A single payment slip will be generated for all types.\n\n` +
      `Do you want to proceed?`
    );

    if (!confirmed) {
      return;
    }

    // Process payment for all types
    let successCount = 0;
    this.multiTypePaymentItems.forEach(item => {
      try {
        // Update wallet balance
        this.educationCessBalance -= item.hologramFee;
        
        // Update item status
        item.status = 'Payment Successful';
        item.paymentDate = new Date();

        // Update the specific hologram application in localStorage
        this.updateHologramPaymentStatus(item.referenceNo, item.procurementType);
        
        successCount++;
        console.log(`✅ Payment completed for ${item.referenceNo} - ${item.procurementType}`);
      } catch (error) {
        console.error(`❌ Failed to process payment for ${item.referenceNo} - ${item.procurementType}:`, error);
      }
    });

    // Create unified payment transaction record
    this.createUnifiedPaymentTransaction(this.multiTypePaymentItems);

    // Close modal
    this.closeMultiTypePaymentModal();

    // Show success message
    this.showSuccessMessage(
      `Successfully processed payment for ${successCount} types totaling ₹${totalAmount.toFixed(2)}!\n\n` +
      `A single unified payment slip has been generated for reference ${this.multiTypePaymentItems[0].referenceNo}.`
    );

    // Reload hologram data
    this.loadHologramDataFromStorage();
  }

  // Create unified payment transaction for multiple types
  private createUnifiedPaymentTransaction(items: HologramItem[]): void {
    try {
      const refNo = items[0].referenceNo;
      const totalAmount = items.reduce((sum, item) => sum + item.hologramFee, 0);
      const totalQuantity = items.reduce((sum, item) => sum + item.totalQuantity, 0);

      // Build hologram types array
      const hologramTypes = items.map(item => ({
        type: `${item.procurementType} Series`,
        quantity: item.totalQuantity,
        amount: item.hologramFee
      }));

      // Get or generate receipt number using the service
      const receiptNo = this.receiptNumberService.getReceiptNumber(refNo, 'HOLOGRAM');

      // Create unified transaction record
      const transaction = {
        transactionId: receiptNo,
        hologramRefNo: refNo,
        hologramDate: items[0].paymentDate?.toISOString() || new Date().toISOString(),
        companyName: items[0].companyName,
        localQtyLakh: items.reduce((sum, item) => sum + item.localQty, 0),
        exportQtyLakh: items.reduce((sum, item) => sum + item.exportQty, 0),
        defenceQtyLakh: items.reduce((sum, item) => sum + item.defenceQty, 0),
        totalQuantity: totalQuantity,
        walletPaymentAmount: totalAmount,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'Wallet Payment',
        status: 'Completed',
        hologramTypes: hologramTypes
      };

      // Store transaction in localStorage
      const transactions = JSON.parse(localStorage.getItem('hologramPaymentTransactions') || '[]');
      transactions.push(transaction);
      localStorage.setItem('hologramPaymentTransactions', JSON.stringify(transactions));

      console.log('✅ Unified payment transaction created:', transaction);
    } catch (error) {
      console.error('Error creating unified payment transaction:', error);
    }
  }

  // Proceed to single payment (original flow)
  private proceedToSinglePayment(item: HologramItem): void {
    // Store the procurement type in the selectedItem for later use
    this.selectedItem = {
      id: item.id,
      referenceNo: item.referenceNo,
      amount: item.hologramFee,
      hoa: item.hoa,
      status: item.status,
      procurementType: item.procurementType // Store procurement type
    };
    // Show payment confirmation modal
    const modal = document.getElementById('paymentModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  // Calculate total payment amount for all types under same reference
  getTotalPaymentForRef(refNo: string): number {
    const sameRefItems = this.hologramData.filter(item => item.referenceNo === refNo);
    return sameRefItems.reduce((total, item) => total + item.hologramFee, 0);
  }

  // Get total quantity for all types under same reference
  getTotalQuantityForRef(refNo: string): number {
    const sameRefItems = this.hologramData.filter(item => item.referenceNo === refNo);
    return sameRefItems.reduce((total, item) => total + item.totalQuantity, 0);
  }

  payAllHologram(): void {
    const totalHologramFee = this.getTotalHologramFee();
    if (totalHologramFee > this.getTotalWalletBalance()) {
      this.showInsufficientBalanceAlert();
      return;
    }

    // Confirm before processing all payments
    const pendingCount = this.getPendingHologramCount();
    const confirmed = confirm(
      `You are about to process ${pendingCount} hologram payment(s) totaling ₹${totalHologramFee.toFixed(2)}.\n\n` +
      `Each payment will be processed individually for its specific procurement type.\n\n` +
      `Do you want to proceed?`
    );

    if (!confirmed) {
      return;
    }

    // Process all pending hologram payments individually
    const pendingItems = this.hologramData.filter(item => this.canPayHologram(item));
    let successCount = 0;

    pendingItems.forEach(item => {
      try {
        // Update wallet balance
        this.educationCessBalance -= item.hologramFee;
        
        // Update item status
        item.status = 'Payment Successful';

        // Update the specific hologram application in localStorage
        this.updateHologramPaymentStatus(item.referenceNo, item.procurementType);
        
        successCount++;
        console.log(`✅ Payment completed for ${item.referenceNo} - ${item.procurementType}`);
      } catch (error) {
        console.error(`❌ Failed to process payment for ${item.referenceNo} - ${item.procurementType}:`, error);
      }
    });

    // Show success message
    this.showSuccessMessage(
      `Successfully processed ${successCount} hologram payment(s) totaling ₹${totalHologramFee.toFixed(2)}!`
    );
  }

  getTotalHologramFee(): number {
    return this.hologramData
      .filter(item => this.canPayHologram(item))
      .reduce((total, item) => total + item.hologramFee, 0);
  }

  getTotalHologramQuantity(): number {
    return this.hologramData
      .filter(item => this.canPayHologram(item))
      .reduce((total, item) => total + item.totalQuantity, 0);
  }

  getPendingHologramCount(): number {
    return this.hologramData.filter(item => this.canPayHologram(item)).length;
  }
}