import { Component, OnInit, AfterViewInit, OnDestroy, inject, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { catchError, forkJoin, of, Observable, timeout } from 'rxjs';
import { ReceiptNumberService } from '../../services/receipt-number.service';
import { HologramDataService } from '../../services/hologram-data.service';
import { SupplyChainService } from '../../services/supplychain.service';
import { PaymentIntegrationService } from '../../../../../core/services/payment-integration.service';
import { EnaRequisitionService } from '../../../../../core/services/ena-requisition.service';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { SalesmanBarmanRegistrationService } from '../../../../../core/services/salesman-barman-registration.service';
import { CompanyRegistrationService } from '../../../../../core/services/company-registration.service';
import { CompanyCollaborationService } from '../../../../../core/services/company-collaboration.service';
import { UnifiedDashboardService } from '../../../../../core/services/unified-dashboard.service';
import { SpecialPermitService } from '../../../../../core/services/special-permit.service';
import { SidebarPendingBadgeService } from '../../../../../shared/services/sidebar-pending-badge.service';
import { environment } from '../../../../../../environments/environment';
import Swal from 'sweetalert2';
import {
  AddMoneyViewContext,
  AddMoneyWalletType,
  UnifiedAddMoneyModalComponent
} from '../../../../../shared/components/unified-add-money-modal/unified-add-money-modal.component';
import { secureRandomInt, secureRandomToken } from '../../../../../core/utils/secure-random';

interface PaymentItem {
  id: string;
  referenceNo: string;
  amount: number;
  hoa: string;
  status: string;
  procurementType?: string;
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
  transactionId: string;
  transactionType: string;
  hoa: string;
  walletType?: string;
  amount: number;
  date: Date;
  status: string;
}

interface HistoryItem {
  id: string;
  txnId: string;
  userId: string;
  type: string;
  paymentFor: string;
  amount: number;
  reference: string;
  status: string;
  dateTime: Date;
  licenseeId: string;
  hoa?: string;
  walletType?: string;
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
  createdAt?: string | Date | null;
  date?: string | Date | null;
  paymentSlipUploaded?: boolean;
}

type WalletHistoryType = 'Credited' | 'Debited' | 'Refunded';
type WalletHistoryCategory = 'excise' | 'education' | 'hologram' | 'security_deposit' | 'license_fee';

interface WalletHistoryTransaction {
  id: string;
  date: string;
  type: WalletHistoryType;
  amount: number;
  balanceAfter: number;
  reference: string;
  paymentFor?: string;
}

interface MyLicenseRow {
  license_id?: string;
  licenseId?: string;
  license_sub_category_id?: number;
  licenseSubCategoryId?: number;
  license_sub_category?: string;
  licenseSubCategory?: string;
  license_category?: string | Record<string, unknown>;
  licenseCategory?: string | Record<string, unknown>;
  license_category_name?: string;
  licenseCategoryName?: string;
  license_type?: string | number | Record<string, unknown>;
  licenseType?: string | number | Record<string, unknown>;
  license_type_name?: string;
  licenseTypeName?: string;
  status?: string;
  stage_name?: string;
  stageName?: string;
}

type WalletModuleType = 'distillery' | 'brewery' | 'distributor' | 'other' | '';
type PaymentModuleTab = 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram';
type OtherModuleTab = 'security_deposit' | 'license_fee';
type WalletTableTab = PaymentModuleTab | OtherModuleTab | 'recharge' | 'history';
type WalletViewMode = 'wallets' | 'others';

interface PendingWalletPaymentContext {
  id: string;
  tab: WalletTableTab;
  itemType: string;
  referenceNo: string;
  amount: number;
}

type HologramTabRow = HistoryItem & {
  canPay?: boolean;
  procurementId?: string;
  hologramItem?: HologramItem;
};

interface PendingWalletPaymentPreview {
  moduleLabel: string;
  walletLabel: string;
  referenceNo: string;
  currentBalance: number;
  deductionAmount: number;
  balanceAfter: number;
  shortfall: number;
}

// Per payment logic document:
// - License fee HOA: 0039-00-800-45-02
// - Security deposit: no HOA (backend stores sentinel like "non")
const SECURITY_DEPOSIT_HOA_SENTINEL = 'non';
const LEGACY_SECURITY_DEPOSIT_HOA = '0088-00-888-88-88';
const LICENSE_FEE_HOA = '0039-00-800-45-02';
const LEGACY_LICENSE_FEE_HOA = '0099-00-999-99-99';
const LICENSE_RENEWAL_MODULE_CODE = '002';

const DEFAULT_WALLET_HOA_BY_TYPE: Record<AddMoneyWalletType, string> = {
  excise: '',
  brewery: '',
  distillery: '',
  education: '',
  hologram: '',
  security_deposit: '',
  license_fee: LICENSE_FEE_HOA
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
  Math = Math;
  private sidebarBadgeService = inject(SidebarPendingBadgeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly optimisticPaymentStorageKey = 'wallet.optimistic.payments';
  private readonly pendingPaymentStorageKey = 'wallet.pending.payment.context';
  private readonly isBrowser = typeof window !== 'undefined';
  private _walletViewMode: WalletViewMode = 'wallets';
  @Input()
  set walletViewMode(mode: WalletViewMode) {
    if (mode && this._walletViewMode !== mode) {
      this._walletViewMode = mode;
      this.ensureActiveTabAllowed();
    }
  }
  get walletViewMode(): WalletViewMode {
    return this._walletViewMode;
  }
  @Output() walletViewModeChange = new EventEmitter<WalletViewMode>();
  activeTab: WalletTableTab = 'requisition';
  tablePageSizeOptions: number[] = [5, 10, 15];

  modalContext: AddMoneyViewContext | null = null;
  currentTxnId: string = '';
  paymentAmount: number = 0;

  private tablePageSizeByTab: Record<WalletTableTab, number> = {
    requisition: 5,
    revalidation: 5,
    cancellation: 5,
    transit: 5,
    hologram: 5,
    security_deposit: 5,
    license_fee: 5,
    recharge: 5,
    history: 5
  };
  private tableCurrentPageByTab: Record<WalletTableTab, number> = {
    requisition: 1,
    revalidation: 1,
    cancellation: 1,
    transit: 1,
    hologram: 1,
    security_deposit: 1,
    license_fee: 1,
    recharge: 1,
    history: 1
  };
  private walletDataLoaded = false;
  pendingWalletPaymentContext: PendingWalletPaymentContext | null = null;
  pendingWalletPaymentPreview: PendingWalletPaymentPreview | null = null;
  private hasHandledPendingWalletPayment = false;
  private cancellationWalletSyncAttempted = new Set<string>();
  private chainedNewLicenseSecurityAmount = 0;
  private pendingNewLicenseApplicationId = '';
  private pendingNewLicenseReferenceNo = '';
  private pendingNewLicenseLicenseFeeAmount = 0;
  private pendingNewLicenseSecurityFeeAmount = 0;
  private pendingNewLicenseIsLicenseFeePaid = false;
  private pendingNewLicenseIsSecurityFeePaid = false;

  // Monthly filter method - declared early to avoid TypeScript issues
  private setCurrentMonthAutomatically(): void {
    const currentDate = new Date();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0'); // Current month as 01-12

    this.walletHistoryFilters.month = currentMonth;
    this.applyWalletHistoryFilters();
  }
  private isHandlingPendingWalletPayment = false;
  showPendingWalletConfirmationModal = false;
  pendingWalletPaymentDeclarationAccepted = false;
  private autoSelectLastPaidTabOnLoad = false;
  private pendingHologramAutoPayRefNo = '';
  private pendingHologramAutoPayType = '';
  private readonly hologramDeepLinkStorageKey = 'wallet.pending.hologram.ref';
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
  private billdeskRetryLockUntil: Date | null = null;
  private movedModalState: Array<{ element: HTMLElement; parent: Node; nextSibling: Node | null }> = [];

  // Wallet Balances
  exciseWalletBalance = 0;
  breweryWalletBalance = 0;
  educationCessBalance = 0;
  hologramWalletBalance = 0;
  securityDepositBalance = 0;
  newLicenseSecurityDepositAmount = 0;
  companyCollabSecurityDepositAmount = 0;
  hasAppliedCompanyCollaboration = false;
  hasPaidCompanyCollabSecurityDeposit = false;
  private paidCompanyCollabSecurityAmount = 0;
  private paidCompanyCollabSecurityRefs = new Set<string>();
  private paidCompanyCollabLicenseRefs = new Set<string>();
  licenseFeeBalance = 0;
  activeLicenseeId = '';
  private activeLicenseeName = '';
  private readonly licenseApiBase = `${environment.apiBaseUrl}/masters/license`;
  private resolvedLicenseModuleType: WalletModuleType = '';
  private walletHoaByType: Record<AddMoneyWalletType, string> = { ...DEFAULT_WALLET_HOA_BY_TYPE };
  private readonly http = inject(HttpClient);
  private readonly specialPermitService = inject(SpecialPermitService);
  private readonly companyCollaborationService = inject(CompanyCollaborationService);
  private readonly distilleryTabs = new Set([
    'requisition',
    'revalidation',
    'cancellation',
    'transit',
    'hologram',
    'recharge',
    'history'
  ]);
  private readonly breweryTabs = new Set(['transit', 'hologram', 'recharge', 'history']);
  private readonly otherTabs = new Set<WalletTableTab>(['security_deposit', 'license_fee', 'recharge', 'history']);

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
  requisitionData: PaymentItem[] = [];

  revalidationData: PaymentItem[] = [];

  cancellationData: PaymentItem[] = [];

  transitData: TransitItem[] = [];

  rechargeData: RechargeItem[] = [];

  historyData: HistoryItem[] = [];

  private optimisticPaymentHistory: HistoryItem[] = [];

  hologramData: HologramItem[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private receiptNumberService: ReceiptNumberService,
    private hologramService: HologramDataService,
    private supplyChainService: SupplyChainService,
    private enaRequisitionService: EnaRequisitionService,
    private paymentIntegrationService: PaymentIntegrationService,
    private licenseApplicationService: LicenseApplicationService,
    private salesmanBarmanRegistrationService: SalesmanBarmanRegistrationService,
    private companyRegistrationService: CompanyRegistrationService,
    private unifiedDashboardService: UnifiedDashboardService
  ) { }

  ngOnInit(): void {
    this.loadOptimisticPaymentsFromStorage();
    this.loadPendingPaymentContextFromStorage();
    this.initializeWalletContextAndLoadData();
    // Wallet summary/recharge/history are loaded via `initializeWalletContextAndLoadData()`, but
    // module-specific lists (hologram procurements, cancellation, etc.) must be fetched separately.
    // Without this, the Hologram tab stays empty and "Pay Now" never appears.
    this.refreshModuleTabData();

    // Get query parameters
    this.route.queryParams.subscribe(params => {
      const requestedTab = String(params['tab'] || '').trim().toLowerCase();
      const source = String(params['source'] || '').trim().toLowerCase();
      const type = String(params['type'] || '').trim().toLowerCase();
      const action = String(params['action'] || '').trim().toLowerCase();
      const viewParam = String(params['walletView'] || '').trim().toLowerCase();

      const isLicenseFeeAction =
        requestedTab === 'license_fee' ||
        requestedTab === 'security_deposit' ||
        source === 'new-license' ||
        source === 'license-renewal' ||
        type === 'new-license' ||
        type === 'license-renewal' ||
        action === 'pay';

      if (viewParam === 'others' || isLicenseFeeAction) {
        this.walletViewMode = 'others';
      } else if (viewParam === 'wallets') {
        // Keep wallets mode as-is; internal view will adjust based on license type
        this.walletViewMode = 'wallets';
      }
      this.autoSelectLastPaidTabOnLoad =
        !requestedTab ||
        requestedTab === 'recharge' ||
        source.includes('wallet');

      if (params['billNo']) {
        this.transitBillNo = params['billNo'];
        this.setActiveTab('transit');
        this.loadTransitData();
      }
      if (params['tab']) {
        this.setActiveTab(params['tab']);
      }

      this.capturePendingWalletPaymentContext(params);

      // Handle hologram payment navigation (deep link from Hologram Procurement "Make Payment")
      const actionLower = String(params['action'] || '').trim().toLowerCase();
      const deepLinkRefNo =
        String(
          params['refNo'] ??
          params['ref_no'] ??
          params['referenceNo'] ??
          params['reference_no'] ??
          ''
        ).trim();

      if (deepLinkRefNo && actionLower === 'makepayment') {
        this.pendingHologramAutoPayRefNo = deepLinkRefNo;
        this.pendingHologramAutoPayType = String(params['type'] || '').trim();

        // Only default to hologram if no tab is specified or if tab is hologram
        if (!params['tab'] || params['tab'] === 'hologram') {
          this.setActiveTab('hologram');
          // Deep-link intent is "pay this now" - do not hide rows by month filter.
          this.tabFilters = { ...this.tabFilters, month: '' };

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

        // Build pending payment context even if URL only contains refNo.
        // `tryBuild...` may be a no-op until hologram procurements load; loadHologramDataFromApi()
        // also retries once data is available.
        this.persistPendingHologramDeepLinkRef(this.pendingHologramAutoPayRefNo);
        this.tryBuildHologramPendingContextFromRefNo(this.pendingHologramAutoPayRefNo, this.pendingHologramAutoPayType);
        // Ensure procurements are loaded/refreshed after we capture the deep-link intent,
        // so the Hologram tab can immediately show the pending row + "Pay Now" CTA.
        this.loadHologramDataFromApi();

        // If a pending context already exists (e.g., restored from storage) but is missing the reference,
        // update it immediately so the "Reference" column does not show '-'.
        if (this.pendingWalletPaymentContext?.tab === 'hologram') {
          const currentRef = String(this.pendingWalletPaymentContext.referenceNo || '').trim();
          if (!currentRef || currentRef === '-') {
            this.pendingWalletPaymentContext = {
              ...this.pendingWalletPaymentContext,
              referenceNo: this.pendingHologramAutoPayRefNo
            };
            this.persistPendingPaymentContextToStorage();
          }
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
    this.unifiedDashboardService.clearUnifiedAppsCache();
    this.cleanupModalArtifacts();
    this.restoreMovedModals();
  }

  // payments/paymentconformationpage/payment-confirmation.component.ts

private initializeWalletContextAndLoadData(): void {
  // 1. Check if the URL explicitly has an ID (usually for admin views)
  const fromQuery = String(this.route.snapshot.queryParams['licenseeId'] || '').trim();
  
  // 2. GET THE SESSION ID FIRST (The source of truth for the logged-in user)
  const sessionId = this.resolveActiveLicenseeIdFromSession();

  const licenseeId = fromQuery || sessionId;

  if (!licenseeId) {
    this.showErrorMessage('No valid licensee identity found in session.');
    return;
  }

  this.activeLicenseeId = licenseeId;
  
  // Now resolve the module type ONLY for this specific ID, 
  // don't let it pick a random preferred one from a list.
  this.http.get<MyLicenseRow[]>(`${this.licenseApiBase}/me/`).subscribe({
    next: (licenses) => {
      const rows = Array.isArray(licenses) ? licenses : [];
      const activeRow = rows.find(r => 
        (r.license_id || r.licenseId) === licenseeId ||
        (r as any)?.applicant?.username === licenseeId ||
        (r as any)?.username === licenseeId ||
        (r as any)?.user_id === licenseeId
      ) || (rows.length > 0 ? rows[0] : null);
      
      const resolvedModuleType = this.resolveModuleTypeFromLicense(activeRow);
      this.applyResolvedModuleType(resolvedModuleType);
      
      this.loadWalletDataFromBackend(licenseeId);
    },
    error: () => {
      this.loadWalletDataFromBackend(licenseeId);
    }
  });
}

  private refreshModuleTabData(): void {
    this.loadHologramDataFromApi();
    this.loadCancellationDataFromApi();
  }

  private loadWalletDataFromBackend(licenseeId: string): void {
    this.walletDataLoaded = false;
    this.activeLicenseeId = licenseeId;
    this.exciseWalletBalance = 0;
    this.educationCessBalance = 0;
    this.breweryWalletBalance = 0;
    this.hologramWalletBalance = 0;
    this.securityDepositBalance = 0;
    this.licenseFeeBalance = 0;
    this.walletHoaByType = { ...DEFAULT_WALLET_HOA_BY_TYPE };
    this.rechargeData = [];
    this.historyData = [];
    this.exciseWalletTransactions = [];
    this.educationWalletTransactions = [];
    this.hologramWalletTransactions = [];
    this.securityDepositWalletTransactions = [];
    this.licenseFeeWalletTransactions = [];
    this.walletHistoryFiltered = [];

    this.paymentIntegrationService.clearWalletCache(licenseeId);

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
      ),
      collabApps: this.companyCollaborationService.listCompanyCollaborations().pipe(
        catchError(() => of([] as any))
      )
    }).subscribe((response) => {
      const collabList = Array.isArray(response.collabApps)
        ? response.collabApps
        : (response.collabApps?.results || response.collabApps?.data || []);
      this.paidCompanyCollabSecurityRefs = new Set<string>();
      this.paidCompanyCollabLicenseRefs = new Set<string>();
      this.paidCompanyCollabSecurityAmount = 0;
      collabList.forEach((app: any) => {
        const refNo = this.getCompanyCollabReferenceFromApp(app);
        if (!refNo) return;
        if (Boolean(app.is_license_fee_paid || app.isLicenseFeePaid)) {
          this.paidCompanyCollabLicenseRefs.add(refNo);
        }
      });
      this.hasPaidCompanyCollabSecurityDeposit = false;
      this.hasAppliedCompanyCollaboration = (collabList && collabList.length > 0);

      // Auto-restore pending payment context from backend flags (survives hard refresh)
      if (!this.pendingWalletPaymentContext) {
        const pendingCollabApp = collabList.find((app: any) => {
          const licPaid = Boolean(app.is_license_fee_paid || app.isLicenseFeePaid);
          return !licPaid;
        });
        if (pendingCollabApp) {
          const refNo = String(pendingCollabApp.application_id || pendingCollabApp.applicationId || '').trim();
          const appId = String(pendingCollabApp.id || '').trim();
          if (refNo) {
            this.pendingWalletPaymentContext = {
              tab: 'license_fee',
              amount: 25000,
              itemType: 'company-collaboration',
              referenceNo: refNo,
              id: appId
            };
            this.hasHandledPendingWalletPayment = false;
            this.persistPendingPaymentContextToStorage();
          }
        }
      }

      this.applyWalletSummary(response.summary);
      this.applyWalletRecharge(response.recharge);
      this.applyWalletHistory(response.history);

      this.walletDataLoaded = true;
      this.applyLastPaidTabAsDefault();
      if (this.pendingWalletPaymentContext && !this.hasHandledPendingWalletPayment) {
        const appType = this.getPendingApplicationType();
        if (appType !== 'new-license' && appType !== 'company-collaboration') {
          this.openPendingWalletPaymentConfirmation();
        }
      }
      this.cdr.detectChanges();
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
    const moduleTypePriority = (row: MyLicenseRow): number => {
      const moduleType = this.resolveModuleTypeFromLicense(row);
      if (moduleType === 'distillery' || moduleType === 'brewery' || moduleType === 'distributor') return 0;
      if (moduleType === 'other') return 1;
      return 2;
    };

    const naBoost = (row: MyLicenseRow): number => {
      const licenseId = String(row?.license_id ?? row?.licenseId ?? '').trim().toUpperCase();
      return licenseId.startsWith('NA/') ? 0 : 1;
    };

    const eligible = rows
      .filter((row) => this.resolveModuleTypeFromLicense(row) !== '')
      .slice()
      .sort((a, b) => moduleTypePriority(a) - moduleTypePriority(b) || naBoost(a) - naBoost(b));

    const approvedEligible = eligible.filter((row) => this.isApprovedLicenseRow(row));
    if (approvedEligible.length > 0) {
      return approvedEligible[0];
    }
    if (eligible.length > 0) {
      return eligible[0];
    }
    return rows[0] ?? null;
  }

  private resolveAndApplyModuleTypeForLicense(licenseeId: string): void {
    const normalizedId = String(licenseeId || '').trim().toLowerCase();
    if (!normalizedId) {
      this.applyResolvedModuleType(this.resolvedLicenseModuleType);
      return;
    }

    this.http.get<MyLicenseRow[]>(`${this.licenseApiBase}/me/`)
      .pipe(catchError(() => of([] as MyLicenseRow[])))
      .subscribe((licenses) => {
        const rows = Array.isArray(licenses) ? licenses : [];
        const matching = rows.find((row) => {
          const rowId = String(row.license_id ?? row.licenseId ?? '').trim().toLowerCase();
          return !!rowId && rowId === normalizedId;
        });

        if (matching) {
          this.applyResolvedModuleType(this.resolveModuleTypeFromLicense(matching));
          return;
        }

        const fallback = this.pickPreferredWalletLicense(rows);
        this.applyResolvedModuleType(this.resolveModuleTypeFromLicense(fallback));
      });
  }

  private isApprovedLicenseRow(row: MyLicenseRow | null | undefined): boolean {
    if (!row) {
      return false;
    }

    const licenseId = String(row.license_id ?? row.licenseId ?? '').trim();
    if (licenseId) {
      return true;
    }

    const status = String(row.status || '').toLowerCase();
    const stage = String(row.stage_name ?? row.stageName ?? '').toLowerCase();
    if (!status && !stage) {
      return false;
    }

    return (
      status.includes('approved') ||
      stage.includes('approved') ||
      stage.includes('license issued')
    );
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
    if (subCategoryId === 31) {
      return 'distributor';
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
    if (subCategoryName.includes('distribut')) {
      return 'distributor';
    }

    const catName = this.extractLicenseCategoryTextFromRow(row);
    if (catName.includes('distribut')) {
      return 'distributor';
    }

    // Issued licenses that are not brewery/distillery/distributor (FLR shop, bar, etc.): backend module_type "other".
    const licenseId = String(row.license_id ?? row.licenseId ?? '').trim();
    if (licenseId) {
      return 'other';
    }

    const stageText = String(
      row.stage_name ??
      row.stageName ??
      row.status ??
      (row as any).current_stage_name ??
      (row as any).currentStageName ??
      ''
    ).toLowerCase();
    if (stageText.includes('approved') || (stageText.includes('awaiting') && stageText.includes('payment'))) {
      return 'other';
    }

    if (this.isManufacturingCategoryFromLicenseRow(row)) {
      return 'other';
    }
    return '';
  }

  private extractLicenseCategoryTextFromRow(row: MyLicenseRow | null | undefined): string {
    if (!row) {
      return '';
    }
    const nested = row.license_category ?? row.licenseCategory;
    if (nested && typeof nested === 'object') {
      const raw =
        (nested as any)?.license_category ??
        (nested as any)?.licenseCategory ??
        (nested as any)?.category_name ??
        (nested as any)?.name ??
        '';
      return String(raw ?? '').toLowerCase();
    }
    const raw =
      row.license_category_name ??
      row.licenseCategoryName ??
      (typeof nested === 'string' ? nested : '') ??
      '';
    return String(raw ?? '').toLowerCase();
  }

  private extractLicenseTypeTextFromRow(row: MyLicenseRow | null | undefined): string {
    if (!row) {
      return '';
    }
    const nested = row.license_type ?? row.licenseType;
    if (nested && typeof nested === 'object') {
      const raw =
        (nested as any)?.license_type ??
        (nested as any)?.licenseType ??
        (nested as any)?.name ??
        '';
      return String(raw ?? '').toLowerCase();
    }
    const raw =
      row.license_type_name ??
      row.licenseTypeName ??
      (typeof nested === 'string' ? nested : '') ??
      '';
    return String(raw ?? '').toLowerCase();
  }

  private isManufacturingCategoryFromLicenseRow(row: MyLicenseRow | null | undefined): boolean {
    const category = this.extractLicenseCategoryTextFromRow(row);
    if (category.includes('manufactur')) {
      return true;
    }
    const licenseType = this.extractLicenseTypeTextFromRow(row);
    return licenseType.includes('manufactur');
  }

  private applyResolvedModuleType(moduleType: WalletModuleType): void {
    this.resolvedLicenseModuleType = moduleType;
    this.isBreweryUser = moduleType === 'brewery';
    this.walletModuleLabel =
      moduleType === 'brewery'
        ? 'Brewery'
        : moduleType === 'distillery'
          ? 'Distillery'
          : moduleType === 'distributor'
            ? 'Distributor'
            : moduleType === 'other'
              ? 'License'
              : 'Distillery';

    // Brewery/distillery/distributor use the full "Wallets" tabs; other manufacturing uses the same wallet page in "Others" mode.
    const isFullWalletModule = moduleType === 'brewery' || moduleType === 'distillery' || moduleType === 'distributor';
    const qParams = this.route.snapshot?.queryParams || {};
    const requestedTab = String(qParams['tab'] || '').trim().toLowerCase();
    const requestedSource = String(qParams['source'] || '').trim().toLowerCase();
    const requestedType = String(qParams['type'] || '').trim().toLowerCase();
    const requestedAction = String(qParams['action'] || '').trim().toLowerCase();
    const requestedView = String(qParams['walletView'] || '').trim().toLowerCase();

    const isLicenseFeeAction =
      requestedTab === 'license_fee' ||
      requestedTab === 'security_deposit' ||
      requestedSource === 'new-license' ||
      requestedSource === 'license-renewal' ||
      requestedType === 'new-license' ||
      requestedType === 'license-renewal' ||
      requestedAction === 'pay' ||
      requestedView === 'others';

    if ((!isFullWalletModule || isLicenseFeeAction) && this.walletViewMode !== 'others' && requestedView !== 'wallets') {
      this.walletViewMode = 'others';
      const currentView = String(this.route.snapshot?.queryParams?.['walletView'] || '').trim().toLowerCase();
      if (currentView !== 'others') {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { walletView: 'others' },
          queryParamsHandling: 'merge'
        });
      }
    }

    this.ensureActiveTabAllowed();
  }

  private normalizeWalletTypeKey(raw: any): string {
    const value = String(raw || '').trim().toLowerCase();
    if (!value) return '';
    const cleaned = value.replace(/[\s-]+/g, '_');
    if (cleaned === 'education' || cleaned === 'educationcess' || cleaned === 'education_cess') return 'education_cess';
    if (cleaned === 'licensefee' || cleaned === 'license_fee') return 'license_fee';
    if (cleaned === 'securitydeposit' || cleaned === 'security_deposit') return 'security_deposit';
    return cleaned;
  }

  canShowTab(tab: string): boolean {
    const value = String(tab || '').trim().toLowerCase();
    if (this.walletViewMode === 'others') {
      return this.otherTabs.has(value as WalletTableTab);
    }
    const set = this.isBreweryUser ? this.breweryTabs : this.distilleryTabs;
    return set.has(value);
  }

  private ensureActiveTabAllowed(): void {
    if (this.canShowTab(this.activeTab)) {
      return;
    }
    if (this.walletViewMode === 'others') {
      this.activeTab = 'security_deposit';
      return;
    }
    this.activeTab = this.isBreweryUser ? 'transit' : 'requisition';
  }

  private expandLicenseAliases(value: any): string[] {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return [];

    const out: string[] = [normalized];
    if (normalized.startsWith('nli/')) {
      out.push(`na/${normalized.slice(4)}`);
    } else if (normalized.startsWith('na/')) {
      out.push(`nli/${normalized.slice(3)}`);
    }

    // Preserve order, remove duplicates.
    const seen = new Set<string>();
    return out.filter((item) => {
      const key = String(item || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private isForActiveLicense(item: any): boolean {
    const activeRaw = String(this.activeLicenseeId || '').trim();
    const activeAliases = this.expandLicenseAliases(activeRaw);
    if (activeAliases.length === 0) return true;

    const candidate = String(
      this.pickAny(item, [
        'licensee_id',
        'licenseeId',
        'license_id',
        'licenseId',
        'licensed_id',
        'licensedId',
        'user_id',
        'userId'
      ], '')
    ).trim().toLowerCase();

    const candidateAliases = this.expandLicenseAliases(candidate);
    if (candidateAliases.length === 0) return true;

    if (candidateAliases.some((c) => activeAliases.includes(c))) {
      return true;
    }

    // Same logged-in user but wallet rows still keyed by legacy username (e.g. TH...) while active license is NA/...
    const sessionUser = String(this.resolveActiveLicenseeIdFromSession() || '').trim().toLowerCase();
    const rowUser = String(this.pickAny(item, ['user_id', 'userId'], '') || '').trim().toLowerCase();
    if (sessionUser && rowUser && sessionUser === rowUser) {
      return true;
    }
    return false;
  }

  private applyWalletSummary(payload: any): void {
    const rows = this.safeArray(payload?.results);
    const startsAsBrewery = this.resolvedLicenseModuleType === 'brewery';

    this.exciseWalletBalance = 0;
    this.educationCessBalance = 0;
    this.breweryWalletBalance = 0;
    this.hologramWalletBalance = 0;
    this.securityDepositBalance = 0;
    this.licenseFeeBalance = 0;
    this.walletHoaByType = { ...DEFAULT_WALLET_HOA_BY_TYPE };
    this.isBreweryUser = startsAsBrewery;
    this.activeLicenseeName = '';

    rows.forEach((row: any) => {
      if (!this.activeLicenseeName) {
        const candidateName = String(
          this.pickAny(row, ['licensee_name', 'licenseeName', 'manufacturing_unit', 'manufacturingUnit'], '')
        ).trim();
        if (candidateName) {
          this.activeLicenseeName = candidateName;
        }
      }
      const walletType = String(
        this.pickAny(row, ['wallet_type', 'walletType'], '')
      );
      const moduleType = String(
        this.pickAny(row, ['module_type', 'moduleType'], '')
      ).toLowerCase();
      const hoa = this.pickAny(row, ['head_of_account', 'headOfAccount'], '');
      const balance = this.toNumber(this.pickAny(row, ['current_balance', 'currentBalance'], 0));
      const inferredWalletType =
        this.normalizeWalletTypeKey(walletType) ||
        this.normalizeWalletTypeKey(this.inferWalletTypeFromHoa(String(hoa)));
      const treatAsBreweryWallet =
        inferredWalletType === 'brewery' ||
        moduleType === 'brewery' ||
        (startsAsBrewery && inferredWalletType === 'excise' && !moduleType);

      if (inferredWalletType === 'security_deposit') {
        this.securityDepositBalance += balance;
        // No HOA for security deposit as per latest business rule.
      } else if (inferredWalletType === 'license_fee') {
        this.licenseFeeBalance += balance;
        if (hoa) {
          this.walletHoaByType.license_fee = String(hoa);
        }
      } else if (inferredWalletType === 'education_cess') {
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
          // Backward compat: some UI actions still use walletType='excise' even for brewery users.
          // Mirror the brewery HOA into the excise slot so the Payment Details modal auto-fills.
          if (!String(this.walletHoaByType.excise || '').trim()) {
            this.walletHoaByType.excise = String(hoa);
          }
        }
      } else {
        this.exciseWalletBalance += balance;
        if (hoa) {
          this.walletHoaByType.excise = String(hoa);
        }
      }
    });

    this.walletModuleLabel =
      this.resolvedLicenseModuleType === 'brewery'
        ? 'Brewery'
        : this.resolvedLicenseModuleType === 'distillery'
          ? 'Distillery'
          : this.resolvedLicenseModuleType === 'distributor'
            ? 'Distributor'
            : this.resolvedLicenseModuleType === 'other'
              ? 'License'
              : this.isBreweryUser
                ? 'Brewery'
                : 'Distillery';
    this.ensureActiveTabAllowed();
  }

  private applyWalletRecharge(payload: any): void {
    const rows = this.safeArray(payload?.results);

    this.rechargeData = rows.map((row: any, index: number) => ({
      id: String(this.pickAny(row, ['wallet_transaction_id', 'walletTransactionId'], `${index + 1}`)),
      transactionId: String(this.pickAny(row, ['transaction_id', 'transactionId', 'reference_no', 'referenceNo'], '-')),
      transactionType: this.pickAny(row, ['transaction_type', 'transactionType'], 'Wallet Recharge'),
      hoa: this.pickAny(row, ['head_of_account', 'headOfAccount'], '-'),
      walletType:
        this.normalizeWalletTypeKey(this.pickAny(row, ['wallet_type', 'walletType'], '')) ||
        this.normalizeWalletTypeKey(this.inferWalletTypeFromHoa(String(this.pickAny(row, ['head_of_account', 'headOfAccount'], '')))),
      amount: this.toNumber(this.pickAny(row, ['amount'], 0)),
      date: this.toDate(this.pickAny(row, ['created_at', 'createdAt'], new Date())),
      status: this.normalizeTransactionStatus(this.pickAny(row, ['payment_status', 'paymentStatus'], ''))
    }));
  }

  private applyWalletHistory(payload: any): void {
    const rows = this.safeArray(payload?.results);

    const mappedModalHistory: Array<WalletHistoryTransaction & { walletType: string }> = rows.map((row: any, index: number) => {
      const entryType = String(this.pickAny(row, ['entry_type', 'entryType'], '')).toLowerCase();
      const hoa = String(this.pickAny(row, ['head_of_account', 'headOfAccount'], ''));
      const walletTypeRaw = this.normalizeWalletTypeKey(this.pickAny(row, ['wallet_type', 'walletType'], ''));
      const walletType = walletTypeRaw || this.normalizeWalletTypeKey(this.inferWalletTypeFromHoa(hoa));
      const createdAt = this.pickAny(row, ['created_at', 'createdAt'], new Date().toISOString());
      const balanceAfter = this.toNumber(this.pickAny(row, ['balance_after', 'balanceAfter'], 0));
      const paymentFor = this.resolvePaymentForType(row);

      const normalizedStatus = this.normalizeTransactionStatus(this.pickAny(row, ['payment_status', 'paymentStatus'], ''));
      const isCredit = entryType === 'credit' || entryType === 'cr';
      const type: WalletHistoryType = isCredit
        ? (normalizedStatus === 'Refunded' ? 'Refunded' : 'Credited')
        : 'Debited';

      return {
        id: String(this.pickAny(row, ['wallet_transaction_id', 'walletTransactionId'], `${index + 1}`)),
        date: String(createdAt).slice(0, 10),
        type,
        amount: this.toNumber(this.pickAny(row, ['amount'], 0)),
        balanceAfter,
        reference: this.pickAny(row, ['reference_no', 'referenceNo', 'transaction_id', 'transactionId'], '-'),
        paymentFor,
        walletType
      };
    });

    this.exciseWalletTransactions = mappedModalHistory.filter(item =>
      item.walletType === 'excise' || item.walletType === 'additional_excise' || item.walletType === 'additional_ed' || item.walletType === 'transit_permit_bottling_fee' || item.walletType === 'bottling_fee' || item.walletType === 'brewery' || item.walletType === ''
    );
    this.educationWalletTransactions = mappedModalHistory.filter(item => item.walletType === 'education_cess');
    this.hologramWalletTransactions = mappedModalHistory.filter(item => item.walletType === 'hologram');
    this.securityDepositWalletTransactions = mappedModalHistory.filter(item => item.walletType === 'security_deposit');
    this.licenseFeeWalletTransactions = mappedModalHistory.filter(item => item.walletType === 'license_fee');

    let collabSecurity = 0;
    let newLicenseSecurity = 0;
    this.securityDepositWalletTransactions.forEach((tx) => {
      const ref = String(tx.reference || '').toUpperCase();
      const pFor = String(tx.paymentFor || '').toUpperCase();
      const isCollab = ref.includes('CCOL') || ref.includes('COLLAB') || pFor.includes('COLLAB');
      if (tx.type === 'Credited') {
        if (isCollab) {
          collabSecurity += tx.amount;
        } else {
          newLicenseSecurity += tx.amount;
        }
      } else if (tx.type === 'Debited') {
        if (isCollab) {
          collabSecurity -= tx.amount;
        } else {
          newLicenseSecurity -= tx.amount;
        }
      }
    });

    if (collabSecurity < 0) collabSecurity = 0;
    if (newLicenseSecurity < 0) newLicenseSecurity = 0;
    const pendingApplicationType = this.getPendingApplicationType();
    const pendingCollabRef = pendingApplicationType === 'company-collaboration' ? this.pendingNewLicenseRef : '';
    const hasPaidPendingCollabSecurity = pendingCollabRef
      ? this.isCompanyCollabSecurityPaidForRef(pendingCollabRef)
      : this.hasPaidCompanyCollabSecurityDeposit;
    if (!hasPaidPendingCollabSecurity) collabSecurity = 0;
    collabSecurity = Math.max(collabSecurity, this.paidCompanyCollabSecurityAmount);
    if (collabSecurity + newLicenseSecurity > this.securityDepositBalance) {
      if (collabSecurity > this.securityDepositBalance) {
        collabSecurity = this.securityDepositBalance;
        newLicenseSecurity = 0;
      } else {
        newLicenseSecurity = Math.max(0, this.securityDepositBalance - collabSecurity);
      }
    }

    this.newLicenseSecurityDepositAmount = newLicenseSecurity;
    this.companyCollabSecurityDepositAmount = collabSecurity;

    if (this.selectedWalletForHistory) {
      this.applyWalletHistoryFilters();
    }

    this.historyData = rows.map((row: any, index: number) => {
      const entryType = String(this.pickAny(row, ['entry_type', 'entryType'], '')).toLowerCase();
      const normalizedStatus = this.normalizeTransactionStatus(this.pickAny(row, ['payment_status', 'paymentStatus'], ''));
      const isCredit = entryType === 'credit' || entryType === 'cr';
      const paymentFor = this.resolvePaymentForType(row);
      const hoa = String(this.pickAny(row, ['head_of_account', 'headOfAccount'], '') || '');
      const walletTypeRaw = String(this.pickAny(row, ['wallet_type', 'walletType'], '')).toLowerCase();
      const walletType = walletTypeRaw || this.inferWalletTypeFromHoa(hoa);
      return {
        id: String(this.pickAny(row, ['wallet_transaction_id', 'walletTransactionId'], `${index + 1}`)),
        txnId: this.pickAny(row, ['transaction_id', 'transactionId'], '-'),
        userId: this.pickAny(row, ['user_id', 'userId'], '-'),
        type: isCredit ? (normalizedStatus === 'Refunded' ? 'Wallet Refund' : 'Wallet Recharge') : 'Wallet Utilization',
        paymentFor,
        amount: this.toNumber(this.pickAny(row, ['amount'], 0)),
        reference: this.pickAny(row, ['reference_no', 'referenceNo', 'transaction_id', 'transactionId'], '-'),
        status: normalizedStatus,
        dateTime: this.toDate(this.pickAny(row, ['created_at', 'createdAt'], new Date())),
        licenseeId: this.pickAny(row, ['licensee_id', 'licenseeId'], this.activeLicenseeId || '-'),
        hoa,
        walletType
      } as HistoryItem;
    });

    this.reconcileOptimisticPayments();
    this.syncPendingPaymentContextWithLatestData();
  }

  private resolvePaymentForType(row: any): string {
    const sourceModule = String(this.pickAny(row, ['source_module', 'sourceModule'], '')).toLowerCase();
    const hoa = String(this.pickAny(row, ['head_of_account', 'headOfAccount'], '') || '').trim();
    const walletTypeRaw = this.normalizeWalletTypeKey(this.pickAny(row, ['wallet_type', 'walletType'], ''));
    const walletType = walletTypeRaw || this.normalizeWalletTypeKey(this.inferWalletTypeFromHoa(hoa));
    const txnId = String(this.pickAny(row, ['transaction_id', 'transactionId'], '')).toUpperCase();
    const reference = String(this.pickAny(row, ['reference_no', 'referenceNo'], '')).toUpperCase();
    const remarks = String(this.pickAny(row, ['remarks', 'remark', 'description'], '')).toLowerCase();

    if (reference.startsWith('DP/') || reference.startsWith('SP/')) {
      return 'Dry Day Permit Fee Paid';
    }

    // Prefer explicit wallet type when available (fixes license/security utilization rows
    // incorrectly showing "Wallet Recharge" in those tabs).
    if (walletType === 'license_fee') {
      if (reference.startsWith('RCOL/') || reference.startsWith('CC/1101/')) {
        return 'com coll renewal fee';
      }
      return 'Licensee Fee Paid';
    }
    if (walletType === 'security_deposit') {
      if (reference.startsWith('CCOL/') || sourceModule.includes('collaboration') || sourceModule.includes('ccol')) {
        return 'com col security paid';
      }
      return 'Security Fee Paid';
    }

    if (sourceModule.includes('security') && sourceModule.includes('deposit')) {
      if (reference.startsWith('CCOL/') || sourceModule.includes('collaboration') || sourceModule.includes('ccol')) {
        return 'com col security paid';
      }
      return 'Security Paid';
    }
    if (sourceModule.includes('license') && sourceModule.includes('fee')) {
      return 'Licensee Fee';
    }
    if (sourceModule.includes('hologram_procurement') || txnId.startsWith('HGP-')) {
      return 'Hologram Procurement';
    }
    if (sourceModule.includes('cancellation') || txnId.startsWith('CAN-') || reference.startsWith('CAN/') || reference.startsWith('IMFLCAN/')) {
      if (txnId.includes('EXCISE-ADD') || sourceModule.includes('additional') || remarks.includes('add. ed') || remarks.includes('additional excise')) {
        return 'IMFL Requisition Additional ED Refund';
      }
      if (txnId.includes('EXCISE-ED') || sourceModule.includes('imfl_permit_cancellation_excise') || remarks.includes('import pass fee') || remarks.includes('excise duty refund')) {
        return 'IMFL Requisition Excise Duty Refund';
      }
      if (txnId.includes('CESS') || sourceModule.includes('cess') || walletType === 'education_cess' || remarks.includes('education duty')) {
        return 'IMFL Requisition Education Duty Refund';
      }
      if (txnId.includes('FEE') || sourceModule.includes('fee') || remarks.includes('processing fee') || remarks.includes('debit')) {
        return 'IMFL Cancellation Fee';
      }
      return 'IMFL Cancellation Fee';
    }
    if (sourceModule.includes('revalidation') || txnId.startsWith('REV-') || txnId.includes('REVAL') || reference.startsWith('REV/') || reference.startsWith('IMFLREV/')) {
      if (sourceModule.includes('ena') || remarks.includes('ena') || reference.startsWith('REV/') || txnId.includes('ENA')) {
        return 'ENA Revalidation Fee';
      }
      return 'IMFL Revalidation Fee';
    }
    if (sourceModule.includes('transit') || txnId.startsWith('TRP-') || reference.startsWith('TRP/')) {
      const entryType = String(this.pickAny(row, ['entry_type', 'entryType'], '')).toLowerCase();
      const pStatus = String(this.pickAny(row, ['payment_status', 'paymentStatus'], '')).toLowerCase();
      const isRefund = entryType === 'cr' || entryType === 'credit' || pStatus === 'refunded' || remarks.includes('refund');

      if (txnId.includes('BOTTLING_FEE') || txnId.includes('BOTTLING') || walletType.includes('bottling') || remarks.includes('bottling')) {
        return isRefund ? 'Transit - Bottling Fee Refund' : 'Transit - Bottling Fee';
      }
      if (txnId.includes('ADDITIONAL_EXCISE') || sourceModule.includes('additional') || walletType === 'additional_excise' || remarks.includes('additional')) {
        return isRefund ? 'Transit - Additional Excise Duty Refund' : 'Transit - Additional Excise Duty';
      }
      if (txnId.includes('EXCISE_DUTY') || (sourceModule.includes('excise') && walletType === 'excise') || remarks.includes('excise duty')) {
        return isRefund ? 'Transit - Excise Duty Refund' : 'Transit - Excise Duty';
      }
      if (walletType === 'education_cess' || sourceModule.includes('cess') || remarks.includes('education')) {
        return isRefund ? 'Transit - Education Duty Refund' : 'Transit - Education Duty';
      }
      return isRefund ? 'Transit Permit Refund' : 'Transit Permit Fee';
    }
    if (sourceModule.includes('requisition') || txnId.includes('REQ') || reference.includes('REQ') || reference.startsWith('NHP/')) {
      if (txnId.includes('EXCISE-ADD') || sourceModule.includes('additional') || remarks.includes('add. ed') || remarks.includes('additional excise') || walletType === 'additional_excise') {
        return 'IMFL Requisition Additional Excise Duty';
      }
      if (txnId.includes('EXCISE-ED') || sourceModule.includes('excise') || remarks.includes('import pass fee') || walletType === 'excise') {
        return 'IMFL Requisition Excise Duty';
      }
      if (txnId.includes('CESS') || sourceModule.includes('cess') || walletType === 'education_cess') {
        return 'IMFL Requisition Education Duty';
      }
      return 'IMFL Requisition Fee';
    }
    if (sourceModule.includes('wallet')) {
      return 'Wallet Recharge';
    }
    return 'Other';
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

  private normalizeTransactionStatus(value: any): string {
    const raw = String(value || '').trim().toLowerCase();
    // If backend doesn't send a status, treat it as pending (NOT successful) to avoid
    // incorrectly hiding pending-payment CTAs.
    if (!raw) return 'Pending';
    if (raw === 'r' || raw.includes('refund')) {
      return 'Refunded';
    }
    if (raw === 's' || raw.includes('success') || raw.includes('completed')) {
      return 'Payment Successful';
    }
    if (raw === 'p' || raw.includes('pending')) {
      return 'Pending';
    }
    if (raw === 'f' || raw.includes('fail') || raw.includes('error')) {
      return 'Failed';
    }
    return String(value);
  }

  private inferWalletTypeFromHoa(hoa: string): string {
    if (hoa === SECURITY_DEPOSIT_HOA_SENTINEL || hoa === LEGACY_SECURITY_DEPOSIT_HOA) {
      return 'security_deposit';
    }
    if (hoa === LICENSE_FEE_HOA || hoa === LEGACY_LICENSE_FEE_HOA) {
      return 'license_fee';
    }
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
    this.hologramService.getProcurements(true).subscribe({
      next: (data) => {
        console.log('Fetched Hologram Procurements for Payment:', data);
        // IMPORTANT:
        // - For licensee users, the backend already scopes procurements to the logged-in user.
        // - Many deployments do NOT include `licensee_id` / `user_id` fields in procurement rows
        //   (often they only have numeric `licensee` ids), so client-side filtering via
        //   `isForActiveLicense()` can incorrectly hide all rows and the Hologram tab stays empty.
        // Keep filtering only when an explicit `licenseeId` was requested via query param (admin-style view).
        const explicitLicenseeId = String(this.route.snapshot.queryParams['licenseeId'] || '').trim();
        const procurements = (data || []) as any[];
        const filtered = explicitLicenseeId ? procurements.filter(item => this.isForActiveLicense(item)) : procurements;

        this.hologramData = filtered.map(item => {
            const localQty = Number(
              (item as any).requested_local_qty ??
              (item as any).requestedLocalQty ??
              (item as any).localQty ??
              (item as any).local_qty
            ) || 0;
            const exportQty = Number(
              (item as any).requested_export_qty ??
              (item as any).requestedExportQty ??
              (item as any).exportQty ??
              (item as any).export_qty
            ) || 0;
            const defenceQty = Number(
              (item as any).requested_defence_qty ??
              (item as any).requestedDefenceQty ??
              (item as any).defenceQty ??
              (item as any).defence_qty
            ) || 0;
            const totalQty = localQty + exportQty + defenceQty;
            const hologramFee = totalQty * 0.15;
            const paymentDetails: any = (item as any).paymentDetails || (item as any).payment_details || {};
            const paidAt = paymentDetails?.paid_at ? new Date(paymentDetails.paid_at) : null;
            const createdAt =
              (item as any).createdAt ||
              (item as any).created_at ||
              (item as any).submittedAt ||
              (item as any).submitted_at ||
              (item as any).date ||
              (item as any).created ||
              null;
            const recordDate =
              (item as any).date ||
              (item as any).createdAt ||
              (item as any).created_at ||
              null;
            const referenceNo =
              (item as any).refNo ||
              (item as any).ref_no ||
              (item as any).ourRefNo ||
              (item as any).our_ref_no ||
              (item as any).referenceNo ||
              (item as any).reference_no ||
              '';
            const normalizedStatus = (item as any).status || (item as any).paymentStatus || (item as any).payment_status || 'Pending';

            return {
              id: item.id?.toString() || '',
              referenceNo,
              companyName: (item as any).licenseeName || (item as any).manufacturingUnit || (item as any).distillery_name || '',
              procurementType: 'Security Hologram',
              totalQuantity: totalQty,
              hologramFee,
              hoa: '0039-00-800-45-01',
              status: normalizedStatus,
              localQty,
              exportQty,
              defenceQty,
              paymentDate: paidAt,
              createdAt,
              date: recordDate,
              paymentDetails,
              paymentStatus: normalizedStatus
            } as HologramItem;
          }).filter(item => !!item.referenceNo);

        if (this.pendingHologramAutoPayRefNo) {
          this.tryBuildHologramPendingContextFromRefNo(
            this.pendingHologramAutoPayRefNo,
            this.pendingHologramAutoPayType
          );
        }
        this.syncPendingPaymentContextWithLatestData();
      },
      error: (err) => console.error('Error fetching hologram payments:', err)
    });
  }

  private syncPendingPaymentContextWithLatestData(): void {
    const deepLinkRef = this.getPendingHologramDeepLinkRef();
    if ((!this.pendingWalletPaymentContext || this.pendingWalletPaymentContext.tab !== 'hologram') && deepLinkRef) {
      this.tryBuildHologramPendingContextFromRefNo(deepLinkRef, this.pendingHologramAutoPayType);
    }

    const context = this.pendingWalletPaymentContext;
    if (!context) return;

    // License fee / security deposit: clear the synthetic "Pending Payment" row after we observe a
    // successful debit/utilization for the same reference *and* wallet type in wallet history.
    if (context.tab === 'license_fee' || context.tab === 'security_deposit') {
      const ref = String(context.referenceNo || '').trim().toUpperCase();
      if (!ref) return;

      const walletType = String(context.tab).trim().toLowerCase();
      const hasMatchingPaidTxn = this.historyData.some((txn) => {
        const txnRef = String(txn?.reference || '').trim().toUpperCase();
        if (txnRef !== ref) return false;

        const status = String(txn?.status || '').toLowerCase();
        const isSuccessful = status.includes('success') || status.includes('paid') || status.includes('completed');
        if (!isSuccessful) return false;

        const type = String(txn?.type || '').toLowerCase();
        const isDebitLike = type.includes('utilization') || type.includes('utilized') || type.includes('debit');
        if (!isDebitLike) return false;

        const txnWalletType = String((txn as any)?.walletType || '').trim().toLowerCase();
        if (txnWalletType) return txnWalletType === walletType;

        // Fallback for older payloads where walletType isn't available.
        const paymentFor = String(txn?.paymentFor || '').toLowerCase();
        if (walletType === 'license_fee') return paymentFor.includes('license');
        if (walletType === 'security_deposit') return paymentFor.includes('security');
        return false;
      });

      if (hasMatchingPaidTxn) {
        this.pendingWalletPaymentContext = null;
        this.hasHandledPendingWalletPayment = true;
        this.clearPendingPaymentContextFromStorage();
      }
      return;
    }

    if (context.tab !== 'hologram') return;

    const ref = String(context.referenceNo || '').trim().toUpperCase();
    if (!ref) return;

    const hasMatchingPaidTxn = this.historyData.some((txn) => {
      const paymentFor = String(txn?.paymentFor || '').toLowerCase();
      const type = String(txn?.type || '').toLowerCase();
      const status = String(txn?.status || '').toLowerCase();
      const txnRef = String(txn?.reference || '').trim().toUpperCase();
      const isHologram = paymentFor.includes('hologram');
      const isDebitLike = type.includes('utilization') || type.includes('utilized') || type.includes('debit');
      const isSuccessful = status.includes('success') || status.includes('paid') || status.includes('completed');
      return isHologram && isDebitLike && isSuccessful && txnRef === ref;
    });

    const matchingHologramItems = this.hologramData.filter((item) => {
      const itemRef = String(item?.referenceNo || '').trim().toUpperCase();
      return itemRef === ref;
    });

    if (hasMatchingPaidTxn) {
      this.pendingWalletPaymentContext = null;
      this.pendingHologramAutoPayRefNo = '';
      this.pendingHologramAutoPayType = '';
      this.hasHandledPendingWalletPayment = true;
      this.clearPendingPaymentContextFromStorage();
      this.clearPendingHologramDeepLinkRef();
      return;
    }

    if (matchingHologramItems.length === 0) {
      return;
    }

    const hasPayableHologramItem = matchingHologramItems.some((item) => this.canPayHologram(item));

    if (!hasPayableHologramItem) {
      if (deepLinkRef && ref === deepLinkRef.trim().toUpperCase()) {
        return;
      }
      this.pendingWalletPaymentContext = null;
      this.pendingHologramAutoPayRefNo = '';
      this.pendingHologramAutoPayType = '';
      this.hasHandledPendingWalletPayment = true;
      this.clearPendingPaymentContextFromStorage();
      this.clearPendingHologramDeepLinkRef();
    }
  }

  private tryBuildHologramPendingContextFromRefNo(refNo: string, typeHint?: string): void {
    const targetRef = String(refNo || '').trim();
    if (!targetRef || !Array.isArray(this.hologramData) || this.hologramData.length === 0) return;

    const targetRefUpper = targetRef.toUpperCase();
    const typeHintLower = String(typeHint || '').trim().toLowerCase();

    const sameRefItems = this.hologramData.filter((item) =>
      String(item?.referenceNo || '').trim().toUpperCase() === targetRefUpper
    );
    if (sameRefItems.length === 0) return;

    const typedItems = typeHintLower
      ? sameRefItems.filter((item) => String(item?.procurementType || '').trim().toLowerCase() === typeHintLower)
      : sameRefItems;

    const candidatePool = typedItems.length > 0 ? typedItems : sameRefItems;
    const isDeepLinkedRef = targetRefUpper === this.getPendingHologramDeepLinkRef().trim().toUpperCase();
    const chosen = candidatePool.find((item) => this.canPayHologram(item)) || (isDeepLinkedRef ? candidatePool[0] : undefined);
    if (!chosen) return;

    const id = String(chosen?.id || '').trim();
    const amount = Number(chosen?.hologramFee || 0);
    if (!id || !Number.isFinite(amount) || amount <= 0) return;

    this.pendingWalletPaymentContext = {
      id,
      tab: 'hologram',
      itemType: 'hologram',
      referenceNo: String(chosen.referenceNo || targetRef),
      amount
    };
    this.pendingHologramAutoPayRefNo = String(chosen.referenceNo || targetRef);
    this.hasHandledPendingWalletPayment = false;
    this.setActiveTab('hologram');
    this.persistPendingPaymentContextToStorage();
    this.persistPendingHologramDeepLinkRef(this.pendingHologramAutoPayRefNo);
  }

  loadCancellationDataFromApi(): void {
    this.supplyChainService.getCancellations().subscribe({
      next: (data) => {
        console.log('Fetched Cancellation Data:', data);
        const allRows = Array.isArray(data) ? data : [];
        // Map backend data to PaymentItem interface
        this.cancellationData = allRows.filter(item =>
          this.isForActiveLicense(item) && (
            this.isCancellationPaymentQueueStatus(item.status)
          )
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

        this.syncMissingCancellationWalletDebits(allRows);
      },
      error: (err) => console.error('Error fetching cancellation data', err)
    });
  }

  private syncMissingCancellationWalletDebits(rows: any[]): void {
    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    const existingRefs = new Set(
      (this.historyData || [])
        .map((item) => String(item?.reference || '').trim().toUpperCase())
        .filter((ref) => !!ref)
    );

    const pendingRows = rows.filter((row) => {
      if (!this.isForActiveLicense(row)) {
        return false;
      }

      const id = String(row?.id || '').trim();
      if (!id || this.cancellationWalletSyncAttempted.has(id)) {
        return false;
      }

      const status = this.normalizeStatus(
        String(row?.status || row?.current_stage_name || row?.currentStageName || '')
      );
      if (status.includes('reject')) {
        return false;
      }

      const amount = this.toNumber(row?.totalCancellationAmount ?? row?.total_cancellation_amount ?? row?.cancellation_br_amount);
      if (!(amount > 0)) {
        return false;
      }

      const reference = String(row?.ourRefNo || row?.our_ref_no || '').trim().toUpperCase();
      if (reference && existingRefs.has(reference)) {
        return false;
      }

      return true;
    });

    if (pendingRows.length === 0) {
      return;
    }

    const syncRequests: Observable<any>[] = pendingRows.map((row) => {
      const id = String(row?.id || '').trim();
      this.cancellationWalletSyncAttempted.add(id);
      return this.supplyChainService.syncCancellationWalletDebit(id).pipe(
        catchError((error) => {
          console.warn('Cancellation wallet sync failed for id:', id, error);
          return of({ __syncError: true, id });
        })
      );
    });

    forkJoin(syncRequests).subscribe((results) => {
      const hasSuccessfulSync = (results || []).some((result: any) => {
        const debit = result?.wallet_deduction;
        return debit?.debited === true || debit?.reason === 'already_debited';
      });

      if (hasSuccessfulSync) {
        this.refreshWalletData();
      }
    });
  }

  private normalizeStatus(status: string | null | undefined): string {
    return String(status || '').toLowerCase().replace(/[\s_-]+/g, '');
  }

  private isCancellationPaymentQueueStatus(status: string | null | undefined): boolean {
    const value = this.normalizeStatus(status);
    if (!value) return false;
    const isCancellationFlow = value.includes('cancellation');
    const isCommissionerFlow = value.includes('commissioner');
    const isApproved = value.includes('approv') && !value.includes('reject');
    const isForwardedPaySlip = value.includes('forward') && value.includes('payslip');
    return isCancellationFlow && isCommissionerFlow && (isApproved || isForwardedPaySlip);
  }

  // Process hologram payment - called when user completes payment
  // Process hologram payment - called when user completes payment
  // Legacy method using localStorage - deprecated for API integration
  // processHologramPayment(hologramItem: HologramItem): void { ... }

  // Wallet history (utilization and additions)
  selectedWalletForHistory: WalletHistoryCategory | null = null;
  walletHistoryFilters = {
    transactionId: '', // Transaction ID filter
    from: '',
    to: '',
    month: String(new Date().getMonth() + 1).padStart(2, '0'), // Monthly filter
    type: '', // Credited | Debited | Refunded
    minAmount: '',
    maxAmount: ''
  };

  // Main tab filters (for all tabs)
  tabFilters = {
    transactionId: '',
    month: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
    from: '',
    to: '',
    type: '',
    minAmount: '',
    maxAmount: ''
  };

  // Pagination properties
  walletHistoryPageSize = 10;
  walletHistoryCurrentPage = 1;
  walletHistoryTotalItems = 0;
  walletHistoryTotalPages = 0;

  // Monthly filter properties
  private _currentMonthCache: string = '';

  exciseWalletTransactions: WalletHistoryTransaction[] = [];

  educationWalletTransactions: WalletHistoryTransaction[] = [];

  hologramWalletTransactions: WalletHistoryTransaction[] = [];

  securityDepositWalletTransactions: WalletHistoryTransaction[] = [];

  licenseFeeWalletTransactions: WalletHistoryTransaction[] = [];

  walletHistoryFiltered: WalletHistoryTransaction[] = [];

  openWalletHistory(wallet: WalletHistoryCategory): void {
    // Clean any previous artifacts before opening a new modal
    this.cleanupModalArtifacts();
    this.selectedWalletForHistory = wallet;
    this.clearWalletHistoryFilters(false);
    this.refreshWalletHistoryFromApi();

    // Set current month automatically when opening wallet history
    this.setCurrentMonthAutomatically();

    this.updateWalletHistoryPagination();
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

  switchWalletHistory(wallet: WalletHistoryCategory): void {
    if (this.selectedWalletForHistory === wallet) return;
    this.selectedWalletForHistory = wallet;
    this.clearWalletHistoryFilters(false);
    this.refreshWalletHistoryFromApi();

    // Set current month automatically when switching wallets
    this.setCurrentMonthAutomatically();

    this.updateWalletHistoryPagination();
  }

  refreshWalletHistoryFromApi(): void {
    const licenseeId = this.activeLicenseeId || 'NA/1101/2026-27/0006';
    this.paymentIntegrationService.clearWalletCache(licenseeId);
    this.paymentIntegrationService.getWalletHistory(licenseeId, 500).pipe(
      catchError((error) => {
        console.error('Failed to force refresh wallet history from API:', error);
        return of({ results: [] } as any);
      })
    ).subscribe((response) => {
      if (response) {
        this.applyWalletHistory(response);
        this.walletHistoryFiltered = [...this.getActiveWalletTxns()];
        this.applyWalletHistoryFilters();
      }
    });
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
    if (this.selectedWalletForHistory === 'security_deposit') {
      return this.securityDepositWalletTransactions;
    }
    if (this.selectedWalletForHistory === 'license_fee') {
      return this.licenseFeeWalletTransactions;
    }
    return [];
  }

  applyWalletHistoryFilters(): void {
    const txns = this.getActiveWalletTxns();
    const f = this.walletHistoryFilters;

    this.walletHistoryFiltered = txns.filter(t => {
      // Handle transaction ID filter
      const txnIdOk = f.transactionId ? t.id.toLowerCase().includes(f.transactionId.toLowerCase()) : true;

      // Handle monthly filter
      const monthOk = f.month ? this.isTransactionInMonth(t.date, f.month) : true;

      // Handle date range filter
      const tDate = t.date;
      const afterFrom = f.from ? tDate >= f.from : true;
      const beforeTo = f.to ? tDate <= f.to : true;

      // Handle other filters
      const typeOk = f.type ? t.type === (f.type as any) : true;
      const minOk = f.minAmount ? t.amount >= Number(f.minAmount) : true;
      const maxOk = f.maxAmount ? t.amount <= Number(f.maxAmount) : true;

      return txnIdOk && monthOk && afterFrom && beforeTo && typeOk && minOk && maxOk;
    });

    // Reset to first page when filters change
    this.walletHistoryCurrentPage = 1;
    this.updateWalletHistoryPagination();
  }

  clearWalletHistoryFilters(apply: boolean = true): void {
    this.walletHistoryFilters = { transactionId: '', from: '', to: '', month: String(new Date().getMonth() + 1).padStart(2, '0'), type: '', minAmount: '', maxAmount: '' };
    if (apply) {
      this.refreshWalletHistoryFromApi();
    }
    // Reset to first page when clearing filters
    this.walletHistoryCurrentPage = 1;
    this.updateWalletHistoryPagination();
  }

  // Pagination methods
  updateWalletHistoryPagination(): void {
    this.walletHistoryTotalItems = this.walletHistoryFiltered.length;
    this.walletHistoryTotalPages = Math.ceil(this.walletHistoryTotalItems / this.walletHistoryPageSize);
  }

  getPaginatedWalletHistory(): WalletHistoryTransaction[] {
    const startIndex = (this.walletHistoryCurrentPage - 1) * this.walletHistoryPageSize;
    const endIndex = startIndex + this.walletHistoryPageSize;
    return this.walletHistoryFiltered.slice(startIndex, endIndex);
  }

  onWalletHistoryPageSizeChange(pageSize: string): void {
    this.walletHistoryPageSize = parseInt(pageSize, 10);
    this.walletHistoryCurrentPage = 1;
    this.updateWalletHistoryPagination();
  }

  onWalletHistoryPageChange(page: number): void {
    this.walletHistoryCurrentPage = page;
    this.updateWalletHistoryPagination();
  }

  getWalletHistoryPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, this.walletHistoryCurrentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.walletHistoryTotalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Monthly filter methods
  getAvailableMonths(): Array<{ value: string, label: string }> {
    const months: Array<{ value: string, label: string }> = [];

    // Simple month names from January to December
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Add all months option
    months.push({ value: '', label: 'All Months' });

    // Add each month
    monthNames.forEach((monthName, index) => {
      const monthValue = String(index + 1).padStart(2, '0'); // 01, 02, etc.
      months.push({ value: monthValue, label: monthName });
    });

    return months;
  }

  isTransactionInMonth(transactionDate: string, selectedMonth: string): boolean {
    if (!transactionDate || !selectedMonth) return false;

    try {
      // Handle different date formats to extract month number
      let monthNumber: string | undefined;

      if (transactionDate.includes('-')) {
        // Format: "2026-03-15" - extract month (03)
        const parts = transactionDate.split('-');
        monthNumber = parts[1];
      } else if (transactionDate.includes('/')) {
        // Format: "15/03/2026" or "03/2026" - extract month (03)
        const parts = transactionDate.split('/');
        if (parts.length === 3) {
          monthNumber = parts[1];
        } else if (parts.length === 2) {
          monthNumber = parts[0];
        }
      } else {
        // Try parsing as Date object
        const date = new Date(transactionDate);
        if (!isNaN(date.getTime())) {
          monthNumber = String(date.getMonth() + 1).padStart(2, '0');
        }
      }

      return monthNumber === selectedMonth;
    } catch (error) {
      console.warn('Error parsing transaction date:', transactionDate, error);
      return false;
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
    const requested = String(tab || '').trim().toLowerCase();
    if (!requested) {
      return;
    }
    if (!this.canShowTab(requested)) {
      this.ensureActiveTabAllowed();
      return;
    }
    this.activeTab = requested as WalletTableTab;
    this.syncPendingNewLicenseContextToActiveTab();
    const walletTab = this.getCurrentWalletTableTab();
    if (walletTab) {
      this.tableCurrentPageByTab[walletTab] = 1;
    }
  }

  private isFeePaid(walletType: 'license_fee' | 'security_deposit', referenceNo: string): boolean {
    const ref = String(referenceNo || '').trim().toUpperCase();
    if (!ref) return false;

    const norm = (raw: string): string => {
      const s = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
      if (s === 'licensefee' || s === 'license_fee' || s === 'license' || s === 'licensee_fee' || s === 'license_fee_wallet') return 'license_fee';
      if (s === 'securitydeposit' || s === 'security_deposit' || s === 'security' || s === 'security_deposit_wallet') return 'security_deposit';
      return s;
    };

    const targetType = norm(walletType);

    // 1. Check history & optimistic transactions first
    const merged = [...(this.optimisticPaymentHistory || []), ...(this.historyData || [])];
    const hasPaidTxn = merged.some((txn) => {
      const txnRef = String(txn?.reference || (txn as any)?.referenceNo || '').trim().toUpperCase();
      if (txnRef !== ref) return false;

      const status = String(txn?.status || '').toLowerCase();
      const isSuccessful = status.includes('success') || status.includes('paid') || status.includes('completed');
      if (!isSuccessful) return false;

      const type = String(txn?.type || '').toLowerCase();
      const isDebitLike = type.includes('utilization') || type.includes('utilized') || type.includes('debit') || type.includes('paid');
      if (!isDebitLike) return false;

      const rawWalletType = String((txn as any)?.walletType || (txn as any)?.wallet_type || '').trim();
      const normWalletType = norm(rawWalletType);
      if (normWalletType) return normWalletType === targetType;

      const paymentFor = String(txn?.paymentFor || (txn as any)?.payment_for || '').toLowerCase();
      if (targetType === 'license_fee') {
        return paymentFor.includes('license') || paymentFor.includes('collaboration') || paymentFor.includes('fee');
      }
      if (targetType === 'security_deposit') {
        return paymentFor.includes('security') || paymentFor.includes('deposit');
      }
      return true;
    });

    if (hasPaidTxn) return true;

    // 2. For company collaboration, check the flag loaded from backend
    if (ref.startsWith('CCOL/')) {
      if (targetType === 'security_deposit') return this.isCompanyCollabSecurityPaidForRef(ref);
      if (targetType === 'license_fee' && this.isCompanyCollabLicensePaidForRef(ref)) return true;
      return false;
    }

    // 3. For new license or renewal, check pending flags loaded from backend
    const isNewLicenseOrRenewalRef =
      ref.startsWith('NLI/') ||
      ref.startsWith('NLA/') ||
      ref.startsWith('NA/') ||
      ref.startsWith('LIC/') ||
      ref.startsWith('LRA/') ||
      ref.startsWith('RCR/') ||
      ref.startsWith('RSBM/');
    if (isNewLicenseOrRenewalRef) {
      if (targetType === 'license_fee' && this.pendingNewLicenseIsLicenseFeePaid) return true;
      if (targetType === 'security_deposit' && this.pendingNewLicenseIsSecurityFeePaid) return true;
    }

    return false;
  }

  private syncPendingNewLicenseContextToActiveTab(): void {
    if (!this.walletDataLoaded) return;

    const ctx = this.pendingWalletPaymentContext;
    if (!ctx) return;
    if (!this.isLicenseFeeWorkflowPaymentType(ctx.itemType)) return;
    if (!this.pendingNewLicenseApplicationId) {
      this.pendingNewLicenseApplicationId = String(ctx.id || '').trim();
    }
    if (!this.pendingNewLicenseReferenceNo) {
      this.pendingNewLicenseReferenceNo = String(ctx.referenceNo || '').trim();
    }

    const refNo = this.pendingNewLicenseReferenceNo || ctx.referenceNo;

    if (this.activeTab === 'license_fee') {
      // Do NOT override a security_deposit chain context that was intentionally set (e.g., collab chain)
      const isCollabRef = String(ctx.referenceNo || '').trim().toUpperCase().startsWith('CCOL/')
                       || String(ctx.itemType || '').trim().toLowerCase() === 'company-collaboration';
      if (isCollabRef && ctx.tab === 'security_deposit') {
        // Already chained to security deposit — keep it as-is
        return;
      }
      if (this.isFeePaid('license_fee', refNo)) {
        return;
      }
      const amount = ctx.tab === 'license_fee'
        ? ctx.amount
        : (this.pendingNewLicenseLicenseFeeAmount || ctx.amount);
      this.pendingWalletPaymentContext = {
        ...ctx,
        tab: 'license_fee',
        amount: amount || 0,
      };
      this.chainedNewLicenseSecurityAmount = this.pendingNewLicenseSecurityFeeAmount || this.chainedNewLicenseSecurityAmount || 0;
      this.ensurePendingNewLicenseAmountsResolved();
      this.persistPendingPaymentContextToStorage();
      return;
    }

    if (this.activeTab === 'security_deposit') {
      const isRenewal = String(ctx.itemType || '').trim().toLowerCase() === 'license-renewal'
                     || String(refNo || '').trim().toUpperCase().startsWith('LRA/')
                     || String(refNo || '').trim().toUpperCase().startsWith('RCR/');
      if (isRenewal) {
        return;
      }
      // Do NOT override a license_fee chain context that was intentionally set (e.g., collab reverse chain)
      const isCollabRef = String(ctx.referenceNo || '').trim().toUpperCase().startsWith('CCOL/')
                       || String(ctx.itemType || '').trim().toLowerCase() === 'company-collaboration';
      if (isCollabRef && ctx.tab === 'license_fee') {
        // Already chained to license fee — keep it as-is
        return;
      }
      if (this.isFeePaid('security_deposit', refNo)) {
        return;
      }
      const amount = ctx.tab === 'security_deposit'
        ? ctx.amount
        : (this.pendingNewLicenseSecurityFeeAmount || ctx.amount);
      this.pendingWalletPaymentContext = {
        ...ctx,
        tab: 'security_deposit',
        amount: amount || 0,
      };
      this.ensurePendingNewLicenseAmountsResolved();
      this.persistPendingPaymentContextToStorage();
    }
  }

  private normalizePaymentModuleTab(value: string): WalletTableTab | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'requisition') return 'requisition';
    if (normalized === 'revalidation') return 'revalidation';
    if (normalized === 'cancellation') return 'cancellation';
    if (normalized === 'transit' || normalized === 'transit-permit') return 'transit';
    if (normalized === 'hologram' || normalized === 'hologram-request') return 'hologram';
    if (normalized === 'license_fee' || normalized === 'licensefee' || normalized === 'new-license' || normalized === 'company-collaboration' || normalized === 'company_collaboration') return 'license_fee';
    if (normalized === 'security_deposit' || normalized === 'securitydeposit') return 'security_deposit';
    return null;
  }

  private isLicenseFeeWorkflowPaymentType(value: any): boolean {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'new-license' || normalized === 'license-renewal' || normalized === 'company-collaboration';
  }

  private normalizeApplicationReference(value: any): string {
    return String(value || '').trim().toUpperCase();
  }

  private getCompanyCollabReferenceFromApp(app: any): string {
    return this.normalizeApplicationReference(
      app?.application_id ?? app?.applicationId ?? app?.reference_no ?? app?.referenceNo ?? app?.id ?? ''
    );
  }

  private getCompanyCollabSecurityAmountFromApp(app: any): number {
    const feeDetails = this.parseObjectLike(app?.fee_details ?? app?.feeDetails);
    const amount = this.toNumber(
      app?.security_fee_amount ??
      app?.securityFeeAmount ??
      app?.security_deposit_amount ??
      app?.securityDepositAmount ??
      app?.security_fee ??
      app?.securityFee ??
      app?.security_deposit ??
      app?.securityDeposit ??
      feeDetails?.securityDeposit ??
      feeDetails?.security_deposit ??
      feeDetails?.security_fee ??
      feeDetails?.securityFee ??
      0
    );
    return amount > 0 ? amount : 25000;
  }

  private parseObjectLike(value: any): any {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private isCompanyCollabSecurityPaidForRef(referenceNo: string): boolean {
    return this.paidCompanyCollabSecurityRefs.has(this.normalizeApplicationReference(referenceNo));
  }

  private isCompanyCollabLicensePaidForRef(referenceNo: string): boolean {
    return this.paidCompanyCollabLicenseRefs.has(this.normalizeApplicationReference(referenceNo));
  }

  private capturePendingWalletPaymentContext(params: any): void {
    const action = String(params?.['action'] || '').trim().toLowerCase();
    const isPaymentAction = action === 'pay' || action === 'makepayment';
    if (!isPaymentAction) {
      if (this.shouldPreservePendingLicensePaymentContext()) {
        return;
      }
      this.pendingWalletPaymentContext = null;
      this.clearPendingPaymentContextFromStorage();
      if (this.isBrowser) {
        sessionStorage.removeItem('pendingNewLicenseApplicationId');
        sessionStorage.removeItem('pendingNewLicenseReferenceNo');
        sessionStorage.removeItem('pendingNewLicenseSecurityFeeAmount');
      }
      this.pendingNewLicenseApplicationId = '';
      this.pendingNewLicenseReferenceNo = '';
      this.pendingNewLicenseSecurityFeeAmount = 0;
      this.pendingNewLicenseIsLicenseFeePaid = false;
      this.pendingNewLicenseIsSecurityFeePaid = false;
      return;
    }

    const id = String(params?.['id'] || '').trim();
    const tab =
      this.normalizePaymentModuleTab(String(params?.['tab'] || '')) ||
      this.normalizePaymentModuleTab(String(params?.['type'] || ''));
    const amount = this.toNumber(params?.['amount']);
    const securityAmount = this.toNumber(params?.['securityAmount'] ?? params?.['security_amount']);
    const type = String(params?.['type'] || '').trim().toLowerCase();
    const referenceNo = String(params?.['referenceNo'] || params?.['ref'] || params?.['refNo'] || id || '-');

    if (!id || !tab) {
      // For hologram makePayment deep-link we may only receive refNo;
      // context gets built later from loaded hologram data.
      if (action === 'makepayment') {
        return;
      }
      this.pendingWalletPaymentContext = null;
      this.hasHandledPendingWalletPayment = false;
      return;
    }

    // New license / renewal flow: amount can be missing/0 in deep-link; we will resolve from backend.
    if (this.isLicenseFeeWorkflowPaymentType(type)) {
      this.pendingNewLicenseApplicationId = id;
      this.pendingNewLicenseReferenceNo = referenceNo;
      if (securityAmount > 0) {
        this.pendingNewLicenseSecurityFeeAmount = securityAmount;
      }
      this.ensurePendingNewLicenseAmountsResolved();
      if (this.isBrowser) {
        sessionStorage.setItem('pendingNewLicenseApplicationId', id);
        sessionStorage.setItem('pendingNewLicenseReferenceNo', referenceNo);
        if (securityAmount > 0) {
          sessionStorage.setItem('pendingNewLicenseSecurityFeeAmount', String(securityAmount));
        }
      }
    }

    this.pendingWalletPaymentContext = {
      id,
      tab,
      itemType: String(params?.['type'] || tab),
      referenceNo,
      amount
    };
    this.chainedNewLicenseSecurityAmount = (tab === 'license_fee' && securityAmount > 0) ? securityAmount : 0;
    this.hasHandledPendingWalletPayment = false;
    this.setActiveTab(tab);
    this.persistPendingPaymentContextToStorage();
  }

  private shouldPreservePendingLicensePaymentContext(): boolean {
    const refNo = String(this.pendingNewLicenseReferenceNo || this.pendingWalletPaymentContext?.referenceNo || '').trim();
    if (!refNo) return false;

    const isLicenseFlow =
      this.isLicenseFeeWorkflowPaymentType(this.pendingWalletPaymentContext?.itemType) ||
      this.getPendingApplicationType() === 'new-license' ||
      this.getPendingApplicationType() === 'license-renewal' ||
      this.getPendingApplicationType() === 'company-collaboration';
    if (!isLicenseFlow) return false;

    return !this.isFeePaid('license_fee', refNo) || !this.isFeePaid('security_deposit', refNo);
  }

  private ensurePendingNewLicenseAmountsResolved(): void {
    const applicationId = String(this.pendingNewLicenseApplicationId || '').trim();
    if (!applicationId) return;
    if (this.pendingNewLicenseLicenseFeeAmount > 0 && this.pendingNewLicenseSecurityFeeAmount > 0) return;

    const contextType = String(this.pendingWalletPaymentContext?.itemType || '').trim().toLowerCase();
    const detail$ = contextType === 'license-renewal' || applicationId.toUpperCase().startsWith('LRA/') || applicationId.toUpperCase().startsWith('RSBM/') || applicationId.toUpperCase().startsWith('RCR/')
      ? this.licenseApplicationService.getLicenseRenewalApplicationById(applicationId)
      : this.licenseApplicationService.getNewLicenseApplicationById(applicationId);

    detail$.pipe(
      timeout(15000),
      catchError(() => of(null))
    ).subscribe((app: any) => {
      if (!app) return;
      const licenseFee = this.toNumber(
        app?.license_fee_amount ?? app?.licenseFeeAmount ?? app?.yearly_license_fee ?? app?.yearlyLicenseFee ?? app?.fee_amount ?? app?.feeAmount ?? 0
      );
      const securityFee = this.toNumber(
        app?.security_fee_amount ?? app?.securityFeeAmount ?? app?.security_deposit_amount ?? app?.securityDepositAmount ?? app?.security_fee ?? app?.securityFee ?? app?.security_deposit ?? app?.securityDeposit ?? app?.security_amount ?? app?.securityAmount ?? licenseFee
      );
      if (licenseFee > 0) this.pendingNewLicenseLicenseFeeAmount = licenseFee;
      if (securityFee > 0) this.pendingNewLicenseSecurityFeeAmount = securityFee;
      this.pendingNewLicenseIsLicenseFeePaid = Boolean(
        app?.is_license_fee_paid ?? app?.isLicenseFeePaid ?? app?.is_license_paid ?? app?.isLicensePaid ?? false
      );
      this.pendingNewLicenseIsSecurityFeePaid = Boolean(
        app?.is_security_fee_paid ?? app?.isSecurityFeePaid ?? app?.is_secuirty_paid ?? app?.isSecuirtyPaid ?? false
      );

      // If current pending context is for new-license and has 0 amount, update it.
      const ctx = this.pendingWalletPaymentContext;
      if (!ctx) return;
      if (!this.isLicenseFeeWorkflowPaymentType(ctx.itemType)) return;

      const resolvedAmount = ctx.tab === 'security_deposit'
        ? (this.pendingNewLicenseSecurityFeeAmount || licenseFee)
        : this.pendingNewLicenseLicenseFeeAmount;
      if (resolvedAmount > 0 && (ctx.amount <= 0 || ctx.tab === 'security_deposit')) {
        this.pendingWalletPaymentContext = { ...ctx, amount: resolvedAmount };
        this.persistPendingPaymentContextToStorage();
      }
    });
  }

  hasPendingWalletPaymentContext(): boolean {
    return !!this.pendingWalletPaymentContext;
  }

  shouldShowPendingPaymentInTab(tab: WalletTableTab): boolean {
    if (tab === 'security_deposit') {
      return false;
    }
    // New license deep-link: show Pay Now row even if amount is still resolving.
    if (tab === 'license_fee'
      && this.pendingWalletPaymentContext
      && this.isLicenseFeeWorkflowPaymentType(this.pendingWalletPaymentContext.itemType)
      && this.pendingWalletPaymentContext.tab === tab
      && this.activeTab === tab) {
      const itemType = String(this.pendingWalletPaymentContext.itemType || '').toLowerCase();
      const refNo = String(this.pendingWalletPaymentContext.referenceNo || '').toUpperCase();
      if (itemType === 'company-collaboration' || itemType === 'company_collaboration' || refNo.startsWith('CCOL/')) {
        return false;
      }
      return true;
    }

    const deepLinkRef = this.getPendingHologramDeepLinkRef();
    if (tab === 'hologram' && deepLinkRef && this.activeTab === tab) {
      if (!this.pendingWalletPaymentContext || this.pendingWalletPaymentContext.tab !== 'hologram') {
        this.tryBuildHologramPendingContextFromRefNo(deepLinkRef, this.pendingHologramAutoPayType);
      }
      const ctx = this.pendingWalletPaymentContext;
      if (!ctx || ctx.tab !== 'hologram') return false;
      const ref = String(ctx.referenceNo || '').trim();
      if (ref && this.hasPayableHologramForReference(ref)) {
        return false;
      }
      return true;
    }

    const context = this.pendingWalletPaymentContext;
    if (!context) return false;
    if (context.tab === 'hologram' && tab === 'hologram') {
      // Always show the synthetic "Pending Payment" row for hologram when a deep-linked
      // pending context exists. The detailed hologram rows below can still be used for
      // per-item payments; this row acts as the primary call-to-action after navigation.
      // But avoid showing a duplicate row when the hologram tab already has a payable
      // procurement entry for the same reference.
      const ref = String(context.referenceNo || '').trim();
      if (ref && this.hasPayableHologramForReference(ref)) {
        return false;
      }
      return this.activeTab === tab;
    }
    return context.tab === tab && this.activeTab === tab;
  }

  get pendingNewLicenseRef(): string {
    return this.pendingWalletPaymentContext?.referenceNo ||
      this.pendingNewLicenseReferenceNo ||
      (this.isBrowser ? sessionStorage.getItem('pendingNewLicenseReferenceNo') || '' : '');
  }

  showSecurityRechargeAlert(): boolean {
    if (this.isCompanyCollaborationPendingRef()) return false;
    const refNo = this.pendingNewLicenseRef;
    if (!refNo) return false;

    const refNoUpper = String(refNo).trim().toUpperCase();
    const isNewLicense = !refNoUpper.startsWith('LRA/') && !refNoUpper.startsWith('RCR/') && !refNoUpper.startsWith('RCOL/') && !refNoUpper.startsWith('RSBM/');
    if (!isNewLicense) return false;

    const licensePaid = this.isFeePaid('license_fee', refNo);
    const securityPaid = this.isFeePaid('security_deposit', refNo);

    if (licensePaid && securityPaid) return false;

    return true;
  }

  isLicenseFeePaidForPendingNewLicense(): boolean {
    const refNo = this.pendingNewLicenseRef;
    if (!refNo) return false;
    return this.isFeePaid('license_fee', refNo);
  }

  isSecurityDepositPaidForPendingNewLicense(): boolean {
    const refNo = this.pendingNewLicenseRef;
    if (!refNo) return false;
    return this.isFeePaid('security_deposit', refNo);
  }

  isLicenseFeeCompleteForPendingNewLicenseAlert(): boolean {
    return this.isLicenseFeePaidForPendingNewLicense();
  }

  isSecurityDepositCompleteForPendingNewLicenseAlert(): boolean {
    if (this.isSecurityDepositPaidForPendingNewLicense()) return true;
    if (this.isCompanyCollaborationPendingRef()) return false;
    const requiredAmount = this.getRequiredSecurityDepositAmount();
    if (requiredAmount <= 0) return false;
    return this.newLicenseSecurityDepositAmount >= requiredAmount;
  }

  getRechargeAlertTitle(): string {
    const refNo = this.pendingNewLicenseRef;
    const isSecurityPaid = this.isSecurityDepositCompleteForPendingNewLicenseAlert();
    const isLicensePaid = this.isLicenseFeeCompleteForPendingNewLicenseAlert();

    if (isLicensePaid && !isSecurityPaid) {
      return 'Security Deposit Wallet Recharge Required';
    }
    if (!isLicensePaid && isSecurityPaid) {
      return 'License Fee Wallet Recharge Required';
    }
    return 'Action Required: Complete License Fee & Security Deposit Payment';
  }

  getPendingPaymentModuleLabel(): string {
    const tab = this.pendingWalletPaymentContext?.tab;
    if (!tab) return '-';
    const type = String(this.pendingWalletPaymentContext?.itemType || '').toLowerCase();
    const refNo = String(this.pendingWalletPaymentContext?.referenceNo || '').toUpperCase();
    if (type === 'company-collaboration' || refNo.startsWith('CCOL/')) {
      return tab === 'security_deposit' ? 'com col security paid' : 'Company Collaboration Fee';
    }
    if (type === 'new-license' || refNo.startsWith('NA/') || refNo.startsWith('NLI/') || refNo.startsWith('NLA/') || refNo.startsWith('LIC/')) {
      return tab === 'security_deposit' ? 'New License Security Deposit' : 'New License Fee';
    }
    if (tab === 'license_fee' && refNo.startsWith('RCOL/')) {
      return 'Company Collaboration Renewal Fee';
    }
    return this.getModuleLabelForTab(tab);
  }

  getPendingPaymentAmount(): number {
    return Number(this.pendingWalletPaymentContext?.amount || 0);
  }

  getPendingPaymentAvailableBalance(): number {
    const tab = this.pendingWalletPaymentContext?.tab;
    if (!tab) return 0;
    return this.getAvailableBalanceForModuleTab(tab);
  }

  getPendingPaymentShortfall(): number {
    const required = this.getPendingPaymentAmount();
    const available = this.getPendingPaymentAvailableBalance();
    return Math.max(0, required - available);
  }

  openPendingWalletPaymentConfirmation(): void {
    if (!this.walletDataLoaded || this.hasHandledPendingWalletPayment || this.isHandlingPendingWalletPayment) {
      return;
    }

    const context = this.pendingWalletPaymentContext;
    if (!context) {
      this.resetPendingPaymentAttemptState();
      return;
    }

    if (context.tab === 'security_deposit') {
      return;
    }

    if (context.tab === 'license_fee' && context.referenceNo && context.referenceNo.startsWith('SBM/')) {
      this.isHandlingPendingWalletPayment = true;
      const sbmId = String(context.id || context.referenceNo).trim();
      console.log('[SBM Pay] Checking parent license fee status for:', sbmId);
      this.salesmanBarmanRegistrationService.getSalesmanBarmanDetail(sbmId).subscribe({
        next: (res: any) => {
          this.isHandlingPendingWalletPayment = false;
          console.log('[SBM Pay] Detail response:', {
            is_parent_license_fee_paid: res?.is_parent_license_fee_paid,
            new_license_application_id: res?.new_license_application_id,
            application_id: res?.application_id
          });
          if (res && res.is_parent_license_fee_paid === false) {
            Swal.fire({
              icon: 'error',
              title: 'License Fee Unpaid',
              text: 'Pay the license fee first, then only you can pay for salesman/barman application.'
            });
            this.resetPendingPaymentAttemptState();
            return;
          }

          this.continueOpenPendingWalletPaymentConfirmation(context);
        },
        error: (err) => {
          console.warn('[SBM Pay] Detail API error, proceeding anyway:', err);
          this.isHandlingPendingWalletPayment = false;
          this.continueOpenPendingWalletPaymentConfirmation(context);
        }
      });
      return;
    }

    this.continueOpenPendingWalletPaymentConfirmation(context);
  }

  getPendingApplicationType(): 'company-collaboration' | 'new-license' | 'license-renewal' | 'other' {
    const ref = String(this.pendingNewLicenseRef || '').toUpperCase();
    if (ref.startsWith('CCOL/')) return 'company-collaboration';
    if (ref.startsWith('NLI/') || ref.startsWith('NLA/') || ref.startsWith('NA/') || ref.startsWith('LIC/')) return 'new-license';
    if (ref.startsWith('LRA/') || ref.startsWith('RCR/') || ref.startsWith('RCOL/') || ref.startsWith('RSBM/')) return 'license-renewal';

    if (this.pendingWalletPaymentContext) {
      const ctxType = String(this.pendingWalletPaymentContext.itemType || '').toLowerCase();
      const ctxRef = String(this.pendingWalletPaymentContext.referenceNo || '').toUpperCase();

      if (ctxType === 'company-collaboration' || ctxRef.startsWith('CCOL/')) {
        return 'company-collaboration';
      }
      if (ctxType === 'new-license' || ctxRef.startsWith('NA/') || ctxRef.startsWith('NLI/') || ctxRef.startsWith('NLA/') || ctxRef.startsWith('LIC/')) {
        return 'new-license';
      }
      if (ctxType === 'license-renewal' || ctxRef.startsWith('LRA/') || ctxRef.startsWith('RCR/') || ctxRef.startsWith('RCOL/') || ctxRef.startsWith('RSBM/')) {
        return 'license-renewal';
      }
    }
    return 'other';
  }

  isCompanyCollaborationPendingRef(): boolean {
    if (this.getPendingApplicationType() === 'company-collaboration') return true;
    const ref = String(this.pendingNewLicenseRef || '').toUpperCase();
    if (ref.startsWith('CCOL/')) return true;
    const ctxRef = String(this.pendingWalletPaymentContext?.referenceNo || '').toUpperCase();
    if (ctxRef.startsWith('CCOL/')) return true;
    const ctxType = String(this.pendingWalletPaymentContext?.itemType || '').toLowerCase();
    if (ctxType === 'company-collaboration') return true;
    return false;
  }

  isNewLicensePendingRef(): boolean {
    return this.getPendingApplicationType() === 'new-license';
  }

  getRequiredSecurityDepositAmount(): number {
    const appType = this.getPendingApplicationType();
    if (appType === 'company-collaboration') {
      return 0;
    }
    if (appType === 'new-license' || appType === 'license-renewal') {
      const storedSec = this.isBrowser ? Number(sessionStorage.getItem('pendingNewLicenseSecurityFeeAmount') || 0) : 0;
      const secAmount = Number((this.pendingWalletPaymentContext as any)?.securityAmount || 0);
      if (secAmount > 0) return secAmount;
      if (this.pendingNewLicenseSecurityFeeAmount > 0) return this.pendingNewLicenseSecurityFeeAmount;
      if (storedSec > 0) return storedSec;
      if (this.chainedNewLicenseSecurityAmount > 0) return this.chainedNewLicenseSecurityAmount;
      const ctxAmount = Number(this.pendingWalletPaymentContext?.amount || 0);
      if (ctxAmount > 0 && this.pendingWalletPaymentContext?.tab === 'security_deposit') return ctxAmount;
      return 10000;
    }
    const ctxAmount = Number(this.pendingWalletPaymentContext?.amount || 0);
    return ctxAmount > 0 ? ctxAmount : 0;
  }

  getNewLicenseSecurityDepositDisplayAmount(): number {
    const requiredAmount = this.getRequiredSecurityDepositAmount();
    if (requiredAmount > 0 && this.pendingNewLicenseRef) {
      if (!this.isSecurityDepositPaidForPendingNewLicense()) {
        return this.newLicenseSecurityDepositAmount;
      }
      return requiredAmount;
    }
    return this.newLicenseSecurityDepositAmount;
  }

  getRequiredLicenseFeeAmount(): number {
    const appType = this.getPendingApplicationType();
    if (appType === 'company-collaboration') {
      return 25000;
    }
    if (appType === 'new-license' || appType === 'license-renewal') {
      const ctxAmount = Number(this.pendingWalletPaymentContext?.amount || 0);
      if (ctxAmount > 0 && this.pendingWalletPaymentContext?.tab === 'license_fee') return ctxAmount;
      if (this.pendingNewLicenseLicenseFeeAmount > 0) return this.pendingNewLicenseLicenseFeeAmount;
      return ctxAmount > 0 ? ctxAmount : 0;
    }
    const ctxAmount = Number(this.pendingWalletPaymentContext?.amount || 0);
    return ctxAmount > 0 ? ctxAmount : 0;
  }

  private continueOpenPendingWalletPaymentConfirmation(context: any): void {
    const deductionAmount = Number(context.amount || 0);
    const currentBalance = this.getAvailableBalanceForModuleTab(context.tab);
    if (deductionAmount <= 0) {
      if (String(context.itemType || '').trim().toLowerCase() === 'company-collaboration' || String(context.referenceNo || '').toUpperCase().startsWith('CCOL/')) {
        const resolvedAmount = 25000;
        this.pendingWalletPaymentContext = { ...context, amount: resolvedAmount };
        this.persistPendingPaymentContextToStorage();
        setTimeout(() => this.openPendingWalletPaymentConfirmation(), 0);
        return;
      }
      if (String(context.itemType || '').trim().toLowerCase() === 'new-license') {
        this.ensurePendingNewLicenseAmountsResolved();
        const resolvedAmount = context.tab === 'security_deposit'
          ? this.pendingNewLicenseSecurityFeeAmount
          : this.pendingNewLicenseLicenseFeeAmount;
        if (resolvedAmount > 0) {
          this.pendingWalletPaymentContext = { ...context, amount: resolvedAmount };
          this.persistPendingPaymentContextToStorage();
          // Retry opening after state update.
          setTimeout(() => this.openPendingWalletPaymentConfirmation(), 0);
          return;
        }
        Swal.fire('Fee Not Configured', 'License fee / security deposit amount is not available for this application.', 'error');
      }
      if (String(context.itemType || '').trim().toLowerCase() === 'license-renewal') {
        this.ensurePendingNewLicenseAmountsResolved();
        const resolvedAmount = context.tab === 'security_deposit'
          ? this.pendingNewLicenseSecurityFeeAmount
          : this.pendingNewLicenseLicenseFeeAmount;
        if (resolvedAmount > 0) {
          this.pendingWalletPaymentContext = { ...context, amount: resolvedAmount };
          this.persistPendingPaymentContextToStorage();
          setTimeout(() => this.openPendingWalletPaymentConfirmation(), 0);
          return;
        }
        Swal.fire('Fee Not Configured', 'Renewal license fee / security deposit amount is not available for this application.', 'error');
      }
      this.resetPendingPaymentAttemptState();
      return;
    }

    this.pendingWalletPaymentPreview = {
      moduleLabel: this.getModuleLabelForTab(context.tab),
      walletLabel: this.getWalletLabelForModuleTab(context.tab),
      referenceNo: context.referenceNo || '-',
      currentBalance,
      deductionAmount,
      balanceAfter: currentBalance - deductionAmount,
      shortfall: Math.max(0, deductionAmount - currentBalance)
    };
    this.pendingWalletPaymentDeclarationAccepted = false;
    this.showPendingWalletConfirmationModal = true;
  }


  closePendingWalletPaymentConfirmation(): void {
    this.showPendingWalletConfirmationModal = false;
    this.pendingWalletPaymentDeclarationAccepted = false;
    this.pendingWalletPaymentPreview = null;
  }

  canConfirmPendingWalletPayment(): boolean {
    if (!this.pendingWalletPaymentDeclarationAccepted) return false;
    if (this.isHandlingPendingWalletPayment) return false;
    const preview = this.pendingWalletPaymentPreview;
    if (!preview) return false;
    return preview.deductionAmount > 0 && preview.shortfall <= 0;
  }

  getPendingWalletDeclarationText(): string {
    const moduleLabel = this.pendingWalletPaymentPreview?.moduleLabel || this.getPendingPaymentModuleLabel();
    return `I understand that wallet amount will be deducted immediately when I proceed with this ${moduleLabel.toLowerCase()} payment.`;
  }

  proceedPendingWalletPayment(): void {
    if (!this.walletDataLoaded || this.hasHandledPendingWalletPayment || this.isHandlingPendingWalletPayment) {
      return;
    }

    const context = this.pendingWalletPaymentContext;
    if (!context) {
      this.resetPendingPaymentAttemptState();
      return;
    }

    this.isHandlingPendingWalletPayment = true;
    this.setActiveTab(context.tab);

    const availableBalance = this.getAvailableBalanceForModuleTab(context.tab);
    const requiredAmount = Number(context.amount || 0);

    if (requiredAmount <= 0) {
      this.resetPendingPaymentAttemptState();
      return;
    }

    if (availableBalance < requiredAmount) {
      this.closePendingWalletPaymentConfirmation();
      const shortage = Math.max(0, requiredAmount - availableBalance);
      Swal.fire({
        icon: 'error',
        title: 'Insufficient Wallet Balance',
        html:
          `<div style="text-align:left">` +
          `<div><strong>Module:</strong> ${this.getModuleLabelForTab(context.tab)}</div>` +
          `<div><strong>Reference:</strong> ${context.referenceNo}</div>` +
          `<div><strong>Required:</strong> Rs ${requiredAmount.toFixed(2)}</div>` +
          `<div><strong>Available:</strong> Rs ${availableBalance.toFixed(2)}</div>` +
          `<div><strong>Shortfall:</strong> Rs ${shortage.toFixed(2)}</div>` +
          `</div>`,
        showCancelButton: true,
        confirmButtonText: 'Add Money',
        cancelButtonText: 'Close'
      }).then((result) => {
        if (result.isConfirmed) {
          this.setActiveTab('recharge');
        }
        this.resetPendingPaymentAttemptState();
      });
      return;
    }

    this.executeWalletPaymentFromContext(context).subscribe({
      next: () => {
        this.closePendingWalletPaymentConfirmation();
        this.loadCancellationDataFromApi();
        this.loadHologramDataFromApi();
        this.hologramService.invalidateProcurementCache();
        this.sidebarBadgeService.triggerRefresh();
        this.unifiedDashboardService.clearUnifiedAppsCache();
        // New-license / renewal convenience: chain payments bidirectionally if one is unpaid
        const refNo = this.pendingNewLicenseReferenceNo || context.referenceNo;
        const isLicenseFlow = this.isLicenseFeeWorkflowPaymentType(context.itemType);

        if (isLicenseFlow) {
          if (context.tab === 'license_fee') {
            this.pendingNewLicenseIsLicenseFeePaid = true;
          } else if (context.tab === 'security_deposit') {
            this.pendingNewLicenseIsSecurityFeePaid = true;
          }

          const isRenewal = String(context.itemType || '').trim().toLowerCase() === 'license-renewal'
                         || String(refNo || '').trim().toUpperCase().startsWith('LRA/')
                         || String(refNo || '').trim().toUpperCase().startsWith('RCR/');
          const isCollab = String(context.itemType || '').trim().toLowerCase() === 'company-collaboration'
                        || String(refNo || '').trim().toUpperCase().startsWith('CCOL/');

          if (context.tab === 'license_fee') {
            // After paying license fee, chain to security deposit if it hasn't been paid yet.
            if (isCollab) {
              this.pendingWalletPaymentContext = null;
              this.clearPendingPaymentContextFromStorage();
              this.hasHandledPendingWalletPayment = false;
              this.isHandlingPendingWalletPayment = false;
              Swal.fire({
                icon: 'success',
                title: 'License Fee Paid!',
                text: 'License fee payment was successful.',
                confirmButtonText: 'OK'
              }).then(() => {
                this.refreshWalletData();
                this.finishPendingWalletPaymentHandling();
              });
              return;
            }

            const securityPaid = this.isFeePaid('security_deposit', refNo);
            const nextAmount =
              this.pendingNewLicenseSecurityFeeAmount ||
              this.chainedNewLicenseSecurityAmount ||
              this.getRequiredSecurityDepositAmount() ||
              0;
            if (!isRenewal && !securityPaid && nextAmount > 0) {
              const chainedContext: PendingWalletPaymentContext = {
                ...context,
                tab: 'security_deposit',
                amount: nextAmount,
                referenceNo: refNo
              };
              this.pendingWalletPaymentContext = chainedContext;
              this.hasHandledPendingWalletPayment = true;
              this.isHandlingPendingWalletPayment = false;
              this.setActiveTab('security_deposit');
              this.persistPendingPaymentContextToStorage();
              Swal.fire({
                icon: 'success',
                title: 'License Fee Paid!',
                text: 'License fee payment was successful. Now recharge the security fee by Clicking on ADD MONEY Button on Security Deposit Wallet and complete the application successfully.',
                confirmButtonText: 'OK'
              }).then(() => {
                this.hasHandledPendingWalletPayment = false;
                this.refreshWalletData();
                this.resetPendingPaymentAttemptState();
              });
              return;
            }
          } else if (context.tab === 'security_deposit') {
            const licensePaid = this.isFeePaid('license_fee', refNo);

            const nextAmount = this.pendingNewLicenseLicenseFeeAmount || this.getRequiredLicenseFeeAmount() || 0;
            if (!licensePaid && nextAmount > 0) {
              this.pendingWalletPaymentContext = {
                ...context,
                tab: 'license_fee',
                amount: nextAmount
              };
              this.hasHandledPendingWalletPayment = false;
              this.isHandlingPendingWalletPayment = false;
              this.setActiveTab('license_fee');
              this.persistPendingPaymentContextToStorage();
              return;
            }
          }

          const licensePaid = this.isFeePaid('license_fee', refNo);
          const securityPaid = this.isFeePaid('security_deposit', refNo);
          if (!licensePaid || !securityPaid) {
            const missingTab: WalletTableTab = licensePaid ? 'security_deposit' : 'license_fee';
            const missingAmount = missingTab === 'security_deposit'
              ? (this.getRequiredSecurityDepositAmount() || this.pendingNewLicenseSecurityFeeAmount || context.amount)
              : (this.getRequiredLicenseFeeAmount() || this.pendingNewLicenseLicenseFeeAmount || context.amount);
            this.pendingWalletPaymentContext = {
              ...context,
              tab: missingTab,
              amount: missingAmount || 0,
              referenceNo: refNo
            };
            this.hasHandledPendingWalletPayment = false;
            this.isHandlingPendingWalletPayment = false;
            this.setActiveTab(missingTab);
            this.persistPendingPaymentContextToStorage();
          }
        }
        this.refreshWalletData();
        Swal.fire({
          icon: 'success',
          title: 'Payment Successful',
          text: `${this.getModuleLabelForTab(context.tab)} payment completed successfully.`
        });
        this.maybeForceRefreshAfterNewLicenseApproval(context);
        this.finishPendingWalletPaymentHandling();
      },
      error: (err) => {
        this.closePendingWalletPaymentConfirmation();
        const errorMessage =
          err?.error?.error ||
          err?.error?.detail ||
          err?.error?.message ||
          err?.message ||
          'Payment failed';

        Swal.fire({
          icon: 'error',
          title: 'Payment Failed',
          text: String(errorMessage)
        });
        this.resetPendingPaymentAttemptState();
      }
    });
  }

  private maybeForceRefreshAfterNewLicenseApproval(context: PendingWalletPaymentContext): void {
    if (!this.isBrowser) return;

    const tab = String(context?.tab || '').toLowerCase();
    if (tab !== 'license_fee' && tab !== 'security_deposit') return;

    const typeToken = String(context?.itemType || '').trim().toLowerCase();
    const refToken = String(context?.referenceNo || '').trim().toUpperCase();
    const isNewLicense = typeToken.includes('new-license') || refToken.startsWith('NLI/');
    const isRenewal = typeToken.includes('license-renewal') || refToken.startsWith('LRA/') || refToken.startsWith('RSBM/') || refToken.startsWith('RCR/');
    if (!isNewLicense && !isRenewal) return;

    const applicationId = String(this.pendingNewLicenseApplicationId || context?.id || '').trim();
    if (!applicationId) return;

    const guardKey = `${isRenewal ? 'license_renewal' : 'new_license'}_force_refresh_after_approval_${applicationId}`;
    try {
      if (sessionStorage.getItem(guardKey) === '1') return;
    } catch {
      // ignore storage errors
    }

    const detail$ = isRenewal
      ? this.licenseApplicationService.getLicenseRenewalApplicationById(applicationId)
      : this.licenseApplicationService.getNewLicenseApplicationById(applicationId);

    detail$.pipe(
      timeout(15000),
      catchError(() => of(null))
    ).subscribe((app: any) => {
      if (!app) return;
      const isApproved = Boolean(app?.is_approved ?? app?.isApproved ?? app?.is_approved_flag ?? false);
      if (!isApproved) return;

      try {
        sessionStorage.setItem(guardKey, '1');
      } catch {
        // ignore storage errors
      }

      // Hard reload so that licensee dashboard tabs (category/sub-category driven) re-evaluate immediately.
      setTimeout(() => {
        try {
          window.location.reload();
        } catch {
          // ignore
        }
      }, 300);
    });
  }

  private addOptimisticPaymentHistoryRow(context: PendingWalletPaymentContext): void {
    // Disabled intentionally: wallet history must only show backend transaction IDs.
    return;
  }

  private reconcileOptimisticPayments(): void {
    if (!this.optimisticPaymentHistory.length) return;

    const normalizeModule = (value: string): string => {
      const text = String(value || '').toLowerCase();
      if (text.includes('hologram')) return 'hologram';
      if (text.includes('transit')) return 'transit';
      if (text.includes('cancellation')) return 'cancellation';
      if (text.includes('revalidation')) return 'revalidation';
      if (text.includes('requisition')) return 'requisition';
      return text.trim();
    };

    const serverKeys = new Set(
      this.historyData.map((item) =>
        `${normalizeModule(String(item.paymentFor || ''))}|${String(item.reference || '').toLowerCase()}|${Number(item.amount || 0).toFixed(2)}`
      )
    );

    this.optimisticPaymentHistory = this.optimisticPaymentHistory.filter((item) => {
      const key = `${normalizeModule(String(item.paymentFor || ''))}|${String(item.reference || '').toLowerCase()}|${Number(item.amount || 0).toFixed(2)}`;
      return !serverKeys.has(key);
    });
    this.persistOptimisticPaymentsToStorage();
  }

  private loadOptimisticPaymentsFromStorage(): void {
    if (!this.isBrowser) return;
    try {
      // Clear old LOCAL-* placeholder rows and rely fully on backend history.
      this.optimisticPaymentHistory = [];
      sessionStorage.removeItem(this.optimisticPaymentStorageKey);
    } catch {
      this.optimisticPaymentHistory = [];
    }
  }

  private persistOptimisticPaymentsToStorage(): void {
    if (!this.isBrowser) return;
    try {
      sessionStorage.setItem(this.optimisticPaymentStorageKey, JSON.stringify(this.optimisticPaymentHistory));
    } catch {
      // no-op
    }
  }

  private loadPendingPaymentContextFromStorage(): void {
    if (!this.isBrowser) return;
    try {
      const storedAppId = sessionStorage.getItem('pendingNewLicenseApplicationId');
      const storedRefNo = sessionStorage.getItem('pendingNewLicenseReferenceNo');
      const storedSecAmount = sessionStorage.getItem('pendingNewLicenseSecurityFeeAmount');
      if (storedAppId) this.pendingNewLicenseApplicationId = storedAppId;
      if (storedRefNo) this.pendingNewLicenseReferenceNo = storedRefNo;
      if (storedSecAmount) this.pendingNewLicenseSecurityFeeAmount = Number(storedSecAmount) || 0;

      const raw = sessionStorage.getItem(this.pendingPaymentStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;

      const tab = this.normalizePaymentModuleTab(String(parsed?.tab || ''));
      const id = String(parsed?.id || '').trim();
      const amount = Number(parsed?.amount || 0);
      if (!tab || !id || !Number.isFinite(amount) || amount <= 0) return;

      this.pendingWalletPaymentContext = {
        id,
        tab,
        itemType: String(parsed?.itemType || tab),
        referenceNo: String(parsed?.referenceNo || '-'),
        amount
      };
      this.hasHandledPendingWalletPayment = false;
      this.setActiveTab(tab);
    } catch {
      // no-op
    }
  }

  private persistPendingPaymentContextToStorage(): void {
    if (!this.isBrowser || !this.pendingWalletPaymentContext) return;
    try {
      sessionStorage.setItem(this.pendingPaymentStorageKey, JSON.stringify(this.pendingWalletPaymentContext));
    } catch {
      // no-op
    }
  }

  private clearPendingPaymentContextFromStorage(): void {
    if (!this.isBrowser) return;
    try {
      sessionStorage.removeItem(this.pendingPaymentStorageKey);
    } catch {
      // no-op
    }
  }

  private getPendingHologramDeepLinkRef(): string {
    const fromMemory = String(this.pendingHologramAutoPayRefNo || '').trim();
    if (fromMemory) return fromMemory;

    const params = this.route.snapshot?.queryParams || {};
    const fromQuery = String(
      params['refNo'] ??
      params['ref_no'] ??
      params['referenceNo'] ??
      params['reference_no'] ??
      ''
    ).trim();
    const action = String(params['action'] || '').trim().toLowerCase();
    if (fromQuery && action === 'makepayment') {
      return fromQuery;
    }

    if (!this.isBrowser) return '';
    try {
      return String(sessionStorage.getItem(this.hologramDeepLinkStorageKey) || '').trim();
    } catch {
      return '';
    }
  }

  private persistPendingHologramDeepLinkRef(refNo: string): void {
    const ref = String(refNo || '').trim();
    if (!ref || !this.isBrowser) return;
    try {
      sessionStorage.setItem(this.hologramDeepLinkStorageKey, ref);
    } catch {
      // no-op
    }
  }

  private clearPendingHologramDeepLinkRef(): void {
    if (!this.isBrowser) return;
    try {
      sessionStorage.removeItem(this.hologramDeepLinkStorageKey);
    } catch {
      // no-op
    }
  }

  goToAddMoneyForPendingPayment(): void {
    const context = this.pendingWalletPaymentContext;
    if (!context) return;
    this.closePendingWalletPaymentConfirmation();

    if (context.tab === 'hologram') {
      this.addMoney('hologram');
      return;
    }

    this.setActiveTab('recharge');
    this.addMoney(this.isBreweryUser ? 'brewery' : 'excise');
  }

  closePendingWalletPaymentDetails(): void {
    this.finishPendingWalletPaymentHandling();
  }

  private executeWalletPaymentFromContext(context: PendingWalletPaymentContext): Observable<any> {
    switch (context.tab) {
      case 'requisition':
        return this.enaRequisitionService.performAction(Number(context.id), 'APPROVE');
      case 'revalidation':
        return this.supplyChainService.performRevalidationAction(context.id, 'APPROVE', 'licensee');
      case 'cancellation':
        return this.supplyChainService.performCancellationAction(context.id, 'SubmitPayslip', 'licensee');
      case 'transit':
        return this.supplyChainService.performTransitPermitAction(context.id, 'PAY', 'licensee');
      case 'hologram':
        return this.hologramService.performAction('procurement', Number(context.id), 'pay', 'Payment Completed via Wallet');
      case 'license_fee':
        if (String(context.itemType || '').trim().toLowerCase() === 'salesman-barman-registration') {
          return this.salesmanBarmanRegistrationService.payRegistrationLicenseFee(String(context.id));
        }
        if (String(context.itemType || '').trim().toLowerCase() === 'company-registration') {
          return this.companyRegistrationService.payCompanyRegistrationFee(String(context.id));
        }
        if (String(context.itemType || '').trim().toLowerCase() === 'company-collaboration') {
          // Backend expects the application_id (e.g. CCOL/2026-27/0001), not the numeric PK
          const collabAppId = String(context.referenceNo || context.id || '').trim();
          return this.companyCollaborationService.payCollaborationFee(collabAppId);
        }
        if (String(context.itemType || '').trim().toLowerCase() === 'license-renewal') {
          return this.licenseApplicationService.payLicenseRenewalFee(String(context.id), new FormData());
        }
        if (String(context.itemType || '').trim().toLowerCase() === 'special-permit') {
          return this.specialPermitService.paySpecialPermitFee(String(context.id));
        }
        return this.licenseApplicationService.payNewLicenseFee(String(context.id), new FormData());
      case 'security_deposit':
        if (String(context.itemType || '').trim().toLowerCase() === 'license-renewal') {
          return this.licenseApplicationService.payLicenseRenewalSecurityFee(String(context.id));
        }
        return this.licenseApplicationService.payNewLicenseSecurityFee(String(context.id));
      default:
        return of({});
    }
  }

  private getAvailableBalanceForModuleTab(tab: WalletTableTab): number {
    if (tab === 'hologram') {
      return this.hologramWalletBalance;
    }

    if (tab === 'requisition') {
      return this.isBreweryUser ? this.breweryWalletBalance : this.exciseWalletBalance;
    }

    if (tab === 'license_fee') {
      return this.licenseFeeBalance;
    }

    if (tab === 'security_deposit') {
      return this.securityDepositBalance;
    }

    // Transit, revalidation and cancellation use combined non-hologram heads.
    return this.getTotalWalletBalance();
  }

  private getWalletLabelForModuleTab(tab: WalletTableTab): string {
    if (tab === 'hologram') {
      return 'Hologram Wallet';
    }
    if (tab === 'requisition') {
      return 'Excise / Additional Wallet Balance';
    }
    if (tab === 'license_fee') {
      return 'License Fee Wallet';
    }
    if (tab === 'security_deposit') {
      return 'Security Deposit Wallet';
    }
    if (tab === 'transit') {
      return 'Combined Excise and Education Wallet Balance';
    }
    return 'Available Wallet Balance';
  }

  private getModuleLabelForTab(tab: WalletTableTab): string {
    if (tab === 'requisition') return 'Requisition';
    if (tab === 'revalidation') return 'Revalidation';
    if (tab === 'cancellation') return 'Cancellation';
    if (tab === 'transit') return 'Transit Permit';
    if (tab === 'license_fee') return 'License Fee';
    if (tab === 'security_deposit') return 'Security Deposit';
    return 'Hologram';
  }

  private finishPendingWalletPaymentHandling(): void {
    this.hasHandledPendingWalletPayment = true;
    this.isHandlingPendingWalletPayment = false;
    this.closePendingWalletPaymentConfirmation();
    this.pendingHologramAutoPayRefNo = '';
    this.pendingHologramAutoPayType = '';
    this.clearPendingHologramDeepLinkRef();

    const refNo = this.pendingNewLicenseReferenceNo;
    const isUnfinishedLicensePayment =
      refNo &&
      this.pendingWalletPaymentContext &&
      this.isLicenseFeeWorkflowPaymentType(this.pendingWalletPaymentContext.itemType) &&
      (!this.isFeePaid('license_fee', refNo) || !this.isFeePaid('security_deposit', refNo));

    if (isUnfinishedLicensePayment) {
      this.persistPendingPaymentContextToStorage();
    } else {
      this.pendingWalletPaymentContext = null;
      this.clearPendingPaymentContextFromStorage();
    }

    if (refNo && !isUnfinishedLicensePayment && this.isFeePaid('license_fee', refNo) && this.isFeePaid('security_deposit', refNo)) {
      if (this.isBrowser) {
        sessionStorage.removeItem('pendingNewLicenseApplicationId');
        sessionStorage.removeItem('pendingNewLicenseReferenceNo');
        sessionStorage.removeItem('pendingNewLicenseSecurityFeeAmount');
      }
      this.pendingNewLicenseApplicationId = '';
      this.pendingNewLicenseReferenceNo = '';
      this.pendingNewLicenseSecurityFeeAmount = 0;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        action: null,
        id: null,
        amount: null,
        type: null,
        ref: null,
        refNo: null,
        referenceNo: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    }).catch(() => {
      // no-op
    });
  }

  private resetPendingPaymentAttemptState(): void {
    this.hasHandledPendingWalletPayment = false;
    this.isHandlingPendingWalletPayment = false;
  }

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved') || statusLower.includes('success')) {
      return 'badge bg-success';
    } else if (statusLower.includes('refund')) {
      return 'badge bg-info text-dark';
    } else if (statusLower.includes('pending') || statusLower.includes('ready')) {
      return 'badge bg-warning';
    } else if (statusLower.includes('rejected') || statusLower.includes('failed')) {
      return 'badge bg-danger';
    }
    return 'badge bg-secondary';
  }

  canPay(item: PaymentItem): boolean {
    if (this.activeTab === 'cancellation') {
      return this.isCancellationPaymentQueueStatus(item.status) && item.amount > 0;
    }

    const payableStatuses = [
      'ApprovedByCommissioner',
      'ApprovedByJointCommissioner',
      'ApprovedRevalidationByCommissioner',
      'ApprovedRevalidationByJointCommissioner',
      'ApprovedCancellationByCommissioner',
      'ApprovedCancellationByJointCommissioner'
    ];
    if (payableStatuses.includes(item.status)) {
      return item.amount > 0;
    }

    const normalized = this.normalizeStatus(item.status);
    return normalized.includes('approv') && !normalized.includes('reject') && item.amount > 0;
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

    const availableBalance = this.getSelectedWalletBalance();
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
          Swal.fire({
            icon: 'success',
            title: 'Payment Successful',
            html:
              `<div style="text-align:left">` +
              `<div><strong>Deducted Amount:</strong> Rs ${deducted.toFixed(2)}</div>` +
              `<div><strong>Remaining Wallet Balance:</strong> Rs ${balanceAfter.toFixed(2)}</div>` +
              `<div><strong>Transaction ID:</strong> ${txnId}</div>` +
              `</div>`,
            confirmButtonText: 'OK'
          });
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
          item.status = String(res?.new_status || res?.status || 'SUBMITTED_PAYSLIP');
          const deducted = Number(res?.wallet_deduction?.amount ?? item.amount ?? 0);
          const balanceAfter = Number(res?.wallet_deduction?.balance_after ?? (this.getSelectedWalletBalance() - deducted));
          const txnId = String(res?.wallet_deduction?.transaction_id || 'N/A');

          Swal.fire({
            icon: 'success',
            title: 'Payment Successful',
            html:
              `<div style="text-align:left">` +
              `<div><strong>Deducted Amount:</strong> Rs ${deducted.toFixed(2)}</div>` +
              `<div><strong>Remaining Wallet Balance:</strong> Rs ${balanceAfter.toFixed(2)}</div>` +
              `<div><strong>Transaction ID:</strong> ${txnId}</div>` +
              `</div>`,
            confirmButtonText: 'OK'
          });
          // Optionally reload data if we switch to loading from API
          this.loadCancellationDataFromApi();
          this.refreshWalletData();
        },
        error: (err) => {
          console.error('Cancellation Payment failed:', err);
          const errorMessage = err?.error?.error || err?.error?.detail || err?.message || 'Cancellation Payment failed';
          this.showErrorMessage(`Cancellation Payment failed: ${errorMessage}`);
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
    let modalWalletType: AddMoneyWalletType = 'excise';

    if (walletType === 'license_fee') {
      modalWalletType = 'license_fee';
    } else if (walletType === 'security_deposit') {
      modalWalletType = 'security_deposit';
    } else if (walletType === 'excise') {
      modalWalletType = 'excise';
    } else if (walletType === 'education_cess' || walletType === 'education') {
      modalWalletType = 'education';
    } else if (walletType === 'hologram') {
      modalWalletType = 'hologram';
    } else {
      modalWalletType = 'excise';
    }

    this.modalContext = this.getAddMoneyContext(modalWalletType);
    this.currentTxnId = this.generateWalletTransactionId(modalWalletType);
    const refNo = this.pendingNewLicenseRef;

    if (modalWalletType === 'license_fee') {
      const isPaid = refNo ? this.isFeePaid('license_fee', refNo) : false;
      this.paymentAmount = isPaid ? 0 : this.getRequiredLicenseFeeAmount();
    } else if (modalWalletType === 'security_deposit') {
      const isPaid = refNo ? this.isFeePaid('security_deposit', refNo) : false;
      this.paymentAmount = isPaid ? 0 : this.getRequiredSecurityDepositAmount();
    } else {
      this.paymentAmount = 0;
    }

    // Show the modal
    const modalElement = document.getElementById('addMoneyModal');
    if (modalElement) {
      let modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (!modal) {
        modal = new (window as any).bootstrap.Modal(modalElement);
      }
      modal.show();
    }
  }

  // --- ADD THIS: Close Modal Handler ---
  closeAddMoneyModal(): void {
    this.modalContext = null;
    const modalElement = document.getElementById('addMoneyModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }

    // Safety cleanup just in case
    setTimeout(() => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach((backdrop) => backdrop.remove());
    }, 300);
  }


  onProceedPayment(amount: number): void {
    if (amount <= 0 || !this.modalContext) return;

    const type = this.modalContext.walletType;
    const licenseeId = String(this.activeLicenseeId || this.resolveActiveLicenseeIdFromSession() || '').trim();

    if (!licenseeId) {
      this.showErrorMessage('Unable to proceed: licensee id not found.');
      return;
    }

    let apiCall$;

    // BRANCHING LOGIC: Determine which backend "door" to open
    if (type === 'license_fee') {
      // Hits: /billdesk/initiate/license-fee/
      apiCall$ = this.paymentIntegrationService.initiateBilldeskLicenseFee({
        transaction_id: this.currentTxnId,
        amount: amount,
        payer_id: licenseeId,
        payment_module_code: '002' // Standard for License Fee
      });
    } else if (type === 'security_deposit') {
      // Hits: /billdesk/initiate/security-deposit/
      apiCall$ = this.paymentIntegrationService.initiateBilldeskSecurityDeposit({
        transaction_id: this.currentTxnId,
        amount: amount,
        licensee_id: licenseeId,
        licensee_name: this.activeLicenseeName || licenseeId,
        bank_fdr_code: 'SIKFDR',
        payment_module_code: '002' // Standard for Manufacturing/Security
      });
    } else {
      // Hits: /billdesk/initiate/ (The generic door)
      apiCall$ = this.paymentIntegrationService.initiateBilldeskWalletRecharge({
        transaction_id: this.currentTxnId,
        amount: amount,
        wallet_type: type,
        licensee_id: licenseeId,
        payer_id: licenseeId,
        head_of_account: this.modalContext.hoa,
      });
    }

    apiCall$.subscribe({
      next: (response: any) => {
        if (response.already_pending) {
          Swal.fire('Pending', 'A transaction is already pending.', 'warning');
          return;
        }

        this.closeAddMoneyModal();

        // Launch SDK with updated callback for the Success Receipt
        this.paymentIntegrationService.launchBillDeskSDK(response, (txnResult: any) => {
          const isSuccess = txnResult && txnResult.auth_status === '0300';

          // Pass queryParams so your success component isn't blank
          this.router.navigate(['/dashboard/wallet-recharge/success'], {
            queryParams: {
              transactionId: response.transaction_id || this.currentTxnId,
              walletType: type,
              hoa: this.modalContext?.hoa || '',
              amount: amount,
              status: isSuccess ? 'success' : 'failed',
              createdAt: new Date().toISOString()
            }
          });
        });
      },
      error: (err) => {
        this.closeAddMoneyModal();
        this.paymentIntegrationService.handleInitiationError(err, this.currentTxnId);
      }
    });
  }

  private normalizeAddMoneyWalletType(walletType: string): AddMoneyWalletType | null {
    switch (walletType) {
      case 'excise':
      case 'education':
      case 'hologram':
      case 'brewery':
      case 'security_deposit':
      case 'license_fee':
        return walletType;
      default:
        return null;
    }
  }

  private openUnifiedAddMoneyView(walletType: AddMoneyWalletType): void {
    this.cleanupModalArtifacts();
    this.selectedAddMoneyContext = this.getAddMoneyContext(walletType);
    this.addMoneyTransactionId = this.generateWalletTransactionId(walletType);
    const refNo = this.pendingNewLicenseRef;
    if (walletType === 'license_fee') {
      const isPaid = refNo ? this.isFeePaid('license_fee', refNo) : false;
      this.addMoneyAmount = isPaid ? 0 : this.getRequiredLicenseFeeAmount();
    } else if (walletType === 'security_deposit') {
      const isPaid = refNo ? this.isFeePaid('security_deposit', refNo) : false;
      this.addMoneyAmount = isPaid ? 0 : this.getRequiredSecurityDepositAmount();
    } else {
      this.addMoneyAmount = 0;
    }

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
    const isCollab = this.isCompanyCollaborationPendingRef();
    const isNewLic = !isCollab && !!this.pendingNewLicenseRef;

    switch (walletType) {
      case 'excise':
        return {
          walletType,
          moduleLabel: this.walletModuleLabel,
          walletLabel: 'Excise Duty Wallet',
          hoa: this.walletHoaByType.excise
        };
      case 'brewery':
        return {
          walletType,
          moduleLabel: this.walletModuleLabel,
          walletLabel: 'Excise Duty Wallet',
          hoa: this.walletHoaByType.brewery
        };
      case 'education':
        return {
          walletType,
          moduleLabel: this.walletModuleLabel,
          walletLabel: 'Education Cess Wallet',
          hoa: this.walletHoaByType.education
        };
      case 'hologram':
        return {
          walletType,
          moduleLabel: this.walletModuleLabel,
          walletLabel: 'Hologram Wallet',
          hoa: this.walletHoaByType.hologram
        };
      case 'security_deposit': {
        let purposeLabel = 'Security Deposit Wallet Recharge';
        let moduleLabel = 'Manufacturing';
        if (isCollab) {
          purposeLabel = 'Recharge for Company Collaboration Security Deposit';
          moduleLabel = 'Company Collaboration';
        } else if (isNewLic) {
          purposeLabel = 'Recharge for New License Security Deposit';
          moduleLabel = 'New License Application';
        }
        return {
          walletType,
          moduleLabel,
          walletLabel: 'Security Deposit Wallet',
          hoa: '',
          purposeLabel
        };
      }
      case 'license_fee': {
        let purposeLabel = 'License Fee Wallet Recharge';
        let moduleLabel = 'Manufacturing';
        if (isCollab) {
          purposeLabel = 'Recharge for Company Collaboration Fee';
          moduleLabel = 'Company Collaboration';
        } else if (isNewLic) {
          purposeLabel = 'Recharge for New License Fee';
          moduleLabel = 'New License Application';
        }
        return {
          walletType,
          moduleLabel,
          walletLabel: 'License Fee Wallet',
          hoa: LICENSE_FEE_HOA,
          purposeLabel
        };
      }
      default:
        return {
          walletType: 'excise',
          moduleLabel: this.walletModuleLabel,
          walletLabel: 'Excise Duty Wallet',
          hoa: this.walletHoaByType.excise
        };
    }
  }

  private generateWalletTransactionId(walletType: AddMoneyWalletType): string {
    const prefixByWallet: Record<AddMoneyWalletType, string> = {
      excise: 'EX',
      brewery: 'BR',
      distillery: 'DI',
      education: 'EC',
      hologram: 'HG',
      security_deposit: 'SD',
      license_fee: 'LF'
    };

    return `BILLDESK${prefixByWallet[walletType]}${secureRandomToken(18).toUpperCase()}`;
  }

  closeUnifiedAddMoneyView(): void {
    const modalEl = document.getElementById('addMoneyModal');
    if (modalEl) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
      modal?.hide();
    }
  }

  proceedUnifiedAddMoney(): void {
    const retryAfterSeconds = this.getBilldeskPendingRetryAfterSeconds();
    if (retryAfterSeconds > 0) {
      // Close the underlying Payment Details modal so the reminder renders on top.
      this.closeUnifiedAddMoneyView();
      this.showBilldeskPendingRetryPopup(retryAfterSeconds);
      return;
    }

    if (this.addMoneyAmount <= 0) {
      this.showErrorMessage('Please enter amount greater than zero.');
      return;
    }

    const context = this.selectedAddMoneyContext;
    if (!context) {
      this.showErrorMessage('Unable to proceed: wallet context not found.');
      return;
    }

    const licenseeId = String(this.activeLicenseeId || this.resolveActiveLicenseeIdFromSession() || '').trim();
    if (!licenseeId) {
      this.showErrorMessage('Unable to proceed: licensee id not found.');
      return;
    }

    const walletType = this.mapAddMoneyWalletTypeToApi(context.walletType);
    const transactionId = String(this.addMoneyTransactionId || '').trim();
    if (!transactionId) {
      this.showErrorMessage('Unable to proceed: Wallet Transaction ID not found.');
      return;
    }

    Swal.fire({
      title: 'Redirecting to BillDesk',
      text: 'Preparing payment request...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const amount = Number(this.addMoneyAmount || 0);

    const request$ =
      context.walletType === 'license_fee'
        ? this.paymentIntegrationService.initiateBilldeskLicenseFee({
          transaction_id: transactionId,
          amount,
          payer_id: licenseeId,
          payment_module_code: LICENSE_RENEWAL_MODULE_CODE
        })
        : context.walletType === 'security_deposit'
          ? this.paymentIntegrationService.initiateBilldeskSecurityDeposit({
            transaction_id: transactionId,
            amount,
            licensee_id: licenseeId,
            licensee_name: this.activeLicenseeName || licenseeId,
            bank_fdr_code: 'SIKFDR',
            payment_module_code: LICENSE_RENEWAL_MODULE_CODE
          })
          : this.paymentIntegrationService.initiateBilldeskWalletRecharge({
             transaction_id: transactionId,
             wallet_type: walletType,
             licensee_id: licenseeId,
             payer_id: licenseeId,
             head_of_account: String(context.hoa || '').trim(),
             amount
           });

    request$.pipe(timeout(30000)).subscribe({
      next: (response) => {
        Swal.close();
        this.closeUnifiedAddMoneyView();

        const merchantId = String((response as any)?.merchantId || (response as any)?.merchant_id || '').trim();
        const bdOrderId = String((response as any)?.bdOrderId || (response as any)?.bd_order_id || '').trim();
        const authToken = String((response as any)?.authToken || (response as any)?.auth_token || '').trim();

        // Prefer BillDesk Web SDK when possible so we get a responseHandler callback in the SPA.
        if (merchantId && bdOrderId && authToken) {
          this.paymentIntegrationService.launchBillDeskSDK(response as any, (txn: any) => {
            const isSuccess = txn && String(txn.auth_status || '').trim() === '0300';
            this.router.navigate(['/dashboard/wallet-recharge/success'], {
              queryParams: {
                transactionId: String((response as any)?.transaction_id || (response as any)?.transactionId || this.addMoneyTransactionId || '').trim(),
                walletType: context.walletType,
                hoa: String(context.hoa || '').trim(),
                amount,
                status: isSuccess ? 'success' : 'failed',
                createdAt: new Date().toISOString()
              }
            });
            // Refresh wallet after callback (server should have credited on success).
            setTimeout(() => this.refreshWalletData(), 800);
          });
          return;
        }

        const billdeskUrl = String((response as any)?.billdeskUrl || (response as any)?.billdesk_url || '').trim();
        const requestMsg = String((response as any)?.requestMsg || (response as any)?.request_msg || '').trim();
        if (!billdeskUrl || !requestMsg) {
          this.showErrorMessage('BillDesk initiation failed: missing gateway parameters.');
          return;
        }

        this.submitToBillDesk(billdeskUrl, requestMsg);
      },
      error: (err) => {
        Swal.close();
        console.error('BillDesk initiate failed:', err);

        const retrySecondsFromServer = this.extractRetryAfterSeconds(err);
        if (retrySecondsFromServer > 0) {
          // Close the underlying Payment Details modal so the reminder renders on top.
          this.closeUnifiedAddMoneyView();
          this.showBilldeskPendingRetryPopup(retrySecondsFromServer);
          this.refreshWalletData();
          return;
        }

        if (String(err?.name || '').toLowerCase() === 'timeouterror') {
          this.showErrorMessage('BillDesk initiation timed out. Please check server/network and try again.');
          this.refreshWalletData();
          return;
        }
        const errorMessage =
          err?.error?.detail ||
          err?.error?.error ||
          err?.error?.message ||
          err?.message ||
          'Recharge failed';
        this.showErrorMessage(String(errorMessage));
      }
    });
  }

  private submitToBillDesk(url: string, requestMsg: string): void {
    if (!this.isBrowser) {
      this.showErrorMessage('Unable to redirect: browser environment not available.');
      return;
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = 'billdeskChildWindow';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'msg';
    input.value = requestMsg;

    form.appendChild(input);
    document.body.appendChild(form);

    try {
      // Ensure the payment runs in a child window so the SPA doesn't get replaced/closed by gateway pages.
      window.open('', 'billdeskChildWindow', 'noopener,noreferrer');
    } catch {
      // ignore; form submit will still work (may reuse same tab depending on browser policy)
    }
    form.submit();
  }

  private mapAddMoneyWalletTypeToApi(walletType: AddMoneyWalletType): string {
    if (walletType === 'education') return 'education_cess';
    return walletType;
  }

  private getBilldeskPendingRetryAfterSeconds(): number {
    const nowMs = Date.now();
    const lockMs = 15 * 60 * 1000;

    let remainingFromServer = 0;
    const serverUntilMs = this.billdeskRetryLockUntil?.getTime() || 0;
    if (serverUntilMs > nowMs) {
      remainingFromServer = Math.ceil((serverUntilMs - nowMs) / 1000);
    }

    const rows = Array.isArray(this.rechargeData) ? this.rechargeData : [];
    let remainingFromWallet = 0;
    for (const row of rows) {
      const status = String((row as any)?.status || '').toLowerCase();
      if (!status.includes('pending')) continue;

      const created = (row as any)?.date instanceof Date ? (row as any).date : new Date((row as any)?.date || '');
      const createdMs = created instanceof Date && !Number.isNaN(created.getTime()) ? created.getTime() : 0;
      if (!createdMs) continue;

      const lockUntil = createdMs + lockMs;
      const remaining = Math.ceil((lockUntil - nowMs) / 1000);
      if (remaining > remainingFromWallet) remainingFromWallet = remaining;
    }

    return Math.max(0, remainingFromServer, remainingFromWallet);
  }

  private extractRetryAfterSeconds(err: any): number {
    const httpStatus = Number(err?.status || 0);
    if (httpStatus !== 409) return 0;

    const raw =
      err?.error?.retry_after_seconds ||
      err?.error?.retryAfterSeconds ||
      err?.error?.retry_after ||
      err?.error?.retryAfter ||
      0;
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  }

  private showBilldeskPendingRetryPopup(retryAfterSeconds: number): void {
    const totalSeconds = Math.max(1, Math.floor(retryAfterSeconds));
    this.billdeskRetryLockUntil = new Date(Date.now() + totalSeconds * 1000);

    const format = (seconds: number) => {
      const s = Math.max(0, Math.floor(seconds));
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    };

    let interval: any;
    Swal.fire({
      icon: 'info',
      title: 'Payment Pending',
      html:
        `<div style="text-align:left">` +
        `<div>BillDesk payment is still pending.</div>` +
        `<div>Please try again after <b>${format(totalSeconds)}</b>.</div>` +
        `</div>`,
      confirmButtonText: 'Cancel',
      showConfirmButton: true,
      allowOutsideClick: false,
      timer: totalSeconds * 1000,
      timerProgressBar: true,
      didOpen: () => {
        const container = Swal.getHtmlContainer();
        const countdownEl = container ? (container.querySelector('b') as HTMLElement | null) : null;
        interval = setInterval(() => {
          const left = Swal.getTimerLeft();
          if (left === null || left === undefined) return;
          if (countdownEl) countdownEl.textContent = format(Math.ceil(left / 1000));
        }, 250);
      },
      willClose: () => {
        if (interval) clearInterval(interval);
      }
    });
  }

  downloadDetails(): void {
    console.log('Downloading payment details');

    if (this.activeTab === 'transit') {
      const transitRef = String(this.transitBillNo || this.selectedItem?.referenceNo || '').trim();
      const transitId = String(this.transitId || this.selectedItem?.id || '').trim();

      this.router.navigate(['/payment-slip-view'], {
        queryParams: {
          id: transitId || undefined,
          type: 'transit',
          billNo: transitRef || undefined,
          refNo: transitRef || undefined,
          ref: transitRef || undefined,
          referenceNo: transitRef || undefined,
          source: 'licensee'
        }
      });
      return;
    }

    // Navigate to payment receipt page for non-transit flows.
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
          this.transitBillStatus = found.current_stage_name || found.status;
          const transitAllowedActions = Array.isArray(found.allowed_actions || found.allowedActions)
            ? (found.allowed_actions || found.allowedActions).map((a: any) => String(a).toUpperCase())
            : [];
          const isInitialStage = Boolean(found.current_stage_is_initial ?? found.currentStageIsInitial ?? false);
          // Map backend fields to frontend model
          this.transitData = [{
            id: found.id,
            billNumber: found.bill_no || found.billNo,
            serialNo: found.bill_no || found.billNo,
            quantity: found.cases || 0,
            portions: 0,
            nips: (found.size_ml || found.size) + 'ml',
            licenseeId: found.licensee_id || found.licenseeId || 'Unknown',
            status: found.current_stage_name || found.status,
            paymentDate: null,
            totalAmount: parseFloat(found.total_amount || found.totalAmount || 0)
          }];
          this.transitTotalAmount = parseFloat(found.total_amount || found.totalAmount || 0);
          this.transitEducationCess = parseFloat(found.total_education_cess || found.totalEducationCess || found.educationCess || 0);
          this.transitExciseDuty = parseFloat(found.total_excise_duty || found.totalExciseDuty || found.exciseDuty || 0);
          this.transitAdditionalExcise = parseFloat(found.total_additional_excise || found.totalAdditionalExcise || found.additionalExcise || 0);
          this.transitItemCount = 1;
          this.showTransitPayment = transitAllowedActions.includes('PAY') || isInitialStage;
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
    if (this.activeTab === 'hologram') {
      return this.hologramWalletBalance;
    }
    if (this.activeTab === 'revalidation') {
      return this.educationCessBalance;
    }
    return this.isBreweryUser ? this.breweryWalletBalance : this.exciseWalletBalance;
  }

  getSelectedWalletBalanceAfterDeduction(): number {
    const amount = Number(this.selectedItem?.amount || 0);
    return Math.max(0, this.getSelectedWalletBalance() - amount);
  }

  // Hologram payment methods
  canPayHologram(item: HologramItem): boolean {
    const paymentDetails: any = (item as any)?.paymentDetails || (item as any)?.payment_details || null;
    const paidAt = paymentDetails?.paid_at || paymentDetails?.paidAt || (item as any)?.paymentDate || null;
    if (paidAt) return false;

    const paymentStatusToken = String((item as any)?.paymentStatus || (item as any)?.payment_status || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (paymentStatusToken.includes('success') || paymentStatusToken.includes('paid') || paymentStatusToken.includes('completed')) {
      return false;
    }

    // Backend sometimes appends extra words to the approved status (eg "APPROVED BY COMMISSIONER - PAYMENT PENDING"),
    // so treat it as payable when the normalized token CONTAINS an approved marker, not only when it equals it.
    const token = String(item?.status || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!token) return false;

    return (
      token.includes('approvedbycommissioner') ||
      token.includes('commissionerapproved') ||
      token.includes('approvedbyjointcommissioner') ||
      token.includes('jointcommissionerapproved')
    );
  }

  payHologramItem(item: HologramItem): void {
    // Check if there are multiple types for the same reference number
    const refKey = String(item?.referenceNo || '').trim().toUpperCase();
    const sameRefItems = this.hologramData.filter(h => String(h?.referenceNo || '').trim().toUpperCase() === refKey);

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
        this.sidebarBadgeService.triggerRefresh();
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
    const refKey = String(refNo || '').trim().toUpperCase();
    const sameRefItems = this.hologramData.filter(item => String(item?.referenceNo || '').trim().toUpperCase() === refKey);
    return sameRefItems.reduce((total, item) => total + item.hologramFee, 0);
  }

  // Get total quantity for all types under same reference
  getTotalQuantityForRef(refNo: string): number {
    const refKey = String(refNo || '').trim().toUpperCase();
    const sameRefItems = this.hologramData.filter(item => String(item?.referenceNo || '').trim().toUpperCase() === refKey);
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

  getHologramWalletPaymentHistory(): HistoryItem[] {
    return this.getPaymentTransactionsFor('hologram');
  }

  getPaymentTransactionsFor(tab: 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram'): HistoryItem[] {
    const keywordByTab: Record<'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram', string> = {
      requisition: 'requisition',
      revalidation: 'revalidation',
      cancellation: 'cancellation',
      transit: 'transit',
      hologram: 'hologram'
    };
    const keyword = keywordByTab[tab];

    const mergedRows = [...this.optimisticPaymentHistory, ...this.historyData].filter((item) => {
      return this.isForActiveLicense(item);
    });

    return mergedRows.filter((item) => {
      const paymentFor = String(item?.paymentFor || '').toLowerCase();
      const type = String(item?.type || '').toLowerCase();
      const isDebitLike =
        type.includes('utilization') ||
        type.includes('utilized') ||
        type.includes('debit');
      const isRefundLike = type.includes('refund');
      return paymentFor.includes(keyword) && (isDebitLike || isRefundLike);
    }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }

  openHologramPaymentFromRow(row: HologramTabRow): void {
    const item = row?.hologramItem;
    if (!item) return;
    const id = String(item.id || '').trim();
    const amount = Number(row?.amount ?? item.hologramFee ?? 0);
    if (!id || !Number.isFinite(amount) || amount <= 0) return;

    this.pendingWalletPaymentContext = {
      id,
      tab: 'hologram',
      itemType: 'hologram',
      referenceNo: String(item.referenceNo || '-'),
      amount
    };
    this.hasHandledPendingWalletPayment = false;
    this.setActiveTab('hologram');
    this.persistPendingPaymentContextToStorage();
    this.openPendingWalletPaymentConfirmation();
  }

  private hasHologramRowForReference(refNo: string): boolean {
    const ref = String(refNo || '').trim().toUpperCase();
    if (!ref) return false;
    return this.hologramData.some(item => String(item?.referenceNo || '').trim().toUpperCase() === ref);
  }

  private hasPayableHologramForReference(refNo: string): boolean {
    const ref = String(refNo || '').trim().toUpperCase();
    if (!ref) return false;
    return this.hologramData.some(item => {
      const itemRef = String(item?.referenceNo || '').trim().toUpperCase();
      return itemRef === ref && this.canPayHologram(item);
    });
  }

  private getHologramTabRows(): HologramTabRow[] {
    const historyRows = this.getPaymentTransactionsFor('hologram');
    const historyByRef = new Map<string, HistoryItem>();
    for (const row of historyRows) {
      const ref = String(row?.reference || '').trim().toUpperCase();
      if (!ref) continue;
      const existing = historyByRef.get(ref);
      if (!existing || new Date(row.dateTime).getTime() > new Date(existing.dateTime).getTime()) {
        historyByRef.set(ref, row);
      }
    }

    const rows: HologramTabRow[] = [];
    const seenRefs = new Set<string>();
    const deepLinkRefKey = this.getPendingHologramDeepLinkRef().trim().toUpperCase();

    const itemsByRef = new Map<string, HologramItem[]>();
    for (const item of this.hologramData) {
      const ref = String(item?.referenceNo || '').trim();
      if (!ref) continue;
      const refKey = ref.toUpperCase();
      const existing = itemsByRef.get(refKey) || [];
      existing.push(item);
      itemsByRef.set(refKey, existing);
    }

    for (const [refKey, items] of itemsByRef.entries()) {
      if (!items.length) continue;
      const ref = String(items[0]?.referenceNo || '').trim();
      if (!ref) continue;

      const history = historyByRef.get(refKey);
      const historyStatus = String(history?.status || '').toLowerCase();
      const historyIsSuccessful = !!history && (
        historyStatus.includes('success') ||
        historyStatus.includes('paid') ||
        historyStatus.includes('completed')
      );

      const anyPayable = items.some(i => this.canPayHologram(i));
      const canPay = (anyPayable || (!!deepLinkRefKey && refKey === deepLinkRefKey)) && !historyIsSuccessful;
      const dateTime = history?.dateTime || (items[0] as any).paymentDate || (items[0] as any).createdAt || (items[0] as any).date || '';
      const status = canPay ? 'Pending' : (history?.status || 'Payment Successful');
      const type = canPay ? 'Pending Payment' : (history?.type || 'Wallet Utilization');
      const pendingAmount = items.reduce((sum, i) => sum + Number(i?.hologramFee || 0), 0);
      const amount = Number(canPay ? pendingAmount : (history?.amount ?? pendingAmount ?? 0));
      const txnId = canPay ? '-' : (history?.txnId || history?.reference || '-');

      rows.push({
        id: history?.id || String((items[0] as any)?.id || ref),
        txnId,
        type,
        paymentFor: 'Hologram Procurement',
        amount,
        reference: ref,
        status,
        dateTime,
        licenseeId: history?.licenseeId || this.activeLicenseeId || '-',
        userId: history?.userId || '-',
        canPay,
        procurementId: String((items[0] as any)?.id || ''),
        hologramItem: items[0]
      });
      seenRefs.add(refKey);
    }

    for (const row of historyRows) {
      const ref = String(row?.reference || '').trim().toUpperCase();
      if (ref && seenRefs.has(ref)) continue;
      rows.push({ ...row, paymentFor: 'Hologram Procurement' });
    }

    return rows.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }

  private isWalletTableTab(value: string): value is WalletTableTab {
    return [
      'requisition',
      'revalidation',
      'cancellation',
      'transit',
      'hologram',
      'security_deposit',
      'license_fee',
      'recharge',
      'history'
    ].includes(String(value || '').toLowerCase());
  }

  private getCurrentWalletTableTab(): WalletTableTab | null {
    const current = String(this.activeTab || '').toLowerCase();
    return this.isWalletTableTab(current) ? current : null;
  }

  getRowsForTab(tab: WalletTableTab): any[] {
    let rows: any[] = [];
    switch (tab) {
      case 'requisition':
        rows = this.getPaymentTransactionsFor('requisition');
        break;
      case 'revalidation':
        rows = this.getPaymentTransactionsFor('revalidation');
        break;
      case 'cancellation':
        rows = this.getPaymentTransactionsFor('cancellation');
        break;
      case 'transit':
        rows = this.getPaymentTransactionsFor('transit');
        break;
      case 'hologram':
        rows = this.getHologramTabRows();
        break;
      case 'security_deposit':
        rows = this.getWalletTransactionsForWalletType('security_deposit');
        break;
      case 'license_fee':
        rows = this.getWalletTransactionsForWalletType('license_fee');
        break;
      case 'recharge':
        rows = this.getRechargeRowsForCurrentView();
        break;
      case 'history':
        rows = this.getHistoryRowsForCurrentView();
        break;
      default:
        rows = [];
    }

    // Apply filters
    return this.applyTabFilters(rows);
  }

  applyTabFilters(rows: any[]): any[] {
    const f = this.tabFilters;

    return rows.filter(row => {
      // Transaction ID filter
      const txnId = row.txnId || row.id || row.reference || '';
      const txnIdOk = f.transactionId ? txnId.toLowerCase().includes(f.transactionId.toLowerCase()) : true;

      // Date filters
      const rowDate = row.dateTime || row.date || '';
      let dateStr = '';
      if (rowDate) {
        const parsed = new Date(rowDate);
        if (!Number.isNaN(parsed.getTime())) {
          dateStr = parsed.toISOString().split('T')[0];
        }
      }

      // Month filter
      // If row date is not parseable, do not hide it (important for pending items).
      const monthOk = f.month ? (!dateStr || dateStr.substring(0, 7) === f.month) : true;

      // Date range filter
      const afterFrom = f.from ? (!dateStr || dateStr >= f.from) : true;
      const beforeTo = f.to ? (!dateStr || dateStr <= f.to) : true;

      // Type filter
      const rowType = String(row.type || row.transactionType || '');
      const rowStatus = String(row.status || '');

      let typeOk = true;
      if (f.type) {
        const filterType = f.type.toLowerCase();
        const typeLower = rowType.toLowerCase();
        const statusLower = rowStatus.toLowerCase();

        if (filterType === 'refunded') {
          typeOk = typeLower.includes('refund') || statusLower.includes('refund') || typeLower === filterType;
        } else if (filterType === 'credited') {
          typeOk = typeLower.includes('credit') || statusLower.includes('credit') || typeLower.includes('recharge') || typeLower === filterType;
        } else if (filterType === 'debited') {
          typeOk = typeLower.includes('debit') || statusLower.includes('debit') || typeLower.includes('utilization') || typeLower === filterType;
        } else {
          typeOk = typeLower === filterType || statusLower === filterType;
        }
      }

      // Amount filters
      const amount = Number(row.amount || 0);
      const minOk = f.minAmount ? amount >= Number(f.minAmount) : true;
      const maxOk = f.maxAmount ? amount <= Number(f.maxAmount) : true;

      return txnIdOk && monthOk && afterFrom && beforeTo && typeOk && minOk && maxOk;
    });
  }

  applyFiltersToActiveTab(): void {
    // Reset to first page when filters change
    const tab = this.getCurrentWalletTableTab();
    if (tab) {
      this.tableCurrentPageByTab[tab] = 1;
    }
  }

  clearTabFilters(): void {
    this.tabFilters = {
      transactionId: '',
      month: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
      from: '',
      to: '',
      type: '',
      minAmount: '',
      maxAmount: ''
    };
    this.applyFiltersToActiveTab();
  }

  setWalletViewMode(mode: WalletViewMode): void {
    if (this.walletViewMode === mode) return;
    this.walletViewMode = mode;
    this.ensureActiveTabAllowed();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { walletView: mode },
      queryParamsHandling: 'merge'
    });
  }

  private getRechargeRowsForCurrentView(): RechargeItem[] {
    const rows = [...this.rechargeData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // "Others" (license fee + security deposit): show only license fee + security deposit recharges.
    // Excise/education/hologram wallet recharges belong to "Wallets" view only.
    if (this.walletViewMode === 'others') {
      return rows.filter((row) =>
        this.isOtherWalletType(
          String(row.walletType || '').trim(),
          String(row.hoa || '').trim()
        )
      );
    }
    // "Wallets" (brewery/distillery): fee/deposit wallets are not part of this view — hide those recharges.
    return rows.filter((row) => {
      const wt =
        this.normalizeWalletTypeKey(row.walletType) ||
        this.normalizeWalletTypeKey(this.inferWalletTypeFromHoa(String(row.hoa || '').trim()));
      return wt !== 'license_fee' && wt !== 'security_deposit';
    });
  }

  private getHistoryRowsForCurrentView(): HistoryItem[] {
    const rows = [...this.historyData].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    if (this.walletViewMode !== 'others') {
      return rows.filter((row) => {
        const resolved = this.resolveWalletTypeForRow(row);
        return resolved !== 'license_fee' && resolved !== 'security_deposit';
      });
    }
    return rows.filter((row) => this.isOtherWalletType(String(row.walletType || ''), String(row.hoa || '')));
  }

  private getWalletTransactionsForWalletType(walletType: OtherModuleTab): HistoryItem[] {
    const mergedRows = [...this.optimisticPaymentHistory, ...this.historyData].filter((item) => this.isForActiveLicense(item));

    return mergedRows
      .filter((item) => this.resolveWalletTypeForRow(item) === walletType)
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }

  private resolveWalletTypeForRow(row: { walletType?: string; hoa?: string } | null | undefined): string {
    const rawType = this.normalizeWalletTypeKey(row?.walletType);
    if (rawType) return rawType;
    const hoa = String(row?.hoa || '').trim();
    return this.normalizeWalletTypeKey(this.inferWalletTypeFromHoa(hoa));
  }

  private isOtherWalletType(walletTypeRaw: string, hoaRaw: string): boolean {
    const type =
      this.normalizeWalletTypeKey(walletTypeRaw) ||
      this.normalizeWalletTypeKey(this.inferWalletTypeFromHoa(String(hoaRaw || '').trim()));
    return type === 'security_deposit' || type === 'license_fee';
  }

  getWalletTypeLabel(walletTypeOrHoa: string): string {
    const type = String(walletTypeOrHoa || '').trim().toLowerCase();
    const inferredType = type || this.inferWalletTypeFromHoa(walletTypeOrHoa);

    switch (inferredType) {
      case 'excise':
      case 'brewery':
        return 'Excise Duty';
      case 'education':
      case 'education_cess':
        return 'Education Cess';
      case 'hologram':
        return 'Hologram';
      case 'security_deposit':
        return 'Security Deposit';
      case 'license_fee':
        return 'License Fee';
      default:
        return 'Excise Duty';
    }
  }

  getPaginatedRowsForTab(tab: WalletTableTab): any[] {
    const rows = this.getRowsForTab(tab);
    const pageSize = this.tablePageSizeByTab[tab] || 5;
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const currentPage = Math.min(Math.max(1, this.tableCurrentPageByTab[tab] || 1), totalPages);
    if (currentPage !== this.tableCurrentPageByTab[tab]) {
      this.tableCurrentPageByTab[tab] = currentPage;
    }
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }

  getActiveTabTotalRows(): number {
    const tab = this.getCurrentWalletTableTab();
    if (!tab) return 0;
    return this.getRowsForTab(tab).length;
  }

  getActiveTabTotalPages(): number {
    const tab = this.getCurrentWalletTableTab();
    if (!tab) return 1;
    const totalRows = this.getRowsForTab(tab).length;
    const pageSize = this.tablePageSizeByTab[tab] || 5;
    return Math.max(1, Math.ceil(totalRows / pageSize));
  }

  getActiveTabCurrentPage(): number {
    const tab = this.getCurrentWalletTableTab();
    if (!tab) return 1;
    const totalPages = this.getActiveTabTotalPages();
    const page = this.tableCurrentPageByTab[tab] || 1;
    return Math.min(Math.max(1, page), totalPages);
  }

  getActiveTabPageSize(): number {
    const tab = this.getCurrentWalletTableTab();
    if (!tab) return 5;
    return this.tablePageSizeByTab[tab] || 5;
  }

  changeActiveTabPageSize(size: string | number): void {
    const tab = this.getCurrentWalletTableTab();
    if (!tab) return;
    const parsed = typeof size === 'string' ? parseInt(size, 10) : size;
    if (!parsed || !this.tablePageSizeOptions.includes(parsed)) return;
    this.tablePageSizeByTab[tab] = parsed;
    this.tableCurrentPageByTab[tab] = 1;
  }

  goToActiveTabPage(page: number): void {
    const tab = this.getCurrentWalletTableTab();
    if (!tab) return;
    const totalPages = this.getActiveTabTotalPages();
    if (page < 1 || page > totalPages) return;
    this.tableCurrentPageByTab[tab] = page;
  }

  private applyLastPaidTabAsDefault(): void {
    if (!this.autoSelectLastPaidTabOnLoad) {
      return;
    }

    const targetTab = this.getLastPaidModuleTab();
    if (targetTab && this.canShowTab(targetTab)) {
      this.activeTab = targetTab;
    }

    this.autoSelectLastPaidTabOnLoad = false;
  }

  private getLastPaidModuleTab(): 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram' | '' {
    const txns = [...this.historyData]
      .filter((item) => {
        const type = String(item?.type || '').toLowerCase();
        return type.includes('utilization') || type.includes('utilized') || type.includes('debit');
      })
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    for (const txn of txns) {
      const paymentFor = String(txn?.paymentFor || '').toLowerCase();
      if (paymentFor.includes('hologram')) return 'hologram';
      if (paymentFor.includes('transit')) return 'transit';
      if (paymentFor.includes('cancellation')) return 'cancellation';
      if (paymentFor.includes('revalidation')) return 'revalidation';
      if (paymentFor.includes('requisition')) return 'requisition';
    }

    return '';
  }
}


