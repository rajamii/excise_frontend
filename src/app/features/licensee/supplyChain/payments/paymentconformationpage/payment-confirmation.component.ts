import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ReceiptNumberService } from '../../services/receipt-number.service';
import { HologramDataService } from '../../services/hologram-data.service';
import { SupplyChainService } from '../../services/supplychain.service';
import { PaymentIntegrationService } from '../../../../../core/services/payment-integration.service';
import { environment } from '../../../../../../environments/environment';
import {
  AddMoneyViewContext,
  AddMoneyWalletType,
  UnifiedAddMoneyModalComponent
} from '../../../../../shared/components/unified-add-money-modal/unified-add-money-modal.component';

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

type WalletHistoryType = 'Added' | 'Utilized';
type WalletHistoryCategory = 'excise' | 'education' | 'hologram';

interface WalletHistoryTransaction {
  id: string;
  date: string;
  type: WalletHistoryType;
  amount: number;
  balanceAfter: number;
  reference: string;
}

interface MyLicenseRow {
  license_id?: string;
  licenseId?: string;
  license_sub_category_id?: number;
  licenseSubCategoryId?: number;
  license_sub_category?: string;
  licenseSubCategory?: string;
}

type WalletModuleType = 'distillery' | 'brewery' | '';

const DEFAULT_WALLET_HOA_BY_TYPE: Record<AddMoneyWalletType, string> = {
  excise: '',
  brewery: '',
  education: '',
  hologram: ''
};

@Component({
  selector: 'app-payment-confirmation',
  standalone: true,
  imports: [CommonModule, FormsModule, UnifiedAddMoneyModalComponent],
  providers: [HologramDataService],
  templateUrl: './payment-confirmation.component.html',
  styleUrls: ['./payment-confirmation.component.scss']
})
export class PaymentConfirmationComponent implements OnInit, AfterViewInit, OnDestroy {
  activeTab = 'requisition';
  isBreweryUser = false;
  walletModuleLabel = 'Distillery';
  showRetryButton = false;
  showTransitPayment = false;
  selectedItem: PaymentItem | null = null;
  showMultiTypePaymentModal = false;
  multiTypePaymentItems: HologramItem[] = [];
  selectedAddMoneyContext: AddMoneyViewContext | null = null;
  addMoneyTransactionId = '';
  addMoneyAmount = 0;
  private movedModalState: Array<{ element: HTMLElement; parent: Node; nextSibling: Node | null }> = [];

  // Wallet Balances
  exciseWalletBalance = 0;
  breweryWalletBalance = 0;
  educationCessBalance = 0;
  hologramWalletBalance = 0;
  activeLicenseeId = '';
  private readonly licenseApiBase = `${environment.apiBaseUrl}/masters/license`;
  private resolvedLicenseModuleType: WalletModuleType = '';
  private walletHoaByType: Record<AddMoneyWalletType, string> = { ...DEFAULT_WALLET_HOA_BY_TYPE };
  private readonly http = inject(HttpClient);

  // Transit Data
  transitBillNo = '';
  transitTotalAmount = 0;
  transitEducationCess = 0;
  transitExciseDuty = 0;
  transitAdditionalExcise = 0;
  transitItemCount = 0;
  transitBillStatus = '';
  transitId: string = '';
  transitPaymentAgreed = false; // Added for modal agreement

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

  transitData: TransitItem[] = [];

  rechargeData: RechargeItem[] = [];

  historyData: HistoryItem[] = [];

  hologramData: HologramItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private receiptNumberService: ReceiptNumberService,
    private hologramService: HologramDataService,
    private supplyChainService: SupplyChainService,
    private paymentIntegrationService: PaymentIntegrationService
  ) { }

  ngOnInit(): void {
    this.initializeWalletContextAndLoadData();

    // Load hologram data from API
    this.loadHologramDataFromApi();
    // Load cancellation data from API
    this.loadCancellationDataFromApi();

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
        // Only default to hologram if no tab is specified or if tab is hologram
        if (!params['tab'] || params['tab'] === 'hologram') {
          this.activeTab = 'hologram';

          // Optionally highlight or scroll to the specific hologram item
          setTimeout(() => {
            // ... (existing scrolling logic)
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
      }
    });

    // Ensure any stale modal/backdrop artifacts are cleaned on navigation
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) {
        this.cleanupModalArtifacts();
      }
    });
  }

  ngAfterViewInit(): void {
    // Move Bootstrap modals to <body> so backdrop and click handling work correctly
    // inside the dashboard + sidenav layout.
    this.attachModalsToBody();
  }

  ngOnDestroy(): void {
    this.cleanupModalArtifacts();
    this.restoreMovedModals();
  }

  private initializeWalletContextAndLoadData(): void {
    const fromQuery = String(this.route.snapshot.queryParams['licenseeId'] || '').trim();
    if (fromQuery) {
      this.activeLicenseeId = fromQuery;
      this.applyResolvedModuleType(this.resolvedLicenseModuleType);
      this.loadWalletDataFromBackend(fromQuery);
      return;
    }

    this.http.get<MyLicenseRow[]>(`${this.licenseApiBase}/me/`)
      .pipe(catchError(() => of([] as MyLicenseRow[])))
      .subscribe((licenses) => {
        const rows = Array.isArray(licenses) ? licenses : [];
        const preferred = this.pickPreferredWalletLicense(rows);
        const resolvedModuleType = this.resolveModuleTypeFromLicense(preferred);
        const licenseeId =
          String(preferred?.license_id ?? preferred?.licenseId ?? '').trim() ||
          this.resolveActiveLicenseeIdFromSession();

        this.applyResolvedModuleType(resolvedModuleType);

        if (!licenseeId) {
          this.showErrorMessage('Licensee id not found in profile/session. Wallet data cannot be loaded.');
          return;
        }

        this.activeLicenseeId = licenseeId;
        this.loadWalletDataFromBackend(licenseeId);
      });
  }

  private loadWalletDataFromBackend(licenseeId: string): void {
    this.activeLicenseeId = licenseeId;
    this.exciseWalletBalance = 0;
    this.educationCessBalance = 0;
    this.breweryWalletBalance = 0;
    this.hologramWalletBalance = 0;
    this.walletHoaByType = { ...DEFAULT_WALLET_HOA_BY_TYPE };
    this.rechargeData = [];
    this.historyData = [];
    this.exciseWalletTransactions = [];
    this.educationWalletTransactions = [];
    this.hologramWalletTransactions = [];
    this.walletHistoryFiltered = [];

    forkJoin({
      summary: this.paymentIntegrationService.getWalletSummary(licenseeId).pipe(
        catchError((error) => {
          console.error('Wallet summary API load failed:', error);
          return of({ results: [] } as any);
        })
      ),
      recharge: this.paymentIntegrationService.getWalletRecharge(licenseeId).pipe(
        catchError((error) => {
          console.error('Wallet recharge API load failed:', error);
          return of({ results: [] } as any);
        })
      ),
      history: this.paymentIntegrationService.getWalletHistory(licenseeId).pipe(
        catchError((error) => {
          console.error('Wallet history API load failed:', error);
          return of({ results: [] } as any);
        })
      )
    }).subscribe((response) => {
      this.applyWalletSummary(response.summary);
      this.applyWalletRecharge(response.recharge);
      this.applyWalletHistory(response.history);
    });
  }

  private refreshWalletData(): void {
    const licenseeId = String(this.activeLicenseeId || '').trim();
    if (licenseeId) {
      this.loadWalletDataFromBackend(licenseeId);
      return;
    }
    this.initializeWalletContextAndLoadData();
  }

  private resolveActiveLicenseeIdFromSession(): string {
    const fromSession = sessionStorage.getItem('currentUser');
    if (fromSession) {
      try {
        const parsed = JSON.parse(fromSession);
        return this.pickFirstNonEmpty(parsed, [
          'licensee_id',
          'licenseeId',
          'licensee_id_no',
          'licenseeIdNo',
          'username',
          'userName'
        ]);
      } catch (error) {
        console.error('Invalid currentUser session payload:', error);
      }
    }

    return '';
  }

  private pickPreferredWalletLicense(rows: MyLicenseRow[]): MyLicenseRow | null {
    const walletEligible = rows.filter((row) => this.resolveModuleTypeFromLicense(row) !== '');
    if (walletEligible.length > 0) {
      return walletEligible[0];
    }
    return rows[0] ?? null;
  }

  private resolveModuleTypeFromLicense(row: MyLicenseRow | null | undefined): WalletModuleType {
    if (!row) {
      return '';
    }

    const subCategoryId = Number(
      row.license_sub_category_id ??
      row.licenseSubCategoryId ??
      0
    );
    if (subCategoryId === 2) {
      return 'distillery';
    }
    if (subCategoryId === 1) {
      return 'brewery';
    }

    const subCategoryName = String(
      row.license_sub_category ??
      row.licenseSubCategory ??
      ''
    ).toLowerCase();

    if (subCategoryName.includes('distill')) {
      return 'distillery';
    }
    if (subCategoryName.includes('brew')) {
      return 'brewery';
    }
    return '';
  }

  private applyResolvedModuleType(moduleType: WalletModuleType): void {
    this.resolvedLicenseModuleType = moduleType;
    this.isBreweryUser = moduleType === 'brewery';
    this.walletModuleLabel = this.isBreweryUser ? 'Brewery' : 'Distillery';
  }

  private applyWalletSummary(payload: any): void {
    const rows = this.safeArray(payload?.results);
    const startsAsBrewery = this.resolvedLicenseModuleType === 'brewery';

    this.exciseWalletBalance = 0;
    this.educationCessBalance = 0;
    this.breweryWalletBalance = 0;
    this.hologramWalletBalance = 0;
    this.walletHoaByType = { ...DEFAULT_WALLET_HOA_BY_TYPE };
    this.isBreweryUser = startsAsBrewery;

    rows.forEach((row: any) => {
      const walletType = String(
        this.pickAny(row, ['wallet_type', 'walletType'], '')
      ).toLowerCase();
      const moduleType = String(
        this.pickAny(row, ['module_type', 'moduleType'], '')
      ).toLowerCase();
      const hoa = this.pickAny(row, ['head_of_account', 'headOfAccount'], '');
      const balance = this.toNumber(this.pickAny(row, ['current_balance', 'currentBalance'], 0));
      const inferredWalletType = walletType || this.inferWalletTypeFromHoa(String(hoa));
      const treatAsBreweryWallet =
        inferredWalletType === 'brewery' ||
        moduleType === 'brewery' ||
        (startsAsBrewery && inferredWalletType === 'excise' && !moduleType);

      if (inferredWalletType === 'education_cess') {
        this.educationCessBalance += balance;
        if (hoa) {
          this.walletHoaByType.education = String(hoa);
        }
      } else if (inferredWalletType === 'hologram') {
        this.hologramWalletBalance += balance;
        if (hoa) {
          this.walletHoaByType.hologram = String(hoa);
        }
      } else if (treatAsBreweryWallet) {
        this.breweryWalletBalance += balance;
        this.isBreweryUser = true;
        if (hoa) {
          this.walletHoaByType.brewery = String(hoa);
        }
      } else {
        this.exciseWalletBalance += balance;
        if (hoa) {
          this.walletHoaByType.excise = String(hoa);
        }
      }
    });

    this.walletModuleLabel = this.isBreweryUser ? 'Brewery' : 'Distillery';
  }

  private applyWalletRecharge(payload: any): void {
    const rows = this.safeArray(payload?.results);

    this.rechargeData = rows.map((row: any, index: number) => ({
      id: String(this.pickAny(row, ['wallet_transaction_id', 'walletTransactionId'], `${index + 1}`)),
      transactionType: this.pickAny(row, ['transaction_type', 'transactionType'], 'Wallet Recharge'),
      hoa: this.pickAny(row, ['head_of_account', 'headOfAccount'], '-'),
      amount: this.toNumber(this.pickAny(row, ['amount'], 0)),
      date: this.toDate(this.pickAny(row, ['created_at', 'createdAt'], new Date())),
      status: this.pickAny(row, ['payment_status', 'paymentStatus'], 'Success')
    }));
  }

  private applyWalletHistory(payload: any): void {
    const rows = this.safeArray(payload?.results);

    const mappedModalHistory: Array<WalletHistoryTransaction & { walletType: string }> = rows.map((row: any, index: number) => {
      const entryType = String(this.pickAny(row, ['entry_type', 'entryType'], '')).toLowerCase();
      const hoa = String(this.pickAny(row, ['head_of_account', 'headOfAccount'], ''));
      const walletTypeRaw = String(this.pickAny(row, ['wallet_type', 'walletType'], '')).toLowerCase();
      const walletType = walletTypeRaw || this.inferWalletTypeFromHoa(hoa);
      const createdAt = this.pickAny(row, ['created_at', 'createdAt'], new Date().toISOString());
      const balanceAfter = this.toNumber(this.pickAny(row, ['balance_after', 'balanceAfter'], 0));

      return {
        id: String(this.pickAny(row, ['wallet_transaction_id', 'walletTransactionId'], `${index + 1}`)),
        date: String(createdAt).slice(0, 10),
        type: entryType === 'credit' ? 'Added' : 'Utilized',
        amount: this.toNumber(this.pickAny(row, ['amount'], 0)),
        balanceAfter,
        reference: this.pickAny(row, ['reference_no', 'referenceNo', 'transaction_id', 'transactionId'], '-'),
        walletType
      };
    });

    this.exciseWalletTransactions = mappedModalHistory.filter(item =>
      item.walletType === 'excise' || item.walletType === 'brewery' || item.walletType === ''
    );
    this.educationWalletTransactions = mappedModalHistory.filter(item => item.walletType === 'education_cess');
    this.hologramWalletTransactions = mappedModalHistory.filter(item => item.walletType === 'hologram');

    if (this.selectedWalletForHistory) {
      this.applyWalletHistoryFilters();
    }

    this.historyData = rows.map((row: any, index: number) => {
      const entryType = String(this.pickAny(row, ['entry_type', 'entryType'], '')).toLowerCase();
      return {
        id: String(this.pickAny(row, ['wallet_transaction_id', 'walletTransactionId'], `${index + 1}`)),
        txnId: this.pickAny(row, ['transaction_id', 'transactionId'], '-'),
        userId: this.pickAny(row, ['user_id', 'userId'], '-'),
        type: entryType === 'credit' ? 'Wallet Recharge' : 'Wallet Utilization',
        amount: this.toNumber(this.pickAny(row, ['amount'], 0)),
        reference: this.pickAny(row, ['reference_no', 'referenceNo', 'transaction_id', 'transactionId'], '-'),
        status: this.pickAny(row, ['payment_status', 'paymentStatus'], 'Success'),
        dateTime: this.toDate(this.pickAny(row, ['created_at', 'createdAt'], new Date())),
        licenseeId: this.pickAny(row, ['licensee_id', 'licenseeId'], this.activeLicenseeId || '-')
      } as HistoryItem;
    });
  }

  private pickAny(source: any, keys: string[], fallback: any): any {
    for (const key of keys) {
      if (source && source[key] !== undefined && source[key] !== null && source[key] !== '') {
        return source[key];
      }
    }
    return fallback;
  }

  private pickFirstNonEmpty(source: any, keys: string[]): string {
    const value = this.pickAny(source, keys, '');
    return String(value || '').trim();
  }

  private safeArray(value: any): any[] {
    return Array.isArray(value) ? value : [];
  }

  private toNumber(value: any): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  private toDate(value: any): Date {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  private inferWalletTypeFromHoa(hoa: string): string {
    if (hoa === '0045-00-112-45-03') {
      return 'education_cess';
    }
    if (
      hoa === '0039-00-800-45-01' ||
      hoa === '0039-00-105-45-04' ||
      hoa === '0039-80-800-45-01'
    ) {
      return 'hologram';
    }
    if (hoa === '0038-00-102-45-00') {
      return 'brewery';
    }
    return 'excise';
  }

  private attachModalsToBody(): void {
    const modalIds = ['walletHistoryModal', 'paymentModal', 'transitPaymentModal', 'addMoneyModal'];

    for (const modalId of modalIds) {
      const modalEl = document.getElementById(modalId);
      if (!modalEl || modalEl.parentNode === document.body) {
        continue;
      }

      this.movedModalState.push({
        element: modalEl,
        parent: modalEl.parentNode!,
        nextSibling: modalEl.nextSibling
      });

      document.body.appendChild(modalEl);
    }
  }

  private restoreMovedModals(): void {
    for (const entry of this.movedModalState.reverse()) {
      const { element, parent, nextSibling } = entry;

      if (nextSibling && nextSibling.parentNode === parent) {
        parent.insertBefore(element, nextSibling);
      } else {
        parent.appendChild(element);
      }
    }

    this.movedModalState = [];
  }

  loadHologramDataFromApi(): void {
    this.hologramService.getProcurements().subscribe({
      next: (data) => {
        console.log('Fetched Hologram Procurements for Payment:', data);

        // Filter for items approved by commissioner
        // Also include items already paid if we want to show history, but usually payment page shows pending
        // Backend "Approved by Commissioner" -> "Payment Pending" effectively

        this.hologramData = data
          .filter(item => item.status === 'Approved by Commissioner' || item.status === 'Payment Completed')
          .map(item => {
            const totalQty = (Number(item.localQty) || 0) + (Number(item.exportQty) || 0) + (Number(item.defenceQty) || 0);
            const hologramFee = totalQty * 0.15; // Example fee calculation
            const paymentDetails: any = (item as any).paymentDetails || (item as any).payment_details || {};
            const paidAt = paymentDetails?.paid_at ? new Date(paymentDetails.paid_at) : null;

            return {
              id: item.id?.toString() || '',
              referenceNo: item.refNo || '',
              companyName: item.licenseeName || item.manufacturingUnit || '',
              procurementType: 'Security Hologram', // Default or derived
              totalQuantity: totalQty,
              hologramFee: hologramFee,
              hoa: '0039-00-800-45-01',
              status: item.status || '',
              localQty: Number(item.localQty) || 0,
              exportQty: Number(item.exportQty) || 0,
              defenceQty: Number(item.defenceQty) || 0,
              paymentDate: paidAt
            } as HologramItem;
          });
      },
      error: (err) => console.error('Error fetching hologram payments:', err)
    });
  }

  loadCancellationDataFromApi(): void {
    this.supplyChainService.getCancellations().subscribe({
      next: (data) => {
        console.log('Fetched Cancellation Data:', data);
        // Map backend data to PaymentItem interface
        this.cancellationData = data.filter(item =>
          item.status === 'ApprovedCancellationByCommissioner' ||
          item.status === 'ForwardedCancellationPaySLipToCommissioner'
        ).map(item => ({
          id: item.id,
          referenceNo: item.ourRefNo || item.our_ref_no,
          amount: parseFloat(item.totalCancellationAmount || item.total_cancellation_amount || 0),
          hoa: '0039-00-105-45-03', // Static HOA for cancellation
          status: item.status
        }));

        // Check if we need to auto-select an item based on query params
        const params = this.route.snapshot.queryParams; // Accessing snapshot for immediate check
        if (params['tab'] === 'cancellation' && params['id']) {
          const item = this.cancellationData.find(d => d.id == params['id']);
          if (item && params['action'] === 'makePayment') {
            // Optionally scroll or highlight
            setTimeout(() => {
              this.selectedItem = item;
              // this.payItem(item); // Auto-open modal if desired
            }, 500);
          }
        }
      },
      error: (err) => console.error('Error fetching cancellation data', err)
    });
  }

  // Process hologram payment - called when user completes payment
  // Process hologram payment - called when user completes payment
  // Legacy method using localStorage - deprecated for API integration
  // processHologramPayment(hologramItem: HologramItem): void { ... }

  // Wallet history (utilization and additions)
  selectedWalletForHistory: WalletHistoryCategory | null = null;
  walletHistoryFilters = {
    from: '',
    to: '',
    type: '', // Added | Utilized
    minAmount: '',
    maxAmount: ''
  };

  exciseWalletTransactions: WalletHistoryTransaction[] = [];

  educationWalletTransactions: WalletHistoryTransaction[] = [];

  hologramWalletTransactions: WalletHistoryTransaction[] = [];

  walletHistoryFiltered: WalletHistoryTransaction[] = [];

  openWalletHistory(wallet: WalletHistoryCategory): void {
    // Clean any previous artifacts before opening a new modal
    this.cleanupModalArtifacts();
    this.selectedWalletForHistory = wallet;
    this.clearWalletHistoryFilters(false);
    this.walletHistoryFiltered = [...this.getActiveWalletTxns()];
    const modalEl = document.getElementById('walletHistoryModal');
    if (modalEl) {
      if (modalEl.parentNode !== document.body) {
        document.body.appendChild(modalEl);
      }
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
      // When modal fully hidden, run cleanup in case bootstrap misses anything
      modalEl.addEventListener('hidden.bs.modal', () => this.cleanupModalArtifacts(), { once: true });
    }
  }

  openHologramHistory(): void {
    this.openWalletHistory('hologram');
  }

  getActiveWalletTxns() {
    if (this.selectedWalletForHistory === 'excise') {
      return this.exciseWalletTransactions;
    }
    if (this.selectedWalletForHistory === 'education') {
      return this.educationWalletTransactions;
    }
    if (this.selectedWalletForHistory === 'hologram') {
      return this.hologramWalletTransactions;
    }
    return [];
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
      if (modal.parentNode !== document.body) {
        document.body.appendChild(modal);
      }
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  confirmPayment(): void {
    if (!this.selectedItem) return;

    const isHologramPayment = this.activeTab === 'hologram';
    const availableBalance = isHologramPayment ? this.hologramWalletBalance : this.educationCessBalance;
    if (availableBalance < this.selectedItem.amount) {
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
    console.log('Processing payment for:', item.referenceNo);

    if (this.activeTab === 'hologram') {
      const procurementId = Number(item.id);

      this.hologramService.performAction('procurement', procurementId, 'pay', 'Payment Completed via Wallet').subscribe({
        next: (res) => {
          this.showSuccessMessage(`Payment of Rs ${item.amount} processed successfully.`);
          item.status = String(res?.status || 'Payment Completed');
          const deducted = Number(res?.wallet_deduction?.amount ?? item.amount ?? 0);
          const balanceAfter = Number(res?.wallet_deduction?.balance_after ?? (this.getSelectedWalletBalance() - deducted));
          const txnId = String(res?.wallet_deduction?.transaction_id || 'N/A');
          alert(
            `Payment successful.\n\n` +
            `Deducted Amount: Rs ${deducted.toFixed(2)}\n` +
            `Remaining Wallet Balance: Rs ${balanceAfter.toFixed(2)}\n` +
            `Transaction ID: ${txnId}`
          );
          this.loadHologramDataFromApi();
          this.refreshWalletData();
        },
        error: (err) => {
          console.error('Payment failed:', err);
          const errorMessage = err?.error?.error || err?.error?.detail || err?.message || 'Payment failed API call';
          this.showErrorMessage(errorMessage);
          alert(errorMessage);
        }
      });
    } else if (this.activeTab === 'cancellation') {
      // Cancellation Payment Logic
      this.supplyChainService.performCancellationAction(item.id, 'SubmitPayslip', 'licensee').subscribe({
        next: (res) => {
          this.showSuccessMessage(`Cancellation Payment of Rs ${item.amount} processed successfully!`);
          item.status = 'ForwardedCancellationPaySLipToCommissioner'; // Update status to reflect backend change
          // Optionally reload data if we switch to loading from API
          this.loadCancellationDataFromApi();
          this.refreshWalletData();
        },
        error: (err) => {
          console.error('Cancellation Payment failed:', err);
          this.showErrorMessage(`Cancellation Payment failed: ${err.error?.error || err.message}`);
        }
      });
    } else {
      // Legacy/Other tabs logic
      item.status = 'Payment Successful';
      this.showSuccessMessage(`Payment of Rs ${item.amount} processed successfully!`);
      this.refreshWalletData();
    }
  }
  updateHologramPaymentStatus(refNo: string, procurementType?: string): void {
    // Legacy method using localStorage - removed for API based flow.
    console.warn("updateHologramPaymentStatus called but implementation removed for API transition.");
  }



  getTotalWalletBalance(): number {
    return this.educationCessBalance +
      (this.isBreweryUser ? this.breweryWalletBalance : this.exciseWalletBalance);
  }

  addMoney(walletType: string): void {
    const normalizedWalletType = this.normalizeAddMoneyWalletType(walletType);
    if (!normalizedWalletType) {
      this.showErrorMessage(`Unsupported wallet type: ${walletType}`);
      return;
    }

    this.openUnifiedAddMoneyView(normalizedWalletType);
  }

  private normalizeAddMoneyWalletType(walletType: string): AddMoneyWalletType | null {
    switch (walletType) {
      case 'excise':
      case 'education':
      case 'hologram':
      case 'brewery':
        return walletType;
      default:
        return null;
    }
  }

  private openUnifiedAddMoneyView(walletType: AddMoneyWalletType): void {
    this.cleanupModalArtifacts();
    this.selectedAddMoneyContext = this.getAddMoneyContext(walletType);
    this.addMoneyTransactionId = this.generateWalletTransactionId(walletType);
    this.addMoneyAmount = 0;

    const modalEl = document.getElementById('addMoneyModal');
    if (modalEl) {
      if (modalEl.parentNode !== document.body) {
        document.body.appendChild(modalEl);
      }

      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
      modalEl.addEventListener('hidden.bs.modal', () => this.cleanupModalArtifacts(), { once: true });
    }
  }

  private getAddMoneyContext(walletType: AddMoneyWalletType): AddMoneyViewContext {
    const moduleLabel = this.walletModuleLabel;

    switch (walletType) {
      case 'excise':
        return {
          walletType,
          moduleLabel,
          walletLabel: 'Excise Duty Wallet',
          hoa: this.walletHoaByType.excise
        };
      case 'brewery':
        return {
          walletType,
          moduleLabel,
          walletLabel: 'Excise Duty Wallet',
          hoa: this.walletHoaByType.brewery
        };
      case 'education':
        return {
          walletType,
          moduleLabel,
          walletLabel: 'Education Cess Wallet',
          hoa: this.walletHoaByType.education
        };
      case 'hologram':
        return {
          walletType,
          moduleLabel,
          walletLabel: 'Hologram Wallet',
          hoa: this.walletHoaByType.hologram
        };
      default:
        return {
          walletType: 'excise',
          moduleLabel,
          walletLabel: 'Excise Duty Wallet',
          hoa: this.walletHoaByType.excise
        };
    }
  }

  private generateWalletTransactionId(walletType: AddMoneyWalletType): string {
    const prefixByWallet: Record<AddMoneyWalletType, string> = {
      excise: 'EX',
      brewery: 'BR',
      education: 'EC',
      hologram: 'HG'
    };

    const timestamp = Date.now().toString();
    const randomBlock = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `BILLDESK${prefixByWallet[walletType]}${timestamp}${randomBlock}`;
  }

  closeUnifiedAddMoneyView(): void {
    const modalEl = document.getElementById('addMoneyModal');
    if (modalEl) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      modal?.hide();
    }
  }

  proceedUnifiedAddMoney(): void {
    if (this.addMoneyAmount <= 0) {
      this.showErrorMessage('Please enter amount greater than zero.');
      return;
    }

    this.showInfoMessage('Recharge request submitted. Wallet balance will refresh from backend after payment success.');
    this.closeUnifiedAddMoneyView();
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
    this.showTransitPayment = false;

    // Fetch from backend to get the ID and current status
    this.supplyChainService.getTransitPermits(this.transitBillNo).subscribe({
      next: (permits) => {
        console.log('Fetching Transit Permits. Looking for:', this.transitBillNo);
        console.log('Permits received:', permits);

        // Check for both snake_case and camelCase
        const found = permits.find(p => (p.bill_no === this.transitBillNo) || (p.billNo === this.transitBillNo));

        if (found) {
          console.log('Transit Permit Found:', found);
          this.transitId = found.id;
          this.transitBillStatus = found.status;
          // Map backend fields to frontend model
          this.transitData = [{
            id: found.id,
            billNumber: found.bill_no || found.billNo,
            serialNo: found.bill_no || found.billNo,
            quantity: found.cases || 0,
            portions: 0,
            nips: (found.size_ml || found.size) + 'ml',
            licenseeId: found.licensee_id || found.licenseeId || 'Unknown',
            status: found.status,
            paymentDate: null,
            totalAmount: parseFloat(found.total_amount || found.totalAmount || 0)
          }];
          this.transitTotalAmount = parseFloat(found.total_amount || found.totalAmount || 0);
          this.transitEducationCess = parseFloat(found.total_education_cess || found.totalEducationCess || found.educationCess || 0);
          this.transitExciseDuty = parseFloat(found.total_excise_duty || found.totalExciseDuty || found.exciseDuty || 0);
          this.transitAdditionalExcise = parseFloat(found.total_additional_excise || found.totalAdditionalExcise || found.additionalExcise || 0);
          this.transitItemCount = 1;
          this.showTransitPayment = String(found.status || '').trim() === 'Ready for Payment';
        } else {
          console.error('Transit Permit NOT found for BillNo:', this.transitBillNo);
          alert(`Transit Permit with Bill No: ${this.transitBillNo} not found in the list. Please verify.`);

          this.transitData = [];
          this.transitTotalAmount = 0;
        }
      },
      error: (err) => {
        console.error('Error fetching transit permits:', err);
        this.transitData = [];
        this.showTransitPayment = false;
        alert('Failed to load transit permit details. Please try again.');
      }
    });

  }

  payAllTransit(): void {
    if (this.transitTotalAmount > this.getTotalWalletBalance()) {
      this.showInsufficientBalanceAlert();
      return;
    }

    if (!this.transitId) {
      alert("Transit Permit ID not found. Cannot proceed with payment.");
      this.showErrorMessage("Transit Permit ID not found. Cannot proceed.");
      return;
    }

    // Open confirmation modal
    this.transitPaymentAgreed = false;
    const modal = document.getElementById('transitPaymentModal');
    if (modal) {
      if (modal.parentNode !== document.body) {
        document.body.appendChild(modal);
      }
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  confirmTransitPayment(): void {
    // Close modal
    const modal = document.getElementById('transitPaymentModal');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
      bootstrapModal?.hide();
    }

    // Process payment via API
    this.supplyChainService.performTransitPermitAction(this.transitId, 'PAY', 'licensee').subscribe({
      next: (response) => {
        console.log('Payment successful', response);
        this.showSuccessMessage('Payment successful! Forwarded to Officer in Charge.');
        alert('Payment successful! Forwarded to Officer in Charge.');
        this.transitBillStatus = String(
          response?.data?.status ||
          response?.status ||
          this.transitBillStatus ||
          ''
        );

        // Update wallet balance locally
        this.educationCessBalance -= this.transitEducationCess;
        this.exciseWalletBalance -= (this.transitExciseDuty + this.transitAdditionalExcise);

        // Refresh data
        this.loadTransitData();
        this.refreshWalletData();
      },
      error: (err) => {
        console.error('Payment failed', err);
        const msg = err.error?.message || err.message || 'Unknown error';
        this.showErrorMessage(`Payment failed: ${msg}`);
        alert(`Payment failed: ${msg}`);
      }
    });
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

  getSelectedWalletBalance(): number {
    return this.activeTab === 'hologram' ? this.hologramWalletBalance : this.educationCessBalance;
  }

  getSelectedWalletBalanceAfterDeduction(): number {
    const amount = Number(this.selectedItem?.amount || 0);
    return Math.max(0, this.getSelectedWalletBalance() - amount);
  }

  // Hologram payment methods
  canPayHologram(item: HologramItem): boolean {
    const payableStatuses = [
      'ApprovedByCommissioner',
      'Approved by Commissioner',
      'ApprovedByJointCommissioner'
    ];
    // Don't pay if 0 amount, unless it's a test? keeping fee check.
    return payableStatuses.includes(item.status);
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

    if (totalAmount > this.hologramWalletBalance) {
      this.closeMultiTypePaymentModal();
      this.showInsufficientBalanceAlert();
      return;
    }

    const confirmed = confirm(
      `You are about to pay for ${this.multiTypePaymentItems.length} types under reference ${this.multiTypePaymentItems[0].referenceNo}.\n\n` +
      `Total Amount: Rs ${totalAmount.toFixed(2)}\n\n` +
      `A single payment slip will be generated for all types.\n\n` +
      `Do you want to proceed?`
    );

    if (!confirmed) {
      return;
    }

    const paymentRequests = this.multiTypePaymentItems.map(item =>
      this.hologramService.performAction('procurement', Number(item.id), 'pay', 'Payment Completed via Wallet')
    );

    forkJoin(paymentRequests).subscribe({
      next: () => {
        this.closeMultiTypePaymentModal();
        this.showSuccessMessage(`Successfully processed payment totaling Rs ${totalAmount.toFixed(2)}.`);
        this.loadHologramDataFromApi();
        this.refreshWalletData();
      },
      error: (err) => {
        const errorMessage = err?.error?.error || err?.error?.detail || err?.message || 'Multi-type payment failed';
        this.showErrorMessage(errorMessage);
        alert(errorMessage);
      }
    });
  }
  // Create unified payment transaction for multiple types
  private createUnifiedPaymentTransaction(items: HologramItem[]): void {
    // NOTE: This unified part is complex to map to single PerformAction if backend doesn't support batch.
    // Legacy localStorage logic removed.
    // For now, allow it to run but it won't be fully consistent with backend "Action" unless backend supports batch pay.
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
    // Not fully implemented for API version yet due to async complexity, defaulting to alert.
    alert("Please pay items individually in this version.");
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

