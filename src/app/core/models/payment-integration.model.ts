export interface PaymentGateway {
  slNo: number;
  paymentGatewayName: string;
  merchantid: string;
  securityid: string;
  returnUrl: string;
  isActive: string;
}

export interface PaymentModule {
  moduleCode: string;
  moduleDesc: string;
  visibilityStatus: string;
  activePaymentMode: string;
  paymentInvokingPage: string | null;
  paymentResponsePage: string | null;
}

export interface PaymentHoa {
  headOfAccount: string;
  majorHead: string;
  minorHead: string;
  detailedHead: string;
  detailedHeadDriscription: string;
  visibleStatus: string;
}

export interface PaymentModuleHoaMapping {
  id: number;
  moduleCode: string;
  headOfAccount: string;
  hoaDescription: string;
  isActive: string;
  userId: string | null;
  oprDate: string;
  createdDate: string;
}

export interface PaymentWalletRow {
  id: number;
  licenseeIdNo: string;
  headOfAccount: string;
  walletAmount: string | number;
}

export interface PaymentMasterDataResponse {
  modules: PaymentModule[];
  moduleHoaMappings: PaymentModuleHoaMapping[];
  hoas: PaymentHoa[];
  gateways: PaymentGateway[];
}

export interface ModuleHoaResponse {
  moduleCode: string;
  moduleDesc: string;
  results: PaymentModuleHoaMapping[];
}

export interface WalletBalanceResponse {
  licenseeId: string;
  totalWalletAmount: string | number;
  count: number;
  results: PaymentWalletRow[];
}

export interface WalletSummaryRow {
  walletBalanceId: number;
  licenseeId: string;
  licenseeName?: string | null;
  userId?: string | null;
  moduleType: string;
  walletType: string;
  headOfAccount: string;
  openingBalance: string | number;
  totalCredit: string | number;
  totalDebit: string | number;
  currentBalance: string | number;
  lastUpdatedAt: string;
  createdAt: string;
}

export interface WalletSummaryResponse {
  licenseeId: string;
  totalWalletAmount: string | number;
  count: number;
  results: WalletSummaryRow[];
}

export interface WalletTransactionRow {
  walletTransactionId: number;
  walletBalance: number;
  transactionId: string;
  licenseeId: string;
  licenseeName?: string | null;
  userId?: string | null;
  moduleType: string;
  walletType: string;
  headOfAccount: string;
  entryType: string;
  transactionType: string;
  amount: string | number;
  balanceBefore: string | number;
  balanceAfter: string | number;
  referenceNo?: string | null;
  sourceModule: string;
  paymentStatus: string;
  remarks?: string | null;
  createdAt: string;
}

export interface WalletTransactionResponse {
  licenseeId: string;
  count: number;
  results: WalletTransactionRow[];
}

export interface PaymentInitiateItem {
  headOfAccount: string;
  amount: number;
}

export interface PaymentInitiatePayload {
  paymentModuleCode: string;
  payerId: string;
  items: PaymentInitiateItem[];
  gatewaySlNo?: number;
  requisitionIdNo?: string;
  userId?: string;
}

export interface PaymentInitiateResponse {
  status: string;
  transactionId: string;
  utr: string;
  paymentStatus: string;
  transactionAmount: number;
  gateway: {
    slNo: number;
    name: string;
    merchantid: string;
    returnUrl: string;
  };
}

export interface PaymentTransaction {
  utr: string;
  transactionIdNoHoa: string;
  payerId: string;
  paymentModuleCode: string;
  transactionAmount: string | number;
  paymentStatus: string;
  transactionDate: string;
  requestMerchantid?: string | null;
  requestSecurityid?: string | null;
  requestReturnUrl?: string | null;
  responseAuthstatus?: string | null;
  responseErrorstatus?: string | null;
  responseErrordescription?: string | null;
  responseTxnreferenceno?: string | null;
  responseBankreferenceno?: string | null;
  responseTxnamount?: string | number | null;
  responseTxndate?: string | null;
}

export interface PaymentTransactionListResponse {
  count: number;
  results: PaymentTransaction[];
}

export interface PaymentStatusUpdatePayload {
  paymentStatus: 'P' | 'S' | 'F';
  responseAuthstatus?: string;
  responseErrorstatus?: string;
  responseErrordescription?: string;
  responseString?: string;
  responseTxnreferenceno?: string;
  responseBankreferenceno?: string;
  responseTxnamount?: number;
  responseTxndate?: string;
}

export interface BilldeskWalletRechargeInitiatePayload {
  transaction_id: string;
  wallet_type: string;
  licensee_id?: string;
  payer_id?: string;
  head_of_account?: string;
  amount: number;
}

export interface BilldeskWalletRechargeInitiateResponse {
  billdeskUrl: string;
  requestMsg: string;
  transactionId: string;
}

export interface BilldeskLicenseFeeInitiatePayload {
  transaction_id: string;
  amount: number;
  payer_id?: string;
  payment_module_code?: string;
  application_id?: string;
  requisition_id_no?: string;
}

export interface BilldeskSecurityDepositInitiatePayload {
  transaction_id: string;
  amount: number;
  licensee_id: string;
  licensee_name?: string;
  bank_fdr_code?: string;
  license_type?: string;
  district?: string;
  payment_module_code?: string;
  application_id?: string;
  requisition_id_no?: string;
}

export interface BilldeskNewLicenseApplicationFeeInitiatePayload {
  application_id: string;
  amount?: number;
  payment_module_code?: string;
  head_of_account?: string;
  transaction_id?: string;
}
